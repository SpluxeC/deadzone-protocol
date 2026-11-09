/** Original procedural audio assets and event mixer for Deadzone Protocol.
 * All sounds are rendered by Web Audio: no external licensing, downloads, or
 * autoplay. One engine, one shared noise buffer, bounded active voices.
 */
import type {WeaponId} from './equipmentArmory.ts';
import type {ZombieKind} from './combatSystems.ts';

export type AudioSetting={volume:number;muted:boolean};
export type UiSound='tap'|'confirm'|'back'|'error'|'notice'|'success'|'warning'|'loot'|'heal';
export type ElevatorSound='locked'|'open'|'arrive'|'travel';
export type BreachSound='start'|'pulse'|'wave'|'complete';
export type ZombieSound='spawn'|'growl'|'attack'|'hurt'|'death'|'boss';

const STORAGE='deadzone-audio-v1';
const defaults:AudioSetting={volume:.62,muted:false};
export function clampVolume(n:number):number{return Math.max(0,Math.min(1,Number.isFinite(n)?n:defaults.volume))}
export function weaponSignature(id:WeaponId):{pitch:number;body:number;tail:number;metal:number}{
 const values:Record<WeaponId,[number,number,number,number]>={
  pistol:[214,.12,.10,.39],revolver:[154,.21,.28,.7],machinePistol:[295,.075,.08,.33],
  smg:[264,.085,.105,.45],compactSmg:[306,.072,.085,.32],suppressedSmg:[167,.065,.055,.11],
  carbine:[173,.15,.16,.55],assault:[153,.17,.20,.55],battleRifle:[126,.21,.23,.69],
  burstRifle:[186,.15,.18,.58],shotgun:[97,.28,.29,.58],autoShotgun:[115,.22,.23,.48],
  doubleBarrel:[82,.37,.35,.65],tacticalShotgun:[108,.26,.27,.54],
  lmg:[117,.19,.17,.72],squadAutomatic:[137,.18,.15,.62],heavyMachineGun:[78,.29,.25,.88],
  marksman:[138,.20,.22,.66],heavyMarksman:[102,.27,.27,.78],sniper:[83,.37,.43,.92],
  knife:[410,.085,.10,.10],axe:[143,.21,.17,.59],machete:[285,.15,.16,.27],
  bat:[99,.20,.17,.12],crowbar:[335,.19,.27,.89]
 };
 const [pitch,body,tail,metal]=values[id];
 return {pitch,body,tail,metal};
}
const meleeSet=new Set<WeaponId>(['knife','axe','machete','bat','crowbar']);
export const isMelee=(id:WeaponId):boolean=>meleeSet.has(id);

class GameAudio{
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private noise:AudioBuffer|null=null;
 private settings:AudioSetting={...defaults};
 private unlocked=false;
 private last=new Map<string,number>();
 private active=0;
 private breach:OscillatorNode|null=null;
 private breachGain:GainNode|null=null;
 private breachFilter:BiquadFilterNode|null=null;
 private breachId:string|null=null;
 private lastPulse=0;
 constructor(){
  try{
   const saved=localStorage.getItem(STORAGE);
   if(saved){const data=JSON.parse(saved) as Partial<AudioSetting>;
    this.settings.volume=clampVolume(typeof data.volume==='number'?data.volume:defaults.volume);
    this.settings.muted=typeof data.muted==='boolean'?data.muted:false;
   }
  }catch{/* Storage is optional in private browsing. */}
 }
 get volume(){return this.settings.volume}
 get muted(){return this.settings.muted}
 get enabled(){return this.unlocked&&!!this.context&&this.context.state==='running'&&!this.muted}
 private persist(){
  try{localStorage.setItem(STORAGE,JSON.stringify(this.settings))}catch{/* private browsing */}
 }
 private updateMaster(){
  if(this.master&&this.context)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.018)
 }
 setVolume(n:number){this.settings.volume=clampVolume(n);this.persist();this.updateMaster()}
 setMuted(value:boolean){this.settings.muted=value;this.persist();this.updateMaster();if(value)this.stopBreach()}
 toggle(){this.setMuted(!this.muted);if(!this.muted)this.playUI('confirm')}
 unlock():void{
  if(!this.context){
   try{
    const context=new AudioContext({latencyHint:'interactive'});
    const master=context.createGain();master.gain.value=this.muted?0:this.volume;
    master.connect(context.destination);
    const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const samples=noise.getChannelData(0);
    let random=0x46a53a11;
    for(let i=0;i<samples.length;i++){
     random^=random<<13;random^=random>>>17;random^=random<<5;
     samples[i]=((random>>>0)/2147483648-1)*.72;
    }
    this.context=context;this.master=master;this.noise=noise;
   }catch{return}
  }
  this.unlocked=true;
  if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
 }
 private ready():AudioContext|null{
  return this.enabled&&this.active<36?this.context:null;
 }
 private canPlay(key:string,minInterval:number):boolean{
  const c=this.ready();if(!c)return false;
  const now=c.currentTime,last=this.last.get(key)??-100;
  if(now-last<minInterval)return false;
  this.last.set(key,now);return true;
 }
 private voice(start:number,seconds:number,volume:number,highpass=0,lowpass=0):{gain:GainNode;end:number}|null{
  const c=this.ready(),master=this.master;if(!c||!master)return null;
  const gain=c.createGain();
  gain.gain.setValueAtTime(0,start);
  gain.gain.linearRampToValueAtTime(Math.max(.001,volume),start+.006);
  gain.gain.exponentialRampToValueAtTime(.001,start+seconds);
  let final:AudioNode=gain;
  if(highpass){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=highpass;gain.connect(hp);final=hp}
  if(lowpass){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=lowpass;final.connect(lp);final=lp}
  final.connect(master);
  this.active++;
  gain.addEventListener('ended',()=>{}, {once:true});
  // Count completed sources using their onended callbacks instead.
  return {gain,end:start+seconds+.01};
 }
 private tone(freq:number,duration:number,volume:number,opts:{type?:OscillatorType;endFreq?:number;delay?:number;highpass?:number;lowpass?:number}={}):void{
  const c=this.ready();if(!c)return;
  const start=c.currentTime+(opts.delay??0),v=this.voice(start,duration,volume,opts.highpass,opts.lowpass);if(!v)return;
  const osc=c.createOscillator();osc.type=opts.type??'triangle';
  osc.frequency.setValueAtTime(Math.max(20,freq),start);
  if(opts.endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(20,opts.endFreq),start+duration);
  osc.connect(v.gain);osc.start(start);osc.stop(v.end);
  osc.onended=()=>{this.active=Math.max(0,this.active-1);osc.disconnect();v.gain.disconnect()};
 }
 private burst(duration:number,volume:number,opts:{delay?:number;highpass?:number;lowpass?:number}={}):void{
  const c=this.ready();if(!c||!this.noise)return;
  const start=c.currentTime+(opts.delay??0),v=this.voice(start,duration,volume,opts.highpass,opts.lowpass);if(!v)return;
  const source=c.createBufferSource();source.buffer=this.noise;source.loop=true;source.connect(v.gain);source.start(start);source.stop(v.end);
  source.onended=()=>{this.active=Math.max(0,this.active-1);source.disconnect();v.gain.disconnect()};
 }
 playWeapon(id:WeaponId,opts:{distance?:number;suppressed?:boolean}={}):void{
  if(!this.canPlay('gun-'+id,isMelee(id)?.075:.035))return;
  const p=weaponSignature(id),falloff=1/(1+Math.max(0,opts.distance??0)*.12);
  const quiet=opts.suppressed||id==='suppressedSmg';
  if(isMelee(id)){
   const k=id==='axe'?1.2:id==='bat'?.82:id==='crowbar'?1.35:1;
   this.burst(p.body*k,.13*falloff,{highpass:400*p.metal+170,lowpass:4000});
   this.tone(p.pitch,p.tail,.16*k*falloff,{type:id==='crowbar'?'square':'triangle',endFreq:p.pitch*.49});
   if(id==='crowbar'||id==='machete')this.tone(p.pitch*3,.19,.055*falloff,{type:'sine',endFreq:p.pitch*1.5});
   return;
  }
  const amp=(quiet?.21:.31)*falloff;
  this.burst(p.body,amp,{highpass:quiet?650:170,lowpass:quiet?2600:7800});
  this.tone(p.pitch,Math.max(.07,p.tail),amp*(quiet?.55:.88),{type:quiet?'sine':'sawtooth',endFreq:p.pitch*.31});
  this.tone(p.pitch*(2+p.metal),.047,.11*falloff,{type:'triangle',endFreq:p.pitch*.84,delay:.015});
  if(p.body>=.22&&!quiet)this.burst(p.tail,.085*falloff,{delay:.075,highpass:110,lowpass:1700});
 }
 playReload(id:WeaponId,complete=false):void{
  if(!this.canPlay('reload-'+id+(complete?'done':''),.12))return;
  const p=weaponSignature(id);
  this.burst(.035,.095,{highpass:1000,lowpass:5500});
  this.tone(p.pitch*4,.065,.075,{type:'square',endFreq:p.pitch*2,delay:.035});
  this.tone(complete?p.pitch*5:p.pitch*2.5,.065,.06,{type:'triangle',endFreq:p.pitch*3,delay:complete?.08:.12});
 }
 playUI(id:UiSound):void{
  if(!this.canPlay('ui-'+id,id==='tap'?.045:.09))return;
  if(id==='tap'){this.tone(620,.035,.085,{endFreq:480});return}
  if(id==='back'){this.tone(430,.09,.095,{endFreq:310});return}
  if(id==='error'){this.tone(185,.2,.13,{type:'sawtooth',endFreq:120});return}
  if(id==='warning'){this.tone(580,.11,.12,{type:'square',endFreq:420});this.tone(580,.11,.12,{type:'square',endFreq:420,delay:.17});return}
  if(id==='success'||id==='confirm'){this.tone(570,.09,.11,{endFreq:720});this.tone(870,.16,.10,{delay:.10,endFreq:1020});return}
  if(id==='heal'){this.tone(380,.18,.09,{endFreq:740});this.tone(680,.22,.06,{delay:.08,endFreq:930});return}
  if(id==='loot'){this.tone(470,.07,.10,{endFreq:630});this.tone(820,.12,.1,{delay:.075,endFreq:1080});return}
  this.tone(750,.075,.1,{endFreq:510});this.tone(460,.13,.055,{delay:.065,endFreq:570});
 }
 playNotice(text:string):void{
  const t=text.toLowerCase();
  const id:UiSound=/locked|need |insufficient|full|lost|downed/.test(t)?'error':
   /incoming|alarm|alert|warning|boss/.test(t)?'warning':
   /sealed|complete|eliminated|unlocked|revived|reward|upgrade/.test(t)?'success':
   /medic|healing|healed/.test(t)?'heal':
   /crate|found|pickup/.test(t)?'loot':'notice';
  this.playUI(id);
 }
 playZombie(kind:ZombieKind,event:ZombieSound,distance=0):void{
  const interval=event==='growl'?1.5:event==='hurt'?.19:event==='spawn'?.30:event==='attack'?.14:.10;
  if(!this.canPlay('z-'+kind+'-'+event,interval))return;
  const base:Record<ZombieKind,number>={shambler:91,runner:156,armored:72,bruiser:58,boss:41};
  const pitch=base[kind],gain=.24/(1+Math.max(0,distance)*.20);
  if(event==='death'){this.burst(.25,gain*.6,{lowpass:1250});this.tone(pitch*.92,.39,gain,{type:'sawtooth',endFreq:pitch*.32});return}
  if(event==='attack'){this.burst(.08,gain*.63,{highpass:280,lowpass:2300});this.tone(pitch*2.1,.16,gain*.75,{type:'sawtooth',endFreq:pitch*.8});return}
  if(event==='hurt'){this.tone(pitch*1.65,.19,gain*.85,{type:'sawtooth',endFreq:pitch*.72});return}
  if(event==='spawn'){this.burst(.3,gain*.45,{lowpass:650});this.tone(pitch*.8,.34,gain*.5,{endFreq:pitch*1.5});return}
  this.tone(pitch*(kind==='runner'?1.3:.84),kind==='boss'?.75:.42,gain,{type:'sawtooth',endFreq:pitch*(kind==='runner'?.6:1.1)});
  this.burst(.18,gain*.27,{lowpass:960});
 }
 playElevator(event:ElevatorSound):void{
  if(!this.canPlay('elevator-'+event,.25))return;
  if(event==='locked'){this.tone(162,.22,.2,{type:'square',endFreq:99});this.tone(143,.20,.14,{delay:.23,endFreq:90});return}
  if(event==='open'||event==='arrive'){
   this.burst(.55,.19,{lowpass:850});
   this.tone(140,.55,.22,{type:'sawtooth',endFreq:event==='open'?70:208});
   this.tone(560,.16,.10,{delay:.42,endFreq:760});return;
  }
  this.tone(89,.9,.21,{type:'sawtooth',endFreq:55});this.burst(.75,.13,{lowpass:430});
 }
 playBreach(event:BreachSound):void{
  if(!this.canPlay('breach-'+event,event==='pulse'?.46:.18))return;
  if(event==='start'){
   this.burst(.5,.23,{lowpass:1100});this.tone(85,.65,.24,{type:'sawtooth',endFreq:155});
   this.tone(740,.12,.15,{type:'square',delay:.20,endFreq:590});return;
  }
  if(event==='pulse'){
   this.tone(91,.38,.17,{type:'sawtooth',endFreq:113});this.burst(.27,.1,{lowpass:520});return;
  }
  if(event==='wave'){
   this.tone(460,.14,.19,{type:'square',endFreq:350});
   this.tone(520,.13,.19,{type:'square',endFreq:380,delay:.19});return;
  }
  this.burst(.27,.17,{lowpass:1150});
  this.tone(390,.25,.15,{endFreq:670});this.tone(790,.32,.17,{delay:.16,endFreq:980});
 }
 syncBreach(id:string|null):void{
  if(id===null||this.muted||!this.enabled){this.stopBreach();return}
  if(this.breach&&this.breachId===id)return;
  this.stopBreach();
  const c=this.ready(),master=this.master;if(!c||!master)return;
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=160;
  const gain=c.createGain();gain.gain.setValueAtTime(.001,c.currentTime);
  gain.gain.setTargetAtTime(.08,c.currentTime,.15);
  const osc=c.createOscillator();osc.type='sawtooth';osc.frequency.value=53;
  osc.connect(filter);filter.connect(gain);gain.connect(master);osc.start();
  this.breach=osc;this.breachGain=gain;this.breachFilter=filter;this.breachId=id;this.lastPulse=0;
 }
 tickBreach():void{
  const c=this.context;if(!this.breach||!c||!this.enabled)return;
  const now=c.currentTime;if(now-this.lastPulse<1.17)return;
  this.lastPulse=now;this.playBreach('pulse');
 }
 stopBreach():void{
  if(this.breach&&this.context){
   const osc=this.breach,gain=this.breachGain,filter=this.breachFilter;
   try{gain?.gain.setTargetAtTime(.001,this.context.currentTime,.06);osc.stop(this.context.currentTime+.25);
    osc.onended=()=>{osc.disconnect();gain?.disconnect();filter?.disconnect()}}catch{/* Already stopped */}
  }
  this.breach=null;this.breachGain=null;this.breachFilter=null;this.breachId=null;
 }
}
export const gameAudio=new GameAudio();

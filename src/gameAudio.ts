/** Original procedural audio assets and event mixer for Deadzone Protocol.
 * All sounds are rendered by Web Audio: no external licensing, downloads, or
 * autoplay. One engine, one shared noise buffer, bounded active voices.
 */
import type {WeaponId} from './equipmentArmory.ts';
import type {ZombieKind} from './combatSystems.ts';
import {makeWeaponClip,makeReloadClip,makeZombieClip,makeMachineryClip,type PcmClip} from './realisticSoundDesign.ts';

export type AudioSetting={volume:number;muted:boolean};
export type AudioStatus='locked'|'starting'|'ready'|'suspended'|'unavailable';
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
 private clips=new Map<string,AudioBuffer>();
 private settings:AudioSetting={...defaults};
 private unlocked=false;
 private starting:Promise<boolean>|null=null;
 private failed=false;
 private onStatus=new Set<()=>void>();
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
 get status():AudioStatus{
  if(this.failed)return 'unavailable';
  if(!this.context)return 'locked';
  if(this.context.state==='running')return 'ready';
  return this.starting?'starting':'suspended';
 }
 onStatusChange(callback:()=>void):()=>void{this.onStatus.add(callback);return ()=>this.onStatus.delete(callback)}
 private notify(){for(const listener of this.onStatus)listener()}
 private persist(){
  try{localStorage.setItem(STORAGE,JSON.stringify(this.settings))}catch{/* private browsing */}
 }
 private updateMaster(){
  if(this.master&&this.context)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.018)
 }
 setVolume(n:number){this.settings.volume=clampVolume(n);this.persist();this.updateMaster();this.notify()}
 setMuted(value:boolean){this.settings.muted=value;this.persist();this.updateMaster();if(value)this.stopBreach();this.notify()}
 toggle(){this.setMuted(!this.muted);if(!this.muted)this.playUI('confirm')}
 /**
  * Call directly from an actual pointer/key gesture. On iOS and embedded WebKit,
  * start one silent source synchronously before awaiting resume(). We surface
  * startup failures instead of silently throwing away every requested SFX.
  */
 unlock():Promise<boolean>{
  if(this.context?.state==='running'){this.unlocked=true;this.notify();return Promise.resolve(true)}
  if(!this.context){
   try{
    const supported=(window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
    if(!supported){this.failed=true;this.notify();return Promise.resolve(false)}
    const context=new supported({latencyHint:'interactive'});
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
    context.onstatechange=()=>{this.notify()};
   }catch{this.failed=true;this.notify();return Promise.resolve(false)}
  }
  const context=this.context;
  if(!context)return Promise.resolve(false);
  // Safari permits this zero-amplitude source when created in the tap handler.
  // It does not create an audible autoplay event.
  try{
   const silence=context.createBuffer(1,1,context.sampleRate);
   const source=context.createBufferSource();source.buffer=silence;
   source.connect(this.master!);source.start(0);
   source.onended=()=>source.disconnect();
  }catch{/* Resume below may still work. */}
  this.unlocked=true;
  if(this.starting)return this.starting;
  let resume:Promise<void>;
  try{resume=context.resume()}catch{this.notify();return Promise.resolve(false)}
  this.starting=resume.then(()=>{
   this.failed=false;return context.state==='running';
  }).catch(()=>false).then(ok=>{
   this.starting=null;this.notify();return ok;
  });
  this.notify();
  return this.starting;
 }
 /** Test is explicitly requested, and only plays after audio is actually on. */
 async testSound():Promise<boolean>{
  if(this.muted)this.setMuted(false);
  const ready=await this.unlock();
  if(!ready)return false;
  this.last.delete('ui-success');
  this.playUI('success');
  this.playUI('tap');
  return true;
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
  // Count completed sources using their onended callbacks.
  return {gain,end:start+seconds+.01};
 }
 /** Buffer-based Foley playback: dynamically filtered, slight randomised pitch,
  * headroom-limited polyphony, spatial attenuation and soft industrial reflections. */
 private sample(key:string,render:()=>PcmClip,volume:number,opts:{distance?:number;lowpass?:number;delay?:number}={}):void{
  const c=this.ready(),master=this.master;if(!c||!master)return;
  let buffer=this.clips.get(key);
  if(!buffer){
   const clip=render();
   buffer=c.createBuffer(1,clip.samples.length,clip.sampleRate);
   buffer.copyToChannel(clip.samples as Float32Array<ArrayBuffer>,0);
   this.clips.set(key,buffer);
  }
  const distance=Math.max(0,opts.distance??0);
  const damp=Math.min(.93,distance*.035);
  const attenuation=1/(1+distance*.17+distance*distance*.015);
  const gain=c.createGain();
  const start=c.currentTime+(opts.delay??0);
  gain.gain.setValueAtTime(Math.max(.001,volume*attenuation),start);
  gain.gain.setTargetAtTime(.001,start+buffer.duration*.87,.08);
  const filter=c.createBiquadFilter();filter.type='lowpass';
  filter.frequency.value=Math.min(opts.lowpass??11000,11500/(1+distance*.19));
  filter.Q.value=.54;
  const source=c.createBufferSource();source.buffer=buffer;
  // Very small variations prevent identical overlapping shots sounding robotic.
  const hash=(Math.floor(c.currentTime*137)+key.length*31)%11;
  source.playbackRate.value=1+(hash-5)*.004;
  source.connect(filter);filter.connect(gain);gain.connect(master);
  this.active++;
  source.onended=()=>{
   source.disconnect();filter.disconnect();gain.disconnect();
   this.active=Math.max(0,this.active-1);
  };
  source.start(start);
  // Single early wall reflection, attenuated and low-passed. Longer / more
  // diffuse reflected tails come from the layers baked into the sound clip.
  if(distance>1.2&&this.active<25){
   const echo=c.createBufferSource();echo.buffer=buffer;echo.playbackRate.value=source.playbackRate.value;
   const echoGain=c.createGain();echoGain.gain.value=Math.max(.001,volume*.08*(1-damp)*attenuation);
   const echoFilter=c.createBiquadFilter();echoFilter.type='lowpass';echoFilter.frequency.value=1400;
   echo.connect(echoFilter);echoFilter.connect(echoGain);echoGain.connect(master);
   echo.start(start+.083);
   echo.onended=()=>{echo.disconnect();echoFilter.disconnect();echoGain.disconnect()};
  }
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
  if(!this.canPlay('gun-'+id,isMelee(id)?.07:.035))return;
  const damp=!!opts.suppressed||id==='suppressedSmg';
  const key='foley-weapon-'+id+(damp?'-suppressed':'');
  const weight=weaponSignature(id);
  this.sample(key,()=>makeWeaponClip(id,24000,damp),isMelee(id)?.38:damp?.39:.62,
   {distance:opts.distance,lowpass:damp?2700:11500});
  // A quiet metallic bolt and casing after the loud report.
  if(!isMelee(id)&&!damp)this.tone(1100+weight.metal*1300,.023,.024,{type:'triangle',endFreq:710,delay:.052});
 }
 playReload(id:WeaponId,complete=false):void{
  if(!this.canPlay('reload-'+id+(complete?'done':''),.12))return;
  this.sample('foley-reload-'+id,()=>makeReloadClip(id),complete?.28:.20,{lowpass:6500});
  // The closing bolt is slightly heavier at the end of the timed reload.
  if(complete)this.burst(.045,.07,{delay:.08,highpass:640,lowpass:3200});
 }
 playUI(id:UiSound):void{
  if(!this.canPlay('ui-'+id,id==='tap'?.045:.09))return;
  // Tactile switch clicks, soft magnetic relay contacts and subdued emergency
  // alarms instead of melodic arcade tones.
  if(id==='tap'){
   this.burst(.023,.055,{highpass:950,lowpass:4900});
   this.tone(290,.021,.025,{type:'triangle',endFreq:178,delay:.005});return;
  }
  if(id==='back'){
   this.burst(.042,.08,{highpass:460,lowpass:2200});
   this.tone(235,.04,.035,{endFreq:150});return;
  }
  if(id==='error'){
   this.burst(.05,.10,{lowpass:1400});
   this.tone(190,.16,.09,{type:'triangle',endFreq:132});return;
  }
  if(id==='warning'){
   this.burst(.05,.085,{highpass:270,lowpass:1500});
   this.tone(350,.18,.11,{type:'triangle',endFreq:310});
   this.tone(350,.18,.11,{type:'triangle',endFreq:310,delay:.25});return;
  }
  if(id==='success'||id==='confirm'){
   this.burst(.044,.07,{highpass:650,lowpass:4400});
   this.tone(455,.085,.05,{endFreq:575,delay:.045});return;
  }
  if(id==='heal'){
   this.burst(.15,.11,{highpass:180,lowpass:1600});
   this.tone(260,.11,.05,{endFreq:420});return;
  }
  if(id==='loot'){
   this.burst(.064,.1,{highpass:700,lowpass:4800});
   this.tone(760,.06,.045,{type:'triangle',endFreq:920,delay:.042});return;
  }
  this.burst(.042,.065,{highpass:540,lowpass:2700});
  this.tone(495,.065,.032,{endFreq:410,delay:.027});
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
  const interval=event==='growl'?1.5:event==='hurt'?.18:event==='spawn'?.30:event==='attack'?.15:.10;
  if(!this.canPlay('z-'+kind+'-'+event,interval))return;
  this.sample('foley-zombie-'+kind+'-'+event,
   ()=>makeZombieClip(kind,event),event==='attack'?.39:event==='death'?.38:.31,
   {distance,lowpass:kind==='runner'?5500:kind==='boss'?2600:3600});
 }
 playElevator(event:ElevatorSound):void{
  if(!this.canPlay('elevator-'+event,.25))return;
  if(event==='locked'){
   this.sample('foley-lock',()=>makeReloadClip('crowbar'),.19,{lowpass:2400});
   this.tone(160,.11,.065,{type:'triangle',endFreq:135});return;
  }
  this.sample('foley-elevator',()=>makeMachineryClip('elevator'),
   event==='travel'?.35:.48,{lowpass:event==='travel'?2100:4900});
  if(event==='open'||event==='arrive')this.burst(.28,.08,{delay:.28,lowpass:1400});
 }
 playBreach(event:BreachSound):void{
  if(!this.canPlay('breach-'+event,event==='pulse'?.46:.18))return;
  if(event==='start'||event==='pulse'){
   this.sample('foley-breach',()=>makeMachineryClip('breach'),
    event==='start'?.5:.17,{lowpass:event==='start'?5100:2100});
   return;
  }
  if(event==='wave'){
   this.burst(.18,.15,{lowpass:1600});
   this.tone(380,.18,.11,{type:'triangle',endFreq:300,delay:.13});return;
  }
  this.sample('foley-breach-done',()=>makeMachineryClip('elevator'),.32,{lowpass:3800});
  this.tone(650,.23,.09,{type:'sine',endFreq:870,delay:.26});
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

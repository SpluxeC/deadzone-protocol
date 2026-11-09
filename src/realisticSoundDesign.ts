/** Original foley-like procedural sound design.
 * Deterministic layered transient synthesis rendered once into short PCM clips.
 * Every weapon has a unique profile; no sound files or third-party licenses.
 */
import type {WeaponId} from './equipmentArmory.ts';
import type {ZombieKind} from './combatSystems.ts';

export type AudioCategory='gunshot'|'melee'|'reload'|'zombie'|'mechanism';
export type PcmClip={samples:Float32Array;sampleRate:number;duration:number};
export type SoundScene={distance?:number;suppressed?:boolean};
const clamp=(x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));
const hash=(s:string)=>{let v=2166136261;for(let i=0;i<s.length;i++)v=Math.imul(v^s.charCodeAt(i),16777619);return v>>>0};
export const weaponAcoustics:Record<WeaponId,{weight:number;crack:number;metal:number;decay:number}>={
 pistol:{weight:.35,crack:.78,metal:.45,decay:.22},
 revolver:{weight:.72,crack:.88,metal:.68,decay:.39},
 machinePistol:{weight:.24,crack:.9,metal:.48,decay:.15},
 smg:{weight:.33,crack:.76,metal:.47,decay:.24},
 compactSmg:{weight:.24,crack:.83,metal:.41,decay:.19},
 suppressedSmg:{weight:.17,crack:.28,metal:.36,decay:.14},
 carbine:{weight:.56,crack:.91,metal:.54,decay:.35},
 assault:{weight:.62,crack:.96,metal:.58,decay:.39},
 battleRifle:{weight:.83,crack:.94,metal:.66,decay:.48},
 burstRifle:{weight:.57,crack:.98,metal:.53,decay:.33},
 shotgun:{weight:.88,crack:.74,metal:.69,decay:.56},
 autoShotgun:{weight:.76,crack:.78,metal:.61,decay:.48},
 doubleBarrel:{weight:1,crack:.8,metal:.67,decay:.72},
 tacticalShotgun:{weight:.86,crack:.8,metal:.66,decay:.52},
 lmg:{weight:.84,crack:.88,metal:.83,decay:.51},
 squadAutomatic:{weight:.73,crack:.91,metal:.76,decay:.43},
 heavyMachineGun:{weight:1,crack:.97,metal:.93,decay:.65},
 marksman:{weight:.8,crack:.98,metal:.68,decay:.48},
 heavyMarksman:{weight:.95,crack:.99,metal:.74,decay:.57},
 sniper:{weight:1,crack:1,metal:.86,decay:.84},
 knife:{weight:.12,crack:.05,metal:.13,decay:.12},
 axe:{weight:.7,crack:.12,metal:.24,decay:.34},
 machete:{weight:.35,crack:.08,metal:.7,decay:.32},
 bat:{weight:.72,crack:.03,metal:.02,decay:.28},
 crowbar:{weight:.67,crack:.13,metal:.97,decay:.6}
};
const melee=new Set<WeaponId>(['knife','axe','machete','bat','crowbar']);
export function audioKindForWeapon(id:WeaponId):AudioCategory{return melee.has(id)?'melee':'gunshot'}
/** High-pass / low-pass one-pole filtering. Parameter variation simulates body,
 * material, distance and room reflections without obvious sine-wave bleeps.
 */
function renderClip(id:string,duration:number,sampleRate:number,category:AudioCategory,
 config:{weight:number;crack:number;metal:number;decay:number},suppressed=false):PcmClip{
 const length=Math.max(1,Math.ceil(duration*sampleRate));
 const samples=new Float32Array(length);
 let seed=hash(id)+(suppressed?911:0);
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296*2-1};
 let body=0,bright=0,rumble=0,metal=0,breath=0;
 const dt=1/sampleRate;
 const c=config;
 const bandLow=category==='zombie'?Math.min(0.2,2*Math.PI*(70+c.weight*110)/sampleRate):2*Math.PI*(115+c.weight*140)/sampleRate;
 const bandHigh=2*Math.PI*(1500+c.crack*3100)/sampleRate;
 const metalFreq=(850+c.metal*3400),lowFreq=(40+c.weight*95);
 const attack=category==='melee'?.016:category==='gunshot'?.0008:.012;
 const release=category==='gunshot'?.06+c.decay*.38:category==='zombie'?.24+c.decay*.5:duration*.56;
 const subDelay=category==='gunshot'?.014+config.weight*.013:.09;
 for(let i=0;i<length;i++){
  const t=i*dt;
  const n=rand(),n2=rand();
  bright+=Math.min(.98,bandHigh)*(n-bright);
  body+=Math.min(.45,bandLow)*(n-body);
  rumble+=Math.min(.14,2*Math.PI*lowFreq/sampleRate)*(n-rumble);
  metal+=Math.min(.33,2*Math.PI*metalFreq/sampleRate)*(n2-metal);
  const high=n-bright;
  const click=Math.exp(-t/(category==='gunshot'?.0028:.012));
  const envelope=(1-Math.exp(-t/attack))*Math.exp(-t/release);
  const onset=t>subDelay?Math.exp(-(t-subDelay)/(.046+c.decay*.19)):0;
  const overtone=Math.sin(2*Math.PI*metalFreq*t+c.metal*.5*Math.sin(2*Math.PI*137*t));
  let v=0;
  if(category==='gunshot'){
   // Very fast shock transient + gritty muzzle report + non-tonal low-frequency
   // pressure wave + separate receiver cycling.
   v=(n*.54+high*.46)*(click*c.crack*1.15+envelope*(.48+.5*c.crack))+
    (rumble*.88+Math.sin(2*Math.PI*lowFreq*t)*.12)*onset*c.weight*2.5+
    overtone*Math.exp(-Math.max(0,t-.048)/.024)*(t>.048?.07*c.metal:0);
   if(suppressed)v=v*.35+body*envelope*.22;
  }else if(category==='melee'){
   const scrape=Math.exp(-Math.max(0,t-.01)/(.025+c.decay*.08));
   const impact=Math.exp(-Math.max(0,t-.035)/(.015+c.weight*.045))*(t>.035?1:0);
   const ring=Math.exp(-Math.max(0,t-.035)/(.075+c.decay*.6))*(t>.035?1:0);
   v=(high*.38+n*.12)*scrape+body*impact*c.weight*2.1+
    overtone*ring*c.metal*.29;
  }else if(category==='reload'){
   // Sequenced spring / slide / magazine contact; no pitched UI beeps.
   const taps=[.015,.115,.235,.39];
   for(let j=0;j<taps.length;j++){
    const q=t-taps[j];
    if(q>=0&&q<.07)v+=(high*.45+n*.3+overtone*.09*c.metal)*Math.exp(-q/(.008+j*.004))*(j===2?1.1:.8);
   }
  }else if(category==='zombie'){
   const mod=.74+.26*Math.sin(2*Math.PI*(2.1+c.metal*2)*t);
   const throat=Math.sin(2*Math.PI*(lowFreq*.74*t+.016*Math.sin(2*Math.PI*5.2*t)));
   const rasp=(n*.18+body*.8)*(.52+.48*Math.sin(2*Math.PI*41*t));
   const breathSweep=Math.exp(-t/(.22+c.decay*.28));
   v=(throat*.18+rasp*.85+rumble*.6)*envelope*mod+
    high*.12*breathSweep;
  }else{
   // Pneumatic and heavy mechanical whine / hydraulic movement.
   const motor=Math.sin(2*Math.PI*(lowFreq*.62*t+.16*t*t));
   const steam=high*.38+body*.35;
   const slow=clamp(t/.17)*clamp((duration-t)/.2);
   v=(motor*.20+steam*.95+rumble*1.2)*slow*envelope;
  }
  // Two short damped early reflections give the attack a physical space.
  const first=i-Math.floor(.037*sampleRate),second=i-Math.floor(.071*sampleRate);
  const reflected=(first>=0?samples[first]*.12:0)+(second>=0?samples[second]*.07:0);
  const shaped=Math.tanh((v+reflected)*1.65);
  samples[i]=shaped*.62;
 }
 // Smooth stop to prevent clicks even with irregular automation.
 const fade=Math.min(Math.floor(.022*sampleRate),length>>2);
 for(let i=0;i<fade;i++)samples[length-1-i]*=i/fade;
 return {samples,sampleRate,duration:length/sampleRate};
}
export function makeWeaponClip(id:WeaponId,sampleRate=24000,suppressed=false):PcmClip{
 const c=weaponAcoustics[id],isMelee=audioKindForWeapon(id)==='melee';
 const duration=isMelee?.18+c.decay*.6:.16+c.decay*.58;
 return renderClip(id,duration,sampleRate,isMelee?'melee':'gunshot',c,suppressed);
}
export function makeReloadClip(id:WeaponId,sampleRate=24000):PcmClip{
 return renderClip(id+'-reload',.55,sampleRate,'reload',weaponAcoustics[id]);
}
const zombieTones:Record<ZombieKind,{weight:number;crack:number;metal:number;decay:number}>={
 shambler:{weight:.7,crack:.22,metal:.15,decay:.65},
 runner:{weight:.24,crack:.78,metal:.5,decay:.34},
 armored:{weight:.86,crack:.29,metal:.4,decay:.64},
 bruiser:{weight:1,crack:.23,metal:.3,decay:.85},
 boss:{weight:1,crack:.56,metal:.68,decay:1}
};
export function makeZombieClip(kind:ZombieKind,event:'spawn'|'growl'|'attack'|'hurt'|'death'|'boss',sampleRate=24000):PcmClip{
 const c=zombieTones[kind];
 const duration=event==='death'?.67:event==='attack'?.25:event==='hurt'?.26:event==='spawn'?.48:event==='boss'?1:.75;
 return renderClip(kind+'-'+event,duration,sampleRate,'zombie',{...c,decay:c.decay*(event==='death'?1.15:1)});
}
export function makeMachineryClip(id:'elevator'|'breach',sampleRate=24000):PcmClip{
 const c=id==='elevator'?{weight:.85,crack:.35,metal:.72,decay:.92}:{weight:1,crack:.56,metal:.9,decay:1};
 return renderClip(id,1.35,sampleRate,'mechanism',c);
}

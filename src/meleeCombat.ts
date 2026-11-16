/** Shared cosmetic timing and gameplay limits for player and squad melee attacks. */
import type {WeaponId,Weapon} from './equipmentArmory.ts';
import {effectiveStats} from './equipmentArmory.ts';
export type MeleeAnimation={model:WeaponId;progress:number;angleOffset:number;thrust:number};
export type MeleeAttack<T extends {x:number;y:number}>={actor:T;weapon:Weapon;dx:number;dy:number;elapsed:number;duration:number;contact:number;damage:number;range:number;hit:boolean};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const meleeTargetLimit=(model:WeaponId,tier:number):number=>
 model==='axe'?Math.min(6,2+Math.max(0,Math.floor(tier)-1)):1;
export const meleeRecovery=(weapon:Weapon):number=>{
 const rate=effectiveStats(weapon).rate;
 // Knife upgrades favor attack frequency rather than cleave. Other melee weapons
 // retain their approved attack rate progression.
 return weapon.model==='knife'?Math.max(.18,rate*Math.pow(.89,Math.max(0,weapon.tier-1))):rate;
};
export const meleeDuration=(model:WeaponId):number=>
 model==='knife'?.235:model==='axe'?.47:model==='machete'?.36:model==='crowbar'?.42:.34;
export const meleeContact=(model:WeaponId):number=>
 model==='knife'?.48:model==='axe'?.54:.51;
export function meleePose(model:WeaponId,progress:number):MeleeAnimation{
 const p=clamp(progress);
 if(model==='knife'){
  // Retract, forward stab, recovery; never sweep the knife through a crowd.
  const thrust=p<.20?-.09*p/.20:p<.48?-.09+.31*(p-.20)/.28:p<.8?.22*(1-(p-.48)/.32):0;
  return {model,progress:p,angleOffset:0,thrust};
 }
 // Fire axe and other melee tools physically sweep across their attack arc.
 const swing=p<.17?-1.00:p<.76?-1+2.05*((p-.17)/.59):1.05*(1-(p-.76)/.24);
 return {model,progress:p,angleOffset:swing,thrust:0};
}
export function createMeleeAttack<T extends {x:number;y:number}>(
 actor:T,weapon:Weapon,direction:{x:number;y:number},damage:number,range:number
):MeleeAttack<T>{
 const length=Math.hypot(direction.x,direction.y)||1;
 return {actor,weapon,dx:direction.x/length,dy:direction.y/length,
  elapsed:0,duration:meleeDuration(weapon.model),contact:meleeContact(weapon.model),
  damage,range,hit:false};
}
export function advanceMeleeAttack<T extends {x:number;y:number}>(
 attack:MeleeAttack<T>,dt:number
):{strike:boolean;ended:boolean}{
 const previous=attack.elapsed/attack.duration;
 attack.elapsed=Math.min(attack.duration,attack.elapsed+Math.max(0,dt));
 const progress=attack.elapsed/attack.duration;
 const strike=!attack.hit&&previous<attack.contact&&progress>=attack.contact;
 if(strike)attack.hit=true;
 return {strike,ended:progress>=1};
}

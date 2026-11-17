/** Movement-first auto combat: choose only a real, reachable infected, never walls
 * or unexplored targets. Existing bullet/melee geometry remains authoritative. */
import type {DungeonLayout} from './dungeon.ts';
import type {WeaponId} from './equipmentArmory.ts';
import {aimHasTarget,unit,type TargetCircle} from './hitDetection.ts';
export type AutoTarget<T extends TargetCircle>={target:T;direction:{x:number;y:number}};
export function findAutoTarget<T extends TargetCircle>(
 map:DungeonLayout,origin:{x:number;y:number},range:number,model:WeaponId,targets:readonly T[],
 visible:(target:T)=>boolean=()=>true
):AutoTarget<T>|null{
 const candidates=targets.filter(t=>t.alive&&visible(t)&&Math.hypot(t.x-origin.x,t.y-origin.y)<=range+.30)
  .sort((a,b)=>{
   const da=Math.hypot(a.x-origin.x,a.y-origin.y),db=Math.hypot(b.x-origin.x,b.y-origin.y);
   // Threats approaching within two tiles are always dealt with first.
   const ta=da<2?da-3:da,tb=db<2?db-3:db;
   return ta-tb;
  });
 for(const target of candidates){
  const direction=unit(target.x-origin.x,target.y-origin.y);
  if(aimHasTarget(map,origin,direction,range,[target],model))return {target,direction};
 }
 return null;
}

/** Shared authoritative collision geometry for bullets and melee. */
import type {DungeonLayout} from './dungeon.ts';
import type {WeaponId} from './equipmentArmory.ts';
import {weaponDefs} from './equipmentArmory.ts';
import {solidAt} from './propCollision.ts';

export type TargetCircle={x:number;y:number;alive:boolean;boss?:boolean;kind?:string};
export type Hit<T extends TargetCircle>={target:T;distance:number;x:number;y:number};
export type ShotTrace<T extends TargetCircle>={hits:Hit<T>[];distance:number};
export type Point={x:number;y:number};
export const unit=(x:number,y:number):Point=>{const d=Math.hypot(x,y);return d>0?{x:x/d,y:y/d}:{x:1,y:0}};
export const zombieRadius=(t:TargetCircle):number=>t.boss?.51:t.kind==='bruiser'?.46:t.kind==='runner'?.32:.38;
const blocked=(map:DungeonLayout,x:number,y:number):boolean=>{
 const tx=Math.floor(x+.5),ty=Math.floor(y+.5);
 return solidAt(map,tx,ty);
};
export function distanceToWall(map:DungeonLayout,from:Point,dir:Point,range:number):number{
 const step=.065;
 for(let d=step;d<=range;d+=step)
  if(blocked(map,from.x+dir.x*d,from.y+dir.y*d))return Math.max(0,d-step);
 return range;
}
export function traceBullet<T extends TargetCircle>(
 map:DungeonLayout,origin:Point,direction:Point,range:number,targets:readonly T[],penetration=0
):ShotTrace<T>{
 const dir=unit(direction.x,direction.y),wallDistance=distanceToWall(map,origin,dir,range);
 const candidates:Hit<T>[]=[];
 for(const target of targets){
  if(!target.alive)continue;
  const dx=target.x-origin.x,dy=target.y-origin.y;
  const along=dx*dir.x+dy*dir.y,perpSq=Math.max(0,dx*dx+dy*dy-along*along),radius=zombieRadius(target);
  if(along<0||perpSq>radius*radius)continue;
  const distance=Math.max(0,along-Math.sqrt(Math.max(0,radius*radius-perpSq)));
  if(distance>wallDistance+.00001)continue;
  candidates.push({target,distance,x:origin.x+dir.x*distance,y:origin.y+dir.y*distance});
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 const maxHits=1+Math.max(0,Math.floor(penetration)),hits=candidates.slice(0,maxHits);
 return {hits,distance:hits.length>=maxHits?hits[hits.length-1].distance:wallDistance};
}
export function meleeHits<T extends TargetCircle>(
 map:DungeonLayout,origin:Point,direction:Point,range:number,targets:readonly T[],model:'knife'|'axe'
):Hit<T>[]{
 const dir=unit(direction.x,direction.y),halfAngle=model==='axe'?.92:.75,found:Hit<T>[]=[];
 for(const target of targets){
  if(!target.alive)continue;
  const dx=target.x-origin.x,dy=target.y-origin.y,dist=Math.hypot(dx,dy),radius=zombieRadius(target);
  if(dist>range+radius)continue;
  const facing=dist===0?1:(dx*dir.x+dy*dir.y)/dist;
  if(facing<Math.cos(halfAngle+Math.asin(Math.min(.95,radius/Math.max(radius,dist)))))continue;
  if(distanceToWall(map,origin,unit(dx,dy),dist)<dist-.12)continue;
  found.push({target,distance:Math.max(0,dist-radius),x:target.x,y:target.y});
 }
 found.sort((a,b)=>a.distance-b.distance);
 return found.slice(0,model==='axe'?2:1);
}
export const penetrationFor=(model:WeaponId):number=>weaponDefs[model].penetration??0;

/** True only when the current aim would strike a zombie within weapon reach.
 * Does not fire at empty space, through walls, or beyond range.
 */
export function aimHasTarget<T extends TargetCircle>(
 map:DungeonLayout,origin:Point,direction:Point,range:number,targets:readonly T[],model:WeaponId
):boolean{
 if(model==='knife'||model==='axe')return meleeHits(map,origin,direction,range,targets,model).length>0;
 return traceBullet(map,origin,direction,range,targets,0).hits.length>0;
}

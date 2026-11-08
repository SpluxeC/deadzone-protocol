import type {ZombieKind} from './combatSystems.ts';

/** Small, save-compatible zombie perception and hit reaction rules. */
export type Point={x:number;y:number};
export type ThreatKind='idle'|'investigate'|'search'|'chase';
export type SenseInput={kind:ZombieKind;position:Point;player:Point;canSeePlayer:boolean;noise?:{x:number;y:number;radius:number;ttl:number}|null;lastKnown?:Point|null;memory:number;searchClock:number;spawnIndex:number};
export type SenseResult={mode:ThreatKind;target:Point|null;memory:number;searchClock:number;lastKnown:Point|null};
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Zombies remember where the player was, not where the player is now. */
export function senseZombie(input:SenseInput,dt:number):SenseResult{
 const visualRadius=input.kind==='runner'?10:input.kind==='boss'?17:7.5;
 if(input.canSeePlayer&&dist(input.position,input.player)<=visualRadius)
  return {mode:'chase',target:{...input.player},lastKnown:{...input.player},memory:4.5,searchClock:0};
 const noise=input.noise;
 if(noise&&noise.ttl>0&&dist(input.position,noise)<=noise.radius)
  return {mode:'investigate',target:{x:noise.x,y:noise.y},lastKnown:{x:noise.x,y:noise.y},memory:Math.max(input.memory,3.5),searchClock:0};
 const memory=Math.max(0,input.memory-dt),lastKnown=input.lastKnown??null;
 if(!lastKnown||memory===0)return{mode:'idle',target:null,lastKnown:null,memory:0,searchClock:0};
 const arrived=dist(input.position,lastKnown)<1.15;
 const searchClock=arrived?input.searchClock+dt:0;
 if(searchClock>2.4)return{mode:'idle',target:null,lastKnown:null,memory:0,searchClock:0};
 if(arrived){
  const angle=((input.spawnIndex*1.61803398875)%6.283)+Math.sin(searchClock*2)*1.2;
  return {mode:'search',target:{x:lastKnown.x+Math.cos(angle)*1.3,y:lastKnown.y+Math.sin(angle)*1.3},lastKnown,memory,searchClock};
 }
 return {mode:'search',target:lastKnown,lastKnown,memory,searchClock};
}
/** Runners take one of two flanks when they can see their quarry. */
export function tacticalTarget(kind:ZombieKind,position:Point,target:Point,index:number,mode:ThreatKind):Point{
 if(kind!=='runner'||mode!=='chase')return target;
 const dx=target.x-position.x,dy=target.y-position.y,d=Math.hypot(dx,dy)||1;
 const side=index%2===0?1:-1,offset=Math.min(2.35,d*.38);
 return {x:target.x-dy/d*side*offset,y:target.y+dx/d*side*offset};
}
/** Armor resists stagger, runners react sharply, bosses barely budge. */
export function hitReaction(kind:ZombieKind,damage:number,melee:boolean):{stagger:number;knockback:number}{
 const base=Math.min(1,Math.max(0,damage));
 const factor=kind==='boss'?.13:kind==='armored'?.35:kind==='bruiser'?.45:kind==='runner'?1.25:1;
 return {stagger:Math.min(.65,base*(melee?.38:.22)*factor),knockback:Math.min(.4,base*(melee?.3:.10)*factor)};
}
/** A squadmate in the corridor between shooter and target should block the shot. */
export function friendlyFireLane(shooter:Point,target:Point,friendlies:readonly Point[],radius=.35):boolean{
 const dx=target.x-shooter.x,dy=target.y-shooter.y,denom=dx*dx+dy*dy;
 if(denom<.00001)return false;
 return friendlies.some(ally=>{
  const t=((ally.x-shooter.x)*dx+(ally.y-shooter.y)*dy)/denom;
  if(t<=.06||t>=.96)return false;
  return Math.hypot(ally.x-shooter.x-t*dx,ally.y-shooter.y-t*dy)<radius;
 });
}

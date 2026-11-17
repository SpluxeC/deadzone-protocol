/** Persistent, non-blocking incendiary pools. Only enemies walking over
 * the ground fire ignite; the initial canister impact deals no damage. */
export type GroundFire={x:number;y:number;age:number;duration:number;radius:number;seed:number};
export const GROUND_FIRE_DURATION=9;
export const GROUND_FIRE_RADIUS=2.35;
export const MAX_GROUND_FIRES=16;
export function createGroundFire(x:number,y:number,seed=0):GroundFire{
 return {x,y,age:0,duration:GROUND_FIRE_DURATION,radius:GROUND_FIRE_RADIUS,seed};
}
export function insideGroundFire(fire:GroundFire,actor:{x:number;y:number}):boolean{
 return fire.age<fire.duration&&Math.hypot(actor.x-fire.x,actor.y-fire.y)<=fire.radius;
}
export function advanceGroundFires(fires:GroundFire[],dt:number):GroundFire[]{
 for(const fire of fires)fire.age=Math.min(fire.duration,fire.age+Math.max(0,dt));
 return fires.filter(fire=>fire.age<fire.duration);
}
export function migrateGroundFires(value:unknown):GroundFire[]{
 if(!Array.isArray(value))return [];
 return value.filter((v):v is GroundFire=>!!v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&
  Number.isFinite(v.age)&&Number.isFinite(v.duration)&&Number.isFinite(v.radius)&&
  v.duration>0&&v.radius>0&&v.age>=0&&v.age<v.duration).slice(-MAX_GROUND_FIRES)
  .map(v=>({...v,seed:Number.isFinite(v.seed)?v.seed:0}));
}

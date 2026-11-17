/** Non-blocking tactical barbed-wire strips. Geometry uses three real grid cells.
 * This never modifies dungeon tiles, collision solids, or zombie route fields. */
export type WireCell={x:number;y:number};
export type WireFence={x:number;y:number;orientation:'horizontal'|'vertical';age:number;durability:number};
export const WIRE_CAP=3;
/** One durability charge is spent each time a distinct zombie enters a fence. */
export const WIRE_MAX_DURABILITY=10;
export const wireKey=(wire:WireFence):string=>wire.x+':'+wire.y+':'+wire.orientation;
export function wearWire(wire:WireFence):boolean{
 wire.durability=Math.max(0,wire.durability-1);
 return wire.durability===0;
}

export const WIRE_TICK_SECONDS=.5;
export const WIRE_TICK_DAMAGE=.8;
export const WIRE_SLOW_FACTOR=.48;
export function wireCells(wire:WireFence):WireCell[]{
 return [-1,0,1].map(i=>wire.orientation==='horizontal'
  ?{x:wire.x+i,y:wire.y}:{x:wire.x,y:wire.y+i});
}
export function proposedWire(player:{x:number;y:number},direction:{x:number;y:number}):WireFence{
 const verticalTravel=Math.abs(direction.y)>Math.abs(direction.x);
 // An east/west-facing player lays a north/south fence, and vice versa.
 const orientation=verticalTravel?'horizontal':'vertical';
 const step=verticalTravel?Math.sign(direction.y)||1:Math.sign(direction.x)||1;
 return verticalTravel
  ?{x:Math.round(player.x),y:Math.round(player.y)+step,orientation,age:0,durability:WIRE_MAX_DURABILITY}
  :{x:Math.round(player.x)+step,y:Math.round(player.y),orientation,age:0,durability:WIRE_MAX_DURABILITY};
}
export function canDeployWire(wire:WireFence,validCell:(x:number,y:number)=>boolean,others:readonly WireFence[]):boolean{
 return wire.durability>0&&wireCells(wire).every(c=>validCell(c.x,c.y)&&!others.some(other=>wireCells(other).some(o=>o.x===c.x&&o.y===c.y)));
}
export function touchesWire(pos:{x:number;y:number},wire:WireFence):boolean{
 // Small edge allowance accounts for actors having nonzero body radius.
 return wire.durability>0&&wireCells(wire).some(c=>Math.abs(pos.x-c.x)<=.56&&Math.abs(pos.y-c.y)<=.56);
}
export function migrateWireFences(value:unknown):WireFence[]{
 if(!Array.isArray(value))return [];
 return value.filter((f):f is WireFence=>!!f&&Number.isInteger(f.x)&&Number.isInteger(f.y)&&
  (f.orientation==='horizontal'||f.orientation==='vertical'))
  .slice(0,30).map(f=>({...f,age:Math.max(0,Number(f.age)||0),
   durability:Number.isFinite(f.durability)?Math.min(WIRE_MAX_DURABILITY,Math.max(0,Math.floor(f.durability))):WIRE_MAX_DURABILITY}))
  .filter(f=>f.durability>0);
}

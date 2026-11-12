/** Tactical grenade equipment: dedicated storage, deterministic supply loot, and flight physics. */
export const GRENADE_TYPES=['frag','impact','stun','lure'] as const;
export type GrenadeType=typeof GRENADE_TYPES[number];
export type GrenadeInventory=Record<GrenadeType,number>;
export const GRENADE_PRICE:Record<GrenadeType,number>={frag:60,impact:50,stun:45,lure:40};
export const GRENADE_RADIUS:Record<GrenadeType,number>={frag:3,impact:3,stun:4,lure:12};
export const GRENADE_CAP=2;
export const emptyGrenades=():GrenadeInventory=>({frag:0,impact:0,stun:0,lure:0});
export function migrateGrenades(v?:Partial<GrenadeInventory>|null):GrenadeInventory{
 const result=emptyGrenades();
 for(const type of GRENADE_TYPES)result[type]=Math.min(GRENADE_CAP,Math.max(0,Math.floor(Number(v?.[type])||0)));
 return result;
}
export function grantGrenade(inventory:GrenadeInventory,type:GrenadeType,amount:number):{added:number;credits:number}{
 const count=Math.max(0,Math.floor(amount)),added=Math.min(count,GRENADE_CAP-inventory[type]);
 inventory[type]+=added;
 return {added,credits:(count-added)*Math.floor(GRENADE_PRICE[type]/2)};
}
export function grenadeCrateLoot(seed:number,wave:number,crate:number):{type:GrenadeType;amount:number}|null{
 let s=(seed^Math.imul(wave+17,0x9e3779b1)^Math.imul(crate+53,0x85ebca6b))>>>0;
 const roll=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
 if(roll()>=.2)return null;
 return {type:GRENADE_TYPES[Math.floor(roll()*4)],amount:roll()<.75?1:2};
}
export type GrenadeFlight={type:GrenadeType;x:number;y:number;vx:number;vy:number;age:number;life:number;altitude:number;active:number;fired:boolean;originX:number;originY:number};
export function throwGrenade(type:GrenadeType,x:number,y:number,dx:number,dy:number):GrenadeFlight{
 const d=Math.hypot(dx,dy)||1;
 return {type,x,y,vx:dx/d*14,vy:dy/d*14,age:0,life:type==='frag'?2:1,altitude:0,active:0,fired:false,originX:x,originY:y};
}
export function advanceGrenade(g:GrenadeFlight,dt:number,walkable:(x:number,y:number)=>boolean):{detonate:boolean;ended:boolean}{
 g.age+=dt;
 if(!g.fired){
  const nx=g.x+g.vx*dt,ny=g.y+g.vy*dt;
  const travel=Math.hypot(nx-g.originX,ny-g.originY);
  const rangeReached=travel>=6;
  // Clamp the position to six tiles before testing collisions, so no frame
  // can put a grenade beyond its maximum throw distance.
  const scale=rangeReached?6/travel:1;
  const tx=g.originX+(nx-g.originX)*scale,ty=g.originY+(ny-g.originY)*scale;
  const hitX=!walkable(tx,g.y),hitY=!walkable(g.x,ty);
  if(g.type==='impact'&&(hitX||hitY||rangeReached)){
   if(!hitX)g.x=tx;
   if(!hitY)g.y=ty;
   g.fired=true;return {detonate:true,ended:true};
  }
  if(rangeReached&&!hitX&&!hitY){g.x=tx;g.y=ty;g.vx=0;g.vy=0;}
  else{
   if(hitX)g.vx*=-.45;else g.x=tx;
   if(hitY)g.vy*=-.45;else g.y=ty;
  }
  const drag=Math.pow(.55,dt);g.vx*=drag;g.vy*=drag;
  g.altitude=Math.max(0,Math.sin(Math.min(1,g.age/.72)*Math.PI)*.65);
  if(g.type==='impact'&&g.age>=.72){g.fired=true;return {detonate:true,ended:true}}
  if(g.age>=g.life){g.fired=true;return {detonate:true,ended:g.type!=='lure'}}
  return {detonate:false,ended:false};
 }
 if(g.type==='lure'){g.active=Math.max(0,g.active-dt);return {detonate:false,ended:g.active<=0}}
 return {detonate:false,ended:true};
}
export function blastDamage(type:'frag'|'impact',distance:number):number{
 if(distance>3)return 0;
 // Ordinary zombies near the core are usually eliminated; armored and bosses survive.
 return (type==='frag'?20:11)*(1-.55*Math.max(0,distance)/3);
}

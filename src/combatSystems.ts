import type {DungeonLayout} from './dungeon.ts';
import {solidAt} from './propCollision.ts';

export type ZombieKind='shambler'|'runner'|'armored'|'bruiser'|'boss';
export type WeaponSlot='primary'|'secondary'|'melee';
export type WeaponHandling={slot:WeaponSlot;mag:number;reserve:number;capacity:number;rate:number;damage:number;range:number;reload:number};
export type Cell={x:number;y:number};
export type ZombieStats={hp:number;speed:number;damage:number;reach:number;attackInterval:number;color:string};
export function zombieKind(wave:number,spawnIndex:number,boss=false):ZombieKind{
 if(boss)return 'boss';
 const mix=(Math.imul(spawnIndex+1,1103515245)+Math.imul(wave+7,12345))>>>0;
 if(wave>=12&&mix%13===0)return 'bruiser';
 if(wave>=8&&mix%7===0)return 'armored';
 if(wave>=4&&mix%5===0)return 'runner';
 return 'shambler';
}
/** Enemy stats are mostly fixed: horde size, variants and positioning supply the scaling. */
export function zombieStats(kind:ZombieKind):ZombieStats {
 switch(kind){
  case 'runner':return {hp:2,speed:1.36,damage:5,reach:.7,attackInterval:.8,color:'#db8551'};
  case 'armored':return {hp:5,speed:.59,damage:9,reach:.8,attackInterval:1.3,color:'#899ba5'};
  case 'bruiser':return {hp:9,speed:.48,damage:13,reach:1,attackInterval:1.6,color:'#b57391'};
  case 'boss':return {hp:90,speed:.72,damage:16,reach:1.1,attackInterval:1.5,color:'#f2a24d'};
  default:return {hp:2,speed:.83,damage:7,reach:.75,attackInterval:1.25,color:'#ba6159'};
 }
}
export function weaponStats(slot:WeaponSlot,tier:number):Omit<WeaponHandling,'mag'|'reserve'>{
 if(slot==='secondary')return {slot,capacity:12,rate:.34,damage:1,range:5.5,reload:1.25};
 if(slot==='melee')return {slot,capacity:0,rate:.55,damage:2,range:1.25,reload:0};
 return {slot,capacity:12+Math.max(0,tier-1)*3,rate:Math.max(.13,.22-Math.max(0,tier-1)*.018),damage:Math.max(1,tier),range:7.5,reload:1.7};
}
export function reloadTransfer(mag:number,reserve:number,capacity:number):{mag:number;reserve:number;loaded:number}{
 const loaded=Math.min(Math.max(0,capacity-mag),Math.max(0,reserve));
 return {mag:mag+loaded,reserve:reserve-loaded,loaded};
}
/** A single BFS distance-field can steer all zombies around arbitrary walls. */
export function distanceField(map:DungeonLayout,target:Cell):Int32Array {
 const {width:w,height:h,tiles}=map,out=new Int32Array(w*h).fill(-1);
 const sx=Math.floor(target.x+.5),sy=Math.floor(target.y+.5);
 if(sx<0||sy<0||sx>=w||sy>=h||solidAt(map,sx,sy))return out;
 const queue=new Int32Array(w*h);let head=0,tail=1;const origin=sy*w+sx;out[origin]=0;queue[0]=origin;
 while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w),d=out[at]+1;
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
   const index=ny*w+nx;if(solidAt(map,nx,ny)||out[index]!==-1)continue;
   out[index]=d;queue[tail++]=index;
  }
 }
 return out;
}
export function nextZombieWaypoint(map:DungeonLayout,field:Int32Array,position:Cell):Cell {
 const x=Math.floor(position.x+.5),y=Math.floor(position.y+.5),w=map.width,h=map.height;
 if(x<0||y<0||x>=w||y>=h)return position;
 const at=y*w+x,old=field[at];if(old<0)return position;
 let best=old,result={x,y};
 for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
  const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
  const d=field[ny*w+nx];if(d>=0&&d<best){best=d;result={x:nx,y:ny}}
 }
 return result;
}
export function incomingDamage(hit:number,armor:number):{hpDamage:number;armor:number}{
 const blocked=Math.min(Math.max(0,armor),Math.max(0,hit));
 return {hpDamage:Math.max(0,hit-blocked),armor:Math.max(0,armor-blocked)};
}

export type BossAttack='slam'|'charge'|'shockwave';
/** Boss patterns alternate every five waves; all attacks are windup-telegraphed. */
export function bossAttack(wave:number):BossAttack{
 const index=Math.max(0,Math.floor(wave/5)-1)%3;
 return index===0?'slam':index===1?'charge':'shockwave';
}
export function bossImpact(attack:BossAttack,distance:number):number {
 if(attack==='charge')return distance<1.25?24:0;
 if(attack==='shockwave')return distance<3.2?14:0;
 return distance<2.4?19:0;
}

/** Named boss variants remain stable across saves and repeat every 15 waves. */
export function bossIdentity(wave:number):{name:string;subtitle:string;color:string;ability:BossAttack}{
 const ability=bossAttack(wave);
 if(ability==='charge')return {name:'THE BREAKER',subtitle:'Armored breach mutant',color:'#f6a866',ability};
 if(ability==='shockwave')return {name:'THE REVENANT',subtitle:'Resonant infected',color:'#c58cff',ability};
 return {name:'THE BUTCHER',subtitle:'Massive close-range brute',color:'#fa6666',ability};
}
/** Charge damage checks against the committed dash segment, not the player's later position. */
export function distanceToSegment(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}):number{
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}

import type {DungeonLayout} from './dungeon.ts';
import type {WavePlan} from './rogueliteRules.ts';
export type SpawnHole={x:number;y:number};
export const SEAL_COST=200;
/** Stable per-floor locations: holes never move, and closures persist in the run save. */
export function spawnHoles(plan:WavePlan):SpawnHole[]{
 const map=plan.map;
 const safe=(p:SpawnHole)=>p.x>1&&p.y>1&&p.x<map.width-2&&p.y<map.height-2
  &&map.tiles[Math.round(p.y)*map.width+Math.round(p.x)]===0
  &&Math.hypot(p.x-map.entrance.x,p.y-map.entrance.y)>7
  &&Math.hypot(p.x-map.extraction.x,p.y-map.extraction.y)>3
  &&map.loot.every(c=>Math.hypot(p.x-c.x,p.y-c.y)>1.5)
  &&(!map.secret||Math.hypot(p.x-map.secret.center.x,p.y-map.secret.center.y)>3);
 const result:SpawnHole[]=[];
 for(const p of plan.spawnPoints){
  if(safe(p)&&result.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=2.5))result.push({x:p.x,y:p.y});
 }
 // Older layouts may have fewer eligible spawn markers; ensure three sealable holes
 // so every wave, including a migrated save, can satisfy the elevator objective.
 if(result.length<3){
  for(let y=2;y<map.height-2;y++)for(let x=2;x<map.width-2;x++){
   const p={x,y};if(safe(p)&&result.every(q=>Math.hypot(q.x-x,q.y-y)>=2.5))result.push(p);
   if(result.length>=8)return result;
  }
 }
 // On very compact legacy maps, relax decorative clearances while preserving a
 // walkable breach, separation, and distance from player spawn and elevator.
 if(result.length<3){
  for(let y=1;y<map.height-1&&result.length<3;y++)for(let x=1;x<map.width-1&&result.length<3;x++){
   const p={x,y},floor=map.tiles[y*map.width+x]===0;
   if(!floor||Math.hypot(x-map.entrance.x,y-map.entrance.y)<4||
      Math.hypot(x-map.extraction.x,y-map.extraction.y)<1.8)continue;
   if(map.loot.some(c=>Math.hypot(x-c.x,y-c.y)<.85))continue;
   if(result.some(q=>Math.hypot(q.x-x,q.y-y)<1.8))continue;
   result.push(p);
  }
 }
 return result;
}
/** Closure is indexed against the stable seed-based list. */
export const openHoleIndices=(holes:readonly SpawnHole[],sealed:readonly number[]):number[]=>holes.map((_,i)=>i).filter(i=>!sealed.includes(i));
export const canSealHole=(credits:number,sealed:readonly number[],index:number,count:number):boolean=>
 Number.isInteger(index)&&index>=0&&index<count&&!sealed.includes(index)&&credits>=SEAL_COST;
/** Pure credit transaction; callers save immediately after a successful result. */
export function sealHole(credits:number,sealed:readonly number[],index:number,count:number):{credits:number;sealed:number[]}|null{
 if(!canSealHole(credits,sealed,index,count))return null;
 return {credits:credits-SEAL_COST,sealed:[...sealed,index]};
}

export const BREACH_DURATION=25;
export const REQUIRED_SEALS=3;
export const BREACH_WAVE_TIMES=[3,7,11,15,20] as const;
/** A single loud sealing operation may run at once; no second charge is possible mid-event. */
export type BreachEvent={index:number;remaining:number;waveSpawned:number};
export function startBreachEvent(credits:number,sealed:readonly number[],index:number,count:number,active:BreachEvent|null):{credits:number;event:BreachEvent}|null{
 if(active||!canSealHole(credits,sealed,index,count))return null;
 return {credits:credits-SEAL_COST,event:{index,remaining:BREACH_DURATION,waveSpawned:0}};
}
export function advanceBreachEvent(event:BreachEvent,dt:number):{event:BreachEvent|null;completed:boolean;spawnCount:number}{
 const previous=BREACH_DURATION-Math.max(0,Math.min(BREACH_DURATION,event.remaining));
 const remaining=Math.max(0,event.remaining-Math.max(0,dt));
 const elapsed=BREACH_DURATION-remaining;
 const triggered=BREACH_WAVE_TIMES.filter(time=>time<=elapsed).length;
 const spawnCount=Math.max(0,triggered-event.waveSpawned);
 return {event:remaining>0?{index:event.index,remaining,waveSpawned:triggered}:null,completed:remaining===0,spawnCount};
}
export function canExtract(sealed:readonly number[],active:BreachEvent|null):boolean{
 return new Set(sealed).size>=REQUIRED_SEALS&&!active;
}
export function drawSpawnHole(ctx:CanvasRenderingContext2D,v:{ox:number;oy:number;tile:number},p:SpawnHole,sealed:boolean,time:number):void{
 const x=v.ox+p.x*v.tile,y=v.oy+p.y*v.tile,t=v.tile;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,t*.16,t*.72,t*.47,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#524c41';ctx.beginPath();ctx.ellipse(0,0,t*.59,t*.42,-.1,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#95816a';ctx.lineWidth=Math.max(1,t*.06);ctx.beginPath();ctx.ellipse(0,0,t*.55,t*.37,-.1,0,Math.PI*2);ctx.stroke();
 if(sealed){
  ctx.fillStyle='#777b74';ctx.beginPath();ctx.ellipse(0,0,t*.49,t*.33,-.1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#353c3a';ctx.lineWidth=Math.max(1,t*.09);
  ctx.beginPath();ctx.moveTo(-t*.35,-t*.23);ctx.lineTo(t*.35,t*.23);ctx.moveTo(t*.32,-t*.23);ctx.lineTo(-t*.32,t*.23);ctx.stroke();
  ctx.fillStyle='#b5bcb1';for(const dx of [-.3,.3]){ctx.beginPath();ctx.arc(dx*t,0,t*.043,0,Math.PI*2);ctx.fill()}
 }else{
  ctx.fillStyle='#090d0c';ctx.beginPath();ctx.ellipse(0,0,t*.44,t*.28,-.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(105,159,91,.24)';ctx.beginPath();ctx.ellipse(0,-t*.02,t*(.28+.03*Math.sin(time*2)),t*.16,0,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

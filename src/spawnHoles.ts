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
 // Very small or older maps still need at least one safe entrance to the horde.
 if(!result.length){
  for(let y=2;y<map.height-2;y++)for(let x=2;x<map.width-2;x++){
   const p={x,y};if(safe(p)&&result.every(q=>Math.hypot(q.x-x,q.y-y)>=2.5))result.push(p);
   if(result.length>=8)return result;
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

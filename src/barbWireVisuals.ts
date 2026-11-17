import type {View} from './rogueliteVisuals.ts';
import {WIRE_MAX_DURABILITY,type WireFence} from './barbWire.ts';
/** Floor-level decorative barbed wire, never entered into collision or pathfinding. */
export function drawBarbedWire(ctx:CanvasRenderingContext2D,v:View,fence:WireFence):void{
 const t=v.tile;
 const horizontal=fence.orientation==='horizontal';
 const x=v.ox+fence.x*t,y=v.oy+fence.y*t;
 const deploy=Math.min(1,Math.max(0,fence.age/.32));
 const wear=Math.max(0,Math.min(1,fence.durability/WIRE_MAX_DURABILITY));
 ctx.save();
 ctx.translate(x,y);
 ctx.globalAlpha=Math.max(.2,deploy)*(.45+.55*wear);
 ctx.scale(horizontal?deploy:1,horizontal?1:deploy);
 const post=(px:number,py:number)=>{
  ctx.fillStyle='#20282a';ctx.beginPath();ctx.ellipse(px+2,py+3,t*.12,t*.10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7b8882';ctx.beginPath();ctx.ellipse(px,py,t*.092,t*.095,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a2aba4';ctx.fillRect(px-t*.025,py-t*.07,t*.05,t*.13);
 };
 for(const i of [-1,0,1]){
  // Damaged fences lose coils progressively before collapsing completely.
  if(wear<.40&&i===1)continue;
  if(wear<.19&&i===-1)continue;
  const px=(horizontal?i:0)*t,py=(horizontal?0:i)*t;
  ctx.save();ctx.translate(px,py);
  // Low intertwined coils have a substantial, readable top-down silhouette.
  ctx.strokeStyle='#1b2426';ctx.lineWidth=t*.12;
  ctx.beginPath();ctx.ellipse(0,0,horizontal?t*.44:t*.23,horizontal?t*.22:t*.44,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#a3aaa3';ctx.lineWidth=t*.064;
  ctx.beginPath();ctx.ellipse(0,0,horizontal?t*.44:t*.23,horizontal?t*.22:t*.44,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#5c6a66';ctx.lineWidth=t*.038;
  ctx.beginPath();ctx.ellipse(0,0,horizontal?t*.28:t*.13,horizontal?t*.14:t*.28,0,0,Math.PI*2);ctx.stroke();
  // Small sharp barbs spaced around each coil.
  for(let k=0;k<8;k++){
   const a=k*Math.PI/4+(i+1)*.18;
   const bx=Math.cos(a)*(horizontal?t*.44:t*.23);
   const by=Math.sin(a)*(horizontal?t*.22:t*.44);
   const nx=Math.cos(a),ny=Math.sin(a);
   ctx.strokeStyle='#c9cec2';ctx.lineWidth=Math.max(1,t*.022);
   ctx.beginPath();ctx.moveTo(bx-nx*t*.085,by-ny*t*.085);
   ctx.lineTo(bx+nx*t*.085,by+ny*t*.085);ctx.stroke();
  }
  ctx.restore();
 }
 const along=horizontal?[-1.4,1.4]:[-1.4,1.4];
 for(const n of along)post(horizontal?n*t:0,horizontal?0:n*t);
 // Connected taut lower strand with a few steel highlights.
 ctx.strokeStyle='#697870';ctx.lineWidth=t*.05;
 ctx.beginPath();
 ctx.moveTo(horizontal?-1.4*t:0,horizontal?0:-1.4*t);
 ctx.lineTo(horizontal?1.4*t:0,horizontal?0:1.4*t);ctx.stroke();
 // Small visible wear indicator on the central mounting post.
 if(wear<.75){
  ctx.strokeStyle='#d88459';ctx.lineWidth=Math.max(1,t*.032);
  ctx.beginPath();ctx.moveTo(-t*.13,t*.08);ctx.lineTo(t*.13,-t*.04);ctx.stroke();
 }
 ctx.restore();
}

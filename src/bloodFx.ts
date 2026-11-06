/** Cosmetic zombie blood: quick impact spray, wounds, and fading floor stains.
 * Strict caps keep 65-enemy battles affordable on mobile devices.
 */
import type {View} from './rogueliteVisuals.ts';
export type BloodFx={
 x:number;y:number;vx:number;vy:number;radius:number;age:number;life:number;
 kind:'spray'|'stain'|'wound';
};
export const MAX_BLOOD_EFFECTS=240;
const mix=(n:number):number=>{
 let k=Math.imul(n|0,0x45d9f3b);k=Math.imul(k^(k>>>16),0x45d9f3b);
 return ((k^(k>>>16))>>>0)/4294967296;
};
/** Returns visual-only blood without touching damage or save state. */
export function bloodOnHit(x:number,y:number,dx:number,dy:number,melee=false,seed=0,lethal=false):BloodFx[]{
 const v=Math.hypot(dx,dy)||1,ux=dx/v,uy=dy/v;
 const count=melee?9:5,extra=lethal?5:0,result:BloodFx[]=[];
 const originSeed=(Math.round(x*1151)^Math.imul(Math.round(y*1193),7)^seed)|0;
 for(let i=0;i<count+extra;i++){
  const a=(mix(originSeed+i*43)-.5)*(melee?2.8:1.7);
  const speed=(melee?1.75:1.1)*(0.5+mix(originSeed+i*97+5)*1.3);
  result.push({
   x:x+(mix(originSeed+i*31+2)-.5)*.3,y:y+(mix(originSeed+i*41+4)-.5)*.3,
   vx:(ux*Math.cos(a)-uy*Math.sin(a))*speed,
   vy:(uy*Math.cos(a)+ux*Math.sin(a))*speed,
   radius:.025+mix(originSeed+i*67+8)*(melee?.085:.065),
   age:0,life:.18+mix(originSeed+i*17+9)*.27,kind:'spray'
  });
 }
 // Ground blood survives a hit longer; faint wound marks render directly on zombies.
 for(let i=0;i<(lethal?5:melee?3:2);i++){
  const angle=mix(originSeed+i*103+21)*Math.PI*2;
  const distance=mix(originSeed+i*79+28)*(melee?.8:.5);
  result.push({
   x:x+Math.cos(angle)*distance,y:y+Math.sin(angle)*distance,
   vx:0,vy:0,radius:.08+mix(originSeed+i*29+11)*(lethal?.23:.14),
   age:0,life:lethal?20:13,kind:'stain'
  });
 }
 result.push({x,y,vx:0,vy:0,radius:melee?.37:.26,age:0,life:.48,kind:'wound'});
 return result;
}
export function ageBloodFx(effects:BloodFx[],dt:number):BloodFx[]{
 const alive:BloodFx[]=[];
 for(const blood of effects){
  blood.age+=dt;
  if(blood.age>=blood.life)continue;
  if(blood.kind==='spray'){
   blood.x+=blood.vx*dt;blood.y+=blood.vy*dt;
   blood.vx*=Math.max(0,1-dt*5);
   blood.vy*=Math.max(0,1-dt*5);
  }
  alive.push(blood);
 }
 return alive.length>MAX_BLOOD_EFFECTS?alive.slice(-MAX_BLOOD_EFFECTS):alive;
}
export function drawBloodFx(ctx:CanvasRenderingContext2D,v:View,effects:readonly BloodFx[],layer:'ground'|'front'):void{
 ctx.save();
 for(const blood of effects){
  if((layer==='ground')!==(blood.kind==='stain'))continue;
  const px=v.ox+blood.x*v.tile,py=v.oy+blood.y*v.tile,t=v.tile;
  if(px< -t||py< -t||px>v.width+t||py>v.height+t)continue;
  const fade=Math.min(1,(blood.life-blood.age)/(blood.kind==='stain'?4:.15));
  ctx.globalAlpha=(blood.kind==='stain'?.58:.9)*Math.max(0,fade);
  ctx.fillStyle=blood.kind==='stain'?'#5c1717':blood.kind==='wound'?'#af2722':'#d4372a';
  ctx.beginPath();
  const r=t*blood.radius;
  ctx.ellipse(px,py,r*(blood.kind==='stain'?1.5:1),r*(blood.kind==='stain'?.65:1),0,0,Math.PI*2);
  ctx.fill();
  if(blood.kind==='wound'){
   ctx.fillStyle='#ec5540';ctx.globalAlpha*=.8;
   ctx.beginPath();ctx.ellipse(px-r*.24,py-r*.2,r*.32,r*.25,0,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}

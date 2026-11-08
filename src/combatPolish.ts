import type {View} from './rogueliteVisuals.ts';
export type Casing={x:number;y:number;vx:number;vy:number;rotation:number;spin:number;age:number;life:number;kind:'casing'|'spark'};
export const MAX_CASINGS=90;
export function ejectCasing(x:number,y:number,dx:number,dy:number,seed:number,kind:'casing'|'spark'='casing'):Casing{
 const side=seed%2?1:-1;
 const speed=kind==='spark'?2.4:1.15;
 return {x:x-dy*.20,y:y+dx*.20,vx:(-dy*side+dx*.2)*speed,vy:(dx*side+dy*.2)*speed,rotation:(seed%31)/31*Math.PI,spin:side*8,age:0,life:kind==='spark'?.28:2.5};
}
export function ageCasings(list:Casing[],dt:number):Casing[]{
 for(const c of list){c.age+=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.rotation+=c.spin*dt;c.vx*=Math.max(0,1-dt*4);c.vy*=Math.max(0,1-dt*4);}
 return list.filter(c=>c.age<c.life).slice(-MAX_CASINGS);
}
export function drawCasings(ctx:CanvasRenderingContext2D,v:View,casings:readonly Casing[]):void{
 ctx.save();
 for(const c of casings){
  const x=v.ox+c.x*v.tile,y=v.oy+c.y*v.tile;
  if(x<0||y<0||x>v.width||y>v.height)continue;
  ctx.save();ctx.translate(x,y);ctx.rotate(c.rotation);
  ctx.globalAlpha=Math.min(1,(c.life-c.age)*2);
  ctx.fillStyle=c.kind==='spark'?'#ffd18a':'#c3a568';
  ctx.fillRect(-v.tile*.06,-v.tile*.018,v.tile*(c.kind==='spark'?.09:.12),v.tile*.035);
  ctx.restore();
 }
 ctx.restore();
}

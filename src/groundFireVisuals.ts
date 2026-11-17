import type {GroundFire} from './groundFire.ts';
/** Low, animated flame pockets spread over the actual incendiary hazard radius. */
export function drawGroundFire(ctx:CanvasRenderingContext2D,v:{ox:number;oy:number;tile:number},fire:GroundFire,time:number):void{
 const {tile:t}=v,cx=v.ox+fire.x*t,cy=v.oy+fire.y*t;
 const fadeIn=Math.min(1,fire.age/.22),fadeOut=Math.min(1,(fire.duration-fire.age)/1.3);
 const opacity=Math.max(0,Math.min(fadeIn,fadeOut));
 if(opacity<=0)return;
 ctx.save();ctx.globalAlpha=opacity;
 const radius=fire.radius*t;
 const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
 glow.addColorStop(0,'rgba(208,65,20,.21)');
 glow.addColorStop(.55,'rgba(238,96,29,.10)');
 glow.addColorStop(1,'rgba(238,96,29,0)');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();
 // Flame islands stay short, never producing a large opaque fireball.
 for(let i=0;i<23;i++){
  const a=i*2.39996323+(fire.seed%37)*.07;
  const r=Math.sqrt((i+.28)/23)*fire.radius*.89*t;
  const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;
  const sway=Math.sin(time*7+i*1.9);
  const height=t*(.13+.045*Math.sin(time*6+i*2.2));
  const width=t*(.065+(i%3)*.012);
  ctx.save();ctx.translate(px,py);
  ctx.fillStyle='rgba(57,34,22,.55)';ctx.beginPath();
  ctx.ellipse(0,t*.035,width*1.7,t*.085,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=i%3===0?'#f07429':'#dc4b22';
  ctx.beginPath();ctx.moveTo(-width,t*.02);ctx.quadraticCurveTo(-width*.7,-height*.62,sway*width*.8,-height);
  ctx.quadraticCurveTo(width*.7,-height*.4,width,t*.02);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd16c';ctx.beginPath();ctx.moveTo(-width*.38,t*.015);
  ctx.quadraticCurveTo(-width*.22,-height*.35,sway*width*.3,-height*.58);
  ctx.quadraticCurveTo(width*.3,-height*.2,width*.35,t*.015);ctx.fill();
  ctx.restore();
 }
 ctx.restore();
}

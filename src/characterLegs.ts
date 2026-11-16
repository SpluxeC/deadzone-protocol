/** Cinematic top-down limb rig. All dimensions are relative to sprite size.
 * Rendering-only: no influence on pathfinding, hitboxes, combat or save state.
 */
export type GaitKind='human'|'shambler'|'runner'|'armored'|'bruiser'|'boss';
export type Vec2={x:number;y:number};
export type LegPose={hip:Vec2;knee:Vec2;ankle:Vec2;toe:Vec2;lift:number;stance:boolean;thighWidth:number;calfWidth:number;bootWidth:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function gaitKind(kind:string):GaitKind{
 if(kind==='shambler'||kind==='runner'||kind==='armored'||kind==='bruiser'||kind==='boss')return kind;
 return 'human';
}
export function legPose(kind:GaitKind,side:-1|1,phase:number,speed:number):LegPose{
 const amount=clamp(speed/2.4,0,1);
 const runner=kind==='runner',shambler=kind==='shambler',heavy=kind==='boss'||kind==='bruiser'||kind==='armored';
 const cycle=phase+(side===1?Math.PI:0)+(shambler&&side===1?.37:0);
 const swing=Math.sin(cycle)*amount;
 const stepLength=(runner?.30:shambler?.115:heavy?.15:.205)*swing;
 const lift=Math.pow(Math.max(0,Math.cos(cycle)),1.25)*amount*(runner?.14:shambler?.035:heavy?.055:.095);
 const spread=heavy?.175:runner?.132:.145;
 const hip={x:side*spread,y:.055};
 const footX=side*(spread+(heavy?.015:.005))+(shambler&&side===1?.045:0)+stepLength;
 const ankle={x:footX,y:.37-lift-(shambler&&side===1?.027:0)};
 const knee={x:hip.x*.48+ankle.x*.52+side*(heavy?.043:.025),y:.235-lift*.38-stepLength*.16};
 const toe={x:ankle.x+side*.015+stepLength*.19,y:ankle.y+.105-lift*.1};
 const width=heavy?(kind==='boss'?.20:.16):runner?.105:shambler?.125:.14;
 return {hip,knee,ankle,toe,lift,stance:Math.cos(cycle)<0,
  thighWidth:width,calfWidth:width*(runner?.69:.78),bootWidth:width*(runner?.96:1.05)};
}
function polygon(ctx:CanvasRenderingContext2D,points:Vec2[],fill:string,stroke:string,outline=1.7):void{
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=outline;ctx.stroke();
}
function taper(ctx:CanvasRenderingContext2D,top:Vec2,bottom:Vec2,topWidth:number,bottomWidth:number,fill:string,edge:string):void{
 const dx=bottom.x-top.x,dy=bottom.y-top.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
 const a=topWidth*.5,b=bottomWidth*.5;
 polygon(ctx,[{x:top.x+nx*a,y:top.y+ny*a},{x:bottom.x+nx*b,y:bottom.y+ny*b},
 {x:bottom.x-nx*b,y:bottom.y-ny*b},{x:top.x-nx*a,y:top.y-ny*a}],fill,edge,.018);
}
export function drawCharacterLegs(ctx:CanvasRenderingContext2D,kind:string,size:number,phase:number,speed:number):void{
 const gait=gaitKind(kind),infected=gait!=='human',heavy=gait==='bruiser'||gait==='boss'||gait==='armored';
 const shell=infected?'#55564e':kind==='medic'?'#92958a':kind==='heavy'?'#4a5353':kind==='engineer'?'#696247':kind==='scout'?'#546550':kind==='rifleman'?'#536668':'#626e61';
 const seam=infected?'#32282b':'#293331';
 const joint=infected?'#826057':'#687770';
 const boot=infected?'#2c2928':'#222c2b';
 ctx.save();ctx.scale(size,size);ctx.lineJoin='round';ctx.lineCap='round';
 // The rear leg is painted first; both receive wide tapered trouser volumes,
 // overlapping knee armor, thick boots, sole contacts and light/shadow seams.
 const poses=[legPose(gait,-1,phase,speed),legPose(gait,1,phase,speed)];
 for(const pose of poses){
  const {hip,knee,ankle,toe,thighWidth,calfWidth,bootWidth,lift}=pose;
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(toe.x+.038,.51,.12,.054,-.15,0,Math.PI*2);ctx.fill();
  taper(ctx,hip,knee,thighWidth,thighWidth*.89,shell,seam);
  taper(ctx,knee,ankle,calfWidth*1.13,calfWidth*.83,infected?'#464541':shell,seam);
  ctx.fillStyle=heavy?'#3b4543':infected?'#66564e':'#485a55';
  ctx.strokeStyle=seam;ctx.lineWidth=.015;
  ctx.beginPath();ctx.ellipse(knee.x,knee.y,thighWidth*.56,.066,.1,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Knee pad is visible even at default zoom.
  if(!infected||gait==='armored'){
   polygon(ctx,[{x:knee.x-thighWidth*.44,y:knee.y-.033},{x:knee.x+thighWidth*.39,y:knee.y-.034},
    {x:knee.x+thighWidth*.39,y:knee.y+.026},{x:knee.x-thighWidth*.36,y:knee.y+.033}],
    heavy?'#64716e':'#758077','#222e2e',.012);
  }
  ctx.fillStyle=boot;ctx.strokeStyle='#111b1d';ctx.lineWidth=.017;
  ctx.beginPath();ctx.ellipse(toe.x,toe.y,bootWidth*.67,.092,Math.atan2(toe.x-ankle.x,.19)*-.27,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle=infected?'#78655d':'#9b9a85';ctx.lineWidth=.013;
  ctx.beginPath();ctx.moveTo(toe.x-bootWidth*.30,toe.y-.046);ctx.lineTo(toe.x+bootWidth*.20,toe.y-.043);ctx.stroke();
  ctx.strokeStyle=infected?'#77625c':'#b1b2a0';ctx.lineWidth=.013;ctx.globalAlpha=.60;
  ctx.beginPath();ctx.moveTo(hip.x-thighWidth*.25,hip.y+.02);ctx.lineTo(knee.x-thighWidth*.28,knee.y-.025);ctx.stroke();
  ctx.beginPath();ctx.moveTo(knee.x-calfWidth*.18,knee.y+.055);ctx.lineTo(ankle.x-calfWidth*.21,ankle.y-.028);ctx.stroke();
  ctx.globalAlpha=1;
  if(infected){
   ctx.strokeStyle='#9a554e';ctx.lineWidth=.016;
   ctx.beginPath();ctx.moveTo(knee.x+.015,knee.y+.045);ctx.lineTo(knee.x+.036,knee.y+.075);
   if(gait==='runner')ctx.lineTo(ankle.x+.035,ankle.y-.02);
   ctx.stroke();
  }
  if(lift>.024){ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.ellipse(ankle.x,.48,.1,.035,0,0,Math.PI*2);ctx.fill();}
 }
 // Broad hip/crotch silhouette joins the legs to the character's tactical vest.
 polygon(ctx,[{x:-.255,y:.035},{x:.255,y:.035},{x:.21,y:.17},{x:.065,y:.20},{x:0,y:.16},{x:-.07,y:.20},{x:-.21,y:.17}],
  infected?'#4d4842':shell,seam,.025);
 ctx.restore();
}

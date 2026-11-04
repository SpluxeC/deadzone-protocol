import type {DungeonLayout} from './dungeon.ts';
import spriteUrl from './assets/deadzone-sprites.svg?url';
export type Point={x:number;y:number};
export type View={tile:number;ox:number;oy:number;width:number;height:number;minX:number;maxX:number;minY:number;maxY:number};
export type SpriteKind='player'|'rifleman'|'medic'|'heavy'|'scout'|'engineer'|'shambler'|'runner'|'armored'|'bruiser'|'boss'|'crate'|'elevator'|'spawn';
export const spriteIndex:Record<SpriteKind,number>={player:0,rifleman:1,medic:2,heavy:3,scout:4,engineer:5,shambler:6,runner:7,armored:8,bruiser:9,boss:10,crate:11,elevator:12,spawn:13};
export const spriteSize=96;
const atlas=new Image();
let ready=false;
atlas.onload=()=>{ready=true};
atlas.onerror=()=>{ready=false};
atlas.src=spriteUrl;
export const spriteReady=()=>ready;
export function camera(map:DungeonLayout,player:Point,width:number,height:number):View{
 const tile=Math.max(18,Math.min(40,Math.min(width/23,height/15)));
 const worldWidth=map.width*tile,worldHeight=map.height*tile;
 const ox=worldWidth<width?(width-worldWidth)/2:Math.min(0,Math.max(width-worldWidth,width/2-player.x*tile));
 const oy=worldHeight<height?(height-worldHeight)/2:Math.min(0,Math.max(height-worldHeight,height/2-player.y*tile));
 return {tile,ox,oy,width,height,minX:Math.max(0,Math.floor(-ox/tile)-1),maxX:Math.min(map.width,Math.ceil((width-ox)/tile)+1),minY:Math.max(0,Math.floor(-oy/tile)-1),maxY:Math.min(map.height,Math.ceil((height-oy)/tile)+1)};
}
export function toWorld(view:View,screenX:number,screenY:number):Point{return {x:(screenX-view.ox)/view.tile,y:(screenY-view.oy)/view.tile}}
export function visible(view:View,x:number,y:number,pad=1.4):boolean{
 const px=view.ox+x*view.tile,py=view.oy+y*view.tile;return px>=-view.tile*pad&&py>=-view.tile*pad&&px<=view.width+view.tile*pad&&py<=view.height+view.tile*pad;
}
const hash=(x:number,y:number,seed=11):number=>{let z=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^seed;z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967296};
export function renderDungeon(ctx:CanvasRenderingContext2D,map:DungeonLayout,v:View,wave:number):void{
 ctx.fillStyle='#070d12';ctx.fillRect(0,0,v.width,v.height);
 const t=v.tile,ox=v.ox,oy=v.oy;
 for(let y=v.minY;y<v.maxY;y++)for(let x=v.minX;x<v.maxX;x++){
  const px=Math.round(ox+x*t),py=Math.round(oy+y*t),r=hash(x,y,map.seed),open=map.tiles[y*map.width+x]===0;
  if(open){
   ctx.fillStyle=r<.12?'#263430':r<.45?'#293a37':r<.72?'#283633':'#2e3d39';
   ctx.fillRect(px,py,Math.ceil(t)+1,Math.ceil(t)+1);
   ctx.strokeStyle='rgba(143,166,153,.11)';ctx.lineWidth=Math.max(.6,t*.023);ctx.strokeRect(px+.5,py+.5,t-.5,t-.5);
   if(r>.78){ctx.strokeStyle='rgba(19,28,27,.44)';ctx.lineWidth=t*.047;ctx.beginPath();ctx.moveTo(px+t*.2,py+t*.32);ctx.lineTo(px+t*.48,py+t*.45);ctx.lineTo(px+t*.41,py+t*.64);ctx.stroke()}
   else if(r<.18){ctx.fillStyle='#526356';ctx.globalAlpha=.24;ctx.fillRect(px+t*.24,py+t*.74,t*.13,t*.06);ctx.fillRect(px+t*.68,py+t*.23,t*.1,t*.04);ctx.globalAlpha=1}
   if((x*7+y*11+wave)%31===0){ctx.fillStyle='rgba(111,61,50,.22)';ctx.beginPath();ctx.ellipse(px+t*.5,py+t*.58,t*.31,t*.12,-.4,0,Math.PI*2);ctx.fill()}
  }else{
   const below=y+1<map.height&&map.tiles[(y+1)*map.width+x]===0;
   const right=x+1<map.width&&map.tiles[y*map.width+x+1]===0;
   ctx.fillStyle=r<.5?'#132126':'#16272a';ctx.fillRect(px,py,Math.ceil(t)+1,Math.ceil(t)+1);
   ctx.strokeStyle='#33484a';ctx.lineWidth=Math.max(1,t*.055);ctx.strokeRect(px+t*.035,py+t*.06,t*.91,t*.89);
   ctx.fillStyle='rgba(2,8,10,.45)';ctx.fillRect(px+t*.1,py+t*.22,t*.8,t*.15);
   if(below){ctx.fillStyle='#40575a';ctx.fillRect(px,py+t*.7,t,t*.24);ctx.fillStyle='rgba(2,7,8,.55)';ctx.fillRect(px,py+t*.94,t,t*.23)}
   if(right){ctx.fillStyle='#34494a';ctx.fillRect(px+t*.76,py,t*.2,t)}
   if(r>.92){ctx.strokeStyle='#52605b';ctx.lineWidth=t*.037;ctx.beginPath();ctx.moveTo(px+t*.25,py+t*.3);ctx.lineTo(px+t*.65,py+t*.6);ctx.stroke()}
  }
 }
 // A dark vignette and atmospheric wash keep the map consistent across different screen sizes.
 const vgn=ctx.createRadialGradient(v.width/2,v.height/2,Math.min(v.width,v.height)*.2,v.width/2,v.height/2,Math.max(v.width,v.height)*.72);
 vgn.addColorStop(0,'rgba(4,10,13,0)');vgn.addColorStop(1,'rgba(2,5,9,.46)');ctx.fillStyle=vgn;ctx.fillRect(0,0,v.width,v.height);
}
export function drawSprite(ctx:CanvasRenderingContext2D,kind:SpriteKind,v:View,x:number,y:number,opts?:{angle?:number;scale?:number;down?:boolean;alpha?:number;glow?:string;bob?:number}):void{
 if(!visible(v,x,y))return;
 const px=v.ox+x*v.tile,py=v.oy+y*v.tile+(opts?.bob??0),sz=v.tile*(opts?.scale??1);
 ctx.save();ctx.translate(px,py);ctx.rotate((opts?.angle??0)+(opts?.down?Math.PI*.5:0));ctx.globalAlpha=opts?.alpha??1;
 if(opts?.glow){ctx.fillStyle=opts.glow;ctx.globalAlpha=.17;ctx.beginPath();ctx.ellipse(0,0,sz*.72,sz*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=opts.alpha??1}
 if(ready)ctx.drawImage(atlas,spriteIndex[kind]*spriteSize,0,spriteSize,spriteSize,-sz*.6,-sz*.7,sz*1.2,sz*1.2);
 else{ctx.fillStyle=kind==='player'?'#dcd0b3':kind==='elevator'?'#61cda0':kind==='crate'?'#b9975d':'#7b9991';ctx.beginPath();ctx.arc(0,0,sz*.35,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
export function drawBar(ctx:CanvasRenderingContext2D,v:View,x:number,y:number,ratio:number,color:string,width=.8):void{
 if(!visible(v,x,y))return;
 const left=v.ox+(x-width/2)*v.tile,top=v.oy+(y-.72)*v.tile,w=width*v.tile,h=Math.max(2,v.tile*.09);
 ctx.fillStyle='#111a1a';ctx.fillRect(left-1,top-1,w+2,h+2);ctx.fillStyle=color;ctx.fillRect(left,top,Math.max(0,Math.min(1,ratio))*w,h);
}
export function drawHazard(ctx:CanvasRenderingContext2D,v:View,x:number,y:number,radius:number):void{
 const cx=v.ox+x*v.tile,cy=v.oy+y*v.tile;ctx.strokeStyle='rgba(249,128,82,.85)';ctx.fillStyle='rgba(222,69,42,.075)';
 ctx.lineWidth=Math.max(2,v.tile*.085);ctx.setLineDash([v.tile*.3,v.tile*.18]);ctx.beginPath();ctx.arc(cx,cy,radius*v.tile,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
}
export function hudColor(ratio:number):string{return ratio>.5?'#8bd0a8':ratio>.25?'#eac27a':'#ed8475'}

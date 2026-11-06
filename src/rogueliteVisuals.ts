import type {DungeonLayout} from './dungeon.ts';
import type {WeaponId} from './equipmentArmory.ts';
import {drawHeldWeapon,heldWeaponMuzzle,isMeleeWeapon} from './weaponVisuals.ts';
const spriteUrl=new URL('./assets/deadzone-sprites.svg',import.meta.url).href;
// Optional art pack: when uploaded to public/environment, it loads without a code edit.
const environmentAtlas=typeof Image==='undefined'?null:new Image();
const environmentFrameSize=128;
let environmentReady=false;
if(environmentAtlas){
 environmentAtlas.onload=()=>{environmentReady=environmentAtlas.naturalWidth===environmentFrameSize*16&&environmentAtlas.naturalHeight===environmentFrameSize};
 environmentAtlas.onerror=()=>{environmentReady=false};
 environmentAtlas.src=new URL('environment/deadzone-environment.svg',document.baseURI).href;
}
export const environmentArtReady=()=>environmentReady;
// 0–9 floor materials, 10–15 wall materials. Deterministic layout is unchanged.
export function environmentTileId(tileIsFloor:boolean,noise:number):number{
 const r=Math.max(0,Math.min(.999999,noise));
 if(!tileIsFloor)return 10+Math.floor(r*6);
 if(r<.20)return 0;
 if(r<.39)return 1;
 if(r<.56)return 2;
 if(r<.72)return 3;
 if(r<.79)return 4;
 if(r<.85)return 5;
 if(r<.90)return 6;
 if(r<.94)return 7;
 if(r<.975)return 8;
 return 9;
}
export type Point={x:number;y:number};
export type View={tile:number;ox:number;oy:number;width:number;height:number;minX:number;maxX:number;minY:number;maxY:number};
export type SpriteKind='player'|'rifleman'|'medic'|'heavy'|'scout'|'engineer'|'shambler'|'runner'|'armored'|'bruiser'|'boss'|'crate'|'elevator'|'spawn';
export const spriteIndex:Record<SpriteKind,number>={player:0,rifleman:1,medic:2,heavy:3,scout:4,engineer:5,shambler:6,runner:7,armored:8,bruiser:9,boss:10,crate:11,elevator:12,spawn:13};
export const spriteSize=96;
const atlas=typeof Image==='undefined'?null:new Image();
let ready=false;
if(atlas){atlas.onload=()=>{ready=true};atlas.onerror=()=>{ready=false};atlas.src=spriteUrl}
export const spriteReady=()=>ready;
export function camera(map:DungeonLayout,player:Point,width:number,height:number,zoom=1):View{
 const tile=Math.max(10,Math.min(85,Math.max(18,Math.min(40,Math.min(width/23,height/15)))*zoom));
 // Always center the player, including at dungeon boundaries. Areas beyond the map render as background.
 const ox=width/2-player.x*tile;
 const oy=height/2-player.y*tile;
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
  const px=Math.round(ox+(x-.5)*t),py=Math.round(oy+(y-.5)*t),r=hash(x,y,map.seed),open=map.tiles[y*map.width+x]===0;
  if(environmentReady&&environmentAtlas){
   const frame=environmentTileId(open,r);
   ctx.drawImage(environmentAtlas,frame*environmentFrameSize,0,environmentFrameSize,environmentFrameSize,
    px,py,Math.ceil(t)+1,Math.ceil(t)+1);
  }else if(open){
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
   if(below){ctx.fillStyle='#40575a';ctx.fillRect(px,py+t*.7,t,t*.24);ctx.fillStyle='rgba(2,7,8,.55)';ctx.fillRect(px,py+t*.94,t,t*.06)}
   if(right){ctx.fillStyle='#34494a';ctx.fillRect(px+t*.76,py,t*.2,t)}
   if(r>.92){ctx.strokeStyle='#52605b';ctx.lineWidth=t*.037;ctx.beginPath();ctx.moveTo(px+t*.25,py+t*.3);ctx.lineTo(px+t*.65,py+t*.6);ctx.stroke()}
  }
 }
 // A dark vignette and atmospheric wash keep the map consistent across different screen sizes.
 const vgn=ctx.createRadialGradient(v.width/2,v.height/2,Math.min(v.width,v.height)*.2,v.width/2,v.height/2,Math.max(v.width,v.height)*.72);
 vgn.addColorStop(0,'rgba(4,10,13,0)');vgn.addColorStop(1,'rgba(2,5,9,.46)');ctx.fillStyle=vgn;ctx.fillRect(0,0,v.width,v.height);
}
/** The equipped gun and its reticle use the same transform as the sprite. */
export const PLAYER_BARREL_ANGLE=-Math.PI/2;
export function playerMuzzle(x:number,y:number,angle:number,scale=1,model:WeaponId='carbine'):Point{
 const rotation=angle+Math.PI/2,local=heldWeaponMuzzle(model,scale);
 return {x:x+local.x*Math.cos(rotation)-local.y*Math.sin(rotation),
  y:y+local.x*Math.sin(rotation)+local.y*Math.cos(rotation)};
}
/** 2x2 tile elevator, drawn as one machine in the same top-down world frame.
 * Center x/y are half-integer tile coordinates; the outer frame spans exactly 2 tiles.
 */
export function drawElevator(ctx:CanvasRenderingContext2D,v:View,x:number,y:number,active:boolean,time=0):void{
 if(!visible(v,x,y,2))return;
 const t=v.tile,px=v.ox+(x-1)*t,py=v.oy+(y-1)*t,s=t*2;
 const glow=active?.6:.2;
 ctx.save();ctx.translate(px,py);
 // Underframe and deep recess.
 ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-t*.07,-t*.04,s+t*.14,s+t*.16);
 ctx.fillStyle='#101d23';ctx.fillRect(0,0,s,s);
 ctx.strokeStyle='#798b88';ctx.lineWidth=t*.115;ctx.strokeRect(t*.055,t*.055,s-t*.11,s-t*.11);
 ctx.strokeStyle='#1b2d35';ctx.lineWidth=t*.06;ctx.strokeRect(t*.19,t*.19,s-t*.38,s-t*.38);
 // Elevator cabin with a broad, unmistakable pair of brushed-steel doors.
 const doorX=t*.34,doorY=t*.20,doorW=s-t*.68,doorH=t*1.06;
 const leftDoor=ctx.createLinearGradient(doorX,0,doorX+doorW,0);
 leftDoor.addColorStop(0,'#6c8083');leftDoor.addColorStop(.22,'#bac7c0');
 leftDoor.addColorStop(.47,'#6e8587');leftDoor.addColorStop(.53,'#546a6f');
 leftDoor.addColorStop(.8,'#b1c3be');leftDoor.addColorStop(1,'#5e7479');
 ctx.fillStyle=leftDoor;ctx.fillRect(doorX,doorY,doorW,doorH);
 ctx.strokeStyle='#0b242b';ctx.lineWidth=t*.055;ctx.strokeRect(doorX,doorY,doorW,doorH);
 ctx.strokeStyle='#1d3038';ctx.lineWidth=t*.085;
 ctx.beginPath();ctx.moveTo(t,doorY);ctx.lineTo(t,doorY+doorH);ctx.stroke();
 ctx.strokeStyle='rgba(233,246,238,.28)';ctx.lineWidth=t*.025;
 for(const xx of [doorX+t*.1,doorX+doorW-t*.13]){
  ctx.beginPath();ctx.moveTo(xx,doorY+t*.12);ctx.lineTo(xx,doorY+doorH-t*.12);ctx.stroke();
 }
 // Floor threshold, safety strips, and hatch lip.
 ctx.fillStyle='#1c3031';ctx.fillRect(t*.23,t*1.33,t*1.54,t*.37);
 ctx.fillStyle='#cbad52';ctx.fillRect(t*.25,t*1.36,t*1.5,t*.095);
 ctx.strokeStyle='#13282b';ctx.lineWidth=t*.085;
 for(let xx=t*.31;xx<t*1.67;xx+=t*.22){
  ctx.beginPath();ctx.moveTo(xx,t*1.36);ctx.lineTo(xx+t*.13,t*1.455);ctx.stroke();
 }
 ctx.fillStyle='#4e6666';ctx.fillRect(t*.19,t*1.74,t*1.62,t*.09);
 ctx.strokeStyle='#aabbb6';ctx.lineWidth=t*.025;
 for(let i=0;i<5;i++){
  ctx.beginPath();ctx.moveTo(t*(.35+i*.31),t*1.76);ctx.lineTo(t*(.35+i*.31),t*1.81);ctx.stroke();
 }
 // Call panel and an illuminated directional arrow/ready indicator.
 ctx.fillStyle='#283e44';ctx.fillRect(t*1.6,t*.45,t*.22,t*.55);
 ctx.strokeStyle='#9baeb0';ctx.lineWidth=t*.035;ctx.strokeRect(t*1.6,t*.45,t*.22,t*.55);
 ctx.fillStyle=active?'#76ffc5':'#8caa94';
 ctx.beginPath();ctx.arc(t*1.71,t*.58,t*.063,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#152a30';ctx.fillRect(t*.72,t*.02,t*.56,t*.25);
 ctx.fillStyle=active?'#7bffc3':'#a3bdaf';ctx.font='bold '+Math.max(9,t*.20)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('↑',t,t*.15);
 // A restrained rim pulse makes an available extraction visually clear.
 if(active){
  const pulse=.55+.25*Math.sin(time/390);
  ctx.strokeStyle='rgba(86,250,176,'+pulse+')';ctx.lineWidth=t*.052;ctx.strokeRect(t*.09,t*.09,s-t*.18,s-t*.18);
 }
 ctx.fillStyle='rgba(62,239,165,'+glow+')';ctx.fillRect(t*.37,t*1.58,t*1.26,t*.085);
 ctx.restore();
}
/** Top-down military shipping case: stamped olive steel, raised lid, metal hinges,
 * reinforced corners, recessed latches and stencil markings.
 * Long weapon cases occupy two adjacent floor tiles as one object.
 */
export function drawMilitaryCrate(ctx:CanvasRenderingContext2D,v:View,x:number,y:number,weapon=false,orientation:'horizontal'|'vertical'='horizontal',opened=false):void{
 if(!visible(v,x,y,2.5))return;
 const t=v.tile,px=v.ox+x*t,py=v.oy+y*t;
 const w=t*(weapon?1.92:.92),h=t*(weapon?.85:.86);
 ctx.save();ctx.translate(px,py);
 if(weapon&&orientation==='vertical')ctx.rotate(Math.PI/2);
 ctx.globalAlpha=opened?.72:1;
 ctx.fillStyle='rgba(0,6,7,.55)';ctx.beginPath();ctx.ellipse(0,t*.18,w*.53,h*.42,0,0,Math.PI*2);ctx.fill();
 const left=-w/2,top=-h/2;
 ctx.fillStyle='#151d1b';ctx.fillRect(left-t*.035,top+t*.07,w+t*.07,h+t*.07);
 ctx.fillStyle=weapon?'#526157':'#556445';
 ctx.fillRect(left,top,w,h);
 const metallic=ctx.createLinearGradient(left,top,left+w,top+h);
 metallic.addColorStop(0,weapon?'#697a6f':'#7d8962');
 metallic.addColorStop(.5,weapon?'#404e49':'#46543c');
 metallic.addColorStop(1,weapon?'#73857a':'#697655');
 ctx.fillStyle=metallic;ctx.fillRect(left+t*.09,top+t*.09,w-t*.18,h-t*.18);
 ctx.strokeStyle='#182722';ctx.lineWidth=t*.075;ctx.strokeRect(left+t*.035,top+t*.035,w-t*.07,h-t*.07);
 ctx.strokeStyle='#a0a88c';ctx.lineWidth=t*.026;ctx.strokeRect(left+t*.125,top+t*.13,w-t*.25,h-t*.26);
 // Lengthwise pressed-steel ribs and reinforced runners.
 ctx.strokeStyle='rgba(16,31,27,.52)';ctx.lineWidth=t*.045;
 const count=weapon?7:3;
 for(let i=1;i<count;i++){const q=left+w*i/count;ctx.beginPath();ctx.moveTo(q,top+t*.18);ctx.lineTo(q,top+h-t*.17);ctx.stroke()}
 // Lid seam, handles, hinges, and locking latches.
 ctx.fillStyle='#192825';ctx.fillRect(left+t*.085,top+h*.43,w-t*.17,t*.07);
 for(const xoff of [left+w*.2,left+w*.8]){
  ctx.fillStyle='#202f2e';ctx.fillRect(xoff-t*.075,top-t*.045,t*.15,t*.12);
  ctx.fillRect(xoff-t*.075,top+h-t*.065,t*.15,t*.11);
  ctx.fillStyle='#c0c7b4';ctx.fillRect(xoff-t*.043,top+h-t*.045,t*.086,t*.086);
 }
 for(const side of [-1,1]){
  const handleX=side*(w*.48);
  ctx.strokeStyle='#adbaa8';ctx.lineWidth=t*.035;
  ctx.strokeRect(handleX-t*.047,-t*.095,t*.094,t*.19);
 }
 // Stencil lettering, warning triangles and military inventory tags.
 ctx.save();
 ctx.fillStyle=weapon?'#e2d8a5':'#c9d1b3';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold '+Math.max(6,t*(weapon?.18:.16))+'px monospace';
 ctx.fillText(weapon?'WEAPONS':'SUPPLY',0,-h*.16);
 ctx.font='bold '+Math.max(5,t*.105)+'px monospace';
 ctx.fillText(weapon?'MIL-SPEC  //  SECURED':'MILITARY  //  RATION',0,h*.21);
 ctx.restore();
 if(weapon){
  ctx.strokeStyle='#e5c987';ctx.lineWidth=t*.034;
  ctx.strokeRect(left+t*.18,top+t*.15,w-t*.36,h-t*.3);
 }else{
  ctx.strokeStyle='#b4b987';ctx.lineWidth=t*.037;
  ctx.beginPath();ctx.moveTo(-t*.12,top+t*.16);ctx.lineTo(0,top+t*.31);ctx.lineTo(t*.12,top+t*.16);ctx.stroke();
 }
 if(opened){
  ctx.fillStyle='rgba(9,18,15,.42)';ctx.fillRect(left+t*.1,top+t*.09,w-t*.2,h-t*.18);
  ctx.strokeStyle='#99a98d';ctx.lineWidth=t*.027;
  ctx.beginPath();ctx.moveTo(left+t*.15,top+t*.12);ctx.lineTo(left+w-t*.15,top+h-t*.13);ctx.stroke();
 }
 ctx.restore();
}
const lootAtlas=typeof Image==='undefined'?null:new Image();
let lootIconsReady=false;
if(lootAtlas){
 lootAtlas.onload=()=>{lootIconsReady=true};
 lootAtlas.onerror=()=>{lootIconsReady=false};
 lootAtlas.src=new URL('./assets/deadzone-gear.svg',import.meta.url).href;
}
/** Temporary item reward marker in the game world; labels follow floating icons. */
export function drawLootPopup(ctx:CanvasRenderingContext2D,v:View,x:number,y:number,iconIndex:number,label:string,progress:number):void{
 if(!visible(v,x,y,3))return;
 const t=v.tile,p=Math.max(0,Math.min(1,progress));
 const alpha=Math.min(1,p*7,(1-p)*5);
 const px=v.ox+x*t,py=v.oy+(y-.9-p*.4)*t;
 const size=Math.max(23,t*.9),width=Math.max(size+16,Math.min(t*6,Math.max(t*2.5,label.length*t*.22)));
 ctx.save();ctx.globalAlpha=Math.max(0,alpha);
 ctx.fillStyle='rgba(11,25,24,.94)';ctx.strokeStyle='#b2c7a5';ctx.lineWidth=Math.max(1,t*.04);
 ctx.beginPath();ctx.roundRect(px-width/2,py-size*.55,width,size*1.38,Math.max(5,t*.15));ctx.fill();ctx.stroke();
 if(lootAtlas&&lootIconsReady&&iconIndex>=0){
  ctx.drawImage(lootAtlas,iconIndex*64,0,64,64,px-size*.43,py-size*.5,size*.86,size*.86);
 }else{
  ctx.fillStyle='#b6dcb4';ctx.font='bold '+Math.max(12,size*.58)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText('+',px,py+size*.1);
 }
 ctx.fillStyle='#f5f3db';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold '+Math.max(9,t*.24)+'px system-ui';
 ctx.fillText(label,px,py+size*.58,width-8);
 ctx.restore();
}
export function drawSprite(ctx:CanvasRenderingContext2D,kind:SpriteKind,v:View,x:number,y:number,opts?:{angle?:number;scale?:number;down?:boolean;alpha?:number;glow?:string;bob?:number;stride?:number;motionSpeed?:number;idleTime?:number;showAim?:boolean;weapon?:WeaponId|null}):void{
 if(!visible(v,x,y))return;
 const living=['player','rifleman','medic','heavy','scout','engineer','shambler','runner','armored','bruiser','boss'].includes(kind);
 const walking=living&&!opts?.down&&(opts?.motionSpeed??0)>.12;
 const resting=living&&!walking&&!opts?.down;
 const gait=walking?Math.min(1,(opts?.motionSpeed??0)/2.3):0;
 const step=Math.sin(opts?.stride??0)*gait,other=Math.sin((opts?.stride??0)+Math.PI)*gait;
 const px=v.ox+x*v.tile,py=v.oy+y*v.tile,sz=v.tile*(opts?.scale??1);
 const zombie=['shambler','runner','armored','bruiser','boss'].includes(kind);
 ctx.save();ctx.translate(px,py);
 ctx.globalAlpha=opts?.alpha??1;
 // The ground shadow stays anchored as the upper body bobs and the feet alternate.
 ctx.fillStyle='rgba(0,5,6,.35)';ctx.beginPath();ctx.ellipse(0,sz*.36,sz*.38,sz*.115,0,0,Math.PI*2);ctx.fill();
 // Humans and infected use the original head-forward transform. For the player,
 // correct the rifle's diagonal angle so the barrel actually faces their aim.
 const rotation=(opts?.angle??0)+(living?Math.PI/2:0)+(opts?.down?Math.PI*.5:0);
 ctx.rotate(rotation);
 const bounce=walking?Math.abs(Math.sin(opts?.stride??0))*sz*(zombie?.016:.025):0;
 ctx.translate(0,-bounce+(opts?.bob??0));
 if(resting){
  // Subtle breathing and shifting weight, not a full-body rotation.
  const breath=Math.sin((opts?.idleTime??0)*1.8+spriteIndex[kind]*.7);
  ctx.translate(0,sz*.009*breath);
  ctx.scale(1+breath*.005,1-breath*.009);
 }
 if(opts?.glow){ctx.fillStyle=opts.glow;ctx.globalAlpha=.16;ctx.beginPath();ctx.ellipse(0,0,sz*.72,sz*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=opts.alpha??1}
 if(ready&&atlas){
  if(walking){
   // The original atlas has rigid legs. Replace only the lower part with articulated
   // alternating legs and visible foot placement, preserving the character's own torso/gear.
   const sx=spriteIndex[kind]*spriteSize;
   const spread=zombie?.15:.13,hipY=sz*.075,footY=sz*.36;
   for(const [side,swing] of [[-1,step],[1,other]] as const){
    const hipX=side*sz*spread;
    const footX=hipX+sz*swing*(zombie?.20:.18);
    const footYAdjusted=footY-sz*Math.max(0,swing)*(zombie?.11:.13);
    const kneeX=(hipX+footX)*.5+side*sz*.018;
    const kneeY=(hipY+footYAdjusted)*.52;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=zombie?'#3d4540':'#1b302e';
    ctx.lineWidth=sz*(kind==='heavy'||kind==='bruiser'?.16:.125);
    ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.lineTo(footX,footYAdjusted);ctx.stroke();
    ctx.strokeStyle=zombie?'#647065':'#65756b';ctx.lineWidth=sz*.055;
    ctx.beginPath();ctx.moveTo(kneeX,kneeY);ctx.lineTo(footX,footYAdjusted);ctx.stroke();
    ctx.fillStyle=zombie?'#252e2b':'#152623';
    ctx.beginPath();ctx.ellipse(footX,footYAdjusted+sz*.025,sz*.085,sz*.052,side*.09,0,Math.PI*2);ctx.fill();
   }
   // Source cropping avoids painting the old, stationary legs over the new walk cycle.
   const torsoHeight=69;
   ctx.drawImage(atlas,sx,0,spriteSize,torsoHeight,-sz*.6,-sz*.7,sz*1.2,sz*1.2*torsoHeight/spriteSize);
  }else{
   ctx.drawImage(atlas,spriteIndex[kind]*spriteSize,0,spriteSize,spriteSize,-sz*.6,-sz*.7,sz*1.2,sz*1.2);
  }
 }else{
  ctx.fillStyle=kind==='player'?'#dcd0b3':kind==='elevator'?'#61cda0':kind==='crate'?'#b9975d':'#7b9991';
  ctx.beginPath();ctx.arc(0,0,sz*.35,0,Math.PI*2);ctx.fill();
 }
 if(opts?.weapon&&living&&!zombie&&!opts?.down)drawHeldWeapon(ctx,opts.weapon,sz);
 if(kind==='player'&&opts?.showAim&&!opts?.down&&opts?.weapon&&!isMeleeWeapon(opts.weapon)){
  // Draw in the same local frame as the artwork. The guide begins at the
  // actual rifle muzzle and extends in the direction the painted barrel points.
  const muzzle=heldWeaponMuzzle(opts.weapon,sz);
  const startX=muzzle.x,startY=muzzle.y;
  ctx.strokeStyle='rgba(255,231,185,.82)';
  ctx.lineWidth=Math.max(1,v.tile*.035);
  ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(startX,startY);
  ctx.lineTo(startX,startY-v.tile*.95);
  ctx.stroke();
 }
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

/** Procedural facility atmosphere. All artwork is Canvas; no uploads or external assets.
 * Decorations never alter map tiles, hit tests, or actor navigation.
 */
import type {DungeonLayout,DungeonRoom,RoomTheme} from './dungeon.ts';
import type {View} from './rogueliteVisuals.ts';

export type FacilityDecal={x:number;y:number;kind:'help'|'hand'|'warning'|'quarantine'|'exit'|'drag'|'lastStand'|'evac'|'doNotOpen'|'countdown'|'impact'|'arrow'|'biohazard';orientation:0|1};
export type FacilityProp={x:number;y:number;kind:'bed'|'cabinet'|'terminal'|'locker'|'shelf'|'cart'|'barrel'|'barricade'|'generator'|'stretcher'|'crate'|'chair'|'gurney'|'wheelchair'|'oxygen'|'serverRack'|'radio'|'monitor'|'sandbags'|'ammoPile'|'brokenDrone'|'toolbox'|'pallet'|'bodyBag'|'fallenLight'|'brokenGlass'|'spool'|'hazmat';angle:number};
export type FacilityLight={x:number;y:number;kind:'red'|'cold'|'amber'|'dark';phase:number};
export type FacilityAtmosphere={themes:Uint8Array;decals:FacilityDecal[];props:FacilityProp[];lights:FacilityLight[];rooms:readonly DungeonRoom[]};
export const ROOM_THEMES:readonly RoomTheme[]=['medical','security','maintenance','storage','supply','contaminated'];
const cached=new WeakMap<DungeonLayout,FacilityAtmosphere>();
export function environmentNoise(x:number,y:number,seed:number):number{
 let z=Math.imul(x+199,374761393)^Math.imul(y+131,668265263)^Math.imul(seed+17,1274126177);
 z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967296;
}
const floors=(map:DungeonLayout,x:number,y:number)=>x>=0&&y>=0&&x<map.width&&y<map.height&&map.tiles[y*map.width+x]===0;
const nearby=(a:{x:number;y:number},b:{x:number;y:number},distance:number)=>Math.hypot(a.x-b.x,a.y-b.y)<distance;
export function facilityAtmosphere(map:DungeonLayout):FacilityAtmosphere{
 const existing=cached.get(map);if(existing)return existing;
 const themes=new Uint8Array(map.tiles.length),decals:FacilityDecal[]=[],props:FacilityProp[]=[],lights:FacilityLight[]=[];
 const rooms=map.rooms??[];
 for(const [ri,room] of rooms.entries()){
  const typeIndex=ROOM_THEMES.indexOf(room.theme),index=typeIndex>=0?typeIndex:0;
  for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)
   if(floors(map,x,y))themes[y*map.width+x]=index+1;
  const n=environmentNoise(room.cx,room.cy,map.seed);
  lights.push({x:room.cx,y:room.cy,kind:room.theme==='contaminated'||n<.13?'red':room.theme==='maintenance'?'amber':n>.86?'dark':'cold',phase:n*6.283});
  // A second damaged fixture on larger rooms creates pooled light and deep pockets
  // of shadow without ever affecting collision or player visibility.
  if(room.w*room.h>=96){
   const q=environmentNoise(room.cx+29,room.cy+17,map.seed);
   lights.push({x:room.x+Math.floor(room.w*.25),y:room.y+Math.floor(room.h*.72),
    kind:q<.2?'red':q>.72?'dark':room.theme==='security'?'cold':'amber',phase:q*6.283});
  }
  const wallX=room.x+Math.min(3,Math.floor(room.w*.4)),wallY=room.y-1;
  // Choose occasional emergency messages, with guaranteed blood-written HELP
  // signs every few rooms. Only ever draw on solid walls bordering room floors.
  if(!floors(map,wallX,wallY)&&floors(map,wallX,wallY+1)){
   const kind=ri%4===0?'help':ri%4===1?'quarantine':ri%4===2?'hand':'warning';
   decals.push({x:wallX,y:wallY,kind,orientation:0});
  }
  if(ri%3===1)decals.push({x:room.x,y:room.y+Math.floor(room.h*.55),kind:'drag',orientation:1});
  // Survivor-written notes and military hazard markings remain on solid surfaces.
  const wall2={x:room.x+Math.max(1,room.w-2),y:room.y-1};
  if(!floors(map,wall2.x,wall2.y)&&floors(map,wall2.x,wall2.y+1)){
   const labels:FacilityDecal['kind'][]=['lastStand','evac','doNotOpen','countdown','biohazard','arrow','impact'];
   decals.push({...wall2,kind:labels[(ri+Math.floor(n*7))%labels.length],orientation:0});
  }
  if(ri%5===2){
   const wx=room.x-1,wy=room.y+2;
   if(!floors(map,wx,wy)&&floors(map,wx+1,wy))decals.push({x:wx,y:wy,kind:'help',orientation:1});
  }
  const family:Record<RoomTheme,FacilityProp['kind'][]>={
   medical:['bed','cabinet','stretcher','cart','gurney','wheelchair','oxygen','monitor','bodyBag'],
   security:['terminal','locker','chair','barricade','serverRack','radio','sandbags','brokenDrone'],
   maintenance:['generator','barrel','cart','cabinet','toolbox','spool','fallenLight','brokenGlass'],
   storage:['shelf','crate','barrel','cabinet','pallet','spool','toolbox','brokenGlass'],
   supply:['shelf','crate','locker','cart','pallet','ammoPile','sandbags','radio'],
   contaminated:['stretcher','barrel','barricade','cabinet','hazmat','bodyBag','oxygen','brokenGlass']
  };
  // Props are floor-level scenery near room perimeters; center lanes remain clear.
  const count=Math.min(10,Math.max(4,Math.floor(room.w*room.h/17)));
  for(let i=0;i<count;i++){
   const q=environmentNoise(room.cx+i*7,room.cy+i*11,map.seed);
   const along=1+Math.floor(q*Math.max(1,room.w-2));
   const edge=i%4;
   const x=edge===0?room.x+along:edge===1?room.x+1:edge===2?room.x+along:room.x+room.w-2;
   const y=edge===0?room.y+1:edge===1?room.y+1+Math.floor(q*Math.max(1,room.h-2)):edge===2?room.y+room.h-2:room.y+1+Math.floor(q*Math.max(1,room.h-2));
   const point={x,y};
   if(!floors(map,x,y)||nearby(point,map.entrance,3.6)||nearby(point,map.extraction,3)||
      map.loot.some(c=>nearby(point,c,1.3))||props.some(p=>nearby(p,point,1.2)))continue;
   const options=family[room.theme];props.push({...point,kind:options[(i+Math.floor(q*options.length))%options.length],angle:edge===1||edge===3?Math.PI/2:0});
  }
 }
 const result={themes,decals,props,lights,rooms};cached.set(map,result);return result;
}
const palette=['#283633','#30403e','#2b3c48','#3b3830','#343c34','#393b2e','#334034'];
const rect=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
function renderProp(ctx:CanvasRenderingContext2D,p:FacilityProp,v:View):void{
 const t=v.tile;ctx.save();ctx.translate(v.ox+p.x*t,v.oy+p.y*t);ctx.rotate(p.angle);
 ctx.fillStyle='rgba(1,8,10,.46)';ctx.fillRect(-t*.42,-t*.28,t*.87,t*.70);
 const metal='#667575',dark='#263437',highlight='#a2ada6',rust='#725243';
 if(p.kind==='bed'||p.kind==='stretcher'){
  rect(ctx,-t*.4,-t*.35,t*.8,t*.7,metal);
  rect(ctx,-t*.33,-t*.29,t*.66,t*.56,p.kind==='bed'?'#afb7a7':'#727e75');
  rect(ctx,-t*.27,-t*.23,t*.54,t*.17,'#d9d4b5');
  rect(ctx,-t*.3,t*.04,t*.6,t*.19,p.kind==='bed'?'#768a80':'#8a5d55');
  ctx.strokeStyle=dark;ctx.lineWidth=t*.045;ctx.strokeRect(-t*.4,-t*.35,t*.8,t*.7);
 }else if(p.kind==='terminal'||p.kind==='generator'){
  rect(ctx,-t*.41,-t*.33,t*.82,t*.66,dark);
  rect(ctx,-t*.31,-t*.25,t*.62,t*.33,p.kind==='terminal'?'#315b5c':'#5b6457');
  for(let i=0;i<3;i++)rect(ctx,-t*.25+i*t*.20,t*.16,t*.11,t*.08,i===1?'#ab5e4c':'#8d9a73');
  ctx.strokeStyle=metal;ctx.lineWidth=t*.06;ctx.strokeRect(-t*.4,-t*.32,t*.8,t*.64);
 }else if(p.kind==='locker'||p.kind==='cabinet'||p.kind==='shelf'){
  rect(ctx,-t*.38,-t*.38,t*.76,t*.76,p.kind==='shelf'?'#6f6655':'#56675e');
  ctx.strokeStyle=dark;ctx.lineWidth=t*.035;ctx.strokeRect(-t*.32,-t*.32,t*.64,t*.64);
  if(p.kind==='shelf')for(let y=-.19;y<.4;y+=.21)rect(ctx,-t*.31,t*y,t*.62,t*.045,highlight);
  else {rect(ctx,-t*.04,-t*.32,t*.05,t*.64,dark);rect(ctx,t*.10,-t*.04,t*.035,t*.13,highlight);}
 }else if(p.kind==='barrel'){
  ctx.fillStyle='#65715f';ctx.beginPath();ctx.ellipse(0,0,t*.31,t*.28,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=dark;ctx.lineWidth=t*.065;ctx.beginPath();ctx.ellipse(0,0,t*.24,t*.21,0,0,Math.PI*2);ctx.stroke();
  rect(ctx,-t*.08,-t*.045,t*.16,t*.085,rust);
 }else if(p.kind==='chair'){
  rect(ctx,-t*.29,-t*.2,t*.58,t*.51,'#3d4a45');rect(ctx,-t*.32,-t*.33,t*.64,t*.13,highlight);
  rect(ctx,-t*.17,t*.06,t*.34,t*.11,rust);
 }else if(p.kind==='cart'){
  rect(ctx,-t*.38,-t*.23,t*.76,t*.48,metal);rect(ctx,-t*.3,-t*.15,t*.6,t*.32,dark);
  for(const x of [-.28,.28])rect(ctx,t*x,t*.25,t*.12,t*.1,'#1e2426');
 }else if(p.kind==='barricade'){
  rect(ctx,-t*.47,-t*.29,t*.94,t*.19,rust);rect(ctx,-t*.47,t*.06,t*.94,t*.19,rust);
  ctx.strokeStyle='#a18a69';ctx.lineWidth=t*.048;ctx.beginPath();ctx.moveTo(-t*.34,-t*.31);ctx.lineTo(t*.31,t*.29);ctx.stroke();
 }else if(p.kind==='gurney'||p.kind==='wheelchair'||p.kind==='oxygen'){
  if(p.kind==='oxygen'){
   for(const xx of [-.17,.17]){
    rect(ctx,t*(xx-.09),-t*.28,t*.19,t*.54,'#7d9894');
    rect(ctx,t*(xx-.06),-t*.34,t*.12,t*.10,'#b2bdaf');
    rect(ctx,t*(xx-.03),t*.21,t*.06,t*.07,'#bd614d');
   }
  }else{
   rect(ctx,-t*.39,-t*.3,t*.78,t*.60,p.kind==='wheelchair'?'#253a3c':'#647b78');
   rect(ctx,-t*.31,-t*.23,t*.62,t*.45,p.kind==='wheelchair'?'#63847a':'#a4a99d');
   rect(ctx,-t*.16,t*.03,t*.33,t*.15,'#69473f');
   for(const xx of [-.33,.33]){
    ctx.fillStyle='#19282a';ctx.beginPath();ctx.arc(xx*t,t*.24,t*.10,0,Math.PI*2);ctx.fill();
   }
  }
 }else if(p.kind==='serverRack'||p.kind==='radio'||p.kind==='monitor'){
  rect(ctx,-t*.39,-t*.38,t*.78,t*.76,'#243237');
  if(p.kind==='serverRack'){
   for(let i=0;i<4;i++){
    rect(ctx,-t*.31,-t*.29+t*i*.16,t*.62,t*.12,'#506364');
    rect(ctx,t*.21,-t*.25+t*i*.16,t*.045,t*.035,i===1?'#c36755':'#b2c08f');
   }
  }else{
   rect(ctx,-t*.31,-t*.25,t*.62,t*.45,p.kind==='radio'?'#444e48':'#326365');
   rect(ctx,-t*.24,-t*.16,t*.40,t*.27,p.kind==='radio'?'#849086':'#6fa5a0');
   ctx.strokeStyle='#a7ad9c';ctx.lineWidth=t*.03;
   ctx.beginPath();ctx.moveTo(t*.21,-t*.24);ctx.lineTo(t*.38,-t*.48);ctx.stroke();
  }
 }else if(p.kind==='sandbags'||p.kind==='ammoPile'||p.kind==='pallet'){
  if(p.kind==='sandbags'){
   for(let i=0;i<3;i++)for(let j=0;j<2;j++){
    rect(ctx,t*(-.4+i*.26+(j%2)*.07),t*(-.24+j*.25),t*.24,t*.20,i%2?'#99906d':'#817956');
   }
  }else if(p.kind==='pallet'){
   for(let i=-1;i<=1;i++)rect(ctx,-t*.40,t*i*.23-t*.06,t*.8,t*.12,'#80674c');
   for(let i=-1;i<=1;i++)rect(ctx,t*i*.28-t*.055,-t*.35,t*.11,t*.70,'#aa8458');
  }else{
   rect(ctx,-t*.37,-t*.32,t*.74,t*.64,'#555f4a');
   for(let i=0;i<5;i++){
    rect(ctx,t*(-.28+i*.13),-t*.20,t*.08,t*.47,'#bd9e60');
    rect(ctx,t*(-.28+i*.13),-t*.21,t*.08,t*.065,'#846f43');
   }
  }
 }else if(p.kind==='brokenDrone'||p.kind==='toolbox'||p.kind==='spool'){
  if(p.kind==='toolbox'){
   rect(ctx,-t*.36,-t*.24,t*.72,t*.48,'#8c4e39');
   rect(ctx,-t*.30,-t*.16,t*.6,t*.26,'#5a403b');
   rect(ctx,-t*.10,-t*.34,t*.2,t*.1,'#9fa6a0');
  }else if(p.kind==='spool'){
   ctx.fillStyle='#514f43';ctx.beginPath();ctx.ellipse(0,0,t*.31,t*.32,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#918978';ctx.lineWidth=t*.065;ctx.beginPath();ctx.ellipse(0,0,t*.18,t*.20,0,0,Math.PI*2);ctx.stroke();
   rect(ctx,-t*.37,-t*.06,t*.74,t*.12,'#a29375');
  }else{
   rect(ctx,-t*.22,-t*.2,t*.44,t*.40,'#4c6869');
   ctx.strokeStyle='#859c94';ctx.lineWidth=t*.07;
   ctx.beginPath();ctx.moveTo(-t*.40,-t*.42);ctx.lineTo(t*.40,t*.40);
   ctx.moveTo(t*.40,-t*.42);ctx.lineTo(-t*.40,t*.40);ctx.stroke();
   for(const xx of [-.36,.36])for(const yy of [-.34,.34]){
    ctx.fillStyle='#232d2c';ctx.beginPath();ctx.arc(xx*t,yy*t,t*.10,0,Math.PI*2);ctx.fill();
   }
  }
 }else if(p.kind==='bodyBag'||p.kind==='hazmat'||p.kind==='fallenLight'||p.kind==='brokenGlass'){
  if(p.kind==='bodyBag'){
   ctx.fillStyle='#2f3834';ctx.beginPath();ctx.ellipse(0,0,t*.29,t*.45,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#919c87';ctx.lineWidth=t*.018;
   ctx.beginPath();ctx.moveTo(0,-t*.35);ctx.lineTo(0,t*.34);ctx.stroke();
  }else if(p.kind==='hazmat'){
   rect(ctx,-t*.31,-t*.32,t*.62,t*.65,'#c4a554');
   ctx.fillStyle='#384a41';ctx.beginPath();ctx.arc(0,-t*.10,t*.15,0,Math.PI*2);ctx.fill();
   rect(ctx,-t*.09,t*.16,t*.18,t*.10,'#7d735c');
  }else if(p.kind==='fallenLight'){
   rect(ctx,-t*.41,-t*.10,t*.82,t*.21,'#859794');
   rect(ctx,-t*.32,-t*.035,t*.64,t*.065,'#c5cbb3');
   rect(ctx,t*.25,-t*.18,t*.14,t*.18,'#6c4b39');
  }else{
   ctx.strokeStyle='#79938e';ctx.lineWidth=Math.max(1,t*.03);
   for(let i=0;i<6;i++){
    const offset=(i-2.5)*t*.11;
    ctx.beginPath();ctx.moveTo(offset,-t*.16);ctx.lineTo(offset+t*.22,t*.20);ctx.stroke();
   }
  }
 }else {
  rect(ctx,-t*.34,-t*.3,t*.68,t*.61,'#5d624c');
  ctx.strokeStyle=highlight;ctx.lineWidth=t*.04;ctx.strokeRect(-t*.27,-t*.23,t*.54,t*.47);
  rect(ctx,-t*.06,-t*.29,t*.12,t*.61,dark);
 }
 ctx.restore();
}
function renderWallMark(ctx:CanvasRenderingContext2D,d:FacilityDecal,v:View):void{
 const t=v.tile;ctx.save();ctx.translate(v.ox+d.x*t,v.oy+d.y*t);
 if(d.orientation===1)ctx.rotate(-Math.PI/2);
 if(d.kind==='help'){
  // Handwritten blood lettering rather than clean warning signage.
  ctx.font='900 '+Math.max(9,t*.40)+'px cursive,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#9f2e29';ctx.globalAlpha=.92;
  ctx.translate(0,-t*.03);ctx.rotate(-.095);ctx.fillText('HELP',0,0);
  ctx.strokeStyle='#722421';ctx.lineWidth=Math.max(1,t*.045);
  for(const dx of [-.29,-.06,.16,.32]){ctx.beginPath();ctx.moveTo(t*dx,t*.14);ctx.lineTo(t*(dx+.03),t*(.22+environmentNoise(dx*100,d.y,13)*.17));ctx.stroke()}
 }else if(d.kind==='hand'){
  ctx.fillStyle='rgba(128,33,30,.83)';ctx.beginPath();ctx.ellipse(0,t*.08,t*.16,t*.19,.3,0,Math.PI*2);ctx.fill();
  for(let i=0;i<4;i++)rect(ctx,t*(-.14+i*.085),-t*.19,t*.049,t*.22,'#702822');
 }else if(d.kind==='drag'){
  ctx.strokeStyle='rgba(101,28,27,.54)';ctx.lineWidth=t*.11;
  ctx.beginPath();ctx.moveTo(-t*.42,t*.31);ctx.quadraticCurveTo(0,t*.13,t*.47,-t*.27);ctx.stroke();
 }else if(d.kind==='lastStand'||d.kind==='evac'||d.kind==='doNotOpen'||d.kind==='countdown'||d.kind==='arrow'){
  // Hand-painted survivor messages: deliberate irregular angle and red smears.
  const messages:Record<'lastStand'|'evac'|'doNotOpen'|'countdown'|'arrow',string>={
   lastStand:'LAST STAND',evac:'EVAC FAILED',doNotOpen:'DO NOT OPEN',countdown:'DAY 17',arrow:'EXIT →'
  };
  ctx.rotate(-.055);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 '+Math.max(6,t*(d.kind==='doNotOpen'?.18:.21))+'px monospace';
  ctx.fillStyle=d.kind==='lastStand'||d.kind==='doNotOpen'?'#a34d40':'#b5ad83';
  ctx.fillText(messages[d.kind],0,0,t*.94);
  ctx.strokeStyle='#793530';ctx.lineWidth=Math.max(1,t*.025);
  ctx.beginPath();ctx.moveTo(-t*.32,t*.13);ctx.lineTo(t*.24,t*.15);ctx.stroke();
 }else if(d.kind==='impact'){
  ctx.fillStyle='#1a2729';ctx.beginPath();ctx.arc(0,0,t*.10,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#7e8580';ctx.lineWidth=Math.max(1,t*.025);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,length=t*(.16+(i%3)*.07);
   ctx.beginPath();ctx.moveTo(Math.cos(a)*t*.10,Math.sin(a)*t*.10);
   ctx.lineTo(Math.cos(a)*length,Math.sin(a)*length);ctx.stroke();
  }
 }else if(d.kind==='biohazard'){
  rect(ctx,-t*.43,-t*.24,t*.86,t*.48,'#b3984d');
  ctx.font='bold '+Math.max(8,t*.32)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#22271f';ctx.fillText('☣',0,-t*.02);
  ctx.font='bold '+Math.max(6,t*.10)+'px monospace';ctx.fillText('BIOHAZARD',0,t*.16);
 }else{
  const text=d.kind==='quarantine'?'QUARANTINE':'DANGER';
  rect(ctx,-t*.45,-t*.20,t*.90,t*.39,d.kind==='quarantine'?'#91764b':'#ad9445');
  ctx.fillStyle='#231f1b';ctx.font='bold '+Math.max(6,t*.15)+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,0,0);
 }
 ctx.restore();
}
/** Render once-per-visible-tile details before fog so unknown rooms stay undisclosed. */
export function renderFacility(ctx:CanvasRenderingContext2D,map:DungeonLayout,v:View,time=0):void{
 const a=facilityAtmosphere(map),t=v.tile;
 for(let y=v.minY;y<v.maxY;y++)for(let x=v.minX;x<v.maxX;x++){
  const key=y*map.width+x,theme=a.themes[key],noise=environmentNoise(x,y,map.seed);
  const px=v.ox+(x-.5)*t,py=v.oy+(y-.5)*t;
  if(map.tiles[key]===0){
   if(theme){
    ctx.globalAlpha=.35;rect(ctx,px,py,t+.7,t+.7,palette[theme]);ctx.globalAlpha=1;
   }
   if(noise>.79){
    ctx.strokeStyle=noise>.91?'rgba(8,14,14,.69)':'rgba(13,22,22,.43)';
    ctx.lineWidth=Math.max(1,t*.038);ctx.beginPath();
    ctx.moveTo(px+t*.11,py+t*.24);
    ctx.lineTo(px+t*.38,py+t*.46);ctx.lineTo(px+t*.65,py+t*.39);
    if(noise>.92)ctx.lineTo(px+t*.77,py+t*.74);ctx.stroke();
   }
   if(noise<.095){
    ctx.fillStyle='rgba(74,25,23,.31)';ctx.beginPath();
    ctx.ellipse(px+t*.48,py+t*.52,t*(.12+noise),t*.075,-.4,0,Math.PI*2);ctx.fill();
   }else if(noise>.71&&noise<.755){
    rect(ctx,px+t*.22,py+t*.28,t*.22,t*.06,'rgba(134,131,111,.35)');
    rect(ctx,px+t*.62,py+t*.65,t*.13,t*.1,'rgba(81,88,81,.46)');
   }
   const distress=environmentNoise(x+31,y-17,map.seed),scorch=environmentNoise(x-53,y+23,map.seed);
   // Impact damage and leaks are painted into the terrain; never solid obstacles.
   if(distress>.925){
    ctx.strokeStyle='rgba(12,16,19,.74)';ctx.lineWidth=Math.max(1,t*.065);
    ctx.beginPath();ctx.moveTo(px+t*.13,py+t*.1);ctx.lineTo(px+t*.35,py+t*.32);
    ctx.lineTo(px+t*.72,py+t*.24);ctx.lineTo(px+t*.84,py+t*.7);ctx.stroke();
    ctx.strokeStyle='rgba(133,138,129,.26)';ctx.lineWidth=Math.max(.7,t*.022);
    ctx.beginPath();ctx.moveTo(px+t*.17,py+t*.07);ctx.lineTo(px+t*.39,py+t*.30);ctx.stroke();
   }
   if(scorch<.064){
    ctx.fillStyle='rgba(11,18,16,.35)';ctx.beginPath();
    ctx.ellipse(px+t*.52,py+t*.50,t*.37,t*.24,.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(105,47,32,.18)';ctx.beginPath();
    ctx.ellipse(px+t*.54,py+t*.5,t*.18,t*.1,.4,0,Math.PI*2);ctx.fill();
   }
   if(distress<.046){
    ctx.fillStyle='rgba(73,105,84,.39)';ctx.beginPath();
    ctx.ellipse(px+t*.52,py+t*.57,t*.32,t*.16,-.25,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(143,161,139,.25)';ctx.lineWidth=Math.max(.7,t*.02);
    ctx.beginPath();ctx.arc(px+t*.52,py+t*.57,t*.17,.2,2.4);ctx.stroke();
   }
   if(noise>.975){
    // Scattered spent brass and debris, deliberately small and non-blocking.
    ctx.fillStyle='#99834e';rect(ctx,px+t*.27,py+t*.57,t*.11,t*.035,'#99834e');
    rect(ctx,px+t*.43,py+t*.69,t*.10,t*.03,'#99834e');
   }
  }else if(noise>.67){
   const damage=environmentNoise(x+71,y+29,map.seed);
   if(damage>.90){
    ctx.fillStyle='rgba(5,11,13,.58)';ctx.fillRect(px+t*.15,py+t*.12,t*.22,t*.22);
    ctx.strokeStyle='rgba(135,143,135,.27)';ctx.lineWidth=Math.max(.7,t*.026);
    ctx.strokeRect(px+t*.12,py+t*.10,t*.27,t*.26);
   }
   if(damage<.11){
    ctx.strokeStyle='rgba(115,35,30,.46)';ctx.lineWidth=Math.max(1,t*.065);
    ctx.beginPath();ctx.moveTo(px+t*.27,py+t*.33);ctx.lineTo(px+t*.39,py+t*.61);
    ctx.lineTo(px+t*.43,py+t*.78);ctx.stroke();
   }
   ctx.fillStyle='rgba(75,81,73,.26)';ctx.fillRect(px+t*.2,py+t*.65,t*.49,t*.09);
   if(noise>.89){
    ctx.strokeStyle='rgba(160,153,127,.3)';ctx.lineWidth=t*.035;
    ctx.beginPath();ctx.moveTo(px+t*.15,py+t*.18);ctx.lineTo(px+t*.44,py+t*.42);ctx.lineTo(px+t*.37,py+t*.59);ctx.stroke();
   }
  }
 }
 for(const prop of a.props)if(prop.x>=v.minX-1&&prop.x<=v.maxX+1&&prop.y>=v.minY-1&&prop.y<=v.maxY+1)renderProp(ctx,prop,v);
 for(const mark of a.decals)if(mark.x>=v.minX-2&&mark.x<=v.maxX+2&&mark.y>=v.minY-2&&mark.y<=v.maxY+2)renderWallMark(ctx,mark,v);
 // Ambient bulbs wash each room with restrained colored light; contaminated and
 // emergency rooms flicker, but never become pitch black or impair navigation.
 for(const light of a.lights){
  const px=v.ox+light.x*t,py=v.oy+light.y*t;
  if(px<-t*9||py<-t*9||px>v.width+t*9||py>v.height+t*9)continue;
  const wobble=light.kind==='red'?.75+.25*Math.sin(time*.005+light.phase):1;
  const radius=t*(light.kind==='dark'?2.4:4.8);
  const gradient=ctx.createRadialGradient(px,py,0,px,py,radius);
  const color=light.kind==='red'?'142,30,31':light.kind==='amber'?'184,124,55':light.kind==='cold'?'97,165,164':'6,11,17';
  gradient.addColorStop(0,'rgba('+color+','+(light.kind==='dark'?.26:.15*wobble)+')');
  gradient.addColorStop(1,'rgba('+color+',0)');
  ctx.fillStyle=gradient;ctx.fillRect(px-radius,py-radius,radius*2,radius*2);
 }
}

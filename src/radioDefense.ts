import {drawSprite,type View} from './rogueliteVisuals.ts';
import {normalizeStick,stickKnob as calculateStickKnob} from './mobileControls.ts';
import {makeAttackFx,ageCombatFx,drawCombatFx,type CombatFx} from './combatFx.ts';

type Point={x:number;y:number};
type Kind='wall'|'wire'|'fire'|'mine'|'shock'|'turret';
type Defense={x:number;y:number;kind:Kind;cooldown:number;life:number;angle?:number;recoil?:number;flash?:number};
type TrapBurst={x:number;y:number;kind:'mine'|'shock'|'fire'|'wire';age:number;duration:number};
type Enemy={x:number;y:number;hp:number;maxHp:number;speed:number;hit:number;kind:'shambler'|'runner'|'armored'|'bruiser';flash:number};
type Item=Kind|'medkit'|'armor';
const SIZE=29,CENTER=14,MAX_ZOOM=2;
const doors:Point[]=[{x:14,y:0},{x:28,y:14},{x:14,y:28},{x:0,y:14}];
const prices:Record<Item,number>={wall:35,wire:60,fire:90,mine:110,shock:120,turret:175,medkit:80,armor:100};
const names:Record<Item,string>={wall:'Concrete Wall',wire:'Barbed Wire',fire:'Incendiary Trap',mine:'Frag Mine',shock:'Shock Trap',turret:'Sentry Turret',medkit:'Medkit +35 HP',armor:'Armor +30'};
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const d=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const cell=(p:Point)=>Math.round(p.y)*SIZE+Math.round(p.x);
const dirs=[[0,-1],[1,0],[0,1],[-1,0]] as const;
export function beginRadioDefense(host:HTMLElement,onExit:()=>void):void{
 let active=true,playing=false,shopOpen=true,placing:Kind|null=null;
 let wave=1,credits=250,radioHp=300,hp=100,armor=40,elapsed=0,spawnClock=0,spawnNumber=0,shotClock=0;
 let kills=0,player:Point={x:CENTER+2,y:CENTER+2},enemies:Enemy[]=[],defenses:Defense[]=[];
 let zoom=1.7,displayZoom=1.7,buildingCamera=false,aimAngle=-Math.PI/2,recoil=0,shotEffects:CombatFx[]=[],trapBursts:TrapBurst[]=[];
 let stick={x:0,y:0,magnitude:0};
 const root=document.createElement('section');
 root.id='radio-defense';
 root.setAttribute('aria-label','Radio Defense');
 root.innerHTML='<div class="rd-hud"><strong>RADIO DEFENSE</strong><span id="rd-wave">WAVE 1</span><span id="rd-hp">RADIO 300/300</span><span id="rd-credits">₡250</span><span id="rd-life">HP 100</span><button id="rd-shop">RADIO SHOP (E)</button><button id="rd-exit">EXIT</button></div>'+
 '<canvas id="rd-canvas" aria-label="Four-door radio defense arena"></canvas>'+
 '<div id="rd-move-stick" role="group" aria-label="Movement joystick"><div class="rd-stick-ring"><div id="rd-stick-knob"></div></div><span>MOVE</span></div>'+
 '<div id="rd-panel" class="rd-panel"><h2>RADIO SUPPLY TERMINAL</h2><p>Enemies are paused while shopping or placing. Build a winding route, but leave a path from every entrance to the radio.</p><p id="rd-message">Choose a defense, then tap an empty floor tile to place it.</p><div id="rd-items"></div><button id="rd-resume">RESUME DEFENSE</button></div>'+
 '<div id="rd-placement" hidden><strong id="rd-placing-label"></strong><button id="rd-placement-done">DONE / RESUME</button><button id="rd-placement-back">BACK TO SHOP</button></div>'+
 '<div id="rd-result" hidden></div>';
 const style=document.createElement('style');
 style.textContent='#radio-defense{position:absolute;inset:0;z-index:8;background:#0b1416;color:#edf4ed;font:600 13px system-ui;overflow:hidden;touch-action:none}'+
 '#radio-defense button{background:#304941;color:#fff;border:1px solid #92b1a0;border-radius:5px;padding:9px 12px;cursor:pointer;touch-action:none;font:700 12px system-ui}'+
 '#radio-defense button:disabled{opacity:.42} .rd-hud{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;background:#111e1ded;padding:6px}'+
 '#rd-canvas{display:block;width:100%;height:100%;touch-action:none} .rd-panel{position:absolute;top:52px;right:10px;bottom:10px;z-index:5;overflow:auto;width:min(380px,92vw);box-sizing:border-box;padding:18px;background:#182b29f5;border:1px solid #9ebba2;border-radius:8px;box-shadow:0 10px 40px #000b}'+
 '.rd-panel h2{font-size:18px;margin:0} .rd-panel p{line-height:1.4;color:#c6d5cc} #rd-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0} #rd-items button{min-height:56px}'+
 '#rd-placement{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:5;background:#162e2af5;padding:7px;border:1px solid #a5baa3;border-radius:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center}#rd-placement[hidden],#rd-result[hidden],#rd-panel[hidden]{display:none!important}'+
 '#rd-result{position:absolute;inset:0;z-index:8;background:#071211ed;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;padding:20px}'+
 '#rd-move-stick{position:absolute;left:clamp(14px,4vw,42px);bottom:clamp(18px,6vh,50px);z-index:4;width:124px;height:142px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;touch-action:none;user-select:none;-webkit-user-select:none}'+
 '#rd-move-stick .rd-stick-ring{position:relative;width:114px;height:114px;border:2px solid #8da9a4b8;border-radius:50%;background:#1c3538ac;box-shadow:inset 0 0 24px #030b10c9,0 0 8px #0009;touch-action:none}'+
 '#rd-stick-knob{position:absolute;top:50%;left:50%;width:51px;height:51px;transform:translate(-50%,-50%);border:2px solid #c7e4cd;border-radius:50%;box-sizing:border-box;background:#688e7ed9;box-shadow:0 2px 11px #0009;pointer-events:none}'+
 '#rd-move-stick span{font-size:11px;color:#d5e7df;text-shadow:0 2px 3px #000}@media(pointer:fine){#rd-move-stick{opacity:.8}}';
 host.appendChild(style);host.appendChild(root);
 const $=<T extends HTMLElement>(id:string)=>root.querySelector<T>('#'+id)!;
 const cvs=$<HTMLCanvasElement>('rd-canvas'),ctx=cvs.getContext('2d')!;
 let last=performance.now(),raf=0,view:View={tile:20,ox:0,oy:0,width:0,height:0,minX:0,maxX:SIZE,minY:0,maxY:SIZE};
 const keys=new Set<string>();
 const stickBase=$<HTMLElement>('rd-move-stick'),stickRing=stickBase.querySelector<HTMLElement>('.rd-stick-ring')!,stickKnob=$<HTMLElement>('rd-stick-knob');
 let stickPointer:number|null=null;
 const pointers=new Map<number,{x:number;y:number}>();
 let pinchStart=0,pinchZoom=1,pinchMoved=false;
 function releaseStick(){stickPointer=null;stick={x:0,y:0,magnitude:0};stickKnob.style.transform='translate(-50%,-50%)'}
 function updateStick(e:PointerEvent){const rect=stickRing.getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),radius=rect.width*.34;stick=normalizeStick(dx,dy,radius);const pos=calculateStickKnob(dx,dy,radius);stickKnob.style.transform='translate(calc(-50% + '+pos.x+'px),calc(-50% + '+pos.y+'px))'}
 stickBase.addEventListener('pointerdown',e=>{if(e.button!==0||stickPointer!==null)return;e.preventDefault();e.stopPropagation();stickPointer=e.pointerId;stickBase.setPointerCapture(e.pointerId);updateStick(e)});
 stickBase.addEventListener('pointermove',e=>{if(stickPointer!==e.pointerId)return;e.preventDefault();updateStick(e)});
 for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)stickBase.addEventListener(name,e=>{if(stickPointer===e.pointerId)releaseStick()});
 const wall=(x:number,y:number)=>defenses.some(a=>a.kind==='wall'&&a.x===x&&a.y===y);
 const inside=(x:number,y:number)=>x>=1&&y>=1&&x<SIZE-1&&y<SIZE-1;
 const reserved=(x:number,y:number)=>Math.abs(x-CENTER)<=1&&Math.abs(y-CENTER)<=1||doors.some(p=>d(p,{x,y})<=1.5);
 function field():number[]{
  const dist=Array(SIZE*SIZE).fill(9999),queue=[{x:CENTER,y:CENTER}];dist[cell(queue[0])]=0;
  for(let i=0;i<queue.length;i++){const p=queue[i],n=dist[cell(p)]+1;for(const [dx,dy] of dirs){const x=p.x+dx,y=p.y+dy;if(!inside(x,y)||wall(x,y))continue;const k=y*SIZE+x;if(n<dist[k]){dist[k]=n;queue.push({x,y})}}}return dist;
 }
 let route=field();
 function validPaths(){const f=field();return [{x:CENTER,y:1},{x:SIZE-2,y:CENTER},{x:CENTER,y:SIZE-2},{x:1,y:CENTER}].every(p=>f[cell(p)]<9999);}
 function message(t:string){$('rd-message').textContent=t;}
 function hud(){
  $('rd-wave').textContent='WAVE '+wave+' · '+kills+' KILLS';
  $('rd-hp').textContent='RADIO '+Math.ceil(radioHp)+'/300';
  $('rd-credits').textContent='₡'+credits;
  $('rd-life').textContent='HP '+Math.ceil(hp)+' · ARM '+Math.ceil(armor);
 }
 function choose(item:Item){
  if(credits<prices[item]){message('Not enough credits for '+names[item]);return}
  if(item==='medkit'){if(hp===100){message('Health already full');return}credits-=prices[item];hp=Math.min(100,hp+35);hud();renderShop();return}
  if(item==='armor'){if(armor>=100){message('Armor already full');return}credits-=prices[item];armor=Math.min(100,armor+30);hud();renderShop();return}
  placing=item;shopOpen=false;buildingCamera=true;$('rd-panel').hidden=true;$('rd-placement').hidden=false;
  $('rd-placing-label').textContent=names[item]+' · ₡'+prices[item]+' — TAP FLOOR';
 }
 function renderShop(){
  const list=$('rd-items');list.innerHTML='';
  (Object.keys(prices) as Item[]).forEach(item=>{const b=document.createElement('button');b.textContent=names[item]+' · ₡'+prices[item];b.disabled=credits<prices[item];b.onclick=()=>choose(item);list.appendChild(b)});
  hud();
 }
 function openShop(){
  if(!active||radioHp<=0)return;
  shopOpen=true;playing=false;placing=null;$('rd-panel').hidden=false;$('rd-placement').hidden=true;
  message('Tap an item to buy or select a tile. The horde is frozen.');renderShop();
 }
 function resume(){shopOpen=false;placing=null;buildingCamera=false;playing=true;$('rd-panel').hidden=true;$('rd-placement').hidden=true}
 function place(x:number,y:number){
  if(!placing||credits<prices[placing])return;
  if(!inside(x,y)||reserved(x,y)||defenses.some(t=>t.x===x&&t.y===y)||d(player,{x,y})<.8||enemies.some(e=>d(e,{x,y})<.8)){message('Cannot place on occupied tiles, exits, or the radio');return}
  const candidate:Defense={x,y,kind:placing,cooldown:0,life:placing==='wire'?12:placing==='fire'?24:1,angle:placing==='turret'?-Math.PI/2:undefined,recoil:0};
  defenses.push(candidate);
  if(placing==='wall'&&!validPaths()){defenses.pop();message('Wall would block all paths from a door');return}
  credits-=prices[placing];route=field();hud();
  $('rd-placing-label').textContent=names[placing]+' · ₡'+prices[placing]+' — '+(credits>=prices[placing]?'PLACE ANOTHER':'INSUFFICIENT CREDITS');
  if(credits<prices[placing]){placing=null;$('rd-placing-label').textContent='No credits remaining — resume or return to shop'}
 }
 function spawn(){
  const index=spawnNumber++%4,door=doors[index],offset=(spawnNumber%3-1)*.24;
  const x=clamp(door.x+(door.x===0?.7:door.x===SIZE-1?-.7:offset),1,SIZE-2);
  const y=clamp(door.y+(door.y===0?.7:door.y===SIZE-1?-.7:offset),1,SIZE-2);
  const kind=wave>=7&&spawnNumber%9===0?'armored':wave>=4&&spawnNumber%4===0?'runner':wave>=9&&spawnNumber%13===0?'bruiser':'shambler';
  const base=kind==='runner'?23:kind==='armored'?78:kind==='bruiser'?125:40;
  enemies.push({x,y,hp:base+wave*3,maxHp:base+wave*3,speed:(kind==='runner'?1.28:kind==='bruiser'?.54:.70)*(1+wave*.065),hit:0,flash:0,kind});
 }
 function damage(e:Enemy,n:number){if(!enemies.includes(e))return;e.hp-=n;e.flash=.15;if(e.hp<=0){credits+=8;kills++;enemies.splice(enemies.indexOf(e),1);hud()}}
 function move(dt:number){
  const vx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x;
  const vy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+stick.y;
  const len=Math.hypot(vx,vy);if(len===0)return;
  const dx=vx/len*dt*3.2,dy=vy/len*dt*3.2;
  if(inside(player.x+dx,player.y)&&!wall(Math.round(player.x+dx),Math.round(player.y)))player.x+=dx;
  if(inside(player.x,player.y+dy)&&!wall(Math.round(player.x),Math.round(player.y+dy)))player.y+=dy;
 }
 function tick(dt:number){
  if(!playing)return;
  shotEffects=ageCombatFx(shotEffects,dt);recoil=Math.max(0,recoil-dt*2.5);
  for(const burst of trapBursts)burst.age+=dt;
  trapBursts=trapBursts.filter(b=>b.age<b.duration);
  for(const trap of defenses)trap.flash=Math.max(0,(trap.flash??0)-dt);
  elapsed+=dt;const nextWave=1+Math.floor(elapsed/27);if(nextWave!==wave){wave=nextWave;credits+=40;hud()}
  const interval=Math.max(.38,2.2-wave*.115);
  spawnClock+=dt;
  while(spawnClock>=interval&&enemies.length<140){spawnClock-=interval;const batch=1+Math.floor((wave-1)/4);for(let i=0;i<batch&&enemies.length<140;i++)spawn()}
  move(dt);
  shotClock-=dt;
  if(shotClock<=0){const nearest=enemies.filter(e=>d(e,player)<7).sort((a,b)=>d(a,player)-d(b,player))[0];if(nearest){
   const dx=nearest.x-player.x,dy=nearest.y-player.y,length=Math.hypot(dx,dy)||1;
   aimAngle=Math.atan2(dy,dx);
   shotEffects.push(...makeAttackFx('carbine',player.x,player.y,dx/length,dy/length,length,undefined,true));
   if(shotEffects.length>100)shotEffects.splice(0,shotEffects.length-100);
   recoil=.24;damage(nearest,26);shotClock=.29
  }}
  for(const defense of defenses){defense.cooldown=Math.max(0,defense.cooldown-dt);if(defense.kind==='turret')defense.recoil=Math.max(0,(defense.recoil??0)-dt*2.4)}
  for(const e of [...enemies]){
   e.flash=Math.max(0,e.flash-dt);e.hit=Math.max(0,e.hit-dt);
   const tileX=clamp(Math.round(e.x),1,SIZE-2),tileY=clamp(Math.round(e.y),1,SIZE-2);
   let speed=e.speed;
   for(const trap of [...defenses]){
    if(trap.kind==='wall'||trap.kind==='turret')continue;
    const dist=d(e,trap);
    if(trap.kind==='wire'&&dist<.8){speed*=.42;if(trap.cooldown===0){damage(e,3);trap.life--;trap.cooldown=.28;trap.flash=.24;if(trap.life<=0){trapBursts.push({x:trap.x,y:trap.y,kind:'wire',age:0,duration:.4});defenses.splice(defenses.indexOf(trap),1)}}}
    if(trap.kind==='fire'&&dist<.85&&trap.cooldown===0){damage(e,6);trap.cooldown=.35;trap.life-=.35;trap.flash=.35;trapBursts.push({x:trap.x,y:trap.y,kind:'fire',age:0,duration:.35});if(trap.life<=0)defenses.splice(defenses.indexOf(trap),1)}
    if(trap.kind==='shock'&&dist<1.15&&trap.cooldown===0){speed*=.2;damage(e,15);trap.cooldown=2.5;trap.flash=.45;trapBursts.push({x:trap.x,y:trap.y,kind:'shock',age:0,duration:.5})}
    if(trap.kind==='mine'&&dist<.8){trapBursts.push({x:trap.x,y:trap.y,kind:'mine',age:0,duration:.64});for(const victim of [...enemies])if(d(victim,trap)<1.7)damage(victim,42);defenses.splice(defenses.indexOf(trap),1)}
   }
   if(!enemies.includes(e))continue;
   if(d(e,{x:CENTER,y:CENTER})<.85){if(e.hit<=0){radioHp=Math.max(0,radioHp-(e.kind==='bruiser'?16:8));e.hit=.8;hud();if(radioHp<=0){finish();return}}continue}
   if(d(e,player)<.72&&e.hit===0){const dmg=e.kind==='bruiser'?12:5;const absorb=Math.min(armor,dmg);armor-=absorb;hp-=dmg-absorb;e.hit=.9;hud();if(hp<=0){finish();return}}
   const here=route[tileY*SIZE+tileX];let goal:Point={x:CENTER,y:CENTER};let best=here;
   for(const [dx,dy] of dirs){const x=tileX+dx,y=tileY+dy;if(!inside(x,y)||wall(x,y))continue;const n=route[y*SIZE+x];if(n<best){goal={x,y};best=n}}
   if(best>=9999)continue;
   const vx=goal.x-e.x,vy=goal.y-e.y,len=Math.hypot(vx,vy);
   if(len>.04){const step=Math.min(len,speed*dt);const nx=e.x+vx/len*step,ny=e.y+vy/len*step;
    if(inside(nx,ny)&&!wall(Math.round(nx),Math.round(ny))){e.x=nx;e.y=ny}
   }
  }
  // Mounted sentries acquire and track targets continuously, even while reloading.
  // Rotate by the shortest arc; shots fire from the visible muzzle when aligned.
  for(const turret of defenses.filter(t=>t.kind==='turret')){
   const target=enemies.filter(e=>d(e,turret)<6).sort((a,b)=>d(a,turret)-d(b,turret))[0];
   if(!target)continue;
   const origin={x:turret.x+.5,y:turret.y+.5};
   const dx=target.x-origin.x,dy=target.y-origin.y,range=Math.hypot(dx,dy)||1;
   const desired=Math.atan2(dy,dx),angle=turret.angle??-Math.PI/2;
   const delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));
   const step=clamp(delta,-dt*5,dt*5);
   turret.angle=angle+step;
   if(turret.cooldown>0||Math.abs(delta)>0.16)continue;
   const muzzle={x:origin.x+Math.cos(turret.angle)*.38,y:origin.y+Math.sin(turret.angle)*.38};
   const travel=Math.hypot(target.x-muzzle.x,target.y-muzzle.y);
   shotEffects.push(...makeAttackFx('squadAutomatic',muzzle.x,muzzle.y,Math.cos(turret.angle),Math.sin(turret.angle),travel,undefined,true));
   if(shotEffects.length>110)shotEffects.splice(0,shotEffects.length-110);
   damage(target,17);turret.recoil=.20;turret.cooldown=.5;
  }
 }
 function finish(){
  playing=false;shopOpen=false;placing=null;$('rd-panel').hidden=true;$('rd-placement').hidden=true;
  const result=$('rd-result');result.hidden=false;result.innerHTML='<h1>RADIO LOST</h1><p>Wave '+wave+' · '+kills+' zombies eliminated · '+Math.floor(elapsed)+' seconds defended</p><button id="rd-again">TRY AGAIN</button><button id="rd-main">MAIN MENU</button>';
  result.querySelector<HTMLButtonElement>('#rd-again')!.onclick=()=>{cleanup();beginRadioDefense(host,onExit)};
  result.querySelector<HTMLButtonElement>('#rd-main')!.onclick=()=>{cleanup();onExit()};
 }
 // Stylized military sentry: low anchored tripod, armored receiver, twin barrel rails,
 // optical tracking lens and a short recoil stroke. Only the turret head rotates.

 // All trap art is drawn from canvas primitives so the shipped mode needs no new assets.
 // Static military hardware is paired with small, readable in-world activation cues.
 function drawTrap(c:CanvasRenderingContext2D,x:number,y:number,t:number,trap:Defense,time:number){
  const flash=trap.flash??0;
  c.save();c.translate(x,y);
  c.fillStyle='rgba(2,8,10,.42)';c.beginPath();c.ellipse(0,t*.23,t*.39,t*.15,0,0,Math.PI*2);c.fill();
  if(trap.kind==='wire'){
   // Three tensioned razor-wire coils between battered steel support stakes.
   for(const side of [-1,1]){
    c.fillStyle='#354346';c.fillRect(side*t*.33-t*.036,-t*.29,t*.072,t*.52);
    c.fillStyle='#a7aaa3';c.fillRect(side*t*.33-t*.035,-t*.29,t*.065,t*.07);
   }
   c.strokeStyle='#adb9b7';c.lineWidth=Math.max(1,t*.043);
   for(let row=0;row<3;row++){
    const y0=(row-1)*t*.16;
    c.beginPath();
    for(let i=0;i<=20;i++){
     const px=(i/20-.5)*t*.64,py=y0+Math.sin(i*Math.PI*.65+time*.38)*t*.09;
     if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
    }c.stroke();
   }
   c.strokeStyle='#d4d8cd';c.lineWidth=Math.max(1,t*.022);
   for(let i=0;i<7;i++){const xx=(i/6-.5)*t*.6;c.beginPath();c.moveTo(xx,-t*.21);c.lineTo(xx+t*.07,-t*.34);c.moveTo(xx,t*.12);c.lineTo(xx-t*.06,t*.24);c.stroke()}
   if(flash>0){c.globalAlpha=flash/.24;c.strokeStyle='#f6a36c';c.lineWidth=t*.07;c.beginPath();c.arc(0,0,t*.38,0,Math.PI*2);c.stroke()}
  }else if(trap.kind==='fire'){
   // Low armored incendiary canister, pilot vents and animated combustion.
   c.fillStyle='#273333';c.beginPath();c.roundRect(-t*.34,-t*.24,t*.68,t*.49,t*.085);c.fill();
   c.strokeStyle='#89937f';c.lineWidth=Math.max(1,t*.034);c.stroke();
   c.fillStyle='#766a43';c.fillRect(-t*.26,-t*.08,t*.52,t*.10);
   for(let i=-1;i<=1;i++){
    c.fillStyle='#151e21';c.fillRect(i*t*.18-t*.045,-t*.20,t*.09,t*.12);
    const pulse=.5+.5*Math.sin(time*10+i*2.6);
    c.fillStyle='#ff8a34';c.beginPath();c.ellipse(i*t*.18,-t*.18,t*.045,t*(.045+pulse*.045),0,0,Math.PI*2);c.fill();
   }
   const burn=Math.max(0,flash/.35);
   if(burn>0){
    c.globalAlpha=.75*burn;
    for(let i=0;i<5;i++){const px=(i-2)*t*.14,sway=Math.sin(time*14+i)*t*.07,ht=t*(.25+.15*Math.sin(time*11+i)**2);
     c.fillStyle=i%2?'#ffc467':'#ed5b25';c.beginPath();c.moveTo(px-t*.09,t*.10);c.quadraticCurveTo(px+sway,-ht*.4,px+sway*.55,-ht);c.quadraticCurveTo(px+t*.1,-ht*.2,px+t*.08,t*.10);c.fill();
    }
   }
  }else if(trap.kind==='mine'){
   // Circular pressure mine with stepped casing, recessed pressure pad and warning paint.
   c.fillStyle='#161f21';c.beginPath();c.ellipse(0,t*.06,t*.33,t*.29,0,0,Math.PI*2);c.fill();
   c.fillStyle='#687267';c.beginPath();c.ellipse(0,-t*.015,t*.30,t*.24,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#adb19f';c.lineWidth=Math.max(1,t*.035);c.stroke();
   c.fillStyle='#303f3e';c.beginPath();c.ellipse(0,-t*.035,t*.20,t*.15,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#d0ae5a';c.lineWidth=Math.max(1,t*.04);c.beginPath();c.arc(0,-t*.035,t*.23,.23,Math.PI-.23);c.stroke();
   c.fillStyle='#b0b8aa';c.beginPath();c.arc(0,-t*.045,t*.065,0,Math.PI*2);c.fill();
   const light=.5+.5*Math.sin(time*3.3);
   c.fillStyle='rgba(236,99,69,'+(.4+.6*light)+')';c.beginPath();c.arc(t*.12,-t*.11,Math.max(1,t*.03),0,Math.PI*2);c.fill();
  }else if(trap.kind==='shock'){
   // Reinforced emitter plate, copper contacts, capacitor and charged blue coil.
   c.fillStyle='#273337';c.beginPath();c.roundRect(-t*.35,-t*.32,t*.7,t*.65,t*.07);c.fill();
   c.strokeStyle='#718d96';c.lineWidth=Math.max(1,t*.04);c.stroke();
   for(const side of [-1,1]){
    c.fillStyle='#9f7c45';c.fillRect(side*t*.22-t*.04,-t*.19,t*.08,t*.40);
    c.fillStyle='#b5cbc8';c.beginPath();c.arc(side*t*.22,-t*.18,t*.065,0,Math.PI*2);c.fill();
   }
   c.strokeStyle='#71bed2';c.lineWidth=Math.max(1,t*.054);c.beginPath();
   for(let i=0;i<=12;i++){const xx=(i/12-.5)*t*.32,yy=Math.sin(time*8+i*1.4)*t*.065;if(i===0)c.moveTo(xx,yy);else c.lineTo(xx,yy)}c.stroke();
   c.fillStyle='#a7efff';c.beginPath();c.arc(0,0,t*.055,0,Math.PI*2);c.fill();
   if(flash>0){c.strokeStyle='rgba(126,223,255,'+(flash/.45)+')';c.lineWidth=Math.max(1,t*.04);c.beginPath();c.arc(0,0,t*(.24+(.45-flash)*.62),0,Math.PI*2);c.stroke()}
  }
  c.restore();
 }
 function drawTrapBurst(c:CanvasRenderingContext2D,v:View,burst:TrapBurst){
  const t=v.tile,p=clamp(burst.age/burst.duration,0,1),fade=(1-p);
  c.save();c.translate(v.ox+(burst.x+.5)*t,v.oy+(burst.y+.5)*t);
  if(burst.kind==='mine'){
   const r=t*(.18+p*1.55);
   const glow=c.createRadialGradient(0,0,0,0,0,r);
   glow.addColorStop(0,'rgba(255,237,159,'+(.78*fade)+')');
   glow.addColorStop(.35,'rgba(240,121,51,'+(.53*fade)+')');
   glow.addColorStop(1,'rgba(87,86,75,0)');
   c.fillStyle=glow;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
   c.strokeStyle='rgba(252,200,112,'+(.85*fade)+')';c.lineWidth=Math.max(1,t*.08*fade);c.beginPath();c.arc(0,0,r*.78,0,Math.PI*2);c.stroke();
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9+burst.x,rad=r*(.6+.2*(i%3));c.strokeStyle='rgba(232,215,175,'+fade+')';c.lineWidth=Math.max(1,t*.045*fade);c.beginPath();c.moveTo(Math.cos(a)*rad*.2,Math.sin(a)*rad*.2);c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);c.stroke()}
  }else if(burst.kind==='shock'){
   c.strokeStyle='rgba(125,226,255,'+fade+')';c.lineWidth=Math.max(1,t*.07*fade);c.beginPath();c.arc(0,0,t*(.25+p*1.15),0,Math.PI*2);c.stroke();
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5+p*2,r=t*(.24+p*.92);c.beginPath();c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);c.lineTo(Math.cos(a+.26)*r*.62,Math.sin(a+.26)*r*.62);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke()}
  }else if(burst.kind==='fire'){
   c.fillStyle='rgba(245,113,47,'+(.20*fade)+')';c.beginPath();c.ellipse(0,0,t*(.25+p*.85),t*(.2+p*.52),0,0,Math.PI*2);c.fill();
  }else{
   c.strokeStyle='rgba(205,216,203,'+(.7*fade)+')';c.lineWidth=Math.max(1,t*.035);c.beginPath();c.arc(0,0,t*(.2+p*.5),0,Math.PI*2);c.stroke();
  }
  c.restore();
 }

 function drawSentry(c:CanvasRenderingContext2D,x:number,y:number,tile:number,angle:number,recoil:number){
  c.save();c.translate(x,y);
  c.fillStyle='rgba(0,0,0,.44)';c.beginPath();c.ellipse(0,tile*.29,tile*.38,tile*.15,0,0,Math.PI*2);c.fill();
  c.lineCap='round';c.lineJoin='round';
  for(const leg of [-2.6,-.55,1.52]){
   c.strokeStyle='#192528';c.lineWidth=Math.max(2,tile*.105);
   c.beginPath();c.moveTo(0,tile*.06);c.lineTo(Math.cos(leg)*tile*.34,Math.sin(leg)*tile*.19+tile*.12);c.stroke();
   c.strokeStyle='#697876';c.lineWidth=Math.max(1,tile*.046);c.stroke();
  }
  c.fillStyle='#2b3b3d';c.beginPath();c.ellipse(0,0,tile*.23,tile*.18,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#99a7a1';c.lineWidth=Math.max(1,tile*.038);c.stroke();
  c.save();c.rotate(angle);
  const kick=(recoil/.2)*tile*.09;
  c.fillStyle='#151e20';c.beginPath();c.roundRect(-tile*.25,-tile*.14,tile*.42,tile*.28,tile*.055);c.fill();
  c.fillStyle='#536765';c.beginPath();c.roundRect(-tile*.20,-tile*.12,tile*.35,tile*.22,tile*.045);c.fill();
  c.fillStyle='#8b9995';c.fillRect(-tile*.15,-tile*.085,tile*.19,tile*.03);
  c.strokeStyle='#1a2426';c.lineWidth=Math.max(2,tile*.105);
  for(const side of [-1,1]){c.beginPath();c.moveTo(tile*.08-kick,side*tile*.065);c.lineTo(tile*.42-kick,side*tile*.065);c.stroke()}
  c.strokeStyle='#a9b4ac';c.lineWidth=Math.max(1,tile*.024);c.beginPath();c.moveTo(tile*.15-kick,-tile*.13);c.lineTo(tile*.33-kick,-tile*.13);c.stroke();
  c.fillStyle='#2c3738';c.fillRect(tile*.37-kick,-tile*.095,tile*.08,tile*.19);
  c.fillStyle='#182c30';c.beginPath();c.roundRect(-tile*.065,-tile*.16,tile*.16,tile*.13,tile*.032);c.fill();
  c.fillStyle='#8ed3df';c.beginPath();c.arc(tile*.055,-tile*.11,Math.max(1,tile*.038),0,Math.PI*2);c.fill();
  if(recoil>.025){
   const alpha=clamp(recoil/.2,0,1);
   c.fillStyle='rgba(247,153,67,'+(alpha*.27)+')';c.beginPath();c.ellipse(tile*.47-kick,0,tile*.25*alpha,tile*.14*alpha,0,0,Math.PI*2);c.fill();
   c.fillStyle='rgba(255,225,158,'+alpha+')';c.beginPath();c.moveTo(tile*.38-kick,0);c.lineTo(tile*.56-kick,-tile*.075*alpha);c.lineTo(tile*.72-kick,0);c.lineTo(tile*.56-kick,tile*.075*alpha);c.fill();
  }
  c.restore();c.restore();
 }
 function render(){
  const ratio=Math.min(2,devicePixelRatio||1),width=Math.max(320,Math.floor(cvs.clientWidth*ratio)),height=Math.max(180,Math.floor(cvs.clientHeight*ratio));
  if(cvs.width!==width||cvs.height!==height){cvs.width=width;cvs.height=height}
  // Build mode zooms to the complete arena; combat restores the survivor-following camera.
  // Ease the zoom without ever leaving the world border. Use the actual rendered view for placement taps.
  const targetZoom=buildingCamera?1:zoom;
  displayZoom+= (targetZoom-displayZoom)*Math.min(1,.22);
  if(Math.abs(displayZoom-targetZoom)<.002)displayZoom=targetZoom;
  const tile=Math.min((width-18)/SIZE,(height-18)/SIZE)*displayZoom;
  // Center the full map during construction; otherwise follow the player within arena boundaries.
  const worldSize=SIZE*tile;
  const centerX=(player.x+.5)*tile,centerY=(player.y+.5)*tile;
  const ox=buildingCamera?(width-worldSize)/2:worldSize>width?clamp(width/2-centerX,width-worldSize,0):(width-worldSize)/2;
  const oy=buildingCamera?(height-worldSize)/2:worldSize>height?clamp(height/2-centerY,height-worldSize,0):(height-worldSize)/2;
  view={tile,ox,oy,width,height,minX:0,maxX:SIZE,minY:0,maxY:SIZE};
  ctx.fillStyle='#080f12';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#293b39';ctx.fillRect(view.ox,view.oy,SIZE*tile,SIZE*tile);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const px=view.ox+x*tile,py=view.oy+y*tile;
   ctx.fillStyle=(x+y)%2?'#283d38':'#2c403b';ctx.fillRect(px,py,tile+.3,tile+.3);
   if(x===0||x===SIZE-1||y===0||y===SIZE-1){
    ctx.fillStyle=doors.some(p=>p.x===x&&p.y===y)?'#857b54':'#687475';ctx.fillRect(px,py,tile,tile);
   }
  }
  for(const door of doors){
   const x=view.ox+door.x*tile,y=view.oy+door.y*tile;
   ctx.fillStyle='#c67546';ctx.fillRect(x+tile*.15,y+tile*.15,tile*.7,tile*.7);
  }
  for(const b of defenses){
   const x=view.ox+b.x*tile,y=view.oy+b.y*tile;
   if(b.kind==='wire'||b.kind==='fire'||b.kind==='mine'||b.kind==='shock'){
    drawTrap(ctx,x+tile*.5,y+tile*.5,tile,b,elapsed);continue;
   }
   if(b.kind==='turret'){
    drawSentry(ctx,x+tile*.5,y+tile*.5,tile,b.angle??-Math.PI/2,b.recoil??0);
    continue;
   }
   ctx.fillStyle=b.kind==='wall'?'#7a8685':b.kind==='wire'?'#9ca09a':b.kind==='fire'?'#ba6429':b.kind==='mine'?'#d0aa67':'#669db3';
   ctx.fillRect(x+tile*.08,y+tile*.08,tile*.84,tile*.84);
   if(b.kind==='wall'){ctx.strokeStyle='#364347';ctx.strokeRect(x+tile*.1,y+tile*.1,tile*.8,tile*.8)}
   else{ctx.fillStyle='#141b1b';ctx.font='bold '+Math.max(8,tile*.65)+'px system-ui';ctx.textAlign='center';ctx.fillText(b.kind==='wire'?'#':b.kind==='fire'?'♨':b.kind==='mine'?'✹':'ϟ',x+tile*.5,y+tile*.76)}
  }
  for(const burst of trapBursts)drawTrapBurst(ctx,view,burst);
  const rx=view.ox+CENTER*tile,ry=view.oy+CENTER*tile;
  ctx.fillStyle='#171f21';ctx.fillRect(rx-tile*.48,ry-tile*.4,tile*1.95,tile*1.95);
  ctx.fillStyle='#6d8a73';ctx.fillRect(rx,ry,tile,tile);
  ctx.fillStyle='#b3f5b7';ctx.beginPath();ctx.arc(rx+tile*.5,ry+tile*.32,tile*.15,0,Math.PI*2);ctx.fill();
  ctx.font='bold '+Math.max(10,tile*.57)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#d7f5dc';ctx.fillText('RADIO',rx+tile*.5,ry-tile*.52);
  for(const e of enemies){drawSprite(ctx,e.kind,view,e.x,e.y,{scale:e.kind==='bruiser'?1.25:1.02,stride:elapsed*7,motionSpeed:e.speed,glow:e.flash>0?'#e1785f':undefined})}
  drawSprite(ctx,'player',view,player.x,player.y,{scale:1.12,stride:elapsed*8,motionSpeed:keys.size||stick.magnitude>.13?3:0,weapon:'carbine',aimAngle,weaponRecoil:recoil});
  drawCombatFx(ctx,view,shotEffects);
  const bar=width*.43;ctx.fillStyle='#1a2427dd';ctx.fillRect((width-bar)/2,height-17,bar,9);ctx.fillStyle=radioHp>90?'#69bc83':'#c86655';ctx.fillRect((width-bar)/2,height-17,bar*radioHp/300,9);
 }
 function animation(now:number){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;tick(dt);render();raf=requestAnimationFrame(animation)}
 function keyDown(e:KeyboardEvent){if(!active)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE'){if(d(player,{x:CENTER,y:CENTER})<3||shopOpen)openShop();else message('Move closer to the radio')}if(e.code==='Escape'){if(placing)openShop();else if(shopOpen)resume();else openShop()}}
 function keyUp(e:KeyboardEvent){keys.delete(e.code)}
 window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
 // The canvas accepts two-finger zoom in play and build mode. A pinch never places a wall.
 cvs.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinchStart=Math.hypot(a.x-b.x,a.y-b.y);pinchZoom=zoom;pinchMoved=true}
 });
 cvs.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinchStart>0&&!buildingCamera){const [a,b]=[...pointers.values()];zoom=clamp(pinchZoom*Math.hypot(a.x-b.x,a.y-b.y)/pinchStart,1,MAX_ZOOM)}
 });
 function endCanvasPointer(e:PointerEvent){
  const point=pointers.get(e.pointerId);
  if(e.pointerType==='touch'&&!point)return;
  if(e.pointerType==='touch'){e.preventDefault();pointers.delete(e.pointerId)}
  if(e.type==='pointercancel'){pinchMoved=false;return}
  if(pointers.size===0)pinchStart=0;
  if(pinchMoved){if(pointers.size===0)pinchMoved=false;return}
  if(!placing)return;
  const rect=cvs.getBoundingClientRect();
  const px=(e.clientX-rect.left)/rect.width*cvs.width,py=(e.clientY-rect.top)/rect.height*cvs.height;
  const x=Math.round((px-view.ox)/view.tile-.5),y=Math.round((py-view.oy)/view.tile-.5);
  place(x,y);
 }
 cvs.addEventListener('pointerup',endCanvasPointer);
 cvs.addEventListener('pointercancel',endCanvasPointer);
 $('rd-shop').onclick=()=>{if(d(player,{x:CENTER,y:CENTER})<3||shopOpen)openShop();else {const p=$('rd-result');p.hidden=false;p.innerHTML='<p>Move within 3 tiles of the radio to use its shop.</p><button id="rd-close-notice">OK</button>';p.querySelector<HTMLButtonElement>('#rd-close-notice')!.onclick=()=>{p.hidden=true}}};
 $('rd-exit').onclick=()=>{cleanup();onExit()};
 $('rd-resume').onclick=resume;
 $('rd-placement-done').onclick=resume;
 $('rd-placement-back').onclick=openShop;
 function cleanup(){active=false;releaseStick();pointers.clear();cancelAnimationFrame(raf);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',releaseStick);style.remove();root.remove()}
 window.addEventListener('blur',releaseStick);
 renderShop();render();raf=requestAnimationFrame(animation);
}

import {drawSprite,type View} from './rogueliteVisuals.ts';

type Point={x:number;y:number};
type Kind='wall'|'wire'|'fire'|'mine'|'shock'|'turret';
type Defense={x:number;y:number;kind:Kind;cooldown:number;life:number};
type Enemy={x:number;y:number;hp:number;maxHp:number;speed:number;hit:number;kind:'shambler'|'runner'|'armored'|'bruiser';flash:number};
type Item=Kind|'medkit'|'armor';
const SIZE=29,CENTER=14;
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
 const root=document.createElement('section');
 root.id='radio-defense';
 root.setAttribute('aria-label','Radio Defense');
 root.innerHTML='<div class="rd-hud"><strong>RADIO DEFENSE</strong><span id="rd-wave">WAVE 1</span><span id="rd-hp">RADIO 300/300</span><span id="rd-credits">₡250</span><span id="rd-life">HP 100</span><button id="rd-shop">RADIO SHOP (E)</button><button id="rd-exit">EXIT</button></div>'+
 '<canvas id="rd-canvas" aria-label="Four-door radio defense arena"></canvas>'+
 '<div id="rd-direction"><button data-move="left">◀</button><button data-move="up">▲</button><button data-move="down">▼</button><button data-move="right">▶</button></div>'+
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
 '#rd-direction{position:absolute;left:12px;bottom:12px;z-index:4;display:grid;grid-template-columns:repeat(2,48px);gap:5px}#rd-direction button{font-size:20px;height:48px;padding:0;background:#213b37c9}@media(pointer:fine){#rd-direction{opacity:.42}}';
 host.appendChild(style);host.appendChild(root);
 const $=<T extends HTMLElement>(id:string)=>root.querySelector<T>('#'+id)!;
 const cvs=$<HTMLCanvasElement>('rd-canvas'),ctx=cvs.getContext('2d')!;
 let last=performance.now(),raf=0,view:View={tile:20,ox:0,oy:0,width:0,height:0,minX:0,maxX:SIZE,minY:0,maxY:SIZE};
 const keys=new Set<string>(),held=new Set<string>();
 const get=(kind:Kind,x:number,y:number)=>defenses.find(a=>a.kind===kind&&a.x===x&&a.y===y);
 const wall=(x:number,y:number)=>defenses.some(a=>a.kind==='wall'&&a.x===x&&a.y===y);
 const inside=(x:number,y:number)=>x>=1&&y>=1&&x<SIZE-1&&y<SIZE-1;
 const reserved=(x:number,y:number)=>Math.abs(x-CENTER)<=1&&Math.abs(y-CENTER)<=1||doors.some(p=>d(p,{x,y})<=1.5);
 function field():number[]{
  const dist=Array(SIZE*SIZE).fill(9999),queue=[{x:CENTER,y:CENTER}];dist[cell(queue[0])]=0;
  for(let i=0;i<queue.length;i++){const p=queue[i],n=dist[cell(p)]+1;for(const [dx,dy] of dirs){const x=p.x+dx,y=p.y+dy;if(!inside(x,y)||wall(x,y))continue;const k=y*SIZE+x;if(n<dist[k]){dist[k]=n;queue.push({x,y})}}}return dist;
 }
 let route=field();
 function validPaths(){const f=field();return doors.every(p=>dirs.some(([dx,dy])=>f[clamp(p.y+dy,1,SIZE-2)*SIZE+clamp(p.x+dx,1,SIZE-2)]<9999));}
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
  placing=item;shopOpen=false;$('rd-panel').hidden=true;$('rd-placement').hidden=false;
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
 function resume(){shopOpen=false;placing=null;playing=true;$('rd-panel').hidden=true;$('rd-placement').hidden=true}
 function place(x:number,y:number){
  if(!placing||credits<prices[placing])return;
  if(!inside(x,y)||reserved(x,y)||defenses.some(t=>t.x===x&&t.y===y)||d(player,{x,y})<.8||enemies.some(e=>d(e,{x,y})<.8)){message('Cannot place on occupied tiles, exits, or the radio');return}
  const candidate:Defense={x,y,kind:placing,cooldown:0,life:placing==='wire'?12:placing==='fire'?24:1};
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
 function damage(e:Enemy,n:number){e.hp-=n;e.flash=.15;if(e.hp<=0){credits+=8;kills++;enemies.splice(enemies.indexOf(e),1);hud()}}
 function move(dt:number){
  const vx=Number(keys.has('KeyD')||keys.has('ArrowRight')||held.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||held.has('left'));
  const vy=Number(keys.has('KeyS')||keys.has('ArrowDown')||held.has('down'))-Number(keys.has('KeyW')||keys.has('ArrowUp')||held.has('up'));
  const len=Math.hypot(vx,vy);if(len===0)return;
  const dx=vx/len*dt*3.2,dy=vy/len*dt*3.2;
  if(inside(player.x+dx,player.y)&&!wall(Math.round(player.x+dx),Math.round(player.y)))player.x+=dx;
  if(inside(player.x,player.y+dy)&&!wall(Math.round(player.x),Math.round(player.y+dy)))player.y+=dy;
 }
 function tick(dt:number){
  if(!playing)return;
  elapsed+=dt;const nextWave=1+Math.floor(elapsed/27);if(nextWave!==wave){wave=nextWave;credits+=40;hud()}
  const interval=Math.max(.38,2.2-wave*.115);
  spawnClock+=dt;
  while(spawnClock>=interval&&enemies.length<140){spawnClock-=interval;const batch=1+Math.floor((wave-1)/4);for(let i=0;i<batch&&enemies.length<140;i++)spawn()}
  move(dt);
  shotClock-=dt;
  if(shotClock<=0){const nearest=enemies.filter(e=>d(e,player)<7).sort((a,b)=>d(a,player)-d(b,player))[0];if(nearest){damage(nearest,26);shotClock=.29}}
  for(const defense of defenses)defense.cooldown=Math.max(0,defense.cooldown-dt);
  for(const e of [...enemies]){
   e.flash=Math.max(0,e.flash-dt);e.hit=Math.max(0,e.hit-dt);
   const tileX=clamp(Math.round(e.x),1,SIZE-2),tileY=clamp(Math.round(e.y),1,SIZE-2);
   let speed=e.speed;
   for(const trap of [...defenses]){
    if(trap.kind==='wall'||d(e,trap)>trap.kind==='turret'?0:0){} // no-op, selection is handled below
    const dist=d(e,trap);
    if(trap.kind==='wire'&&dist<.8){speed*=.42;if(trap.cooldown===0){damage(e,3);trap.life--;trap.cooldown=.28;if(trap.life<=0)defenses.splice(defenses.indexOf(trap),1)}}
    if(trap.kind==='fire'&&dist<.85&&trap.cooldown===0){damage(e,6);trap.cooldown=.35;trap.life-=.35;if(trap.life<=0)defenses.splice(defenses.indexOf(trap),1)}
    if(trap.kind==='shock'&&dist<1.15&&trap.cooldown===0){speed*=.2;damage(e,15);trap.cooldown=2.5}
    if(trap.kind==='mine'&&dist<.8){for(const victim of [...enemies])if(d(victim,trap)<1.7)damage(victim,42);defenses.splice(defenses.indexOf(trap),1)}
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
  for(const turret of defenses.filter(x=>x.kind==='turret'&&x.cooldown===0)){const e=enemies.filter(e=>d(e,turret)<6).sort((a,b)=>d(a,turret)-d(b,turret))[0];if(e){damage(e,17);turret.cooldown=.5}}
 }
 function finish(){
  playing=false;shopOpen=false;placing=null;$('rd-panel').hidden=true;$('rd-placement').hidden=true;
  const result=$('rd-result');result.hidden=false;result.innerHTML='<h1>RADIO LOST</h1><p>Wave '+wave+' · '+kills+' zombies eliminated · '+Math.floor(elapsed)+' seconds defended</p><button id="rd-again">TRY AGAIN</button><button id="rd-main">MAIN MENU</button>';
  result.querySelector<HTMLButtonElement>('#rd-again')!.onclick=()=>{cleanup();beginRadioDefense(host,onExit)};
  result.querySelector<HTMLButtonElement>('#rd-main')!.onclick=()=>{cleanup();onExit()};
 }
 function render(){
  const ratio=Math.min(2,devicePixelRatio||1),width=Math.max(320,Math.floor(cvs.clientWidth*ratio)),height=Math.max(180,Math.floor(cvs.clientHeight*ratio));
  if(cvs.width!==width||cvs.height!==height){cvs.width=width;cvs.height=height}
  const tile=Math.min((width-18)/SIZE,(height-18)/SIZE);
  view={tile,ox:(width-SIZE*tile)/2,oy:(height-SIZE*tile)/2,width,height,minX:0,maxX:SIZE,minY:0,maxY:SIZE};
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
  for(const b of defenses){const x=view.ox+b.x*tile,y=view.oy+b.y*tile;
   ctx.fillStyle=b.kind==='wall'?'#7a8685':b.kind==='wire'?'#9ca09a':b.kind==='fire'?'#ba6429':b.kind==='mine'?'#d0aa67':b.kind==='shock'?'#669db3':'#537d61';
   ctx.fillRect(x+tile*.08,y+tile*.08,tile*.84,tile*.84);
   if(b.kind==='wall'){ctx.strokeStyle='#364347';ctx.strokeRect(x+tile*.1,y+tile*.1,tile*.8,tile*.8)}
   else{ctx.fillStyle='#141b1b';ctx.font='bold '+Math.max(8,tile*.65)+'px system-ui';ctx.textAlign='center';ctx.fillText(b.kind==='wire'?'#':b.kind==='fire'?'♨':b.kind==='mine'?'✹':b.kind==='shock'?'ϟ':'✦',x+tile*.5,y+tile*.76)}
  }
  const rx=view.ox+CENTER*tile,ry=view.oy+CENTER*tile;
  ctx.fillStyle='#171f21';ctx.fillRect(rx-tile*.48,ry-tile*.4,tile*1.95,tile*1.95);
  ctx.fillStyle='#6d8a73';ctx.fillRect(rx,ry,tile,tile);
  ctx.fillStyle='#b3f5b7';ctx.beginPath();ctx.arc(rx+tile*.5,ry+tile*.32,tile*.15,0,Math.PI*2);ctx.fill();
  ctx.font='bold '+Math.max(10,tile*.57)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#d7f5dc';ctx.fillText('RADIO',rx+tile*.5,ry-tile*.52);
  for(const e of enemies){drawSprite(ctx,e.kind,view,e.x,e.y,{scale:e.kind==='bruiser'?1.25:1.02,stride:elapsed*7,motionSpeed:e.speed,glow:e.flash>0?'#e1785f':undefined})}
  drawSprite(ctx,'player',view,player.x,player.y,{scale:1.12,stride:elapsed*8,motionSpeed:keys.size||held.size?3:0,weapon:'carbine',aimAngle:0});
  const bar=width*.43;ctx.fillStyle='#1a2427dd';ctx.fillRect((width-bar)/2,height-17,bar,9);ctx.fillStyle=radioHp>90?'#69bc83':'#c86655';ctx.fillRect((width-bar)/2,height-17,bar*radioHp/300,9);
 }
 function animation(now:number){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;tick(dt);render();raf=requestAnimationFrame(animation)}
 function keyDown(e:KeyboardEvent){if(!active)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE'){if(d(player,{x:CENTER,y:CENTER})<3||shopOpen)openShop();else message('Move closer to the radio')}if(e.code==='Escape'){if(placing)openShop();else if(shopOpen)resume();else openShop()}}
 function keyUp(e:KeyboardEvent){keys.delete(e.code)}
 window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
 for(const b of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-move]'))){
  const dir=b.dataset.move!;
  b.onpointerdown=e=>{e.preventDefault();held.add(dir);b.setPointerCapture(e.pointerId)};
  b.onpointerup=()=>held.delete(dir);b.onpointercancel=()=>held.delete(dir);b.onlostpointercapture=()=>held.delete(dir);
 }
 cvs.addEventListener('pointerdown',e=>{if(!placing)return;e.preventDefault();const rect=cvs.getBoundingClientRect(),x=Math.round(((e.clientX-rect.left)/rect.width*cvs.width-view.ox)/view.tile-.5),y=Math.round(((e.clientY-rect.top)/rect.height*cvs.height-view.oy)/view.tile-.5);place(x,y)});
 $('rd-shop').onclick=()=>openShop();
 $('rd-exit').onclick=()=>{cleanup();onExit()};
 $('rd-resume').onclick=resume;
 $('rd-placement-done').onclick=resume;
 $('rd-placement-back').onclick=openShop;
 function cleanup(){active=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);style.remove();root.remove()}
 renderShop();render();raf=requestAnimationFrame(animation);
}

import {generateDungeon} from './dungeon';
type State={seed:number;x:number;y:number;looted:number[];killed:number[];health:number;ammo:number;explored?:number[]};
const KEY='deadzone-active-dungeon-v1';
/** Phase 4 playable solo dungeon prototype. Surface remains paused until extraction. */
export function launchDungeon(onExit:(success:boolean,loot:number)=>void){
let saved:State|null=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
const map=generateDungeon(saved?.seed??Math.floor(Math.random()*2147483647));
const state:State=saved??{seed:map.seed,x:map.entrance.x,y:map.entrance.y,looted:[],killed:[],health:100,ammo:80};
const explored=new Set<number>(state.explored??[]);
const lineClear=(ax:number,ay:number,bx:number,by:number)=>{const steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay))*4;for(let i=1;i<steps;i++){const t=i/steps,x=Math.floor(ax+(bx-ax)*t),y=Math.floor(ay+(by-ay)*t);if(x<0||y<0||x>=map.width||y>=map.height||map.tiles[y*map.width+x]===1)return false}return true};
const see=()=>{for(let y=Math.max(0,state.y-5);y<=Math.min(map.height-1,state.y+5);y++)for(let x=Math.max(0,state.x-5);x<=Math.min(map.width-1,state.x+5);x++)if((x-state.x)**2+(y-state.y)**2<=25&&lineClear(state.x,state.y,x,y))explored.add(y*map.width+x)};see();
const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;background:#0b1319;z-index:20;display:grid;grid-template-rows:auto 1fr auto;color:white';
host.innerHTML='<header style="padding:7px;background:#1e302e">CATACOMBS · <span id="d-status"></span> · Reach green extraction after looting. WASD/arrow move, SPACE shoot, E loot.</header><canvas id="d-map" style="width:100%;height:100%;object-fit:contain;touch-action:none"></canvas><footer style="display:flex;justify-content:center;gap:8px;padding:5px"><button data-dir="left">◀</button><button data-dir="up">▲</button><button data-dir="down">▼</button><button data-dir="right">▶</button><button id="d-action">SHOOT</button><button id="d-loot">LOOT / EXTRACT</button></footer>';
document.body.append(host);const canvas=host.querySelector('canvas')!,ctx=canvas.getContext('2d')!,keys=new Set<string>();
function commit(){state.explored=[...explored];localStorage.setItem(KEY,JSON.stringify(state))}
function finish(){const count=state.looted.length;localStorage.removeItem(KEY);window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);host.remove();onExit(true,count)}
function fail(){localStorage.removeItem(KEY);window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);host.remove();onExit(false,0)}
function action(){const loot=map.loot.findIndex(p=>p.x===state.x&&p.y===state.y);if(loot>=0&&!state.looted.includes(loot)){state.looted.push(loot);commit();return}if(state.x===map.extraction.x&&state.y===map.extraction.y){finish();return}}
function shoot(){if(state.ammo<=0)return;state.ammo--;const enemy=map.enemies.findIndex((p,i)=>!state.killed.includes(i)&&Math.abs(state.x-p.x)+Math.abs(state.y-p.y)<=3&&lineClear(state.x,state.y,p.x,p.y));if(enemy>=0)state.killed.push(enemy);commit()}
function step(dx:number,dy:number){const x=state.x+dx,y=state.y+dy;if(x<0||y<0||x>=map.width||y>=map.height)return;if(map.tiles[y*map.width+x]===0){state.x=x;state.y=y;const enemy=map.enemies.findIndex((p,i)=>!state.killed.includes(i)&&Math.abs(x-p.x)+Math.abs(y-p.y)<=1);if(enemy>=0){state.health-=10;if(state.health<=0){fail();return}}see();commit()} }
function down(e:KeyboardEvent){if(!host.isConnected)return;e.stopImmediatePropagation();const m:{[key:string]:[number,number]}={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};if(m[e.code]){e.preventDefault();keys.add(e.code);if(!e.repeat)step(...m[e.code])}if(!e.repeat&&e.code==='KeyE')action();if(!e.repeat&&e.code==='Space'){e.preventDefault();shoot()}}
function up(e:KeyboardEvent){keys.delete(e.code)}
window.addEventListener('keydown',down,true);window.addEventListener('keyup',up,true);
for(const b of host.querySelectorAll<HTMLButtonElement>('[data-dir]'))b.onclick=()=>{const d=b.dataset.dir!,v=d==='left'?[-1,0]:d==='right'?[1,0]:d==='up'?[0,-1]:[0,1];step(v[0],v[1])};
host.querySelector<HTMLButtonElement>('#d-action')!.onclick=shoot;host.querySelector<HTMLButtonElement>('#d-loot')!.onclick=action;
function render(){if(!host.isConnected)return;const tile=20;canvas.width=map.width*tile;canvas.height=map.height*tile;for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){ctx.fillStyle=map.tiles[y*map.width+x]?'#111b20':'#405046';ctx.fillRect(x*tile,y*tile,tile-1,tile-1);if(!explored.has(y*map.width+x)){ctx.fillStyle='#05090d';ctx.fillRect(x*tile,y*tile,tile,tile)}}
for(const [i,p]of map.loot.entries())if(!state.looted.includes(i)&&explored.has(p.y*map.width+p.x)){ctx.fillStyle='#e2b34b';ctx.fillRect(p.x*tile+5,p.y*tile+5,10,10)}
for(const [i,p]of map.enemies.entries())if(!state.killed.includes(i)&&explored.has(p.y*map.width+p.x)){ctx.fillStyle='#ab5e5b';ctx.fillRect(p.x*tile+4,p.y*tile+4,12,12)}
if(explored.has(map.extraction.y*map.width+map.extraction.x)){ctx.fillStyle='#43dca0';ctx.fillRect(map.extraction.x*tile+2,map.extraction.y*tile+2,16,16)}
ctx.fillStyle='#d9f2df';ctx.beginPath();ctx.arc(state.x*tile+10,state.y*tile+10,7,0,Math.PI*2);ctx.fill();
host.querySelector('#d-status')!.textContent='HP '+state.health+' · AMMO '+state.ammo+' · LOOT '+state.looted.length+' · KILLS '+state.killed.length;
requestAnimationFrame(render)}requestAnimationFrame(render);
}
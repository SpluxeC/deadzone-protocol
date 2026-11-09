export type LootCrate={x:number;y:number;kind?:'supply'|'weapon';orientation?:'horizontal'|'vertical'};
export type RoomTheme='medical'|'security'|'maintenance'|'storage'|'supply'|'contaminated';
export type DungeonRoom={x:number;y:number;w:number;h:number;cx:number;cy:number;theme:RoomTheme};
export type FloorEvent={x:number;y:number;kind:'supplyDrop'|'infectedNest'|'fieldHospital'|'powerSurge'};
export type SecretRoom={door:{x:number;y:number};center:{x:number;y:number};rewardIndex:number};
export type DungeonLayout={width:number;height:number;seed:number;tiles:number[];entrance:{x:number;y:number};extraction:{x:number;y:number};extractionSize?:1|2;loot:LootCrate[];enemies:{x:number;y:number}[];rooms?:DungeonRoom[];events?:FloorEvent[];secret?:SecretRoom};
/** All four cells covered by a modern elevator; old save layouts use one cell. */
export function elevatorCells(map:DungeonLayout):{x:number;y:number}[]{
 const {x,y}=map.extraction;
 if(map.extractionSize!==2)return [{x,y}];
 return [{x:x-.5,y:y-.5},{x:x+.5,y:y-.5},{x:x-.5,y:y+.5},{x:x+.5,y:y+.5}];
}
/** Players can activate the elevator while on its floor or beside its threshold. */
export function elevatorInRange(map:DungeonLayout,player:{x:number;y:number}):boolean{
 const {x,y}=map.extraction;
 if(map.extractionSize!==2)return Math.hypot(player.x-x,player.y-y)<=1.5;
 const dx=Math.max(0,Math.abs(player.x-x)-.5),dy=Math.max(0,Math.abs(player.y-y)-.5);
 return Math.hypot(dx,dy)<=1.15;
}
/** Tile footprints stay separate even when crates spawn directly alongside each other. */
export function crateCells(crate:LootCrate):{x:number;y:number}[]{
 if(crate.kind!=='weapon')return [{x:crate.x,y:crate.y}];
 return crate.orientation==='vertical'
  ?[{x:crate.x,y:crate.y-.5},{x:crate.x,y:crate.y+.5}]
  :[{x:crate.x-.5,y:crate.y},{x:crate.x+.5,y:crate.y}];
}
/** Check reachability from either end of a long weapon case. */
export function crateInRange(crate:LootCrate,player:{x:number;y:number}):boolean{
 return crateCells(crate).some(cell=>Math.hypot(cell.x-player.x,cell.y-player.y)<1.4);
}
/** Seeded procedural connected dungeon: 0=floor, 1=wall. */
export function generateDungeon(seed:number,width=42,height=30,layoutVersion:1|2|3=2):DungeonLayout{
if(!Number.isInteger(seed)||width<22||height<18)throw Error('Invalid dungeon parameters');
let state=seed>>>0;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const tiles=new Array<number>(width*height).fill(1);
const carve=(x:number,y:number)=>{if(x>0&&y>0&&x<width-1&&y<height-1)tiles[y*width+x]=0};
// New layouts have 3-tile-wide corridors; legacy layouts preserve exact original geometry.
const carvePassage=(x:number,y:number)=>{const radius=layoutVersion>=2?1:0;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)carve(x+dx,y+dy)};
const rooms:{x:number;y:number;w:number;h:number;cx:number;cy:number}[]=[];
for(let i=0;i<(layoutVersion===3?360:layoutVersion===2?90:65)&&rooms.length<(layoutVersion===3?36:layoutVersion===2?9:12);i++){
const w=(layoutVersion>=2?6:4)+Math.floor(rand()*(layoutVersion===3?9:5)),h=(layoutVersion>=2?6:4)+Math.floor(rand()*(layoutVersion===3?9:5)),x=2+Math.floor(rand()*(width-w-3)),y=2+Math.floor(rand()*(height-h-3));
if(rooms.some(r=>x<=r.x+r.w+1&&x+w+1>=r.x&&y<=r.y+r.h+1&&y+h+1>=r.y))continue;
const cx=x+Math.floor(w/2),cy=y+Math.floor(h/2);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)carve(xx,yy);
if(rooms.length){let px=rooms[rooms.length-1].cx,py=rooms[rooms.length-1].cy;if(rand()<.5){while(px!==cx){px+=Math.sign(cx-px);carvePassage(px,py)}while(py!==cy){py+=Math.sign(cy-py);carvePassage(px,py)}}else{while(py!==cy){py+=Math.sign(cy-py);carvePassage(px,py)}while(px!==cx){px+=Math.sign(cx-px);carvePassage(px,py)}}}
rooms.push({x,y,w,h,cx,cy});
}
if(rooms.length<2)throw Error('Unable to generate connected rooms');
const entrance={x:rooms[0].cx,y:rooms[0].cy};
const reachable=new Set([entrance.y*width+entrance.x]),queue=[entrance];
for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,key=y*width+x;if(x>0&&y>0&&x<width&&y<height&&tiles[key]===0&&!reachable.has(key)){reachable.add(key);queue.push({x,y})}}}
// A new-generation elevator occupies four walkable cells around a half-tile center.
 // Pick the center of a real room instead of the farthest (often corner) corridor.
 // Reachability comes from the entrance flood fill and still applies to old layouts.
 const legacyExtraction=queue[queue.length-1];
 const extractionSize:1|2=layoutVersion===3?2:1;
 let extraction:{x:number;y:number}=legacyExtraction;
 if(layoutVersion===3){
  const choices=rooms.filter(room=>room.w>=6&&room.h>=6).map(room=>{
   const left=room.x+Math.floor((room.w-2)/2);
   const top=room.y+Math.floor((room.h-2)/2);
   const center={x:left+.5,y:top+.5};
   const distance=Math.hypot(center.x-entrance.x,center.y-entrance.y);
   const cells=[[left,top],[left+1,top],[left,top+1],[left+1,top+1]];
   const valid=cells.every(([x,y])=>reachable.has(y*width+x)&&
    tiles[y*width+x]===0);
   return {center,distance,valid};
  }).filter(c=>c.valid);
  // Prefer a distant room, not the starting room, while varying location by seed.
  const distant=choices.filter(c=>c.distance>=12);
  const pool=distant.length?distant:choices;
  if(pool.length){
   pool.sort((a,b)=>b.distance-a.distance);
   const bestDistance=pool[0].distance;
   const farCandidates=pool.filter(c=>c.distance>=bestDistance*.82);
   extraction=farCandidates[Math.floor(rand()*farCandidates.length)].center;
  }
 }
const candidates=queue.filter(p=>Math.abs(p.x-entrance.x)+Math.abs(p.y-entrance.y)>7&&Math.hypot(p.x-extraction.x,p.y-extraction.y)>3);
const loot:LootCrate[]=[],enemies:{x:number;y:number}[]=[];
const occupied=new Set<number>();
const tileKey=(x:number,y:number)=>y*width+x;
const shuffle=<T>(values:T[]):T[]=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values};
const shuffled=shuffle(candidates.filter(p=>layoutVersion!==3||Math.hypot(p.x-entrance.x,p.y-entrance.y)>7));
// Modern floors have eight ordinary supply cases and two longer, rarer weapon cases.
// Legacy maps keep their original single-cell crate coordinates/counts.
if(layoutVersion===3){
 const available=new Set(shuffled.map(p=>tileKey(p.x,p.y)));
 for(const p of shuffled){
  if(loot.filter(c=>c.kind==='weapon').length>=2)break;
  const axes=rand()<.5?(['horizontal','vertical'] as const):(['vertical','horizontal'] as const);
  for(const orientation of axes){
   const near=orientation==='horizontal'?{x:p.x+1,y:p.y}:{x:p.x,y:p.y+1};
   const cells=[p,near],clear=cells.every(c=>available.has(tileKey(c.x,c.y))&&!occupied.has(tileKey(c.x,c.y)));
   if(!clear)continue;
   loot.push({x:(p.x+near.x)/2,y:(p.y+near.y)/2,kind:'weapon',orientation});
   for(const c of cells)occupied.add(tileKey(c.x,c.y));
   break;
  }
 }
}
const supplyCount=layoutVersion===3?8:10;
for(const p of shuffled){
 if(loot.filter(c=>c.kind!=='weapon').length>=supplyCount)break;
 const key=tileKey(p.x,p.y);
 if(occupied.has(key))continue;
 occupied.add(key);loot.push({x:p.x,y:p.y,kind:'supply'});
}
for(const p of shuffle([...candidates])){
 if(enemies.length>=18)break;
 const key=tileKey(p.x,p.y);
 if(!occupied.has(key)&&!enemies.some(v=>v.x===p.x&&v.y===p.y))enemies.push({...p});
}
const themes:RoomTheme[]=['medical','security','maintenance','storage','supply','contaminated'];
// Room metadata is decorative only: tiles, pathfinding and gameplay remain unchanged.
const atmosphereRooms: DungeonRoom[]=rooms.map((room,i)=>({
 ...room,theme:themes[(Math.floor(rand()*themes.length)+i)%themes.length]
}));
// One deterministic event per modern floor (sometimes two on deeper waves).
const events:FloorEvent[]=[];
if(layoutVersion===3){
 const eventKinds:FloorEvent['kind'][]=['supplyDrop','infectedNest','fieldHospital','powerSurge'];
 const candidatesRooms=shuffle(rooms.filter(room=>Math.hypot(room.cx-entrance.x,room.cy-entrance.y)>8&&Math.hypot(room.cx-extraction.x,room.cy-extraction.y)>3));
 for(const room of candidatesRooms.slice(0,2)){
  const kind=eventKinds[Math.floor(rand()*eventKinds.length)];
  const x=room.cx,y=room.cy;
  if(!loot.some(c=>Math.hypot(c.x-x,c.y-y)<2)&&!enemies.some(e=>Math.hypot(e.x-x,e.y-y)<2)){
   events.push({x,y,kind});break;
  }
 }
}
// A rare 3x3 annex is carved out of solid rock, with one disguised sealed doorway.
// Existing normal routes stay intact until the player interacts with the door.
let secret:SecretRoom|undefined;
if(layoutVersion===3&&rand()<.13){
 const shuffledRooms=shuffle([...rooms]);
 outer:for(const room of shuffledRooms){
  if(Math.hypot(room.cx-entrance.x,room.cy-entrance.y)<9)continue;
  for(const side of shuffle(['right','left','down','up'])){
   const dx=side==='right'?1:side==='left'?-1:0;
   const dy=side==='down'?1:side==='up'?-1:0;
   const door={x:dx?dx>0?room.x+room.w:room.x-1:room.cx,
               y:dy?dy>0?room.y+room.h:room.y-1:room.cy};
   const center={x:door.x+dx*2,y:door.y+dy*2};
   const blank:{x:number;y:number}[]=[];
   for(let yy=center.y-1;yy<=center.y+1;yy++)for(let xx=center.x-1;xx<=center.x+1;xx++)blank.push({x:xx,y:yy});
   if(blank.some(p=>p.x<2||p.y<2||p.x>=width-2||p.y>=height-2||tiles[tileKey(p.x,p.y)]!==1))continue;
   if(tiles[tileKey(door.x,door.y)]!==1)continue;
   for(const p of blank)carve(p.x,p.y);
   // Keep the doorway solid until deliberately opened.
   const rewardIndex=loot.length;
   loot.push({x:center.x+.5,y:center.y,kind:'weapon',orientation:'horizontal'});
   secret={door,center,rewardIndex};
   break outer;
  }
 }
}
// Final physical-layout pass: make sure loot cases never turn a connected
// corridor into a dead end or prevent access to a secret door. Test as though
// the secret panel is open, so the newly discovered room is actually usable.
const baseWalkable=new Uint8Array(width*height);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const k=tileKey(x,y);
 if(tiles[k]===0||(secret&&x===secret.door.x&&y===secret.door.y))baseWalkable[k]=1;
}
const baseReach=new Uint8Array(width*height),pending:number[]=[tileKey(entrance.x,entrance.y)];
baseReach[pending[0]]=1;
for(let head=0;head<pending.length;head++){
 const k=pending[head],x=k%width,y=Math.floor(k/width);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,nk=tileKey(nx,ny);
  if(nx<0||nx>=width||ny<0||ny>=height||!baseWalkable[nk]||baseReach[nk])continue;
  baseReach[nk]=1;pending.push(nk);
 }
}
const requiredCells=pending.length;
const blocked=new Uint8Array(width*height);
const cellIndices=(c:LootCrate)=>crateCells(c).map(p=>tileKey(Math.round(p.x),Math.round(p.y)));
const nearSecretDoor=(c:LootCrate)=>!!secret&&crateCells(c).some(p=>
 Math.abs(p.x-secret!.door.x)<=2.15&&Math.abs(p.y-secret!.door.y)<=2.15);
const allowed=(c:LootCrate,isReward:boolean)=>{
 const cells=cellIndices(c);
 if(new Set(cells).size!==cells.length)return false;
 if(!isReward&&nearSecretDoor(c))return false;
 if(cells.some(k=>k<0||k>=blocked.length||!baseReach[k]||blocked[k]))return false;
 if(cells.some(k=>{
  const x=k%width,y=Math.floor(k/width);
  return Math.hypot(x-entrance.x,y-entrance.y)<2.3||
   Math.hypot(x-extraction.x,y-extraction.y)<2.2||
   events.some(e=>Math.hypot(x-e.x,y-e.y)<1.5);
 }))return false;
 for(const k of cells)blocked[k]=1;
 const start=tileKey(entrance.x,entrance.y);
 const found=new Uint8Array(width*height),q:number[]=[start];
 found[start]=1;
 for(let head=0;head<q.length;head++){
  const k=q[head],x=k%width,y=Math.floor(k/width);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,nk=tileKey(nx,ny);
   if(nx<0||nx>=width||ny<0||ny>=height||!baseReach[nk]||blocked[nk]||found[nk])continue;
   found[nk]=1;q.push(nk);
  }
 }
 const safe=q.length===requiredCells-blocked.reduce((n,v)=>n+v,0)&&
   (!secret||found[tileKey(secret.door.x,secret.door.y)]===1);
 if(!safe)for(const k of cells)blocked[k]=0;
 return safe;
};
// Reserve the annex's reward case before placing all random floor loot.
// Otherwise an ordinary crate could make the reward inaccessible.
const originalCrates=[...loot],safeCrates=new Array<LootCrate>(loot.length);
const priority=originalCrates.map((_,i)=>i).sort((a,b)=>
 (a===secret?.rewardIndex?-1:b===secret?.rewardIndex?1:a-b));
const candidatesFor=(crate:LootCrate):LootCrate[]=>{
 const values:LootCrate[]=[crate];
 // Retain the crate's type and footprint. A weapons case always remains
 // two cells long and never overlaps another crate.
 for(const k of pending){
  const x=k%width,y=Math.floor(k/width);
  if(crate.kind==='weapon'){
   values.push({x:x+.5,y,kind:'weapon',orientation:'horizontal'});
   values.push({x,y:y+.5,kind:'weapon',orientation:'vertical'});
  }else values.push({x,y,kind:'supply'});
 }
 return values;
};
for(const i of priority){
 const crate=originalCrates[i],isReward=i===secret?.rewardIndex;
 const candidate=candidatesFor(crate).find(c=>allowed(c,isReward));
 if(candidate)safeCrates[i]=candidate;
 else {
  // Extremely crowded legacy layouts retain their original loot geometry
  // rather than silently changing save indices or removing the reward.
  safeCrates[i]=crate;
  for(const k of cellIndices(crate))if(k>=0&&k<blocked.length)blocked[k]=1;
 }
}
for(let i=0;i<loot.length;i++)loot[i]=safeCrates[i];
return{width,height,seed,tiles,entrance,extraction,extractionSize,loot,enemies,rooms:atmosphereRooms,events,secret};
}
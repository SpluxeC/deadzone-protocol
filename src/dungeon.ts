export type LootCrate={x:number;y:number;kind?:'supply'|'weapon';orientation?:'horizontal'|'vertical'};
export type DungeonLayout={width:number;height:number;seed:number;tiles:number[];entrance:{x:number;y:number};extraction:{x:number;y:number};extractionSize?:1|2;loot:LootCrate[];enemies:{x:number;y:number}[]};
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
const shuffled=shuffle([...candidates]);
// Modern floors have eight ordinary supply cases and two longer, rarer weapon cases.
// Legacy maps keep their original single-cell crate coordinates/counts.
if(layoutVersion===3){
 const available=new Set(candidates.map(p=>tileKey(p.x,p.y)));
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
return{width,height,seed,tiles,entrance,extraction,extractionSize,loot,enemies};
}
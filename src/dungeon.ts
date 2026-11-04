export type DungeonLayout={width:number;height:number;seed:number;tiles:number[];entrance:{x:number;y:number};extraction:{x:number;y:number};loot:{x:number;y:number}[];enemies:{x:number;y:number}[]};
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
const extraction=queue[queue.length-1];
const candidates=queue.filter(p=>Math.abs(p.x-entrance.x)+Math.abs(p.y-entrance.y)>7&&Math.abs(p.x-extraction.x)+Math.abs(p.y-extraction.y)>3);
const loot:{x:number;y:number}[]=[],enemies:{x:number;y:number}[]=[];
for(let i=0;i<Math.min(10,candidates.length);i++){const p=candidates[Math.floor(rand()*candidates.length)];if(!loot.some(v=>v.x===p.x&&v.y===p.y))loot.push({...p})}
for(let i=0;i<Math.min(18,candidates.length);i++){const p=candidates[Math.floor(rand()*candidates.length)];if(!enemies.some(v=>v.x===p.x&&v.y===p.y)&&!loot.some(v=>v.x===p.x&&v.y===p.y))enemies.push({...p})}
return{width,height,seed,tiles,entrance,extraction,loot,enemies};
}
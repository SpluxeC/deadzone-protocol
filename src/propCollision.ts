/** Shared, cached physical footprints for furniture and loot.
 * This grid does not rewrite floor tiles, so rendering, saves and door mechanics
 * retain their original map data. Flat stains and shattered glass remain decals.
 */
import type {DungeonLayout} from './dungeon.ts';
import {crateCells,elevatorCells} from './dungeon.ts';
import {facilityAtmosphere} from './facilityAtmosphere.ts';

const collisionCache=new WeakMap<DungeonLayout,Uint8Array>();
const flatDecorations=new Set(['brokenGlass','ammoPile']);
export function propCollisionGrid(map:DungeonLayout):Uint8Array{
 const cached=collisionCache.get(map);if(cached)return cached;
 const {width:w,height:h,tiles}=map;
 const grid=new Uint8Array(w*h);
 const index=(x:number,y:number)=>y*w+x;
 const inBounds=(x:number,y:number)=>x>=0&&y>=0&&x<w&&y<h;
 for(const crate of map.loot)for(const cell of crateCells(crate)){
  const x=Math.round(cell.x),y=Math.round(cell.y);
  if(inBounds(x,y))grid[index(x,y)]=1;
 }
 const elevator=new Set(elevatorCells(map).map(c=>index(c.x,c.y)));
 const eventCells=map.events??[];
 const center=map.entrance;
 const canStand=(x:number,y:number)=>inBounds(x,y)&&tiles[index(x,y)]===0&&grid[index(x,y)]===0;
 // The passable count from entrance before adding a prop. Reject furniture that
 // isolates reachable floor tiles or leaves any objective with no adjacent space.
 const countReachable=()=>{
  const out=new Uint8Array(w*h),queue=new Int32Array(w*h);
  const origin=index(Math.round(center.x),Math.round(center.y));
  if(!canStand(Math.round(center.x),Math.round(center.y)))return 0;
  let head=0,tail=1;queue[0]=origin;out[origin]=1;
  while(head<tail){
   const cur=queue[head++],x=cur%w,y=Math.floor(cur/w);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy;
    if(!canStand(nx,ny))continue;
    const k=index(nx,ny);if(out[k])continue;
    out[k]=1;queue[tail++]=k;
   }
  }
  return tail;
 };
 let connected=countReachable();
 const atmosphere=facilityAtmosphere(map);
 const retained:typeof atmosphere.props=[];
 for(const prop of atmosphere.props){
  if(flatDecorations.has(prop.kind)){retained.push(prop);continue}
  const x=Math.round(prop.x),y=Math.round(prop.y),k=index(x,y);
  if(!inBounds(x,y)||!canStand(x,y)||elevator.has(k))continue;
  if(Math.hypot(x-center.x,y-center.y)<3.2||
     Math.hypot(x-map.extraction.x,y-map.extraction.y)<3.1||
     eventCells.some(e=>Math.hypot(e.x-x,e.y-y)<1.5)||
     (map.secret&&Math.hypot(map.secret.door.x-x,map.secret.door.y-y)<2))continue;
  grid[k]=1;
  const reach=countReachable();
  if(reach!==connected-1){grid[k]=0;continue}
  connected=reach;retained.push(prop);
 }
 // Filtering the cached visuals guarantees every *drawn* raised prop has an
 // exact corresponding solid footprint; rejected props are never drawn.
 atmosphere.props=retained;
 collisionCache.set(map,grid);
 return grid;
}
export function solidAt(map:DungeonLayout,x:number,y:number):boolean{
 const tx=Math.floor(x+.5),ty=Math.floor(y+.5);
 if(tx<0||ty<0||tx>=map.width||ty>=map.height)return true;
 return map.tiles[ty*map.width+tx]!==0||propCollisionGrid(map)[ty*map.width+tx]!==0;
}

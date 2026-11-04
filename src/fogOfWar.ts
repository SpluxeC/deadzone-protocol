/** Persistent, two-state dungeon exploration: unknown is black, visited is fully visible. */
import type {DungeonLayout} from './dungeon.ts';
import type {View} from './rogueliteVisuals.ts';

export type Explorer={x:number;y:number;radius?:number};
export type FogState={explored:Uint8Array};
export function createFog(map:DungeonLayout,saved:number[]=[]):FogState{
 const explored=new Uint8Array(map.width*map.height);
 for(const i of saved)if(Number.isInteger(i)&&i>=0&&i<explored.length)explored[i]=1;
 return {explored};
}
function wall(map:DungeonLayout,x:number,y:number):boolean{
 const tx=Math.floor(x+.5),ty=Math.floor(y+.5);
 return tx<0||ty<0||tx>=map.width||ty>=map.height||map.tiles[ty*map.width+tx]!==0;
}
/** Walls block discovery beyond themselves; their near faces can still be discovered. */
export function lightLine(map:DungeonLayout,ax:number,ay:number,bx:number,by:number):boolean{
 const distance=Math.hypot(bx-ax,by-ay),steps=Math.max(1,Math.ceil(distance*5));
 for(let i=1;i<steps;i++)if(wall(map,ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps))return false;
 return true;
}
export function updateFog(map:DungeonLayout,fog:FogState,explorers:readonly Explorer[]):boolean{
 let changed=false;
 for(const source of explorers){
  const radius=source.radius??5.5,reach=Math.ceil(radius);
  for(let y=Math.max(0,Math.floor(source.y-reach));y<=Math.min(map.height-1,Math.ceil(source.y+reach));y++)
   for(let x=Math.max(0,Math.floor(source.x-reach));x<=Math.min(map.width-1,Math.ceil(source.x+reach));x++){
    const i=y*map.width+x;
    if(fog.explored[i]||Math.hypot(x-source.x,y-source.y)>radius)continue;
    if(!lightLine(map,source.x,source.y,x,y))continue;
    fog.explored[i]=1;changed=true;
   }
 }
 return changed;
}
export function exploredIndices(fog:FogState):number[]{
 const out:number[]=[];for(let i=0;i<fog.explored.length;i++)if(fog.explored[i])out.push(i);return out;
}
export function fogAlpha(fog:FogState,index:number):number{return fog.explored[index]?0:1}
export function renderFog(ctx:CanvasRenderingContext2D,map:DungeonLayout,v:View,fog:FogState):void{
 const t=v.tile,w=map.width;
 ctx.save();ctx.fillStyle='#010408';
 for(let y=v.minY;y<v.maxY;y++)for(let x=v.minX;x<v.maxX;x++){
  if(fog.explored[y*w+x])continue;
  ctx.fillRect(Math.floor(v.ox+(x-.5)*t),Math.floor(v.oy+(y-.5)*t),Math.ceil(t)+1,Math.ceil(t)+1);
 }
 ctx.restore();
}

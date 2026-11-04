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

/** Visual flashlight only: explored tiles remain fully visible outside the cone. */
export const FLASHLIGHT_FOV_DEGREES=100;
export const FLASHLIGHT_HALF_ANGLE=FLASHLIGHT_FOV_DEGREES*Math.PI/360;
export type Flashlight={x:number;y:number;dx:number;dy:number;range?:number};
export function flashlightStrength(source:Flashlight,x:number,y:number):number{
 const vx=x-source.x,vy=y-source.y,distance=Math.hypot(vx,vy);
 const range=source.range??8;
 if(distance>range)return 0;
 if(distance<.6)return 1;
 const direction=Math.hypot(source.dx,source.dy)||1;
 const angle=Math.acos(Math.max(-1,Math.min(1,(vx*source.dx+vy*source.dy)/(distance*direction))));
 if(angle>FLASHLIGHT_HALF_ANGLE)return 0;
 const edge=Math.min(1,(FLASHLIGHT_HALF_ANGLE-angle)/.12);
 const fade=Math.min(1,(range-distance)/1.4);
 return Math.max(0,edge*fade);
}
/** Add a subtle, wall-occluded cone without darkening surrounding discovered areas. */
export function renderFlashlights(ctx:CanvasRenderingContext2D,map:DungeonLayout,v:View,lights:readonly Flashlight[],fog:FogState):void{
 const tile=v.tile,illuminated=new Float32Array(map.width*map.height);
 for(const light of lights){
  const radius=Math.ceil(light.range??8);
  for(let y=Math.max(v.minY,Math.floor(light.y-radius));y<Math.min(v.maxY,Math.ceil(light.y+radius)+1);y++)
   for(let x=Math.max(v.minX,Math.floor(light.x-radius));x<Math.min(v.maxX,Math.ceil(light.x+radius)+1);x++){
    const i=y*map.width+x;
    if(!fog.explored[i])continue;
    const strength=flashlightStrength(light,x,y);
    if(strength>illuminated[i]&&lightLine(map,light.x,light.y,x,y))illuminated[i]=strength;
   }
 }
 ctx.save();
 for(let y=v.minY;y<v.maxY;y++)for(let x=v.minX;x<v.maxX;x++){
  const strength=illuminated[y*map.width+x];
  if(strength<=0)continue;
  ctx.fillStyle='rgba(255,238,180,'+(strength*.18).toFixed(3)+')';
  ctx.fillRect(Math.floor(v.ox+(x-.5)*tile),Math.floor(v.oy+(y-.5)*tile),Math.ceil(tile)+1,Math.ceil(tile)+1);
 }
 ctx.restore();
}

/** Per-floor discovery and direction-aware flashlight visibility.
 * Tile visibility is cosmetic and never changes enemy AI or weapon hit rules.
 */
import type {DungeonLayout} from './dungeon.ts';
import type {View} from './rogueliteVisuals.ts';

export type Flashlight={x:number;y:number;dx:number;dy:number;range?:number;halfAngle?:number};
export type FogState={explored:Uint8Array;revealed:Float32Array;light:Float32Array;clock:number;lastX:number;lastY:number};
export function createFog(map:DungeonLayout,saved:number[]=[]):FogState{
 const size=map.width*map.height,explored=new Uint8Array(size),revealed=new Float32Array(size),light=new Float32Array(size);
 for(const i of saved){if(Number.isInteger(i)&&i>=0&&i<size){explored[i]=1;revealed[i]=1}}
 return {explored,revealed,light,clock:1,lastX:NaN,lastY:NaN};
}
function wall(map:DungeonLayout,x:number,y:number):boolean{
 const tx=Math.floor(x+.5),ty=Math.floor(y+.5);
 return tx<0||ty<0||tx>=map.width||ty>=map.height||map.tiles[ty*map.width+tx]!==0;
}
/** Wall-aware ray with closed endpoint allowed for illuminated wall faces. */
export function lightLine(map:DungeonLayout,ax:number,ay:number,bx:number,by:number):boolean{
 const dist=Math.hypot(bx-ax,by-ay),steps=Math.max(1,Math.ceil(dist*5));
 for(let i=1;i<steps;i++)if(wall(map,ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps))return false;
 return true;
}
export function beamStrength(source:Flashlight,x:number,y:number):number{
 const vx=x-source.x,vy=y-source.y,dist=Math.hypot(vx,vy);
 if(dist<1.15)return 1; // local glow prevents a pitch-black player perimeter
 const range=source.range??8,half=source.halfAngle??.51;
 if(dist>=range)return 0;
 const facing=(vx*source.dx+vy*source.dy)/(dist*(Math.hypot(source.dx,source.dy)||1));
 const cone=Math.acos(Math.max(-1,Math.min(1,facing)));
 if(cone>=half)return 0;
 const edge=Math.min(1,(half-cone)/.16),fall=Math.min(1,(range-dist)/1.7);
 return Math.max(0,Math.min(1,edge*fall));
}
export function updateFog(map:DungeonLayout,fog:FogState,lights:readonly Flashlight[],dt:number):boolean{
 // Recalculate the few visible cells; never trace the whole 42x30 map per frame.
 const w=map.width,h=map.height;
 fog.light.fill(0);
 let changed=false;
 for(const source of lights){
  const rad=Math.ceil(source.range??8);
  const minX=Math.max(0,Math.floor(source.x-rad)),maxX=Math.min(w-1,Math.ceil(source.x+rad));
  const minY=Math.max(0,Math.floor(source.y-rad)),maxY=Math.min(h-1,Math.ceil(source.y+rad));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const strength=beamStrength(source,x,y);
   if(strength<=0)continue;
   const i=y*w+x;
   if(strength>fog.light[i]&&lightLine(map,source.x,source.y,x,y))fog.light[i]=strength;
  }
 }
 const step=Math.min(1,Math.max(0,dt)*5.5);
 for(let i=0;i<fog.light.length;i++){
  const strength=fog.light[i];
  if(strength>0&&fog.explored[i]===0){fog.explored[i]=1;changed=true}
  const goal=fog.explored[i]?1:0;
  fog.revealed[i]+=(goal-fog.revealed[i])*step;
 }
 return changed;
}
export function exploredIndices(fog:FogState):number[]{
 const out:number[]=[];for(let i=0;i<fog.explored.length;i++)if(fog.explored[i])out.push(i);
 return out;
}
export function renderFog(ctx:CanvasRenderingContext2D,map:DungeonLayout,v:View,fog:FogState):void{
 const t=v.tile,w=map.width;
 ctx.save();
 // Outside the known dungeon remains completely black.
 ctx.fillStyle='#010306';ctx.fillRect(0,0,v.width,v.height);
 // Cut out dungeon tiles using the original frame copied to an offscreen canvas by the caller.
 ctx.restore();
}
export function fogAlpha(fog:FogState,index:number):number{
 if(fog.explored[index]===0)return 1;
 const discovery=fog.revealed[index];
 return Math.min(1,Math.max(.09,1-discovery*.18-fog.light[index]*.76));
}

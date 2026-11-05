import type {DungeonLayout} from './dungeon.ts';
import {canOccupy} from './tileCollision.ts';

export type SquadPosition={x:number;y:number};
export const SQUAD_SPACING=.82;

/** Rejects both a new overlap and a step that would walk through another character. */
export function squadStepClear(from:SquadPosition,to:SquadPosition,others:readonly SquadPosition[],spacing=SQUAD_SPACING):boolean{
 for(const other of others){
  const dx=to.x-from.x,dy=to.y-from.y;
  const denom=dx*dx+dy*dy;
  const t=denom>0?Math.max(0,Math.min(1,((other.x-from.x)*dx+(other.y-from.y)*dy)/denom)):0;
  if(Math.hypot(from.x+dx*t-other.x,from.y+dy*t-other.y)<spacing-.0001)return false;
 }
 return true;
}
/** Coordinated local avoidance: attempt forward, shallow sidesteps, then yield.
 * Candidates are checked against the entire teammate/player footprint, not just walls.
 */
export function squadMove(map:DungeonLayout,actor:SquadPosition,dx:number,dy:number,step:number,others:readonly SquadPosition[],spacing=SQUAD_SPACING):boolean{
 const length=Math.hypot(dx,dy);
 if(length<1e-7||step<=0)return false;
 const ux=dx/length,uy=dy/length,d=Math.min(step,.22);
 const angles=[0,.43,-.43,.85,-.85,1.25,-1.25,Math.PI*.5,-Math.PI*.5];
 for(const theta of angles){
  const x=ux*Math.cos(theta)-uy*Math.sin(theta),y=ux*Math.sin(theta)+uy*Math.cos(theta);
  const target={x:actor.x+x*d,y:actor.y+y*d};
  if(!canOccupy(map,target.x,target.y))continue;
  if(!squadStepClear(actor,target,others,spacing))continue;
  actor.x=target.x;actor.y=target.y;
  return true;
 }
 return false;
}
/** Spawn and saved-game migration must obey the same spacing as movement. */
export function spacedSquadPosition(map:DungeonLayout,wanted:SquadPosition,others:readonly SquadPosition[],spacing=SQUAD_SPACING):SquadPosition{
 if(canOccupy(map,wanted.x,wanted.y)&&others.every(p=>Math.hypot(p.x-wanted.x,p.y-wanted.y)>=spacing))return {...wanted};
 const baseX=Math.round(wanted.x),baseY=Math.round(wanted.y);
 for(let ring=1;ring<=12;ring++){
  for(let y=baseY-ring;y<=baseY+ring;y++)for(let x=baseX-ring;x<=baseX+ring;x++){
   if(Math.max(Math.abs(x-baseX),Math.abs(y-baseY))!==ring)continue;
   if(canOccupy(map,x,y)&&others.every(p=>Math.hypot(p.x-x,p.y-y)>=spacing))return{x,y};
  }
 }
 return {...wanted};
}

/** Tactical formation and threat selection helpers. */
import type {SquadOrder} from './squadSystems.ts';
export type TacticalPosition={x:number;y:number};
export type TacticalEnemy=TacticalPosition&{alive:boolean;boss?:boolean;scoutMarked?:number};
export function formationDestination(order:SquadOrder,player:TacticalPosition,heading:TacticalPosition,index:number,count:number,anchor:TacticalPosition):TacticalPosition{
 if(order==='hold')return {...anchor};
 const mag=Math.hypot(heading.x,heading.y)||1,fx=heading.x/mag,fy=heading.y/mag;
 const sx=-fy,sy=fx,row=Math.floor(index/2),side=index%2===0?-1:1;
 if(order==='defensive'){
  const angle=2*Math.PI*(index+.5)/Math.max(1,count);
  return {x:player.x+Math.cos(angle)*2.1,y:player.y+Math.sin(angle)*2.1};
 }
 const depth=order==='regroup'?.8+.2*row:order==='suppress'?-0.65-.45*row:1.1+.63*row;
 const width=order==='regroup'?.66+.13*row:order==='suppress'?1.5+.45*row:1.1+.26*row;
 return {x:player.x-fx*depth+sx*side*width,y:player.y-fy*depth+sy*side*width};
}
export function pickTacticalTarget<T extends TacticalEnemy>(order:SquadOrder,unit:TacticalPosition,player:TacticalPosition,visible:readonly T[],focus:T|null=null):T|null{
 const targets=visible.filter(e=>e.alive);
 if(!targets.length)return null;
 if(order==='focus'&&focus&&targets.includes(focus))return focus;
 const dist=(p:TacticalPosition,q:TacticalPosition)=>Math.hypot(p.x-q.x,p.y-q.y);
 const score=(e:T)=>{
  const own=dist(unit,e),threat=dist(player,e);
  if(order==='defensive'||order==='regroup')return threat*.93+own*.18-(e.boss?1:0);
  if(order==='suppress')return own*.47+threat*.26-(e.boss?1.5:0)-(e.scoutMarked?1.1:0);
  return own-(e.scoutMarked?1.3:0)-(e.boss?.35:0);
 };
 return targets.reduce((best,e)=>!best||score(e)<score(best)?e:best,null as T|null);
}

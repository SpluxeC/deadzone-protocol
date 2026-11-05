/** Rendering-only motion smoothing. Never changes movement, aiming, hitboxes or save data. */
export type MovingPoint={x:number;y:number};
export type CharacterMotion={x:number;y:number;angle:number;phase:number;speed:number;time:number};
export const wrapAngle=(angle:number):number=>Math.atan2(Math.sin(angle),Math.cos(angle));
export function nextCharacterMotion(
 previous:CharacterMotion|null,
 point:MovingPoint,
 now:number,
 fallbackFacing:number,
 turnRate=4,
 preferFacing=false
):CharacterMotion{
 if(!previous)return{x:point.x,y:point.y,angle:wrapAngle(fallbackFacing),phase:0,speed:0,time:now};
 const dt=Math.max(0,Math.min(.09,(now-previous.time)/1000));
 const dx=point.x-previous.x,dy=point.y-previous.y,dist=Math.hypot(dx,dy);
 // Only real travel should steer the body; tiny movement/collision jitter must not spin it.
 const moving=dt>0&&dist>Math.max(.005,dt*.18);
 const desired=preferFacing?fallbackFacing:moving?Math.atan2(dy,dx):previous.angle;
 const delta=wrapAngle(desired-previous.angle);
 const nextAngle=wrapAngle(previous.angle+Math.max(-turnRate*dt,Math.min(turnRate*dt,delta)));
 const rawSpeed=dt>0?Math.min(5,dist/dt):0;
 const speed=moving?previous.speed*.32+rawSpeed*.68:Math.max(0,previous.speed-dt*9);
 return {x:point.x,y:point.y,angle:nextAngle,phase:previous.phase+Math.min(dist,.35)*10,speed,time:now};
}

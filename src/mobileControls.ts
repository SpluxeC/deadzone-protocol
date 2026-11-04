/** Screen-independent, dead-zone aware virtual analog stick math. */
export type StickVector={x:number;y:number;magnitude:number};
export const STICK_DEADZONE=.13;
export function normalizeStick(dx:number,dy:number,radius:number,deadzone=STICK_DEADZONE):StickVector{
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return{x:0,y:0,magnitude:0};
 const length=Math.hypot(dx,dy),distance=Math.min(length/radius,1);
 if(distance<=deadzone||length===0)return{x:0,y:0,magnitude:0};
 const strength=(distance-deadzone)/(1-deadzone);
 return{x:dx/length*strength,y:dy/length*strength,magnitude:strength};
}
export function stickKnob(dx:number,dy:number,radius:number):{x:number;y:number}{
 if(radius<=0)return{x:0,y:0};
 const distance=Math.hypot(dx,dy);
 const scale=distance>radius?radius/distance:1;
 return{x:dx*scale,y:dy*scale};
}

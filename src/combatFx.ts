/** Frame-rate independent cosmetic combat effects. Damage stays in combat logic. */
import type {WeaponId} from './equipmentArmory';
import type {View} from './rogueliteVisuals';

export type CombatFx={
 kind:'bullet'|'swing';model:WeaponId;x:number;y:number;dx:number;dy:number;
 age:number;duration:number;distance:number;angleOffset:number;
};
export type ShotProfile={speed:number;distance:number;duration:number;count:number;spread:number;width:number;color:string;trail:number;flash:number};
const shots:Record<Exclude<WeaponId,'knife'|'axe'|'machete'|'bat'|'crowbar'>,ShotProfile>={
 revolver:{speed:38,distance:8,duration:.30,count:1,spread:0,width:.11,color:'#ffd9aa',trail:.64,flash:.33},
 machinePistol:{speed:23,distance:5,duration:.26,count:1,spread:.04,width:.06,color:'#ffd891',trail:.3,flash:.15},
 compactSmg:{speed:24,distance:5.2,duration:.27,count:1,spread:.037,width:.057,color:'#ffda91',trail:.30,flash:.15},
 suppressedSmg:{speed:26,distance:6.2,duration:.27,count:1,spread:.019,width:.057,color:'#d8ebbd',trail:.28,flash:.08},
 battleRifle:{speed:39,distance:9,duration:.27,count:1,spread:.012,width:.095,color:'#ffe0a0',trail:.66,flash:.26},
 burstRifle:{speed:35,distance:8.5,duration:.29,count:1,spread:.018,width:.075,color:'#ffefbe',trail:.52,flash:.21},
 doubleBarrel:{speed:23,distance:4.3,duration:.26,count:9,spread:.24,width:.05,color:'#ffba7b',trail:.22,flash:.34},
 tacticalShotgun:{speed:24,distance:4.8,duration:.26,count:7,spread:.18,width:.05,color:'#ffcc82',trail:.26,flash:.26},
 heavyMarksman:{speed:50,distance:12,duration:.3,count:1,spread:.006,width:.1,color:'#c4efff',trail:.95,flash:.32},
 pistol:{speed:22,distance:6,duration:.30,count:1,spread:0,width:.075,color:'#ffe0a1',trail:.38,flash:.20},
 smg:{speed:25,distance:5.8,duration:.27,count:1,spread:.035,width:.055,color:'#ffd784',trail:.30,flash:.15},
 carbine:{speed:31,distance:7,duration:.27,count:1,spread:.012,width:.075,color:'#ffe9bd',trail:.43,flash:.20},
 assault:{speed:34,distance:8,duration:.28,count:1,spread:.022,width:.075,color:'#fff0b9',trail:.55,flash:.23},
 shotgun:{speed:21,distance:4,duration:.25,count:7,spread:.20,width:.047,color:'#f9bf7e',trail:.22,flash:.30},
 autoShotgun:{speed:22,distance:4.4,duration:.26,count:6,spread:.17,width:.046,color:'#ffca88',trail:.24,flash:.23},
 lmg:{speed:31,distance:8,duration:.30,count:1,spread:.042,width:.095,color:'#ffcf6a',trail:.65,flash:.29},
 marksman:{speed:43,distance:11,duration:.31,count:1,spread:.005,width:.08,color:'#d5f4ff',trail:.82,flash:.24},
 sniper:{speed:57,distance:13,duration:.28,count:1,spread:0,width:.105,color:'#b6ecff',trail:1.2,flash:.38}
};
export function shotProfile(model:WeaponId):ShotProfile|null{
 return ['knife','axe','machete','bat','crowbar'].includes(model)?null:shots[model as keyof typeof shots];
}
export function makeAttackFx(model:WeaponId,x:number,y:number,dx:number,dy:number,range:number,hitDistances?:readonly number[]):CombatFx[]{
 const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 if(['knife','axe','machete','bat','crowbar'].includes(model))
  return [{kind:'swing',model,x,y,dx:ux,dy:uy,age:0,duration:model==='axe'||model==='crowbar'?.37:.23,distance:range,angleOffset:0}];
 const profile=shots[model],maximum=Math.max(0,range);
 return Array.from({length:profile.count},(_,i)=>{
  const offset=profile.count===1?0:(i/(profile.count-1)*2-1)*profile.spread;
  const theta=Math.atan2(uy,ux)+offset;
  const distance=Math.max(0,Math.min(maximum,hitDistances?.[i]??maximum));
  return {kind:'bullet' as const,model,x,y,dx:Math.cos(theta),dy:Math.sin(theta),
   age:0,duration:distance/profile.speed+.06,distance,angleOffset:offset};
 });
}
export function ageCombatFx(effects:CombatFx[],dt:number):CombatFx[]{
 for(const effect of effects)effect.age+=dt;
 return effects.filter(effect=>effect.age<effect.duration);
}
export function drawCombatFx(ctx:CanvasRenderingContext2D,v:View,effects:readonly CombatFx[]):void{
 for(const fx of effects){
  const progress=Math.min(1,fx.age/fx.duration),px=v.ox+fx.x*v.tile,py=v.oy+fx.y*v.tile;
  ctx.save();
  ctx.translate(px,py);ctx.rotate(Math.atan2(fx.dy,fx.dx));
  if(fx.kind==='swing'){
   const axe=fx.model==='axe'||fx.model==='crowbar'||fx.model==='bat',radius=v.tile*Math.max(.55,fx.distance-.18);
   const sweep=axe?2.15:1.55,origin=axe?-1.05:-.78,head=origin+sweep*progress;
   ctx.globalAlpha=Math.min(1,(1-progress)*1.5);
   ctx.lineCap='round';
   ctx.strokeStyle=axe?'#f3b878':'#d7f4ec';
   ctx.lineWidth=Math.max(3,v.tile*(axe?.14:.075));
   ctx.shadowColor=axe?'#ffae68':'#b4fff5';ctx.shadowBlur=v.tile*.27;
   ctx.beginPath();ctx.arc(0,0,radius,Math.min(origin,head),Math.max(origin,head));ctx.stroke();
   ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.83)';ctx.lineWidth=Math.max(1,v.tile*.032);
   ctx.beginPath();ctx.arc(0,0,radius,head-.16,head);ctx.stroke();
  }else{
   const profile=shotProfile(fx.model)!;
   const traveled=Math.min(fx.distance,fx.age*profile.speed),x=traveled*v.tile;
   const length=Math.min(Math.max(0,traveled-.22),profile.trail)*v.tile;
   ctx.globalAlpha=Math.min(1,(fx.duration-fx.age)/.075);
   ctx.shadowColor=profile.color;ctx.shadowBlur=v.tile*.26;
   ctx.strokeStyle=profile.color;ctx.lineWidth=Math.max(1.3,profile.width*v.tile);
   ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-length,0);ctx.lineTo(x,0);ctx.stroke();
   ctx.shadowBlur=0;ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.arc(x,0,Math.max(1,profile.width*v.tile*.45),0,Math.PI*2);ctx.fill();
   if(fx.age<.075&&fx.angleOffset===0){
    ctx.globalAlpha=1-fx.age/.075;ctx.fillStyle='#ffe2a2';ctx.beginPath();
    ctx.arc(v.tile*.43,0,v.tile*profile.flash*(1-fx.age/.075),0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();
 }
}

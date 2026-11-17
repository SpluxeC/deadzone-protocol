/** Weapon silhouettes rendered over the character, independent of its body sprite.
 * Each model maps to a readable family and an individual size/profile.
 */
import type {WeaponId} from './equipmentArmory.ts';

export type WeaponVisualFamily='sidearm'|'smg'|'rifle'|'shotgun'|'lmg'|'precision'|'knife'|'heavyMelee';
export const weaponVisualFamily:Record<WeaponId,WeaponVisualFamily>={
 pistol:'sidearm',revolver:'sidearm',machinePistol:'sidearm',
 smg:'smg',compactSmg:'smg',suppressedSmg:'smg',
 carbine:'rifle',assault:'rifle',battleRifle:'rifle',burstRifle:'rifle',
 shotgun:'shotgun',autoShotgun:'shotgun',doubleBarrel:'shotgun',tacticalShotgun:'shotgun',
 lmg:'lmg',squadAutomatic:'lmg',heavyMachineGun:'lmg',marksman:'precision',heavyMarksman:'precision',sniper:'precision',
 knife:'knife',machete:'knife',axe:'heavyMelee',bat:'heavyMelee',crowbar:'heavyMelee'
};
export const isMeleeWeapon=(model:WeaponId):boolean=>weaponVisualFamily[model]==='knife'||weaponVisualFamily[model]==='heavyMelee';
/** Coordinates in an unrotated, character-centered sprite, normalized to sprite scale. */
export const heldWeaponMuzzle=(model:WeaponId,scale=1):{x:number;y:number}=>{
 const family=weaponVisualFamily[model],length=family==='sidearm'?.28:family==='smg'?.41:family==='shotgun'?.56:family==='precision'?.64:family==='lmg'?.60:family==='knife'?.42:family==='heavyMelee'?.58:.54;
 return {x:.16*scale,y:-length*scale};
};
/** Weapon geometry is cosmetic; heldWeaponMuzzle remains the single source
 * for ballistic aim and muzzle effects. All sizes track the character scale.
 */
export function drawHeldWeapon(ctx:CanvasRenderingContext2D,model:WeaponId,sz:number,animation?:{reload?:number;recoil?:number;time?:number}):void{
 const family=weaponVisualFamily[model],m=heldWeaponMuzzle(model,sz),x=m.x;
 const shotgun=family==='shotgun',smg=family==='smg',pistol=family==='sidearm',precision=family==='precision';
 const machine=family==='lmg',isKnife=family==='knife',melee=family==='heavyMelee';
 const reload=Math.max(0,Math.min(1,animation?.reload??0)),kick=Math.max(0,animation?.recoil??0);
 const pulse=reload>0?Math.sin(reload*Math.PI):0;
 const railTop=m.y,bodyFront=pistol?-.17:smg?-.24:machine?-.31:-.34;
 const bodyRear=pistol?.08:smg?.08:.15;
 const dark='#151d20',edge='#0c1518',receiver=shotgun?'#655c4a':'#455859',silver='#95a8a3';
 const rect=(xx:number,yy:number,w:number,h:number,fill:string,r=0)=>{
  ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(xx,yy,w,h,r);ctx.fill();
 };
 const line=(a:number,b:number,c:number,d:number,color:string,width:number)=>{
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();
 };
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.translate(0,kick*sz*.045);
 if(isKnife||melee){
  const handleEnd=.10,handleStart=-.22;
  rect(x-sz*.055,sz*handleStart,sz*.11,sz*(handleEnd-handleStart),'#43362d',sz*.018);
  for(let i=0;i<4;i++)line(x-sz*.05,sz*(-.14+i*.055),x+sz*.05,sz*(-.14+i*.055),'#89745c',sz*.012);
  if(model==='bat'){
   rect(x-sz*.085,m.y,sz*.17,sz*.36,'#94785d',sz*.06);
   line(x-sz*.032,m.y+sz*.03,x-sz*.032,m.y+sz*.29,'#c6ab82',sz*.02);
  }else if(model==='crowbar'){
   line(x,sz*handleStart,x,m.y,'#657876',sz*.10);
   line(x,m.y,x+sz*.14,m.y+sz*.08,'#9ca9a3',sz*.065);
  }else if(model==='axe'){
   line(x,sz*handleStart,x,m.y,'#897257',sz*.065);
   ctx.fillStyle='#81948f';ctx.beginPath();ctx.moveTo(x-sz*.24,m.y+sz*.01);ctx.lineTo(x-sz*.08,m.y-sz*.13);
   ctx.lineTo(x+sz*.12,m.y-sz*.11);ctx.lineTo(x+sz*.12,m.y+sz*.10);ctx.lineTo(x-sz*.08,m.y+sz*.09);ctx.closePath();ctx.fill();
   line(x-sz*.22,m.y+sz*.016,x-sz*.09,m.y-sz*.105,'#d9e1d8',sz*.018);
  }else{
   ctx.fillStyle='#a8b6b0';ctx.beginPath();ctx.moveTo(x-sz*.075,sz*handleStart);ctx.lineTo(x-sz*(model==='machete'?.12:.035),m.y+.035*sz);
   ctx.lineTo(x+sz*.02,m.y);ctx.lineTo(x+sz*.085,sz*handleStart);ctx.closePath();ctx.fill();
   line(x-sz*.06,m.y+sz*.04,x-sz*.025,sz*handleStart,'#e1e4d9',sz*.016);
  }
  ctx.restore();return;
 }
 // Receiver and stock use steel depth/shadow instead of thin abstract lines.
 if(!pistol&&!smg){
  // Compact shoulder stock: never draw past the back of the character.
  rect(x-sz*.066,sz*.035,sz*.13,sz*.115,'#262f30',sz*.025);
  rect(x-sz*.078,sz*.14,sz*.16,sz*.039,'#171e20',sz*.013);
  line(x-sz*.065,sz*.05,x-sz*.065,sz*.135,'#6f7d78',sz*.012);
 }
 // Grip and trigger guard.
 rect(x-sz*.055,sz*.005,sz*.12,sz*.16,'#303a39',sz*.022);
 line(x+sz*.04,sz*.025,x+sz*.085,sz*.11,'#8a9790',sz*.017);
 rect(x-sz*.076,sz*bodyFront,sz*.165,sz*(bodyRear-bodyFront),dark,sz*.035);
 rect(x-sz*.053,sz*(bodyFront+.024),sz*.115,sz*(bodyRear-bodyFront-.045),receiver,sz*.025);
 // Keep the light receiver seam within the metal housing only. A full-length
 // silver stroke along the back looked like a separate rod behind the firearm.
 line(x-sz*.046,sz*(bodyFront+.045),x-sz*.046,sz*(bodyFront+.16),silver,sz*.012);
 // Distinct magazine families.
 if(model==='revolver'){
  ctx.fillStyle='#687975';ctx.beginPath();ctx.arc(x+sz*.035,sz*-.105,sz*.077,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#1b2628';ctx.lineWidth=sz*.016;ctx.stroke();
  rect(x+sz*.005,sz*-.13,sz*.045,sz*.05,'#253032',sz*.006);
 }else{
  const drum=model==='heavyMachineGun'||model==='lmg'||model==='squadAutomatic';
  if(drum){
   ctx.fillStyle='#465352';ctx.beginPath();ctx.ellipse(x+sz*.13,sz*.02,sz*.112,sz*.12,.12,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#1a2527';ctx.lineWidth=sz*.026;ctx.stroke();
   ctx.beginPath();ctx.arc(x+sz*.13,sz*.02,sz*.055,0,Math.PI*2);ctx.stroke();
  }else if(reload>0){
   const drop=pulse*sz*.30;
   rect(x+sz*.06,sz*-.015+drop,sz*.088,sz*.19,'#66736d',sz*.013);
   line(x+sz*.065,sz*.004+drop,x+sz*.135,sz*.004+drop,'#b1b6a8',sz*.01);
  }else{
   ctx.save();ctx.translate(x+sz*.055,sz*-.01);ctx.rotate(-.18);
   rect(0,0,sz*(pistol?.070:.093),sz*(pistol?.12:.20),'#4b5d5a',sz*.013);
   rect(sz*.011,sz*.024,sz*.015,sz*.11,'#84928d',sz*.004);ctx.restore();
  }
 }
 // Barrel, vented handguard, top rail and optic.
 const barrelEnd=railTop+sz*(model==='suppressedSmg'?.04:.06);
 const handEnd=shotgun?-.41:precision?-.45:machine?-.40:smg?-.35:pistol?-.20:-.39;
 rect(x-sz*.067,sz*handEnd,sz*.134,sz*(bodyFront-handEnd+.07),shotgun?'#79674d':'#3f5555',sz*.022);
 for(let i=0;i<3;i++){
  const y=handEnd+.045+i*.06;
  if(y<bodyFront+.02)line(x-sz*.045,sz*y,x+sz*.041,sz*y,'#202c2e',sz*.018);
 }
 // Both railTop and handguardEndPx are PIXELS; never scale railTop twice.
 // The previous formula made the barrel rail hundreds/thousands of pixels long.
 const handguardEndPx=sz*handEnd;
 rect(x-sz*.045,railTop,sz*.09,Math.max(sz*.02,handguardEndPx-railTop+sz*.01),'#202c2f',sz*.02);
 line(x-sz*.017,railTop+sz*.016,x-sz*.017,sz*(handEnd-.025),'#a1ada8',sz*.017);
 if(model==='suppressedSmg'){
  rect(x-sz*.073,railTop,sz*.146,sz*.21,'#435454',sz*.027);
  for(let i=0;i<3;i++)line(x-sz*.04,railTop+sz*(.045+i*.055),x+sz*.042,railTop+sz*(.045+i*.055),'#788b85',sz*.009);
 }
 if(shotgun){
  line(x+sz*.07,sz*handEnd,x+sz*.07,railTop+sz*.07,'#856e50',sz*.035);
  if(model==='doubleBarrel')line(x-sz*.062,sz*handEnd,x-sz*.062,railTop+sz*.045,'#788783',sz*.036);
 }
 if(precision){
  rect(x-sz*.13,sz*-.30,sz*.076,sz*.22,'#263c40',sz*.02);
  rect(x-sz*.145,sz*-.29,sz*.105,sz*.04,'#a0b7b2',sz*.012);
  rect(x-sz*.14,sz*-.11,sz*.085,sz*.032,'#8a9b95',sz*.011);
 }
 if(!precision&&!pistol&&!shotgun){
  rect(x-sz*.025,sz*(bodyFront-.037),sz*.05,sz*.026,'#111c1e',sz*.006);
  line(x-sz*.027,sz*(bodyFront-.05),x+sz*.027,sz*(bodyFront-.05),'#849591',sz*.012);
 }
 if(machine){
  rect(x-sz*.17,sz*-.27,sz*.10,sz*.23,'#596965',sz*.017);
  for(let i=0;i<4;i++)line(x-sz*.164,sz*(-.25+i*.045),x-sz*.08,sz*(-.25+i*.045),'#8f9d94',sz*.011);
 }
 // Steel receiver pins and service wear.
 ctx.fillStyle='#b5c1b2';
 for(const y of [bodyFront+.075,bodyRear-.052]){
  ctx.beginPath();ctx.arc(x+sz*.042,y*sz,sz*.010,0,Math.PI*2);ctx.fill();
 }
 line(x-sz*.052,sz*(bodyFront+.03),x+sz*.018,sz*(bodyFront+.03),'#c2c7b6',sz*.011);
 if(reload>0){
  // Moving charging handle during the final part of the reload.
  const slide=(reload>.65?(1-reload)/.35:0)*sz*.058;
  rect(x+sz*.063,sz*-.13+slide,sz*.060,sz*.039,'#a0afa4',sz*.01);
 }
 ctx.restore();
}

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
 lmg:'lmg',marksman:'precision',heavyMarksman:'precision',sniper:'precision',
 knife:'knife',machete:'knife',axe:'heavyMelee',bat:'heavyMelee',crowbar:'heavyMelee'
};
export const isMeleeWeapon=(model:WeaponId):boolean=>weaponVisualFamily[model]==='knife'||weaponVisualFamily[model]==='heavyMelee';
/** Coordinates in an unrotated, character-centered sprite, normalized to sprite scale. */
export const heldWeaponMuzzle=(model:WeaponId,scale=1):{x:number;y:number}=>{
 const family=weaponVisualFamily[model],length=family==='sidearm'?.28:family==='smg'?.41:family==='shotgun'?.56:family==='precision'?.64:family==='lmg'?.60:family==='knife'?.42:family==='heavyMelee'?.58:.54;
 return {x:.16*scale,y:-length*scale};
};
export function drawHeldWeapon(ctx:CanvasRenderingContext2D,model:WeaponId,sz:number):void{
 const family=weaponVisualFamily[model],muzzle=heldWeaponMuzzle(model,sz),x=muzzle.x;
 const isHeavy=family==='heavyMelee',isKnife=family==='knife';
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(isKnife||isHeavy){
  const blade=model==='knife'||model==='machete'||model==='axe'||model==='crowbar';
  ctx.strokeStyle='#765b41';ctx.lineWidth=sz*(model==='bat'?.135:.09);
  ctx.beginPath();ctx.moveTo(x,sz*.02);ctx.lineTo(x,-sz*.29);ctx.stroke();
  ctx.strokeStyle=blade?'#b3c9bd':'#a37e55';
  ctx.lineWidth=sz*(model==='machete'?.14:model==='axe'?.12:.08);
  ctx.beginPath();ctx.moveTo(x,-sz*.25);ctx.lineTo(muzzle.x,muzzle.y);ctx.stroke();
  if(model==='axe'){ctx.fillStyle='#a7c3c1';ctx.fillRect(x-sz*.17,-sz*.52,sz*.26,sz*.12)}
  if(model==='crowbar'){ctx.beginPath();ctx.arc(x+sz*.035,muzzle.y+sz*.035,sz*.065,Math.PI,Math.PI*1.9);ctx.stroke()}
  ctx.restore();return;
 }
 const isShort=family==='sidearm'||family==='smg';
 const receiverEnd=-sz*(isShort?.20:.28),receiverStart=-sz*(isShort?.07:.13);
 const width=sz*(family==='lmg'?.13:family==='shotgun'?.10:.095);
 const outer='#14262a',metal=family==='shotgun'?'#907b5f':'#617b82',shine='#b4cbc4';
 // Buttstock, pistol grip and magazine form legible differences at small zoom.
 if(!isShort){
  ctx.fillStyle='#35494a';ctx.strokeStyle=outer;ctx.lineWidth=sz*.035;
  ctx.beginPath();ctx.moveTo(x-width*.7,sz*.11);ctx.lineTo(x+width*.65,sz*.11);
  ctx.lineTo(x+width*.9,receiverStart);ctx.lineTo(x-width*.9,receiverStart);ctx.closePath();ctx.fill();ctx.stroke();
 }
 ctx.strokeStyle=outer;ctx.lineWidth=sz*.16;ctx.beginPath();ctx.moveTo(x,receiverStart);ctx.lineTo(x,receiverEnd);ctx.stroke();
 ctx.strokeStyle=metal;ctx.lineWidth=sz*.10;ctx.beginPath();ctx.moveTo(x,receiverStart);ctx.lineTo(x,receiverEnd);ctx.stroke();
 ctx.strokeStyle='#d1dfd6';ctx.lineWidth=sz*.025;ctx.beginPath();ctx.moveTo(x-sz*.02,receiverStart);ctx.lineTo(x-sz*.02,receiverEnd);ctx.stroke();
 // Muzzle: actual barrel used by the player aim guide.
 ctx.strokeStyle=outer;ctx.lineWidth=sz*(family==='shotgun'?.095:family==='lmg'?.09:.065);
 ctx.beginPath();ctx.moveTo(x,receiverEnd);ctx.lineTo(muzzle.x,muzzle.y);ctx.stroke();
 ctx.strokeStyle=shine;ctx.lineWidth=sz*.027;ctx.beginPath();ctx.moveTo(x-sz*.02,receiverEnd);ctx.lineTo(x-sz*.02,muzzle.y+sz*.045);ctx.stroke();
 if(family==='shotgun'){
  ctx.strokeStyle='#ab8b61';ctx.lineWidth=sz*.042;ctx.beginPath();ctx.moveTo(x+sz*.065,receiverEnd);ctx.lineTo(x+sz*.065,muzzle.y+sz*.06);ctx.stroke();
  if(model==='doubleBarrel'){ctx.strokeStyle='#7d8b83';ctx.lineWidth=sz*.04;ctx.beginPath();ctx.moveTo(x-sz*.065,receiverEnd);ctx.lineTo(x-sz*.065,muzzle.y);ctx.stroke()}
 }
 if(family==='precision'){
  ctx.strokeStyle='#1a3d42';ctx.lineWidth=sz*.095;ctx.beginPath();ctx.moveTo(x-sz*.115,-sz*.15);ctx.lineTo(x-sz*.115,-sz*.38);ctx.stroke();
  ctx.strokeStyle='#a7c5c3';ctx.lineWidth=sz*.032;ctx.beginPath();ctx.moveTo(x-sz*.115,-sz*.18);ctx.lineTo(x-sz*.115,-sz*.38);ctx.stroke();
 }
 if(family==='lmg'){
  ctx.fillStyle='#758078';ctx.strokeStyle=outer;ctx.lineWidth=sz*.02;
  ctx.fillRect(x-sz*.17,receiverStart-sz*.13,sz*.12,sz*.20);ctx.strokeRect(x-sz*.17,receiverStart-sz*.13,sz*.12,sz*.20);
 }
 if(family==='smg'||family==='rifle'){
  ctx.strokeStyle='#d6bb88';ctx.lineWidth=sz*.055;ctx.beginPath();ctx.moveTo(x+sz*.055,receiverStart);ctx.lineTo(x+sz*.075,receiverStart+sz*.14);ctx.stroke();
 }
 if(model==='revolver'){ctx.fillStyle='#a7b9ae';ctx.beginPath();ctx.arc(x,receiverEnd,sz*.065,0,Math.PI*2);ctx.fill()}
 if(model==='suppressedSmg'){ctx.strokeStyle='#718d88';ctx.lineWidth=sz*.085;ctx.beginPath();ctx.moveTo(x,muzzle.y+sz*.16);ctx.lineTo(x,muzzle.y);ctx.stroke()}
 if(model==='machinePistol'||model==='compactSmg')ctx.fillRect(x+sz*.06,receiverStart,sz*.055,sz*.12);
 ctx.restore();
}

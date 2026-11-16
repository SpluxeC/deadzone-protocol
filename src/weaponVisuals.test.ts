import test from 'node:test';
import assert from 'node:assert/strict';
import {drawHeldWeapon,heldWeaponMuzzle,weaponVisualFamily} from './weaponVisuals.ts';
import {weaponDefs} from './equipmentArmory.ts';

test('every weapon renders detailed geometry through idle, recoil and reload stages',()=>{
 const calls:Record<string,number>={};
 const ctx=new Proxy({} as CanvasRenderingContext2D,{
  get(_target,key){if(typeof key==='string')return (...args:unknown[])=>{
   calls[key]=(calls[key]??0)+1;
   for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),key+' received non-finite coordinate');
  };return undefined},
  set(){return true}
 });
 for(const id of Object.keys(weaponDefs) as (keyof typeof weaponDefs)[]){
  assert.ok(weaponVisualFamily[id]);
  for(const progress of [0,.2,.5,.8,1]){
   assert.doesNotThrow(()=>drawHeldWeapon(ctx,id,32,{reload:progress,recoil:.1,time:1}));
  }
  const muzzle=heldWeaponMuzzle(id,32);
  assert.ok(Number.isFinite(muzzle.x)&&Number.isFinite(muzzle.y));
 }
 assert.ok((calls.roundRect??0)>150,'weapons should use filled silhouettes rather than simple twig lines');
 assert.ok((calls.lineTo??0)>150,'weapons should have rail, metal and magazine detail');
});

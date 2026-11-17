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

test('firearm barrel and rail geometry stays inside local character bounds at every zoom',()=>{
 for(const size of [20,32,48,88,130]){
  const rectangles:number[][]=[];
  const ctx=new Proxy({} as CanvasRenderingContext2D,{
   get(_target,key){
    if(key==='roundRect')return (...args:number[])=>{rectangles.push(args);};
    return ()=>{};
   },
   set(){return true}
  });
  for(const model of Object.keys(weaponDefs) as (keyof typeof weaponDefs)[]){
   drawHeldWeapon(ctx,model,size);
   const local=rectangles.splice(0);
   assert.ok(local.length>0,model+' should draw a weapon body');
   for(const [x,y,width,height] of local){
    assert.ok([x,y,width,height].every(Number.isFinite),model+' invalid weapon geometry');
    assert.ok(width>=0&&height>=0,model+' negative rectangle size');
    assert.ok(Math.abs(x)<=size&&Math.abs(y)<=size&&width<=size&&height<=size,
     model+' drew a weapon segment outside its body at zoom '+size+': '+JSON.stringify([x,y,width,height]));
   }
  }
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAttackFx,shotProfile,ageCombatFx} from './combatFx.ts';
import type {WeaponId} from './equipmentArmory.ts';

test('every firearm generates distinctive short-lived tracers',()=>{
 const models:WeaponId[]=['pistol','smg','carbine','assault','shotgun','autoShotgun','lmg','marksman','sniper'];
 for(const model of models){
  const p=shotProfile(model);
  assert.ok(p,model);
  const fx=makeAttackFx(model,2,3,1,0,20);
  assert.equal(fx.length,p.count);
  assert.ok(fx.every(f=>f.kind==='bullet'&&f.duration>0&&f.distance<=20));
  assert.equal(ageCombatFx(fx,5).length,0);
 }
 assert.ok(makeAttackFx('shotgun',0,0,0,1,4).length>makeAttackFx('pistol',0,0,0,1,4).length);
 assert.ok(shotProfile('sniper')!.trail>shotProfile('pistol')!.trail);
 assert.ok(shotProfile('lmg')!.flash>shotProfile('smg')!.flash);
});
test('knife and axe show different melee arcs without ammunition projectiles',()=>{
 for(const model of ['knife','axe'] as const){
  assert.equal(shotProfile(model),null);
  const fx=makeAttackFx(model,0,0,0,1,2);
  assert.equal(fx.length,1);
  assert.equal(fx[0].kind,'swing');
  assert.ok(fx[0].duration>0);
 }
 assert.ok(makeAttackFx('axe',0,0,1,0,1.6)[0].distance>makeAttackFx('knife',0,0,1,0,1.4)[0].distance);
});
test('gunfire creates a single muzzle flash per shot, but flash suppressors remove it',()=>{
 const normal=makeAttackFx('shotgun',2,3,1,0,6,[2,2,2,2,2,2,2]);
 assert.equal(normal.filter(f=>f.flash).length,1,'shotgun pellets share one muzzle flare');
 const suppressed=makeAttackFx('assault',2,3,1,0,7,[4],false);
 assert.equal(suppressed.length,1);
 assert.ok(suppressed.every(f=>f.flash===false),'flash hiders and suppressors prevent flare');
 const clear=makeAttackFx('assault',2,3,1,0,7,[4],true);
 assert.equal(clear.filter(f=>f.flash).length,1);
 assert.equal(ageCombatFx(clear,3).length,0);
});

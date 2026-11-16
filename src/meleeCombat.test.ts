import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeleeAttack,advanceMeleeAttack,meleePose,meleeTargetLimit,meleeRecovery,meleeDuration} from './meleeCombat.ts';
import {newWeapon} from './equipmentArmory.ts';
import {meleeHits} from './hitDetection.ts';
import type {DungeonLayout} from './dungeon.ts';
const room=():DungeonLayout=>({width:16,height:16,seed:17,tiles:Array(256).fill(0),entrance:{x:3,y:8},extraction:{x:14,y:8},loot:[],enemies:[]});
const zombies=[{x:5,y:8,alive:true},{x:5.2,y:8.4,alive:true},{x:5.3,y:7.6,alive:true},{x:5.4,y:8.65,alive:true},{x:5.5,y:7.4,alive:true},{x:5.65,y:8.15,alive:true}];
test('knife remains single-target at every upgrade tier, with faster attacks',()=>{
 let previous=Infinity;
 for(const tier of [1,2,3,4,5,6] as const){
  const knife=newWeapon('knife',tier,'knife-'+tier);
  assert.equal(meleeTargetLimit('knife',tier),1);
  assert.equal(meleeHits(room(),{x:4,y:8},{x:1,y:0},1.5,zombies,'knife',meleeTargetLimit('knife',tier)).length,1);
  assert.ok(meleeRecovery(knife)<previous);previous=meleeRecovery(knife);
  assert.ok(meleeDuration('knife',tier)<=meleeRecovery(knife));
 }
});
test('fire axe starts by cleaving two zombies and earns one more per upgrade',()=>{
 for(const tier of [1,2,3,4,5,6] as const){
  const limit=meleeTargetLimit('axe',tier);
  assert.equal(limit,Math.min(6,2+tier-1));
  const hits=meleeHits(room(),{x:4,y:8},{x:1,y:0},1.6,zombies,'axe',limit);
  assert.equal(hits.length,limit);
  assert.equal(new Set(hits.map(h=>h.target)).size,hits.length);
 }
});
test('damage event occurs once at stabbing or swing contact frame',()=>{
 for(const model of ['knife','axe'] as const){
  const weapon=newWeapon(model,2,model);
  const attack=createMeleeAttack({x:4,y:8},weapon,{x:1,y:0},3,1.5);
  let strikes=0;
  for(let i=0;i<100;i++){
   const state=advanceMeleeAttack(attack,.005);
   if(state.strike)strikes++;
   if(state.ended)break;
  }
  assert.equal(strikes,1);
  assert.equal(attack.hit,true);
 }
});
test('knife animation thrusts straight; axe swings broadly without phantom sweeps',()=>{
 const stab=[0,.20,.48,.8,1].map(p=>meleePose('knife',p));
 assert.ok(stab.every(p=>p.angleOffset===0));
 assert.ok(stab[2].thrust>stab[0].thrust);
 assert.equal(stab[4].thrust,0);
 const axe=[.17,.54,.76,1].map(p=>meleePose('axe',p).angleOffset);
 assert.ok(axe[0]<0&&axe[2]>0);
 assert.ok(Math.abs(axe[3])<1e-8);
});

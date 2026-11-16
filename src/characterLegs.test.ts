import test from 'node:test';
import assert from 'node:assert/strict';
import {gaitKind,legPose} from './characterLegs.ts';
test('every player, ally and zombie shares a supported volumetric leg rig',()=>{
 for(const name of ['player','medic','rifleman','heavy','scout','engineer'])assert.equal(gaitKind(name),'human');
 for(const name of ['shambler','runner','armored','bruiser','boss'])assert.equal(gaitKind(name),name);
});
test('all poses have thick trouser and boot shapes and finite joint positions',()=>{
 for(const name of ['human','shambler','runner','armored','bruiser','boss'] as const){
  for(const phase of [0,.6,1.7,3.2,5.1]){
   for(const side of [-1,1] as const){
    const leg=legPose(name,side,phase,2.5);
    assert.ok(leg.thighWidth>=.1&&leg.calfWidth>.07&&leg.bootWidth>.09);
    for(const key of ['hip','knee','ankle','toe'] as const){
     assert.ok(Number.isFinite(leg[key].x)&&Number.isFinite(leg[key].y));
    }
   }
  }
 }
});
test('idle legs hold a stable resting silhouette regardless of animation clock',()=>{
 for(const name of ['human','runner','boss'] as const){
  const a=legPose(name,-1,0,0),b=legPose(name,-1,8.2,0);
  assert.equal(a.ankle.x,b.ankle.x);assert.equal(a.ankle.y,b.ankle.y);
  assert.equal(a.toe.y,b.toe.y);
 }
});
test('running infected strides further than shamblers while heavy legs remain thicker',()=>{
 const runner=legPose('runner',-1,Math.PI/2,2.8);
 const shambler=legPose('shambler',-1,Math.PI/2,2.8);
 const heavy=legPose('boss',-1,Math.PI/2,2.8);
 assert.ok(Math.abs(runner.ankle.x-runner.hip.x)>Math.abs(shambler.ankle.x-shambler.hip.x));
 assert.ok(heavy.thighWidth>runner.thighWidth);
});

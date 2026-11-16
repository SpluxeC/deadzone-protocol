import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCharacterMotion,wrapAngle,weaponRelativeAngle,weaponRigShoulder,aimedHand,solveAimArm} from './characterMotion.ts';

test('turns take the shortest arc and cannot spin instantly through a direction reversal',()=>{
 const first=nextCharacterMotion(null,{x:0,y:0},1000,Math.PI-.08,3);
 const next=nextCharacterMotion(first,{x:-.04,y:.003},1016,-Math.PI+.08,3);
 assert.ok(Math.abs(wrapAngle(next.angle-first.angle))<=.04801);
 assert.ok(Math.abs(wrapAngle(next.angle-first.angle))>0);
});
test('idle zombies hold orientation rather than spinning to follow moving targets',()=>{
 const first=nextCharacterMotion(null,{x:2,y:2},1000,0);
 const next=nextCharacterMotion(first,{x:2,y:2},1016,Math.PI);
 assert.equal(next.angle,0);
 assert.equal(next.speed,0);
});
test('player keeps aiming direction while moving and footfall phase advances with travel',()=>{
 const first=nextCharacterMotion(null,{x:0,y:0},1000,0);
 const next=nextCharacterMotion(first,{x:0,y:.05},1016,Math.PI/2,5,true);
 assert.ok(next.angle>0&&next.angle<=.081);
 assert.ok(next.phase>0);
 assert.ok(next.speed>0);
});
test('stationary characters stop stepping without abrupt pose resets',()=>{
 const a=nextCharacterMotion(null,{x:0,y:0},1000,0);
 const b=nextCharacterMotion(a,{x:.07,y:0},1016,0);
 const c=nextCharacterMotion(b,{x:.07,y:0},1032,Math.PI);
 assert.equal(b.phase,c.phase);
 assert.ok(c.speed<b.speed);
});

test('body facing is controlled by travel, not right-stick aim while idle',()=>{
 const a=nextCharacterMotion(null,{x:0,y:0},1000,0);
 const aimed=nextCharacterMotion(a,{x:0,y:0},1016,Math.PI/2,12);
 assert.equal(aimed.angle,0);
 assert.ok(Math.abs(weaponRelativeAngle(aimed.angle,Math.PI/2)-Math.PI/2)<1e-8);
 const moving=nextCharacterMotion(aimed,{x:0,y:.1},1032,0,12);
 assert.ok(moving.angle>0);
 assert.ok(Math.abs(weaponRelativeAngle(moving.angle,Math.PI/2))<Math.PI/2);
});
test('weapon-side shoulder remains fixed to the body when weapon aim rotates',()=>{
 for(const aim of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const local=weaponRigShoulder(.22,-.13,aim);
  const x=local.x*Math.cos(aim)-local.y*Math.sin(aim);
  const y=local.x*Math.sin(aim)+local.y*Math.cos(aim);
  assert.ok(Math.abs(x-.22)<1e-8);
  assert.ok(Math.abs(y+.13)<1e-8);
 }
});

test('upright-body arm shoulders remain fixed at all aim directions',()=>{
 for(const heading of Array.from({length:24},(_,i)=>i*Math.PI/12-Math.PI)){
  const left=solveAimArm(-1,aimedHand(.10,-.285,heading));
  const right=solveAimArm(1,aimedHand(.16,-.115,heading));
  assert.deepEqual(left.shoulder,{x:-.245,y:-.18});
  assert.deepEqual(right.shoulder,{x:.245,y:-.18});
  for(const pose of [left,right]){
   for(const joint of [pose.shoulder,pose.elbow,pose.hand]){
    assert.ok(Number.isFinite(joint.x)&&Number.isFinite(joint.y));
   }
   const upper=Math.hypot(pose.elbow.x-pose.shoulder.x,pose.elbow.y-pose.shoulder.y);
   const lower=Math.hypot(pose.elbow.x-pose.hand.x,pose.elbow.y-pose.hand.y);
   assert.ok(Math.abs(upper-.27)<1e-8);
   assert.ok(Math.abs(lower-.28)<1e-8);
  }
  assert.ok(left.elbow.x<left.shoulder.x+.26);
  assert.ok(right.elbow.x>right.shoulder.x-.26);
 }
});

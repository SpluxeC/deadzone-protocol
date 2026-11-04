import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeStick,stickKnob,STICK_DEADZONE} from './mobileControls.ts';
test('stationary touch and deadzone do not move or fire',()=>{
 assert.deepEqual(normalizeStick(0,0,70),{x:0,y:0,magnitude:0});
 assert.deepEqual(normalizeStick(4,4,70),{x:0,y:0,magnitude:0});
 assert.equal(normalizeStick(70*STICK_DEADZONE,0,70).magnitude,0);
});
test('analog movement is proportional, normalized, and capped at full travel',()=>{
 const half=normalizeStick(35,0,70),full=normalizeStick(70,0,70),beyond=normalizeStick(200,0,70);
 assert.ok(half.magnitude>.3&&half.magnitude<.5);
 assert.equal(full.x,1);assert.equal(full.y,0);assert.equal(full.magnitude,1);
 assert.deepEqual(beyond,full);
 const diagonal=normalizeStick(50,50,70);
 assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-8);
 assert.ok(diagonal.x>0&&diagonal.y>0);
});
test('right-stick aim retains angle in any direction and safely handles bad input',()=>{
 const aim=normalizeStick(-42,25,70);
 assert.ok(aim.x<0&&aim.y>0);
 assert.ok(Math.abs(aim.y/aim.x-(25/-42))<1e-8);
 assert.deepEqual(normalizeStick(NaN,5,70),{x:0,y:0,magnitude:0});
 assert.deepEqual(normalizeStick(4,4,0),{x:0,y:0,magnitude:0});
});
test('visual joystick knob remains within its circular movement bound',()=>{
 const p=stickKnob(200,140,50);
 assert.ok(Math.abs(Math.hypot(p.x,p.y)-50)<1e-8);
 assert.deepEqual(stickKnob(10,-15,50),{x:10,y:-15});
});

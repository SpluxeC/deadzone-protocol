import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCharacterMotion,wrapAngle} from './characterMotion.ts';

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

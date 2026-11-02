import test from 'node:test';
import assert from 'node:assert/strict';
import {equipPlate,absorbDamage} from './equipment.ts';
test('armor plate inventory equips and caps at 100',()=>{
 assert.deepEqual(equipPlate({armor:70,plates:2}),{armor:100,plates:1});
 assert.deepEqual(equipPlate({armor:0,plates:1}),{armor:50,plates:0});
 assert.equal(equipPlate({armor:100,plates:2}),null);
 assert.equal(equipPlate({armor:30,plates:0}),null);
});
test('armor absorbs up to seventy percent of incoming attack and depletes',()=>{
 assert.deepEqual(absorbDamage(50,11),{armor:42,healthDamage:3});
 assert.deepEqual(absorbDamage(2,11),{armor:0,healthDamage:9});
 assert.deepEqual(absorbDamage(0,11),{armor:0,healthDamage:11});
});

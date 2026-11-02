import test from 'node:test';
import assert from 'node:assert/strict';
import {floorSeed,nextFloor,resolveCasualty} from './expedition.ts';
test('floor seeds remain stable but vary across three floors',()=>{const seeds=[1,2,3].map(n=>floorSeed(123456,n));assert.equal(seeds[0],123456);assert.equal(new Set(seeds).size,3);assert.deepEqual(seeds,[1,2,3].map(n=>floorSeed(123456,n)))});
test('floor transitions cap at third floor',()=>{assert.equal(nextFloor(1),2);assert.equal(nextFloor(2),3);assert.equal(nextFloor(3),3)});
test('recruits die permanently at zero HP outside FOB',()=>{assert.deepEqual(resolveCasualty(20,10),{hp:10,dead:false});assert.deepEqual(resolveCasualty(8,10),{hp:0,dead:true})});

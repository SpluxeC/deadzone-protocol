import test from 'node:test';import assert from 'node:assert/strict';
import {makeWave,waveDimensions,waveEnemyCount,canExit,clearPayout,permanentPayout} from './rogueliteRules.ts';
test('dungeon sizes expand and then cap',()=>{assert.deepEqual(waveDimensions(1),{width:32,height:24});assert.ok(waveDimensions(10).width>waveDimensions(1).width);assert.deepEqual(waveDimensions(100),{width:64,height:48})});
test('horde quotas remain finite and growing',()=>{for(const w of [1,2,5,10,20,40]){const p=makeWave(331,w);assert.equal(p.initial+p.reinforcements,p.total);assert.equal(p.boss,w%5===0);assert.ok(p.spawnPoints.length>0);assert.ok(p.map.tiles[p.map.entrance.y*p.map.width+p.map.entrance.x]===0)}assert.ok(waveEnemyCount(8)>waveEnemyCount(1));assert.equal(waveEnemyCount(100),110)});
test('exit only unlocks when all scheduled reinforcements die',()=>{assert.equal(canExit(20,14,14),false);assert.equal(canExit(20,20,19),false);assert.equal(canExit(20,20,20),true)});
test('waves and bosses award separate permanent and run payouts',()=>{assert.ok(clearPayout(5)>clearPayout(4));assert.equal(permanentPayout(5,1),40)});

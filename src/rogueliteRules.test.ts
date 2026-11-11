import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWave,waveDimensions,waveEnemyCount,canExit,killPayout,clearPayout,permanentPayout,extractionSpawnInterval,extractionActiveCap,MAX_ACTIVE_ZOMBIES,formatRunTime} from './rogueliteRules.ts';

test('new levels double each axis; old save dimensions are unchanged',()=>{
 assert.deepEqual(waveDimensions(1),{width:64,height:48});
 assert.deepEqual(waveDimensions(1,2),{width:32,height:24});
 assert.deepEqual(waveDimensions(10),{width:88,height:64});
 assert.deepEqual(waveDimensions(100),{width:128,height:96});
 assert.deepEqual(waveDimensions(100,1),{width:64,height:48});
 for(const wave of [1,2,5,10,20,100]){
  const current=waveDimensions(wave),old=waveDimensions(wave,2);
  assert.equal(current.width,old.width*2);
  assert.equal(current.height,old.height*2);
 }
});
test('new zombie wave quotas are exactly double and wave progression stays finite',()=>{
 for(const w of [1,2,5,10,20,40]){
  const p=makeWave(331,w);
  const old=makeWave(331,w,2);
  assert.equal(p.total,old.total*2);
  assert.equal(p.initial+p.reinforcements,p.total);
  assert.equal(p.boss,w%5===0);
  assert.ok(p.spawnPoints.length>0);
  assert.ok(p.map.tiles[p.map.entrance.y*p.map.width+p.map.entrance.x]===0);
  assert.equal(old.map.width,waveDimensions(w,2).width);
  assert.equal(old.map.height,waveDimensions(w,2).height);
 }
 assert.equal(waveEnemyCount(1),26);
 assert.equal(waveEnemyCount(1,2),13);
 assert.equal(waveEnemyCount(100),220);
 assert.equal(waveEnemyCount(100,2),110);
});
test('exit only unlocks when all scheduled reinforcements die',()=>{
 assert.equal(canExit(20,14,14),false);
 assert.equal(canExit(20,20,19),false);
 assert.equal(canExit(20,20,20),true);
});
test('waves and bosses award separate permanent and run payouts',()=>{
 assert.ok(clearPayout(5)>clearPayout(4));
 assert.equal(permanentPayout(5,1),40);
});

test('endless zombie pressure accelerates the longer the player remains on a wave',()=>{
 for(const wave of [1,5,15]){
  assert.ok(extractionSpawnInterval(0,wave)>extractionSpawnInterval(45,wave));
  assert.ok(extractionSpawnInterval(45,wave)>extractionSpawnInterval(100,wave));
  assert.ok(extractionSpawnInterval(500,wave)>=.24);
  assert.equal(extractionActiveCap(0,wave),65);
  assert.equal(extractionActiveCap(180,wave),65);
  assert.equal(extractionActiveCap(10000,wave),MAX_ACTIVE_ZOMBIES);
 }
 assert.ok(extractionSpawnInterval(0,15)<extractionSpawnInterval(0,1));
 assert.equal(formatRunTime(0),'0:00');
 assert.equal(formatRunTime(65.8),'1:05');
 assert.equal(formatRunTime(3610),'60:10');
});

test('standard zombies award six credits and bosses award one hundred at every wave',()=>{
 for(const wave of [1,2,5,10,25,50,100]){
  assert.equal(killPayout(wave,false),6);
  assert.equal(killPayout(wave,true),100);
 }
});

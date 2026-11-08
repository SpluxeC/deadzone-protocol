import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {makeWave} from './rogueliteRules.ts';
import {spawnHoles,openHoleIndices,sealHole,canSealHole,SEAL_COST,startBreachEvent,advanceBreachEvent,canExtract,REQUIRED_SEALS,BREACH_DURATION} from './spawnHoles.ts';

test('spawn holes occupy walkable, separated ground and never overlap major landmarks',()=>{
 for(const wave of [1,5,15]){
  for(let seed=1;seed<=75;seed++){
   const plan=makeWave(seed,wave),map=plan.map,holes=spawnHoles(plan);
   assert.ok(holes.length>=REQUIRED_SEALS,'every modern floor needs at least three sealable holes');
   for(const [i,hole] of holes.entries()){
    assert.equal(map.tiles[Math.round(hole.y)*map.width+Math.round(hole.x)],0);
    assert.ok(Math.hypot(hole.x-map.entrance.x,hole.y-map.entrance.y)>7);
    assert.ok(Math.hypot(hole.x-map.extraction.x,hole.y-map.extraction.y)>3);
    assert.ok(holes.slice(i+1).every(other=>Math.hypot(other.x-hole.x,other.y-hole.y)>=2.5));
   }
   assert.deepEqual(holes,spawnHoles(makeWave(seed,wave)),'saved floor recomputes identical holes');
  }
 }
});
test('seal transaction charges exactly 200 once and leaves unrelated credits alone',()=>{
 assert.equal(SEAL_COST,200);
 assert.equal(sealHole(199,[],0,3),null);
 assert.equal(sealHole(200,[],9,3),null);
 const closed=sealHole(450,[],1,3);
 assert.deepEqual(closed,{credits:250,sealed:[1]});
 assert.ok(closed);
 assert.equal(sealHole(closed.credits,closed.sealed,1,3),null,'repeat purchase cannot charge');
 assert.deepEqual(openHoleIndices([{x:0,y:0},{x:1,y:1},{x:2,y:2}],closed.sealed),[0,2]);
 assert.deepEqual(openHoleIndices([{x:0,y:0},{x:1,y:1},{x:2,y:2}],[0,1,2]),[]);
 assert.equal(canSealHole(500,[1],1,3),false);
});

test('25-second sealing charges once and only completes after defense timer',()=>{
 assert.equal(BREACH_DURATION,25);
 assert.equal(REQUIRED_SEALS,3);
 const started=startBreachEvent(520,[],2,8,null);
 assert.ok(started);
 assert.equal(started.credits,320);
 assert.equal(started.event.remaining,25);
 assert.equal(startBreachEvent(520,[],3,8,started.event),null,'cannot start a second event');
 assert.equal(startBreachEvent(199,[],1,8,null),null,'insufficient credits');
 let event=started.event,extra=0;
 for(let second=1;second<=24;second++){
  const step=advanceBreachEvent(event,1);
  assert.equal(step.completed,false,'premature seal at '+second);
  assert.ok(step.event);
  extra+=step.spawnCount;
  event=step.event!;
 }
 const final=advanceBreachEvent(event,1);
 assert.equal(final.completed,true);
 assert.equal(final.event,null);
 extra+=final.spawnCount;
 assert.equal(extra,5,'five additional spawn requests across the defense');
 assert.equal(advanceBreachEvent(started.event,10).spawnCount,2,'large frame resumes do not skip scheduled waves');
});
test('elevator requires three distinct completed holes with no active seal',()=>{
 assert.equal(canExtract([0,1],null),false);
 assert.equal(canExtract([0,0,1],null),false);
 assert.equal(canExtract([0,1,2],null),true);
 assert.equal(canExtract([0,1,2],{index:3,remaining:2,waveSpawned:4}),false);
});

test('legacy saved layouts also provide three reachable breach objectives',()=>{
 for(const version of [1,2] as const){
  for(let seed=1;seed<=30;seed++){
   const plan=makeWave(seed,1,version),holes=spawnHoles(plan);
   assert.ok(holes.length>=REQUIRED_SEALS,'legacy v'+version+' seed '+seed+' must support extraction');
   assert.deepEqual(holes,spawnHoles(makeWave(seed,1,version)));
  }
 }
});

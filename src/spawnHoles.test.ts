import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {makeWave} from './rogueliteRules.ts';
import {spawnHoles,openHoleIndices,sealHole,canSealHole,SEAL_COST} from './spawnHoles.ts';

test('spawn holes occupy walkable, separated ground and never overlap major landmarks',()=>{
 for(const wave of [1,5,15]){
  for(let seed=1;seed<=75;seed++){
   const plan=makeWave(seed,wave),map=plan.map,holes=spawnHoles(plan);
   assert.ok(holes.length>0,'every modern floor needs at least one spawn hole');
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

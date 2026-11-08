import test from 'node:test';
import assert from 'node:assert/strict';
import {senseZombie,tacticalTarget,hitReaction,friendlyFireLane} from './combatAi.ts';
const at={x:1,y:1},player={x:8,y:1};
test('zombie hears an event at its actual position rather than teleporting knowledge of the player',()=>{
 const heard=senseZombie({kind:'shambler',position:at,player,canSeePlayer:false,noise:{x:3,y:1,radius:5,ttl:1},lastKnown:null,memory:0,searchClock:0,spawnIndex:3},.1);
 assert.equal(heard.mode,'investigate');
 assert.deepEqual(heard.target,{x:3,y:1});
 const searching=senseZombie({kind:'shambler',position:at,player,canSeePlayer:false,lastKnown:heard.lastKnown,memory:heard.memory,searchClock:0,spawnIndex:3},.1);
 assert.equal(searching.mode,'search');
 assert.deepEqual(searching.target,{x:3,y:1});
});
test('zombies lose stale targets and stop searching',()=>{
 const idle=senseZombie({kind:'runner',position:{x:3,y:1},player,canSeePlayer:false,lastKnown:{x:3,y:1},memory:1,searchClock:2.3,spawnIndex:2},.2);
 assert.equal(idle.mode,'idle');assert.equal(idle.target,null);
 const unseen=senseZombie({kind:'shambler',position:at,player,canSeePlayer:false,lastKnown:null,memory:0,searchClock:0,spawnIndex:3},.1);
 assert.equal(unseen.mode,'idle');
});
test('runners flank while armored zombies pursue the centerline',()=>{
 const left=tacticalTarget('runner',at,player,0,'chase');
 const right=tacticalTarget('runner',at,player,1,'chase');
 assert.ok(left.y>player.y&&right.y<player.y);
 assert.deepEqual(tacticalTarget('armored',at,player,0,'chase'),player);
 assert.deepEqual(tacticalTarget('runner',at,player,0,'investigate'),player);
});
test('bosses resist stagger and melee has stronger impact',()=>{
 assert.ok(hitReaction('runner',1,true).stagger>hitReaction('runner',1,false).stagger);
 assert.ok(hitReaction('boss',1,false).stagger<hitReaction('shambler',1,false).stagger);
 assert.ok(hitReaction('armored',1,true).knockback<hitReaction('runner',1,true).knockback);
});
test('friendly fire lane detects intervening squadmates but not distant or behind allies',()=>{
 const shooter={x:0,y:0},target={x:5,y:0};
 assert.equal(friendlyFireLane(shooter,target,[{x:2,y:.1}]),true);
 assert.equal(friendlyFireLane(shooter,target,[{x:2,y:1}]),false);
 assert.equal(friendlyFireLane(shooter,target,[{x:-2,y:0}]),false);
 assert.equal(friendlyFireLane(shooter,target,[{x:8,y:0}]),false);
});

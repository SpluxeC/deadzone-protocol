import test from 'node:test';
import assert from 'node:assert/strict';
import {traceBullet,meleeHits,penetrationFor} from './hitDetection.ts';
import type {DungeonLayout} from './dungeon.ts';

const room=():DungeonLayout=>({
 width:22,height:18,seed:1,tiles:Array(22*18).fill(0),
 entrance:{x:3,y:8},extraction:{x:19,y:8},loot:[],enemies:[]
});
const zombie=(x:number,y:number)=>({x,y,alive:true,kind:'shambler'});

test('normal bullets stop on first zombie and never damage one behind it',()=>{
 const map=room(),a=zombie(5,8),b=zombie(7,8),c=zombie(9,8);
 const trace=traceBullet(map,{x:2,y:8},{x:1,y:0},12,[c,b,a],penetrationFor('pistol'));
 assert.deepEqual(trace.hits.map(h=>h.target),[a]);
 assert.ok(trace.distance>2&&trace.distance<3);
 for(const model of ['pistol','smg','carbine','assault','shotgun','autoShotgun','lmg'] as const)
  assert.equal(penetrationFor(model),0);
});
test('only specified penetration rifles hit multiple aligned zombies',()=>{
 const map=room(),a=zombie(5,8),b=zombie(7,8),c=zombie(9,8),targets=[c,b,a];
 const mark=traceBullet(map,{x:2,y:8},{x:1,y:0},12,targets,penetrationFor('marksman'));
 assert.deepEqual(mark.hits.map(h=>h.target),[a,b]);
 const snipe=traceBullet(map,{x:2,y:8},{x:1,y:0},12,targets,penetrationFor('sniper'));
 assert.deepEqual(snipe.hits.map(h=>h.target),[a,b,c]);
});
test('bullet hit requires intersecting zombie body, not merely facing its general direction',()=>{
 const map=room(),offAxis=zombie(5,10);
 assert.equal(traceBullet(map,{x:2,y:8},{x:1,y:0},12,[offAxis]).hits.length,0);
});
test('solid walls block projectiles and stop visual travel before zombies',()=>{
 const map=room();map.tiles[8*map.width+4]=1;
 const trace=traceBullet(map,{x:2,y:8},{x:1,y:0},12,[zombie(5,8)]);
 assert.equal(trace.hits.length,0);
 assert.ok(trace.distance<2);
});
test('melee arcs only hit zombies in reach in front and not behind a wall',()=>{
 const map=room(),front=zombie(3.1,8),behind=zombie(1.3,8),far=zombie(6,8);
 assert.deepEqual(meleeHits(map,{x:2,y:8},{x:1,y:0},1.4,[front,behind,far],'knife').map(h=>h.target),[front]);
 const second=zombie(3,8.6);
 assert.equal(meleeHits(map,{x:2,y:8},{x:1,y:0},1.6,[front,second],'axe').length,2);
 map.tiles[8*map.width+3]=1;
 assert.equal(meleeHits(map,{x:2,y:8},{x:1,y:0},1.6,[front],'knife').length,0);
});

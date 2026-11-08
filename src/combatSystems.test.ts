import test from 'node:test';import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {zombieKind,zombieStats,weaponStats,reloadTransfer,distanceField,nextZombieWaypoint,incomingDamage} from './combatSystems.ts';
test('zombie variants unlock at intended waves and never inflate standard health by wave',()=>{
 for(let i=0;i<100;i++)assert.equal(zombieKind(1,i),'shambler');
 assert.equal(zombieKind(5,0,true),'boss');
 const kinds=new Set(Array.from({length:160},(_,i)=>zombieKind(20,i)));
 for(const kind of ['runner','armored','bruiser','shambler'])assert.ok(kinds.has(kind as ReturnType<typeof zombieKind>));
 assert.equal(zombieStats('shambler').hp,2);
 assert.ok(zombieStats('runner').speed>zombieStats('shambler').speed);
 assert.ok(zombieStats('armored').hp>zombieStats('runner').hp);
 assert.ok(zombieStats('boss').damage>zombieStats('bruiser').damage);
});
test('weapon slots use distinct damage and reload characteristics',()=>{
 const primary=weaponStats('primary',3),secondary=weaponStats('secondary',3),melee=weaponStats('melee',3);
 assert.equal(primary.capacity,18);assert.ok(primary.damage>secondary.damage);
 assert.ok(secondary.reload<primary.reload);assert.equal(melee.capacity,0);assert.equal(melee.reload,0);
 assert.deepEqual(reloadTransfer(3,4,12),{mag:7,reserve:0,loaded:4});
 assert.deepEqual(reloadTransfer(12,20,12),{mag:12,reserve:20,loaded:0});
});
test('distance field follows connected hallways and never walks into wall',()=>{
 const map=generateDungeon(551,32,24),field=distanceField(map,map.entrance);
 const exit=map.extraction;let p={...exit},steps=0;
 while(Math.hypot(p.x-map.entrance.x,p.y-map.entrance.y)>.01&&steps++<1000){
  const before=field[p.y*map.width+p.x],next=nextZombieWaypoint(map,field,p),after=field[next.y*map.width+next.x];
  assert.ok(after>=0&&after<before);
  assert.equal(map.tiles[next.y*map.width+next.x],0);
  p=next;
 }
 assert.ok(steps>0&&steps<1000);assert.deepEqual(p,map.entrance);
});
test('armor absorbs hits, overflow damages health',()=>{
 assert.deepEqual(incomingDamage(13,20),{hpDamage:0,armor:7});
 assert.deepEqual(incomingDamage(13,4),{hpDamage:9,armor:0});
});

import {bossAttack,bossImpact} from './combatSystems.ts';
test('boss patterns rotate every five waves and give distinct dodge zones',()=>{assert.equal(bossAttack(5),'slam');assert.equal(bossAttack(10),'charge');assert.equal(bossAttack(15),'shockwave');assert.equal(bossAttack(20),'slam');assert.equal(bossImpact('slam',2),19);assert.equal(bossImpact('slam',3),0);assert.equal(bossImpact('charge',2),0);assert.equal(bossImpact('shockwave',3),14)});

import {bossIdentity,distanceToSegment} from './combatSystems.ts';
test('boss identities rotate reliably and a charge only hits its locked path',()=>{
 assert.equal(bossIdentity(5).name,'THE BUTCHER');
 assert.equal(bossIdentity(10).name,'THE BREAKER');
 assert.equal(bossIdentity(15).name,'THE REVENANT');
 assert.equal(bossIdentity(20).name,'THE BUTCHER');
 const start={x:1,y:1},end={x:5,y:1};
 assert.equal(distanceToSegment({x:3,y:1},start,end),0);
 assert.equal(distanceToSegment({x:3,y:3},start,end),2);
 assert.equal(distanceToSegment({x:7,y:1},start,end),2);
});

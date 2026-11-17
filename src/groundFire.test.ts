import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundFire,insideGroundFire,advanceGroundFires,migrateGroundFires,GROUND_FIRE_DURATION,GROUND_FIRE_RADIUS,MAX_GROUND_FIRES} from './groundFire.ts';
test('fire left after impact covers ground but has no direct impact damage',()=>{
 const fire=createGroundFire(5,7,10);
 assert.equal(fire.age,0);
 assert.equal(fire.duration,GROUND_FIRE_DURATION);
 assert.equal(fire.radius,GROUND_FIRE_RADIUS);
 assert.equal(Object.hasOwn(fire,'damage'),false);
 assert.ok(insideGroundFire(fire,{x:5,y:7}));
 assert.ok(insideGroundFire(fire,{x:5+GROUND_FIRE_RADIUS*.75,y:7}));
 assert.ok(!insideGroundFire(fire,{x:5+GROUND_FIRE_RADIUS+.1,y:7}));
});
test('zombies entering a lingering zone can ignite later, then flames expire',()=>{
 const fire=createGroundFire(4,4);
 const zombie={x:8,y:4};
 assert.equal(insideGroundFire(fire,zombie),false);
 let fires=advanceGroundFires([fire],3);
 zombie.x=5;
 assert.ok(fires.some(f=>insideGroundFire(f,zombie)));
 fires=advanceGroundFires(fires,GROUND_FIRE_DURATION);
 assert.equal(fires.length,0);
});
test('old saves and malformed fire fields are safely migrated',()=>{
 assert.deepEqual(migrateGroundFires(undefined),[]);
 const fires=Array.from({length:MAX_GROUND_FIRES+5},(_,i)=>createGroundFire(i,4));
 const migrated=migrateGroundFires([...fires,{x:Infinity,y:1,age:0,duration:8,radius:2}]);
 assert.equal(migrated.length,MAX_GROUND_FIRES);
 assert.equal(migrated[0].x,5);
});

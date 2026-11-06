import test from 'node:test';
import assert from 'node:assert/strict';
import {bloodOnHit,ageBloodFx,MAX_BLOOD_EFFECTS} from './bloodFx.ts';

test('successful gun and melee hits create both droplets and floor blood',()=>{
 const bullet=bloodOnHit(12,15,1,0,false,7,false);
 const melee=bloodOnHit(12,15,1,0,true,7,false);
 assert.ok(bullet.some(x=>x.kind==='spray'));
 assert.ok(bullet.some(x=>x.kind==='stain'));
 assert.ok(bullet.some(x=>x.kind==='wound'));
 assert.ok(melee.length>bullet.length,'melee hit should splash more visibly');
 assert.ok(bloodOnHit(12,15,1,0,true,7,true).length>melee.length,'lethal hits add splatter');
 assert.deepEqual(bullet,bloodOnHit(12,15,1,0,false,7,false),'same hit seed gives stable particles');
});
test('blood particles fade while persistent floor stains last longer and remain bounded',()=>{
 const fx=bloodOnHit(4,6,0,1,false,10,false);
 const start=fx.length;
 const after=ageBloodFx(fx,.6);
 assert.ok(after.length<start);
 assert.ok(after.length>0);
 assert.ok(after.every(x=>x.kind==='stain'));
 assert.equal(ageBloodFx(after,40).length,0);
 const overfilled=Array.from({length:MAX_BLOOD_EFFECTS+50},(_,i)=>({
  x:i,y:i,vx:0,vy:0,radius:.2,age:0,life:10,kind:'stain' as const
 }));
 assert.equal(ageBloodFx(overfilled,.1).length,MAX_BLOOD_EFFECTS);
});

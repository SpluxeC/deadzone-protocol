import test from 'node:test';
import assert from 'node:assert/strict';
import {proposedWire,wireCells,canDeployWire,touchesWire,migrateWireFences,WIRE_CAP,WIRE_SLOW_FACTOR,WIRE_TICK_DAMAGE,WIRE_TICK_SECONDS} from './barbWire.ts';
test('1×3 fences deploy exactly one tile ahead and perpendicular to each cardinal facing',()=>{
 const p={x:10,y:10};
 for(const [dx,dy,x,y,orientation] of [
  [1,0,11,10,'vertical'],[-1,0,9,10,'vertical'],
  [0,1,10,11,'horizontal'],[0,-1,10,9,'horizontal'],
 ] as const){
  const fence=proposedWire(p,{x:dx,y:dy});
  assert.deepEqual({x:fence.x,y:fence.y,orientation:fence.orientation},{x,y,orientation});
  const cells=wireCells(fence);
  assert.equal(cells.length,3);
  assert.equal(new Set(cells.map(c=>c.x+':'+c.y)).size,3);
  const xs=new Set(cells.map(c=>c.x)),ys=new Set(cells.map(c=>c.y));
  assert.ok((xs.size===1&&ys.size===3)||(xs.size===3&&ys.size===1));
 }
});
test('wire placement needs three valid floor cells and cannot overlap another fence',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 assert.ok(canDeployWire(fence,()=>true,[]));
 assert.ok(!canDeployWire(fence,(x,y)=>!(x===5&&y===3),[]));
 assert.ok(!canDeployWire(fence,()=>true,[fence]));
 assert.ok(canDeployWire(proposedWire({x:10,y:4},{x:1,y:0}),()=>true,[fence]));
});
test('wire affects actors in strip, never changes map or collision geometry',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 const original=JSON.stringify(fence);
 assert.ok(touchesWire({x:5,y:3.3},fence));
 assert.ok(touchesWire({x:5,y:5},fence));
 assert.ok(!touchesWire({x:6.3,y:4},fence));
 assert.equal(JSON.stringify(fence),original);
 assert.ok(WIRE_SLOW_FACTOR>0&&WIRE_SLOW_FACTOR<1);
 assert.ok(WIRE_TICK_DAMAGE>0&&WIRE_TICK_DAMAGE<3);
 assert.ok(WIRE_TICK_SECONDS>=.3);
 assert.equal(WIRE_CAP,3);
});
test('wire fences safely restore from saves',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 assert.deepEqual(migrateWireFences([fence,null,{x:'bad',y:2,orientation:'horizontal'}]),[fence]);
 assert.deepEqual(migrateWireFences(null),[]);
});

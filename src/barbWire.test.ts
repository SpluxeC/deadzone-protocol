import test from 'node:test';
import assert from 'node:assert/strict';
import {proposedWire,wireCells,canDeployWire,touchesWire,migrateWireFences,WIRE_CAP,WIRE_MAX_DURABILITY,wearWire,wireKey,WIRE_SLOW_FACTOR,WIRE_TICK_DAMAGE,WIRE_TICK_SECONDS} from './barbWire.ts';
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
 assert.equal(WIRE_MAX_DURABILITY,10);
});
test('wire fences safely restore from saves',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 assert.deepEqual(migrateWireFences([fence,null,{x:'bad',y:2,orientation:'horizontal'}]),[fence]);
 assert.deepEqual(migrateWireFences(null),[]);
});

test('one charge per unique crossing and wire vanishes after ten zombies',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 let broken=false;
 for(let zombie=0;zombie<WIRE_MAX_DURABILITY;zombie++){
  assert.equal(fence.durability,WIRE_MAX_DURABILITY-zombie);
  const key=wireKey(fence);
  const contact={wireContact:undefined as string|undefined};
  for(let frame=0;frame<30;frame++){
   if(contact.wireContact!==key){
    contact.wireContact=key;
    broken=wearWire(fence);
   }
  }
  assert.equal(broken,zombie===WIRE_MAX_DURABILITY-1);
 }
 assert.equal(fence.durability,0);
 assert.equal(touchesWire({x:5,y:4},fence),false);
 assert.equal(canDeployWire(fence,()=>true,[]),false);
});
test('exiting and reentering a fence consumes a fresh charge; migration fills old durability',()=>{
 const fence=proposedWire({x:4,y:4},{x:1,y:0});
 wearWire(fence);
 const saved=migrateWireFences([fence]);
 assert.equal(saved[0].durability,WIRE_MAX_DURABILITY-1);
 const legacy={x:5,y:4,orientation:'vertical',age:2};
 assert.equal(migrateWireFences([legacy])[0].durability,WIRE_MAX_DURABILITY);
 assert.deepEqual(migrateWireFences([{...fence,durability:0}]),[]);
 const key=wireKey(fence);
 let previous:string|undefined;
 let charges=0;
 for(const location of [{x:5,y:4},{x:5,y:4},{x:8,y:4},{x:5,y:4}]){
  const current=touchesWire(location,fence)?key:undefined;
  if(current&&current!==previous){wearWire(fence);charges++}
  previous=current;
 }
 assert.equal(charges,2);
});

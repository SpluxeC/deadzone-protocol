import test from 'node:test';
import assert from 'node:assert/strict';
import {queueOrder,tickProduction,finalGuardianClear,campaignComplete} from './progression.ts';
test('queue charges once, enforces unlock and capacity',()=>{
 assert.equal(queueOrder([],'rifle',30,false),null);
 assert.equal(queueOrder([],'armor',6,true),null);
 const one=queueOrder([],'ammo',10,false)!;
 assert.equal(one.scrap,7);
 assert.deepEqual(one.queue,[{kind:'ammo',remaining:25}]);
 assert.equal(queueOrder(one.queue,'medkit',4,true),null);
 assert.equal(queueOrder(Array(6).fill({kind:'ammo',remaining:4}),'ammo',30,true),null);
});
test('production pauses, resumes and completes one order without skipping',()=>{
 const initial=[{kind:'ammo' as const,remaining:10},{kind:'medkit' as const,remaining:25}];
 assert.deepEqual(tickProduction(initial,5,false),{queue:initial,completed:null});
 assert.deepEqual(tickProduction(initial,5,true),{queue:[{kind:'ammo',remaining:5},initial[1]],completed:null});
 assert.deepEqual(tickProduction(initial,10,true),{queue:[initial[1]],completed:'ammo'});
});
test('final victory requires the guardian and three defended waves',()=>{
 assert.equal(finalGuardianClear(2,0),false);
 assert.equal(finalGuardianClear(3,1),false);
 assert.equal(finalGuardianClear(3,0),true);
 assert.equal(campaignComplete(true,2,true),false);
 assert.equal(campaignComplete(true,3,false),false);
 assert.equal(campaignComplete(false,5,true),false);
 assert.equal(campaignComplete(true,3,true),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {findAutoTarget} from './autoCombat.ts';
import type {DungeonLayout} from './dungeon.ts';
const room=():DungeonLayout=>({width:20,height:14,seed:15,tiles:Array(20*14).fill(0),entrance:{x:2,y:7},extraction:{x:17,y:7},loot:[],enemies:[]});
const target=(x:number,y:number,alive=true)=>({x,y,alive,kind:'shambler'});
test('auto-fire chooses nearest visible, in-range infected only',()=>{
 const m=room(),p={x:2,y:7},far=target(7,7),near=target(4,7),dead=target(3,7,false);
 const found=findAutoTarget(m,p,9,'carbine',[far,dead,near]);
 assert.equal(found?.target,near);
 assert.deepEqual(found?.direction,{x:1,y:0});
 assert.equal(findAutoTarget(m,p,2,'carbine',[far]),null);
 assert.equal(findAutoTarget(m,p,9,'carbine',[near],()=>false),null);
});
test('auto target skips enemies blocked by walls and never fires through geometry',()=>{
 const m=room(),p={x:2,y:7};
 m.tiles[7*m.width+4]=1;
 const behind=target(6,7),clear=target(3,5);
 assert.equal(findAutoTarget(m,p,8,'carbine',[behind,clear])?.target,clear);
 assert.equal(findAutoTarget(m,p,8,'carbine',[behind]),null);
});
test('knife auto-target uses stab geometry, not omnidirectional hits',()=>{
 const m=room(),p={x:4,y:7},inReach=target(5,7),far=target(9,7);
 assert.equal(findAutoTarget(m,p,1.4,'knife',[far,inReach])?.target,inReach);
 assert.equal(findAutoTarget(m,p,1.4,'knife',[far]),null);
});

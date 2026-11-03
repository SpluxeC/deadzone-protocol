import test from 'node:test';import assert from 'node:assert/strict';import {findSupportTarget} from './squadTactics.ts';
const clear=()=>true;
test('Assault ranges farther than Cover; dead and escorted companions never shoot',()=>{
 const allies=[{id:1,hp:40,dead:false,x:1,y:1},{id:2,hp:75,dead:true,x:3,y:3}];
 const enemies=[{x:4,y:1}];
 assert.equal(findSupportTarget(allies,enemies,[],'cover',-1,clear,{x:0,y:0}),null);
 assert.deepEqual(findSupportTarget(allies,enemies,[],'assault',-1,clear,{x:0,y:0}),{allyId:1,enemyIndex:0});
 assert.equal(findSupportTarget(allies,enemies,[],'assault',1,clear,{x:0,y:0}),null);
});
test('Squad targets closest active visible enemy and ignores already cleared',()=>{
 const allies=[{id:7,hp:100,dead:false,x:0,y:0}],enemies=[{x:1,y:0},{x:2,y:0},{x:3,y:0}];
 assert.deepEqual(findSupportTarget(allies,enemies,[0],'assault',-1,clear,{x:0,y:0}),{allyId:7,enemyIndex:1});
 assert.equal(findSupportTarget(allies,enemies,[0,1,2],'assault',-1,clear,{x:0,y:0}),null);
 assert.equal(findSupportTarget(allies,enemies,[],'assault',-1,()=>false,{x:0,y:0}),null);
});

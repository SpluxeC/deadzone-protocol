import test from 'node:test';
import assert from 'node:assert/strict';
import {squadMove,squadStepClear,spacedSquadPosition,SQUAD_SPACING} from './squadMovement.ts';
import type {DungeonLayout} from './dungeon.ts';

const map=():DungeonLayout=>({width:22,height:18,seed:1,tiles:Array(22*18).fill(0),entrance:{x:2,y:2},extraction:{x:18,y:15},loot:[],enemies:[]});
test('teammate cannot walk through a stationary squad member or player',()=>{
 const dungeon=map(),a={x:4,y:8},b={x:5,y:8};
 for(let n=0;n<60;n++)squadMove(dungeon,a,1,0,.1,[b]);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=SQUAD_SPACING-.0001);
 assert.equal(squadStepClear({x:4,y:8},{x:6,y:8},[b]),false);
});
test('squad teammates find available sideways space around a blockage',()=>{
 const dungeon=map(),a={x:4,y:8},blocking={x:4.83,y:8};
 assert.equal(squadMove(dungeon,a,1,0,.1,[blocking]),true);
 assert.ok(Math.abs(a.y-8)>0);
 assert.ok(Math.hypot(a.x-blocking.x,a.y-blocking.y)>=SQUAD_SPACING-.0001);
});
test('floor entry and old saved overlapping squadmates are separated',()=>{
 const dungeon=map(),player={x:5,y:5},taken=[player];
 for(let i=0;i<4;i++){
  const placed=spacedSquadPosition(dungeon,{x:5,y:5},taken);
  assert.ok(taken.every(p=>Math.hypot(p.x-placed.x,p.y-placed.y)>=SQUAD_SPACING));
  taken.push(placed);
 }
});
test('walls remain impassable during sidesteps',()=>{
 const dungeon=map(),actor={x:3,y:8};
 for(let y=0;y<dungeon.height;y++)dungeon.tiles[y*dungeon.width+4]=1;
 for(let i=0;i<60;i++)squadMove(dungeon,actor,1,0,.1,[]);
 assert.ok(actor.x<3.5);
});

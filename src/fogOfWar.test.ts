import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {createFog,updateFog,exploredIndices,lightLine,fogAlpha,UNKNOWN_TERRAIN_ALPHA,discoveredAt} from './fogOfWar.ts';

test('exploration expands in every direction, not only where the player aims',()=>{
 const map=generateDungeon(44,42,30),origin=map.entrance,fog=createFog(map);
 assert.equal(fogAlpha(fog,origin.y*map.width+origin.x),UNKNOWN_TERRAIN_ALPHA);
 assert.equal(updateFog(map,fog,[{x:origin.x,y:origin.y,radius:5.5}]),true);
 assert.equal(fogAlpha(fog,origin.y*map.width+origin.x),0);
 assert.ok(exploredIndices(fog).length>1);
});
test('discovered tiles remain fully visible and survive save/load',()=>{
 const map=generateDungeon(441,42,30),origin=map.entrance,fog=createFog(map);
 updateFog(map,fog,[{x:origin.x,y:origin.y,radius:4.5}]);
 const saved=exploredIndices(fog);
 assert.ok(saved.length>0);
 updateFog(map,fog,[{x:map.extraction.x,y:map.extraction.y,radius:4.5}]);
 for(const i of saved)assert.equal(fogAlpha(fog,i),0);
 const restored=createFog(map,exploredIndices(fog));
 for(const i of saved)assert.equal(fogAlpha(restored,i),0);
});
test('solid walls block exploration behind them',()=>{
 const map=generateDungeon(341,42,30);
 assert.equal(lightLine(map,map.entrance.x,map.entrance.y,map.entrance.x,map.entrance.y),true);
 const fog=createFog(map);
 assert.equal(fogAlpha(fog,0),UNKNOWN_TERRAIN_ALPHA);
});

test('revealed areas never darken again after exploring elsewhere',()=>{
 const map=generateDungeon(2026,42,30);
 const fog=createFog(map);
 updateFog(map,fog,[{x:map.entrance.x,y:map.entrance.y,radius:5.5}]);
 const discovered=exploredIndices(fog);
 assert.ok(discovered.length>0);
 updateFog(map,fog,[{x:map.extraction.x,y:map.extraction.y,radius:5.5}]);
 for(const index of discovered)assert.equal(fogAlpha(fog,index),0);
});

test('unexplored tiles are darkened but terrain remains visible; entities are hidden until reveal',()=>{
 const map=generateDungeon(481,42,30),fog=createFog(map),origin=map.entrance;
 const i=origin.y*map.width+origin.x;
 assert.ok(UNKNOWN_TERRAIN_ALPHA>.65&&UNKNOWN_TERRAIN_ALPHA<1);
 assert.equal(fogAlpha(fog,i),UNKNOWN_TERRAIN_ALPHA);
 assert.equal(discoveredAt(map,fog,origin.x,origin.y),false);
 updateFog(map,fog,[{x:origin.x,y:origin.y,radius:3}]);
 assert.equal(discoveredAt(map,fog,origin.x,origin.y),true);
 assert.equal(fogAlpha(fog,i),0);
 assert.equal(discoveredAt(map,fog,-1,-1),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {walkableTile,canOccupy,nearestWalkable} from './tileCollision.ts';
import {createFog,fogAlpha,UNKNOWN_TERRAIN_ALPHA} from './fogOfWar.ts';

test('tile centers and actor collision agree for walkable and solid cells',()=>{
 for(let seed=1;seed<=40;seed++){
  const map=generateDungeon(seed,32,24,2);
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
   assert.equal(walkableTile(map,x,y),map.tiles[y*map.width+x]===0);
   if(map.tiles[y*map.width+x]===0)assert.equal(canOccupy(map,x,y),true);
   else assert.equal(canOccupy(map,x,y),false);
  }
 }
});
test('actor body cannot cross a wall even if center still sits in a floor cell',()=>{
 const map=generateDungeon(331,32,24,2);
 let checked=false;
 for(let y=2;y<map.height-2&&!checked;y++)for(let x=2;x<map.width-2&&!checked;x++){
  if(map.tiles[y*map.width+x]===0&&map.tiles[y*map.width+x+1]===1){
   assert.equal(canOccupy(map,x,y),true);
   assert.equal(canOccupy(map,x+.35,y),false);
   checked=true;
  }
 }
 assert.equal(checked,true);
});
test('old save actors in walls are repaired onto reachable floor tiles',()=>{
 const map=generateDungeon(556,32,24,2);
 const fixed=nearestWalkable(map,{x:0,y:0});
 assert.equal(canOccupy(map,fixed.x,fixed.y),true);
 assert.deepEqual(nearestWalkable(map,fixed),fixed);
});
test('explored tiles are completely visible, undiscovered tiles are darkened',()=>{
 const map=generateDungeon(777,32,24,2),fog=createFog(map);
 const index=map.entrance.y*map.width+map.entrance.x;
 assert.equal(fogAlpha(fog,index),UNKNOWN_TERRAIN_ALPHA);
 fog.explored[index]=1;
 assert.equal(fogAlpha(fog,index),0);
});

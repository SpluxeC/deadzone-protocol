import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {walkableTile,canOccupy,nearestWalkable} from './tileCollision.ts';
import {propCollisionGrid,solidAt} from './propCollision.ts';
import {facilityAtmosphere} from './facilityAtmosphere.ts';
import {distanceField,nextZombieWaypoint} from './combatSystems.ts';
import {distanceToWall} from './hitDetection.ts';
import {createFog,fogAlpha,UNKNOWN_TERRAIN_ALPHA} from './fogOfWar.ts';

test('tile centers and actor collision agree for walkable and solid cells',()=>{
 for(let seed=1;seed<=40;seed++){
  const map=generateDungeon(seed,32,24,2);
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
   assert.equal(walkableTile(map,x,y),!solidAt(map,x,y));
   assert.equal(canOccupy(map,x,y),!solidAt(map,x,y));
  }
 }
});
test('actor body cannot cross a wall even if center still sits in a floor cell',()=>{
 const map=generateDungeon(331,32,24,2);
 let checked=false;
 for(let y=2;y<map.height-2&&!checked;y++)for(let x=2;x<map.width-2&&!checked;x++){
  if(canOccupy(map,x,y)&&map.tiles[y*map.width+x+1]===1){
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

test('all physical facility props and loot crates block actors and projectiles',()=>{
 const map=generateDungeon(4212,64,48,3);
 const grid=propCollisionGrid(map),atmosphere=facilityAtmosphere(map);
 const raised=atmosphere.props.filter(p=>p.kind!=='brokenGlass'&&p.kind!=='ammoPile');
 assert.ok(raised.length>0,'the facility should contain physical scenery');
 for(const p of raised){
  assert.equal(grid[p.y*map.width+p.x],1,p.kind+' must be solid');
  assert.equal(canOccupy(map,p.x,p.y),false);
  const origin={x:p.x-1,y:p.y},direction={x:1,y:0};
  if(canOccupy(map,origin.x,origin.y))
   assert.ok(distanceToWall(map,origin,direction,2)<2,'prop should stop bullets');
 }
});
test('BFS routes around raised props rather than through furniture',()=>{
 const map=generateDungeon(1202,64,48,3);
 const blocked=propCollisionGrid(map);
 const field=distanceField(map,map.entrance);
 assert.ok(field[map.entrance.y*map.width+map.entrance.x]===0);
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const at=y*map.width+x;
  if(blocked[at])assert.equal(field[at],-1);
  if(field[at]>0){
   const step=nextZombieWaypoint(map,field,{x,y});
   assert.equal(canOccupy(map,step.x,step.y),true);
   assert.ok(field[step.y*map.width+step.x]<field[at]);
  }
 }
});

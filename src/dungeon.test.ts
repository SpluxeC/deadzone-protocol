import test from 'node:test';import assert from 'node:assert/strict';import {generateDungeon,elevatorCells,elevatorInRange,crateCells,crateInRange} from './dungeon.ts';
test('deterministic layout and reachable extraction',()=>{for(let seed=1;seed<101;seed++){const a=generateDungeon(seed),b=generateDungeon(seed);assert.deepEqual(a,b);assert.equal(a.tiles[a.entrance.y*a.width+a.entrance.x],0);const seen=new Set([a.entrance.y*a.width+a.entrance.x]),queue=[a.entrance];for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,key=y*a.width+x;if(x>=0&&y>=0&&x<a.width&&y<a.height&&a.tiles[key]===0&&!seen.has(key)){seen.add(key);queue.push({x,y})}}}assert.ok(seen.has(a.extraction.y*a.width+a.extraction.x));for(const p of [...a.loot,...a.enemies])assert.ok(seen.has(p.y*a.width+p.x))}});
test('invalid dimensions are rejected',()=>{assert.throws(()=>generateDungeon(10,10,10))});
test('all dungeon item and enemy positions are unique and accessible',()=>{
 for(let seed=101;seed<301;seed++){
  const dungeon=generateDungeon(seed);
  const key=(p:{x:number;y:number})=>p.y*dungeon.width+p.x;
  const occupied=[...dungeon.loot,...dungeon.enemies].map(key);
  assert.equal(new Set(occupied).size,occupied.length,'items and enemies must not overlap');
  assert.ok(dungeon.loot.length>0,'must contain loot');
  assert.ok(dungeon.enemies.length>0,'must contain enemies');
  for(const n of occupied)assert.equal(dungeon.tiles[n],0,'content must be on walkable ground');
  assert.notEqual(key(dungeon.entrance),key(dungeon.extraction),'extraction must be separate');
 }
});
test('large procedural dungeon remains deterministic',()=>{
 const a=generateDungeon(2026,60,42);
 assert.deepEqual(a,generateDungeon(2026,60,42));
 assert.equal(a.tiles.length,60*42);
});

test('new dungeon layout provides wider open areas without breaking legacy seeded maps',()=>{
 for(let seed=1;seed<=75;seed++){
  const next=generateDungeon(seed,32,24,2),old=generateDungeon(seed,32,24,1);
  assert.deepEqual(next,generateDungeon(seed,32,24,2));
  assert.deepEqual(old,generateDungeon(seed,32,24,1));
  const countThreeByThree=(map:ReturnType<typeof generateDungeon>)=>{
   let count=0;
   for(let y=1;y<map.height-1;y++)for(let x=1;x<map.width-1;x++){
    let clear=true;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
     if(map.tiles[(y+dy)*map.width+x+dx]!==0)clear=false;
    if(clear)count++;
   }
   return count;
  };
  assert.ok(countThreeByThree(next)>=1,'expanded map must include traversable 3x3 space');
  assert.equal(next.tiles[next.entrance.y*next.width+next.entrance.x],0);
  assert.equal(next.tiles[next.extraction.y*next.width+next.extraction.x],0);
 }
});

test('modern 2x2 elevator stays in a spacious room, distant from starting spawn',()=>{
 for(let seed=1;seed<=300;seed++){
  const map=generateDungeon(seed,64,48,3),cells=elevatorCells(map);
  assert.equal(map.extractionSize,2,'modern elevator has a 2x2 footprint');
  assert.equal(cells.length,4);
  assert.equal(new Set(cells.map(p=>p.x+':'+p.y)).size,4);
  assert.ok(Math.hypot(map.extraction.x-map.entrance.x,map.extraction.y-map.entrance.y)>=12,
   'elevator must be far enough from the starting spawn, seed '+seed);
  const tile=(x:number,y:number)=>map.tiles[y*map.width+x];
  for(const cell of cells){
   assert.equal(tile(cell.x,cell.y),0,'elevator stands on walkable floor');
   // Room center keeps its 2x2 doorway clear of any adjoining wall tiles.
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
    assert.equal(tile(cell.x+dx,cell.y+dy),0,'room leaves clearance around elevator, seed '+seed);
   assert.ok(elevatorInRange(map,cell),'all four elevator tiles respond to interaction');
  }
  assert.equal(elevatorInRange(map,map.entrance),false,'cannot activate from spawn');
  assert.ok(elevatorInRange(map,{x:map.extraction.x+1.5,y:map.extraction.y}),
   'call panel reachable beside the elevator threshold');
 }
});
test('legacy maps retain original single-tile elevator layout and interaction',()=>{
 for(const version of [1,2] as const){
  const a=generateDungeon(9041,32,24,version);
  assert.equal(a.extractionSize,1);
  assert.deepEqual(elevatorCells(a),[a.extraction]);
  assert.ok(elevatorInRange(a,a.extraction));
  assert.equal(elevatorInRange(a,a.entrance),false);
 }
});

test('modern maps have rarer two-tile weapon cases and non-overlapping military supply cases',()=>{
 for(let seed=1;seed<=300;seed++){
  const map=generateDungeon(seed,64,48,3);
  const weapons=map.loot.filter(c=>c.kind==='weapon');
  const supplies=map.loot.filter(c=>c.kind!=='weapon');
  assert.equal(weapons.length,2+(map.secret?1:0),'two normal weapon cases, plus an optional secret case, seed '+seed);
  assert.equal(supplies.length,8,'eight supply crates expected, seed '+seed);
  const claimed=new Set<string>();
  for(const crate of map.loot){
   const cells=crateCells(crate);
   assert.equal(cells.length,crate.kind==='weapon'?2:1);
   assert.ok(crateInRange(crate,cells[0]),'reachable from its first tile');
   for(const p of cells){
    const key=p.x+','+p.y;
    assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y),'case lies on integer tile centers');
    assert.ok(!claimed.has(key),'no shared crate tile: '+key);
    claimed.add(key);
    assert.equal(map.tiles[p.y*map.width+p.x],0,'crate lies on floor');
    assert.ok(Math.hypot(p.x-map.entrance.x,p.y-map.entrance.y)>7,'crate not in player spawn');
    assert.ok(Math.hypot(p.x-map.extraction.x,p.y-map.extraction.y)>2,'crate not in elevator');
   }
  }
  assert.ok(weapons.length<supplies.length);
  assert.deepEqual(map,generateDungeon(seed,64,48,3),'same seed gives identical case placement');
 }
});
test('older dungeon layouts preserve one-tile supply crate footprint',()=>{
 for(const version of [1,2] as const){
  const map=generateDungeon(2458,32,24,version);
  assert.ok(map.loot.every(c=>crateCells(c).length===1));
 }
});

test('rare secret annex stays sealed until opened and its cache occupies two real floor tiles',()=>{
 let found=0;
 for(let seed=1;seed<=750;seed++){
  const map=generateDungeon(seed,64,48,3),secret=map.secret;
  if(!secret)continue;
  found++;
  const index=secret.door.y*map.width+secret.door.x;
  assert.equal(map.tiles[index],1,'secret entrance must be sealed');
  const cache=map.loot[secret.rewardIndex];
  assert.equal(cache.kind,'weapon');
  assert.equal(crateCells(cache).length,2);
  for(const p of crateCells(cache)){
   assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
   assert.equal(map.tiles[p.y*map.width+p.x],0,'hidden cache must rest on floor');
   assert.ok(Math.abs(p.x-secret.center.x)<=1&&Math.abs(p.y-secret.center.y)<=1);
  }
  assert.deepEqual(map,generateDungeon(seed,64,48,3),'secret location must be deterministic after reload');
 }
 assert.ok(found>=1,'at least one seeded floor must contain a secret');
});
test('floor events are deterministic, in walkable rooms and outside the elevator',()=>{
 for(let seed=1;seed<=150;seed++){
  const map=generateDungeon(seed,64,48,3);
  for(const event of map.events??[]){
   assert.equal(map.tiles[event.y*map.width+event.x],0);
   assert.ok(Math.hypot(event.x-map.entrance.x,event.y-map.entrance.y)>7);
   assert.ok(Math.hypot(event.x-map.extraction.x,event.y-map.extraction.y)>3);
   assert.ok(['supplyDrop','infectedNest','fieldHospital','powerSurge'].includes(event.kind));
  }
  assert.deepEqual(map.events,generateDungeon(seed,64,48,3).events);
 }
});

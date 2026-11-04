import test from 'node:test';import assert from 'node:assert/strict';import {generateDungeon} from './dungeon.ts';
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

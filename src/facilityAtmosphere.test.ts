import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {facilityAtmosphere,environmentNoise,ROOM_THEMES} from './facilityAtmosphere.ts';

test('seeded facility decor includes six room types and blood-written HELP',()=>{
 const found=new Set<string>();
 let helps=0;
 for(let seed=1;seed<=125;seed++){
  const map=generateDungeon(seed,64,48,3);
  const atmosphere=facilityAtmosphere(map);
  assert.equal(atmosphere.themes.length,map.width*map.height);
  assert.equal(facilityAtmosphere(map),atmosphere,'atmosphere cached for render performance');
  assert.ok(atmosphere.lights.length>0);
  for(const room of atmosphere.rooms)found.add(room.theme);
  helps+=atmosphere.decals.filter(d=>d.kind==='help').length;
  for(const prop of atmosphere.props){
   assert.equal(map.tiles[prop.y*map.width+prop.x],0,'scenery must appear on a floor');
   assert.ok(Math.hypot(prop.x-map.entrance.x,prop.y-map.entrance.y)>=3.6,'spawn kept unobstructed');
   assert.ok(Math.hypot(prop.x-map.extraction.x,prop.y-map.extraction.y)>=3,'elevator kept clear');
   assert.ok(map.loot.every(c=>Math.hypot(prop.x-c.x,prop.y-c.y)>=1.3),'crate art kept clear');
  }
  for(const d of atmosphere.decals.filter(d=>d.kind==='help')){
   assert.equal(map.tiles[d.y*map.width+d.x],1,'HELP is written on solid wall');
  }
 }
 assert.deepEqual([...found].sort(),[...ROOM_THEMES].sort());
 assert.ok(helps>=60,'HELP lettering must appear regularly, not once per game');
});
test('atmosphere is deterministic and works on migrated legacy floor layouts',()=>{
 const a=generateDungeon(1201,64,48,3),b=generateDungeon(1201,64,48,3);
 assert.deepEqual(facilityAtmosphere(a),facilityAtmosphere(b));
 for(const version of [1,2] as const){
  const old=generateDungeon(421,32,24,version);
  assert.equal(facilityAtmosphere(old).themes.length,old.width*old.height);
 }
 for(let i=0;i<100;i++)assert.equal(environmentNoise(i,27,110),environmentNoise(i,27,110));
});

test('ruined facilities include expanded abandoned equipment and survivor messages',()=>{
 const seenProps=new Set<string>(),seenStories=new Set<string>(),lighting=new Set<string>();
 for(let seed=1;seed<=180;seed++){
  const a=facilityAtmosphere(generateDungeon(seed,64,48,3));
  for(const p of a.props)seenProps.add(p.kind);
  for(const d of a.decals)seenStories.add(d.kind);
  for(const l of a.lights)lighting.add(l.kind);
  assert.ok(a.props.length<=a.rooms.length*10,'scenery count is bounded per room');
  assert.ok(a.lights.length<=a.rooms.length*2,'light count is bounded per room');
 }
 for(const kind of ['gurney','wheelchair','oxygen','serverRack','radio','sandbags','brokenDrone','toolbox','pallet','bodyBag','fallenLight','hazmat'])
  assert.ok(seenProps.has(kind),'missing facility prop '+kind);
 for(const kind of ['help','hand','lastStand','evac','doNotOpen','countdown','impact','biohazard'])
  assert.ok(seenStories.has(kind),'missing environmental story '+kind);
 for(const kind of ['red','cold','amber','dark'])assert.ok(lighting.has(kind),'missing lighting type '+kind);
});

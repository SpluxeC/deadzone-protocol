import test from 'node:test';
import assert from 'node:assert/strict';
import {camera,toWorld,visible,spriteIndex,spriteSize,hudColor} from './rogueliteVisuals.ts';
import {generateDungeon} from './dungeon.ts';
import {readFileSync} from 'node:fs';
test('all 5 specialists and 5 infected have distinct sprite atlas cells',()=>{
 const indices=Object.values(spriteIndex);
 assert.equal(indices.length,14);assert.equal(new Set(indices).size,14);
 for(const key of ['player','rifleman','medic','heavy','scout','engineer','shambler','runner','armored','bruiser','boss','crate','elevator','spawn'])assert.ok(key in spriteIndex);
 assert.equal(spriteSize,96);
 const art=readFileSync(new URL('./assets/deadzone-sprites.svg',import.meta.url),'utf-8');
 assert.match(art,/<svg /);assert.match(art,/viewBox="0 0 1344 96"/);
 assert.equal((art.match(/<g transform="translate\(/g)||[]).length,14);
});
test('world-to-screen transformations are reversible while camera follows player',()=>{
 const map=generateDungeon(2311,42,32);
 for(const [width,height] of [[1200,720],[720,360],[360,640]]){
  for(const player of [map.entrance,map.extraction,{x:20,y:16}]){
   const v=camera(map,player,width,height);
   assert.ok(v.tile>=18&&v.tile<=40);
   assert.ok(v.minX>=0&&v.maxX<=map.width);
   assert.ok(v.minY>=0&&v.maxY<=map.height);
   for(const p of [player,map.entrance,map.extraction]){
    const again=toWorld(v,v.ox+p.x*v.tile,v.oy+p.y*v.tile);
    assert.ok(Math.abs(again.x-p.x)<1e-8);
    assert.ok(Math.abs(again.y-p.y)<1e-8);
   }
  }
 }
});
test('offscreen culling and health feedback have valid ranges',()=>{
 const map=generateDungeon(2121,36,28),v=camera(map,map.entrance,640,400);
 assert.equal(visible(v,-500,-500),false);
 assert.equal(visible(v,map.entrance.x,map.entrance.y),true);
 assert.notEqual(hudColor(.8),hudColor(.1));
});

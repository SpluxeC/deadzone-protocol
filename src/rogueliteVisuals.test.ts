import test from 'node:test';
import assert from 'node:assert/strict';
import {camera,toWorld,visible,spriteIndex,spriteSize,hudColor,environmentTileId,environmentArtReady,playerMuzzle} from './rogueliteVisuals.ts';
import {generateDungeon} from './dungeon.ts';
import {readFileSync} from 'node:fs';
test('all 5 specialists and 5 infected have distinct sprite atlas cells',()=>{
 const indices=Object.values(spriteIndex);
 assert.equal(indices.length,14);assert.equal(new Set(indices).size,14);
 for(const key of ['player','rifleman','medic','heavy','scout','engineer','shambler','runner','armored','bruiser','boss','crate','elevator','spawn'])assert.ok(key in spriteIndex);
 assert.equal(spriteSize,96);
 const art=readFileSync(new URL('./assets/deadzone-sprites.svg',import.meta.url),'utf-8');
 assert.match(art,/<svg /);assert.match(art,/viewBox="0 0 1344 96"/);
 assert.equal((art.match(/<g transform="translate\(\d+ 0\)"/g)||[]).length,14);
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

import {gearIconModels,gearIcon} from './gearIcons.ts';
test('all weapon, attachment and supply icons resolve to one atlas cell',()=>{
 const svg=readFileSync(new URL('./assets/deadzone-gear.svg',import.meta.url),'utf8');
 assert.equal(gearIconModels.length,36);
 assert.equal(new Set(gearIconModels).size,36);
 assert.match(svg,/viewBox="0 0 2304 64"/);
 assert.equal((svg.match(/<g transform="translate\(\d+ 0\)"/g)||[]).length,36);
 for(const id of gearIconModels)assert.match(gearIcon(id),/class="gear-mini"/);
 assert.equal(gearIcon('unknown-gear'), '');
});

test('optional environment atlas maps only flooring to floor art and walls to wall art',()=>{
 for(let n=0;n<=100;n++){
  const noise=n/100;
  const floor=environmentTileId(true,noise),wall=environmentTileId(false,noise);
  assert.ok(floor>=0&&floor<10);
  assert.ok(wall>=10&&wall<16);
 }
 assert.equal(environmentTileId(true,0),0);
 assert.equal(environmentTileId(true,.999),9);
 assert.equal(environmentArtReady(),false); // Node has no Image; browser downloads it after upload
});


import {heldWeaponMuzzle,weaponVisualFamily} from './weaponVisuals.ts';
import {weaponDefs} from './equipmentArmory.ts';
test('every equipped weapon has a visual family, muzzle and inventory icon',()=>{
 for(const id of Object.keys(weaponDefs) as (keyof typeof weaponDefs)[]){
  assert.ok(weaponVisualFamily[id],id);
  const muzzle=heldWeaponMuzzle(id,1.25);
  assert.ok(Number.isFinite(muzzle.x)&&Number.isFinite(muzzle.y));
  assert.match(gearIcon(id),/gear-mini/);
 }
});
test('player muzzle follows each equipped weapon for every aim angle',()=>{
 const base={x:10,y:20};
 for(const model of ['pistol','carbine','battleRifle','sniper','shotgun'] as const){
  const local=heldWeaponMuzzle(model,1.25);
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,2.3]){
   const muzzle=playerMuzzle(base.x,base.y,heading,1.25,model);
   const rotation=heading+Math.PI/2;
   const grip={x:base.x+local.x*Math.cos(rotation),y:base.y+local.x*Math.sin(rotation)};
   const actual=Math.atan2(muzzle.y-grip.y,muzzle.x-grip.x);
   const difference=Math.atan2(Math.sin(actual-heading),Math.cos(actual-heading));
   assert.ok(Math.abs(difference)<1e-9);
  }
 }
});

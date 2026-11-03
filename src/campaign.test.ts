import test from 'node:test';import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {floorSeed,nextFloor,resolveCasualty} from './expedition.ts';
import {queueOrder,tickProduction,finalGuardianClear,campaignComplete} from './progression.ts';
import {equipPlate,absorbDamage} from './equipment.ts';
test('campaign end-to-end deterministic progression: floors, loot, manufacturing, boss, defense',()=>{
 let scrap=45,queue=[] as {kind:'ammo'|'medkit'|'armor'|'rifle';remaining:number}[],clears=0,guardian=false,defenses=0;
 for(let expedition=0;expedition<5;expedition++){const tier=Math.min(3,1+Math.floor(clears/2));let floor=1;let looted=0;for(;;){const d=generateDungeon(floorSeed(101+expedition,floor));assert.equal(d.tiles[d.entrance.y*d.width+d.entrance.x],0);assert.equal(d.tiles[d.extraction.y*d.width+d.extraction.x],0);looted+=d.loot.length;if(floor===3){if(tier===3)guardian=finalGuardianClear(tier,0);break}floor=nextFloor(floor)}assert.equal(floor,3);scrap+=looted*2;clears++}
 assert.equal(clears,5);assert.equal(guardian,true);
 const rifle=queueOrder(queue,'rifle',scrap,clears>=2);assert.ok(rifle);queue=rifle.queue;scrap=rifle.scrap;
 let completed=null;for(let t=0;t<65;t++){const result=tickProduction(queue,1,true);queue=result.queue;if(result.completed)completed=result.completed}
 assert.equal(completed,'rifle');assert.equal(queue.length,0);
 const armor=equipPlate({armor:0,plates:1});assert.deepEqual(armor,{armor:50,plates:0});assert.equal(absorbDamage(armor!.armor,11).healthDamage,3);
 assert.deepEqual(resolveCasualty(30,10),{hp:20,dead:false});
 assert.equal(campaignComplete(guardian,defenses,true),false);for(let wave=0;wave<3;wave++)defenses++;
 assert.equal(campaignComplete(guardian,defenses,true),true);
 assert.equal(campaignComplete(guardian,defenses,false),false);
});

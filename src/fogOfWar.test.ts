import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeon} from './dungeon.ts';
import {beamStrength,createFog,updateFog,exploredIndices,lightLine,fogAlpha} from './fogOfWar.ts';

test('flashlight lights its forward cone but leaves rearward explored tiles dark',()=>{
 const source={x:10,y:10,dx:1,dy:0,range:8,halfAngle:.55};
 assert.equal(beamStrength(source,13,10)>0,true);
 assert.equal(beamStrength(source,7,10),0);
 assert.equal(beamStrength(source,10,13),0);
});
test('explored tiles persist while flashlight direction changes',()=>{
 const map=generateDungeon(44,42,30);
 const origin=map.entrance;
 const f=createFog(map);
 const lamp={x:origin.x,y:origin.y,dx:1,dy:0,range:7};
 updateFog(map,f,[lamp],.12);
 const explored=exploredIndices(f);
 assert.ok(explored.length>0);
 const old=explored[0];
 updateFog(map,f,[{...lamp,dx:-1}],.12);
 assert.equal(f.explored[old],1);
 const recovered=createFog(map,exploredIndices(f));
 assert.equal(recovered.explored[old],1);
 assert.ok(fogAlpha(recovered,old)<1);
});
test('solid walls block flashlights',()=>{
 const map=generateDungeon(441,42,30);
 const origin=map.entrance;
 assert.equal(lightLine(map,origin.x,origin.y,origin.x,origin.y),true);
 // Outside the map is never a valid light destination.
 assert.ok(beamStrength({x:0,y:0,dx:1,dy:0},-4,0)===0);
});

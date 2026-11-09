import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSquadmate} from './squadSystems.ts';
import {formationDestination,pickTacticalTarget} from './squadCommandAI.ts';

test('tactical formations preserve individual squad spacing and exact hold positions',()=>{
 const player={x:10,y:10},heading={x:1,y:0},anchor={x:4,y:5};
 for(const order of ['follow','regroup','defensive','suppress'] as const){
  const points=Array.from({length:4},(_,i)=>formationDestination(order,player,heading,i,4,anchor));
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)
   assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>.7,order+' formation spacing');
 }
 assert.deepEqual(formationDestination('hold',player,heading,0,4,anchor),anchor);
 const flank=formationDestination('follow',player,{x:0,y:1},1,4,anchor);
 assert.ok(flank.x<player.x,'formation rotates with aim direction');
 assert.equal(makeSquadmate('heavy','unit',3,3).role,'heavy');
});
test('tactical target priorities respond to focus, defensive threats and suppress orders',()=>{
 const player={x:0,y:0},ally={x:6,y:0};
 const nearPlayer={x:1,y:0,alive:true,boss:false};
 const nearAlly={x:6.5,y:0,alive:true,boss:false};
 assert.equal(pickTacticalTarget('follow',ally,player,[nearPlayer,nearAlly]),nearAlly);
 assert.equal(pickTacticalTarget('defensive',ally,player,[nearPlayer,nearAlly]),nearPlayer);
 assert.equal(pickTacticalTarget('focus',ally,player,[nearPlayer,nearAlly],nearPlayer),nearPlayer);
 assert.equal(pickTacticalTarget('focus',ally,player,[nearPlayer,nearAlly],null),nearAlly);
 nearAlly.alive=false;
 assert.equal(pickTacticalTarget('follow',ally,player,[nearPlayer,nearAlly]),nearPlayer);
 assert.equal(pickTacticalTarget('suppress',ally,player,[]),null);
});

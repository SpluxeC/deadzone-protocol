import test from 'node:test';
import assert from 'node:assert/strict';
import {GRENADE_PRICE,GRENADE_TYPES,emptyGrenades,migrateGrenades,grantGrenade,grenadeCrateLoot,throwGrenade,advanceGrenade,blastDamage} from './grenades.ts';
test('grenade inventory stays separate, capped at two per type',()=>{
 const g=emptyGrenades();
 assert.deepEqual(GRENADE_TYPES,['frag','impact','stun','lure']);
 assert.equal(grantGrenade(g,'frag',1).added,1);
 assert.deepEqual(grantGrenade(g,'frag',3),{added:1,credits:60});
 assert.equal(g.frag,2);
 assert.deepEqual(migrateGrenades({frag:999,stun:-5}),{frag:2,impact:0,stun:0,lure:0});
 assert.deepEqual(GRENADE_PRICE,{frag:60,impact:50,stun:45,lure:40});
});
test('supply grenade drops deterministic and approximately twenty percent',()=>{
 let count=0;
 for(let i=0;i<10000;i++){
  const a=grenadeCrateLoot(1234,3,i);
  assert.deepEqual(a,grenadeCrateLoot(1234,3,i));
  if(a){count++;assert.ok(a.amount===1||a.amount===2)}
 }
 assert.ok(count>1600&&count<2400,'expected approximately 20 percent');
});
test('grenades use one and two second fuses independent of collisions',()=>{
 for(const [kind,seconds] of [['frag',2],['stun',1],['lure',1]] as const){
  const g=throwGrenade(kind,0,0,1,0);
  let time=0,detonated=false;
  while(time<seconds+.1&&!detonated){const result=advanceGrenade(g,.05,()=>true);time+=.05;detonated=result.detonate}
  assert.ok(detonated);
  assert.ok(Math.abs(time-seconds)<.1);
 }
});
test('explosive damage is stronger at center and frag exceeds impact',()=>{
 assert.ok(blastDamage('frag',0)>blastDamage('frag',2.9));
 assert.ok(blastDamage('frag',3)>blastDamage('impact',3));
 assert.equal(blastDamage('frag',3.01),0);
});

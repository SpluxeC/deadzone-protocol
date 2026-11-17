import test from 'node:test';
import assert from 'node:assert/strict';
import {GRENADE_PRICE,GRENADE_TYPES,emptyGrenades,migrateGrenades,grantGrenade,grenadeCrateLoot,throwGrenade,advanceGrenade,blastDamage} from './grenades.ts';
test('grenade inventory stays separate, capped at two per type',()=>{
 const g=emptyGrenades();
 assert.deepEqual(GRENADE_TYPES,['frag','impact','wire','lure','shock','incendiary']);
 assert.equal(grantGrenade(g,'frag',1).added,1);
 assert.deepEqual(grantGrenade(g,'frag',3),{added:1,credits:60});
 assert.equal(g.frag,2);
 assert.deepEqual(migrateGrenades({frag:999,stun:-5}),{frag:2,impact:0,wire:0,lure:0,shock:0,incendiary:0});
 assert.deepEqual(GRENADE_PRICE,{frag:60,impact:50,wire:65,lure:40,shock:70,incendiary:85});
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
 for(const [kind,seconds] of [['frag',2],['lure',1],['incendiary',2]] as const){
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

test('grenade travel is capped at six tiles in every direction',()=>{
 for(const type of GRENADE_TYPES){
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,-1]]){
   const grenade=throwGrenade(type,10,10,dx,dy);
   for(let tick=0;tick<80&&!grenade.fired;tick++){
    advanceGrenade(grenade,.05,()=>true);
    assert.ok(Math.hypot(grenade.x-10,grenade.y-10)<=6+1e-9,
     type+' should not travel beyond six tiles');
   }
  }
 }
});

test('new tactical consumables migrate into old saves without losing stock',()=>{
 const old=migrateGrenades({frag:1,impact:2,stun:1,lure:1} as never);
 assert.deepEqual(old,{frag:1,impact:2,wire:1,lure:1,shock:0,incendiary:0});
 assert.equal(grantGrenade(old,'shock',1).added,1);
 assert.equal(grantGrenade(old,'incendiary',2).added,2);
 assert.equal(grantGrenade(old,'incendiary',1).added,0);
});

test('shock pulse triggers on reaching throw range or a surface',()=>{
 const g=throwGrenade('shock',4,4,1,0);
 let result={detonate:false,ended:false};
 for(let i=0;i<30&&!result.detonate;i++)result=advanceGrenade(g,.05,()=>true);
 assert.equal(result.detonate,true);
 assert.ok(g.age<=.72);
 const blocked=throwGrenade('shock',4,4,1,0);
 const hit=advanceGrenade(blocked,.05,()=>false);
 assert.equal(hit.detonate,true);
});

test('barbed wire stock cap is three and excess becomes credits',()=>{
 const g=emptyGrenades();
 assert.equal(grantGrenade(g,'wire',5).added,3);
 assert.equal(g.wire,3);
 assert.equal(grantGrenade(g,'wire',1).added,0);
 assert.equal(migrateGrenades({wire:99}).wire,3);
});

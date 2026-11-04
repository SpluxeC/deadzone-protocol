import test from 'node:test';import assert from 'node:assert/strict';
import {makeSquadmate,migrateSquadmate,applyLethalDamage,bleed,revive,reviveDuration,shouldRevive,canRecruit,equipClassWeapon,classFireDelay,classRange,classDamage,gearUpgradeCost,CLASS_INFO,classIds,ALLY_BLEEDOUT,PLAYER_BLEEDOUT} from './squadSystems.ts';
import {newWeapon,canClassEquip,armoryOffers} from './equipmentArmory.ts';
test('all five specialist classes have valid distinct starting gear, abilities and prices',()=>{
 assert.equal(classIds.length,5);assert.equal(new Set(classIds.map(x=>CLASS_INFO[x].model)).size,5);
 for(const role of classIds){const unit=makeSquadmate(role,'abc',4,9);assert.equal(unit.role,role);assert.equal(canClassEquip(role,unit.weapon.model),true);assert.ok(CLASS_INFO[role].cost>0);assert.ok(CLASS_INFO[role].special.length>0)}
 assert.equal(canClassEquip('scout','lmg'),false);
 assert.equal(equipClassWeapon(makeSquadmate('medic','a',1,1),newWeapon('sniper',1,'s')),false);
 assert.equal(equipClassWeapon(makeSquadmate('scout','b',1,1),newWeapon('sniper',3,'s')),true);
});
test('bleed out and revive are mutually exclusive, death permanent for current run',()=>{
 const unit=makeSquadmate('rifleman','one',2,2);applyLethalDamage(unit,110,ALLY_BLEEDOUT);
 assert.equal(unit.hp,0);assert.equal(unit.downed,ALLY_BLEEDOUT);
 assert.equal(bleed(unit,ALLY_BLEEDOUT-1),false);assert.equal(revive(unit,33),true);
 assert.equal(unit.hp,33);assert.equal(unit.downed,0);
 applyLethalDamage(unit,200,ALLY_BLEEDOUT);assert.equal(bleed(unit,ALLY_BLEEDOUT),true);assert.equal(unit.dead,true);
 assert.equal(revive(unit,100),false);
 assert.equal(PLAYER_BLEEDOUT,30);
});
test('medics revive faster and team priorities respect tactical orders',()=>{
 assert.ok(reviveDuration('medic')<reviveDuration('rifleman'));
 assert.equal(shouldRevive('defensive','heavy'),true);
 assert.equal(shouldRevive('hold','heavy'),false);
 assert.equal(shouldRevive('hold','medic'),true);
 assert.equal(canRecruit(3),true);assert.equal(canRecruit(4),false);
 assert.ok(classRange('scout')>classRange('engineer'));
 assert.ok(classFireDelay('heavy')<classFireDelay('scout'));
 assert.ok(classDamage('scout',3)>classDamage('scout',1));
});
test('legacy Phase 1-3 squad saves migrate to default riflemen',()=>{
 const old={x:2,y:3,hp:55,name:'Old Ally',cooldown:0};
 const unit=migrateSquadmate(old,1);assert.equal(unit.role,'rifleman');assert.equal(unit.name,'Old Ally');
 assert.equal(unit.hp,55);assert.equal(unit.downed,0);assert.equal(unit.weapon.model,'assault');
 const medic=migrateSquadmate({...old,role:'medic'},0);assert.equal(medic.role,'medic');assert.equal(medic.weapon.model,'smg');
});
test('class tier upgrades cost more while remaining finite up to legendary',()=>{
 const ally=makeSquadmate('engineer','e',1,1);const p=gearUpgradeCost(ally);ally.gearTier=3;assert.ok(gearUpgradeCost(ally)>p);ally.gearTier=5;assert.equal(gearUpgradeCost(ally),Infinity);
});
test('rotating recruit offers contain a real allowed specialist',()=>{
 for(let w=1;w<=24;w++){const offer=armoryOffers(1223,w,0).find(v=>v.kind==='recruit');assert.ok(offer);assert.ok(classIds.includes(offer!.model as typeof classIds[number]));assert.equal(offer!.price,CLASS_INFO[offer!.model as keyof typeof CLASS_INFO].cost)}
});

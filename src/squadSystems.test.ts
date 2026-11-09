import test from 'node:test';import assert from 'node:assert/strict';
import {makeSquadmate,migrateSquadmate,applyLethalDamage,bleed,revive,reviveDuration,shouldRevive,canRecruit,equipClassWeapon,classFireDelay,classRange,classDamage,gearUpgradeCost,CLASS_INFO,classIds,ALLY_BLEEDOUT,PLAYER_BLEEDOUT,squadWeapon,setSquadWeaponSlot,refillSquadAmmo,squadAmmoNeeded,squadAmmoRefillPrice,SQUAD_MAX_AMMO} from './squadSystems.ts';
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
test('class rarity upgrades cost more through legendary and finish at exotic',()=>{
 const ally=makeSquadmate('engineer','e',1,1);const p=gearUpgradeCost(ally);ally.gearTier=3;assert.ok(gearUpgradeCost(ally)>p);ally.gearTier=5;assert.ok(Number.isFinite(gearUpgradeCost(ally)));ally.gearTier=6;assert.equal(gearUpgradeCost(ally),Infinity);
});
test('rotating recruit offers contain a real allowed specialist',()=>{
 for(let w=1;w<=24;w++){const offer=armoryOffers(1223,w,0).find(v=>v.kind==='recruit');assert.ok(offer);assert.ok(classIds.includes(offer!.model as typeof classIds[number]));assert.equal(offer!.price,CLASS_INFO[offer!.model as keyof typeof CLASS_INFO].cost)}
});

test('squadmate loadouts support separate primary, secondary and melee weapons',()=>{
 const ally=makeSquadmate('rifleman','loadout-01',3,4);
 assert.equal(ally.weapon.model,'assault');
 assert.equal(ally.secondaryWeapon.model,'pistol');
 assert.equal(ally.meleeWeapon.model,'knife');
 assert.equal(ally.activeSlot,'primary');
 assert.equal(setSquadWeaponSlot(ally,'secondary'),true);
 assert.equal(squadWeapon(ally).model,'pistol');
 assert.equal(equipClassWeapon(ally,newWeapon('revolver',2,'sidearm')),true);
 assert.equal(squadWeapon(ally).model,'revolver');
 assert.equal(equipClassWeapon(ally,newWeapon('machete',2,'blade')),true);
 assert.equal(setSquadWeaponSlot(ally,'melee'),true);
 assert.equal(squadWeapon(ally).model,'machete');
 assert.equal(setSquadWeaponSlot(ally,'primary'),true);
 assert.equal(squadWeapon(ally).model,'assault');
});
test('refill all squad ammo respects the 400-round capacity and skips dead NPCs',()=>{
 const a=makeSquadmate('heavy','heavy',2,2),b=makeSquadmate('medic','medic',3,3),dead=makeSquadmate('scout','dead',4,4);
 a.magReserve=45;b.magReserve=300;dead.magReserve=0;dead.dead=true;
 assert.equal(squadAmmoNeeded([a,b,dead]),(SQUAD_MAX_AMMO-45)+(SQUAD_MAX_AMMO-300));
 assert.equal(refillSquadAmmo([a,b,dead]),455);
 assert.equal(a.magReserve,400);
 assert.equal(b.magReserve,400);
 assert.equal(dead.magReserve,0);
 assert.equal(refillSquadAmmo([a,b,dead]),0);
});
test('old squad saves gain sidearm and melee without losing primary gear',()=>{
 const saved=makeSquadmate('engineer','old',8,9);
 const legacy={...saved};delete (legacy as Partial<typeof legacy>).secondaryWeapon;
 delete (legacy as Partial<typeof legacy>).meleeWeapon;
 delete (legacy as Partial<typeof legacy>).activeSlot;
 const restored=migrateSquadmate(legacy,0);
 assert.equal(restored.weapon.model,'shotgun');
 assert.equal(restored.secondaryWeapon.model,'pistol');
 assert.equal(restored.meleeWeapon.model,'knife');
 assert.equal(restored.activeSlot,'primary');
});

test('squad refill price scales with only the missing ammunition and is zero when full',()=>{
 const ally=makeSquadmate('rifleman','priceA',1,1),other=makeSquadmate('medic','priceB',2,2);
 ally.magReserve=SQUAD_MAX_AMMO;other.magReserve=SQUAD_MAX_AMMO;
 assert.equal(squadAmmoRefillPrice([ally,other]),0,'full squad should not be charged');
 other.magReserve=320;
 assert.equal(squadAmmoRefillPrice([ally,other]),150,'80 rounds cost 150 credits');
 other.magReserve=399;
 assert.equal(squadAmmoRefillPrice([ally,other]),2,'one round is prorated and rounded up');
 other.magReserve=200;ally.magReserve=240;
 assert.equal(squadAmmoRefillPrice([ally,other]),675,'360 total missing rounds are billed once');
 const priced=squadAmmoRefillPrice([ally,other]);
 assert.equal(refillSquadAmmo([ally,other]),360);
 assert.equal(priced,675);
 assert.equal(squadAmmoRefillPrice([ally,other]),0);
 other.dead=true;other.magReserve=0;
 assert.equal(squadAmmoRefillPrice([ally,other]),0,'dead squadmates are not included');
});
test('random Armory inventory rotates for different wave seeds without manual rerolls',()=>{
 const seed=14039;
 const first=armoryOffers(seed,2,0).map(x=>x.model);
 const second=armoryOffers(seed^Math.imul(3,0x9e3779b1),3,0).map(x=>x.model);
 assert.notDeepEqual(first,second,'next wave should generate another random offer selection');
 assert.deepEqual(first,armoryOffers(seed,2,0).map(x=>x.model),'same wave remains stable');
});

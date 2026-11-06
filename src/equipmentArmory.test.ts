import test from 'node:test';import assert from 'node:assert/strict';
import {weaponDefs,attachmentDefs,attachmentDescriptions,ammoPack,ammoTypes,newWeapon,newMod,canEquipMod,canClassEquip,effectiveStats,emptyAmmo,usedSlots,canAddItem,addAmmo,rarityForWave,armoryOffers,rareLoot,upgradePrice,weaponPrice,salePrice,backpackUpgradePrice,ammoStack} from './equipmentArmory.ts';
test('five tiers improve weapon stats without changing weapon category',()=>{
 const basic=newWeapon('assault',1,'base'),legendary=newWeapon('assault',5,'legend');
 assert.ok(effectiveStats(legendary).damage>effectiveStats(basic).damage);
 assert.ok(effectiveStats(legendary).rate<effectiveStats(basic).rate);
 assert.ok(effectiveStats(legendary).capacity===effectiveStats(basic).capacity);
 assert.equal(weaponDefs.assault.ammo,'rifle');
 for(const w of Object.values(weaponDefs))assert.ok(w.allowed.length>0);
});
test('four compatible attachment categories stack and incompatible mods reject',()=>{
 const gun=newWeapon('assault',3,'gun'),none=effectiveStats(gun);
 const mods=[newMod('redDot',2,'optic'),newMod('suppressor',3,'barrel'),newMod('extended',4,'mag'),newMod('grip',2,'grip')];
 for(const mod of mods){assert.equal(canEquipMod(gun,mod),true);gun.mods[attachmentDefs[mod.model].slot]=mod}
 assert.equal(Object.keys(gun.mods).length,4);
 const enhanced=effectiveStats(gun);assert.ok(enhanced.accuracy>none.accuracy);
 assert.ok(enhanced.capacity>none.capacity);assert.ok(enhanced.noise<none.noise);
 const shotgun=newWeapon('shotgun',2,'shotgun');assert.equal(canEquipMod(shotgun,newMod('suppressor',1,'s')),false);
 assert.equal(canEquipMod(shotgun,newMod('grip',1,'g')),true);
});
test('class-specific restrictions and separate ammo families',()=>{
 assert.equal(canClassEquip('medic','pistol'),true);assert.equal(canClassEquip('medic','lmg'),false);
 assert.equal(canClassEquip('heavy','lmg'),true);assert.equal(canClassEquip('scout','sniper'),true);
 assert.equal(canClassEquip('rifleman','sniper'),false);
 assert.equal(new Set(Object.values(weaponDefs).map(w=>w.ammo).filter(Boolean)).size,5);
 assert.equal(ammoTypes.length,5);
});
test('backpack slots count loose gear, ammo stacks and medkits, without exceeding capacity',()=>{
 const ammo=emptyAmmo(),bag=[newWeapon('pistol',1,'p')];
 assert.equal(usedSlots(bag,ammo,2),2);
 const added=addAmmo(ammo,'rifle',120,bag,2,4);assert.equal(added,120);
 assert.equal(usedSlots(bag,ammo,2),4);
 assert.equal(canAddItem(bag,ammo,2,4),false);
 assert.equal(addAmmo(ammo,'shotgun',18,bag,2,4),0);
 ammo.rifle=0;assert.equal(usedSlots(bag,ammo,2),2);
 assert.equal(ammoStack.light,90);
 assert.equal(backpackUpgradePrice(24),Infinity);
 assert.ok(backpackUpgradePrice(12)<backpackUpgradePrice(20));
});
test('rotating Armory offers are repeatable per seed/wave/reroll and cost scales with tier',()=>{
 const a=armoryOffers(441,12,0),b=armoryOffers(441,12,0),c=armoryOffers(441,12,1);
 assert.deepEqual(a,b);assert.notDeepEqual(a,c);assert.equal(a.length,10);
 assert.equal(a.filter(o=>o.kind==='weapon').length,5);assert.equal(a.filter(o=>o.kind==='attachment').length,4);
 assert.equal(a.filter(o=>o.kind==='recruit').length,1);
 assert.ok(weaponPrice('assault',5)>weaponPrice('assault',1));
 const x=newWeapon('assault',2,'a');assert.ok(upgradePrice(x)>weaponPrice('assault',3));assert.ok(salePrice(x)<weaponPrice('assault',2));
});
test('loot is seeded, bosses grant guaranteed equipment, later waves offer higher rarity',()=>{
 assert.deepEqual(rareLoot(715,10,3),rareLoot(715,10,3));
 assert.ok(rareLoot(715,5,999,true));
 assert.equal(rarityForWave(1,.9),1);
 assert.equal(rarityForWave(21,.3),5);
 assert.ok(ammoPack.heavy.price>ammoPack.light.price);
});

test('expanded weapon categories remain compatible with the Armory, class permissions, and tier progression',()=>{
 const expected=['revolver','machinePistol','compactSmg','suppressedSmg','battleRifle','burstRifle','doubleBarrel','tacticalShotgun','heavyMarksman','machete','bat','crowbar','squadAutomatic','heavyMachineGun'] as const;
 for(const model of expected){
  const definition=weaponDefs[model],item=newWeapon(model,1,'expanded-'+model);
  assert.equal(item.model,model);
  assert.ok(definition.damage>0&&definition.allowed.length>0);
  assert.ok(weaponPrice(model,2)>weaponPrice(model,1));
  assert.ok(effectiveStats(item).range>0);
 }
 assert.equal(weaponDefs.revolver.slot,'secondary');
 assert.equal(weaponDefs.machete.slot,'melee');
 assert.equal(weaponDefs.battleRifle.slot,'primary');
 assert.ok(canEquipMod(newWeapon('battleRifle',1,'battle'),newMod('scope',1,'scope')));
 assert.equal(canClassEquip('scout','heavyMarksman'),true);
 const offers=armoryOffers(311,4,0);
 assert.equal(offers.filter(o=>o.kind==='weapon'&&weaponDefs[o.model as keyof typeof weaponDefs].slot==='secondary').length,1);
 assert.equal(offers.filter(o=>o.kind==='weapon'&&weaponDefs[o.model as keyof typeof weaponDefs].slot==='melee').length,1);
});

test('all Armory attachments explain their effect in plain language',()=>{
 const keys=Object.keys(attachmentDefs).sort();
 assert.deepEqual(Object.keys(attachmentDescriptions).sort(),keys);
 for(const key of keys){
  const description=attachmentDescriptions[key as keyof typeof attachmentDescriptions];
  assert.ok(description.length>=16&&description.length<=90);
  assert.ok(description.endsWith('.'));
 }
});

test('new attachment effects scale with tiers and respect four exclusive mounting slots',()=>{
 const models=['holoSight','reflexSight','variableScope','flashHider','portedBarrel','drumMag','lightMag','angledGrip','laserSight'] as const;
 const rifle=newWeapon('assault',1,'gun');
 const baseline=effectiveStats(rifle);
 for(const model of models){
  const mod=newMod(model,3,'new-'+model);
  assert.ok(canEquipMod(rifle,mod),model);
  const field=attachmentDefs[model].slot;
  rifle.mods[field]=mod;
  const modified=effectiveStats(rifle);
  assert.notDeepEqual(modified,baseline,model);
  rifle.mods[field]=undefined;
 }
 rifle.mods.magazine=newMod('drumMag',3,'drum');
 const big=effectiveStats(rifle);
 assert.ok(big.capacity>baseline.capacity);
 assert.ok(big.reload>baseline.reload);
 rifle.mods.magazine=newMod('lightMag',3,'light');
 assert.ok(effectiveStats(rifle).reload<baseline.reload);
 rifle.mods.magazine=undefined;
 rifle.mods.optic=newMod('variableScope',3,'zoom');
 assert.ok(effectiveStats(rifle).range>baseline.range);
 assert.ok(effectiveStats(rifle).rate>baseline.rate);
 assert.equal(canEquipMod(newWeapon('knife',1,'knife'),newMod('laserSight',1,'l')),false);
});
test('rotating Armory always offers one of each attachment mount type',()=>{
 for(const seed of [1,2,33,511]){
  const offers=armoryOffers(seed,7,0).filter(o=>o.kind==='attachment');
  assert.deepEqual(offers.map(o=>attachmentDefs[o.model as keyof typeof attachmentDefs].slot),
   ['optic','barrel','magazine','underbarrel']);
  assert.equal(new Set(offers.map(o=>o.model)).size,4);
 }
});

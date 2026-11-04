import test from 'node:test';import assert from 'node:assert/strict';
import {migrateProfile,buyUnlock,allowedPrimary,allowedMelee,allowedTeammates,sanitizeChoice,startingKit,progressAchievements,performancePayout,eligibleRecruit,unlocks,type RunPerformance} from './metaprogression.ts';
test('Phase 1-4 profiles migrate without discarding currency, allies or previous bonuses',()=>{
 const p=migrateProfile({tokens:120,bestWave:9,runs:4,startingCredits:150,startAlly:true});
 assert.equal(p.tokens,120);assert.equal(p.bestWave,9);assert.equal(p.startingCredits,150);assert.equal(p.startAlly,true);
 assert.deepEqual(allowedPrimary(p),['carbine']);assert.deepEqual(allowedTeammates(p),['none','rifleman']);
});
test('starting loadout selection only permits permanently unlocked options and starts Common tier',()=>{
 const p=migrateProfile({tokens:800,startAlly:true});
 assert.equal(buyUnlock(p,'starterAssault'),true);assert.equal(buyUnlock(p,'starterAxe'),true);
 assert.equal(buyUnlock(p,'starterRedDot'),true);assert.equal(buyUnlock(p,'starterGrip'),true);
 assert.equal(buyUnlock(p,'startingBackpack'),true);assert.equal(buyUnlock(p,'starterArmor'),true);
 assert.equal(buyUnlock(p,'classMedic'),true);
 p.chosen={primary:'assault',secondary:'pistol',melee:'axe',optic:'redDot',underbarrel:'grip',teammate:'medic'};
 const kit=startingKit(p);
 assert.equal(kit.loadout.primary?.model,'assault');assert.equal(kit.loadout.primary?.tier,1);
 assert.equal(kit.loadout.melee?.model,'axe');assert.equal(kit.loadout.primary?.mods.optic?.model,'redDot');
 assert.equal(kit.loadout.primary?.mods.underbarrel?.model,'grip');
 assert.equal(kit.teammate,'medic');assert.equal(kit.capacity,16);assert.equal(kit.armor,65);
 assert.equal(kit.ammo.rifle,72);assert.equal(kit.ammo.light,48);
});
test('unavailable or incompatible options fall back safely',()=>{
 const p=migrateProfile({chosen:{primary:'sniper',secondary:'pistol',melee:'axe',optic:'redDot',underbarrel:'grip',teammate:'heavy'}});
 assert.equal(p.chosen.primary,'carbine');assert.equal(p.chosen.melee,'knife');assert.equal(p.chosen.teammate,'none');
 assert.equal(p.chosen.optic,'none');assert.equal(p.chosen.underbarrel,'none');
 assert.equal(eligibleRecruit(p,'rifleman'),true);assert.equal(eligibleRecruit(p,'engineer'),false);
 assert.deepEqual(allowedMelee(p),['knife']);
 assert.equal(buyUnlock(p,'starterSmg'),false);
});
test('achievement payouts are one-time and do not multiply on saves or retries',()=>{
 const p=migrateProfile(null);const metrics:RunPerformance={cleared:10,bosses:2,killsTotal:120,lootedTotal:15,flawlessWaves:2,bestSquad:4};
 const first=progressAchievements(p,metrics),tokens=p.tokens;
 assert.ok(first.reward>0);assert.ok(first.names.includes('Ten Deep'));
 const second=progressAchievements(p,metrics);assert.equal(second.reward,0);assert.equal(p.tokens,tokens);
 assert.equal(p.achievements.length,new Set(p.achievements).size);
});
test('performance rewards remain modest and deterministic',()=>{
 const empty:RunPerformance={cleared:0,bosses:0,killsTotal:0,lootedTotal:0,flawlessWaves:0,bestSquad:0};
 assert.equal(performancePayout(empty),0);
 assert.ok(performancePayout({...empty,killsTotal:100,flawlessWaves:2})>0);assert.ok(performancePayout({...empty,killsTotal:1})>0);
 assert.ok(performancePayout({...empty,killsTotal:10000,flawlessWaves:50,lootedTotal:1000})<=120);
 assert.ok(Object.keys(unlocks).length>=12);
});

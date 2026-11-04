import {weaponDefs,attachmentDefs,newWeapon,newMod,canEquipMod,usedSlots,type WeaponId,type AttachmentId,type Tier,type Loadout,type AmmoBank,type Mod,type Weapon} from './equipmentArmory.ts';
import type {ClassId} from './equipmentArmory.ts';
import {classIds} from './squadSystems.ts';
export type UnlockId='starterSmg'|'starterAssault'|'starterShotgun'|'starterMarksman'|'starterAxe'|'starterRedDot'|'starterGrip'|'starterArmor'|'starterMedkit'|'startingBackpack'|'armoryCatalog'|'classMedic'|'classHeavy'|'classScout'|'classEngineer';
export type UnlockDef={label:string;description:string;cost:number;group:string};
export const unlocks:Record<UnlockId,UnlockDef>={
 starterSmg:{label:'Starting SMG',description:'Choose a Common tactical SMG for Wave 1.',cost:35,group:'Starter Weapons'},
 starterAssault:{label:'Starting Assault Rifle',description:'Choose a Common assault rifle for Wave 1.',cost:55,group:'Starter Weapons'},
 starterShotgun:{label:'Starting Shotgun',description:'Choose a Common pump shotgun for Wave 1.',cost:55,group:'Starter Weapons'},
 starterMarksman:{label:'Starting Marksman Rifle',description:'Choose a Common marksman rifle for Wave 1.',cost:70,group:'Starter Weapons'},
 starterAxe:{label:'Starting Fire Axe',description:'Equip an alternate Common melee weapon.',cost:25,group:'Starter Weapons'},
 starterRedDot:{label:'Starting Red Dot',description:'Choose a Common optic when compatible.',cost:30,group:'Attachments'},
 starterGrip:{label:'Starting Foregrip',description:'Choose a Common grip when compatible.',cost:35,group:'Attachments'},
 starterArmor:{label:'Starting Armor +15',description:'Increase the starting armor ceiling to 65.',cost:50,group:'Survival'},
 starterMedkit:{label:'Starting Medkit +1',description:'Start with three medkits instead of two.',cost:45,group:'Survival'},
 startingBackpack:{label:'Starting Backpack +4',description:'Begin each run with 16 backpack slots.',cost:65,group:'Survival'},
 armoryCatalog:{label:'Expanded Armory Catalog',description:'Unlock additional rotating special offers.',cost:90,group:'Armory'},
 classMedic:{label:'Recruitable Medic',description:'Add Medics to rotating recruitment offers and starting-squad choices.',cost:40,group:'Specialists'},
 classHeavy:{label:'Recruitable Heavy Gunner',description:'Unlock Heavy Gunner recruitment and starting-squad choice.',cost:45,group:'Specialists'},
 classScout:{label:'Recruitable Scout',description:'Unlock Scout recruitment and starting-squad choice.',cost:45,group:'Specialists'},
 classEngineer:{label:'Recruitable Engineer',description:'Unlock Engineer recruitment and starting-squad choice.',cost:45,group:'Specialists'}
};
export type AchievementId='firstWave'|'bossHunter'|'deepDelver'|'waveTen'|'waveTwenty'|'collector'|'noHit'|'survivor'|'centurion';
export const achievements:Record<AchievementId,{label:string;description:string;reward:number}>={
 firstWave:{label:'First Clearance',description:'Clear your first wave.',reward:10},
 bossHunter:{label:'Boss Breaker',description:'Defeat your first boss.',reward:20},
 deepDelver:{label:'Dedicated Survivor',description:'Complete five waves in one run.',reward:15},
 waveTen:{label:'Ten Deep',description:'Complete ten waves in one run.',reward:30},
 waveTwenty:{label:'Against All Odds',description:'Complete twenty waves in one run.',reward:60},
 collector:{label:'Scavenger',description:'Loot ten containers across one run.',reward:20},
 noHit:{label:'Untouchable',description:'Clear any wave without losing health or armor.',reward:15},
 survivor:{label:'Team Player',description:'Finish a wave with a full four-member AI squad.',reward:15},
 centurion:{label:'Exterminator',description:'Kill one hundred infected during one run.',reward:30}
};
export type ProfileV5={tokens:number;bestWave:number;runs:number;startingCredits:number;startAlly:boolean;unlocked:UnlockId[];achievements:AchievementId[];chosen:StartingChoice};
export type StartingChoice={primary:WeaponId;secondary:'pistol';melee:'knife'|'axe';optic:'none'|'redDot';underbarrel:'none'|'grip';teammate:'none'|ClassId};
export const defaultChoice=():StartingChoice=>({primary:'carbine',secondary:'pistol',melee:'knife',optic:'none',underbarrel:'none',teammate:'none'});
export function migrateProfile(raw:unknown):ProfileV5{
 const p=(raw&&typeof raw==='object'?raw:{}) as Partial<ProfileV5>;
 const owned=Array.isArray(p.unlocked)?p.unlocked.filter((v):v is UnlockId=>typeof v==='string'&&v in unlocks):[];
 const achieved=Array.isArray(p.achievements)?p.achievements.filter((v):v is AchievementId=>typeof v==='string'&&v in achievements):[];
 const profile:ProfileV5={tokens:safeInt(p.tokens),bestWave:safeInt(p.bestWave),runs:safeInt(p.runs),startingCredits:Math.min(200,safeInt(p.startingCredits)),startAlly:!!p.startAlly,unlocked:[...new Set(owned)],achievements:[...new Set(achieved)],chosen:{...defaultChoice(),...(p.chosen||{})}};
 profile.chosen=sanitizeChoice(profile,profile.chosen);return profile;
}
function safeInt(v:unknown):number{return typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.floor(v)):0}
export function unlockAllowed(profile:ProfileV5,id:UnlockId):boolean{return !profile.unlocked.includes(id)&&profile.tokens>=unlocks[id].cost}
export function buyUnlock(profile:ProfileV5,id:UnlockId):boolean{
 if(!unlockAllowed(profile,id))return false;
 profile.tokens-=unlocks[id].cost;profile.unlocked.push(id);profile.chosen=sanitizeChoice(profile,profile.chosen);return true;
}
export function allowedPrimary(p:ProfileV5):WeaponId[]{
 const ids:WeaponId[]=['carbine'];
 for(const [id,weapon] of [['starterSmg','smg'],['starterAssault','assault'],['starterShotgun','shotgun'],['starterMarksman','marksman']] as [UnlockId,WeaponId][])if(p.unlocked.includes(id))ids.push(weapon);
 return ids;
}
export function allowedMelee(p:ProfileV5):('knife'|'axe')[]{return p.unlocked.includes('starterAxe')?['knife','axe']:['knife']}
export function allowedTeammates(p:ProfileV5):('none'|ClassId)[]{
 if(!p.startAlly)return ['none'];
 return ['none','rifleman',...classIds.filter(c=>c!=='rifleman'&&p.unlocked.includes(('class'+c.charAt(0).toUpperCase()+c.slice(1)) as UnlockId))];
}
export function sanitizeChoice(profile:ProfileV5,choice:StartingChoice):StartingChoice{
 const c=choice||defaultChoice();
 return {primary:allowedPrimary(profile).includes(c.primary)?c.primary:'carbine',
 secondary:'pistol',melee:allowedMelee(profile).includes(c.melee)?c.melee:'knife',
 optic:c.optic==='redDot'&&profile.unlocked.includes('starterRedDot')?'redDot':'none',
 underbarrel:c.underbarrel==='grip'&&profile.unlocked.includes('starterGrip')?'grip':'none',
 teammate:allowedTeammates(profile).includes(c.teammate)?c.teammate:'none'};
}
export function startingKit(profile:ProfileV5):{loadout:Loadout;ammo:AmmoBank;armor:number;medkits:number;capacity:number;teammate:'none'|ClassId;credits:number}{
 const c=sanitizeChoice(profile,profile.chosen),primary=newWeapon(c.primary,1,'starter-primary'),secondary=newWeapon('pistol',1,'starter-secondary'),melee=newWeapon(c.melee,1,'starter-melee');
 if(c.optic==='redDot'&&canEquipMod(primary,newMod('redDot',1,'starter-optic')))primary.mods.optic=newMod('redDot',1,'starter-optic');
 if(c.underbarrel==='grip'&&canEquipMod(primary,newMod('grip',1,'starter-grip')))primary.mods.underbarrel=newMod('grip',1,'starter-grip');
 const ammo:AmmoBank={light:48,rifle:0,shotgun:0,heavy:0,precision:0};
 const primaryType=weaponDefs[c.primary].ammo;if(primaryType)ammo[primaryType]+=72;
 const capacity=profile.unlocked.includes('startingBackpack')?16:12;
 return {loadout:{primary,secondary,melee},ammo,armor:profile.unlocked.includes('starterArmor')?65:50,medkits:profile.unlocked.includes('starterMedkit')?3:2,capacity,teammate:c.teammate,credits:500+profile.startingCredits};
}
export type RunPerformance={cleared:number;bosses:number;killsTotal:number;lootedTotal:number;flawlessWaves:number;bestSquad:number};
export function progressAchievements(p:ProfileV5,m:RunPerformance):{names:string[];reward:number}{
 const checks:Record<AchievementId,boolean>={firstWave:m.cleared>=1,bossHunter:m.bosses>=1,deepDelver:m.cleared>=5,waveTen:m.cleared>=10,waveTwenty:m.cleared>=20,collector:m.lootedTotal>=10,noHit:m.flawlessWaves>=1,survivor:m.bestSquad>=4&&m.cleared>0,centurion:m.killsTotal>=100};
 const names:string[]=[];let reward=0;
 for(const [key,valid] of Object.entries(checks) as [AchievementId,boolean][])if(valid&&!p.achievements.includes(key)){p.achievements.push(key);reward+=achievements[key].reward;names.push(achievements[key].label)}
 p.tokens+=reward;return {names,reward};
}
export function performancePayout(p:RunPerformance):number{return Math.min(120,(p.killsTotal>0?2:0)+Math.floor(p.killsTotal/20)*2+Math.min(12,p.flawlessWaves)*3+Math.floor(p.lootedTotal/8)*2)}
export function eligibleRecruit(p:ProfileV5,role:ClassId):boolean{return role==='rifleman'||p.unlocked.includes(('class'+role.charAt(0).toUpperCase()+role.slice(1)) as UnlockId)}

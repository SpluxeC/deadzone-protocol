/** Phase 3 shared equipment, loot, backpack and Armory rules. All values are run-scoped. */
export type Tier=1|2|3|4|5|6;
export type RarityName='Basic'|'Common'|'Uncommon'|'Rare'|'Legendary'|'Exotic';
export const rarityNames:Record<Tier,RarityName>={1:'Basic',2:'Common',3:'Uncommon',4:'Rare',5:'Legendary',6:'Exotic'};
export function rarityName(tier:number):RarityName{return rarityNames[Math.max(1,Math.min(6,Math.floor(Number.isFinite(tier)?tier:1))) as Tier]}
export function rarityClass(tier:number):string{return 'rarity-'+rarityName(tier).toLowerCase()}
export function gearLabel(item:Gear):string{return (item.kind==='weapon'?weaponDefs[item.model].name:attachmentDefs[item.model].name)+' · '+rarityName(item.tier)}
export type AmmoType='light'|'rifle'|'shotgun'|'heavy'|'precision';
export type Slot='primary'|'secondary'|'melee';
export type AttachmentSlot='optic'|'barrel'|'magazine'|'underbarrel';
export type ClassId='rifleman'|'medic'|'heavy'|'scout'|'engineer';
export type WeaponId='pistol'|'revolver'|'machinePistol'|'smg'|'compactSmg'|'suppressedSmg'|'carbine'|'assault'|'battleRifle'|'burstRifle'|'shotgun'|'autoShotgun'|'doubleBarrel'|'tacticalShotgun'|'lmg'|'squadAutomatic'|'heavyMachineGun'|'marksman'|'heavyMarksman'|'sniper'|'knife'|'axe'|'machete'|'bat'|'crowbar';
export type AttachmentId='redDot'|'scope'|'holoSight'|'reflexSight'|'variableScope'|'suppressor'|'compensator'|'longBarrel'|'flashHider'|'portedBarrel'|'extended'|'quickMag'|'drumMag'|'lightMag'|'grip'|'bipod'|'angledGrip'|'laserSight';
export type Mod={id:string;kind:'attachment';model:AttachmentId;tier:Tier};
export type Weapon={id:string;kind:'weapon';model:WeaponId;tier:Tier;mag:number;mods:Partial<Record<AttachmentSlot,Mod>>};
export type Gear=Weapon|Mod;
export type AmmoBank=Record<AmmoType,number>;
export type Loadout={primary:Weapon|null;secondary:Weapon|null;melee:Weapon|null};
export type ArmoryOffer={kind:'weapon'|'attachment'|'recruit';model:string;tier:Tier;price:number};
export type WeaponDef={name:string;slot:Slot;ammo:AmmoType|null;damage:number;mag:number;rate:number;range:number;reload:number;penetration?:number;allowed:ClassId[]};
export const weaponDefs:Record<WeaponId,WeaponDef>={
 revolver:{name:'Heavy Revolver',slot:'secondary',ammo:'light',damage:3.6,mag:6,rate:.72,range:8,reload:2.0,allowed:['rifleman','medic','heavy','scout','engineer']},
 machinePistol:{name:'Machine Pistol',slot:'secondary',ammo:'light',damage:1.05,mag:22,rate:.11,range:5,reload:1.55,allowed:['rifleman','medic','heavy','scout','engineer']},
 pistol:{name:'Service Pistol',slot:'secondary',ammo:'light',damage:1.3,mag:12,rate:.33,range:6,reload:1.2,allowed:['rifleman','medic','heavy','scout','engineer']},
 smg:{name:'Tactical SMG',slot:'primary',ammo:'light',damage:1.25,mag:32,rate:.12,range:5.8,reload:1.65,allowed:['rifleman','medic','engineer']},
 compactSmg:{name:'Compact SMG',slot:'primary',ammo:'light',damage:1.15,mag:26,rate:.11,range:5.2,reload:1.4,allowed:['rifleman','medic','engineer']},
 suppressedSmg:{name:'Integrally Suppressed SMG',slot:'primary',ammo:'light',damage:1.35,mag:28,rate:.14,range:6.2,reload:1.8,allowed:['rifleman','medic','scout']},
 carbine:{name:'Light Carbine',slot:'primary',ammo:'rifle',damage:2.2,mag:25,rate:.21,range:7,reload:1.55,allowed:['rifleman','medic']},
 assault:{name:'Assault Rifle',slot:'primary',ammo:'rifle',damage:2.45,mag:30,rate:.17,range:8,reload:1.85,allowed:['rifleman']},
 battleRifle:{name:'Battle Rifle',slot:'primary',ammo:'rifle',damage:3.6,mag:20,rate:.32,range:9,reload:2.1,allowed:['rifleman','heavy']},
 burstRifle:{name:'Burst Rifle',slot:'primary',ammo:'rifle',damage:2.7,mag:27,rate:.23,range:8.5,reload:1.75,allowed:['rifleman','scout']},
 shotgun:{name:'Pump Shotgun',slot:'primary',ammo:'shotgun',damage:5.4,mag:6,rate:.8,range:4,reload:2.1,allowed:['heavy','engineer']},
 autoShotgun:{name:'Auto Shotgun',slot:'primary',ammo:'shotgun',damage:4.8,mag:10,rate:.38,range:4.4,reload:2.3,allowed:['heavy']},
 doubleBarrel:{name:'Double-Barrel Shotgun',slot:'primary',ammo:'shotgun',damage:7.0,mag:2,rate:1.03,range:4.3,reload:2.15,allowed:['heavy','engineer']},
 tacticalShotgun:{name:'Tactical Shotgun',slot:'primary',ammo:'shotgun',damage:5.6,mag:8,rate:.62,range:4.8,reload:2.35,allowed:['heavy','engineer']},
 lmg:{name:'Light Machine Gun',slot:'primary',ammo:'heavy',damage:2.2,mag:70,rate:.095,range:8,reload:3.7,allowed:['heavy']},
 squadAutomatic:{name:'Squad Automatic Weapon',slot:'primary',ammo:'heavy',damage:2.05,mag:55,rate:.09,range:7.8,reload:3.1,allowed:['heavy']},
 heavyMachineGun:{name:'Heavy Machine Gun',slot:'primary',ammo:'heavy',damage:3.0,mag:90,rate:.13,range:8.4,reload:4.2,allowed:['heavy']},
 marksman:{name:'Marksman Rifle',slot:'primary',ammo:'precision',damage:5.1,mag:15,rate:.47,range:11,reload:2,penetration:1,allowed:['scout']},
 heavyMarksman:{name:'Heavy Marksman Rifle',slot:'primary',ammo:'precision',damage:6.8,mag:10,rate:.68,range:12,reload:2.6,penetration:1,allowed:['scout','heavy']},
 sniper:{name:'Sniper Rifle',slot:'primary',ammo:'precision',damage:8.1,mag:5,rate:1.08,range:13,reload:2.6,penetration:2,allowed:['scout']},
 knife:{name:'Survival Knife',slot:'melee',ammo:null,damage:2,mag:0,rate:.5,range:1.4,reload:0,allowed:['rifleman','medic','heavy','scout','engineer']},
 machete:{name:'Machete',slot:'melee',ammo:null,damage:2.8,mag:0,rate:.56,range:1.55,reload:0,allowed:['rifleman','medic','heavy','scout','engineer']},
 bat:{name:'Baseball Bat',slot:'melee',ammo:null,damage:2.4,mag:0,rate:.65,range:1.55,reload:0,allowed:['rifleman','medic','heavy','scout','engineer']},
 crowbar:{name:'Crowbar',slot:'melee',ammo:null,damage:3.1,mag:0,rate:.75,range:1.55,reload:0,allowed:['rifleman','medic','heavy','scout','engineer']},
 axe:{name:'Fire Axe',slot:'melee',ammo:null,damage:3.8,mag:0,rate:.83,range:1.6,reload:0,allowed:['rifleman','medic','heavy','scout','engineer']}
};
const allPistols:WeaponId[]=['pistol','revolver','machinePistol'];
const allSmgs:WeaponId[]=['smg','compactSmg','suppressedSmg'];
const allRifles:WeaponId[]=['carbine','assault','battleRifle','burstRifle'];
const allShotguns:WeaponId[]=['shotgun','autoShotgun','doubleBarrel','tacticalShotgun'];
const allMarksman:WeaponId[]=['marksman','heavyMarksman','sniper'];
export const attachmentDefs:Record<AttachmentId,{name:string;slot:AttachmentSlot;compatible:WeaponId[];stat:string}>={
 redDot:{name:'Red Dot Sight',slot:'optic',compatible:[...allPistols,...allSmgs,...allRifles,...allShotguns,'lmg','squadAutomatic','heavyMachineGun','marksman','heavyMarksman'],stat:'accuracy'},
 holoSight:{name:'Holographic Sight',slot:'optic',compatible:[...allSmgs,...allRifles,...allShotguns,'lmg','squadAutomatic','heavyMachineGun'],stat:'accuracy'},
 reflexSight:{name:'Reflex Sight',slot:'optic',compatible:[...allPistols,...allSmgs,...allRifles,...allShotguns],stat:'accuracy / firing speed'},
 variableScope:{name:'Variable Zoom Scope',slot:'optic',compatible:[...allRifles,...allMarksman,'lmg','squadAutomatic'],stat:'range / accuracy'},
 scope:{name:'Precision Optic',slot:'optic',compatible:[...allRifles,'lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'range'},
 suppressor:{name:'Suppressor',slot:'barrel',compatible:[...allPistols,...allSmgs,...allRifles,...allMarksman],stat:'noise'},
 flashHider:{name:'Flash Hider',slot:'barrel',compatible:[...allPistols,...allSmgs,...allRifles,'lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'noise / accuracy'},
 portedBarrel:{name:'Ported Barrel',slot:'barrel',compatible:[...allPistols,...allSmgs,...allRifles,'lmg','squadAutomatic'],stat:'rate / accuracy'},
 compensator:{name:'Compensator',slot:'barrel',compatible:[...allPistols,...allSmgs,...allRifles,'lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'accuracy'},
 longBarrel:{name:'Extended Barrel',slot:'barrel',compatible:[...allRifles,...allShotguns,'lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'range'},
 extended:{name:'Extended Magazine',slot:'magazine',compatible:[...allPistols,...allSmgs,...allRifles,'autoShotgun','tacticalShotgun','lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'capacity'},
 drumMag:{name:'Drum Magazine',slot:'magazine',compatible:[...allSmgs,...allRifles,'autoShotgun','tacticalShotgun','lmg','squadAutomatic'],stat:'capacity / reload'},
 lightMag:{name:'Lightweight Magazine',slot:'magazine',compatible:[...allPistols,...allSmgs,...allRifles,...allMarksman],stat:'reload speed'},
 quickMag:{name:'Quick-Reload Magazine',slot:'magazine',compatible:[...allPistols,...allSmgs,...allRifles,'autoShotgun','tacticalShotgun','lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'reload'},
 grip:{name:'Foregrip',slot:'underbarrel',compatible:[...allSmgs,...allRifles,...allShotguns,'lmg','squadAutomatic','heavyMachineGun','marksman','heavyMarksman'],stat:'accuracy'},
 angledGrip:{name:'Angled Foregrip',slot:'underbarrel',compatible:[...allSmgs,...allRifles,...allShotguns,'lmg','squadAutomatic'],stat:'rate / accuracy'},
 laserSight:{name:'Laser Sight',slot:'underbarrel',compatible:[...allPistols,...allSmgs,...allRifles,...allShotguns],stat:'accuracy'},
 bipod:{name:'Bipod',slot:'underbarrel',compatible:['lmg','squadAutomatic','heavyMachineGun',...allMarksman],stat:'range'}
};
/** Plain-language player-facing effects, matching effectiveStats calculations. */
export const attachmentDescriptions:Record<AttachmentId,string>={
 redDot:'Improves aiming accuracy.',
 scope:'Increases effective range and accuracy.',
 holoSight:'Boosts accuracy, especially at higher tiers.',
 reflexSight:'Improves accuracy and slightly increases firing speed.',
 variableScope:'Greatly increases range and improves accuracy, but fires slower.',
 suppressor:'Reduces gunfire noise and enemy attraction.',
 compensator:'Improves shot accuracy and control.',
 flashHider:'Reduces gunfire noise and improves accuracy.',
 portedBarrel:'Fires slightly faster and improves accuracy.',
 longBarrel:'Increases range and slightly boosts damage.',
 extended:'Adds rounds to magazine capacity.',
 quickMag:'Shortens weapon reload time.',
 drumMag:'Holds many extra rounds, but takes longer to reload.',
 lightMag:'Speeds up reloading with a lightweight magazine.',
 grip:'Improves accuracy while firing.',
 bipod:'Increases range and accuracy.',
 angledGrip:'Improves accuracy and slightly increases firing speed.',
 laserSight:'Greatly improves shot accuracy.'
};
export const ammoTypes:AmmoType[]=['light','rifle','shotgun','heavy','precision'];
export const ammoLabels:Record<AmmoType,string>={light:'Pistol / SMG',rifle:'Rifle',shotgun:'Shotgun',heavy:'Heavy',precision:'Precision'};
export const ammoStack:Record<AmmoType,number>={light:90,rifle:90,shotgun:36,heavy:120,precision:40};
export const ammoPack:Record<AmmoType,{count:number;price:number}>={light:{count:45,price:110},rifle:{count:48,price:150},shotgun:{count:18,price:130},heavy:{count:60,price:210},precision:{count:20,price:175}};
export const emptyAmmo=():AmmoBank=>({light:0,rifle:0,shotgun:0,heavy:0,precision:0});
export function newWeapon(model:WeaponId,tier:Tier,id:string):Weapon{return {kind:'weapon',id,model,tier,mag:weaponDefs[model].mag,mods:{}}}
export function newMod(model:AttachmentId,tier:Tier,id:string):Mod{return {kind:'attachment',id,model,tier}}
export function canEquipMod(weapon:Weapon,mod:Mod):boolean{return attachmentDefs[mod.model].compatible.includes(weapon.model)}
export function canClassEquip(role:ClassId,model:WeaponId):boolean{return weaponDefs[model].allowed.includes(role)}
export function itemName(item:Gear):string{return (item.kind==='weapon'?weaponDefs[item.model].name:attachmentDefs[item.model].name)+' · '+rarityName(item.tier)}
export function itemPrice(item:Gear):number{return item.kind==='weapon'?weaponPrice(item.model,item.tier):modPrice(item.model,item.tier)}
export function weaponPrice(model:WeaponId,tier:Tier):number {const base=weaponDefs[model].slot==='melee'?180:weaponDefs[model].ammo==='heavy'||weaponDefs[model].ammo==='precision'?1050:weaponDefs[model].ammo==='shotgun'?720:weaponDefs[model].slot==='secondary'?330:680;return Math.round(base*Math.pow(1.65,tier-1)/10)*10}
export function modPrice(_model:AttachmentId,tier:Tier):number {return Math.round(180*Math.pow(1.55,tier-1)/10)*10}
export function upgradePrice(item:Gear):number {if(item.tier>=6)return Infinity;const next=(item.tier+1) as Tier;return Math.round(itemPrice({...item,tier:next} as Gear)*1.28/10)*10}
export function salePrice(item:Gear):number {return Math.floor(itemPrice(item)*.45)}
export function effectiveStats(weapon:Weapon):{damage:number;capacity:number;rate:number;range:number;reload:number;accuracy:number;noise:number}{
 const b=weaponDefs[weapon.model],n=weapon.tier-1;
 let damage=b.damage*(1+.21*n),capacity=b.mag,rate=b.rate*(1-.055*n),range=b.range*(1+.045*n),reload=b.reload*(1-.045*n),accuracy=1,noise=1;
 for(const m of Object.values(weapon.mods)){
  if(!m)continue;const t=m.tier;
  switch(m.model){
   case 'redDot':accuracy+=.08+.035*t;break;
   case 'scope':range+=.35*t;accuracy+=.045*t;break;
   case 'holoSight':accuracy+=.1+.055*t;break;
   case 'reflexSight':accuracy+=.06+.03*t;rate*=Math.max(.84,1-.018*t);break;
   case 'variableScope':range+=.65*t;accuracy+=.065*t;rate*=1+.025*t;break;
   case 'suppressor':noise=Math.max(.18,1-.14*t);break;
   case 'compensator':accuracy+=.05*t;break;
   case 'flashHider':noise=Math.max(.24,noise*(1-.075*t));accuracy+=.02*t;break;
   case 'portedBarrel':rate*=Math.max(.76,1-.03*t);accuracy+=.02*t;break;
   case 'longBarrel':range+=.4*t;damage*=1+.015*t;break;
   case 'extended':capacity+=Math.round(3+3*t+b.mag*.045*t);break;
   case 'quickMag':reload*=1-.075*t;break;
   case 'drumMag':capacity+=Math.max(10,Math.round(b.mag*(.25+.1*t)));reload*=1+.08*t;break;
   case 'lightMag':reload*=Math.max(.53,1-.095*t);break;
   case 'grip':accuracy+=.055*t;break;
   case 'bipod':range+=.22*t;accuracy+=.05*t;break;
   case 'angledGrip':accuracy+=.035*t;rate*=Math.max(.8,1-.022*t);break;
   case 'laserSight':accuracy+=.1+.06*t;break;
  }
 }
 return {damage,capacity,rate:Math.max(.07,rate),range,reload:Math.max(0,reload),accuracy,noise};
}
export function usedSlots(bag:Gear[],ammo:AmmoBank,medkits:number):number{
 return bag.length+ammoTypes.reduce((n,t)=>n+Math.ceil(Math.max(0,ammo[t]||0)/ammoStack[t]),0)+Math.ceil(Math.max(0,medkits)/3);
}
export function canAddItem(bag:Gear[],ammo:AmmoBank,medkits:number,capacity:number):boolean{return usedSlots(bag,ammo,medkits)+1<=capacity}
export function addAmmo(ammo:AmmoBank,type:AmmoType,count:number,bag:Gear[],medkits:number,capacity:number):number{
 const current=Math.max(0,ammo[type]||0),free=Math.max(0,capacity-usedSlots(bag,ammo,medkits));
 const allowed=current===0?free*ammoStack[type]:Math.ceil(current/ammoStack[type])*ammoStack[type]-current+free*ammoStack[type];
 const added=Math.max(0,Math.min(Math.max(0,count),allowed));
 ammo[type]=current+added;return added;
}
export function rarityForWave(wave:number,roll:number):Tier{
 const tier=Math.min(6,1+Math.floor((Math.max(1,wave)-1)/5));
 const r=Math.min(.999999,Math.max(0,roll));
 if(r<.07&&tier<6)return (tier+1) as Tier;
 if(r<.43)return tier as Tier;
 return Math.max(1,tier-1) as Tier;
}
const primaryModels:WeaponId[]=['smg','compactSmg','suppressedSmg','carbine','assault','battleRifle','burstRifle','shotgun','autoShotgun','doubleBarrel','tacticalShotgun','lmg','squadAutomatic','heavyMachineGun','marksman','heavyMarksman','sniper'];
const secondaryModels:WeaponId[]=['pistol','revolver','machinePistol'];
const meleeModels:WeaponId[]=['knife','axe','machete','bat','crowbar'];
const modModels=Object.keys(attachmentDefs) as AttachmentId[];
const modsBySlot:Record<AttachmentSlot,AttachmentId[]>={
 optic:modModels.filter(m=>attachmentDefs[m].slot==='optic'),
 barrel:modModels.filter(m=>attachmentDefs[m].slot==='barrel'),
 magazine:modModels.filter(m=>attachmentDefs[m].slot==='magazine'),
 underbarrel:modModels.filter(m=>attachmentDefs[m].slot==='underbarrel')
};
function seeded(seed:number):()=>number{let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)}
export function armoryOffers(seed:number,wave:number,rerolls:number):ArmoryOffer[]{
 const random=seeded(seed^Math.imul(wave,0x9e3779b1)^Math.imul(rerolls+1,0x85ebca6b));
 const offers:ArmoryOffer[]=[];const used=new Set<string>();
 const choose=(list:string[])=>{for(let tries=0;tries<30;tries++){const m=list[Math.floor(random()*list.length)];if(!used.has(m)){used.add(m);return m}}return list[0]};
 for(let i=0;i<3;i++){const model=choose(primaryModels),tier=rarityForWave(wave,random());offers.push({kind:'weapon',model,tier,price:weaponPrice(model as WeaponId,tier)})}
 // Secondary arms and melee gear now enter the normal Armory rotation too.
 for(const group of [secondaryModels,meleeModels]){
  const model=choose(group),tier=rarityForWave(wave,random());
  offers.push({kind:'weapon',model,tier,price:weaponPrice(model as WeaponId,tier)});
 }
 for(const slot of ['optic','barrel','magazine','underbarrel'] as AttachmentSlot[]){const model=choose(modsBySlot[slot]),tier=rarityForWave(wave,random());offers.push({kind:'attachment',model,tier,price:modPrice(model as AttachmentId,tier)})}
 const roles=['rifleman','medic','heavy','scout','engineer'];const recruit=roles[Math.floor(random()*roles.length)];const costs:Record<string,number>={rifleman:750,medic:900,heavy:1150,scout:950,engineer:1000};offers.push({kind:'recruit',model:recruit,tier:1,price:costs[recruit]});
 return offers;
}
export function rareLoot(seed:number,wave:number,container:number,boss=false):Gear|null{
 const random=seeded(seed^Math.imul(container+1,0x9e3779b1)^Math.imul(wave,0x85ebca6b));
 if(!boss&&random()>.22)return null;
 const isWeapon=random()>.53;
 const tier=rarityForWave(wave,boss?Math.min(.39,random()):random());
 if(isWeapon){const allWeapons=[...primaryModels,...secondaryModels,...meleeModels];const model=allWeapons[Math.floor(random()*allWeapons.length)];return newWeapon(model,tier,'loot-w'+wave+'-'+container)}
 const model=modModels[Math.floor(random()*modModels.length)];return newMod(model,tier,'loot-m'+wave+'-'+container);
}
export function advanceOfferPrice(rerolls:number):number{return 100+rerolls*75}
export function backpackUpgradePrice(capacity:number):number{return capacity>=24?Infinity:200+Math.floor((capacity-12)/4)*150}

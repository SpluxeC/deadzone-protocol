import {canClassEquip,weaponDefs,newWeapon,type ClassId,type Weapon,type Tier,type WeaponId,type Slot} from './equipmentArmory.ts';
export type SquadOrder='follow'|'hold'|'focus'|'regroup'|'defensive';
export type Squadmate={id:string;name:string;role:ClassId;hp:number;maxHp:number;x:number;y:number;cooldown:number;abilityCooldown:number;reviveProgress:number;downed:number;dead:boolean;anchor:{x:number;y:number};weapon:Weapon;secondaryWeapon:Weapon;meleeWeapon:Weapon;activeSlot:Slot;armor:number;armorTier:Tier;gearTier:Tier;magReserve:number};
export type Downable={hp:number;downed:number;dead:boolean};
export const SQUAD_LIMIT=4;
export const SQUAD_MAX_AMMO=400;
/** Individual NPC reloads cost 150 credits for 80 rounds; bulk refill uses
 * the same per-round rate, rounded up once for the actual missing ammo. */
export const SQUAD_AMMO_PACK_ROUNDS=80;
export const SQUAD_AMMO_PACK_CREDITS=150;
export function squadAmmoRefillPrice(allies:readonly Squadmate[]):number{
 const rounds=squadAmmoNeeded(allies);
 return rounds===0?0:Math.ceil(rounds*SQUAD_AMMO_PACK_CREDITS/SQUAD_AMMO_PACK_ROUNDS);
}
export function squadAmmoNeeded(allies:readonly Squadmate[]):number{return allies.filter(a=>!a.dead).reduce((n,a)=>n+Math.max(0,SQUAD_MAX_AMMO-a.magReserve),0)}
export function refillSquadAmmo(allies:Squadmate[]):number{let filled=0;for(const ally of allies){if(ally.dead)continue;const needed=Math.max(0,SQUAD_MAX_AMMO-ally.magReserve);ally.magReserve+=needed;filled+=needed;}return filled}
export function squadWeapon(ally:Squadmate):Weapon{return ally.activeSlot==='secondary'?ally.secondaryWeapon:ally.activeSlot==='melee'?ally.meleeWeapon:ally.weapon}
export function setSquadWeaponSlot(ally:Squadmate,slot:Slot):boolean{if(slot==='secondary'&&!ally.secondaryWeapon||slot==='melee'&&!ally.meleeWeapon)return false;ally.activeSlot=slot;return true}
export const PLAYER_BLEEDOUT=30;
export const ALLY_BLEEDOUT=25;
export const CLASS_INFO:Record<ClassId,{label:string;cost:number;model:WeaponId;armor:number;special:string}>={
 rifleman:{label:'Rifleman',cost:750,model:'assault',armor:35,special:'Controlled automatic fire'},
 medic:{label:'Medic',cost:900,model:'smg',armor:20,special:'Combat healing and fast rescues'},
 heavy:{label:'Heavy Gunner',cost:1150,model:'lmg',armor:75,special:'Suppression and tough armor'},
 scout:{label:'Scout',cost:950,model:'marksman',armor:18,special:'Long-range precision and scouting'},
 engineer:{label:'Engineer',cost:1000,model:'shotgun',armor:40,special:'Traps and armor repairs'}
};
export const classIds=Object.keys(CLASS_INFO) as ClassId[];
export function makeSquadmate(role:ClassId,id:string,x:number,y:number,tier:Tier=1):Squadmate{
 const info=CLASS_INFO[role];if(!canClassEquip(role,info.model))throw Error('Invalid class loadout');
 return{id,name:info.label+' '+id.slice(-2),role,hp:100,maxHp:100,x,y,cooldown:0,abilityCooldown:0,reviveProgress:0,downed:0,dead:false,anchor:{x,y},weapon:newWeapon(info.model,tier,id+'-weapon'),secondaryWeapon:newWeapon('pistol',tier,id+'-sidearm'),meleeWeapon:newWeapon('knife',tier,id+'-melee'),activeSlot:'primary',armor:info.armor,armorTier:1,gearTier:1,magReserve:240};
}
export function migrateSquadmate(v:Partial<Squadmate>&{x:number;y:number;hp:number;name?:string},index:number):Squadmate{
 const role:ClassId=v.role&&classIds.includes(v.role)?v.role:'rifleman';
 const a=makeSquadmate(role,v.id||'legacy-'+index,v.x,v.y,v.weapon?.tier??1);
 return {...a,...v,role,id:a.id,name:v.name||a.name,weapon:v.weapon&&canClassEquip(role,v.weapon.model)?v.weapon:a.weapon,secondaryWeapon:v.secondaryWeapon&&weaponDefs[v.secondaryWeapon.model]?.slot==='secondary'&&canClassEquip(role,v.secondaryWeapon.model)?v.secondaryWeapon:a.secondaryWeapon,meleeWeapon:v.meleeWeapon&&weaponDefs[v.meleeWeapon.model]?.slot==='melee'&&canClassEquip(role,v.meleeWeapon.model)?v.meleeWeapon:a.meleeWeapon,activeSlot:v.activeSlot??'primary',anchor:v.anchor||{x:v.x,y:v.y},
  cooldown:v.cooldown??0,abilityCooldown:v.abilityCooldown??0,reviveProgress:v.reviveProgress??0,downed:v.downed??0,dead:!!v.dead,
  armor:v.armor??a.armor,armorTier:v.armorTier??1,gearTier:v.gearTier??1,magReserve:Math.min(SQUAD_MAX_AMMO,Math.max(0,v.magReserve??240))};
}
export function applyLethalDamage(v:Downable,damage:number,seconds:number):void{
 if(v.dead||v.downed>0)return;
 v.hp=Math.max(0,v.hp-Math.max(0,damage));
 if(v.hp<=0){v.hp=0;v.downed=seconds}
}
export function bleed(v:Downable,dt:number):boolean{
 if(v.dead)return true;
 if(v.downed<=0)return false;
 v.downed=Math.max(0,v.downed-Math.max(0,dt));
 if(v.downed===0){v.dead=true;return true}
 return false;
}
export function revive(v:Downable,hp=28):boolean{
 if(v.dead||v.downed<=0)return false;
 v.downed=0;v.hp=Math.max(1,hp);return true;
}
export function reviveDuration(role:ClassId):number{return role==='medic'?1.8:4.5}
export function shouldRevive(order:SquadOrder,role:ClassId):boolean{return role==='medic'||order==='defensive'||order==='regroup'||order==='follow'}
export function canRecruit(existing:number):boolean{return existing<SQUAD_LIMIT}
export function equipClassWeapon(ally:Squadmate,weapon:Weapon):boolean{
 if(!canClassEquip(ally.role,weapon.model))return false;
 const slot=weaponDefs[weapon.model].slot;
 if(slot==='primary')ally.weapon=weapon;
 else if(slot==='secondary')ally.secondaryWeapon=weapon;
 else ally.meleeWeapon=weapon;
 return true;
}
export function classFireDelay(role:ClassId):number{
 return ({rifleman:.72,medic:.85,heavy:.42,scout:1.35,engineer:1.05} as Record<ClassId,number>)[role];
}
export function classRange(role:ClassId):number{
 return ({rifleman:7,medic:5,heavy:7.5,scout:11,engineer:4.5} as Record<ClassId,number>)[role];
}
export function classDamage(role:ClassId,tier:Tier):number{
 const base=({rifleman:2.2,medic:1.2,heavy:2.0,scout:5.1,engineer:4.2} as Record<ClassId,number>)[role];
 return base*(1+.2*(tier-1));
}
export function canHeal(role:ClassId):boolean{return role==='medic'}
export function gearUpgradeCost(a:Squadmate):number{return a.gearTier>=6?Infinity:250+350*a.gearTier}

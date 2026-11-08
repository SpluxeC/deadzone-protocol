import {generateDungeon,type DungeonLayout} from './dungeon';
import {makeWave,killPayout,clearPayout,permanentPayout,extractionSpawnInterval,extractionActiveCap,formatRunTime,type WavePlan} from './rogueliteRules';
import {zombieKind,zombieStats,weaponStats,reloadTransfer,distanceField,nextZombieWaypoint,incomingDamage,bossAttack,bossImpact,bossIdentity,distanceToSegment,type ZombieKind,type WeaponSlot} from './combatSystems';
import {weaponDefs,attachmentDefs,attachmentDescriptions,rarityName,rarityClass,canClassEquip,ammoTypes,ammoLabels,ammoPack,ammoStack,newWeapon,newMod,usedSlots,addAmmo,canAddItem,canEquipMod,itemName,salePrice,effectiveStats,armoryOffers,rareLoot,crateLoot,advanceOfferPrice,backpackUpgradePrice,upgradePrice,type Weapon,type Mod,type Gear,type AmmoBank,type Loadout,type AmmoType,type Tier,type WeaponId,type AttachmentId,type Slot} from './equipmentArmory';
import {CLASS_INFO,classIds,makeSquadmate,migrateSquadmate,applyLethalDamage,bleed,revive,reviveDuration,shouldRevive,canRecruit,equipClassWeapon,classFireDelay,classRange,classDamage,canHeal,gearUpgradeCost,squadWeapon,setSquadWeaponSlot,refillSquadAmmo,squadAmmoNeeded,SQUAD_MAX_AMMO,SQUAD_AMMO_REFILL_COST,PLAYER_BLEEDOUT,ALLY_BLEEDOUT,type Squadmate,type SquadOrder} from './squadSystems';
import {migrateProfile,unlocks,achievements,buyUnlock,allowedPrimary,allowedMelee,allowedTeammates,sanitizeChoice,startingKit,progressAchievements,performancePayout,eligibleRecruit,type ProfileV5,type UnlockId,type RunPerformance} from './metaprogression';
import {camera,toWorld,renderDungeon,drawSprite,drawElevator,drawMilitaryCrate,drawLootPopup,drawBar,drawHazard,hudColor,type View,type SpriteKind} from './rogueliteVisuals';
import {renderFacility} from './facilityAtmosphere';
import {senseZombie,tacticalTarget,hitReaction,friendlyFireLane,type ThreatKind} from './combatAi';
import {ejectCasing,ageCasings,drawCasings,type Casing} from './combatPolish';
import {drawBossArt,drawBossImpact,drawBossDeath} from './bossArt';
import {elevatorInRange,elevatorCells,crateInRange} from './dungeon';
import {nextCharacterMotion,type CharacterMotion} from './characterMotion';
import {gearIcon,gearIconModels} from './gearIcons';
import {makeAttackFx,ageCombatFx,drawCombatFx,shotProfile,type CombatFx} from './combatFx';
import {bloodOnHit,ageBloodFx,drawBloodFx,MAX_BLOOD_EFFECTS,type BloodFx} from './bloodFx';
import {traceBullet,meleeHits,unit,penetrationFor,aimHasTarget} from './hitDetection';
import {createFog,updateFog,renderFog,exploredIndices,discoveredAt,clipToExplored,type FogState,type Explorer} from './fogOfWar';
import {normalizeStick,stickKnob,type StickVector} from './mobileControls';
import {walkableTile,canOccupy,nearestWalkable} from './tileCollision';
import {squadMove,spacedSquadPosition} from './squadMovement';
import {spawnHoles,openHoleIndices,startBreachEvent,advanceBreachEvent,canExtract,SEAL_COST,BREACH_DURATION,REQUIRED_SEALS,drawSpawnHole,type BreachEvent} from './spawnHoles';
import './rogueliteTheme.css';
import './style.css';

type Unit={x:number;y:number;hp:number;maxHp:number;speed:number;attack:number;boss?:boolean;alive:boolean;kind?:ZombieKind;windup?:number;phase?:number;aggro?:number;suppressed?:number;scoutMarked?:number;bossTarget?:{x:number;y:number};bossOrigin?:{x:number;y:number};summoned?:boolean;bossRecover?:number;lastKnown?:{x:number;y:number}|null;searchClock?:number;alertMode?:ThreatKind;stagger?:number;hitFlash?:number;hitVx?:number;hitVy?:number;emerging?:number};
type Ally=Squadmate;
type Run={wave:number;credits:number;hp:number;armor:number;mag:number;reserve:number;medkits:number;weaponTier:number;damage:number;maxMag:number;player:{x:number;y:number};enemies:Unit[];allies:Ally[];spawned:number;kills:number;bosses:number;cleared:number;seed:number;stage:'fight'|'shop';looted:number[];squadAmmo:number;activeSlot?:WeaponSlot;sideMag?:number;sideReserve?:number;reloadTimer?:number;reloadSlot?:WeaponSlot|null;playerDowned?:number;playerDead?:boolean;squadOrder?:SquadOrder;focusTarget?:number|null;reviveProgress?:number;equipment?:{loadout:Loadout;bag:Gear[];ammo:AmmoBank;capacity:number;rerolls:number;};killsTotal?:number;lootedTotal?:number;flawlessWaves?:number;bestSquad?:number;waveStartHp?:number;waveStartArmor?:number;waveHit?:boolean;explored?:number[];layoutVersion?:1|2|3;waveSeconds?:number;runSeconds?:number;waveStartKills?:number;waveStartLooted?:number;peakThreat?:number;triggeredEvents?:number[];secretOpened?:boolean;noiseEvent?:{x:number;y:number;radius:number;ttl:number}|null;sealedHoles?:number[];breachEvent?:BreachEvent|null;}
type Profile=ProfileV5;
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<div id="rogue" style="height:100dvh;display:flex;flex-direction:column;background:#0c1416;color:#eaf0eb;font:14px system-ui;overflow:hidden">
<header><strong class="game-title">DEADZONE <span style="color:#f18567">PROTOCOL</span></strong><div id="combat-hud" aria-label="Survivor status"><span id="stats" class="top-stat">WAVE 1</span><div class="hud-meter" aria-label="Health"><span>HP</span><div><i id="hud-hp"></i></div><b id="hud-hp-text">100</b></div><div class="hud-meter" aria-label="Armor"><span>ARM</span><div><i id="hud-armor"></i></div><b id="hud-armor-text">50</b></div><span class="top-stat" id="hud-weapon">CARBINE · 30/90</span><span class="top-stat" id="hud-team">SQUAD 0/4</span><span class="top-stat" id="hud-credits">₡0</span></div><button id="menu" type="button">MENU</button></header>
<div id="playarea" style="position:relative;min-height:0;flex:1;display:flex;justify-content:center;align-items:center;background:#0a1113"><canvas id="rogue-canvas" style="width:100%;height:100%;object-fit:contain;touch-action:none"></canvas><div id="breach-banner" role="alert" aria-live="polite" hidden style="position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:4;pointer-events:none;max-width:94%;min-width:min(90%,440px);box-sizing:border-box;padding:9px 14px;border-radius:7px;background:#64231eee;border:2px solid #ffac79;text-align:center;color:#fff4da;font-size:clamp(11px,2vw,15px);font-weight:800;box-shadow:0 4px 18px #000a"></div><div id="mobile-sticks" aria-label="Touch analog controls"><div class="analog-group analog-left"><button id="mobile-inventory-team" type="button" aria-label="Tap inventory; hold for team">INVENTORY / TEAM</button><div class="analog-base" id="move-stick" role="group" aria-label="Move"><div class="analog-ring"></div><div class="analog-knob"></div></div><span class="analog-caption">MOVE</span></div><div id="mobile-squad" aria-label="Squad commands"><button type="button" data-squad-order="follow">FOLLOW</button><button type="button" data-squad-order="hold">HOLD</button><button type="button" data-squad-order="focus">FOCUS</button><button type="button" data-squad-order="regroup">REGROUP</button><button type="button" data-squad-order="defensive">DEFEND</button></div><button id="mobile-medkit-revive" type="button" aria-label="Tap to use medkit; hold to revive">MEDKIT / REVIVE</button><div id="mobile-actions"><button id="mobile-interact" type="button" disabled>INTERACT</button></div><div class="analog-group analog-right"><button id="mobile-weapon-swap" type="button" aria-label="Tap to swap primary and secondary; hold for melee">SWAP WEAPON</button><div class="analog-base" id="aim-stick" role="group" aria-label="Aim and fire"><div class="analog-ring"></div><div class="analog-knob"></div></div><span class="analog-caption">AIM · AUTO ATTACK</span></div></div><div id="rotate-phone" role="status" aria-live="polite"><div class="rotate-symbol" aria-hidden="true">↻</div><h2>Rotate Your Device</h2><p>Deadzone Protocol is played in landscape mode.</p></div><div id="overlay" style="position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;background:#081112df;overflow:auto;padding:14px;box-sizing:border-box"></div></div>
<footer style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px;background:#152521"><button id="weapon-primary">1 PRIMARY</button><button id="weapon-secondary">2 SIDEARM</button><button id="weapon-melee">3 MELEE</button><button id="heal">MEDKIT (H)</button><button id="inventory">INVENTORY (I)</button><button id="orders">SQUAD: FOLLOW (Q)</button><button id="squad-panel">TEAM</button><button id="revive">HOLD REVIVE (V)</button><button id="moveup">▲</button><button id="moveleft">◀</button><button id="movedown">▼</button><button id="moveright">▶</button><button id="interact" disabled>INTERACT (E)</button></footer>
<div id="toast" style="position:fixed;left:50%;bottom:78px;transform:translateX(-50%);pointer-events:none;background:#243c37e8;padding:6px 12px;border-radius:6px;color:white;z-index:5"></div></div>`;
const style=document.createElement('style');style.textContent=`#overlay[hidden]{display:none!important}#overlay article{margin:auto 0}#rogue button{background:#304941;color:white;border:1px solid #879a80;border-radius:5px;padding:9px 12px;font:600 13px system-ui;cursor:pointer;touch-action:none}#rogue button:hover{background:#436354}#rogue button:disabled{opacity:.42;cursor:not-allowed}#overlay article{background:#1a2d2b;border:1px solid #8f9c82;border-radius:10px;padding:22px;max-width:560px;width:min(100%,560px);box-sizing:border-box;box-shadow:0 15px 60px #0009}#overlay h1{font-size:24px;margin:0 0 8px}#overlay h2{font-size:18px;margin:14px 0 8px}#overlay p{color:#c7d1c8;line-height:1.5}#overlay .shop{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}#overlay .shop button{text-align:left;min-height:66px}#overlay .menurow{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#overlay label{display:block;margin:8px 0}#overlay select{padding:8px;background:#1c3030;color:white;border:1px solid #7b9385}`;document.head.append(style);
const canvas=document.querySelector<HTMLCanvasElement>('#rogue-canvas')!,ctx=canvas.getContext('2d')!,overlay=document.querySelector<HTMLDivElement>('#overlay')!,toastEl=document.querySelector<HTMLDivElement>('#toast')!;
/** Protect the gameplay surface from iOS/Android text selection, callouts, and drag highlights.
 * The overlay remains interactive so menu dropdowns and buttons continue working.
 */
const gameSurface=document.querySelector<HTMLElement>('#playarea')!;
// Let inventory controls receive native click/tap events. The previous
// pointerdown workaround immediately replaced inventory markup during touch,
// which could swallow releases and accidentally activate neighboring buttons.
// A click is only handled by the button's own bound action.

gameSurface.addEventListener('selectstart',event=>{
 if(overlay.hidden)event.preventDefault();
});
gameSurface.addEventListener('dragstart',event=>{
 if(overlay.hidden)event.preventDefault();
});
gameSurface.addEventListener('contextmenu',event=>{
 if(overlay.hidden)event.preventDefault();
});

// Explicit menu state works on older mobile browsers that do not support CSS :has().
function syncMenuChrome(){
 const opened=!overlay.hidden;
 root.classList.toggle('menu-open',opened);
 root.setAttribute('data-menu-open',String(opened));
}
new MutationObserver(syncMenuChrome).observe(overlay,{attributes:true,attributeFilter:['hidden']});
syncMenuChrome();
const stats=document.querySelector<HTMLElement>('#stats')!,keys=new Set<string>(),touch=new Set<string>();
let slot=1,profile:Profile=migrateProfile(null),run:Run|null=null,plan:WavePlan|null=null;
let last=performance.now(),lastSave=0,spawnClock=0,shotCooldown=0,allyClock=0,noticeUntil=0,aim={x:1,y:0},paused=false;
const zeroStick=():StickVector=>({x:0,y:0,magnitude:0});
type LootPopup={x:number;y:number;model:string;label:string;start:number};
let lootPopups:LootPopup[]=[];
let combatFx:CombatFx[]=[],bloodFx:BloodFx[]=[],fog:FogState|null=null;
let moveAnalog=zeroStick(),aimAnalog=zeroStick(),cameraZoom=1;
// Desktop mouse aiming is active only while the pointer is over the dungeon canvas.
let shellEffects:Casing[]=[];let shotKick=0;
let bossEffects:{kind:ReturnType<typeof bossAttack>;x:number;y:number;age:number;death?:boolean;heading?:number}[]=[];
let mouseAimActive=false,mouseAimX=.5,mouseAimY=.5;let pathClock=0,pathField:Int32Array|null=null,searchFields=new Map<string,Int32Array>(),bossPulse=0,noiseClock=0,squadClock=0;
const store=(suffix:string)=>'deadzone-roguelite-v1-slot-'+slot+'-'+suffix;
function loadProfile(){try{profile=migrateProfile(JSON.parse(localStorage.getItem(store('profile'))||'null'))}catch{profile=migrateProfile(null)}}
function save(){try{localStorage.setItem(store('profile'),JSON.stringify(profile));if(run)localStorage.setItem(store('run'),JSON.stringify(run));else localStorage.removeItem(store('run'))}catch{notice('Browser storage unavailable — progress may not persist')}}
function notice(t:string){toastEl.textContent=t;noticeUntil=performance.now()+2900}
const safe=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const ammoBank=(light=48,rifle=72):AmmoBank=>({light,rifle,shotgun:0,heavy:0,precision:0});
function ensureEquipment(r:Run){
 if(!r.equipment){
  const tier=Math.max(1,Math.min(6,Math.floor(r.weaponTier||1))) as Tier;
  const primary=newWeapon('carbine',tier,'starter-primary'),secondary=newWeapon('pistol',1,'starter-secondary');
  primary.mag=Math.max(0,Math.min(effectiveStats(primary).capacity,r.mag??12));
  secondary.mag=Math.max(0,Math.min(effectiveStats(secondary).capacity,r.sideMag??12));
  r.equipment={loadout:{primary,secondary,melee:newWeapon('knife',1,'starter-melee')},bag:[],ammo:ammoBank(r.sideReserve??48,r.reserve??72),capacity:12,rerolls:0};
 }
 const eq=r.equipment;
 eq.bag??=[];eq.capacity=Math.max(12,Math.min(24,eq.capacity??12));eq.rerolls??=0;
 eq.ammo??=ammoBank(r.sideReserve??48,r.reserve??72);
 for(const key of ammoTypes)eq.ammo[key]=Math.max(0,Math.floor(eq.ammo[key]??0));
 eq.loadout??={primary:null,secondary:null,melee:null};
 return eq;
}
function activeWeapon(r:Run):Weapon|null{return ensureEquipment(r).loadout[r.activeSlot??'primary']}
function inventorySummary(r:Run){const eq=ensureEquipment(r);return usedSlots(eq.bag,eq.ammo,r.medkits)+'/'+eq.capacity}
function gearId(r:Run):string{return 'gear-'+r.wave+'-'+r.kills+'-'+Math.floor(Math.random()*1e9)}

function loadRun(){try{const r=JSON.parse(localStorage.getItem(store('run'))||'null') as Run|null;if(!r||!Number.isFinite(r.wave)||!['fight','shop'].includes(r.stage))return false;run=r;run.layoutVersion??=1;plan=makeWave(run.seed,run.wave,run.layoutVersion);run.triggeredEvents??=[];run.noiseEvent??=null;run.sealedHoles??=[];run.breachEvent??=null;if(run.secretOpened&&plan.map.secret){const d=plan.map.secret.door;plan.map.tiles[d.y*plan.map.width+d.x]=0}run.looted??=[];run.squadAmmo??=run.allies.length*8;run.maxMag??=12;run.weaponTier??=1;run.damage??=1;run.activeSlot??='primary';run.sideMag??=12;run.sideReserve??=48;run.reloadTimer??=0;run.reloadSlot??=null;run.killsTotal??=0;run.lootedTotal??=0;run.flawlessWaves??=0;run.bestSquad??=run.allies.length;run.waveHit??=false;run.playerDowned??=0;run.playerDead??=false;run.squadOrder??='follow';run.focusTarget??=null;run.reviveProgress??=0;run.waveSeconds??=0;run.runSeconds??=0;run.waveStartKills??=run.killsTotal??0;run.waveStartLooted??=run.lootedTotal??0;run.peakThreat??=0;run.allies=(run.allies||[]).map((a,i)=>migrateSquadmate(a,i));
 run.player=nearestWalkable(plan.map,run.player);
 const occupied=[run.player];
 for(const a of run.allies){const p=nearestWalkable(plan.map,a);const placed=spacedSquadPosition(plan.map,p,occupied);a.x=placed.x;a.y=placed.y;occupied.push(a);}
 ensureEquipment(run);fog=createFog(plan.map,run.explored??[]);for(const enemy of run.enemies){
 const p=nearestWalkable(plan.map,enemy);enemy.x=p.x;enemy.y=p.y;enemy.kind??=enemy.boss?'boss':'shambler';if(enemy.boss&&enemy.alive&&enemy.maxHp<zombieStats('boss').hp){const fraction=enemy.maxHp>0?enemy.hp/enemy.maxHp:1;enemy.maxHp=zombieStats('boss').hp;enemy.hp=Math.max(1,enemy.maxHp*fraction)}enemy.attack??=0;enemy.windup??=0;enemy.phase??=0;enemy.aggro??=0;enemy.suppressed??=0;enemy.scoutMarked??=0;enemy.stagger??=0;enemy.hitFlash??=0;enemy.searchClock??=0;enemy.lastKnown??=null;enemy.alertMode??='idle';}return true}catch{return false}}
function menu(){combatFx=[];bloodFx=[];lootPopups=[];paused=true;overlay.hidden=false;overlay.innerHTML=`<article class="main-menu-screen"><h1>DEADZONE <span style="color:#f18567">PROTOCOL</span></h1><p>Wave-based survival roguelite. Outrun an endless growing horde, extract by elevator, upgrade in the Armory, and descend again. The old FOB campaign remains preserved in source code.</p><label>Save slot <select id="slot-select"><option value="1">SLOT 01</option><option value="2">SLOT 02</option><option value="3">SLOT 03</option></select></label><p id="career"></p><p id="build-version" role="status" style="background:#31564a;color:#f4fff4;font-weight:800;font-size:13px;letter-spacing:.025em;padding:10px 12px;border:1px solid #94b9a0;border-radius:8px;margin:10px 0 8px;text-align:center">UPDATED GAME · COMBAT AI · 10 CREDITS PER ZOMBIE<br>BUILD NOV 8, 2026</p><div class="menurow"><button id="continue-run">CONTINUE RUN</button><button id="new-run">NEW RUN</button><button id="upgrades">PERMANENT UNLOCKS</button></div></article>`;
const sel=overlay.querySelector<HTMLSelectElement>('#slot-select')!;sel.value=String(slot);const refresh=()=>{loadProfile();const active=localStorage.getItem(store('run'));overlay.querySelector('#career')!.textContent='BEST WAVE '+profile.bestWave+' · LEGACY TOKENS '+profile.tokens+' · RUNS '+profile.runs+(active?' · RUN IN PROGRESS':'');(overlay.querySelector<HTMLButtonElement>('#continue-run'))!.disabled=!active};refresh();
sel.onchange=()=>{slot=Number(sel.value);run=null;plan=null;refresh()};
overlay.querySelector<HTMLButtonElement>('#continue-run')!.onclick=()=>{if(!loadRun()){notice('No valid run found');return}paused=false;if(run!.stage==='shop')shop();else overlay.hidden=true};
overlay.querySelector<HTMLButtonElement>('#new-run')!.onclick=()=>{if(localStorage.getItem(store('run'))&&!confirm('Start a new run? Current run progress will be lost.'))return;preRun()};
overlay.querySelector<HTMLButtonElement>('#upgrades')!.onclick=()=>permanentShop();
}
function permanentShop(section='Core Bonuses'){loadProfile();paused=true;overlay.hidden=false;
 const groups=['Core Bonuses',...new Set(Object.values(unlocks).map(x=>x.group)),'Achievements'];
 if(!groups.includes(section))section='Core Bonuses';
 const choices=groups.map(g=>'<option value="'+g+'"'+(section===g?' selected':'')+'>'+g+'</option>').join('');
 const selection=section==='Core Bonuses'
  ?'<div class="shop"><button id="credit-unlock">STARTING CREDITS +50 · 25 TOKENS (max +200)</button><button id="ally-unlock">UNLOCK ONE STARTING TEAMMATE · 75 TOKENS</button></div>'
  :section==='Achievements'
  ?'<div class="achievement-grid">'+Object.entries(achievements).map(([id,x])=>'<div class="achievement-item">'+(profile.achievements.includes(id as keyof typeof achievements)?'✓ ':'○ ')+x.label+' · '+x.reward+' tokens</div>').join('')+'</div>'
  :'<div class="shop">'+Object.entries(unlocks).filter(([_,x])=>x.group===section).map(([id,x])=>'<button id="unlock-'+id+'">'+x.label+' · '+(profile.unlocked.includes(id as UnlockId)?'UNLOCKED':x.cost+' TOKENS')+'<small>'+x.description+'</small></button>').join('')+'</div>';
 overlay.innerHTML=`<article class="progression-screen"><h1>PERMANENT PROGRESSION</h1><p><strong>${profile.tokens} LEGACY TOKENS</strong> · Best wave ${profile.bestWave} · Runs ${profile.runs}</p><label class="progression-category">Category <select id="progression-group">${choices}</select></label>${selection}<div class="menurow"><button id="back-menu">BACK TO MENU</button></div></article>`;
 overlay.querySelector<HTMLSelectElement>('#progression-group')!.onchange=e=>permanentShop((e.target as HTMLSelectElement).value);
 if(section==='Core Bonuses'){
  overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.disabled=profile.tokens<25||profile.startingCredits>=200;
  overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.disabled=profile.tokens<75||profile.startAlly;
  overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.onclick=()=>{profile.tokens-=25;profile.startingCredits+=50;save();permanentShop(section)};
  overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.onclick=()=>{profile.tokens-=75;profile.startAlly=true;save();permanentShop(section)};
 }else if(section!=='Achievements'){
  for(const id of Object.keys(unlocks) as UnlockId[]){
   const b=overlay.querySelector<HTMLButtonElement>('#unlock-'+id);
   if(!b)continue;
   b.disabled=profile.unlocked.includes(id)||profile.tokens<unlocks[id].cost;
   b.onclick=()=>{if(buyUnlock(profile,id)){save();permanentShop(section)}};
  }
 }
 overlay.querySelector<HTMLButtonElement>('#back-menu')!.onclick=menu;
}
function runPerformance(r:Run):RunPerformance{return {cleared:r.cleared,bosses:r.bosses,killsTotal:r.killsTotal??0,lootedTotal:r.lootedTotal??0,flawlessWaves:r.flawlessWaves??0,bestSquad:r.bestSquad??0}}
function updateAchievements(r:Run){const award=progressAchievements(profile,runPerformance(r));if(award.names.length){notice('ACHIEVEMENT: '+award.names.join(', ')+' +'+award.reward+' Legacy Tokens');save()}}
function preRun(){loadProfile();paused=true;overlay.hidden=false;const p=profile;const c=sanitizeChoice(p,p.chosen);p.chosen=c;
 const options=(values:string[],selected:string,labels:Record<string,string>={})=>values.map(v=>'<option value="'+v+'"'+(v===selected?' selected':'')+'>'+(labels[v]??v.replace(/([A-Z])/g,' $1'))+'</option>').join('');
 const kit=startingKit(p);
 overlay.innerHTML=`<article class="prepare-run-screen"><h1>PREPARE NEW RUN</h1><p>Choose only from your permanent unlocks. All starting weapons and attachments are Basic rarity. In-run gear and credits reset on death.</p>
 <div class="prep-grid">
 <label>Primary Weapon<select id="start-primary">${options(allowedPrimary(p),c.primary,Object.fromEntries(Object.entries(weaponDefs).map(([id,w])=>[id,w.name])))}</select></label>
 <label>Secondary Weapon<select disabled><option>Service Pistol</option></select></label>
 <label>Melee Weapon<select id="start-melee">${options(allowedMelee(p),c.melee,{knife:'Survival Knife',axe:'Fire Axe'})}</select></label>
 <label>Optic<select id="start-optic">${options(p.unlocked.includes('starterRedDot')?['none','redDot']:['none'],c.optic,{none:'None',redDot:'Red Dot Sight'})}</select></label>
 <label>Underbarrel<select id="start-grip">${options(p.unlocked.includes('starterGrip')?['none','grip']:['none'],c.underbarrel,{none:'None',grip:'Foregrip'})}</select></label>
 <label>Starting Squad<select id="start-ally">${options(allowedTeammates(p),c.teammate,{none:'Start Solo',rifleman:'Rifleman',medic:'Medic',heavy:'Heavy Gunner',scout:'Scout',engineer:'Engineer'})}</select></label>
 </div>
 <p id="loadout-preview">${gearIcon(c.primary)}${gearIcon("pistol")}${gearIcon(c.melee)} Starting: ${kit.credits} credits · ${kit.armor} armor · ${kit.medkits} medkits · ${kit.capacity} backpack slots.</p>
 <div class="menurow"><button id="launch-run">DEPLOY INTO WAVE 1</button><button id="prep-back">BACK</button></div></article>`;
 const read=()=>{p.chosen=sanitizeChoice(p,{primary:overlay.querySelector<HTMLSelectElement>('#start-primary')!.value as WeaponId,secondary:'pistol',melee:overlay.querySelector<HTMLSelectElement>('#start-melee')!.value as 'knife'|'axe',optic:overlay.querySelector<HTMLSelectElement>('#start-optic')!.value as 'none'|'redDot',underbarrel:overlay.querySelector<HTMLSelectElement>('#start-grip')!.value as 'none'|'grip',teammate:overlay.querySelector<HTMLSelectElement>('#start-ally')!.value as 'none'|keyof typeof CLASS_INFO});save()};
 for(const id of ['start-primary','start-melee','start-optic','start-grip','start-ally'])overlay.querySelector<HTMLSelectElement>('#'+id)!.onchange=()=>{read();const preview=overlay.querySelector<HTMLElement>('#loadout-preview')!;const kit=startingKit(p);preview.innerHTML=gearIcon(kit.loadout.primary?.model??'carbine')+gearIcon('pistol')+gearIcon(kit.loadout.melee?.model??'knife')+' Starting: '+kit.credits+' credits · '+kit.armor+' armor · '+kit.medkits+' medkits · '+kit.capacity+' backpack slots.'};
 overlay.querySelector<HTMLButtonElement>('#launch-run')!.onclick=()=>{read();newRun()};
 overlay.querySelector<HTMLButtonElement>('#prep-back')!.onclick=menu;
}
function buildFloor(seed:number,wave:number){combatFx=[];bloodFx=[];shellEffects=[];shotKick=0;bossEffects=[];lootPopups=[];poseCache=new WeakMap<object,CharacterMotion>();if(run)run.layoutVersion=3;plan=makeWave(seed,wave,3);if(!run)return;run.explored=[];run.triggeredEvents=[];run.secretOpened=false;run.noiseEvent=null;run.sealedHoles=[];run.breachEvent=null;fog=createFog(plan.map);const p=plan.map.entrance;run.player={x:p.x,y:p.y};run.enemies=[];run.spawned=0;run.kills=0;run.looted=[];run.stage='fight';run.reloadTimer=0;run.reloadSlot=null;ensureEquipment(run).rerolls=0;run.focusTarget=null;run.waveHit=false;run.waveSeconds=0;run.waveStartKills=run.killsTotal??0;run.waveStartLooted=run.lootedTotal??0;run.peakThreat=0;run.waveStartHp=run.hp;run.waveStartArmor=run.armor;pathClock=0;pathField=null;searchFields.clear();bossPulse=0;noiseClock=0;const occupied=[run.player];for(let i=0;i<run.allies.length;i++){const ally=run.allies[i];const wanted={x:p.x-1-i*.45,y:p.y+1+i*.45};const placed=spacedSquadPosition(plan.map,wanted,occupied);ally.x=placed.x;ally.y=placed.y;occupied.push(ally);ally.anchor={x:ally.x,y:ally.y};ally.reviveProgress=0}spawnClock=0;allyClock=0;spawnInitial();save()}
function newRun(){loadProfile();const kit=startingKit(profile);run={wave:1,credits:kit.credits,hp:100,armor:kit.armor,mag:kit.loadout.primary?.mag??0,reserve:kit.ammo.rifle,medkits:kit.medkits,weaponTier:1,damage:1,maxMag:kit.loadout.primary?.mag??0,player:{x:0,y:0},enemies:[],allies:kit.teammate==='none'?[]:[makeSquadmate(kit.teammate,'starter-01',0,0)],spawned:0,kills:0,bosses:0,cleared:0,seed:Math.floor(Math.random()*2000000000),stage:'fight',looted:[],squadAmmo:kit.teammate==='none'?0:8,activeSlot:'primary',sideMag:kit.loadout.secondary?.mag??12,sideReserve:kit.ammo.light,reloadTimer:0,reloadSlot:null,playerDowned:0,playerDead:false,squadOrder:'follow',focusTarget:null,reviveProgress:0,killsTotal:0,lootedTotal:0,flawlessWaves:0,bestSquad:kit.teammate==='none'?0:1,waveHit:false,equipment:{loadout:kit.loadout,bag:[],ammo:kit.ammo,capacity:kit.capacity,rerolls:0}};buildFloor(run.seed,1);overlay.hidden=true;paused=false;notice('WAVE 1 · Reach the elevator before the horde overwhelms you')}
function isFloor(x:number,y:number){return !!plan&&walkableTile(plan.map,x,y)}
function canSee(ax:number,ay:number,bx:number,by:number){const dist=Math.hypot(ax-bx,ay-by),count=Math.ceil(dist*4);for(let i=1;i<count;i++){const a=i/count;if(!isFloor(ax+(bx-ax)*a,ay+(by-ay)*a))return false}return true}
/** Spawn close to the player, but never directly on top of the squad.
 * Initial placement covers a wider ring; reinforcements tighten the pressure.
 * Scan the nearby area first, widening only if floor geometry is restrictive.
 */
function spawnOne(boss=false,initial=false,preferredHole?:number){
 if(!run||!plan)return false;
 const holes=spawnHoles(plan);
 const open=openHoleIndices(holes,run.sealedHoles??[]);
 if(!open.length)return false; // A sealed floor cannot produce new zombies.
 const player=run.player,n=run.spawned;
 const candidates:{x:number;y:number;hole:number;score:number}[]=[];
 const clearance=(x:number,y:number)=>run!.enemies.every(e=>!e.alive||Math.hypot(e.x-x,e.y-y)>.39)
  &&run!.allies.every(a=>a.dead||Math.hypot(a.x-x,a.y-y)>.85)&&Math.hypot(player.x-x,player.y-y)>1.8;
 for(const index of open){
  const hole=holes[index];
  const dist=Math.hypot(player.x-hole.x,player.y-hole.y);
  // All new enemies emerge through a visibly drawn hole, never empty floor.
  for(let j=0;j<12;j++){
   const angle=(n*2.399963229728653+j*2.399963229728653+index*.42);
   const radius=j===0?0:.23+.12*Math.floor((j-1)/4);
   const x=hole.x+Math.cos(angle)*radius,y=hole.y+Math.sin(angle)*radius;
   if(!canOccupy(plan.map,x,y,.19)||!clearance(x,y))continue;
   const score=(initial?Math.abs(dist-10):Math.abs(dist-7))*.18+
    Math.abs(radius)*.36+((Math.imul(index+1,73856093)^Math.imul(n+1,19349663))>>>0)/4294967296*.65;
   candidates.push({x,y,hole:index,score:score+(preferredHole===index?-5:0)});
  }
 }
 if(!candidates.length)return false;
 candidates.sort((a,b)=>a.score-b.score);
 const chosen=candidates[0],kind=zombieKind(run.wave,n,boss),stats=zombieStats(kind);
 run.enemies.push({x:chosen.x,y:chosen.y,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,attack:0,boss,alive:true,kind,windup:0,phase:0,aggro:0,suppressed:0,scoutMarked:0,alertMode:'idle',searchClock:0,lastKnown:null,stagger:0,hitFlash:0,emerging:.55});
 run.spawned++;
 return true;
}
function spawnInitial(){
 if(!run||!plan)return;
 // A boss occupies one of the 65 available enemy slots on boss waves.
 const total=extractionActiveCap(0,run.wave),ordinary=total-(plan.boss?1:0);
 for(let attempt=0;run.enemies.length<ordinary&&attempt<ordinary+8;attempt++){
  if(!spawnOne(false,true))break;
 }
 if(plan.boss&&spawnOne(true,true))notice('WARNING · '+bossIdentity(run.wave).name+' DETECTED');
 run.peakThreat=Math.max(run.peakThreat??0,run.enemies.filter(e=>e.alive).length);
}
function remaining(){return run?run.enemies.filter(e=>e.alive).length:0}
function cleared(){return !!run&&!!plan&&run.stage==='fight'&&canExtract(run.sealedHoles??[],run.breachEvent??null)}
function equip(slot:WeaponSlot){if(!run||paused||run.stage!=='fight'||(run.playerDowned??0)>0)return;if(!ensureEquipment(run).loadout[slot]){notice('No weapon equipped in '+slot);return}run.activeSlot=slot;run.reloadTimer=0;run.reloadSlot=null;shotCooldown=.18;notice(itemName(activeWeapon(run)!));save()}
function swapFirearm(){
 if(!run||paused||run.stage!=='fight')return;
 const current=run.activeSlot??'primary';
 const target:WeaponSlot=current==='primary'?'secondary':'primary';
 if(ensureEquipment(run).loadout[target])equip(target);
 else if(ensureEquipment(run).loadout[current])notice('No alternate weapon equipped');
 else if(ensureEquipment(run).loadout.primary)equip('primary');
 else if(ensureEquipment(run).loadout.secondary)equip('secondary');
}
/** Visual-only impact blood on enemies struck by bullets or melee. */
function strikeZombie(enemy:Unit,damage:number,direction:{x:number;y:number},melee=false){
 if(!enemy.alive||!plan)return;
 enemy.hp-=damage;
 const reaction=hitReaction(enemy.kind??'shambler',damage,melee);
 enemy.stagger=Math.max(enemy.stagger??0,reaction.stagger);
 enemy.hitFlash=.20;
 enemy.hitVx=direction.x;enemy.hitVy=direction.y;
 if(reaction.knockback>0)moveUnit(enemy,direction.x,direction.y,reaction.knockback);
 zombieBlood(enemy,direction,melee,enemy.hp<=0);
 if(enemy.kind==='armored'&&!melee&&shellEffects.length<90)shellEffects.push(ejectCasing(enemy.x,enemy.y,direction.x,direction.y,Math.floor(enemy.hp*19), 'spark'));
 if(enemy.hp<=0)defeat(enemy);
}
function zombieBlood(enemy:Unit,direction:{x:number;y:number},melee=false,lethal=false){
 const seed=Math.imul((run?.killsTotal??0)+1,73)+Math.floor(enemy.hp*31)+Math.floor(performance.now()*10);
 bloodFx.push(...bloodOnHit(enemy.x,enemy.y,direction.x,direction.y,melee,seed,lethal));
 if(bloodFx.length>MAX_BLOOD_EFFECTS)bloodFx.splice(0,bloodFx.length-MAX_BLOOD_EFFECTS);
}
function weaponFlashAllowed(w:Weapon):boolean{
 return w.mods?.barrel?.model!=='suppressor'&&w.mods?.barrel?.model!=='flashHider'&&w.model!=='suppressedSmg';
}
function shoot(){
 if(!run||!plan||run.stage!=='fight'||paused||shotCooldown>0||run.hp<=0||(run.playerDowned??0)>0||run.reloadTimer)return;
 const w=activeWeapon(run);if(!w)return;
 const def=weaponDefs[w.model],handling=effectiveStats(w),p=run.player;
 if(def.ammo&&w.mag<=0){reload();return}
 if(def.ammo){w.mag--;noiseClock=2.4*handling.noise;run.noiseEvent={x:p.x,y:p.y,radius:Math.max(3,Math.min(19,12*handling.noise)),ttl:2.4};shotKick=Math.min(.3,shotKick+.09+handling.damage*.009);shellEffects.push(ejectCasing(p.x,p.y,aim.x,aim.y,run.kills+run.spawned+w.mag));}
 shotCooldown=handling.rate;
 const facing=unit(aim.x,aim.y);
 if(def.slot==='melee'){
  const hits=meleeHits(plan.map,p,facing,handling.range,run.enemies,w.model==='axe'?'axe':'knife');
  for(const hit of hits)strikeZombie(hit.target,handling.damage,facing,true)
  shotKick=.17;
  combatFx.push(...makeAttackFx(w.model,p.x,p.y,facing.x,facing.y,handling.range));
 }else{
  const profile=shotProfile(w.model)!;
  const distances:number[]=[];
  const targets=run.enemies.filter(e=>e.alive);
  for(let i=0;i<profile.count;i++){
   const offset=profile.count===1?0:(i/(profile.count-1)*2-1)*profile.spread;
   const angle=Math.atan2(facing.y,facing.x)+offset,dir={x:Math.cos(angle),y:Math.sin(angle)};
   const trace=traceBullet(plan.map,p,dir,handling.range,targets,penetrationFor(w.model));
   distances.push(trace.distance);
   if(!trace.hits.length&&trace.distance<handling.range-.12&&shellEffects.length<90)shellEffects.push(ejectCasing(p.x+dir.x*trace.distance,p.y+dir.y*trace.distance,dir.x,dir.y,i+run.kills, 'spark'));
   // A shotgun shell shares damage across its pellets; every pellet uses its own hit ray.
   const damage=handling.damage/profile.count;
   for(const hit of trace.hits)strikeZombie(hit.target,damage,dir)
  }
  combatFx.push(...makeAttackFx(w.model,p.x,p.y,facing.x,facing.y,handling.range,distances,weaponFlashAllowed(w)));
 }
 if(combatFx.length>120)combatFx.splice(0,combatFx.length-120);
 // Begin the normal timed reload immediately after spending the last round.
 if(def.ammo&&w.mag===0)reload();
 save();
}
function defeat(e:Unit){if(!run||!e.alive)return;if(e.boss)bossEffects.push({kind:bossAttack(run.wave),x:e.x,y:e.y,age:0,death:true,heading:Math.atan2(run.player.y-e.y,run.player.x-e.x)});e.alive=false;run.kills++;run.killsTotal=(run.killsTotal??0)+1;run.credits+=killPayout(run.wave,!!e.boss);if(e.boss){run.bosses++;notice(bossIdentity(run.wave).name+' ELIMINATED');const eq=ensureEquipment(run),reward=rareLoot(run.seed,run.wave,999,true);if(reward&&canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){eq.bag.push(reward);notice('BOSS REWARD: '+itemName(reward))}else{run.credits+=250;notice('BOSS REWARD: +250 credits (backpack full)')}}}
function reload(){if(!run||run.stage!=='fight'||run.reloadTimer||(run.playerDowned??0)>0)return;const w=activeWeapon(run);if(!w)return;const def=weaponDefs[w.model];if(!def.ammo)return;
 const eq=ensureEquipment(run),cap=effectiveStats(w).capacity,available=eq.ammo[def.ammo];
 if(w.mag>=cap||available<=0)return;run.reloadTimer=effectiveStats(w).reload;run.reloadSlot=run.activeSlot??'primary';notice('Reloading '+def.name+'...');save()}
function finishReload(){if(!run||!run.reloadSlot)return;const w=ensureEquipment(run).loadout[run.reloadSlot];if(w){const type=weaponDefs[w.model].ammo;if(type){const eq=ensureEquipment(run),n=Math.min(Math.max(0,effectiveStats(w).capacity-w.mag),eq.ammo[type]);w.mag+=n;eq.ammo[type]-=n}}
 run.reloadTimer=0;run.reloadSlot=null;save()}
function heal(){if(!run||run.stage!=='fight'||(run.playerDowned??0)>0||run.medkits<=0||run.hp>=100)return;run.medkits--;run.hp=Math.min(100,run.hp+40);save()}
function search(targetIndex?:number){
 if(!run||!plan||run.stage!=='fight'||(run.playerDowned??0)>0)return;
 const map=plan.map;
 const i=targetIndex===undefined?map.loot.findIndex((p,j)=>!run!.looted.includes(j)&&crateInRange(p,run!.player)):targetIndex;
 if(i<0){notice('No unopened supply container nearby');return}
 const crate=map.loot[i];
 if(!crate||run.looted.includes(i)||!crateInRange(crate,run.player)){notice('Move closer to search this container');return}
 const eq=ensureEquipment(run),kind=crate.kind==='weapon'?'weapon':'supply';
 const gear=crateLoot(run.seed,run.wave,i,kind);
 let model='credits',label='CREDITS';
 if(gear){
  if(!canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){
   notice('BACKPACK FULL — clear space before looting');return;
  }
  eq.bag.push(gear);model=gear.model;label=gear.kind==='weapon'?weaponDefs[gear.model].name:attachmentDefs[gear.model].name;
  notice((kind==='weapon'?'Weapon case: ':'Supply crate: ')+itemName(gear)+' added to backpack');
 }else{
  // Regular crates exclusively contain supplies (no guns). Attachments are bonus finds.
  const reward=(i+run.wave)%4;
  if(reward===0){
   const credits=75+run.wave*5;run.credits+=credits;label='+'+credits+' CREDITS';notice('Supply crate: '+label);
  }else if(reward===1){
   const type:AmmoType=(['rifle','light','shotgun','precision','heavy'] as AmmoType[])[(i+run.wave)%5];
   const added=addAmmo(eq.ammo,type,ammoPack[type].count,eq.bag,run.medkits,eq.capacity);
   if(!added){notice('BACKPACK FULL — cannot carry ammo');return}
   model='ammo';label=ammoLabels[type]+' +'+added;notice('Supply crate: '+label);
  }else if(reward===2){
   if(usedSlots(eq.bag,eq.ammo,run.medkits+1)>eq.capacity){notice('BACKPACK FULL — cannot carry medkit');return}
   run.medkits++;model='medkit';label='MEDKIT +1';notice('Supply crate: medkit');
  }else{
   const credits=45+run.wave*4;run.credits+=credits;label='+'+credits+' CREDITS';notice('Supply crate: '+label);
  }
 }
 run.looted.push(i);run.lootedTotal=(run.lootedTotal??0)+1;
 lootPopups=lootPopups.filter(p=>performance.now()-p.start<2200);
 lootPopups.push({x:crate.x,y:crate.y,model,label,start:performance.now()});
 save();
}
/** Every extraction produces a wave report; the player may continue deeper or bank the run. */
function waveReport(){
 if(!run)return;
 paused=true;overlay.hidden=false;
 const r=run,seconds=r.waveSeconds??0;
 const waveKills=(r.killsTotal??0)-(r.waveStartKills??0);
 const waveLoot=(r.lootedTotal??0)-(r.waveStartLooted??0);
 const reward=clearPayout(r.wave);
 overlay.innerHTML=`<article class="run-results"><h1>EXTRACTION SUCCESSFUL</h1><p>Wave ${r.wave} completed · ${formatRunTime(seconds)} inside the danger zone</p>
 <div class="results-grid">
 <div><strong>${waveKills}</strong><span>Zombies eliminated</span></div>
 <div><strong>${waveLoot}</strong><span>Containers searched</span></div>
 <div><strong>${r.spawned}</strong><span>Zombies spawned</span></div>
 <div><strong>${Math.ceil(r.hp)}</strong><span>Health remaining</span></div>
 <div><strong>${Math.ceil(r.armor)}</strong><span>Armor remaining</span></div>
 <div><strong>${r.allies.filter(a=>!a.dead).length}/4</strong><span>Squad survivors</span></div>
 <div><strong>+${reward}</strong><span>Extraction credits</span></div>
 </div>
 <div class="menurow"><button id="extraction-continue">CONTINUE TO ARMORY</button><button id="extraction-cashout">END RUN SUCCESSFULLY</button></div></article>`;
 overlay.querySelector<HTMLButtonElement>('#extraction-continue')!.onclick=shop;
 overlay.querySelector<HTMLButtonElement>('#extraction-cashout')!.onclick=()=>finishRun(true);
}
function openSecret(){
 if(!run||!plan||!plan.map.secret||run.secretOpened)return;
 const d=plan.map.secret.door;
 if(Math.hypot(run.player.x-d.x,run.player.y-d.y)>1.65)return;
 run.secretOpened=true;plan.map.tiles[d.y*plan.map.width+d.x]=0;
 notice('SECRET ROOM DISCOVERED · Hidden military cache');
 save();
}
function triggerFloorEvents(){
 if(!run||!plan)return;
 const events=plan.map.events??[];
 for(let i=0;i<events.length;i++){
  const event=events[i];
  if(run.triggeredEvents?.includes(i)||Math.hypot(run.player.x-event.x,run.player.y-event.y)>1.5)continue;
  (run.triggeredEvents??=[]).push(i);
  switch(event.kind){
   case 'supplyDrop':{
    const amount=90+run.wave*15;run.credits+=amount;
    notice('SUPPLY DROP RECOVERED · +'+amount+' credits');break;
   }
   case 'fieldHospital':
    run.hp=Math.min(100,run.hp+35);run.medkits++;
    notice('ABANDONED AID STATION · +35 health, +1 medkit');break;
   case 'powerSurge':
    run.armor=Math.min(100,run.armor+35);
    notice('EMERGENCY POWER RESTORED · +35 armor');break;
   case 'infectedNest':
    for(let j=0;j<5;j++)spawnOne(false,false);
    notice('INFECTED NEST DISTURBED · Horde alerted!');break;
  }
  save();
 }
}
function elevator(){
 if(!run||!plan||run.stage!=='fight'||(run.playerDowned??0)>0)return;
 if(!canExtract(run.sealedHoles??[],run.breachEvent??null)){
  notice('ELEVATOR LOCKED · Seal '+REQUIRED_SEALS+' holes first ('+(run.sealedHoles??[]).length+'/'+REQUIRED_SEALS+')');return;
 }
 const p=plan.map.extraction;
 if(!elevatorInRange(plan.map,run.player)){notice('Move closer to the elevator doors');return}
 run.credits+=clearPayout(run.wave);
 run.cleared++;
 if(!run.waveHit)run.flawlessWaves=(run.flawlessWaves??0)+1;
 run.bestSquad=Math.max(run.bestSquad??0,run.allies.filter(a=>!a.dead).length);
 updateAchievements(run);
 run.stage='shop';
 save();
 waveReport();
}
type NearbyInteraction={kind:'loot';index:number}|{kind:'elevator'}|{kind:'secret'}|{kind:'hole';index:number};
function nearbyInteraction():NearbyInteraction|null{
 if(!run||!plan||paused||run.stage!=='fight'||(run.playerDowned??0)>0)return null;
 const p=run.player;
 const holeIndex=spawnHoles(plan).findIndex((hole,i)=>!(run!.sealedHoles??[]).includes(i)&&run!.breachEvent?.index!==i&&Math.hypot(p.x-hole.x,p.y-hole.y)<=1.7);
 if(holeIndex>=0)return {kind:'hole',index:holeIndex};
 const secret=plan.map.secret;
 if(secret&&!run.secretOpened&&Math.hypot(p.x-secret.door.x,p.y-secret.door.y)<=1.65)return {kind:'secret'};
 const index=plan.map.loot.findIndex((item,i)=>!run!.looted.includes(i)&&crateInRange(item,p));
 if(index>=0)return {kind:'loot',index};
 const exit=plan.map.extraction;
 if(elevatorInRange(plan.map,p))return {kind:'elevator'};
 return null;
}
function closeSpawnHole(index:number){
 if(!run||!plan||paused||run.stage!=='fight'||(run.playerDowned??0)>0)return;
 if(run.breachEvent){notice('PROTECT THE ACTIVE BREACH FIRST');return}
 const hole=spawnHoles(plan)[index];
 if(!hole||Math.hypot(hole.x-run.player.x,hole.y-run.player.y)>1.7)return;
 const result=startBreachEvent(run.credits,run.sealedHoles??[],index,spawnHoles(plan).length,run.breachEvent??null);
 if(!result){notice('NEED '+SEAL_COST+' CREDITS TO START SEALING');return}
 run.credits=result.credits;run.breachEvent=result.event;
 // The machinery immediately draws the attention of nearby infected.
 alertBreach(hole);
 notice('SEALING STARTED · -'+SEAL_COST+' CREDITS');
 save();
}
function alertBreach(hole:{x:number;y:number}){
 if(!run)return;
 run.noiseEvent={x:hole.x,y:hole.y,radius:17,ttl:1.5};
 for(const e of run.enemies){
  if(!e.alive||Math.hypot(e.x-hole.x,e.y-hole.y)>17)continue;
  e.aggro=Math.max(6,e.aggro??0);e.lastKnown={x:hole.x,y:hole.y};
  e.searchClock=0;e.alertMode='investigate';
 }
}
function updateBreach(dt:number){
 if(!run||!plan||!run.breachEvent)return;
 const event=run.breachEvent,hole=spawnHoles(plan)[event.index];
 if(!hole){run.breachEvent=null;save();return}
 const next=advanceBreachEvent(event,dt);
 // Keep the loud sealing machinery audible throughout the countdown.
 alertBreach(hole);
 for(let i=0;i<next.spawnCount;i++){
  const active=run.enemies.reduce((count,e)=>count+(e.alive?1:0),0);
  if(active>=extractionActiveCap(run.waveSeconds??0,run.wave)+8)break;
  if(spawnOne(false,false,event.index)){
   const enemy=run.enemies[run.enemies.length-1];
   enemy.aggro=7;enemy.lastKnown={x:hole.x,y:hole.y};
   enemy.alertMode='investigate';enemy.searchClock=0;
  }
 }
 run.breachEvent=next.event;
 if(next.completed){
  if(!(run.sealedHoles??[]).includes(event.index))(run.sealedHoles??=[]).push(event.index);
  notice('BREACH SEALED · '+run.sealedHoles!.length+'/'+REQUIRED_SEALS+' REQUIRED');
  save();
 }
}
function interact(){
 const target=nearbyInteraction();
 if(!target)return;
 if(target.kind==='loot')search(target.index);
 else if(target.kind==='secret')openSecret();
 else if(target.kind==='hole')closeSpawnHole(target.index);
 else elevator();
}
function buySupply(cost:number,action:()=>boolean){if(!run||run.credits<cost){notice('Insufficient credits');return}if(!action())return;run.credits-=cost;save();shop()}
/** Compact, fixed-in-panel survivor status shared by the Armory and inventory. */
function armoryStatus(r:Run):string{
 const eq=ensureEquipment(r),weapon=eq.loadout[r.activeSlot??'primary']??eq.loadout.primary;
 const ammo=weapon&&weaponDefs[weapon.model].ammo
  ?weapon.mag+'/'+eq.ammo[weaponDefs[weapon.model].ammo!]
  :'MELEE';
 const display=(label:string,value:string|number)=>'<span class="armory-stat"><small>'+label+'</small><strong>'+value+'</strong></span>';
 return '<div class="armory-status" role="group" aria-label="Survivor stats">'+
  display('WAVE',r.wave)+display('CREDITS','₡'+r.credits)+
  display('HEALTH',Math.ceil(r.hp)+'/100')+display('ARMOR',Math.ceil(r.armor)+'/100')+
  display('SQUAD',r.allies.filter(a=>!a.dead).length+'/4')+
  display('BACKPACK',inventorySummary(r))+
  display('WEAPON',weapon?weaponDefs[weapon.model].name:'Unarmed')+
  display('AMMO',ammo)+display('MEDKITS',r.medkits)+
  '</div><div class="armory-reserves" aria-label="Ammo reserves">'+ammoTypes.map(type=>'<span>'+ammoLabels[type]+': <b>'+eq.ammo[type]+'</b></span>').join('')+'</div>';
}
/** Retain scroll location when interacting with inventory or purchasing supplies. */
let inventoryScroll:{left:number;right:number;page:number}|null=null;
function captureInventoryScroll(){
 const panes=overlay.querySelectorAll<HTMLElement>('.inventory-section');
 inventoryScroll={left:panes[0]?.scrollTop??0,right:panes[1]?.scrollTop??0,page:overlay.scrollTop};
}
function restoreInventoryScroll(){
 if(!inventoryScroll)return;
 const panes=overlay.querySelectorAll<HTMLElement>('.inventory-section');
 if(panes[0])panes[0].scrollTop=inventoryScroll.left;
 if(panes[1])panes[1].scrollTop=inventoryScroll.right;
 overlay.scrollTop=inventoryScroll.page;
}
function shop(){if(!run)return;
 paused=true;overlay.hidden=false;const r=run,eq=ensureEquipment(r);const baseOffers=armoryOffers(r.seed,r.wave,eq.rerolls);
 const offers=baseOffers.filter(o=>o.kind!=='recruit'||eligibleRecruit(profile,o.model as keyof typeof CLASS_INFO));
 if(!offers.some(o=>o.kind==='recruit'))offers.push({kind:'recruit',model:'rifleman',tier:1,price:CLASS_INFO.rifleman.cost});
 if(profile.unlocked.includes('armoryCatalog')){const more=armoryOffers(r.seed^0x71ecad,r.wave,eq.rerolls+1).filter(o=>o.kind!=='recruit');offers.push(...more.slice(0,2))}
 const ammoButtons=ammoTypes.map(type=>`<button class="armory-item" id="ammo-${type}">${gearIcon("ammo")}<span class="armory-item-copy"><b>${ammoLabels[type]} +${ammoPack[type].count}</b><small>${ammoPack[type].price} credits</small></span></button>`).join('');
 const offerButtons=offers.map((offer,i)=>{
  const name=offer.kind==='weapon'?weaponDefs[offer.model as WeaponId].name:offer.kind==='attachment'?attachmentDefs[offer.model as AttachmentId].name:CLASS_INFO[offer.model as keyof typeof CLASS_INFO].label+' Recruit';
  const description=offer.kind==='attachment'?attachmentDescriptions[offer.model as AttachmentId]:'';
  return `<button class="armory-item ${offer.kind==='recruit'?'':rarityClass(offer.tier)}" id="offer-${i}" title="${description}">${gearIcon(offer.kind==='recruit'?'armor':offer.model)}<span class="armory-item-copy"><b>${name} ${offer.kind==='recruit'?'':' · '+rarityName(offer.tier)}</b>${description?'<em class="armory-item-description">'+description+'</em>':''}<small>${offer.price} credits</small></span></button>`;
 }).join('');
 const bag=inventorySummary(r);
 overlay.innerHTML=`<article class="armory-screen"><div class="armory-top"><h1>ARMORY · WAVE ${r.wave} COMPLETE</h1><nav class="management-toolbar" aria-label="Armory actions"><button id="reroll-buy">REROLL · ${advanceOfferPrice(eq.rerolls)} CR</button><button id="shop-inventory">INVENTORY (${bag})</button><button id="shop-squad">SQUAD</button><button id="refill-all-armory">REFILL SQUAD · ${SQUAD_AMMO_REFILL_COST} CR</button><button id="descend">NEXT WAVE ${r.wave+1}</button><button id="save-menu">SAVE / MENU</button></nav>${armoryStatus(r)}</div>
 <div class="armory-columns"><section class="armory-section armory-supplies"><h2>Essential Supplies — Always Available</h2><div class="shop">${ammoButtons}<button class="armory-item" id="med-buy">${gearIcon("medkit")}<span class="armory-item-copy"><b>Medkit +1</b><small>200 credits</small></span></button><button class="armory-item" id="heal-buy">${gearIcon("medkit")}<span class="armory-item-copy"><b>Heal +35 HP</b><small>175 credits</small></span></button><button class="armory-item" id="armor-buy">${gearIcon("armor")}<span class="armory-item-copy"><b>Armor +40</b><small>220 credits</small></span></button><button class="armory-item" id="pack-buy">${gearIcon("armor")}<span class="armory-item-copy"><b>Backpack +4 slots</b><small>${backpackUpgradePrice(eq.capacity)} credits · max 24</small></span></button></div>
 </section><section class="armory-section armory-offers"><h2>Rotating Armory Offers</h2><p>Higher rarities become more common in later waves. Gear enters your backpack; use Inventory to equip, upgrade, attach or sell it.</p><div class="shop">${offerButtons}</div></section></div>
 </article>`;
 const bind=(id:string,cost:number,action:()=>boolean,allowed=true)=>{const el=overlay.querySelector<HTMLButtonElement>('#'+id)!;el.disabled=!allowed||r.credits<cost;el.onclick=()=>buySupply(cost,action)};
 for(const type of ammoTypes){const info=ammoPack[type];bind('ammo-'+type,info.price,()=>{const count=addAmmo(eq.ammo,type,info.count,eq.bag,r.medkits,eq.capacity);if(count<info.count){eq.ammo[type]-=count;notice('Need room for the entire ammo pack');return false}return true})}
 bind('med-buy',200,()=>{if(usedSlots(eq.bag,eq.ammo,r.medkits+1)>eq.capacity){notice('BACKPACK FULL');return false}r.medkits++;return true});
 bind('heal-buy',175,()=>{r.hp=Math.min(100,r.hp+35);return true},r.hp<100);
 bind('armor-buy',220,()=>{r.armor=Math.min(100,r.armor+40);return true},r.armor<100);
 const packCost=backpackUpgradePrice(eq.capacity);
 bind('pack-buy',packCost,()=>{eq.capacity+=4;return true},eq.capacity<24);
 offers.forEach((offer,i)=>bind('offer-'+i,offer.price,()=>{
  if(offer.kind==='recruit'){if(!canRecruit(r.allies.length)){notice('SQUAD FULL');return false}const role=offer.model as keyof typeof CLASS_INFO;const pos=spacedSquadPosition(plan!.map,{x:r.player.x+1,y:r.player.y+1},[r.player,...r.allies.filter(a=>!a.dead)]);r.allies.push(makeSquadmate(role,gearId(r),pos.x,pos.y));r.squadAmmo+=8;return true}
  if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity)){notice('BACKPACK FULL');return false}
  const item=offer.kind==='weapon'?newWeapon(offer.model as WeaponId,offer.tier,gearId(r)):newMod(offer.model as AttachmentId,offer.tier,gearId(r));eq.bag.push(item);notice(itemName(item)+' purchased');return true
 },offer.kind!=='recruit'||canRecruit(r.allies.length)));
 bind('reroll-buy',advanceOfferPrice(eq.rerolls),()=>{eq.rerolls++;return true});
 const refillArmory=overlay.querySelector<HTMLButtonElement>('#refill-all-armory')!;
 refillArmory.disabled=r.credits<SQUAD_AMMO_REFILL_COST||squadAmmoNeeded(r.allies)===0;
 refillArmory.onclick=()=>{if(r.credits<SQUAD_AMMO_REFILL_COST||squadAmmoNeeded(r.allies)===0)return;r.credits-=SQUAD_AMMO_REFILL_COST;const amount=refillSquadAmmo(r.allies);notice('SQUAD REARMED · +'+amount+' ROUNDS');save();shop()};
 overlay.querySelector<HTMLButtonElement>('#shop-inventory')!.onclick=()=>{inventoryScroll=null;inventory()};overlay.querySelector<HTMLButtonElement>('#shop-squad')!.onclick=squadPanel;
 overlay.querySelector<HTMLButtonElement>('#descend')!.onclick=()=>{if(!run)return;run.wave++;run.seed=(run.seed^Math.imul(run.wave,0x9e3779b1))>>>0;buildFloor(run.seed,run.wave);overlay.hidden=true;paused=false;notice('WAVE '+run.wave+' · Find the elevator before the endless horde catches you')};
 overlay.querySelector<HTMLButtonElement>('#save-menu')!.onclick=()=>{save();menu()};
}
function inventory(){if(!run)return;paused=true;overlay.hidden=false;
 const r=run,eq=ensureEquipment(r),atShop=r.stage==='shop';
 const slotRows=(['primary','secondary','melee'] as Slot[]).map(slot=>{const w=eq.loadout[slot];const mods=w?Object.values(w.mods).filter((m):m is Mod=>!!m):[];
  return `<section class="equipment-row ${w?rarityClass(w.tier):''}" style="padding:7px;border-bottom:1px solid #3f6055"><b>${slot.toUpperCase()}</b> — ${w?gearIcon(w.model)+itemName(w):'EMPTY'} ${w?(' · '+(weaponDefs[w.model].ammo?'MAG '+w.mag+'/'+effectiveStats(w).capacity:'MELEE')):''}<br>${mods.map(m=>itemName(m)).join(' · ')||'No attachments'} ${w?'<button id="remove-'+slot+'">UNEQUIP</button>':''} ${w&&atShop&&w.tier<6?'<button id="upgrade-equipped-'+slot+'">UPGRADE '+upgradePrice(w)+' CR</button>':''} ${mods.map(m=>'<button id="detach-'+slot+'-'+attachmentDefs[m.model].slot+'">REMOVE '+attachmentDefs[m.model].slot+'</button>'+(atShop&&m.tier<6?'<button id="upgrade-mod-'+slot+'-'+attachmentDefs[m.model].slot+'">UPGRADE MOD '+upgradePrice(m)+' CR</button>':'')).join(' ')}</section>`}).join('');
 const rows=eq.bag.map((gear,i)=>`<section class="equipment-row ${rarityClass(gear.tier)}" style="padding:8px;border-bottom:1px solid #3f6055"><b>${gearIcon(gear.model)}${itemName(gear)}</b> ${gear.kind==='weapon'?' · DMG '+effectiveStats(gear).damage.toFixed(1)+' · '+(weaponDefs[gear.model].ammo??'no ammo'):' · '+attachmentDefs[gear.model].stat} · Sell ${salePrice(gear)} credits <div class="menurow">${gear.kind==='weapon'?'<button id="equip-item-'+i+'">EQUIP '+weaponDefs[gear.model].slot.toUpperCase()+'</button>':(['primary','secondary'] as Slot[]).filter(slot=>{const w=eq.loadout[slot];return w&&canEquipMod(w,gear)}).map(slot=>'<button id="attach-'+i+'-'+slot+'">ATTACH '+slot+'</button>').join('')}${atShop&&gear.tier<6?'<button id="upgrade-item-'+i+'">UPGRADE '+upgradePrice(gear)+' CR</button>':''}<button id="dispose-${i}">${atShop?'SELL':'DROP'}</button></div></section>`).join('');
 overlay.innerHTML=`<article class="inventory-screen"><div class="armory-top"><h1>INVENTORY · ${inventorySummary(r)} SLOTS</h1><nav class="management-toolbar" aria-label="Inventory navigation"><button id="close-inventory">${atShop?'BACK TO ARMORY':'RETURN TO GAME'}</button><button id="inventory-squad">SQUAD</button></nav>${atShop?armoryStatus(r):''}</div><p>Gear uses one backpack slot. Ammo reserves stack into slots; medkits stack three per slot. Equipped gear does not occupy backpack space.</p><div class="inventory-columns"><section class="inventory-section"><h2>Equipped Gear</h2>${slotRows}</section><section class="inventory-section"><h2>Backpack</h2>${rows||'<p>Backpack empty</p>'}</section></div><h2>Supplies</h2><p>${ammoTypes.map(t=>ammoLabels[t]+': '+eq.ammo[t]).join(' · ')} · Medkits: ${r.medkits}</p><div class="menurow">${ammoTypes.filter(t=>eq.ammo[t]>0).map(t=>'<button id="discard-'+t+'">'+(atShop?'SELL':'DROP')+' '+ammoLabels[t]+' '+Math.min(ammoStack[t],eq.ammo[t])+'</button>').join('')} ${r.medkits>0?'<button id="discard-med">'+(atShop?'SELL':'DROP')+' 1 MEDKIT</button>':''}</div></article>`;
 const refresh=()=>{captureInventoryScroll();save();inventory()};
 restoreInventoryScroll();
 for(const slot of ['primary','secondary','melee'] as Slot[]){
  const w=eq.loadout[slot];if(!w)continue;
  const remove=overlay.querySelector<HTMLButtonElement>('#remove-'+slot)!;remove.disabled=!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity);
  if(atShop&&w.tier<6){const upgrade=overlay.querySelector<HTMLButtonElement>('#upgrade-equipped-'+slot)!;const price=upgradePrice(w);upgrade.disabled=r.credits<price;upgrade.onclick=()=>{if(r.credits<price)return;r.credits-=price;w.tier=(w.tier+1) as Tier;refresh()}}
  remove.onclick=()=>{if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity))return;eq.bag.push(w);eq.loadout[slot]=null;if(r.activeSlot===slot)r.activeSlot='primary';refresh()};
  for(const m of Object.values(w.mods)){if(!m)continue;const field=attachmentDefs[m.model].slot;const btn=overlay.querySelector<HTMLButtonElement>('#detach-'+slot+'-'+field)!;
   btn.disabled=!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity);
   btn.onclick=()=>{if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity))return;eq.bag.push(m);delete w.mods[field];refresh()};
   if(atShop&&m.tier<6){const upgrade=overlay.querySelector<HTMLButtonElement>('#upgrade-mod-'+slot+'-'+field)!;const price=upgradePrice(m);upgrade.disabled=r.credits<price;upgrade.onclick=()=>{if(r.credits<price)return;r.credits-=price;m.tier=(m.tier+1) as Tier;refresh()}}
  }
 }
 eq.bag.forEach((gear,i)=>{
  if(gear.kind==='weapon'){
   const slot=weaponDefs[gear.model].slot,btn=overlay.querySelector<HTMLButtonElement>('#equip-item-'+i)!;
   btn.onclick=()=>{const previous=eq.loadout[slot];eq.loadout[slot]=gear;eq.bag.splice(i,1);if(previous)eq.bag.push(previous);r.reloadTimer=0;r.reloadSlot=null;refresh()};
  }else{for(const slot of ['primary','secondary'] as Slot[]){
   const w=eq.loadout[slot];if(!w||!canEquipMod(w,gear))continue;
   const btn=overlay.querySelector<HTMLButtonElement>('#attach-'+i+'-'+slot)!;
   btn.onclick=()=>{const field=attachmentDefs[gear.model].slot,previous=w.mods[field];w.mods[field]=gear;eq.bag.splice(i,1);if(previous)eq.bag.push(previous);w.mag=Math.min(w.mag,effectiveStats(w).capacity);refresh()};
  }}
  if(atShop&&gear.tier<6){const up=overlay.querySelector<HTMLButtonElement>('#upgrade-item-'+i)!;const price=upgradePrice(gear);up.disabled=r.credits<price;up.onclick=()=>{if(r.credits<price)return;r.credits-=price;gear.tier=(gear.tier+1) as Tier;refresh()}}
  const dispose=overlay.querySelector<HTMLButtonElement>('#dispose-'+i)!;
  dispose.onclick=()=>{eq.bag.splice(i,1);if(atShop)r.credits+=salePrice(gear);refresh()};
 });
 for(const type of ammoTypes){if(eq.ammo[type]<=0)continue;const btn=overlay.querySelector<HTMLButtonElement>('#discard-'+type)!;btn.onclick=()=>{const amount=Math.min(eq.ammo[type],ammoStack[type]);eq.ammo[type]-=amount;if(atShop)r.credits+=Math.floor(ammoPack[type].price*amount/ammoPack[type].count*.25);refresh()}}
 if(r.medkits>0){overlay.querySelector<HTMLButtonElement>('#discard-med')!.onclick=()=>{r.medkits--;if(atShop)r.credits+=45;refresh()}}
 overlay.querySelector<HTMLButtonElement>('#inventory-squad')!.onclick=()=>{inventoryScroll=null;save();squadPanel()};
 overlay.querySelector<HTMLButtonElement>('#close-inventory')!.onclick=()=>{inventoryScroll=null;save();if(atShop)shop();else{paused=false;overlay.hidden=true}};
}
function squadPanel(){if(!run)return;paused=true;overlay.hidden=false;const r=run,eq=ensureEquipment(r),atShop=r.stage==='shop';
 const cards=r.allies.map((a,i)=>{const eligible=eq.bag.map((item,j)=>item.kind==='weapon'&&canClassEquip(a.role,item.model)?'<button id="sq-equip-'+i+'-'+j+'">EQUIP '+itemName(item)+'</button>':'').join('');
 return `<section style="padding:10px 0;border-bottom:1px solid #567366"><b>${a.name} · ${CLASS_INFO[a.role].label}</b><p>HP ${Math.ceil(a.hp)}/${a.maxHp} · ARMOR ${Math.ceil(a.armor)} · ${a.downed>0?'DOWNED '+Math.ceil(a.downed)+'s':'ACTIVE'} · ACTIVE ${a.activeSlot.toUpperCase()} · Gear ${rarityName(a.gearTier)} · AMMO ${a.magReserve}/${SQUAD_MAX_AMMO}<br>${CLASS_INFO[a.role].special}</p><div class="squad-weapons"><small>PRIMARY: ${itemName(a.weapon)} · SECONDARY: ${itemName(a.secondaryWeapon)} · MELEE: ${itemName(a.meleeWeapon)}</small><div class="menurow"><button id="sq-slot-primary-${i}">PRIMARY</button><button id="sq-slot-secondary-${i}">SIDEARM</button><button id="sq-slot-melee-${i}">MELEE</button></div></div><div class="menurow">${atShop?'<button id="sq-heal-'+i+'">HEAL +40 · 175 CR</button><button id="sq-armor-'+i+'">ARMOR +40 · 220 CR</button><button id="sq-ammo-'+i+'">CLASS AMMO +80 · 150 CR</button><button id="sq-up-'+i+'">CLASS GEAR UPGRADE · '+gearUpgradeCost(a)+' CR</button>':''}${eligible}</div></section>`}).join('');
 overlay.innerHTML=`<article class="squad-management"><div class="armory-top"><h1>SQUAD MANAGEMENT</h1><nav class="management-toolbar" aria-label="Squad navigation"><button id="squad-return">${atShop?'BACK TO ARMORY':'RETURN TO GAME'}</button><button id="squad-inventory">INVENTORY</button><button id="squad-refill">REFILL ALL AMMO · ${SQUAD_AMMO_REFILL_COST} CR</button></nav></div><p>${r.allies.length}/4 specialists · ${r.credits} credits · Order: ${orderLabel(r.squadOrder??'follow')}</p>${cards||'<p>No living squad members. Recruits appear in the between-wave Armory.</p>'}</article>`;
 const refresh=()=>{save();squadPanel()};
 const refill=overlay.querySelector<HTMLButtonElement>('#squad-refill')!;
 refill.disabled=!atShop||r.credits<SQUAD_AMMO_REFILL_COST||squadAmmoNeeded(r.allies)===0;
 refill.onclick=()=>{if(!atShop||r.credits<SQUAD_AMMO_REFILL_COST||squadAmmoNeeded(r.allies)===0)return;r.credits-=SQUAD_AMMO_REFILL_COST;const count=refillSquadAmmo(r.allies);notice('SQUAD REARMED · +'+count+' ROUNDS');refresh()};
 overlay.querySelector<HTMLButtonElement>('#squad-inventory')!.onclick=()=>{inventoryScroll=null;inventory()};
 r.allies.forEach((a,i)=>{
  for(const slot of ['primary','secondary','melee'] as Slot[]){const button=overlay.querySelector<HTMLButtonElement>('#sq-slot-'+slot+'-'+i)!;button.classList.toggle('selected',a.activeSlot===slot);button.onclick=()=>{setSquadWeaponSlot(a,slot);refresh()}}
  if(atShop){const heal=overlay.querySelector<HTMLButtonElement>('#sq-heal-'+i)!;heal.disabled=r.credits<175||a.hp>=a.maxHp||a.downed>0;heal.onclick=()=>{if(r.credits<175||a.downed>0)return;r.credits-=175;a.hp=Math.min(a.maxHp,a.hp+40);refresh()};
   const armor=overlay.querySelector<HTMLButtonElement>('#sq-armor-'+i)!;armor.disabled=r.credits<220||a.armor>=100;armor.onclick=()=>{if(r.credits<220)return;r.credits-=220;a.armor=Math.min(100,a.armor+40);refresh()};
   const ammo=overlay.querySelector<HTMLButtonElement>('#sq-ammo-'+i)!;ammo.disabled=r.credits<150||a.magReserve>=SQUAD_MAX_AMMO;ammo.onclick=()=>{if(r.credits<150)return;r.credits-=150;a.magReserve=Math.min(SQUAD_MAX_AMMO,a.magReserve+80);refresh()};
   const up=overlay.querySelector<HTMLButtonElement>('#sq-up-'+i)!;const price=gearUpgradeCost(a);up.disabled=r.credits<price||a.gearTier>=6;up.onclick=()=>{if(r.credits<price)return;r.credits-=price;a.gearTier=(a.gearTier+1) as Tier;a.armorTier=a.gearTier;for(const weapon of [a.weapon,a.secondaryWeapon,a.meleeWeapon])weapon.tier=Math.max(weapon.tier,a.gearTier) as Tier;refresh()};
  }
  eq.bag.forEach((item,j)=>{if(item.kind!=='weapon'||!canClassEquip(a.role,item.model))return;const btn=overlay.querySelector<HTMLButtonElement>('#sq-equip-'+i+'-'+j)!;btn.onclick=()=>{const slot=weaponDefs[item.model].slot,old=slot==='primary'?a.weapon:slot==='secondary'?a.secondaryWeapon:a.meleeWeapon;if(equipClassWeapon(a,item)){eq.bag.splice(j,1);eq.bag.push(old);refresh()}}});
 });
 overlay.querySelector<HTMLButtonElement>('#squad-return')!.onclick=()=>{save();if(atShop)shop();else{paused=false;overlay.hidden=true}};
}
function finishRun(success:boolean){
 if(!run)return;
 const r=run;
 const performance=runPerformance(r),achieved=progressAchievements(profile,performance);
 const base=permanentPayout(r.cleared,r.bosses),bonus=performancePayout(performance);
 const total=base+bonus+achieved.reward;
 profile.tokens+=base+bonus;
 profile.bestWave=Math.max(profile.bestWave,r.wave);
 profile.runs++;
 const wave=r.wave,clearedCount=r.cleared;
 const elapsed=formatRunTime(r.runSeconds??0),waveElapsed=formatRunTime(r.waveSeconds??0);
 const kills=r.killsTotal??0,loot=r.lootedTotal??0,bosses=r.bosses;
 const health=Math.ceil(r.hp),armor=Math.ceil(r.armor);
 const squad=r.allies.filter(a=>!a.dead).length;
 run=null;plan=null;fog=null;combatFx=[];bloodFx=[];paused=true;save();overlay.hidden=false;
 overlay.innerHTML=`<article class="run-results"><h1>${success?'RUN COMPLETED':'RUN OVER'}</h1><p>${success?'Successfully extracted':'Squad lost'} · ${elapsed} total survival time · ${waveElapsed} in final wave</p>
 <div class="results-grid">
 <div><strong>${wave}</strong><span>Highest wave</span></div>
 <div><strong>${clearedCount}</strong><span>Successful extractions</span></div>
 <div><strong>${kills}</strong><span>Zombies eliminated</span></div>
 <div><strong>${loot}</strong><span>Containers searched</span></div>
 <div><strong>${bosses}</strong><span>Bosses defeated</span></div>
 <div><strong>${success?health:0} HP / ${armor} ARM</strong><span>Final condition</span></div>
 <div><strong>${squad}/4</strong><span>Squad survivors</span></div>
 </div>
 <p>Legacy rewards: ${base} extraction + ${bonus} performance + ${achieved.reward} achievements</p>
 <h2>${total} LEGACY TOKENS EARNED</h2>
 ${achieved.names.length?'<p>Achievements: '+achieved.names.join(', ')+'</p>':''}
 <div class="menurow"><button id="again">PREPARE NEXT RUN</button><button id="back">MAIN MENU</button></div></article>`;
 overlay.querySelector<HTMLButtonElement>('#again')!.onclick=preRun;
 overlay.querySelector<HTMLButtonElement>('#back')!.onclick=menu;
}
function death(){finishRun(false)}
function orderLabel(order:SquadOrder){return order==='focus'?'FOCUS FIRE':order.toUpperCase()}
function setOrder(order:SquadOrder){
 if(!run||run.stage!=='fight'||paused)return;
 run.squadOrder=order;
 if(order==='hold')for(const a of run.allies)a.anchor={x:a.x,y:a.y};
 if(order==='regroup')run.focusTarget=null;
 notice('SQUAD ORDER: '+orderLabel(order));save();
}
function changeOrder(){if(!run||run.stage!=='fight'||paused)return;const orders:SquadOrder[]=['follow','hold','focus','regroup','defensive'];setOrder(orders[(orders.indexOf(run.squadOrder??'follow')+1)%orders.length])}
function hurtPlayer(amount:number){if(!run||run.playerDead||(run.playerDowned??0)>0)return;const hit=incomingDamage(amount,run.armor);run.armor=hit.armor;run.hp=Math.max(0,run.hp-hit.hpDamage);run.waveHit=true;if(run.hp<=0){run.playerDowned=PLAYER_BLEEDOUT;run.reloadSlot=null;run.reloadTimer=0;notice('PLAYER DOWN — TEAMMATES CAN REVIVE YOU!')} }
function hurtAlly(a:Ally,amount:number){if(a.dead||a.downed>0)return;let value=Math.max(0,amount);const armorAbsorb=Math.min(a.armor,value);a.armor-=armorAbsorb;value-=armorAbsorb;applyLethalDamage(a,value,ALLY_BLEEDOUT);if(a.downed>0)notice(a.name+' DOWN — REVIVE BEFORE BLEED-OUT')}
function rescueAction(dt:number,manual=false){if(!run||paused)return;const r=run,p=r.player;
 for(const a of r.allies){if(a.dead||a.downed<=0)continue;const dist=Math.hypot(a.x-p.x,a.y-p.y);
  if(manual&&dist<1.55&&(r.playerDowned??0)===0){r.reviveProgress=(r.reviveProgress??0)+dt;if((r.reviveProgress??0)>=3.5){revive(a,28);a.reviveProgress=0;r.reviveProgress=0;notice(a.name+' REVIVED');save()}}}
 if(!manual)r.reviveProgress=0;
}
function squadUpdate(dt:number){if(!run||!plan)return;const r=run,p=r.player,order=r.squadOrder??'follow',aliveEnemies=r.enemies.filter(e=>e.alive);
 squadClock+=dt;const shooting=squadClock>.14;if(shooting)squadClock=0;
 for(const a of r.allies){
  if(a.dead)continue;
  if(a.downed>0){if(bleed(a,dt))notice(a.name+' LOST — REPLACE AT ARMORY');continue}
  a.cooldown=Math.max(0,a.cooldown-dt);a.abilityCooldown=Math.max(0,a.abilityCooldown-dt);
  let rescue:Ally|{x:number;y:number}|null=null;
  if((r.playerDowned??0)>0&&shouldRevive(order,a.role))rescue=p;
  else if(shouldRevive(order,a.role))rescue=r.allies.filter(b=>b!==a&&!b.dead&&b.downed>0).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0]??null;
  if(rescue){const dist=Math.hypot(rescue.x-a.x,rescue.y-a.y);
   if(dist>1.15){a.reviveProgress=0;const vx=(rescue.x-a.x)/dist,vy=(rescue.y-a.y)/dist;moveSquadmate(a,vx,vy,dt*(a.role==='scout'?2.9:2.25));continue}
   a.reviveProgress+=dt;if(a.reviveProgress>=reviveDuration(a.role)){
    const target=rescue===p?null:rescue as Ally;
    if(target){revive(target,a.role==='medic'?45:28);notice(target.name+' REVIVED')}
    else{r.playerDowned=0;r.hp=a.role==='medic'?45:28;notice('YOU WERE REVIVED BY '+a.name)}
    a.reviveProgress=0;save()
   }continue;
  }
  a.reviveProgress=0;
  let destination={x:p.x,y:p.y},speed=2.35;
  if(order==='hold')destination=a.anchor;
  else if(order==='focus'&&r.focusTarget!==null&&r.focusTarget!==undefined){const target=r.enemies[r.focusTarget];if(target?.alive)destination={x:target.x,y:target.y}}
  else if(order==='defensive'){destination={x:p.x-.5,y:p.y+.4}}
  else if(order==='regroup')speed=3.05;
  const separation=order==='hold'?.4:order==='focus'?3:order==='defensive'?1:1.45;
  const d=Math.hypot(destination.x-a.x,destination.y-a.y);
  if(d>separation){const direct=canSee(a.x,a.y,destination.x,destination.y),field=direct?null:distanceField(plan.map,destination),wp=field?nextZombieWaypoint(plan.map,field,a):destination,len=Math.hypot(wp.x-a.x,wp.y-a.y)||1;moveSquadmate(a,(wp.x-a.x)/len,(wp.y-a.y)/len,dt*speed)}
  if(a.role==='medic'&&a.abilityCooldown===0){const candidates=[{hp:r.hp,maxHp:100,x:p.x,y:p.y,isPlayer:true},...r.allies.filter(b=>!b.dead&&b.downed<=0).map(b=>({hp:b.hp,maxHp:b.maxHp,x:b.x,y:b.y,isPlayer:false,ally:b}))].filter(v=>v.hp<v.maxHp-10&&Math.hypot(v.x-a.x,v.y-a.y)<4);
   candidates.sort((x,y)=>(x.hp/x.maxHp)-(y.hp/y.maxHp));const injured=candidates[0];if(injured){if(injured.isPlayer&&!(r.playerDowned??0))r.hp=Math.min(100,r.hp+15+a.gearTier*3);else if('ally' in injured&&injured.ally)injured.ally.hp=Math.min(injured.ally.maxHp,injured.ally.hp+15+a.gearTier*3);a.abilityCooldown=11;notice('MEDIC FIELD HEAL')}}
  if(a.role==='engineer'&&a.abilityCooldown===0){const enemy=aliveEnemies.find(e=>Math.hypot(e.x-a.x,e.y-a.y)<3.2);if(enemy){for(const z of aliveEnemies.filter(e=>Math.hypot(e.x-enemy.x,e.y-enemy.y)<1.5))strikeZombie(z,1+a.gearTier,unit(z.x-a.x,z.y-a.y));a.abilityCooldown=13;notice('ENGINEER TRAP TRIGGERED')}
   else if(a.armor<CLASS_INFO.engineer.armor&&r.armor<80&&Math.hypot(a.x-p.x,a.y-p.y)<3){r.armor=Math.min(100,r.armor+8+a.gearTier*2);a.abilityCooldown=14;notice('ENGINEER ARMOR REPAIR')}}
  if(!shooting||a.cooldown>0)continue;
  const closest=aliveEnemies.filter(e=>canSee(a.x,a.y,e.x,e.y)).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];
  const target=order==='focus'&&r.focusTarget!==null&&r.focusTarget!==undefined&&r.enemies[r.focusTarget]?.alive?r.enemies[r.focusTarget]:closest;
  if(!target)continue;
  const distance=Math.hypot(target.x-a.x,target.y-a.y);
  // Close enemies are handled with equipped melee weapons. When ammunition is
  // exhausted, every NPC draws their melee weapon instead of becoming helpless.
  if(distance<=1.35||a.magReserve<=0)setSquadWeaponSlot(a,'melee');
  else if(a.activeSlot==='melee'||a.activeSlot==='secondary'&&distance>effectiveStats(a.secondaryWeapon).range*.9)
   setSquadWeaponSlot(a,'primary');
  // Sidearms are useful in tight corridors; player-selected sidearms remain
  // active until the threat moves too far away.
  if(a.activeSlot==='primary'&&distance<3.3&&distance>1.35)setSquadWeaponSlot(a,'secondary');
  const weapon=squadWeapon(a),melee=a.activeSlot==='melee';
  const reach=melee?1.45:Math.min(classRange(a.role),effectiveStats(weapon).range);
  if(distance>reach||!canSee(a.x,a.y,target.x,target.y)||friendlyFireLane(a,target,[r.player,...r.allies.filter(b=>b!==a&&!b.dead&&b.downed<=0)],melee?.25:.42))continue;
  const dir=unit(target.x-a.x,target.y-a.y);
  if(melee){
   const damage=Math.max(1.4,effectiveStats(weapon).damage*(1+.12*(a.gearTier-1)));
   strikeZombie(target,damage,dir,true);
   combatFx.push(...makeAttackFx(weapon.model,a.x,a.y,dir.x,dir.y,reach));
   a.cooldown=Math.max(.45,effectiveStats(weapon).rate);
   continue;
  }
  if(a.magReserve<=0)continue;
  const trace=traceBullet(plan.map,a,dir,reach,aliveEnemies,penetrationFor(weapon.model));
  const damage=Math.max(.5,classDamage(a.role,weapon.tier)*(effectiveStats(weapon).damage/weaponDefs[CLASS_INFO[a.role].model].damage));
  for(const hit of trace.hits){
   const struck=hit.target;strikeZombie(struck,damage,dir);
   if(a.role==='heavy')for(const other of aliveEnemies)if(other!==struck&&Math.hypot(other.x-struck.x,other.y-struck.y)<1.2)other.suppressed=2.4;
   if(a.role==='scout'){struck.scoutMarked=3.5;struck.aggro=5}
  }
  combatFx.push(...makeAttackFx(weapon.model,a.x,a.y,dir.x,dir.y,reach,[trace.distance],weaponFlashAllowed(weapon)));
  if(combatFx.length>120)combatFx.splice(0,combatFx.length-120);
  a.cooldown=classFireDelay(a.role)*Math.max(.7,effectiveStats(weapon).rate/weaponDefs[CLASS_INFO[a.role].model].rate);
  a.magReserve--;
  shellEffects.push(ejectCasing(a.x,a.y,dir.x,dir.y,Math.floor(r.waveSeconds??0)*7+r.allies.indexOf(a)));
  if(!r.noiseEvent||r.noiseEvent.radius<7)r.noiseEvent={x:a.x,y:a.y,radius:a.role==='heavy'?14:9,ttl:1.6};
 }
 r.allies=r.allies.filter(a=>!a.dead);
}
function moveSquadmate(a:Ally,vx:number,vy:number,step:number){
 if(!run||!plan)return;
 // Every active and downed squadmate blocks the path; the player is not walk-through either.
 const others=[run.player,...run.allies.filter(b=>b!==a&&!b.dead)];
 squadMove(plan.map,a,vx,vy,step,others);
}
function moveUnit(u:{x:number;y:number},vx:number,vy:number,step:number){
 if(!plan)return;
 const map=plan.map;
 // Check a whole actor footprint, so sprite centers cannot slide into wall tile edges.
 if(canOccupy(map,u.x+vx*step,u.y))u.x+=vx*step;
 if(canOccupy(map,u.x,u.y+vy*step))u.y+=vy*step;
}
function allyDirection(a:Ally):{x:number;y:number}{
 if(!run||!plan)return aim;
 let nearest:Unit|null=null,best=8;
 for(const e of run.enemies){
  if(!e.alive)continue;
  const dist=Math.hypot(e.x-a.x,e.y-a.y);
  if(dist<best&&canSee(a.x,a.y,e.x,e.y)){best=dist;nearest=e}
 }
 if(nearest){const d=Math.hypot(nearest.x-a.x,nearest.y-a.y)||1;return {x:(nearest.x-a.x)/d,y:(nearest.y-a.y)/d}}
 return aim;
}
function explorationSources():Explorer[]{
 if(!run)return [];
 const explorers:Explorer[]=[{x:run.player.x,y:run.player.y,radius:5.5}];
 for(const a of run.allies)if(!a.dead&&a.downed<=0)explorers.push({x:a.x,y:a.y,radius:4.5});
 return explorers;
}
function update(dt:number){if(!run||!plan||paused||run.stage!=='fight')return;
combatFx=ageCombatFx(combatFx,dt);
 shellEffects=ageCasings(shellEffects,dt);shotKick=Math.max(0,shotKick-dt*1.9);
 bossEffects=bossEffects.filter(fx=>(fx.age+=dt)<(fx.death?1.15:.55));
 bloodFx=ageBloodFx(bloodFx,dt);
 if(run.noiseEvent){run.noiseEvent.ttl=Math.max(0,run.noiseEvent.ttl-dt);if(run.noiseEvent.ttl===0)run.noiseEvent=null}
shotCooldown=Math.max(0,shotCooldown-dt);noiseClock=Math.max(0,noiseClock-dt);if((run.reloadTimer??0)>0){run.reloadTimer=Math.max(0,(run.reloadTimer??0)-dt);if(run.reloadTimer===0)finishReload()}
 // Also reload an already-empty equipped magazine after loading a save or swapping guns.
 const readyWeapon=activeWeapon(run);
 if(readyWeapon&&weaponDefs[readyWeapon.model].ammo&&readyWeapon.mag===0&&!run.reloadTimer)reload();
 const p=run.player;let dx=0,dy=0;if(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('up'))dy--;if(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('down'))dy++;if(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'))dx--;if(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))dx++;const len=Math.hypot(dx,dy);if((run.playerDowned??0)===0){if(len)moveUnit(p,dx/len,dy/len,dt*(keys.has('ShiftLeft')?4:3));else if(moveAnalog.magnitude>0)moveUnit(p,moveAnalog.x,moveAnalog.y,dt*3)}
rescueAction(dt,keys.has('KeyV')||touch.has('revive'));
if((run.playerDowned??0)===0)triggerFloorEvents();
if(aimAnalog.magnitude>0){aim={x:aimAnalog.x/aimAnalog.magnitude,y:aimAnalog.y/aimAnalog.magnitude}}
else if(mouseAimActive&&canvas.width>0&&canvas.height>0){
 // Recalculate against the current player position; a stationary cursor still aims
 // at the same screen point while the character moves and the camera follows.
 const view=camera(plan.map,p,canvas.width,canvas.height,cameraZoom);
 const target=toWorld(view,mouseAimX*canvas.width,mouseAimY*canvas.height);
 const ax=target.x-p.x,ay=target.y-p.y,d=Math.hypot(ax,ay);
 if(d>.1)aim={x:ax/d,y:ay/d};
}
if((run.playerDowned??0)===0){
 const manualFire=keys.has('Space');
 if(manualFire){const nearest=run.enemies.filter(e=>e.alive&&canSee(p.x,p.y,e.x,e.y)&&Math.hypot(e.x-p.x,e.y-p.y)<=(activeWeapon(run!)?effectiveStats(activeWeapon(run!)!).range:1.3)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(nearest&&keys.has('Space')){const length=Math.hypot(nearest.x-p.x,nearest.y-p.y)||1;aim={x:(nearest.x-p.x)/length,y:(nearest.y-p.y)/length}}shoot()}
 else if((aimAnalog.magnitude>0||mouseAimActive)&&shotCooldown<=0){
  const w=activeWeapon(run);
  if(w&&(!weaponDefs[w.model].ammo||w.mag>0)&&aimHasTarget(plan.map,p,aim,effectiveStats(w).range,run.enemies.filter(e=>!fog||discoveredAt(plan!.map,fog,e.x,e.y)),w.model))shoot();
 }
}
run.waveSeconds=(run.waveSeconds??0)+dt;run.runSeconds=(run.runSeconds??0)+dt;
updateBreach(dt);
spawnClock+=dt;
const active=run.enemies.reduce((n,e)=>n+(e.alive?1:0),0);
run.peakThreat=Math.max(run.peakThreat??0,active);
const interval=extractionSpawnInterval(run.waveSeconds,run.wave),cap=extractionActiveCap(run.waveSeconds,run.wave);
if(spawnClock>=interval&&active<cap){
 spawnClock-=interval;
 if(spawnOne(false))run.peakThreat=Math.max(run.peakThreat??0,active+1);
}
// Don't retain thousands of dead entities across a long survival attempt.
if(run.enemies.length>cap*3)run.enemies=run.enemies.filter(e=>e.alive);
squadUpdate(dt);
if(fog&&updateFog(plan.map,fog,explorationSources()))run.explored=exploredIndices(fog);
pathClock-=dt;if(pathClock<=0||!pathField){pathField=distanceField(plan.map,run.player);searchFields.clear();pathClock=.32}
for(const e of run.enemies){if(!e.alive)continue;
 e.emerging=Math.max(0,(e.emerging??0)-dt);
 e.bossRecover=Math.max(0,(e.bossRecover??0)-dt);
 e.stagger=Math.max(0,(e.stagger??0)-dt);e.hitFlash=Math.max(0,(e.hitFlash??0)-dt);
 e.suppressed=Math.max(0,(e.suppressed??0)-dt);e.scoutMarked=Math.max(0,(e.scoutMarked??0)-dt);const stats=zombieStats(e.kind??(e.boss?'boss':'shambler'));if(e.boss&&e.hp<e.maxHp*.5&&e.phase!==2){e.phase=2;notice(bossIdentity(run.wave).name+' · SECOND PHASE!');if(!e.summoned){e.summoned=true;for(let k=0;k<3;k++)spawnOne(false,false)}}
 const sight=Math.hypot(e.x-p.x,e.y-p.y);
 const vision=sight<1.5||(sight<(e.kind==='runner'?10:e.boss?17:7.5)&&canSee(e.x,e.y,p.x,p.y));
 const senses=senseZombie({kind:e.kind??'shambler',position:e,player:p,canSeePlayer:vision,noise:run.noiseEvent,lastKnown:e.lastKnown,memory:e.aggro??0,searchClock:e.searchClock??0,spawnIndex:run.enemies.indexOf(e)},dt);
 e.aggro=senses.memory;e.lastKnown=senses.lastKnown;e.searchClock=senses.searchClock;e.alertMode=senses.mode;
 e.attack=Math.max(0,e.attack-dt);
 if((e.emerging??0)>0)continue;
 if((e.windup??0)>0){e.windup=Math.max(0,(e.windup??0)-dt);if(e.windup===0){
 const ability=bossAttack(run.wave);
 const origin=e.bossOrigin??{x:e.x,y:e.y},locked=e.bossTarget??{x:p.x,y:p.y};
 if(ability==='charge'){
  const d=Math.hypot(locked.x-origin.x,locked.y-origin.y)||1;
  for(let j=0;j<12;j++)moveUnit(e,(locked.x-origin.x)/d,(locked.y-origin.y)/d,Math.min(d,4.8)/12);
 }
 const strike=(target:{x:number;y:number})=>ability==='charge'
  ?(distanceToSegment(target,origin,{x:e.x,y:e.y})<.9?bossImpact('charge',0):0)
  :ability==='slam'?bossImpact('slam',Math.hypot(target.x-locked.x,target.y-locked.y))
  :bossImpact('shockwave',Math.hypot(target.x-e.x,target.y-e.y));
 const impact=strike(p);
 if(impact)hurtPlayer(impact);
 for(const a of run.allies){const allyImpact=strike(a);if(allyImpact)hurtAlly(a,allyImpact)}
 bossEffects.push({kind:ability,x:ability==='slam'?locked.x:e.x,y:ability==='slam'?locked.y:e.y,age:0});
 e.bossRecover=.55;
 e.bossTarget=undefined;e.bossOrigin=undefined;
 bossPulse=.28}continue}
 const nearestAlly=run.allies.filter(a=>a.hp>0&&!a.dead&&a.downed<=0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
 const playerDist=Math.hypot(p.x-e.x,p.y-e.y);
 const allyDist=nearestAlly?Math.hypot(nearestAlly.x-e.x,nearestAlly.y-e.y):Infinity;
 const target=nearestAlly&&(allyDist+.35<playerDist||(run.playerDowned??0)>0)?nearestAlly:p,dist=Math.hypot(target.x-e.x,target.y-e.y);
 if(e.boss&&e.attack===0&&(run.playerDowned??0)===0&&playerDist<(bossAttack(run.wave)==='shockwave'?4.5:bossAttack(run.wave)==='charge'?6:3.7)){
 const identity=bossIdentity(run.wave);
 e.bossOrigin={x:e.x,y:e.y};e.bossTarget={x:p.x,y:p.y};
 e.windup=identity.ability==='charge'?1.25:identity.ability==='shockwave'?1.45:1.05;
 e.attack=e.hp<e.maxHp*.5?2.8:4.5;
 notice(identity.name+' · '+identity.ability.toUpperCase()+' INCOMING!');
 continue
}
 if((e.stagger??0)<=0&&dist<=stats.reach&&e.attack===0&&((target!==p)||(run.playerDowned??0)===0)){e.attack=stats.attackInterval;if(target===p){hurtPlayer(stats.damage)}else{const ally=target as Ally;hurtAlly(ally,stats.damage)}continue}
 if((e.aggro??0)>0&&(e.stagger??0)<=0){
  // Squadmates can be attacked in close quarters, but lost player sightings are not omniscient.
  const destination=target!==p&&dist<2.5?target:senses.target;
  if(destination){
   const goal=tacticalTarget(e.kind??'shambler',e,destination,run.enemies.indexOf(e),senses.mode);
   const direct=canSee(e.x,e.y,goal.x,goal.y);
   // Cache a handful of sound/last-sighting navigation fields per tick; never leak the
   // live player's location into an enemy that only remembers an older sighting.
   let waypoint=goal;
   if(!direct){
    if(senses.mode==='chase')waypoint=nextZombieWaypoint(plan.map,pathField!,e);
    else {
     const point=nearestWalkable(plan.map,goal);
     const key=Math.round(point.x)+','+Math.round(point.y);
     let field=searchFields.get(key);
     if(!field&&searchFields.size<8){field=distanceField(plan.map,point);searchFields.set(key,field)}
     if(field)waypoint=nextZombieWaypoint(plan.map,field,e);
    }
   }
   const vx=waypoint.x-e.x,vy=waypoint.y-e.y,len=Math.hypot(vx,vy);
   if(len>.12){
    const nearby=run.enemies.find(other=>other!==e&&other.alive&&Math.hypot(other.x-e.x,other.y-e.y)<.4);
    const avoid=nearby?Math.sign(e.x-nearby.x||((run.spawned%2)*2-1))*.22:0;
    const factor=e.kind==='armored'?1.12:e.kind==='bruiser'&&nearby?1.08:1;
    moveUnit(e,(vx+avoid)/Math.max(.01,len),vy/Math.max(.01,len),dt*stats.speed*factor*(e.phase===2?1.3:1)*((e.suppressed??0)>0?.65:1));
   }
  }
 }
}
bossPulse=Math.max(0,bossPulse-dt);
if((run.playerDowned??0)>0){run.playerDowned=Math.max(0,(run.playerDowned??0)-dt);if(run.playerDowned===0&&run.hp<=0){run.playerDead=true;death();return}}
if(performance.now()-lastSave>1200){lastSave=performance.now();save()}
}
// Ephemeral pose state; never persisted or involved in collision/AI.
let poseCache=new WeakMap<object,CharacterMotion>();
function animatedPose(actor:{x:number;y:number},now:number,initialHeading:number,turnRate:number,faceAim=false):CharacterMotion{
 const previous=poseCache.get(actor)??null;
 const motion=nextCharacterMotion(previous,actor,now,initialHeading,turnRate,faceAim);
 poseCache.set(actor,motion);
 return motion;
}
let lastView:View|null=null;
function draw(){
 const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight,ratio=Math.min(2,devicePixelRatio||1);
 const cw=Math.max(320,Math.floor(width*ratio)),ch=Math.max(180,Math.floor(height*ratio));
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 if(!plan||!run){ctx.fillStyle='#081115';ctx.fillRect(0,0,cw,ch);stats.textContent='READY';lastView=null;return}
 const r=run,m=plan.map,v=camera(m,r.player,cw,ch,cameraZoom);lastView=v;
 renderDungeon(ctx,m,v,r.wave);
 renderFacility(ctx,m,v,performance.now());
 // Incident sites are only drawn while unexplored; activated sites are dormant.
 for(const [i,event] of (m.events??[]).entries()){
  if(r.triggeredEvents?.includes(i)||fog&&!discoveredAt(m,fog,event.x,event.y))continue;
  const x=v.ox+event.x*v.tile,y=v.oy+event.y*v.tile;
  ctx.save();ctx.fillStyle=event.kind==='infectedNest'?'#b34338':'#e1b76a';
  ctx.globalAlpha=.7+.2*Math.sin(performance.now()/420);
  ctx.beginPath();ctx.arc(x,y,v.tile*.26,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ecf1e9';ctx.lineWidth=Math.max(1,v.tile*.055);ctx.strokeRect(x-v.tile*.2,y-v.tile*.2,v.tile*.4,v.tile*.4);
  ctx.restore();
 }
 if(m.secret&&!r.secretOpened){
  const d=m.secret.door;
  if(!fog||discoveredAt(m,fog,d.x,d.y)){
   const x=v.ox+d.x*v.tile,y=v.oy+d.y*v.tile;
   ctx.save();ctx.fillStyle='#495a58';ctx.fillRect(x-v.tile*.4,y-v.tile*.4,v.tile*.8,v.tile*.8);
   ctx.strokeStyle='#a99a72';ctx.lineWidth=Math.max(1,v.tile*.07);ctx.strokeRect(x-v.tile*.31,y-v.tile*.31,v.tile*.62,v.tile*.62);
   ctx.fillStyle='#bfb292';ctx.fillRect(x-v.tile*.06,y-v.tile*.12,v.tile*.12,v.tile*.24);ctx.restore();
  }
 }
 // Unknown floor and wall tiles remain visible, darkened; entities do not.
 if(fog)renderFog(ctx,m,v,fog);
 const isKnown=(x:number,y:number)=>!fog||discoveredAt(m,fog,x,y);
 const now=performance.now(),bob=Math.sin(now/340)*v.tile*.025;
 for(const [i,hole] of spawnHoles(plan).entries()){
  if(!isKnown(hole.x,hole.y))continue;
  const sealed=(r.sealedHoles??[]).includes(i);
  drawSpawnHole(ctx,v,hole,sealed,now/1000);
  if(r.breachEvent?.index===i){
   const progress=1-r.breachEvent.remaining/BREACH_DURATION;
   const cx=v.ox+hole.x*v.tile,cy=v.oy+hole.y*v.tile;
   ctx.save();ctx.strokeStyle='#f3ab67';ctx.lineWidth=Math.max(3,v.tile*.09);
   ctx.beginPath();ctx.arc(cx,cy,v.tile*.64,-Math.PI/2,-Math.PI/2+2*Math.PI*progress);ctx.stroke();
   ctx.fillStyle='#ffdc9b';ctx.textAlign='center';ctx.font='bold '+Math.max(12,v.tile*.38)+'px system-ui';
   ctx.fillText(Math.ceil(r.breachEvent.remaining)+'s',cx,cy-v.tile*.74);ctx.restore();
  }
  if(!sealed&&Math.hypot(r.player.x-hole.x,r.player.y-hole.y)<2.65){
   const px=v.ox+hole.x*v.tile,py=v.oy+(hole.y-.74)*v.tile;
   ctx.save();ctx.textAlign='center';ctx.font='bold '+Math.max(11,v.tile*.29)+'px system-ui';
   ctx.strokeStyle='#06100c';ctx.lineWidth=4;const label=r.breachEvent?.index===i?'PROTECT BREACH':r.breachEvent?'DEFEND ACTIVE BREACH':r.credits>=SEAL_COST?'SEAL HOLE · 200':'NEED 200 CREDITS';
   ctx.strokeText(label,px,py);ctx.fillStyle=r.credits>=SEAL_COST?'#bdf6c0':'#f3c28e';ctx.fillText(label,px,py);
   ctx.restore();
  }
 }
 for(const [i,l] of m.loot.entries()){
  const known=l.kind==='weapon'?crateInRange(l,{x:r.player.x,y:r.player.y})||isKnown(l.x,l.y):isKnown(l.x,l.y);
  // Both cells of a long weapon crate must be discoverable before the case appears.
  const visibleCrate=l.kind==='weapon'?(isKnown(l.x-.5,l.y)||isKnown(l.x+.5,l.y)||isKnown(l.x,l.y-.5)||isKnown(l.x,l.y+.5)):known;
  if(visibleCrate)drawMilitaryCrate(ctx,v,l.x,l.y,l.kind==='weapon',l.orientation??'horizontal',r.looted.includes(i));
 }
 // One elevator machine covers all four floor cells, visible after any part is discovered.
 if(elevatorCells(m).some(cell=>isKnown(cell.x,cell.y))){
  if(m.extractionSize===2)drawElevator(ctx,v,m.extraction.x,m.extraction.y,cleared(),now);
  else drawSprite(ctx,'elevator',v,m.extraction.x,m.extraction.y,{scale:1.18,alpha:cleared()?1:.5,glow:cleared()?'#3beaa6':undefined,bob:cleared()?bob:0});
 }
 lootPopups=lootPopups.filter(p=>now-p.start<2200);
 for(const popup of lootPopups){
  const iconIndex=gearIconModels.indexOf(popup.model as typeof gearIconModels[number]);
  drawLootPopup(ctx,v,popup.x,popup.y,iconIndex,popup.label,(now-popup.start)/2200);
 }
 ctx.save();if(fog)clipToExplored(ctx,m,v,fog);
 drawBloodFx(ctx,v,bloodFx,'ground');
 drawCasings(ctx,v,shellEffects);
 for(const fx of bossEffects){if(fx.death)drawBossDeath(ctx,v,fx.kind,fx.x,fx.y,fx.heading??0,fx.age);else drawBossImpact(ctx,v,fx.kind,fx.x,fx.y,fx.age)}
 ctx.restore();
 for(const e of r.enemies){if(!e.alive||!isKnown(e.x,e.y))continue;const kind=(e.kind??(e.boss?'boss':'shambler')) as SpriteKind;
  const direction=Math.atan2(r.player.y-e.y,r.player.x-e.x);
  const motion=animatedPose(e,now,direction,e.boss?2.2:kind==='runner'?4:2.8);
  const boss=e.boss?bossIdentity(r.wave):null;
  if(e.boss){ctx.save();ctx.strokeStyle=boss!.color;ctx.lineWidth=Math.max(2,v.tile*.095);ctx.globalAlpha=.5+.2*Math.sin(now/240);ctx.beginPath();ctx.arc(v.ox+e.x*v.tile,v.oy+e.y*v.tile,v.tile*.85,0,Math.PI*2);ctx.stroke();ctx.restore()}
  if((e.emerging??0)>0){ctx.save();ctx.beginPath();ctx.ellipse(v.ox+e.x*v.tile,v.oy+e.y*v.tile,v.tile*.57,v.tile*.38,0,0,Math.PI*2);ctx.clip();ctx.globalAlpha=Math.max(.28,1-(e.emerging??0)*.85)}
  if(boss)drawBossArt(ctx,v,boss.ability,{x:e.x,y:e.y,heading:motion.angle,stride:motion.phase,speed:motion.speed,time:now/1000,windup:e.windup?Math.max(0,1-(e.windup??0)/(boss.ability==='charge'?1.25:boss.ability==='shockwave'?1.45:1.05)):0,recover:Math.min(1,(e.bossRecover??0)/.55),enraged:e.phase===2});
  else drawSprite(ctx,kind,v,e.x,e.y,{angle:motion.angle+(e.hitFlash??0)*Math.sin(now/23)*.7,stride:motion.phase,motionSpeed:motion.speed,idleTime:now/1000,scale:kind==='bruiser'?1.32:kind==='runner'?.93:1.12,glow:(e.hitFlash??0)>0?'#ef7e65':undefined});

  if((e.emerging??0)>0)ctx.restore();
  if(boss){ctx.save();ctx.textAlign='center';ctx.font='bold '+Math.max(11,v.tile*.4)+'px system-ui';ctx.fillStyle=boss.color;ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(boss.name,v.ox+e.x*v.tile,v.oy+(e.y-1.42)*v.tile);ctx.restore()}
  if(e.maxHp>2)drawBar(ctx,v,e.x,e.y,e.hp/e.maxHp,boss?.color??'#dc9b83',e.boss?1.3:.78);
  if((e.scoutMarked??0)>0){ctx.strokeStyle='#a4ecfc';ctx.lineWidth=Math.max(2,v.tile*.05);ctx.strokeRect(v.ox+(e.x-.51)*v.tile,v.oy+(e.y-.53)*v.tile,1.02*v.tile,1.02*v.tile)}
  if(e.boss&&(e.windup??0)>0){
   const ability= boss!.ability,px=v.ox+e.x*v.tile,py=v.oy+e.y*v.tile;
   const origin=e.bossOrigin??e,target=e.bossTarget??r.player;
   ctx.save();ctx.strokeStyle=boss!.color;ctx.fillStyle=boss!.color;ctx.lineWidth=Math.max(2,v.tile*.075);
   ctx.globalAlpha=.32+.22*Math.sin(now/95);
   if(ability==='charge'){
    ctx.beginPath();ctx.moveTo(v.ox+origin.x*v.tile,v.oy+origin.y*v.tile);
    ctx.lineTo(v.ox+target.x*v.tile,v.oy+target.y*v.tile);ctx.lineWidth=v.tile*1.6;ctx.stroke();
   }else if(ability==='slam'){
    ctx.beginPath();ctx.arc(v.ox+target.x*v.tile,v.oy+target.y*v.tile,2.4*v.tile,0,Math.PI*2);ctx.fill();
   }else drawHazard(ctx,v,e.x,e.y,3.2);
   ctx.restore();
  }
 }
 for(const a of r.allies){
  if(!isKnown(a.x,a.y))continue;
  const dir=allyDirection(a),direction=Math.atan2(dir.y,dir.x);
  const motion=animatedPose(a,now,direction,4);
  drawSprite(ctx,a.role,v,a.x,a.y,{weapon:squadWeapon(a).model,angle:motion.angle,stride:motion.phase,motionSpeed:motion.speed,idleTime:now/1000,scale:a.role==='heavy'?1.25:1.08,down:a.downed>0,alpha:a.dead?.3:1,glow:a.role==='medic'?'#69e8a1':undefined});
  if(a.hp<a.maxHp||a.downed>0)drawBar(ctx,v,a.x,a.y,a.downed>0?a.downed/ALLY_BLEEDOUT:a.hp/a.maxHp,a.downed>0?'#f1c17e':hudColor(a.hp/a.maxHp));
 }
 const playerMotion=animatedPose(r.player,now,Math.atan2(aim.y,aim.x),12,true);
 drawSprite(ctx,'player',v,r.player.x,r.player.y,{weapon:activeWeapon(r)?.model??null,angle:playerMotion.angle+shotKick*(Math.sin(now/32)>0?1:-1),stride:playerMotion.phase,motionSpeed:playerMotion.speed,idleTime:now/1000,showAim:true,scale:1.25,down:(r.playerDowned??0)>0,glow:'#b3d8b4'});
 // A bullet effect cannot reveal enemies or objects through unexplored tiles.
 ctx.save();if(fog)clipToExplored(ctx,m,v,fog);
 drawCombatFx(ctx,v,combatFx);
 drawBloodFx(ctx,v,bloodFx,'front');
 ctx.restore();
 if((r.playerDowned??0)>0){ctx.font='bold '+Math.max(13,v.tile*.48)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#ff9b83';ctx.fillText('DOWNED '+Math.ceil(r.playerDowned??0)+'s',v.ox+r.player.x*v.tile,v.oy+(r.player.y-1)*v.tile)}

 const livingBoss=r.enemies.find(e=>e.alive&&e.boss);
 if(livingBoss){
  const identity=bossIdentity(r.wave),bw=Math.min(cw*.68,500*ratio),bx=(cw-bw)/2,by=14*ratio,bh=7*ratio;
  ctx.save();ctx.fillStyle='rgba(8,12,16,.84)';ctx.fillRect(bx-9*ratio,by-5*ratio,bw+18*ratio,36*ratio);
  ctx.fillStyle=identity.color;ctx.font='bold '+(12*ratio)+'px system-ui';ctx.textAlign='center';
  ctx.fillText(identity.name+(livingBoss.phase===2?' · ENRAGED':''),cw/2,by+7*ratio);
  ctx.fillStyle='#293136';ctx.fillRect(bx,by+12*ratio,bw,bh);
  ctx.fillStyle=identity.color;ctx.fillRect(bx,by+12*ratio,bw*Math.max(0,livingBoss.hp/livingBoss.maxHp),bh);
  ctx.restore();
 }
 const w=activeWeapon(r),ammoType=w?weaponDefs[w.model].ammo:null,eq=ensureEquipment(r);
 const ammo=w&&ammoType?w.mag+'/'+eq.ammo[ammoType]:'MELEE';
 // Mobile squad orders only exist when at least one living squadmate can receive them.
 const hasActiveSquad=r.allies.some(ally=>!ally.dead&&ally.downed<=0);
 const mobileSquad=document.querySelector<HTMLElement>('#mobile-squad')!;
 mobileSquad.hidden=!hasActiveSquad;
 mobileSquad.setAttribute('aria-hidden',String(!hasActiveSquad));
 const order=orderLabel(r.squadOrder??'follow');
 const banner=document.querySelector<HTMLElement>('#breach-banner')!;
 banner.hidden=!r.breachEvent;
 if(r.breachEvent)banner.textContent='Wave incoming, protect the breach while its sealed · '+Math.ceil(r.breachEvent.remaining)+'s';
 stats.textContent='WAVE '+r.wave+' · HOLES '+(r.sealedHoles??[]).length+'/'+REQUIRED_SEALS;
 document.querySelector<HTMLButtonElement>('#orders')!.textContent='SQUAD: '+order+' (Q)';
 document.querySelectorAll<HTMLButtonElement>('#mobile-squad [data-squad-order]').forEach(button=>{
  const selected=button.dataset.squadOrder===(r.squadOrder??'follow');
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 document.querySelector<HTMLButtonElement>('#mobile-medkit-revive')!.classList.toggle('low-health',r.hp>0&&r.hp<=30);
 const activeSlot=r.activeSlot??'primary';
 document.querySelector<HTMLButtonElement>('#mobile-weapon-swap')!.textContent=activeSlot==='melee'?'MELEE · SWAP':activeSlot==='primary'?'PRIMARY · SWAP':'SECONDARY · SWAP';
 const action=nearbyInteraction();
 for(const id of ['interact','mobile-interact']){
  const button=document.querySelector<HTMLButtonElement>('#'+id)!;
  button.disabled=!action;
  button.classList.toggle('in-range',!!action);
  button.title=action?(action.kind==='loot'?(plan?.map.loot[action.index]?.kind==='weapon'?'Search weapon case':'Search supply container') :action.kind==='secret'?'Open concealed panel':action.kind==='hole'?'Begin 25-second breach defense for 200 credits':cleared()?'Use elevator':'Seal three holes to unlock elevator'):'Move closer to an object';
  if(action?.kind==='hole')button.textContent=run?.breachEvent?'DEFEND BREACH':id==='interact'?'SEAL HOLE · 200 (E)':'SEAL · 200';
  else button.textContent=id==='interact'?'INTERACT (E)':'INTERACT';
 }
 const hpRatio=Math.max(0,r.hp/100),armorRatio=Math.max(0,r.armor/100);
 const hpBar=document.querySelector<HTMLElement>('#hud-hp')!,armorBar=document.querySelector<HTMLElement>('#hud-armor')!;
 hpBar.style.width=(hpRatio*100)+'%';hpBar.style.background=hudColor(hpRatio);
 armorBar.style.width=(armorRatio*100)+'%';armorBar.style.background=hudColor(armorRatio);
 document.querySelector('#hud-credits')!.textContent='₡'+r.credits;
 document.querySelector('#hud-hp-text')!.textContent=String(Math.ceil(r.hp));
 document.querySelector('#hud-armor-text')!.textContent=String(Math.ceil(r.armor));
 document.querySelector('#hud-weapon')!.textContent=(w?weaponDefs[w.model].name:'UNARMED')+' · '+ammo+(r.reloadTimer?' · RELOADING':'');
 document.querySelector('#hud-team')!.textContent='SQUAD '+r.allies.length+'/4'+(r.playerDowned?' · DOWN '+Math.ceil(r.playerDowned)+'s':'');
}
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();if(noticeUntil<now)toastEl.textContent='';requestAnimationFrame(frame)}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Digit1')equip('primary');if(e.code==='Digit2')equip('secondary');if(e.code==='Digit3')equip('melee');if(e.code==='KeyR')reload();if(e.code==='KeyH')heal();if(e.code==='KeyI'&&run&&run.stage==='fight')inventory();if(e.code==='KeyQ')changeOrder();if(e.code==='KeyT')squadPanel();if(e.code==='KeyE')interact();if(e.code==='Escape')menu()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();mouseAimActive=false;touch.clear();resetAnalogs()});document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAnalogs()});
/** Independent pointer capture lets both thumbs move and aim at once. */
function resetAnalogs(){moveAnalog=zeroStick();aimAnalog=zeroStick();document.querySelectorAll<HTMLElement>('.analog-knob').forEach(node=>{node.style.transform='translate(-50%,-50%)'})}
function bindAnalog(id:string,update:(v:StickVector)=>void){
 const base=document.querySelector<HTMLElement>('#'+id)!;
 const knob=base.querySelector<HTMLElement>('.analog-knob')!;
 let pointer:number|null=null;
 const process=(e:PointerEvent)=>{
  const rect=base.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.34;
  const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);
  const v=normalizeStick(dx,dy,radius);update(v);
  const pos=stickKnob(dx,dy,radius);knob.style.transform='translate(calc(-50% + '+pos.x+'px),calc(-50% + '+pos.y+'px))';
 };
 const release=(e:PointerEvent)=>{
  if(pointer!==e.pointerId)return;
  pointer=null;update(zeroStick());knob.style.transform='translate(-50%,-50%)';
  if(base.hasPointerCapture(e.pointerId))base.releasePointerCapture(e.pointerId);
 };
 base.addEventListener('pointerdown',e=>{
  if(pointer!==null||paused||!run||run.stage!=='fight')return;
  e.preventDefault();e.stopPropagation();pointer=e.pointerId;base.setPointerCapture(pointer);process(e);
 });
 base.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;e.preventDefault();process(e)});
 base.addEventListener('pointerup',release);base.addEventListener('pointercancel',release);
 base.addEventListener('lostpointercapture',e=>{if(pointer!==e.pointerId)return;pointer=null;update(zeroStick());knob.style.transform='translate(-50%,-50%)'});
 window.addEventListener('blur',()=>{pointer=null;update(zeroStick());knob.style.transform='translate(-50%,-50%)'});
}
bindAnalog('move-stick',v=>{moveAnalog=v});
bindAnalog('aim-stick',v=>{aimAnalog=v});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch')return;
 const rect=canvas.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 mouseAimX=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
 mouseAimY=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
 mouseAimActive=true;
});
canvas.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')mouseAimActive=false});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;e.preventDefault();if(run&&plan&&lastView&&run.squadOrder==='focus'){const rect=canvas.getBoundingClientRect(),at=toWorld(lastView,(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height);
 let best=-1,distance=1.5;run.enemies.forEach((enemy,i)=>{const d=Math.hypot(enemy.x-at.x,enemy.y-at.y);if(enemy.alive&&d<distance){best=i;distance=d}});if(best>=0){run.focusTarget=best;notice('SQUAD FOCUS: selected infected')}}});
// Canvas touch gestures allow pinching only; tapping map objects does not interact or pan.
const canvasTouches=new Map<number,{x:number;y:number}>();
let pinchDistance=0,pinchZoom=1;
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch')return;
 e.preventDefault();
 canvasTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(canvasTouches.size===2){
  const [a,b]=[...canvasTouches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);pinchZoom=cameraZoom;
 }
});
canvas.addEventListener('pointermove',e=>{
 const p=canvasTouches.get(e.pointerId);if(!p)return;
 e.preventDefault();p.x=e.clientX;p.y=e.clientY;
 if(canvasTouches.size>=2&&pinchDistance>0){
  const [a,b]=[...canvasTouches.values()];
  cameraZoom=safe(pinchZoom*Math.hypot(a.x-b.x,a.y-b.y)/pinchDistance,.7,2);
 }
});
function endCanvasTouch(e:PointerEvent){
 const p=canvasTouches.get(e.pointerId);if(!p)return;
 e.preventDefault();
 canvasTouches.delete(e.pointerId);
 if(canvasTouches.size<2)pinchDistance=0;
}
canvas.addEventListener('pointerup',endCanvasTouch);canvas.addEventListener('pointercancel',endCanvasTouch);
function click(id:string,fn:()=>void){document.querySelector<HTMLButtonElement>('#'+id)!.onclick=fn}
click('heal',heal);click('inventory',inventory);click('orders',changeOrder);click('squad-panel',squadPanel);click('interact',interact);click('menu',menu);click('weapon-primary',()=>equip('primary'));click('weapon-secondary',()=>equip('secondary'));click('weapon-melee',()=>equip('melee'));
// Use independent pointerdown actions so a held movement/aim pointer never blocks buttons.
function bindMobileAction(id:string,fn:()=>void){
 const button=document.querySelector<HTMLButtonElement>('#'+id)!;
 button.addEventListener('pointerdown',e=>{
  if(button.disabled||e.button!==0)return;
  e.preventDefault();e.stopPropagation();fn();
 });
 // Keyboard accessibility without a duplicate synthetic touch click.
 button.addEventListener('click',e=>{if(e.detail===0&&!button.disabled)fn()});
}
bindMobileAction('mobile-interact',interact);
document.querySelectorAll<HTMLButtonElement>('#mobile-squad [data-squad-order]').forEach(button=>{
 const order=button.dataset.squadOrder as SquadOrder;
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();setOrder(order)});
 button.addEventListener('click',e=>{if(e.detail===0)setOrder(order)});
});
/** Separate touch pointer ownership allows the player to keep moving while pressing action buttons. */
function bindTapHold(id:string,onTap:()=>void,onHoldStart:()=>void,onHoldEnd:()=>void){
 const button=document.querySelector<HTMLButtonElement>('#'+id)!;
 let pointer:number|null=null,holdTimer:ReturnType<typeof setTimeout>|null=null,held=false;
 const clear=()=>{
  if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null}
  if(held)onHoldEnd();
  pointer=null;held=false;
 };
 button.addEventListener('pointerdown',e=>{
  if(pointer!==null||e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  pointer=e.pointerId;held=false;
  button.setPointerCapture(e.pointerId);
  holdTimer=setTimeout(()=>{holdTimer=null;if(pointer!==null){held=true;button.classList.add('holding');onHoldStart()}},450);
 });
 button.addEventListener('pointerup',e=>{
  if(e.pointerId!==pointer)return;
  e.preventDefault();e.stopPropagation();
  const tap=!held;clear();button.classList.remove('holding');
  if(tap)onTap();
 });
 button.addEventListener('pointercancel',e=>{if(e.pointerId===pointer){clear();button.classList.remove('holding')}});
 button.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer){clear();button.classList.remove('holding')}});
 window.addEventListener('blur',()=>{clear();button.classList.remove('holding')});
 button.addEventListener('click',e=>{if(e.detail===0)onTap()});
}
bindTapHold('mobile-medkit-revive',heal,()=>touch.add('revive'),()=>touch.delete('revive'));
bindTapHold('mobile-inventory-team',inventory,squadPanel,()=>{});
const swapButton=document.querySelector<HTMLButtonElement>('#mobile-weapon-swap')!;
let swapPointer:number|null=null,swapHold:ReturnType<typeof setTimeout>|null=null,swapHeld=false;
function cancelSwap(){
 if(swapHold!==null){clearTimeout(swapHold);swapHold=null}
 swapPointer=null;swapHeld=false;
}
swapButton.addEventListener('pointerdown',e=>{
 if(e.button!==0||swapPointer!==null||paused||!run||run.stage!=='fight')return;
 e.preventDefault();e.stopPropagation();swapPointer=e.pointerId;swapHeld=false;
 swapHold=setTimeout(()=>{
  swapHold=null;
  if(swapPointer!==null){swapHeld=true;equip('melee')}
 },450);
});
swapButton.addEventListener('pointerup',e=>{
 if(e.pointerId!==swapPointer)return;
 e.preventDefault();e.stopPropagation();
 const shouldTap=!swapHeld;cancelSwap();
 if(shouldTap)swapFirearm();
});
swapButton.addEventListener('pointercancel',e=>{if(e.pointerId===swapPointer)cancelSwap()});
window.addEventListener('blur',cancelSwap);
swapButton.addEventListener('click',e=>{if(e.detail===0)swapFirearm()});
const reviveButton=document.querySelector<HTMLButtonElement>('#revive')!;reviveButton.addEventListener('pointerdown',e=>{e.preventDefault();reviveButton.setPointerCapture(e.pointerId);touch.add('revive')});reviveButton.addEventListener('pointerup',()=>touch.delete('revive'));reviveButton.addEventListener('pointercancel',()=>touch.delete('revive'));
for(const [id,dir]of [['moveup','up'],['movedown','down'],['moveleft','left'],['moveright','right']]){const el=document.querySelector<HTMLButtonElement>('#'+id)!;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);touch.add(dir)});el.addEventListener('pointerup',()=>touch.delete(dir));el.addEventListener('pointercancel',()=>touch.delete(dir))}
loadProfile();menu();document.documentElement.dataset.deadzoneReady='true';requestAnimationFrame(frame);

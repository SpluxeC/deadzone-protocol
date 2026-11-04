import {generateDungeon,type DungeonLayout} from './dungeon';
import {makeWave,killPayout,clearPayout,canExit,permanentPayout,type WavePlan} from './rogueliteRules';
import {zombieKind,zombieStats,weaponStats,reloadTransfer,distanceField,nextZombieWaypoint,incomingDamage,bossAttack,bossImpact,type ZombieKind,type WeaponSlot} from './combatSystems';
import {weaponDefs,attachmentDefs,canClassEquip,ammoTypes,ammoLabels,ammoPack,ammoStack,newWeapon,newMod,usedSlots,addAmmo,canAddItem,canEquipMod,itemName,salePrice,effectiveStats,armoryOffers,rareLoot,advanceOfferPrice,backpackUpgradePrice,upgradePrice,type Weapon,type Mod,type Gear,type AmmoBank,type Loadout,type AmmoType,type Tier,type WeaponId,type AttachmentId,type Slot} from './equipmentArmory';
import {CLASS_INFO,classIds,makeSquadmate,migrateSquadmate,applyLethalDamage,bleed,revive,reviveDuration,shouldRevive,canRecruit,equipClassWeapon,classFireDelay,classRange,classDamage,canHeal,gearUpgradeCost,PLAYER_BLEEDOUT,ALLY_BLEEDOUT,type Squadmate,type SquadOrder} from './squadSystems';
import {migrateProfile,unlocks,achievements,buyUnlock,allowedPrimary,allowedMelee,allowedTeammates,sanitizeChoice,startingKit,progressAchievements,performancePayout,eligibleRecruit,type ProfileV5,type UnlockId,type RunPerformance} from './metaprogression';
import {camera,toWorld,renderDungeon,drawSprite,drawBar,drawHazard,hudColor,type View,type SpriteKind} from './rogueliteVisuals';
import {gearIcon} from './gearIcons';
import {makeAttackFx,ageCombatFx,drawCombatFx,type CombatFx} from './combatFx';
import {createFog,updateFog,renderFog,renderFlashlights,exploredIndices,type FogState,type Explorer,type Flashlight} from './fogOfWar';
import {normalizeStick,stickKnob,type StickVector} from './mobileControls';
import {walkableTile,canOccupy,nearestWalkable} from './tileCollision';
import './rogueliteTheme.css';
import './style.css';

type Unit={x:number;y:number;hp:number;maxHp:number;speed:number;attack:number;boss?:boolean;alive:boolean;kind?:ZombieKind;windup?:number;phase?:number;aggro?:number;suppressed?:number;scoutMarked?:number};
type Ally=Squadmate;
type Run={wave:number;credits:number;hp:number;armor:number;mag:number;reserve:number;medkits:number;weaponTier:number;damage:number;maxMag:number;player:{x:number;y:number};enemies:Unit[];allies:Ally[];spawned:number;kills:number;bosses:number;cleared:number;seed:number;stage:'fight'|'shop';looted:number[];squadAmmo:number;activeSlot?:WeaponSlot;sideMag?:number;sideReserve?:number;reloadTimer?:number;reloadSlot?:WeaponSlot|null;playerDowned?:number;playerDead?:boolean;squadOrder?:SquadOrder;focusTarget?:number|null;reviveProgress?:number;equipment?:{loadout:Loadout;bag:Gear[];ammo:AmmoBank;capacity:number;rerolls:number;};killsTotal?:number;lootedTotal?:number;flawlessWaves?:number;bestSquad?:number;waveStartHp?:number;waveStartArmor?:number;waveHit?:boolean;explored?:number[];layoutVersion?:1|2;};
type Profile=ProfileV5;
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<div id="rogue" style="height:100dvh;display:flex;flex-direction:column;background:#0c1416;color:#eaf0eb;font:14px system-ui;overflow:hidden">
<header><strong class="game-title">DEADZONE <span style="color:#f18567">PROTOCOL</span></strong><div id="combat-hud" aria-label="Survivor status"><span id="stats" class="top-stat">WAVE 1</span><div class="hud-meter" aria-label="Health"><span>HP</span><div><i id="hud-hp"></i></div><b id="hud-hp-text">100</b></div><div class="hud-meter" aria-label="Armor"><span>ARM</span><div><i id="hud-armor"></i></div><b id="hud-armor-text">50</b></div><span class="top-stat" id="hud-weapon">CARBINE · 30/90</span><span class="top-stat" id="hud-team">SQUAD 0/4</span><span class="top-stat" id="hud-credits">₡0</span><span class="top-stat" id="hud-enemies">INFECTED 0</span></div><button id="menu" type="button">MENU</button></header>
<div id="playarea" style="position:relative;min-height:0;flex:1;display:flex;justify-content:center;align-items:center;background:#0a1113"><canvas id="rogue-canvas" style="width:100%;height:100%;object-fit:contain;touch-action:none"></canvas><div id="mobile-sticks" aria-label="Touch analog controls"><div class="analog-group analog-left"><button id="mobile-inventory-team" type="button" aria-label="Tap inventory; hold for team">INVENTORY / TEAM</button><div class="analog-base" id="move-stick" role="group" aria-label="Move"><div class="analog-ring"></div><div class="analog-knob"></div></div><span class="analog-caption">MOVE</span></div><div id="mobile-squad" aria-label="Squad commands"><button type="button" data-squad-order="follow">FOLLOW</button><button type="button" data-squad-order="hold">HOLD</button><button type="button" data-squad-order="focus">FOCUS</button><button type="button" data-squad-order="regroup">REGROUP</button><button type="button" data-squad-order="defensive">DEFEND</button></div><button id="mobile-medkit-revive" type="button" aria-label="Tap to use medkit; hold to revive">MEDKIT / REVIVE</button><div id="mobile-actions"><button id="mobile-reload" type="button">RELOAD</button><button id="mobile-interact" type="button" disabled>INTERACT</button></div><div class="analog-group analog-right"><button id="mobile-weapon-swap" type="button" aria-label="Tap to swap primary and secondary; hold for melee">SWAP WEAPON</button><div class="analog-base" id="aim-stick" role="group" aria-label="Aim and fire"><div class="analog-ring"></div><div class="analog-knob"></div></div><span class="analog-caption">AIM · FIRE</span></div></div><div id="rotate-phone" role="status" aria-live="polite"><div class="rotate-symbol" aria-hidden="true">↻</div><h2>Rotate Your Device</h2><p>Deadzone Protocol is played in landscape mode.</p></div><div id="overlay" style="position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;background:#081112df;overflow:auto;padding:14px;box-sizing:border-box"></div></div>
<footer style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px;background:#152521"><button id="weapon-primary">1 PRIMARY</button><button id="weapon-secondary">2 SIDEARM</button><button id="weapon-melee">3 MELEE</button><button id="shoot">FIRE</button><button id="reload">RELOAD (R)</button><button id="heal">MEDKIT (H)</button><button id="inventory">INVENTORY (I)</button><button id="orders">SQUAD: FOLLOW (Q)</button><button id="squad-panel">TEAM</button><button id="revive">HOLD REVIVE (V)</button><button id="moveup">▲</button><button id="moveleft">◀</button><button id="movedown">▼</button><button id="moveright">▶</button><button id="interact" disabled>INTERACT (E)</button></footer>
<div id="toast" style="position:fixed;left:50%;bottom:78px;transform:translateX(-50%);pointer-events:none;background:#243c37e8;padding:6px 12px;border-radius:6px;color:white;z-index:5"></div></div>`;
const style=document.createElement('style');style.textContent=`#overlay[hidden]{display:none!important}#overlay article{margin:auto 0}#rogue button{background:#304941;color:white;border:1px solid #879a80;border-radius:5px;padding:9px 12px;font:600 13px system-ui;cursor:pointer;touch-action:none}#rogue button:hover{background:#436354}#rogue button:disabled{opacity:.42;cursor:not-allowed}#overlay article{background:#1a2d2b;border:1px solid #8f9c82;border-radius:10px;padding:22px;max-width:560px;width:min(100%,560px);box-sizing:border-box;box-shadow:0 15px 60px #0009}#overlay h1{font-size:24px;margin:0 0 8px}#overlay h2{font-size:18px;margin:14px 0 8px}#overlay p{color:#c7d1c8;line-height:1.5}#overlay .shop{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}#overlay .shop button{text-align:left;min-height:66px}#overlay .menurow{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#overlay label{display:block;margin:8px 0}#overlay select{padding:8px;background:#1c3030;color:white;border:1px solid #7b9385}`;document.head.append(style);
const canvas=document.querySelector<HTMLCanvasElement>('#rogue-canvas')!,ctx=canvas.getContext('2d')!,overlay=document.querySelector<HTMLDivElement>('#overlay')!,toastEl=document.querySelector<HTMLDivElement>('#toast')!;
const stats=document.querySelector<HTMLElement>('#stats')!,keys=new Set<string>(),touch=new Set<string>();
let slot=1,profile:Profile=migrateProfile(null),run:Run|null=null,plan:WavePlan|null=null;
let last=performance.now(),lastSave=0,spawnClock=0,shotCooldown=0,allyClock=0,noticeUntil=0,aim={x:1,y:0},paused=false,firePressed=false;
const zeroStick=():StickVector=>({x:0,y:0,magnitude:0});
let combatFx:CombatFx[]=[],fog:FogState|null=null;
let moveAnalog=zeroStick(),aimAnalog=zeroStick(),aimFiring=false,cameraZoom=1;let pathClock=0,pathField:Int32Array|null=null,bossPulse=0,noiseClock=0,squadClock=0;
const store=(suffix:string)=>'deadzone-roguelite-v1-slot-'+slot+'-'+suffix;
function loadProfile(){try{profile=migrateProfile(JSON.parse(localStorage.getItem(store('profile'))||'null'))}catch{profile=migrateProfile(null)}}
function save(){try{localStorage.setItem(store('profile'),JSON.stringify(profile));if(run)localStorage.setItem(store('run'),JSON.stringify(run));else localStorage.removeItem(store('run'))}catch{notice('Browser storage unavailable — progress may not persist')}}
function notice(t:string){toastEl.textContent=t;noticeUntil=performance.now()+2900}
const safe=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const ammoBank=(light=48,rifle=72):AmmoBank=>({light,rifle,shotgun:0,heavy:0,precision:0});
function ensureEquipment(r:Run){
 if(!r.equipment){
  const tier=Math.max(1,Math.min(5,Math.floor(r.weaponTier||1))) as Tier;
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

function loadRun(){try{const r=JSON.parse(localStorage.getItem(store('run'))||'null') as Run|null;if(!r||!Number.isFinite(r.wave)||!['fight','shop'].includes(r.stage))return false;run=r;run.layoutVersion??=1;plan=makeWave(run.seed,run.wave,run.layoutVersion);run.looted??=[];run.squadAmmo??=run.allies.length*8;run.maxMag??=12;run.weaponTier??=1;run.damage??=1;run.activeSlot??='primary';run.sideMag??=12;run.sideReserve??=48;run.reloadTimer??=0;run.reloadSlot??=null;run.killsTotal??=0;run.lootedTotal??=0;run.flawlessWaves??=0;run.bestSquad??=run.allies.length;run.waveHit??=false;run.playerDowned??=0;run.playerDead??=false;run.squadOrder??='follow';run.focusTarget??=null;run.reviveProgress??=0;run.allies=(run.allies||[]).map((a,i)=>migrateSquadmate(a,i));
 run.player=nearestWalkable(plan.map,run.player);
 for(const a of run.allies){const p=nearestWalkable(plan.map,a);a.x=p.x;a.y=p.y;}
 ensureEquipment(run);fog=createFog(plan.map,run.explored??[]);for(const enemy of run.enemies){
 const p=nearestWalkable(plan.map,enemy);enemy.x=p.x;enemy.y=p.y;enemy.kind??=enemy.boss?'boss':'shambler';enemy.attack??=0;enemy.windup??=0;enemy.phase??=0;enemy.aggro??=0;enemy.suppressed??=0;enemy.scoutMarked??=0;}return true}catch{return false}}
function menu(){combatFx=[];paused=true;overlay.hidden=false;overlay.innerHTML=`<article><h1>DEADZONE <span style="color:#f18567">PROTOCOL</span></h1><p>Wave-based dungeon roguelite. Clear finite hordes, find the elevator, buy upgrades, and descend into a new procedural floor. The old FOB campaign remains preserved in source code.</p><label>Save slot <select id="slot-select"><option value="1">SLOT 01</option><option value="2">SLOT 02</option><option value="3">SLOT 03</option></select></label><p id="career"></p><div class="menurow"><button id="continue-run">CONTINUE RUN</button><button id="new-run">NEW RUN</button><button id="upgrades">PERMANENT UNLOCKS</button></div></article>`;
const sel=overlay.querySelector<HTMLSelectElement>('#slot-select')!;sel.value=String(slot);const refresh=()=>{loadProfile();const active=localStorage.getItem(store('run'));overlay.querySelector('#career')!.textContent='BEST WAVE '+profile.bestWave+' · LEGACY TOKENS '+profile.tokens+' · RUNS '+profile.runs+(active?' · RUN IN PROGRESS':'');(overlay.querySelector<HTMLButtonElement>('#continue-run'))!.disabled=!active};refresh();
sel.onchange=()=>{slot=Number(sel.value);run=null;plan=null;refresh()};
overlay.querySelector<HTMLButtonElement>('#continue-run')!.onclick=()=>{if(!loadRun()){notice('No valid run found');return}paused=false;if(run!.stage==='shop')shop();else overlay.hidden=true};
overlay.querySelector<HTMLButtonElement>('#new-run')!.onclick=()=>{if(localStorage.getItem(store('run'))&&!confirm('Start a new run? Current run progress will be lost.'))return;preRun()};
overlay.querySelector<HTMLButtonElement>('#upgrades')!.onclick=permanentShop;
}
function permanentShop(){loadProfile();paused=true;overlay.hidden=false;
 const groups=[...new Set(Object.values(unlocks).map(x=>x.group))];
 const rows=groups.map(g=>'<h2>'+g+'</h2><div class="shop">'+Object.entries(unlocks).filter(([_,x])=>x.group===g).map(([id,x])=>'<button id="unlock-'+id+'">'+x.label+'<br>'+x.description+'<br>'+(profile.unlocked.includes(id as UnlockId)?'UNLOCKED':x.cost+' TOKENS')+'</button>').join('')+'</div>').join('');
 overlay.innerHTML=`<article><h1>PERMANENT PROGRESSION</h1><p><strong>${profile.tokens} LEGACY TOKENS</strong> · Best wave ${profile.bestWave} · Runs ${profile.runs}. Permanent unlocks survive death. Starting weapons remain Common tier.</p><h2>Core Bonuses</h2><div class="shop"><button id="credit-unlock">STARTING CREDITS +50<br>25 tokens (max +200)</button><button id="ally-unlock">UNLOCK ONE STARTING TEAMMATE<br>75 tokens</button></div>${rows}<h2>ACHIEVEMENTS</h2><p>${Object.entries(achievements).map(([id,x])=>(profile.achievements.includes(id as keyof typeof achievements)?'✓ ':'○ ')+x.label+' ('+x.reward+' tokens)').join(' · ')}</p><div class="menurow"><button id="back-menu">BACK TO MENU</button></div></article>`;
 overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.disabled=profile.tokens<25||profile.startingCredits>=200;
 overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.disabled=profile.tokens<75||profile.startAlly;
 overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.onclick=()=>{profile.tokens-=25;profile.startingCredits+=50;save();permanentShop()};
 overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.onclick=()=>{profile.tokens-=75;profile.startAlly=true;save();permanentShop()};
 for(const id of Object.keys(unlocks) as UnlockId[]){const b=overlay.querySelector<HTMLButtonElement>('#unlock-'+id)!;b.disabled=profile.unlocked.includes(id)||profile.tokens<unlocks[id].cost;b.onclick=()=>{if(buyUnlock(profile,id)){save();permanentShop()}}}
 overlay.querySelector<HTMLButtonElement>('#back-menu')!.onclick=menu;
}
function runPerformance(r:Run):RunPerformance{return {cleared:r.cleared,bosses:r.bosses,killsTotal:r.killsTotal??0,lootedTotal:r.lootedTotal??0,flawlessWaves:r.flawlessWaves??0,bestSquad:r.bestSquad??0}}
function updateAchievements(r:Run){const award=progressAchievements(profile,runPerformance(r));if(award.names.length){notice('ACHIEVEMENT: '+award.names.join(', ')+' +'+award.reward+' Legacy Tokens');save()}}
function preRun(){loadProfile();paused=true;overlay.hidden=false;const p=profile;const c=sanitizeChoice(p,p.chosen);p.chosen=c;
 const options=(values:string[],selected:string,labels:Record<string,string>={})=>values.map(v=>'<option value="'+v+'"'+(v===selected?' selected':'')+'>'+(labels[v]??v.replace(/([A-Z])/g,' $1'))+'</option>').join('');
 const kit=startingKit(p);
 overlay.innerHTML=`<article><h1>PREPARE NEW RUN</h1><p>Choose only from your permanent unlocks. All starting weapons and attachments are Common tier. In-run gear and credits reset on death.</p>
 <label>Primary Weapon<select id="start-primary">${options(allowedPrimary(p),c.primary,Object.fromEntries(Object.entries(weaponDefs).map(([id,w])=>[id,w.name])))}</select></label>
 <label>Secondary Weapon<select disabled><option>Service Pistol</option></select></label>
 <label>Melee Weapon<select id="start-melee">${options(allowedMelee(p),c.melee,{knife:'Survival Knife',axe:'Fire Axe'})}</select></label>
 <label>Optic<select id="start-optic">${options(p.unlocked.includes('starterRedDot')?['none','redDot']:['none'],c.optic,{none:'None',redDot:'Red Dot Sight'})}</select></label>
 <label>Underbarrel<select id="start-grip">${options(p.unlocked.includes('starterGrip')?['none','grip']:['none'],c.underbarrel,{none:'None',grip:'Foregrip'})}</select></label>
 <label>Starting Squad<select id="start-ally">${options(allowedTeammates(p),c.teammate,{none:'Start Solo',rifleman:'Rifleman',medic:'Medic',heavy:'Heavy Gunner',scout:'Scout',engineer:'Engineer'})}</select></label>
 <p id="loadout-preview">${gearIcon(c.primary)}${gearIcon("pistol")}${gearIcon(c.melee)} Starting: ${kit.credits} credits · ${kit.armor} armor · ${kit.medkits} medkits · ${kit.capacity} backpack slots.</p>
 <div class="menurow"><button id="launch-run">DEPLOY INTO WAVE 1</button><button id="prep-back">BACK</button></div></article>`;
 const read=()=>{p.chosen=sanitizeChoice(p,{primary:overlay.querySelector<HTMLSelectElement>('#start-primary')!.value as WeaponId,secondary:'pistol',melee:overlay.querySelector<HTMLSelectElement>('#start-melee')!.value as 'knife'|'axe',optic:overlay.querySelector<HTMLSelectElement>('#start-optic')!.value as 'none'|'redDot',underbarrel:overlay.querySelector<HTMLSelectElement>('#start-grip')!.value as 'none'|'grip',teammate:overlay.querySelector<HTMLSelectElement>('#start-ally')!.value as 'none'|keyof typeof CLASS_INFO});save()};
 for(const id of ['start-primary','start-melee','start-optic','start-grip','start-ally'])overlay.querySelector<HTMLSelectElement>('#'+id)!.onchange=()=>{read();const preview=overlay.querySelector<HTMLElement>('#loadout-preview')!;const kit=startingKit(p);preview.innerHTML=gearIcon(kit.loadout.primary?.model??'carbine')+gearIcon('pistol')+gearIcon(kit.loadout.melee?.model??'knife')+' Starting: '+kit.credits+' credits · '+kit.armor+' armor · '+kit.medkits+' medkits · '+kit.capacity+' backpack slots.'};
 overlay.querySelector<HTMLButtonElement>('#launch-run')!.onclick=()=>{read();newRun()};
 overlay.querySelector<HTMLButtonElement>('#prep-back')!.onclick=menu;
}
function buildFloor(seed:number,wave:number){combatFx=[];if(run)run.layoutVersion=2;plan=makeWave(seed,wave,2);if(!run)return;run.explored=[];fog=createFog(plan.map);const p=plan.map.entrance;run.player={x:p.x,y:p.y};run.enemies=[];run.spawned=0;run.kills=0;run.looted=[];run.stage='fight';run.reloadTimer=0;run.reloadSlot=null;ensureEquipment(run).rerolls=0;run.focusTarget=null;run.waveHit=false;run.waveStartHp=run.hp;run.waveStartArmor=run.armor;pathClock=0;pathField=null;bossPulse=0;noiseClock=0;for(let i=0;i<run.allies.length;i++){run.allies[i].x=p.x-.4-i*.3;run.allies[i].y=p.y+.55+i*.35;const safeAlly=nearestWalkable(plan.map,run.allies[i]);run.allies[i].x=safeAlly.x;run.allies[i].y=safeAlly.y;run.allies[i].anchor={x:run.allies[i].x,y:run.allies[i].y};run.allies[i].reviveProgress=0}spawnClock=0;allyClock=0;spawnInitial();save()}
function newRun(){loadProfile();const kit=startingKit(profile);run={wave:1,credits:kit.credits,hp:100,armor:kit.armor,mag:kit.loadout.primary?.mag??0,reserve:kit.ammo.rifle,medkits:kit.medkits,weaponTier:1,damage:1,maxMag:kit.loadout.primary?.mag??0,player:{x:0,y:0},enemies:[],allies:kit.teammate==='none'?[]:[makeSquadmate(kit.teammate,'starter-01',0,0)],spawned:0,kills:0,bosses:0,cleared:0,seed:Math.floor(Math.random()*2000000000),stage:'fight',looted:[],squadAmmo:kit.teammate==='none'?0:8,activeSlot:'primary',sideMag:kit.loadout.secondary?.mag??12,sideReserve:kit.ammo.light,reloadTimer:0,reloadSlot:null,playerDowned:0,playerDead:false,squadOrder:'follow',focusTarget:null,reviveProgress:0,killsTotal:0,lootedTotal:0,flawlessWaves:0,bestSquad:kit.teammate==='none'?0:1,waveHit:false,equipment:{loadout:kit.loadout,bag:[],ammo:kit.ammo,capacity:kit.capacity,rerolls:0}};buildFloor(run.seed,1);overlay.hidden=true;paused=false;notice('WAVE 1 · Clear all infected to unlock the elevator')}
function isFloor(x:number,y:number){return !!plan&&walkableTile(plan.map,x,y)}
function canSee(ax:number,ay:number,bx:number,by:number){const dist=Math.hypot(ax-bx,ay-by),count=Math.ceil(dist*4);for(let i=1;i<count;i++){const a=i/count;if(!isFloor(ax+(bx-ax)*a,ay+(by-ay)*a))return false}return true}
function spawnOne(boss=false){if(!run||!plan||run.spawned>=plan.total)return false;const points=plan.spawnPoints.filter(p=>Math.hypot(p.x-run!.player.x,p.y-run!.player.y)>5);if(!points.length){const far=plan.spawnPoints.slice().sort((a,b)=>Math.hypot(b.x-run!.player.x,b.y-run!.player.y)-Math.hypot(a.x-run!.player.x,a.y-run!.player.y))[0];if(!far||Math.hypot(far.x-run.player.x,far.y-run.player.y)<2)return false;points.push(far)}const n=run.spawned,origin=points[(n*7+run.wave*3)%points.length];
const map=plan.map,possible: {x:number;y:number;score:number}[]=[];
for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=origin.x+dx,y=origin.y+dy;if(x<1||y<1||x>=map.width-1||y>=map.height-1||map.tiles[y*map.width+x]!==0)continue;
 if(Math.hypot(x-run.player.x,y-run.player.y)<4.5)continue;
 const overlap=run.enemies.some(e=>e.alive&&Math.hypot(e.x-x,e.y-y)<.68);
 if(overlap)continue;possible.push({x,y,score:Math.hypot(dx,dy)+Math.abs((n*13+x*7+y*11)%8)*.06})}
if(!possible.length){for(let y=1;y<map.height-1;y++)for(let x=1;x<map.width-1;x++)if(map.tiles[y*map.width+x]===0&&Math.hypot(x-run.player.x,y-run.player.y)>4.5&&!run.enemies.some(e=>e.alive&&Math.hypot(e.x-x,e.y-y)<.68))possible.push({x,y,score:Math.hypot(x-origin.x,y-origin.y)})}
if(!possible.length)return false;
possible.sort((a,b)=>a.score-b.score);const p=possible[0],kind=zombieKind(run.wave,n,boss),stats=zombieStats(kind);
run.enemies.push({x:p.x,y:p.y,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,attack:0,boss,alive:true,kind,windup:0,phase:0,aggro:0,suppressed:0,scoutMarked:0});run.spawned++;return true}
function spawnInitial(){if(!run||!plan)return;let count=0;const ordinaryQuota=plan.boss?plan.initial-1:plan.initial;while(run.spawned<ordinaryQuota&&count++<plan.initial+5)if(!spawnOne(false))break;if(plan.boss&&run.spawned<plan.total)spawnOne(true)}
function remaining(){return run&&plan?plan.total-run.kills:0}
function cleared(){return !!run&&!!plan&&canExit(plan.total,run.spawned,run.kills)}
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
function shoot(){if(!run||run.stage!=='fight'||paused||shotCooldown>0||run.hp<=0||(run.playerDowned??0)>0||run.reloadTimer)return;
 const w=activeWeapon(run);if(!w)return;const def=weaponDefs[w.model],handling=effectiveStats(w),p=run.player;
 if(def.ammo&&w.mag<=0){notice('Magazine empty — reload (R)');return}
 if(def.ammo)w.mag--;
 if(def.ammo)noiseClock=2.4*handling.noise;
 shotCooldown=handling.rate;
 combatFx.push(...makeAttackFx(w.model,p.x,p.y,aim.x,aim.y,handling.range));
 if(combatFx.length>100)combatFx.splice(0,combatFx.length-100);
 let target:Unit|null=null,score=-999;
 for(const e of run.enemies){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y,dist=Math.hypot(dx,dy);
  if(dist>handling.range||!canSee(p.x,p.y,e.x,e.y))continue;
  const facing=(dx*aim.x+dy*aim.y)/Math.max(.01,dist),val=facing*4-dist*.16;
  if(facing>(def.slot==='melee'?.15:Math.max(.2,.52-(handling.accuracy-1)*.6))&&val>score){target=e;score=val}}
 if(target){target.hp-=handling.damage;if(target.hp<=0)defeat(target)}
 save();
}
function defeat(e:Unit){if(!run||!e.alive)return;e.alive=false;run.kills++;run.killsTotal=(run.killsTotal??0)+1;run.credits+=killPayout(run.wave,!!e.boss);if(e.boss){run.bosses++;const eq=ensureEquipment(run),reward=rareLoot(run.seed,run.wave,999,true);if(reward&&canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){eq.bag.push(reward);notice('BOSS REWARD: '+itemName(reward))}else{run.credits+=250;notice('BOSS REWARD: +250 credits (backpack full)')}}if(cleared()){notice('WAVE CLEARED! Locate the green elevator.');save()}}
function reload(){if(!run||run.stage!=='fight'||run.reloadTimer||(run.playerDowned??0)>0)return;const w=activeWeapon(run);if(!w)return;const def=weaponDefs[w.model];if(!def.ammo)return;
 const eq=ensureEquipment(run),cap=effectiveStats(w).capacity,available=eq.ammo[def.ammo];
 if(w.mag>=cap||available<=0)return;run.reloadTimer=effectiveStats(w).reload;run.reloadSlot=run.activeSlot??'primary';notice('Reloading '+def.name+'...');save()}
function finishReload(){if(!run||!run.reloadSlot)return;const w=ensureEquipment(run).loadout[run.reloadSlot];if(w){const type=weaponDefs[w.model].ammo;if(type){const eq=ensureEquipment(run),n=Math.min(Math.max(0,effectiveStats(w).capacity-w.mag),eq.ammo[type]);w.mag+=n;eq.ammo[type]-=n}}
 run.reloadTimer=0;run.reloadSlot=null;save()}
function heal(){if(!run||run.stage!=='fight'||(run.playerDowned??0)>0||run.medkits<=0||run.hp>=100)return;run.medkits--;run.hp=Math.min(100,run.hp+40);save()}
function search(targetIndex?:number){if(!run||!plan||run.stage!=='fight'||(run.playerDowned??0)>0)return;
 const i=targetIndex===undefined?plan.map.loot.findIndex((p,j)=>!run!.looted.includes(j)&&Math.hypot(p.x-run!.player.x,p.y-run!.player.y)<1.4):targetIndex;
 if(i>=0&&(run.looted.includes(i)||!plan.map.loot[i]||Math.hypot(plan.map.loot[i].x-run.player.x,plan.map.loot[i].y-run.player.y)>=1.4)){notice('Move closer to search this container');return}
 if(i<0){notice('No unopened supply container nearby');return}
 const eq=ensureEquipment(run),rare=rareLoot(run.seed,run.wave,i);
 if(rare){if(!canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){notice('BACKPACK FULL — clear space before looting');return}eq.bag.push(rare);notice('Rare cache: '+itemName(rare)+' added to backpack')}
 else{const reward=(i+run.wave)%4;
  if(reward===0){run.credits+=75+run.wave*5;notice('Cache found: credits')}
  else if(reward===1){const type:AmmoType=(['rifle','light','shotgun','precision','heavy'] as AmmoType[])[(i+run.wave)%5],added=addAmmo(eq.ammo,type,ammoPack[type].count,eq.bag,run.medkits,eq.capacity);if(!added){notice('BACKPACK FULL — cannot carry ammo');return}notice('Cache: '+ammoLabels[type]+' +'+added)}
  else if(reward===2){if(usedSlots(eq.bag,eq.ammo,run.medkits+1)>eq.capacity){notice('BACKPACK FULL — cannot carry medkit');return}run.medkits++;notice('Cache found: medkit')}
  else{run.credits+=45+run.wave*4;notice('Scavenged credits')}}
 run.looted.push(i);run.lootedTotal=(run.lootedTotal??0)+1;save()}
function elevator(){if(!run||!plan||run.stage!=='fight'||(run.playerDowned??0)>0)return;if(!cleared()){notice('Eliminate all infected first — '+remaining()+' remaining');return}const p=plan.map.extraction;if(Math.hypot(run.player.x-p.x,run.player.y-p.y)>1.5){notice('Find the green elevator on the map');return}run.credits+=clearPayout(run.wave);run.cleared++;if(!run.waveHit)run.flawlessWaves=(run.flawlessWaves??0)+1;run.bestSquad=Math.max(run.bestSquad??0,run.allies.length);updateAchievements(run);run.stage='shop';save();shop()}
type NearbyInteraction={kind:'loot';index:number}|{kind:'elevator'};
function nearbyInteraction():NearbyInteraction|null{
 if(!run||!plan||paused||run.stage!=='fight'||(run.playerDowned??0)>0)return null;
 const p=run.player;
 const index=plan.map.loot.findIndex((item,i)=>!run!.looted.includes(i)&&Math.hypot(item.x-p.x,item.y-p.y)<1.4);
 if(index>=0)return {kind:'loot',index};
 const exit=plan.map.extraction;
 if(Math.hypot(exit.x-p.x,exit.y-p.y)<=1.5)return {kind:'elevator'};
 return null;
}
function interact(){
 const target=nearbyInteraction();
 if(!target)return;
 if(target.kind==='loot')search(target.index);
 else elevator();
}
function buySupply(cost:number,action:()=>boolean){if(!run||run.credits<cost){notice('Insufficient credits');return}if(!action())return;run.credits-=cost;save();shop()}
function shop(){if(!run)return;
 paused=true;overlay.hidden=false;const r=run,eq=ensureEquipment(r);const baseOffers=armoryOffers(r.seed,r.wave,eq.rerolls);
 const offers=baseOffers.filter(o=>o.kind!=='recruit'||eligibleRecruit(profile,o.model as keyof typeof CLASS_INFO));
 if(!offers.some(o=>o.kind==='recruit'))offers.push({kind:'recruit',model:'rifleman',tier:1,price:CLASS_INFO.rifleman.cost});
 if(profile.unlocked.includes('armoryCatalog')){const more=armoryOffers(r.seed^0x71ecad,r.wave,eq.rerolls+1).filter(o=>o.kind!=='recruit');offers.push(...more.slice(0,2))}
 const ammoButtons=ammoTypes.map(type=>`<button id="ammo-${type}">${gearIcon("ammo")}${ammoLabels[type].toUpperCase()} AMMO +${ammoPack[type].count}<br>${ammoPack[type].price} credits</button>`).join('');
 const offerButtons=offers.map((offer,i)=>`<button id="offer-${i}">${gearIcon(offer.kind==="recruit"?"armor":offer.model)}${offer.kind==='weapon'?weaponDefs[offer.model as WeaponId].name:offer.kind==='attachment'?attachmentDefs[offer.model as AttachmentId].name:CLASS_INFO[offer.model as keyof typeof CLASS_INFO].label+' Recruit'} ${offer.kind==='recruit'?'':'T'+offer.tier}<br>${offer.price} credits</button>`).join('');
 const bag=inventorySummary(r);
 overlay.innerHTML=`<article><h1>WAVE ${r.wave} CLEARED</h1><p><strong>${r.credits} CREDITS</strong> · Next: Wave ${r.wave+1}${(r.wave+1)%5===0?' (BOSS)':''} · Backpack ${bag}</p>
 <p>HP ${r.hp}/100 · ARMOR ${r.armor}/100 · TEAM ${r.allies.length}/4 · ${ammoTypes.map(t=>ammoLabels[t]+': '+eq.ammo[t]).join(' · ')}</p>
 <h2>Essential Supplies — Always Available</h2><div class="shop">${ammoButtons}<button id="med-buy">${gearIcon("medkit")}MEDKIT +1<br>200 credits</button><button id="heal-buy">${gearIcon("medkit")}HEAL +35 HP<br>175 credits</button><button id="armor-buy">${gearIcon("armor")}ARMOR +40<br>220 credits</button><button id="pack-buy">${gearIcon("armor")}UPGRADE BACKPACK +4<br>${backpackUpgradePrice(eq.capacity)} credits (max 24)</button></div>
 <h2>Rotating Armory Offers</h2><p>Higher tiers become more common later. Gear enters your backpack; use Inventory to equip, upgrade, attach or sell it.</p><div class="shop">${offerButtons}</div>
 <div class="menurow"><button id="reroll-buy">REROLL OFFERS — ${advanceOfferPrice(eq.rerolls)} credits</button><button id="shop-inventory">MANAGE INVENTORY (${bag})</button><button id="shop-squad">SQUAD MANAGEMENT</button><button id="descend">DESCEND TO WAVE ${r.wave+1}</button><button id="save-menu">SAVE & MENU</button></div></article>`;
 const bind=(id:string,cost:number,action:()=>boolean,allowed=true)=>{const el=overlay.querySelector<HTMLButtonElement>('#'+id)!;el.disabled=!allowed||r.credits<cost;el.onclick=()=>buySupply(cost,action)};
 for(const type of ammoTypes){const info=ammoPack[type];bind('ammo-'+type,info.price,()=>{const count=addAmmo(eq.ammo,type,info.count,eq.bag,r.medkits,eq.capacity);if(count<info.count){eq.ammo[type]-=count;notice('Need room for the entire ammo pack');return false}return true})}
 bind('med-buy',200,()=>{if(usedSlots(eq.bag,eq.ammo,r.medkits+1)>eq.capacity){notice('BACKPACK FULL');return false}r.medkits++;return true});
 bind('heal-buy',175,()=>{r.hp=Math.min(100,r.hp+35);return true},r.hp<100);
 bind('armor-buy',220,()=>{r.armor=Math.min(100,r.armor+40);return true},r.armor<100);
 const packCost=backpackUpgradePrice(eq.capacity);
 bind('pack-buy',packCost,()=>{eq.capacity+=4;return true},eq.capacity<24);
 offers.forEach((offer,i)=>bind('offer-'+i,offer.price,()=>{
  if(offer.kind==='recruit'){if(!canRecruit(r.allies.length)){notice('SQUAD FULL');return false}const role=offer.model as keyof typeof CLASS_INFO;r.allies.push(makeSquadmate(role,gearId(r),r.player.x,r.player.y));r.squadAmmo+=8;return true}
  if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity)){notice('BACKPACK FULL');return false}
  const item=offer.kind==='weapon'?newWeapon(offer.model as WeaponId,offer.tier,gearId(r)):newMod(offer.model as AttachmentId,offer.tier,gearId(r));eq.bag.push(item);notice(itemName(item)+' purchased');return true
 },offer.kind!=='recruit'||canRecruit(r.allies.length)));
 bind('reroll-buy',advanceOfferPrice(eq.rerolls),()=>{eq.rerolls++;return true});
 overlay.querySelector<HTMLButtonElement>('#shop-inventory')!.onclick=inventory;overlay.querySelector<HTMLButtonElement>('#shop-squad')!.onclick=squadPanel;
 overlay.querySelector<HTMLButtonElement>('#descend')!.onclick=()=>{if(!run)return;run.wave++;run.seed=(run.seed^Math.imul(run.wave,0x9e3779b1))>>>0;buildFloor(run.seed,run.wave);overlay.hidden=true;paused=false;notice('WAVE '+run.wave+' · Hunt every infected')};
 overlay.querySelector<HTMLButtonElement>('#save-menu')!.onclick=()=>{save();menu()};
}
function inventory(){if(!run)return;paused=true;overlay.hidden=false;
 const r=run,eq=ensureEquipment(r),atShop=r.stage==='shop';
 const slotRows=(['primary','secondary','melee'] as Slot[]).map(slot=>{const w=eq.loadout[slot];const mods=w?Object.values(w.mods).filter((m):m is Mod=>!!m):[];
  return `<section style="padding:7px;border-bottom:1px solid #3f6055"><b>${slot.toUpperCase()}</b> — ${w?gearIcon(w.model)+itemName(w):'EMPTY'} ${w?(' · '+(weaponDefs[w.model].ammo?'MAG '+w.mag+'/'+effectiveStats(w).capacity:'MELEE')):''}<br>${mods.map(m=>itemName(m)).join(' · ')||'No attachments'} ${w?'<button id="remove-'+slot+'">UNEQUIP</button>':''} ${w&&atShop&&w.tier<5?'<button id="upgrade-equipped-'+slot+'">UPGRADE '+upgradePrice(w)+' CR</button>':''} ${mods.map(m=>'<button id="detach-'+slot+'-'+attachmentDefs[m.model].slot+'">REMOVE '+attachmentDefs[m.model].slot+'</button>'+(atShop&&m.tier<5?'<button id="upgrade-mod-'+slot+'-'+attachmentDefs[m.model].slot+'">UPGRADE MOD '+upgradePrice(m)+' CR</button>':'')).join(' ')}</section>`}).join('');
 const rows=eq.bag.map((gear,i)=>`<section style="padding:8px;border-bottom:1px solid #3f6055"><b>${gearIcon(gear.model)}${itemName(gear)}</b> ${gear.kind==='weapon'?' · DMG '+effectiveStats(gear).damage.toFixed(1)+' · '+(weaponDefs[gear.model].ammo??'no ammo'):' · '+attachmentDefs[gear.model].stat} · Sell ${salePrice(gear)} credits <div class="menurow">${gear.kind==='weapon'?'<button id="equip-item-'+i+'">EQUIP '+weaponDefs[gear.model].slot.toUpperCase()+'</button>':(['primary','secondary'] as Slot[]).filter(slot=>{const w=eq.loadout[slot];return w&&canEquipMod(w,gear)}).map(slot=>'<button id="attach-'+i+'-'+slot+'">ATTACH '+slot+'</button>').join('')}${atShop&&gear.tier<5?'<button id="upgrade-item-'+i+'">UPGRADE '+upgradePrice(gear)+' CR</button>':''}<button id="dispose-'+i+'">${atShop?'SELL':'DROP'}</button></div></section>`).join('');
 overlay.innerHTML=`<article><h1>INVENTORY · ${inventorySummary(r)} SLOTS</h1><p>Gear uses one backpack slot. Ammo reserves stack into slots; medkits stack three per slot. Equipped gear does not occupy backpack space.</p><h2>Equipped Gear</h2>${slotRows}<h2>Backpack</h2>${rows||'<p>Backpack empty</p>'}<h2>Supplies</h2><p>${ammoTypes.map(t=>ammoLabels[t]+': '+eq.ammo[t]).join(' · ')} · Medkits: ${r.medkits}</p><div class="menurow">${ammoTypes.filter(t=>eq.ammo[t]>0).map(t=>'<button id="discard-'+t+'">'+(atShop?'SELL':'DROP')+' '+ammoLabels[t]+' '+Math.min(ammoStack[t],eq.ammo[t])+'</button>').join('')} ${r.medkits>0?'<button id="discard-med">'+(atShop?'SELL':'DROP')+' 1 MEDKIT</button>':''}</div><div class="menurow"><button id="close-inventory">${atShop?'BACK TO ARMORY':'RETURN TO DUNGEON'}</button></div></article>`;
 const refresh=()=>{save();inventory()};
 for(const slot of ['primary','secondary','melee'] as Slot[]){
  const w=eq.loadout[slot];if(!w)continue;
  const remove=overlay.querySelector<HTMLButtonElement>('#remove-'+slot)!;remove.disabled=!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity);
  if(atShop&&w.tier<5){const upgrade=overlay.querySelector<HTMLButtonElement>('#upgrade-equipped-'+slot)!;const price=upgradePrice(w);upgrade.disabled=r.credits<price;upgrade.onclick=()=>{if(r.credits<price)return;r.credits-=price;w.tier=(w.tier+1) as Tier;refresh()}}
  remove.onclick=()=>{if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity))return;eq.bag.push(w);eq.loadout[slot]=null;if(r.activeSlot===slot)r.activeSlot='primary';refresh()};
  for(const m of Object.values(w.mods)){if(!m)continue;const field=attachmentDefs[m.model].slot;const btn=overlay.querySelector<HTMLButtonElement>('#detach-'+slot+'-'+field)!;
   btn.disabled=!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity);
   btn.onclick=()=>{if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity))return;eq.bag.push(m);delete w.mods[field];refresh()};
   if(atShop&&m.tier<5){const upgrade=overlay.querySelector<HTMLButtonElement>('#upgrade-mod-'+slot+'-'+field)!;const price=upgradePrice(m);upgrade.disabled=r.credits<price;upgrade.onclick=()=>{if(r.credits<price)return;r.credits-=price;m.tier=(m.tier+1) as Tier;refresh()}}
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
  if(atShop&&gear.tier<5){const up=overlay.querySelector<HTMLButtonElement>('#upgrade-item-'+i)!;const price=upgradePrice(gear);up.disabled=r.credits<price;up.onclick=()=>{if(r.credits<price)return;r.credits-=price;gear.tier=(gear.tier+1) as Tier;refresh()}}
  const dispose=overlay.querySelector<HTMLButtonElement>('#dispose-'+i)!;
  dispose.onclick=()=>{eq.bag.splice(i,1);if(atShop)r.credits+=salePrice(gear);refresh()};
 });
 for(const type of ammoTypes){if(eq.ammo[type]<=0)continue;const btn=overlay.querySelector<HTMLButtonElement>('#discard-'+type)!;btn.onclick=()=>{const amount=Math.min(eq.ammo[type],ammoStack[type]);eq.ammo[type]-=amount;if(atShop)r.credits+=Math.floor(ammoPack[type].price*amount/ammoPack[type].count*.25);refresh()}}
 if(r.medkits>0){overlay.querySelector<HTMLButtonElement>('#discard-med')!.onclick=()=>{r.medkits--;if(atShop)r.credits+=45;refresh()}}
 overlay.querySelector<HTMLButtonElement>('#close-inventory')!.onclick=()=>{save();if(atShop)shop();else{paused=false;overlay.hidden=true}};
}
function squadPanel(){if(!run)return;paused=true;overlay.hidden=false;const r=run,eq=ensureEquipment(r),atShop=r.stage==='shop';
 const cards=r.allies.map((a,i)=>{const eligible=eq.bag.map((item,j)=>item.kind==='weapon'&&canClassEquip(a.role,item.model)&&weaponDefs[item.model].slot!=='melee'?'<button id="sq-equip-'+i+'-'+j+'">EQUIP '+itemName(item)+'</button>':'').join('');
 return `<section style="padding:10px 0;border-bottom:1px solid #567366"><b>${a.name} · ${CLASS_INFO[a.role].label}</b><p>HP ${Math.ceil(a.hp)}/${a.maxHp} · ARMOR ${Math.ceil(a.armor)} · ${a.downed>0?'DOWNED '+Math.ceil(a.downed)+'s':'ACTIVE'} · ${itemName(a.weapon)} · Gear tier ${a.gearTier} · AMMO ${a.magReserve}<br>${CLASS_INFO[a.role].special}</p><div class="menurow">${atShop?'<button id="sq-heal-'+i+'">HEAL +40 · 175 CR</button><button id="sq-armor-'+i+'">ARMOR +40 · 220 CR</button><button id="sq-ammo-'+i+'">CLASS AMMO +80 · 150 CR</button><button id="sq-up-'+i+'">CLASS GEAR UPGRADE · '+gearUpgradeCost(a)+' CR</button>':''}${eligible}</div></section>`}).join('');
 overlay.innerHTML=`<article><h1>SQUAD MANAGEMENT</h1><p>${r.allies.length}/4 specialists · ${r.credits} credits · Order: ${orderLabel(r.squadOrder??'follow')}</p>${cards||'<p>No living squad members. Recruits appear in the between-wave Armory.</p>'}<div class="menurow"><button id="squad-return">${atShop?'BACK TO ARMORY':'RETURN TO DUNGEON'}</button></div></article>`;
 const refresh=()=>{save();squadPanel()};
 r.allies.forEach((a,i)=>{
  if(atShop){const heal=overlay.querySelector<HTMLButtonElement>('#sq-heal-'+i)!;heal.disabled=r.credits<175||a.hp>=a.maxHp||a.downed>0;heal.onclick=()=>{if(r.credits<175||a.downed>0)return;r.credits-=175;a.hp=Math.min(a.maxHp,a.hp+40);refresh()};
   const armor=overlay.querySelector<HTMLButtonElement>('#sq-armor-'+i)!;armor.disabled=r.credits<220||a.armor>=100;armor.onclick=()=>{if(r.credits<220)return;r.credits-=220;a.armor=Math.min(100,a.armor+40);refresh()};
   const ammo=overlay.querySelector<HTMLButtonElement>('#sq-ammo-'+i)!;ammo.disabled=r.credits<150||a.magReserve>=160;ammo.onclick=()=>{if(r.credits<150)return;r.credits-=150;a.magReserve=Math.min(160,a.magReserve+80);refresh()};
   const up=overlay.querySelector<HTMLButtonElement>('#sq-up-'+i)!;const price=gearUpgradeCost(a);up.disabled=r.credits<price||a.gearTier>=5;up.onclick=()=>{if(r.credits<price)return;r.credits-=price;a.gearTier=(a.gearTier+1) as Tier;a.armorTier=a.gearTier;a.weapon.tier=a.gearTier;refresh()};
  }
  eq.bag.forEach((item,j)=>{if(item.kind!=='weapon'||!canClassEquip(a.role,item.model)||weaponDefs[item.model].slot==='melee')return;const btn=overlay.querySelector<HTMLButtonElement>('#sq-equip-'+i+'-'+j)!;btn.onclick=()=>{const old=a.weapon;if(equipClassWeapon(a,item)){eq.bag.splice(j,1);eq.bag.push(old);refresh()}}});
 });
 overlay.querySelector<HTMLButtonElement>('#squad-return')!.onclick=()=>{save();if(atShop)shop();else{paused=false;overlay.hidden=true}};
}
function death(){if(!run)return;const performance=runPerformance(run),achieved=progressAchievements(profile,performance),base=permanentPayout(run.cleared,run.bosses),bonus=performancePayout(performance),result=base+bonus;profile.tokens+=result;profile.bestWave=Math.max(profile.bestWave,run.wave);profile.runs++;const wave=run.wave,clearedCount=run.cleared;run=null;save();paused=true;overlay.hidden=false;overlay.innerHTML=`<article><h1>RUN OVER</h1><p>Reached wave ${wave}. Cleared ${clearedCount} waves.</p><p>Wave and boss rewards: ${base} · Performance: ${bonus} · New achievements: ${achieved.reward}.</p><p><strong>${result+achieved.reward} LEGACY TOKENS EARNED</strong></p>${achieved.names.length?'<p>Achievements: '+achieved.names.join(', ')+'</p>':''}<div class="menurow"><button id="again">PREPARE NEXT RUN</button><button id="back">MAIN MENU</button></div></article>`;overlay.querySelector<HTMLButtonElement>('#again')!.onclick=preRun;overlay.querySelector<HTMLButtonElement>('#back')!.onclick=menu}
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
   if(dist>1.15){a.reviveProgress=0;const vx=(rescue.x-a.x)/dist,vy=(rescue.y-a.y)/dist;moveUnit(a,vx,vy,dt*(a.role==='scout'?2.9:2.25));continue}
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
  if(d>separation){const direct=canSee(a.x,a.y,destination.x,destination.y),field=direct?null:distanceField(plan.map,destination),wp=field?nextZombieWaypoint(plan.map,field,a):destination,len=Math.hypot(wp.x-a.x,wp.y-a.y)||1;moveUnit(a,(wp.x-a.x)/len,(wp.y-a.y)/len,dt*speed)}
  if(a.role==='medic'&&a.abilityCooldown===0){const candidates=[{hp:r.hp,maxHp:100,x:p.x,y:p.y,isPlayer:true},...r.allies.filter(b=>!b.dead&&b.downed<=0).map(b=>({hp:b.hp,maxHp:b.maxHp,x:b.x,y:b.y,isPlayer:false,ally:b}))].filter(v=>v.hp<v.maxHp-10&&Math.hypot(v.x-a.x,v.y-a.y)<4);
   candidates.sort((x,y)=>(x.hp/x.maxHp)-(y.hp/y.maxHp));const injured=candidates[0];if(injured){if(injured.isPlayer&&!(r.playerDowned??0))r.hp=Math.min(100,r.hp+15+a.gearTier*3);else if('ally' in injured&&injured.ally)injured.ally.hp=Math.min(injured.ally.maxHp,injured.ally.hp+15+a.gearTier*3);a.abilityCooldown=11;notice('MEDIC FIELD HEAL')}}
  if(a.role==='engineer'&&a.abilityCooldown===0){const enemy=aliveEnemies.find(e=>Math.hypot(e.x-a.x,e.y-a.y)<3.2);if(enemy){for(const z of aliveEnemies.filter(e=>Math.hypot(e.x-enemy.x,e.y-enemy.y)<1.5)){z.hp-=1+a.gearTier;if(z.hp<=0)defeat(z)}a.abilityCooldown=13;notice('ENGINEER TRAP TRIGGERED')}
   else if(a.armor<CLASS_INFO.engineer.armor&&r.armor<80&&Math.hypot(a.x-p.x,a.y-p.y)<3){r.armor=Math.min(100,r.armor+8+a.gearTier*2);a.abilityCooldown=14;notice('ENGINEER ARMOR REPAIR')}}
  if(!shooting||a.cooldown>0||a.magReserve<=0)continue;
  const target=order==='focus'&&r.focusTarget!==null&&r.focusTarget!==undefined&&r.enemies[r.focusTarget]?.alive?r.enemies[r.focusTarget]:aliveEnemies.filter(e=>Math.hypot(e.x-a.x,e.y-a.y)<classRange(a.role)&&canSee(a.x,a.y,e.x,e.y)).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];
  if(target&&Math.hypot(target.x-a.x,target.y-a.y)<classRange(a.role)&&canSee(a.x,a.y,target.x,target.y)){target.hp-=Math.max(.5,classDamage(a.role,a.weapon.tier)*(effectiveStats(a.weapon).damage/weaponDefs[CLASS_INFO[a.role].model].damage));
   if(a.role==='heavy')for(const e of aliveEnemies)if(e!==target&&Math.hypot(e.x-target.x,e.y-target.y)<1.2)e.suppressed=2.4;
   if(a.role==='scout'){target.scoutMarked=3.5;target.aggro=5}
   if(target.hp<=0)defeat(target);combatFx.push(...makeAttackFx(a.weapon.model,a.x,a.y,target.x-a.x,target.y-a.y,Math.hypot(target.x-a.x,target.y-a.y)));if(combatFx.length>100)combatFx.splice(0,combatFx.length-100);a.cooldown=classFireDelay(a.role)*Math.max(.7,effectiveStats(a.weapon).rate/weaponDefs[CLASS_INFO[a.role].model].rate);a.magReserve--}
 }
 r.allies=r.allies.filter(a=>!a.dead);
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
function flashlightSources():Flashlight[]{
 if(!run)return [];
 const sources:Flashlight[]=[{x:run.player.x,y:run.player.y,dx:aim.x,dy:aim.y,range:8.3}];
 for(const a of run.allies)if(!a.dead&&a.downed<=0){const dir=allyDirection(a);sources.push({x:a.x,y:a.y,dx:dir.x,dy:dir.y,range:7.3})}
 return sources;
}
function explorationSources():Explorer[]{
 if(!run)return [];
 const explorers:Explorer[]=[{x:run.player.x,y:run.player.y,radius:5.5}];
 for(const a of run.allies)if(!a.dead&&a.downed<=0)explorers.push({x:a.x,y:a.y,radius:4.5});
 return explorers;
}
function update(dt:number){if(!run||!plan||paused||run.stage!=='fight')return;
combatFx=ageCombatFx(combatFx,dt);
shotCooldown=Math.max(0,shotCooldown-dt);noiseClock=Math.max(0,noiseClock-dt);if((run.reloadTimer??0)>0){run.reloadTimer=Math.max(0,(run.reloadTimer??0)-dt);if(run.reloadTimer===0)finishReload()}const p=run.player;let dx=0,dy=0;if(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('up'))dy--;if(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('down'))dy++;if(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'))dx--;if(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))dx++;const len=Math.hypot(dx,dy);if((run.playerDowned??0)===0){if(len)moveUnit(p,dx/len,dy/len,dt*(keys.has('ShiftLeft')?4:3));else if(moveAnalog.magnitude>0)moveUnit(p,moveAnalog.x,moveAnalog.y,dt*3)}
rescueAction(dt,keys.has('KeyV')||touch.has('revive'));
if(aimAnalog.magnitude>0){aim={x:aimAnalog.x/aimAnalog.magnitude,y:aimAnalog.y/aimAnalog.magnitude}}
if((run.playerDowned??0)===0&&(keys.has('Space')||firePressed||aimFiring)){const nearest=run.enemies.filter(e=>e.alive&&canSee(p.x,p.y,e.x,e.y)&&Math.hypot(e.x-p.x,e.y-p.y)<=(activeWeapon(run!)?effectiveStats(activeWeapon(run!)!).range:1.3)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(nearest&&keys.has('Space')){const length=Math.hypot(nearest.x-p.x,nearest.y-p.y)||1;aim={x:(nearest.x-p.x)/length,y:(nearest.y-p.y)/length}}shoot()}
spawnClock+=dt;if(run.spawned<plan.total&&spawnClock>1.45){spawnClock=0;const active=run.enemies.filter(e=>e.alive).length;if(active<Math.min(22,8+Math.ceil(run.wave/2)))spawnOne(false)}
squadUpdate(dt);
if(fog&&updateFog(plan.map,fog,explorationSources()))run.explored=exploredIndices(fog);
pathClock-=dt;if(pathClock<=0||!pathField){pathField=distanceField(plan.map,run.player);pathClock=.32}
for(const e of run.enemies){if(!e.alive)continue;
 e.suppressed=Math.max(0,(e.suppressed??0)-dt);e.scoutMarked=Math.max(0,(e.scoutMarked??0)-dt);const stats=zombieStats(e.kind??(e.boss?'boss':'shambler'));if(e.boss&&e.hp<e.maxHp*.5&&e.phase!==2){e.phase=2;notice('BOSS ENRAGED — ATTACKS FASTER!')}
 const sight=Math.hypot(e.x-p.x,e.y-p.y),canDetect=sight<1.5||(sight<8&&canSee(e.x,e.y,p.x,p.y))||(noiseClock>0&&sight<12)||e.boss&&sight<18;if(canDetect)e.aggro=5;else e.aggro=Math.max(0,(e.aggro??0)-dt);
 e.attack=Math.max(0,e.attack-dt);
 if((e.windup??0)>0){e.windup=Math.max(0,(e.windup??0)-dt);if(e.windup===0){
 const ability=bossAttack(run.wave);
 if(ability==='charge'){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;for(let j=0;j<8;j++)moveUnit(e,(p.x-e.x)/d,(p.y-e.y)/d,.25)}
 const distance=Math.hypot(e.x-p.x,e.y-p.y),impact=bossImpact(ability,distance);
 if(impact){hurtPlayer(impact)}
 for(const a of run.allies){const allyImpact=bossImpact(ability,Math.hypot(a.x-e.x,a.y-e.y));if(allyImpact)hurtAlly(a,allyImpact)}
 bossPulse=.28}continue}
 const nearestAlly=run.allies.filter(a=>a.hp>0&&!a.dead&&a.downed<=0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
 const playerDist=Math.hypot(p.x-e.x,p.y-e.y);
 const allyDist=nearestAlly?Math.hypot(nearestAlly.x-e.x,nearestAlly.y-e.y):Infinity;
 const target=nearestAlly&&(allyDist+.35<playerDist||(run.playerDowned??0)>0)?nearestAlly:p,dist=Math.hypot(target.x-e.x,target.y-e.y);
 if(e.boss&&e.attack===0&&(run.playerDowned??0)===0&&playerDist<(bossAttack(run.wave)==='shockwave'?3.4:2.6)){const ability=bossAttack(run.wave);e.windup=ability==='charge'?1.1:.95;e.attack=e.hp<e.maxHp*.5?2.7:4.2;notice('BOSS '+ability.toUpperCase()+' — DODGE!');continue}
 if(dist<=stats.reach&&e.attack===0&&((target!==p)||(run.playerDowned??0)===0)){e.attack=stats.attackInterval;if(target===p){hurtPlayer(stats.damage)}else{const ally=target as Ally;hurtAlly(ally,stats.damage)}continue}
 if((e.aggro??0)>0&&dist>stats.reach*.8){const direct=canSee(e.x,e.y,target.x,target.y);const waypoint=direct?target:nextZombieWaypoint(plan.map,pathField!,e);
  const vx=waypoint.x-e.x,vy=waypoint.y-e.y,len=Math.hypot(vx,vy);if(len>.03){
   const nearby=run.enemies.find(other=>other!==e&&other.alive&&Math.hypot(other.x-e.x,other.y-e.y)<.36);
   const avoid=nearby?Math.sign(e.x-nearby.x||((run.spawned%2)*2-1))*.18:0;
   moveUnit(e,(vx+avoid)/Math.max(.01,len),vy/Math.max(.01,len),dt*stats.speed*(e.phase===2?1.3:1)*((e.suppressed??0)>0?.65:1))
  }
 }
}
bossPulse=Math.max(0,bossPulse-dt);
if((run.playerDowned??0)>0){run.playerDowned=Math.max(0,(run.playerDowned??0)-dt);if(run.playerDowned===0&&run.hp<=0){run.playerDead=true;death();return}}
if(performance.now()-lastSave>1200){lastSave=performance.now();save()}
}
let lastView:View|null=null;
function draw(){
 const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight,ratio=Math.min(2,devicePixelRatio||1);
 const cw=Math.max(320,Math.floor(width*ratio)),ch=Math.max(180,Math.floor(height*ratio));
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 if(!plan||!run){ctx.fillStyle='#081115';ctx.fillRect(0,0,cw,ch);stats.textContent='READY';lastView=null;return}
 const r=run,m=plan.map,v=camera(m,r.player,cw,ch,cameraZoom);lastView=v;
 renderDungeon(ctx,m,v,r.wave);
 if(fog)renderFlashlights(ctx,m,v,flashlightSources(),fog);
 const now=performance.now(),bob=Math.sin(now/340)*v.tile*.025;
 for(const sp of plan.spawnPoints)drawSprite(ctx,'spawn',v,sp.x,sp.y,{scale:.71,alpha:.72});
 for(const [i,l] of m.loot.entries())if(!r.looted.includes(i))drawSprite(ctx,'crate',v,l.x,l.y,{scale:.94,glow:'#deae69'});
 drawSprite(ctx,'elevator',v,m.extraction.x,m.extraction.y,{scale:1.18,alpha:cleared()?1:.5,glow:cleared()?'#3beaa6':undefined,bob:cleared()?bob:0});
 for(const e of r.enemies){if(!e.alive)continue;const kind=(e.kind??(e.boss?'boss':'shambler')) as SpriteKind;
  const direction=Math.atan2(r.player.y-e.y,r.player.x-e.x);
  drawSprite(ctx,kind,v,e.x,e.y,{angle:direction,scale:e.boss?1.67:kind==='bruiser'?1.32:kind==='runner'?.93:1.12,bob:e.boss?bob:0,glow:e.boss?'#e77b44':undefined});
  if(e.maxHp>2)drawBar(ctx,v,e.x,e.y,e.hp/e.maxHp,e.boss?'#ff9c73':'#dc9b83',e.boss?1.3:.78);
  if((e.scoutMarked??0)>0){ctx.strokeStyle='#a4ecfc';ctx.lineWidth=Math.max(2,v.tile*.05);ctx.strokeRect(v.ox+(e.x-.51)*v.tile,v.oy+(e.y-.53)*v.tile,1.02*v.tile,1.02*v.tile)}
  if(e.boss&&(e.windup??0)>0)drawHazard(ctx,v,e.x,e.y,bossAttack(r.wave)==='shockwave'?3.2:bossAttack(r.wave)==='charge'?1.25:2.4);
 }
 for(const a of r.allies){
  const dir=allyDirection(a),direction=Math.atan2(dir.y,dir.x);
  drawSprite(ctx,a.role,v,a.x,a.y,{angle:direction,scale:a.role==='heavy'?1.25:1.08,down:a.downed>0,alpha:a.dead?.3:1,glow:a.role==='medic'?'#69e8a1':undefined});
  if(a.hp<a.maxHp||a.downed>0)drawBar(ctx,v,a.x,a.y,a.downed>0?a.downed/ALLY_BLEEDOUT:a.hp/a.maxHp,a.downed>0?'#f1c17e':hudColor(a.hp/a.maxHp));
 }
 drawSprite(ctx,'player',v,r.player.x,r.player.y,{angle:Math.atan2(aim.y,aim.x),scale:1.25,down:(r.playerDowned??0)>0,glow:'#b3d8b4',bob});
 drawCombatFx(ctx,v,combatFx);
 if(fog)renderFog(ctx,m,v,fog);
 if((r.playerDowned??0)>0){ctx.font='bold '+Math.max(13,v.tile*.48)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#ff9b83';ctx.fillText('DOWNED '+Math.ceil(r.playerDowned??0)+'s',v.ox+r.player.x*v.tile,v.oy+(r.player.y-1)*v.tile)}
 else{ctx.strokeStyle='rgba(255,231,185,.76)';ctx.lineWidth=Math.max(1,v.tile*.04);ctx.beginPath();ctx.moveTo(v.ox+(r.player.x+aim.x*.5)*v.tile,v.oy+(r.player.y+aim.y*.5)*v.tile);ctx.lineTo(v.ox+(r.player.x+aim.x*1.5)*v.tile,v.oy+(r.player.y+aim.y*1.5)*v.tile);ctx.stroke()}
 const w=activeWeapon(r),ammoType=w?weaponDefs[w.model].ammo:null,eq=ensureEquipment(r);
 const ammo=w&&ammoType?w.mag+'/'+eq.ammo[ammoType]:'MELEE';
 const order=orderLabel(r.squadOrder??'follow'),status=cleared()?'EXIT OPEN':'INFECTED '+remaining();
 stats.textContent='WAVE '+r.wave;
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
  button.title=action?(action.kind==='loot'?'Search supply container':'Use elevator'):'Move closer to an object';
 }
 const hpRatio=Math.max(0,r.hp/100),armorRatio=Math.max(0,r.armor/100);
 const hpBar=document.querySelector<HTMLElement>('#hud-hp')!,armorBar=document.querySelector<HTMLElement>('#hud-armor')!;
 hpBar.style.width=(hpRatio*100)+'%';hpBar.style.background=hudColor(hpRatio);
 armorBar.style.width=(armorRatio*100)+'%';armorBar.style.background=hudColor(armorRatio);
 document.querySelector('#hud-credits')!.textContent='₡'+r.credits;
 document.querySelector('#hud-enemies')!.textContent=status;
 document.querySelector('#hud-hp-text')!.textContent=String(Math.ceil(r.hp));
 document.querySelector('#hud-armor-text')!.textContent=String(Math.ceil(r.armor));
 document.querySelector('#hud-weapon')!.textContent=(w?weaponDefs[w.model].name:'UNARMED')+' · '+ammo+(r.reloadTimer?' · RELOADING':'');
 document.querySelector('#hud-team')!.textContent='SQUAD '+r.allies.length+'/4'+(r.playerDowned?' · DOWN '+Math.ceil(r.playerDowned)+'s':'');
}
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();if(noticeUntil<now)toastEl.textContent='';requestAnimationFrame(frame)}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Digit1')equip('primary');if(e.code==='Digit2')equip('secondary');if(e.code==='Digit3')equip('melee');if(e.code==='KeyR')reload();if(e.code==='KeyH')heal();if(e.code==='KeyI'&&run&&run.stage==='fight')inventory();if(e.code==='KeyQ')changeOrder();if(e.code==='KeyT')squadPanel();if(e.code==='KeyE')interact();if(e.code==='Escape')menu()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();firePressed=false;touch.clear();resetAnalogs()});document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAnalogs()});
/** Independent pointer capture lets both thumbs move and aim at once. */
function resetAnalogs(){moveAnalog=zeroStick();aimAnalog=zeroStick();aimFiring=false;document.querySelectorAll<HTMLElement>('.analog-knob').forEach(node=>{node.style.transform='translate(-50%,-50%)'})}
function bindAnalog(id:string,update:(v:StickVector)=>void,fireOnOuter=false){
 const base=document.querySelector<HTMLElement>('#'+id)!;
 const knob=base.querySelector<HTMLElement>('.analog-knob')!;
 let pointer:number|null=null;
 const process=(e:PointerEvent)=>{
  const rect=base.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.34;
  const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);
  const v=normalizeStick(dx,dy,radius);update(v);
   if(fireOnOuter)aimFiring=Math.hypot(dx,dy)>Math.min(rect.width,rect.height)/2;
  const pos=stickKnob(dx,dy,radius);knob.style.transform='translate(calc(-50% + '+pos.x+'px),calc(-50% + '+pos.y+'px))';
 };
 const release=(e:PointerEvent)=>{
  if(pointer!==e.pointerId)return;
  pointer=null;update(zeroStick());if(fireOnOuter)aimFiring=false;knob.style.transform='translate(-50%,-50%)';
  if(base.hasPointerCapture(e.pointerId))base.releasePointerCapture(e.pointerId);
 };
 base.addEventListener('pointerdown',e=>{
  if(pointer!==null||paused||!run||run.stage!=='fight')return;
  e.preventDefault();e.stopPropagation();pointer=e.pointerId;base.setPointerCapture(pointer);process(e);
 });
 base.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;e.preventDefault();process(e)});
 base.addEventListener('pointerup',release);base.addEventListener('pointercancel',release);
 base.addEventListener('lostpointercapture',e=>{if(pointer!==e.pointerId)return;pointer=null;update(zeroStick());if(fireOnOuter)aimFiring=false;knob.style.transform='translate(-50%,-50%)'});
 window.addEventListener('blur',()=>{pointer=null;update(zeroStick());knob.style.transform='translate(-50%,-50%)'});
}
bindAnalog('move-stick',v=>{moveAnalog=v});
bindAnalog('aim-stick',v=>{aimAnalog=v},true);
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!run||!plan||!lastView)return;const rect=canvas.getBoundingClientRect(),at=toWorld(lastView,(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height),dx=at.x-run.player.x,dy=at.y-run.player.y,d=Math.hypot(dx,dy);if(d>.1)aim={x:dx/d,y:dy/d}});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;e.preventDefault();if(run&&plan&&lastView&&run.squadOrder==='focus'){const rect=canvas.getBoundingClientRect(),at=toWorld(lastView,(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height);
 let best=-1,distance=1.5;run.enemies.forEach((enemy,i)=>{const d=Math.hypot(enemy.x-at.x,enemy.y-at.y);if(enemy.alive&&d<distance){best=i;distance=d}});if(best>=0){run.focusTarget=best;notice('SQUAD FOCUS: selected infected')}}firePressed=true});
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
window.addEventListener('pointerup',()=>firePressed=false);
function click(id:string,fn:()=>void){document.querySelector<HTMLButtonElement>('#'+id)!.onclick=fn}
click('shoot',shoot);click('reload',reload);click('heal',heal);click('inventory',inventory);click('orders',changeOrder);click('squad-panel',squadPanel);click('interact',interact);click('menu',menu);click('weapon-primary',()=>equip('primary'));click('weapon-secondary',()=>equip('secondary'));click('weapon-melee',()=>equip('melee'));
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
bindMobileAction('mobile-reload',reload);
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

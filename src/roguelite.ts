import {generateDungeon,type DungeonLayout} from './dungeon';
import {makeWave,killPayout,clearPayout,canExit,permanentPayout,type WavePlan} from './rogueliteRules';
import {zombieKind,zombieStats,weaponStats,reloadTransfer,distanceField,nextZombieWaypoint,incomingDamage,bossAttack,bossImpact,type ZombieKind,type WeaponSlot} from './combatSystems';
import {weaponDefs,attachmentDefs,ammoTypes,ammoLabels,ammoPack,ammoStack,newWeapon,newMod,usedSlots,addAmmo,canAddItem,canEquipMod,itemName,salePrice,effectiveStats,armoryOffers,rareLoot,advanceOfferPrice,backpackUpgradePrice,upgradePrice,type Weapon,type Mod,type Gear,type AmmoBank,type Loadout,type AmmoType,type Tier,type WeaponId,type AttachmentId,type Slot} from './equipmentArmory';
import './style.css';

type Unit={x:number;y:number;hp:number;maxHp:number;speed:number;attack:number;boss?:boolean;alive:boolean;kind?:ZombieKind;windup?:number;phase?:number;aggro?:number};
type Ally={x:number;y:number;hp:number;name:string;cooldown:number};
type Run={wave:number;credits:number;hp:number;armor:number;mag:number;reserve:number;medkits:number;weaponTier:number;damage:number;maxMag:number;player:{x:number;y:number};enemies:Unit[];allies:Ally[];spawned:number;kills:number;bosses:number;cleared:number;seed:number;stage:'fight'|'shop';looted:number[];squadAmmo:number;activeSlot?:WeaponSlot;sideMag?:number;sideReserve?:number;reloadTimer?:number;reloadSlot?:WeaponSlot|null;equipment?:{loadout:Loadout;bag:Gear[];ammo:AmmoBank;capacity:number;rerolls:number;};};
type Profile={tokens:number;bestWave:number;runs:number;startingCredits:number;startAlly:boolean};
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<div id="rogue" style="height:100dvh;display:flex;flex-direction:column;background:#0c1416;color:#eaf0eb;font:14px system-ui;overflow:hidden">
<header style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 14px;background:#142421;border-bottom:1px solid #566b5e"><strong>DEADZONE <span style="color:#f18567">PROTOCOL</span> <small style="color:#a9bbae">/ ROGUELITE</small></strong><span id="stats">WAVE 1</span><button id="menu" type="button">MENU</button></header>
<div id="playarea" style="position:relative;min-height:0;flex:1;display:flex;justify-content:center;align-items:center;background:#0a1113"><canvas id="rogue-canvas" style="width:100%;height:100%;object-fit:contain;touch-action:none"></canvas><div id="overlay" style="position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;background:#081112df;overflow:auto;padding:14px;box-sizing:border-box"></div></div>
<footer style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px;background:#152521"><button id="weapon-primary">1 PRIMARY</button><button id="weapon-secondary">2 SIDEARM</button><button id="weapon-melee">3 MELEE</button><button id="shoot">FIRE</button><button id="reload">RELOAD (R)</button><button id="heal">MEDKIT (H)</button><button id="inventory">INVENTORY (I)</button><button id="loot">SEARCH (E)</button><button id="moveup">▲</button><button id="moveleft">◀</button><button id="movedown">▼</button><button id="moveright">▶</button><button id="exit">ELEVATOR</button></footer>
<div id="toast" style="position:fixed;left:50%;bottom:78px;transform:translateX(-50%);pointer-events:none;background:#243c37e8;padding:6px 12px;border-radius:6px;color:white;z-index:5"></div></div>`;
const style=document.createElement('style');style.textContent=`#overlay[hidden]{display:none!important}#overlay article{margin:auto 0}#rogue button{background:#304941;color:white;border:1px solid #879a80;border-radius:5px;padding:9px 12px;font:600 13px system-ui;cursor:pointer;touch-action:none}#rogue button:hover{background:#436354}#rogue button:disabled{opacity:.42;cursor:not-allowed}#overlay article{background:#1a2d2b;border:1px solid #8f9c82;border-radius:10px;padding:22px;max-width:560px;width:min(100%,560px);box-sizing:border-box;box-shadow:0 15px 60px #0009}#overlay h1{font-size:24px;margin:0 0 8px}#overlay h2{font-size:18px;margin:14px 0 8px}#overlay p{color:#c7d1c8;line-height:1.5}#overlay .shop{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}#overlay .shop button{text-align:left;min-height:66px}#overlay .menurow{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#overlay label{display:block;margin:8px 0}#overlay select{padding:8px;background:#1c3030;color:white;border:1px solid #7b9385}`;document.head.append(style);
const canvas=document.querySelector<HTMLCanvasElement>('#rogue-canvas')!,ctx=canvas.getContext('2d')!,overlay=document.querySelector<HTMLDivElement>('#overlay')!,toastEl=document.querySelector<HTMLDivElement>('#toast')!;
const stats=document.querySelector<HTMLElement>('#stats')!,keys=new Set<string>(),touch=new Set<string>();
let slot=1,profile:Profile={tokens:0,bestWave:0,runs:0,startingCredits:0,startAlly:false},run:Run|null=null,plan:WavePlan|null=null;
let last=performance.now(),lastSave=0,spawnClock=0,shotCooldown=0,allyClock=0,noticeUntil=0,aim={x:1,y:0},paused=false,firePressed=false;let pathClock=0,pathField:Int32Array|null=null,bossPulse=0,noiseClock=0;
const store=(suffix:string)=>'deadzone-roguelite-v1-slot-'+slot+'-'+suffix;
function loadProfile(){try{const s=JSON.parse(localStorage.getItem(store('profile'))||'null');profile=s&&typeof s.tokens==='number'?{tokens:Math.max(0,s.tokens),bestWave:Math.max(0,s.bestWave??0),runs:Math.max(0,s.runs??0),startingCredits:Math.max(0,s.startingCredits??0),startAlly:!!s.startAlly}:{tokens:0,bestWave:0,runs:0,startingCredits:0,startAlly:false}}catch{profile={tokens:0,bestWave:0,runs:0,startingCredits:0,startAlly:false}}}
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

function loadRun(){try{const r=JSON.parse(localStorage.getItem(store('run'))||'null') as Run|null;if(!r||!Number.isFinite(r.wave)||!['fight','shop'].includes(r.stage))return false;run=r;plan=makeWave(run.seed,run.wave);run.looted??=[];run.squadAmmo??=run.allies.length*8;run.maxMag??=12;run.weaponTier??=1;run.damage??=1;run.activeSlot??='primary';run.sideMag??=12;run.sideReserve??=48;run.reloadTimer??=0;run.reloadSlot??=null;ensureEquipment(run);for(const enemy of run.enemies){enemy.kind??=enemy.boss?'boss':'shambler';enemy.attack??=0;enemy.windup??=0;enemy.phase??=0;enemy.aggro??=0;}return true}catch{return false}}
function menu(){paused=true;overlay.hidden=false;overlay.innerHTML=`<article><h1>DEADZONE <span style="color:#f18567">PROTOCOL</span></h1><p>Wave-based dungeon roguelite. Clear finite hordes, find the elevator, buy upgrades, and descend into a new procedural floor. The old FOB campaign remains preserved in source code.</p><label>Save slot <select id="slot-select"><option value="1">SLOT 01</option><option value="2">SLOT 02</option><option value="3">SLOT 03</option></select></label><p id="career"></p><div class="menurow"><button id="continue-run">CONTINUE RUN</button><button id="new-run">NEW RUN</button><button id="upgrades">PERMANENT UNLOCKS</button></div><p><small>WASD / Arrow keys move · Mouse or SPACE fire · R reload · E search · I inventory · H heal · Interact with elevator after every enemy is defeated. Touch movement buttons available.</small></p></article>`;
const sel=overlay.querySelector<HTMLSelectElement>('#slot-select')!;sel.value=String(slot);const refresh=()=>{loadProfile();const active=localStorage.getItem(store('run'));overlay.querySelector('#career')!.textContent='BEST WAVE '+profile.bestWave+' · LEGACY TOKENS '+profile.tokens+' · RUNS '+profile.runs+(active?' · RUN IN PROGRESS':'');(overlay.querySelector<HTMLButtonElement>('#continue-run'))!.disabled=!active};refresh();
sel.onchange=()=>{slot=Number(sel.value);run=null;plan=null;refresh()};
overlay.querySelector<HTMLButtonElement>('#continue-run')!.onclick=()=>{if(!loadRun()){notice('No valid run found');return}paused=false;if(run!.stage==='shop')shop();else overlay.hidden=true};
overlay.querySelector<HTMLButtonElement>('#new-run')!.onclick=()=>{if(localStorage.getItem(store('run'))&&!confirm('Start a new run? Current run progress will be lost.'))return;newRun()};
overlay.querySelector<HTMLButtonElement>('#upgrades')!.onclick=permanentShop;
}
function permanentShop(){loadProfile();paused=true;overlay.hidden=false;overlay.innerHTML=`<article><h1>PERMANENT UNLOCKS</h1><p>Legacy tokens: <strong>${profile.tokens}</strong>. Starting bonuses are deliberately modest and persist across runs.</p><div class="shop"><button id="credit-unlock">STARTING CREDITS +50<br>Cost: 25 tokens (max +200)</button><button id="ally-unlock">UNLOCK STARTING RIFLEMAN<br>Cost: 75 tokens</button></div><div class="menurow"><button id="back-menu">BACK</button></div></article>`;
overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.disabled=profile.tokens<25||profile.startingCredits>=200;overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.disabled=profile.tokens<75||profile.startAlly;
overlay.querySelector<HTMLButtonElement>('#credit-unlock')!.onclick=()=>{profile.tokens-=25;profile.startingCredits+=50;save();permanentShop()};
overlay.querySelector<HTMLButtonElement>('#ally-unlock')!.onclick=()=>{profile.tokens-=75;profile.startAlly=true;save();permanentShop()};
overlay.querySelector<HTMLButtonElement>('#back-menu')!.onclick=menu;
}
function buildFloor(seed:number,wave:number){plan=makeWave(seed,wave);if(!run)return;const p=plan.map.entrance;run.player={x:p.x,y:p.y};run.enemies=[];run.spawned=0;run.kills=0;run.looted=[];run.stage='fight';run.reloadTimer=0;run.reloadSlot=null;ensureEquipment(run).rerolls=0;pathClock=0;pathField=null;bossPulse=0;noiseClock=0;for(let i=0;i<run.allies.length;i++){run.allies[i].x=p.x-.4-i*.3;run.allies[i].y=p.y+.55+i*.35}spawnClock=0;allyClock=0;spawnInitial();save()}
function newRun(){loadProfile();run={wave:1,credits:500+profile.startingCredits,hp:100,armor:50,mag:12,reserve:72,medkits:2,weaponTier:1,damage:1,maxMag:12,player:{x:0,y:0},enemies:[],allies:profile.startAlly?[{x:0,y:0,hp:100,name:'Rifleman',cooldown:0}]:[],spawned:0,kills:0,bosses:0,cleared:0,seed:Math.floor(Math.random()*2000000000),stage:'fight',looted:[],squadAmmo:profile.startAlly?8:0,activeSlot:'primary',sideMag:12,sideReserve:48,reloadTimer:0,reloadSlot:null};ensureEquipment(run);buildFloor(run.seed,1);overlay.hidden=true;paused=false;notice('WAVE 1 · Clear all infected to unlock the elevator')}
function isFloor(x:number,y:number){if(!plan)return false;const map=plan.map,tx=Math.floor(x+.5),ty=Math.floor(y+.5);return tx>=0&&ty>=0&&tx<map.width&&ty<map.height&&map.tiles[ty*map.width+tx]===0}
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
run.enemies.push({x:p.x,y:p.y,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,attack:0,boss,alive:true,kind,windup:0,phase:0,aggro:0});run.spawned++;return true}
function spawnInitial(){if(!run||!plan)return;let count=0;const ordinaryQuota=plan.boss?plan.initial-1:plan.initial;while(run.spawned<ordinaryQuota&&count++<plan.initial+5)if(!spawnOne(false))break;if(plan.boss&&run.spawned<plan.total)spawnOne(true)}
function remaining(){return run&&plan?plan.total-run.kills:0}
function cleared(){return !!run&&!!plan&&canExit(plan.total,run.spawned,run.kills)}
function equip(slot:WeaponSlot){if(!run||paused||run.stage!=='fight')return;if(!ensureEquipment(run).loadout[slot]){notice('No weapon equipped in '+slot);return}run.activeSlot=slot;run.reloadTimer=0;run.reloadSlot=null;shotCooldown=.18;notice(itemName(activeWeapon(run)!));save()}
function shoot(){if(!run||run.stage!=='fight'||paused||shotCooldown>0||run.hp<=0||run.reloadTimer)return;
 const w=activeWeapon(run);if(!w)return;const def=weaponDefs[w.model],handling=effectiveStats(w),p=run.player;
 if(def.ammo&&w.mag<=0){notice('Magazine empty — reload (R)');return}
 if(def.ammo)w.mag--;
 if(def.ammo)noiseClock=2.4*handling.noise;
 shotCooldown=handling.rate;
 let target:Unit|null=null,score=-999;
 for(const e of run.enemies){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y,dist=Math.hypot(dx,dy);
  if(dist>handling.range||!canSee(p.x,p.y,e.x,e.y))continue;
  const facing=(dx*aim.x+dy*aim.y)/Math.max(.01,dist),val=facing*4-dist*.16;
  if(facing>(def.slot==='melee'?.15:Math.max(.2,.52-(handling.accuracy-1)*.6))&&val>score){target=e;score=val}}
 if(target){target.hp-=handling.damage;if(target.hp<=0)defeat(target)}
 save();
}
function defeat(e:Unit){if(!run||!e.alive)return;e.alive=false;run.kills++;run.credits+=killPayout(run.wave,!!e.boss);if(e.boss){run.bosses++;const eq=ensureEquipment(run),reward=rareLoot(run.seed,run.wave,999,true);if(reward&&canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){eq.bag.push(reward);notice('BOSS REWARD: '+itemName(reward))}else{run.credits+=250;notice('BOSS REWARD: +250 credits (backpack full)')}}if(cleared()){notice('WAVE CLEARED! Locate the green elevator.');save()}}
function reload(){if(!run||run.stage!=='fight'||run.reloadTimer)return;const w=activeWeapon(run);if(!w)return;const def=weaponDefs[w.model];if(!def.ammo)return;
 const eq=ensureEquipment(run),cap=effectiveStats(w).capacity,available=eq.ammo[def.ammo];
 if(w.mag>=cap||available<=0)return;run.reloadTimer=effectiveStats(w).reload;run.reloadSlot=run.activeSlot??'primary';notice('Reloading '+def.name+'...');save()}
function finishReload(){if(!run||!run.reloadSlot)return;const w=ensureEquipment(run).loadout[run.reloadSlot];if(w){const type=weaponDefs[w.model].ammo;if(type){const eq=ensureEquipment(run),n=Math.min(Math.max(0,effectiveStats(w).capacity-w.mag),eq.ammo[type]);w.mag+=n;eq.ammo[type]-=n}}
 run.reloadTimer=0;run.reloadSlot=null;save()}
function heal(){if(!run||run.stage!=='fight'||run.medkits<=0||run.hp>=100)return;run.medkits--;run.hp=Math.min(100,run.hp+40);save()}
function search(){if(!run||!plan||run.stage!=='fight')return;
 const i=plan.map.loot.findIndex((p,j)=>!run!.looted.includes(j)&&Math.hypot(p.x-run!.player.x,p.y-run!.player.y)<1.4);
 if(i<0){notice('No unopened supply container nearby');return}
 const eq=ensureEquipment(run),rare=rareLoot(run.seed,run.wave,i);
 if(rare){if(!canAddItem(eq.bag,eq.ammo,run.medkits,eq.capacity)){notice('BACKPACK FULL — clear space before looting');return}eq.bag.push(rare);notice('Rare cache: '+itemName(rare)+' added to backpack')}
 else{const reward=(i+run.wave)%4;
  if(reward===0){run.credits+=75+run.wave*5;notice('Cache found: credits')}
  else if(reward===1){const type:AmmoType=(['rifle','light','shotgun','precision','heavy'] as AmmoType[])[(i+run.wave)%5],added=addAmmo(eq.ammo,type,ammoPack[type].count,eq.bag,run.medkits,eq.capacity);if(!added){notice('BACKPACK FULL — cannot carry ammo');return}notice('Cache: '+ammoLabels[type]+' +'+added)}
  else if(reward===2){if(usedSlots(eq.bag,eq.ammo,run.medkits+1)>eq.capacity){notice('BACKPACK FULL — cannot carry medkit');return}run.medkits++;notice('Cache found: medkit')}
  else{run.credits+=45+run.wave*4;notice('Scavenged credits')}}
 run.looted.push(i);save()}
function elevator(){if(!run||!plan||run.stage!=='fight')return;if(!cleared()){notice('Eliminate all infected first — '+remaining()+' remaining');return}const p=plan.map.extraction;if(Math.hypot(run.player.x-p.x,run.player.y-p.y)>1.5){notice('Find the green elevator on the map');return}run.credits+=clearPayout(run.wave);run.cleared++;run.stage='shop';save();shop()}
function buySupply(cost:number,action:()=>boolean){if(!run||run.credits<cost){notice('Insufficient credits');return}if(!action())return;run.credits-=cost;save();shop()}
function shop(){if(!run)return;
 paused=true;overlay.hidden=false;const r=run,eq=ensureEquipment(r),offers=armoryOffers(r.seed,r.wave,eq.rerolls);
 const ammoButtons=ammoTypes.map(type=>`<button id="ammo-${type}">${ammoLabels[type].toUpperCase()} AMMO +${ammoPack[type].count}<br>${ammoPack[type].price} credits</button>`).join('');
 const offerButtons=offers.map((offer,i)=>`<button id="offer-${i}">${offer.kind==='weapon'?weaponDefs[offer.model as WeaponId].name:offer.kind==='attachment'?attachmentDefs[offer.model as AttachmentId].name:'Rifleman Recruit'} ${offer.kind==='recruit'?'':'T'+offer.tier}<br>${offer.price} credits</button>`).join('');
 const bag=inventorySummary(r);
 overlay.innerHTML=`<article><h1>WAVE ${r.wave} CLEARED</h1><p><strong>${r.credits} CREDITS</strong> · Next: Wave ${r.wave+1}${(r.wave+1)%5===0?' (BOSS)':''} · Backpack ${bag}</p>
 <p>HP ${r.hp}/100 · ARMOR ${r.armor}/100 · TEAM ${r.allies.length}/4 · ${ammoTypes.map(t=>ammoLabels[t]+': '+eq.ammo[t]).join(' · ')}</p>
 <h2>Essential Supplies — Always Available</h2><div class="shop">${ammoButtons}<button id="med-buy">MEDKIT +1<br>200 credits</button><button id="heal-buy">HEAL +35 HP<br>175 credits</button><button id="armor-buy">ARMOR +40<br>220 credits</button><button id="pack-buy">UPGRADE BACKPACK +4<br>${backpackUpgradePrice(eq.capacity)} credits (max 24)</button></div>
 <h2>Rotating Armory Offers</h2><p>Higher tiers become more common later. Gear enters your backpack; use Inventory to equip, upgrade, attach or sell it.</p><div class="shop">${offerButtons}</div>
 <div class="menurow"><button id="reroll-buy">REROLL OFFERS — ${advanceOfferPrice(eq.rerolls)} credits</button><button id="shop-inventory">MANAGE INVENTORY (${bag})</button><button id="descend">DESCEND TO WAVE ${r.wave+1}</button><button id="save-menu">SAVE & MENU</button></div></article>`;
 const bind=(id:string,cost:number,action:()=>boolean,allowed=true)=>{const el=overlay.querySelector<HTMLButtonElement>('#'+id)!;el.disabled=!allowed||r.credits<cost;el.onclick=()=>buySupply(cost,action)};
 for(const type of ammoTypes){const info=ammoPack[type];bind('ammo-'+type,info.price,()=>{const count=addAmmo(eq.ammo,type,info.count,eq.bag,r.medkits,eq.capacity);if(count<info.count){eq.ammo[type]-=count;notice('Need room for the entire ammo pack');return false}return true})}
 bind('med-buy',200,()=>{if(usedSlots(eq.bag,eq.ammo,r.medkits+1)>eq.capacity){notice('BACKPACK FULL');return false}r.medkits++;return true});
 bind('heal-buy',175,()=>{r.hp=Math.min(100,r.hp+35);return true},r.hp<100);
 bind('armor-buy',220,()=>{r.armor=Math.min(100,r.armor+40);return true},r.armor<100);
 const packCost=backpackUpgradePrice(eq.capacity);
 bind('pack-buy',packCost,()=>{eq.capacity+=4;return true},eq.capacity<24);
 offers.forEach((offer,i)=>bind('offer-'+i,offer.price,()=>{
  if(offer.kind==='recruit'){if(r.allies.length>=4){notice('SQUAD FULL');return false}r.allies.push({x:r.player.x,y:r.player.y,hp:100,name:'Rifleman',cooldown:0});r.squadAmmo+=8;return true}
  if(!canAddItem(eq.bag,eq.ammo,r.medkits,eq.capacity)){notice('BACKPACK FULL');return false}
  const item=offer.kind==='weapon'?newWeapon(offer.model as WeaponId,offer.tier,gearId(r)):newMod(offer.model as AttachmentId,offer.tier,gearId(r));eq.bag.push(item);notice(itemName(item)+' purchased');return true
 },offer.kind!=='recruit'||r.allies.length<4));
 bind('reroll-buy',advanceOfferPrice(eq.rerolls),()=>{eq.rerolls++;return true});
 overlay.querySelector<HTMLButtonElement>('#shop-inventory')!.onclick=inventory;
 overlay.querySelector<HTMLButtonElement>('#descend')!.onclick=()=>{if(!run)return;run.wave++;run.seed=(run.seed^Math.imul(run.wave,0x9e3779b1))>>>0;buildFloor(run.seed,run.wave);overlay.hidden=true;paused=false;notice('WAVE '+run.wave+' · Hunt every infected')};
 overlay.querySelector<HTMLButtonElement>('#save-menu')!.onclick=()=>{save();menu()};
}
function inventory(){if(!run)return;paused=true;overlay.hidden=false;
 const r=run,eq=ensureEquipment(r),atShop=r.stage==='shop';
 const slotRows=(['primary','secondary','melee'] as Slot[]).map(slot=>{const w=eq.loadout[slot];const mods=w?Object.values(w.mods).filter((m):m is Mod=>!!m):[];
  return `<section style="padding:7px;border-bottom:1px solid #3f6055"><b>${slot.toUpperCase()}</b> — ${w?itemName(w):'EMPTY'} ${w?(' · '+(weaponDefs[w.model].ammo?'MAG '+w.mag+'/'+effectiveStats(w).capacity:'MELEE')):''}<br>${mods.map(m=>itemName(m)).join(' · ')||'No attachments'} ${w?'<button id="remove-'+slot+'">UNEQUIP</button>':''} ${w&&atShop&&w.tier<5?'<button id="upgrade-equipped-'+slot+'">UPGRADE '+upgradePrice(w)+' CR</button>':''} ${mods.map(m=>'<button id="detach-'+slot+'-'+attachmentDefs[m.model].slot+'">REMOVE '+attachmentDefs[m.model].slot+'</button>'+(atShop&&m.tier<5?'<button id="upgrade-mod-'+slot+'-'+attachmentDefs[m.model].slot+'">UPGRADE MOD '+upgradePrice(m)+' CR</button>':'')).join(' ')}</section>`}).join('');
 const rows=eq.bag.map((gear,i)=>`<section style="padding:8px;border-bottom:1px solid #3f6055"><b>${itemName(gear)}</b> ${gear.kind==='weapon'?' · DMG '+effectiveStats(gear).damage.toFixed(1)+' · '+(weaponDefs[gear.model].ammo??'no ammo'):' · '+attachmentDefs[gear.model].stat} · Sell ${salePrice(gear)} credits <div class="menurow">${gear.kind==='weapon'?'<button id="equip-item-'+i+'">EQUIP '+weaponDefs[gear.model].slot.toUpperCase()+'</button>':(['primary','secondary'] as Slot[]).filter(slot=>{const w=eq.loadout[slot];return w&&canEquipMod(w,gear)}).map(slot=>'<button id="attach-'+i+'-'+slot+'">ATTACH '+slot+'</button>').join('')}${atShop&&gear.tier<5?'<button id="upgrade-item-'+i+'">UPGRADE '+upgradePrice(gear)+' CR</button>':''}<button id="dispose-'+i+'">${atShop?'SELL':'DROP'}</button></div></section>`).join('');
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
function death(){if(!run)return;const result=permanentPayout(run.cleared,run.bosses);profile.tokens+=result;profile.bestWave=Math.max(profile.bestWave,run.wave);profile.runs++;const wave=run.wave,clearedCount=run.cleared;run=null;save();paused=true;overlay.hidden=false;overlay.innerHTML=`<article><h1>RUN OVER</h1><p>Reached wave ${wave}. Cleared ${clearedCount} waves. Earned <b>${result} Legacy Tokens</b> for future starting unlocks.</p><div class="menurow"><button id="again">NEW RUN</button><button id="back">MAIN MENU</button></div></article>`;overlay.querySelector<HTMLButtonElement>('#again')!.onclick=newRun;overlay.querySelector<HTMLButtonElement>('#back')!.onclick=menu}
function moveUnit(u:{x:number;y:number},vx:number,vy:number,step:number){if(isFloor(u.x+vx*step,u.y))u.x+=vx*step;if(isFloor(u.x,u.y+vy*step))u.y+=vy*step}
function update(dt:number){if(!run||!plan||paused||run.stage!=='fight')return;
shotCooldown=Math.max(0,shotCooldown-dt);noiseClock=Math.max(0,noiseClock-dt);if((run.reloadTimer??0)>0){run.reloadTimer=Math.max(0,(run.reloadTimer??0)-dt);if(run.reloadTimer===0)finishReload()}const p=run.player;let dx=0,dy=0;if(keys.has('KeyW')||keys.has('ArrowUp')||touch.has('up'))dy--;if(keys.has('KeyS')||keys.has('ArrowDown')||touch.has('down'))dy++;if(keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'))dx--;if(keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))dx++;const len=Math.hypot(dx,dy);if(len)moveUnit(p,dx/len,dy/len,dt*(keys.has('ShiftLeft')?4:3));if(keys.has('Space')||firePressed){const nearest=run.enemies.filter(e=>e.alive&&canSee(p.x,p.y,e.x,e.y)&&Math.hypot(e.x-p.x,e.y-p.y)<=(activeWeapon(run!)?effectiveStats(activeWeapon(run!)!).range:1.3)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(nearest&&keys.has('Space')){const length=Math.hypot(nearest.x-p.x,nearest.y-p.y)||1;aim={x:(nearest.x-p.x)/length,y:(nearest.y-p.y)/length}}shoot()}
spawnClock+=dt;if(run.spawned<plan.total&&spawnClock>1.45){spawnClock=0;const active=run.enemies.filter(e=>e.alive).length;if(active<Math.min(22,8+Math.ceil(run.wave/2)))spawnOne(false)}
allyClock+=dt;for(const a of run.allies){const d=Math.hypot(p.x-a.x,p.y-a.y);if(d>1.4)moveUnit(a,(p.x-a.x)/d,(p.y-a.y)/d,dt*2.3);if(allyClock>.95&&run.squadAmmo>0){const target=run.enemies.filter(e=>e.alive&&Math.hypot(a.x-e.x,a.y-e.y)<5&&canSee(a.x,a.y,e.x,e.y)).sort((x,y)=>Math.hypot(a.x-x.x,a.y-x.y)-Math.hypot(a.x-y.x,a.y-y.y))[0];if(target){target.hp-=1;run.squadAmmo--;if(target.hp<=0)defeat(target)}}}if(allyClock>.95)allyClock=0;
pathClock-=dt;if(pathClock<=0||!pathField){pathField=distanceField(plan.map,run.player);pathClock=.32}
for(const e of run.enemies){if(!e.alive)continue;
 const stats=zombieStats(e.kind??(e.boss?'boss':'shambler'));if(e.boss&&e.hp<e.maxHp*.5&&e.phase!==2){e.phase=2;notice('BOSS ENRAGED — ATTACKS FASTER!')}
 const sight=Math.hypot(e.x-p.x,e.y-p.y),canDetect=sight<1.5||(sight<8&&canSee(e.x,e.y,p.x,p.y))||(noiseClock>0&&sight<12)||e.boss&&sight<18;if(canDetect)e.aggro=5;else e.aggro=Math.max(0,(e.aggro??0)-dt);
 e.attack=Math.max(0,e.attack-dt);
 if((e.windup??0)>0){e.windup=Math.max(0,(e.windup??0)-dt);if(e.windup===0){
 const ability=bossAttack(run.wave);
 if(ability==='charge'){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;for(let j=0;j<8;j++)moveUnit(e,(p.x-e.x)/d,(p.y-e.y)/d,.25)}
 const distance=Math.hypot(e.x-p.x,e.y-p.y),impact=bossImpact(ability,distance);
 if(impact){const hit=incomingDamage(impact,run.armor);run.armor=hit.armor;run.hp=Math.max(0,run.hp-hit.hpDamage)}
 for(const a of run.allies){const allyImpact=bossImpact(ability,Math.hypot(a.x-e.x,a.y-e.y));if(allyImpact)a.hp=Math.max(0,a.hp-allyImpact)}
 bossPulse=.28}continue}
 const nearestAlly=run.allies.filter(a=>a.hp>0).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
 const playerDist=Math.hypot(p.x-e.x,p.y-e.y);
 const allyDist=nearestAlly?Math.hypot(nearestAlly.x-e.x,nearestAlly.y-e.y):Infinity;
 const target=nearestAlly&&allyDist+.35<playerDist?nearestAlly:p,dist=Math.hypot(target.x-e.x,target.y-e.y);
 if(e.boss&&e.attack===0&&playerDist<(bossAttack(run.wave)==='shockwave'?3.4:2.6)){const ability=bossAttack(run.wave);e.windup=ability==='charge'?1.1:.95;e.attack=e.hp<e.maxHp*.5?2.7:4.2;notice('BOSS '+ability.toUpperCase()+' — DODGE!');continue}
 if(dist<=stats.reach&&e.attack===0){e.attack=stats.attackInterval;if(target===p){const hit=incomingDamage(stats.damage,run.armor);run.armor=hit.armor;run.hp=Math.max(0,run.hp-hit.hpDamage)}else{const ally=target as Ally;ally.hp=Math.max(0,ally.hp-stats.damage)}continue}
 if((e.aggro??0)>0&&dist>stats.reach*.8){const direct=canSee(e.x,e.y,target.x,target.y);const waypoint=direct?target:nextZombieWaypoint(plan.map,pathField!,e);
  const vx=waypoint.x-e.x,vy=waypoint.y-e.y,len=Math.hypot(vx,vy);if(len>.03){
   const nearby=run.enemies.find(other=>other!==e&&other.alive&&Math.hypot(other.x-e.x,other.y-e.y)<.36);
   const avoid=nearby?Math.sign(e.x-nearby.x||((run.spawned%2)*2-1))*.18:0;
   moveUnit(e,(vx+avoid)/Math.max(.01,len),vy/Math.max(.01,len),dt*stats.speed*(e.phase===2?1.3:1))
  }
 }
}
run.allies=run.allies.filter(a=>a.hp>0);
bossPulse=Math.max(0,bossPulse-dt);
if(run.hp<=0){death();return}
if(performance.now()-lastSave>1200){lastSave=performance.now();save()}
}
function draw(){const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;const ratio=Math.min(2,devicePixelRatio||1);const cw=Math.max(320,Math.floor(width*ratio)),ch=Math.max(180,Math.floor(height*ratio));if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}ctx.fillStyle='#0b1517';ctx.fillRect(0,0,cw,ch);
if(!plan||!run){stats.textContent='READY';return}
const map=plan.map,tile=Math.max(8,Math.min(cw/(map.width+2),ch/(map.height+2))),ox=(cw-map.width*tile)/2,oy=(ch-map.height*tile)/2;
ctx.fillStyle='#33433b';for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(map.tiles[y*map.width+x]===0){ctx.fillRect(ox+x*tile,oy+y*tile,tile-.8,tile-.8)}
const box=(x:number,y:number,color:string,r=.32)=>{ctx.fillStyle=color;ctx.fillRect(ox+(x-r)*tile,oy+(y-r)*tile,tile*r*2,tile*r*2)};
for(const [i,l]of map.loot.entries())if(!run.looted.includes(i))box(l.x,l.y,'#b89443',.30);
for(const sp of plan.spawnPoints)box(sp.x,sp.y,'#704941',.18);
const exit=map.extraction;box(exit.x,exit.y,cleared()?'#50dba1':'#9c7660',.43);
for(const e of run.enemies)if(e.alive){const kind=e.kind??(e.boss?'boss':'shambler'),info=zombieStats(kind);box(e.x,e.y,info.color,e.boss?.53:kind==='bruiser'?.43:kind==='armored'?.36:kind==='runner'?.26:.31);if(e.boss){ctx.fillStyle='#d3d6c7';ctx.fillRect(ox+(e.x-.5)*tile,oy+(e.y-.72)*tile,tile*Math.max(0,e.hp/e.maxHp),tile*.1);if((e.windup??0)>0){ctx.beginPath();ctx.arc(ox+e.x*tile,oy+e.y*tile,tile*(bossAttack(run.wave)==='shockwave'?3.2:bossAttack(run.wave)==='charge'?1.25:2.4),0,Math.PI*2);ctx.strokeStyle='#ff8e5688';ctx.lineWidth=Math.max(1,tile*.11);ctx.stroke()}}}
for(const a of run.allies)box(a.x,a.y,'#71b7dc',.3);
box(run.player.x,run.player.y,'#f2e5c6',.36);ctx.strokeStyle='#f1e4ad';ctx.lineWidth=Math.max(1,tile*.12);ctx.beginPath();ctx.moveTo(ox+run.player.x*tile,oy+run.player.y*tile);ctx.lineTo(ox+(run.player.x+aim.x*.75)*tile,oy+(run.player.y+aim.y*.75)*tile);ctx.stroke();
const w=activeWeapon(run),ammoType=w?weaponDefs[w.model].ammo:null,eq=ensureEquipment(run);stats.textContent='WAVE '+run.wave+' · '+(cleared()?'CLEAR — FIND ELEVATOR':'ENEMIES LEFT '+remaining())+' · HP '+run.hp+' · ARMOR '+run.armor+' · '+(w?itemName(w):'UNARMED')+' '+(w&&ammoType?w.mag+'/'+eq.ammo[ammoType]:'MELEE')+((run.reloadTimer??0)>0?' RELOADING':'')+' · BAG '+inventorySummary(run)+' · ₡'+run.credits+' · TEAM '+run.allies.length;
}
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();if(noticeUntil<now)toastEl.textContent='';requestAnimationFrame(frame)}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Digit1')equip('primary');if(e.code==='Digit2')equip('secondary');if(e.code==='Digit3')equip('melee');if(e.code==='KeyR')reload();if(e.code==='KeyH')heal();if(e.code==='KeyI'&&run&&run.stage==='fight')inventory();if(e.code==='KeyE'){search();elevator()}if(e.code==='Escape')menu()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();firePressed=false;touch.clear()});
canvas.addEventListener('pointermove',e=>{if(!run||!plan)return;const rect=canvas.getBoundingClientRect(),map=plan.map,ratio=Math.min(rect.width/(map.width+2),rect.height/(map.height+2)),ox=(rect.width-map.width*ratio)/2,oy=(rect.height-map.height*ratio)/2;const targetX=((e.clientX-rect.left)-ox)/ratio,targetY=((e.clientY-rect.top)-oy)/ratio,dx=targetX-run.player.x,dy=targetY-run.player.y,d=Math.hypot(dx,dy);if(d>.1)aim={x:dx/d,y:dy/d}});canvas.addEventListener('pointerdown',e=>{e.preventDefault();firePressed=true});window.addEventListener('pointerup',()=>firePressed=false);
function click(id:string,fn:()=>void){document.querySelector<HTMLButtonElement>('#'+id)!.onclick=fn}
click('shoot',shoot);click('reload',reload);click('heal',heal);click('loot',search);click('inventory',inventory);click('exit',elevator);click('menu',menu);click('weapon-primary',()=>equip('primary'));click('weapon-secondary',()=>equip('secondary'));click('weapon-melee',()=>equip('melee'));
for(const [id,dir]of [['moveup','up'],['movedown','down'],['moveleft','left'],['moveright','right']]){const el=document.querySelector<HTMLButtonElement>('#'+id)!;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);touch.add(dir)});el.addEventListener('pointerup',()=>touch.delete(dir));el.addEventListener('pointercancel',()=>touch.delete(dir))}
loadProfile();menu();requestAnimationFrame(frame);

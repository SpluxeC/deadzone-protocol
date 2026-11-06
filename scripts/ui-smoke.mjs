/** Real Chromium desktop clicks and emulated mobile taps through the main game screens.
 * Run via npm run ui-smoke after installing Playwright and Chromium.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const errors=[];
async function action(page,selector,touch=false){
 const el=page.locator(selector).first();
 await el.waitFor({state:'visible',timeout:12000});
 assert.equal(await el.isDisabled(),false,selector+' should be enabled');
 if(touch)await el.tap({timeout:12000});else await el.click({timeout:12000});
}
async function checkWiring(page,label){
 const missing=await page.locator('#overlay button:not(:disabled)').evaluateAll(nodes=>
  nodes.filter(n=>!n.onclick).map(n=>n.id||n.textContent?.trim().slice(0,40)));
 assert.deepEqual(missing,[],label+' has unbound enabled buttons');
}
async function getRun(page){return page.evaluate(()=>{
 const key=Object.keys(localStorage).find(k=>k.endsWith('-run')&&k.startsWith('deadzone-roguelite'));
 if(!key)throw Error('No saved run');
 return {key,run:JSON.parse(localStorage.getItem(key))};
});}
async function setupShop(page){
 const {key,run}=await getRun(page);
 await page.evaluate(async ({key,run})=>{
  const {makeSquadmate}=await import('/src/squadSystems.ts');
  run.stage='shop';run.credits=200000;run.hp=58;run.armor=25;run.medkits=3;
  run.equipment.capacity=24;
  run.equipment.loadout.primary={id:'audit-primary',kind:'weapon',model:'assault',tier:5,mag:25,mods:{
   optic:{id:'audit-equipped-optic',kind:'attachment',model:'redDot',tier:2}
  }};
  run.equipment.bag=[
   {id:'audit-spare-weapon',kind:'weapon',model:'carbine',tier:3,mag:20,mods:{}},
   {id:'audit-spare-optic',kind:'attachment',model:'scope',tier:3},
   {id:'audit-spare-mag',kind:'attachment',model:'extended',tier:2},
   {id:'audit-extra-sidearm',kind:'weapon',model:'revolver',tier:1,mag:6,mods:{}}
  ];
  if(!run.allies.length)run.allies=[makeSquadmate('rifleman','audit-ally',run.player.x-1,run.player.y)];
  run.allies[0].hp=60;run.allies[0].armor=30;run.allies[0].magReserve=30;
  localStorage.setItem(key,JSON.stringify(run));
 },{key,run});
 await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.deadzoneReady==='true');
 await action(page,'#continue-run',page.context().__auditTouch);
 await page.locator('.armory-screen').waitFor();
}
async function setupExtraction(page){
 const {key,run}=await getRun(page);
 await page.evaluate(async({key,run})=>{
  const {makeWave}=await import('/src/rogueliteRules.ts');
  const plan=makeWave(run.seed,run.wave,run.layoutVersion??3);
  run.stage='fight';run.player={...plan.map.extraction};run.enemies=[];run.hp=100;run.armor=100;
  run.playerDowned=0;run.waveHit=false;
  localStorage.setItem(key,JSON.stringify(run));
 },{key,run});
 await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.deadzoneReady==='true');
 await action(page,'#continue-run',page.context().__auditTouch);
 try{
  await page.waitForFunction(()=>!document.querySelector('#interact')?.disabled,null,{timeout:8000});
 }catch(error){
  const state=await page.evaluate(()=>{
   const button=document.querySelector('#interact'),overlay=document.querySelector('#overlay');
   const key=Object.keys(localStorage).find(k=>k.endsWith('-run')&&k.startsWith('deadzone-roguelite'));
   const run=key?JSON.parse(localStorage.getItem(key)):null;
   return {disabled:button?.disabled,title:button?.title,overlayHidden:overlay?.hidden,
    ready:document.documentElement.dataset.deadzoneReady,
    stage:run?.stage,player:run?.player,hp:run?.hp,downed:run?.playerDowned,
    seed:run?.seed,wave:run?.wave,layoutVersion:run?.layoutVersion};
  });
  console.error('EXTRACTION CONTROL DIAGNOSTICS',state);
  throw error;
 }
}
async function runScenario(touch){
 const context=await browser.newContext(touch?{
  viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2
 }:{viewport:{width:1440,height:900}});
 context.__auditTouch=touch;
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push((touch?'mobile: ':'desktop: ')+e.message));
 page.on('dialog',d=>d.accept());
 const tap=selector=>action(page,selector,touch);
 const label=touch?'mobile':'desktop';
 console.log(label,'checking main menu');
 await page.goto(origin);
 await page.waitForFunction(()=>document.documentElement.dataset.deadzoneReady==='true');
 await checkWiring(page,label+' main menu');
 await tap('#upgrades');
 await checkWiring(page,label+' permanent upgrades');
 await page.locator('#progression-group').selectOption({index:1});
 await checkWiring(page,label+' permanent category');
 await page.locator('#progression-group').selectOption('Achievements');
 await checkWiring(page,label+' achievements');
 await tap('#back-menu');
 await tap('#new-run');
 await checkWiring(page,label+' preparation');
 await page.locator('#start-primary').selectOption({index:0});
 await tap('#prep-back');
 await tap('#new-run');
 await tap('#launch-run');
 if(touch){
  console.log(label,'checking mobile controls');
  await tap('#mobile-inventory-team');
  await checkWiring(page,label+' live inventory');
  await tap('#close-inventory');
  await tap('#mobile-weapon-swap');
  await tap('#mobile-medkit-revive');
 }else{
  await tap('#inventory');
  await checkWiring(page,label+' live inventory');
  await tap('#close-inventory');
  await tap('#weapon-secondary');
  await tap('#weapon-primary');
  await tap('#squad-panel');
  await checkWiring(page,label+' live squad screen');
  await tap('#squad-return');
 }
 console.log(label,'checking Armory and inventory interactions');
 await setupShop(page);
 await checkWiring(page,label+' armory');
 // Exercise every available Armory/inventory/squad button separately, restoring
 // a known valid save between taps so purchases and destructive actions cannot
 // obscure later buttons.
 const snapshot=await getRun(page);
 const restore=async(screen)=>{
  await page.evaluate(({key,run})=>localStorage.setItem(key,JSON.stringify(run)),snapshot);
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.deadzoneReady==='true');
  await tap('#continue-run');
  if(screen==='inventory')await tap('#shop-inventory');
  if(screen==='squad')await tap('#shop-squad');
 };
 for(const screen of ['armory','inventory','squad']){
  await restore(screen);
  const ids=await page.locator('#overlay button:not(:disabled)').evaluateAll(nodes=>
   nodes.filter(n=>n.id).map(n=>n.id));
  console.log(label,'tapping',ids.length,screen,'buttons');
  for(const id of ids){
   await restore(screen);
   // Conditional controls may change with gear state, but a fresh snapshot
   // should preserve the original screen and button availability.
   await checkWiring(page,label+' '+screen+' '+id);
   await tap('#'+id);
   assert.deepEqual(errors,[],'No errors after '+label+' '+screen+' '+id);
  }
 }
 await restore('armory');
 const initialCredits=(await getRun(page)).run.credits;
 await tap('#med-buy');
 assert.ok((await getRun(page)).run.credits<initialCredits);
 await tap('#shop-inventory');
 await checkWiring(page,label+' Armory inventory');
 await tap('#upgrade-equipped-primary');
 assert.equal((await getRun(page)).run.equipment.loadout.primary.tier,6,'Legendary -> Exotic button works');
 await checkWiring(page,label+' refreshed inventory');
 await tap('#upgrade-mod-primary-optic');
 await tap('#detach-primary-optic');
 await tap('#attach-1-primary'); // bag scope remains at index 1 until removed
 await tap('#equip-item-0');
 await tap('#upgrade-item-0');
 await tap('#dispose-0');
 await checkWiring(page,label+' changed backpack');
 await tap('#close-inventory');
 await tap('#shop-squad');
 await checkWiring(page,label+' squad management');
 await tap('#sq-heal-0');
 await tap('#sq-armor-0');
 await tap('#sq-ammo-0');
 await tap('#sq-up-0');
 await tap('#squad-return');
 await tap('#reroll-buy');
 await checkWiring(page,label+' rerolled Armory');
 await tap('#offer-0');
 await tap('#shop-inventory');
 await tap('#close-inventory');
 console.log(label,'checking extraction and results');
 await setupExtraction(page);
 await tap(touch?'#mobile-interact':'#interact');
 await page.locator('#extraction-continue').waitFor({state:'visible'});
 await checkWiring(page,label+' wave report');
 await tap('#extraction-continue');
 await tap('#save-menu');
 await checkWiring(page,label+' returned main menu');
 await tap('#continue-run');
 await tap('#descend');
 await tap('#menu');
 await tap('#continue-run');
 // Test cashout and end-of-run buttons from a fresh extraction.
 await setupExtraction(page);
 await tap(touch?'#mobile-interact':'#interact');
 await tap('#extraction-cashout');
 await checkWiring(page,label+' run results');
 await tap('#again');
 await checkWiring(page,label+' next run preparation');
 await tap('#prep-back');
 await context.close();
 console.log(label,'PASS');
}
try{
 await runScenario(false);
 await runScenario(true);
 assert.deepEqual(errors,[],'No uncaught errors during click/tap navigation');
 console.log('PASS: desktop clicks and mobile taps, menus, Armory, inventory, squad, extraction, results');
}catch(e){
 console.error('BROWSER SMOKE FAILURE',e);
 if(errors.length)console.error(errors);
 process.exitCode=1;
}finally{await browser.close()}

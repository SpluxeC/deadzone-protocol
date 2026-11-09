import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponDefs,type WeaponId} from './equipmentArmory.ts';
import {weaponSignature,isMelee,clampVolume,gameAudio} from './gameAudio.ts';
import {weaponAcoustics,makeWeaponClip,makeZombieClip,makeReloadClip,makeMachineryClip,audioKindForWeapon} from './realisticSoundDesign.ts';
test('all 25 weapons have their own original shot or melee sound profile',()=>{
 const weapons=Object.keys(weaponDefs) as WeaponId[];
 assert.equal(weapons.length,25);
 const signatures=new Set<string>();
 for(const id of weapons){
  const s=weaponSignature(id);
  assert.ok(s.pitch>=40&&s.pitch<=500,id+' frequency');
  assert.ok(s.body>0&&s.tail>0&&s.metal>=0,id+' sound envelope');
  const fingerprint=Object.values(s).join(':');
  assert.ok(!signatures.has(fingerprint),'weapon must have a distinct signature: '+id);
  signatures.add(fingerprint);
 }
 for(const id of ['knife','axe','machete','bat','crowbar'] as WeaponId[])
  assert.equal(isMelee(id),true,id+' must get impact rather than gunfire');
 assert.equal(isMelee('pistol'),false);
 assert.equal(isMelee('heavyMachineGun'),false);
});
test('saved master sound volume is safely clamped and engine stays silent until gesture',()=>{
 assert.equal(clampVolume(1.5),1);
 assert.equal(clampVolume(-2),0);
 assert.equal(clampVolume(.45),.45);
 assert.ok(gameAudio.volume>=0&&gameAudio.volume<=1);
 assert.equal(gameAudio.enabled,false,'must not start playing audio before user gesture');
 gameAudio.setVolume(.38);
 assert.equal(gameAudio.volume,.38);
 gameAudio.setMuted(true);
 assert.equal(gameAudio.muted,true);
 gameAudio.setMuted(false);
 assert.equal(gameAudio.muted,false);
});

test('realistic sound layers are deterministic, audible and clipped safely',()=>{
 const weaponIds=Object.keys(weaponDefs) as WeaponId[];
 assert.deepEqual(new Set(Object.keys(weaponAcoustics)),new Set(weaponIds));
 for(const id of weaponIds){
  const clip=makeWeaponClip(id,12000);
  const again=makeWeaponClip(id,12000);
  assert.equal(clip.sampleRate,12000);
  assert.ok(clip.duration>.08&&clip.duration<1,'bounded generated sound length for '+id);
  let peak=0,energy=0;
  for(const sample of clip.samples){peak=Math.max(peak,Math.abs(sample));energy+=sample*sample}
  assert.ok(peak>0.02&&peak<1,'safe audible peak '+id);
  assert.ok(energy/clip.samples.length>0.00001,'non-silent sound '+id);
  assert.deepEqual(clip.samples,again.samples,'same weapon profile reproduces consistently');
  assert.equal(audioKindForWeapon(id),isMelee(id)?'melee':'gunshot');
 }
});
test('zombie species, reloads and heavy machinery have distinct multi-layered foley',()=>{
 const names=['shambler','runner','armored','bruiser','boss'] as const;
 const clips=names.map(kind=>makeZombieClip(kind,'growl',12000));
 const audioHashes=new Set(clips.map(({samples})=>samples.slice(600,670).join(',')));
 assert.equal(audioHashes.size,names.length,'each enemy kind has different vocal texture');
 for(const clip of [...clips,makeReloadClip('assault',12000),makeMachineryClip('elevator',12000),makeMachineryClip('breach',12000)]){
  assert.ok(clip.samples.length>=1200);
  assert.ok(clip.samples.some(x=>Math.abs(x)>.001));
  assert.ok(clip.samples.every(Number.isFinite));
 }
 const normal=makeWeaponClip('assault',12000);
 const suppressed=makeWeaponClip('assault',12000,true);
 const energy=(clip:typeof normal)=>clip.samples.reduce((total,n)=>total+n*n,0);
 assert.ok(energy(suppressed)<energy(normal)*.60,'suppressor reduces muzzle energy');
});

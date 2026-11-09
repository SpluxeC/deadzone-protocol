import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponDefs,type WeaponId} from './equipmentArmory.ts';
import {weaponSignature,isMelee,clampVolume,gameAudio} from './gameAudio.ts';
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

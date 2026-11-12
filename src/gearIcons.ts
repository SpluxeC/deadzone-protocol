const gearUrl=new URL('./assets/deadzone-gear.svg',import.meta.url).href;
export const gearIconModels=['pistol','smg','carbine','assault','shotgun','autoShotgun','lmg','marksman','sniper','knife','axe','redDot','scope','suppressor','compensator','longBarrel','extended','quickMag','grip','bipod','medkit','armor','ammo','credits','revolver','machinePistol','compactSmg','suppressedSmg','battleRifle','burstRifle','doubleBarrel','tacticalShotgun','heavyMarksman','machete','bat','crowbar','squadAutomatic','heavyMachineGun','holoSight','reflexSight','variableScope','flashHider','portedBarrel','drumMag','lightMag','angledGrip','laserSight'] as const;
export type GearIconId=typeof gearIconModels[number];
export function gearIcon(id:string):string{
 const alias:Record<string,GearIconId>={thermalSight:'scope',breacherChoke:'longBarrel',reinforcedReceiver:'compensator',tacticalStock:'grip'};
 const index=gearIconModels.indexOf((alias[id]??id) as GearIconId);
 if(index<0)return '';
 return '<span class="gear-mini" aria-hidden="true" style="background-image:url('+gearUrl+');--gear-position:'+(index/(gearIconModels.length-1)*100)+'%"></span>';
}

/** Compact, self-contained grenade illustrations sized like regular Armory gear icons. */
export function grenadeIcon(type:'frag'|'impact'|'stun'|'lure'):string{
 const colors={frag:'#75866b',impact:'#b87951',stun:'#c8d5d1',lure:'#c66a4f'};
 const bands={frag:'#a8bb82',impact:'#e3b46c',stun:'#f1f6eb',lure:'#f3a078'};
 const body=type==='impact'
  ?'<path d="M14 21L22 15H42L50 21V46L43 52H21L14 46Z" fill="'+colors[type]+'" stroke="#182325" stroke-width="2.8"/><path d="M18 30H46M18 41H46" stroke="#302e28" stroke-width="3"/>'
  :'<rect x="19" y="19" width="26" height="34" rx="6" fill="'+colors[type]+'" stroke="#182325" stroke-width="2.8"/><path d="M24 25V47M39 25V47" stroke="#202c2a" stroke-width="2" opacity=".45"/>';
 const details=type==='stun'
  ?'<path d="M29 28L25 39H32L29 46L40 33H33L37 28Z" fill="#f1f6ed"/>'
  :type==='lure'
  ?'<circle cx="32" cy="36" r="5" fill="#f8d39b"/><path d="M22 29Q16 36 22 43M42 29Q48 36 42 43" fill="none" stroke="#ffd6a1" stroke-width="2"/>'
  :type==='frag'
  ?'<path d="M20 35H44M31 22V51" stroke="#bec9b0" stroke-width="2" opacity=".5"/>'
  :'<circle cx="32" cy="36" r="6" fill="#ecba78"/><circle cx="32" cy="36" r="2" fill="#48382e"/>';
 return '<span class="gear-mini grenade-mini" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" focusable="false"><rect x="2" y="2" width="60" height="60" rx="10" fill="#1a302e"/><path d="M14 14L50 50" stroke="#778e80" stroke-width="3" opacity=".12"/><path d="M28 13V9H36V13M33 12V7L42 6" stroke="#c2c9b6" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 12H40V20H24Z" fill="'+bands[type]+'" stroke="#25302c" stroke-width="2"/>'+body+details+'</svg></span>';
}

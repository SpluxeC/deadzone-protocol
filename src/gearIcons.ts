const gearUrl=new URL('./assets/deadzone-gear.svg',import.meta.url).href;
export const gearIconModels=['pistol','smg','carbine','assault','shotgun','autoShotgun','lmg','marksman','sniper','knife','axe','redDot','scope','suppressor','compensator','longBarrel','extended','quickMag','grip','bipod','medkit','armor','ammo','credits','revolver','machinePistol','compactSmg','suppressedSmg','battleRifle','burstRifle','doubleBarrel','tacticalShotgun','heavyMarksman','machete','bat','crowbar'] as const;
export type GearIconId=typeof gearIconModels[number];
export function gearIcon(id:string):string{
 const index=gearIconModels.indexOf(id as GearIconId);
 if(index<0)return '';
 return '<span class="gear-mini" aria-hidden="true" style="background-image:url('+gearUrl+');background-position:-'+(index*34)+'px 0"></span>';
}

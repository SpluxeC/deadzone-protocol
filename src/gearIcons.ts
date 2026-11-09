const gearUrl=new URL('./assets/deadzone-gear.svg',import.meta.url).href;
export const gearIconModels=['pistol','smg','carbine','assault','shotgun','autoShotgun','lmg','marksman','sniper','knife','axe','redDot','scope','suppressor','compensator','longBarrel','extended','quickMag','grip','bipod','medkit','armor','ammo','credits','revolver','machinePistol','compactSmg','suppressedSmg','battleRifle','burstRifle','doubleBarrel','tacticalShotgun','heavyMarksman','machete','bat','crowbar','squadAutomatic','heavyMachineGun','holoSight','reflexSight','variableScope','flashHider','portedBarrel','drumMag','lightMag','angledGrip','laserSight'] as const;
export type GearIconId=typeof gearIconModels[number];
export function gearIcon(id:string):string{
 const alias:Record<string,GearIconId>={thermalSight:'scope',breacherChoke:'longBarrel',reinforcedReceiver:'compensator',tacticalStock:'grip'};
 const index=gearIconModels.indexOf((alias[id]??id) as GearIconId);
 if(index<0)return '';
 return '<span class="gear-mini" aria-hidden="true" style="background-image:url('+gearUrl+');--gear-position:'+(index/(gearIconModels.length-1)*100)+'%"></span>';
}

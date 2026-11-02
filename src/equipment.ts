export type ArmorInventory={armor:number;plates:number};
export function equipPlate(state:ArmorInventory):ArmorInventory|null{
 if(state.plates<=0||state.armor>=100)return null;
 return {armor:Math.min(100,state.armor+50),plates:state.plates-1};
}
export function absorbDamage(armor:number,damage:number):{armor:number;healthDamage:number}{
 const safeArmor=Math.max(0,Math.floor(armor)),safeDamage=Math.max(0,Math.floor(damage));
 const blocked=Math.min(safeArmor,Math.ceil(safeDamage*0.7));
 return {armor:safeArmor-blocked,healthDamage:safeDamage-blocked};
}

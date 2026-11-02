export type Recipe='ammo'|'medkit'|'armor'|'rifle';
export type WorkOrder={kind:Recipe;remaining:number};
export const recipes:Record<Recipe,{scrap:number;seconds:number}>={ammo:{scrap:3,seconds:25},medkit:{scrap:5,seconds:25},armor:{scrap:7,seconds:35},rifle:{scrap:14,seconds:65}};
export function queueOrder(queue:WorkOrder[],kind:Recipe,scrap:number,rifleUnlocked:boolean):{queue:WorkOrder[];scrap:number}|null{
 if(queue.length>=6||scrap<recipes[kind].scrap||(kind==='rifle'&&!rifleUnlocked))return null;
 return {queue:[...queue,{kind,remaining:recipes[kind].seconds}],scrap:scrap-recipes[kind].scrap};
}
export function tickProduction(queue:WorkOrder[],dt:number,operational:boolean):{queue:WorkOrder[];completed:Recipe|null}{
 if(!operational||!queue.length||dt<=0)return {queue,completed:null};
 const current={...queue[0],remaining:queue[0].remaining-dt};
 return current.remaining<=0?{queue:queue.slice(1),completed:current.kind}:{queue:[current,...queue.slice(1)],completed:null};
}
export function finalGuardianClear(tier:number,bossHp:number){return tier>=3&&bossHp<=0;}
export function campaignComplete(guardian:boolean,defenses:number,commandOperational:boolean){return guardian&&defenses>=3&&commandOperational;}

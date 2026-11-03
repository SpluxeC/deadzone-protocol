export type CombatAlly={id:number;hp:number;dead:boolean;x?:number;y?:number};
export type CombatEnemy={x:number;y:number};
export function findSupportTarget(allies:CombatAlly[],enemies:CombatEnemy[],killed:number[],order:'cover'|'assault',escortId:number,canSee:(ax:number,ay:number,bx:number,by:number)=>boolean,player:{x:number;y:number}):{allyId:number;enemyIndex:number}|null{
 const range=order==='assault'?4:2.5;
 const living=allies.filter(a=>!a.dead&&a.hp>0&&a.id!==escortId);
 let best:{allyId:number;enemyIndex:number;distance:number}|null=null;
 for(const ally of living){
  const ax=ally.x??player.x,ay=ally.y??player.y;
  for(let index=0;index<enemies.length;index++){
   const enemy=enemies[index];
   if(killed.includes(index))continue;
   const distance=Math.hypot(ax-enemy.x,ay-enemy.y);
   if(distance>range||!canSee(ax,ay,enemy.x,enemy.y))continue;
   if(!best||distance<best.distance)best={allyId:ally.id,enemyIndex:index,distance};
  }
 }
 return best?{allyId:best.allyId,enemyIndex:best.enemyIndex}:null;
}

export type CombatAlly={id:number;hp:number;dead:boolean;x?:number;y?:number};
export type CombatEnemy={x:number;y:number};
export function findSupportTarget(allies:CombatAlly[],enemies:CombatEnemy[],killed:number[],order:'cover'|'assault',escortId:number,canSee:(ax:number,ay:number,bx:number,by:number)=>boolean,player:{x:number;y:number}):{allyId:number;enemyIndex:number}|null{
 const range=order==='assault'?4:2.5;
 const living=allies.filter(a=>!a.dead&&a.hp>0&&a.id!==escortId);
 let best:{allyId:number;enemyIndex:number;distance:number}|null=null;
 for(const ally of living){
  const ax=ally.x??player.x,ay=ally.y??player.y;
  enemies.forEach((enemy,index)=>{
   if(killed.includes(index))return;
   const distance=Math.hypot(ax-enemy.x,ay-enemy.y);
   if(distance>range||!canSee(ax,ay,enemy.x,enemy.y))return;
   if(!best||distance<best.distance)best={allyId:ally.id,enemyIndex:index,distance};
  });
 }
 return best?{allyId:best.allyId,enemyIndex:best.enemyIndex}:null;
}

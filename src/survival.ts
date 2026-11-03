export type Supplies={food:number;water:number};
export type BaseEconomy={population:number;farms:number;collectors:number;storage:number;farmStaff:number;waterStaff:number};
export function produceSupplies(current:Supplies,base:BaseEconomy):Supplies {
 const capacity=20+Math.max(0,base.storage)*20,consume=Math.ceil(Math.max(0,base.population)*.75);
 const foodYield=Math.max(0,base.farms)*(3+Math.min(4,Math.max(0,base.farmStaff)));
 const waterYield=Math.max(0,base.collectors)*(3+Math.min(4,Math.max(0,base.waterStaff)));
 return {food:Math.max(0,Math.min(capacity,current.food+foodYield-consume)),water:Math.max(0,Math.min(capacity,current.water+waterYield-consume))};
}

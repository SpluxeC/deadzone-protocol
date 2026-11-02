export function floorSeed(seed:number,floor:number):number {return floor===1?seed:(seed^Math.imul(floor,0x9e3779b1))>>>0}
export function nextFloor(floor:number):number{return Math.min(3,Math.max(1,Math.floor(floor)+1))}
export function resolveCasualty(hp:number,damage:number):{hp:number;dead:boolean}{const remaining=Math.max(0,hp-Math.max(0,damage));return {hp:remaining,dead:remaining===0}}

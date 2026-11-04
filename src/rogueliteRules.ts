import {generateDungeon, type DungeonLayout} from './dungeon.ts';
export type WavePlan={wave:number;map:DungeonLayout;total:number;initial:number;reinforcements:number;boss:boolean;spawnPoints:{x:number;y:number}[]};
export function waveDimensions(wave:number):{width:number;height:number}{
 const w=Math.max(1,Math.floor(wave));return {width:Math.min(64,32+Math.floor((w-1)/4)*6),height:Math.min(48,24+Math.floor((w-1)/4)*4)};
}
export function waveEnemyCount(wave:number):number{return Math.min(110,10+Math.max(1,Math.floor(wave))*3)}
export function makeWave(seed:number,wave:number):WavePlan{
 const n=Math.max(1,Math.floor(wave)),dims=waveDimensions(n);
 const map=generateDungeon(seed,dims.width,dims.height);
 const total=waveEnemyCount(n),initial=Math.min(total,Math.max(5,Math.floor(total*.55)));
 const floor=map.tiles.map((tile,i)=>tile===0?{x:i%map.width,y:Math.floor(i/map.width)}:null).filter((v):v is {x:number;y:number}=>v!==null);
 const distant=floor.filter(p=>Math.hypot(p.x-map.entrance.x,p.y-map.entrance.y)>=9&&Math.hypot(p.x-map.extraction.x,p.y-map.extraction.y)>2);
 const spawnPoints=(distant.length?distant:floor).filter((_,i)=>i%Math.max(1,Math.floor(floor.length/12))===0).slice(0,12);
 return {wave:n,map,total,initial,reinforcements:total-initial,boss:n%5===0,spawnPoints:spawnPoints.length?spawnPoints:[map.extraction]};
}
export function killPayout(wave:number,boss=false):number{return boss?180+wave*12:12+Math.floor(Math.max(1,wave)/5)*3}
export function clearPayout(wave:number):number{return 90+Math.max(1,wave)*25+(wave%5===0?250:0)}
export function canExit(total:number,spawned:number,killed:number):boolean{return spawned>=total&&killed>=total}
export function permanentPayout(clearedWaves:number,bosses:number):number{return Math.max(0,clearedWaves)*4+Math.max(0,bosses)*20}

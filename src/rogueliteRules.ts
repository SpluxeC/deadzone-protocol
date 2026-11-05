import {generateDungeon, type DungeonLayout} from './dungeon.ts';
export type WavePlan={wave:number;map:DungeonLayout;total:number;initial:number;reinforcements:number;boss:boolean;spawnPoints:{x:number;y:number}[]};
export type LayoutVersion=1|2|3;
export function waveDimensions(wave:number,layoutVersion:LayoutVersion=3):{width:number;height:number}{
 const w=Math.max(1,Math.floor(wave));
 const legacy={width:Math.min(64,32+Math.floor((w-1)/4)*6),height:Math.min(48,24+Math.floor((w-1)/4)*4)};
 // Double each axis for new runs; legacy v1/v2 saves keep their original geometry.
 return layoutVersion===3?{width:legacy.width*2,height:legacy.height*2}:legacy;
}
export function waveEnemyCount(wave:number,layoutVersion:LayoutVersion=3):number{
 const legacy=Math.min(110,10+Math.max(1,Math.floor(wave))*3);
 return layoutVersion===3?legacy*2:legacy;
}
export function makeWave(seed:number,wave:number,layoutVersion:LayoutVersion=3):WavePlan{
 const n=Math.max(1,Math.floor(wave)),dims=waveDimensions(n,layoutVersion);
 const map=generateDungeon(seed,dims.width,dims.height,layoutVersion);
 const total=waveEnemyCount(n,layoutVersion),initial=Math.min(total,Math.max(5,Math.floor(total*.55)));
 const floor=map.tiles.map((tile,i)=>tile===0?{x:i%map.width,y:Math.floor(i/map.width)}:null).filter((v):v is {x:number;y:number}=>v!==null);
 const distant=floor.filter(p=>Math.hypot(p.x-map.entrance.x,p.y-map.entrance.y)>=9&&Math.hypot(p.x-map.extraction.x,p.y-map.extraction.y)>2);
 const pool=distant.length?distant:floor;
 const targetCount=layoutVersion===3?24:12;
 // Distribute spawn points across the enlarged map, avoiding clustered reinforcements.
 const spawnPoints=pool.filter((_,i)=>i%Math.max(1,Math.floor(pool.length/targetCount))===0).slice(0,targetCount);
 return {wave:n,map,total,initial,reinforcements:total-initial,boss:n%5===0,spawnPoints:spawnPoints.length?spawnPoints:[map.extraction]};
}
export function killPayout(wave:number,boss=false):number{return boss?180+wave*12:12+Math.floor(Math.max(1,wave)/5)*3}
export function clearPayout(wave:number):number{return 90+Math.max(1,wave)*25+(wave%5===0?250:0)}
export function canExit(total:number,spawned:number,killed:number):boolean{return spawned>=total&&killed>=total}
export function permanentPayout(clearedWaves:number,bosses:number):number{return Math.max(0,clearedWaves)*4+Math.max(0,bosses)*20}

/** Endless extraction pressure. Spawn intervals shrink as time in a wave increases.
 * An active-enemy cap keeps browser/mobile simulation bounded.
 */
export function extractionSpawnInterval(elapsedSeconds:number,wave:number):number{
 const elapsed=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
 const difficulty=Math.min(.2,(Math.max(1,wave)-1)*.012);
 return Math.max(.4,2.4-difficulty-elapsed*.012);
}
export function extractionActiveCap(elapsedSeconds:number,wave:number):number{
 const elapsed=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
 return Math.min(55,Math.max(16,Math.floor(18+Math.max(1,wave)*.8+elapsed/18)));
}
export function formatRunTime(seconds:number):string{
 const whole=Math.max(0,Math.floor(Number.isFinite(seconds)?seconds:0));
 return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');
}

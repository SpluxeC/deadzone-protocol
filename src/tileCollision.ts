import type {DungeonLayout} from './dungeon.ts';
import type {Point} from './rogueliteVisuals.ts';

/** Actor centers coincide with map tile centers (integer x/y).
 * A small footprint avoids clipping sprites through neighbouring wall tiles.
 */
export function walkableTile(map:DungeonLayout,x:number,y:number):boolean{
 const tx=Math.floor(x+.5),ty=Math.floor(y+.5);
 return tx>=0&&ty>=0&&tx<map.width&&ty<map.height&&map.tiles[ty*map.width+tx]===0;
}
export function canOccupy(map:DungeonLayout,x:number,y:number,radius=.24):boolean{
 return walkableTile(map,x-radius,y-radius)&&walkableTile(map,x+radius,y-radius)
  &&walkableTile(map,x-radius,y+radius)&&walkableTile(map,x+radius,y+radius);
}
/** Defensive old-save migration for actors inside walls, without regenerating the saved floor. */
export function nearestWalkable(map:DungeonLayout,point:Point):Point{
 if(Number.isFinite(point.x)&&Number.isFinite(point.y)&&canOccupy(map,point.x,point.y))return point;
 const px=Number.isFinite(point.x)?point.x:map.entrance.x;
 const py=Number.isFinite(point.y)?point.y:map.entrance.y;
 let best:Point=map.entrance,score=Infinity;
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  if(!canOccupy(map,x,y))continue;
  const d=(x-px)**2+(y-py)**2;
  if(d<score){score=d;best={x,y}}
 }
 return best;
}

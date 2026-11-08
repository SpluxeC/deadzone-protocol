import type {View} from './rogueliteVisuals';
import type {BossAttack} from './combatSystems';

/** Original top-down boss character art, drawn in world space without external image assets.
 * Local forward is -Y; every limb is animated independently of the generic zombie atlas.
 */
export type BossPose={x:number;y:number;heading:number;stride:number;speed:number;time:number;windup:number;recover:number;enraged:boolean;death?:number};
const circle=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,rotation=0)=>{
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fill();
};
const polygon=(c:CanvasRenderingContext2D,points:number[],fill:string,stroke='#101519')=>{
 c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
 c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=.028;c.stroke();
};
const limb=(c:CanvasRenderingContext2D,points:number[],color:string,width:number)=>{
 c.lineCap='round';c.lineJoin='round';c.strokeStyle='#14191b';c.lineWidth=width+.05;c.beginPath();
 c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.stroke();
 c.strokeStyle=color;c.lineWidth=width-.018;c.stroke();
};
const scar=(c:CanvasRenderingContext2D,x:number,y:number,length:number)=>{
 c.strokeStyle='#d6ada0';c.lineWidth=.026;c.beginPath();c.moveTo(x-length/2,y);c.lineTo(x+length/2,y+.06);c.stroke();
};
function butcher(c:CanvasRenderingContext2D,p:BossPose,t:number,step:number,attack:number){
 const breath=Math.sin(t*2.1)*.012;
 // Enormous asymmetrical shoulders and pale exposed tissue.
 for(const side of [-1,1]){
  const sway=side*step*.09;
  limb(c,[side*.27,.14,side*(.36+sway),.33,side*(.33+sway),.52],side<0?'#383633':'#51483d',.25);
  circle(c,side*(.34+sway),.51, .13,.095,'#181e1b');
 }
 polygon(c,[-.48,-.26,-.32,-.47,.21,-.49,.49,-.23,.44,.23,.18,.38,-.38,.34,-.54,.10],'#734a43');
 circle(c,-.37,-.27,.29,.31,'#a35c53',-.2);
 circle(c,.34,-.22,.20,.25,'#674541',.25);
 polygon(c,[-.21,-.20,.23,-.27,.26,.20,-.17,.25],'#4b302f');
 for(let i=0;i<4;i++)scar(c,-.21+i*.1,-.1+i*.065,.16);
 // Left arm is an oversized butcher's blade; the right is a blunt crusher.
 const raise=attack*.42;
 limb(c,[-.40,-.27,-.58,-.08-raise,-.65,.19-raise],'#8b514a',.25);
 polygon(c,[-.72,.02-raise,-.55,.02-raise,-.55,.47-raise,-.82,.56-raise,-.91,.35-raise],'#9faaa5','#293339');
 polygon(c,[-.77,.05-raise,-.61,.05-raise,-.62,.43-raise,-.84,.47-raise],'#68716b');
 limb(c,[.39,-.26,.59,-.05-raise,.68,.20-raise],'#6c4440',.28);
 circle(c,.68,.20-raise,.18,.2,'#8f5c50');
 // A small sunken head above the torso makes the body feel enormous.
 circle(c,0,-.46+breath,.22,.23,'#8f6a5b');
 polygon(c,[-.15,-.48,.10,-.52,.16,-.38,-.12,-.33],'#322625');
 circle(c,-.085,-.46,.038,.027,'#ef9a71');
 circle(c,.09,-.46,.04,.027,'#f1a47b');
}
function breaker(c:CanvasRenderingContext2D,p:BossPose,t:number,step:number,attack:number){
 const crouch=attack*.14,jerk=Math.sin(t*16)*attack*.022;
 for(const side of [-1,1]){
  const swing=side*step*.12;
  limb(c,[side*.23,.12,side*(.29+swing),.37,side*(.30+swing),.54],'#55544a',.24);
  polygon(c,[side*.19,.43,side*.42,.43,side*.43,.57,side*.16,.58],'#353b3b');
 }
 polygon(c,[-.43,-.25,-.26,-.48,.24,-.48,.43,-.22,.35,.30,-.33,.28],'#6e5142');
 // Recognizable riot-armor segments and reinforced collision shoulder.
 polygon(c,[-.40,-.41,-.10,-.46,-.12,.10,-.34,.16,-.48,-.17],'#4e6464');
 polygon(c,[.09,-.44,.41,-.46,.58,-.17,.44,.16,.14,.09],'#8f7953');
 polygon(c,[.16,-.37,.42,-.39,.50,-.16,.18,-.11],'#c4a56b');
 polygon(c,[-.12,-.29,.13,-.31,.21,.18,-.22,.19],'#353f42');
 for(let y=-.14;y<=.1;y+=.12)polygon(c,[-.16,y,.14,y,.12,y+.04,-.16,y+.04],'#687777');
 limb(c,[-.36,-.24,-.55,-.03+crouch,-.52,.20+crouch],'#56615b',.23);
 limb(c,[.38,-.24,.64,-.10+crouch,.69,.15+crouch],'#6b6556',.28);
 polygon(c,[.52,-.23+crouch,.83,-.20+crouch,.89,.10+crouch,.66,.30+crouch,.50,.03+crouch],'#8a825e');
 polygon(c,[.61,-.17+crouch,.82,-.15+crouch,.85,.05+crouch,.66,.18+crouch],'#c0a46e');
 circle(c,jerk,-.44+crouch,.20,.22,'#3a4546');
 polygon(c,[-.16,-.49+crouch,.13,-.49+crouch,.16,-.39+crouch,-.15,-.37+crouch],'#19272c');
 circle(c,-.07,-.44+crouch,.08,.034,'#ffbe65');
 circle(c,.08,-.44+crouch,.045,.025,'#ff8c4f');
}
function revenant(c:CanvasRenderingContext2D,p:BossPose,t:number,step:number,attack:number){
 const hover=Math.sin(t*2.8)*.042,reach=attack*.24;
 // Thin elongated limbs; rib-cage glow is visible even at low zoom.
 for(const side of [-1,1]){
  const swing=Math.sin(t*2+side)*.11+step*.10;
  limb(c,[side*.15,.14,side*(.23+swing),.39,side*(.20+swing),.57],'#343a49',.115);
  circle(c,side*(.20+swing),.59,.09,.10,'#1b2030');
 }
 limb(c,[-.21,-.29,-.51,-.13-reach,-.68,.21-reach],'#57506b',.13);
 limb(c,[.20,-.28,.48,-.16-reach,.63,.23-reach],'#524d65',.13);
 for(const side of [-1,1])for(let j=0;j<3;j++){
  const x=side*(.62+j*.055),y=.22-reach+j*.05;
  limb(c,[side*.63,.18-reach,x,y],'#8981a4',.033);
 }
 polygon(c,[-.22,-.39,-.08,-.51,.15,-.47,.28,-.23,.20,.17,.03,.34,-.18,.15,-.29,-.17],'#45445b');
 for(let i=0;i<5;i++){
  const y=-.25+i*.105;
  limb(c,[-.14,y,-.02,y+.045,.16,y-.01],'#97869c',.045);
 }
 const pulse=.7+.3*Math.sin(t*7);
 c.shadowColor='#c68bff';c.shadowBlur=.23+pulse*.15;
 circle(c,.01,-.1,.10+pulse*.03,.15+pulse*.035,'#be83fa');
 circle(c,.01,-.10,.038,.11,'#e5c5ff');
 c.shadowBlur=0;
 circle(c,Math.sin(t*1.4)*.018,-.52+hover,.16,.24,'#746579');
 polygon(c,[-.16,-.55+hover,.17,-.56+hover,.10,-.39+hover,-.10,-.41+hover],'#363144');
 circle(c,-.07,-.51+hover,.035,.06,'#e3baff');
 circle(c,.08,-.51+hover,.035,.06,'#e3baff');
}
/** Character animation is independent of physics. All positions are in tile units. */
export function drawBossArt(c:CanvasRenderingContext2D,v:View,kind:BossAttack,p:BossPose):void{
 const x=v.ox+p.x*v.tile,y=v.oy+p.y*v.tile,t=p.time;
 const walking=Math.min(1,p.speed/1.4),stride=Math.sin(p.stride)*walking;
 const wind=Math.max(0,Math.min(1,p.windup)),recover=Math.max(0,Math.min(1,p.recover));
 const size=v.tile*(kind==='slam'?1.82:kind==='charge'?1.65:1.62);
 c.save();c.translate(x,y);
 circle(c,0,size*.37,size*.38,size*.13,'rgba(0,0,0,.46)');
 if(p.enraged){
  c.strokeStyle=kind==='shockwave'?'#cb7aff':'#f35d45';c.lineWidth=Math.max(1.5,v.tile*.055);
  c.globalAlpha=.35+.22*Math.sin(t*9);
  c.beginPath();c.arc(0,0,size*.51,0,Math.PI*2);c.stroke();c.globalAlpha=1;
 }
 // +pi/2 keeps the same heading convention as the existing zombie sprite renderer.
 c.rotate(p.heading+Math.PI/2);
 const lift=kind==='shockwave'?Math.sin(t*3)*size*.045:Math.abs(stride)*size*.025;
 c.translate(0,-lift+wind*size*.10-recover*size*.045);
 const squash=kind==='charge'?wind*.15:kind==='slam'?wind*.08:-wind*.06;
 c.scale(size*(1+squash),size*(1-squash*.55));
 if(kind==='slam')butcher(c,p,t,stride,wind);
 else if(kind==='charge')breaker(c,p,t,stride,wind);
 else revenant(c,p,t,stride,wind);
 c.restore();
}
/** Short-lived, attack-specific aftermath. No persistent effect entity is needed. */
export function drawBossImpact(c:CanvasRenderingContext2D,v:View,kind:BossAttack,x:number,y:number,age:number):void{
 if(age<=0||age>=.55)return;
 const a=age/.55,px=v.ox+x*v.tile,py=v.oy+y*v.tile;
 c.save();c.globalAlpha=(1-a)*.75;
 c.strokeStyle=kind==='shockwave'?'#cb92fa':kind==='charge'?'#f6a95d':'#b75c4f';
 c.lineWidth=Math.max(1,v.tile*(.13*(1-a)+.02));
 c.beginPath();c.arc(px,py,v.tile*(.4+a*(kind==='shockwave'?3.1:kind==='slam'?2.35:1.0)),0,Math.PI*2);c.stroke();
 if(kind==='slam'){
  c.strokeStyle='#78463c';
  for(let j=0;j<8;j++){
   const ang=j*Math.PI/4,a1=v.tile*(.3+a*.9),a2=v.tile*(.6+a*2);
   c.beginPath();c.moveTo(px+Math.cos(ang)*a1,py+Math.sin(ang)*a1);
   c.lineTo(px+Math.cos(ang+.12)*a2,py+Math.sin(ang+.12)*a2);c.stroke();
  }
 }
 c.restore();
}

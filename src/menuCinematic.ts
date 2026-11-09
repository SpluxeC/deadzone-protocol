import {drawSprite,type View,type SpriteKind} from './rogueliteVisuals.ts';

/** Ambient main-menu vignette. Uses the actual unarmed zombie and armed NPC
 * sprites from gameplay. Nothing here affects run state or RNG.
 * The loop alternates a survivor fighting and escaping the approaching horde.
 */
const zombies:readonly SpriteKind[]=['shambler','runner','armored','bruiser','shambler'];
const cycleDuration=14000;
const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const ease=(value:number)=>{const t=clamp(value);return t*t*(3-2*t)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;

function sceneBackground(c:CanvasRenderingContext2D,w:number,h:number,t:number):void{
 const grad=c.createLinearGradient(0,0,0,h);
 grad.addColorStop(0,'#071015');grad.addColorStop(.45,'#182f2c');grad.addColorStop(1,'#081214');
 c.fillStyle=grad;c.fillRect(0,0,w,h);
 // Abandoned corridor perspective and concrete floor.
 c.fillStyle='#1b292b';
 c.beginPath();c.moveTo(0,h*.36);c.lineTo(w,h*.36);c.lineTo(w,h*.9);c.lineTo(0,h*.9);c.fill();
 c.fillStyle='#293b36';c.fillRect(0,h*.75,w,h*.16);
 c.strokeStyle='#6b7b69';c.lineWidth=Math.max(1,h*.008);
 c.beginPath();c.moveTo(0,h*.365);c.lineTo(w,h*.365);c.moveTo(0,h*.75);c.lineTo(w,h*.75);c.stroke();
 c.lineWidth=1;c.strokeStyle='rgba(174,184,154,.12)';
 for(let i=0;i<13;i++){const x=(i/12)*w;c.beginPath();c.moveTo(x,h*.76);c.lineTo(x+(x-w/2)*.05,h*.9);c.stroke()}
 for(let i=0;i<6;i++){const x=i*w/5;c.beginPath();c.moveTo(x,h*.38);c.lineTo(x,h*.73);c.stroke()}
 // Luminous red warning light, rolling haze, grime, broken equipment.
 const pulse=.14+.1*Math.sin(t/430);
 const light=c.createRadialGradient(w*.76,h*.24,1,w*.76,h*.24,w*.58);
 light.addColorStop(0,'rgba(240,74,51,'+pulse+')');
 light.addColorStop(1,'rgba(240,74,51,0)');
 c.fillStyle=light;c.fillRect(0,0,w,h);
 c.fillStyle='#394740';c.fillRect(w*.08,h*.51,w*.055,h*.22);
 c.fillStyle='#1a2929';c.fillRect(w*.075,h*.49,w*.067,h*.04);
 c.fillStyle='#6a5845';c.fillRect(w*.86,h*.65,w*.07,h*.09);
 c.strokeStyle='#b1a078';c.lineWidth=2;c.strokeRect(w*.86,h*.65,w*.07,h*.09);
 c.fillStyle='rgba(30,52,45,.21)';
 for(let i=0;i<7;i++){
  const x=((i*.31+t*.000007)%1)*w;
  c.beginPath();c.ellipse(x,h*(.39+i*.057),w*.22,h*.046,0,0,Math.PI*2);c.fill();
 }
 const vignette=c.createRadialGradient(w*.5,h*.5,w*.1,w*.5,h*.5,w*.8);
 vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,4,6,.78)');
 c.fillStyle=vignette;c.fillRect(0,0,w,h);
}
export function renderMenuCinematic(canvas:HTMLCanvasElement,now:number,reducedMotion=false):void{
 const bounds=canvas.getBoundingClientRect();
 const w=Math.max(10,bounds.width),h=Math.max(10,bounds.height);
 if(w<30||h<30)return;
 const density=Math.min(2,window.devicePixelRatio||1);
 const pw=Math.round(w*density),ph=Math.round(h*density);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
 const c=canvas.getContext('2d');if(!c)return;
 c.setTransform(density,0,0,density,0,0);
 const elapsed=reducedMotion?4400:now;
 const cycle=Math.floor(elapsed/cycleDuration),time=elapsed%cycleDuration;
 const t=time/1000,fight=cycle%2===0;
 sceneBackground(c,w,h,time);
 const tile=Math.max(28,Math.min(64,h*.28,w*.11));
 const view:View={tile,ox:0,oy:0,width:w,height:h,minX:-10,maxX:Math.ceil(w/tile)+10,minY:-5,maxY:Math.ceil(h/tile)+5};
 const drawn:{x:number;y:number;type:SpriteKind;down:boolean;alpha:number;phase:number;scale:number}[]=[];
 for(let i=0;i<zombies.length;i++){
  const x=w*(-.20+i*.15)+time*(i===1?.016:.012+i*.0007);
  const y=h*(.53+(i%3)*.12);
  let down=false,alpha=1;
  if(fight&&time>7600+i*390&&i<3){down=true;alpha=clamp(1-(time-(7600+i*390))/3700)}
  // Zombies keep shuffling across the floor until hit or leaving the scene.
  if(x<-tile||x>w+tile||alpha<=.01)continue;
  drawn.push({x,y,type:zombies[i],down,alpha,phase:time/190+i,scale:i===3?1.16:i===1?.82:1});
 }
 drawn.sort((a,b)=>a.y-b.y);
 for(const z of drawn){
  c.save();c.globalAlpha=z.alpha;
  drawSprite(c,z.type,view,z.x/tile,z.y/tile,{angle:0,scale:z.scale,down:z.down,alpha:z.alpha,stride:z.phase,motionSpeed:z.down?0:1.25,idleTime:time/1000});
  c.restore();
 }
 const enter=ease((time-2700)/2300);
 const retreat=ease((time-8300)/2600);
 let px=mix(w+tile,w*.72,enter),py=h*.63;
 if(fight){px=mix(px,w*.85,ease((time-9000)/3000))}
 else {px=mix(px,w+tile,ease((time-6400)/1800));py-=h*.04*retreat}
 if(time>1900&&px<w+tile){
  const shooting=fight&&time>=5700&&time<9700;
  const angle= fight?Math.PI:0;
  drawSprite(c,'rifleman',view,px/tile,py/tile,{angle,weapon:'assault',scale:1.18,stride:time/125,motionSpeed:shooting?.22:2.0,idleTime:time/1000});
  if(shooting){
   const flash=.5+.5*Math.sin(time*.037);
   c.save();
   c.strokeStyle='rgba(255,220,139,'+flash+')';c.lineWidth=2;
   c.beginPath();c.moveTo(px-tile*.39,py-tile*.08);c.lineTo(px-tile*(.69+.18*flash),py-tile*.09);c.stroke();
   c.fillStyle='rgba(255,212,122,'+flash+')';c.beginPath();c.arc(px-tile*.58,py-tile*.09,Math.max(2,tile*.095*flash),0,Math.PI*2);c.fill();
   c.restore();
  }
 }
 // This text is scenic and never overlaps the interactive menu buttons.
 c.font='bold '+Math.max(9,Math.min(12,h*.036))+'px system-ui';
 c.letterSpacing='1.3px';c.fillStyle='rgba(192,223,204,.54)';
 c.fillText(fight?'SURVIVOR CONTACT // LIVE FEED':'MULTIPLE HOSTILES // FALL BACK',Math.max(12,w*.055),h*.94);
}

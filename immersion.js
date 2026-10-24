'use strict';
// Physical hiding, room interactions and bounded, floor-aware hunter tracks.
(() => {
const W=window.ISLAND_WORLD,objects=[],closets=[],doors=[],drawers=[],tracks=[];
let hidden=null,trackRevision=0,trackClock=0,trackDirty=false,lastTrackBuild=-1,trackGeometry=null;
const meshParts=new Map();
function record(g,kind,building,level,start,x=null,z=null){let candidates=objects.filter(o=>o.kind===kind&&o.building===building&&o.level===level),o=x===null?candidates[0]:candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-z)-Math.hypot(b.x-x,b.y-z))[0];if(!o)return;const old=meshParts.get(o.id),data=new Float32Array((old?.length||0)+g.data.length-start);if(old)data.set(old);data.set(g.data.slice(start),old?.length||0);meshParts.set(o.id,data);}
const lastSteps=new Map(),wood=[.25,.16,.095],dark=[.09,.055,.031],blood=[.31,.012,.008];
const add=(kind,x,z,feet,level,building,extra={})=>{const o={id:'room-'+objects.length,kind,x,y:z,feet,level,building,sceneObject:true,...extra};objects.push(o);return o;};
for(const b of W.buildings){
 const [x,z]=b.center,floors=b.stairs?.floors||1;
 for(let level=0;level<floors;level++){
  const feet=b.base+.07+level*3.2,cz=z-(level?2.7:1.5);
  const c=add('closet',x+2,cz,feet,level,b.id,{name:'Wardrobe',width:1.7,depth:1.4,open:false,angle:0,witnesses:[],forced:0});closets.push(c);
  drawers.push(add('drawer',x-2,z-2,feet,level,b.id,{name:'Bedside drawers',open:false,slide:0}));
  add('bed',x+1.8,z+(level?2:2.5),feet,level,b.id,{name:b.tags.building==='shed'?'Storage crates':'Bed',searched:false});
  add('desk',x+(level?-.8:-2),z+(level?3:1),feet,level,b.id,{name:'Desk',searched:false});
  add('mirror',x+(level?-.8:-2),z+(level?3.1:1.05),feet,level,b.id,{name:'Mirror'});
  const noteX=b.doorEdge===0?b.bounds.maxX-1.5:x-2;
  add('blood-note',noteX,b.bounds.minZ+.26,feet,level,b.id,{name:'Bloodstained warning'});
  add('blood-trail',x-.3,z-.8,feet,level,b.id,{name:'Blood trail',endX:noteX,endZ:b.bounds.minZ+.8});
 }
 const a=b.points[b.doorEdge],q=b.points[b.doorEdge+1],length=Math.hypot(q[0]-a[0],q[1]-a[1]),ux=(q[0]-a[0])/length,uz=(q[1]-a[1])/length;
 const cx=(a[0]+q[0])/2,cz=(a[1]+q[1])/2,width=b.doorWidth;
 doors.push(add('door',cx,cz,b.base+.07,0,b.id,{name:'House doors',width,ux,uz,open:true,angle:Math.PI*.48}));
 for(let i=0;i<b.points.length-1;i++){
  const a=b.points[i],q=b.points[i+1],len=Math.hypot(q[0]-a[0],q[1]-a[1]);
  for(let d=2.8;d<len-1;d+=4.6){if(i===b.doorEdge&&Math.abs(d-len/2)<width/2+1)continue;
   for(let level=0;level<floors;level++)add('window',a[0]+(q[0]-a[0])*d/len,a[1]+(q[1]-a[1])*d/len,b.base+.07+level*3.2,level,b.id,{name:'Boarded window'});
  }
 }
}
for(const o of W.props)add('scenery',o.x,o.y,W.heightAt(o.x,o.y),0,null,{name:o.kind==='palm'?'Palm trunk':'Brush',description:'The leaves scrape against each other. Something could be standing just beyond them.'});
const layout=W.data.layout||{};
for(let i=0;i<3;i++)add('tank',(layout.tanks?.[0]??596)+i*5,layout.tanks?.[1]??369,W.heightAt((layout.tanks?.[0]??596)+i*5,layout.tanks?.[1]??369),0,null,{name:'Water tank'});
for(let i=0;i<12;i++){let x=(layout.solar?.[0]??601)+i%4*4,z=(layout.solar?.[1]??390)+Math.floor(i/4)*3;add('panel',x,z,W.heightAt(x,z),0,null,{name:'Solar panel'});}
for(const [x,z]of layout.containers||[])add('container',x,z,W.heightAt(x,z),0,null,{name:'Sealed container'});
for(const [x,z]of layout.lamps||[])add('lamp',x,z,W.heightAt(x,z),0,null,{name:'Road lamp',on:false});
if(layout.tower)add('radio',...layout.tower,W.heightAt(...layout.tower),0,null,{name:'Radio mast'});

function segmentDistance(x,z,a,b){let dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
function doorSegments(o){
 if(o.kind==='closet'){const a=[o.x-.78,o.y+.64],angle=-o.angle;return[[a,[a[0]+Math.cos(angle)*1.56,a[1]+Math.sin(angle)*1.56]]];}
 const out=[];for(const side of[-1,1]){const hinge=[o.x+o.ux*o.width/2*side,o.y+o.uz*o.width/2*side],a=Math.atan2(-o.uz*side,-o.ux*side)+o.angle*side;out.push([hinge,[hinge[0]+Math.cos(a)*o.width/2,hinge[1]+Math.sin(a)*o.width/2]]);}return out;
}
function shells(c){return[[[c.x-.8,c.y-.65],[c.x+.8,c.y-.65]],[[c.x-.8,c.y-.65],[c.x-.8,c.y+.65]],[[c.x+.8,c.y-.65],[c.x+.8,c.y+.65]],...doorSegments(c)];}
function clear(entity,x,z,r){const feet=entity.feet??W.heightAt(x,z);for(const o of [...closets,...doors]){if(Math.abs(feet-o.feet)>.6||Math.hypot(x-o.x,z-o.y)>o.width+2)continue;for(const [a,b]of o.kind==='closet'?shells(o):doorSegments(o))if(segmentDistance(x,z,a,b)<r+.055)return false;}return true;}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function visible(ax,az,bx,bz,feet){const a=[ax,az],b=[bx,bz];for(const o of [...closets,...doors]){if(feet<o.feet-.2||feet>o.feet+2.3)continue;for(const [c,d]of o.kind==='closet'?shells(o):doorSegments(o))if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;}return true;}
function visible3D(ax,az,bx,bz,ay,by){const dx=bx-ax,dz=bz-az;for(const o of [...closets,...doors])for(const [c,d]of o.kind==='closet'?shells(o):doorSegments(o)){const ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-8)continue;const t=((c[0]-ax)*ez-(c[1]-az)*ex)/den,u=((c[0]-ax)*dz-(c[1]-az)*dx)/den,y=ay+(by-ay)*t;if(t>0&&t<1&&u>=0&&u<=1&&y>=o.feet&&y<o.feet+2.3)return false;}return true;}
function nearest(p,angle){if(hidden)return{...hidden,hint:'[E] Leave wardrobe · stay still and listen'};let best=null,dist=2.15;for(const o of objects){if(Math.abs(p.feet-o.feet)>1.4||o.kind==='closet'&&(p.y<o.y+.72||Math.abs(p.x-o.x)>1.15))continue;const d=Math.hypot(p.x-o.x,p.y-o.y),a=Math.atan2(Math.sin(Math.atan2(o.y-p.y,o.x-p.x)-angle),Math.cos(Math.atan2(o.y-p.y,o.x-p.x)-angle));if(d<dist&&(d<.45||Math.abs(a)<.85)&&W.visible(p.x,p.y,o.x,o.y)){best=o;dist=d;}}if(best)best.hint=hint(best);return best;}
function hint(o){return '[E] '+(o.kind==='closet'?(o.open?'Hide inside · [Q] Close wardrobe':'Open wardrobe'):o.kind==='drawer'?(o.open?'Close drawers':'Open and search drawers'):o.kind==='door'?(o.open?'Close house doors':'Open house doors'):o.kind==='blood-note'?'Read bloodstained warning':o.kind==='lamp'?(o.on?'Switch lamp off':'Test lamp switch'):o.kind==='bed'?'Search beneath '+o.name.toLowerCase():o.kind==='desk'?'Search desk':o.kind==='mirror'?'Touch mirror':o.kind==='window'?'Check window':'Inspect '+o.name.toLowerCase());}
function reset(){hidden=null;tracks.length=0;lastSteps.clear();trackClock=0;trackDirty=false;trackRevision++;for(const c of closets){c.open=false;c.angle=0;c.witnesses=[];c.forced=0;}for(const d of doors){d.open=true;d.angle=Math.PI*.48;}for(const d of drawers){d.open=false;d.slide=0;}for(const o of objects){o.searched=false;if(o.kind==='lamp')o.on=false;}}
function interact(o,ctx,secondary=false){const {p,toast,noise,sound,read,enemies}=ctx;
 if(hidden&&o.id===hidden.id){const c=hidden,exit={x:c.x,y:c.y+1.43};if(!W.clear(exit.x,exit.y,.29)||!clear({...p,feet:c.feet},exit.x,exit.y,.29)){toast('The way out is blocked.');return true;}c.open=true;c.braced=false;c.angle=1.65;Object.assign(p,exit,{hidden:null,feet:c.feet,level:c.level,building:c.building,a:Math.PI/2,pitch:-.06});hidden=null;noise(7);sound(130,.22,.11,'triangle',38);toast('You step out of the wardrobe.');return true;}
 if(o.kind==='closet'){
  if(p.y<o.y+.72||Math.abs(p.x-o.x)>1.15){toast('Reach the wardrobe from the front.');return true;}
  if(!o.open||secondary){o.open=!o.open;sound(145,.3,.13,'sawtooth',45);noise(8);return true;}
  if(o.angle<1){toast('Wait for the door to open.');return true;}
  o.witnesses=enemies.filter(e=>e.ai?.seen&&Math.hypot(e.x-p.x,e.y-p.y)<35&&W.visible(e.x,e.y,p.x,p.y));
  Object.assign(p,{x:o.x,y:o.y-.08,feet:o.feet,level:o.level,building:o.building,a:Math.PI/2,pitch:0,hidden:o.id});hidden=o;o.open=false;o.angle=0;o.forced=0;ctx.lightOff();noise(5);sound(100,.25,.15,'triangle',32);toast(o.witnesses.length?'He saw you get in. This door will not save you.':'Inside the wardrobe. Keep still. [E] Leave.',5);return true;
 }
 if(o.kind==='door'||o.kind==='drawer'){o.open=!o.open;noise(o.kind==='door'?13:8);sound(o.kind==='door'?100:190,.3,.16,'triangle',35);const found=o.kind==='drawer'&&o.open?ctx.search?.(o):null;toast(found||(o.kind==='drawer'?(o.open?'The drawer scrapes open. A button, a broken comb and old dust.':'You push the drawers shut.'):(o.open?'The doors creak open.':'Doors closed. Hunters can force them open.')));return true;}
 if(o.kind==='blood-note'){noise(2);read();return true;}
 if(o.kind==='lamp'){o.on=!o.on;noise(4);sound(210,.08,.08,'square',80);toast(o.on?'The switch clicks. The bulb is dead.':'You switch it off.');return true;}
 o.searched=true;noise(o.kind==='container'||o.kind==='window'?16:5);sound(o.kind==='mirror'?800:120,.16,.12,'triangle',55);
 const messages={bed:'Underneath: a single shoe and fingernail scratches leading toward the wardrobe.',desk:'You search the desk. Damp receipts, a snapped pencil. Someone carved “DO NOT ANSWER” into the wood.',mirror:'The glass is cold. For a moment, the tapping comes from the other side.',window:'You tug the boards. Nailed shut. The knock echoes outside.',tank:'You tap the tank. Something taps back, once.',panel:'The wiring has been cut. This cannot power the boat.',container:'Locked from the outside. You hear a soft scrape from within.',radio:'Only static. Then a breath that stops when you let go.', 'blood-trail':'The blood is still wet. The trail leads to the warning and the wardrobe.'};
 toast(ctx.search?.(o)||messages[o.kind]||o.description||'Nothing you can carry. Keep moving.',5);
 if(o.kind==='mirror'||o.kind==='container')ctx.rustle(p.x-Math.cos(p.a)*3,p.y-Math.sin(p.a)*3,.6);
 return true;
}
function update(dt,ctx){
 for(const o of [...closets,...doors]){const target=o.open?(o.kind==='closet'?1.65:Math.PI*.48):0;o.angle+=Math.sign(target-o.angle)*Math.min(Math.abs(target-o.angle),dt*3.8);}
 for(const d of drawers){const target=d.open?.43:0;d.slide+=Math.sign(target-d.slide)*Math.min(Math.abs(target-d.slide),dt*1.4);}
 // Hunters open passage doors; a witnessed hiding place remains a remembered target.
 for(const d of doors)if(!d.open&&ctx.enemies.some(e=>Math.abs((e.feet??0)-d.feet)<1&&Math.hypot(e.x-d.x,e.y-d.y)<2.3)){d.open=true;ctx.sound(75,.5,.22,'sawtooth',30,d.x,d.y);}
 if(hidden&&!ctx.skipHidden){const c=hidden;ctx.p.x=c.x;ctx.p.y=c.y-.08;ctx.p.feet=c.feet;ctx.p.pitch=Math.max(-.65,Math.min(.65,ctx.p.pitch));
  if(!c.open&&c.witnesses.some(e=>Math.hypot(e.x-c.x,e.y-c.y)<3&&Math.abs((e.feet??0)-c.feet)<1)){c.forced+=dt;if(c.forced>(c.braced?5.6:1.6)){c.open=true;ctx.p.hidden=null;for(const e of c.witnesses){if(e.ai){e.ai.memory={x:c.x,y:c.y-.08,feet:c.feet,level:c.level,building:c.building,at:ctx.elapsed,source:'witnessed-wardrobe'};e.ai.forcedHide=c.id;}e.state='chase';}ctx.toast('The wardrobe handle turns. He knows.',4);}}
 }
 trackClock+=dt;let changed=false;
 for(const e of ctx.enemies){if(e.kind==='shadow')continue;const old=lastSteps.get(e),feet=e.feet??W.heightAt(e.x,e.y);if(!old){lastSteps.set(e,{x:e.x,y:e.y,side:1});continue;}
  const d=Math.hypot(e.x-old.x,e.y-old.y);if(d>5){lastSteps.set(e,{x:e.x,y:e.y,side:1});continue;}if(d<.85)continue;
  const a=Math.atan2(e.y-old.y,e.x-old.x),side=-old.side;tracks.push({x:e.x-Math.sin(a)*side*.13,y:e.y+Math.cos(a)*side*.13,feet:feet+.018,a,at:ctx.elapsed,kind:e.kind});lastSteps.set(e,{x:e.x,y:e.y,side});changed=true;
 }
 while(tracks.length>128||tracks.length&&ctx.elapsed-tracks[0].at>100){tracks.shift();changed=true;}
 if(changed)trackDirty=true;if(trackDirty&&trackClock>=.25){trackRevision++;trackDirty=false;trackClock=0;}
}
const letters={B:[[0,0,0,1],[0,1,.7,1],[.7,1,1,.8],[1,.8,.7,.55],[.7,.55,0,.55],[.7,.55,1,.25],[1,.25,.7,0],[.7,0,0,0]],E:[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]],H:[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],I:[[0,1,1,1],[.5,1,.5,0],[0,0,1,0]],N:[[0,0,0,1],[0,1,1,0],[1,0,1,1]],D:[[0,0,0,1],[0,1,.6,1],[.6,1,1,.75],[1,.75,1,.25],[1,.25,.6,0],[.6,0,0,0]],Y:[[0,1,.5,.5],[1,1,.5,.5],[.5,.5,.5,0]],O:[[0,.2,0,.8],[0,.8,.2,1],[.2,1,.8,1],[.8,1,1,.8],[1,.8,1,.2],[1,.2,.8,0],[.8,0,.2,0],[.2,0,0,.2]],U:[[0,1,0,.2],[0,.2,.2,0],[.2,0,.8,0],[.8,0,1,.2],[1,.2,1,1]]};
function text(g,word,x,y,z,size){for(let i=0;i<word.length;i++)for(const [ax,ay,bx,by]of letters[word[i]]||[]){const x0=x+(i*1.35+ax)*size,y0=y+ay*size,x1=x+(i*1.35+bx)*size,y1=y+by*size,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),nx=-dy/len*.009,ny=dx/len*.009;g.quad([x0+nx,y0+ny,z],[x1+nx,y1+ny,z],[x1-nx,y1-ny,z],[x0-nx,y0-ny,z],blood,6);}}
function decorate(g){
 for(const c of closets){let start=g.data.length,x=c.x,z=c.y,h=c.feet;g.box(x-.8,h+1.15,z,.1,2.3,1.4,wood,3);g.box(x+.8,h+1.15,z,.1,2.3,1.4,wood,3);g.box(x,h+1.15,z-.65,1.6,2.3,.1,wood,3);for(const y of[.04,2.26])g.box(x,h+y,z,1.6,.08,1.4,wood,3);g.box(x,h+1.98,z,1.5,.05,1.3,dark,3);g.beam([x-.6,h+1.83,z],[x+.6,h+1.83,z],.018,.018,[.28,.29,.26],6);for(let i=0;i<3;i++){g.box(x-.4+i*.4,h+1.31,z-.3,.28,.75,.16,[.14+i*.02,.14,.12]);g.beam([x-.4+i*.4,h+1.78,z-.3],[x-.4+i*.4,h+1.68,z-.3],.015,.015,[.28,.29,.26],4);}record(g,'closet',c.building,c.level,start); }
 for(const d of drawers){let start=g.data.length,x=d.x,z=d.y,h=d.feet;g.box(x,h+.5,z-.29,1.4,1,.08,wood,3);for(const s of[-1,1])g.box(x+s*.68,h+.5,z,.08,1,.65,wood,3);for(const y of[.04,.97])g.box(x,h+y,z,1.4,.08,.65,wood,3);record(g,'drawer',d.building,d.level,start);}
 for(const n of objects.filter(o=>o.kind==='blood-note')){const start=g.data.length,h=n.feet+1.55,z=n.y;g.box(n.x,h,z,1.43,.94,.055,[.69,.61,.42]);if(!window.ISLAND_COMFORT?.plain){text(g,'BEHIND',n.x-.60,h+.07,z+.031,.15);text(g,'YOU',n.x-.30,h-.25,z+.032,.16);for(let j=0;j<7;j++)g.box(n.x-.55+j*.16,h-.25-j%3*.08,z+.034,.014,.16+j%3*.12,.005,blood,6);}else for(let j=0;j<4;j++)g.box(n.x-.1,h+.2-j*.12,z+.032,.8-j*.08,.018,.004,[.16,.17,.14]);record(g,'blood-note',n.building,n.level,start);}
 for(const t of objects.filter(o=>o.kind==='blood-trail')){const start=g.data.length;for(let i=0;i<28;i++){let q=i/27,x=t.x+(t.endX-t.x)*q+Math.sin(q*7)*.25,z=t.y+(t.endZ-t.y)*q;g.box(x,t.feet+.012,z,.035+(i%4)*.024,.008,.07+(i%3)*.025,blood,6);}record(g,'blood-trail',t.building,t.level,start);}
}
const geometryCache=new Map();
function geometry(G,key,width){if(geometryCache.has(key))return geometryCache.get(key);const g=new G();if(key==='closet-door'){g.box(.78,1.15,0,1.56,2.22,.075,wood,3);g.box(1.39,1.05,.065,.045,.22,.055,[.37,.32,.19]);for(const y of[.35,.8,1.6,1.96])g.box(.78,y,.045,1.31,.025,.025,dark,3);}else if(key.startsWith('house-door')){g.box(width/2,1.29,0,width,2.58,.10,wood,3);g.box(width-.16,1.2,.08,.04,.24,.06,[.37,.32,.19]);for(const y of[.6,1.85])g.box(width/2,y,.06,width-.22,.8,.025,dark,3);}else{g.box(0,.58,0,1.22,.55,.57,wood,3);g.box(0,.58,.32,1.29,.58,.06,wood,3);g.box(0,.59,.39,.24,.035,.05,[.37,.32,.19]);g.box(0,.88,0,.8,.02,.3,[.11,.085,.06]);}const data=new Float32Array(g.data);geometryCache.set(key,data);return data;}
function model(x,y,z,a=0){return{x,y,z,ca:Math.cos(a),sa:Math.sin(a)};}
function draws(G,camera,reach){const result=[];for(const o of [...closets,...doors,...drawers]){if(Math.hypot(o.x-camera.x,o.y-camera.y)>reach+4||Math.abs(o.feet-camera.height)>13)continue;
 if(o.kind==='closet')result.push({id:o.id,key:'closet-door',data:geometry(G,'closet-door'),model:model(o.x-.78,o.feet,o.y+.64,o.angle)});
 else if(o.kind==='door')for(const [i,[a,b]]of doorSegments(o).entries()){const angle=-Math.atan2(b[1]-a[1],b[0]-a[0]),key='house-door-'+o.width;result.push({id:o.id,key,data:geometry(G,key,o.width/2),model:model(a[0],o.feet,a[1],angle)});}
 else result.push({id:o.id,key:'drawer',data:geometry(G,'drawer'),model:model(o.x,o.feet,o.y+o.slide)});
 }return result;}
function trackMesh(G){if(lastTrackBuild===trackRevision&&trackGeometry)return trackGeometry;const g=new G();for(const t of tracks){const ca=Math.cos(t.a),sa=Math.sin(t.a),point=(x,z)=>[t.x+ca*x-sa*z,t.feet,t.y+sa*x+ca*z];const patch=(x,z,w,d)=>g.quad(point(x-w/2,z-d/2),point(x-w/2,z+d/2),point(x+w/2,z+d/2),point(x+w/2,z-d/2),[.15,.055,.033],6);if(t.kind==='hawking'){for(let j=0;j<5;j++)for(const s of[-1,1])patch((j-2)*.075,s*.39,.04,.075);}else{patch(-.10,0,.10,.13);patch(.065,0,.18,.15);for(let i=0;i<3;i++)patch(.02+i*.05,0,.012,.17);}}
 lastTrackBuild=trackRevision;trackGeometry=new Float32Array(g.data);return trackGeometry;}
function snapshot(){return{hidden:hidden?.id||null,objects:objects.filter(o=>['closet','door','drawer'].includes(o.kind)||o.searched||o.on).map(o=>({id:o.id,open:!!o.open,angle:o.angle||0,slide:o.slide||0,searched:!!o.searched,on:!!o.on,braced:!!o.braced,forced:o.forced||0,witnesses:(o.witnesses||[]).map(e=>e.kind)})),tracks:tracks.map(t=>({...t}))};}
function restore(s,enemies){reset();for(const q of s.objects){const o=objects.find(o=>o.id===q.id);Object.assign(o,{...q,witnesses:q.witnesses.map(kind=>enemies.find(e=>e.kind===kind)).filter(Boolean)});}hidden=closets.find(c=>c.id===s.hidden)||null;tracks.push(...s.tracks.map(t=>({...t})));trackDirty=true;trackRevision++;}
window.ISLAND_IMMERSION={objects,closets,doors,drawers,tracks,reset,snapshot,restore,clear,visible,visible3D,nearest,hint,record,meshParts,interact,update,decorate,draws,trackMesh,get revision(){return trackRevision;},setHidden(id){hidden=closets.find(c=>c.id===id)||null;},get hidden(){return hidden;},get diagnostics(){return{interactables:objects.length,closets:closets.length,hidden:hidden?.id||null,tracks:tracks.length};}};
})();

'use strict';
// Perception, remembered clues and bounded navigation shared by every pursuer.
(() => {
const profiles={
 epstein:{sight:18,walkHearing:12,runHearing:28,crouchHearing:2.5,speed:4.5,patrolSpeed:2.4,searchSpeed:2.8,grace:30,searchState:'search',searchTime:20,phase:0,closeSoundRush:10},
 hawking:{sight:16,walkHearing:90,runHearing:125,crouchHearing:5,speed:4.05,patrolSpeed:1.95,searchSpeed:3.1,grace:45,searchState:'investigate',searchTime:24,phase:6},
 trump:{sight:18,walkHearing:58,runHearing:100,crouchHearing:5,speed:4.4,patrolSpeed:2.15,searchSpeed:3.3,grace:45,searchState:'investigate',searchTime:22,phase:1},
 diddy:{sight:20,walkHearing:36,runHearing:85,crouchHearing:4,breathHearing:18,speed:4.65,patrolSpeed:2.8,searchSpeed:3.5,grace:75,searchState:'investigate',searchTime:22,phase:5,attackOnSound:true}
};
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Eye-height ray against walls, floor slabs and the actual stair opening.
function visible3D(W,e,p,crouch=false){
 const ay=(e.feet??W.heightAt(e.x,e.y))+(e.kind==='hawking'?1.22:1.65),by=(p.feet??W.heightAt(p.x,p.y))+(crouch?1:1.6),dx=p.x-e.x,dz=p.y-e.y;
 if(!W.walls)return W.visible(e.x,e.y,p.x,p.y);
 for(const w of W.walls){const ex=w.b[0]-w.a[0],ez=w.b[1]-w.a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-8)continue;const t=((w.a[0]-e.x)*ez-(w.a[1]-e.y)*ex)/den,u=((w.a[0]-e.x)*dz-(w.a[1]-e.y)*dx)/den,y=ay+(by-ay)*t;if(t>0&&t<1&&u>=0&&u<=1&&y>w.base&&y<w.base+w.height)return false;}
 for(const b of W.buildings){for(let level=1;level<(b.stairs?.floors||1);level++){const plane=b.base+level*3.2,t=(plane-ay)/(by-ay);if(!(t>0&&t<1))continue;const x=e.x+dx*t,z=e.y+dz*t;if(!W.inside(x,z,b.points))continue;const hole=b.stairs.hole;if(!(x>hole.x0&&x<hole.x1&&z>hole.z0&&z<hole.z1))return false;}}
 const length=Math.hypot(dx,dz);for(let d=2;W.ground&&d<length;d+=2){const t=d/length;if(W.ground(e.x+dx*t,e.y+dz*t)>ay+(by-ay)*t-.08)return false;}
 const I=window.ISLAND_IMMERSION;return !I||(I.visible3D?I.visible3D(e.x,e.y,p.x,p.y,ay,by):I.visible(e.x,e.y,p.x,p.y,e.feet??W.heightAt(e.x,e.y)));
}
function create(W){
 let pathCalls=0;
 const copy=(p,age,source)=>({x:p.x,y:p.y,feet:p.feet??W.heightAt(p.x,p.y),level:p.level||0,building:p.building||null,a:p.a||0,at:age,source});
 function init(e){if(e.ai)return e.ai;const cfg=profiles[e.kind]||profiles.epstein;e.ai={memory:null,points:[],point:0,wait:0,nextSense:-Infinity,lastFlash:null,stuck:0,pathGoal:null,nextPath:0,patrolWait:0,phase:cfg.phase,seen:false,heard:false};e.path??=[];e.facing??=0;return e.ai;}
 function sense(e,ctx){
  const b=init(e),cfg=profiles[e.kind]||profiles.epstein,age=ctx.elapsed,d=Math.hypot(e.x-ctx.p.x,e.y-ctx.p.y);
  if(b.hideAbandon&&ctx.p.hidden===b.hideAbandon.id&&age<b.hideAbandon.until){b.seen=false;b.heard=false;b.light=false;return{seen:false,heard:false,d};}
  if(b.forcedHide&&window.ISLAND_IMMERSION?.hidden?.id===b.forcedHide){b.memory=copy(ctx.p,age,'witnessed-wardrobe');b.seen=false;b.heard=false;return{seen:false,heard:false,knownHide:true,d};}b.forcedHide=null;
  if(window.ISLAND_VISION){window.ISLAND_VISION.pose(e,ctx,Math.min(.05,Math.max(0,age-(b.poseAt??age-.05))));b.poseAt=age;}if(age<cfg.grace)return{seen:false,heard:false,d};
  if(!window.ISLAND_VISION&&age<b.nextSense&&b.lastFlash===ctx.flashlight&&b.lastMoving===ctx.moving&&b.lastRunning===ctx.running&&b.lastCrouch===ctx.crouch&&b.lastNoise===ctx.noise?.at&&b.lastHidden===ctx.p.hidden)return{seen:b.seen,heard:b.heard,d};
  b.nextSense=age+.12;b.lastFlash=ctx.flashlight;b.lastMoving=ctx.moving;b.lastRunning=ctx.running;b.lastCrouch=ctx.crouch;b.lastNoise=ctx.noise?.at;b.lastHidden=ctx.p.hidden;
  const feet=e.feet??W.heightAt(e.x,e.y),height=Math.abs(feet-(ctx.p.feet??W.heightAt(ctx.p.x,ctx.p.y)));
  const hearing=ctx.p.hidden?0:ctx.moving?(ctx.crouch?cfg.crouchHearing:ctx.running?cfg.runHearing:cfg.walkHearing):(cfg.breathHearing||0);
  const sameHouse=!!e.building&&e.building===ctx.p.building,relevant=d<Math.max(cfg.sight,hearing),clear=relevant&&visible3D(W,e,ctx.p,ctx.crouch),facing=Math.abs(angleDifference(Math.atan2(ctx.p.y-e.y,ctx.p.x-e.x),e.facing));
  const vision=window.ISLAND_VISION?.observe(e,ctx,cfg);b.seen=vision?vision.seen:!ctx.p.hidden&&!!ctx.flashlight&&Math.hypot(d,height)<cfg.sight&&clear&&(d<9||e.state==='chase'||facing<1.35);b.light=!!vision?.light;if(b.seen)b.visualAlert=true;
  const attenuation=clear?1:sameHouse?.9:.72,floorPenalty=height>2.2&&sameHouse?.85:1,roomHearing=sameHouse&&ctx.moving&&!ctx.crouch?Math.max(hearing,ctx.running?34:24):hearing,footstep=Math.hypot(d,height*.55)<roomHearing*attenuation*floorPenalty;
  const noise=ctx.noise&&age-ctx.noise.at>=0&&age-ctx.noise.at<1.5&&b.consumedNoise!==ctx.noise.at&&Math.hypot(e.x-ctx.noise.x,e.y-ctx.noise.y)<ctx.noise.radius*.8;
  b.heard=!!(footstep||noise);
  if(b.seen||b.heard||b.light){
   let source=b.seen?'sight':noise?'interaction':b.heard?'footsteps':'reflected-light',point=b.light&&!b.seen&&!b.heard?vision.point:noise&&!b.seen?{...ctx.p,x:ctx.noise.x,y:ctx.noise.y,level:ctx.noise.level??ctx.p.level,building:ctx.noise.building===undefined?ctx.p.building:ctx.noise.building,feet:ctx.noise.feet??ctx.p.feet}:ctx.p,old=b.memory,memory=copy(point,age,source);
   if(b.seen&&old?.source==='sight'&&age>old.at){let span=age-old.at;memory.vx=Math.max(-6.4,Math.min(6.4,(memory.x-old.x)/span));memory.vy=Math.max(-6.4,Math.min(6.4,(memory.y-old.y)/span));}
   b.memory=memory;if(!b.light||b.seen||b.heard){b.lookAt=[memory.x,memory.feet+1.5,memory.y];b.lookUntil=age+2.5;}if(noise)b.consumedNoise=ctx.noise.at;
  }
  return{seen:b.seen,heard:b.heard,light:b.light,d};
 }
 function stairGoal(e,target){
  const b=init(e),own=W.buildings.find(b=>b.id===e.building),goal=W.buildings.find(b=>b.id===target.building),feet=e.feet??W.heightAt(e.x,e.y);
  let house=null,desired=0;
  if(own?.stairs&&(e.level>0||feet>own.base+.3)&&(!goal||goal.id!==own.id)){house=own;desired=0;}
  else if(goal?.stairs&&(target.level>0||own?.id===goal.id)){house=goal;desired=target.level||0;}
  if(!house){b.stairRoute=[];return null;}
  const point=(x,y,level)=>({x,y,feet:house.base+.07+level*3.2,level,building:house.id});
  const rampAt=entity=>house.stairs.flights.find(f=>{const t=(entity.y-f.z0)/(f.z1-f.z0),h=house.base+.07+(f.from+t)*3.2;return t>0&&t<1&&Math.abs(entity.x-f.x)<house.stairs.width/2+.10&&Math.abs((entity.feet??W.heightAt(entity.x,entity.y))-h)<.3;});
  const ramp=own?.id===house.id?rampAt(e):null,targetRamp=goal?.id===house.id?rampAt(target):null;
  // Floor labels change halfway up a flight. Finish the physical ramp before
  // rebuilding a route for the player's new label; never step sideways off it.
  if(ramp&&feet>house.base+.07+ramp.from*3.2+.12&&feet<house.base+.07+ramp.to*3.2-.12){
   if(targetRamp===ramp)return{...target};
   const up=(target.feet??house.base+.07+desired*3.2)>feet,dir=Math.sign(ramp.z1-ramp.z0);return up?point(ramp.x,ramp.z1+dir*.85,ramp.to):point(ramp.x,ramp.z0-dir*.85,ramp.from);
  }
  const current=own?.id===house.id?Math.max(0,Math.round((feet-house.base-.07)/3.2)):0;
  if(targetRamp)desired=current<=targetRamp.from?targetRamp.from:targetRamp.to;
  const signature=house.id+':'+desired+':'+(targetRamp?'ramp-'+targetRamp.from:'floor');
  if(b.stairSignature===signature&&b.stairRoute?.length){if(b.stairRoute.at(-1).liveRamp)Object.assign(b.stairRoute.at(-1),target,{liveRamp:true});while(b.stairRoute.length&&Math.hypot(e.x-b.stairRoute[0].x,e.y-b.stairRoute[0].y)<.2&&Math.abs(feet-b.stairRoute[0].feet)<.5)b.stairRoute.shift();if(b.stairRoute.length)return b.stairRoute[0];}
  if(current===desired&&Math.abs(feet-house.base-.07-current*3.2)<.2&&!targetRamp){b.stairRoute=[];return null;}
  let route=[];
  // Overshoot each flight onto the landing before moving sideways to the next.
  if(desired>current)for(let level=current;level<desired;level++){let f=house.stairs.flights[level],dir=Math.sign(f.z1-f.z0);route.push(point(f.x,f.z0-dir*.85,level),point(f.x,f.z1+dir*.85,level+1));}
  else for(let level=Math.max(current,1)-1;level>=desired;level--){let f=house.stairs.flights[level],dir=Math.sign(f.z1-f.z0);route.push(point(f.x,f.z1+dir*.85,level+1),point(f.x,f.z0-dir*.85,level));}
  if(targetRamp){const dir=Math.sign(targetRamp.z1-targetRamp.z0);route.push(current<=targetRamp.from?point(targetRamp.x,targetRamp.z0-dir*.85,targetRamp.from):point(targetRamp.x,targetRamp.z1+dir*.85,targetRamp.to),{...target,liveRamp:true});}
  b.stairSignature=signature;b.stairRoute=route;return route[0]||null;
 }
 function corridor(ax,ay,bx,by,r,entity=null,endFeet=null){let length=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(length/.5)),sim=entity?{...entity}:null;for(let i=1;i<=n;i++){let x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(!W.clear(x,y,r))return false;if(sim){let next=window.HORROR_ARCHITECTURE.step(sim,x,y);if(!next)return false;Object.assign(sim,next,{x,y});}}return !sim||endFeet==null||Math.abs(sim.feet-endFeet)<.7;}
 function localPath(e,goal,r,age){
  const house=W.buildings.find(b=>b.id===e.building);if(!house?.stairs)return null;
  const b=init(e),key=goal.x.toFixed(2)+','+goal.y.toFixed(2)+','+(goal.feet??0).toFixed(1);
  if(b.localFailedKey===key&&age<b.localRetryAt)return null;
  if(b.localKey===key&&b.localPath?.length){while(b.localPath.length&&Math.hypot(e.x-b.localPath[0].x,e.y-b.localPath[0].y)<.2)b.localPath.shift();if(b.localPath.length)return b.localPath[0];}
  const hole=house.stairs.hole,level=e.level||0,feet=house.base+.07+level*3.2,nodes=[{...e},...[[hole.x0-.45,hole.z0-.55],[hole.x1+.45,hole.z0-.55],[hole.x0-.45,hole.z1+.55],[hole.x1+.45,hole.z1+.55]].map(([x,y])=>({x,y,feet,level,building:house.id})),{...goal}],cost=Array(6).fill(Infinity),parent=Array(6).fill(-1),visited=new Set();cost[0]=0;
  for(let step=0;step<6;step++){let u=-1;for(let i=0;i<6;i++)if(!visited.has(i)&&(u<0||cost[i]<cost[u]))u=i;if(u<0||!Number.isFinite(cost[u]))break;if(u===5)break;visited.add(u);for(let v=1;v<6;v++){if(visited.has(v))continue;let a=nodes[u],z=nodes[v],d=Math.hypot(z.x-a.x,z.y-a.y);if(cost[u]+d>=cost[v]||!corridor(a.x,a.y,z.x,z.y,r,a,z.feet))continue;cost[v]=cost[u]+d;parent[v]=u;}}
  if(parent[5]<0){b.localFailedKey=key;b.localRetryAt=age+1.2;return null;}b.localFailedKey=null;let route=[],at=5;while(at>0){route.unshift(nodes[at]);at=parent[at];}b.localKey=key;b.localPath=route;return route[0];
 }
 function navigate(e,target,dt,ctx,speed){
  if(!target)return;const b=init(e),age=ctx.elapsed,r=e.kind==='hawking'?.48:.38,stair=stairGoal(e,target),goal=stair?{...target,...stair}:target;
  let sameSpace=(!target.building&&!e.building||target.building===e.building)&&Math.abs((target.feet??W.heightAt(target.x,target.y))-(e.feet??W.heightAt(e.x,e.y)))<1.2;
  const eligible=stair&&!!e.building||sameSpace&&Math.hypot(goal.x-e.x,goal.y-e.y)<24;
  if(eligible&&(!b.corridor||age-b.corridor.at>.25||Math.hypot(goal.x-b.corridor.x,goal.y-b.corridor.y)>.6||Math.abs((goal.feet??0)-b.corridor.feet)>.4)){b.corridor={at:age,x:goal.x,y:goal.y,feet:goal.feet??0,clear:corridor(e.x,e.y,goal.x,goal.y,r,e.building?e:null,goal.feet)};}
  const direct=eligible&&b.corridor?.clear;
  const local=!direct&&e.building?localPath(e,goal,r,age):null;
  const changed=!b.pathGoal||Math.hypot(goal.x-b.pathGoal.x,goal.y-b.pathGoal.y)>2.5;
  if(!direct&&!local&&age>=b.nextPath&&(changed||!e.path.length||age>=b.pathExpires)){
   e.path=W.pathTo(e.x,e.y,goal.x,goal.y);pathCalls++;b.pathGoal={x:goal.x,y:goal.y};b.nextPath=age+(e.state==='chase'?.55:1.2);b.pathExpires=age+(e.state==='chase'?1.1:5.5);
   // Skip grid bends only when the entire wider NPC body can fit.
   while(e.path.length>1&&Math.hypot(e.path[1].x-e.x,e.path[1].y-e.y)<12&&corridor(e.x,e.y,e.path[1].x,e.path[1].y,r))e.path.shift();
  }
  e.repath=Math.max(0,b.nextPath-age);let dest=direct?goal:local||e.path[0];if(!dest)return;
  let dx=dest.x-e.x,dy=dest.y-e.y,d=Math.hypot(dx,dy);if(d<.18){if(!direct)e.path.shift();return;}
  let step=Math.min(d,speed*dt),angle=Math.atan2(dy,dx),x=e.x,y=e.y;e.facing+=angleDifference(angle,e.facing)*Math.min(1,dt*7);
  ctx.move(e,dx/d*step,dy/d*step,r);let travelled=Math.hypot(e.x-x,e.y-y);
  if(travelled<step*.15){b.stuck+=dt;for(let offset of [.55,-.55,1.05,-1.05]){let ax=Math.cos(angle+offset)*step,ay=Math.sin(angle+offset)*step;if(W.clear(e.x+ax,e.y+ay,r)){ctx.move(e,ax,ay,r);if(Math.hypot(e.x-x,e.y-y)>step*.3)break;}}}else b.stuck=0;
  if(b.stuck>.8){e.path=[];b.localPath=null;b.localKey=null;b.localRetryAt=0;b.corridor=null;b.nextPath=age+.15;b.pathExpires=0;b.stuck=0;b.recoveries=(b.recoveries||0)+1;}
  if(Math.hypot(e.x-x,e.y-y)>.0001){const old=e.facing;e.facing=Math.atan2(e.y-y,e.x-x);if(Number.isFinite(e.headYaw))e.headYaw=Math.max(-1.35,Math.min(1.35,angleDifference(old+e.headYaw,e.facing)));}
  if(!direct&&Math.hypot(e.x-dest.x,e.y-dest.y)<.25)e.path.shift();
 }
 function searchPoints(e){const b=init(e),m=b.memory;if(!m)return[];const building=W.buildings.find(b=>b.id===m.building),locate=p=>{if(!W.clear(p.x,p.y,.5)||building&&!W.inside(p.x,p.y,building.points))return null;const step=window.HORROR_ARCHITECTURE.step(m,p.x,p.y);return step&&(step.level||0)===(m.level||0)?{...m,...p,...step}:null;},points=[locate({x:m.x+(m.vx||0)*.65,y:m.y+(m.vy||0)*.65})||{...m}];
  for(let i=0;i<4;i++){let a=i*Math.PI/2+(b.phase*.7),point=locate(W.safePoint(m.x+Math.cos(a)*(4+i),m.y+Math.sin(a)*(4+i)));if(point)points.push(point);}return points;
 }
 function tick(e,ctx,dt){
  // A quiet, unwitnessed wardrobe has a finite search budget. Leave physically,
  // including via stairs, and ignore that hiding place briefly while departing.
  const hide=window.ISLAND_IMMERSION?.hidden,b0=init(e),age0=ctx.elapsed;
  if(hide&&!hide.witnesses.includes(e)){
   if(b0.closetVisit?.id!==hide.id)b0.closetVisit={id:hide.id,time:0};
   if(Math.hypot(e.x-hide.x,e.y-hide.y)<11&&Math.abs((e.feet??0)-hide.feet)<4)b0.closetVisit.time+=dt;
   if(b0.closetVisit.time>=5&&!b0.hideAbandon){const point=W.patrol.reduce((a,q)=>Math.hypot(q.x-hide.x,q.y-hide.y)>Math.hypot(a.x-hide.x,a.y-hide.y)?q:a,W.patrol[0]);b0.hideAbandon={id:hide.id,until:age0+18,target:{...point,level:0,building:null}};b0.memory=null;b0.points=[];b0.visualAlert=false;b0.lookAt=null;b0.forcedHide=null;e.encounter=null;e.path=[];b0.nextPath=0;}
   if(b0.hideAbandon?.id===hide.id&&age0<b0.hideAbandon.until){b0.seen=false;b0.heard=false;b0.light=false;e.state='patrol';navigate(e,b0.hideAbandon.target,dt,ctx,(profiles[e.kind]||profiles.epstein).patrolSpeed);return{seen:false,heard:false,leavingCloset:true};}
  }else{b0.closetVisit=null;b0.hideAbandon=null;}
  const cfg=profiles[e.kind]||profiles.epstein,b=init(e),age=ctx.elapsed,old=e.state,observation=sense(e,ctx);if(window.ISLAND_ENCOUNTERS?.update(e,ctx,dt))return{...observation,changed:old!==e.state,windup:true};if(e.encounter?.phase==='blitz'&&age<e.encounter.until)observation.seen=true;
  if(observation.knownHide){e.state='chase';e.search=cfg.searchTime;b.points=[];b.wait=0;}
  else if(observation.seen||observation.heard||observation.light){e.state=observation.seen||cfg.attackOnSound||cfg.closeSoundRush&&ctx.running&&observation.d<cfg.closeSoundRush?'chase':cfg.searchState;e.search=cfg.searchTime;if(b.lastAppliedAt!==b.memory.at){b.points=[];b.point=0;b.wait=0;b.lastAppliedAt=b.memory.at;}e.lastX=b.memory.x;e.lastY=b.memory.y;e.heardX=b.memory.x;e.heardY=b.memory.y;}
  else if(e.state==='chase'){e.state=cfg.searchState;e.search=cfg.searchTime;b.points=searchPoints(e);b.point=0;b.nextPath=0;}
  if(e.state===cfg.searchState){e.search-=dt;if(!b.memory&&Number.isFinite(e.lastX))b.memory={x:e.lastX,y:e.lastY,level:0,building:null,at:age,source:'interaction'};if(!b.points.length)b.points=searchPoints(e);if(e.search<=0||!b.memory){e.state='patrol';b.memory=null;b.visualAlert=false;b.points=[];b.patrolWait=0;b.nextPath=0;}}
  if(e.state==='chase'){navigate(e,b.memory,dt,ctx,cfg.speed*(b.visualAlert?1.7:1));}
  else if(e.state===cfg.searchState){
   let target=b.points[b.point%b.points.length]||b.memory;
   if(target&&Math.hypot(e.x-target.x,e.y-target.y)<.24&&Math.abs((e.feet??W.heightAt(e.x,e.y))-(target.feet??W.heightAt(target.x,target.y)))<.4){if(!b.wait)b.wait=age+1.1;e.facing+=dt*.7;if(age>=b.wait){b.point++;b.wait=0;b.nextPath=0;}}else navigate(e,target,dt,ctx,cfg.searchSpeed);
  }else{
   e.state='patrol';const route=W.patrol,index=((e.target||0)+cfg.phase)%route.length,target=route[index];
   if(Math.hypot(e.x-target.x,e.y-target.y)<1.4){if(!b.patrolWait)b.patrolWait=age+1.7+(cfg.phase%3)*.5;e.facing+=dt*.45;if(age>=b.patrolWait){e.target=(e.target||0)+1;b.patrolWait=0;b.nextPath=0;}}
   else navigate(e,{...target,level:0,building:null},dt,ctx,cfg.patrolSpeed);
  }
  return{...observation,changed:old!==e.state};
 }
 return{tick,sense,navigate,init,stairGoal,copy,profiles,get pathCalls(){return pathCalls;}};
}
window.ISLAND_NPC_AI={create,profiles,visible3D};
})();

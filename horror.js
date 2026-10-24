'use strict';
(() => {
const names={hawking:'Stephen Hawking apparition',trump:'Donald Trump apparition',diddy:'P. Diddy apparition'};
const stories=[
['Mara · first landing','We counted six houses from the shore. There are more than six now. Jonas says the map is old. The houses behind us were not there when we arrived.'],
['Jonas · upstairs','The footsteps climbed the stairs after me. I hid in the wardrobe. They crossed the room, stopped outside it, then continued above my head. This house only has two floors.'],
['Inez · recorder transcript','I stopped walking. The steps behind me stopped one beat later. I tried again. Same delay. Then something started walking in front of me.'],
['Mara · the listening rooms','The two figures by the empty houses turn toward every sound. Running brings them faster. Crouching buys time. Even when the light is out, they remember the last noise.'],
['Jonas · the window','The man outside the window did not move for an hour. When I looked away he changed windows. When I watched him directly, he stepped back into the trees.'],
['Inez · batteries','I left my backpack beside the bed and followed the knocking. There was no door at the end of that corridor. I can still hear my backpack radio from inside the wall.'],
['Mara · not a rescue','Someone called from the other house. It sounded like Jonas, but his recorder was in my hand. The figure under the porch never spoke again.'],
['Jonas · last page','I thought the watcher wanted me to see him. Now I think he was counting how many times I turned around. The knocks, the footsteps, the face at the window: all the same patient thing.'],
['Inez · dawn that never came','Mara went quiet in the upstairs room. We covered her and left the water beside the bed. I promised to come back with the boat key. I am still writing that promise.'],
['Unsent message','If you find our things, do not follow the running footsteps. Find the fuse. Restore the generator. Take the key and fuel. Leave before the watching becomes something else.']];
function addStories(W){let houses=W.buildings.filter(b=>b.stairs&&b.tags.fictional==='yes').slice(0,10);houses.forEach((b,i)=>{let level=i%3===0?0:Math.min(b.stairs.floors-1,i%2+1),x=b.center[0]+1,z=b.center[1]+1;W.items.push({id:'journal-'+i,name:stories[i][0],kind:'note',x,y:z,level,story:stories[i],building:b.id,hint:'E · READ EXPLORER JOURNAL',location:'ABANDONED HOUSE '+(i+1)});});W.storySites=houses.slice(0,6).map((b,i)=>({x:b.center[0]+2,y:b.center[1]+3,level:i%2?1:0,building:b.id}));}
function decorate(g,W){if(window.ISLAND_COMFORT?.plain)return;for(let site of W.storySites||[]){let x=site.x,z=site.y,h=W.heightAt(x,z)+site.level*3.2;g.sphere(x,h+.24,z,.36,.22,1.03,[.21,.23,.20],12,7,3);g.sphere(x,h+.27,z-.94,.23,.20,.24,[.25,.27,.23],10,6,3);for(let s of[-1,1])g.box(x+s*.15,h+.09,z+1.05,.19,.16,.36,[.09,.085,.06]);g.box(x+1,h+.31,z-.5,.5,.62,.30,[.27,.27,.15],3);g.beam([x+1.2,h+.3,z+.4],[x+1.2,h+.65,z+.4],.1,.1,[.49,.5,.42],10);g.box(x-.8,h+.08,z+.3,.26,.14,.16,[.10,.14,.12]);for(let i=0;i<5;i++)g.sphere(x-.4-i*.19,h+.035,z+.5+Math.sin(i)*.1,.05,.004,.04,[.20,.018,.012],6,3,6);}}
function create(W){
 const brain=window.ISLAND_NPC_AI.create(W);let enemies=[],events=[],scareLog=[],phantoms=[],illusions=[],journalCount=0,age=0,nextFalse=25,lastThreat=null;
 const make=(kind,x,z)=>({...W.safePoint(x,z),kind,name:names[kind],state:kind==='diddy'?'dormant':'patrol',target:0,path:[],repath:0,search:0,level:0,feet:null,building:null,stepTime:0,stalkTime:0,scares:[],nextScare:0,attackUnlocked:false,noticed:0});
 function reset(){const spawns=W.data.layout?.npcSpawns||{hawking:[762,681],trump:[159,381],diddy:[619,470]};enemies=[make('hawking',...spawns.hawking),make('trump',...spawns.trump),make('diddy',...spawns.diddy)];events=[];scareLog=[];phantoms=[];illusions=[];journalCount=0;age=0;nextFalse=22+Math.random()*8;}
 function schedule(kind,x,z,ctx){
  if(window.ISLAND_COMFORT?.plain)return;
  events.push({kind,x,z,at:ctx.elapsed});if(events.length>30)events.shift();
  if(kind==='footsteps'){let count=4+Math.floor(Math.random()*4);for(let i=0;i<count;i++)phantoms.push({at:ctx.elapsed+i*(.36+Math.random()*.12),x:x+Math.sin(i)*.5,z:z-i*.45});}
  else if(kind==='knock'){for(let i=0;i<3;i++)ctx.sound(90+i*7,.12,.10,'triangle',34,x,z,i*.23);}
  else if(kind==='radio'){ctx.rustle(x,z,.8);ctx.sound(208,.6,.035,'sine',62,x,z);}
  else if(kind==='silhouette'){const point=W.safePoint(x,z);illusions.push({kind:'shadow',...point,feet:W.heightAt(point.x,point.y),state:'watch',until:ctx.elapsed+1.7,path:[]});}
  else if(kind==='face')ctx.scare?.('ambush',{kind:'diddy'});
  else if(kind==='slam'){ctx.sound(48,.8,.16,'sawtooth',23,x,z);ctx.rustle(x,z,.25);}
  else if(kind==='breath')ctx.rustle(x,z,1.2);
 }
 function flank(e,memory,watched){
  const distance=watched?28:16;let best=null,score=-Infinity;
  for(let i=0;i<8;i++){let a=memory.a+Math.PI+(i-3.5)*.35,point=W.safePoint(memory.x+Math.cos(a)*distance,memory.y+Math.sin(a)*distance),d=Math.hypot(point.x-memory.x,point.y-memory.y);if(d<12||d>38)continue;
   let cover=!W.visible(point.x,point.y,memory.x,memory.y),s=(cover?25:0)-Math.hypot(point.x-e.x,point.y-e.y)*.15-Math.abs(i-3.5);if(s>score){score=s;best={...memory,...point};}}
  return best||{...memory,x:memory.x+Math.cos(memory.a+Math.PI)*distance,y:memory.y+Math.sin(memory.a+Math.PI)*distance};
 }
 function update(dt,ctx){
  age=ctx.elapsed;lastThreat=null;illusions=illusions.filter(i=>i.until>age);
  if(age>nextFalse){let a=ctx.p.a+Math.PI+(Math.random()-.5)*2,range=7+Math.random()*8;schedule('footsteps',ctx.p.x+Math.cos(a)*range,ctx.p.y+Math.sin(a)*range,ctx);nextFalse=age+22+Math.random()*25;}
  for(const f of phantoms.filter(f=>f.at<=age))ctx.sound(68,.13,.055,'triangle',36,f.x,f.z);phantoms=phantoms.filter(f=>f.at>age);
  const sharedContext=ctx;for(const e of enemies){
   const ctx=sharedContext.forEnemy?.(e)||sharedContext;
   const before=window.ISLAND_CONTACT.snapshot(W,e);
   if(window.ISLAND_CONTACT.touching(W,e,ctx.p,{fromPlayer:ctx.previousPlayer,crouching:ctx.crouch})){ctx.capture(e);return;}
   let d=Math.hypot(e.x-ctx.p.x,e.y-ctx.p.y);
   if(ctx.p.hidden&&e.kind==='diddy'){brain.tick(e,ctx,dt);continue;}
   if(e.kind==='diddy'){
    if(age<75)continue;if(e.state==='dormant'){e.state='stalk';e.nextScare=age+5;}
    const observed=brain.sense(e,ctx),b=brain.init(e),fresh=b.memory&&age-b.memory.at<14;
    if(d<75&&fresh){e.stalkTime+=dt;if(age>=e.nextScare){let types=['footsteps','knock','silhouette','face','radio','slam','breath'],type=types[e.scares.length%types.length],a=ctx.p.a+(e.scares.length%2?1:-1)*(1+Math.random());schedule(type,ctx.p.x+Math.cos(a)*9,ctx.p.y+Math.sin(a)*9,ctx);e.scares.push(type);scareLog.push(type);e.nextScare=age+10+Math.random()*6;}}
    e.attackUnlocked=e.stalkTime>=38&&new Set(e.scares).size>=3;
    if(e.attackUnlocked){brain.tick(e,ctx,dt);if(e.state==='chase'||e.state==='investigate'&&d<30)lastThreat=e;}
    else if(fresh){
     e.state='stalk';let a=Math.atan2(e.y-ctx.p.y,e.x-ctx.p.x)-ctx.p.a,watched=ctx.flashlight&&d<36&&Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<.55&&W.visible(e.x,e.y,ctx.p.x,ctx.p.y);e.noticed=watched?e.noticed+dt:0;
     if(!e.flankTarget||age>=e.nextFlank||watched!==e.wasWatched){e.flankTarget=flank(e,b.memory,watched);e.nextFlank=age+4;e.wasWatched=watched;}
     if(d<12||d>22||watched)brain.navigate(e,e.flankTarget,dt,ctx,watched?3.8:3.0);
    }else{brain.tick(e,ctx,dt);e.state='stalk';}
   }else{
    brain.tick(e,ctx,dt);if(e.state==='chase'||e.state==='investigate'&&d<30)lastThreat=e;
   }
   d=Math.hypot(e.x-ctx.p.x,e.y-ctx.p.y);
   if(d<22&&Math.hypot(e.x-before.x,e.y-before.y)>.001){e.stepTime+=dt;if(e.stepTime>(e.kind==='hawking'?.9:e.state==='chase'?.36:.55)){e.stepTime=0;if(e.kind==='hawking')ctx.sound(150,.35,.045*(1-d/20),'triangle',60,e.x,e.y);else ctx.sound(65,.18,.23*Math.max(0,1-d/24),'triangle',30,e.x,e.y);}}
   if(window.ISLAND_CONTACT.touching(W,e,ctx.p,{fromEnemy:before,crouching:ctx.crouch})){ctx.capture(e);return;}
  }
 }
 function snapshot(){return JSON.parse(JSON.stringify({enemies,events,scareLog,phantoms,illusions,journalCount,age,nextFalse,lastThreat:lastThreat?.kind||null}));}
 function restore(s){enemies=s.enemies;events=s.events;scareLog=s.scareLog;phantoms=s.phantoms;illusions=s.illusions;journalCount=s.journalCount;age=s.age;nextFalse=s.nextFalse;lastThreat=enemies.find(e=>e.kind===s.lastThreat)||null;}
 reset();return{reset,snapshot,restore,update,schedule,recordJournal:()=>journalCount++,get enemies(){return enemies;},get illusions(){return illusions;},get events(){return events;},get journalCount(){return journalCount;},get lastThreat(){return lastThreat;},get diagnostics(){return{enemyCount:enemies.length,journals:journalCount,falseFootsteps:events.filter(e=>e.kind==='footsteps').length,stalker:enemies.find(e=>e.kind==='diddy'),scares:scareLog.slice(),pathCalls:brain.pathCalls};}};
}
window.HORROR={addStories,decorate,create};
})();

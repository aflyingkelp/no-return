'use strict';
(() => {
const W=window.ISLAND_WORLD,S=window.ISLAND_SPATIAL,V=window.ISLAND_VISION;
function playerCanSee(e,p){const eye=[p.x,(p.feet??W.heightAt(p.x,p.y))+1.62,p.y];for(const h of[.2,.85,e.kind==='hawking'?1.55:1.94])for(const side of[-1,0,1]){const r=e.kind==='hawking'?.6:.44;let q=[e.x-Math.sin(p.a)*side*r,(e.feet??W.heightAt(e.x,e.y))+h,e.y+Math.cos(p.a)*side*r],projected=S.project(q,{...p,height:eye[1]},innerWidth,innerHeight);if(projected&&projected[0]>-35&&projected[0]<innerWidth+35&&projected[1]>-35&&projected[1]<innerHeight+35&&S.visible(eye,q))return true;}return false;}
function relocate(e,ctx,random=Math.random){const p=ctx.p,r=e.kind==='hawking'?.54:.42;for(let i=0;i<32;i++){const a=p.a+Math.PI+(random()-.5)*Math.PI*1.7,d=(p.building&&p.building===e.building?6:10)+random()*9,x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d;if(!W.clear(x,y,r)||!window.ISLAND_IMMERSION.clear(e,x,y,r))continue;const step=window.HORROR_ARCHITECTURE.step(e,x,y);if(!step||Math.abs(step.feet-(p.feet??0))>1.2)continue;const candidate={...e,...step,x,y};if(playerCanSee(candidate,p)||ctx.observers?.some(q=>q.flashlight&&playerCanSee(candidate,q.p))||ctx.enemies?.some(other=>other!==e&&Math.hypot(other.x-x,other.y-y)<2))continue;Object.assign(e,{x,y,...step,path:[],facing:Math.atan2(p.y-y,p.x-x)});e.ai.corridor=null;e.ai.stairRoute=[];e.ai.nextPath=0;return true;}return false;}
function update(e,ctx,dt,random=Math.random){const cfg=window.ISLAND_NPC_AI.profiles[e.kind]||window.ISLAND_NPC_AI.profiles.epstein,b=e.ai;if(!b||ctx.elapsed<cfg.grace||e.kind==='diddy'&&!e.attackUnlocked)return false;
 if(window.ISLAND_COMFORT?.plain)return false;
 if(e.encounter?.phase==='windup'){e.facing=Math.atan2(e.encounter.target.y-e.y,e.encounter.target.x-e.x);b.lookAt=[e.encounter.target.x,e.encounter.target.feet+1.5,e.encounter.target.y];b.lookUntil=ctx.elapsed+2;if(ctx.elapsed<e.encounter.until)return true;e.encounter.phase='blitz';e.encounter.until=ctx.elapsed+4;b.memory={...e.encounter.target,at:ctx.elapsed,source:'sight'};b.visualAlert=true;e.state='chase';e.search=cfg.searchTime;}
 if(e.encounter?.phase==='blitz'){if(ctx.elapsed<e.encounter.until){b.memory={...e.encounter.target,at:ctx.elapsed,source:'sight'};e.state='chase';return false;}e.encounter.phase='spent';}
 const lit=V.illuminated(e,ctx.p);if(!lit){b.beamContact=0;return false;}b.beamContact=(b.beamContact||0)+dt;if(b.beamContact<.22||ctx.elapsed<(b.nextEncounter||0))return false;b.beamContact=0;b.nextEncounter=ctx.elapsed+18;
 const target={x:ctx.p.x,y:ctx.p.y,feet:ctx.p.feet,level:ctx.p.level||0,building:ctx.p.building||null,a:ctx.p.a};
 if(random()<.5&&relocate(e,ctx,random)){e.encounter={phase:'relocated',until:ctx.elapsed+1,target};ctx.rustle?.(e.x,e.y,.3);return false;}
 e.encounter={phase:'windup',until:ctx.elapsed+1.1,target};e.path=[];if(window.ISLAND_COMFORT?.jumpscares!==false)ctx.sound?.(42,.9,.20,'sawtooth',23,e.x,e.y);return true;
}
window.ISLAND_ENCOUNTERS={update,relocate,playerCanSee};
})();

'use strict';
// Contact is physical, independent of sight, hearing, chase state or grace timers.
(() => {
const human={radius:.42,height:1.95},chair={radius:.54,height:1.6};
const body=kind=>kind==='hawking'?chair:human;
const snapshot=(W,e)=>({x:e.x,y:e.y,feet:Number.isFinite(e.feet)?e.feet:W.heightAt(e.x,e.y)});
function touching(W,enemy,player,options={}){
 if(!enemy||enemy.kind==='shadow')return false;
 const shape=body(enemy.kind),e=snapshot(W,enemy),p=snapshot(W,player),a=options.fromEnemy||e,b=options.fromPlayer||p,radius=shape.radius+.29+.04;
 const x=a.x-b.x,y=a.y-b.y,vx=e.x-p.x-x,vy=e.y-p.y-y,A=vx*vx+vy*vy,B=2*(x*vx+y*vy),C=x*x+y*y-radius*radius;
 let lo=0,hi=1;
 if(A<1e-12){if(C>0)return false;}else{let discriminant=B*B-4*A*C;if(discriminant<0)return false;let root=Math.sqrt(discriminant);lo=Math.max(0,(-B-root)/(2*A));hi=Math.min(1,(-B+root)/(2*A));if(lo>hi)return false;}
 const height=options.crouching?1.15:1.72,startHeight=a.feet-b.feet,heightSlope=e.feet-p.feet-startHeight,minimum=-shape.height+.08,maximum=height-.08;
 if(Math.abs(heightSlope)<1e-12){if(startHeight<minimum||startHeight>maximum)return false;}else{let t0=(minimum-startHeight)/heightSlope,t1=(maximum-startHeight)/heightSlope;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;}
 for(let t of [lo,(lo+hi)/2,hi]){
  const ex=a.x+(e.x-a.x)*t,ey=a.y+(e.y-a.y)*t,px=b.x+(p.x-b.x)*t,py=b.y+(p.y-b.y)*t;
  if(W.clear&&(!W.clear(ex,ey,0)||!W.clear(px,py,0)))continue;
  if(W.visible(ex,ey,px,py)&&(!window.ISLAND_IMMERSION||window.ISLAND_IMMERSION.visible(ex,ey,px,py,p.feet)))return true;
 }
 return false;
}
window.ISLAND_CONTACT={body,snapshot,touching};
})();

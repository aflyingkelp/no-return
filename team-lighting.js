'use strict';
(() => {
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function prepare(lamps,camera){const result=(lamps||[]).filter(l=>Math.hypot(l.x-camera.x,l.y-camera.y)<70).slice(0,3).map(l=>{const cp=Math.cos(l.pitch||0),direction=[Math.cos(l.a)*cp,Math.sin(l.pitch||0),Math.sin(l.a)*cp];return{...l,origin:[l.x+direction[0]*.25,l.feet+(l.crouch?1:1.62)+direction[1]*.25,l.y+direction[2]*.25],direction,cache:new Map()};});if(result.length)window.ISLAND_SPATIAL?.updateDynamic({...camera});return result;}
function sample(lamps,point,normal){let energy=0;const S=window.ISLAND_SPATIAL;for(const l of lamps){const dx=point[0]-l.origin[0],dy=point[1]-l.origin[1],dz=point[2]-l.origin[2],distance=Math.hypot(dx,dy,dz);if(distance<.08||distance>36)continue;const cone=(dx*l.direction[0]+dy*l.direction[1]+dz*l.direction[2])/distance;if(cone<=.90)continue;const key=point.map(v=>Math.round(v*2)).join(',');let clear=l.cache.get(key);if(clear===undefined){clear=!S||S.visible(l.origin,point.map((v,i)=>v+(l.origin[i]-v)/distance*.05),.10);l.cache.set(key,clear);}if(!clear)continue;const incidence=normal?Math.max(.08,Math.abs((dx*normal[0]+dy*normal[1]+dz*normal[2])/distance)):1;energy+=smooth((cone-.90)/.08)*Math.min(2.2,12/(1+distance*.45+distance*distance*.16))*incidence;}return energy;}
window.ISLAND_TEAM_LIGHTS={prepare,sample};
})();

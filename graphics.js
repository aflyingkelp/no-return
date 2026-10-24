'use strict';
// Render settings are deliberately separate from simulation and difficulty.
window.ISLAND_GRAPHICS = (()=>{
 const presets={low:{label:'LOW',scale:.75,shadow:768,pcf:1,foliage:.18,rain:160,cloud:4,trace:0},balanced:{label:'BALANCED',scale:1,shadow:1536,pcf:1,foliage:.5,rain:420,cloud:7,trace:0},high:{label:'HIGH',scale:1,shadow:1536,pcf:1,foliage:.8,rain:650,cloud:8,trace:0},ultra:{label:'ULTRA',scale:1,shadow:2048,pcf:1.5,foliage:1,rain:900,cloud:11,trace:0}};
 let compatibility=false;try{compatibility=localStorage.getItem('no-return-safe-graphics')==='1';}catch{}let selected='high';try{let saved=localStorage.getItem('no-return-graphics');if(presets[saved])selected=saved;}catch{}
 let tracing=false;const listeners=[];if(compatibility)selected='low';
 return {presets,compatibility,get selected(){return selected;},get current(){return {...presets[selected],trace:tracing?1:0};},setTracing(value){tracing=!compatibility&&!!value;listeners.forEach(fn=>fn(this.current));},onChange(fn){listeners.push(fn);return()=>{let i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);};},set(value){if(!presets[value])return;selected=value;try{localStorage.setItem('no-return-graphics',value);}catch{}listeners.forEach(fn=>fn(this.current));}};
})();
// Shared wind field: trunks stay rooted; fronds, blades and hair respond to gusts.
window.ISLAND_WIND_GLSL=`
uniform float uHeadYaw,uHeadPitch,uHandCurl;
vec3 handPosition(vec3 p,float curl){if(p.z>.04){float t=clamp((p.z-.04)/.13,0.,1.),a=curl*t*1.5,y=p.y,z=p.z-.04;p.y=y*cos(a)-z*sin(a);p.z=y*sin(a)+z*cos(a)+.04;}return p;}
vec3 headRotate(vec3 v){float ca=cos(uHeadYaw),sa=sin(uHeadYaw),cp=cos(uHeadPitch),sp=sin(uHeadPitch);v=vec3(v.x*ca+v.z*sa,v.y,-v.x*sa+v.z*ca);return vec3(v.x,v.y*cp+v.z*sp,-v.y*sp+v.z*cp);}
vec3 headPosition(vec3 p,float character){float pivot=character>1.5?1.13:1.48,cut=character>1.5?1.15:1.5;if(p.y>cut)p=headRotate(p-vec3(0,pivot,.025))+vec3(0,pivot,.025);return p;}
vec3 characterPosition(vec3 p,float character,float time,float chase){if(character<.5)return p;if(character>2.5)return handPosition(p,uHandCurl);float gait=sin(time*mix(5.,10.,chase)),side=sign(p.x);if(character<1.5){if(p.y<.78)p.z+=gait*side*(.78-p.y)*mix(.20,.36,chase);if(abs(p.x)>.24&&p.y>.7&&p.y<1.44)p.z-=gait*side*(1.44-p.y)*.22;}return headPosition(p,character);}
vec3 windPosition(vec3 p,float material,float time){
 float gust=.55+.35*sin(time*.47)+.18*sin(time*1.73);
 if(material>6.5&&material<8.5){float blade=material>7.5?fract(material)*2.5:1.;float wave=sin(time*2.1+p.x*.37+p.z*.21)+.35*sin(time*4.2+p.z*1.2);p.x+=wave*.16*gust*blade;p.z+=sin(time*1.7+p.x*.3)*.11*gust*blade;}
 if(material>8.5&&material<9.5){p.x+=sin(time*3.+p.y*13.)*.009;p.z+=sin(time*2.1+p.x*19.)*.008;}
 return p;
}`;

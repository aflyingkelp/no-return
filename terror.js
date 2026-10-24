'use strict';
// Screen effects use the existing canvas; no extra context or full-screen shaders.
(() => {
const layer=document.querySelector('#terror'),face=document.querySelector('#contactScare'),scene=document.querySelector('#scene');
let enabled=true,strength=0,next=0,until=0,captured=false;
try{enabled=localStorage.getItem('no-return-distortion')!=='0';}catch{}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function clear(){strength=0;next=0;until=0;captured=false;face.hidden=true;layer.hidden=true;document.body.classList.remove('reality-slip','contact-caught');scene.style.transform='';for(const id of ['.software-scene','#crosshair']){const node=document.querySelector(id);if(node)node.style.transform='';}}
function capture(kind,now){if(window.ISLAND_COMFORT?.plain||window.ISLAND_COMFORT?.jumpscares===false)return;captured=true;until=now+.86;face.dataset.kind=kind;face.hidden=false;document.body.classList.add('contact-caught');}
function update(now,ctx){
 if(window.ISLAND_COMFORT?.plain){clear();return;}
 if(captured&&now>=until){face.hidden=true;captured=false;document.body.classList.remove('contact-caught');}
 if(now<next)return;next=now+.05;
 let target=0;if(enabled&&ctx?.active&&ctx.lit&&!ctx.hidden){for(const e of ctx.enemies){if(e.kind==='shadow')continue;let d=Math.hypot(e.x-ctx.p.x,e.y-ctx.p.y,((e.feet??0)-(ctx.p.feet??0))*.8);if(d<15&&(e.state==='chase'||e.ai?.seen))target=Math.max(target,(1-d/15)*.85);}}
 strength+=(target-strength)*.28;if(!ctx?.active||!ctx.lit)strength=0;
 const active=strength>.02&&!reduced();layer.hidden=!active;document.body.classList.toggle('reality-slip',active);
 let transform=active?`translate(${Math.sin(now*39)*strength*3}px,${Math.sin(now*27)*strength*1.5}px) skewX(${Math.sin(now*17)*strength*.7}deg) scale(${1+strength*.016})`:'';
 scene.style.transform=transform;for(const id of ['.software-scene']){const node=document.querySelector(id);if(node)node.style.transform=transform;}const crosshair=document.querySelector('#crosshair');if(crosshair)crosshair.style.transform=transform?'translate(-50%,-50%) '+transform:'';
 layer.style.opacity=String(strength*.52);layer.style.backgroundPosition=`0 ${Math.floor(now*17)%13}px`;
}
window.ISLAND_TERROR={clear,capture,update,setEnabled(value){enabled=!!value;try{localStorage.setItem('no-return-distortion',enabled?'1':'0');}catch{}if(!enabled)clear();},get enabled(){return enabled;},get diagnostics(){return{enabled,strength,captured,reduced:reduced()};}};
})();

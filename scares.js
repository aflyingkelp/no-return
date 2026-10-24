'use strict';
(() => {
const assets=[
 {id:'abandoned',src:'scares/abandoned.png',position:'50% 50%',framing:'apparition',roles:['window','glimpse'],supplied:true},
 {id:'wide-eyes',src:'scares/wide-eyes.png',position:'50% 43%',framing:'portrait',roles:['ambush','death'],supplied:true},
 {id:'peeking',src:'scares/peeking.png',position:'50% 50%',framing:'peek',roles:['window','glimpse','ambush'],supplied:true},
 {id:'void-face',src:'scares/void-face.png',position:'50% 50%',framing:'void',roles:['window','glimpse','ambush','death'],supplied:true},
 {id:'scream',src:'scares/scream.png',position:'50% 48%',framing:'scream',roles:['ambush','death'],supplied:true},
 {id:'mask',src:'scares/mask.jpg',position:'50% 46%',framing:'portrait',fallback:true},
 {id:'monster',src:'scares/monster.jpg',position:'50% 48%',framing:'portrait',fallback:true}
];
window.ISLAND_SCARES={assets,create(sound){
 const layer=document.querySelector('#jumpscare'),image=document.querySelector('#scareImage');let enabled=true;
 try{enabled=localStorage.getItem('no-return-image-scares')!=='0';}catch{}
 let until=0,cooldown=0,sequence=0,lastAsset=null,pending=null,seenRooms=new Set(),log=[];const rotation={};
 if(typeof Image!=='undefined')for(let asset of assets){let preload=new Image();preload.onload=()=>{asset.ready=true;try{const w=preload.naturalWidth,h=preload.naturalHeight;if(!(w>0&&h>0))return;const c=document.createElement('canvas'),scale=100/Math.max(w,h);c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(preload,0,0,c.width,c.height);asset.pixelSrc=c.toDataURL('image/png');asset.pixelSize=[c.width,c.height];}catch{asset.ready=false;}};preload.onerror=()=>{asset.ready=false;};preload.src=asset.src;}
 function clear(){layer.hidden=true;until=0;layer.className='';}
 image.onerror=clear;
 function reset(){clear();cooldown=0;pending=null;seenRooms.clear();log=[];}
 function trigger(kind,meta={},now=0){
  const fatal=kind==='death';if(window.ISLAND_COMFORT?.plain||window.ISLAND_COMFORT?.jumpscares===false||!enabled||!fatal&&now<cooldown)return false;
  let pool=assets.filter(a=>!a.fallback&&a.ready!==false&&a.roles.includes(kind));if(!pool.length)pool=assets.filter(a=>a.fallback&&a.ready!==false);if(!pool.length)return false;
  let index=(rotation[kind]??({epstein:0,trump:1,hawking:2,diddy:1}[meta.kind]||0))%pool.length;if(pool.length>1&&pool[index].id===lastAsset)index=(index+1)%pool.length;const asset=pool[index];rotation[kind]=(index+1)%pool.length;sequence++;
  lastAsset=asset.id;image.src=asset.pixelSrc||asset.src;image.dataset.source=asset.id;image.style.opacity=kind==='window'||kind==='glimpse'?'.24':'1';image.style.objectPosition=asset.position;image.style.objectFit='cover';layer.className='scare-'+kind;layer.dataset.framing=asset.framing;layer.hidden=false;until=now+(fatal?.84:kind==='glimpse'?.28:.62);cooldown=now+(fatal?4:28);pending=null;
  log.push({kind,asset:asset.id,at:now});if(log.length>20)log.shift();if(!meta.silent)sound?.(fatal?1:.65);return true;
 }
 function update(now,ctx){
  if(until&&now>=until)clear();if(!enabled||!ctx)return;
  const room=ctx.p.building&&ctx.p.level>0?ctx.p.building+':'+ctx.p.level:null;
  if(now>40&&room&&!seenRooms.has(room)){seenRooms.add(room);if(now>=cooldown)pending={room,a:ctx.p.a,ready:now+1.5,expires:now+9};}
  if(pending){if(now>pending.expires||room!==pending.room)pending=null;else if(now>=pending.ready&&(Math.abs(Math.atan2(Math.sin(ctx.p.a-pending.a),Math.cos(ctx.p.a-pending.a)))>.9||ctx.flashlight&&!pending.lit)){if(ctx.flashlight)trigger('window',{},now);}}
  if(pending)pending.lit=ctx.flashlight;
 }
 return{snapshot(){return{cooldown,sequence,lastAsset,pending,seenRooms:[...seenRooms],rotation:{...rotation}};},restore(s){clear();cooldown=s.cooldown;sequence=s.sequence;lastAsset=s.lastAsset;pending=s.pending;seenRooms=new Set(s.seenRooms);Object.assign(rotation,s.rotation);},trigger,update,clear,reset,setEnabled(value){enabled=!!value;try{localStorage.setItem('no-return-image-scares',enabled?'1':'0');}catch{}if(!enabled)clear();},get enabled(){return enabled;},get active(){return until>0;},get diagnostics(){return{enabled,active:until>0,asset:until>0?lastAsset:null,pending:!!pending,events:log.slice()};}};
}};
})();

'use strict';
// Actual expanded triangle models, shared by the GPU and software renderers.
(() => {
const cache=new WeakMap(),color=[217/255,238/255,145/255],thickness=.014;
const key=p=>p.map(v=>Math.round(v*100000)).join(',');
function geometry(data){
 if(cache.has(data))return cache.get(data);
 const vertices=new Map(),edges=new Map();
 for(let at=0;at<data.length;at+=30){
  const points=[];
  for(let j=0;j<3;j++){
   const offset=at+j*10,p=Array.from(data.slice(offset,offset+3)),n=Array.from(data.slice(offset+3,offset+6)),id=key(p),normalKey=n.map(v=>Math.round(v*10000)).join(',');
   let vertex=vertices.get(id);if(!vertex){vertex={normal:[0,0,0],seen:new Set()};vertices.set(id,vertex);}if(!vertex.seen.has(normalKey)){vertex.seen.add(normalKey);for(let k=0;k<3;k++)vertex.normal[k]+=n[k];}points.push({p,id});
  }
  for(let j=0;j<3;j++){const a=points[j],b=points[(j+1)%3];if(a.id===b.id)continue;const id=a.id<b.id?a.id+'|'+b.id:b.id+'|'+a.id,edge=edges.get(id);if(edge)edge.count++;else edges.set(id,{a:a.p,b:b.p,count:1});}
 }
 const shell=new Float32Array(data);
 for(let at=0;at<data.length;at+=10){const n=vertices.get(key(Array.from(data.slice(at,at+3)))).normal,length=Math.hypot(...n)||1;for(let k=0;k<3;k++){shell[at+k]+=n[k]/length*thickness;shell[at+6+k]=color[k];}shell[at+9]=0;}
 const parts=shell.length?[{data:shell,backfaces:true}]:[];
 // Thin, open surfaces need a solid edge model rather than an inverted hull.
 const rim=new window.IslandGeometry();for(const edge of edges.values())if(edge.count===1)rim.beam(edge.a,edge.b,thickness*.65,thickness*.65,color,6);
 if(rim.data.length)parts.push({data:new Float32Array(rim.data),backfaces:false});
 cache.set(data,parts);return parts;
}
function model(object,lit){
 if(!object||!lit||window.ISLAND_IMMERSION.hidden)return null;
 const parts=[];for(const part of window.ISLAND_SPATIAL.parts(object))for(const mesh of geometry(part.data))parts.push({...mesh,model:part.model});
 return parts.length?{id:object.id,version:object.meshVersion||0,parts}:null;
}
window.ISLAND_OUTLINE={model,geometry,thickness,color};
})();

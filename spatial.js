'use strict';
// Shared CPU triangle queries. No GPU readback, extra context or per-frame BVH build.
(() => {
const W=window.ISLAND_WORLD,I=window.ISLAND_IMMERSION;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{let d=Math.hypot(...a)||1;return a.map(v=>v/d);};
function triangle(data,at,o,d,limit){
 const ax=data[at],ay=data[at+1],az=data[at+2],ux=data[at+10]-ax,uy=data[at+11]-ay,uz=data[at+12]-az,vx=data[at+20]-ax,vy=data[at+21]-ay,vz=data[at+22]-az;
 const px=d[1]*vz-d[2]*vy,py=d[2]*vx-d[0]*vz,pz=d[0]*vy-d[1]*vx,det=ux*px+uy*py+uz*pz;if(Math.abs(det)<1e-9)return null;
 const inv=1/det,sx=o[0]-ax,sy=o[1]-ay,sz=o[2]-az,u=(sx*px+sy*py+sz*pz)*inv;if(u<-.00001||u>1.00001)return null;
 const qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(d[0]*qx+d[1]*qy+d[2]*qz)*inv;if(v<-.00001||u+v>1.00001)return null;
 const t=(vx*qx+vy*qy+vz*qz)*inv;return t>.008&&t<limit?t:null;
}
class BVH{
 constructor(data){this.data=data;const count=Math.floor(data.length/30),centers=new Float32Array(count*3),bounds=new Float32Array(count*6);this.order=new Uint32Array(count);this.nodes=[];
  for(let t=0;t<count;t++){this.order[t]=t;const at=t*30;for(let k=0;k<3;k++){let a=data[at+k],b=data[at+10+k],c=data[at+20+k];bounds[t*6+k]=Math.min(a,b,c);bounds[t*6+3+k]=Math.max(a,b,c);centers[t*3+k]=(a+b+c)/3;}}
  const build=(start,end)=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let j=start;j<end;j++){let t=this.order[j];for(let k=0;k<3;k++){min[k]=Math.min(min[k],bounds[t*6+k]);max[k]=Math.max(max[k],bounds[t*6+3+k]);}}const node={min,max,start,end},id=this.nodes.length;this.nodes.push(node);if(end-start>10){const ext=max.map((v,k)=>v-min[k]),axis=ext.indexOf(Math.max(...ext));this.order.subarray(start,end).sort((a,b)=>centers[a*3+axis]-centers[b*3+axis]);let middle=(start+end)>>1;node.left=build(start,middle);node.right=build(middle,end);}return id;};if(count)build(0,count);
 }
 ray(o,d,limit=100){let nearest=limit,at=-1,stack=this.nodes.length?[0]:[],visits=0;
  while(stack.length){const n=this.nodes[stack.pop()];visits++;let lo=.008,hi=nearest;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-10){if(o[k]<n.min[k]-.001||o[k]>n.max[k]+.001){hi=-1;break;}}else{let a=(n.min[k]-o[k])/d[k],b=(n.max[k]-o[k])/d[k];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}if(hi<lo)continue;
   if(n.left!==undefined){stack.push(n.right,n.left);continue;}for(let j=n.start;j<n.end;j++){let index=this.order[j]*30,t=triangle(this.data,index,o,d,nearest);if(t!==null){nearest=t;at=index;}}
  }
  if(at<0)return null;const p=o.map((v,k)=>v+d[k]*nearest),a=Array.from(this.data.slice(at,at+3)),b=Array.from(this.data.slice(at+10,at+13)),c=Array.from(this.data.slice(at+20,at+23));let n=norm(cross(sub(b,a),sub(c,a)));if(dot(n,d)>0)n=n.map(v=>-v);return{distance:nearest,point:p,normal:n,color:Array.from(this.data.slice(at+6,at+9)),material:this.data[at+9],visits};
 }
}
const transform=(p,m)=>{if(!m)return p;return[p[0]*m.ca+p[2]*m.sa+m.x,p[1]+m.y,-p[0]*m.sa+p[2]*m.ca+m.z];};
const meshBounds=new WeakMap();
function meshRay(data,m,o,d,limit){const ro=m?[(o[0]-m.x)*m.ca-(o[2]-m.z)*m.sa,o[1]-m.y,(o[0]-m.x)*m.sa+(o[2]-m.z)*m.ca]:o,rd=m?[d[0]*m.ca-d[2]*m.sa,d[1],d[0]*m.sa+d[2]*m.ca]:d;let result=null;
 let bounds=meshBounds.get(data);if(!bounds){bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(let at=0;at<data.length;at+=10)for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],data[at+k]);bounds.max[k]=Math.max(bounds.max[k],data[at+k]);}meshBounds.set(data,bounds);}let near=.008,far=limit;for(let k=0;k<3;k++){if(Math.abs(rd[k])<1e-9){if(ro[k]<bounds.min[k]-.001||ro[k]>bounds.max[k]+.001)return null;}else{const a=(bounds.min[k]-ro[k])/rd[k],b=(bounds.max[k]-ro[k])/rd[k];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}}if(far<near)return null;
 for(let at=0;at<data.length;at+=30){let t=triangle(data,at,ro,rd,result?.distance??limit);if(t!==null){let a=Array.from(data.slice(at,at+3)),b=Array.from(data.slice(at+10,at+13)),c=Array.from(data.slice(at+20,at+23)),n=norm(cross(sub(b,a),sub(c,a)));if(m)n=[n[0]*m.ca+n[2]*m.sa,n[1],-n[0]*m.sa+n[2]*m.ca];if(dot(n,d)>0)n=n.map(v=>-v);result={distance:t,point:o.map((v,k)=>v+d[k]*t),normal:n,color:Array.from(data.slice(at+6,at+9)),material:data[at+9]};}}return result;
}
let scene=null,staticParts=new Map(),pickupParts=new Map(),dynamic=[];
const actorTrees=new Map();
const actorRays=new Map();
function actorCast(e,o,d,limit){if(e.kind==='shadow'||!window.Island3D||Math.hypot(e.x-o[0],e.y-o[2])>limit+2)return null;const base=e.feet??W.heightAt(e.x,e.y),pose=[e.x,e.y,base,e.facing||0,e.headYaw||0,e.headPitch||0].join(',');let cache=actorRays.get(e.kind);if(!cache||cache.pose!==pose){cache={pose,rays:new Map()};actorRays.set(e.kind,cache);}const key=o.join(',')+'|'+d.join(',')+'|'+limit;if(cache.rays.has(key))return cache.rays.get(key);const hit=actorIntersect(e,o,d,limit,base);if(cache.rays.size>=256)cache.rays.clear();cache.rays.set(key,hit);return hit;}
function actorIntersect(e,o,d,limit,base){const height=e.kind==='hawking'?1.65:2.02,center=[e.x,base+height/2,e.y],v=center.map((n,i)=>n-o[i]),along=dot(v,d);if(along<-.8||along>limit+1||dot(v,v)-along*along>height*height)return null;
 let trees=actorTrees.get(e.kind);if(!trees){const data=window.Island3D.prototype.character.call({},0,false,e.kind).data,head=[],body=[],cut=e.kind==='hawking'?1.15:1.5;for(let at=0;at<data.length;at+=30){const dst=Math.max(data[at+1],data[at+11],data[at+21])>cut?head:body;for(let j=0;j<30;j++)dst.push(data[at+j]);}trees={head:new BVH(new Float32Array(head)),body:new BVH(new Float32Array(body)),pivot:e.kind==='hawking'?1.13:1.48};actorTrees.set(e.kind,trees);}
 const angle=Math.PI/2-(e.facing||0),ca=Math.cos(angle),sa=Math.sin(angle),ro=[(o[0]-e.x)*ca-(o[2]-e.y)*sa,o[1]-base,(o[0]-e.x)*sa+(o[2]-e.y)*ca],rd=[d[0]*ca-d[2]*sa,d[1],d[0]*sa+d[2]*ca],hy=-(e.headYaw||0),hp=e.headPitch||0,hc=Math.cos(hy),hs=Math.sin(hy),pc=Math.cos(hp),ps=Math.sin(hp),inverseHead=(p,position)=>{let x=p[0],y=p[1]-(position?trees.pivot:0),z=p[2]-(position ? .025 : 0),yy=y*pc-z*ps,zz=y*ps+z*pc;return[x*hc-zz*hs,yy+(position?trees.pivot:0),x*hs+zz*hc+(position ? .025 : 0)];};
 let hit=trees.body.ray(ro,rd,limit),head=trees.head.ray(inverseHead(ro,true),inverseHead(rd,false),hit?.distance??limit);if(head){const n=head.normal,x=n[0]*hc+n[2]*hs,z=-n[0]*hs+n[2]*hc;head.normal=[x,n[1]*pc+z*ps,-n[1]*ps+z*pc];hit=head;}if(!hit)return null;const n=hit.normal;return{...hit,point:o.map((v,i)=>v+d[i]*hit.distance),normal:[n[0]*ca+n[2]*sa,n[1],-n[0]*sa+n[2]*ca],owner:e.kind};
}
const boundsFor=o=>{const h=o.feet??W.heightAt(o.x,o.y)+(o.level||0)*3.2;const sizes={bed:[1.15,.08,1.7,1.1],desk:[1.3,.1,.55,.95],mirror:[.48,1.0,.13,2.1],window:[.9,1,.9,2.65],tank:[1.9,.1,1.9,4.5],panel:[1.75,.15,1.15,1.2],container:[1.4,.08,3.1,2.7],lamp:[.3,.05,.3,4.1],radio:[2.9,.1,.4,17.1],scenery:[.6,.1,.6,5]};const s=sizes[o.kind]||[.6,.02,.6,1.8];return{min:[o.x-s[0],h+s[1],o.y-s[2]],max:[o.x+s[0],h+s[3],o.y+s[2]]};};
function attach(r){if(scene)return;const data=W.geometryCache?.data||r.staticGeometry?.data||r.data;if(!data)return;scene=new BVH(data);W.spatialScene=scene;
 // Fallback registry selects rendered triangles, never invented interaction boxes.
 const buckets=new Map();for(let at=0;at<data.length;at+=30){if([1,2,4,5].includes(data[at+9]))continue;const center=[0,1,2].map(k=>(data[at+k]+data[at+10+k]+data[at+20+k])/3),key=center.map(v=>Math.floor(v/4)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({at,center});}
 for(const o of I.objects){if(I.meshParts?.has(o.id))continue;if(['door','closet','drawer','blood-trail'].includes(o.kind))continue;const b=boundsFor(o),geo=[];for(let x=Math.floor(b.min[0]/4);x<=Math.floor(b.max[0]/4);x++)for(let y=Math.floor(b.min[1]/4);y<=Math.floor(b.max[1]/4);y++)for(let z=Math.floor(b.min[2]/4);z<=Math.floor(b.max[2]/4);z++)for(const {at,center} of buckets.get(x+','+y+','+z)||[]){if(center.some((v,k)=>v<b.min[k]||v>b.max[k]))continue;for(let j=0;j<30;j++)geo.push(data[at+j]);}if(geo.length)staticParts.set(o.id,new Float32Array(geo));}
}
function updateDynamic(camera){dynamic=I.draws(window.IslandGeometry,camera,80);}
// Static geometry never changes. Reuse exact repeated rays, while testing moving
// doors and drawers at their current transforms on every query.
const rayCache=new Map();
function cast(o,d,limit=100,{moving=true}={}){const key=o.join(',')+'|'+d.join(',')+'|'+limit;let hit;if(rayCache.has(key))hit=rayCache.get(key);else{hit=scene?.ray(o,d,limit)||null;if(rayCache.size>=512)rayCache.clear();rayCache.set(key,hit);}if(moving)for(const part of dynamic){const h=meshRay(part.data,part.model,o,d,hit?.distance??limit);if(h)hit={...h,id:part.id};}return hit;}
function visible(a,b,tolerance=.035){const v=sub(b,a),d=Math.hypot(...v);if(d<.05)return true;return !cast(a,v.map(x=>x/d),d-tolerance);}
function parts(o){if(!o)return[];if(!o.sceneObject){const version=o.meshVersion||0,cached=pickupParts.get(o.id);if(!cached||cached.version!==version){let data=new Float32Array(window.Island3D.prototype.item.call({},o).data),base=W.heightAt(o.x,o.y)+(o.level||0)*3.2;
   if(o.inventoryKind&&!['cache','glass'].includes(o.inventoryKind)||o.kind==='fuse'){const selected=[];for(let at=0;at<data.length;at+=30){if(Math.min(data[at+1],data[at+11],data[at+21])<base+.78)continue;for(let j=0;j<30;j++)selected.push(data[at+j]);}data=new Float32Array(selected);}
   pickupParts.set(o.id,{version,data});}return[{data:pickupParts.get(o.id).data}];}
 const result=[],data=I.meshParts?.get(o.id)||staticParts.get(o.id);if(data)result.push({data});for(const p of dynamic)if(p.id===o.id)result.push(p);return result;
}
function direction(camera){let cp=Math.cos(camera.pitch||0);return[Math.cos(camera.a)*cp,Math.sin(camera.pitch||0),Math.sin(camera.a)*cp];}
function select(camera,p,range=3.2){if(I.hidden)return{object:I.hidden,hit:null};const origin=[camera.x,camera.height,camera.y],d=direction(camera);updateDynamic(camera);let nearest=null,object=null;
 for(const o of [...W.items,...I.objects]){if(o.taken||Math.hypot(o.x-p.x,o.y-p.y)>range+3||Math.abs((o.feet??W.heightAt(o.x,o.y)+(o.level||0)*3.2)-(p.feet??0))>2.5)continue;
  if(o.kind==='closet'&&(p.y<o.y+.70||Math.abs(p.x-o.x)>1.4))continue;
  for(const part of parts(o)){const hit=meshRay(part.data,part.model,origin,d,nearest?.distance??range);if(hit){nearest=hit;object=o;}}
 }
 if(!object)return null;const blocker=cast(origin,d,nearest.distance-.045);if(blocker)return null;if(object.sceneObject)object.hint=I.hint(object);return{object,hit:nearest};
}
function project(p,c,width,height){const cp=Math.cos(c.pitch||0),sp=Math.sin(c.pitch||0),ca=Math.cos(c.a),sa=Math.sin(c.a),dx=p[0]-c.x,dy=p[1]-c.height,dz=p[2]-c.y,h=dx*ca+dz*sa,z=h*cp+dy*sp;if(z<.04)return null;let x=-dx*sa+dz*ca,y=dy*cp-h*sp,roll=c.roll||0,rx=x*Math.cos(roll)+y*Math.sin(roll),ry=-x*Math.sin(roll)+y*Math.cos(roll),zoom=height/(2*Math.tan(65*Math.PI/360));return[width/2+rx/z*zoom,height/2-ry/z*zoom,z];}
window.ISLAND_SPATIAL={attach,cast,visible,actorCast,select,parts,direction,project,updateDynamic,meshRay,triangle,BVH,transform,get scene(){return scene;},get diagnostics(){return{triangles:scene?.data.length/30||0,nodes:scene?.nodes.length||0,actorTypes:actorTrees.size};}};
})();

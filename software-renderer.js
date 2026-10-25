'use strict';
// A real triangle rasterizer for browsers that refuse all GPU contexts.
// Shares the island, interiors, pickups and character meshes with the GPU path.
(() => {
const near=.08, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function chunksFor(data){
 const cells=new Map();
 for(let at=0;at<data.length;at+=30){
  let x0=Math.min(data[at],data[at+10],data[at+20]),x1=Math.max(data[at],data[at+10],data[at+20]);
  let z0=Math.min(data[at+2],data[at+12],data[at+22]),z1=Math.max(data[at+2],data[at+12],data[at+22]);
  let key=Math.floor((x0+x1)/48)+','+Math.floor((z0+z1)/48),cell=cells.get(key);
  if(!cell){cell={indices:[],x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity,z0:Infinity,z1:-Infinity};cells.set(key,cell);}
  cell.x0=Math.min(cell.x0,x0);cell.x1=Math.max(cell.x1,x1);cell.y0=Math.min(cell.y0,data[at+1],data[at+11],data[at+21]);cell.y1=Math.max(cell.y1,data[at+1],data[at+11],data[at+21]);cell.z0=Math.min(cell.z0,z0);cell.z1=Math.max(cell.z1,z1);cell.indices.push(at);
 }
 return [...cells.values()].map(c=>({...c,indices:new Uint32Array(c.indices)}));
}
function clipped(vertices){
 const out=[];
 for(let i=0;i<vertices.length;i++){let a=vertices[i],b=vertices[(i+1)%vertices.length],ia=a[2]>=near,ib=b[2]>=near;if(ia)out.push(a);if(ia!==ib){let t=(near-a[2])/(b[2]-a[2]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}
 return out;
}
window.IslandSoftware=class {
 constructor(source,grid,items,props){
  this.software=true;this.source=source;this.items=items;this.materials={loaded:0};this.scenery={loaded:0};this.textures=[];this.characters=new Map();this.drawTriangles=0;this.lastFrame=-Infinity;
  this.canvas=document.createElement('canvas');this.canvas.className='software-scene';this.canvas.setAttribute('aria-hidden','true');source.insertAdjacentElement('afterend',this.canvas);
  this.ctx=this.canvas.getContext('2d',{alpha:false});if(!this.ctx){this.canvas.remove();throw Object.assign(Error('The browser could not create a Canvas 2D surface.'),{code:'CANVAS_UNAVAILABLE'});}
  const builder=window.Island3D.prototype;
  this.data=builder.world.call({}).data;
  const W=window.ISLAND_WORLD;W.softwareChunks??=chunksFor(this.data);this.chunks=W.softwareChunks;
  this.itemMeshes=items.map(o=>new Float32Array(builder.item.call({},o).data));this.itemVersions=items.map(o=>o.meshVersion||0);
  this.unsubscribeQuality=window.ISLAND_GRAPHICS.onChange(s=>this.setQuality(s));this.setQuality(window.ISLAND_GRAPHICS.current);this.loadTextures();
 }
 setQuality(settings){this.settings={...settings,trace:0};this.resize();this.lastFrame=-Infinity;}
 resize(){
  const height={low:180,balanced:216,high:240,ultra:270}[window.ISLAND_GRAPHICS.selected]||216;
  const width=Math.min(640,Math.round(height*innerWidth/innerHeight));
  if(this.canvas.width===width&&this.canvas.height===height&&this.image)return;
  this.canvas.width=width;this.canvas.height=height;this.image=this.ctx.createImageData(width,height);this.depth=new Float32Array(width*height);this.beam=new Float32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){let d=Math.hypot((x+.5-width/2)/height,(y+.5-height/2)/height),t=clamp((d-.24)/.07,0,1);this.beam[y*width+x]=1-t*t*(3-2*t);}
 }
 loadTextures(){
  if(typeof Image==='undefined')return;
  ['textures/forest/diffuse.jpg','textures/concrete_wall_006_diffuse.jpg','textures/wood_planks_grey_diffuse.jpg'].forEach((url,index)=>{
   let image=new Image();image.onload=()=>{if(this.disposed)return;try{let surface=document.createElement('canvas');surface.width=surface.height=256;let ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,256,256);this.textures[index]=ctx.getImageData(0,0,256,256).data;surface.width=surface.height=1;this.materials.loaded++;this.lastFrame=-Infinity;}catch(error){console.warn('Basic texture load: '+error.message);}};image.src=url;
  });
 }
 getCharacter(kind){if(!this.characters.has(kind))this.characters.set(kind,new Float32Array(window.Island3D.prototype.character.call({},0,false,kind).data));return this.characters.get(kind);}
 project(x,y,z,u,v){
  const q=this.view,dx=x-q.x,dy=y-q.height,dz=z-q.z,horizontal=dx*q.ca+dz*q.sa;
  const xx=-dx*q.sa+dz*q.ca,yy=dy*q.cp-horizontal*q.sp,cr=Math.cos(q.roll||0),sr=Math.sin(q.roll||0);return [xx*cr+yy*sr,-xx*sr+yy*cr,horizontal*q.cp+dy*q.sp,u,v];
 }
 triangle(data,at,model,highlight=0){
  const q=this.view,material=data[at+9],layer=material>4.5&&material<5.5?0:material>.5&&material<2.5?1:material>2.5&&material<3.5?2:-1;
  let nx=data[at+3],ny=data[at+4],nz=data[at+5],ca=model?.ca??1,sa=model?.sa??0;
  const normalX=nx*ca+nz*sa,normalZ=-nx*sa+nz*ca;
  let axis=Math.abs(ny)>=Math.abs(nx)&&Math.abs(ny)>=Math.abs(nz)?1:Math.abs(nx)>=Math.abs(nz)?0:2,scale=layer===0?.68:layer===1?.6:.7;
  let vertices=[],minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,cx=0,cy=0,cz=0;
  for(let i=0;i<3;i++){
   let offset=at+i*10,x=data[offset],y=data[offset+1],z=data[offset+2];
   if(model?.matrix){if(model.curl&&z>.04){const t=Math.max(0,Math.min(1,(z-.04)/.13)),a=model.curl*t*1.5,yy=y,zz=z-.04;y=yy*Math.cos(a)-zz*Math.sin(a);z=yy*Math.sin(a)+zz*Math.cos(a)+.04;}const m=model.matrix,xx=m[0]*x+m[4]*y+m[8]*z+m[12],yy=m[1]*x+m[5]*y+m[9]*z+m[13];z=m[2]*x+m[6]*y+m[10]*z+m[14];x=xx;y=yy;}else if(model){if(model.kind&&y>(model.kind==='hawking'?1.15:1.5)){const pivot=model.kind==='hawking'?1.13:1.48,hy=-(model.headYaw||0),hp=model.headPitch||0,hc=Math.cos(hy),hs=Math.sin(hy),pc=Math.cos(hp),ps=Math.sin(hp),xx=x*hc+(z-.025)*hs,zz=-x*hs+(z-.025)*hc,yy=y-pivot;x=xx;y=yy*pc+zz*ps+pivot;z=-yy*ps+zz*pc+.025;}if(model.kind&&y<.78&&model.kind!=='hawking')z+=Math.sin(q.time*(model.chase?10:5))*Math.sign(x)*(.78-y)*.22;let xx=x*ca+z*sa;z=-x*sa+z*ca+model.z;x=xx+model.x;y+=model.y;}
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);cx+=x;cy+=y;cz+=z;
   vertices.push(this.project(x,y,z,(axis===0?z:x)*scale,(axis===1?z:y)*scale));
  }
  if(Math.max(minX-q.x,0,q.x-maxX)**2+Math.max(minZ-q.z,0,q.z-maxZ)**2>q.reach*q.reach)return;
  if(vertices.every(p=>p[2]<near)||vertices.every(p=>p[0]<-p[2]*q.halfX)||vertices.every(p=>p[0]>p[2]*q.halfX)||vertices.every(p=>p[1]<-p[2]*q.halfY)||vertices.every(p=>p[1]>p[2]*q.halfY))return;
  cx=cx/3-q.x;cy=cy/3-q.height;cz=cz/3-q.z;let length=Math.hypot(cx,cy,cz)||1;
  let shade=q.day?.36+Math.abs(-.4*normalX+.85*ny+.35*normalZ)*.68:.1+Math.abs((cx*normalX+cy*ny+cz*normalZ)/length)*.9;
  if(q.menu)shade*=.29;
  const color=[data[at+6],data[at+7],data[at+8]];
  if(highlight){color[0]=color[0]*(1-highlight*.35)+.75*highlight*.35;color[1]=color[1]*(1-highlight*.35)+.62*highlight*.35;}
  vertices=clipped(vertices);for(let i=1;i<vertices.length-1;i++)this.raster(vertices[0],vertices[i],vertices[i+1],color,model?.outline?null:this.textures[layer],shade,highlight,model?.outline?model.backfaces:null);
 }
 raster(a,b,c,color,texture,shade,highlight,outlineBackfaces=null){
  const width=this.canvas.width,height=this.canvas.height,q=this.view,zoom=q.zoom;
  let points=[a,b,c].map(p=>{let iz=1/p[2];return [width/2+p[0]*iz*zoom,height/2-p[1]*iz*zoom,iz,p[3]*iz,p[4]*iz];});[a,b,c]=points;
  let area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<.15||outlineBackfaces===true&&area<0)return;if(area<0){[b,c]=[c,b];area=-area;}
  const edge=(p,r,x,y)=>(r[0]-p[0])*(y-p[1])-(r[1]-p[1])*(x-p[0]);
  let x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  if(!q.day){x0=Math.max(x0,Math.floor(width/2-height*.31));x1=Math.min(x1,Math.ceil(width/2+height*.31));y0=Math.max(y0,Math.floor(height*.19));y1=Math.min(y1,Math.ceil(height*.81));}
  if(x1<x0||y1<y0)return;
  const invArea=1/area,dx0=-(c[1]-b[1])*invArea,dy0=(c[0]-b[0])*invArea,dx1=-(a[1]-c[1])*invArea,dy1=(a[0]-c[0])*invArea;
  let row0=edge(b,c,x0+.5,y0+.5)*invArea,row1=edge(c,a,x0+.5,y0+.5)*invArea,pixels=this.image.data,depth=this.depth,beam=this.beam;
  this.drawTriangles++;
  for(let y=y0;y<=y1;y++,row0+=dy0,row1+=dy1){let w0=row0,w1=row1;for(let x=x0;x<=x1;x++,w0+=dx0,w1+=dx1){
   let w2=1-w0-w1;if(w0<-.00001||w1<-.00001||w2<-.00001)continue;let index=y*width+x;if(!q.day&&beam[index]===0)continue;
   let inverse=w0*a[2]+w1*b[2]+w2*c[2];if(inverse<=depth[index])continue;let z=1/inverse;if(z>q.reach)continue;if(outlineBackfaces===null)depth[index]=inverse;
   let r=color[0]*255,g=color[1]*255,blue=color[2]*255;if(outlineBackfaces!==null){const at=index*4,light=q.day?1:beam[index];pixels[at]=r*light;pixels[at+1]=g*light;pixels[at+2]=blue*light;continue;}
   if(texture){let u=(w0*a[3]+w1*b[3]+w2*c[3])*z,v=(w0*a[4]+w1*b[4]+w2*c[4])*z,ti=(((Math.floor(v*256)&255)*256)+(Math.floor(u*256)&255))*4;r=texture[ti]*.88;g=texture[ti+1]*.88;blue=texture[ti+2]*.85;}
   let light=shade;if(!q.day)light*=Math.min(2.2,12/(1+z*.45+z*z*.16))*beam[index];let at=index*4;
   if(q.day){let fog=1-Math.exp(-z*.002);pixels[at]=r*light*(1-fog)+100*fog;pixels[at+1]=g*light*(1-fog)+125*fog;pixels[at+2]=blue*light*(1-fog)+130*fog;}
   else{pixels[at]=Math.sqrt(Math.max(0,r*light)/255)*255;pixels[at+1]=Math.sqrt(Math.max(0,g*light*.91)/255)*255;pixels[at+2]=Math.sqrt(Math.max(0,blue*light*.76)/255)*255;if(q.candle){pixels[at]*=.85;pixels[at+1]*=.49;pixels[at+2]*=.20;}}
  }}
 }
 mesh(data,model,highlight=0){for(let at=0;at<data.length;at+=30)this.triangle(data,at,model,highlight);}
 render(state,force=false){
  if(this.disposed)return;const start=performance.now(),key=[state.menu,state.flashlight,state.daylight,state.hitbox,state.outline?.id,state.outline?.version].join('/');if(!force&&start-this.lastFrame<50&&this.lastKey===key)return;this.lastKey=key;this.lastFrame=start;this.resize();
  const c=state.camera,width=this.canvas.width,height=this.canvas.height,day=state.menu||state.daylight,cp=Math.cos(c.pitch||0),sp=Math.sin(c.pitch||0),ca=Math.cos(c.a),sa=Math.sin(c.a),zoom=height/(2*Math.tan(65*Math.PI/360));
  const halfX=day?width/(2*zoom):height*.31/zoom,halfY=day?height/(2*zoom):height*.31/zoom;
  this.view={x:c.x,z:c.y,height:c.height,roll:c.roll||0,ca,sa,cp,sp,zoom,halfX,halfY,reach:day?100:state.candle?9:36,candle:!!state.candle,day,menu:state.menu,time:state.time};
  this.drawTriangles=0;this.visibleChunks=0;this.depth.fill(0);let pixels=this.image.data;
  for(let y=0;y<height;y++){let horizon=y/height,sky=day?(state.menu?.24:1):0,r=sky*(65+35*horizon),g=sky*(90+32*horizon),b=sky*(102+30*horizon);for(let x=0;x<width;x++){let i=(y*width+x)*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=255;}}
  if(state.flashlight||day){
   const forward=[ca*cp,sp,sa*cp],r0=[-sa,0,ca],u0=[-ca*sp,cp,-sa*sp],cr=Math.cos(c.roll||0),sr=Math.sin(c.roll||0),right=r0.map((v,i)=>v*cr+u0[i]*sr),up=u0.map((v,i)=>v*cr-r0[i]*sr),planes=[forward];for(let sign of [-1,1]){planes.push(forward.map((v,i)=>v*halfX+right[i]*sign));planes.push(forward.map((v,i)=>v*halfY+up[i]*sign));}
   const visible=cell=>planes.every(n=>n[0]*((n[0]>=0?cell.x1:cell.x0)-c.x)+n[1]*((n[1]>=0?cell.y1:cell.y0)-c.height)+n[2]*((n[2]>=0?cell.z1:cell.z0)-c.y)>=0);
   let reach=this.view.reach,cells=this.chunks.map(cell=>({cell,d:Math.max(cell.x0-c.x,0,c.x-cell.x1)**2+Math.max(cell.z0-c.y,0,c.y-cell.z1)**2})).filter(o=>o.d<=reach*reach&&visible(o.cell)).sort((a,b)=>a.d-b.d);
   for(let {cell} of cells){this.visibleChunks++;for(let at of cell.indices)this.triangle(this.data,at);}
   for(let i=0;i<this.items.length;i++){let item=this.items[i],d=Math.hypot(item.x-c.x,item.y-c.y);if(!item.taken&&d<reach+3){if(this.itemVersions[i]!==item.meshVersion&&item.meshVersion!==undefined){this.itemMeshes[i]=new Float32Array(window.Island3D.prototype.item.call({},item).data);this.itemVersions[i]=item.meshVersion;}this.mesh(this.itemMeshes[i],null,0);}}
   const I=window.ISLAND_IMMERSION;if(I){for(const part of I.draws(window.IslandGeometry,c,reach))this.mesh(part.data,part.model,0);this.mesh(I.trackMesh(window.IslandGeometry),null);}
   for(let e of [state.enemy,...state.enemies||[],...state.illusions||[],...state.players||[]].filter(e=>e&&!e.hidden)){if(!e||Math.hypot(e.x-c.x,e.y-c.y)>reach+3)continue;let next=e.path?.[0],angle=Number.isFinite(e.facing)?Math.PI/2-e.facing:e.state==='chase'?Math.atan2(c.x-e.x,c.y-e.y):next?Math.atan2(next.x-e.x,next.y-e.y):Math.atan2(c.x-e.x,c.y-e.y);this.mesh(this.getCharacter(e.kind||'epstein'),{x:e.x,y:e.feet??window.ISLAND_WORLD.heightAt(e.x,e.y),z:e.y,ca:Math.cos(angle),sa:Math.sin(angle),kind:e.kind,headYaw:e.headYaw||0,headPitch:e.headPitch||0,chase:e.state==='chase'});}
  }
  this.outlineTriangles=0;if(state.outline&&!state.menu&&(state.flashlight||day)){const before=this.drawTriangles;for(const part of state.outline.parts)this.mesh(part.data,{x:0,y:0,z:0,ca:1,sa:0,...part.model,outline:true,backfaces:part.backfaces});this.outlineTriangles=this.drawTriangles-before;}
  if(state.introParts?.length){const menu=this.view.menu;this.view.menu=false;for(const part of state.introParts)this.mesh(part.data,{matrix:part.matrix,curl:part.curl});this.view.menu=menu;}this.ctx.putImageData(this.image,0,0);
  if(state.hitbox){this.ctx.strokeStyle='#ff3920';this.ctx.lineWidth=1;for(let e of [state.enemy,...state.enemies||[]])if(e){let base=e.feet??window.ISLAND_WORLD.heightAt(e.x,e.y),shape=window.ISLAND_CONTACT.body(e.kind),last=null;for(let y of [0,shape.height]){last=null;this.ctx.beginPath();for(let i=0;i<=24;i++){let a=i*Math.PI/12,p=this.project(e.x+Math.cos(a)*shape.radius,base+y,e.y+Math.sin(a)*shape.radius,0,0);if(p[2]<near){last=null;continue;}let x=width/2+p[0]/p[2]*zoom,sy=height/2-p[1]/p[2]*zoom;last?this.ctx.lineTo(x,sy):this.ctx.moveTo(x,sy);last=p;}this.ctx.stroke();}}}
  this.cpuMs=performance.now()-start;const readout=document.querySelector('#performanceReadout');if(readout)readout.textContent='BASIC 3D · '+width+'×'+height+' · CPU '+this.cpuMs.toFixed(0)+' ms';
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.unsubscribeQuality?.();this.canvas.remove();}
 get diagnostics(){return{engine:'Canvas 2D / software 3D triangles',software:true,staticTriangles:this.data.length/30,submittedTriangles:this.drawTriangles,outlineTriangles:this.outlineTriangles||0,visibleChunks:this.visibleChunks,totalChunks:this.chunks.length,textureMapsLoaded:this.materials.loaded,textureResolution:256,quality:window.ISLAND_GRAPHICS.selected,rayTracedTriangles:0,world:window.ISLAND_WORLD.stats};}
};
})();

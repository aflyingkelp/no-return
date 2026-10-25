'use strict';
// Static scene BVH for actual triangle intersection in the Ultra lighting pass.
// Software rays in WebGL2, not hardware RTX. Animated meshes use shadow maps.
window.IslandRayLighting=class {
 constructor(gl,geometry){
  const src=geometry.data,triangles=[];
  for(let i=0;i<src.length;i+=30){let mat=src[i+9];if(mat>=6.5)continue;let a=src.slice(i,i+3),b=src.slice(i+10,i+13),c=src.slice(i+20,i+23);triangles.push({a,b,c,color:src.slice(i+6,i+9),center:a.map((v,j)=>(v+b[j]+c[j])/3),min:a.map((v,j)=>Math.min(v,b[j],c[j])),max:a.map((v,j)=>Math.max(v,b[j],c[j]))});}
  const nodes=[],ordered=[];
  function build(list){let id=nodes.length,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let t of list)for(let j=0;j<3;j++){min[j]=Math.min(min[j],t.min[j]);max[j]=Math.max(max[j],t.max[j]);}let node={min,max,left:0,right:0};nodes.push(node);if(list.length<=6){node.left=-ordered.length-1;node.right=list.length;ordered.push(...list);}else{let ext=min.map((v,j)=>max[j]-v),axis=ext.indexOf(Math.max(...ext));list.sort((a,b)=>a.center[axis]-b.center[axis]);let middle=list.length>>1;node.left=build(list.slice(0,middle));node.right=build(list.slice(middle));}return id;}
  build(triangles);const bounds=new Float32Array(nodes.length*8),verts=new Float32Array(ordered.length*16);nodes.forEach((n,i)=>bounds.set([...n.min,n.left,...n.max,n.right],i*8));ordered.forEach((t,i)=>verts.set([...t.a,0,...t.b,0,...t.c,0,...t.color,0],i*16));
  const texture=data=>{let width=1024,height=Math.ceil(data.length/4/width),padded=new Float32Array(width*height*4);padded.set(data);let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,width,height,0,gl.RGBA,gl.FLOAT,padded);for(let p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
  this.bounds=texture(bounds);this.triangles=texture(verts);this.count=ordered.length;this.nodes=nodes.length;
 }
};
window.ISLAND_RAY_GLSL=`
uniform sampler2D uBounds,uTriangles;uniform float uTrace;
vec4 fetchRay(sampler2D tex,int index){return texelFetch(tex,ivec2(index%1024,index/1024),0);}
bool rayBox(vec3 ro,vec3 inv,vec3 lo,vec3 hi,float limit){vec3 a=(lo-ro)*inv,b=(hi-ro)*inv,mn=min(a,b),mx=max(a,b);return max(max(mn.x,mn.y),max(mn.z,0.))<=min(min(mx.x,mx.y),min(mx.z,limit));}
bool intersectScene(vec3 ro,vec3 rd,float limit,out vec3 hp,out vec3 hn,out vec3 hc){
 int stack[48];stack[0]=0;int top=1;float nearest=limit;bool found=false;vec3 inv=1./(rd+vec3(.0000001));
 for(int visit=0;visit<320;visit++){if(top<=0)break;int node=stack[--top];vec4 lo=fetchRay(uBounds,node*2),hi=fetchRay(uBounds,node*2+1);if(!rayBox(ro,inv,lo.xyz,hi.xyz,nearest))continue;
  if(lo.w>=0.){if(top<46){stack[top++]=int(hi.w);stack[top++]=int(lo.w);}continue;}
  int first=int(-lo.w)-1;for(int j=0;j<6;j++){if(j>=int(hi.w))break;int index=(first+j)*4;vec3 a=fetchRay(uTriangles,index).xyz,b=fetchRay(uTriangles,index+1).xyz,c=fetchRay(uTriangles,index+2).xyz,e1=b-a,e2=c-a,q=cross(rd,e2);float det=dot(e1,q);if(abs(det)<.00000001)continue;float invDet=1./det;vec3 s=ro-a;float u=dot(s,q)*invDet;if(u<0.||u>1.)continue;vec3 r=cross(s,e1);float v=dot(rd,r)*invDet;if(v<0.||u+v>1.)continue;float t=dot(e2,r)*invDet;if(t>.012&&t<nearest){nearest=t;hp=ro+rd*t;hn=normalize(cross(e1,e2));if(dot(hn,rd)>0.)hn=-hn;hc=fetchRay(uTriangles,index+3).xyz;found=true;}}
 }return found;
}
vec3 cosineRay(vec3 normal,vec2 rnd){float r=sqrt(rnd.x),a=6.283185*rnd.y;vec3 tangent=normalize(cross(abs(normal.y)<.9?vec3(0,1,0):vec3(1,0,0),normal));return normalize(tangent*r*cos(a)+cross(normal,tangent)*r*sin(a)+normal*sqrt(1.-rnd.x));}
vec3 tracedLight(vec3 pos,vec3 normal,vec3 albedo,vec3 eye,vec3 light,vec3 direction,float day){
 vec3 throughput=albedo,radiance=vec3(0),origin=pos+normal*.025,n=normal;
 for(int bounce=0;bounce<2;bounce++){
  vec2 seed=gl_FragCoord.xy+vec2(float(bounce)*71.2);vec3 ray=cosineRay(n,vec2(hash(vec3(seed,1.3)),hash(vec3(seed.yx,5.7))));vec3 hp,hn,hc;
  if(!intersectScene(origin,ray,18.,hp,hn,hc)){if(day>.5)radiance+=throughput*vec3(.16,.20,.23);break;}
  vec3 toLight=light-hp;float d=length(toLight);vec3 L=toLight/max(d,.001),unusedP,unusedN,unusedC;float visibility=intersectScene(hp+hn*.03,L,max(.02,d-.06),unusedP,unusedN,unusedC)?0.:1.;
  float cone=smoothstep(.90,.98,dot(-L,direction));vec3 direct=day>.5?hc*.45:hc*max(0.,dot(hn,L))*cone*visibility*16./(1.+d*.45+d*d*.16)*vec3(1.,.91,.76);radiance+=throughput*direct*.45;throughput*=hc*.55;origin=hp+hn*.025;n=hn;
 }return radiance;
}`;

'use strict';
window.IslandMaterials=class {
 constructor(gl){this.ready=false;this.loaded=0;this.textures=[];this.anisotropy=gl.getExtension?.('EXT_texture_filter_anisotropic');if(typeof Image==='undefined')return;
  let size=window.ISLAND_GRAPHICS.compatibility?512:2048;let assets=['forest','concrete_wall_006','wood_planks_grey'],channels=['diffuse','nor_gl','rough'];
  channels.forEach((channel,index)=>{let channelsPerPixel=[3,2,1][index],format=[gl.RGB,gl.RG,gl.RED][index],internal=[gl.RGB8,gl.RG8,gl.R8][index];let texture=gl.createTexture();this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,Math.log2(size)+1,internal,size,size,3);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);if(this.anisotropy)gl.texParameterf(gl.TEXTURE_2D_ARRAY,this.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   assets.forEach((asset,layer)=>{let image=new Image();image.onload=()=>{if(gl.isContextLost?.())return;let canvas=document.createElement('canvas');canvas.width=canvas.height=size;let ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);let pixels=ctx.getImageData(0,0,size,size).data,packed=new Uint8Array(size*size*channelsPerPixel);for(let src=0,dst=0;src<pixels.length;src+=4)for(let c=0;c<channelsPerPixel;c++)packed[dst++]=pixels[src+c];gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,size,size,1,format,gl.UNSIGNED_BYTE,packed);canvas.width=canvas.height=1;this.loaded++;this.channelLoaded??=[0,0,0];this.channelLoaded[index]++;if(this.channelLoaded[index]===3)gl.generateMipmap(gl.TEXTURE_2D_ARRAY);this.ready=this.loaded===9;};image.onerror=()=>console.warn('Material unavailable: '+asset+' '+channel);image.src=asset==='forest'?'textures/forest/'+channel+'.jpg':'textures/'+asset+'_'+channel+'.jpg';});
  });
 }
 bind(gl,program){gl.uniform1f(gl.getUniformLocation(program,'uTexturesReady'),this.ready?1:0);for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+3+i);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.textures[i]||null);gl.uniform1i(gl.getUniformLocation(program,['uAlbedoMaps','uNormalMaps','uRoughMaps'][i]),3+i);}}
};
window.ISLAND_MATERIAL_GLSL=`
precision highp sampler2DArray;uniform highp sampler2DArray uAlbedoMaps,uNormalMaps,uRoughMaps;uniform float uTexturesReady,uTextureBias;
void surfaceMaps(vec3 p,float material,inout vec3 albedo,inout vec3 n,inout float roughness){
 if(uTexturesReady<.5)return;float layer=-1.,scale=1.;if(material>4.5&&material<5.5){layer=0.;scale=.68;}if(material>.5&&material<2.5){layer=1.;scale=.6;}if(material>2.5&&material<3.5){layer=2.;scale=.7;}if(layer<0.)return;
 vec3 axis=abs(n);vec2 uv;vec3 tangent,bitangent;
 if(axis.y>=axis.x&&axis.y>=axis.z){uv=p.xz*scale;tangent=vec3(1,0,0);bitangent=vec3(0,0,-sign(n.y));}
 else if(axis.x>=axis.z){uv=p.zy*scale;tangent=vec3(0,0,1);bitangent=vec3(0,-sign(n.x),0);}
 else{uv=p.xy*scale;tangent=vec3(1,0,0);bitangent=vec3(0,sign(n.z),0);}
 vec3 color=texture(uAlbedoMaps,vec3(uv,layer),uTextureBias).rgb;vec2 normalXY=texture(uNormalMaps,vec3(uv,layer),uTextureBias).rg*2.-1.;vec3 mapped=vec3(normalXY,sqrt(max(.01,1.-dot(normalXY,normalXY))));roughness=clamp(texture(uRoughMaps,vec3(uv,layer),uTextureBias).r,.25,.95);n=normalize(tangent*mapped.x*.75+bitangent*mapped.y*.75+n*max(.3,mapped.z));
 albedo=color*(layer<.5?vec3(.85,.86,.80):vec3(.90));
}`;

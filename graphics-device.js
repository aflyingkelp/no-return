'use strict';
window.IslandDevice={
 wrap(owner,raw){
  const types={createProgram:'deleteProgram',createShader:'deleteShader',createBuffer:'deleteBuffer',createTexture:'deleteTexture',createVertexArray:'deleteVertexArray',createFramebuffer:'deleteFramebuffer',createQuery:'deleteQuery',createRenderbuffer:'deleteRenderbuffer'};
  const resources=new Map(Object.entries(types).map(([create,remove])=>[remove,new Set()])),methods=new Map();owner.deviceResources=resources;owner.rawGL=raw;
  owner.releaseDevice=()=>{if(owner.disposed)return;owner.disposed=true;for(let[remove,objects]of resources){for(let object of objects)try{raw[remove](object);}catch{}objects.clear();}};
  return new Proxy(raw,{get(target,key){if(key==='isContextLost')return()=>!!owner.disposed||!!owner.contextLost||!!target.isContextLost?.();let value=target[key];if(typeof value!=='function')return value;if(methods.has(key))return methods.get(key);let method;
   if(types[key])method=(...args)=>{let object=value.apply(target,args);if(object)resources.get(types[key]).add(object);return object;};
   else if(resources.has(key))method=(object)=>{resources.get(key).delete(object);return value.call(target,object);};
   else method=value.bind(target);methods.set(key,method);return method;}});
 },
 beginFrame(gl){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.drawBuffers([gl.BACK]);gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.colorMask(true,true,true,true);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);}
};

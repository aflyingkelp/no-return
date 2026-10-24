'use strict';
window.ISLAND_STARTUP={
 show(error){
  const unavailable=error.code==='CANVAS_UNAVAILABLE',lost=error.code==='CONTEXT_LOST',panel=document.querySelector('#startupHelp');
  document.querySelector('#start').disabled=true;
  document.querySelector('#start').textContent=unavailable?'BROWSER CANVAS UNAVAILABLE':'GAME RENDERING ERROR';
  document.querySelector('.intro').textContent=unavailable?'The browser refused a basic drawing canvas. Reload the page to try again.':'The renderer encountered an error. Your game state is preserved while it recovers.';
  panel.hidden=false;
  document.querySelector('#startupMessage').textContent='Basic 3D works without WebGL. If retrying still fails, copy the technical error below.';
  document.querySelector('#startupDetails').textContent=['NO RETURN / BASIC 5','Category: '+(error.code||'RENDERER_STARTUP'),error.message,error.detail||''].filter(Boolean).join('\n');
  document.querySelector('#retryGraphics').onclick=()=>location.reload();
  document.querySelector('#safeGraphics').onclick=()=>{try{localStorage.setItem('no-return-basic-renderer','1');localStorage.setItem('no-return-graphics','low');}catch{}location.reload();};
  document.querySelector('#copyGraphicsError').onclick=async()=>{try{await navigator.clipboard.writeText(document.querySelector('#startupDetails').textContent);document.querySelector('#copyGraphicsError').textContent='ERROR COPIED';}catch{document.querySelector('#startupDetails').focus();document.querySelector('#startupMessage').textContent='Select and copy the technical details below.';}};
 }
};

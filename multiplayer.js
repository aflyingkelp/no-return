'use strict';
(() => {
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function create(api){
 const $=s=>document.querySelector(s);let socket=null,generation=0,session=null,lobby=null,state=null,active=false,connected=false,ready=false,seq=0,inputClock=0,retries=0,retryTimer=null,serverUrl='',configured=false,lastPing=0,latency=0,started=false;
 let pending=[],remote=[],roomCode='',lastStateAt=0,lastLobbyKey='',spectatorId=null;
 const safeStore=(key,value)=>{try{if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
 try{session=JSON.parse(sessionStorage.getItem('no-return-coop-session')||'null');}catch{}
 function status(text,error=false){$('#mpStatus').textContent=text;$('#mpStatus').classList.toggle('error',error);$('#coopConnection').textContent=text;}
 function selectTab(tab){const multi=tab==='multiplayer';$('#menu').classList.toggle('coop-menu',multi);$('.menu-landing').scrollTop=0;$('#soloPanel').hidden=multi;$('#multiplayerPanel').hidden=!multi;$('#soloTab').setAttribute('aria-selected',String(!multi));$('#multiplayerTab').setAttribute('aria-selected',String(multi));if(multi&&!configured)status('Choose a server below to connect.');}
 function send(data){if(socket?.readyState===1){socket.send(JSON.stringify(data));return true;}return false;}
 function endpoint(){const text=($('#mpServer').value||serverUrl).trim();if(!text)throw Error('The online server is not configured yet. Add its Render address below.');const u=new URL(text==='auto'?location.origin:text);if(!['http:','https:','ws:','wss:'].includes(u.protocol)||u.username||u.password)throw Error('Use an HTTPS or WSS server address.');if(location.protocol==='https:'&&['http:','ws:'].includes(u.protocol))throw Error('Online servers must use HTTPS or WSS.');u.protocol=u.protocol==='https:'||u.protocol==='wss:'?'wss:':'ws:';u.pathname='/ws';u.search='';u.hash='';return u.href;}
 function connect(kind){let url;try{url=endpoint();}catch(e){status(e.message,true);return;}generation++;const current=generation;socket?.close();clearTimeout(retryTimer);connected=false;status(retries?'Reconnecting… the island is still running.':'Connecting… a sleeping server may take a minute.');$('#mpCreate').disabled=true;$('#mpJoin').disabled=true;
  try{socket=new WebSocket(url);}catch(e){status('Could not open the connection. Check the server address.',true);return;}
  socket.onopen=()=>{if(current!==generation)return;connected=true;if(kind==='reconnect'&&session)send({type:'reconnect',protocol:1,code:session.code,token:session.token});else send({type:kind,protocol:1,name:$('#mpName').value,code:$('#mpCode').value});};
  socket.onmessage=event=>{if(current!==generation)return;let data;try{data=JSON.parse(event.data);}catch{return;}
   if(data.type==='welcome'){session={id:data.id,token:data.token,code:data.code,url};safeStore('no-return-coop-session',session);roomCode=data.code;retries=0;seq=0;pending=[];status('Connected · private room '+roomCode);$('#mpEntry').hidden=true;$('#mpLobby').hidden=false;$('#mpRoomCode').textContent=roomCode;$('#mpReconnect').hidden=true;return;}
   if(data.type==='lobby'){lobby=data;ready=!!data.players.find(q=>q.id===session?.id)?.ready;drawLobby();return;}
   if(data.type==='started'){begin();return;}
   if(data.type==='state'){if(!data.you)return;seq=Math.max(seq,data.you.seq);pending=pending.filter(q=>q.seq>data.you.seq);if(!started&&!data.result)begin();lastStateAt=performance.now();state=data;applyRemote(data);api.state(data,session.id);drawTeam();return;}
   if(data.type==='pong'){latency=Math.max(0,Date.now()-Number(data.at));return;}
   if(data.type==='error'){status(data.text,true);$('#mpCreate').disabled=false;$('#mpJoin').disabled=false;if(/expired|not found|version changed/.test(data.text)){session=null;safeStore('no-return-coop-session',null);if(active)api.disconnected(data.text);generation++;socket.close();}return;}
   if(data.type==='left')return;
   if(data.type==='ended'){api.ended(data);return;}
   if(data.type==='toast')api.toast(data.text);
   else if(data.type==='captured')api.captured(data.kind);
   else if(data.type==='rescued')api.rescued();
   else if(data.type==='eliminated')api.eliminated();
   else if(data.type==='read')api.read(data.id);
   else if(data.type==='map')api.map();
   else if(data.type==='sound')api.sound(...data.args);
   else if(data.type==='rustle')api.rustle(...data.args);
   else if(data.type==='scare')api.scare(data.kind,data.meta);
  };
  socket.onclose=()=>{if(current!==generation)return;connected=false;api.stopInput();$('#mpCreate').disabled=false;$('#mpJoin').disabled=false;if(session&&retries<9){retries++;status('Connection lost · reconnecting ('+retries+'/9)…',true);retryTimer=setTimeout(()=>connect('reconnect'),Math.min(8000,600*2**retries));}else{status('Disconnected. Create or join another room.',true);if(active)api.disconnected('The server connection ended.');}};
  socket.onerror=()=>status('Waiting for the server… check the address if this continues.',true);
 }
 function begin(){if(started)return;started=true;active=true;$('#coopHud').hidden=false;$('#tradeButton').hidden=false;api.begin();}
 function spectated(){if(!state||state.you.status!=='dead')return null;let choices=state.players.filter(q=>q.id!==session?.id&&q.status==='alive');if(!choices.length)choices=state.players.filter(q=>q.id!==session?.id&&q.status==='captured');let q=choices.find(q=>q.id===spectatorId)||choices[0];spectatorId=q?.id||null;return q||null;}
 function cycleSpectator(step){const choices=state?.players.filter(q=>q.id!==session?.id&&q.status==='alive')||[];if(choices.length)spectatorId=choices[(choices.findIndex(q=>q.id===spectatorId)+step+choices.length)%choices.length].id;drawTeam();}
 function drawLobby(){const key=JSON.stringify(lobby);if(key===lastLobbyKey)return;lastLobbyKey=key;const me=session?.id;
  $('#mpPlayers').innerHTML=lobby.players.map(q=>'<li><i class="survivor-color color-'+q.slot+'"></i><span>'+esc(q.name)+(q.id===me?' <small>YOU</small>':'')+(q.id===lobby.host?' <small>HOST</small>':'')+'</span><b>'+(!q.connected?'RECONNECTING':q.ready?'READY':'WAITING')+'</b></li>').join('');
  for(let n=lobby.players.length;n<4;n++)$('#mpPlayers').innerHTML+='<li class="vacant"><i>+</i><span>Waiting for a survivor</span></li>';
  $('#mpHunterCount').value=String(lobby.hunterCount??4);$('#mpHunterCount').disabled=lobby.host!==me||lobby.phase!=='lobby';
  $('#mpReady').textContent=ready?'NOT READY':'READY UP';$('#mpReady').setAttribute('aria-pressed',String(ready));$('#mpReady').disabled=lobby.phase!=='lobby';$('#mpLaunch').hidden=lobby.host!==me;$('#mpLaunch').disabled=lobby.phase!=='lobby'||lobby.players.length<2||lobby.players.some(q=>!q.ready||!q.connected);
  $('#mpLobbyHint').textContent=lobby.phase==='lobby'?'Everyone must ready up. The host starts the run.':'Your run is in progress.';
 }
 function applyRemote(data){const prior=new Map(remote.map(q=>[q.id,q]));remote=data.players.filter(q=>q.id!==session.id).map(q=>{const old=prior.get(q.id);return{...q,kind:'survivor-'+q.slot+(q.crouch||q.status==='captured'?'-crouch':''),facing:q.p.a,x:old?.x??q.p.x,y:old?.y??q.p.y,feet:old?.feet??q.p.feet,hidden:q.p.hidden||q.p.closetId,headPitch:q.p.pitch,headYaw:0,state:q.running?'chase':'walk',target:q.p};});}
 function drawTeam(){if(!state)return;const watched=spectated();$('#spectatorControls').hidden=!watched;$('#spectateName').textContent=watched?'SPECTATING '+(lobby?.players.find(m=>m.id===watched.id)?.name||'Survivor'):'';$('#coopRoom').textContent='ROOM '+roomCode;$('#coopTeam').innerHTML=state.players.map(q=>{const member=lobby?.players.find(m=>m.id===q.id),distance=q.id===session.id?'YOU':Math.round(Math.hypot(q.p.x-state.you.p.x,q.p.y-state.you.p.y))+' m';return '<div class="team-member '+(q.status==='captured'?'down':'')+'"><i class="survivor-color color-'+q.slot+'"></i><span>'+esc(member?.name||'Survivor')+'</span><b>'+ (q.status==='captured'?'CAUGHT · '+Math.ceil(q.capturedLeft)+'s':q.status==='dead'?'LOST':distance)+'</b></div>';}).join('');$('#coopConnection').textContent=connected?'LIVE · '+latency+' ms':'RECONNECTING';}
 function frame(dt,input){if(!active)return;for(const q of remote){const amount=Math.min(1,dt*14);for(const k of ['x','y','feet'])q[k]+=(q.target[k]-q[k])*amount;q.facing=q.target.a;}
  inputClock+=dt;if(inputClock>=.05){inputClock%=.05;if(connected&&state&&!state.result){const packet={type:'input',seq:++seq,...input};send(packet);pending.push(packet);if(pending.length>40)pending.shift();}}
  if(Date.now()-lastPing>5000){lastPing=Date.now();send({type:'ping',at:lastPing});}
  if(connected&&state&&performance.now()-lastStateAt>3000)$('#coopConnection').textContent='WAITING FOR WORLD…';
 }
 function action(action,extra={}){if(!connected){api.toast('Connection lost. Reconnecting…');return;}send({type:'action',action,...extra});}
 function leave(){spectatorId=null;$('#spectatorControls').hidden=true;generation++;clearTimeout(retryTimer);send({type:'leave'});socket?.close();socket=null;session=null;lobby=null;state=null;active=false;started=false;connected=false;pending=[];remote=[];seq=0;retries=0;lastLobbyKey='';safeStore('no-return-coop-session',null);$('#coopHud').hidden=true;$('#tradeButton').hidden=true;$('#mpEntry').hidden=false;$('#mpLobby').hidden=true;$('#mpCreate').disabled=false;$('#mpJoin').disabled=false;status(configured?'Create a private room or join your friends.':'The online server is not configured yet.');}
 function trade(){if(!active||!state)return;const mine=state.players.find(q=>q.id===session.id),nearby=state.players.filter(q=>q.id!==session.id&&q.status==='alive'&&Math.hypot(q.p.x-mine.p.x,q.p.y-mine.p.y)<2.8&&Math.abs(q.p.feet-mine.p.feet)<1),gear=Object.entries(state.you.bag.gear).filter(([id,n])=>n>0&&!['flashlight','map','knife'].includes(id));
  api.modal('<small>SUPPLIES / HAND TO HAND</small><h2>Keep each other alive.</h2><p>Stand within arm’s reach of a teammate on the same floor. One item is passed at a time. The island keeps moving.</p>'+(!nearby.length?'<p>No teammate within reach.</p>':!gear.length?'<p>No supplies to give yet. Search rooms and drawers.</p>':'<label class="mp-field">TEAMMATE<select id="tradeTarget">'+nearby.map(q=>'<option value="'+q.id+'">'+esc(lobby?.players.find(m=>m.id===q.id)?.name||'Survivor')+'</option>').join('')+'</select></label><label class="mp-field">ITEM<select id="tradeItem">'+gear.map(([id,n])=>'<option value="'+esc(id)+'">'+esc(window.ISLAND_SURVIVAL.definitions[id]?.name||id)+' ×'+n+'</option>').join('')+'</select></label><button id="tradeGive" class="primary">PASS ONE ITEM <span>↗</span></button>')+'<button id="tradeClose" class="secondary">BACK TO THE ISLAND</button>');
  $('#tradeClose').onclick=api.resume;if(nearby.length&&gear.length)$('#tradeGive').onclick=()=>{action('trade',{target:$('#tradeTarget').value,item:$('#tradeItem').value});api.resume();};
 }
 $('#soloTab').onclick=()=>selectTab('solo');$('#multiplayerTab').onclick=()=>selectTab('multiplayer');
 $('#mpCreate').onclick=()=>connect('create');$('#mpJoin').onclick=()=>{if(!$('#mpCode').value.trim()){status('Enter your friend’s eight-character room code.',true);return;}connect('join');};$('#mpCode').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,8);
 $('#mpHunterCount').onchange=e=>send({type:'settings',hunterCount:Number(e.target.value)});$('#spectatePrev').onclick=()=>cycleSpectator(-1);$('#spectateNext').onclick=()=>cycleSpectator(1);
 $('#mpReady').onclick=()=>send({type:'ready',ready:!ready});$('#mpLaunch').onclick=()=>send({type:'start'});$('#mpLeave').onclick=leave;$('#mpReconnect').hidden=!session;$('#mpReconnect').onclick=()=>{if(session?.url)$('#mpServer').value=session.url;connect('reconnect');};
 $('#mpCopy').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);status('Room code copied. Send it to your friends.');}catch{status('Room code: '+roomCode);}};$('#tradeButton').onclick=trade;
 $('#mpServer').onchange=()=>{try{localStorage.setItem('no-return-coop-server',$('#mpServer').value);}catch{}};
 try{serverUrl=localStorage.getItem('no-return-coop-server')||'';}catch{}$('#mpServer').value=serverUrl;
 if(typeof fetch==='function')fetch('multiplayer-config.json',{cache:'no-store'}).then(r=>r.json()).then(config=>{if(!serverUrl&&config.serverUrl){serverUrl=config.serverUrl;$('#mpServer').value=serverUrl;configured=true;$('#mpServerOptions').open=false;status('Create a private room or join your friends.');}else if(serverUrl){configured=true;status('Create a private room or join your friends.');}else{status('Online hosting is not connected yet. Add a server address below.');$('#mpServerOptions').open=true;}}).catch(()=>status('Add the online server address below to connect.'));
 return{frame,action,leave,trade,selectTab,get active(){return active;},get connected(){return connected;},get pending(){return pending;},get state(){return state;},get spectated(){return spectated();},get players(){return remote.filter(q=>q.status!=='dead');},get id(){return session?.id;},get lobby(){return lobby;},get code(){return roomCode;}};
}
window.ISLAND_MULTIPLAYER={create};
})();

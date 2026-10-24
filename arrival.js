'use strict';
// Authored first-person boat arrival: physical camera roll, simple round hands,
// removable cap, two separate cells and a timed light switch. Meshes are cached.
(() => {
const W=window.ISLAND_WORLD,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
let active=false,clock=0,cue=0,spawn=null,boat=null,meshes=null;
const stages=[
 [0,1.6,'Cold water. An engine ticking as it cools.'],
 [1.6,4.6,'Your eyes find the edge of the boat.'],
 [4.6,7.4,'You sit up. Something has been moving on the shore.'],
 [7.4,11.8,'Two dry batteries. The last things in your pocket.'],
 [11.8,14.2,'Thread the cap. Keep your hands steady.'],
 [14.2,17.5,'The dock is empty. You cannot stay here.']
];
const cues=[[.6,'breath'],[2.1,'creak'],[5.0,'creak'],[7.25,'cap'],[8.4,'cell'],[9.85,'cell'],[11.65,'cap'],[13.5,'switch'],[15.0,'step'],[16.1,'step']];
function start(player){spawn={...player};boat=W.items.find(i=>i.id==='boat');clock=0;cue=0;active=true;document.querySelector('#arrival').hidden=false;document.querySelector('#skipArrival').hidden=false;update(0,{});}
function stop(){active=false;document.querySelector('#arrival').hidden=true;document.querySelector('#skipArrival').hidden=true;document.body.classList.remove('arriving');}
function update(dt,ctx){if(!active)return;clock+=dt;document.body.classList.add('arriving');
 let open=0;if(clock>.35)open=smooth((clock-.35)/.6)*.52;if(clock>1.0)open=.52*(1-smooth((clock-1.0)/.22));if(clock>1.4)open=smooth((clock-1.4)/.75);if(clock>3.0&&clock<3.5)open=1-Math.sin((clock-3)/.5*Math.PI)*.92;if(clock>=3.5)open=1;
 for(const [id,sign]of[['#upperLid',-1],['#lowerLid',1]])document.querySelector(id).style.transform=`translateY(${sign*open*105}%)`;
 const stage=stages.find(s=>clock>=s[0]&&clock<s[1]);document.querySelector('#arrivalCaption').textContent=stage?.[2]||'';
 while(cue<cues.length&&clock>=cues[cue][0]){const kind=cues[cue++][1];if(kind==='breath')ctx.rustle?.(spawn.x,spawn.y,.7);else if(kind==='creak')ctx.sound?.(78,.7,.10,'triangle',39,spawn.x,spawn.y);else if(kind==='step')ctx.sound?.(74,.22,.22,'triangle',35,spawn.x,spawn.y);else ctx.sound?.(kind==='switch'?180:kind==='cell'?620:240,.10,kind==='switch'?.12:.075,'square',kind==='cell'?280:90,spawn.x,spawn.y);}
 if(clock>=17.5){stop();ctx.finish?.();}
}
function camera(){const a=spawn.a,x=boat?.x??spawn.x,z=boat?.y??spawn.y,base=W.heightAt(x,z),sit=smooth((clock-2.8)/3.2),stand=smooth((clock-13.8)/2.3),walk=smooth((clock-15.7)/1.8),looking=smooth((clock-6)/1.3),finish=smooth((clock-14.3)/2.8);
 return{x:mix(x+.17,spawn.x,walk),y:mix(z+.38,spawn.y,walk),height:mix(base+mix(.78,1.40,sit),spawn.feet+1.62,Math.max(stand,walk)),a:a+mix(-.55,.08,sit)*(1-finish),pitch:mix(mix(.72,-.20,sit),-.48,looking)*(1-finish)+spawn.pitch*finish,roll:mix(1.17,.04,sit)*(1-stand)+Math.sin(clock*.65)*.012*(1-finish)};
}
function geometry(){if(meshes)return meshes;const G=window.IslandGeometry,skin=[.40,.27,.19],metal=[.19,.22,.20];meshes={};
 for(const side of[-1,1]){const g=new G();g.sphere(0,0,0,.073,.061,.073,skin,12,8,10);meshes[side<0?'left':'right']=new Float32Array(g.data);}
 {const g=new G();g.beam([0,0,-.15],[0,0,.15],.047,.05,metal,16,3);for(let i=0;i<9;i++)g.beam([0,0,-.1+i*.017],[0,0,-.092+i*.017],.052,.052,[.10,.12,.11],12,3);g.beam([0,0,.15],[0,0,.21],.05,.077,[.24,.27,.23],16);g.beam([0,0,.211],[0,0,.22],.066,.066,[.55,.59,.46],16);g.box(0,.051,.045,.028,.018,.045,[.04,.05,.035]);meshes.flashlight=new Float32Array(g.data);}
 {const g=new G();g.beam([0,0,-.035],[0,0,.015],.051,.051,metal,14);for(let i=0;i<3;i++)g.beam([0,0,-.03+i*.013],[0,0,-.025+i*.013],.055,.055,[.10,.12,.10],14);meshes.cap=new Float32Array(g.data);}
 {const g=new G();g.beam([0,0,-.06],[0,0,.06],.022,.022,[.42,.39,.13],10);g.beam([0,0,.06],[0,0,.071],.014,.014,[.53,.55,.46],10);g.beam([0,0,-.065],[0,0,-.06],.023,.023,[.27,.29,.24],10);g.box(.022,0,0,.002,.018,.07,[.07,.09,.06]);meshes.cell=new Float32Array(g.data);}
 return meshes;
}
function matrix(c,offset,yaw=0,pitch=0,roll=0){const cp=Math.cos(c.pitch||0),sp=Math.sin(c.pitch||0),ca=Math.cos(c.a),sa=Math.sin(c.a),cr=Math.cos(c.roll||0),sr=Math.sin(c.roll||0),right=[-sa*cr-ca*sp*sr,cp*sr,ca*cr-sa*sp*sr],up=[sa*sr-ca*sp*cr,cp*cr,-ca*sr-sa*sp*cr],forward=[ca*cp,sp,sa*cp];
 const rotate=v=>{const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cz=Math.cos(roll),sz=Math.sin(roll),x=v[0]*cz-v[1]*sz,y=v[0]*sz+v[1]*cz,z=v[2],yy=y*cx-z*sx,zz=y*sx+z*cx;return[x*cy+zz*sy,yy,-x*sy+zz*cy];};const basis=[[1,0,0],[0,1,0],[0,0,1]].map(v=>{const q=rotate(v);return right.map((n,i)=>n*q[0]+up[i]*q[1]+forward[i]*q[2]);}),pos=[c.x,c.height,c.y].map((n,i)=>n+right[i]*offset[0]+up[i]*offset[1]+forward[i]*offset[2]);return new Float32Array([...basis[0],0,...basis[1],0,...basis[2],0,...pos,1]);
}
function parts(c){if(!active||clock<5.5||clock>15.6)return[];geometry();const raise=smooth((clock-5.5)/1.8),lower=smooth((clock-14.4)/1.2),inspect=1-smooth((clock-12.7)/1.1),yaw=Math.PI/2*inspect,body=[.15,-.48+.30*raise-.35*lower,.62],out=[],push=(key,pos,y=0,p=0,r=0)=>out.push({key,data:meshes[key],curl:0,matrix:matrix(c,pos,y,p,r)});
 push('right',[body[0]+.025,body[1]-.04,body[2]-.04],yaw,.20,-.22);push('flashlight',body,yaw);
 let left=[-.23,body[1]-.02,.60],capPos=[body[0]-.20,body[1],body[2]],capVisible=true;
 if(clock<7.7){const t=smooth((clock-6.8)/.9);left=[mix(-.23,capPos[0],t),body[1]-.02,.60];capPos[0]-=t*.10;}
 else if(clock<11.4){capVisible=false;const first=clock<9.6,t=smooth((clock-(first?8.0:9.6))/1.25),x=mix(body[0]-.40,body[0]-.14,t),cell=[x,body[1],body[2]];if(t<.99)push('cell',cell,Math.PI/2);left=[x-.08,body[1]-.025,body[2]-.015];}
 else{const t=smooth((clock-11.4)/1.25);capPos[0]=mix(body[0]-.32,body[0]-.17,t);left=[capPos[0]-.055,body[1]-.03,body[2]];if(clock>12.65){left=[mix(left[0],-.4,smooth((clock-12.65)/1)),body[1]-.13,.35];capPos=[body[0]-Math.sin(yaw)*.17,body[1],body[2]-Math.cos(yaw)*.17];}}
 if(capVisible)push('cap',capPos,yaw,0,clock>11.4?Math.sin(clock*22)*.12:0);push('left',left,Math.PI/2,.1,Math.sin(clock*2)*.05);return out;
}
window.ISLAND_ARRIVAL={start,stop,update,camera,parts,matrix,geometry,get active(){return active;},get clock(){return clock;},get lightOn(){return clock>=13.5;},get duration(){return 17.5;}};
})();

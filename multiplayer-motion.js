'use strict';
// The same fixed-step movement and exhaustion rules run on server and client.
(() => {
function step(actor,input,dt,move,speedFactor=1){
 const p=actor.p; p.a=Number.isFinite(input.a)?input.a:p.a;p.pitch=Math.max(-1.35,Math.min(1.35,Number(input.pitch)||0));
 actor.crouch=!!input.crouch;const f=Math.max(-1,Math.min(1,Number(input.f)||0)),s=Math.max(-1,Math.min(1,Number(input.s)||0));
 if(!input.sprint)actor.sprintReleased=true;
 if(actor.exhausted&&actor.recoveryDelay<=0&&actor.sprintReleased&&actor.stamina>=20)actor.exhausted=false;
 const running=!!input.sprint&&!actor.exhausted&&actor.stamina>0&&!actor.crouch&&(f||s),speed=(actor.crouch?1.45:running?6.4:3.4)*speedFactor,x=p.x,y=p.y;
 if((f||s)&&!p.closetId&&!p.hidden&&actor.status==='alive'){const length=Math.hypot(f,s);move(p,(Math.cos(p.a)*f-Math.sin(p.a)*s)/length*speed*dt,(Math.sin(p.a)*f+Math.cos(p.a)*s)/length*speed*dt,.29);}
 actor.moving=Math.hypot(p.x-x,p.y-y)>.001;actor.running=!!running&&actor.moving;
 if(actor.running){actor.stamina=Math.max(0,actor.stamina-18*dt);if(actor.stamina===0){actor.recoveryDelay=2;actor.exhausted=true;actor.sprintReleased=false;}}
 else if(actor.recoveryDelay>0){const recovered=Math.max(0,dt-actor.recoveryDelay);actor.recoveryDelay=Math.max(0,actor.recoveryDelay-dt);actor.stamina=Math.min(100,actor.stamina+14*recovered);}
 else actor.stamina=Math.min(100,actor.stamina+14*dt);
}
window.ISLAND_COOP_MOTION={step};
})();

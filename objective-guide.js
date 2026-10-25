'use strict';
(() => {
function direction(player,target){
 const dx=target.x-player.x,dz=target.y-player.y,distance=Math.hypot(dx,dz);
 const angle=Math.atan2(Math.sin(Math.atan2(dz,dx)-player.a),Math.cos(Math.atan2(dz,dx)-player.a));
 const floor=(target.level||0)-(player.level||0);
 return{degrees:angle*180/Math.PI,distance:Math.round(distance),hint:floor>0?'UPSTAIRS':floor<0?'DOWNSTAIRS':distance<3?'NEARBY':'FOLLOW THE ARROW'};
}
window.ISLAND_GUIDE={direction};
})();

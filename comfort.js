'use strict';
// Read before geometry is built so both renderers receive the same plain world.
window.ISLAND_COMFORT={plain:false,jumpscares:true,setJumpscares(value){this.jumpscares=!!value;try{localStorage.setItem('no-return-jumpscares',this.jumpscares?'1':'0');}catch{}}};
try{window.ISLAND_COMFORT.plain=localStorage.getItem('no-return-unscary')==='1';window.ISLAND_COMFORT.jumpscares=localStorage.getItem('no-return-jumpscares')!=='0';}catch{}
document.body.classList.toggle('unscary',window.ISLAND_COMFORT.plain);

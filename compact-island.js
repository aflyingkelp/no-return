'use strict';
// Authored compact layout. Room sizes and movement remain in ordinary metres.
(() => {
const features=[],rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2],[x-w/2,z-d/2]];
const building=(id,x,z,w,d,levels=2,kind='house')=>features.push({id,tags:{building:kind,'building:levels':String(levels),'roof:shape':'hipped',fictional:'yes'},points:rect(x,z,w,d)});
building('522491438',84,110,16,18,3); // fuse / west villa
building('338332755',202,110,22,20,3); // lockbox / main compound
[[120,110],[228,110],[84,158],[120,158],[202,158],[228,158],[126,213],[190,213]].forEach(([x,z],i)=>building('compact-house-'+i,x,z,16,18,i%3===0?3:2));
building('338331030',130,183,10,8,1,'shed');
building('705649999',225,218,12,10,1,'shed');
building('522491437',78,225,14,14,1,'temple');
let roadId=0;const road=(points,kind='service')=>features.push({id:'compact-road-'+roadId++,tags:{highway:kind},points});
road([[160,66],[160,92],[160,137],[160,183],[160,237]]);
road([[160,92],[120,92],[84,92],[67,107],[67,183],[94,199],[100,230],[107,237],[160,237]]);
road([[160,92],[202,92],[228,92],[249,112],[249,194],[233,237],[205,237],[160,237]]);
road([[67,137],[120,137],[160,137],[228,137],[249,137]]);
road([[67,183],[104,183],[115,175],[130,175],[146,183],[176,183]]);
road([[94,199],[126,194],[160,194],[190,194],[209,200]],'footway');
road([[94,199],[78,211],[78,216]],'footway');
road([[240,205],[225,205],[225,211]],'footway');
for(let x of [84,120,202,228]){road([[x,92],[x,x===202?98:99]],'footway');road([[x,137],[x,147]],'footway');}
road([[126,194],[126,202]],'footway');road([[190,194],[190,202]],'footway');
features.push({id:'compact-pier',tags:{man_made:'pier'},points:[[160,41],[160,78]]});
features.push({id:'compact-helipad',tags:{aeroway:'helipad'},points:rect(160,183,22,22)});
features.push({id:'compact-shelter',tags:{building:'roof'},points:rect(241,176,5,5)});
const shore=[];for(let i=0;i<=64;i++){let a=i*Math.PI/32,edge=1+.035*Math.sin(a*3)+.025*Math.cos(a*5);shore.push([+(160+Math.cos(a)*112*edge).toFixed(2),+(170+Math.sin(a)*120*edge).toFixed(2)]);}
window.ISLAND_DATA={source:'Authored fictional compact island',license:'Authored game layout',projection:'Local metres; one game unit = one metre',width:320,depth:340,shore,features,layout:{
 id:'compact-8',name:'Compact island compound',generatedHouses:0,propAttempts:600,start:[160,68],startAngle:Math.PI/2,boat:[160,47],guard:[85,223],npcSpawns:{hawking:[244,210],trump:[68,166],diddy:[102,234]},
 patrol:[[85,223],[109,132],[153,139],[176,183],[214,135],[209,232],[242,192]],
 landmarks:[{name:'NORTH DOCK',x:160,y:68},{name:'WEST VILLA',x:84,y:110},{name:'MAIN COMPOUND',x:202,y:110},{name:'GENERATOR',x:130,y:183},{name:'HELIPAD',x:160,y:183},{name:'PAVILION',x:78,y:225},{name:'BOATHOUSE',x:225,y:218},{name:'EAST BEACH',x:248,y:194}],
 tanks:[107,177],solar:[94,190],tower:[179,187],containers:[[236,222],[234,230],[115,186]],lamps:[[163,78],[155,97],[90,132],[155,145],[181,138],[217,202]],blood:[[84,111],[130,183],[225,218],[78,226]]
}};
})();

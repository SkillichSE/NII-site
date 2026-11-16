// Take the engine classes from lib.js
const {Bt,pn,y,fe,Cn,oe,Fe,ke,Gr,D,Fr,Le,Yr,Zr,Ut,Ge,Be,Us,bi,yo,xn,yi,w_,b_,ie}=L;

const $ = id => document.getElementById(id);
const STEP = 1/120;               // physics step
const SELF_RIGHT_ANY = false;       // robots without a righting weapon get a magic hop when true
const CLASH = true;               // weapons push each other apart
const BODY_MASK = 15|16|3840;     // robot bodies hit: bodies, walls, weapons

// Shared game state
let bots=[], sel='flipper', selO=['hammer','spinner','ram'], slot=0, opp=2;
let paused=true, menuOpen=true, camMode=0, shake=0, over=false, camYaw=0, camH=1; // camYaw/camH: right stick turns the camera

// hull = body boxes [halfX,halfY,halfZ, x,y,z]
// wdeb = shape of the weapon when it breaks off, whp = weapon health
const BOX=[[.5,.13,.5,0,.01,0]];
const TYPES={
 flipper:{n:'«Не включать»',tag:'Оружие · флиппер',d:'Золотые клин-ковши, бирюзовые лапы, чёрная перемычка между ними',
  col:0x101114,top:0x1a1c20,acc:0xf0a626,arm:0x0b0c0e,ui:0x20b8a4,
  hull:[[.175,.13,.3,-.325,.04,-.2],[.175,.13,.3,.325,.04,-.2],[.5,.13,.2,0,.04,.3]],sx:.325,tipx:.38,
  rights:true,hp:85,mass:12,vmax:7,omega:4.5,accel:26,dmg:.5,
  pv:[0,.18,-.3],rest:0,hit:1.95,out:5.5,back:1.6,cd:.5,
  wpos:[0,-.1,-.8],wdeb:[.2,.05,.45,0,-.1,-.55],whp:55},
 hammer:{rights:true,n:'«Титан-3»',tag:'Оружие · кувалда',d:'Тяжёлый удар сверху, медленный',
  col:0xc83c3c,top:0x7a2424,acc:0xbfc7d1,hull:BOX,hp:75,mass:12,vmax:5,omega:3.4,accel:20,dmg:1,
  pv:[0,.22,.35],rest:2.3,hit:.05,out:5,back:2,cd:.8,wpos:[0,.1,-.9],wdeb:[.32,.18,.6,0,0,-.8],whp:50},
 spinner:{n:'«Шмель»',tag:'Оружие · горизонтальный спиннер',d:'Вращающаяся планка рубит всё вокруг',
  col:0xe8a317,top:0x8a6210,acc:0xff4d4d,hull:BOX,hp:70,mass:12,vmax:5.4,omega:3.8,accel:22,dmg:.5,
  pv:[0,.25,0],spin:8,wpos:[0,.25,0],wdeb:[.95,.05,.12,0,0,0],whp:45},
 ram:{n:'«Бык»',tag:'Оружие · поршневой таран',d:'Поршень-таран, крепкая броня',
  col:0x4fb35a,top:0x2c6b34,acc:0xdddddd,hull:BOX,hp:68,mass:12,vmax:4.6,omega:3.2,accel:21,dmg:.85,
  pv:[0,-.02,-.78],out:5,back:2.5,cd:.7,wpos:[0,0,-.85],wdeb:[.38,.1,.4,0,0,.2],whp:40},
 drill:{n:'«Сверылш»',tag:'Оружие · сверло',d:'Прямое сверло с двумя маленькими крыльями на конце, клин-корпус',
  col:0x15161a,top:0xb3322a,acc:0xaab2ba,ui:0xe0443a,
  hull:[[.5,.13,.35,0,.04,.15],[.35,.13,.15,0,.04,-.35],[.2,.13,.1,0,.04,-.55]],hp:68,mass:12,vmax:4.8,omega:3.6,accel:21,dmg:.75,
  pv:[0,.1,-.45],spin:8,wpos:[0,.1,-.9],wdeb:[.16,.16,.3,0,0,-.3],whp:45}
};

// Flipper geometry. WA = slope angle of the red wedge scoops.
// ARM = lift-arm path as [y,z] points relative to the pivot (arms are yellow, a black plate joins them at the bend).
const WA=.64, ARM=[[0,0],[0,-.3],[-.315,-.378],[-.333,-.66]], ARMX=.1, TIME=120;
const armSegs=()=>ARM.slice(1).map((q,k)=>{const p=ARM[k],dy=q[0]-p[0],dz=q[1]-p[1],L=Math.hypot(dy,dz);return{cy:(p[0]+q[0])/2,cz:(p[1]+q[1])/2,hl:L/2+.02,th:Math.asin(dy/L),t:k===ARM.length-2?.018:.045}});
// black squares joining the two arms, one on each bend (the second is smaller)
const armPlates=()=>{const sg=armSegs();return[1,2].map(k=>{const a=ARM[k],b=ARM[k+1],th=sg[k].th,pt=k===2?.01:.03,o=sg[k].t/2+pt/2;return{cy:(a[0]+b[0])/2+Math.cos(th)*o,cz:(a[1]+b[1])/2+Math.sin(th)*o,th,len:sg[k].hl*2-.02,pt}})};

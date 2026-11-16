// Menu: pick your robot (left) and the enemy (right), models spin in 3D
const KT=Object.keys(TYPES);
const pvS=new Fr,pvC=new Le(32,1,.1,50),pvM={l:null,r:null};
pvS.background=new Ut(0x05070b);
pvS.add(new Yr(12571903,2105384,1.1));
{const dl=new Zr(16777215,2);dl.position.set(3,5,4);pvS.add(dl);
 const pl=new oe(new Gr(1.6,1.6,.03,48),M(0x11151c,.4,.6));pl.position.y=-.2;pvS.add(pl)}
pvC.position.set(2.6,1.7,3.4);pvC.lookAt(0,.15,0);

// Show the chosen robot on one side ('l' or 'r')
function fill(s){
  const k=s==='l'?sel:selO[slot],T=TYPES[k];
  $('n'+s).textContent=T.n;$('t'+s).textContent=T.tag;$('d'+s).textContent=T.d;
  $('s'+s).innerHTML=specRows(k);
  if(pvM[s])pvS.remove(pvM[s].g);
  const V=makeMesh(k);V.ag.position.set(...T.pv);
  if(T.rest!==undefined&&k!=='ram')V.ag.rotation.x=T.rest;
  V.g.visible=false;V.k=k;pvS.add(V.g);pvM[s]=V;
}
// Draw both previews into their boxes on the screen
function renderMenu(dt){
  bi.setScissorTest(false);bi.setViewport(0,0,innerWidth,innerHeight);bi.setClearColor(0x05070b,1);bi.clear();
  for(const s of['l','r']){
    const r=$('v'+s).getBoundingClientRect(),V=pvM[s];if(r.width<2||!V)continue;
    V.g.rotation.y+=dt*.7;if(V.k==='spinner')V.ag.rotation.y+=dt*9;if(V.k==='drill')V.ag.rotation.z+=dt*9;
    const x=r.left,yy=innerHeight-r.bottom;
    bi.setViewport(x,yy,r.width,r.height);bi.setScissor(x,yy,r.width,r.height);bi.setScissorTest(true);
    pvC.aspect=r.width/r.height;pvC.updateProjectionMatrix();
    V.g.visible=true;bi.render(pvS,pvC);V.g.visible=false;
  }
  bi.setScissorTest(false);bi.setViewport(0,0,innerWidth,innerHeight);
}
function showMenu(msg){paused=true;menuOpen=true;document.body.classList.add('m');if(msg)$('mt').textContent=msg;$('menu').style.display='flex'}
function startGame(){if(introOn)return;audioInit();newGame();$('menu').style.display='none';document.body.classList.remove('m');menuOpen=false;paused=true;runIntro()}
function buildMenu(){
  $('opp').innerHTML=[1,2,3].map(n=>`<button class="pill${n===opp?' on':''}" data-n="${n}">${n}</button>`).join('');
  $('opp').onclick=e=>{const c=e.target.closest('.pill');if(c){opp=+c.dataset.n;buildMenu()}};
  if(slot>=opp)slot=opp-1;
  // one tab per opponent: pick the robot for each of them
  $('slots').innerHTML=Array.from({length:opp},(_,k)=>`<button class="slot${k===slot?' on':''}" data-k="${k}">${k+1} · ${TYPES[selO[k]].n}</button>`).join('');
  $('slots').onclick=e=>{const c=e.target.closest('.slot');if(c){slot=+c.dataset.k;buildMenu()}};
  fill('l');fill('r');
}
// Arrows change the robot
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{
  const l=b.dataset.s==='l',d=+b.dataset.d,n=KT[(KT.indexOf(l?sel:selO[slot])+d+KT.length)%KT.length];
  if(l){sel=n;fill('l')}else{selO[slot]=n;buildMenu()}
});

// Side panel (bottom left)
function togglePanel(){
  const p=$('panel');p.classList.toggle('open');
  $('tog').textContent='УПРАВЛЕНИЕ '+(p.classList.contains('open')?'▾':'▴');
  try{localStorage.rp=p.classList.contains('open')?1:0}catch{}
}
$('tog').onclick=togglePanel;
try{if(localStorage.rp==='0'){$('panel').classList.remove('open');$('tog').textContent='УПРАВЛЕНИЕ ▴'}}catch{}
$('start').onclick=startGame;
$('bmenu').onclick=()=>showMenu('ВЫБОР БОЙЦОВ');
$('bup').onclick=()=>bots[0]?.selfRight();
$('bcam').onclick=()=>camMode=(camMode+1)%3;

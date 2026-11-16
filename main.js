// Game loop, camera, HUD
let acc=0,last=performance.now(),endT=0,flashT=0,timeLeft=TIME,timeUp=false,leader=null;
const camDir=new D(0,0,-1),camPos=new D(0,5,10);
const hex=c=>'#'+c.toString(16).padStart(6,'0');

function flash(t){const f=$('flash');f.textContent=t;f.style.opacity=1;flashT=2.2}

// Start a new fight
function newGame(){
  for(const b of bots){Ge.removeBody(b.body);if(b.wOK)Ge.removeBody(b.arm);Be.remove(b.mesh)}
  clearFX();bots=[];
  bots.push(new Bot(sel,0,true));
  for(let k=0;k<opp;k++)bots.push(new Bot(selO[k],k+1,false));
  const an=[0,Math.PI,Math.PI/2,-Math.PI/2];
  bots.forEach((b,k)=>b.place(Math.sin(an[k])*6,Math.cos(an[k])*6,an[k]));
  $('bars').innerHTML=bots.map(b=>`<div class="r" id="r${b.id}"><span style="color:${hex(b.W.ui||b.W.col)}">${b.name}</span><i><b id="h${b.id}"></b></i><em id="p${b.id}"></em></div>`).join('');
  camYaw=0;camH=1;over=false;endT=0;timeLeft=TIME;timeUp=false;leader=null;camDir.set(0,0,-1);
}

// Camera follows the player
function cam(dt){
  const P=bots.find(b=>b.alive&&b.isP)||bots.find(b=>b.alive)||bots[0];if(!P)return;
  const e=new D().copy(P.body.position),f=P.fwdFlat();
  if(!P.flipped)camDir.lerp(new D(f.x,0,f.z),1-Math.exp(-dt*4)).normalize();
  const cd=camDir.clone().applyAxisAngle(new D(0,1,0),camYaw);
  const n=camMode===0?e.clone().addScaledVector(cd,-5).add(new D(0,3.2*camH,0)):camMode===1?e.clone().add(new D(0,17,.01)):e.clone().addScaledVector(cd,-10).add(new D(0,8*camH,0));
  const lim=ie-.7;n.x=xn(n.x,-lim,lim);n.z=xn(n.z,-lim,lim);
  camPos.lerp(n,1-Math.exp(-dt*5));shake*=Math.exp(-dt*6);
  Us.position.set(camPos.x+rnd()*shake*.5,camPos.y+rnd()*shake*.5,camPos.z);
  Us.lookAt(e.x+(camMode===0?cd.x*2:0),.3,e.z+(camMode===0?cd.z*2:0));
}
function hud(dt){
  if(flashT>0){flashT-=dt;if(flashT<=0)$('flash').style.opacity=0}
  for(const b of bots){
    const h=$('h'+b.id),r=$('r'+b.id);if(!h)continue;
    const k=b.hp/b.W.hp;h.style.width=k*100+'%';h.style.background=k>.5?'#fff':k>.25?'#f5a623':'#ff3b30';
    r.style.opacity=b.alive?1:.4;
    $('p'+b.id).textContent=`КОЛЁСА ${b.wheels(-1)+b.wheels(1)}/4 · ${b.wOK?'ОРУЖИЕ':'БЕЗ ОРУЖИЯ'}`;
  }
  const P=bots[0];
  if(P)$('wf').style.width=(!P.wOK?0:(P.type==='spinner'||P.type==='drill')?P.spin/P.W.spin:P.st?P.t:P.cd>0?1-P.cd/P.W.cd:1)*100+'%';
  const tl=Math.ceil(timeLeft),T=$('timer');T.textContent=Math.floor(tl/60)+':'+String(tl%60).padStart(2,'0');T.className='hud'+(timeLeft<=10?' low':'');
  $('pad').textContent=pad?'● '+pad.id.split('(')[0].trim():'○ геймпад не найден';$('pad').className=pad?'ok':'no';
  $('mode').textContent='Камера: '+['сзади','сверху','далеко'][camMode];
}
// Smoke from damaged robots
function effects(dt){
  for(const b of bots)if(b.hp<b.W.hp*.35){b.smokeT-=dt;if(b.smokeT<=0){spawnSmoke(b.body.position);b.smokeT=.12}}
}
// Win or lose
// 2 minute fight. If time runs out, the robot with the most health left wins on points.
const score=b=>b.hp/b.W.hp*100+(b.dealt||0)*.1;
function logic(dt){
  if(over)return;const P=bots[0],al=bots.filter(b=>b.alive),ended=!P.alive||al.length<=1;
  if(!timeUp&&!ended){
    timeLeft-=dt;
    if(timeLeft<=0){timeLeft=0;timeUp=true;endT=0;leader=al.slice().sort((a,b)=>score(b)-score(a))[0];flash('ВРЕМЯ ВЫШЛО')}
  }
  if(timeUp||ended){
    endT+=dt;
    if(endT>(timeUp&&!ended?3:2)){over=true;endScreen(ended?(P.alive?'ПОБЕДА':'ПОРАЖЕНИЕ'):(leader===P?'ПОБЕДА ПО ОЧКАМ':'ПОРАЖЕНИЕ ПО ОЧКАМ'))}
  }
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-last)/1e3,.1);last=now;
  if(!paused){
    readInput();for(const b of bots)if(!b.isP)ai(b,dt);
    acc+=dt;let n=0;
    while(acc>=STEP&&n++<10){for(const b of bots)b.preStep(STEP);Ge.step(STEP);for(const b of bots)b.postStep(STEP);weaponClash();acc-=STEP}
    updateSparks(dt);updateDebris(dt);effects(dt);logic(dt);
  }
  sfx(dt);
  if(menuOpen)renderMenu(dt);
  else{for(const b of bots)b.sync();cam(dt);hud(dt);bi.render(Be,Us)}
}
buildMenu();newGame();requestAnimationFrame(frame);

// Arena atmosphere: broadcast-style cards, intro countdown, announcer and synthesized sound (WebAudio, no files)
const INFO={
 flipper:{fl:'kz',city:'Рудный',weapon:'Флиппер',w:'2,97 кг',power:'45 кгс · подъём 0,18 с'},
 hammer:{fl:'by',city:'Минск',weapon:'Кувалда',w:'3,00 кг',power:'80 Дж · удар сверху'},
 spinner:{fl:'in',city:'Пуна',weapon:'Гориз. спиннер',w:'2,89 кг',power:'120 Дж · 8 000 об/мин'},
 drill:{fl:'kz',city:'Костанай',weapon:'Сверло',w:'2,95 кг',power:'90 Дж · 6 000 об/мин'},
 ram:{fl:'uz',city:'Ташкент',weapon:'Пневмо-таран',w:'2,94 кг',power:'30 кгс · ход 0,25 с'}
};
const flagOf=k=>`<i class="flag ${INFO[k].fl}"></i>`;
function specRows(k){const T=TYPES[k],I=INFO[k];
  return `<div class="spec">`+
  [['Город',flagOf(k)+I.city],['Вес',I.w],['Скорость',Math.round(T.vmax*2.6)+' км/ч'],['Оружие',I.weapon],['Сила орудия',I.power]]
  .map(([a,b])=>`<span>${a}:</span><em>${b}</em>`).join('')+'</div>'}

// ---------- sound ----------
let AC=null,master,noiseBuf,crowdG,crowdL=.05;const sayT={};
function audioInit(){
  if(AC){AC.resume&&AC.resume();return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch{return}
  master=AC.createGain();master.gain.value=.8;const cmp=AC.createDynamicsCompressor();cmp.threshold.value=-14;cmp.ratio.value=6;master.connect(cmp);cmp.connect(AC.destination);
  const n=AC.sampleRate*2;noiseBuf=AC.createBuffer(1,n,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const cs=AC.createBufferSource();cs.buffer=noiseBuf;cs.loop=true;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=700;bp.Q.value=.3;
  crowdG=AC.createGain();crowdG.gain.value=0;
}
function tone(type,f0,f1,dur,v,at=0){if(!AC)return;const t=AC.currentTime+at,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02)}
function noise(dur,v,fq,Q,ft='lowpass',at=0){if(!AC)return;const t=AC.currentTime+at,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type=ft;f.frequency.value=fq;f.Q.value=Q;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random());s.stop(t+dur+.02)}
const near=b=>{const P=bots[0];if(!P||b===P)return 1;const a=b.body.position,q=P.body.position;return 1/(1+Math.hypot(a.x-q.x,a.z-q.z)*.22)};
const SND={flipper:{pitch:1.6,loud:1.3,wt:'sawtooth',wc:2600},hammer:{pitch:.8,loud:1.1,wt:'square',wc:700},spinner:{pitch:1.1,loud:1,wt:'sawtooth',wc:1400},ram:{pitch:.7,loud:1.1,wt:'square',wc:900},drill:{pitch:1,loud:1.1,wt:'sawtooth',wc:1200}};
function loopNoise(){const s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.start(0,Math.random());return s}
const mkO=(type,f)=>{const o=AC.createOscillator();o.type=type;o.frequency.value=f;o.start();return o};
const mkF=(t,f,q)=>{const x=AC.createBiquadFilter();x.type=t;x.frequency.value=f;x.Q.value=q;return x};
const mkG=v=>{const x=AC.createGain();x.gain.value=v;return x};
// per robot: motor (electric whine + gear chatter = noise chopped by a saw + wheels on the floor) and a weapon gearbox (whine + grinding)
function mkVoice(b){
  const o1=mkO('sawtooth',300),wb=mkF('bandpass',900,6),g=mkG(0);o1.connect(wb);wb.connect(g);g.connect(master);
  const n1=loopNoise(),nb=mkF('bandpass',1500,1.2),nam=mkG(.5),l1=mkO('sawtooth',40),l1g=mkG(.5),ng=mkG(0);
  n1.connect(nb);nb.connect(nam);l1.connect(l1g);l1g.connect(nam.gain);nam.connect(ng);ng.connect(master);
  const fz=loopNoise(),fl=mkF('lowpass',350,.7),fg=mkG(0);fz.connect(fl);fl.connect(fg);fg.connect(master);
  const w=mkO('sawtooth',500),wb2=mkF('bandpass',1200,7),wg=mkG(0);w.connect(wb2);wb2.connect(wg);wg.connect(master);
  const n2=loopNoise(),gb=mkF('bandpass',b.type==='flipper'?1800:900,1.5),gam=mkG(.5),l2=mkO('sawtooth',60),l2g=mkG(.5),gg=mkG(0);
  n2.connect(gb);gb.connect(gam);l2.connect(l2g);l2g.connect(gam.gain);gam.connect(gg);gg.connect(master);
  return{o1,wb,g,l1,nb,ng,fg,w,wb2,wg,l2,gg,pst:0};
}
function sfx(dt){
  if(!AC)return;const live=!paused&&!menuOpen,t=AC.currentTime;
  for(const b of bots){
    const s=b.snd||(b.snd=mkVoice(b)),T=b.type,i=b.input,k=SND[T],v=b.body.velocity,sp=Math.hypot(v.x,v.z),on=live&&b.alive,vl=near(b);
    const thr=Math.min(1,Math.abs(i.throttle)+Math.abs(i.steer)*.6),load=thr>.5&&sp<1?1:0,gr=b.up().y>.75,run=on&&gr,r=sp/b.W.vmax,ta=.1;
    const wf=(200+r*700*k.pitch)*(1-load*.2);
    s.o1.frequency.setTargetAtTime(wf,t,ta);s.wb.frequency.setTargetAtTime(wf*2.5,t,ta);
    s.l1.frequency.setTargetAtTime(25+r*90,t,ta);s.nb.frequency.setTargetAtTime(900+r*1500,t,ta);
    s.g.gain.setTargetAtTime(run?(thr*.5+Math.min(sp,3)*.05)*.1*k.loud*vl*(1+load*.4):0,t,.1);
    s.ng.gain.setTargetAtTime(run?thr*.14*k.loud*vl:0,t,.1);
    s.fg.gain.setTargetAtTime(run?Math.min(sp,4)/4*.02*vl:0,t,.1);          // wheels: very quiet
    // weapon gearbox
    let f=100,wgn=0,gf=40,ggn=0;
    if(b.wOK){
      if(T==='flipper'){if(b.st===1){f=500+b.t*1000;wgn=.35;gf=55+b.t*90;ggn=1}else if(b.st===2){f=300;wgn=.12;gf=45;ggn=.35}} // very loud grinding while the arm goes up
      else if(T==='spinner'||T==='drill'){f=60+b.spin*20;wgn=.2*Math.min(1,b.spin/8);gf=b.spin*14;ggn=Math.min(1,b.spin/8)*.35}
      else if(T==='hammer'&&b.st){f=120+b.t*200;wgn=.15;gf=35+b.t*40;ggn=.3}
      else if(T==='ram'&&b.st===1){f=250+b.t*350;wgn=.1;gf=40+b.t*60;ggn=.25}
    }
    s.w.frequency.setTargetAtTime(f,t,.04);s.wb2.frequency.setTargetAtTime(f*2,t,.04);s.l2.frequency.setTargetAtTime(Math.max(5,gf),t,.04);
    s.wg.gain.setTargetAtTime(on?wgn*vl:0,t,.04);s.gg.gain.setTargetAtTime(on?ggn*vl:0,t,.04);
    if(live&&b.st===1&&s.pst!==1){if(T==='ram')noise(.2,.3*vl,2500,1,'highpass');else if(T==='hammer')noise(.4,.35*vl,500,.8,'bandpass')}
    if(live&&s.pst===1&&b.st===2){thump(T==='flipper'?110:80,.4*vl);crack(.5*vl,2)}
    s.pst=b.st;
  }
}
// impacts: low thump + sharp cracks + ringing panel + grit
const crack=(g,n)=>{for(let i=0;i<n;i++)noise(.03+Math.random()*.04,.35*g,3000+Math.random()*4000,.8,'highpass',Math.random()*.09)};
const ring=(f,v,d=.25)=>noise(d,v*4,f,14,'bandpass');
const thump=(f,v,d=.2)=>tone('sine',f,f*.35,d,v);
const bell=f=>[1,2.76,5.4,8.9].forEach((r,n)=>tone('sine',f*r,f*r*.995,1.6/(n+1),.3/(n+1)));
function sfxHit(v,heavy,b){if(!AC)return;const g=Math.min(1,v/12)*(heavy?1:.6)*near(b);thump(heavy?130:170,.7*g);crack(g,heavy?5:3);ring(400+Math.random()*900,.5*g);if(heavy)noise(.3,.3*g,2500,.6,'lowpass',.02)}
function sfxFlip(b){if(!AC)return;const g=near(b);noise(.3,.5*g,3000,.8,'highpass');thump(100,.6*g);ring(700,.3*g)}
function sfxClink(b){if(!AC||sayT.cl>performance.now()-70)return;sayT.cl=performance.now();crack(.5*near(b),2);ring(1500+Math.random()*1500,.3*near(b),.15)}
function sfxBoom(b){if(!AC)return;thump(90,.9,.8);crack(1,9);ring(300,.8,.5);ring(1100,.5,.4);noise(.9,.5,1500,.6,'lowpass',.05)}
function sfxServo(b){if(!AC)return;noise(.35,.25*near(b),1800,2,'bandpass');tone('sawtooth',400,900,.3,.05*near(b))}
function beep(f,d=.18,v=.25){tone('square',f,f,d,v)}
// announcer text with a cooldown
function say(txt,cool){const n=performance.now();if((sayT[txt]||0)>n-cool*1e3)return;sayT[txt]=n;flash(txt)}

// ---------- intro: cards fly in, then 3-2-1-FIGHT ----------
let introOn=false,introTm=[];
function card(k,id){const T=TYPES[k];return `<div class="ic"><div class="ic-n">${flagOf(k)}<b>${T.n}</b></div>${specRows(k)}</div>`}
function runIntro(done){
  introOn=true;audioInit();
  let el=$('intro');if(!el){el=document.createElement('div');el.id='intro';document.body.appendChild(el)}
  el.className='';el.innerHTML=`<div class="il">${card(bots[0].type)}</div><div class="ivs">VS</div><div class="ir">${bots.slice(1).map(b=>card(b.type)).join('')}</div><div class="icd" id="icd"></div>`;
  el.style.display='flex';
  const cd=t=>{const e=$('icd');e.textContent=t;e.style.animation='none';e.offsetWidth;e.style.animation=''};
  const fin=()=>{if(!introOn)return;introOn=false;introTm.forEach(clearTimeout);introTm=[];el.style.display='none';paused=false;done&&done()};
  const at=(ms,f)=>introTm.push(setTimeout(f,ms));
  
  at(1500,()=>{cd('3');beep(440)});at(2300,()=>{cd('2');beep(440)});at(3100,()=>{cd('1');beep(440)});
  at(3900,()=>{cd('БОЙ!');bell(520);el.classList.add('go');paused=false;introOn=false});
  at(4800,()=>{el.style.display='none'});
  el.onclick=()=>{introTm.forEach(clearTimeout);introTm=[];introOn=false;el.style.display='none';paused=false;done&&done()};
}

// ---------- result screen: flat TV-style banner with the winner ----------
function endScreen(msg){
  const al=bots.filter(b=>b.alive),w=al.length?al.slice().sort((a,b)=>score(b)-score(a))[0]:null,win=msg.startsWith('ПОБЕДА');
  let el=$('res');if(!el){el=document.createElement('div');el.id='res';document.body.appendChild(el)}
  el.className=win?'win':'lose';
  el.innerHTML=`<div class="rt">${win?'WIN':'DEFEAT'}</div><div class="rn">${w?w.W.n:'НИЧЬЯ'}</div>`;el.style.display='flex';
  // arena buzzer + crowd, no melody
  [0,280,560].forEach(d=>setTimeout(()=>bell(win?520:380),d));
  const go=()=>{if(el.style.display==='none')return;el.style.display='none';showMenu(msg)};
  el.onclick=go;setTimeout(go,4200);
}

(function(){
var hd=document.querySelector('header');
function sc(){hd.classList.toggle('solid',window.scrollY>40)}
sc();window.addEventListener('scroll',sc,{passive:true});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.1});
document.querySelectorAll('.rv').forEach(function(n){io.observe(n)});
document.querySelectorAll('.cine').forEach(function(c){
c.addEventListener('click',function(){
if(c.querySelector('iframe'))return;
var f=document.createElement('iframe');
f.src='https://www.youtube-nocookie.com/embed/'+c.dataset.yt+'?autoplay=1&rel=0&modestbranding=1';
f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
f.allowFullscreen=true;
f.referrerPolicy='strict-origin-when-cross-origin';
c.appendChild(f);
});
});
function fit(){
var b=document.querySelector('footer .big');
if(!b)return;
var cs=getComputedStyle(b.parentNode);var w=b.parentNode.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
b.style.fontSize='100px';
var k=w/b.getBoundingClientRect().width;
b.style.fontSize=Math.min(100*k,170)+'px';
}
fit();
window.addEventListener('resize',fit);
window.addEventListener('load',fit);
document.addEventListener('langchange',fit);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
/* mobile menu: burger button + full-screen nav (CSS shows it only on narrow screens) */
var hr=hd&&hd.querySelector('.hdr-right'),nv=hd&&hd.querySelector('nav');
if(hr&&nv){
var bt=document.createElement('button');
bt.className='burger';bt.type='button';bt.setAttribute('aria-expanded','false');
bt.innerHTML='<span></span><span></span><span></span>';
nv.id=nv.id||'mainnav';bt.setAttribute('aria-controls',nv.id);
var ML={ru:'Меню',en:'Menu',uk:'Меню',kk:'Мәзір'};
function lbl(){bt.setAttribute('aria-label',ML[document.documentElement.lang]||'Menu')}
lbl();document.addEventListener('langchange',lbl);
hr.appendChild(bt);
function setNav(o){hd.classList.toggle('open',o);document.documentElement.classList.toggle('nav-lock',o);bt.setAttribute('aria-expanded',o?'true':'false')}
bt.addEventListener('click',function(){setNav(!hd.classList.contains('open'))});
nv.addEventListener('click',function(e){if(e.target.closest('a'))setNav(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape')setNav(false)});
window.addEventListener('pageshow',function(){setNav(false)});
var mq=window.matchMedia('(max-width:900px)');
if(mq.addEventListener)mq.addEventListener('change',function(){setNav(false)});else if(mq.addListener)mq.addListener(function(){setNav(false)});
}
/* hero video: lighter file on phones, none on data-saver / slow networks / reduced motion; paused when off-screen */
var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
var hv=document.querySelector('video[data-src]');
if(hv){
var cn=navigator.connection||{};
var slow=cn.saveData||/(^|-)2g$/.test(cn.effectiveType||'');
if(!slow&&!reduce){
hv.muted=true;
hv.src=(window.matchMedia('(max-width:900px)').matches&&hv.dataset.srcM)?hv.dataset.srcM:hv.dataset.src;
var pl=function(){var q=hv.play();if(q&&q.catch)q.catch(function(){})};
if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)pl();else hv.pause()})},{threshold:0}).observe(hv)}else pl();
}
}
var st=document.getElementById('stage');
if(!st)return;
var N=+st.dataset.n,dir=st.dataset.dir,inner=document.getElementById('inner'),hint=document.getElementById('hint'),hero=st.parentNode;
var imgs=[];
for(var i=0;i<N;i++){var im=new Image();im.src='img/'+dir+'/bot_'+i+'.webp';im.alt='';im.decoding='async';im.draggable=false;inner.appendChild(im);imgs.push(im)}
var ang=0,vel=0,auto=!reduce,speed=1,drag=false,sx=0,sa=0,cur=-1,last=0,lx=0,lt=0,timer=null;
function render(){
ang=(ang%360+360)%360;
var k=(N-Math.round(ang/(360/N))%N)%N;
if(k!==cur){
for(var j=0;j<N;j++)if(j!==k)imgs[j].classList.remove('on');
imgs[k].classList.add('on');cur=k;
}
}
function pause(){auto=false;speed=0;clearTimeout(timer);hint.classList.add('off')}
function later(){clearTimeout(timer);if(reduce)return;timer=setTimeout(function(){auto=true},2500)}
function down(e){if(e.target.closest('a,button'))return;drag=true;sx=lx=e.clientX;sa=ang;lt=performance.now();vel=0;pause();hero.setPointerCapture(e.pointerId)}
function move(e){
if(!drag)return;
var dx=e.clientX-sx;
ang=sa-dx*.5;
var now=performance.now(),dt=Math.max(now-lt,1);
vel=-(e.clientX-lx)*.5/dt*16;lx=e.clientX;lt=now;
render();
}
function up(){if(!drag)return;drag=false;later()}
hero.addEventListener('pointerdown',down);
hero.addEventListener('pointermove',move);
hero.addEventListener('pointerup',up);
hero.addEventListener('pointercancel',up);
window.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){pause();vel=0;ang+=e.key==='ArrowLeft'?-45:45;render();later()}});
document.querySelectorAll('[data-yaw]').forEach(function(b){b.addEventListener('click',function(){pause();vel=0;ang=+b.dataset.yaw;render();later();hero.scrollIntoView({behavior:'smooth',block:'start'})})});
function tick(t){
var dt=Math.min(t-last,50);last=t;
if(!drag){
if(auto){speed=Math.min(1,speed+dt/1500);ang+=dt*.018*speed}
else if(Math.abs(vel)>.01){ang+=vel;vel*=.94}
render();
}
requestAnimationFrame(tick);
}
render();requestAnimationFrame(tick);
})();
(function(){
var stage=document.querySelector('.stage');
if(!stage)return;
var target=document.getElementById('inner')||stage;
var count=0,timer=null,busy=false,sx=0,sy=0,moved=false;
var frames=[
{transform:'translateY(0) scale(1,1) rotate(0deg)',offset:0},
{transform:'translateY(0) scale(1.08,.88) rotate(0deg)',offset:.12},
{transform:'translateY(-18%) scale(.94,1.08) rotate(-4deg)',offset:.3},
{transform:'translateY(0) scale(1.1,.86) rotate(0deg)',offset:.45},
{transform:'translateY(-10%) scale(.97,1.04) rotate(4deg)',offset:.6},
{transform:'translateY(0) scale(1.05,.93) rotate(0deg)',offset:.75},
{transform:'translateY(-4%) scale(1,1) rotate(-2deg)',offset:.88},
{transform:'translateY(0) scale(1,1) rotate(0deg)',offset:1}
];
var hero=stage.closest('.bot-hero')||stage.parentNode;
var inStage=false;
hero.addEventListener('pointerdown',function(e){inStage=!!e.target.closest('.stage');sx=e.clientX;sy=e.clientY;moved=false});
hero.addEventListener('pointermove',function(e){if(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10)moved=true});
hero.addEventListener('pointerup',function(){
if(!inStage||moved||busy)return;
inStage=false;
count++;
clearTimeout(timer);
timer=setTimeout(function(){count=0},700);
if(count>=3){
count=0;clearTimeout(timer);busy=true;
var a=target.animate(frames,{duration:1400,easing:'ease-in-out'});
a.onfinish=a.oncancel=function(){busy=false};
}
});

})();

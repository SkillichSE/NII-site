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
var w=b.parentNode.clientWidth;
b.style.fontSize='100px';
var k=w/b.getBoundingClientRect().width;
b.style.fontSize=Math.min(100*k,170)+'px';
}
fit();
window.addEventListener('resize',fit);
window.addEventListener('load',fit);
document.addEventListener('langchange',fit);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
var st=document.getElementById('stage');
if(!st)return;
var N=+st.dataset.n,dir=st.dataset.dir,inner=document.getElementById('inner'),hint=document.getElementById('hint'),hero=st.parentNode;
var imgs=[];
for(var i=0;i<N;i++){var im=new Image();im.src='img/'+dir+'/bot_'+i+'.webp';im.alt='';im.draggable=false;inner.appendChild(im);imgs.push(im)}
var ang=0,vel=0,auto=true,speed=1,drag=false,sx=0,sa=0,cur=-1,last=0,lx=0,lt=0,timer=null;
function render(){
ang=(ang%360+360)%360;
var k=Math.round(ang/(360/N))%N;
if(k!==cur){
var o=imgs[cur];
if(o){o.classList.remove('on');o.classList.add('prev');setTimeout(function(){o.classList.remove('prev')},200)}
imgs[k].classList.remove('prev');imgs[k].classList.add('on');cur=k;
}
}
function pause(){auto=false;speed=0;clearTimeout(timer);hint.classList.add('off')}
function later(){clearTimeout(timer);timer=setTimeout(function(){auto=true},2500)}
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

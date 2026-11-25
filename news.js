(function(){
var box=document.getElementById('nb-body');
if(!box)return;
var all=document.getElementById('newsbox').hasAttribute('data-all');
var items=[],loaded=false;
function get(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function renderItem(item,parent){
var L=document.documentElement.lang,T=(L&&L!=='ru'&&item.tr&&item.tr[L])||null;
var title=(T&&T.title)||item.title,text=(T&&T.text)||item.text;
if(item.image){var im=document.createElement('img');im.className='nb-img';im.src=item.image;im.alt=title||'';im.loading=all?'eager':'lazy';im.decoding='async';parent.appendChild(im)}
if(title){var h=document.createElement('h2');h.className='nb-title';h.textContent=title;parent.appendChild(h)}
if(text){var p2=document.createElement('p');p2.className='nb-text';p2.textContent=text;parent.appendChild(p2)}
var d=new Date(item.date);
if(!isNaN(d)){
var s=document.createElement('time');s.className='nb-date';s.dateTime=item.date;
var lg={ru:'ru-RU',en:'en-GB',uk:'uk-UA',kk:'kk-KZ'}[document.documentElement.lang]||'ru-RU';
try{s.textContent=d.toLocaleDateString(lg,{day:'numeric',month:'long',year:'numeric'})}catch(e){s.textContent=d.toLocaleDateString()}
parent.appendChild(s);
}
}
function render(){
box.textContent='';
if(!items.length){
var p=document.createElement('p');p.className='nb-empty';p.setAttribute('data-i18n','news_empty');
p.textContent={ru:'Новостей пока нет',en:'No news yet',uk:'Новин поки немає',kk:'Жаңалықтар әзірге жоқ'}[document.documentElement.lang]||'Новостей пока нет';
box.appendChild(p);return;
}
var list=all?items:items.slice(0,1);
list.forEach(function(it,i){
var a=document.createElement('article');
a.className=it.image?'has-img':'no-img';
if(all)a.addEventListener('click',function(){a.classList.toggle('open')});
if(i>0&&!all)a.style.cssText='margin-top:28px;padding-top:28px;border-top:1px solid var(--line)';
renderItem(it,a);box.appendChild(a);
});
if(all)layout();
}
var cols=0,tm=0;
function layout(force){
var arts=[].slice.call(box.querySelectorAll('article'));
if(!arts.length)return;
var W=box.clientWidth,n=window.innerWidth>640?Math.max(1,Math.floor((W+20)/320)):1;
if(n===1){if(box.classList.contains('masonry')){box.classList.remove('masonry');arts.forEach(function(a){box.appendChild(a)});box.querySelectorAll('.nb-col').forEach(function(c){c.remove()})}cols=1;return}
box.classList.add('masonry');
var cs=[];
for(var k=0;k<n;k++){var c=document.createElement('div');c.className='nb-col';cs.push(c)}
box.textContent='';cs.forEach(function(c){box.appendChild(c)});
arts.forEach(function(a){
var m=cs[0];cs.forEach(function(c){if(c.offsetHeight<m.offsetHeight)m=c});
m.appendChild(a);
});
cols=n;
}
function relayout(){clearTimeout(tm);tm=setTimeout(function(){if(all&&loaded)layout()},80)}
window.addEventListener('resize',relayout);
box.addEventListener('load',relayout,true);
function ts(x){var t=new Date(x.date).getTime();return isNaN(t)?0:t}
get('/api/news').then(function(a){
items=Array.isArray(a)?a.slice():[];
items.sort(function(x,y){return ts(y)-ts(x)});
}).catch(function(){items=[]}).then(function(){loaded=true;render()});
document.addEventListener('langchange',function(){if(loaded)render()});
})();
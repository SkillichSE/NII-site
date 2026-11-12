(function(){
var box=document.getElementById('nb-body');
if(!box)return;
var all=document.getElementById('newsbox').hasAttribute('data-all');
var items=[],loaded=false;
function get(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function renderItem(item,parent){
var L=(item.tr||{})[document.documentElement.lang];if(L)item=Object.assign({},item,L);
if(item.image){var im=document.createElement('img');im.className='nb-img';im.src=item.image;im.alt=item.title||'';im.loading='lazy';im.decoding='async';parent.appendChild(im)}
if(item.title){var h=document.createElement('h2');h.className='nb-title';h.textContent=item.title;parent.appendChild(h)}
if(item.text){var p2=document.createElement('p');p2.className='nb-text';p2.textContent=item.text;parent.appendChild(p2)}
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
if(i>0&&!all)a.style.cssText='margin-top:28px;padding-top:28px;border-top:1px solid var(--line)';
renderItem(it,a);box.appendChild(a);
});
}
function ts(x){var t=new Date(x.date).getTime();return isNaN(t)?0:t}
get('/api/news').then(function(a){
items=Array.isArray(a)?a.slice():[];
items.sort(function(x,y){return ts(y)-ts(x)});
}).catch(function(){items=[]}).then(function(){loaded=true;render()});
document.addEventListener('langchange',function(){if(loaded)render()});
})();

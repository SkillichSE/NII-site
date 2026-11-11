(function(){
var box=document.getElementById('nb-body');
if(!box)return;
var item=null,loaded=false;
function get(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function render(){
box.textContent='';
if(!item){
var p=document.createElement('p');p.className='nb-empty';p.setAttribute('data-i18n','news_empty');
p.textContent={ru:'Новостей пока нет',en:'No news yet',uk:'Новин поки немає',kk:'Жаңалықтар әзірге жоқ'}[document.documentElement.lang]||'Новостей пока нет';
box.appendChild(p);return;
}
if(item.image){var im=document.createElement('img');im.className='nb-img';im.src=item.image;im.alt=item.title||'';im.loading='lazy';im.decoding='async';box.appendChild(im)}
if(item.title){var h=document.createElement('h2');h.className='nb-title';h.textContent=item.title;box.appendChild(h)}
if(item.text){var p2=document.createElement('p');p2.className='nb-text';p2.textContent=item.text;box.appendChild(p2)}
var d=new Date(item.date);
if(!isNaN(d)){
var s=document.createElement('time');s.className='nb-date';s.dateTime=item.date;
var lg={ru:'ru-RU',en:'en-GB',uk:'uk-UA',kk:'kk-KZ'}[document.documentElement.lang]||'ru-RU';
try{s.textContent=d.toLocaleDateString(lg,{day:'numeric',month:'long',year:'numeric'})}catch(e){s.textContent=d.toLocaleDateString()}
box.appendChild(s);
}
}
get('/api/news').then(function(a){item=(a&&a[0])||null}).catch(function(){item=null}).then(function(){loaded=true;render()});
document.addEventListener('langchange',function(){if(loaded)render()});
})();

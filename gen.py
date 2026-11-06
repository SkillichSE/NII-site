import json
TR={}
IDX={}
def S(ru,en,kk):
    t=(ru,en,kk)
    if t not in IDX:
        IDX[t]='k%d'%len(IDX)
        TR[IDX[t]]={'ru':ru,'en':en,'kk':kk}
    return '<span data-i18n="%s">%s</span>'%(IDX[t],ru)

ROBOTS=[
{'slug':'prototype','dir':'prototype','n':8,'yt':'xU22DL8z9OY','tag':'PROTOTYPE','thumb':'img/prototype/bot_2.webp','poster':'img/poster.jpg',
 'name':('«Не включать»','“Do not turn on”','«Қосуға болмайды»'),
 'title':('«Не <em>включать</em>»','“Do not <em>turn on</em>”','«Қосуға <em>болмайды</em>»'),
 'status':('Прототип','Prototype','Прототип'),
 'specs':[
  (('Название','Name','Атауы'),('«Не включать»','“Do not turn on”','«Қосуға болмайды»')),
  (('Статус','Status','Мәртебесі'),('Прототип','Prototype','Прототип')),
  (('Оружие','Weapon','Қару'),('Переворачивающий клин','Flipping wedge','Аударғыш сына')),
  (('Платформа','Platform','Платформа'),('LEGO Education','LEGO Education','LEGO Education')),
  (('Назначение','Purpose','Міндеті'),('Тест задумки','Concept test','Идеяны сынау')),
 ]},
]

NAV=[('index.html',('Главная','Home','Басты бет')),('robots.html',('Роботы','Robots','Роботтар')),('olympiad.html',('Олимпиада','Olympiad','Олимпиада'))]
TPL='''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@T@ - НИИ</title>
<meta name="description" content="НИИ - Отвечаю щас полетит. Команда STEM-олимпиады.">
<link rel="icon" href="img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;700&family=Manrope:wght@300;400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header><a href="index.html"><img src="img/logo-wide.png" alt="НИИ"></a><div class="hdr-right"><nav>@N@</nav><div class="lang"><button data-lang="en">EN</button><button data-lang="ru">RU</button><button data-lang="kk">KAZ</button></div></div></header>
@B@
<footer>
<div class="row"><img src="img/logo.png" alt="НИИ"><nav>@FN@</nav></div>
<small>@FS@</small>
</footer>
<script src="i18n.js"></script>
<script src="app.js"></script>
</body>
</html>
'''
def navhtml(f,menu):
    out=''
    for h,t in NAV:
        on=(h==f) or (h=='robots.html' and f.startswith('robot'))
        cls=[]
        if h=='index.html':cls.append('home')
        if on:cls.append('on')
        c=' class="%s"'%' '.join(cls) if cls else ''
        a='<a href="%s"%s>%s</a>'%(h,c,S(*t))
        if h=='robots.html' and menu:
            items=''.join('<a href="robot-%s.html"><img src="%s" alt=""><span>%s<small>%s</small></span></a>'%(r['slug'],r['thumb'],S(*r['name']),S(*r['status'])) for r in ROBOTS)
            a='<div class="dd">%s<div class="menu"><div class="in2">%s</div></div></div>'%(a,items)
        out+=a
    return out
def page(f,title,body):
    html=TPL.replace('@T@',title).replace('@N@',navhtml(f,True)).replace('@FN@',navhtml(f,False)).replace('@B@',body)
    html=html.replace('@FB@',S('Не включать','Do not turn on','Қосуға болмайды')).replace('@FS@',S('© 2026 НИИ · Отвечаю щас полетит · Команда STEM-олимпиады','© 2026 NII · Otvechayu shchas poletit · STEM Olympiad team','© 2026 НИИ · Отвечаю щас полетит · STEM олимпиадасының командасы'))
    open(f,'w',encoding='utf-8').write(html)

R0=ROBOTS[0]
page('index.html','Главная','''
<div class="hero">
<video autoplay muted loop playsinline preload="auto" poster="img/poster.jpg"><source src="video/drive.mp4" type="video/mp4"></video>
<h1 style="margin-top:16px">@HN@</h1>
<p>@HP@</p>
<div><a class="btn solid" href="robots.html">@B1@</a><a class="btn" href="olympiad.html">@B2@</a></div>
</div>
<section class="sec"><div class="wrap cols">
<div><div class="cap rv">@M1@</div><h2 class="rv">@M2@</h2></div>
<p class="lead rv" style="margin:0">@M3@</p>
</div></section>
<div class="showcase">
<div class="wrap">
<div class="top"><div><div class="cap rv">@R1@</div><h2 class="rv">@RN@</h2></div><div><a class="btn rv" style="margin:0" href="robots.html">@R3@</a></div></div>
<div class="spin rv"><div class="stage" id="stage" data-dir="@DIR@" data-n="@N@"><div class="ring"></div><div class="ring two"></div><div class="pad"></div><div class="stage-inner" id="inner"></div></div><div class="hint" id="hint"><i></i>@HINT@<i></i></div></div>
<div class="chips rv"><div><span class="cap">@C2@</span><b>@CV2@</b></div><div><span class="cap">@C3@</span><b>@CV3@</b></div></div>
</div>
</div>
'''
.replace('@HN@',S(*R0['name']))
.replace('@HP@',S('Отвечаю щас полетит - команда STEM-олимпиады','Otvechayu shchas poletit - a STEM Olympiad team','Отвечаю щас полетит - STEM олимпиадасының командасы'))
.replace('@B1@',S('Смотреть робота','View the robot','Роботты көру')).replace('@B2@',S('Олимпиада','Olympiad','Олимпиада'))
.replace('@M1@',S('Миссия','Mission','Міндет')).replace('@M2@',S('Инженерия<br>без лишних слов','Engineering<br>without the fluff','Артық сөзсіз<br>инженерия'))
.replace('@M3@',S('НИИ Отвечаю щас полетит - команда STEM-олимпиады. Наш текущий робот - прототип названный «Не включать». Готовый робот появится позже.','NII Otvechayu shchas poletit is a STEM Olympiad team. Our current robot is the prototype named “Do not turn on”. The final robot will come later.','НИИ Отвечаю щас полетит - STEM олимпиадасының командасы. Біздің қазіргі робот - «Қосуға болмайды» деп аталатын прототип. Дайын робот кейінірек пайда болады.'))
.replace('@R1@',S('Роботы','Robots','Роботтар')).replace('@RN@',S(*R0['name']))
.replace('@R2@',S('Крутить в 3D','Rotate in 3D','3D айналдыру')).replace('@R3@',S('Все роботы','All robots','Барлық роботтар'))
.replace('@DIR@',R0['dir']).replace('@N@',str(R0['n'])).replace('@HINT@',S('ТЯНИ, ЧТОБЫ ВРАЩАТЬ','DRAG TO ROTATE','АЙНАЛДЫРУ ҮШІН СҮЙРЕҢІЗ')).replace('@SLUG@',R0['slug']).replace('@THUMB@',R0['thumb'])
.replace('@C2@',S('Оружие','Weapon','Қару')).replace('@CV2@',S('Переворачивающий клин','Flipping wedge','Аударғыш сына'))
.replace('@C3@',S('Платформа','Platform','Платформа')).replace('@CV3@','LEGO Education'))

cards=''.join('<a class="rcard" href="robot-%s.html"><img src="%s" alt=""><div class="tag">%s</div><h3>%s</h3></a>'%(r['slug'],r['thumb'],r['tag'],S(*r['name'])) for r in ROBOTS)
page('robots.html','Роботы','''
<div class="page">
<div class="head"><div><div class="cap">@C@</div><h1 style="margin-top:14px">@H@</h1></div></div>
<div class="rgrid">@CARDS@</div>
</div>
'''.replace('@C@',S('Наши роботы','Our robots','Біздің роботтар')).replace('@H@',S('Роботы','Robots','Роботтар')).replace('@CARDS@',cards))

for r in ROBOTS:
    specs=''.join('<div><span>%s</span>%s</div>'%(S(*a),S(*b)) for a,b in r['specs'])
    gal=''.join('<button data-yaw="%d"><span>%03d°</span><img src="img/%s/bot_%d.webp" alt=""></button>'%(i*360//r['n'],i*360//r['n'],r['dir'],i) for i in range(r['n']))
    body='''
<div class="bot-hero">
<div class="bot-title"><div class="tag">@TAG@</div><h1>@TITLE@</h1></div>
<div class="stage" id="stage" data-dir="@DIR@" data-n="@N@"><div class="ring"></div><div class="ring two"></div><div class="pad"></div><div class="stage-inner" id="inner"></div></div>
<div class="hint" id="hint"><i></i>@HINT@<i></i></div>
</div>
<section><div class="wrap cols">
<div class="sticky"><div class="cap rv">@SP1@</div><h2 class="rv">@NAME@</h2></div>
<div class="specs rv">@SPECS@</div>
</div></section>
<section><div class="wrap">
<div class="cap rv">@PR1@</div>
<h2 class="rv">@PR2@</h2>
<div class="cine rv" data-yt="@YT@" style="background-image:url(@POSTER@)"><div class="corner tl">@TAG@</div><div class="corner br">@NAME@</div><button class="play" aria-label="Play"></button></div>
<a class="ytlink" href="https://www.youtube.com/watch?v=@YT@" target="_blank" rel="noopener">@YTL@ ↗</a>
</div></section>
'''
    rep={'@TAG@':r['tag'],'@TITLE@':S(*r['title']),'@DIR@':r['dir'],'@N@':str(r['n']),'@HINT@':S('ТЯНИ, ЧТОБЫ ВРАЩАТЬ','DRAG TO ROTATE','АЙНАЛДЫРУ ҮШІН СҮЙРЕҢІЗ'),
     '@SP1@':S('Характеристики','Specs','Сипаттамасы'),'@NAME@':S(*r['name']),'@SPECS@':specs,
     '@PR1@':S('Презентация','Presentation','Презентация'),'@PR2@':S('Презентация робота','Robot presentation','Робот презентациясы'),
     '@YT@':r['yt'],'@POSTER@':r['poster'],'@YTL@':S('Смотреть на YouTube','Watch on YouTube','YouTube-та көру'),
     '@G1@':S('Ракурсы','Views','Көріністер'),'@G2@':S('Все стороны','All sides','Барлық жағы'),'@GAL@':gal,
     '@W1@':S('Предупреждение','Warning','Ескерту'),'@W2@':S('Может полететь','It might fly','Ұшып кетуі мүмкін'),'@W3@':S('К олимпиаде','To the Olympiad','Олимпиадаға')}
    for k,v in rep.items(): body=body.replace(k,v)
    page('robot-%s.html'%r['slug'],S(*r['name']).replace('<span data-i18n','<i data-x').split('>')[1].split('<')[0],body)

def row(a,b):
    return '<div><span>%s</span>%s</div>'%(S(*a),S(*b))
FILL=('Заполните','To be filled in','Толтырылады')
page('olympiad.html','Олимпиада','''
<div class="page">
<div class="head"><div><div class="cap">@C@</div><h1 style="margin-top:14px">@H@</h1></div></div>
<div class="wrap cols" style="padding:0;max-width:none;width:100%">
<div class="specs">@SP@</div>
<div class="timeline">@TL@</div>
</div>
</div>
'''.replace('@C@',S('STEM-олимпиада','STEM Olympiad','STEM олимпиадасы')).replace('@H@',S('Дорога к старту','The road to the start','Бастауға дейінгі жол'))
.replace('@SP@',''.join(row(a,FILL) for a in [('Формат','Format','Формат'),('Лимит размеров','Size limit','Өлшем шегі'),('Раунд','Round','Раунд'),('Дата','Date','Күні')]))
.replace('@TL@',''.join('<div%s><span class="cap">%s</span><h3>%s</h3></div>'%(d,S('Этап %d'%n,'Stage %d'%n,'%d-кезең'%n),S(*t)) for n,d,t in [
 (1,' class="done"',('Прототип «Не включать» собран','Prototype “Do not turn on” built','«Қосуға болмайды» прототипі жасалды')),
 (2,'',('Готовый робот','Final robot','Дайын робот')),
 (3,'',('Олимпиада','Olympiad','Олимпиада'))])))

open('i18n.js','w',encoding='utf-8').write('''(function(){
var D=%s;
var L=localStorage.getItem('lang')||'ru';
function apply(l){
L=l;
try{localStorage.setItem('lang',l)}catch(e){}
document.documentElement.lang=l==='kk'?'kk':l;
document.querySelectorAll('[data-i18n]').forEach(function(n){var d=D[n.dataset.i18n];if(d&&d[l])n.innerHTML=d[l]});
document.querySelectorAll('.lang button').forEach(function(b){b.classList.toggle('on',b.dataset.lang===l)});
document.dispatchEvent(new Event('langchange'));
}
document.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){apply(b.dataset.lang)})});
apply(L);
})();
'''%json.dumps(TR,ensure_ascii=False))

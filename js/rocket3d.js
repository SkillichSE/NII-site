/* Optimism-1: интерактивный 3D-вьюер (three.js) с процедурным пламенем, искрами и дымом.
   Разметка: <div class="rk-view" data-model="heavy|lite"></div> (+ класс hero у главного).
   Мышь/палец - вращение, колесо/щипок - масштаб. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* Пути к моделям (можно заменить на blob-URL). xc - X-координата оси корпуса в OBJ. */
const CFG = {
  heavy: { url: 'models/optimism-1-heavy.obj', xc: -0.392, flame: { r: 0.17, len: 3.8 }, sparks: 110 },
  lite:  { url: 'models/optimism-1-lite.obj',  xc: -0.352, flame: { r: 0.14, len: 2.5 }, sparks: 60 },
};
const LEN = 19.6, S = 10 / LEN, TAIL = -5;        // модель масштабируется до 10 ед. в длину, нос смотрит в +X
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const texts = new Map();
const getText = (u) => { if (!texts.has(u)) texts.set(u, fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.text(); })); return texts.get(u); };

const FLAME_VS = `varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const FLAME_FS = `varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uTime,uInt,uCore;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .55*vn(p)+.3*vn(p*2.1+7.)+.15*vn(p*4.3+3.);}
void main(){
  float t=vUv.y,a=vUv.x*6.2831853;
  float fr=abs(dot(normalize(vN),normalize(vV)));
  float n=fbm(vec2(cos(a)*1.6,sin(a)*1.6+t*4.-uTime*7.));
  float body=pow(fr,mix(.9,.5,uCore))*(1.-t);
  float dia=pow(.5+.5*cos(t*30.),3.)*(1.-smoothstep(.12,.55,t))*smoothstep(.02,.1,t)*fr;
  float T=(body*(.55+.9*n)*1.5+dia*.5)*uInt*smoothstep(0.,.04,t);
  vec3 c=mix(vec3(.9,.12,.02),vec3(1.,.5,.08),smoothstep(.05,.55,T));
  c=mix(c,vec3(1.,.93,.7),smoothstep(.6,1.3,T));
  gl_FragColor=vec4(c*(.5+T),clamp(T,0.,1.));
}`;
const PT_VS = `attribute float aSize;attribute float aAlpha;varying float vA;uniform float uScale;
void main(){vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/(-mv.z);gl_Position=projectionMatrix*mv;}`;
const PT_FS = `uniform vec3 uCol;varying float vA;
void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);gl_FragColor=vec4(uCol,a*a*vA);}`;

function flameMesh(R, len, core, uni) {
  const pts = [], n = 28, L = len * (core ? 0.55 : 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = R * (0.85 + 0.65 * Math.sqrt(t)) * (1 - Math.pow(t, 1.7)) * (core ? 0.45 : 1);
    pts.push(new THREE.Vector2(Math.max(r, 0.0005), t * L));
  }
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: uni.uTime, uInt: uni.uInt, uCore: { value: core ? 1 : 0 } },
    vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 36), m);
}

function particles(N, col, blending) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), sz = new Float32Array(N), al = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(col) }, uScale: { value: 600 } },
    vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false;
  return { pts, g, m, pos, sz, al, N, age: new Float32Array(N).fill(99), life: new Float32Array(N), vel: new Float32Array(N * 3), cur: 0, acc: 0 };
}
function stepParticles(P, dt, rate, spawn, shape) {
  P.acc += rate * dt;
  while (P.acc >= 1) { P.acc--; const i = P.cur++ % P.N; spawn(P, i); P.age[i] = 0; }
  for (let i = 0; i < P.N; i++) {
    if (P.age[i] >= P.life[i]) { P.al[i] = 0; continue; }
    P.age[i] += dt; const k = P.age[i] / P.life[i];
    for (let c = 0; c < 3; c++) P.pos[i * 3 + c] += P.vel[i * 3 + c] * dt;
    P.vel[i * 3 + 1] += shape.g * dt;
    P.sz[i] = shape.size(k); P.al[i] = shape.alpha(k);
  }
  P.g.attributes.position.needsUpdate = P.g.attributes.aSize.needsUpdate = P.g.attributes.aAlpha.needsUpdate = true;
}

function makeViewer(el) {
  const cfg = CFG[el.dataset.model || 'heavy'];
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-модель ракеты Optimism-1');
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  const target = new THREE.Vector3(-1.2, 0, 0), D = 20, az = 0.55, el_ = 0.16;
  camera.position.set(target.x + D * Math.cos(el_) * Math.sin(az), D * Math.sin(el_), D * Math.cos(el_) * Math.cos(az));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target); controls.enablePan = false; controls.enableDamping = true;
  controls.minDistance = 7; controls.maxDistance = 40; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.9;
  renderer.domElement.style.touchAction = 'pan-y';   // вертикальный скролл страницы остаётся рабочим
  let idle; controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { clearTimeout(idle); if (!reduce) idle = setTimeout(() => (controls.autoRotate = true), 5000); });

  // свет
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fa6ff, 1.4); rim.position.set(-8, 4, -9); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x8aa4d6, 0x1a1512, 0.5));
  const glowL = new THREE.PointLight(0xff7a2a, 0, 14, 2); glowL.position.set(TAIL - 0.9, 0, 0); scene.add(glowL);

  // материалы
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.9, ...o });
  const M = {
    nose: std({ color: 0x1b1c21, roughness: 0.34, metalness: 0.2, transparent: true }),
    body: std({ color: 0xe9ebef, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide, transparent: true }),
    fin: std({ color: 0x0b0c0f, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }),
    motor: std({ color: 0x9aa0aa, roughness: 0.35, metalness: 0.85 }),
    ring: std({ color: 0x8a6240, roughness: 0.7 }), chute: std({ color: 0xff5a1f, roughness: 0.8, side: THREE.DoubleSide }),
    cord: std({ color: 0xffd111, roughness: 0.6 }), block: std({ color: 0x555a63, roughness: 0.6, metalness: 0.5 }),
  };
  const pick = (n) => { n = n.toLowerCase();
    return /nose/.test(n) ? ['nose', 1] : /body/.test(n) ? ['body', 1] : /fin/.test(n) ? ['fin', 0] :
      /rd1|inner/.test(n) ? ['motor', 1] : /centering/.test(n) ? ['ring', 1] : /parachute/.test(n) ? ['chute', 1] :
      /shock/.test(n) ? ['cord', 1] : ['block', 1]; };

  const holder = new THREE.Group(); scene.add(holder);
  const rocket = new THREE.Group(); holder.add(rocket);
  const info = document.createElement('div'); info.className = 'rk-load'; info.textContent = 'Загрузка модели…'; el.appendChild(info);
  getText(cfg.url).then((txt) => {
    const obj = new OBJLoader().parse(txt);
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const [k, smooth] = pick(o.name || '');
      let g = o.geometry.clone(); g.deleteAttribute('normal'); g.deleteAttribute('uv');
      g.translate(-cfg.xc, 0, 0);
      if (smooth) g = mergeVertices(g, 1e-4);
      g.computeVertexNormals();
      o.geometry = g; o.material = M[k];
    });
    obj.scale.setScalar(S); obj.rotation.y = Math.PI / 2; obj.position.x = -LEN / 2 * S;   // ось z модели -> +X
    rocket.add(obj); info.remove();
  }).catch(() => { info.textContent = '3D-модель не загрузилась'; });

  // пламя
  const uni = { uTime: { value: 0 }, uInt: { value: 0 } };
  const flame = new THREE.Group(); flame.position.x = TAIL + 0.05; flame.rotation.z = Math.PI / 2; holder.add(flame);
  flame.add(flameMesh(cfg.flame.r, cfg.flame.len, false, uni), flameMesh(cfg.flame.r, cfg.flame.len, true, uni));
  const sparks = particles(cfg.sparks * 3, 0xffa245, THREE.AdditiveBlending);
  const smoke = particles(90, 0x8d8f98, THREE.NormalBlending); smoke.m.uniforms.uCol.value.setRGB(0.5, 0.5, 0.54);
  holder.add(smoke.pts, sparks.pts);
  const rnd = (a) => (Math.random() - 0.5) * a;

  // интерфейс
  const ui = document.createElement('div'); ui.className = 'rk-ui';
  const mk = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.addEventListener('click', () => fn(b)); ui.appendChild(b); return b; };
  let burn = 1, xray = false, lvl = 0;
  const bEng = mk('Двигатель: вкл', (b) => { burn = burn ? 0 : 1; b.textContent = 'Двигатель: ' + (burn ? 'вкл' : 'выкл'); b.setAttribute('aria-pressed', !!burn); });
  bEng.setAttribute('aria-pressed', 'true');
  mk('Разрез', (b) => { xray = !xray; b.classList.toggle('on', xray); });
  el.appendChild(ui);
  const hint = document.createElement('div'); hint.className = 'rk-hint'; hint.textContent = 'Тяните, чтобы вращать'; el.appendChild(hint);

  const v = { visible: false, el };
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(7.6 / (D * camera.aspect))), 12, 55);
    camera.updateProjectionMatrix();
    const sc = (h * renderer.getPixelRatio() * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    sparks.m.uniforms.uScale.value = smoke.m.uniforms.uScale.value = sc;
  };
  new ResizeObserver(resize).observe(el); resize();
  new IntersectionObserver((e) => (v.visible = e[0].isIntersecting), { rootMargin: '80px' }).observe(el);

  let t = 0, started = false, delay = 0.5;
  v.tick = (dt) => {
    t += dt; if (!started) { delay -= dt; if (delay > 0) lvl = 0; else started = true; }
    const want = started ? burn : 0;
    lvl += (want - lvl) * Math.min(1, dt * (want > lvl ? 3.2 : 5));           // розжиг / выключение
    const fl = 0.94 + 0.06 * Math.sin(t * 41) + 0.04 * Math.sin(t * 23 + 1);
    uni.uTime.value = t; uni.uInt.value = lvl * (0.92 + 0.1 * fl);
    flame.visible = lvl > 0.01; flame.scale.set(0.6 + 0.4 * lvl, Math.max(lvl * fl, 0.001), 0.6 + 0.4 * lvl);
    glowL.intensity = 45 * lvl * fl;
    const sh = lvl * 0.5; holder.position.y = (Math.sin(t * 47) * 0.004 + Math.sin(t * 31) * 0.003) * sh;
    // разрез
    M.body.opacity += ((xray ? 0.14 : 1) - M.body.opacity) * Math.min(1, dt * 8);
    M.nose.opacity += ((xray ? 0.3 : 1) - M.nose.opacity) * Math.min(1, dt * 8);
    M.body.depthWrite = M.nose.depthWrite = M.body.opacity > 0.95;
    // частицы
    const R = cfg.flame.r;
    stepParticles(sparks, dt, cfg.sparks * lvl, (P, i) => {
      P.pos.set([TAIL, rnd(R), rnd(R)], i * 3); P.vel.set([-(7 + Math.random() * 10), rnd(3.2), rnd(3.2)], i * 3); P.life[i] = 0.3 + Math.random() * 0.55;
    }, { g: -2.5, size: (k) => 0.07 * (1 - k * 0.6), alpha: (k) => Math.min(1, (1 - k) * 1.6) });
    stepParticles(smoke, dt, 26 * lvl, (P, i) => {
      P.pos.set([TAIL - 0.3, rnd(R), rnd(R)], i * 3); P.vel.set([-(2.6 + Math.random() * 1.4), 0.25 + rnd(0.3), rnd(0.5)], i * 3); P.life[i] = 2.2 + Math.random() * 0.8;
    }, { g: 0.18, size: (k) => 0.5 + 2.4 * k, alpha: (k) => 0.2 * Math.pow(1 - k, 1.4) * Math.min(1, k * 8) });
    controls.update(); renderer.render(scene, camera);
  };
  return v;
}

const viewers = [];
document.querySelectorAll('.rk-view').forEach((el) => {
  try { viewers.push(makeViewer(el)); }
  catch (e) { el.innerHTML = '<div class="rk-load">3D недоступно в этом браузере</div>'; }
});
let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const v of viewers) if (v.visible) v.tick(dt);
  requestAnimationFrame(loop);
})(last);

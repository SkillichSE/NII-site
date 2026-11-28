/* Optimism: интерактивная 3D-модель (three.js); на корпусе крупно НИИ, мелко OPTIMISM. Вращение мышью/пальцем; без зума, без кнопок, страница скроллится свободно. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = document.querySelector('.rk-view');
if (el) { try { init(el); } catch (e) { console.error('rocket init', e); window.__rkFail && window.__rkFail(); } }

function init(el) {
  const ARIA = { ru: 'Интерактивная 3D-модель ракеты Optimism', en: 'Interactive 3D model of the Optimism rocket', uk: 'Інтерактивна 3D-модель ракети Optimism', kk: 'Optimism зымыранының интерактивті 3D моделі' };
  const setAria = () => el.setAttribute('aria-label', ARIA[document.documentElement.lang] || ARIA.en);
  setAria(); document.addEventListener('langchange', setAria);

  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.localClippingEnabled = true;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(R.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(26, 2.6, 0.1, 200);
  const ctl = new OrbitControls(cam, R.domElement);
  ctl.enablePan = false; ctl.enableZoom = false; ctl.enableDamping = true;
  ctl.autoRotate = !reduce; ctl.autoRotateSpeed = 0.8;
  ctl.minPolarAngle = 0.55; ctl.maxPolarAngle = 2.5;
  R.domElement.style.touchAction = 'pan-y';          // вертикальный свайп скроллит страницу
  let curD = 0, idle, dir = new THREE.Vector3(0.2, 0.12, 0.97).normalize();
  ctl.addEventListener('start', () => { ctl.autoRotate = false; clearTimeout(idle); });
  ctl.addEventListener('end', () => { if (!reduce) idle = setTimeout(() => (ctl.autoRotate = true), 4000); });

  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fa6ff, 1.3); rim.position.set(-8, 4, -9); scene.add(rim);
  const glow = new THREE.PointLight(0xff7a2a, 0, 18, 2); scene.add(glow);

  const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, side: THREE.DoubleSide });
  const WHITE = 0xf4f5f7, white = (r = 0.3, m = 0.05) => std(WHITE, r, m);   // снаружи вся ракета белая
  const mats = { nose: white(0.3), fin: white(0.35), motor: white(0.35, 0.15), body: white(0.3), ring: white(0.6, 0), chute: white(0.8, 0), cord: white(0.6, 0), inner: white(0.6, 0.1), weight: white(0.4, 0.1), wad: white(0.9, 0) };
  const TINT = { motor: [0x9aa0aa, 0.35, 0.85], ring: [0x8a6240, 0.7, 0], chute: [0xff5a1f, 0.8, 0], cord: [0xffd111, 0.6, 0], inner: [0x555a63, 0.6, 0.5], weight: [0x6b6f78, 0.4, 0.8], wad: [0xd8c9a6, 0.9, 0] };
  const pick = (n) => /weight/.test(n) ? 'weight' : /nose/.test(n) ? 'nose' : /rd1/.test(n) ? 'motor' : /airframe|body/.test(n) ? 'body'
    : /fin/.test(n) ? 'fin' : /centering|motor block/.test(n) ? 'ring' : /parachute/.test(n) ? 'chute' : /shock/.test(n) ? 'cord' : /wadding|flame/.test(n) ? 'wad' : 'inner';

  /* ---------- разрез: плоскость через ось, всегда отсекает половину, обращённую к камере ---------- */
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1);
  Object.values(mats).forEach((m) => { m.clippingPlanes = [clip]; });
  let secOn = false, secD = 1, tinted = false, logoMat = null;
  const BASE = {}; for (const k in TINT) BASE[k] = [mats[k].roughness, mats[k].metalness];
  const tint = (on) => { tinted = on; for (const k in TINT) { const m = mats[k], v = TINT[k]; m.color.setHex(on ? v[0] : WHITE); m.roughness = on ? v[1] : BASE[k][0]; m.metalness = on ? v[2] : BASE[k][1]; } };
  const cutBtn = document.querySelector('.rk-cut'), legend = document.querySelector('.rk-legend');
  if (cutBtn) cutBtn.addEventListener('click', () => {
    secOn = !secOn; cutBtn.setAttribute('aria-pressed', secOn);
    if (legend) legend.classList.toggle('on', secOn);
    if (secOn) tint(true);
  });

  const rocket = new THREE.Group(); scene.add(rocket);
  const FX = new THREE.Group(); scene.add(FX);       // весь огонь: плюм, ядро, свечение, дым, искры
  const U = { uTime: { value: 0 }, uInt: { value: 0 }, uLen: { value: 1 } };
  let tailX = -5, ready = false;
  const NR = 0.2;                                    // радиус сопла в сцене
  const LP = 4.3;                                     // длина факела
  const parts = {};


  /* ---------- огонь ---------- */
  const GL = `
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .5*vn(p)+.28*vn(p*2.07+7.1)+.15*vn(p*4.3+3.3)+.07*vn(p*8.9+1.7);}
vec3 ramp(float T){
vec3 c=mix(vec3(0.),vec3(.30,.02,.005),smoothstep(0.,.12,T));
c=mix(c,vec3(.85,.14,.015),smoothstep(.12,.3,T));
c=mix(c,vec3(1.,.36,.05),smoothstep(.3,.55,T));
c=mix(c,vec3(1.,.66,.2),smoothstep(.55,.85,T));
c=mix(c,vec3(1.,.9,.55),smoothstep(.85,1.15,T));
return mix(c,vec3(1.,.98,.86),smoothstep(1.15,1.6,T));}`;
  const vs = 'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}';
  const fsHead = 'varying vec3 vP;varying vec3 vN;varying vec3 vV;uniform float uTime,uInt,uLen,uMode;uniform float uL;' + GL;
  const fsPlume = fsHead + `
void main(){
 float u=vP.y/(uL*uLen);                       // 0 у сопла, 1 на конце факела
 float fr=abs(dot(normalize(vN),normalize(vV)));
 vec3 q=vec3(vP.x*5.,vP.y*2.4-uTime*6.5,vP.z*5.);
 vec3 w=vec3(vn(q*.7+uTime*.3),vn(q*.7+11.),vn(q*.7+23.))-.5;
 float n=fbm(q+w*1.6);
 float edge=smoothstep(0.,.45,fr-(1.-n)*.32*(.3+u));
 float dens=pow(fr,.85)*edge;
 float T=1.5*dens*exp(-0.75*u)*(.6+.8*n);
 T*=1.-smoothstep(.7,1.,u);
 // ударные диски
 float dia=pow(.5+.5*cos(vP.y/(uL*uLen)*22.),2.)*(1.-smoothstep(.0,.65,u));
 T+=.6*dia*pow(fr,1.5)*exp(-1.1*u);
 T*=uInt*smoothstep(0.,.03,u);
 vec3 c=ramp(T);
 gl_FragColor=vec4(c*(.9+1.8*T),1.-exp(-2.6*T));
}`;
  const fsCore = fsHead + `
void main(){
 float u=vP.y/(uL*uLen);
 float fr=abs(dot(normalize(vN),normalize(vV)));
 float n=fbm(vec3(vP.x*9.,vP.y*3.-uTime*9.,vP.z*9.));
 float dia=.3+.7*pow(.5+.5*cos(vP.y/(uL*uLen)*30.),2.);
 float T=1.35*pow(fr,1.3)*exp(-1.2*u)*dia*(.8+.4*n)*smoothstep(.0,.05,u)*(1.-smoothstep(.55,.95,u))*uInt;
 vec3 c=ramp(T+.15);
 gl_FragColor=vec4(c*(1.+1.6*T),clamp(T*1.4,0.,1.));
}`;
  const ease = (x) => x * x * (3 - 2 * x);
  const lathe = (fn, n, rmul, umax) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const u = (i / n) * umax; let r = fn(u) * rmul; if (i === n) r = 4e-4; pts.push(new THREE.Vector2(Math.max(r, 4e-4), u * LP)); }
    return new THREE.LatheGeometry(pts, 40);
  };
  const wdt = (u) => NR * (0.95 + 0.85 * Math.sqrt(u)) * (1 - 0.55 * ease(Math.min(Math.max((u - 0.4) / 0.8, 0), 1)));
  function mk(frag, geo, extra = {}) {
    return new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { ...U, uL: { value: LP }, uMode: { value: 0 } }, vertexShader: vs, fragmentShader: frag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra }));
  }
  function radialTex(stops, size = 128) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }
  function smokeTex() {
    const size = 128, c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    for (let i = 0; i < 9; i++) { const cx = size / 2 + (Math.random() - .5) * 46, cy = size / 2 + (Math.random() - .5) * 46, r = 26 + Math.random() * 22;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, size, size); }
    return new THREE.CanvasTexture(c);
  }

  function buildFX() {
    FX.position.set(tailX, 0, 0);
    const plume = mk(fsPlume, lathe(wdt, 44, 1, 1.3)); plume.rotation.z = Math.PI / 2; plume.renderOrder = 3;
    const core = mk(fsCore, lathe(wdt, 36, 0.4, 1.0)); core.rotation.z = Math.PI / 2; core.renderOrder = 4;
    const grp = new THREE.Group(); grp.add(plume, core); FX.add(grp); parts.grp = grp;
    // свечение на срезе сопла и широкое гало
    const gm = (tex, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); sp.renderOrder = 5; return sp; };
    parts.flash = gm(radialTex([[0, 'rgba(255,240,200,1)'], [.25, 'rgba(255,170,70,.55)'], [1, 'rgba(255,90,20,0)']]), 1.1); parts.flash.position.set(-0.12, 0, 0);
    parts.halo = gm(radialTex([[0, 'rgba(255,150,60,.5)'], [.5, 'rgba(255,90,20,.14)'], [1, 'rgba(255,60,10,0)']]), 4.6); parts.halo.position.set(-0.9, 0, 0);
    FX.add(parts.flash, parts.halo);
    glow.position.set(tailX - 1, 0, 0);
    // дым
    const tex = smokeTex(), NS = 38; parts.smoke = [];
    for (let i = 0; i < NS; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, rotation: Math.random() * 6.28 }));
      sp.renderOrder = 1; sp.userData = { age: Math.random() * 3, life: 2.2 + Math.random() * 1.6, v: 0.9 + Math.random() * 1.1, y: (Math.random() - .5) * .3, z: (Math.random() - .5) * .3, s0: .25 + Math.random() * .2, spin: (Math.random() - .5) * .5 };
      FX.add(sp); parts.smoke.push(sp);
    }
    // искры-штрихи
    const N = 110; const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ls.frustumCulled = false; ls.renderOrder = 6; FX.add(ls);
    parts.sp = { g, N, p: Array.from({ length: N }, () => new THREE.Vector3(0, -999, 0)), v: Array.from({ length: N }, () => new THREE.Vector3()), age: new Float32Array(N).fill(9), life: new Float32Array(N) };
  }

  function resize() {
    const w = el.clientWidth, h = Math.round(el.clientHeight * 1.4); if (!w || !h) return;   // холст выше блока на 20% сверху и снизу
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const half = Math.min(13 * Math.PI / 180, Math.atan(Math.tan(13 * Math.PI / 180) * cam.aspect));
    const D = 7.6 / Math.sin(half);              // вся сфера (ракета + факел) влезает при любом повороте
    if (cam.position.lengthSq() > 0.01 && ctl.target.lengthSq() > 0) dir.copy(cam.position).sub(ctl.target).normalize();
    ctl.target.set(-2.1, 0, 0); cam.position.copy(ctl.target).addScaledVector(dir, D); curD = 0;
  }
  resize();
  new ResizeObserver(resize).observe(el);

  // точная подгонка: камера держит ракету с факелом в кадре при любом повороте, но как можно крупнее
  const fitPts = []; const vR = new THREE.Vector3(), vU = new THREE.Vector3(), vT = new THREE.Vector3();
  function makeFitPts() {
    const x0 = tailX, x1 = tailX + 10, fl = x0 - LP * 1.15;
    fitPts.push(new THREE.Vector3(x1, 0, 0), new THREE.Vector3(fl, 0, 0));
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      fitPts.push(new THREE.Vector3(x0, a * 0.7, b * 0.7), new THREE.Vector3(x0 - 1.4, a * 0.4, b * 0.4), new THREE.Vector3(x1 - 1, a * 0.25, b * 0.25));
    }
  }
  function fit(dt) {
    if (!fitPts.length) return;
    vT.copy(cam.position).sub(ctl.target); const len = vT.length(); if (len < 1e-3) return; vT.divideScalar(len);
    cam.updateMatrixWorld(); vR.setFromMatrixColumn(cam.matrixWorld, 0); vU.setFromMatrixColumn(cam.matrixWorld, 1);
    const tv = Math.tan(13 * Math.PI / 180), th = tv * cam.aspect; let need = 0;
    for (const p of fitPts) {
      const q = p.clone().sub(ctl.target), d = q.dot(vT);
      need = Math.max(need, d + 1.06 * Math.max(Math.abs(q.dot(vR)) / th, Math.abs(q.dot(vU)) / tv));
    }
    curD = curD ? curD + (need - curD) * Math.min(dt * 5, 1) : need;
    cam.position.copy(ctl.target).addScaledVector(vT, curD);
  }


  /* ---------- надпись OPTIMISM на корпусе (из логотипа SVG), с двух сторон ---------- */
  const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 760 132" width="2048" height="356" fill="none" stroke-width="7" stroke-linecap="butt">'
    + '<g transform="translate(469.75,31) scale(0.5)">'
    + '<g transform="translate(40,40)" stroke="#0b0b0b"><ellipse cx="28" cy="30" rx="28" ry="30"/></g>'
    + '<g transform="translate(127,40)" stroke="#0b0b0b" stroke-linejoin="miter"><path d="M0 63.5V0H28A15 15 0 0 1 28 30H0"/></g>'
    + '<g transform="translate(190,40)" stroke="#0b0b0b" stroke-linejoin="miter"><path d="M0 0H44M22 0V63.5"/></g>'
    + '<g transform="translate(257,40)" stroke="#0b0b0b"><path d="M0 -3.5V63.5"/></g>'
    + '<g transform="translate(289,40)" stroke="#0b0b0b" stroke-linejoin="bevel"><path d="M0 63.5V-3.5L24 34L48 -3.5V63.5"/></g>'
    + '<g transform="translate(369,40)" stroke="#0b0b0b"><path d="M0 16V63.5"/><path d="M0 -3.5V5" stroke="#ff5a1f"/></g>'
    + '<g transform="translate(398,40)" stroke="#0b0b0b" stroke-linejoin="miter"><path d="M42 0H15A15 15 0 0 0 15 30H27A15 15 0 0 1 27 60H0"/></g>'
    + '<g transform="translate(469,40)" stroke="#0b0b0b" stroke-linejoin="bevel"><path d="M0 63.5V-3.5L24 34L48 -3.5V63.5"/></g>'
    + '</g>'
    + '<g transform="translate(499,-136.24) scale(2)" fill="#0b0b0b" stroke="none"><path d="M-230.50 69.12L-230.50 132.88L-206.00 132.88L-205.75 94.38L-176.75 132.88L-150.25 132.88L-150.25 69.12L-174.75 69.12L-175.00 107.62L-204.00 69.12Z"/><path d="M-120.00 69.12L-120.00 132.88L-94.75 132.88L-94.75 69.12Z"/><path d="M-42.50 5.62L-66.50 12.88L-47.25 74.62L-23.25 67.12Z"/><rect x="-5.40" y="-24.79" width="10.81" height="49.57" rx="2.16" transform="translate(-40.56 110.11) rotate(-17.50)"/><rect x="-5.39" y="-18.07" width="10.79" height="36.14" rx="2.16" transform="translate(-26.43 98.62) rotate(-17.49)"/><rect x="-5.39" y="-12.41" width="10.77" height="24.82" rx="2.15" transform="translate(-12.01 88.13) rotate(-17.59)"/></g></svg>';
  function addLogo() {
    const bb = new THREE.Box3();
    rocket.traverse((m) => { if (m.isMesh && m.userData.k === 'body') bb.union(new THREE.Box3().setFromObject(m)); });
    if (bb.isEmpty()) return;
    const r = (bb.max.y - bb.min.y) / 2 + 0.002, cy = (bb.max.y + bb.min.y) / 2, cz = (bb.max.z + bb.min.z) / 2;
    const bl = bb.max.x - bb.min.x, finEnd = bb.min.x + bl * 0.2;      // оперение занимает хвост корпуса
    const xc = finEnd + (bb.max.x - finEnd) / 2 - 0.1;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 356;
      cv.getContext('2d').drawImage(img, 0, 0, 2048, 356);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = R.capabilities.getMaxAnisotropy(); tex.needsUpdate = true;
      const mat = logoMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, clippingPlanes: [clip], roughness: 0.3, metalness: 0.05,
        side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const Hh = 1.25 * r * 132 / 71, Lg = Hh * 760 / 132, NV = 72;
      for (const s of [1, -1]) {                                       // +z и -z: читается слева направо с обеих сторон
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= 1; i++) for (let j = 0; j <= NV; j++) {
          const a = (j / NV - 0.5) * Hh / r;
          pos.push(xc + s * (i - 0.5) * Lg, cy + r * Math.sin(a), cz + s * r * Math.cos(a)); uv.push(i, j / NV);
        }
        for (let j = 0; j < NV; j++) { const a = j, b = j + 1, c = NV + 1 + j, d = NV + 2 + j; idx.push(a, b, c, b, d, c); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx); g.computeVertexNormals();
        const nrm = g.attributes.normal; for (let k = 0; k < nrm.count; k++) { const y = g.attributes.position.getY(k) - cy, z = g.attributes.position.getZ(k) - cz, l = Math.hypot(y, z); nrm.setXYZ(k, 0, y / l, z / l); }
        const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 2; rocket.add(mesh);
      }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);
  }

  new OBJLoader().load('models/hialt-29.obj?v=1', (obj) => {
    obj.traverse((m) => {
      if (!m.isMesh) return;
      const k = pick(m.name.toLowerCase());
      m.geometry.deleteAttribute('normal'); m.geometry.deleteAttribute('uv');
      m.geometry = toCreasedNormals(m.geometry, 0.6); m.material = mats[k]; m.userData.k = k;
    });
    const w = new THREE.Group(); w.add(obj);
    // ось ракеты берём по корпусу (оперение несимметрично), длину по всей модели
    const bb = new THREE.Box3(), ball = new THREE.Box3();
    obj.traverse((m) => { if (!m.isMesh) return; m.geometry.computeBoundingBox(); ball.union(m.geometry.boundingBox); if (m.userData.k !== 'fin') bb.union(m.geometry.boundingBox); });
    const len = ball.max.z - ball.min.z;
    obj.position.set(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(ball.min.z + len / 2));
    w.rotation.y = Math.PI / 2; w.scale.setScalar(10 / len);
    rocket.add(w); rocket.updateMatrixWorld(true);
    try { addLogo(); } catch (e) { console.error('rocket logo', e); }
    tailX = new THREE.Box3().setFromObject(rocket).min.x;
    try { buildFX(); makeFitPts(); ready = true; } catch (e) { console.error('rocket fx', e); }
    resize();
  }, undefined, (e) => console.error('hialt-29.obj', e));


  let vis = true, t0 = performance.now() / 1000;
  new IntersectionObserver((e) => { const v = e[0].isIntersecting; if (v && !vis) t0 = performance.now() / 1000; vis = v; }).observe(el);   // розжиг заново при возврате к модели
  const clock = new THREE.Clock(); const tmp = new THREE.Vector3();

  (function loop() {
    requestAnimationFrame(loop); if (!vis) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, ti = performance.now() / 1000 - t0;
    if (ready) try {
      // розжиг: вспышка, перерегулирование, затем штатный режим
      const lam = ti < 1.6 ? ease(Math.min(ti / 0.9, 1)) + 0.16 * Math.exp(-(((ti - 1.0) / 0.35) ** 2)) : 1;
      const inten = (0.25 + 0.75 * ease(Math.min(ti / 0.7, 1))) * (1 + 0.35 * Math.exp(-(((ti - 0.5) / 0.35) ** 2)));
      const flare = Math.exp(-(((ti - 0.3) / 0.28) ** 2));
      const flick = 1 + 0.06 * Math.sin(t * 19) + 0.035 * Math.sin(t * 31 + 1.3);
      const shake = 1 + 2.6 * Math.exp(-(((ti - 0.6) / 0.5) ** 2));
      const I = inten * flick;
      U.uTime.value = t; U.uInt.value = I; U.uLen.value = Math.max(lam, 0.04);
      parts.grp.scale.set(1, 1, 1);
      FX.position.y = shake * 0.004 * Math.sin(t * 47); FX.position.z = shake * 0.004 * Math.cos(t * 39);
      rocket.position.y = FX.position.y; rocket.position.z = FX.position.z;
      parts.flash.material.opacity = Math.min(1, 0.55 * I + flare); parts.flash.scale.setScalar(0.8 + 0.25 * I + 1.1 * flare);
      parts.halo.material.opacity = Math.min(1, 0.45 * I + 0.5 * flare); parts.halo.scale.setScalar(4.2 + 1.2 * flare + 0.2 * Math.sin(t * 23));
      glow.intensity = I * (11 + 2 * Math.sin(t * 31)) + flare * 25;
      // дым
      for (const sp of parts.smoke) { const d = sp.userData; d.age += dt;
        if (d.age > d.life) { d.age = 0; d.life = 2.2 + Math.random() * 1.6; d.v = 0.9 + Math.random() * 1.1; d.y = (Math.random() - .5) * .3; d.z = (Math.random() - .5) * .3; }
        const a = d.age / d.life, x0 = -LP * 0.55 * lam;
        sp.position.set(x0 - d.v * d.age * 1.6, d.y * (1 + a * 2) + 0.35 * d.age * d.age * 0.35, d.z * (1 + a * 2));
        sp.scale.setScalar(d.s0 + d.age * 0.85); sp.material.rotation += d.spin * dt;
        sp.material.opacity = 0.2 * Math.sin(Math.PI * Math.min(a * 1.15, 1)) ** 1.5 * Math.min(I, 1) * Math.min(lam * 1.5, 1);
        sp.material.color.setRGB(0.66 - 0.2 * a + 0.2 * (1 - a) ** 3, 0.62 - 0.14 * a, 0.6 - 0.08 * a); }
      // искры
      const S = parts.sp, P = S.g.attributes.position, C = S.g.attributes.color;
      const spawn = lam > 0.3 ? 1 : 0, burst = ti < 1.2 ? 2.5 : 1;
      for (let i = 0; i < S.N; i++) {
        S.age[i] += dt;
        if (S.age[i] > S.life[i] && spawn && Math.random() < dt * 6 * burst) {
          S.age[i] = 0; S.life[i] = 0.3 + Math.random() * 0.55;
          S.p[i].set(-0.15 - Math.random() * 0.4, (Math.random() - .5) * .12, (Math.random() - .5) * .12);
          S.v[i].set(-(5 + Math.random() * 8), (Math.random() - .5) * 2.4, (Math.random() - .5) * 2.4);
        }
        if (S.age[i] <= S.life[i]) {
          S.p[i].addScaledVector(S.v[i], dt); S.p[i].y -= 1.6 * dt * S.age[i];
          const k = 1 - S.age[i] / S.life[i]; tmp.copy(S.v[i]).multiplyScalar(0.035);
          P.setXYZ(i * 2, S.p[i].x, S.p[i].y, S.p[i].z); P.setXYZ(i * 2 + 1, S.p[i].x - tmp.x, S.p[i].y - tmp.y, S.p[i].z - tmp.z);
          C.setXYZ(i * 2, 1, 0.45 + 0.5 * k, 0.1 + 0.35 * k * k); C.setXYZ(i * 2 + 1, 0.25 * k, 0.05 * k, 0);
        } else { P.setXYZ(i * 2, 0, -999, 0); P.setXYZ(i * 2 + 1, 0, -999, 0); }
      } P.needsUpdate = true; C.needsUpdate = true;
    } catch (e) { console.error('rocket fx loop', e); ready = false; parts.grp && (FX.visible = false); }
    secD += ((secOn ? 0 : 1) - secD) * Math.min(dt * 4, 1);
    if (!secOn && secD > 0.985) { secD = 1; if (tinted) tint(false); }
    let ny = cam.position.y, nz = cam.position.z; const nl = Math.hypot(ny, nz);
    if (nl < 1e-3) { ny = 0; nz = 1; } else { ny /= nl; nz /= nl; }
    clip.normal.set(0, -ny, -nz); clip.constant = secD;
    if (logoMat) logoMat.opacity = Math.max(0, (secD - 0.6) / 0.4);
    ctl.update(); fit(dt); R.render(scene, cam); window.__rk = 1;
  })();
}

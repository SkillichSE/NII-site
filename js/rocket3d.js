/* Optimism-1: интерактивная 3D-модель (three.js). Мышь/палец — вращение, колесо/щипок — масштаб. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = document.querySelector('.rk-view'); if (el) init(el);

function init(el) {
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(R.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(26, 2.6, 0.1, 200);
  const ctl = new OrbitControls(cam, R.domElement);
  ctl.enablePan = false; ctl.enableDamping = true; ctl.autoRotate = !reduce; ctl.autoRotateSpeed = 0.8;
  ctl.minDistance = 5; ctl.maxDistance = 40; R.domElement.style.touchAction = 'pan-y';
  let fit = true, idle;
  ctl.addEventListener('start', () => { fit = false; ctl.autoRotate = false; clearTimeout(idle); });
  ctl.addEventListener('end', () => { if (!reduce) idle = setTimeout(() => (ctl.autoRotate = true), 5000); });

  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fa6ff, 1.3); rim.position.set(-8, 4, -9); scene.add(rim);
  const glow = new THREE.PointLight(0xff7a2a, 0, 16, 2); scene.add(glow);

  const std = (c, r, m, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, side: THREE.DoubleSide, ...o });
  const mats = {
    nose: std(0x15161a, 0.3, 0.2), fin: std(0x0b0c0f, 0.45, 0.3), motor: std(0x9aa0aa, 0.35, 0.85),
    body: std(0xe9ebef, 0.3, 0.05, { transparent: true }), ring: std(0x8a6240, 0.7, 0),
    chute: std(0xff5a1f, 0.8, 0), cord: std(0xffd111, 0.6, 0), inner: std(0x555a63, 0.6, 0.5),
  };
  const pick = (n) => /nose/.test(n) ? 'nose' : /rd1/.test(n) ? 'motor' : /inner/.test(n) ? 'inner' : /body/.test(n) ? 'body'
    : /fin/.test(n) ? 'fin' : /centering/.test(n) ? 'ring' : /parachute/.test(n) ? 'chute' : /shock/.test(n) ? 'cord' : 'inner';

  const rocket = new THREE.Group(); scene.add(rocket);
  const flame = { on: true, grp: new THREE.Group(), u: { uTime: { value: 0 }, uInt: { value: 1 } } };
  let tailX = -5, sparks;

  new OBJLoader().load('models/rocket.obj', (obj) => {
    obj.traverse((m) => {
      if (!m.isMesh) return;
      const k = pick(m.name.toLowerCase());
      m.geometry.deleteAttribute('normal'); m.geometry.deleteAttribute('uv');
      m.geometry = toCreasedNormals(m.geometry, 0.6); m.material = mats[k]; m.userData.k = k;
    });
    const w = new THREE.Group(); w.add(obj);
    obj.position.set(0.352, 0, -9.8); w.rotation.y = Math.PI / 2; w.scale.setScalar(10 / 19.6);
    rocket.add(w); rocket.updateMatrixWorld(true);
    tailX = new THREE.Box3().setFromObject(rocket).min.x;
    buildFlame(); resize();
  });

  function buildFlame() {
    const pts = [], n = 28, L = 3.2, r0 = 0.2;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(Math.max(r0 * (0.9 + 0.6 * Math.sqrt(t)) * (1 - t ** 1.7), 5e-4), t * L)); }
    const mat = new THREE.ShaderMaterial({
      uniforms: flame.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}',
      fragmentShader: `varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uTime,uInt;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){float t=vUv.y,a=vUv.x*6.2831853;float fr=abs(dot(normalize(vN),normalize(vV)));
float n=.6*vn(vec2(cos(a)*1.6,sin(a)*1.6+t*4.-uTime*8.))+.4*vn(vec2(cos(a)*3.,sin(a)*3.+t*9.-uTime*13.));
float dia=pow(.5+.5*cos(t*28.),3.)*(1.-smoothstep(.1,.5,t))*fr;
float T=(pow(fr,.7)*(1.-t)*(.55+.9*n)*1.5+dia*.5)*uInt*smoothstep(0.,.04,t);
vec3 c=mix(vec3(.9,.12,.02),vec3(1.,.5,.08),smoothstep(.05,.55,T));c=mix(c,vec3(1.,.93,.7),smoothstep(.6,1.3,T));
gl_FragColor=vec4(c*(.5+T),clamp(T,0.,1.));}`,
    });
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), mat); m.rotation.z = Math.PI / 2; // факел вдоль -X
    flame.grp.add(m); flame.grp.position.set(tailX, 0, 0); scene.add(flame.grp);
    glow.position.set(tailX - 1, 0, 0);
    const N = 70, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    sparks = { g, N, v: Array.from({ length: N }, () => new THREE.Vector3()), age: new Float32Array(N).fill(9), life: new Float32Array(N) };
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffb040, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.frustumCulled = false; scene.add(p);
  }

  const bodyMats = [mats.body]; let cut = false;
  const ui = document.createElement('div'); ui.className = 'rk-ui';
  ui.innerHTML = '<button class="on" data-a="fire">Двигатель</button><button data-a="cut">Разрез</button><button data-a="reset">Сброс вида</button>';
  el.appendChild(ui);
  const home = () => { fit = true; resize(); };
  ui.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'fire') { flame.on = !flame.on; b.classList.toggle('on', flame.on); }
    if (b.dataset.a === 'cut') { cut = !cut; b.classList.toggle('on', cut); mats.body.opacity = cut ? 0.12 : 1; mats.body.depthWrite = !cut; mats.nose.transparent = cut; mats.nose.opacity = cut ? 0.2 : 1; }
    if (b.dataset.a === 'reset') home(); });

  function resize() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (fit) { const D = Math.max(15.5 / (2 * Math.tan(13 * Math.PI / 180) * cam.aspect), 11);
      ctl.target.set(-1.6, 0, 0); cam.position.set(-1.6 + D * 0.2, D * 0.12, D * 0.97); }
  }
  new ResizeObserver(resize).observe(el);

  let vis = true; new IntersectionObserver((e) => (vis = e[0].isIntersecting)).observe(el);
  const clock = new THREE.Clock(); let k = 0;
  (function loop() {
    requestAnimationFrame(loop); if (!vis) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    k += ((flame.on ? 1 : 0) - k) * Math.min(dt * 5, 1);   // плавный розжиг и затухание
    flame.u.uTime.value = t; flame.u.uInt.value = k * (1 + 0.07 * Math.sin(t * 25));
    flame.grp.visible = k > 0.02; glow.intensity = k * (12 + 2 * Math.sin(t * 31));
    if (sparks) { const P = sparks.g.attributes.position;
      for (let i = 0; i < sparks.N; i++) {
        sparks.age[i] += dt;
        if (sparks.age[i] > sparks.life[i] && flame.on) { sparks.age[i] = 0; sparks.life[i] = 0.25 + Math.random() * 0.5;
          P.setXYZ(i, tailX - 0.2, (Math.random() - .5) * .1, (Math.random() - .5) * .1);
          sparks.v[i].set(-(4 + Math.random() * 7), (Math.random() - .5) * 2.2, (Math.random() - .5) * 2.2); }
        if (sparks.age[i] <= sparks.life[i]) { P.setXYZ(i, P.getX(i) + sparks.v[i].x * dt, P.getY(i) + sparks.v[i].y * dt - 1.5 * dt * dt, P.getZ(i) + sparks.v[i].z * dt); }
        else P.setXYZ(i, 0, -999, 0);
      } P.needsUpdate = true; }
    ctl.update(); R.render(scene, cam);
  })();
}

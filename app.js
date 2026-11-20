// Pink Flask Lab (grab version): a 3-step indicator experiment, no mat.
//   1. dilute sodium hydroxide (a base) into the flask       -> colourless
//   2. three drops of phenolphthalein (an indicator)         -> pink (phenolphthalein is pink in a base)
//   3. dilute hydrochloric acid (an acid) into the flask      -> the pink goes (the base is neutralised)
// The pointer sits on your index fingertip. Move it onto the glowing bottle and close your fingers (pinch or fist) to grab it.
// Once grabbed, the bottle stays in your hand (opening the fingers does not drop it): bring it to the glowing flask and it
// pours by itself. A finger on the screen or the mouse works the same: press = close. Size: the +/- buttons.
import * as THREE from 'three';
import { createGestures } from './gesture.js';

const KIT = self.EB.kits.get('lab_glassware'), lib = { THREE }, U = KIT._util;
const make = (p, o = {}) => KIT[p](o, lib);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, sm = t => t * t * (3 - 2 * t);
const $ = id => document.getElementById(id);
const PHONE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));

// ---------------------------------------------------------------- renderer + scene (1 unit = 10 cm, kit units)
const renderer = new THREE.WebGLRenderer({ canvas: $('cv'), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.01, 60);
scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6a4a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-2, 6, 3); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 15 }); sun.shadow.bias = -0.002;

const lab = new THREE.Group(); scene.add(lab); lab.add(sun, sun.target);   // the sun moves and scales with the lab
// in the room the real table is the bench: only the shadows are drawn on it
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .3 }));
catcher.receiveShadow = true; catcher.position.y = .002; catcher.visible = false; lab.add(catcher);
function setLabScale(v) {
  lab.scale.setScalar(v);
  Object.assign(sun.shadow.camera, { left: -3 * v, right: 3 * v, top: 3 * v, bottom: -3 * v, near: .5 * v, far: 15 * v }); sun.shadow.camera.updateProjectionMatrix();
}
const bench = make('bench', { w: 2.9, d: 2.1, shelf: false }); lab.add(bench);

// the pieces (home = where they stand on the bench)
const LIQ = { base: '#dcedf5', acid: '#e2eff4', pink: '#e2338f', ind: '#eef1f2' };
const I = {};
function add(id, obj, x, z, o) { obj.position.set(x, 0, z); lab.add(obj); obj.traverse(m => { m.userData.item = id; });
  return (I[id] = Object.assign({ id, obj, home: obj.position.clone(), grip: .45 }, o)); }
add('base', make('bottle', { label: 'Dilute sodium hydroxide', color: LIQ.base, alpha: .4 }), -.95, -.45, { name: 'Dilute sodium hydroxide', mouth: .83, cap: 250, V: 200 });
add('ind', make('dropper_bottle', { label: 'Phenolphthalein', color: LIQ.ind }), -.6, .78, { name: 'Phenolphthalein', mouth: .74, grip: .3, cap: 30, V: 24 });
add('acid', make('bottle', { label: 'Dilute hydrochloric acid', color: LIQ.acid, alpha: .4 }), .95, -.45, { name: 'Dilute hydrochloric acid', mouth: .83, cap: 250, V: 200 });
add('flask', make('conical_flask', { ml: 250 }), .3, .3, { name: 'Conical flask', mouth: 1.02 });
for (const it of Object.values(I)) it.obj.traverse(m => { if (m.isMesh && !m.userData.outline) m.castShadow = m.castShadow && !m.material.transparent; });
// the stoppers come off the bottles we pour from (they lie on the bench next to them)
for (const id of ['base', 'acid']) {
  const o = I[id].obj, parts = o.children.filter(c => c.position.y > .8);
  for (const p of parts) if (!(p.geometry && p.geometry.type === 'TorusGeometry')) p.visible = false;
}

// ---------------------------------------------------------------- the chemistry (mL)
let F;   // flask contents
function fresh() { F = { base: 0, acid: 0, drops: 0 }; I.base.V = 200; I.acid.V = 200; }
// phenolphthalein: pink while there is spare base, colourless once the acid has used it all up (and in acid)
function flaskColour() {
  if (F.drops <= 0) return LIQ.base;
  const spare = F.base - F.acid, k = clamp(spare / 6, 0, 1) * clamp(F.drops / 3, 0, 1);
  return new THREE.Color(LIQ.base).lerp(new THREE.Color(LIQ.pink), .15 + .85 * k).getStyle();
}
const fVol = () => F.base + F.acid + F.drops * .05;
function drawFlask() {
  const v = fVol(), col = flaskColour(), pink = F.drops > 0 && F.base - F.acid > .5;
  KIT.setContents(I.flask.obj, v > .2 ? { layers: [{ from: 0, to: Math.min(.95, v / 250), color: col, alpha: pink ? .78 : .45 }] } : {}, lib);
}

// ---------------------------------------------------------------- the steps
const STEPS = [
  { src: 'base', give: 50, t: 'Take the dilute sodium hydroxide.', t2: 'Now bring it to the glowing flask.', why: 'Point at it with your finger, then close your fingers to pick it up. Sodium hydroxide is a base: it looks just like water.',
    after: 'A clear, colourless liquid. You cannot tell it is a base just by looking.' },
  { src: 'ind', give: 3, t: 'Take the phenolphthalein bottle.', t2: 'Bring it to the flask to add a few drops.', why: 'Phenolphthalein is an indicator: its colour tells us if a liquid is a base.',
    after: 'It turned pink! Phenolphthalein is pink in a base.' },
  { src: 'acid', give: 50, t: 'Take the dilute hydrochloric acid.', t2: 'Bring it to the flask and watch the colour.', why: 'Hydrochloric acid is an acid. What will it do to the base?',
    after: 'The pink is gone! The acid used up the base. This is neutralisation.' },
];
let k = 0, phase = 'pick';           // pick -> held -> pour -> back -> (next step) ... done
function card() {
  const s = STEPS[Math.min(k, 2)], dots = STEPS.map((_, i) => `<i class="${i < k ? 'ok' : i === k ? 'now' : ''}"></i>`).join('');
  let tt, why = '', eq = '';
  if (phase === 'fallen') { tt = 'Experiment cancelled'; why = 'You opened your hand before the pouring was done, so the bottle fell. Tap <b>Restart</b> and keep your fingers closed until it has poured.'; }
  else if (k >= 3) { tt = 'Well done! You did a neutralisation.'; why = STEPS[2].after; eq = 'sodium hydroxide + hydrochloric acid → sodium chloride + water'; }
  else if (phase === 'pick') { tt = s.t; why = k ? STEPS[k - 1].after + ' ' + s.why : s.why; }
  else if (phase === 'held') { tt = s.t2; why = 'Now move it to the glowing flask. It pours by itself.'; }
  else { tt = phase === 'pour' ? (s.src === 'ind' ? 'Adding drops…' : 'Pouring…') : s.after; why = phase === 'pour' ? '' : ''; }
  $('card').innerHTML = `<div class="st"><span>Step ${Math.min(k + 1, 3)} of 3</span><span class="dots">${dots}</span></div><div class="tt">${tt}</div><div class="why">${why}</div><div class="eq">${eq}</div>`;
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

// ---------------------------------------------------------------- glow (outline turns gold; green while held) + a ring on the bench
function glowMat(col) {
  const m = new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide, transparent: true });
  m.onBeforeCompile = sh => { sh.uniforms.uInk = { value: .035 }; sh.vertexShader = 'uniform float uInk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * uInk;'); };
  m.customProgramCacheKey = () => 'glow3s'; return m;
}
const GM = { gold: glowMat('#ffc93a'), green: glowMat('#4fe08a') };
function setGlow(it, kind) {
  if (it.glow === kind) return; it.glow = kind;
  it.obj.traverse(m => { if (!m.userData.outline) return; if (!m.userData.ink0) m.userData.ink0 = m.material; m.material = kind ? GM[kind] : m.userData.ink0; });
}
const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .37, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffc93a', transparent: true, depthWrite: false }));
ring.position.y = .006; ring.renderOrder = 6; lab.add(ring);

// ---------------------------------------------------------------- pouring effects: a stream and drops
const stream = new THREE.Mesh(new THREE.CylinderGeometry(.026, .032, 1, 10, 1, true).translate(0, -.5, 0), new THREE.MeshBasicMaterial({ color: '#d6ecf6', transparent: true, opacity: .85, depthWrite: false, depthTest: false }));
stream.visible = false; stream.renderOrder = 7; lab.add(stream);
const drops = Array.from({ length: 4 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), new THREE.MeshBasicMaterial({ color: '#f4f6f7', transparent: true, opacity: .95, depthTest: false })); d.visible = false; d.renderOrder = 7; lab.add(d); return d; });
// the dropper bottle's rubber teat (squeezed while dripping)
const teat = I.ind.obj.children.find(c => Math.abs(c.position.y - .52) < 1e-6);

// the liquid inside a tipped bottle: find the level that holds its volume (sample points inside, sorted by height)
function tiltLevel(it) {
  const Lb = it.obj.userData.lab;
  if (!it.smp) { it.smp = []; const top = Lb.prof[Lb.prof.length - 1][1];
    for (let j = 0; j < 24; j++) { const y = Lb.y0 + (j + .5) / 24 * (top - Lb.y0), R = Math.max(.004, U.rAt(Lb.prof, y) - .01);
      for (let a = 0; a < 8; a++) for (const f of [.35, .8]) it.smp.push([V(Math.cos(a * .785) * R * f, y, Math.sin(a * .785) * R * f), R * R]); } }
  it.obj.updateMatrixWorld(true);
  const pts = it.smp.map(([p, w]) => [p.clone().applyMatrix4(it.obj.matrixWorld).y, w]).sort((a, b) => a[0] - b[0]);
  const total = pts.reduce((s, p) => s + p[1], 0), need = total * (it.V / it.cap) * (Lb.y1 - Lb.y0) / (Lb.prof[Lb.prof.length - 1][1] - Lb.y0);
  let acc = 0; for (const [y, w] of pts) { acc += w; if (acc >= need) return y; } return pts[pts.length - 1][0];
}
function drawBottle(it, tipped) {
  const col = LIQ[it.id], share = it.V / it.cap * .82, al = it.id === 'ind' ? .8 : .4;
  if (tipped) KIT.setContents(it.obj, { tilt: tiltLevel(it), layers: [{ from: 0, to: share, color: col, alpha: al + .1 }] }, lib);
  else KIT.setContents(it.obj, { layers: [{ from: 0, to: share, color: col, alpha: al }] }, lib);
}

// ---------------------------------------------------------------- camera framing: the bench fills the screen width
let mode = 'screen', zf = 1;           // screen: the lab on its own bench | look: camera + phone motion | ar: Android WebXR
function resize() {
  const w = innerWidth, h = innerHeight; if (!renderer.xr.isPresenting) renderer.setSize(w, h, false); camera.aspect = w / h;
  if (mode !== 'screen') { camera.fov = w < h ? 62 : 42; camera.updateProjectionMatrix(); return; }
  camera.fov = w < h ? 44 : 36; camera.updateProjectionMatrix();
  const half = 1.45, tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const dist = Math.max(half / tanH * 1.02, 3.6) / zf, el = THREE.MathUtils.degToRad(w < h ? 48 : 40);
  const tgt = V(0, .35, w < h ? .05 : .1);
  camera.position.set(0, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(el) * dist); camera.lookAt(tgt);
  // portrait: push the bench down a little so the card on top does not cover the bottles
  if (w < h) { camera.position.y += .35; camera.lookAt(tgt.x, tgt.y + .3, tgt.z); }
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- the "hand" point on screen: camera hand, mouse or finger
const ptr = { x: 0, y: 0, on: false, down: false, src: 'none' };
// size: the + / - buttons (the screen view moves the camera closer; in the room the lab itself grows or shrinks)
const getZoom = () => mode === 'screen' ? zf : lab.scale.x / ROOM_SIZE;
function setZoom(v) { if (mode === 'screen') { zf = clamp(v, .6, 2.6); resize(); } else setLabScale(ROOM_SIZE * clamp(v, .35, 5)); }
$('bZin').onclick = () => setZoom(getZoom() * 1.2); $('bZout').onclick = () => setZoom(getZoom() / 1.2);
// a finger on the screen / the mouse = the hand: pressing = fingers closed, lifting = open; a short tap in AR places the lab
let down0 = null;
function setPtr(e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.src = e.pointerType; }
for (const el of [$('cv'), $('touch')]) {
  el.addEventListener('pointerdown', e => { down0 = { x: e.clientX, y: e.clientY }; if (handOn && G.lm) return; setPtr(e); ptr.down = true; });
  el.addEventListener('pointermove', e => { if ((handOn && G.lm) || (e.pointerType !== 'mouse' && !ptr.down)) return; setPtr(e); });
  const up = e => { ptr.down = false;
    if (down0 && mode === 'ar' && placing && Math.hypot(e.clientX - down0.x, e.clientY - down0.y) < 20) place();
    if (e.pointerType === 'touch') ptr.on = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', () => { if (!handOn) { ptr.on = false; ptr.down = false; } });
}

// camera hand tracking
const video = $('vid'), GS = createGestures(video), G = GS.G;
let handOn = false, facing = PHONE ? 'environment' : 'user', vidW = 1280, vidH = 720;
function mapVideo(p) {   // a point in the camera picture (0..1) -> screen pixels, for a cover-fitted (and maybe mirrored) picture
  const w = innerWidth, h = innerHeight, s = Math.max(w / vidW, h / vidH), ox = (vidW * s - w) / 2, oy = (vidH * s - h) / 2;
  const x = (G.mirror ? 1 - p.x : p.x) * vidW * s - ox, y = p.y * vidH * s - oy; return { x, y };
}
async function startCam() {
  try { await GS.start(facing); } catch (e) { toast('The camera is blocked. Allow it for this page, or use your finger / mouse.'); return; }
  vidW = video.videoWidth || 1280; vidH = video.videoHeight || 720; handOn = true;
  document.body.classList.add('cam'); document.body.classList.toggle('mirror', G.mirror);
  ['bCam'].forEach(id => $(id).classList.add('hide')); ['bStop', 'bFlip'].forEach(id => $(id).classList.remove('hide'));
  toast(PHONE && facing === 'environment' ? 'Hold the phone in one hand. Put your other hand in front of the back camera.' : 'Show your hand to the camera.');
}
function stopCam() { GS.stop(); handOn = false; ptr.on = false; document.body.classList.remove('cam', 'mirror'); $('bCam').classList.remove('hide'); ['bStop', 'bFlip'].forEach(id => $(id).classList.add('hide')); $('hstat').textContent = ''; }
$('bCam').onclick = startCam; $('bStop').onclick = stopCam;
$('bFlip').onclick = async () => { GS.stop(); facing = facing === 'user' ? 'environment' : 'user'; await startCam(); };
$('bRestart').onclick = restart;

// ---------------------------------------------------------------- in my room
// Android (Chrome + ARCore): real AR. The phone finds the table, you tap to stand the lab on it, and it stays there while you
// walk around it. The hand is read from the AR camera picture (if the phone shares it); a finger always works.
// iPhone (and phones without AR): the back camera fills the screen and the lab stands in front of you; turning the phone looks
// around it (phone motion), and the hand is read from the same camera.
const ROOM_SIZE = .16;                 // 1 kit unit = 10 cm, so .16 = 1.6x real size: the glassware looks hand-sized
let placing = false, placed = false, xrSession = null, hitSource = null, camOK = false, xrPic = null;
const reticle = new THREE.Group(); reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
reticle.add(new THREE.Mesh(new THREE.RingGeometry(.05, .062, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .95 })));
reticle.add(new THREE.Mesh(new THREE.PlaneGeometry(2.9 * ROOM_SIZE, 2.1 * ROOM_SIZE).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: .22, depthWrite: false })));
function roomUI(on) {
  document.body.classList.toggle('room', on); bench.visible = !on; catcher.visible = on;
  ['bRoom', 'bCam'].forEach(id => $(id).classList.toggle('hide', on)); ['bExit', 'bMove'].forEach(id => $(id).classList.toggle('hide', !on));
  $('touch').classList.toggle('hide', !on || mode !== 'ar');
}
function hint(h) { $('hint').innerHTML = h; $('hint').classList.toggle('hide', !h); }
async function startRoom() {
  if (handOn) stopCam();
  const xrOK = navigator.xr && await Promise.race([navigator.xr.isSessionSupported('immersive-ar').catch(() => false), new Promise(r => setTimeout(() => r(false), 2000))]);
  return xrOK ? startXR() : startLook();
}
$('bRoom').onclick = startRoom;
$('bExit').onclick = () => { if (xrSession) xrSession.end(); else stopLook(); };
$('bMove').onclick = () => { if (mode === 'ar') { placing = true; placed = false; lab.visible = false; hint('Point at the table, then <b>tap</b> where the lab should stand'); } else placeAhead(); };
$('ui').addEventListener('beforexrselect', e => e.preventDefault());

async function startXR() {
  try { xrSession = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'camera-access'], domOverlay: { root: $('ui') } }); }
  catch (e) { toast('AR could not start here, so you get the camera view.'); return startLook(); }
  camOK = !!(xrSession.enabledFeatures && xrSession.enabledFeatures.includes('camera-access'));
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local'); await renderer.xr.setSession(xrSession);
  hitSource = await xrSession.requestHitTestSource({ space: await xrSession.requestReferenceSpace('viewer') });
  xrSession.addEventListener('end', endXR);
  mode = 'ar'; roomUI(true); setLabScale(ROOM_SIZE); lab.visible = false; placing = true; placed = false; glBind = null; camFB = null;
  if (camOK) { G.mirror = false; GS.load(); handOn = true; } else handOn = false;
  hint('Point your phone at a <b>table</b> and move it slowly…');
}
function endXR() {
  hitSource = null; xrSession = null; placing = placed = false; reticle.visible = false; handOn = false; xrPic = null; hint('');
  renderer.xr.enabled = false; mode = 'screen'; roomUI(false); lab.visible = true; lab.position.set(0, 0, 0); lab.rotation.set(0, 0, 0); setLabScale(1); resize();
}
const camPos = V(0, 0, 0);
function place() {
  if (!reticle.visible) return;
  lab.position.setFromMatrixPosition(reticle.matrix); renderer.xr.getCamera().getWorldPosition(camPos);
  lab.rotation.set(0, Math.atan2(camPos.x - lab.position.x, camPos.z - lab.position.z), 0);   // the front of the lab faces you
  lab.visible = true; reticle.visible = false; placing = false; placed = true; sfx('snap');
  hint(camOK ? 'Hold your hand in front of the phone, over the <b>glowing</b> bottle.' : 'Touch and hold the <b>glowing</b> bottle, then slide it to the flask.');
  setTimeout(() => placed && hint(''), 4500);
}
const upV = V(0, 0, 0), qh = new THREE.Quaternion();
function arFrame(now, xf) {
  const ref = renderer.xr.getReferenceSpace();
  if (hitSource && placing) {
    let hit = null;
    for (const r of xf.getHitTestResults(hitSource)) { const p = r.getPose(ref); if (!p) continue; const o = p.transform.orientation; qh.set(o.x, o.y, o.z, o.w); upV.set(0, 1, 0).applyQuaternion(qh); if (upV.y > .8) { hit = p; break; } }
    reticle.visible = !!hit; if (hit) { reticle.matrix.fromArray(hit.transform.matrix); hint('<b>Tap</b> to put the lab here'); }
  }
  const pose = camOK && xf.getViewerPose(ref), view = pose && pose.views[0];
  xrPic = view ? xrCamera(now, view) || xrPic : null;
}
// the AR camera picture (a GPU texture) -> a small canvas for the hand tracker
const gl = renderer.getContext(); let glBind = null, camFB = null, camProg = null, camBuf = null, camPix = null, camCv = null, camCtx = null, camW = 0, camH = 0, camT = 0;
function camSetup(w, h) {
  camW = 384; camH = Math.max(64, Math.round(384 * h / w)); vidW = camW; vidH = camH;
  const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); return x; };
  camProg = gl.createProgram();
  gl.attachShader(camProg, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }'));
  gl.attachShader(camProg, sh(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D t; varying vec2 uv; void main(){ gl_FragColor = texture2D(t, vec2(uv.x, 1. - uv.y)); }'));
  gl.linkProgram(camProg);
  camBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, camBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const out = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, out); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, camW, camH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  camFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, camFB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out, 0);
  camPix = new Uint8ClampedArray(camW * camH * 4); camCv = document.createElement('canvas'); camCv.width = camW; camCv.height = camH; camCtx = camCv.getContext('2d');
}
function xrCamera(now, view) {
  if (!view.camera || now - camT < 45) return null; camT = now;
  try {
    glBind = glBind || new XRWebGLBinding(xrSession, gl);
    const tex = glBind.getCameraImage(view.camera); if (!tex) return null;
    if (!camFB) camSetup(view.camera.width, view.camera.height);
    if (gl.bindVertexArray) gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, camFB); gl.viewport(0, 0, camW, camH);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
    gl.useProgram(camProg); gl.bindBuffer(gl.ARRAY_BUFFER, camBuf);
    const loc = gl.getAttribLocation(camProg, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(gl.getUniformLocation(camProg, 't'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.readPixels(0, 0, camW, camH, gl.RGBA, gl.UNSIGNED_BYTE, camPix); gl.disableVertexAttribArray(loc);
  } catch (e) { console.warn(e); renderer.resetState(); camOK = false; handOn = false; toast('Hand tracking is not available in AR on this phone. Use your finger.'); return null; }
  renderer.resetState(); camCtx.putImageData(new ImageData(camPix, camW, camH), 0, 0); return camCv;
}

// camera view with phone motion (iPhone, and phones without AR)
const ori = { a: 0, b: 90, g: 0, ok: false }, eulO = new THREE.Euler(), q1 = new THREE.Quaternion(-Math.sqrt(.5), 0, 0, Math.sqrt(.5)), zee = V(0, 0, 1), q0 = new THREE.Quaternion();
const onOri = e => { if (e.alpha == null) return; ori.a = e.alpha; ori.b = e.beta; ori.g = e.gamma; ori.ok = true; };
function lookFrame() {
  if (!ori.ok) return;
  const d = THREE.MathUtils.DEG2RAD, sa = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  eulO.set(ori.b * d, ori.a * d, -ori.g * d, 'YXZ'); camera.quaternion.setFromEuler(eulO).multiply(q1).multiply(q0.setFromAxisAngle(zee, -sa * d));
}
function placeAhead() {   // the lab stands 75 cm ahead of you and 40 cm below your eyes, facing you
  camera.updateMatrixWorld(); const f = V(0, 0, -1).applyQuaternion(camera.quaternion); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize();
  lab.position.copy(camera.position).addScaledVector(f, .75).add(V(0, -.4, 0)); lab.rotation.set(0, Math.atan2(f.x, f.z) + Math.PI, 0); lab.visible = true;
  if (!ori.ok) camera.lookAt(lab.position.clone().add(V(0, .04, 0)));
}
async function startLook() {
  try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch (e) {}
  addEventListener('deviceorientation', onOri);
  try { await GS.start('environment'); } catch (e) { toast('The camera is blocked. Allow it for this page and try again.'); return; }
  vidW = video.videoWidth || 1280; vidH = video.videoHeight || 720; handOn = true; G.mirror = false;
  mode = 'look'; document.body.classList.add('cam'); document.body.classList.remove('mirror'); roomUI(true);
  camera.position.set(0, 0, 0); camera.quaternion.identity(); resize(); setLabScale(ROOM_SIZE);
  setTimeout(() => { lookFrame(); placeAhead(); }, 500);
  toast('Hold the phone in one hand. Put your other hand in front of the back camera. Turn the phone to look around.');
}
function stopLook() {
  removeEventListener('deviceorientation', onOri); ori.ok = false; GS.stop(); handOn = false; ptr.on = false;
  document.body.classList.remove('cam', 'mirror'); mode = 'screen'; roomUI(false);
  lab.position.set(0, 0, 0); lab.rotation.set(0, 0, 0); setLabScale(1); camera.quaternion.identity(); resize(); $('hstat').textContent = '';
}

// ---------------------------------------------------------------- screen helpers
const tmp = V(0, 0, 0);
const cam = () => mode === 'ar' ? renderer.xr.getCamera() : camera;
function toScreen(p) { tmp.copy(p).project(cam()); return { x: (tmp.x + 1) / 2 * innerWidth, y: (1 - tmp.y) / 2 * innerHeight }; }
const ray = new THREE.Raycaster(), plane = new THREE.Plane(V(0, 1, 0), 0);
function toBench(x, y, h) {   // screen point -> a point at height h above the bench (in lab space)
  ray.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, cam()); plane.constant = -lab.localToWorld(V(0, h, 0)).y;
  const p = ray.ray.intersectPlane(plane, V(0, 0, 0)); return p && lab.worldToLocal(p);
}
const R = () => Math.max(56, Math.min(innerWidth, innerHeight) * .14);   // "near" in pixels
for (const it of Object.values(I)) it.mouth = it.obj.userData.lab.mouth[1];   // the kit knows where each mouth is
I.ind.mouth = .74;   // the dropper's tip: the bottle is held upside down over the flask and squeezed
const mouthW = it => it.obj.localToWorld(V(0, it.mouth, 0)), mouthL = it => lab.worldToLocal(mouthW(it));

// ---------------------------------------------------------------- the step machine
let needOpen = false, openT = 0, fallT = 0, fallTo = V(0, 0, 0), fallQ = new THREE.Quaternion(), dwell = 0, heldT = 0, held = null, pourT = 0, pose = null, backT = 0, given = 0;
const LIFT = .55;
function cancel() {   // you let go of the bottle: it falls over and the experiment stops
  const it = held; if (!it) return;
  phase = 'fallen'; fallT = 0; stream.visible = false; drops.forEach(d => d.visible = false); if (teat) teat.scale.set(1, 1, 1);
  pose = { pos: it.obj.position.clone(), q: it.obj.quaternion.clone() };
  fallTo.set(clamp(it.obj.position.x, -1.2, 1.2), it.id === 'ind' ? .15 : .22, clamp(it.obj.position.z, -.8, .8));
  if (Math.hypot(fallTo.x - I.flask.home.x, fallTo.z - I.flask.home.z) < .55) fallTo.z += .6;   // not on top of the flask
  fallQ.setFromEuler(new THREE.Euler(0, .4, Math.PI / 2 * (Math.sign(it.home.x) || 1)));
  setGlow(it, null); setGlow(I.flask, null); sfx('fail'); card();
  toast('You opened your hand and dropped the bottle. The experiment is cancelled.');
}
function restart() {
  fresh(); k = 0; phase = 'pick'; held = null; dwell = 0; needOpen = false; openT = 0;
  for (const it of Object.values(I)) { it.obj.position.copy(it.home); it.obj.rotation.set(0, 0, 0); setGlow(it, null); }
  drawFlask(); drawBottle(I.base); drawBottle(I.acid); drawBottle(I.ind); stream.visible = false; drops.forEach(d => d.visible = false); card();
}
const qUp = new THREE.Quaternion(), qPour = new THREE.Quaternion(), eul = new THREE.Euler();
function heldPose(it, hx, hy, dt) {   // the piece hangs from the hand point, upright, swaying a little with the motion
  const p = toBench(hx, hy, LIFT + it.grip); if (!p) return;
  p.y -= it.grip; p.x = clamp(p.x, -1.4, 1.4); p.z = clamp(p.z, -1, 1);
  const o = it.obj, vx = (p.x - o.position.x) / Math.max(dt, .016);
  o.position.lerp(p, 1 - Math.exp(-dt * 14));
  o.rotation.z = lerp(o.rotation.z, clamp(-vx * .04, -.25, .25), 1 - Math.exp(-dt * 8)); o.rotation.x = 0;
}
function pourPose(it, a) {   // tipped by angle a toward the flask, its mouth just above and beside the flask mouth
  const side = Math.sign(it.home.x) || -1, fm = mouthL(I.flask);
  eul.set(0, 0, side * a); qPour.setFromEuler(eul);
  const m = V(0, it.mouth, 0).applyQuaternion(qPour);
  const want = fm.clone().add(V(side * (it.id === 'ind' ? 0 : .12), it.id === 'ind' ? .12 : .16, 0));
  return { pos: want.sub(m), q: qPour.clone() };
}

let last = performance.now(), T = 0;
function frame(now, xf) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  if (mode === 'ar' && xf) arFrame(now, xf); else if (mode === 'look') lookFrame();
  // where the hand is
  if (handOn) {
    if (mode === 'ar') { if (xrPic) GS.step(now, xrPic); } else GS.step(now);
    if (G.lm) { const L = G.lm, W = G.wl, gap = W ? Math.hypot(W[4].x - W[8].x, W[4].y - W[8].y, W[4].z - W[8].z) * 100 : 8;
      const c = clamp((7 - gap) / 5, 0, 1), tip = { x: lerp(L[8].x, (L[4].x + L[8].x) / 2, c), y: lerp(L[8].y, (L[4].y + L[8].y) / 2, c) }, p = mapVideo(tip);
      ptr.x = ptr.on && ptr.src === 'hand' ? lerp(ptr.x, p.x, .55) : p.x; ptr.y = ptr.on && ptr.src === 'hand' ? lerp(ptr.y, p.y, .55) : p.y; ptr.on = true; ptr.src = 'hand'; }
    else if (ptr.src === 'hand') ptr.on = false;
    $('hstat').textContent = !G.ready ? G.msg : G.lm ? '' : 'Show your hand to the camera';
  }
  const hx = ptr.x, hy = ptr.y, s = STEPS[Math.min(k, 2)], src = I[s.src];

  // fingers closed? camera hand: pinch or fist; finger / mouse: pressed
  const closed = ptr.on && (ptr.src === 'hand' ? G.gesture === 'pinch' || G.gesture === 'fist' : ptr.down);
  if (ptr.on && !closed) needOpen = false;
  let over = false;
  if (mode === 'ar' && !placed) { /* first the lab has to stand on the table */ }
  else if (k < 3 && phase === 'pick') {
    const sp = toScreen(src.obj.localToWorld(V(0, src.grip, 0))), d = ptr.on ? Math.hypot(hx - sp.x, hy - sp.y) : 1e9;
    over = d < R(); dwell = over && closed && !needOpen ? dwell + dt : 0;
    setGlow(src, 'gold'); ring.position.x = src.home.x; ring.position.z = src.home.z;
    if (dwell > .12) { phase = 'held'; held = src; dwell = 0; heldT = 0; openT = 0; sfx('pick'); card(); }
  } else if (phase === 'held') {
    if (ptr.on) heldPose(held, hx, hy, dt);
    setGlow(held, 'green'); setGlow(I.flask, 'gold'); ring.position.x = I.flask.home.x; ring.position.z = I.flask.home.z;
    const mp = toScreen(mouthW(held)), fp = toScreen(mouthW(I.flask)), fb = toScreen(I.flask.obj.localToWorld(V(0, .5, 0)));
    const d = Math.min(Math.hypot(mp.x - fp.x, mp.y - fp.y), Math.hypot(hx - fb.x, hy - fb.y), Math.hypot(hx - fp.x, hy - fp.y));   // the piece's mouth, or your hand, at the flask
    heldT += dt;
    const moved = held.obj.position.distanceTo(held.home) > .3;
    const near = heldT > .5 && moved && (d < R() * 1.15 || Math.hypot(held.obj.position.x - I.flask.home.x, held.obj.position.z - I.flask.home.z) < .45);
    dwell = near ? dwell + dt : Math.max(0, dwell - dt * 2);
    if (dwell > .3) { phase = 'pour'; pourT = 0; given = 0; dwell = 0; pose = { pos: held.obj.position.clone(), q: held.obj.quaternion.clone() }; setGlow(I.flask, null); sfx('snap'); card(); }
  } else if (phase === 'pour') {
    const it = held, isInd = it.id === 'ind', A = isInd ? 2.95 : 1.95, tIn = .6, tPour = isInd ? 2.4 : 2.6, tOut = .5;
    pourT += dt;
    const a = pourT < tIn ? sm(pourT / tIn) : pourT < tIn + tPour ? 1 : 1 - sm(clamp((pourT - tIn - tPour) / tOut, 0, 1));
    const P = pourPose(it, A * a), P0 = pourPose(it, 0), mv = sm(clamp(pourT / tIn, 0, 1));
    it.obj.position.copy(pose.pos).lerp(a < 1 && pourT > tIn ? P.pos : P.pos, mv);
    if (pourT > tIn + tPour) it.obj.position.copy(P.pos);
    it.obj.quaternion.copy(pose.q).slerp(P.q, mv);
    const pouring = pourT > tIn && pourT < tIn + tPour;
    if (isInd) {   // squeeze the teat once per drop; each drop falls into the flask
      const u = (pourT - tIn) / tPour, n = Math.floor(u * 3.2);
      if (teat) teat.scale.set(1, pouring ? 1 - .3 * Math.max(0, Math.sin((u * 3.2 % 1) * Math.PI)) : 1, 1);
      drops.forEach((dr, i) => {
        const td = (u * 3.2 - i) * .9;
        if (!pouring || i > 2 || td < 0 || td > .6) { dr.visible = false; return; }
        const from = mouthL(it), to = mouthL(I.flask).add(V(0, -.75, 0));
        dr.visible = true; dr.position.copy(from).lerp(to, (td / .6) ** 2);
      });
      drawBottle(it, a > .05);
      if (pouring && n > given && given < 3) { given = Math.min(3, n); F.drops = given; drawFlask(); sfx('drop'); }
    } else {
      const give = pouring ? Math.min(s.give - given, s.give / tPour * dt) : 0;
      if (give > 0) { given += give; it.V -= give; if (it.id === 'base') F.base += give; else F.acid += give; drawFlask(); }
      drawBottle(it, a > .05);
      stream.visible = pouring;
      if (pouring) { const m = mouthL(it).add(V(-Math.sign(it.home.x) * .02, -.02, 0)); const surf = lab.worldToLocal(I.flask.obj.localToWorld(V(0, I.flask.obj.userData.lab.surfaceY || .05, 0)));
        stream.position.copy(m); stream.scale.set(1, Math.max(.05, m.y - surf.y), 1); stream.material.color.set(it.id === 'base' ? '#d4ecf7' : '#dbeef5'); }
    }
    if (pourT > tIn + tPour + tOut) { phase = 'back'; backT = 0; needOpen = true; stream.visible = false; drops.forEach(d => d.visible = false); if (teat) teat.scale.set(1, 1, 1);
      if (it.id === 'ind' && F.drops < 3) { F.drops = 3; drawFlask(); }
      if (it.id !== 'ind' && given < s.give) { const r = s.give - given; it.V -= r; if (it.id === 'base') F.base += r; else F.acid += r; drawFlask(); }
      drawBottle(I.base); drawBottle(I.acid); drawBottle(I.ind); pose = { pos: it.obj.position.clone(), q: it.obj.quaternion.clone() };
      toast(s.after); sfx(k === 2 ? 'done' : 'ok'); card(); }
  } else if (phase === 'back') {
    backT += dt; const u = sm(clamp(backT / .8, 0, 1)), it = held;
    it.obj.position.copy(pose.pos).lerp(it.home, u); it.obj.position.y += Math.sin(u * Math.PI) * .25;
    it.obj.quaternion.copy(pose.q).slerp(qUp, u);
    if (u >= 1) { setGlow(it, null); held = null; k++; phase = k < 3 ? 'pick' : 'done'; card(); }
  } else if (phase === 'fallen') {   // the dropped bottle falls over on the bench
    fallT += dt; const u = clamp(fallT / .45, 0, 1), it = held;
    it.obj.position.copy(pose.pos).lerp(fallTo, u * u); it.obj.quaternion.copy(pose.q).slerp(fallQ, sm(u));
    if (it.V != null && it.id !== 'ind' && u > .5) drawBottle(it, true);
  }
  // glow pulse + ring
  const pulse = .55 + .45 * Math.sin(T * 5), near = over ? 1 : phase === 'held' ? clamp(dwell / .3, 0, 1) : 0;
  GM.gold.opacity = Math.max(pulse, near); GM.gold.color.set(near > .05 ? '#ffe680' : '#ffc93a');
  ring.visible = phase === 'pick' || phase === 'held'; ring.material.opacity = .35 + .45 * pulse; ring.scale.setScalar(1 + .08 * pulse + .15 * near);
  // the pointer on your fingertip: gold over a piece you can grab, green while you hold one, small when your fingers are closed
  const hm = $('hand'); hm.classList.toggle('on', ptr.on && (ptr.src === 'hand' || ptr.src === 'mouse'));
  hm.classList.toggle('over', over); hm.classList.toggle('held', phase === 'held' || phase === 'pour'); hm.classList.toggle('closed', closed);
  hm.style.transform = `translate(${hx}px, ${hy}px)`;
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- small sounds (made in code)
let AC = null;
function sfx(kind) {
  try { AC = AC || new AudioContext(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const n = { pick: [[660, .08]], snap: [[520, .06], [780, .08]], drop: [[1200, .05]], ok: [[660, .1], [880, .14]], fail: [[330, .12], [220, .25]], done: [[523, .12], [659, .12], [784, .2]] }[kind] || [];
  let t = AC.currentTime;
  for (const [f, d] of n) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d + .15); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .2); t += d; }
}
addEventListener('pointerdown', () => { try { AC = AC || new AudioContext(); AC.resume(); } catch (e) {} }, { once: true });

restart();
renderer.setAnimationLoop(frame);
window.__lab = { stream, I, lab, mode: () => mode, phase: () => phase, getZoom, startLook, placeAhead, F: () => F, step: () => ({ k, phase }), ptr, toScreen, camera, G };

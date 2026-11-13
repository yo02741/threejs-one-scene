// 場景本體：整本教本只有這一個場景。
// 它不知道「章節」是什麼，只負責照著一份參數（見 params.js）長成對應的樣子。
import {
  AxesHelper, BufferGeometry, CameraHelper, Color, Float32BufferAttribute, GridHelper, Line,
  LineBasicMaterial, Mesh, MeshBasicMaterial, PerspectiveCamera, SphereGeometry, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { defaults } from './params.js';
import { smooth } from './motion.js';
import { orbitPoint } from './rig.js';
import { createStar } from './scene/star.js';
import { createLights } from './scene/lights.js';
import { createParticles } from './scene/particles.js';
import { createGlow } from './scene/glow.js';
import { createPost } from './scene/post.js';

const INK = 0x12141f, INK2 = 0x1b1e2e;

export function createStage(canvas, stageEl, insetEl, reduced) {
  // WebGL 不可用時會丟例外，交給呼叫端處理
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.info.autoReset = false;

  const scene = new Scene();
  // 底色用場景的背景色，不用 renderer 的清除色：背景色不管是直接畫到螢幕、
  // 還是先畫到後製用的那張圖上，three.js 都會換算成正確的色彩空間。
  const ink = new Color(INK), ink2 = new Color(INK2);
  scene.background = ink;

  /* ---------- 鷹架：格線與座標軸 ---------- */
  const grid = new GridHelper(12, 12, 0x444a6b, 0x282c44);
  grid.position.y = -1.2;
  const axes = new AxesHelper(1.6);
  axes.position.y = -1.19;
  // 座標軸的頂點色是直接寫進去的數值。r152 起的色彩管理會把它們當成線性色再轉 sRGB，
  // 軸線會變亮、偏色；先轉回線性，讓顏色維持第一章原本的樣子。
  const axisColors = axes.geometry.getAttribute('color');
  const tmp = new Color();
  for (let i = 0; i < axisColors.count; i++) {
    tmp.fromBufferAttribute(axisColors, i).convertSRGBToLinear();
    axisColors.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  scene.add(grid, axes);

  /* ---------- 相機，以及從外面看它的觀察者 ---------- */
  const camera = new PerspectiveCamera(50, 1, 0.5, 14);
  const helper = new CameraHelper(camera);
  helper.visible = false;
  scene.add(helper);
  const observer = new PerspectiveCamera(38, 4 / 3, 0.1, 200);

  // 鷹架：相機路徑線，只畫在小視窗裡
  const pathLine = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x9fb8ad }));
  pathLine.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(65 * 3), 3));
  pathLine.frustumCulled = false;
  pathLine.visible = false;
  scene.add(pathLine);

  /* ---------- 場景裡的東西 ---------- */
  const star = createStar(scene);
  const lights = createLights(scene, renderer);
  const particles = createParticles(scene, renderer);
  const glow = createGlow(scene, star);
  const post = createPost(renderer, scene, camera);

  let T = defaults();        // 目標：這一刻場景「應該」是什麼樣子
  const S = defaults();      // 現況：每一幀往目標靠近一點
  const cam = { pos: new Vector3(0, 0.4, 6), target: new Vector3(), fov: 50, far: 14 };
  const v3 = new Vector3();
  let pixelRatio = 0;

  /* ---------- 游標 ---------- */
  // 游標在舞台上的位置：左 -1、右 1；下 -1、上 1
  const pointer = { x: 0, y: 0, on: false, sx: 0, sy: 0, hit: null };
  const ray = new Raycaster(), ndc = new Vector2(), right = new Vector3(), up = new Vector3(0, 1, 0);
  // 鷹架：標出射線碰到星星的位置
  const hitMark = new Mesh(new SphereGeometry(0.05, 12, 8), new MeshBasicMaterial({ color: 0x9fb8ad }));
  hitMark.visible = false;
  scene.add(hitMark);

  function applyAll() {
    grid.visible = axes.visible = S.scaffold;
    star.apply(S);
    lights.apply(S);
    particles.apply(S);
    glow.apply(S);
    if (S.path) {
      const attr = pathLine.geometry.getAttribute('position');
      for (let i = 0; i <= 64; i++) attr.setXYZ(i, ...orbitPoint(S.path, i / 64));
      attr.needsUpdate = true;
    }
  }

  function resize() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return false;
    pixelRatio = Math.min(window.devicePixelRatio || 1, S.pr);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pixelRatio);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    helper.update();
    return true;
  }

  // 每一幀：讓現況往目標靠近。回傳畫面有沒有變。
  function settle(dt) {
    const k = reduced ? { fast: 1, slow: 1 } : { fast: 1 - Math.exp(-14 * dt), slow: Math.min(1, dt * 6) };
    let changed = smooth(S, T, k);

    const c = T.cam;
    const kc = reduced || c.damp >= 1 ? 1 : 1 - Math.pow(1 - c.damp, dt * 60);
    const before = cam.pos.lengthSq() + cam.target.lengthSq() * 3 + cam.fov * 7 + cam.far;
    cam.pos.lerp(v3.fromArray(c.pos), kc);
    cam.target.lerp(v3.fromArray(c.target), kc);
    cam.fov += (c.fov - cam.fov) * kc;
    cam.far = c.far;
    const after = cam.pos.lengthSq() + cam.target.lengthSq() * 3 + cam.fov * 7 + cam.far;

    // 視差：游標往哪邊，相機就往哪邊挪一點，但仍然看著同一個點（一樣用阻尼追）
    const par = S.inter.parallax, kp = reduced ? 1 : 1 - Math.exp(-5 * dt);
    const gx = pointer.on ? pointer.x * par : 0, gy = pointer.on ? pointer.y * par : 0;
    const drift = Math.abs(gx - pointer.sx) + Math.abs(gy - pointer.sy) > 1e-4;
    if (drift) { pointer.sx += (gx - pointer.sx) * kp; pointer.sy += (gy - pointer.sy) * kp; }

    if (Math.abs(after - before) > 1e-7 || changed || drift) {
      camera.position.copy(cam.pos);
      if (pointer.sx || pointer.sy) {
        right.subVectors(cam.target, cam.pos).cross(up).normalize();
        camera.position.addScaledVector(right, pointer.sx).addScaledVector(up, pointer.sy * 0.6);
      }
      camera.lookAt(cam.target);
      camera.fov = cam.fov; camera.far = cam.far;
      camera.updateProjectionMatrix();
      if (S.inset) helper.update();
      changed = true;
    }

    // 射線檢測：從相機朝游標的方向射一條線，看它碰到什麼
    const I = S.inter, wants = pointer.on && (I.hover > 0 || I.mark || I.push !== 0);
    let hit = null;
    if (wants) {
      ndc.set(pointer.x, pointer.y);
      ray.setFromCamera(ndc, camera);
      hit = ray.intersectObject(star.mesh)[0] || null;
    }
    particles.setRay(wants, ray.ray.origin, ray.ray.direction);
    star.setHovered(!!hit);
    hitMark.visible = !!hit && I.mark;
    if (hit) hitMark.position.copy(hit.point);
    if (!!hit !== !!pointer.hit) { canvas.style.cursor = hit ? 'pointer' : ''; changed = true; }
    pointer.hit = hit;

    if (Math.min(window.devicePixelRatio || 1, S.pr) !== pixelRatio) { resize(); changed = true; }
    if (changed) applyAll();
    return changed;
  }

  // 直接畫到畫面上。limit 有值時只畫左邊 limit 像素寬（後製的前後對比用）。
  function direct(limit) {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, limit ?? w, h);
    renderer.render(scene, camera);
    if (limit != null || !S.inset) return;

    // 小視窗：在同一個 canvas 的右下角，用另一台相機再畫一次
    const r = insetEl.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return;
    const x = r.left - s.left, y = s.bottom - r.bottom;
    renderer.setViewport(x, y, r.width, r.height);
    renderer.setScissor(x, y, r.width, r.height);
    scene.background = ink2;
    if (S.inset === 'path') { observer.position.set(9, 13, 13); observer.lookAt(0, 0, 0); }
    else { observer.position.set(11, 6.5, 14); observer.lookAt(0, 0, 4); }
    observer.aspect = r.width / r.height;
    observer.updateProjectionMatrix();

    // 小視窗永遠看得到鷹架，主畫面的開關不影響它
    const g = grid.visible;
    grid.visible = axes.visible = helper.visible = true;
    pathLine.visible = S.inset === 'path';
    renderer.render(scene, observer);
    scene.background = ink;
    grid.visible = axes.visible = g;
    helper.visible = pathLine.visible = false;
  }

  function render() {
    renderer.info.reset();
    if (S.post.on && !S.inset) post.render(S, stageEl.clientWidth, stageEl.clientHeight, direct);
    else { post.off(); direct(); }
  }

  camera.position.copy(cam.pos);
  camera.lookAt(cam.target);
  applyAll();

  return {
    S, renderer, scene, camera, star, render, resize, settle,
    setTarget(P) { T = P; },
    setPointer(x, y, on) { pointer.x = x; pointer.y = y; pointer.on = on; },
    get hovering() { return !!pointer.hit; },
    animate(dt) { star.animate(dt, S); particles.animate(dt, S); glow.animate(dt, S); post.tick(dt); },
    // 這個畫面座標有沒有點到星星
    hitsStar(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObject(star.mesh).length > 0;
    },
  };
}

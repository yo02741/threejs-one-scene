// 場景本體：整本教本只有這一個場景。
// 它不知道「章節」是什麼，只負責照著一份參數（見 params.js）長成對應的樣子。
import {
  AxesHelper, BufferGeometry, CameraHelper, Color, Float32BufferAttribute, GridHelper, Line,
  LineBasicMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
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
  const post = createPost(renderer, scene, camera, INK);

  let T = defaults();        // 目標：這一刻場景「應該」是什麼樣子
  const S = defaults();      // 現況：每一幀往目標靠近一點
  const cam = { pos: new Vector3(0, 0.4, 6), target: new Vector3(), fov: 50, far: 14 };
  const v3 = new Vector3();
  let pixelRatio = 0;

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
    if (Math.abs(after - before) > 1e-7 || changed) {
      camera.position.copy(cam.pos);
      camera.lookAt(cam.target);
      camera.fov = cam.fov; camera.far = cam.far;
      camera.updateProjectionMatrix();
      if (S.inset) helper.update();
      changed = true;
    }

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
    renderer.setClearColor(INK, 1);
    renderer.clear();
    renderer.render(scene, camera);
    if (limit != null || !S.inset) return;

    // 小視窗：在同一個 canvas 的右下角，用另一台相機再畫一次
    const r = insetEl.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return;
    const x = r.left - s.left, y = s.bottom - r.bottom;
    renderer.setViewport(x, y, r.width, r.height);
    renderer.setScissor(x, y, r.width, r.height);
    renderer.setClearColor(INK2, 1);
    renderer.clear();
    if (S.inset === 'path') { observer.position.set(9, 13, 13); observer.lookAt(0, 0, 0); }
    else { observer.position.set(11, 6.5, 14); observer.lookAt(0, 0, 4); }
    observer.aspect = r.width / r.height;
    observer.updateProjectionMatrix();

    // 小視窗永遠看得到鷹架，主畫面的開關不影響它
    const g = grid.visible;
    grid.visible = axes.visible = helper.visible = true;
    pathLine.visible = S.inset === 'path';
    renderer.render(scene, observer);
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

  const ray = new Raycaster(), ndc = new Vector2();

  return {
    S, renderer, scene, camera, star, render, resize, settle,
    setTarget(P) { T = P; },
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

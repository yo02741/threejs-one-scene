// 場景本體：整本教本只有這一個場景。
// 新章節只能往這裡加東西或改既有的東西，不能換掉它。
import {
  AxesHelper,
  CameraHelper,
  Color,
  GridHelper,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  WireframeGeometry,
} from 'three';

export const COLORS = {
  ink: 0x12141f,
  ink2: 0x1b1e2e,
  star: 0xecdcae,
  starLine: 0x8a7a4e,
  gridMain: 0x444a6b,
  gridSub: 0x282c44,
};

export function createStage(canvas, stageEl, insetEl) {
  // WebGL 不可用時會丟例外，交給呼叫端處理
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.autoClear = false;

  const scene = new Scene();

  /* ---------- 鷹架：格線與座標軸 ---------- */
  const grid = new GridHelper(12, 12, COLORS.gridMain, COLORS.gridSub);
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

  /* ---------- 主角：一顆星 ---------- */
  const star = new Group();
  const geo = new IcosahedronGeometry(1, 1);
  star.add(new Mesh(geo, new MeshBasicMaterial({
    color: COLORS.star, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })));
  star.add(new LineSegments(
    new WireframeGeometry(geo),
    new LineBasicMaterial({ color: COLORS.starLine }),
  ));
  star.scale.setScalar(0.0001);
  star.visible = false;
  scene.add(star);

  /* ---------- 相機，以及從外面看它的觀察者 ---------- */
  const camera = new PerspectiveCamera(50, 1, 0.5, 14);
  const helper = new CameraHelper(camera);
  helper.visible = false;
  scene.add(helper);

  const observer = new PerspectiveCamera(38, 4 / 3, 0.1, 100);
  observer.position.set(11, 6.5, 14);
  observer.lookAt(0, 0, 4);

  // view.inset 為 true 時，在同一個 canvas 的右下角用 scissor 再畫一次
  function render(view) {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setScissorTest(true);

    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.setClearColor(COLORS.ink, 1);
    renderer.clear();
    helper.visible = false;
    renderer.render(scene, camera);

    if (!view.inset) return;
    const r = insetEl.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return;
    const x = r.left - s.left, y = s.bottom - r.bottom;
    renderer.setViewport(x, y, r.width, r.height);
    renderer.setScissor(x, y, r.width, r.height);
    renderer.setClearColor(COLORS.ink2, 1);
    renderer.clear();
    observer.aspect = r.width / r.height;
    observer.updateProjectionMatrix();

    // 小視窗永遠看得到鷹架，主畫面的開關不影響它
    const g = grid.visible, a = axes.visible;
    grid.visible = true; axes.visible = true; helper.visible = true;
    renderer.render(scene, observer);
    grid.visible = g; axes.visible = a; helper.visible = false;
  }

  function resize() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    helper.update();
    return true;
  }

  return { renderer, scene, grid, axes, star, camera, helper, observer, render, resize };
}

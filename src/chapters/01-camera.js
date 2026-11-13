// 第一章：場景、相機、渲染迴圈
// 旋鈕：鷹架開關、視角／距離、三種鏡頭預設、暫停迴圈、每秒幾幀
//
// 章節模組的介面（新章節照抄這個形狀）：
//   id                  對應 index.html 裡 section 的 data-chapter
//   setup(ctx)          接上旋鈕，只在開頭呼叫一次
//   apply(step, ctx)    依目前段落決定場景長什麼樣子
//                       step 是本章內的段落編號；
//                       還沒讀到這章時是 -1，已經讀過這章時是 Infinity
//                       回傳字串時會顯示在左上角 HUD

const HUD = [
  'scene: 空',
  'scene: 格線 + 座標軸',
  'scene: 格線 + 座標軸 + star',
  'scene: 格線 + 座標軸 + star',
  'scene: 格線 + 座標軸 + star',
  'scene: star',
];

const local = { fov: 50, dist: 6, showGrid: true };
const $ = (id) => document.getElementById(id);

function applyCamera({ stage, state }) {
  const { camera, helper } = stage;
  camera.fov = local.fov;
  camera.position.set(0, 0.4, local.dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  helper.update();
  $('codeFov').textContent = local.fov;
  $('codeDist').textContent = local.dist.toFixed(1);
  $('fovOut').textContent = local.fov + '°';
  $('distOut').textContent = local.dist.toFixed(1);
  $('fov').value = local.fov;
  $('dist').value = local.dist;
  state.dirty = true;
}

export default {
  id: '01',

  setup(ctx) {
    const { state } = ctx;

    $('gridToggle').addEventListener('change', (e) => { local.showGrid = e.target.checked; ctx.refresh(); });

    $('fov').addEventListener('input', (e) => { local.fov = +e.target.value; applyCamera(ctx); });
    $('dist').addEventListener('input', (e) => { local.dist = +e.target.value; applyCamera(ctx); });
    document.querySelectorAll('button[data-fov]').forEach((b) => {
      b.addEventListener('click', () => {
        local.fov = +b.dataset.fov;
        local.dist = +b.dataset.dist;
        applyCamera(ctx);
      });
    });

    const pauseBtn = $('pause');
    const syncPause = () => {
      pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
      pauseBtn.textContent = state.paused ? '繼續迴圈' : '暫停迴圈';
    };
    pauseBtn.addEventListener('click', () => { state.paused = !state.paused; syncPause(); });
    $('fps').addEventListener('input', (e) => {
      state.fps = +e.target.value;
      $('fpsOut').textContent = state.fps;
    });

    syncPause();
    applyCamera(ctx);
  },

  apply(step, { stage, state }) {
    const scaffold = step >= 1 && step <= 4 && local.showGrid;
    stage.grid.visible = scaffold;
    stage.axes.visible = scaffold;

    if (step >= 2) state.starTarget = 1;
    else if (step >= 0) state.starTarget = 0;

    const inset = step === 3 || step === 4;
    if (inset) state.inset = true;

    if (step < 0 || step === Infinity) return null;
    return (step >= 1 && step <= 4 && !local.showGrid)
      ? HUD[step].replace('格線 + 座標軸', '（鷹架已隱藏）')
      : HUD[step];
  },
};

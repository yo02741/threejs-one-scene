// 第一章：場景、相機、渲染迴圈
// 旋鈕：鷹架開關、視角／距離、三種鏡頭預設、暫停迴圈、每秒幾幀
//
// 章節模組的介面（每一章都是這個形狀）：
//   id                 章號
//   html               這一章的文字（同名的 .html 檔）
//   setup(ctx)         接上旋鈕，只在開頭呼叫一次
//   apply(step, P, ctx)  依目前段落修改場景參數 P（見 params.js）
//                      step 是本章內的段落編號；已經讀過這章時是 Infinity。
//                      還沒讀到的章節不會被呼叫。回傳的字串顯示在左上角 HUD。
//   frame(ctx)         （可省略）這章作用中時，每一幀呼叫一次
import html from './01-camera.html?raw';

const HUD = [
  'scene: 空',
  'scene: 格線 + 座標軸',
  'scene: 格線 + 座標軸 + star',
  'scene: 格線 + 座標軸 + star',
  'scene: 格線 + 座標軸 + star',
  'scene: star',
];
const LAST = 5;
const FINAL = { fov: 50, dist: 6 };            // 這章定下來的樣子
const local = { fov: 50, dist: 6, showGrid: true }; // 讀者調的值
const $ = (id) => document.getElementById(id);

export default {
  id: '01',
  html,

  setup(ctx) {
    const { state } = ctx;
    const showCamera = () => {
      $('codeFov').textContent = local.fov;
      $('codeDist').textContent = local.dist.toFixed(1);
      $('fovOut').textContent = local.fov + '°';
      $('distOut').textContent = local.dist.toFixed(1);
      $('fov').value = local.fov;
      $('dist').value = local.dist;
      ctx.refresh();
    };

    $('gridToggle').addEventListener('change', (e) => { local.showGrid = e.target.checked; ctx.refresh(); });
    $('fov').addEventListener('input', (e) => { local.fov = +e.target.value; showCamera(); });
    $('dist').addEventListener('input', (e) => { local.dist = +e.target.value; showCamera(); });
    document.querySelectorAll('#ch1 button[data-fov]').forEach((b) => {
      b.addEventListener('click', () => {
        local.fov = +b.dataset.fov;
        local.dist = +b.dataset.dist;
        showCamera();
      });
    });

    const pauseBtn = $('pause');
    const syncPause = () => {
      pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
      pauseBtn.textContent = state.paused ? '繼續迴圈' : '暫停迴圈';
    };
    pauseBtn.addEventListener('click', () => ctx.setPaused(!state.paused));
    document.addEventListener('loop:paused', syncPause);
    $('fps').addEventListener('input', (e) => {
      state.fps = +e.target.value;
      $('fpsOut').textContent = state.fps;
    });
    syncPause();
  },

  apply(step, P) {
    P.scaffold = step >= 1 && step <= 4 && local.showGrid;
    P.inset = step === 3 || step === 4 ? 'frustum' : null;
    P.starScale = step >= 2 ? 1 : 0;

    // 最後一段與之後：回到定稿值，並用緩動過去；之前：滑桿直接控制相機
    const v = step >= LAST ? FINAL : local;
    P.cam.pos = [0, 0.4, v.dist];
    P.cam.fov = v.fov;
    P.cam.damp = step >= 1 && step < LAST ? 1 : 0.12;

    if (step === Infinity) return null;
    return (step >= 1 && step <= 4 && !local.showGrid)
      ? HUD[step].replace('格線 + 座標軸', '（鷹架已隱藏）')
      : HUD[step];
  },
};

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
import { bindChapter, pick } from '../ui.js';

function describe(l) {
  const lens = pick(l.fov, [30, '長焦'], [65, '標準視角'], '廣角');
  const where = pick(l.dist, [3.5, '貼近主角'], [8, '在中距離'], '退得很遠');
  const feel = l.fov >= 75 && l.dist <= 4 ? '透視感強烈，邊緣帶廣角變形'
    : l.fov <= 30 && l.dist >= 8 ? '透視被壓平，畫面安靜' : '透視自然';
  const line = `${lens}（視角 ${l.fov} 度），相機${where}（距離 ${l.dist.toFixed(1)}）：${feel}。`;
  return { 3: line, all: line };
}

const TASKS = [
  { text: '廣角貼近：星星佔掉大半個畫面，地上的格線急速往遠方收。',
    conds: [[(l) => l.fov >= 80, '視角再開大一點（廣角）'], [(l) => l.dist <= 3.2, '相機再靠近一點']],
    answer: { fov: 95, dist: 2.6 } },
  { text: '長焦遠拍：星星在畫面上不算小，但格線幾乎平行，整個畫面是扁的。',
    conds: [[(l) => l.fov <= 28, '視角再收窄一點（長焦）'], [(l) => l.dist >= 10, '相機再退遠一點']],
    answer: { fov: 24, dist: 12 } },
];

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
    // 第 1 章原本的滑桿用 id 手動接線；練習段的滑桿與即時描述走共用的 bindChapter
    const paint = () => {
      $('codeFov').textContent = local.fov;
      $('codeDist').textContent = local.dist.toFixed(1);
      $('fovOut').textContent = local.fov + '°';
      $('distOut').textContent = local.dist.toFixed(1);
      $('fov').value = local.fov;
      $('dist').value = local.dist;
    };
    const bound = bindChapter($('ch1'), local, ctx, { describe, tasks: TASKS, after: paint });
    const showCamera = () => { bound.sync(); bound.update(); ctx.refresh(); };

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
    P.scaffold = step >= 1 && step < LAST && local.showGrid;
    P.inset = step === 3 || step === 4 ? 'frustum' : null;
    P.starScale = step >= 2 ? 1 : 0;

    // 最後一段與之後：回到定稿值，並用緩動過去；之前：滑桿直接控制相機
    const v = step >= LAST ? FINAL : local;
    P.cam.pos = [0, 0.4, v.dist];
    P.cam.fov = v.fov;
    P.cam.damp = step >= 1 && step < LAST ? 1 : 0.12;

    if (step === Infinity) return null;
    const text = HUD[Math.floor(step)];
    return (step >= 1 && step < LAST && !local.showGrid) ? text.replace('格線 + 座標軸', '（鷹架已隱藏）') : text;
  },
};

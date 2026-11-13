// 第九章：克制與效能
// 旋鈕：像素比、粒子倍率、後製開關、八個效果的開關、主星位置、密度、標題字、三種模擬情境
import html from './09-restraint.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 5;
const local = {
  pr: 2, mul: 1, postOn: true,
  bloom: true, dof: true, grain: true, vig: true, flow: true, disp: true, minis: true, float: true,
  title: false, heroX: 0, density: 0.7, sim: 'none',
};

// 「全開版」：刻意過頭。toggles 裡關掉的項目會被拿掉
function excess(P, t) {
  const post = P.post;
  post.bloom = t.bloom; post.thr = 0.6; post.str = 0.7; post.rad = 0.8;
  post.dof = t.dof; post.focus = 5.8; post.aperture = 4;
  post.grain = t.grain ? 0.5 : 0;
  post.vig = t.vig ? 0.7 : 0;
  post.sat = 1.2; post.contrast = 1.1;
  P.glow.int = 0.95; P.glow.nAmt = t.flow ? 1 : 0; P.glow.nSpeed = 0.6;
  P.glow.disp = t.disp ? 0.09 : 0;
  P.minis.on = t.minis; P.minis.count = 140;
  P.minis.float = t.float ? 1 : 0;
  P.floatAmp = t.float ? 0.12 : 0; P.breath = t.float ? 0.03 : 0;
  P.pts.twinkle = t.float ? 0.8 : 0; P.pts.drift = t.float ? 1 : 0;
  P.pts.count = 6000;
}

const EFFECTS = { bloom: '泛光', dof: '景深', grain: '顆粒', vig: '暗角', flow: '光暈流動', disp: '輪廓位移', minis: '中景小星', float: '漂浮與閃爍' };

function describe(l) {
  const off = Object.keys(EFFECTS).filter((k) => !l[k]).map((k) => EFFECTS[k]);
  const on = Object.keys(EFFECTS).filter((k) => l[k]).map((k) => EFFECTS[k]);
  const cut = off.length === 0 ? '什麼都沒拿掉' : on.length === 0 ? '全部拿掉了' : `拿掉${off.join('、')}，留下${on.join('、')}`;
  const budget = `像素比上限 ${l.pr >= 4 ? '不設（裝置原生）' : l.pr}，粒子 ${l.mul.toFixed(1)} 倍，${l.postOn ? '有' : '沒有'}後製`;
  const layout = `主星${pick(l.heroX, [0.2, '置中'], [0.75, '略偏左'], '放在左邊三分之一，右邊留白')}；背景星密度 ${l.density.toFixed(2)} 倍${l.title ? '；右側放標題' : ''}`;
  return { 1: budget + '。', 2: cut + '。', 3: layout + '。', all: `${cut}。${layout}。${budget}。` };
}

const TASKS = [
  { text: '標準的開場構圖：主星在左邊三分之一，右邊放標題，背景星不搶戲（密度不超過一倍）。',
    conds: [[(l) => l.heroX >= 0.85, '主星再往左移'], [(l) => l.title, '把標題字打開'], [(l) => l.density <= 1, '背景星太密，字會難讀']],
    answer: { heroX: 1, title: true, density: 0.7 } },
  { text: '置中的海報：主星在正中央，不放標題，背景星加到一倍半以上。',
    conds: [[(l) => l.heroX <= 0.1, '主星要回到正中央'], [(l) => !l.title, '把標題字關掉'], [(l) => l.density >= 1.5, '背景星再密一點']],
    answer: { heroX: 0, title: false, density: 1.8 } },
];

export default {
  id: '09',
  html,

  setup(ctx) {
    const root = document.getElementById('ch9');
    bindChapter(root, local, ctx, { describe, tasks: TASKS });
    root.querySelector('#dpr').textContent = (window.devicePixelRatio || 1).toFixed(2).replace(/\.?0+$/, '');
    root.querySelector('#watch').addEventListener('click', () => ctx.startFinale());
  },

  apply(step, P, ctx) {
    const cam = P.cam, post = P.post;
    cam.fov = 50;
    const ALL = { bloom: true, dof: true, grain: true, vig: true, flow: true, disp: true, minis: true, float: true };

    if (step <= 2) {
      cam.pos = [0.4, 0.5, 6.2]; cam.target = [0, 0, 0];
      excess(P, step === 2 ? local : ALL);
      P.stats = P.graph = step >= 1;
      if (step === 1) { P.pr = local.pr; P.mul = local.mul; post.on = local.postOn; }
      return ['scene: 全部開到偏多', 'scene: 全部開到偏多 · 看左上角的毫秒數', 'scene: 一樣一樣關掉'][step];
    }

    // 克制版（也是全書的成品）：第 8 章的定稿，再拿掉顆粒，像素比上限 1.5，星星七成
    post.grain = 0; post.vig = 0.3; post.str = 0.28;
    P.pr = 1.5;
    const done = step >= LAST;
    const heroX = done ? 1 : local.heroX;
    P.mul = done ? 0.7 : local.density;
    P.title = (step === 3 || step === 4.5) && local.title;

    // 讓星星落在畫面左邊三分之一：相機和注視點一起往右移
    const shift = heroX * (6.2 * 0.466 * ctx.stage.camera.aspect) / 3 * 1.15;
    cam.pos = [0.4 + shift, 0.5, 6.2];
    cam.target = [shift, 0, 0];

    if (step === 4) {
      if (local.sim === 'low') { P.pr = 1; P.mul = 0.35; post.on = false; }
      if (local.sim === 'reduced') P.freeze = true;
      if (local.sim === 'nogl') P.fallback = true;
      return { none: 'scene: 成品', low: 'scene: 成品（低階裝置：像素比 1、粒子減半、沒有後製）', reduced: 'scene: 成品（減少動態：停在這一張）', nogl: '（沒有 WebGL）' }[local.sim];
    }
    return step < LAST ? 'scene: 克制的版本' : 'scene: 成品';
  },
};

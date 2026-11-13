// 第九章：克制與效能
// 旋鈕：像素比、粒子倍率、後製開關、八個效果的開關、主星位置、密度、標題字、三種模擬情境
import html from './09-restraint.html?raw';
import { wire } from '../ui.js';

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

export default {
  id: '09',
  html,

  setup(ctx) {
    const root = document.getElementById('ch9');
    wire(root, local, ctx.refresh);
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
    P.title = step === 3 && local.title;

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
    return step === 3 ? 'scene: 克制的版本' : 'scene: 成品';
  },
};

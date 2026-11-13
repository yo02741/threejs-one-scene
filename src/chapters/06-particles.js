// 第六章：粒子與大量物件
// 旋鈕：遠裁面、數量、大小、分佈形狀、聚集、亮度落差、混合模式、小星數量與畫法
import html from './06-particles.html?raw';
import { wire } from '../ui.js';

const LAST = 5;
const FINAL = {
  count: 3000, size: 0.6, atten: true, shape: 'band', cluster: 0.3, bright: 0.75, seed: 1,
  additive: true, depthWrite: false, minis: 40, instanced: true,
};
const local = {
  far: 14, count: 3000, size: 0.5, atten: true, shape: 'box', cluster: 0, bright: 0, seed: 1,
  additive: true, depthWrite: false, minis: 40, instanced: false,
};
const SHAPES = { box: '方盒', shell: '球殼', band: '傾斜的帶狀' };

export default {
  id: '06',
  html,

  setup(ctx) {
    const root = document.getElementById('ch6');
    const names = () => {
      root.querySelector('[data-shape]').textContent = SHAPES[local.shape];
      root.querySelector('[data-blend]').textContent = local.additive ? 'AdditiveBlending' : 'NormalBlending';
    };
    const sync = wire(root, local, () => { names(); ctx.refresh(); });
    names();
    root.querySelector('#reseed').addEventListener('click', () => { local.seed++; sync(); ctx.refresh(); });
  },

  apply(step, P) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) { P.cam.pos = [0, 0.6, 9]; P.cam.target = [0, 0, 0]; P.cam.fov = 50; }

    // 第 01 段沿用第一章的遠裁面（星空會被切掉），之後放寬
    P.cam.far = step === 1 ? local.far : step >= 2 ? 200 : 14;

    const pts = P.pts;
    pts.on = step >= 1;
    pts.count = v.count; pts.size = v.size; pts.atten = v.atten; pts.seed = v.seed;
    // 分佈在第 02 段才交給讀者；混合模式在第 03 段
    if (step >= 2) { pts.shape = v.shape; pts.cluster = v.cluster; pts.bright = v.bright; }
    else { pts.shape = 'box'; pts.cluster = 0; pts.bright = 0; }
    if (step >= 3) { pts.additive = v.additive; pts.depthWrite = v.depthWrite; }

    P.minis.on = step >= 4;
    P.minis.count = v.minis;
    P.minis.instanced = v.instanced;
    P.stats = step >= 1 && !done;

    if (step === Infinity) return null;
    if (step === 0) return 'scene: star + 三盞燈';
    return `scene: star + ${pts.count.toLocaleString()} 個點` + (P.minis.on ? ` + ${P.minis.count} 顆小星` : '');
  },
};

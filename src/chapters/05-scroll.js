// 第五章：捲動驅動的相機
// 旋鈕：推軌的起訖距離、阻尼、環繞路徑、鏡位與切換方式
import html from './05-scroll.html?raw';
import { wire } from '../ui.js';
import { lerp } from '../motion.js';
import { orbitPoint } from '../rig.js';

const LAST = 6;
const local = { far: 9, near: 3, smoothOn: true, damp: 0.1, a1: 120, h1: 1.6, look: 0, shot: 0, cut: 'ease', dur: 1.2 };
const SHOTS = [
  { pos: [0, 0.5, 5.2], target: [0, 0, 0], fov: 50 },
  { pos: [3.0, -1.4, 2.4], target: [0, 0.1, 0], fov: 72 },
  { pos: [-1.6, 4.6, 3.0], target: [0, 0, 0], fov: 34 },
];
// 這一章定下來的鏡頭
const TAKE = { a0: 0, a1: 120, r0: 7, r1: 3, h0: 0.4, h1: 1.3 };
export const HOME = { pos: [1.4, 0.7, 5], target: [0, 0, 0], fov: 50 }; // 之後各章預設的鏡位

let pEls = [];

export default {
  id: '05',
  html,

  setup(ctx) {
    const root = document.getElementById('ch5');
    wire(root, local, ctx.refresh);
    pEls = Array.from(root.querySelectorAll('[data-p]'));
  },

  apply(step, P, ctx) {
    const cam = P.cam;
    if (step >= LAST) { // 包含之後的章節：回到預設鏡位
      Object.assign(cam, HOME);
      return step === Infinity ? null : 'scene: star + 三盞燈';
    }
    const p = ctx.state.progress;
    pEls.forEach((el) => { el.textContent = p.toFixed(2); });

    if (step === 0) cam.pos = [0, 0.5, 5.2];
    else if (step === 1 || step === 2) {
      cam.pos = [0, 0.5, lerp(local.far, local.near, p)];
      cam.damp = step === 2 && local.smoothOn ? local.damp : 1;
    } else if (step === 3) {
      const path = { a0: 0, a1: local.a1, r0: 5.5, r1: 5.5, h0: 0.5, h1: local.h1 };
      cam.pos = orbitPoint(path, p);
      cam.target = [0, local.look, 0];
      cam.damp = 0.15;
      P.path = path;
      P.inset = 'path';
    } else if (step === 4) {
      Object.assign(cam, SHOTS[local.shot]);
      // 把「幾秒內大致到位」換算成每一幀的阻尼
      cam.damp = local.cut === 'cut' ? 1 : 1 - Math.pow(0.03, 1 / (60 * local.dur));
    } else if (step === 5) {
      cam.pos = orbitPoint(TAKE, p);
      cam.damp = 0.1;
    }
    return 'scene: star + 三盞燈' + (step >= 1 && step !== 4 ? ` · 進度 ${p.toFixed(2)}` : '');
  },
};

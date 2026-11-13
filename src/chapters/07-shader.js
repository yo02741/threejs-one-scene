// 第七章：Shader 入門
// 旋鈕：漸層的顏色與方向、除錯檢視、菲涅耳、噪聲、頂點位移、背景星閃爍
import html from './07-shader.html?raw';
import { wire } from '../ui.js';

const LAST = 5;
const FINAL = {
  on: true, a: '#ffe9b8', b: '#ffcf9a', dir: 0, pow: 2.5, int: 0.6,
  nScale: 1.2, nSpeed: 0.25, nAmt: 0.7, freeze: false, disp: 0.03, dispFreq: 2, twinkle: 0.35,
};
const local = {
  on: true, a: '#ffe9b8', b: '#7fb0c8', dir: 0, debug: false, pow: 2.5, int: 0.6,
  nScale: 1.5, nSpeed: 0.3, nAmt: 0.8, freeze: false, disp: 0.06, dispFreq: 2, twinkle: 0.5,
};

export default {
  id: '07',
  html,

  setup(ctx) {
    const root = document.getElementById('ch7');
    const axis = () => { root.querySelector('[data-axis]').textContent = local.dir ? 'x' : 'y'; };
    wire(root, local, () => { axis(); ctx.refresh(); });
    axis();
  },

  apply(step, P) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) { P.cam.pos = [0.7, 0.3, 4]; P.cam.target = [0, 0, 0]; P.cam.fov = 50; }
    if (step === 0) return 'scene: 星空';

    const G = P.glow;
    G.on = v.on;
    G.a = v.a; G.b = v.b; G.dir = v.dir;
    G.debug = step === 1 && local.debug;
    if (step >= 2) { G.fres = 1; G.pow = v.pow; G.int = v.int; }
    if (step >= 3) { G.nScale = v.nScale; G.nSpeed = v.nSpeed; G.nAmt = v.nAmt; G.freeze = v.freeze; }
    if (step >= 4) {
      G.disp = v.disp; G.dispFreq = v.dispFreq;
      P.pts.shader = true;
      P.pts.twinkle = v.twinkle;
    }
    return step === Infinity ? null : 'scene: 星空 + 光暈殼（自己寫的 shader）';
  },
};

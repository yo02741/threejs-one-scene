// 第七章：Shader 入門
// 旋鈕：漸層的顏色與方向、除錯檢視、菲涅耳、噪聲、頂點位移、背景星閃爍
import html from './07-shader.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 5;
const FINAL = {
  on: true, a: '#ffe9b8', b: '#ffcf9a', dir: 0, pow: 2.5, int: 0.6,
  nScale: 1.2, nSpeed: 0.25, nAmt: 0.7, freeze: false, disp: 0.03, dispFreq: 2, twinkle: 0.35,
};
const local = {
  on: true, a: '#ffe9b8', b: '#7fb0c8', dir: 0, debug: false, pow: 2.5, int: 0.6,
  nScale: 1.5, nSpeed: 0.3, nAmt: 0.8, freeze: false, disp: 0.06, dispFreq: 2, twinkle: 0.5,
};

function describe(l) {
  const fres = `菲涅耳光暈，${pick(l.pow, [1.5, '寬而柔，往中間擴散'], [3.5, '集中在邊緣'], '只剩最外面一圈細邊')}，強度 ${l.int.toFixed(2)}`;
  const still = l.nAmt < 0.1 || l.nSpeed < 0.05;
  const noise = l.nAmt < 0.1 ? '不受噪聲影響，是均勻的一圈'
    : `用${pick(l.nScale, [1, '低頻'], [3, '中頻'], '高頻')}噪聲（${pick(l.nScale, [1, '大塊的明暗'], [3, '中等的紋路'], '細碎的斑點')}）${still ? '做出靜止的紋理' : pick(l.nSpeed, [0.7, '緩慢流動'], '快速流動')}`;
  const shape = `輪廓${pick(l.disp, [0.02, '是正圓'], [0.12, '略微不規則'], '明顯扭曲')}（位移 ${l.disp.toFixed(2)}）`;
  const twinkle = `背景的星${pick(l.twinkle, [0.1, '不閃'], [0.5, '微微閃爍'], '明顯閃爍')}`;
  return {
    2: fres + '。', 3: noise + '。', 4: `${shape}；${twinkle}。`,
    all: `外面包一層${fres}；${noise}；${shape}。${twinkle}。`,
  };
}

const TASKS = [
  { text: '一圈安靜的細邊：光只剩最外緣一圈，不流動，輪廓是正圓。',
    conds: [
      [(l) => l.pow >= 4, '光暈還太寬（銳利度調高）'],
      [(l) => l.nAmt <= 0.1 || l.nSpeed <= 0.05, '它還在流動（把噪聲的速度或影響降到 0）'],
      [(l) => l.disp <= 0.01, '輪廓還不是正圓（位移調到 0）'],
    ],
    answer: { pow: 5, nAmt: 0, nSpeed: 0, disp: 0 } },
  { text: '燃燒的日冕：光暈又寬又亮，快速流動，輪廓明顯扭曲。',
    conds: [
      [(l) => l.pow <= 1.6, '光暈不夠寬（銳利度調低）'],
      [(l) => l.int >= 0.9, '不夠亮'],
      [(l) => l.nSpeed >= 0.8 && l.nAmt >= 0.5, '流動得不夠快、不夠明顯'],
      [(l) => l.disp >= 0.15, '輪廓扭曲得不夠'],
    ],
    answer: { pow: 1.2, int: 1.1, nSpeed: 1.2, nAmt: 0.9, disp: 0.22 } },
];

export default {
  id: '07',
  html,

  setup(ctx) {
    const root = document.getElementById('ch7');
    const axis = () => { root.querySelector('[data-axis]').textContent = local.dir ? 'x' : 'y'; };
    bindChapter(root, local, ctx, { describe, tasks: TASKS, after: axis });
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

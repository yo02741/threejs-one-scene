// 選修：把模型請進場景（現成的 glTF）
// 旋鈕：模型、包圍盒與原點、自動校正、縮放、旋轉、材質、環境反射
import html from './11-model.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 4;
const local = { which: 'lantern', box: true, fit: false, scale: 1, rotY: 0, override: false, env: 0.1 };
const NAMES = { lantern: '提燈', avocado: '酪梨' };

function describe(l) {
  const fit = l.fit ? '先置中並校正大小' : '照檔案原本的大小和原點擺放';
  const place = `縮放 ${l.scale.toFixed(2)} 倍${Math.abs(l.rotY) >= 5 ? `，轉 ${l.rotY} 度` : ''}`;
  const mat = l.override ? '換成和主星同一種材質' : '保留模型自己的貼圖';
  const env = `環境反射 ${l.env.toFixed(2)}（${pick(l.env, [0.3, '金屬的部分幾乎是暗的'], [1, '看得到一些反射'], '反射明顯')}）`;
  return {
    1: `載入${NAMES[l.which]}，${fit}。`, 2: `${fit}；${place}。`, 3: `${mat}；${env}。`,
    all: `${NAMES[l.which]}：${fit}，${place}，放在主星右邊。${mat}，用場景現有的三盞燈，${env}。`,
  };
}

const TASKS = [
  { text: '一盞和主星同一種材質的提燈：大小已經校正，轉到側面（60 到 120 度之間）。',
    conds: [
      [(l) => l.which === 'lantern', '要的是提燈'],
      [(l) => l.fit, '還沒校正大小'],
      [(l) => l.override, '材質要換成和主星一樣的'],
      [(l) => Math.abs(l.rotY) >= 60 && Math.abs(l.rotY) <= 120, '轉到側面（60 到 120 度）'],
    ],
    answer: { which: 'lantern', fit: true, override: true, rotY: 90, scale: 1 } },
  { text: '一顆保留原本貼圖的酪梨，比主星還大（校正後再放大 1.5 倍以上），表面看得到明顯的環境反射。',
    conds: [
      [(l) => l.which === 'avocado', '要的是酪梨'],
      [(l) => l.fit, '還沒校正大小（不校正的話它小到看不見）'],
      [(l) => !l.override, '要保留它自己的貼圖'],
      [(l) => l.scale >= 1.5, '再放大一點（1.5 倍以上）'],
      [(l) => l.env >= 1, '環境反射再強一點（1 以上）'],
    ],
    answer: { which: 'avocado', fit: true, override: false, scale: 1.8, env: 1.2 } },
];

export default {
  id: 'E1',
  html,

  setup(ctx) {
    const root = document.getElementById('ch11');
    const mat = () => { root.querySelector('[data-mat]').textContent = local.override ? 'star.material' : '模型自己的材質'; };
    bindChapter(root, local, ctx, { describe, tasks: TASKS, after: mat });
    this.sizeEl = root.querySelector('#modelSize');
  },

  apply(step, P) {
    if (step >= LAST) return step === Infinity ? null : 'scene: 成品'; // 客人走了，成品不變
    P.cam.pos = [1.5, 0.9, 8.2]; P.cam.target = [1.4, 0.1, 0]; P.cam.fov = 50;
    P.title = false;
    if (step === 0) return 'scene: 成品（右邊空著）';

    const M = P.model;
    M.on = true;
    M.which = local.which;
    M.box = step <= 2 && local.box;
    if (step >= 2) { M.fit = local.fit; M.scale = local.scale; M.rotY = local.rotY; }
    if (step >= 3) { M.fit = step === 3 ? true : local.fit; M.override = local.override; P.env = local.env; }
    return `scene: 成品 + ${NAMES[local.which]}（glTF）`;
  },

  // 模型載入完才知道它原本多大
  frame(ctx) {
    const size = ctx.stage.modelSize(local.which);
    const text = size == null ? '載入中' : size < 1 ? size.toFixed(3) : size.toFixed(1);
    if (this.sizeEl.textContent !== text) this.sizeEl.textContent = text;
  },
};

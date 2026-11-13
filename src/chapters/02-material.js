// 第二章：幾何與材質
// 旋鈕：細分、線框、材質種類、工作燈、粗糙度、金屬感、平面著色、法線
import html from './02-material.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 5;
const FINAL = { detail: 2, rough: 0.45, metal: 0, flat: true };
const local = { detail: 1, wire: true, mat: 'basic', work: false, rough: 0.6, metal: 0, flat: false, normals: true };
const triangles = (detail) => 20 * (detail + 1) ** 2;

function describe(l) {
  const faces = pick(l.detail, [2, '低面數，輪廓看得出是多邊形'], [4, '中等面數，輪廓接近圓'], '高面數，輪廓是圓的');
  const surface = l.metal > 0.5
    ? pick(l.rough, [0.25, '拋光金屬，像鏡子一樣映出環境'], [0.6, '半霧面的金屬'], '霧面金屬')
    : pick(l.rough, [0.25, '光滑的非金屬，像上了釉'], [0.6, '半霧面，像塑膠'], '不反光的霧面，像陶土');
  const shade = l.flat ? '保留稜角（平面著色）' : '表面圓滑（平滑著色）';
  const nums = `粗糙度 ${l.rough.toFixed(2)}、金屬感 ${l.metal.toFixed(2)}`;
  return {
    1: `${triangles(l.detail)} 個三角形：${faces}。`,
    3: `${surface}（${nums}）。`,
    4: `${shade}。`,
    all: `${faces}；${shade}；表面是${surface}，${nums}。`,
  };
}

const TASKS = [
  { text: '一顆拋光的金屬球：看不出稜角，表面像鏡子一樣映出周圍。',
    conds: [
      [(l) => !l.flat, '還看得到稜角（關掉平面著色）'],
      [(l) => l.detail >= 3, '輪廓還看得出是多邊形，面數再多一點'],
      [(l) => l.metal >= 0.8, '它還不像金屬'],
      [(l) => l.rough <= 0.2, '表面再光滑一點'],
    ],
    answer: { detail: 4, flat: false, metal: 1, rough: 0.1 } },
  { text: '一塊低面數的陶土：稜角分明，完全不反光。',
    conds: [
      [(l) => l.flat, '稜角要留著（打開平面著色）'],
      [(l) => l.detail <= 1, '面數再少一點'],
      [(l) => l.metal <= 0.15, '它不該像金屬'],
      [(l) => l.rough >= 0.8, '表面要更霧'],
    ],
    answer: { detail: 1, flat: true, metal: 0, rough: 0.95 } },
];

export default {
  id: '02',
  html,

  setup(ctx) {
    const root = document.getElementById('ch2');
    const showTri = () => root.querySelectorAll('[data-tri]').forEach((el) => { el.textContent = triangles(local.detail); });
    bindChapter(root, local, ctx, { describe, tasks: TASKS, after: showTri });
  },

  apply(step, P) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) P.cam.pos = [0, 0.3, 4.2];

    P.detail = step >= 1 ? v.detail : 1;
    P.wire = done ? false : step >= 1 ? local.wire : true;

    // 第 02 段由讀者自己換材質、開燈；第 03 段起直接幫他換好
    P.mat = step >= 3 ? 'standard' : step === 2 ? local.mat : 'basic';
    const lit = step >= 3 || (step === 2 && local.work);
    P.work = lit ? 1 : 0;
    P.env = lit ? 0.35 : 0;

    if (step >= 3) { P.rough = v.rough; P.metal = v.metal; } else { P.rough = 0.6; P.metal = 0; }
    P.flat = step >= 4 ? v.flat : false;
    P.normals = step === 4 && local.normals;
    P.emissive = done ? 0.12 : 0;

    if (step === 0) return 'scene: star';
    if (step === 1) return `scene: star（${triangles(local.detail)} 個三角形）`;
    if (step === 2) return P.mat === 'basic' ? 'scene: star（Basic：不需要光）' : lit ? 'scene: star + 工作燈' : 'scene: star（Standard，但沒有光）';
    return 'scene: star + 工作燈（借來的）';
  },
};

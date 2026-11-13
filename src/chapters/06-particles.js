// 第六章：粒子與大量物件
// 旋鈕：遠裁面、數量、大小、分佈形狀、聚集、亮度落差、混合模式、小星數量與畫法
import html from './06-particles.html?raw';
import { bindChapter, pick } from '../ui.js';

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

function describe(l) {
  const n = l.count.toLocaleString();
  const where = `分佈在${SHAPES[l.shape]}裡，${pick(l.cluster, [0.15, '均勻散開'], [0.5, '略有聚集'], '明顯成團')}`;
  const bright = pick(l.bright, [0.25, '每顆差不多亮'], [0.6, '亮度有些落差'], '多數很暗、少數很亮');
  const blend = (l.additive ? '加法混合，重疊的地方更亮' : '一般混合') + (l.depthWrite ? '；寫入深度，會出現方形的缺口' : '');
  const minis = `中景 ${l.minis} 顆小多面體，${l.instanced ? '用 instancing 一次畫完' : '每顆各畫一次'}`;
  return {
    1: `${n} 顆點狀的星，${l.atten ? '近大遠小' : '每顆在畫面上一樣大'}。`,
    2: `${where}；${bright}。`, 3: blend + '。', 4: minis + '。',
    all: `大約 ${n} 顆點狀的星，${where}；${bright}；${l.additive ? '加法混合' : '一般混合'}。${minis}。`,
  };
}

const TASKS = [
  { text: '稀疏而均勻的夜空：一千顆以下，鋪滿整個球殼，每顆差不多亮，沒有成團。',
    conds: [
      [(l) => l.count <= 1000, '星星太多了'],
      [(l) => l.shape === 'shell', '要鋪滿球殼'],
      [(l) => l.cluster <= 0.1, '還有成團（聚集調低）'],
      [(l) => l.bright <= 0.2, '亮度落差太大'],
    ],
    answer: { count: 800, shape: 'shell', cluster: 0, bright: 0.1 } },
  { text: '一條濃密的星帶：一萬顆以上，沿著帶狀分佈，明顯成團，少數幾顆特別亮；中景的小星只留二十顆以內。',
    conds: [
      [(l) => l.count >= 10000, '星星不夠多'],
      [(l) => l.shape === 'band', '要沿著帶狀分佈'],
      [(l) => l.cluster >= 0.5, '成團不夠明顯'],
      [(l) => l.bright >= 0.7, '亮度落差再大一點'],
      [(l) => l.minis <= 20, '中景的小星太多'],
    ],
    answer: { count: 14000, shape: 'band', cluster: 0.6, bright: 0.85, minis: 20 } },
];

export default {
  id: '06',
  html,

  setup(ctx) {
    const root = document.getElementById('ch6');
    const names = () => {
      root.querySelector('[data-shape]').textContent = SHAPES[local.shape];
      root.querySelector('[data-blend]').textContent = local.additive ? 'AdditiveBlending' : 'NormalBlending';
    };
    const bound = bindChapter(root, local, ctx, { describe, tasks: TASKS, after: names });
    root.querySelector('#reseed').addEventListener('click', () => { local.seed++; bound.sync(); ctx.refresh(); });
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

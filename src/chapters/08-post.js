// 第八章：後製
// 旋鈕：後製開關與分割線、泛光、主星亮度、色調映射、景深、顆粒、暗角、調色
import html from './08-post.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 5;
export const FINAL = {
  bloom: true, emissive: 0.4, thr: 0.95, str: 0.3, rad: 0.45, tone: true,
  dof: false, focus: 5.6, aperture: 3, grain: 0.18, vig: 0.35,
  exposure: 1, contrast: 1.05, sat: 1, cool: 0.5, warm: 0.5,
};
const local = {
  on: true, bloom: true, emissive: 0.45, thr: 0.95, str: 0.35, rad: 0.45, tone: true,
  dof: false, focus: 5.6, aperture: 3, grain: 0, vig: 0,
  exposure: 1, contrast: 1, sat: 1, cool: 0, warm: 0,
};

function describe(l) {
  const bloom = !l.bloom ? '沒有泛光'
    : `泛光：${pick(l.thr, [0.5, '閾值低，幾乎所有東西都在發光'], [0.9, '閾值中等，亮的東西都會發光'], '閾值高，只有最亮的東西發光')}；${l.rad >= 0.6 ? '暈得很開' : '暈得收斂'}，強度${pick(l.str, [0.3, '淡'], [1, '中等'], '強')}`;
  const lens = [
    l.dof && `景深，焦點在距離 ${l.focus.toFixed(1)}`,
    l.grain > 0.02 && `${pick(l.grain, [0.25, '很淡的'], [0.6, '明顯的'], '很重的')}顆粒`,
    l.vig > 0.02 && `${pick(l.vig, [0.3, '很淡的'], [0.6, '明顯的'], '很重的')}暗角`,
  ].filter(Boolean).join('、') || '沒有景深、顆粒、暗角';
  const word = (v, lo, hi) => (v < 0.93 ? lo : v > 1.07 ? hi : null);
  const grade = [
    word(l.exposure, '曝光偏暗', '曝光偏亮'), word(l.contrast, '對比偏低', '對比偏高'),
    l.sat < 0.15 ? '接近黑白' : word(l.sat, '飽和度偏低', '顏色鮮豔'),
    l.cool > 0.2 && '暗部偏藍', l.warm > 0.2 && '亮部偏暖',
  ].filter(Boolean).join('、') || '不調色';
  return { 2: bloom + '。', 3: lens + '。', 4: grade + '。', all: `${bloom}。${lens}。調色：${grade}。` };
}

const TASKS = [
  { text: '一張老照片：沒有泛光，顆粒很重，四個角明顯變暗，顏色幾乎褪光。',
    conds: [
      [(l) => !l.bloom, '老照片不會發光（關掉泛光）'],
      [(l) => l.grain >= 0.6, '顆粒再重一點'],
      [(l) => l.vig >= 0.6, '四個角再暗一點'],
      [(l) => l.sat <= 0.3, '顏色還太鮮豔'],
    ],
    answer: { bloom: false, grain: 0.8, vig: 0.75, sat: 0.15, warm: 0.4 } },
  { text: '夢幻的柔光：畫面裡亮的地方都在發光、暈得很開；沒有顆粒，顏色鮮豔，亮部偏暖。',
    conds: [
      [(l) => l.bloom, '要有泛光'],
      [(l) => l.thr <= 0.5, '只有主星在發光（閾值調低，讓更多東西發光）'],
      [(l) => l.rad >= 0.7, '暈得不夠開（半徑調大）'],
      [(l) => l.grain <= 0.05, '把顆粒拿掉'],
      [(l) => l.sat >= 1.3, '顏色再鮮豔一點'],
      [(l) => l.warm >= 0.6, '亮部再暖一點'],
    ],
    answer: { bloom: true, thr: 0.35, rad: 0.85, grain: 0, vig: 0.2, sat: 1.4, warm: 0.8 } },
];

export default {
  id: '08',
  html,

  setup(ctx) {
    bindChapter(document.getElementById('ch8'), local, ctx, { describe, tasks: TASKS });
  },

  apply(step, P, ctx) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) { P.cam.pos = [1.6, 0.6, 5.6]; P.cam.target = [0, 0, 0]; P.cam.fov = 50; }
    if (step === 0) return 'scene: 星空（直接畫到螢幕上）';

    const post = P.post;
    post.on = step === 1 ? local.on : true;
    post.split = done ? -1 : ctx.state.split;   // 分割線是鷹架，章末拆掉
    if (step === 1) { post.sat = 0; return post.on ? 'scene → 一張圖 → 黑白 → 螢幕' : 'scene → 螢幕'; }

    post.bloom = v.bloom; post.thr = v.thr; post.str = v.str; post.rad = v.rad; post.tone = v.tone;
    P.emissive = v.emissive;
    if (step >= 3) { post.dof = v.dof; post.focus = v.focus; post.aperture = v.aperture; post.grain = v.grain; post.vig = v.vig; }
    if (step >= 4) { post.exposure = v.exposure; post.contrast = v.contrast; post.sat = v.sat; post.cool = v.cool; post.warm = v.warm; }

    if (step === Infinity) return null;
    const chain = ['泛光', step >= 3 && post.dof && '景深', step >= 3 && '顆粒・暗角', step >= 4 && '調色'].filter(Boolean);
    return 'scene → 一張圖 → ' + chain.join(' → ') + ' → 螢幕';
  },
};

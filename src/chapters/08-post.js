// 第八章：後製
// 旋鈕：後製開關與分割線、泛光、主星亮度、色調映射、景深、顆粒、暗角、調色
import html from './08-post.html?raw';
import { wire } from '../ui.js';

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

export default {
  id: '08',
  html,

  setup(ctx) {
    wire(document.getElementById('ch8'), local, ctx.refresh);
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

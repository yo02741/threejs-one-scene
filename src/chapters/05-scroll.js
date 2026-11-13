// 第五章：捲動驅動的相機
// 旋鈕：推軌的起訖距離、阻尼、環繞路徑、鏡位與切換方式
import html from './05-scroll.html?raw';
import { bindChapter, pick } from '../ui.js';
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

const SHOT_NAMES = ['正面', '仰角貼近', '俯瞰'];

function describe(l) {
  const dolly = `推軌：距離從 ${l.far} 到 ${l.near}（${l.far > l.near ? '推近' : l.far < l.near ? '拉遠' : '沒有移動'}）`;
  const follow = l.smoothOn ? `跟隨帶阻尼 ${l.damp.toFixed(2)}（${pick(l.damp, [0.05, '很黏，停手後還會滑一段'], [0.2, '平滑'], '幾乎緊貼')}）` : '沒有阻尼，直接對應捲動';
  const a = Math.abs(l.a1);
  const orbit = a < 5 ? '不環繞' : `往${l.a1 > 0 ? '右' : '左'}環繞 ${a} 度${a >= 170 ? '，繞到背面' : ''}`;
  const height = `高度從 0.5 到 ${l.h1.toFixed(1)}${l.h1 >= 2.5 ? '（升到俯視）' : l.h1 <= -0.5 ? '（降到仰視）' : ''}`;
  const look = pick(l.look, [-0.3, '注視點偏低，主角落在畫面上方'], [0.3, '注視點在主角身上'], '注視點偏高，主角落在畫面下方');
  const shot = `${SHOT_NAMES[l.shot]}鏡位，${l.cut === 'cut' ? '硬切' : l.dur.toFixed(1) + ' 秒過渡'}`;
  return {
    1: dolly + '。', 2: follow + '。', 3: `${orbit}，${height}；${look}。`, 4: shot + '。',
    all: `在這段捲動裡，相機${orbit}，${height}；${look}；${follow}。段落之間用${l.cut === 'cut' ? '硬切' : '過渡'}。`,
  };
}

const TASKS = [
  { text: '相機往左繞到主角的正背面，同時一路升高，最後是俯視。',
    conds: [[(l) => l.a1 <= -160, '要往左繞到背面（環繞角度 -160° 以下）'], [(l) => l.h1 >= 3, '終點再高一點，要到俯視']],
    answer: { a1: -180, h1: 4, look: 0 } },
  { text: '低角度的小幅環繞：只往右繞不到四分之一圈，鏡頭降到仰視，主角落在畫面下方。',
    conds: [
      [(l) => l.a1 >= 20 && l.a1 <= 90, '往右繞，但不要超過 90°'],
      [(l) => l.h1 <= -0.5, '鏡頭要降低到仰視（終點高度調到負的）'],
      [(l) => l.look >= 0.4, '把注視點往上移，主角才會落到畫面下方'],
    ],
    answer: { a1: 60, h1: -1.5, look: 0.6 } },
];

let pEls = [];

export default {
  id: '05',
  html,

  setup(ctx) {
    const root = document.getElementById('ch5');
    bindChapter(root, local, ctx, { describe, tasks: TASKS });
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
    } else if (step === 3 || step === 5.5) { // 5.5 是練習段，用同一條可調的路徑
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

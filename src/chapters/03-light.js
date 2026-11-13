// 第三章：光與陰影
// 旋鈕：工作燈、主光的方位／高度／強度、三盞燈的開關與強度、色溫、環境光、投影
import html from './03-light.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 5;
const FINAL = {
  az: -40, el: 40, int: 2.6, keyOn: true, fillOn: true, fillInt: 0.65, rimOn: true, rimInt: 1.8,
  keyTemp: 0.35, fillTemp: -0.5, hemi: 0.15,
};
const local = {
  work: true, az: -40, el: 40, int: 2.6, marks: true,
  keyOn: true, fillOn: false, fillInt: 0.65, rimOn: false, rimInt: 3,
  keyTemp: 0, fillTemp: 0, hemi: 0,
  shadow: false, soft: 2, res: 1024,
};

const side = (az) => {
  const a = Math.abs(az), lr = az < 0 ? '左' : '右';
  return a < 20 ? '正面' : a < 70 ? lr + '前方' : a < 110 ? '正' + lr + '方' : a < 160 ? lr + '後方' : '正後方';
};
const temp = (t) => (t > 0.15 ? '偏暖' : t < -0.15 ? '偏冷' : '白色');

function describe(l) {
  const key = `主光從${side(l.az)}、${pick(l.el, [10, '平視的高度'], [55, '斜上方'], '頭頂上')}打（方位 ${l.az}°、高度 ${l.el}°），強度${pick(l.int, [1.5, '偏弱'], [4, '中等'], '很強')}`;
  const ratio = l.fillInt > 0 ? l.int / l.fillInt : Infinity;
  const fill = !l.fillOn || l.fillInt === 0 ? '沒有補光，暗面接近全黑'
    : ratio >= 1.5 ? `補光大約是主光的 ${ratio >= 7 ? '八分之一以下' : '1/' + Math.round(ratio)}`
    : '補光和主光差不多亮，是平光';
  const rim = l.rimOn ? '背後有一道輪廓光勾邊' : '沒有輪廓光';
  const color = `主光${temp(l.keyTemp)}、補光${temp(l.fillTemp)}` + (l.hemi > 0.4 ? '；環境光偏多，明暗被沖淡了' : '');
  return {
    1: key + '。',
    2: `${l.keyOn ? '' : '主光關著；'}${fill}；${rim}。`,
    3: color + '。',
    all: `${key}，${temp(l.keyTemp)}；${fill}，${temp(l.fillTemp)}；${rim}。`,
  };
}

const TASKS = [
  { text: '夜晚的月光：主光從右後方打過來、偏冷；沒有補光，暗面幾乎全黑；背後有輪廓光。',
    conds: [
      [(l) => l.az >= 100, '主光要從右後方來（方位往右轉過 100°）'],
      [(l) => l.keyTemp <= -0.3, '主光要偏冷'],
      [(l) => !l.fillOn || l.fillInt < 0.1, '把補光關掉'],
      [(l) => l.rimOn, '打開輪廓光'],
    ],
    answer: { az: 130, el: 45, keyTemp: -0.7, fillOn: false, rimOn: true } },
  { text: '柔和的白天：主光從左前方的斜上方打、偏暖；補光很足，至少有主光的一半，而且偏冷。',
    conds: [
      [(l) => l.az <= -20 && l.az >= -70, '主光要在左前方（方位 -20° 到 -70°）'],
      [(l) => l.el >= 25, '主光再高一點'],
      [(l) => l.keyTemp >= 0.3, '主光要偏暖'],
      [(l) => l.fillOn && l.fillInt >= l.int * 0.5, '補光不夠亮（至少主光的一半）'],
      [(l) => l.fillTemp <= -0.2, '補光要偏冷'],
    ],
    answer: { az: -45, el: 40, keyTemp: 0.5, fillOn: true, fillInt: 1.6, fillTemp: -0.5, rimOn: false } },
];

export default {
  id: '03',
  html,

  setup(ctx) {
    bindChapter(document.getElementById('ch3'), local, ctx, { describe, tasks: TASKS });
  },

  apply(step, P) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) P.cam.pos = step === 4 ? [0, 1.7, 6.4] : [0, 0.5, 5.2];

    // 章名頁：工作燈由讀者親手關掉。之後就不再有工作燈，環境只留一點點給反射用
    const work = step === 0 && local.work;
    P.work = work ? 1 : 0;
    P.env = work ? 0.35 : step === 0 ? 0 : 0.1;
    if (step === 0) return work ? 'scene: star + 工作燈（借來的）' : 'scene: star（只剩自發光）';

    const free = step === 2 || step === 4.5; // 這兩段由讀者自己開關每一盞燈
    P.key.on = step === 2 ? local.keyOn : true;
    P.key.az = v.az; P.key.el = v.el; P.key.int = v.int;
    // 第 01 段只有主光；第 02 段由讀者開關；第 03 段起三盞都開
    const all = step >= 3;
    P.fill.on = free ? local.fillOn : all;
    P.fill.int = v.fillInt;
    P.rim.on = free ? local.rimOn : all;
    P.rim.int = v.rimInt;
    if (all) { P.key.temp = v.keyTemp; P.fill.temp = v.fillTemp; P.hemi = v.hemi; }

    P.lightMarks = !done && local.marks;
    P.ground = step === 4;
    P.shadow = step === 4 && local.shadow;
    P.shadowSoft = local.soft;
    P.shadowRes = local.res;

    const lights = ['主光', P.fill.on && '補光', P.rim.on && '輪廓光'].filter(Boolean);
    if (!P.key.on) lights.shift();
    return 'scene: star + ' + lights.join(' + ') + (step === 4 ? ' + 地面（臨時）' : '');
  },
};

// 第三章：光與陰影
// 旋鈕：工作燈、主光的方位／高度／強度、三盞燈的開關與強度、色溫、環境光、投影
import html from './03-light.html?raw';
import { wire } from '../ui.js';

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

export default {
  id: '03',
  html,

  setup(ctx) {
    wire(document.getElementById('ch3'), local, ctx.refresh);
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

    P.key.on = step === 2 ? local.keyOn : true;
    P.key.az = v.az; P.key.el = v.el; P.key.int = v.int;
    // 第 01 段只有主光；第 02 段由讀者開關；第 03 段起三盞都開
    const all = step >= 3;
    P.fill.on = all || (step === 2 && local.fillOn);
    P.fill.int = v.fillInt;
    P.rim.on = all || (step === 2 && local.rimOn);
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

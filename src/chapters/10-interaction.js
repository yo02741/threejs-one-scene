// 第十章：互動
// 旋鈕：游標視差、懸停放大、射線碰到的位置、推開／吸引小星的力道與半徑
import html from './10-interaction.html?raw';
import { bindChapter, pick } from '../ui.js';

const LAST = 4;
const FINAL = { parallax: 0.25, hover: 0.08, push: 0.6, radius: 1.6 };
const local = { parallax: 0.4, hover: 0.12, mark: true, push: 0.8, radius: 1.8 };

function describe(l) {
  const par = l.parallax < 0.03 ? '沒有視差' : `相機跟著游標做${pick(l.parallax, [0.3, '很輕微的'], [0.8, '明顯的'], '很誇張的')}視差（強度 ${l.parallax.toFixed(2)}），帶阻尼`;
  const hover = l.hover < 0.005 ? '懸停在主星上沒有反應' : `游標懸停在主星上時放大 ${Math.round(l.hover * 100)}%`;
  const force = Math.abs(l.push);
  const field = force < 0.03 ? '小星不受游標影響'
    : `游標附近 ${l.radius.toFixed(1)} 單位內的小星會被${pick(force, [0.4, '輕輕'], [1, ''], '用力')}${l.push > 0 ? '推開' : '吸過來'}`;
  return { 1: par + '。', 2: hover + '。', 3: field + '。', all: `${par}。${hover}。${field}。` };
}

const TASKS = [
  { text: '含蓄的回應：視差很輕微（有，但不超過 0.2），懸停時只放大一點點（5% 以內），小星完全不受影響。',
    conds: [
      [(l) => l.parallax > 0 && l.parallax <= 0.2, '視差要有，但不超過 0.2'],
      [(l) => l.hover > 0 && l.hover <= 0.05, '放大要有，但不超過 5%'],
      [(l) => Math.abs(l.push) < 0.03, '小星不該被影響（力道調到 0）'],
    ],
    answer: { parallax: 0.15, hover: 0.04, push: 0 } },
  { text: '磁鐵：游標把周圍一大圈（半徑 3 以上）的小星都吸過來。',
    conds: [[(l) => l.push <= -0.5, '要吸過來，不是推開（力道調到負的）'], [(l) => l.radius >= 3, '影響的範圍再大一點']],
    answer: { push: -1, radius: 3.5 } },
];

export default {
  id: '10',
  html,

  setup(ctx) {
    const root = document.getElementById('ch10');
    bindChapter(root, local, ctx, { describe, tasks: TASKS });
    root.querySelector('#watch2').addEventListener('click', () => ctx.startFinale());
    this.hitName = root.querySelector('#hitName');
  },

  apply(step, P) {
    const v = step >= LAST ? FINAL : local;
    if (step === 0) return 'scene: 成品';
    const I = P.inter;
    I.parallax = v.parallax;
    if (step >= 2) { I.hover = v.hover; I.mark = step === 2 && local.mark; }
    if (step >= 3) { I.push = v.push; I.radius = v.radius; }
    return step === Infinity ? null : 'scene: 成品 + 游標';
  },

  frame(ctx) {
    const name = ctx.stage.hovering ? '主星' : '沒有東西';
    if (this.hitName.textContent !== name) this.hitName.textContent = name;
  },
};

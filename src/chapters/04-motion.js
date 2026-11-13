// 第四章：動畫與緩動
// 旋鈕：緩動曲線與時長、彈簧的剛性與阻尼、漂浮／呼吸／自轉
import html from './04-motion.html?raw';
import { bindChapter, pick } from '../ui.js';
import { EASE, stepSpring } from '../motion.js';

const LAST = 4;
const FINAL = { mode: 'spring', stiff: 180, dampS: 8, floatAmp: 0.06, period: 7, breath: 0.015, spin: 0.5, sync: false };
const local = { ease: 'out', dur: 0.9, mode: 'spring', stiff: 180, dampS: 8, floatAmp: 0.25, period: 7, breath: 0.015, spin: 0.5, sync: false };
const NAMES = { linear: 'linear', in: 'easeIn', out: 'easeOut', inOut: 'easeInOut' };
const WORDS = { linear: '等速', in: '緩入', out: '緩出', inOut: '緩入緩出' };
const zeta = (l) => l.dampS / (2 * Math.sqrt(l.stiff)); // 阻尼比：小於 1 才會過衝

function describe(l) {
  const ease = `出場 ${l.dur.toFixed(1)} 秒，${WORDS[l.ease]}`;
  const spring = l.mode === 'tween' ? '被戳的反應用緩動（照劇本播，連按會跳）'
    : `被戳的反應用彈簧：${pick(l.stiff, [80, '很軟'], [300, '軟硬適中'], '很硬')}，${pick(zeta(l), [0.25, '會來回晃好幾下'], [0.7, '有一點過衝'], [1, '幾乎不過衝'], '不過衝、緩緩回正')}`;
  const idle = l.floatAmp === 0 ? '不漂浮'
    : `每 ${l.period} 秒一個週期上下漂浮，幅度${pick(l.floatAmp, [0.04, '小到幾乎察覺不到'], [0.15, '輕微'], '很明顯')}，${l.sync ? '和呼吸同一個節拍' : '和呼吸錯開'}`;
  return { 1: ease + '。', 2: spring + '。', 3: idle + '。', all: `${ease}；${spring}；待機時${idle}。` };
}

const TASKS = [
  { text: '像果凍：戳下去軟軟的，來回晃很多下才停。',
    conds: [
      [(l) => l.mode === 'spring', '要用彈簧，不是緩動'],
      [(l) => l.stiff <= 120, '再軟一點（剛性調低）'],
      [(l) => zeta(l) <= 0.25, '晃得不夠久（阻尼調低）'],
    ],
    answer: { mode: 'spring', stiff: 80, dampS: 2 } },
  { text: '沉穩的待機：漂得很慢、幅度很小但不是完全不動，而且和呼吸的節拍錯開。',
    conds: [
      [(l) => l.period >= 8, '再慢一點（週期拉長）'],
      [(l) => l.floatAmp > 0 && l.floatAmp <= 0.08, '幅度要很小，但不能是 0'],
      [(l) => !l.sync, '節拍要錯開'],
    ],
    answer: { period: 10, floatAmp: 0.05, sync: false } },
];

// 在文字欄的小圖上畫一條曲線。fn(x) 回傳 0 到 1 左右的值；dot 是目前進度
function plot(canvas, fn, dot, lo = -0.15, hi = 1.2) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const X = (x) => 12 + x * (w - 24), Y = (y) => h - 10 - ((y - lo) / (hi - lo)) * (h - 20);
  g.strokeStyle = '#2c3048'; g.lineWidth = 1;
  [0, 1].forEach((y) => { g.beginPath(); g.moveTo(X(0), Y(y)); g.lineTo(X(1), Y(y)); g.stroke(); });
  g.strokeStyle = '#9fb8ad'; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i <= 80; i++) { const x = i / 80; i ? g.lineTo(X(x), Y(fn(x))) : g.moveTo(X(x), Y(fn(x))); }
  g.stroke();
  if (dot != null) { g.fillStyle = '#ecdcae'; g.beginPath(); g.arc(X(dot), Y(fn(dot)), 4, 0, 6.3); g.fill(); }
}

export default {
  id: '04',
  html,

  setup(ctx) {
    const root = document.getElementById('ch4');
    const { star } = ctx.stage;
    const name = () => { root.querySelector('[data-ease]').textContent = NAMES[local.ease]; };
    bindChapter(root, local, ctx, { describe, tasks: TASKS, after: name });

    root.querySelector('#replay').addEventListener('click', () => star.playEntrance({ ease: local.ease, dur: local.dur, over: 0 }));
    root.querySelector('#replayFinal').addEventListener('click', () => star.playEntrance({ ease: 'back', dur: 0.9, over: 0.08 }));
    root.querySelectorAll('#poke, #poke2').forEach((b) => b.addEventListener('click', () => star.poke(ctx.stage.S)));
    // 第 4 章起，直接點舞台上的星星也會彈一下
    document.getElementById('c').addEventListener('click', (e) => {
      if (ctx.state.chapter >= 3 && ctx.stage.hitsStar(e.clientX, e.clientY)) star.poke(ctx.stage.S);
    });
    this.curves = [root.querySelector('#easeCurve'), root.querySelector('#springCurve')];
  },

  apply(step, P) {
    const v = step >= LAST ? FINAL : local;
    if (step !== Infinity) P.cam.pos = [0, 0.5, 5.2];

    if (step >= 2) { P.poke = v.mode; P.stiff = v.stiff; P.dampS = v.dampS; }
    if (step >= 3) {
      P.floatAmp = v.floatAmp; P.floatPeriod = v.period; P.breath = v.breath; P.spin = v.spin; P.sync = v.sync;
    }
    if (step === Infinity) return null;
    return 'scene: star + 三盞燈' + (step >= 3 ? ' · 漂浮、呼吸、自轉' : step >= 2 ? ' · 戳它' : ' · 等速自轉');
  },

  // 每一幀重畫文字欄的兩張小圖
  frame(ctx) {
    const step = +ctx.state.section.dataset.step;
    if (step === 1) {
      const t = ctx.stage.star.entrance.t;
      plot(this.curves[0], EASE[local.ease], t < 1 ? t : null);
    } else if (step === 2) {
      // 模擬戳一下之後 1.5 秒內的位移
      const samples = [], s = { x: 0, v: 3.6 };
      for (let i = 0; i <= 80; i++) {
        samples.push(local.mode === 'spring' ? s.x : (i / 80 < 1 / 3 ? 0.25 * Math.sin(Math.PI * (i / 80) * 3) : 0));
        stepSpring(s, local.stiff, local.dampS, 1.5 / 80);
      }
      plot(this.curves[1], (x) => samples[Math.round(x * 80)], null, -0.3, 0.45);
    }
  },
};

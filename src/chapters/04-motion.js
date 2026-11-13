// 第四章：動畫與緩動
// 旋鈕：緩動曲線與時長、彈簧的剛性與阻尼、漂浮／呼吸／自轉
import html from './04-motion.html?raw';
import { wire } from '../ui.js';
import { EASE, stepSpring } from '../motion.js';

const LAST = 4;
const FINAL = { mode: 'spring', stiff: 180, dampS: 8, floatAmp: 0.06, period: 7, breath: 0.015, spin: 0.5, sync: false };
const local = { ease: 'out', dur: 0.9, mode: 'spring', stiff: 180, dampS: 8, floatAmp: 0.25, period: 7, breath: 0.015, spin: 0.5, sync: false };
const NAMES = { linear: 'linear', in: 'easeIn', out: 'easeOut', inOut: 'easeInOut' };

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
    wire(root, local, () => { name(); ctx.refresh(); });
    name();

    root.querySelector('#replay').addEventListener('click', () => star.playEntrance({ ease: local.ease, dur: local.dur, over: 0 }));
    root.querySelector('#replayFinal').addEventListener('click', () => star.playEntrance({ ease: 'back', dur: 0.9, over: 0.08 }));
    root.querySelector('#poke').addEventListener('click', () => star.poke(ctx.stage.S));
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
    return 'scene: star + 三盞燈' + (step >= 3 ? ' · 漂浮、呼吸、自轉' : step === 2 ? ' · 戳它' : ' · 等速自轉');
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

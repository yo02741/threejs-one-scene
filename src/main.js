// 進入點：建立場景、接上章節、跑渲染迴圈。
import './style.css';
import { createStage } from './scene.js';
import { watchSections } from './scroll.js';
import chapter01 from './chapters/01-camera.js';

// 依閱讀順序排列；新章節加在後面
const CHAPTERS = [chapter01];

const stageEl = document.getElementById('stage');
const canvas = document.getElementById('c');
const hud = document.getElementById('hud');
const insetEl = document.getElementById('inset');

let stage;
try {
  stage = createStage(canvas, stageEl, insetEl);
} catch (e) {
  hud.textContent = '這個瀏覽器無法啟用 WebGL。';
}

if (stage) start();

function start() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // 跨章節共用的狀態。各章自己的旋鈕數值放在各章檔案裡。
  const state = {
    paused: reduced, // 尊重減少動態：預設暫停
    fps: 60,
    frames: 0,
    starTarget: 0,   // 星星的目標大小（0 → 1 會緩緩長出來）
    inset: false,    // 右下角是否畫「從外面看相機」的小視窗
    dirty: true,     // 暫停時，有東西變了才重畫
    section: null,   // 目前作用中的 <section>
  };

  const ctx = { stage, state, refresh };

  // 依目前段落，讓每一章依序決定場景的樣子
  function refresh() {
    const sec = state.section;
    const activeIdx = CHAPTERS.findIndex((c) => c.id === sec.dataset.chapter);
    const activeStep = +sec.dataset.step;

    state.inset = false;
    let text = null;
    CHAPTERS.forEach((c, i) => {
      const step = i < activeIdx ? Infinity : i > activeIdx ? -1 : activeStep;
      const t = c.apply(step, ctx);
      if (i === activeIdx) text = t;
    });

    insetEl.classList.toggle('on', state.inset);
    hud.textContent = text ?? '';
    state.dirty = true;
  }

  CHAPTERS.forEach((c) => c.setup(ctx));

  const sections = Array.from(document.querySelectorAll('section[data-chapter]'));
  watchSections(sections, stageEl, (sec) => { state.section = sec; refresh(); });

  window.addEventListener('resize', () => { if (stage.resize()) state.dirty = true; });
  stage.resize();

  /* ---------- 渲染迴圈 ---------- */
  // 動畫以經過的時間推進；幀率節流只決定「畫幾張」，不影響轉速。
  const { star } = stage;
  const framesEl = document.getElementById('frames');
  let last = performance.now(), acc = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    const s = star.scale.x;
    const ns = reduced ? state.starTarget : s + (state.starTarget - s) * Math.min(1, dt * 6);
    if (Math.abs(ns - s) > 0.0005) {
      star.scale.setScalar(Math.max(ns, 0.0001));
      star.visible = ns > 0.002;
      state.dirty = true;
    }

    if (!state.paused) {
      acc += dt;
      if (acc >= 1 / state.fps - 0.002) {
        star.rotation.y += acc * 0.6;
        star.rotation.x += acc * 0.22;
        acc = 0;
        state.frames++;
        framesEl.textContent = state.frames;
        stage.render(state);
        state.dirty = false;
      }
    } else if (state.dirty) {
      stage.render(state);
      state.dirty = false;
    }
  }
  requestAnimationFrame(tick);
}

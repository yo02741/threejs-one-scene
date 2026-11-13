// 進入點：把各章的文字放進頁面、建立場景、跑渲染迴圈。
import './style.css';
import { createStage } from './scene.js';
import { watchSections } from './scroll.js';
import { defaults } from './params.js';
import { fillToc, buildNav, buildGlossary } from './ui.js';
import chapter01 from './chapters/01-camera.js';
import chapter02 from './chapters/02-material.js';
import chapter03 from './chapters/03-light.js';
import chapter04 from './chapters/04-motion.js';
import chapter05 from './chapters/05-scroll.js';
import chapter06 from './chapters/06-particles.js';
import chapter07 from './chapters/07-shader.js';
import chapter08 from './chapters/08-post.js';
import chapter09 from './chapters/09-restraint.js';
import chapter10 from './chapters/10-interaction.js';
import { EASE, clamp, lerp } from './motion.js';

// 依閱讀順序排列；新章節加在後面
const CHAPTERS = [chapter01, chapter02, chapter03, chapter04, chapter05, chapter06, chapter07, chapter08, chapter09, chapter10];

const $ = (id) => document.getElementById(id);
const stageEl = $('stage'), hud = $('hud'), hud2 = $('hud2'), insetEl = $('inset');
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

$('book').innerHTML = CHAPTERS.map((c) => c.html).join('');
fillToc();
buildGlossary($('book'));
const markNav = buildNav($('nav'), CHAPTERS.length);

let stage;
try {
  stage = createStage($('c'), stageEl, insetEl, reduced);
} catch (e) {
  console.error(e);
  $('fallback').classList.add('on'); // 沒有 WebGL：顯示靜態的備援畫面
  hud.textContent = '這個瀏覽器無法啟用 WebGL。';
}

if (stage) start();

function start() {
  // 跨章節共用的狀態。各章自己的旋鈕數值放在各章檔案裡。
  const state = {
    paused: reduced,  // 尊重減少動態：預設暫停
    fps: 60,
    frames: 0,
    dirty: true,      // 暫停時，有東西變了才重畫
    section: null,    // 目前作用中的 <section>
    chapter: 0,       // 目前作用中的章（CHAPTERS 的索引）
    progress: 0,      // 在目前段落裡捲了多少（0 到 1）
    split: 0.5,       // 後製前後對比的分割線位置
    finale: null,     // 「看成品」播放中
  };

  const ctx = { stage, state, refresh, setPaused, startFinale };
  const INSET_LABEL = { frustum: '從外面看這台相機', path: '從上面看相機走的路' };

  function setPaused(v) {
    state.paused = v;
    $('resume').hidden = !v || state.chapter === 0 || !!state.finale;
    document.dispatchEvent(new Event('loop:paused'));
  }
  $('resume').addEventListener('click', () => setPaused(false));

  // 從預設值開始，讓讀到的每一章依序修改參數，再交給場景
  function refresh() {
    const sec = state.section;
    if (!sec) return;
    const idx = CHAPTERS.findIndex((c) => c.id === sec.dataset.chapter);
    const activeStep = +sec.dataset.step;
    state.chapter = idx;

    const P = defaults();
    let text = null;
    for (let i = 0; i <= idx; i++) {
      const t = CHAPTERS[i].apply(i < idx ? Infinity : activeStep, P, ctx);
      if (i === idx) text = t;
    }
    if (state.finale) state.finale.shape(P);
    stage.setTarget(P);

    insetEl.classList.toggle('on', !!P.inset);
    insetEl.firstElementChild.textContent = INSET_LABEL[P.inset] || '';
    $('title').classList.toggle('on', P.title);
    $('fallback').classList.toggle('on', P.fallback);
    $('graph').classList.toggle('on', P.graph);
    hud2.classList.toggle('on', P.stats);
    const split = $('split');
    split.classList.toggle('on', P.post.on && P.post.split >= 0);
    split.style.left = P.post.split * 100 + '%';
    hud.textContent = state.finale ? '' : text ?? '';
    markNav(idx);
    $('resume').hidden = !state.paused || idx === 0 || !!state.finale;
    state.dirty = true;
  }

  /* ---------- 看成品：收起文字欄，從頭播一次完整的開場 ---------- */
  function startFinale() {
    let t = reduced ? 99 : 0, entered = reduced;
    const from = { pos: [-3.6, 1.9, 11.5], target: [0, 0, 0] };
    state.finale = {
      tick(dt) { t += dt; refresh(); },
      // 在成品的參數上，依時間改寫：星星出場 → 相機推近並滑到定位 → 標題浮現
      shape(P) {
        if (t < 0.6) P.starScale = 0;
        else if (!entered) { entered = true; stage.star.playEntrance({ ease: 'back', dur: 0.9, over: 0.08 }); }
        const k = EASE.inOut(clamp((t - 0.4) / 7));
        P.cam.pos = P.cam.pos.map((v, i) => lerp(from.pos[i], v, k));
        P.cam.target = P.cam.target.map((v, i) => lerp(from.target[i], v, k));
        P.cam.damp = t < 0.1 ? 1 : 0.1;
        P.title = t > 5.6;
      },
    };
    document.body.classList.add('finale');
    $('exitFinale').hidden = false;
    if (!reduced) setPaused(false);
    stage.resize();
    refresh();
  }
  function endFinale() {
    if (!state.finale) return;
    state.finale = null;
    document.body.classList.remove('finale');
    $('exitFinale').hidden = true;
    stage.resize();
    refresh();
  }
  $('exitFinale').addEventListener('click', endFinale);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') endFinale(); });

  CHAPTERS.forEach((c) => c.setup(ctx));

  const sections = Array.from(document.querySelectorAll('section[data-chapter]'));
  watchSections(sections, stageEl, (sec, progress, switched) => {
    state.section = sec;
    state.progress = progress;
    if (switched || sec.hasAttribute('data-runway')) refresh();
  });
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

  window.addEventListener('resize', () => { if (stage.resize()) state.dirty = true; });
  stage.resize();

  /* ---------- 游標位置（第 10 章起使用） ---------- */
  const track = (e) => {
    const r = stageEl.getBoundingClientRect();
    stage.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, true);
  };
  stageEl.addEventListener('pointermove', track);
  stageEl.addEventListener('pointerdown', track);
  stageEl.addEventListener('pointerleave', () => stage.setPointer(0, 0, false));

  /* ---------- 後製前後對比的分割線 ---------- */
  const split = $('split');
  const dragSplit = (e) => {
    const r = stageEl.getBoundingClientRect();
    state.split = Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width));
    refresh();
  };
  split.addEventListener('pointerdown', (e) => { split.setPointerCapture(e.pointerId); split.onpointermove = dragSplit; });
  split.addEventListener('pointerup', () => { split.onpointermove = null; });
  split.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    state.split = Math.min(0.98, Math.max(0.02, state.split + (e.key === 'ArrowLeft' ? -0.03 : 0.03)));
    refresh();
  });

  /* ---------- 渲染迴圈 ---------- */
  // 動畫以經過的時間推進；幀率節流只決定「畫幾張」，不影響速度。
  const framesEl = $('frames'), graph = $('graph').getContext('2d');
  const history = new Array(120).fill(0);
  let last = performance.now(), acc = 0, ms = 16.7, statClock = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    const raw = now - last;
    const dt = Math.min(raw / 1000, 0.1);
    last = now;
    ms += (raw - ms) * 0.1;

    if (state.finale) state.finale.tick(dt);
    CHAPTERS[state.chapter].frame?.(ctx);
    if (stage.settle(dt)) state.dirty = true;

    const S = stage.S;
    let drew = false;
    if (!state.paused && !S.freeze) {
      acc += dt;
      if (acc >= 1 / state.fps - 0.002) {
        stage.animate(acc);
        acc = 0;
        state.frames++;
        if (framesEl) framesEl.textContent = state.frames;
        drew = true;
      }
    } else if (state.dirty) drew = true;
    if (drew) { stage.render(); state.dirty = false; }

    // 鷹架：draw call 數、幀率、幀時間圖
    if (S.stats && (statClock += dt) > 0.3) {
      statClock = 0;
      const info = stage.renderer.info.render;
      hud2.textContent = `draw calls ${info.calls} · 三角形 ${info.triangles.toLocaleString()} · ${ms.toFixed(1)} ms（${Math.round(1000 / ms)} fps）`;
    }
    if (S.graph) {
      history.push(raw); history.shift();
      graph.clearRect(0, 0, 240, 56);
      graph.fillStyle = '#2c3048';
      graph.fillRect(0, 56 - 16.7 * 1.4, 240, 1); // 16.7 毫秒的預算線
      history.forEach((v, i) => {
        graph.fillStyle = v > 20 ? '#d8a48f' : '#9fb8ad';
        graph.fillRect(i * 2, 56 - Math.min(56, v * 1.4), 1, Math.min(56, v * 1.4));
      });
    }
  }
  requestAnimationFrame(tick);
}

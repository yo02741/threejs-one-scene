// 文字欄的共用零件：旋鈕綁定、章節目錄、章節導覽。

const TITLES = [
  '場景、相機、渲染迴圈',
  '幾何與材質：讓它有質感',
  '光與陰影',
  '動畫與緩動',
  '捲動驅動的相機',
  '粒子：從一顆星到一片星空',
  'Shader 入門',
  '後製',
  '克制與效能',
];
const pad = (n) => String(n).padStart(2, '0');

// <ol class="next" data-toc="3"> → 九章目錄，前三章標成完成
export function fillToc() {
  document.querySelectorAll('ol[data-toc]').forEach((ol) => {
    const done = +ol.dataset.toc;
    ol.innerHTML = TITLES.map((t, i) =>
      `<li${i < done ? ' class="done"' : ''}><span>${pad(i + 1)}</span>${t}</li>`).join('');
  });
}

export function buildNav(nav, count) {
  nav.innerHTML = TITLES.slice(0, count).map((t, i) =>
    `<a href="#ch${i + 1}" title="${t}">${pad(i + 1)}</a>`).join('');
  return (idx) => {
    nav.querySelectorAll('a').forEach((a, i) => a.classList.toggle('on', i === idx));
  };
}

const parse = (v) => (v === 'true' ? true : v === 'false' ? false : v !== '' && !isNaN(v) ? +v : v);

// 把一章裡所有帶 data-k 的控制項接到 local 物件上。
//   <input type="range" data-k="rough">      滑桿
//   <input type="checkbox" data-k="wire">    開關
//   <input type="color" data-k="a">          顏色
//   <button data-k="mat" data-v="basic">     多選一
//   <button data-set='{"rough":0.9}'>        預設組合
//   <output data-o="rough">、<b data-c="rough">   顯示數值（data-f 小數位、data-u 單位）
// 回傳 sync()：把 local 的值寫回畫面。
let uid = 0;
export function wire(root, local, onChange) {
  const q = (s) => Array.from(root.querySelectorAll(s));
  const inputs = q('input[data-k]');
  const options = q('button[data-k][data-v]');
  const shows = q('[data-o], [data-c]');

  inputs.forEach((el) => {
    if (!el.id) el.id = 'k' + (++uid);
    const label = el.closest('.row')?.querySelector('label');
    if (label && !label.htmlFor) label.htmlFor = el.id;
  });

  const text = (el) => {
    const k = el.dataset.o ?? el.dataset.c;
    const v = local[k];
    if (typeof v !== 'number') return String(v);
    let d = el.dataset.f;
    if (d == null) {
      const step = root.querySelector(`input[type=range][data-k="${k}"]`)?.step || '1';
      d = step.includes('.') ? step.split('.')[1].length : 0;
    }
    return v.toFixed(+d) + (el.dataset.u || '');
  };

  function sync() {
    inputs.forEach((el) => {
      if (el.type === 'checkbox') el.checked = !!local[el.dataset.k];
      else el.value = local[el.dataset.k];
    });
    options.forEach((b) => b.setAttribute('aria-pressed', String(local[b.dataset.k]) === b.dataset.v));
    shows.forEach((el) => { el.textContent = text(el); });
  }
  const changed = () => { sync(); onChange(); };

  inputs.forEach((el) => {
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      local[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      changed();
    });
  });
  options.forEach((b) => b.addEventListener('click', () => { local[b.dataset.k] = parse(b.dataset.v); changed(); }));
  q('button[data-set]').forEach((b) => b.addEventListener('click', () => {
    Object.assign(local, JSON.parse(b.dataset.set)); changed();
  }));

  sync();
  return sync;
}

// 反向練習：給一段描述，請讀者用旋鈕調出來。
//   tasks = [{ text, conds: [[(local) => 是否達成, '還差什麼的提示'], ...], answer: { 旋鈕: 值 } }]
// 回傳 check()：重新判定每一題。
export function practice(box, tasks, local, onAnswer) {
  box.innerHTML = tasks.map((t, i) => `
    <div class="task">
      <p class="q"><span>${i + 1}</span>${t.text}</p>
      <p class="st"><em></em><button type="button">看答案</button></p>
    </div>`).join('');
  const els = Array.from(box.querySelectorAll('.task'));
  els.forEach((el, i) => el.querySelector('button').addEventListener('click', () => {
    Object.assign(local, tasks[i].answer);
    onAnswer();
  }));
  return () => els.forEach((el, i) => {
    const miss = tasks[i].conds.find(([test]) => !test(local));
    el.classList.toggle('ok', !miss);
    el.querySelector('em').textContent = miss ? '還差：' + miss[1] : '✓ 就是這樣';
  });
}

// 一章的標準接線：旋鈕、即時描述（data-say）、反向練習（data-practice）、複製鈕（data-copy）。
//   opts.describe(local) → { 段號: '一句話', all: '整章的描述' }
//   opts.tasks           → 練習題
//   opts.after()         → 旋鈕變動後要另外更新的畫面
export function bindChapter(root, local, ctx, opts = {}) {
  const says = Array.from(root.querySelectorAll('[data-say]'));
  let check = null;
  const update = () => {
    opts.after?.();
    if (opts.describe) {
      const d = opts.describe(local);
      says.forEach((el) => { el.textContent = d[el.dataset.say] ?? ''; });
    }
    check?.();
  };
  const sync = wire(root, local, () => { update(); ctx.refresh(); });
  const box = root.querySelector('[data-practice]');
  if (box && opts.tasks) check = practice(box, opts.tasks, local, () => { sync(); update(); ctx.refresh(); });

  root.querySelectorAll('button[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const text = root.querySelector('[data-say="all"]').textContent;
    navigator.clipboard?.writeText(text).then(() => {
      b.textContent = '已複製';
      setTimeout(() => { b.textContent = '複製這段描述'; }, 1500);
    });
  }));

  update();
  return { sync, update };
}

// 把數值換成詞：pick(0.3, [0.25, '光滑'], [0.6, '半霧面'], '霧面') → '半霧面'
export function pick(v, ...steps) {
  for (const s of steps) {
    if (!Array.isArray(s)) return s;
    if (v < s[0]) return s[1];
  }
  return '';
}

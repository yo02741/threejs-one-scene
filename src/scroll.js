// 捲動位置 → 目前作用中的段落，以及在這個段落裡捲了多少（0 到 1）。
// 只負責回報；段落代表什麼由 main.js 和各章決定。

export function watchSections(sections, stageEl, onChange) {
  let current = null;

  function pick() {
    const wide = window.innerWidth >= 900;
    // 手機上舞台蓋住上方，所以探針放在舞台下緣以下的可見區
    const top = wide ? 0 : stageEl.getBoundingClientRect().bottom;
    const probe = top + (window.innerHeight - top) * (wide ? 0.5 : 0.45);

    let found = 0, rect = null;
    for (let i = 0; i < sections.length; i++) {
      const r = sections[i].getBoundingClientRect();
      if (r.top <= probe) { found = i; rect = r; }
    }
    rect = rect || sections[0].getBoundingClientRect();
    sections.forEach((s, i) => s.classList.toggle('active', i === found));

    const progress = Math.min(1, Math.max(0, (probe - rect.top) / rect.height));
    const sec = sections[found];
    const switched = sec !== current;
    current = sec;
    onChange(sec, progress, switched);
  }

  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', pick);
  pick();
  return pick;
}

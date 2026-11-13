// 捲動位置 → 目前作用中的段落。
// 只負責「哪一段是作用中」並標上 .active；段落代表什麼由 main.js 決定。

export function watchSections(sections, stageEl, onChange) {
  let current = null;

  function pick() {
    const wide = window.innerWidth >= 900;
    // 手機上舞台蓋住上方，所以探針放在舞台下緣以下的可見區
    const top = wide ? 0 : stageEl.getBoundingClientRect().bottom;
    const probe = top + (window.innerHeight - top) * (wide ? 0.5 : 0.45);

    let found = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= probe) found = i;
    }
    sections.forEach((s, i) => s.classList.toggle('active', i === found));

    if (sections[found] !== current) {
      current = sections[found];
      onChange(current);
    }
  }

  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', pick);
  pick();
  return pick;
}

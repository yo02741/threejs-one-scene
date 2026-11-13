// 後記：用 TresJS 重寫一次。這一篇只有文字，場景維持成品；重寫的版本在 /tres/。
import html from './12-tres.html?raw';

export default {
  id: 'PS',
  html,
  setup() {},
  apply(step) { return step === Infinity ? null : 'scene: 成品（原生 three.js 版）'; },
};

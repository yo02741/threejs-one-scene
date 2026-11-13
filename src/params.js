// 整個場景的樣子，用一份參數描述。
// 每次段落切換，main.js 從這份預設值開始，讓每一章依序修改它，
// 再交給 scene.js 照著長。預設值就是「什麼都還沒加」的全黑。

export const defaults = () => ({
  /* ---- 第 1 章 ---- */
  scaffold: false,          // 格線與座標軸
  inset: null,              // 小視窗：null | 'frustum' | 'path'
  starScale: 0,             // 星星的大小（0 → 1 會緩緩長出來）
  cam: { pos: [0, 0.4, 6], target: [0, 0, 0], fov: 50, far: 14, damp: 0.12 },

  /* ---- 第 2 章 ---- */
  detail: 1,                // 多面體細分程度
  wire: true,               // 線框疊圖
  normals: false,           // 法線小箭頭
  mat: 'basic',             // 'basic' | 'standard'
  rough: 1, metal: 0, flat: false, emissive: 0,
  work: 0,                  // 借來的工作燈
  env: 0,                   // 攝影棚環境（給金屬反射用）

  /* ---- 第 3 章 ---- */
  key: { on: false, az: -40, el: 40, int: 2.6, temp: 0 },
  fill: { on: false, int: 0.65, temp: 0 },
  rim: { on: false, int: 3 },
  hemi: 0,
  lightMarks: false,
  shadow: false, shadowSoft: 2, shadowRes: 1024, ground: false,

  /* ---- 第 4 章 ---- */
  spin: 1, floatAmp: 0, floatPeriod: 7, breath: 0, sync: false,
  poke: 'spring', stiff: 180, dampS: 8,

  /* ---- 第 5 章 ---- */
  path: null,               // 相機路徑線（只畫在小視窗裡）

  /* ---- 第 6 章 ---- */
  pts: {
    on: false, count: 3000, size: 0.5, atten: true, shape: 'band',
    cluster: 0.3, bright: 0.6, seed: 1, additive: true, depthWrite: false,
    shader: false, twinkle: 0, drift: 1,
  },
  minis: { on: false, count: 40, instanced: true, float: 1 },
  stats: false,             // HUD 顯示 draw call 與幀率

  /* ---- 第 7 章 ---- */
  glow: {
    on: false, a: '#ffe9b8', b: '#9fb8ad', dir: 0, debug: false,
    fres: 0, pow: 2.5, int: 0.6, nScale: 1.5, nSpeed: 0.3, nAmt: 0,
    freeze: false, disp: 0, dispFreq: 2,
  },

  /* ---- 第 8 章 ---- */
  post: {
    on: false, split: -1,   // split < 0 表示不畫分割線
    bloom: false, thr: 0.9, str: 0.8, rad: 0.6, tone: false,
    dof: false, focus: 5, aperture: 2,
    grain: 0, vig: 0, vigSize: 0.75,
    exposure: 1, contrast: 1, sat: 1, cool: 0, warm: 0,
  },

  /* ---- 第 10 章 ---- */
  inter: {
    parallax: 0,            // 游標視差的強度
    hover: 0,               // 游標指到主星時放大多少
    mark: false,            // 鷹架：標出射線碰到的位置
    push: 0,                // 游標推開（正）或吸引（負）附近小星的力道
    radius: 1.6,            // 影響的半徑
  },

  /* ---- 第 9 章 ---- */
  pr: 2,                    // 像素比上限
  mul: 1,                   // 粒子數倍率
  heroX: 0,                 // 主星在畫面上的水平位置（0 置中，1 靠左三分之一）
  title: false,             // 標題字
  graph: false,             // 幀時間圖
  freeze: false,            // 模擬「減少動態」：停在一張靜態畫面
  fallback: false,          // 模擬「沒有 WebGL」
});

// 這些數值不做平滑，直接跳到目標
export const SNAP = new Set([
  'detail', 'shadowRes', 'pts.count', 'pts.seed', 'minis.count', 'pr', 'post.split',
]);

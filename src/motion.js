// 緩動函式、彈簧，以及讓數值「追上目標」的平滑。
import { SNAP } from './params.js';

export const EASE = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // 緩出，尾巴衝過頭一點再回來。over 約等於衝過頭的比例
  back: (t, over = 0.08) => {
    const c = over * 21.5; // 換算成曲線係數
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// 彈簧：不規定幾秒到，只規定多硬（stiff）、多黏（damp）
export function stepSpring(s, stiff, damp, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += (-stiff * s.x - damp * s.v) * h;
    s.x += s.v * h;
  }
}

// 讓 S 裡的每個數值往 T 靠近一步；不是數值的直接照抄。回傳有沒有東西變了。
export function smooth(S, T, k, path = '') {
  let changed = false;
  for (const key in T) {
    if (path === '' && key === 'cam') continue; // 相機另外處理
    const tv = T[key], sv = S[key];
    if (typeof tv === 'number') {
      if (sv === tv) continue;
      const d = tv - sv;
      const kk = key === 'starScale' ? k.slow : k.fast;
      if (typeof sv !== 'number' || SNAP.has(path + key) || Math.abs(d) < 1e-4) S[key] = tv;
      else S[key] = sv + d * kk;
      changed = true;
    } else if (tv && typeof tv === 'object') {
      if (!sv || typeof sv !== 'object') { S[key] = structuredClone(tv); changed = true; }
      else if (smooth(sv, tv, k, path + key + '.')) changed = true;
    } else if (sv !== tv) { S[key] = tv; changed = true; }
  }
  return changed;
}

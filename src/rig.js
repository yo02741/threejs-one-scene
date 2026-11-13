// 相機路徑：繞著星星走的一段弧線。
// path = { a0, a1, r0, r1, h0, h1 }：起訖的角度（度）、距離、高度。p 是 0 到 1 的進度。
import { lerp } from './motion.js';

export function orbitPoint(path, p) {
  const a = lerp(path.a0, path.a1, p) * Math.PI / 180;
  const r = lerp(path.r0, path.r1, p);
  return [Math.sin(a) * r, lerp(path.h0, path.h1, p), Math.cos(a) * r];
}

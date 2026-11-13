// 第二章：幾何與材質
// 旋鈕：細分、線框、材質種類、工作燈、粗糙度、金屬感、平面著色、法線
import html from './02-material.html?raw';
import { wire } from '../ui.js';

const LAST = 5;
const FINAL = { detail: 2, rough: 0.45, metal: 0, flat: true };
const local = { detail: 1, wire: true, mat: 'basic', work: false, rough: 0.6, metal: 0, flat: false, normals: true };
const triangles = (detail) => 20 * (detail + 1) ** 2;

export default {
  id: '02',
  html,

  setup(ctx) {
    const root = document.getElementById('ch2');
    const showTri = () => root.querySelectorAll('[data-tri]').forEach((el) => { el.textContent = triangles(local.detail); });
    wire(root, local, () => { showTri(); ctx.refresh(); });
    showTri();
  },

  apply(step, P) {
    const done = step >= LAST;
    const v = done ? FINAL : local;
    if (step !== Infinity) P.cam.pos = [0, 0.3, 4.2];

    P.detail = step >= 1 ? v.detail : 1;
    P.wire = done ? false : step >= 1 ? local.wire : true;

    // 第 02 段由讀者自己換材質、開燈；第 03 段起直接幫他換好
    P.mat = step >= 3 ? 'standard' : step === 2 ? local.mat : 'basic';
    const lit = step >= 3 || (step === 2 && local.work);
    P.work = lit ? 1 : 0;
    P.env = lit ? 0.35 : 0;

    if (step >= 3) { P.rough = v.rough; P.metal = v.metal; } else { P.rough = 0.6; P.metal = 0; }
    P.flat = step >= 4 ? v.flat : false;
    P.normals = step === 4 && local.normals;
    P.emissive = done ? 0.12 : 0;

    if (step === 0) return 'scene: star';
    if (step === 1) return `scene: star（${triangles(local.detail)} 個三角形）`;
    if (step === 2) return P.mat === 'basic' ? 'scene: star（Basic：不需要光）' : lit ? 'scene: star + 工作燈' : 'scene: star（Standard，但沒有光）';
    return 'scene: star + 工作燈（借來的）';
  },
};

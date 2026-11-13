// 第 6 章：背景的點狀星（Points），與中景的小多面體（InstancedMesh）。
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group,
  IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial, NormalBlending, Object3D,
  Points, PointsMaterial, ShaderMaterial,
} from 'three';
import vert from '../shaders/stars.vert.glsl?raw';
import frag from '../shaders/stars.frag.glsl?raw';
import { STAR } from './star.js';

const MAX_POINTS = 50000, MAX_MINIS = 2000;

// 可以指定種子的亂數：同一個種子永遠得到同一片星空
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export function createParticles(scene, renderer) {
  /* ---------- 點 ---------- */
  const geo = new BufferGeometry();
  const pos = new Float32Array(MAX_POINTS * 3), col = new Float32Array(MAX_POINTS * 3);
  const size = new Float32Array(MAX_POINTS), bright = new Float32Array(MAX_POINTS), phase = new Float32Array(MAX_POINTS);
  // 用 BufferAttribute（不複製）：之後直接改這幾個陣列，再標記 needsUpdate
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  geo.setAttribute('aBright', new BufferAttribute(bright, 1));
  geo.setAttribute('aPhase', new BufferAttribute(phase, 1));

  const simple = new PointsMaterial({ map: spotTexture(), vertexColors: true, transparent: true });
  const shader = new ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { uSize: { value: 1 }, uScale: { value: 400 }, uTime: { value: 0 }, uTwinkle: { value: 0 }, uColor: { value: new Color(0xfff3d6) } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const points = new Points(geo, simple);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  const base = new Color(0xfff3d6);
  let builtKey = '';

  function generate(P) {
    const r = rng(P.seed * 7919 + 13);
    const gauss = () => (r() + r() + r() + r() - 2) * 0.9;
    const tiltZ = 0.45, tiltX = 0.28;
    const place = (out) => {
      if (P.shape === 'box') {
        do { out[0] = (r() - 0.5) * 90; out[1] = (r() - 0.5) * 90; out[2] = (r() - 0.5) * 90; }
        while (out[0] * out[0] + out[1] * out[1] + out[2] * out[2] < 64);
        return;
      }
      const th = r() * Math.PI * 2;
      const lat = P.shape === 'band' ? gauss() * 0.3 : Math.asin(r() * 2 - 1);
      const rad = P.shape === 'band' ? 28 + r() * 24 : 38 + r() * 8;
      let x = Math.cos(lat) * Math.cos(th) * rad, y = Math.sin(lat) * rad, z = Math.cos(lat) * Math.sin(th) * rad;
      if (P.shape === 'band') { // 讓這條帶子斜斜地橫過畫面
        const x1 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ), y1 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
        const y2 = y1 * Math.cos(tiltX) - z * Math.sin(tiltX), z2 = y1 * Math.sin(tiltX) + z * Math.cos(tiltX);
        x = x1; y = y2; z = z2;
      }
      out[0] = x; out[1] = y; out[2] = z;
    };

    // 聚集：先選一些中心，再讓一部分的星星靠到中心附近
    const centers = [], p = [0, 0, 0];
    for (let i = 0; i < 16; i++) { place(p); centers.push(p.slice()); }

    for (let i = 0; i < MAX_POINTS; i++) {
      if (r() < P.cluster) {
        const c = centers[(r() * centers.length) | 0];
        p[0] = c[0] + gauss() * 4; p[1] = c[1] + gauss() * 4; p[2] = c[2] + gauss() * 4;
      } else place(p);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      // 亮度分佈：bright 越大，越是「多數很暗、少數很亮」
      const b = 0.7 + (0.12 + 0.88 * Math.pow(r(), 7) - 0.7) * P.bright;
      bright[i] = b; size[i] = 0.55 + b * 1.3; phase[i] = r();
      col[i * 3] = base.r * b; col[i * 3 + 1] = base.g * b; col[i * 3 + 2] = base.b * b;
    }
    for (const k of ['position', 'color', 'aSize', 'aBright', 'aPhase']) geo.getAttribute(k).needsUpdate = true;
  }

  /* ---------- 中景的小星 ---------- */
  const miniGeo = new IcosahedronGeometry(1, 0);
  const miniMat = new MeshStandardMaterial({ color: STAR, roughness: 0.5, flatShading: true, emissive: new Color(STAR), emissiveIntensity: 0.12 });
  const inst = new InstancedMesh(miniGeo, miniMat, MAX_MINIS);
  inst.frustumCulled = false;
  inst.visible = false;
  const loose = new Group(); // 對照組：每顆一個獨立物件
  loose.visible = false;
  scene.add(inst, loose);

  const data = [];
  {
    const r = rng(4242);
    for (let i = 0; i < MAX_MINIS; i++) {
      const th = r() * Math.PI * 2, y = r() * 2 - 1, s = Math.sqrt(1 - y * y), rad = 3.2 + Math.pow(r(), 0.7) * 11;
      data.push({
        x: Math.cos(th) * s * rad, y: y * rad * 0.7, z: Math.sin(th) * s * rad,
        s: 0.03 + r() * 0.1, rx: (r() - 0.5) * 1.2, ry: (r() - 0.5) * 1.2, ph: r() * 6.28, sp: 0.3 + r() * 0.5,
      });
    }
  }
  const dummy = new Object3D();
  let time = 0, shownMinis = -1;

  function placeMinis(S) {
    const n = S.minis.count;
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const o = S.minis.instanced ? dummy : (loose.children[i] || loose.add(new Mesh(miniGeo, miniMat)).children[i]);
      o.position.set(d.x, d.y + Math.sin(time * d.sp + d.ph) * 0.18 * S.minis.float, d.z);
      o.rotation.set(time * d.rx, time * d.ry, 0);
      o.scale.setScalar(d.s);
      if (S.minis.instanced) { o.updateMatrix(); inst.setMatrixAt(i, o.matrix); }
    }
    if (S.minis.instanced) { inst.count = n; inst.instanceMatrix.needsUpdate = true; }
    else loose.children.forEach((m, i) => { m.visible = i < n; });
    shownMinis = n;
  }

  return {
    apply(S) {
      const P = S.pts;
      points.visible = P.on;
      if (P.on) {
        const key = [P.shape, P.cluster.toFixed(3), P.bright.toFixed(3), P.seed].join('|');
        if (key !== builtKey) { generate(P); builtKey = key; }
        geo.setDrawRange(0, Math.min(MAX_POINTS, Math.round(P.count * S.mul)));

        points.material = P.shader ? shader : simple;
        if (P.shader) {
          shader.uniforms.uSize.value = P.size;
          shader.uniforms.uTwinkle.value = P.twinkle;
          shader.uniforms.uScale.value = renderer.domElement.height * 0.5;
        } else {
          simple.size = P.atten ? P.size : P.size * 6;
          const blend = P.additive ? AdditiveBlending : NormalBlending;
          if (simple.sizeAttenuation !== P.atten || simple.blending !== blend || simple.depthWrite !== P.depthWrite) {
            simple.sizeAttenuation = P.atten; simple.blending = blend; simple.depthWrite = P.depthWrite;
            simple.needsUpdate = true;
          }
        }
      }
      const M = S.minis;
      inst.visible = M.on && M.instanced;
      loose.visible = M.on && !M.instanced;
      if (M.on) placeMinis(S);
    },

    animate(dt, S) {
      time += dt;
      shader.uniforms.uTime.value = time;
      if (S.pts.on) points.rotation.y += dt * 0.006 * S.pts.drift;
      if (S.minis.on) placeMinis(S);
    },
  };
}

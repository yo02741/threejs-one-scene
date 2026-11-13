// 主角：一顆星。形狀、材質、線框、法線箭頭，以及它自己的動作。
import {
  BufferGeometry, Color, Float32BufferAttribute, Group, IcosahedronGeometry,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Vector3, WireframeGeometry,
} from 'three';
import { EASE, stepSpring } from '../motion.js';

export const STAR = 0xecdcae;

export function createStar(scene) {
  const group = new Group();
  const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const basic = new MeshBasicMaterial({ color: STAR, ...offset });
  const standard = new MeshStandardMaterial({ color: STAR, emissive: new Color(STAR), emissiveIntensity: 0, ...offset });

  const mesh = new Mesh(new BufferGeometry(), basic);
  mesh.castShadow = true;
  const wire = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: 0x8a7a4e }));
  const normals = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: 0x9fb8ad }));
  group.add(mesh, wire, normals);
  group.scale.setScalar(0.0001);
  group.visible = false;
  scene.add(group);

  let builtDetail = -1, builtNormals = '';

  function build(detail) {
    mesh.geometry.dispose(); wire.geometry.dispose();
    const geo = new IcosahedronGeometry(1, detail);
    // 頂點法線一律指向球心的反方向，這樣「平滑著色」在任何細分程度下都成立
    const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), v = new Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
    mesh.geometry = geo;
    wire.geometry = new WireframeGeometry(geo);
    builtDetail = detail;
    builtNormals = '';
  }

  // 平面著色：每個面一支箭頭（面的方向）。平滑著色：每個頂點一支（頂點的方向）。
  function buildNormals(flat) {
    const pos = mesh.geometry.getAttribute('position');
    const pts = [], a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), o = new Vector3();
    const L = 0.2;
    if (flat) {
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
        o.copy(a).add(b).add(c).divideScalar(3);
        n.copy(b).sub(a).cross(c.sub(a)).normalize();
        pts.push(o.x, o.y, o.z, o.x + n.x * L, o.y + n.y * L, o.z + n.z * L);
      }
    } else {
      const seen = new Set();
      for (let i = 0; i < pos.count; i++) {
        a.fromBufferAttribute(pos, i);
        const key = a.x.toFixed(3) + a.y.toFixed(3) + a.z.toFixed(3);
        if (seen.has(key)) continue;
        seen.add(key);
        n.copy(a).normalize();
        pts.push(a.x, a.y, a.z, a.x + n.x * L, a.y + n.y * L, a.z + n.z * L);
      }
    }
    normals.geometry.dispose();
    normals.geometry = new BufferGeometry();
    normals.geometry.setAttribute('position', new Float32BufferAttribute(pts, 3));
  }

  /* ---------- 動作 ---------- */
  const entrance = { t: 1, dur: 0.9, ease: 'back', over: 0.08 };
  const poke = { x: 0, v: 0, t: 1 };
  let ph1 = 0, ph2 = 0, hover = 0, hovered = false;

  function layout(S) {
    const e = entrance.t >= 1 ? 1 : EASE[entrance.ease](entrance.t, entrance.over);
    const base = S.starScale * e;
    const s = base * (1 + S.breath * Math.sin(ph2)) * (1 + poke.x) * (1 + hover);
    group.scale.setScalar(Math.max(s, 0.0001));
    group.visible = base > 0.002;
    group.position.y = S.floatAmp * Math.sin(ph1);
  }

  return {
    group, mesh, standard, entrance,
    triangles: () => mesh.geometry.getAttribute('position').count / 3,

    apply(S) {
      if (S.detail !== builtDetail) build(S.detail);
      mesh.material = S.mat === 'basic' ? basic : standard;
      standard.roughness = S.rough;
      standard.metalness = S.metal;
      standard.emissiveIntensity = S.emissive;
      if (standard.flatShading !== S.flat) { standard.flatShading = S.flat; standard.needsUpdate = true; }
      wire.visible = S.wire;
      normals.visible = S.normals;
      const nk = S.normals ? S.detail + ':' + S.flat : builtNormals;
      if (nk !== builtNormals) { buildNormals(S.flat); builtNormals = nk; }
      layout(S);
    },

    animate(dt, S) {
      group.rotation.y += dt * 0.6 * S.spin;
      group.rotation.x += dt * 0.22 * S.spin;
      const w = (Math.PI * 2) / S.floatPeriod;
      ph1 += dt * w;
      // 錯開時，呼吸用另一個互質的週期
      ph2 = S.sync ? ph1 : ph2 + dt * w * 1.618;
      hover += ((hovered ? S.inter.hover : 0) - hover) * Math.min(1, dt * 10);
      if (entrance.t < 1) entrance.t = Math.min(1, entrance.t + dt / entrance.dur);
      if (S.poke === 'spring') stepSpring(poke, S.stiff, S.dampS, dt);
      else if (poke.t < 1) {
        poke.t = Math.min(1, poke.t + dt / 0.5);
        poke.x = 0.25 * Math.sin(Math.PI * poke.t);
        poke.v = 0;
      } else poke.x = 0;
      layout(S);
    },

    setHovered(v) { hovered = v; },
    playEntrance(opts) { Object.assign(entrance, opts, { t: 0 }); },
    poke(S) {
      if (S.poke === 'spring') poke.v += 3.6;
      else poke.t = 0; // 緩動只能從頭來過：動到一半再戳會跳一下
    },
  };
}

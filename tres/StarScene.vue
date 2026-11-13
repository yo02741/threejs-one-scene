<!-- 成品場景。上半部（template）描述「場景裡有什麼」，下半部（script）處理「每一幀怎麼動」。 -->
<script setup>
import { onUnmounted, ref, shallowRef, watch } from 'vue';
import { useLoop, useTres } from '@tresjs/core';
import { AdditiveBlending, Color, Object3D, Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// shader 和教本用的是同一批檔案：這一層框架完全不介入
import noise from '../src/shaders/noise.glsl?raw';
import glowVert from '../src/shaders/glow.vert.glsl?raw';
import glowFrag from '../src/shaders/glow.frag.glsl?raw';
import starsVert from '../src/shaders/stars.vert.glsl?raw';
import starsFrag from '../src/shaders/stars.frag.glsl?raw';

const props = defineProps({ pointer: { type: Object, required: true } });
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 資料：和框架無關的純 JS ---------- */
const COUNT = 2100, MINIS = 40;
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 一條斜斜的星帶
const field = (() => {
  const r = seeded(7932), gauss = () => (r() + r() + r() + r() - 2) * 0.9;
  const pos = new Float32Array(COUNT * 3), size = new Float32Array(COUNT), bright = new Float32Array(COUNT), phase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const th = r() * Math.PI * 2, lat = gauss() * 0.3, rad = 28 + r() * 24;
    const x = Math.cos(lat) * Math.cos(th) * rad, y = Math.sin(lat) * rad, z = Math.cos(lat) * Math.sin(th) * rad;
    const x1 = x * Math.cos(0.45) - y * Math.sin(0.45), y1 = x * Math.sin(0.45) + y * Math.cos(0.45);
    pos.set([x1, y1 * Math.cos(0.28) - z * Math.sin(0.28), y1 * Math.sin(0.28) + z * Math.cos(0.28)], i * 3);
    const b = 0.7 + (0.12 + 0.88 * Math.pow(r(), 7) - 0.7) * 0.75;
    bright[i] = b; size[i] = 0.55 + b * 1.3; phase[i] = r();
  }
  return { pos, size, bright, phase };
})();
const miniData = (() => {
  const r = seeded(4242);
  return Array.from({ length: MINIS }, () => {
    const th = r() * Math.PI * 2, y = r() * 2 - 1, s = Math.sqrt(1 - y * y), rad = 3.2 + Math.pow(r(), 0.7) * 11;
    return { x: Math.cos(th) * s * rad, y: y * rad * 0.7, z: Math.sin(th) * s * rad, s: 0.03 + r() * 0.1, rx: (r() - 0.5) * 1.2, ry: (r() - 0.5) * 1.2, ph: r() * 6.28, sp: 0.3 + r() * 0.5 };
  });
})();

/* ---------- 送進 shader 的數字 ---------- */
const glowUniforms = {
  uA: { value: new Color('#ffe9b8') }, uB: { value: new Color('#ffcf9a') },
  uDir: { value: 0 }, uDebug: { value: 0 }, uFres: { value: 1 }, uPow: { value: 2.5 }, uInt: { value: 0.6 },
  uNScale: { value: 1.2 }, uNSpeed: { value: 0.25 }, uNAmt: { value: 0.7 }, uTime: { value: 0 },
  uDisp: { value: 0.03 }, uDispFreq: { value: 2 },
};
const starUniforms = {
  uSize: { value: 0.6 }, uScale: { value: 400 }, uTime: { value: 0 }, uTwinkle: { value: 0.35 }, uColor: { value: new Color('#fff3d6') },
};

/* ---------- 取得場景裡的物件，才能在每一幀動它們 ---------- */
const star = shallowRef(), shell = shallowRef(), minis = shallowRef(), sky = shallowRef(), cam = shallowRef();
const hovered = ref(false);   // 游標是否指著主星：框架替我們做了射線檢測
const poke = { x: 0, v: 0 };  // 被點到時的彈簧
const dummy = new Object3D();

const { renderer, scene, camera, sizes } = useTres();
const { onBeforeRender, render } = useLoop();

// 底色放在場景上（而不是 renderer 的清除色），後製下顏色才正確：和教本踩到的是同一個坑
scene.value.background = new Color('#12141f');

/* ---------- 每一幀 ---------- */
let hover = 0, px = 0, py = 0;
onBeforeRender(({ delta, elapsed }) => {
  const dt = Math.min(delta, 0.1), t = reduced ? 20 : elapsed;
  glowUniforms.uTime.value = t;
  starUniforms.uTime.value = t;
  starUniforms.uScale.value = renderer.domElement.height * 0.5;

  // 主星：出場（緩出、尾巴過衝）→ 自轉、漂浮、呼吸；被點到時彈一下；被指到時放大
  const k = Math.min(1, Math.max(0, (t - 0.6) / 0.9));
  const entrance = 1 + 2.72 * Math.pow(k - 1, 3) + 1.72 * Math.pow(k - 1, 2);
  poke.v += (-180 * poke.x - 8 * poke.v) * dt; poke.x += poke.v * dt;
  hover += ((hovered.value ? 0.08 : 0) - hover) * Math.min(1, dt * 10);
  if (star.value) {
    star.value.rotation.y = t * 0.3;
    star.value.rotation.x = t * 0.11;
    star.value.position.y = 0.06 * Math.sin(t * 2 * Math.PI / 7);
    star.value.scale.setScalar(Math.max(0.0001, entrance * (1 + 0.015 * Math.sin(t * 1.45)) * (1 + poke.x) * (1 + hover)));
    shell.value?.position.copy(star.value.position);
    shell.value?.scale.copy(star.value.scale);
  }
  if (sky.value) sky.value.rotation.y = t * 0.006;

  // 中景的小星：四十顆共用一個 InstancedMesh，每顆只更新矩陣
  if (minis.value) {
    miniData.forEach((d, i) => {
      dummy.position.set(d.x, d.y + Math.sin(t * d.sp + d.ph) * 0.18, d.z);
      dummy.rotation.set(t * d.rx, t * d.ry, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      minis.value.setMatrixAt(i, dummy.matrix);
    });
    minis.value.instanceMatrix.needsUpdate = true;
  }

  // 相機：從遠處推近到定位（主星在左邊三分之一），加上游標視差
  if (cam.value) {
    const move = reduced ? 1 : Math.min(1, Math.max(0, (t - 0.4) / 7)), e = move < 0.5 ? 4 * move ** 3 : 1 - Math.pow(-2 * move + 2, 3) / 2;
    const shift = (6.2 * 0.466 * sizes.aspectRatio.value) / 3 * 1.15;
    const kp = 1 - Math.exp(-5 * dt);
    px += ((props.pointer.on ? props.pointer.x * 0.25 : 0) - px) * kp;
    py += ((props.pointer.on ? props.pointer.y * 0.25 : 0) - py) * kp;
    cam.value.position.set(-3.6 + (0.4 + shift + 3.6) * e + px, 1.9 + (0.5 - 1.9) * e + py * 0.6, 11.5 + (6.2 - 11.5) * e);
    cam.value.lookAt(shift * e, 0, 0);
  }
});

/* ---------- 後製：把框架的渲染那一步換成自己的 ---------- */
let composer = null;
function buildComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene.value, camera.value));
  composer.addPass(new UnrealBloomPass(new Vector2(256, 256), 0.28, 0.45, 0.95));
  composer.addPass(new OutputPass());
  composer.setPixelRatio(sizes.pixelRatio.value);
  composer.setSize(sizes.width.value, sizes.height.value);
}
watch([sizes.width, sizes.height], ([w, h]) => composer?.setSize(w, h));
render((done) => {
  if (!camera.value) return;
  if (!composer) buildComposer();
  composer.render();
  done();
});
onUnmounted(() => composer?.dispose());
</script>

<template>
  <TresPerspectiveCamera ref="cam" :fov="50" :near="0.5" :far="200" :position="[-3.6, 1.9, 11.5]" />

  <!-- 三點打光：位置、顏色、強度直接寫成屬性 -->
  <TresDirectionalLight :position="[-2.95, 3.86, 3.52]" :intensity="2.6" color="#ffeada" />
  <TresDirectionalLight :position="[4.5, 0.3, 3]" :intensity="0.65" color="#cfe0ff" />
  <TresDirectionalLight :position="[1.2, 1.4, -5]" :intensity="1.8" />
  <TresHemisphereLight :args="['#bfd0ff', '#1b1e2e', 0.15]" />

  <!-- 主星。指標事件直接掛在物件上：不用自己射線 -->
  <TresMesh ref="star" @click="poke.v += 3.6" @pointerenter="hovered = true" @pointerleave="hovered = false">
    <TresIcosahedronGeometry :args="[1, 2]" />
    <TresMeshStandardMaterial color="#ecdcae" :roughness="0.45" :metalness="0" flat-shading emissive="#ecdcae" :emissive-intensity="0.4" />
  </TresMesh>

  <!-- 光暈殼：自己寫的 shader -->
  <TresMesh ref="shell">
    <TresIcosahedronGeometry :args="[1.34, 12]" />
    <TresShaderMaterial
      :vertex-shader="noise + glowVert" :fragment-shader="noise + glowFrag" :uniforms="glowUniforms"
      transparent :depth-write="false" :blending="AdditiveBlending"
    />
  </TresMesh>

  <!-- 背景的星帶：一個物件，兩千多個點 -->
  <TresPoints ref="sky" :frustum-culled="false">
    <TresBufferGeometry>
      <TresBufferAttribute attach="attributes-position" :args="[field.pos, 3]" />
      <TresBufferAttribute attach="attributes-aSize" :args="[field.size, 1]" />
      <TresBufferAttribute attach="attributes-aBright" :args="[field.bright, 1]" />
      <TresBufferAttribute attach="attributes-aPhase" :args="[field.phase, 1]" />
    </TresBufferGeometry>
    <TresShaderMaterial
      :vertex-shader="starsVert" :fragment-shader="starsFrag" :uniforms="starUniforms"
      transparent :depth-write="false" :blending="AdditiveBlending"
    />
  </TresPoints>

  <!-- 中景的小星 -->
  <TresInstancedMesh ref="minis" :args="[undefined, undefined, MINIS]" :frustum-culled="false">
    <TresIcosahedronGeometry :args="[1, 0]" />
    <TresMeshStandardMaterial color="#ecdcae" :roughness="0.5" flat-shading emissive="#ecdcae" :emissive-intensity="0.12" />
  </TresInstancedMesh>
</template>

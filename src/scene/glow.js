// 第 7 章：包在星星外面的一層殼，用自己寫的 shader 畫成光暈。
import { AdditiveBlending, Color, NormalBlending, IcosahedronGeometry, Mesh, ShaderMaterial } from 'three';
import noise from '../shaders/noise.glsl?raw';
import vert from '../shaders/glow.vert.glsl?raw';
import frag from '../shaders/glow.frag.glsl?raw';

export function createGlow(scene, star) {
  const u = {
    uA: { value: new Color() }, uB: { value: new Color() },
    uDir: { value: 0 }, uDebug: { value: 0 }, uFres: { value: 0 }, uPow: { value: 2.5 }, uInt: { value: 0.6 },
    uNScale: { value: 1.5 }, uNSpeed: { value: 0.3 }, uNAmt: { value: 0 }, uTime: { value: 0 },
    uDisp: { value: 0 }, uDispFreq: { value: 2 },
  };
  const mat = new ShaderMaterial({
    uniforms: u,
    vertexShader: noise + vert,
    fragmentShader: noise + frag,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const shell = new Mesh(new IcosahedronGeometry(1.34, 12), mat);
  shell.visible = false;
  scene.add(shell);

  const follow = () => {
    shell.position.copy(star.group.position);
    shell.scale.copy(star.group.scale);
  };

  return {
    apply(S) {
      const G = S.glow;
      shell.visible = G.on && star.group.visible;
      u.uA.value.set(G.a); u.uB.value.set(G.b);
      u.uDir.value = G.dir; u.uDebug.value = G.debug ? 1 : 0;
      u.uFres.value = G.fres; u.uPow.value = G.pow; u.uInt.value = G.int;
      u.uNScale.value = G.nScale; u.uNSpeed.value = G.nSpeed; u.uNAmt.value = G.nAmt;
      u.uDisp.value = G.disp; u.uDispFreq.value = G.dispFreq;
      // 還只是一層有顏色的殼時用一般混合；變成光暈之後用加法混合（疊上去會變亮）
      const blend = G.fres < 0.5 ? NormalBlending : AdditiveBlending;
      if (mat.blending !== blend) { mat.blending = blend; mat.needsUpdate = true; }
      follow();
    },
    animate(dt, S) {
      if (!S.glow.freeze) u.uTime.value += dt;
      follow();
    },
  };
}

// 第 8 章：後製。場景先畫到一張圖上，再一關一關處理那張圖。
import { ACESFilmicToneMapping, NoToneMapping, Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import finalFrag from '../shaders/final.frag.glsl?raw';

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);          // 1. 把場景拍成一張圖
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.004, maxblur: 0.012 }); // 2. 景深
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.8, 0.6, 0.9);                  // 3. 泛光
  const final = new ShaderPass({                                                           // 4. 調色、暗角、顆粒
    uniforms: {
      tDiffuse: { value: null }, uExposure: { value: 1 }, uContrast: { value: 1 }, uSat: { value: 1 },
      uCool: { value: 0 }, uWarm: { value: 0 }, uGrain: { value: 0 }, uVig: { value: 0 }, uVigSize: { value: 0.75 }, uTime: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: finalFrag,
  });
  const output = new OutputPass();                                                         // 5. 色調映射，轉成螢幕的顏色
  [renderPass, bokeh, bloom, final, output].forEach((p) => composer.addPass(p));

  let time = 0;

  return {
    setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); },
    tick(dt) { time += dt; },

    render(S, w, h, direct) {
      const P = S.post;
      bokeh.enabled = P.dof;
      bokeh.uniforms.focus.value = P.focus;
      bokeh.uniforms.aperture.value = P.aperture * 0.002;
      bloom.enabled = P.bloom;
      bloom.threshold = P.thr; bloom.strength = P.str; bloom.radius = P.rad;
      const f = final.uniforms;
      f.uExposure.value = P.exposure; f.uContrast.value = P.contrast; f.uSat.value = P.sat;
      f.uCool.value = P.cool; f.uWarm.value = P.warm; f.uGrain.value = P.grain;
      f.uVig.value = P.vig; f.uVigSize.value = P.vigSize; f.uTime.value = time;

      renderer.toneMapping = P.tone ? ACESFilmicToneMapping : NoToneMapping;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, w, h);
      composer.render();

      // 分割線左邊：不經過後製，直接畫
      if (P.split >= 0) {
        renderer.toneMapping = NoToneMapping;
        direct(Math.round(w * P.split));
      }
    },
  };
}

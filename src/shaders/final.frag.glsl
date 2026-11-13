// 後製的最後一關：調色、暗角、顆粒。輸入只是一張圖（tDiffuse）。
uniform sampler2D tDiffuse;
uniform float uExposure, uContrast, uSat, uCool, uWarm, uGrain, uVig, uVigSize, uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  vec3 col = c.rgb * uExposure;

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);                    // 飽和度
  col = max((col - 0.18) * uContrast + 0.18, 0.0);  // 對比：以中灰為軸

  // 暗部偏藍、亮部偏暖
  col += (1.0 - smoothstep(0.0, 0.35, l)) * uCool * vec3(-0.004, 0.0, 0.03);
  col *= mix(vec3(1.0), vec3(1.12, 1.0, 0.84), smoothstep(0.35, 1.2, l) * uWarm);

  // 暗角：離中心越遠越暗
  col *= 1.0 - uVig * smoothstep(uVigSize * 0.5, 0.9, distance(vUv, vec2(0.5)));

  // 顆粒：每個像素加一點隨時間變的亂數
  col += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5) * uGrain * 0.1;

  gl_FragColor = vec4(max(col, 0.0), c.a);
}

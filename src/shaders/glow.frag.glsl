// 光暈殼的片段著色器：每個像素問一次「你是什麼顏色、多透明」
uniform vec3 uA, uB;
uniform float uDir, uDebug, uFres, uPow, uInt, uNScale, uNSpeed, uNAmt, uTime;
varying vec3 vN, vV, vP;

void main() {
  // 01 漸層：依位置在兩個顏色之間混合
  float g = mix(vP.y, vP.x, uDir) * 0.5 + 0.5;
  vec3 col = mix(uB, uA, g);

  // 02 菲涅耳：表面越斜著看（法線和視線越垂直）越亮
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float f = pow(1.0 - facing, uPow) * smoothstep(0.0, 0.3, facing);
  float a = mix(0.5, f * uInt * 2.2, uFres);

  // 03 噪聲：一個平滑的亂數場，隨時間流動
  float n = snoise(vP * uNScale + vec3(0.0, uTime * uNSpeed, 0.0)) * 0.5 + 0.5;
  a *= mix(1.0, n * 1.7, uNAmt);

  // 除錯檢視：把位置直接當成顏色畫出來
  if (uDebug > 0.5) { col = vP * 0.5 + 0.5; a = 0.85; }

  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

// 背景星：一個中心亮、邊緣淡出的圓形光斑
uniform vec3 uColor;
varying float vB;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * vB, a * a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

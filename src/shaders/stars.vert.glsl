// 背景星：大小、亮度、閃爍都在這裡算，三千顆不花 CPU
attribute float aSize, aBright, aPhase;
uniform float uSize, uScale, uTime, uTwinkle;
varying float vB;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 1.0 + uTwinkle * sin(uTime * (1.2 + aPhase * 2.5) + aPhase * 40.0);
  vB = aBright * tw;
  gl_PointSize = uSize * aSize * uScale / -mv.z;
}

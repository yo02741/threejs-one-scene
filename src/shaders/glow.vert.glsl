// 光暈殼的頂點著色器：畫之前，先沿著法線把每個頂點推出去或拉回來一點
uniform float uTime, uDisp, uDispFreq;
varying vec3 vN, vV, vP;

void main() {
  vP = normalize(position);
  float n = snoise(vP * uDispFreq + uTime * 0.25);
  vec3 p = position + normal * n * uDisp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}

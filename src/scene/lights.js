// 光：借來的工作燈與攝影棚環境（第 2 章）、三點打光與陰影（第 3 章）。
import {
  BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight,
  Line, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator,
  PlaneGeometry, SphereGeometry,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const WHITE = new Color(0xffffff), WARM = new Color(0xffc48a), COOL = new Color(0x9fc0ff);
// 色溫 -1（冷）到 1（暖）→ 顏色
const tempColor = (t, out) => out.copy(WHITE).lerp(t > 0 ? WARM : COOL, Math.abs(t));

export function createLights(scene, renderer) {
  const work = new DirectionalLight(0xffffff, 0);
  work.position.set(2.5, 3, 4);

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0;
  pmrem.dispose();

  const key = new DirectionalLight(0xffffff, 0);
  key.shadow.camera.left = key.shadow.camera.bottom = -3.5;
  key.shadow.camera.right = key.shadow.camera.top = 3.5;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 16;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  const fill = new DirectionalLight(0xffffff, 0);
  fill.position.set(4.5, 0.3, 3);
  const rim = new DirectionalLight(0xffffff, 0);
  rim.position.set(0.6, 3, -5);
  const hemi = new HemisphereLight(0xbfd0ff, 0x1b1e2e, 0);
  scene.add(work, key, fill, rim, hemi);

  // 鷹架：光源位置的標記（一顆小球，加一條指向星星的線）
  const marks = new Group();
  const ball = new SphereGeometry(0.11, 12, 8);
  const mark = (light) => {
    const g = new Group();
    const mat = new MeshBasicMaterial({ color: 0xffffff });
    const line = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    line.geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const dot = new Mesh(ball, mat);
    g.add(dot, line);
    marks.add(g);
    return () => {
      // 標記放在比光源近一點的地方，才進得了畫面
      const p = light.position.clone().setLength(2.6);
      dot.position.copy(p);
      line.geometry.getAttribute('position').setXYZ(0, p.x, p.y, p.z);
      line.geometry.getAttribute('position').needsUpdate = true;
      mat.color.copy(light.color); line.material.color.copy(light.color);
      g.visible = light.intensity > 0.01;
    };
  };
  const updateMarks = [mark(key), mark(fill), mark(rim)];
  scene.add(marks);

  // 鷹架：臨時地面，只為了接影子
  const ground = new Mesh(new PlaneGeometry(16, 16), new MeshStandardMaterial({ color: 0x23273a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  ground.visible = false;
  scene.add(ground);

  let res = 0;
  const rad = Math.PI / 180;

  return {
    marks,
    apply(S) {
      work.intensity = S.work * 2.4;
      scene.environmentIntensity = S.env;

      const k = S.key, r = 6, ce = Math.cos(k.el * rad);
      key.position.set(r * ce * Math.sin(k.az * rad), r * Math.sin(k.el * rad), r * ce * Math.cos(k.az * rad));
      key.intensity = k.on ? k.int : 0;
      tempColor(k.temp, key.color);
      fill.intensity = S.fill.on ? S.fill.int : 0;
      tempColor(S.fill.temp, fill.color);
      rim.intensity = S.rim.on ? S.rim.int : 0;
      hemi.intensity = S.hemi;

      key.castShadow = S.shadow;
      key.shadow.radius = S.shadowSoft;
      if (res !== S.shadowRes) {
        res = S.shadowRes;
        key.shadow.mapSize.set(res, res);
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
      ground.visible = S.ground;

      marks.visible = S.lightMarks;
      if (S.lightMarks) updateMarks.forEach((f) => f());
    },
  };
}

// 選修：把別人做好的 glTF 模型請進場景。
import { AxesHelper, Box3, Box3Helper, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FILES = { lantern: 'models/lantern/lantern.gltf', avocado: 'models/avocado/avocado.gltf' };
const TARGET = 1.8; // 校正後，模型最長的那一邊是幾個單位

export function createModel(scene, bookMaterial, onLoad) {
  const loader = new GLTFLoader();
  const holder = new Group();       // 模型在場景裡的位置：主星的右邊
  holder.position.set(2.6, 0, 0.4);
  const pivot = new Group();        // 旋轉與縮放作用在這一層
  holder.add(pivot);
  scene.add(holder);

  // 鷹架：包圍盒（模型佔了多大的空間）與原點（它的 0,0,0 在哪裡）
  const box = new Box3(), boxHelper = new Box3Helper(box, 0x9fb8ad), origin = new AxesHelper(0.6);
  scene.add(boxHelper);
  holder.add(origin);

  const cache = {};   // 檔名 → { root, size, center, materials }
  let shown = null;
  const size = new Vector3(), center = new Vector3();

  function load(which) {
    if (cache[which]) return;
    cache[which] = { loading: true };
    loader.load(import.meta.env.BASE_URL + FILES[which], (gltf) => {
      const root = gltf.scene;
      const b = new Box3().setFromObject(root);
      const originals = new Map();
      root.traverse((o) => { if (o.isMesh) originals.set(o, o.material); });
      cache[which] = { root, size: b.getSize(new Vector3()), center: b.getCenter(new Vector3()), originals };
      onLoad();
    });
  }

  return {
    apply(S) {
      const M = S.model;
      holder.visible = M.on;
      boxHelper.visible = M.on && M.box;
      origin.visible = M.box;
      if (!M.on) return;

      load(M.which);
      const m = cache[M.which];
      if (!m || m.loading) return;
      if (shown !== m) {
        if (shown) pivot.remove(shown.root);
        pivot.add(m.root);
        shown = m;
      }

      // 校正：把模型的中心移到原點，再縮放到固定的大小。不校正就照檔案裡原本的數字放
      const longest = Math.max(m.size.x, m.size.y, m.size.z);
      const fit = M.fit ? TARGET / longest : 1;
      if (M.fit) m.root.position.copy(m.center).multiplyScalar(-1); else m.root.position.set(0, 0, 0);
      pivot.scale.setScalar(fit * M.scale);
      pivot.rotation.y = M.rotY * Math.PI / 180;

      // 材質：用模型自己帶來的，或換成這本書的（和主星同一份）
      m.originals.forEach((mat, mesh) => { mesh.material = M.override ? bookMaterial : mat; });

      if (M.box) { holder.updateMatrixWorld(true); box.setFromObject(pivot); }
    },
    // 目前這個模型原本的大小（最長邊），給文字欄顯示用
    info(which) {
      const m = cache[which];
      return m && !m.loading ? Math.max(m.size.x, m.size.y, m.size.z) : null;
    },
  };
}

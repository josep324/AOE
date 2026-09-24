import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_URLS } from '@src/model-index.js';

/* =====================================================================
   BIBLIOTECA DE MODELS (assets/models/**.glb)
   Clau = camí dins de assets/models sense extensió ni sufix de variant:
     assets/models/buildings/house.glb   → «buildings/house»
     assets/models/resources/tree_2.glb  → «resources/tree» (variant 2)
   ===================================================================== */
const MODEL_LIB = new Map();
async function loadModelLibrary() {
  const loader = new GLTFLoader();
  await Promise.all(Object.entries(MODEL_URLS).map(async ([path, url]) => {
    const m = /assets\/models\/(.+?)(?:_\d+)?\.glb$/i.exec(path);
    if (!m) return;
    const key = m[1].toLowerCase();
    try {
      const gltf = await loader.loadAsync(url);
      if (!MODEL_LIB.has(key)) MODEL_LIB.set(key, []);
      MODEL_LIB.get(key).push(gltf.scene);
    } catch (err) {
      console.warn('No s\'ha pogut carregar el model', path, err);
    }
  }));
  if (MODEL_LIB.size) console.info('Models carregats:', [...MODEL_LIB.keys()].join(', '));
}
await loadModelLibrary();

const libMatCache = new Map();
function libMaterial(m, team) {
  const tint = team && /team|equip/i.test(m.name || '');
  const key = m.uuid + (tint ? ':' + team : '');
  if (!libMatCache.has(key)) {
    const c = m.clone();
    if (tint) c.color.set(teamOf(team).color);
    libMatCache.set(key, fogify(c));
  }
  return libMatCache.get(key);
}
function hasModel(key) { return MODEL_LIB.has(key); }
/* Còpia d'un model de la biblioteca, ajustada a una mida (w×d de planta) i amb la base a y = 0 */
function libraryModel(key, team = 0, fit = null) {
  const list = MODEL_LIB.get(key);
  if (!list || !list.length) return null;
  const obj = list[Math.floor(rand() * list.length)].clone(true);
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.material = Array.isArray(o.material) ? o.material.map(m => libMaterial(m, team)) : libMaterial(o.material, team);
  });
  const holder = new THREE.Group();
  holder.add(obj);
  let box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (fit && size.x > 0 && size.z > 0) {
    const s = Math.min(fit.w / size.x, (fit.d || fit.w) / size.z);
    obj.scale.multiplyScalar(s);
    box = new THREE.Box3().setFromObject(obj);
  }
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  holder.userData.height = box.max.y - box.min.y;
  holder.userData.fromLibrary = true;
  return holder;
}
/* Substitueix el contingut visible d'un grup pel model de la biblioteca (si n'hi ha).
   Les peces originals queden invisibles però continuen servint per seleccionar amb el ratolí. */
function swapModel(e, key, fit, parent = e.model) {
  const lib = libraryModel(key, e.team, fit);
  if (!lib) return false;
  for (const c of parent.children) if (c !== e.selection) c.visible = false;
  parent.add(lib);
  if (lib.userData.height) e.height = lib.userData.height;
  return true;
}

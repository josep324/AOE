import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MODEL_URLS } from '@src/model-index.js';

/* =====================================================================
   BIBLIOTECA DE MODELS (assets/models/**.glb)
   Clau = camí dins de assets/models sense extensió ni sufix de variant:
     assets/models/buildings/house.glb   → «buildings/house»
     assets/models/resources/tree_2.glb  → «resources/tree» (variant 2)
   ===================================================================== */
const MODEL_LIB = new Map();
async function loadModelLibrary() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
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
/* Còpia d'un model de la biblioteca, ajustada a una mida (w×d de planta, alçada màxima maxH) i amb la base a y = 0 */
function libraryModel(key, team = 0, fit = null) {
  const list = MODEL_LIB.get(key);
  if (!list || !list.length) return null;
  const obj = list[Math.floor(rand() * list.length)].clone(true);
  let hasTeamMat = false;
  obj.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some(m => /team|equip/i.test(m.name || ''))) hasTeamMat = true;
    o.castShadow = o.receiveShadow = true;
    o.material = Array.isArray(o.material) ? o.material.map(m => libMaterial(m, team)) : libMaterial(o.material, team);
  });
  const holder = new THREE.Group();
  holder.add(obj);
  let box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (fit && size.x > 0 && size.z > 0) {
    let s = Math.min(fit.w / size.x, (fit.d || fit.w) / size.z);
    if (fit.maxH && size.y * s > fit.maxH) s = fit.maxH / size.y;   // models molt alts (torres) no es disparen
    obj.scale.multiplyScalar(s);
    box = new THREE.Box3().setFromObject(obj);
  }
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  holder.userData.height = box.max.y - box.min.y;
  holder.userData.fromLibrary = true;
  // Sense cap material d'equip: banderí amb el color de l'equip perquè es distingeixi de qui és
  if (team && !hasTeamMat && key.startsWith('buildings/') && fit) holder.add(teamPennant(team, fit, holder.userData.height));
  return holder;
}
const pennantGeo = {
  pole: new THREE.CylinderGeometry(0.06, 0.08, 1, 6).translate(0, 0.5, 0),
  flag: new THREE.PlaneGeometry(1, 0.62).translate(0.5, 0, 0),
};
const pennantPoleMat = mat(0x4a3320, { roughness: 0.9 });
const pennantMats = new Map();
function teamPennant(team, fit, height) {
  if (!pennantMats.has(team)) pennantMats.set(team, mat(teamOf(team).color, { roughness: 0.7, side: THREE.DoubleSide }));
  const size = Math.max(fit.w, fit.d || fit.w);
  const h = Math.min(Math.max(height * 0.75, 2.6), 2 + size * 0.35);
  const g = new THREE.Group();
  const pole = new THREE.Mesh(pennantGeo.pole, pennantPoleMat);
  pole.scale.y = h;
  const flag = new THREE.Mesh(pennantGeo.flag, pennantMats.get(team));
  const fs = 0.7 + size * 0.07;
  flag.scale.set(fs, fs, 1);
  flag.position.y = h - 0.31 * fs;
  pole.castShadow = flag.castShadow = true;
  g.add(pole, flag);
  g.position.set(-fit.w * 0.42, 0, (fit.d || fit.w) * 0.42);
  return g;
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

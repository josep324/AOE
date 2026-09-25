/* =====================================================================
   ICONES DE LA INTERFÍCIE
   Retrats i botons fets amb els models 3D reals del joc (unitats, edificis, recursos),
   renderitzats un sol cop en un context petit i guardats com a imatge.
   ===================================================================== */
const ICONS = { size: 128, cache: new Map(), renderer: null, scene: null, cam: null, white: null };
function iconsSetup() {
  if (ICONS.renderer) return true;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = ICONS.size;
    ICONS.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { return false; }
  const r = ICONS.renderer;
  r.setSize(ICONS.size, ICONS.size, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  r.setClearColor(0x000000, 0);
  ICONS.scene = new THREE.Scene();
  ICONS.scene.add(new THREE.HemisphereLight(0xe8eef8, 0x4a3e30, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.set(-3, 5, 4);
  const rim = new THREE.DirectionalLight(0x9ab4ff, 0.9);
  rim.position.set(4, 3, -4);
  ICONS.scene.add(key, rim);
  ICONS.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 400);
  ICONS.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  ICONS.white.needsUpdate = true;
  return true;
}
/* Renderitza un objecte i en retorna la imatge (dataURL). zoom < 1 l'apropa (retrat de mig cos) */
function renderIcon(key, makeObject, { zoom = 1, lift = 0, yaw = 0.55 } = {}) {
  if (ICONS.cache.has(key)) return ICONS.cache.get(key);
  if (!iconsSetup()) return null;
  let obj;
  try { obj = makeObject(); } catch (e) { ICONS.cache.set(key, null); return null; }
  if (!obj) { ICONS.cache.set(key, null); return null; }
  obj.rotation.y = yaw;
  ICONS.scene.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y * 1.05, size.z) * 0.62 * zoom;
  const cam = ICONS.cam;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const dir = new THREE.Vector3(0.18, 0.42, 1).normalize();
  const look = new THREE.Vector3(ctr.x, ctr.y + size.y * lift, ctr.z);
  cam.position.copy(look).addScaledVector(dir, dist);
  cam.lookAt(look);
  cam.near = dist * 0.1; cam.far = dist * 4;
  cam.updateProjectionMatrix();
  // La boira de guerra no afecta les icones
  const fog = FOG_UNIFORMS.uFogTex.value;
  FOG_UNIFORMS.uFogTex.value = ICONS.white;
  ICONS.renderer.render(ICONS.scene, cam);
  FOG_UNIFORMS.uFogTex.value = fog;
  ICONS.scene.remove(obj);
  const url = ICONS.renderer.domElement.toDataURL('image/png');
  ICONS.cache.set(key, url);
  return url;
}
/* Imatge per a una unitat, edifici o recurs (null si no n'hi ha: es fa servir l'emoji) */
function iconURL(kind, team = PLAYER.id, arch = null) {
  const a = arch || archOf(team || PLAYER.id);
  const T = team || 0;
  if (CONFIG.UNITS[kind]) {
    const portrait = !['siege', 'trade'].includes(CONFIG.UNITS[kind].cat) && !CONFIG.UNITS[kind].mounted && CONFIG.UNITS[kind].cat !== 'cavalry';
    return renderIcon(`u:${kind}:${T}:${a}`, () => unitTemplate(kind, T || PLAYER.id, a, 0).clone(true), portrait ? { zoom: 0.5, lift: 0.3 } : { zoom: 0.78, lift: 0.08 });
  }
  if (kind === 'towncenter' || CONFIG.BUILDINGS[kind]) {
    return renderIcon(`b:${kind}:${T}:${a}`, () => {
      if (kind === 'palisade' || kind === 'stonewall') {
        const g = new THREE.Group();
        for (let i = -1; i <= 1; i++) { const m = kitBuildingModel(kind, T || PLAYER.id, a); if (m) { m.model.position.x = i; g.add(m.model); } }
        return g;
      }
      const m = kind === 'towncenter' ? makeBuildingModel('towncenter', T || PLAYER.id, a) : kitBuildingModel(kind, T || PLAYER.id, a);
      return m ? m.model : null;
    }, { zoom: 0.95, yaw: 0.6 });
  }
  const R = RESOURCE_ICONS[kind];
  return R ? renderIcon(`r:${kind}`, R.make, R.opts || {}) : null;
}
const RESOURCE_ICONS = {
  tree: { make: () => makeTreeModel(3.1, 7.7) },
  gold: { make: () => { const m = makeMineModel('gold', 1, 2); const g = new THREE.Group(); g.add(m.base, m.chunks); return g; }, opts: { zoom: 0.8 } },
  stone: { make: () => { const m = makeMineModel('stone', 1, 2); const g = new THREE.Group(); g.add(m.base, m.chunks); return g; }, opts: { zoom: 0.8 } },
  berries: { make: () => { const bt = bushTemplate(0); const g = new THREE.Group(); g.add(new THREE.Mesh(bt.geo, NM.bush)); for (const p of bt.berries) { const b = new THREE.Mesh(berryGeoShared, NM.berry); b.position.copy(p); g.add(b); } return g; } },
  deer: { make: () => { const e = {}; return buildAnimalModel(e, 'deer', 0); }, opts: { yaw: 1.1 } },
  boar: { make: () => { const e = {}; return buildAnimalModel(e, 'boar', 0); }, opts: { yaw: 1.1 } },
  wolf: { make: () => { const e = {}; return buildAnimalModel(e, 'wolf', 0); }, opts: { yaw: 1.1 } },
  logs: { make: () => { const g = new THREE.Group(); kLogPile(g, 0, 0, 0.4, 3, 1.3); return g; }, opts: { zoom: 0.8 } },
  meat: { make: () => { const bt = bushTemplate(1); const g = new THREE.Group(); g.add(new THREE.Mesh(bt.geo, NM.bush)); for (const p of bt.berries) { const b = new THREE.Mesh(berryGeoShared, NM.berry); b.position.copy(p); g.add(b); } return g; }, opts: { zoom: 0.8 } },
  relic: { make: () => relicTemplate().clone(true), opts: { zoom: 0.85 } },
  farm: { make: () => { const m = kitBuildingModel('farm', PLAYER.id); return m && m.model; }, opts: { zoom: 0.85 } },
};
/* HTML de la icona d'una entitat o tipus: imatge 3D si n'hi ha; si no, l'emoji */
function iconHTML(kind, emoji, team = PLAYER.id, arch = null) {
  const url = iconURL(kind, team, arch);
  return url ? `<img class="ico3d" src="${url}" alt="" draggable="false">` : `<span class="emo">${emoji || ''}</span>`;
}
/* Icones del panell de recursos: models reals en lloc d'emojis */
function initResourceIcons() {
  const map = { food: 'meat', wood: 'logs', gold: 'gold', stone: 'stone' };
  for (const [res, k] of Object.entries(map)) {
    const el = document.querySelector(`#panel-resources .ico.${res}`);
    const url = iconURL(k);
    if (el && url) { el.innerHTML = `<img class="ico3d" src="${url}" alt="">`; el.classList.add('img'); }
  }
}
function entityIconHTML(e) {
  if (!e) return '';
  const kind = e.kind === 'unit' ? e.unitKind || e.subtype : e.subtype;
  return iconHTML(kind, e.icon, e.team || PLAYER.id, e.visArch || null);
}

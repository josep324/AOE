/* =====================================================================
   KIT D'EDIFICIS (II): detalls compartits, peces animades, fusió per material i registre d'arquitectures
   ===================================================================== */
/* ---------- Detalls compartits ---------- */
function kBarrel(g, x, z, s = 1) {
  kcyl(g, 0.3 * s, 0.26 * s, 0.75 * s, 12, KM.planks, x, 0.375 * s, z);
  for (const y of [0.15, 0.6]) kcyl(g, 0.305 * s, 0.305 * s, 0.05 * s, 12, KM.iron, x, y * s, z);
}
function kCrate(g, x, z, s = 1, r = 0, y = 0) {
  kbox(g, 0.6 * s, 0.6 * s, 0.6 * s, KM.planks, x, y + 0.3 * s, z, [0, r, 0]);
}
function kSack(g, x, z, s = 1, color = 0xcdb98e) {
  ksphere(g, 0.3 * s, mat(color, { roughness: 1 }), x, 0.28 * s, z, 1, 1.15, 0.9, 1);
}
function kLogPile(g, x, z, rotY = 0, rows = 3, len = 1.3, material = null) {
  const p = new THREE.Group();
  p.position.set(x, 0, z); p.rotation.y = rotY;
  for (let r = 0; r < rows; r++) for (let c = 0; c < rows - r; c++) {
    kcyl(p, 0.14, 0.14, len, 8, material || KM.bark, 0, 0.15 + r * 0.25, (c - (rows - 1 - r) / 2) * 0.3, [0, 0, Math.PI / 2]);
  }
  g.add(p);
}
function kHay(g, x, z, rotY = 0) {
  kcyl(g, 0.42, 0.42, 0.8, 12, KM.straw, x, 0.42, z, [0, rotY, Math.PI / 2]);
}
function kStakeFence(g, x0, z0, x1, z1, h = 1.1, gap = 0.26, material = null) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / gap));
  const M = material || KM.bark;
  for (let i = 0; i <= n; i++) {
    const t = i / n, hh = h * kr(0.85, 1.05);
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    kcyl(g, 0.09, 0.1, hh, 6, M, x, hh / 2, z);
    kcyl(g, 0, 0.09, 0.22, 6, M, x, hh + 0.11, z);
  }
  kbox(g, len, 0.08, 0.06, KM.timber, (x0 + x1) / 2, h * 0.55, (z0 + z1) / 2, [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
}
function kRailFence(g, x0, z0, x1, z1, h = 1.0, material = null) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.4));
  const M = material || KM.timber, ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    kbox(g, 0.12, h, 0.12, M, x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t);
  }
  for (const y of [h * 0.45, h * 0.85]) kbox(g, len, 0.07, 0.05, M, (x0 + x1) / 2, y, (z0 + z1) / 2, [0, ry, 0]);
}
function kBanner(g, team, x, z, h = 3.6, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z); b.rotation.y = rotY;
  kcyl(b, 0.05, 0.06, h, 6, KM.timber, 0, h / 2, 0);
  kbox(b, 0.7, 0.05, 0.05, KM.timber, 0.3, h - 0.1, 0);
  kbox(b, 0.62, 1.1, 0.03, KM.team(team), 0.3, h - 0.72, 0);
  kbox(b, 0.62, 0.12, 0.035, KM.teamDark(team), 0.3, h - 1.2, 0);
  g.add(b);
}
/* Nobori: bandera vertical japonesa */
function kNobori(g, team, x, z, h = 3.8, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z); b.rotation.y = rotY;
  kcyl(b, 0.04, 0.05, h, 6, KM.darkwood, 0, h / 2, 0);
  kbox(b, 0.5, 0.04, 0.04, KM.darkwood, 0.25, h - 0.08, 0);
  kbox(b, 0.46, h * 0.55, 0.02, KM.team(team), 0.25, h - 0.1 - h * 0.275, 0);
  kbox(b, 0.46, 0.2, 0.025, KM.cloth(0xf2eee4), 0.25, h - 0.35, 0);
  g.add(b);
}
/* Gallardet triangular (Orient Mitjà) */
function kPennant(g, team, x, y, z, h = 1.6, rotY = 0) {
  const b = new THREE.Group();
  b.position.set(x, y, z); b.rotation.y = rotY;
  kcyl(b, 0.03, 0.04, h, 6, KM.timber, 0, h / 2, 0);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, -0.22); s.lineTo(0, -0.45); s.closePath();
  kshape(b, s, KM.team(team), 0.02, h - 0.05, 0);
  kcyl(b, 0.06, 0.06, 0.08, 8, KM.gold, 0, h + 0.03, 0);
  g.add(b);
}
function kWeaponRack(g, team, x, z, rotY = 0, shields = true, shaft = null) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z); rack.rotation.y = rotY;
  const W = shaft || KM.timber;
  kbox(rack, 1.6, 0.1, 0.12, W, 0, 1.15, 0);
  kbox(rack, 1.6, 0.1, 0.12, W, 0, 0.35, 0.15);
  for (const sx of [-1, 1]) kbox(rack, 0.1, 1.3, 0.1, W, sx * 0.75, 0.65, 0);
  for (let i = 0; i < 5; i++) {
    kcyl(rack, 0.025, 0.025, 2.1, 5, W, -0.6 + i * 0.3, 1.05, 0.05, [-0.12, 0, 0]);
    kcyl(rack, 0, 0.05, 0.22, 5, KM.iron, -0.6 + i * 0.3, 2.2, -0.08, [-0.12, 0, 0]);
  }
  if (shields) for (const sx of [-0.45, 0.45]) kcyl(rack, 0.28, 0.28, 0.06, 12, KM.teamPaint(team), sx, 0.62, 0.26, [Math.PI / 2 - 0.2, 0, 0]);
  g.add(rack);
}
function kDummy(g, x, z) {
  kcyl(g, 0.07, 0.08, 1.8, 6, KM.timber, x, 0.9, z);
  kbox(g, 1.0, 0.1, 0.1, KM.timber, x, 1.4, z);
  kcyl(g, 0.26, 0.24, 0.7, 10, KM.straw, x, 1.25, z);
  kcyl(g, 0.17, 0.17, 0.32, 10, KM.straw, x, 1.78, z);
}
function kTarget(g, team, x, z, rotY = 0) {
  const t = new THREE.Group();
  t.position.set(x, 0, z); t.rotation.y = rotY;
  kcyl(t, 0.55, 0.55, 0.22, 16, KM.straw, 0, 0.85, 0, [Math.PI / 2 - 0.25, 0, 0]);
  kcyl(t, 0.3, 0.3, 0.23, 16, KM.teamPaint(team), 0, 0.85, 0, [Math.PI / 2 - 0.25, 0, 0]);
  for (const sx of [-1, 1]) kbox(t, 0.08, 1.1, 0.08, KM.timber, sx * 0.35, 0.5, -0.15, [0.25, 0, 0]);
  g.add(t);
}
function kAnvil(g, x, z, rotY = 0) {
  const iron = mat(0x2e2f33, { metalness: 0.7, roughness: 0.4 });
  kcyl(g, 0.22, 0.26, 0.55, 8, KM.bark, x, 0.275, z);
  kbox(g, 0.55, 0.16, 0.22, iron, x, 0.63, z, [0, rotY, 0]);
  kbox(g, 0.3, 0.12, 0.16, iron, x, 0.5, z, [0, rotY, 0]);
}
function kCart(g, x, z, rotY = 0, load = null) {
  const c = new THREE.Group();
  c.position.set(x, 0, z); c.rotation.y = rotY;
  kbox(c, 1.0, 0.1, 1.5, KM.planks, 0, 0.62, 0);
  for (const sx of [-1, 1]) kbox(c, 0.06, 0.32, 1.5, KM.planks, sx * 0.5, 0.82, 0);
  kbox(c, 1.0, 0.32, 0.06, KM.planks, 0, 0.82, -0.72);
  for (const sx of [-1, 1]) kcyl(c, 0.42, 0.42, 0.08, 12, KM.timber, sx * 0.6, 0.42, 0.1, [0, 0, Math.PI / 2]);
  for (const sx of [-0.3, 0.3]) kbox(c, 0.06, 0.06, 1.2, KM.timber, sx, 0.55, 1.2, [0.35, 0, 0]);
  if (load === 'gold') for (let i = 0; i < 5; i++) kbox(c, 0.24, 0.2, 0.24, KM.gold, kr(-0.3, 0.3), 0.8, kr(-0.5, 0.5), [kr(0, 3), kr(0, 3), 0]);
  if (load === 'stone') for (let i = 0; i < 5; i++) kbox(c, 0.3, 0.24, 0.3, KM.stone, kr(-0.3, 0.3), 0.8, kr(-0.5, 0.5), [kr(0, 1), kr(0, 3), 0]);
  if (load === 'logs') kLogPile(c, 0, 0.55, Math.PI / 2, 2, 1.4);
  g.add(c);
}
function kOrePile(g, x, z, material, n = 7, s = 1) {
  for (let i = 0; i < n; i++) {
    const a = kr(0, Math.PI * 2), r = kr(0, 0.45) * s;
    ksphere(g, kr(0.14, 0.24) * s, material, x + Math.cos(a) * r, 0.12 * s + (0.45 * s - r) * 0.4, z + Math.sin(a) * r, 1, kr(0.7, 1), 1, 0);
  }
}
function kSawhorse(g, x, z, rotY = 0) {
  const s = new THREE.Group();
  s.position.set(x, 0, z); s.rotation.y = rotY;
  for (const sx of [-0.45, 0.45]) {
    kbox(s, 0.08, 0.8, 0.08, KM.timber, sx, 0.4, 0.15, [0.35, 0, 0]);
    kbox(s, 0.08, 0.8, 0.08, KM.timber, sx, 0.4, -0.15, [-0.35, 0, 0]);
  }
  kcyl(s, 0.16, 0.16, 1.6, 8, KM.bark, 0, 0.82, 0, [0, 0, Math.PI / 2]);
  g.add(s);
}
function kWell(g, x, z, stoneMat, roofMat, gableMat = KM.timber) {
  kcyl(g, 0.65, 0.7, 0.7, 12, stoneMat, x, 0.35, z);
  kcyl(g, 0.5, 0.5, 0.72, 12, KM.dark, x, 0.36, z, null, true);
  for (const sx of [-1, 1]) kbox(g, 0.1, 1.5, 0.1, KM.timber, x + sx * 0.6, 1.1, z);
  kbox(g, 1.3, 0.08, 0.08, KM.timber, x, 1.6, z);
  gableRoof(g, { w: 1.3, d: 1.0, h: 0.45, over: 0.12, t: 0.08, y0: 1.85, x, z, roofMat, gableMat, frame: false });
}

/* ---------- Peces animades: es fusionen a part i cada còpia en té una instància pròpia ---------- */
function animPart(g, key, x = 0, y = 0, z = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.userData.animKey = key;
  g.add(p);
  return p;
}

/* ---------- Fusió per material: menys crides de dibuix ---------- */
function bakeMeshes(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMat = new Map();
  const visit = (o) => {
    if (o !== root && o.userData.animKey) return;
    if (o.isMesh) {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(geo);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  const out = [];
  for (const [m, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const gg of geos) gg.dispose();
    merged.computeBoundingSphere();
    out.push([merged, m]);
  }
  return out;
}
function bakeTemplate(g) {
  const tpl = { meshes: bakeMeshes(g), anims: [] };
  g.traverse(o => {
    if (o === g || !o.userData.animKey) return;
    tpl.anims.push({ key: o.userData.animKey, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone(), meshes: bakeMeshes(o) });
  });
  return tpl;
}
function instantiateTemplate(tpl) {
  const model = new THREE.Group();
  for (const [geo, m] of tpl.meshes) model.add(new THREE.Mesh(geo, m));
  for (const a of tpl.anims) {
    const p = new THREE.Group();
    p.position.copy(a.pos); p.quaternion.copy(a.quat); p.scale.copy(a.scale);
    for (const [geo, m] of a.meshes) p.add(new THREE.Mesh(geo, m));
    model.add(p);
    if (a.key === 'doors') (model.userData.doors = model.userData.doors || []).push(p);
    else model.userData[a.key] = p;
  }
  return model;
}

/* ---------- Registre d'arquitectures ---------- */
const ARCH = {};              // ARCH.western = { house(g, ctx) {...}, ... } → retorna l'alçada
const COMMON_BUILDERS = {};   // edificis iguals per a totes les civilitzacions (granja, palissada)
const KIT_VARIANTS = { house: 3 };
const kitCache = new Map();
/* Model d'un edifici del kit segons la civilització de l'equip (null si el tipus no hi és) */
function kitBuildingModel(type, team, archOverride = null) {
  const arch = archOverride || archOf(team);
  const build = COMMON_BUILDERS[type] || (ARCH[arch] && ARCH[arch][type]);
  if (!build) return null;
  const variant = Math.floor(kitRng() * (KIT_VARIANTS[type] || 1));
  const key = `${arch}:${type}:${team}:${variant}`;
  if (!kitCache.has(key)) {
    const g = new THREE.Group();
    const height = build(g, { team, variant, arch });
    kitCache.set(key, { tpl: bakeTemplate(g), height });
  }
  const { tpl, height } = kitCache.get(key);
  return { model: instantiateTemplate(tpl), height };
}

/* ---------- Edificis comuns ---------- */
COMMON_BUILDERS.farm = (g) => {
  kbox(g, 5.8, 0.12, 5.8, KM.soil, 0, 0.06, 0, [0, Math.PI / 2, 0]);
  const crops = animPart(g, 'crops', 0, 0.12, 0);
  for (let r = 0; r < 7; r++) {
    const z = -2.4 + r * 0.8;
    kbox(crops, 5.2, 0.5, 0.36, r % 3 === 1 ? KM.sprouts : KM.wheat, 0, 0.25, z);
    kbox(crops, 5.2, 0.12, 0.44, KM.wheat, 0, 0.5, z);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kcyl(g, 0.06, 0.08, 0.8, 6, KM.bark, sx * 2.85, 0.4, sz * 2.85);
  for (const s of [-1, 1]) {
    kbox(g, 5.7, 0.05, 0.05, KM.timber, 0, 0.55, s * 2.85);
    kbox(g, 0.05, 0.05, 5.7, KM.timber, s * 2.85, 0.55, 0);
  }
  return 0.9;
};
COMMON_BUILDERS.palisade = (g) => {
  for (const [sx, sz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const h = 2.1 + ((sx + sz + 1) * 7919 % 3) * 0.12;
    kcyl(g, 0.24, 0.26, h, 7, KM.bark, sx, h / 2, sz);
    kcyl(g, 0, 0.24, 0.42, 7, KM.palewood, sx, h + 0.21, sz);
  }
  return 2.7;
};

/* ---------- Peces de setge (per als tallers) ---------- */
function kWheelProp(g, x, z, r = 0.55, lying = false, material = null) {
  const M = material || KM.timber;
  kcyl(g, r, r, 0.12, 14, M, x, lying ? 0.07 : r, z, lying ? null : [0, 0, Math.PI / 2]);
  kcyl(g, r * 0.3, r * 0.3, 0.16, 8, KM.iron, x, lying ? 0.09 : r, z, lying ? null : [0, 0, Math.PI / 2]);
}
function kRamFrame(g, x, z, rotY = 0, material = null) {
  const f = new THREE.Group();
  f.position.set(x, 0, z); f.rotation.y = rotY;
  const M = material || KM.timber;
  kbox(f, 1.3, 0.14, 2.6, M, 0, 0.5, 0);
  for (const s of [-1, 1]) for (const zz of [-1.0, 1.0]) kbox(f, 0.1, 1.3, 0.1, M, s * 0.55, 1.1, zz);
  for (const s of [-1, 1]) kbox(f, 0.9, 0.08, 2.6, M, s * 0.34, 1.85, 0, [0, 0, -s * 0.75]);
  kcyl(f, 0.18, 0.18, 2.8, 8, KM.bark, 0, 0.95, 0.2, [Math.PI / 2, 0, 0]);
  g.add(f);
}

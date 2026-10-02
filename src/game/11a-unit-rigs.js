/* =====================================================================
   MODELS DE LES UNITATS
   Esquelet articulat (tors, cames i braços amb pivots) i vestits segons la regió de la
   civilització. Cada peça rígida es fusiona en una o dues malles amb color per vèrtex
   (mat i metàl·lic) i es comparteix entre totes les unitats iguals: poques crides de dibuix.
   Interfície que fa servir l'animació: model, legs[], arms[], tool, axeHead, pickHead,
   hammerHead, carryMesh (i cargo al carro de comerç).
   ===================================================================== */
const unitRng = mulberry32(0x5eed);
/* Civilització de la unitat que s'està construint (detalls propis de cada una, 11e) */
let RIG_CIV = null;
const ur = (a, b) => a + (b - a) * unitRng();
const upick = (arr) => arr[Math.floor(unitRng() * arr.length)];

/* Gra del material: soroll segons la posició del model (teixit, cuir, metall martellejat), sense textures */
function grainMaterial(m, scale, amount, key) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vGrainP;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vGrainP = position;`);
    shader.fragmentShader = 'varying vec3 vGrainP;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 q = vGrainP * ${scale.toFixed(1)};
        float n = fract(sin(dot(floor(q), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float n2 = fract(sin(dot(floor(q * 2.7 + 1.3), vec3(39.34, 11.13, 83.17))) * 24634.634);
        diffuseColor.rgb *= ${(1 - amount).toFixed(3)} + ${amount.toFixed(3)} * (0.6 * n + 0.4 * n2);
      }`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
const UNIT_MATS = {
  _matte: null, _metal: null,
  get matte() { return this._matte || (this._matte = fogify(grainMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }), 34, 0.14, 'unit-matte'))); },
  get metal() { return this._metal || (this._metal = fogify(grainMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.7 }), 22, 0.1, 'unit-metal'))); },
};

/* Paletes regionals */
const REGION_LOOK = {
  western: { skin: [0xe8b58c, 0xdca57c, 0xf0c49c], hair: [0x5a3a22, 0x3a2616, 0x8a5a2a, 0xb08850], pants: [0x5a4632, 0x4a4a3a, 0x6a5238], boots: 0x3a2616, neutral: [0x8a7a5a, 0x7a6a4a, 0x9a8a6a] },
  middleeast: { skin: [0xc48a58, 0xb07a48, 0xd09a68], hair: [0x1e1612, 0x2a1e16], pants: [0xcfc2a2, 0xbfb08e], boots: 0x6a4a2a, neutral: [0xe8dcc0, 0xd8caa8, 0xe0d0b0] },
  eastasian: { skin: [0xe6b98e, 0xdcae82, 0xecc298], hair: [0x151210, 0x1c1814], pants: [0x2e3440, 0x3a3a44, 0x40382e], boots: 0x5a4632, neutral: [0x6a6a5a, 0x5a5448, 0x7a7060] },
};
const METAL = 0x9ca3ad, DARK_METAL = 0x4a4e55, WOOD = 0x6b4423, LEATHER = 0x5a3a1e, GOLD = 0xd4a83a;

/* ---------- Construcció de l'esquelet ---------- */
function rigPart(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.userData.pieces = [];
  parent.add(g);
  return g;
}
/* Afegeix una peça de color a una part: o = { x, y, z, rx, ry, rz, sx, sy, sz, metal } */
function piece(part, geo, color, o = {}) {
  const g = geo.clone();
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)),
    new THREE.Vector3(o.sx || 1, o.sy || 1, o.sz || 1));
  g.applyMatrix4(m);
  part.userData.pieces.push({ geo: g, color: new THREE.Color(color), metal: !!o.metal });
  return g;
}
/* Converteix les peces de la unitat en malles. Tot el cos va en una sola malla amb esquelet per material
   (mat / metàl·lic): cada part (braç, cama, tors…) és un os, de manera que tota la unitat es dibuixa amb
   una o dues crides en lloc d'una per part. Les parts que s'amaguen i es mostren (eines, càrrega, trabuc
   muntat o desmuntat) queden com a malles pròpies de la seva part. */
const RIG_TOGGLE = new Set(['tool', 'axeHead', 'pickHead', 'hammerHead', 'cargo', 'packedPart', 'deployedPart']);
function bakeRig(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4();
  const skinned = { false: [], true: [] }, bones = [];
  root.traverse(o => {
    const pcs = o.userData.pieces;
    if (!pcs) return;
    let toggle = false;
    for (let a = o; a && a !== root; a = a.parent) if (RIG_TOGGLE.has(a.name)) { toggle = true; break; }
    let bone = -1;
    if (!toggle) { bone = bones.length; bones.push(o); rel.multiplyMatrices(toRoot, o.matrixWorld); }
    for (const metal of [false, true]) {
      const list = pcs.filter(p => p.metal === metal);
      if (!list.length) continue;
      const geos = list.map(p => {
        const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        // Color per vèrtex amb ombrejat: la part baixa de cada peça més fosca (oclusió) i una lleugera variació
        const pos = g.attributes.position;
        if (!g.boundingBox) g.computeBoundingBox();
        const y0 = g.boundingBox.min.y, yh = Math.max(1e-3, g.boundingBox.max.y - y0);
        const col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const f = (0.8 + 0.2 * (pos.getY(i) - y0) / yh) * (0.96 + 0.08 * hash2(pos.getX(i) * 37.1 + pos.getY(i) * 11.3, pos.getZ(i) * 29.7));
          col[i * 3] = p.color.r * f; col[i * 3 + 1] = p.color.g * f; col[i * 3 + 2] = p.color.b * f;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        if (bone >= 0) {
          g.applyMatrix4(rel);                                   // a l'espai de la unitat (postura de repòs)
          const si = new Uint16Array(pos.count * 4), sw = new Float32Array(pos.count * 4);
          for (let i = 0; i < pos.count; i++) { si[i * 4] = bone; sw[i * 4] = 1; }
          g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
          g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
        }
        return g;
      });
      if (bone >= 0) { skinned[metal].push(...geos); continue; }
      const merged = mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, metal ? UNIT_MATS.metal : UNIT_MATS.matte);
      mesh.name = o.name + (metal ? ':metal' : ':matte');
      o.add(mesh);
    }
    delete o.userData.pieces;
  });
  if (!bones.length) return root;
  const skeleton = new THREE.Skeleton(bones);
  for (const metal of [false, true]) {
    if (!skinned[metal].length) continue;
    const geo = mergeGeometries(skinned[metal], false);
    geo.computeBoundingSphere();
    const mesh = new THREE.SkinnedMesh(geo, metal ? UNIT_MATS.metal : UNIT_MATS.matte);
    mesh.name = metal ? 'skin:metal' : 'skin:matte';
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(skeleton, mesh.matrixWorld);
    // Esfera per descartar-la si no surt a la pantalla (la de repòs, amb marge per als moviments)
    mesh.boundingSphere = geo.boundingSphere.clone();
    mesh.boundingSphere.radius *= 1.25;
  }
  return root;
}
/* Còpia d'un model amb esquelet: les malles de la còpia han de moure's amb els ossos de la còpia */
function cloneRig(src) {
  const dst = src.clone(true);
  const a = [], b = [];
  src.traverse(o => a.push(o));
  dst.traverse(o => b.push(o));
  const idx = new Map(a.map((o, i) => [o, i]));
  for (let i = 0; i < b.length; i++) {
    if (!b[i].isSkinnedMesh) continue;
    const sk = a[i].skeleton;
    b[i].bind(new THREE.Skeleton(sk.bones.map(x => b[idx.get(x)]), sk.boneInverses), a[i].bindMatrix);
  }
  return dst;
}

/* Geometries base (unitàries; es transformen a cada peça) */
const UG = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 12),
  sphere: new THREE.SphereGeometry(1, 12, 10),
  hemi: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.28, 6, 14),
  taper(rt, rb, h, seg = 10) { return new THREE.CylinderGeometry(rt, rb, h, seg); },
};
const tapers = new Map();
function taper(rt, rb, h, seg = 10) {
  const k = `${rt}|${rb}|${h}|${seg}`;
  if (!tapers.has(k)) tapers.set(k, new THREE.CylinderGeometry(rt, rb, h, seg));
  return tapers.get(k);
}
function arcGeo(r, tube, arc) {
  const k = `arc${r}|${tube}|${arc}`;
  if (!tapers.has(k)) tapers.set(k, new THREE.TorusGeometry(r, tube, 5, 16, arc));
  return tapers.get(k);
}

/* ---------- Cos humà ---------- */
/* look: { skin, hair, top, top2, pants, boots, skirt (vestit llarg), sleeves, beard } */
function humanBody(rig, look) {
  const torso = rigPart(rig, 'torso');
  const legL = rigPart(rig, 'legL', -0.14, 0.8, 0), legR = rigPart(rig, 'legR', 0.14, 0.8, 0);
  const armL = rigPart(rig, 'armL', -0.35, 1.5, 0), armR = rigPart(rig, 'armR', 0.35, 1.5, 0);
  for (const leg of [legL, legR]) {
    piece(leg, taper(0.11, 0.085, 0.64), look.pants, { y: -0.3 });
    piece(leg, UG.box, look.boots, { y: -0.7, z: 0.04, sx: 0.19, sy: 0.17, sz: 0.3 });
  }
  // Cadera / faldó de la túnica i tors
  if (look.skirt) {
    piece(torso, taper(0.29, 0.36, 0.8, 12), look.skirt, { y: 0.52, sz: 0.86 });
    piece(torso, taper(0.36, 0.37, 0.06, 12), look.pants || look.skirt, { y: 0.14, sz: 0.86 });   // vora del vestit
  }
  else piece(torso, taper(0.3, 0.36, 0.34, 12), look.top2 || look.top, { y: 0.95 });
  piece(torso, taper(0.31, 0.27, 0.55, 12), look.top, { y: 1.3, sz: 0.78 });
  piece(torso, UG.sphere, look.top, { y: 1.5, sx: 0.3, sy: 0.12, sz: 0.24 });
  piece(torso, taper(0.3, 0.3, 0.09, 12), look.belt || LEATHER, { y: 1.08, sz: 0.8 });
  // Coll i cap
  piece(torso, taper(0.075, 0.085, 0.14, 8), look.skin, { y: 1.63 });
  piece(torso, UG.sphere, look.skin, { y: 1.82, sx: 0.185, sy: 0.215, sz: 0.2 });
  piece(torso, UG.box, look.skin, { y: 1.8, z: 0.19, sx: 0.05, sy: 0.08, sz: 0.06 });
  if (look.hair) piece(torso, UG.hemi, look.hair, { y: 1.84, z: -0.02, sx: 0.2, sy: 0.19, sz: 0.21, rx: -0.25 });
  if (look.beard) piece(torso, UG.sphere, look.beard, { y: 1.7, z: 0.1, sx: 0.14, sy: 0.12, sz: 0.1 });
  // Braços
  for (const [arm, s] of [[armL, -1], [armR, 1]]) {
    piece(arm, UG.sphere, look.sleeves || look.top, { y: -0.02, sx: 0.095, sy: 0.1, sz: 0.1 });
    piece(arm, taper(0.08, 0.066, 0.3), look.sleeves || look.top, { y: -0.16 });
    piece(arm, taper(0.066, 0.055, 0.28), look.sleeves || look.top, { y: -0.43 });
    piece(arm, UG.sphere, look.skin, { y: -0.58, sx: 0.075, sy: 0.085, sz: 0.075 });
  }
  return { torso, legL, legR, armL, armR };
}
/* Accessoris de cap */
const HATS = {
  straw(t, c = 0xcfae62) { piece(t, taper(0.42, 0.42, 0.04, 16), c, { y: 2.0 }); piece(t, taper(0.12, 0.2, 0.2, 12), c, { y: 2.1 }); },
  kasa(t, c = 0xc9a860) { piece(t, UG.cone, c, { y: 2.08, sx: 0.5, sy: 0.24, sz: 0.5 }); },
  coif(t, c) { piece(t, UG.sphere, c, { y: 1.86, sx: 0.215, sy: 0.22, sz: 0.225 }); },
  hood(t, c) { piece(t, UG.sphere, c, { y: 1.86, sx: 0.23, sy: 0.24, sz: 0.24 }); piece(t, UG.cone, c, { y: 2.05, z: -0.1, rx: -0.6, sx: 0.14, sy: 0.3, sz: 0.14 }); piece(t, taper(0.3, 0.34, 0.14, 12), c, { y: 1.58, sz: 0.8 }); },
  turban(t, c = 0xf0ece0) { piece(t, UG.torus, c, { y: 1.96, rx: Math.PI / 2, sx: 0.19, sy: 0.19, sz: 0.3 }); piece(t, UG.sphere, c, { y: 2.0, sx: 0.17, sy: 0.12, sz: 0.17 }); },
  keffiyeh(t, c) { piece(t, UG.sphere, c, { y: 1.86, sx: 0.22, sy: 0.23, sz: 0.23 }); piece(t, taper(0.2, 0.3, 0.35, 10), c, { y: 1.62, z: -0.05 }); piece(t, UG.torus, 0x222222, { y: 1.97, rx: Math.PI / 2, sx: 0.17, sy: 0.17, sz: 0.2 }); },
  bun(t, c) { piece(t, UG.sphere, c, { y: 2.02, z: -0.06, sx: 0.1, sy: 0.09, sz: 0.1 }); },
  hachimaki(t, c) { piece(t, taper(0.2, 0.2, 0.05, 12), c, { y: 1.92 }); },
  nasal(t) { piece(t, UG.cone, METAL, { y: 2.02, sx: 0.215, sy: 0.3, sz: 0.215, metal: true }); piece(t, taper(0.215, 0.215, 0.12, 12), METAL, { y: 1.9, metal: true }); piece(t, UG.box, METAL, { y: 1.8, z: 0.2, sx: 0.04, sy: 0.16, sz: 0.03, metal: true }); },
  kettle(t) { piece(t, UG.hemi, DARK_METAL, { y: 1.9, sx: 0.22, sy: 0.2, sz: 0.22, metal: true }); piece(t, taper(0.38, 0.38, 0.03, 16), DARK_METAL, { y: 1.92, metal: true }); },
  greathelm(t, team) { piece(t, taper(0.22, 0.23, 0.36, 12), METAL, { y: 1.86, metal: true }); piece(t, UG.box, 0x111111, { y: 1.9, z: 0.21, sx: 0.26, sy: 0.03, sz: 0.03 }); piece(t, UG.box, team, { y: 2.08, sx: 0.04, sy: 0.12, sz: 0.25 }); },
  spangen(t, wrap = 0xf0ece0) { piece(t, UG.cone, METAL, { y: 2.06, sx: 0.21, sy: 0.4, sz: 0.21, metal: true }); piece(t, UG.torus, wrap, { y: 1.93, rx: Math.PI / 2, sx: 0.2, sy: 0.2, sz: 0.2 }); piece(t, taper(0.22, 0.28, 0.24, 10), 0x777b82, { y: 1.72, z: -0.03, metal: true }); },
  kabuto(t, crest = GOLD) { piece(t, UG.hemi, 0x2a2622, { y: 1.9, sx: 0.23, sy: 0.22, sz: 0.23, metal: true }); piece(t, taper(0.26, 0.36, 0.14, 12), 0x2a2622, { y: 1.8, z: -0.04, metal: true }); piece(t, UG.box, crest, { y: 2.12, z: 0.14, sx: 0.36, sy: 0.12, sz: 0.02, rx: -0.3, metal: true }); },
  jingasa(t) { piece(t, UG.cone, 0x2a2622, { y: 2.05, sx: 0.4, sy: 0.16, sz: 0.4, metal: true }); },
  // Propis de cada civilització
  beret(t, c) { piece(t, UG.sphere, c, { y: 1.99, x: 0.03, sx: 0.25, sy: 0.07, sz: 0.25, rz: -0.18 }); },
  barretina(t, c = 0xb0201a) { piece(t, taper(0.2, 0.21, 0.12, 12), c, { y: 1.95 }); piece(t, UG.cone, c, { y: 2.1, x: 0.08, rz: -0.95, sx: 0.17, sy: 0.38, sz: 0.17 }); },
  pileus(t, c) { piece(t, UG.hemi, c, { y: 1.9, sx: 0.22, sy: 0.17, sz: 0.22 }); },
  furhat(t, c) { piece(t, UG.cone, c, { y: 2.12, sx: 0.17, sy: 0.32, sz: 0.17 }); piece(t, UG.torus, 0x5a4030, { y: 1.96, rx: Math.PI / 2, sx: 0.2, sy: 0.2, sz: 0.36 }); piece(t, UG.sphere, 0xc42a1e, { y: 2.3, sx: 0.04, sy: 0.04, sz: 0.04 }); },
  douli(t) { piece(t, UG.cone, 0xcfae62, { y: 2.03, sx: 0.58, sy: 0.15, sz: 0.58 }); },
  kamilavka(t) { piece(t, taper(0.19, 0.19, 0.24, 12), 0x151210, { y: 2.0 }); piece(t, taper(0.23, 0.23, 0.03, 12), 0x151210, { y: 2.13 }); },
  lamahat(t) { piece(t, UG.cone, 0xe0b030, { y: 2.12, sx: 0.2, sy: 0.42, sz: 0.2 }); piece(t, UG.box, 0xe0b030, { y: 2.08, z: -0.06, sx: 0.07, sy: 0.32, sz: 0.38, rx: -0.25 }); },
  chinahelm(t, tassel = 0xc42a1e) { piece(t, UG.hemi, DARK_METAL, { y: 1.9, sx: 0.23, sy: 0.22, sz: 0.23, metal: true }); piece(t, taper(0.24, 0.3, 0.12, 12), 0x7a1c14, { y: 1.82, z: -0.04 }); piece(t, UG.cone, DARK_METAL, { y: 2.18, sx: 0.04, sy: 0.16, sz: 0.04, metal: true }); piece(t, UG.cone, tassel, { y: 2.12, sx: 0.09, sy: 0.12, sz: 0.09, rx: Math.PI }); },
  futou(t) { piece(t, UG.hemi, 0x151210, { y: 1.9, sx: 0.21, sy: 0.2, sz: 0.21 }); piece(t, UG.box, 0x151210, { y: 1.98, z: -0.12, sx: 0.56, sy: 0.04, sz: 0.05 }); },
  crest(t, c) { piece(t, UG.box, c, { y: 2.3, sx: 0.05, sy: 0.16, sz: 0.4 }); },
};
/* Senyal de la civilització sobre un escut (kite: cara cap a +Z; round: cara cap a −X) */
function shieldMark(arm, shape) {
  const C = RIG_CIV;
  if (!C) return;
  const at = (dx, dy, w, h, color, o = {}) => piece(arm, UG.box, color, shape === 'kite'
    ? { x: -0.1 + dx, y: -0.25 + dy, z: 0.145, sx: w, sy: h, sz: 0.015, ...o }
    : { x: -0.13, y: -0.36 + dy, z: 0.06 + dx, sx: w, sy: h, sz: 0.015, ry: Math.PI / 2, ...o });
  if (C === 'franks') { at(0, 0.03, 0.04, 0.17, GOLD); at(0, -0.02, 0.15, 0.03, GOLD); for (const s of [-1, 1]) at(s * 0.06, 0.04, 0.03, 0.09, GOLD); }
  else if (C === 'britons') for (const dy of [0.1, 0.02, -0.06]) at(0, dy, 0.15, 0.035, GOLD);
  else if (C === 'catalans') { at(0, 0, 0.2, 0.3, 0xe8c040); for (const dx of [-0.075, -0.025, 0.025, 0.075]) at(dx, 0, 0.022, 0.3, 0xc42a1e, shape === 'kite' ? { z: 0.152 } : { x: -0.137 }); }
  else if (C === 'byzantines') { at(0, 0.02, 0.045, 0.28, GOLD); at(0, 0.08, 0.22, 0.045, GOLD); }
  else if (C === 'saracens') piece(arm, arcGeo(0.09, 0.02, Math.PI * 1.3), 0xf2ece0, shape === 'kite' ? { x: -0.1, y: -0.22, z: 0.145, rz: 0.9 } : { x: -0.13, y: -0.24, z: 0.06, ry: Math.PI / 2, rz: 0.9 });
}
/* Barrets de soldat propis de cada civilització (retorna true si n'hi ha posat un) */
const CIV_SOLDIER_HAT = {
  franks(t, base, tier) { if (base === 'archer' && !tier) { HATS.hood(t, 0x6a4a2a); return true; } return false; },
  catalans(t, base, tier) { if ((base === 'spearman' || base === 'skirmisher' || base === 'archer') && !tier) { HATS.barretina(t); return true; } return false; },
  byzantines(t, base, tier, T) {
    if ((base === 'archer' || base === 'skirmisher' || base === 'cavarcher') && !tier) HATS.pileus(t, 0x6a4a30);
    else { HATS.spangen(t, 0x9ca3ad); HATS.crest(t, base === 'knight' || tier >= 2 ? GOLD : T.color); }
    return true;
  },
  mongols(t, base, tier, T) {
    if (base === 'archer' || base === 'scout' || base === 'cavarcher' || base === 'skirmisher') HATS.furhat(t, T.color);
    else { HATS.spangen(t, 0x5a4030); piece(t, UG.cone, 0xc42a1e, { y: 2.32, sx: 0.07, sy: 0.12, sz: 0.07, rx: Math.PI }); }
    return true;
  },
  chinese(t, base, tier) { if ((base === 'archer' || base === 'skirmisher') && !tier) HATS.futou(t); else HATS.chinahelm(t); return true; },
};
/* Armes i escuts (a la mà) */
const WEAPONS = {
  sword(arm, curved = false) {
    if (curved) {
      // Simitarra: fulla que s'eixampla i es corba cap a la punta
      piece(arm, UG.box, METAL, { y: -0.6, z: 0.36, sx: 0.05, sy: 0.02, sz: 0.52, metal: true });
      piece(arm, UG.box, METAL, { y: -0.56, z: 0.72, sx: 0.07, sy: 0.02, sz: 0.3, rx: -0.35, metal: true });
    } else piece(arm, UG.box, METAL, { y: -0.6, z: 0.45, sx: 0.05, sy: 0.02, sz: 0.72, metal: true });
    piece(arm, UG.box, DARK_METAL, { y: -0.6, z: 0.08, sx: 0.24, sy: 0.04, sz: 0.04, metal: true });
    piece(arm, taper(0.025, 0.025, 0.16, 6), LEATHER, { y: -0.6, z: -0.02, rx: Math.PI / 2 });
  },
  greatsword(arm, arch) {
    const col = arch === 'eastasian' ? 0xc8ccd2 : METAL;
    piece(arm, UG.box, col, { y: -0.6, z: 0.7, sx: arch === 'eastasian' ? 0.04 : 0.07, sy: 0.02, sz: 1.2, rx: arch === 'eastasian' ? -0.06 : 0, metal: true });
    piece(arm, UG.box, arch === 'eastasian' ? GOLD : DARK_METAL, { y: -0.6, z: 0.08, sx: arch === 'eastasian' ? 0.1 : 0.34, sy: 0.05, sz: 0.05, metal: true });
    piece(arm, taper(0.025, 0.025, 0.34, 6), arch === 'eastasian' ? 0x1a1a1a : LEATHER, { y: -0.6, z: -0.12, rx: Math.PI / 2 });
  },
  halberd(arm) {
    const rx = Math.PI / 2 - 0.25, dy = Math.cos(rx), dz = Math.sin(rx), len = 3.0;
    piece(arm, taper(0.025, 0.025, len, 6), WOOD, { y: -0.6, z: 0.35, rx });
    const tipY = -0.6 + dy * (len / 2), tipZ = 0.35 + dz * (len / 2);
    piece(arm, UG.box, METAL, { y: tipY - 0.05, z: tipZ - 0.1, x: 0.1, sx: 0.2, sy: 0.02, sz: 0.3, rx, metal: true });
    piece(arm, UG.cone, METAL, { y: tipY + dy * 0.18, z: tipZ + dz * 0.18, rx, sx: 0.05, sy: 0.3, sz: 0.05, metal: true });
  },
  handgun(arm) {
    // Canó de mà: tub de ferro amb boca eixamplada sobre una culata de fusta
    piece(arm, UG.box, WOOD, { y: -0.58, z: 0.12, sx: 0.07, sy: 0.08, sz: 0.5 });
    piece(arm, taper(0.035, 0.04, 0.9, 8), DARK_METAL, { y: -0.52, z: 0.7, rx: Math.PI / 2, metal: true });
    piece(arm, taper(0.05, 0.04, 0.08, 8), DARK_METAL, { y: -0.52, z: 1.14, rx: Math.PI / 2, metal: true });
    piece(arm, taper(0.012, 0.012, 0.2, 5), 0x3a2e24, { y: -0.44, z: 0.36, rx: 0.4 });   // metxa
  },
  keg(torso) {
    // Petard: barril d'explosius als braços amb la metxa
    piece(torso, taper(0.2, 0.2, 0.36, 12), 0x5a3a22, { y: 1.0, z: 0.38, rx: Math.PI / 2 });
    for (const dz of [-0.12, 0.12]) piece(torso, taper(0.206, 0.206, 0.03, 12), DARK_METAL, { y: 1.0, z: 0.38 + dz, rx: Math.PI / 2, metal: true });
    piece(torso, taper(0.01, 0.01, 0.3, 4), 0x1a1410, { y: 1.26, z: 0.42, rx: 0.5 });
  },
  crossbow(arm) {
    piece(arm, UG.box, WOOD, { y: -0.58, z: 0.3, sx: 0.07, sy: 0.07, sz: 0.7 });
    piece(arm, arcGeo(0.34, 0.022, Math.PI * 0.8), 0x3a2e24, { y: -0.58, z: 0.62, rx: Math.PI / 2, rz: Math.PI * 0.1 });
    piece(arm, UG.box, 0xe8e0d0, { y: -0.55, z: 0.56, sx: 0.62, sy: 0.01, sz: 0.01 });
  },
  javelins(arm) {
    for (let i = -1; i <= 1; i++) piece(arm, taper(0.018, 0.018, 1.4, 5), WOOD, { y: -0.6, x: i * 0.04, z: 0.3, rx: Math.PI / 2 - 0.3 });
  },
  pavise(torso, team) {
    piece(torso, UG.box, team, { y: 1.2, z: -0.34, sx: 0.55, sy: 0.9, sz: 0.05 });
    piece(torso, UG.box, 0xe8dcc0, { y: 1.2, z: -0.37, sx: 0.12, sy: 0.7, sz: 0.02 });
  },
  axe(arm) {
    piece(arm, taper(0.025, 0.025, 0.55, 6), WOOD, { y: -0.6, z: 0.22, rx: Math.PI / 2 });
    piece(arm, UG.box, 0xa8adb5, { y: -0.52, z: 0.46, sx: 0.04, sy: 0.2, sz: 0.14, metal: true });
  },
  katana(arm) {
    piece(arm, UG.box, 0xc8ccd2, { y: -0.6, z: 0.5, sx: 0.035, sy: 0.018, sz: 0.8, rx: -0.06, metal: true });
    piece(arm, taper(0.05, 0.05, 0.02, 10), GOLD, { y: -0.6, z: 0.09, rx: Math.PI / 2, metal: true });
    piece(arm, taper(0.022, 0.022, 0.22, 6), 0x1a1a1a, { y: -0.6, z: -0.04, rx: Math.PI / 2 });
  },
  spear(arm, len = 2.4, tip = METAL) {
    const rx = Math.PI / 2 - 0.25, dy = Math.cos(rx), dz = Math.sin(rx);
    piece(arm, taper(0.025, 0.025, len, 6), WOOD, { y: -0.6, z: 0.35, rx });
    piece(arm, UG.cone, tip, { y: -0.6 + dy * (len / 2 + 0.12), z: 0.35 + dz * (len / 2 + 0.12), rx, sx: 0.055, sy: 0.28, sz: 0.055, metal: true });
  },
  kite(arm, team) {
    piece(arm, UG.cone, team, { y: -0.35, x: -0.1, z: 0.08, rz: Math.PI, sx: 0.3, sy: 0.75, sz: 0.06 });
    piece(arm, UG.sphere, team, { y: -0.08, x: -0.1, z: 0.08, sx: 0.3, sy: 0.14, sz: 0.06 });
    piece(arm, UG.box, 0xe8dcc0, { y: -0.3, x: -0.12, z: 0.1, sx: 0.04, sy: 0.4, sz: 0.02 });
  },
  round(arm, team, boss = METAL) {
    piece(arm, taper(0.32, 0.32, 0.05, 16), team, { y: -0.36, x: -0.1, z: 0.06, rz: Math.PI / 2 });
    piece(arm, UG.sphere, boss, { y: -0.36, x: -0.14, z: 0.06, sx: 0.07, sy: 0.07, sz: 0.07, metal: true });
    piece(arm, UG.torus, DARK_METAL, { y: -0.36, x: -0.1, z: 0.06, ry: Math.PI / 2, sx: 0.31, sy: 0.31, sz: 0.1, metal: true });
  },
  bow(arm, kind = 'long') {
    if (kind === 'yumi') {
      piece(arm, arcGeo(1.0, 0.02, 1.35), 0x2a1a12, { y: -0.3, z: 0.15, rx: 0, ry: Math.PI / 2, rz: Math.PI / 2 + 0.35 });
    } else if (kind === 'recurve') {
      piece(arm, arcGeo(0.45, 0.025, Math.PI * 0.9), 0x5a3a1e, { y: -0.58, z: 0.15, ry: Math.PI / 2, rz: Math.PI / 2 + 0.15 });
      for (const s of [-1, 1]) piece(arm, UG.box, 0x3a2616, { y: -0.58 + s * 0.44, z: 0.24, sx: 0.03, sy: 0.14, sz: 0.03, rx: s * 0.6 });
    } else piece(arm, arcGeo(0.65, 0.025, Math.PI * 0.95), WOOD, { y: -0.58, z: 0.15, ry: Math.PI / 2, rz: Math.PI / 2 + 0.08 });
  },
  quiver(torso, c = LEATHER) {
    piece(torso, taper(0.1, 0.09, 0.6, 8), c, { x: 0.15, y: 1.35, z: -0.3, rx: 0.3 });
    for (let i = 0; i < 4; i++) piece(torso, UG.box, 0xe8e0d0, { x: 0.1 + i * 0.03, y: 1.7, z: -0.4, sx: 0.02, sy: 0.14, sz: 0.02, rx: 0.3 });
  },
};

/* ---------- Aldeà ---------- */
function buildVillagerRig(team, arch, female) {
  const L = REGION_LOOK[arch], T = teamOf(team);
  const rig = new THREE.Group();
  const skin = upick(L.skin), hair = upick(L.hair);
  let look;
  if (arch === 'middleeast') look = { skin, hair: female ? null : hair, top: female ? T.colorDark : T.color, top2: T.color, skirt: upick(L.neutral), pants: upick(L.pants), boots: L.boots, sleeves: upick(L.neutral), belt: T.colorDark, beard: female ? null : hair };
  else if (arch === 'eastasian') look = { skin, hair, top: T.color, top2: T.colorDark, pants: upick(L.pants), boots: L.boots, skirt: female ? T.colorDark : null, belt: 0x2a2a2a };
  else look = { skin, hair, top: T.color, top2: T.colorDark, pants: upick(L.pants), boots: L.boots, skirt: female ? upick(L.neutral) : null, belt: LEATHER, beard: !female && unitRng() < 0.4 ? hair : null };
  const C = RIG_CIV;
  // Roba pròpia: deel mongol (abric llarg i faixa), túnica bizantina, jaqueta xinesa de coll creuat
  if (C === 'mongols') look = { ...look, top: T.color, top2: T.colorDark, skirt: T.colorDark, sleeves: T.color, belt: 0xd8902a, pants: 0x4a3a2a, boots: 0x3a2616 };
  else if (C === 'byzantines') look = { ...look, skirt: female ? T.colorDark : upick(L.neutral), sleeves: female ? T.color : look.sleeves, belt: GOLD };
  else if (C === 'chinese') look = { ...look, skirt: T.colorDark, belt: 0x7a1c14 };
  const P = humanBody(rig, look);
  if (C === 'mongols') HATS.furhat(P.torso, female ? T.colorDark : T.color);
  else if (C === 'byzantines') (female ? HATS.coif(P.torso, 0xefe8d8) : HATS.pileus(P.torso, 0x6a4a30));
  else if (C === 'chinese') (female ? HATS.bun(P.torso, hair) : HATS.douli(P.torso));
  else if (arch === 'middleeast') (female ? HATS.coif(P.torso, T.colorDark) : HATS.turban(P.torso));
  else if (arch === 'eastasian') (female ? HATS.bun(P.torso, hair) : HATS.kasa(P.torso));
  else if (female) { HATS.coif(P.torso, 0xefe8d8); piece(P.torso, UG.box, 0xefe8d8, { y: 0.8, z: 0.33, sx: 0.4, sy: 0.6, sz: 0.03 }); }
  else if (C === 'franks') HATS.beret(P.torso, 0x2a3a5a);
  else if (C === 'catalans') HATS.barretina(P.torso);
  else HATS.straw(P.torso);
  // Eina (visible només treballant) i càrrega
  const tool = rigPart(P.armR, 'tool', 0, -0.6, 0);
  piece(tool, taper(0.03, 0.03, 0.8, 6), WOOD, { z: 0.3, rx: Math.PI / 2 });
  const axe = rigPart(tool, 'axeHead'); piece(axe, UG.box, 0xb8bcc4, { y: 0.1, z: 0.66, sx: 0.05, sy: 0.3, sz: 0.22, metal: true });
  const pick = rigPart(tool, 'pickHead'); piece(pick, UG.box, 0x8d9199, { z: 0.68, sx: 0.06, sy: 0.5, sz: 0.07, metal: true });
  const hammer = rigPart(tool, 'hammerHead'); piece(hammer, UG.box, 0x55504a, { z: 0.7, sx: 0.14, sy: 0.14, sz: 0.26, metal: true });
  return rig;
}

/* ---------- Monjo ----------
   Occident: hàbit marró amb caputxa i bàcul amb creu · Orient Mitjà: túnica blanca i turbant,
   bàcul amb mitja lluna · Àsia oriental: hàbit safrà, cap rapat i bàcul de monjo budista amb anelles */
function buildMonkRig(team, arch) {
  const L = REGION_LOOK[arch], T = teamOf(team);
  const rig = new THREE.Group();
  const skin = upick(L.skin);
  let look;
  if (arch === 'middleeast') look = { skin, hair: null, beard: 0xd8d4cc, top: 0xeee8d8, top2: 0xeee8d8, skirt: 0xe6dfcc, sleeves: 0xeee8d8, pants: 0xe6dfcc, boots: 0x6a4a2a, belt: T.color };
  else if (arch === 'eastasian') look = { skin, hair: null, top: 0xd8862a, top2: 0xc9761e, skirt: 0xc9761e, sleeves: 0xd8862a, pants: 0x8a5a2a, boots: 0x5a4632, belt: 0x6a4a2a };
  else look = { skin, hair: 0x6a5a48, top: 0x5a4030, top2: 0x5a4030, skirt: 0x503828, sleeves: 0x5a4030, pants: 0x4a3426, boots: 0x3a2616, belt: 0xd8cca8, beard: unitRng() < 0.5 ? 0x8a7a68 : null };
  // Ordes propis: benedictins negres (Britons), cistercencs blancs (Catalans), franciscans marrons (Francs),
  // monjos ortodoxos (Bizantins), lames (Mongols), budistes zen negres (Japonesos) i Shaolin safrà (Xinesos)
  const C = RIG_CIV, robe = (a, b, c) => ({ ...look, top: a, top2: a, sleeves: a, skirt: b, pants: c || b });
  if (C === 'britons') look = { ...robe(0x22201e, 0x1c1a18), belt: 0x8a7a68 };
  else if (C === 'catalans') look = { ...robe(0xe8e2d4, 0xdcd4c2, 0x2a2622), belt: 0x2a2622 };
  else if (C === 'byzantines') look = { ...robe(0x1c1a1a, 0x161414), beard: 0x9a9088, belt: GOLD };
  else if (C === 'mongols') look = { ...robe(0x7a1e22, 0x6a1a1e), hair: null, beard: null, belt: 0xe0b030 };
  else if (C === 'japanese') look = { ...robe(0x1c1a1a, 0x1c1a1a, 0x2a2622) };
  const P = humanBody(rig, look);
  const t = P.torso;
  // Estola amb el color de l'equip
  for (const sx of [-1, 1]) piece(t, UG.box, T.color, { x: sx * 0.11, y: 1.08, z: 0.27, sx: 0.08, sy: 0.9, sz: 0.03 });
  if (C === 'byzantines') {
    HATS.kamilavka(t);
    piece(t, UG.box, GOLD, { y: 1.3, z: 0.3, sx: 0.04, sy: 0.2, sz: 0.02, metal: true });
    piece(t, UG.box, GOLD, { y: 1.35, z: 0.3, sx: 0.14, sy: 0.04, sz: 0.02, metal: true });
  } else if (C === 'mongols') {
    HATS.lamahat(t);
    piece(t, UG.box, 0xe0b030, { x: 0.12, y: 1.3, z: 0.02, sx: 0.5, sy: 0.12, sz: 0.62, rz: -0.8 });
  } else if (arch === 'western') {
    const hood = C === 'britons' ? 0x1c1a18 : C === 'catalans' ? 0x2a2622 : 0x4a3426;
    piece(t, UG.cone, hood, { y: 1.72, z: -0.24, rx: -2.6, sx: 0.2, sy: 0.3, sz: 0.12 });   // caputxa abaixada
    piece(t, taper(0.3, 0.34, 0.12, 12), hood, { y: 1.58, sz: 0.85 });
    piece(t, UG.box, GOLD, { y: 1.3, z: 0.3, sx: 0.04, sy: 0.18, sz: 0.02, metal: true });
    piece(t, UG.box, GOLD, { y: 1.34, z: 0.3, sx: 0.12, sy: 0.04, sz: 0.02, metal: true });
  } else if (arch === 'middleeast') {
    HATS.turban(t, 0xf6f2e6);
    piece(t, UG.box, 0x3a7a4a, { y: 1.32, z: -0.24, sx: 0.5, sy: 0.7, sz: 0.03, rx: 0.1 });
  } else {
    piece(t, UG.box, 0xc9761e, { x: 0.12, y: 1.3, z: 0.02, sx: 0.5, sy: 0.12, sz: 0.62, rz: -0.8 });   // kesa creuada
    piece(t, UG.torus, 0x3a2418, { y: 1.52, z: 0.1, rx: Math.PI / 2 - 0.3, sx: 0.19, sy: 0.19, sz: 0.4 });   // rosari
  }
  // Bàcul (a la mà dreta, vertical)
  const staff = P.armR;
  piece(staff, taper(0.03, 0.035, 2.2, 6), arch === 'eastasian' ? 0x2a2018 : WOOD, { y: -0.35, z: 0.14 });
  const staffKind = C === 'byzantines' ? 'western' : C === 'mongols' ? 'eastasian' : arch;
  if (staffKind === 'western') {
    piece(staff, UG.box, GOLD, { y: 0.82, z: 0.14, sx: 0.05, sy: 0.34, sz: 0.05, metal: true });
    piece(staff, UG.box, GOLD, { y: 0.88, z: 0.14, sx: 0.24, sy: 0.05, sz: 0.05, metal: true });
  } else if (staffKind === 'middleeast') {
    piece(staff, arcGeo(0.12, 0.022, Math.PI * 1.4), GOLD, { y: 0.84, z: 0.14, rz: -0.9, metal: true });
  } else {
    piece(staff, UG.torus, GOLD, { y: 0.82, z: 0.14, ry: Math.PI / 2, sx: 0.14, sy: 0.18, sz: 0.1, metal: true });
    for (const s of [-1, 1]) piece(staff, UG.torus, GOLD, { x: s * 0.1, y: 0.72, z: 0.14, ry: Math.PI / 2, sx: 0.05, sy: 0.05, sz: 0.05, metal: true });
  }
  // Llibre a la mà esquerra
  piece(P.armL, UG.box, arch === 'eastasian' ? 0xe8dcc0 : 0x6a2a1a, { y: -0.6, z: 0.1, sx: 0.08, sy: 0.24, sz: 0.18 });
  return rig;
}

/* Proporcions realistes: el cap i el que hi porta (cascs, barrets) s'encongeixen cap al coll
   (el cos fa unes 7 caps d'alçada, no 5 com un ninot) */
function refineHead(torso, k = 0.78) {
  const pcs = torso.userData.pieces;
  if (!pcs) return;
  const c = new THREE.Vector3(0, 1.69, 0), box = new THREE.Box3(), ctr = new THREE.Vector3();
  const m = new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  for (const p of pcs) {
    box.setFromBufferAttribute(p.geo.attributes.position);
    box.getCenter(ctr);
    if (ctr.y > 1.7 && Math.abs(ctr.z) < 0.28) p.geo.applyMatrix4(m);
  }
}

/* ---------- Soldats ---------- */
function soldierLook(arch, team, kind) {
  const L = REGION_LOOK[arch], T = teamOf(team);
  const base = { skin: upick(L.skin), hair: upick(L.hair), pants: upick(L.pants), boots: L.boots, belt: LEATHER };
  if (kind === 'throwingaxe') return { ...base, top: T.color, top2: 0x7a5a38, sleeves: 0x8a7a5a, beard: base.hair };
  if (kind === 'mameluke') return { ...base, top: T.color, top2: 0xe8dcc0, sleeves: 0xe8dcc0, beard: base.hair };
  if (kind === 'samurai') return { ...base, top: T.color, top2: 0x2a2622, sleeves: 0x2a2622 };
  if (arch === 'western') {
    if (kind === 'archer') return { ...base, top: 0x5a6a3a, top2: T.color, sleeves: 0x6a5a3a };
    if (kind === 'spearman') return { ...base, top: T.color, top2: 0xb8a882, sleeves: 0xb8a882 };
    if (kind === 'scout') return { ...base, top: 0x7a5a38, top2: T.color, sleeves: 0x7a5a38 };
    return { ...base, top: T.color, top2: T.colorDark, sleeves: 0x8a9098, beard: unitRng() < 0.5 ? base.hair : null };
  }
  if (arch === 'middleeast') {
    const robe = upick(L.neutral);
    if (kind === 'archer' || kind === 'scout') return { ...base, top: T.color, top2: robe, sleeves: robe, beard: base.hair };
    return { ...base, top: T.color, top2: 0x8a9098, sleeves: 0x8a9098, skirt: robe, beard: base.hair };
  }
  // Àsia oriental: armadura lacada (negra al Japó, vermella a la Xina) i hakama
  const lac = RIG_CIV === 'chinese' ? 0x7a1c14 : 0x2a2622;
  if (kind === 'archer') return { ...base, top: T.color, top2: lac, sleeves: 0xe8e0d0 };
  return { ...base, top: T.color, top2: lac, sleeves: lac };
}
/* Roba pròpia per sobre de la de l'arquitectura */
function civSoldierLook(look, team) {
  const T = teamOf(team);
  if (RIG_CIV === 'mongols') return { ...look, skirt: T.colorDark, sleeves: 0x7a5a38, belt: 0xd8902a, pants: 0x4a3a2a, boots: 0x3a2616 };
  if (RIG_CIV === 'byzantines') return { ...look, skirt: look.skirt ? T.colorDark : null, belt: GOLD };
  return look;
}
/* Detalls d'armadura sobre el tors */
/* Aspecte base de cada unitat millorada (la línia) i nivell d'equipament */
const VIS_BASE = {
  manatarms: 'militia', longsword: 'militia', twohanded: 'militia', champion: 'militia',
  pikeman: 'spearman', halberdier: 'spearman', crossbow: 'archer', arbalester: 'archer',
  eliteskirm: 'skirmisher', heavycavarcher: 'cavarcher', lightcav: 'scout', hussar: 'scout',
  cavalier: 'knight', paladin: 'knight', heavycamel: 'camel', king: 'knight',
  longbowman: 'archer', cataphract: 'knight', mangudai: 'cavarcher', chukonu: 'archer',
};
/* Nivell d'equipament de les unitats úniques que fan servir l'aspecte d'una línia */
const UNIQUE_TIER = { cataphract: 2, chukonu: 1 };
function armorDetails(torso, arch, team, kind, tier = 0) {
  const T = teamOf(team);
  const heavy = kind === 'militia' || kind === 'knight' || kind === 'throwingaxe' || (tier >= 1 && kind !== 'archer' && kind !== 'skirmisher' && kind !== 'cavarcher');
  if (arch === 'western' && heavy) {
    piece(torso, taper(0.32, 0.36, 0.5, 12), tier >= 3 ? 0xb4bac2 : 0x8a9098, { y: 1.28, sz: 0.8, metal: true });
    piece(torso, taper(0.33, 0.37, 0.7, 12), T.color, { y: 1.02, sz: 0.84 });
    piece(torso, taper(0.332, 0.332, 0.05, 12), 0xd8cca8, { y: 0.69, sz: 0.85 });
  }
  if (arch === 'middleeast' && (heavy || kind === 'spearman' || kind === 'mameluke')) {
    piece(torso, taper(0.32, 0.35, 0.46, 12), tier >= 3 ? 0xb4bac2 : 0x8a9098, { y: 1.3, sz: 0.8, metal: true });
    piece(torso, UG.box, T.color, { y: 1.25, z: 0.2, sx: 0.36, sy: 0.5, sz: 0.04 });
  }
  if (arch === 'eastasian' && kind !== 'archer' && kind !== 'mameluke' && kind !== 'throwingaxe' && kind !== 'skirmisher') {
    // Dō lacat amb cordons de l'equip i faldons (lacat vermell a la Xina)
    const lac = RIG_CIV === 'chinese' ? 0x7a1c14 : 0x2a2622;
    for (let i = 0; i < 4; i++) piece(torso, taper(0.33 - i * 0.005, 0.34, 0.12, 12), i % 2 ? lac : T.colorDark, { y: 1.12 + i * 0.12, sz: 0.8, metal: i % 2 === 1 });
    for (const s of [-1, 1]) piece(torso, UG.box, lac, { x: s * 0.36, y: 1.48, sx: 0.2, sy: 0.08, sz: 0.3, rz: s * 0.3, metal: true });
    piece(torso, UG.box, T.color, { y: 0.9, z: 0.28, sx: 0.4, sy: 0.3, sz: 0.04 });
  }
  // Nivells alts: espatlleres i braçals de metall
  if (tier >= 2 && kind !== 'archer' && kind !== 'skirmisher') for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) piece(torso, UG.box, arch === 'eastasian' ? 0x2a2622 : 0xa8adb5, { x: s * (0.34 + i * 0.02), y: 1.52 - i * 0.07, sx: 0.16, sy: 0.035, sz: 0.24, rz: s * -(0.45 + i * 0.1), metal: true });
  }
  if (tier >= 1 && (kind === 'archer' || kind === 'skirmisher' || kind === 'cavarcher')) piece(torso, taper(0.31, 0.34, 0.4, 12), arch === 'eastasian' ? 0x3a3028 : 0x7a6a4a, { y: 1.3, sz: 0.8 });
}
function buildSoldierRig(kind, team, arch) {
  const T = teamOf(team);
  const rig = new THREE.Group();
  const tier = UNIQUE_TIER[kind] ?? ((CONFIG.UNITS[kind] && CONFIG.UNITS[kind].tier) || 0);
  const base = VIS_BASE[kind] || kind;
  const look = civSoldierLook(soldierLook(arch, team, base), team);
  if (tier >= 2 && (base === 'militia' || base === 'knight')) look.sleeves = arch === 'eastasian' ? 0x2a2622 : 0x9ca3ad;
  const P = humanBody(rig, look);
  armorDetails(P.torso, arch, team, base, tier);
  const t = P.torso;
  // Rei (regicidi): mantell, corona i ceptre
  if (kind === 'king') {
    piece(t, UG.box, T.color, { y: 1.05, z: -0.3, sx: 0.66, sy: 1.1, sz: 0.05, rx: 0.12 });
    piece(t, taper(0.32, 0.3, 0.1, 12), 0xf2eee4, { y: 1.58, sz: 0.85 });
    if (arch === 'eastasian') {
      piece(t, taper(0.2, 0.2, 0.22, 12), 0x151210, { y: 2.0 });
      piece(t, UG.box, 0x151210, { y: 2.15, z: -0.12, sx: 0.06, sy: 0.3, sz: 0.1 });
    } else if (arch === 'middleeast') {
      HATS.turban(t, 0xf6f2e6);
      piece(t, UG.sphere, 0x2a8a5a, { y: 2.0, z: 0.18, sx: 0.05, sy: 0.05, sz: 0.03, metal: true });
      piece(t, UG.cone, GOLD, { y: 2.18, sx: 0.04, sy: 0.18, sz: 0.04, metal: true });
    } else {
      piece(t, taper(0.2, 0.19, 0.12, 12), GOLD, { y: 2.0, metal: true });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; piece(t, UG.cone, GOLD, { x: Math.sin(a) * 0.17, y: 2.12, z: Math.cos(a) * 0.17, sx: 0.04, sy: 0.12, sz: 0.04, metal: true }); }
    }
    piece(P.armR, taper(0.025, 0.025, 0.9, 6), GOLD, { y: -0.6, z: 0.3, rx: Math.PI / 2 - 0.5, metal: true });
    piece(P.armR, UG.sphere, GOLD, { y: -0.4, z: 0.68, sx: 0.07, sy: 0.07, sz: 0.07, metal: true });
    return { rig, parts: P };
  }
  // Unitats úniques
  if (kind === 'throwingaxe') {
    HATS.coif(t, 0x7a5a38);
    WEAPONS.axe(P.armR);
    for (const s of [-1, 1]) piece(t, UG.box, 0x9ca3ad, { x: s * 0.2, y: 1.02, z: 0.26, sx: 0.03, sy: 0.14, sz: 0.1, metal: true });
    piece(t, taper(0.3, 0.3, 0.05, 14), T.color, { x: 0, y: 1.3, z: -0.3, rx: Math.PI / 2 });
    return { rig, parts: P };
  }
  if (kind === 'mameluke') {
    HATS.turban(t, 0xf0ece0);
    piece(t, UG.box, T.color, { y: 1.3, z: -0.25, sx: 0.5, sy: 0.7, sz: 0.04, rx: 0.15 });
    WEAPONS.sword(P.armR, true);
    return { rig, parts: P };
  }
  if (kind === 'almogaver') {
    // Almogàver: barretina, samarreta curta, azcones a la mà i escut rodó amb els colors de l'equip
    HATS.barretina(t);
    WEAPONS.javelins(P.armR);
    WEAPONS.round(P.armL, T.color, WOOD);
    shieldMark(P.armL, 'round');
    piece(t, UG.box, 0xd8b830, { y: 1.15, z: 0.27, sx: 0.08, sy: 0.5, sz: 0.02 });   // franja groga (senyal)
    return { rig, parts: P };
  }
  if (kind === 'samurai') {
    HATS.kabuto(t, GOLD);
    WEAPONS.katana(P.armR);
    // Sashimono: bandera a l'esquena amb el color de l'equip
    piece(t, taper(0.02, 0.02, 1.4, 6), 0x2a2622, { y: 2.1, z: -0.3 });
    piece(t, UG.box, T.color, { x: 0.13, y: 2.45, z: -0.3, sx: 0.25, sy: 0.6, sz: 0.02 });
    piece(t, UG.sphere, 0xf2eee4, { x: 0.13, y: 2.5, z: -0.29, sx: 0.08, sy: 0.08, sz: 0.02 });
    return { rig, parts: P };
  }
  // Pólvora: canoner (canó de mà, banya de pólvora i bandolera) i petard (barril d'explosius)
  if (kind === 'handcannon' || kind === 'petard') {
    const gun = kind === 'handcannon';
    if (arch === 'western') gun ? HATS.kettle(t) : HATS.coif(t, 0x6a5a48);
    else if (arch === 'middleeast') HATS.turban(t, gun ? 0xe8dcc0 : 0x8a7a5a);
    else gun ? HATS.jingasa(t) : HATS.hachimaki(t, T.color);
    if (gun) {
      WEAPONS.handgun(P.armR);
      piece(t, UG.box, LEATHER, { y: 1.2, z: 0.02, sx: 0.06, sy: 0.9, sz: 0.66, rz: 0.7 });
      piece(t, taper(0.03, 0.07, 0.3, 8), 0xe8dcc0, { x: 0.3, y: 0.85, z: -0.1, rz: 1.2 });
    } else {
      WEAPONS.keg(t);
      piece(t, UG.box, T.color, { y: 1.35, z: -0.28, sx: 0.4, sy: 0.3, sz: 0.1 });
    }
    return { rig, parts: P };
  }
  // Cap (millor casc com més alt és el nivell); algunes civilitzacions en porten de propis
  const civHat = RIG_CIV && CIV_SOLDIER_HAT[RIG_CIV];
  if (civHat && civHat(t, base, tier, T)) { /* barret propi */ }
  else if (arch === 'western') {
    if (base === 'archer') tier >= 2 ? HATS.kettle(t) : tier >= 1 ? HATS.coif(t, 0x7a6a4a) : HATS.hood(t, 0x4a5a30);
    else if (base === 'skirmisher') tier ? HATS.kettle(t) : HATS.coif(t, 0x8a7a5a);
    else if (base === 'cavarcher') tier ? HATS.nasal(t) : HATS.hood(t, 0x6a5a38);
    else if (base === 'spearman') tier >= 2 ? HATS.nasal(t) : HATS.kettle(t);
    else if (base === 'knight') HATS.greathelm(t, tier >= 2 ? GOLD : T.color);
    else if (base === 'scout') tier >= 2 ? HATS.kettle(t) : tier ? HATS.nasal(t) : HATS.coif(t, 0x6a5a48);
    else if (base === 'camel') HATS.nasal(t);
    else tier >= 4 ? HATS.greathelm(t, T.color) : tier >= 2 ? HATS.kettle(t) : HATS.nasal(t);
  } else if (arch === 'middleeast') {
    if (base === 'archer' || base === 'scout' || base === 'skirmisher' || base === 'cavarcher') tier >= 1 && base !== 'skirmisher' ? HATS.spangen(t, 0xf0ece0) : HATS.turban(t, base === 'scout' ? 0xe8dcc0 : 0xf0ece0);
    else HATS.spangen(t, base === 'knight' || tier >= 3 ? T.color : 0xf0ece0);
  } else {
    if (base === 'archer' || base === 'skirmisher') tier ? HATS.jingasa(t) : HATS.hachimaki(t, T.color);
    else if (base === 'spearman' || base === 'scout' || base === 'cavarcher') tier >= 1 ? HATS.kabuto(t, 0x8a8a8a) : HATS.jingasa(t);
    else HATS.kabuto(t, base === 'knight' || tier >= 3 ? GOLD : 0x8a8a8a);
  }
  // Armes
  if (base === 'militia') {
    if (tier >= 3) WEAPONS.greatsword(P.armR, arch);
    else {
      if (RIG_CIV === 'chinese') { WEAPONS.sword(P.armR, true); WEAPONS.round(P.armL, 0xb8944a, T.color); }   // dao i escut de vímet
      else if (arch === 'eastasian') WEAPONS.katana(P.armR);
      else WEAPONS.sword(P.armR, arch === 'middleeast');
      if (arch === 'western') { WEAPONS.kite(P.armL, T.color); shieldMark(P.armL, 'kite'); }
      else if (arch === 'middleeast') { WEAPONS.round(P.armL, T.color); shieldMark(P.armL, 'round'); }
    }
  } else if (base === 'spearman') {
    if (tier >= 2) WEAPONS.halberd(P.armR);
    else WEAPONS.spear(P.armR, arch === 'eastasian' || tier ? 3.2 : 2.4);
    if (arch !== 'eastasian' && tier < 2) { WEAPONS.round(P.armL, T.color, arch === 'western' ? WOOD : METAL); shieldMark(P.armL, 'round'); }
  } else if (base === 'archer') {
    if (tier >= 1) WEAPONS.crossbow(P.armL);
    else WEAPONS.bow(P.armL, arch === 'eastasian' ? 'yumi' : arch === 'middleeast' ? 'recurve' : 'long');
    WEAPONS.quiver(t);
  } else if (base === 'skirmisher') {
    WEAPONS.javelins(P.armR);
    WEAPONS.pavise(t, T.color);
  } else if (base === 'cavarcher') {
    WEAPONS.bow(P.armL, arch === 'eastasian' ? 'yumi' : 'recurve');
    WEAPONS.quiver(t);
  } else if (base === 'knight') {
    WEAPONS.spear(P.armR, 2.8, METAL);
    if (arch === 'western') { WEAPONS.kite(P.armL, T.color); shieldMark(P.armL, 'kite'); }
    else if (arch === 'middleeast') { WEAPONS.round(P.armL, T.color); shieldMark(P.armL, 'round'); }
    if (tier >= 2) piece(t, UG.cone, GOLD, { y: 2.3, sx: 0.06, sy: 0.25, sz: 0.06, metal: true });
  } else if (base === 'scout') {
    if (arch === 'eastasian' && RIG_CIV !== 'chinese') WEAPONS.katana(P.armR);
    else WEAPONS.sword(P.armR, arch !== 'western' || tier >= 2);
    if (tier >= 2 && arch === 'western') for (const s of [-1, 1]) piece(t, UG.box, 0xf2eee4, { x: s * 0.3, y: 1.9, z: -0.25, sx: 0.04, sy: 0.7, sz: 0.2, rx: -0.3, rz: s * 0.2 });
  } else if (base === 'camel') {
    WEAPONS.spear(P.armR, 2.6, METAL);
  }
  return { rig, parts: P };
}

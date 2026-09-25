/* =====================================================================
   MODELS DE LES UNITATS
   Esquelet articulat (tors, cames i braços amb pivots) i vestits segons la regió de la
   civilització. Cada peça rígida es fusiona en una o dues malles amb color per vèrtex
   (mat i metàl·lic) i es comparteix entre totes les unitats iguals: poques crides de dibuix.
   Interfície que fa servir l'animació: model, legs[], arms[], tool, axeHead, pickHead,
   hammerHead, carryMesh (i cargo al carro de comerç).
   ===================================================================== */
const unitRng = mulberry32(0x5eed);
const ur = (a, b) => a + (b - a) * unitRng();
const upick = (arr) => arr[Math.floor(unitRng() * arr.length)];

const UNIT_MATS = {
  _matte: null, _metal: null,
  get matte() { return this._matte || (this._matte = fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }))); },
  get metal() { return this._metal || (this._metal = fogify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.75 }))); },
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
/* Converteix les peces de cada part en malles fusionades (mat / metàl·lic) */
function bakeRig(root) {
  root.traverse(o => {
    const pcs = o.userData.pieces;
    if (!pcs) return;
    for (const metal of [false, true]) {
      const list = pcs.filter(p => p.metal === metal);
      if (!list.length) continue;
      const geos = list.map(p => {
        const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        const col = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < col.length; i += 3) { col[i] = p.color.r; col[i + 1] = p.color.g; col[i + 2] = p.color.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      });
      const merged = mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, metal ? UNIT_MATS.metal : UNIT_MATS.matte);
      mesh.name = o.name + (metal ? ':metal' : ':matte');
      o.add(mesh);
    }
    delete o.userData.pieces;
  });
  return root;
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
  if (look.skirt) piece(torso, taper(0.3, 0.44, 0.78, 12), look.skirt, { y: 0.52 });
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
    piece(arm, UG.sphere, look.sleeves || look.top, { sx: 0.12, sy: 0.12, sz: 0.12 });
    piece(arm, taper(0.085, 0.07, 0.52), look.sleeves || look.top, { y: -0.26 });
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
  const P = humanBody(rig, look);
  if (arch === 'middleeast') (female ? HATS.coif(P.torso, T.colorDark) : HATS.turban(P.torso));
  else if (arch === 'eastasian') (female ? HATS.bun(P.torso, hair) : HATS.kasa(P.torso));
  else if (female) { HATS.coif(P.torso, 0xefe8d8); piece(P.torso, UG.box, 0xefe8d8, { y: 0.8, z: 0.33, sx: 0.4, sy: 0.6, sz: 0.03 }); }
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
  const P = humanBody(rig, look);
  const t = P.torso;
  // Estola amb el color de l'equip
  for (const sx of [-1, 1]) piece(t, UG.box, T.color, { x: sx * 0.11, y: 1.08, z: 0.27, sx: 0.08, sy: 0.9, sz: 0.03 });
  if (arch === 'western') {
    piece(t, UG.cone, 0x4a3426, { y: 1.72, z: -0.24, rx: -2.6, sx: 0.2, sy: 0.3, sz: 0.12 });   // caputxa abaixada
    piece(t, taper(0.3, 0.34, 0.12, 12), 0x4a3426, { y: 1.58, sz: 0.85 });
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
  if (arch === 'western') {
    piece(staff, UG.box, GOLD, { y: 0.82, z: 0.14, sx: 0.05, sy: 0.34, sz: 0.05, metal: true });
    piece(staff, UG.box, GOLD, { y: 0.88, z: 0.14, sx: 0.24, sy: 0.05, sz: 0.05, metal: true });
  } else if (arch === 'middleeast') {
    piece(staff, arcGeo(0.12, 0.022, Math.PI * 1.4), GOLD, { y: 0.84, z: 0.14, rz: -0.9, metal: true });
  } else {
    piece(staff, UG.torus, GOLD, { y: 0.82, z: 0.14, ry: Math.PI / 2, sx: 0.14, sy: 0.18, sz: 0.1, metal: true });
    for (const s of [-1, 1]) piece(staff, UG.torus, GOLD, { x: s * 0.1, y: 0.72, z: 0.14, ry: Math.PI / 2, sx: 0.05, sy: 0.05, sz: 0.05, metal: true });
  }
  // Llibre a la mà esquerra
  piece(P.armL, UG.box, arch === 'eastasian' ? 0xe8dcc0 : 0x6a2a1a, { y: -0.6, z: 0.1, sx: 0.08, sy: 0.24, sz: 0.18 });
  return rig;
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
  // Àsia oriental: armadura lacada i hakama
  if (kind === 'archer') return { ...base, top: T.color, top2: 0x2a2622, sleeves: 0xe8e0d0 };
  return { ...base, top: T.color, top2: 0x2a2622, sleeves: 0x2a2622 };
}
/* Detalls d'armadura sobre el tors */
/* Aspecte base de cada unitat millorada (la línia) i nivell d'equipament */
const VIS_BASE = {
  manatarms: 'militia', longsword: 'militia', twohanded: 'militia', champion: 'militia',
  pikeman: 'spearman', halberdier: 'spearman', crossbow: 'archer', arbalester: 'archer',
  eliteskirm: 'skirmisher', heavycavarcher: 'cavarcher', lightcav: 'scout', hussar: 'scout',
  cavalier: 'knight', paladin: 'knight', heavycamel: 'camel', king: 'knight',
};
function armorDetails(torso, arch, team, kind, tier = 0) {
  const T = teamOf(team);
  const heavy = kind === 'militia' || kind === 'knight' || kind === 'throwingaxe' || (tier >= 1 && kind !== 'archer' && kind !== 'skirmisher' && kind !== 'cavarcher');
  if (arch === 'western' && heavy) {
    piece(torso, taper(0.32, 0.36, 0.5, 12), tier >= 3 ? 0xb4bac2 : 0x8a9098, { y: 1.28, sz: 0.8, metal: true });
    piece(torso, UG.box, T.color, { y: 1.15, z: 0.02, sx: 0.44, sy: 0.72, sz: 0.62 });
  }
  if (arch === 'middleeast' && (heavy || kind === 'spearman' || kind === 'mameluke')) {
    piece(torso, taper(0.32, 0.35, 0.46, 12), tier >= 3 ? 0xb4bac2 : 0x8a9098, { y: 1.3, sz: 0.8, metal: true });
    piece(torso, UG.box, T.color, { y: 1.25, z: 0.2, sx: 0.36, sy: 0.5, sz: 0.04 });
  }
  if (arch === 'eastasian' && kind !== 'archer' && kind !== 'mameluke' && kind !== 'throwingaxe' && kind !== 'skirmisher') {
    // Dō lacat amb cordons de l'equip i faldons
    for (let i = 0; i < 4; i++) piece(torso, taper(0.33 - i * 0.005, 0.34, 0.12, 12), i % 2 ? 0x2a2622 : T.colorDark, { y: 1.12 + i * 0.12, sz: 0.8, metal: i % 2 === 1 });
    for (const s of [-1, 1]) piece(torso, UG.box, 0x2a2622, { x: s * 0.36, y: 1.48, sx: 0.2, sy: 0.08, sz: 0.3, rz: s * 0.3, metal: true });
    piece(torso, UG.box, T.color, { y: 0.9, z: 0.28, sx: 0.4, sy: 0.3, sz: 0.04 });
  }
  // Nivells alts: espatlleres i braçals de metall
  if (tier >= 2 && kind !== 'archer' && kind !== 'skirmisher') for (const s of [-1, 1]) piece(torso, UG.sphere, arch === 'eastasian' ? 0x2a2622 : 0xa8adb5, { x: s * 0.36, y: 1.5, sx: 0.17, sy: 0.12, sz: 0.19, metal: true });
  if (tier >= 1 && (kind === 'archer' || kind === 'skirmisher' || kind === 'cavarcher')) piece(torso, taper(0.31, 0.34, 0.4, 12), arch === 'eastasian' ? 0x3a3028 : 0x7a6a4a, { y: 1.3, sz: 0.8 });
}
function buildSoldierRig(kind, team, arch) {
  const T = teamOf(team);
  const rig = new THREE.Group();
  const tier = (CONFIG.UNITS[kind] && CONFIG.UNITS[kind].tier) || 0;
  const base = VIS_BASE[kind] || kind;
  const look = soldierLook(arch, team, base);
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
  if (kind === 'samurai') {
    HATS.kabuto(t, GOLD);
    WEAPONS.katana(P.armR);
    // Sashimono: bandera a l'esquena amb el color de l'equip
    piece(t, taper(0.02, 0.02, 1.4, 6), 0x2a2622, { y: 2.1, z: -0.3 });
    piece(t, UG.box, T.color, { x: 0.13, y: 2.45, z: -0.3, sx: 0.25, sy: 0.6, sz: 0.02 });
    piece(t, UG.sphere, 0xf2eee4, { x: 0.13, y: 2.5, z: -0.29, sx: 0.08, sy: 0.08, sz: 0.02 });
    return { rig, parts: P };
  }
  // Cap (millor casc com més alt és el nivell)
  if (arch === 'western') {
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
      if (arch === 'eastasian') WEAPONS.katana(P.armR);
      else WEAPONS.sword(P.armR, arch === 'middleeast');
      if (arch === 'western') WEAPONS.kite(P.armL, T.color);
      else if (arch === 'middleeast') WEAPONS.round(P.armL, T.color);
    }
  } else if (base === 'spearman') {
    if (tier >= 2) WEAPONS.halberd(P.armR);
    else WEAPONS.spear(P.armR, arch === 'eastasian' || tier ? 3.2 : 2.4);
    if (arch !== 'eastasian' && tier < 2) WEAPONS.round(P.armL, T.color, arch === 'western' ? WOOD : METAL);
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
    if (arch === 'western') WEAPONS.kite(P.armL, T.color);
    else if (arch === 'middleeast') WEAPONS.round(P.armL, T.color);
    if (tier >= 2) piece(t, UG.cone, GOLD, { y: 2.3, sx: 0.06, sy: 0.25, sz: 0.06, metal: true });
  } else if (base === 'scout') {
    if (arch === 'eastasian') WEAPONS.katana(P.armR);
    else WEAPONS.sword(P.armR, arch === 'middleeast' || tier >= 2);
    if (tier >= 2 && arch === 'western') for (const s of [-1, 1]) piece(t, UG.box, 0xf2eee4, { x: s * 0.3, y: 1.9, z: -0.25, sx: 0.04, sy: 0.7, sz: 0.2, rx: -0.3, rz: s * 0.2 });
  } else if (base === 'camel') {
    WEAPONS.spear(P.armR, 2.6, METAL);
  }
  return { rig, parts: P };
}

/* ---------- Muntures ---------- */
function buildHorse(rig, team, arch, kind, tier = 0) {
  const T = teamOf(team);
  const coat = kind === 'knight' ? upick([0x3b2a20, 0x2a2220, 0x5a4636]) : upick([0x8a5a32, 0x6a4428, 0xa07048, 0xd8ccb8]);
  const mane = 0x1c1410;
  const body = rigPart(rig, 'horse');
  piece(body, UG.sphere, coat, { y: 1.3, sx: 0.4, sy: 0.44, sz: 0.95 });
  piece(body, taper(0.17, 0.26, 0.9, 10), coat, { y: 1.78, z: 0.8, rx: 0.65 });
  piece(body, taper(0.1, 0.16, 0.52, 10), coat, { y: 2.05, z: 1.2, rx: 1.9 });
  for (const s of [-1, 1]) piece(body, UG.cone, coat, { x: s * 0.08, y: 2.3, z: 1.02, sx: 0.04, sy: 0.12, sz: 0.04 });
  piece(body, UG.box, mane, { y: 1.95, z: 0.72, sx: 0.06, sy: 0.7, sz: 0.14, rx: 0.65 });
  piece(body, UG.cone, mane, { y: 1.25, z: -1.0, rx: -2.5, sx: 0.08, sy: 0.7, sz: 0.1 });
  // Sella i gualdrapa
  piece(body, UG.box, LEATHER, { y: 1.73, z: -0.05, sx: 0.5, sy: 0.08, sz: 0.55 });
  if (kind === 'knight') {
    const cap = arch === 'eastasian' ? T.colorDark : T.color;
    for (const s of [-1, 1]) piece(body, UG.box, cap, { x: s * 0.41, y: 1.18, sx: 0.04, sy: 0.72, sz: 1.7 });
    piece(body, UG.box, cap, { y: 1.72, sx: 0.84, sy: 0.04, sz: 1.2 });
    piece(body, UG.box, arch === 'western' && tier < 2 ? 0xe8dcc0 : GOLD, { x: 0.43, y: 1.2, sx: 0.02, sy: 0.3, sz: 0.3 });
    if (tier >= 1) for (const s of [-1, 1]) piece(body, UG.box, GOLD, { x: s * 0.43, y: 0.84, sx: 0.03, sy: 0.05, sz: 1.72, metal: true });
    if (arch === 'western') piece(body, taper(0.18, 0.2, 0.55, 10), METAL, { y: 2.05, z: 1.2, rx: 1.9, metal: true });
  } else piece(body, UG.box, T.color, { y: 1.7, z: -0.05, sx: 0.86, sy: 0.04, sz: 0.7 });
  const legs = [];
  for (const [lx, lz, name] of [[-0.22, 0.62, 'hFL'], [0.22, -0.62, 'hBR'], [0.22, 0.62, 'hFR'], [-0.22, -0.62, 'hBL']]) {
    const leg = rigPart(rig, name, lx, 1.05, lz);
    piece(leg, taper(0.1, 0.065, 0.92, 8), coat, { y: -0.46 });
    piece(leg, taper(0.075, 0.085, 0.1, 8), 0x1a1612, { y: -0.97 });
    legs.push(leg);
  }
  return legs;
}
function buildOx(rig, arch) {
  const legs = [];
  const camel = arch === 'middleeast';
  const hide = camel ? 0xc4a070 : upick([0x7a5230, 0x5a4028, 0x9a7a58]);
  const b = rigPart(rig, 'beast');
  if (camel) {
    piece(b, UG.sphere, hide, { y: 1.55, z: 1.2, sx: 0.36, sy: 0.4, sz: 0.8 });
    piece(b, UG.sphere, hide, { y: 2.0, z: 1.15, sx: 0.26, sy: 0.3, sz: 0.34 });
    piece(b, taper(0.1, 0.16, 0.9, 8), hide, { y: 1.95, z: 1.95, rx: 0.5 });
    piece(b, UG.box, hide, { y: 2.35, z: 2.25, sx: 0.16, sy: 0.18, sz: 0.36 });
    piece(b, UG.box, 0x8a2a2a, { y: 1.9, z: 1.2, sx: 0.6, sy: 0.05, sz: 0.5 });
  } else {
    piece(b, UG.sphere, hide, { y: 1.0, z: 1.15, sx: 0.44, sy: 0.42, sz: 0.85 });
    piece(b, UG.box, hide, { y: 1.1, z: 1.95, sx: 0.3, sy: 0.32, sz: 0.42, rx: 0.3 });
    piece(b, UG.box, 0xe8dcc0, { y: 1.3, z: 1.9, sx: 0.7, sy: 0.06, sz: 0.06 });
    piece(b, UG.box, WOOD, { y: 1.42, z: 1.65, sx: 0.8, sy: 0.08, sz: 0.1 });
  }
  const h = camel ? 1.3 : 0.8;
  for (const [lx, lz] of [[-0.22, 1.6], [0.22, 0.75], [0.22, 1.6], [-0.22, 0.75]]) {
    const leg = rigPart(rig, 'leg' + legs.length, lx, h, lz);
    piece(leg, taper(0.09, 0.07, h - 0.05, 8), hide, { y: -(h - 0.05) / 2 });
    legs.push(leg);
  }
  return legs;
}
function buildCart(rig, team, arch) {
  const T = teamOf(team);
  const c = rigPart(rig, 'cart');
  const wood = arch === 'eastasian' ? 0x4a3a2c : 0x8a5a32;
  piece(c, UG.box, wood, { y: 0.95, z: -0.55, sx: 1.3, sy: 0.12, sz: 1.8 });
  for (const s of [-1, 1]) piece(c, UG.box, wood, { x: s * 0.62, y: 1.2, z: -0.55, sx: 0.08, sy: 0.45, sz: 1.8 });
  piece(c, UG.box, wood, { y: 1.2, z: -1.42, sx: 1.3, sy: 0.45, sz: 0.08 });
  for (const s of [-1, 1]) {
    piece(c, taper(0.5, 0.5, 0.1, 14), 0x5a3a1e, { x: s * 0.75, y: 0.5, z: -0.55, rz: Math.PI / 2 });
    piece(c, taper(0.12, 0.12, 0.14, 8), 0x3a2616, { x: s * 0.75, y: 0.5, z: -0.55, rz: Math.PI / 2 });
  }
  for (const s of [-0.3, 0.3]) piece(c, UG.box, wood, { x: s, y: 0.9, z: 0.6, sx: 0.06, sy: 0.06, sz: 1.2 });
  // Coberta de tela (mig cilindre)
  const cover = arch === 'eastasian' ? new THREE.CylinderGeometry(0.66, 0.66, 1.6, 8, 1, true, 0, Math.PI) : new THREE.CylinderGeometry(0.65, 0.65, 1.6, 12, 1, true, 0, Math.PI);
  cover.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  const coverCol = arch === 'eastasian' ? 0xc9b07a : T.color;
  piece(c, cover, coverCol, { y: 1.25, z: -0.55 });
  const back = cover.clone(); back.scale(-1, 1, 1);
  piece(c, back, coverCol, { y: 1.25, z: -0.55 });
  if (arch === 'eastasian') piece(c, UG.box, T.color, { y: 1.9, z: -0.55, sx: 0.3, sy: 0.05, sz: 1.6 });
}

/* ---------- Camell (Mameluc) ---------- */
function buildCamelMount(rig, team) {
  const T = teamOf(team);
  const hide = upick([0xc4a070, 0xb8905e, 0xd0b080]);
  const body = rigPart(rig, 'horse');
  piece(body, UG.sphere, hide, { y: 1.7, sx: 0.42, sy: 0.46, sz: 0.95 });
  piece(body, UG.sphere, hide, { y: 2.12, z: -0.1, sx: 0.3, sy: 0.3, sz: 0.4 });
  piece(body, taper(0.12, 0.2, 1.0, 8), hide, { y: 2.05, z: 0.95, rx: 0.35 });
  piece(body, UG.box, hide, { y: 2.55, z: 1.28, sx: 0.18, sy: 0.2, sz: 0.46 });
  piece(body, UG.cone, hide, { y: 1.55, z: -0.95, rx: -2.4, sx: 0.06, sy: 0.4, sz: 0.06 });
  piece(body, UG.box, T.color, { y: 2.18, z: 0.2, sx: 0.9, sy: 0.05, sz: 0.8 });
  for (const s of [-1, 1]) piece(body, UG.box, 0x8a2a2a, { x: s * 0.44, y: 1.85, z: 0.2, sx: 0.04, sy: 0.4, sz: 0.7 });
  const legs = [];
  for (const [lx, lz, name] of [[-0.22, 0.6, 'hFL'], [0.22, -0.6, 'hBR'], [0.22, 0.6, 'hFR'], [-0.22, -0.6, 'hBL']]) {
    const leg = rigPart(rig, name, lx, 1.45, lz);
    piece(leg, taper(0.09, 0.06, 1.36, 8), hide, { y: -0.68 });
    piece(leg, taper(0.08, 0.1, 0.08, 8), 0x3a2e24, { y: -1.4 });
    legs.push(leg);
  }
  return legs;
}

/* ---------- Màquines de setge ---------- */
function siegeLook(arch) {
  if (arch === 'middleeast') return { wood: 0x8a6a48, dark: 0x5a4028, roof: 0xc9a878 };
  if (arch === 'eastasian') return { wood: 0x3a2c22, dark: 0x241a14, roof: 0x9a8a50 };
  return { wood: 0x7a5232, dark: 0x4a3220, roof: 0x6a4a2a };
}
function siegeWheel(rig, name, x, y, z, r, color) {
  const w = rigPart(rig, name, x, y, z);
  piece(w, taper(r, r, 0.12, 14), color, { rz: Math.PI / 2 });
  piece(w, taper(r * 0.3, r * 0.3, 0.16, 8), 0x2a2622, { rz: Math.PI / 2, metal: true });
  for (let k = 0; k < 4; k++) piece(w, UG.box, 0x2a2622, { sx: 0.06, sy: r * 1.9, sz: 0.06, rx: k * Math.PI / 4 });
  return w;
}
function buildRam(rig, team, arch) {
  const L = siegeLook(arch), T = teamOf(team);
  const b = rigPart(rig, 'frame');
  piece(b, UG.box, L.wood, { y: 0.55, sx: 1.4, sy: 0.14, sz: 3.0 });
  for (const s of [-1, 1]) for (const z of [-1.2, 0, 1.2]) piece(b, UG.box, L.dark, { x: s * 0.62, y: 1.2, z, sx: 0.12, sy: 1.3, sz: 0.12 });
  // Coberta a dues aigües (pells, lones o palla segons la regió)
  for (const s of [-1, 1]) piece(b, UG.box, L.roof, { x: s * 0.42, y: 1.95, sx: 1.05, sy: 0.08, sz: 3.2, rz: -s * 0.75 });
  piece(b, UG.box, T.color, { y: 2.35, sx: 0.16, sy: 0.1, sz: 3.25 });
  for (const s of [-1, 1]) piece(b, UG.box, L.roof, { x: s * 0.72, y: 1.1, sx: 0.04, sy: 0.9, sz: 2.8 });
  const log = rigPart(rig, 'ramLog', 0, 1.05, 0);
  piece(log, taper(0.2, 0.2, 3.4, 10), 0x5a4030, { z: 0.4, rx: Math.PI / 2 });
  piece(log, UG.cone, 0x4a4e55, { z: 2.25, rx: Math.PI / 2, sx: 0.26, sy: 0.4, sz: 0.26, metal: true });
  for (const z of [-0.6, 0.8]) piece(log, UG.box, 0x3a2616, { y: 0.45, z, sx: 0.04, sy: 0.8, sz: 0.04 });
  return [[-0.75, 0.42, -1.1], [0.75, 0.42, -1.1], [-0.75, 0.42, 1.1], [0.75, 0.42, 1.1]].map(([x, y, z], i) => siegeWheel(rig, 'wheel' + i, x, y, z, 0.42, L.dark));
}
function buildMangonel(rig, team, arch) {
  const L = siegeLook(arch), T = teamOf(team);
  const b = rigPart(rig, 'frame');
  for (const s of [-1, 1]) piece(b, UG.box, L.wood, { x: s * 0.55, y: 0.5, sx: 0.16, sy: 0.18, sz: 2.6 });
  for (const z of [-1.0, 0.2, 1.1]) piece(b, UG.box, L.wood, { y: 0.5, z, sx: 1.25, sy: 0.14, sz: 0.16 });
  for (const s of [-1, 1]) piece(b, UG.box, L.dark, { x: s * 0.55, y: 1.25, z: 0.55, sx: 0.14, sy: 1.5, sz: 0.14 });
  piece(b, UG.box, L.dark, { y: 1.95, z: 0.55, sx: 1.3, sy: 0.14, sz: 0.16 });
  piece(b, taper(0.2, 0.2, 1.0, 10), 0xb8a070, { y: 0.62, z: -0.5, rz: Math.PI / 2 });
  piece(b, UG.box, T.color, { x: 0.6, y: 2.2, z: 0.55, sx: 0.04, sy: 0.4, sz: 0.3 });
  const arm = rigPart(rig, 'throwArm', 0, 0.65, -0.5);
  piece(arm, UG.box, L.wood, { y: 0.02, z: 0.85, sx: 0.12, sy: 0.12, sz: 1.9, rx: -0.35 });
  piece(arm, UG.hemi, L.dark, { y: 0.42, z: 1.75, sx: 0.28, sy: -0.2, sz: 0.28 });
  return [[-0.7, 0.36, -0.9], [0.7, 0.36, -0.9], [-0.7, 0.36, 0.9], [0.7, 0.36, 0.9]].map(([x, y, z], i) => siegeWheel(rig, 'wheel' + i, x, y, z, 0.36, L.dark));
}
function buildScorpion(rig, team, arch) {
  const L = siegeLook(arch), T = teamOf(team);
  const b = rigPart(rig, 'frame');
  piece(b, UG.box, L.wood, { y: 0.6, sx: 0.9, sy: 0.14, sz: 1.4 });
  piece(b, UG.box, L.wood, { y: 1.05, z: 0.1, sx: 0.18, sy: 0.16, sz: 1.9 });
  for (const s of [-1, 1]) piece(b, UG.box, L.dark, { x: s * 0.4, y: 0.85, z: 0.3, sx: 0.1, sy: 0.5, sz: 0.1 });
  for (const s of [-1, 1]) piece(b, UG.box, L.dark, { x: s * 0.7, y: 1.12, z: 0.75, sx: 1.1, sy: 0.08, sz: 0.08, ry: s * 0.35 });
  piece(b, taper(0.13, 0.13, 0.5, 8), 0xb8a070, { y: 1.12, z: 0.8, rz: Math.PI / 2 });
  piece(b, taper(0.03, 0.03, 1.4, 5), 0x5a3a1e, { y: 1.18, z: 0.4, rx: Math.PI / 2 });
  piece(b, UG.box, T.color, { y: 0.62, z: -0.72, sx: 0.8, sy: 0.3, sz: 0.04 });
  const str = rigPart(rig, 'bowString', 0, 1.14, 0);
  for (const s of [-1, 1]) piece(str, UG.box, 0xe8e0d0, { x: s * 0.5, z: 0.95, sx: 1.0, sy: 0.02, sz: 0.02, ry: -s * 0.55 });
  return [[-0.55, 0.38, -0.3], [0.55, 0.38, -0.3]].map(([x, y, z], i) => siegeWheel(rig, 'wheel' + i, x, y, z, 0.38, L.dark));
}
function buildTrebuchet(rig, team, arch) {
  const L = siegeLook(arch), T = teamOf(team);
  // Desmuntat: carro llarg amb la biga plegada
  const packed = rigPart(rig, 'packedPart');
  piece(packed, UG.box, L.wood, { y: 0.7, sx: 1.2, sy: 0.16, sz: 3.6 });
  piece(packed, UG.box, L.dark, { y: 1.0, z: 0.2, sx: 0.22, sy: 0.22, sz: 4.2 });
  piece(packed, UG.box, 0x5a5a5a, { y: 1.15, z: -1.4, sx: 0.8, sy: 0.6, sz: 0.7, metal: true });
  piece(packed, UG.box, T.color, { y: 1.18, z: 0.8, sx: 0.9, sy: 0.05, sz: 1.2 });
  // Muntat: torre en A, biga amb contrapès i fona
  const dep = rigPart(rig, 'deployedPart');
  for (const s of [-1, 1]) {
    piece(dep, UG.box, L.wood, { x: s * 0.8, y: 0.3, sx: 0.2, sy: 0.2, sz: 3.6 });
    piece(dep, UG.box, L.dark, { x: s * 0.7, y: 2.3, z: 0.7, sx: 0.18, sy: 4.3, sz: 0.18, rx: -0.33 });
    piece(dep, UG.box, L.dark, { x: s * 0.7, y: 2.3, z: -0.7, sx: 0.18, sy: 4.3, sz: 0.18, rx: 0.33 });
  }
  for (const z of [-1.5, 1.5]) piece(dep, UG.box, L.wood, { y: 0.3, z, sx: 1.8, sy: 0.18, sz: 0.2 });
  piece(dep, taper(0.1, 0.1, 1.7, 8), 0x2a2622, { y: 4.3, rz: Math.PI / 2, metal: true });
  piece(dep, UG.box, T.color, { x: 0.95, y: 3.6, sx: 0.04, sy: 0.7, sz: 0.5 });
  const arm = rigPart(dep, 'deployArm', 0, 4.3, 0);
  piece(arm, UG.box, L.wood, { z: 1.2, sx: 0.22, sy: 0.22, sz: 5.2 });
  piece(arm, UG.box, 0x5a5a5a, { y: -0.7, z: -1.2, sx: 0.9, sy: 0.9, sz: 0.8, metal: true });
  piece(arm, taper(0.01, 0.01, 1.6, 4), 0xd8d0c0, { y: -0.8, z: 3.8 });
  piece(arm, UG.sphere, 0x8a7a62, { y: -1.6, z: 3.8, sx: 0.2, sy: 0.15, sz: 0.2 });
  return [[-0.75, 0.42, -1.2], [0.75, 0.42, -1.2], [-0.75, 0.42, 1.2], [0.75, 0.42, 1.2]].map(([x, y, z], i) => siegeWheel(packed, 'wheel' + i, x, y, z, 0.42, L.dark));
}
function buildBombard(rig, team, arch) {
  const L = siegeLook(arch), T = teamOf(team);
  const b = rigPart(rig, 'frame');
  piece(b, UG.box, L.wood, { y: 0.55, z: -0.3, sx: 0.8, sy: 0.3, sz: 2.0 });
  piece(b, UG.box, L.dark, { y: 0.35, z: -1.4, sx: 0.4, sy: 0.2, sz: 0.8, rx: 0.3 });
  const barrel = rigPart(rig, 'barrel', 0, 0.95, 0.1);
  piece(barrel, taper(0.24, 0.3, 2.0, 14), 0x3a3c40, { z: 0.6, rx: Math.PI / 2 - 0.08, metal: true });
  for (const z of [-0.2, 0.5, 1.2]) piece(barrel, taper(0.31, 0.31, 0.1, 14), 0x6a5a3a, { z, rx: Math.PI / 2 - 0.08, metal: true });
  piece(barrel, UG.sphere, 0x3a3c40, { z: -0.45, sx: 0.28, sy: 0.28, sz: 0.28, metal: true });
  piece(b, UG.box, T.color, { y: 0.72, z: -0.9, sx: 0.82, sy: 0.05, sz: 0.5 });
  return [[-0.55, 0.5, 0.0], [0.55, 0.5, 0.0]].map(([x, y, z], i) => siegeWheel(rig, 'wheel' + i, x, y, z, 0.5, L.dark));
}
/* Variants millorades: més grans i amb reforços de ferro */
function upgraded(builder, scale, plates = false) {
  return (rig, team, arch) => {
    const r = builder(rig, team, arch);
    rig.scale.setScalar(scale);
    if (plates) {
      const f = rig.getObjectByName('frame');
      for (const s of [-1, 1]) piece(f, UG.box, 0x4a4e55, { x: s * 0.62, y: 1.9, sx: 0.8, sy: 0.05, sz: 3.1, rz: -s * 0.75, metal: true });
    }
    return r;
  };
}
const SIEGE_BUILDERS = {
  ram: buildRam, mangonel: buildMangonel, scorpion: buildScorpion, trebuchet: buildTrebuchet, bombard: buildBombard,
  cappedram: upgraded(buildRam, 1.06, true), siegeram: upgraded(buildRam, 1.18, true),
  onager: upgraded(buildMangonel, 1.15), heavyscorpion: upgraded(buildScorpion, 1.15),
};

/* ---------- Plantilles i instàncies ---------- */
const UNIT_TEMPLATES = new Map();
const UNIT_VARIANTS = 4;
function unitTemplate(kind, team, arch, variant) {
  const key = `${kind}:${team}:${arch}:${variant}`;
  if (!UNIT_TEMPLATES.has(key)) {
    let rig;
    const d = CONFIG.UNITS[kind];
    if (kind === 'villager') rig = buildVillagerRig(team, arch, variant % 2 === 1);
    else if (kind === 'monk') rig = buildMonkRig(team, arch);
    else if (SIEGE_BUILDERS[kind]) {
      rig = new THREE.Group();
      SIEGE_BUILDERS[kind](rig, team, arch);
    } else if (kind === 'tradecart') {
      rig = new THREE.Group();
      buildOx(rig, arch);
      buildCart(rig, team, arch);
      const cargo = rigPart(rig, 'cargo');
      for (let i = 0; i < 3; i++) piece(cargo, UG.box, 0xffc53a, { x: -0.3 + i * 0.3, y: 1.2, z: -0.3 - (i % 2) * 0.4, sx: 0.35, sy: 0.3, sz: 0.35, metal: true });
    } else {
      const s = buildSoldierRig(kind, team, arch);
      rig = s.rig;
      if (d.cat === 'cavalry' || d.mounted) {
        // El genet puja a la muntura: amaguem les cames i hi posem cuixes fixes
        const rider = rigPart(rig, 'rider', 0, 0.72, 0);
        for (const p of [s.parts.torso, s.parts.armL, s.parts.armR]) { rig.remove(p); rider.add(p); }
        rig.remove(s.parts.legL); rig.remove(s.parts.legR);
        for (const sx of [-1, 1]) piece(s.parts.torso, taper(0.1, 0.085, 0.62), soldierLook(arch, team, kind).pants, { x: sx * 0.3, y: 0.62, z: 0.1, rx: 0.5, rz: sx * 0.35 });
        if (kind === 'mameluke' || kind === 'camel' || kind === 'heavycamel') { rider.position.y = 1.18; buildCamelMount(rig, team); }
        else buildHorse(rig, team, arch, VIS_BASE[kind] || kind, kind === 'king' ? 2 : d.tier || 0);
      }
    }
    UNIT_TEMPLATES.set(key, bakeRig(rig));
  }
  return UNIT_TEMPLATES.get(key);
}
/* Crea el model d'una unitat i n'omple les referències d'animació (e.legs, e.arms, e.tool…) */
function buildUnitVisual(e, kind, team) {
  const arch = e.visArch || archOf(team);
  const variant = Math.floor(unitRng() * UNIT_VARIANTS);
  const model = unitTemplate(kind, team, arch, variant).clone(true);
  const get = (n) => model.getObjectByName(n);
  e.model = model;
  const d = CONFIG.UNITS[kind];
  if (d.cat === 'siege') {
    e.legs = [new THREE.Object3D(), new THREE.Object3D()];
    e.arms = [new THREE.Object3D(), new THREE.Object3D()];
    e.wheels = [0, 1, 2, 3].map(i => get('wheel' + i)).filter(Boolean);
    e.throwArm = get('throwArm') || get('deployArm');
    e.deployArm = get('deployArm');
    e.ramLog = get('ramLog');
    e.bowString = get('bowString');
    e.fireAnim = !!e.throwArm;
    e.packedPart = get('packedPart');
    e.deployedPart = get('deployedPart');
    if (e.packedPart) { e.packedPart.visible = e.packed !== false; e.deployedPart.visible = e.packed === false; }
  } else if (kind === 'tradecart') {
    e.legs = [0, 1, 2, 3].map(i => get('leg' + i));
    e.arms = [new THREE.Object3D(), new THREE.Object3D()];
    e.cargo = get('cargo');
    e.cargo.visible = false;
  } else if (d.cat === 'cavalry' || d.mounted) {
    e.legs = ['hFL', 'hBR', 'hFR', 'hBL'].map(get);
    e.arms = [get('armL'), get('armR')];
  } else {
    e.legs = [get('legL'), get('legR')];
    e.arms = [get('armL'), get('armR')];
  }
  if (kind === 'villager') {
    e.tool = get('tool');
    e.axeHead = get('axeHead');
    e.pickHead = get('pickHead');
    e.hammerHead = get('hammerHead');
    e.tool.visible = false;
    e.hammerHead.visible = false;
    // Càrrega sobre el cap
    const carryMesh = new THREE.Mesh(villagerGeo.carry, CARRY_MATERIALS.wood);
    carryMesh.position.y = 2.72;
    carryMesh.visible = false;
    model.add(carryMesh);
    e.carryMesh = carryMesh;
  } else {
    e.tool = { visible: false }; e.axeHead = { visible: false }; e.pickHead = { visible: false }; e.hammerHead = { visible: false };
    e.carryMesh = { visible: false };
  }
  if (kind === 'monk') {
    // Relíquia portada als braços
    const r = relicTemplate().clone(true);
    r.scale.setScalar(0.42);
    r.position.set(0, 1.12, 0.42);
    r.visible = !!e.relic;
    model.add(r);
    e.relicMesh = r;
  }
  return model;
}

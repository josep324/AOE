/* =====================================================================
   MODELS DE LES UNITATS (III): vaixells
   ===================================================================== */
/* ---------- Vaixells ----------
   Buc amb forma (proa punxeguda, popa plena, línia de coberta corbada) i veles segons la regió:
   Occident vela quadrada inflada · Orient Mitjà vela llatina triangular · Àsia oriental vela de junc amb sabres */
function hullGeo(L, W, H, bluff = 0.55) {
  const k = `hull${L}|${W}|${H}|${bluff}`;
  if (tapers.has(k)) return tapers.get(k);
  const g = new THREE.BoxGeometry(W, H, L, 4, 3, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const z = p.getZ(i);
    const t = z / (L / 2), yb = (y + H / 2) / H;
    const taper = t > 0 ? 1 - Math.pow(t, 2.0) * 0.96 : 1 - Math.pow(-t, 2.4) * bluff;
    x *= Math.max(0.03, taper) * (0.4 + 0.6 * Math.pow(yb, 0.7));
    y += Math.pow(Math.abs(t), 2.2) * H * 0.5 * yb + H / 2;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  tapers.set(k, g);
  return g;
}
function sailGeo(w, h) {
  const k = `sail${w}|${h}`;
  if (tapers.has(k)) return tapers.get(k);
  const R = w * 1.1, arc = w / R;
  const g = new THREE.CylinderGeometry(R, R, h, 10, 1, true, -arc / 2, arc).translate(0, 0, -R);
  const g2 = g.clone().scale(1, 1, 1).translate(0, 0, -0.03);
  const idx = g2.index.array; for (let i = 0; i < idx.length; i += 3) { const a = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = a; }
  const m = mergeGeometries([g.toNonIndexed(), g2.toNonIndexed()]);
  m.computeVertexNormals();
  tapers.set(k, m);
  return m;
}
function triSailGeo(w, h) {
  const k = `tri${w}|${h}`;
  if (tapers.has(k)) return tapers.get(k);
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.quadraticCurveTo(w * 0.35, h * 0.35, -w * 0.15, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).rotateY(Math.PI / 2);
  tapers.set(k, g);
  return g;
}
const SHIP_LOOK = {
  western: { hull: 0x5a3e28, trim: 0x2e2218, deck: 0x8a6a48, sail: 0xe6dcc4 },
  middleeast: { hull: 0x8a6440, trim: 0x4a3222, deck: 0xb09070, sail: 0xf0e8d6 },
  eastasian: { hull: 0x3a2a20, trim: 0x8a2a20, deck: 0x6a5238, sail: 0xb87444 },
};
/* Arbre amb vela; y0 = alçada de coberta; z = posició al llarg del buc */
function shipMast(rig, arch, team, { z = 0, y0, h, sw, sh, flag = true }) {
  const S = SHIP_LOOK[arch], T = teamOf(team);
  const mast = rigPart(rig, 'sail', 0, 0, z);
  piece(mast, taper(0.045, 0.07, h, 8), 0x4a3424, { y: y0 + h / 2 });
  if (arch === 'middleeast') {
    // Vela llatina: antena inclinada i vela triangular
    piece(mast, taper(0.03, 0.035, sw * 1.35, 6), 0x4a3424, { y: y0 + h * 0.72, z: 0.1, rx: 1.1 });
    piece(mast, triSailGeo(sw, sh), S.sail, { x: 0.02, y: y0 + h * 0.18, z: -sw * 0.45 });
    piece(mast, UG.box, T.color, { x: 0.035, y: y0 + h * 0.3, z: 0, sx: 0.01, sy: 0.12, sz: sw * 0.7 });
  } else if (arch === 'eastasian') {
    // Vela de junc: rectangle amb sabres horitzontals
    piece(mast, UG.box, S.sail, { y: y0 + h * 0.58, z: -0.05, sx: sw, sy: sh, sz: 0.03 });
    for (let i = 0; i <= 5; i++) piece(mast, UG.box, 0x2a1e16, { y: y0 + h * 0.58 - sh / 2 + (i * sh) / 5, z: -0.02, sx: sw + 0.08, sy: 0.035, sz: 0.05 });
    piece(mast, UG.box, T.color, { y: y0 + h * 0.58 + sh * 0.35, z: -0.01, sx: sw * 0.9, sy: sh * 0.14, sz: 0.035 });
  } else {
    // Vela quadrada inflada amb franja de l'equip
    piece(mast, taper(0.035, 0.035, sw + 0.2, 6), 0x4a3424, { y: y0 + h * 0.9, rz: Math.PI / 2 });
    piece(mast, sailGeo(sw, sh), S.sail, { y: y0 + h * 0.9 - sh / 2 - 0.05, z: 0.12 });
    piece(mast, sailGeo(sw * 1.001, sh * 0.2), T.color, { y: y0 + h * 0.9 - sh / 2 - 0.05, z: 0.135 });
  }
  if (flag) {
    piece(mast, UG.box, T.color, { y: y0 + h + 0.12, z: -0.2, sx: 0.02, sy: 0.22, sz: 0.4 });
  }
  return mast;
}
function shipHullParts(rig, arch, { L, W, H, bluff = 0.55 }) {
  const S = SHIP_LOOK[arch];
  const hull = rigPart(rig, 'hull');
  piece(hull, hullGeo(L, W, H, bluff), S.hull);
  piece(hull, UG.box, S.deck, { y: H * 0.92, sx: W * 0.78, sy: 0.05, sz: L * 0.72 });
  // Regala i franges
  for (const s of [-1, 1]) piece(hull, UG.box, S.trim, { x: s * W * 0.45, y: H * 0.98, sx: 0.06, sy: 0.07, sz: L * 0.48 });
  return hull;
}
function oarBanks(rig, W, H, n, span, color = 0x6a4c32) {
  const banks = [];
  for (const side of [-1, 1]) {
    const b = rigPart(rig, side < 0 ? 'oarsL' : 'oarsR', side * W * 0.47, H * 0.9, 0);
    for (let i = 0; i < n; i++) {
      const z = -span / 2 + (i + 0.5) * span / n;
      piece(b, taper(0.018, 0.022, 1.3, 5), color, { x: side * 0.55, y: -0.3, z, rz: side * 1.05 });
      piece(b, UG.box, color, { x: side * 1.05, y: -0.62, z, sx: 0.03, sy: 0.18, sz: 0.1, rz: side * 1.05 });
    }
    banks.push(b);
  }
  return banks;
}
function sternCastle(hull, arch, team, L, W, H, big = false) {
  const S = SHIP_LOOK[arch], T = teamOf(team);
  const z = -L * 0.33, h = big ? 0.7 : 0.45;
  piece(hull, UG.box, S.hull, { y: H + h / 2 + 0.1, z, sx: W * 0.7, sy: h, sz: L * 0.2 });
  piece(hull, UG.box, S.trim, { y: H + h + 0.12, z, sx: W * 0.74, sy: 0.05, sz: L * 0.22 });
  if (arch === 'eastasian') { piece(hull, UG.box, 0x2a1e16, { y: H + h + 0.3, z, sx: W * 0.78, sy: 0.06, sz: L * 0.23 }); }
  if (big) for (const s of [-1, 1]) piece(hull, UG.box, 0x1a1410, { x: s * W * 0.36, y: H + h * 0.55, z, sx: 0.02, sy: 0.12, sz: 0.14 });
  piece(hull, UG.box, T.color, { y: H + h + 0.5, z: z - L * 0.08, sx: 0.02, sy: 0.3, sz: 0.5 });
  piece(hull, taper(0.02, 0.02, 0.9, 5), 0x3a2a1c, { y: H + h + 0.3, z: z - L * 0.08 - 0.25 });
}
function buildShip(kind, rig, team, arch) {
  const T = teamOf(team), S = SHIP_LOOK[arch];
  const D = {
    fishingship: { L: 3.2, W: 1.15, H: 0.55 }, transport: { L: 4.8, W: 1.9, H: 0.8, bluff: 0.3 }, galley: { L: 5.2, W: 1.3, H: 0.6 },
    wargalley: { L: 5.6, W: 1.4, H: 0.65 }, galleon: { L: 6.2, W: 2.0, H: 1.0, bluff: 0.3 }, fireship: { L: 4.4, W: 1.25, H: 0.6 },
    demoship: { L: 3.4, W: 1.1, H: 0.55 }, cannongalleon: { L: 6.6, W: 2.1, H: 1.05, bluff: 0.25 },
  }[kind];
  const { L, W, H } = D;
  const hull = shipHullParts(rig, arch, D);
  // Timó a popa i esperó a proa
  piece(hull, UG.box, S.trim, { y: H * 0.5, z: -L / 2 - 0.04, sx: 0.05, sy: H * 0.9, sz: 0.3 });
  if (kind === 'fishingship') {
    shipMast(rig, arch, team, { z: 0.35, y0: H, h: 2.1, sw: 1.1, sh: 1.1 });
    piece(hull, UG.box, 0x3a3a30, { y: H + 0.08, z: -0.6, sx: 0.6, sy: 0.14, sz: 0.5 });                 // xarxa
    piece(hull, taper(0.16, 0.13, 0.22, 10), 0x8a6a3a, { x: 0.25, y: H + 0.12, z: 0.9 });               // cistell de peix
    piece(hull, UG.sphere, 0xb0bcc4, { x: 0.25, y: H + 0.24, z: 0.9, sx: 0.12, sy: 0.05, sz: 0.12, metal: true });
    piece(hull, taper(0.012, 0.012, 1.6, 4), 0x3a2a1c, { x: -0.3, y: H + 0.55, z: 1.0, rz: 0.9, rx: 0.5 });  // canya
  } else if (kind === 'transport') {
    shipMast(rig, arch, team, { z: 0.6, y0: H, h: 3.2, sw: 1.8, sh: 1.8 });
    sternCastle(hull, arch, team, L, W, H);
    for (const [x, z] of [[-0.35, 1.2], [0.3, 1.35], [0, 1.7], [-0.3, -0.2]]) piece(hull, UG.box, 0x7a5a38, { x, y: H + 0.2, z, sx: 0.36, sy: 0.32, sz: 0.36 });
  } else if (kind === 'galley' || kind === 'wargalley' || kind === 'fireship') {
    const war = kind === 'wargalley';
    shipMast(rig, arch, team, { z: 0.3, y0: H, h: war ? 3.3 : 2.9, sw: war ? 1.7 : 1.5, sh: war ? 1.5 : 1.3 });
    sternCastle(hull, arch, team, L, W, H, war);
    oarBanks(rig, W, H, war ? 7 : 6, L * 0.55);
    // Esperó de bronze a proa
    piece(hull, UG.cone, 0x8a6a3a, { y: H * 0.35, z: L / 2 + 0.2, rx: Math.PI / 2, sx: 0.1, sy: 0.5, sz: 0.1, metal: true });
    if (arch === 'western') for (let i = 0; i < 5; i++) piece(hull, taper(0.17, 0.17, 0.04, 12), i % 2 ? T.color : 0xd8cca8, { x: W * 0.5, y: H + 0.12, z: -1 + i * 0.5, rz: Math.PI / 2 });
    if (arch === 'western') for (let i = 0; i < 5; i++) piece(hull, taper(0.17, 0.17, 0.04, 12), i % 2 ? 0xd8cca8 : T.color, { x: -W * 0.5, y: H + 0.12, z: -1 + i * 0.5, rz: Math.PI / 2 });
    if (kind === 'fireship') {
      for (const z of [0.9, -0.4]) { piece(hull, taper(0.18, 0.12, 0.3, 10), 0x3a3430, { y: H + 0.15, z, metal: true }); }
      piece(hull, taper(0.03, 0.05, 1.2, 6), 0x2a2420, { y: H + 0.5, z: L / 2 - 0.2, rx: 1.2, metal: true });
    }
  } else if (kind === 'demoship') {
    shipMast(rig, arch, team, { z: -0.2, y0: H, h: 1.9, sw: 0.9, sh: 0.9 });
    for (const [x, z, y] of [[-0.22, 0.6, 0], [0.22, 0.6, 0], [0, 0.95, 0], [0, 0.75, 0.34], [-0.2, 0.15, 0], [0.2, 0.15, 0]]) piece(hull, taper(0.15, 0.15, 0.34, 10), 0x5a3a22, { x, y: H + 0.17 + y, z });
    piece(hull, taper(0.01, 0.01, 0.4, 4), 0x1a1410, { y: H + 0.72, z: 0.75, rx: 0.4 });
  } else {
    // Galió i galió artiller: castell de proa i de popa, dos arbres, bauprès
    const guns = kind === 'cannongalleon';
    shipMast(rig, arch, team, { z: 0.2, y0: H, h: 4.0, sw: 2.1, sh: 2.0 });
    const fore = shipMast(rig, arch, team, { z: L * 0.3, y0: H, h: 3.2, sw: 1.6, sh: 1.5, flag: false });
    fore.name = 'sail2';
    sternCastle(hull, arch, team, L, W, H, true);
    piece(hull, UG.box, S.hull, { y: H + 0.25, z: L * 0.36, sx: W * 0.55, sy: 0.35, sz: L * 0.14 });
    piece(hull, taper(0.03, 0.06, 1.6, 6), 0x4a3424, { y: H + 0.4, z: L / 2 + 0.5, rx: 1.15 });
    if (guns) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) piece(hull, taper(0.06, 0.08, 0.5, 8), 0x2a2a2c, { x: s * W * 0.52, y: H * 0.72, z: -1.2 + i * 0.8, rz: s * Math.PI / 2, metal: true });
    else for (const s of [-1, 1]) for (let i = 0; i < 5; i++) piece(hull, UG.box, 0x1a1410, { x: s * W * 0.49, y: H * 0.7, z: -1.4 + i * 0.7, sx: 0.02, sy: 0.12, sz: 0.16 });
  }
  return rig;
}

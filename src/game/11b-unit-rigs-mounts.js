/* =====================================================================
   MODELS DE LES UNITATS (II): muntures, camell i màquines de setge
   ===================================================================== */
/* ---------- Muntures ---------- */
function buildHorse(rig, team, arch, kind, tier = 0) {
  const T = teamOf(team);
  const coat = kind === 'knight' ? upick([0x3b2a20, 0x2a2220, 0x4a3a2e]) : upick([0x7a5030, 0x5e3e24, 0x8e6444, 0xb8ab98, 0x3a2a20]);
  const mane = 0x17110d, hoof = 0x1a1612;
  const body = rigPart(rig, 'horse');
  // Tronc: barril allargat amb pit i gropa marcats
  piece(body, taper(0.33, 0.35, 1.2, 14), coat, { y: 1.32, z: 0, rx: Math.PI / 2, sx: 1, sz: 1.12 });
  piece(body, UG.sphere, coat, { y: 1.34, z: 0.6, sx: 0.34, sy: 0.4, sz: 0.34 });
  piece(body, UG.sphere, coat, { y: 1.38, z: -0.6, sx: 0.36, sy: 0.4, sz: 0.38 });
  piece(body, UG.sphere, coat, { y: 1.12, z: 0.05, sx: 0.3, sy: 0.22, sz: 0.62 });
  // Coll, cap allargat amb morro, orelles i crinera
  piece(body, taper(0.14, 0.25, 0.86, 12), coat, { y: 1.8, z: 0.86, rx: 0.62 });
  piece(body, taper(0.075, 0.125, 0.56, 10), coat, { y: 2.02, z: 1.36, rx: 2.18, sx: 0.85 });
  piece(body, UG.sphere, coat, { y: 2.12, z: 1.2, sx: 0.12, sy: 0.12, sz: 0.14 });
  piece(body, UG.box, 0x2a1e18, { y: 1.83, z: 1.6, sx: 0.12, sy: 0.08, sz: 0.06, rx: 0.6 });
  for (const s of [-1, 1]) {
    piece(body, UG.cone, coat, { x: s * 0.06, y: 2.3, z: 1.14, sx: 0.035, sy: 0.13, sz: 0.03, rz: s * -0.2 });
    piece(body, UG.sphere, 0x0e0a08, { x: s * 0.085, y: 2.08, z: 1.33, sx: 0.022, sy: 0.022, sz: 0.022 });
  }
  piece(body, UG.box, mane, { y: 1.98, z: 0.78, sx: 0.05, sy: 0.72, sz: 0.1, rx: 0.62 });
  piece(body, UG.box, mane, { y: 2.2, z: 1.12, sx: 0.05, sy: 0.12, sz: 0.1, rx: 0.3 });
  piece(body, taper(0.03, 0.09, 0.8, 8), mane, { y: 1.0, z: -1.02, rx: -0.35 });
  // Brides, sella i gualdrapa
  piece(body, UG.box, LEATHER, { y: 1.96, z: 1.4, sx: 0.2, sy: 0.03, sz: 0.03, rx: 0.6 });
  piece(body, UG.box, LEATHER, { y: 1.72, z: -0.05, sx: 0.46, sy: 0.08, sz: 0.56 });
  piece(body, UG.box, LEATHER, { y: 1.8, z: -0.3, sx: 0.4, sy: 0.12, sz: 0.06 });
  if (kind === 'knight') {
    const cap = arch === 'eastasian' ? T.colorDark : T.color;
    // Gualdrapa de tela que embolcalla el cos i penja fins als genolls, amb ribet clar
    const drape = (rt, rb, h) => { const k = `drape${rt}|${rb}|${h}`; if (!tapers.has(k)) tapers.set(k, new THREE.CylinderGeometry(rt, rb, h, 18, 1, true)); return tapers.get(k); };
    piece(body, drape(0.4, 0.45, 1.78), cap, { y: 1.26, rx: Math.PI / 2, sz: 1.35 });
    piece(body, UG.box, cap, { y: 1.71, sx: 0.66, sy: 0.03, sz: 1.2 });
    piece(body, UG.box, arch === 'western' && tier < 2 ? 0xe8dcc0 : GOLD, { x: 0.42, y: 1.22, sx: 0.02, sy: 0.3, sz: 0.3 });
    if (tier >= 1) for (const s of [-1, 1]) piece(body, UG.box, GOLD, { x: s * 0.42, y: 0.86, sx: 0.025, sy: 0.04, sz: 1.72, metal: true });
    if (arch === 'western') piece(body, taper(0.09, 0.14, 0.5, 10), METAL, { y: 2.03, z: 1.36, rx: 2.18, sx: 0.9, metal: true });
  } else piece(body, UG.box, T.colorDark, { y: 1.69, z: -0.05, sx: 0.8, sy: 0.03, sz: 0.66 });
  const legs = [];
  for (const [lx, lz, name] of [[-0.2, 0.6, 'hFL'], [0.2, -0.62, 'hBR'], [0.2, 0.6, 'hFR'], [-0.2, -0.62, 'hBL']]) {
    const leg = rigPart(rig, name, lx, 1.12, lz);
    const back = lz < 0;
    piece(leg, taper(0.07, back ? 0.13 : 0.11, 0.5, 8), coat, { y: -0.24, z: back ? -0.03 : 0 });
    piece(leg, taper(0.045, 0.055, 0.46, 8), coat, { y: -0.72, z: back ? 0.03 : 0 });
    piece(leg, UG.sphere, coat, { y: -0.96, z: back ? 0.03 : 0, sx: 0.06, sy: 0.05, sz: 0.06 });
    piece(leg, taper(0.055, 0.07, 0.1, 8), hoof, { y: -1.06, z: back ? 0.03 : 0 });
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

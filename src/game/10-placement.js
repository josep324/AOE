/* ---------- Mode de col·locació (fantasma sobre la graella) ---------- */
const gridTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 61, 61);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const GHOST = {
  ok: new THREE.MeshStandardMaterial({ color: 0x7dff8a, transparent: true, opacity: 0.5, emissive: 0x1f7a2a, depthWrite: false }),
  bad: new THREE.MeshStandardMaterial({ color: 0xff6a6a, transparent: true, opacity: 0.5, emissive: 0x7a1f1f, depthWrite: false }),
};
const placing = { type: null, ghost: null, meshes: [], fpMat: null, overlay: null, valid: false, x: 0, z: 0, chain: 0 };

function builders() {
  return state.selected.filter(s => s.kind === 'unit' && s.isOwn && s.subtype === 'villager');
}
function hasCompleted(subtype, team = PLAYER.id) {
  return state.buildings.some(b => b.subtype === subtype && b.team === team && !b.underConstruction);
}
function buildBlockReason(type, team = PLAYER.id) {
  const def = CONFIG.BUILDINGS[type];
  if ((def.age || 0) > teamOf(team).age) return `Requereix: ${CONFIG.AGES[def.age].name}`;
  if (def.requires && !hasCompleted(def.requires, team)) return `Requereix: ${CONFIG.BUILDINGS[def.requires].name}`;
  if (!canAfford(def.cost, team)) return `Recursos insuficients: cal ${costText(def.cost)}`;
  return null;
}
const WALL_GHOST_GEO = new THREE.BoxGeometry(1, 2.2, 1).translate(0, 1.1, 0);
function startPlacement(type) {
  if (!builders().length) return;
  const reason = buildBlockReason(type);
  if (reason) { toast(reason); return; }
  cancelPlacement();
  const def = CONFIG.BUILDINGS[type];
  if (def.wall) {
    // Muralla: primer clic = inici, arrossegar = línia de trams, deixar anar = construir
    const g = new THREE.Group();
    scene.add(g);
    Object.assign(placing, { type, ghost: g, wall: true, start: null, cells: [], pool: [], valid: false, chain: 0, overlay: null });
    toast(`${def.name}: prem i arrossega per traçar la línia (${costText(def.cost)} per tram)`);
    updatePlacement();
    return;
  }
  placing.wall = false;
  const [sw, sd] = def.size;
  const g = new THREE.Group();
  const { model } = makeBuildingModel(type);
  placing.meshes = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.material = GHOST.ok;
    o.castShadow = false;
    o.raycast = () => {};
    placing.meshes.push(o);
  });
  // Petjada de l'edifici (una cel·la per unitat)
  const tex = gridTex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(sw, sd);
  placing.fpMat = new THREE.MeshBasicMaterial({ map: tex, color: 0x7dff8a, transparent: true, opacity: 0.75, depthWrite: false, fog: false, toneMapped: false });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), placing.fpMat);
  fp.rotation.x = -Math.PI / 2;
  fp.position.y = 0.06;
  fp.renderOrder = 7;
  // Graella de referència al voltant
  const otex = gridTex.clone();
  otex.needsUpdate = true;
  otex.repeat.set(24, 24);
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ map: otex, color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false, fog: false, toneMapped: false }));
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.y = 0.04;
  overlay.renderOrder = 6;
  g.add(model, fp, overlay);
  scene.add(g);
  Object.assign(placing, { type, ghost: g, overlay, valid: false, chain: 0, rot: placing.rot || 0 });
  if (def.gate) toast('Porta: col·loca-la sobre la muralla (substitueix els trams) · R per girar-la');
  updatePlacement();
}
function cancelPlacement() {
  if (placing.ghost) scene.remove(placing.ghost);
  placing.type = null;
  placing.ghost = null;
  placing.meshes = [];
  placing.wall = false;
  placing.start = null;
}
/* Cel·les d'una línia recta entre dues cel·les (Bresenham) */
function lineCells(x0, z0, x1, z1, max = 60) {
  const out = [];
  let i0 = Math.floor(x0), j0 = Math.floor(z0);
  const i1 = Math.floor(x1), j1 = Math.floor(z1);
  const di = Math.abs(i1 - i0), dj = Math.abs(j1 - j0);
  const si = i0 < i1 ? 1 : -1, sj = j0 < j1 ? 1 : -1;
  let err = di - dj;
  for (;;) {
    out.push([i0 + 0.5, j0 + 0.5]);
    if ((i0 === i1 && j0 === j1) || out.length >= max) break;
    const e2 = 2 * err;
    if (e2 > -dj) { err -= dj; i0 += si; }
    if (e2 < di) { err += di; j0 += sj; }
  }
  return out;
}
function updateWallPlacement(p) {
  const cur = [snapToGrid(p.x, 1), snapToGrid(p.z, 1)];
  const cells = placing.start ? lineCells(placing.start[0], placing.start[1], cur[0], cur[1]) : [cur];
  const def = CONFIG.BUILDINGS[placing.type];
  const res = resOf(PLAYER.id);
  const perCost = def.cost;
  let affordable = Infinity;
  for (const [k, v] of Object.entries(perCost)) affordable = Math.min(affordable, Math.floor(res[k] / v));
  while (placing.pool.length < cells.length) {
    const m = new THREE.Mesh(WALL_GHOST_GEO, GHOST.ok);
    m.raycast = () => {};
    placing.ghost.add(m);
    placing.pool.push(m);
  }
  placing.cells = [];
  let n = 0;
  placing.pool.forEach((m, i) => {
    if (i >= cells.length) { m.visible = false; return; }
    const [x, z] = cells[i];
    const ok = canPlace(placing.type, x, z) && n < affordable;
    if (ok) { n++; placing.cells.push([x, z]); }
    m.visible = true;
    m.position.set(x, 0, z);
    m.material = ok ? GHOST.ok : GHOST.bad;
  });
  placing.valid = placing.cells.length > 0;
}
function confirmWall(shift) {
  const type = placing.type;
  const units = builders();
  if (!units.length || !placing.cells.length) { placing.start = null; if (!placing.cells.length) toast('No es pot construir aquí'); return; }
  const def = CONFIG.BUILDINGS[type];
  // Ordenem els trams des de l'extrem més proper als constructors
  const c = units[0].position;
  const cells = placing.cells.slice();
  const first = cells[0], last = cells[cells.length - 1];
  if (Math.hypot(last[0] - c.x, last[1] - c.z) < Math.hypot(first[0] - c.x, first[1] - c.z)) cells.reverse();
  createBuilding.batch = true;
  const segs = [];
  for (const [x, z] of cells) {
    if (!canAfford(def.cost)) break;
    applyCost(def.cost);
    segs.push(createBuilding(type, x, z, false));
  }
  createBuilding.batch = false;
  rebuildNav();
  if (segs.length) {
    if (shift && placing.chain > 0) units.forEach(u => segs.forEach(b => enqueueOrder(u, { type: 'build', building: b })));
    else {
      commandBuild(units, segs[0]);
      units.forEach(u => segs.slice(1).forEach(b => u.orderQueue.push({ type: 'build', building: b })));
    }
    placing.chain++;
    toast(`${def.icon} ${segs.length} trams de ${def.name.toLowerCase()} (${costText(Object.fromEntries(Object.entries(def.cost).map(([k, v]) => [k, v * segs.length])))})`);
  }
  placing.start = null;
  if (!shift || buildBlockReason(type)) cancelPlacement();
}
function snapToGrid(v, cells) {
  // Mida senar → centre a mitja cel·la; mida parell → centre a la vora d'una cel·la
  return cells % 2 ? Math.round(v - 0.5) + 0.5 : Math.round(v);
}
/* Trams de muralla propis dins d'un rectangle (la porta els substitueix) */
function wallsIn(x, z, sw, sd, team = PLAYER.id) {
  return state.buildings.filter(b => b.isWall && b.team === team && !b.dead
    && Math.abs(b.position.x - x) < sw / 2 && Math.abs(b.position.z - z) < sd / 2);
}
function canPlace(type, x, z, rot = 0) {
  const [sw, sd] = sizeOf(type, rot);
  const L = CONFIG.MAP_LIMIT;
  if (Math.abs(x) + sw / 2 > L - 1 || Math.abs(z) + sd / 2 > L - 1) return false;
  const N = NAV.N;
  const walls = CONFIG.BUILDINGS[type].gate ? wallsIn(x, z, sw, sd) : [];
  for (let j = navCell(z - sd / 2 + 0.01); j <= navCell(z + sd / 2 - 0.01); j++)
    for (let i = navCell(x - sw / 2 + 0.01); i <= navCell(x + sw / 2 - 0.01); i++) {
      if (!NAV.build[j * N + i]) continue;
      // Porta: la cel·la pot estar ocupada per un tram de muralla propi
      const cx = navCenter(i), cz = navCenter(j);
      if (walls.some(w => Math.abs(w.position.x - cx) < 0.6 && Math.abs(w.position.z - cz) < 0.6)) continue;
      return false;
    }
  // Tampoc a sobre de les ovelles
  for (const n of state.resourceNodes) {
    if (n.subtype === 'sheep' && Math.abs(n.position.x - x) < sw / 2 + 0.6 && Math.abs(n.position.z - z) < sd / 2 + 0.6) return false;
  }
  return true;
}
/* Porta: si el cursor és a prop d'una muralla pròpia, s'orienta en la seva direcció i s'hi encaixa */
function snapGateToWall(p) {
  let near = null, bestD = 2.5;
  for (const b of state.buildings) {
    if (!b.isWall || b.team !== PLAYER.id || b.dead) continue;
    const d = Math.hypot(b.position.x - p.x, b.position.z - p.z);
    if (d < bestD) { bestD = d; near = b; }
  }
  if (!near) return null;
  const at = (dx, dz) => state.buildings.some(b => b.isWall && b.team === PLAYER.id && !b.dead
    && Math.abs(b.position.x - (near.position.x + dx)) < 0.2 && Math.abs(b.position.z - (near.position.z + dz)) < 0.2);
  const horiz = at(1, 0) || at(-1, 0), vert = at(0, 1) || at(0, -1);
  if (horiz === vert) return null;
  // Porta de 3 cel·les centrada a la muralla, sobre la mateixa línia
  return horiz
    ? { rot: 0, x: snapToGrid(p.x, 3), z: near.position.z }
    : { rot: 1, x: near.position.x, z: snapToGrid(p.z, 3) };
}
function updatePlacement() {
  if (!placing.type) return;
  const p = pickGround(mouse.x, mouse.y);
  if (!p) return;
  if (placing.wall) { updateWallPlacement(p); return; }
  const gateSnap = CONFIG.BUILDINGS[placing.type].gate ? snapGateToWall(p) : null;
  if (gateSnap) placing.rot = gateSnap.rot;
  const [sw, sd] = sizeOf(placing.type, placing.rot);
  placing.x = gateSnap ? gateSnap.x : snapToGrid(p.x, sw);
  placing.z = gateSnap ? gateSnap.z : snapToGrid(p.z, sd);
  placing.ghost.position.set(placing.x, 0, placing.z);
  placing.ghost.rotation.y = placing.rot ? Math.PI / 2 : 0;
  placing.overlay.position.set(Math.round(placing.x) - placing.x, 0.04, Math.round(placing.z) - placing.z);
  const valid = canPlace(placing.type, placing.x, placing.z, placing.rot) && !buildBlockReason(placing.type);
  if (valid !== placing.valid) {
    placing.valid = valid;
    for (const m of placing.meshes) m.material = valid ? GHOST.ok : GHOST.bad;
    placing.fpMat.color.setHex(valid ? 0x7dff8a : 0xff6a6a);
  }
}
function confirmPlacement(shift) {
  const type = placing.type;
  const reason = buildBlockReason(type);
  if (reason) { toast(reason); cancelPlacement(); return; }
  if (!placing.valid) { toast('No es pot construir aquí'); return; }
  const units = builders();
  if (!units.length) { cancelPlacement(); return; }
  applyCost(CONFIG.BUILDINGS[type].cost);
  if (CONFIG.BUILDINGS[type].gate) {
    // La porta substitueix els trams de muralla que ocupa
    const [gw, gd] = sizeOf(type, placing.rot);
    for (const w of wallsIn(placing.x, placing.z, gw, gd)) {
      w.dead = true; w.depleted = true;
      state.buildings = state.buildings.filter(x => x !== w);
      state.obstacles = state.obstacles.filter(o => o.entity !== w);
      state.pickables = state.pickables.filter(m => m.userData.entity !== w);
      scene.remove(w.group);
    }
  }
  const b = createBuilding(type, placing.x, placing.z, false, PLAYER.id, placing.rot);
  // Amb Shift es poden col·locar diversos fonaments seguits: s'encuen com a ordres
  if (shift && placing.chain > 0) units.forEach(u => enqueueOrder(u, { type: 'build', building: b }));
  else commandBuild(units, b);
  placing.chain++;
  spawnMoveMarker(b.position, 0x6ef2ff, b.radius * 0.8);
  placing.valid = null;   // força el refresc del color
  if (!shift || buildBlockReason(type)) cancelPlacement();
}

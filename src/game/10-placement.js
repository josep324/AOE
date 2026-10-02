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
  if (def.dock && !WATER.any) return 'En aquest mapa no hi ha aigua per a un Moll';
  if (def.requires && !hasCompleted(def.requires, team)) return `Requereix: ${CONFIG.BUILDINGS[def.requires].name}`;
  if (def.requiresTech && !teamOf(team).techs.has(def.requiresTech)) return `Cal investigar abans: ${CONFIG.TECHS[def.requiresTech].name}`;
  if (!canAfford(costFor(type, team), team)) return `Recursos insuficients: cal ${costText(costFor(type, team))}`;
  return null;
}
/* Les muralles van per caselles de l'AoE II (2×2 m): centres a les coordenades senars */
const WALL_TILE = 2;
const wallSnap = (v) => Math.floor(v / WALL_TILE) * WALL_TILE + WALL_TILE / 2;
const WALL_GHOST_GEO = new THREE.BoxGeometry(WALL_TILE, 2.6, WALL_TILE).translate(0, 1.3, 0);
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
    toast(`${def.name}: prem i arrossega per traçar la línia (${costText(costFor(type))} per tram)`);
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
/* Caselles d'una línia recta entre dues caselles de muralla (Bresenham) */
function lineCells(x0, z0, x1, z1, max = 40) {
  const out = [], T = WALL_TILE;
  let i0 = Math.floor(x0 / T), j0 = Math.floor(z0 / T);
  const i1 = Math.floor(x1 / T), j1 = Math.floor(z1 / T);
  const di = Math.abs(i1 - i0), dj = Math.abs(j1 - j0);
  const si = i0 < i1 ? 1 : -1, sj = j0 < j1 ? 1 : -1;
  let err = di - dj;
  for (;;) {
    out.push([(i0 + 0.5) * T, (j0 + 0.5) * T]);
    if ((i0 === i1 && j0 === j1) || out.length >= max) break;
    const e2 = 2 * err;
    if (e2 > -dj) { err -= dj; i0 += si; }
    if (e2 < di) { err += di; j0 += sj; }
  }
  return out;
}
/* La casella ja és impassable per si mateixa (troncs i farciment del bosc, penya-segat…): totes les cel·les */
function wallCellClosed(x, z) {
  const h = WALL_TILE / 2 - 0.01;
  for (let j = navCell(z - h); j <= navCell(z + h); j++) for (let i = navCell(x - h); i <= navCell(x + h); i++)
    if (NAV.walk[j * NAV.N + i] !== 1) return false;
  return true;
}
function updateWallPlacement(p) {
  const cur = [wallSnap(p.x), wallSnap(p.z)];
  const cells = placing.start ? lineCells(placing.start[0], placing.start[1], cur[0], cur[1]) : [cur];
  const def = CONFIG.BUILDINGS[placing.type];
  const res = resOf(PLAYER.id);
  const perCost = costFor(placing.type);
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
    // Un tram on ja no es pot passar (dins del bosc, entre troncs) no cal: no es mostra ni es paga.
    // Així es pot arrossegar d'arbre a arbre i només es fan els trams dels forats
    if (wallCellClosed(x, z)) { m.visible = false; return; }
    const ok = canPlace(placing.type, x, z) && n < affordable;
    if (ok) { n++; placing.cells.push([x, z]); }
    m.visible = true;
    m.position.set(x, groundY(x, z), z);
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
    if (!canAfford(costFor(placing.type))) break;
    applyCost(costFor(placing.type));
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
    toast(`${def.icon} ${segs.length} trams de ${def.name.toLowerCase()} (${costText(Object.fromEntries(Object.entries(costFor(type)).map(([k, v]) => [k, v * segs.length])))})`);
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
const WATER_BUILD_MIN = 0.1;      // el pla de l'aigua és a 0,07 m
/* Alguna part de la cel·la (centre o cantonades) queda sota el pla de l'aigua? */
function belowWater(cx, cz) {
  if (!waterNear(cx, cz, 2)) return false;          // lluny de l'aigua el terreny pla és a 0,02 m i no es veu cap aigua
  for (const [dx, dz] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) if (groundY(cx + dx, cz + dz) < WATER_BUILD_MIN) return true;
  return false;
}
function canPlace(type, x, z, rot = 0) {
  if (CONFIG.BUILDINGS[type].dock) return canPlaceDock(x, z, rot);
  const [sw, sd] = sizeOf(type, rot);
  const L = CONFIG.MAP_LIMIT;
  if (Math.abs(x) + sw / 2 > L - 1 || Math.abs(z) + sd / 2 > L - 1) return false;
  // Com a l'AoE II, no es pot construir en un pendent massa fort
  if (slopeIn(x, z, sw / 2, sd / 2) > MAX_BUILD_SLOPE) return false;
  const N = NAV.N;
  const walls = CONFIG.BUILDINGS[type].gate ? wallsIn(x, z, sw, sd) : [];
  const wallLike = !!(CONFIG.BUILDINGS[type].wall || CONFIG.BUILDINGS[type].gate);
  for (let j = navCell(z - sd / 2 + 0.01); j <= navCell(z + sd / 2 - 0.01); j++)
    for (let i = navCell(x - sw / 2 + 0.01); i <= navCell(x + sw / 2 - 0.01); i++) {
      const bv = NAV.build[j * N + i];
      // A la riba el terreny queda per sota del pla de l'aigua: l'edifici semblaria dins del mar
      if (WATER.any && belowWater(navCenter(i), navCenter(j))) return false;
      if (!bv || (bv === 2 && wallLike)) continue;
      // Porta: la cel·la pot estar ocupada per un tram de muralla propi
      const cx = navCenter(i), cz = navCenter(j);
      if (walls.some(w => Math.abs(w.position.x - cx) < w.footprint.hw + 0.1 && Math.abs(w.position.z - cz) < w.footprint.hd + 0.1)) continue;
      return false;
    }
  // Tampoc a sobre de les ovelles ni de les relíquies (quedarien atrapades sota l'edifici)
  for (const n of state.resourceNodes) {
    if (n.subtype === 'sheep' && Math.abs(n.position.x - x) < sw / 2 + 0.6 && Math.abs(n.position.z - z) < sd / 2 + 0.6) return false;
  }
  for (const r of state.relics) {
    if (!r.carrier && !r.holder && Math.abs(r.position.x - x) < sw / 2 + 0.7 && Math.abs(r.position.z - z) < sd / 2 + 0.7) return false;
  }
  return true;
}
/* Porta: si el cursor és a prop d'una muralla pròpia, s'orienta en la seva direcció i s'hi encaixa */
function snapGateToWall(p) {
  let near = null, bestD = 3.5;
  for (const b of state.buildings) {
    if (!b.isWall || b.team !== PLAYER.id || b.dead) continue;
    const d = Math.hypot(b.position.x - p.x, b.position.z - p.z);
    if (d < bestD) { bestD = d; near = b; }
  }
  if (!near) return null;
  const at = (dx, dz) => state.buildings.some(b => b.isWall && b.team === PLAYER.id && !b.dead
    && Math.abs(b.position.x - (near.position.x + dx)) < 0.2 && Math.abs(b.position.z - (near.position.z + dz)) < 0.2);
  const T = WALL_TILE;
  const horiz = at(T, 0) || at(-T, 0), vert = at(0, T) || at(0, -T);
  if (horiz === vert) return null;
  // Porta centrada a la muralla, sobre la mateixa línia (ocupa caselles senceres: amb un nombre parell, el centre
  // cau entre dues caselles)
  const n = Math.round(CONFIG.BUILDINGS.gate.size[0] / T);
  const along = (v) => n % 2 ? wallSnap(v) : Math.round(v / T) * T;
  return horiz
    ? { rot: 0, x: along(p.x), z: near.position.z }
    : { rot: 1, x: near.position.x, z: along(p.z) };
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
  placing.ghost.position.set(placing.x, CONFIG.BUILDINGS[placing.type].dock ? 0 : flattenArea(placing.x, placing.z, sw / 2, sd / 2, false), placing.z);
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
  applyCost(costFor(type));
  if (CONFIG.BUILDINGS[type].gate) {
    // La porta substitueix els trams de muralla que ocupa
    const [gw, gd] = sizeOf(type, placing.rot);
    for (const w of wallsIn(placing.x, placing.z, gw, gd)) {
      w.dead = true; w.depleted = true;
      state.buildings = state.buildings.filter(x => x !== w);
      dropObstaclesOf(w); LINKS.walls = true;
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

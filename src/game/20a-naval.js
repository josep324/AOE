/* =====================================================================
   NAVAL: moll, vaixells, pesca, transport i combat a l'aigua
   Els vaixells naveguen per una graella pròpia (només aigua fonda). El Moll es construeix
   sobre l'aigua tocant a la riba: els aldeans el fan des de terra i els vaixells hi arriben per mar.
   ===================================================================== */
const SHIP_RADIUS = { fishingship: 1.0, transport: 1.45, galley: 1.3, wargalley: 1.35, galleon: 1.6, fireship: 1.2, demoship: 1.0, cannongalleon: 1.7 };

/* Cel·la més propera (espiral) que compleix una condició */
function nearestCellWhere(p, pred, maxR = 8) {
  const ci = Math.floor(p.x), cj = Math.floor(p.z);
  let best = null, bestD = Infinity;
  for (let r = 0; r <= maxR; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const x = ci + di + 0.5, z = cj + dj + 0.5;
      if (Math.abs(x) > CONFIG.MAP_LIMIT - 1 || Math.abs(z) > CONFIG.MAP_LIMIT - 1 || !pred(x, z)) continue;
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < bestD) { bestD = d; best = new THREE.Vector3(x, 0, z); }
    }
    if (best) return best;
  }
  return null;
}
const isOpenWater = (x, z) => waterCell(x, z) === 1 && !NAV.naval[navCell(z) * NAV.N + navCell(x)];
const isDryLand = (x, z) => waterCell(x, z) !== 1 && !NAV.walk[navCell(z) * NAV.N + navCell(x)];
/* Ajusta un punt d'aproximació al medi de la unitat (terra o aigua) */
function fitToMedium(p, naval) {
  if (!WATER.any) return p;
  if (naval ? isOpenWater(p.x, p.z) : waterCell(p.x, p.z) !== 1) return p;
  return nearestCellWhere(p, naval ? isOpenWater : isDryLand, 7) || p;
}
/* Lloc d'aigua lliure al voltant d'un moll (per als vaixells nous) */
function findWaterSpot(b) {
  const base = (b.footprint ? Math.max(b.footprint.hw, b.footprint.hd) : b.radius) + 1.8;
  for (let ring = 0; ring < 10; ring++) {
    const r = base + ring * 1.5;
    const n = Math.max(10, Math.floor((2 * Math.PI * r) / 1.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = b.position.x + Math.sin(a) * r, z = b.position.z + Math.cos(a) * r;
      if (!isOpenWater(x, z)) continue;
      if (state.units.some(u => u.naval && !u.garrisoned && Math.hypot(u.position.x - x, u.position.z - z) < 2.4)) continue;
      return { x, z, angle: a };
    }
  }
  return { x: b.position.x, z: b.position.z + base, angle: 0 };
}

/* ---------- Moll: sobre aigua fonda i tocant a la riba ---------- */
function canPlaceDock(x, z, rot = 0) {
  if (!WATER.any) return false;
  const [sw, sd] = sizeOf('dock', rot);
  const L = CONFIG.MAP_LIMIT;
  if (Math.abs(x) + sw / 2 > L - 2 || Math.abs(z) + sd / 2 > L - 2) return false;
  const N = NAV.N;
  for (let j = navCell(z - sd / 2 + 0.01); j <= navCell(z + sd / 2 - 0.01); j++)
    for (let i = navCell(x - sw / 2 + 0.01); i <= navCell(x + sw / 2 - 0.01); i++) {
      if (WATER.mask[j * N + i] !== 1 || NAV.naval[j * N + i]) return false;
    }
  // Ha de tocar terra per almenys un costat
  let shore = 0;
  for (let t = -sw / 2 + 0.5; t < sw / 2; t += 1) {
    if (!waterCell(x + t, z - sd / 2 - 0.6) || !waterCell(x + t, z + sd / 2 + 0.6)) shore++;
  }
  for (let t = -sd / 2 + 0.5; t < sd / 2; t += 1) {
    if (!waterCell(x - sw / 2 - 0.6, z + t) || !waterCell(x + sw / 2 + 0.6, z + t)) shore++;
  }
  return shore >= 2;
}
/* Busca on posar un moll a prop d'un punt (IA) */
function findDockSpot(near, maxR = 80) {
  if (!WATER.any) return null;
  const cands = [];
  const L = CONFIG.MAP_LIMIT, N = WATER.N;
  for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
    if (WATER.mask[j * N + i] !== 1) continue;
    const x = -L + i + 0.5, z = -L + j + 0.5;
    const d = Math.hypot(x - near.x, z - near.z);
    if (d < maxR) cands.push([d, x, z]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (const [, x0, z0] of cands) {
    for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const x = snapToGrid(x0 + ox, 5), z = snapToGrid(z0 + oz, 5);
      if (canPlaceDock(x, z)) return { x, z };
    }
  }
  return null;
}

/* ---------- Transport: embarcar i desembarcar ---------- */
function orderUnload(ship, point) {
  ship.orderQueue.length = 0;
  ship.attackTarget = null; ship.gatherNode = null;
  ship.unloadAt = point.clone();
  setMoveTarget(ship, point);
  setUnitState(ship, STATE.MOVING);
}
/* Desembarca a la riba més propera i envia les tropes al punt triat */
function doUnload(ship) {
  const to = ship.unloadAt;
  ship.unloadAt = null;
  if (!ship.garrison || !ship.garrison.length) { setUnitState(ship, STATE.IDLE); return; }
  const units = ship.garrison.slice();
  ungarrison(ship);
  if (ship.garrison.length) return;           // encara no toca a la riba
  setMoveTarget(ship, null);
  setUnitState(ship, STATE.IDLE);
  const onLand = units.filter(u => !u.dead && waterCell(u.position.x, u.position.z) !== 1);
  if (to && onLand.length) commandMove(onLand, to);
  if (ship.isOwn) toast(`⛵ ${units.length} unitats desembarcades`);
}
/* Cada pas: si porta tropes i ja és a prop de la riba de destí, desembarca */
function shipUnloadTick(u) {
  if (!u.unloadAt) return false;
  const shoreNear = nearestCellWhere(u.position, isDryLand, 4);
  if (shoreNear && hDist(u.position, u.unloadAt) < 16) { doUnload(u); return true; }
  return false;
}

/* ---------- Combat naval ---------- */
/* Vaixell de demolició: esclata i fa mal a tot el que hi ha al voltant */
function explodeDemolition(u, t) {
  const p = t.position || u.position;
  spawnParticles(new THREE.Vector3(p.x, 1.2, p.z), 0xff7a1a, 26, null);
  spawnParticles(new THREE.Vector3(p.x, 1.6, p.z), 0x3a3430, 18, null);
  const R = 3.4;
  for (const e of unitsNear(p.x, p.z, R + 2, splashBuf)) {
    if (e === u || e.dead || e.garrisoned) continue;
    const d = hDist(e.position, p) - e.radius;
    if (d > R) continue;
    applyDamage(e, Math.max(1, Math.round(computeDamage(u.attack, e, 0) * (d < 1.5 ? 1 : 0.5))), u);
  }
  for (const b of state.buildings.slice()) {
    if (b.team === u.team || b.dead) continue;
    if (entSurfaceDist(b, p.x, p.z) <= R) applyDamage(b, computeDamage(u.attack, b, 0, 40), u);
  }
  killEntity(u, null);
}
/* Brulot: raig de foc a curta distància */
function fireSpray(u, t) {
  const dir = new THREE.Vector3(t.position.x - u.position.x, 0, t.position.z - u.position.z).normalize();
  if (vrand() < 0.5) spawnParticles(new THREE.Vector3(u.position.x + dir.x * 1.2, 1.3, u.position.z + dir.z * 1.2), 0xff8a2a, 2, dir.clone().negate());
  applyDamage(t, hitDamage(u, t, 1), u);
}

/* ---------- Balanceig i rems ---------- */
function animateShip(u, dt, walking) {
  const t = state.elapsed + u.id * 0.37;
  u.model.rotation.z = Math.sin(t * 1.3) * 0.035 + (walking ? 0 : 0);
  u.model.rotation.x = Math.sin(t * 0.9) * 0.025;
  u.model.position.y = Math.sin(t * 1.7) * 0.05;
  if (u.oars) for (const o of u.oars) {
    // Palada: les pales escombren endavant i endarrere i s'enfonsen a l'aigua
    const ph = state.elapsed * 3.2;
    o.rotation.y = walking ? Math.sin(ph) * 0.28 * (o.userData.side || 1) : THREE.MathUtils.damp(o.rotation.y, 0, 3, dt);
    o.rotation.z = walking ? (o.userData.side || 1) * Math.cos(ph) * 0.1 : THREE.MathUtils.damp(o.rotation.z, 0, 3, dt);
  }
  if (u.sail) u.sail.scale.z = THREE.MathUtils.damp(u.sail.scale.z, walking ? 1.35 : 1, 2, dt);
  u.fireT = Math.max(0, (u.fireT || 0) - dt);
}

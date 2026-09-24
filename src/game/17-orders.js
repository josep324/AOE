/* =====================================================================
   ORDRES: MOVIMENT EN FORMACIÓ
   ===================================================================== */
function clampToMap(v) {
  v.x = THREE.MathUtils.clamp(v.x, -CONFIG.MAP_LIMIT, CONFIG.MAP_LIMIT);
  v.z = THREE.MathUtils.clamp(v.z, -CONFIG.MAP_LIMIT, CONFIG.MAP_LIMIT);
  return v;
}
function pushOutOfObstacles(p, margin) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const o of state.obstacles) if (pushOutOf(p, o, margin)) moved = true;
    if (!moved) break;
  }
  return p;
}

/* Calcula el lloc de cada unitat en una formació al voltant d'un punt */
function formationSlots(units, point) {
  const result = new Map();
  const n = units.length;
  const spacing = 1.55;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  // Orientem la formació segons la direcció de marxa del grup
  const centroid = new THREE.Vector3();
  units.forEach(u => centroid.add(u.position));
  centroid.divideScalar(n);
  const heading = Math.atan2(point.x - centroid.x, point.z - centroid.z);
  const cos = Math.cos(heading), sin = Math.sin(heading);

  const slots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const rowCount = r === rows - 1 ? n - r * cols : cols;
    const lx = (c - (rowCount - 1) / 2) * spacing;   // lateral
    const lz = -(r - (rows - 1) / 2) * spacing;       // cap endavant
    const slot = new THREE.Vector3(point.x + lx * cos + lz * sin, 0, point.z - lx * sin + lz * cos);
    clampToMap(pushOutOfObstacles(slot, CONFIG.VILLAGER.radius + 0.25));
    slots.push(slot);
  }

  // Assignació voraç: cada slot per a la unitat lliure més propera
  const free = units.slice();
  for (const slot of slots) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < free.length; i++) {
      const d = free[i].position.distanceToSquared(slot);
      if (d < bestD) { bestD = d; best = i; }
    }
    const u = free.splice(best, 1)[0];
    result.set(u, slot);
  }
  return result;
}

function commandMove(units, point, queued = false) {
  for (const [u, slot] of formationSlots(units, point)) {
    if (queued) enqueueOrder(u, { type: 'move', point: slot });
    else { u.orderQueue.length = 0; orderMove(u, slot); }
  }
}

/* Ordres encadenades (Shift + clic dret) */
function enqueueOrder(u, order) {
  if (u.state === STATE.IDLE && !u.orderQueue.length) runOrder(u, order);
  else u.orderQueue.push(order);
}
function runOrder(u, order) {
  if (order.type === 'attack') {
    if (isAttackable(order.target)) orderAttack(u, order.target, false);
    return;
  }
  if (order.type === 'build') {
    if (order.building && !order.building.dead && order.building.underConstruction) orderBuild(u, order.building, null);
    return;
  }
  if (order.type === 'move') orderMove(u, order.point);
  else if (order.type === 'gather') {
    if (order.node && !order.node.depleted) orderGather(u, order.node, null);
  }
}

function commandStop(units) {
  for (const u of units) {
    u.orderQueue.length = 0;
    setMoveTarget(u, null);
    u.attackTarget = null;
    u.attackMove = null;
    u.garrisonTarget = null;
    u.buildTarget = null;
    u.gatherNode = null;
    u.dropTarget = null;
    setUnitState(u, STATE.IDLE);
  }
}

/* Envia aldeans a construir un fonament, repartits al voltant */
function commandBuild(units, b) {
  const centroid = new THREE.Vector3();
  units.forEach(u => centroid.add(u.position));
  centroid.divideScalar(units.length);
  const base = Math.atan2(centroid.x - b.position.x, centroid.z - b.position.z);
  units.forEach((u, k) => {
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
    u.orderQueue.length = 0;
    orderBuild(u, b, base + off);
  });
}

function farmTaken(n, u) {
  return n.subtype === 'farm' && state.units.some(o => o !== u && o.gatherNode === n);
}

/* Envia un grup d'aldeans a treballar un recurs, repartint-los al seu voltant */
function commandGather(units, node) {
  if (node.subtype === 'farm') {
    // Una granja només admet un granger
    const sorted = units.slice().sort((a, b) => a.position.distanceToSquared(node.position) - b.position.distanceToSquared(node.position));
    const others = [];
    for (const u of sorted) {
      if (!farmTaken(node, u) && !others.assigned) { u.orderQueue.length = 0; orderGather(u, node, null); others.assigned = true; }
      else others.push(u);
    }
    if (others.length) {
      toast('Una granja només admet un granger');
      commandMove(others, approachPoint(node, others[0].position));
    }
    return;
  }
  const centroid = new THREE.Vector3();
  units.forEach(u => centroid.add(u.position));
  centroid.divideScalar(units.length);
  const base = Math.atan2(centroid.x - node.position.x, centroid.z - node.position.z);
  // Separació angular segons la mida del recurs (≈1.1 unitats d'arc entre aldeans)
  const ringR = node.radius + CONFIG.VILLAGER.radius + 0.3;
  const stepA = Math.min(1.1, 1.15 / ringR);
  // Els aldeans que ja hi treballen ocupen els primers llocs
  const already = state.units.filter(u => u.gatherNode === node && !units.includes(u)).length;
  const sorted = units.slice().sort((a, b) => a.position.distanceToSquared(node.position) - b.position.distanceToSquared(node.position));
  sorted.forEach((u, i) => {
    const k = i + already;
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * stepA;
    u.orderQueue.length = 0;
    orderGather(u, node, base + off);
  });
}

/* Clic dret sobre el Centre de Ciutat: els que van carregats hi descarreguen */
function commandReturn(units, building) {
  const empty = [];
  for (const u of units) {
    u.orderQueue.length = 0;
    if (u.carry.amount > 0) {
      u.gatherNode = null;
      goToDropoff(u, building);
    } else {
      empty.push(u);
    }
  }
  if (empty.length) {
    const p = approachPoint(building, empty[0].position);
    commandMove(empty, p);
  }
}

function issueRightClick(x, y, queued = false) {
  let units = state.selected.filter(e => e.kind === 'unit' && e.isOwn);
  const targetEnt = pickEntity(x, y);

  // Centre de Ciutat seleccionat: clic dret = punt de reunió
  if (!units.length) {
    const b = state.selected.length === 1 ? state.selected[0] : null;
    if (b && b.kind === 'building' && b.isOwn && (b.subtype === 'towncenter' || (b.def && b.def.trains))) {
      if (targetEnt === b) { b.rally = null; toast('🚩 Punt de reunió eliminat'); return; }
      if (targetEnt && targetEnt.kind === 'resource' && !targetEnt.depleted) {
        b.rally = { point: targetEnt.position.clone(), node: targetEnt };
        toast(`🚩 Punt de reunió: ${targetEnt.name} (els aldeans hi treballaran)`);
        spawnMoveMarker(targetEnt.position, 0xffd84a, targetEnt.radius + 0.9);
        return;
      }
      const gp = pickGround(x, y);
      if (!gp) return;
      b.rally = { point: clampToMap(gp), node: null };
      toast('🚩 Punt de reunió establert');
      spawnMoveMarker(gp, 0x6ef2ff);
    }
    return;
  }

  // Enemic: atacar (tothom)
  if (targetEnt && targetEnt.team && targetEnt.team !== PLAYER.id && isAttackable(targetEnt)) {
    commandAttack(units, targetEnt, queued);
    spawnMoveMarker(targetEnt.position, 0xff4a3a, (targetEnt.footprint ? targetEnt.footprint.hw : targetEnt.radius) + 0.8);
    return;
  }
  // Carros de comerç sobre un mercat propi: ruta comercial
  const carts = units.filter(u => u.subtype === 'tradecart');
  if (carts.length && targetEnt && targetEnt.subtype === 'market' && targetEnt.isOwn && !targetEnt.underConstruction) {
    carts.forEach(u => orderTrade(u, targetEnt));
    spawnMoveMarker(targetEnt.position, 0xffd84a, 3.5);
    if (carts.length === units.length) return;
    units = units.filter(u => u.subtype !== 'tradecart');
  }
  const vills = units.filter(u => u.subtype === 'villager');
  const soldiers = units.filter(u => u.subtype !== 'villager');
  const soldiersTo = (pos) => { if (soldiers.length) commandMove(soldiers, pos, queued); };
  // Fonament propi: ajudar a construir
  if (vills.length && targetEnt && targetEnt.kind === 'building' && targetEnt.isOwn && targetEnt.underConstruction) {
    if (queued) vills.forEach(u => enqueueOrder(u, { type: 'build', building: targetEnt }));
    else commandBuild(vills, targetEnt);
    soldiersTo(approachPoint(targetEnt, soldiers.length ? soldiers[0].position : targetEnt.position));
    spawnMoveMarker(targetEnt.position, 0x6ef2ff, targetEnt.radius * 0.8);
    return;
  }
  if (vills.length && targetEnt && targetEnt.kind === 'resource' && !targetEnt.depleted) {
    if (queued) vills.forEach(u => enqueueOrder(u, { type: 'gather', node: targetEnt }));
    else commandGather(vills, targetEnt);
    soldiersTo(approachPoint(targetEnt, soldiers.length ? soldiers[0].position : targetEnt.position));
    spawnMoveMarker(targetEnt.position, 0xffd84a, targetEnt.radius + 0.9);
    return;
  }
  // Aldeans cap al Centre de Ciutat amb la campana tocada: s'hi refugien
  if (vills.length && targetEnt && targetEnt.subtype === 'towncenter' && targetEnt.isOwn && targetEnt.garrison && targetEnt.garrison.length && !soldiers.length) {
    vills.forEach(u => orderGarrison(u, targetEnt));
    return;
  }
  if (targetEnt && targetEnt.kind === 'building' && targetEnt.isOwn) {
    if (targetEnt.dropoffTypes) commandReturn(units, targetEnt);
    else commandMove(units, approachPoint(targetEnt, units[0].position), queued);
    spawnMoveMarker(targetEnt.position, 0x6ef2ff, targetEnt.radius * 0.8);
    return;
  }

  const p = pickGround(x, y);
  if (!p) return;
  clampToMap(p);
  commandMove(units, p, queued);
  spawnMoveMarker(p, queued ? 0xfff27a : 0x8dff6a);
}

/* ---------- Marcador de destí ---------- */
const markerGeo = new THREE.TorusGeometry(0.9, 0.08, 8, 48);
const markerGeoInner = new THREE.TorusGeometry(0.4, 0.07, 8, 32);
function spawnMoveMarker(p, color = 0x8dff6a, size = 1) {
  const g = new THREE.Group();
  const m1 = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, toneMapped: false });
  const m2 = m1.clone();
  const r1 = new THREE.Mesh(markerGeo, m1);
  const r2 = new THREE.Mesh(markerGeoInner, m2);
  r1.rotation.x = r2.rotation.x = -Math.PI / 2;
  g.add(r1, r2);
  g.position.set(p.x, 0.14, p.z);
  g.scale.setScalar(size);
  g.renderOrder = 6;
  scene.add(g);
  state.markers.push({ g, r1, r2, mats: [m1, m2], t: 0 });
}
function updateMarkers(dt) {
  for (let i = state.markers.length - 1; i >= 0; i--) {
    const m = state.markers[i];
    m.t += dt;
    const k = m.t / 0.75;
    if (k >= 1) {
      scene.remove(m.g);
      m.mats.forEach(x => x.dispose());
      state.markers.splice(i, 1);
      continue;
    }
    m.r1.scale.setScalar(1.3 - 0.7 * k);
    m.r2.scale.setScalar(0.6 + 0.8 * k);
    m.mats[0].opacity = 1 - k;
    m.mats[1].opacity = (1 - k) * 0.8;
  }
}

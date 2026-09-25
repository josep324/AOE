/* =====================================================================
   ECONOMIA: MÀQUINA D'ESTATS DE L'ALDEÀ
   IDLE → MOVING → GATHERING → RETURNING → MOVING → GATHERING …
   ===================================================================== */
function setUnitState(u, st) {
  u.state = st;
  u.tool.visible = false;
  u.hammerHead.visible = false;
  if (st === STATE.GATHERING && u.gatherNode) {
    const sub = u.gatherNode.subtype;
    // Destral (arbres i ovelles), pic (or, pedra; aixada a la granja), mans (baies)
    u.tool.visible = sub !== 'berries';
    u.axeHead.visible = sub === 'tree' || sub === 'sheep' || sub === 'deer' || sub === 'boar';
    u.pickHead.visible = sub === 'gold' || sub === 'stone' || sub === 'farm';
  } else if (st === STATE.BUILDING) {
    u.tool.visible = true;
    u.axeHead.visible = false;
    u.pickHead.visible = false;
    u.hammerHead.visible = true;
  } else if (st === STATE.ATTACKING && !u.isMilitary) {
    u.tool.visible = true;           // l'aldeà es defensa amb la destral
    u.axeHead.visible = true;
    u.pickHead.visible = false;
  }
}

function hDist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function inReach(u, ent) {
  const d = entSurfaceDist(ent, u.position.x, u.position.z);
  if (ent.def && ent.def.dock && !u.naval) return d - u.radius <= 2.4;   // el moll es construeix des de la riba
  if (ent.animal && ent.alive) return d - u.radius <= HUNT_RANGE;     // caça: llança des de lluny
  if (ent.subtype === 'farm') return d <= 0.25;          // el granger treballa a sobre de la granja
  return d - u.radius <= CONFIG.GATHER.reach;
}

const approachObsBuf = [];
function approachPointAt(ent, angle, naval = false) {
  const m = CONFIG.VILLAGER.radius + 0.3;
  if (ent.landAngle !== undefined && !naval) {
    // Peixos: sempre des de la riba
    const dA = Math.atan2(Math.sin(angle - ent.landAngle), Math.cos(angle - ent.landAngle));
    angle = ent.landAngle + THREE.MathUtils.clamp(dA, -0.9, 0.9);
    const sx = Math.sin(angle), sz = Math.cos(angle);
    let r = ent.radius + m;
    while (r < ent.radius + 5 && waterCell(ent.position.x + sx * r, ent.position.z + sz * r)) r += 0.5;
    return clampToMap(new THREE.Vector3(ent.position.x + sx * r, 0, ent.position.z + sz * r));
  }
  const sx = Math.sin(angle), sz = Math.cos(angle);
  let p;
  if (ent.subtype === 'farm') {
    const r = Math.min(ent.footprint.hw, ent.footprint.hd) * 0.45;
    return clampToMap(new THREE.Vector3(ent.position.x + sx * r, 0, ent.position.z + sz * r));
  }
  if (ent.footprint) {
    // Intersecció del raig amb el rectangle de l'edifici (ampliat amb el marge)
    const hw = ent.footprint.hw + m, hd = ent.footprint.hd + m;
    const t = Math.min(Math.abs(sx) > 1e-6 ? hw / Math.abs(sx) : Infinity, Math.abs(sz) > 1e-6 ? hd / Math.abs(sz) : Infinity);
    p = new THREE.Vector3(ent.position.x + sx * t, 0, ent.position.z + sz * t);
  } else {
    const r = ent.radius + m;
    p = new THREE.Vector3(ent.position.x + sx * r, 0, ent.position.z + sz * r);
  }
  // Evitem que el punt quedi dins d'un altre obstacle (p. ex. un arbre veí)
  for (const o of obstaclesNear(p.x, p.z, approachObsBuf)) {
    if (o.entity === ent) continue;
    pushOutOf(p, o, CONFIG.VILLAGER.radius + 0.1);
  }
  return fitToMedium(clampToMap(p), naval);
}
function approachPoint(ent, fromPos, angleOffset = 0, naval = false) {
  return approachPointAt(ent, Math.atan2(fromPos.x - ent.position.x, fromPos.z - ent.position.z) + angleOffset, naval);
}

function acceptsDropoff(b, type, team = PLAYER.id, naval = false) {
  if (!b || !!(b.def && b.def.dock) !== naval) return false;      // els vaixells descarreguen al moll; els aldeans, a terra
  return !b.dead && b.team === team && !b.underConstruction && b.dropoffTypes && (!type || b.dropoffTypes.includes(type));
}
function nearestDropoff(pos, type = null, team = PLAYER.id, naval = false) {
  let best = null, bestD = Infinity;
  for (const b of state.buildings) {
    if (!acceptsDropoff(b, type, team, naval)) continue;
    const d = entSurfaceDist(b, pos.x, pos.z);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
function nearestResource(type, pos, maxDist = Infinity, forUnit = null) {
  let best = null, bestD = maxDist;
  for (const n of state.resourceNodes) {
    if (n.depleted || n.amount <= 0 || n.resourceType !== type) continue;
    if (n.subtype === 'boar' && n.alive) continue;          // els senglars només si l'ordena el jugador
    if (forUnit && forUnit.naval ? !(n.subtype === 'fish' || n.subtype === 'deepfish') : n.subtype === 'deepfish') continue;
    if (farmTaken(n, forUnit)) continue;
    if (n.subtype === 'farm' && forUnit && n.team !== forUnit.team) continue;
    const d = hDist(n.position, pos);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function orderMove(u, point) {
  u.anchor = point.clone ? point.clone() : null;
  u.convTarget = null; u.healTarget = null; u.relicTarget = null; u.relicDrop = null; u.unloadAt = null;
  u.forcedTarget = false;
  u.gatherNode = null;
  u.dropTarget = null;
  u.buildTarget = null;
  u.attackTarget = null;
  u.attackMove = null;
  u.garrisonTarget = null;
  setMoveTarget(u, point);
  setUnitState(u, STATE.MOVING);
}

function orderBuild(u, b, angle = null) {
  u.attackTarget = null;
  u.gatherNode = null;
  u.dropTarget = null;
  u.buildTarget = b;
  u.buildAngle = angle;
  u.approachTries = 0;
  goToBuild(u);
}
function goToBuild(u) {
  const b = u.buildTarget;
  const p = u.buildAngle !== null ? approachPointAt(b, u.buildAngle) : approachPoint(b, u.position, ((u.id % 5) - 2) * 0.3);
  setMoveTarget(u, p);
  setUnitState(u, STATE.MOVING);
}
function startBuilding(u) {
  setMoveTarget(u, null);
  u.workPhase = 0;
  u.approachTries = 0;
  setUnitState(u, STATE.BUILDING);
}
/* Després d'acabar un edifici: com a l'AoE, el constructor es posa a treballar a prop */
function afterBuild(u, b) {
  u.buildTarget = null;
  setMoveTarget(u, null);
  if (u.orderQueue.length) { setUnitState(u, STATE.IDLE); return; }
  if (b.subtype === 'farm' && !b.depleted && !b.dead && !farmTaken(b, u)) { orderGather(u, b, null); return; }
  // Fonaments propis a mig construir a prop: continuar-hi (com a l'AoE)
  let next = null, nd = 22;
  for (const o of state.buildings) {
    if (o === b || o.team !== u.team || !o.underConstruction || o.dead) continue;
    const d = entSurfaceDist(o, u.position.x, u.position.z);
    if (d < nd) { nd = d; next = o; }
  }
  if (next) { orderBuild(u, next, null); return; }
  if (b.dropoffTypes && b.subtype !== 'towncenter') {
    let best = null, bestD = Infinity;
    for (const type of b.dropoffTypes) {
      const n = nearestResource(type, b.position, 25, u);
      if (n && hDist(n.position, b.position) < bestD) { bestD = hDist(n.position, b.position); best = n; }
    }
    if (best) { orderGather(u, best, null); return; }
  }
  setUnitState(u, STATE.IDLE);
}
/* Si en arribar no és prou a prop (punt bloquejat), prova un altre angle */
function retryApproach(u) {
  u.approachTries++;
  if (u.approachTries > 6) {
    u.buildTarget = null;
    u.gatherNode = null;
    setUnitState(u, STATE.IDLE);
    return;
  }
  if (u.buildTarget) {
    u.buildAngle = (u.buildAngle ?? Math.atan2(u.position.x - u.buildTarget.position.x, u.position.z - u.buildTarget.position.z)) + 0.9;
    goToBuild(u);
  } else if (u.gatherNode) {
    u.gatherAngle = (u.gatherAngle ?? Math.atan2(u.position.x - u.gatherNode.position.x, u.position.z - u.gatherNode.position.z)) + 0.9;
    goToResource(u);
  }
}

function orderGather(u, node, angle = null) {
  // Si canvia de tipus de recurs, perd la càrrega anterior (com als RTS clàssics)
  if (u.carry.amount > 0 && u.carry.type !== node.resourceType) {
    u.carry.amount = 0;
    u.carry.type = null;
    updateCarryVisual(u);
  }
  u.gatherNode = node;
  u.gatherAngle = angle;
  u.dropTarget = null;
  u.buildTarget = null;
  u.attackTarget = null;
  u.approachTries = 0;
  u.lastResourceType = node.resourceType;
  u.lastNodePos.copy(node.position);
  goToResource(u);
}

function goToResource(u) {
  const node = u.gatherNode;
  if (!node || node.depleted) { findNextResource(u); return; }
  if ((node.animal && node.alive) || u.naval) { setMoveTarget(u, node.position.clone()); setUnitState(u, STATE.MOVING); return; }
  setMoveTarget(u, u.gatherAngle !== null
    ? approachPointAt(node, u.gatherAngle)
    : approachPoint(node, u.position, ((u.id % 5) - 2) * 0.35));
  setUnitState(u, STATE.MOVING);
}

function goToDropoff(u, building = null) {
  // El magatzem més proper que accepti el tipus de càrrega (Centre, Serradora, Campament miner, Molí)
  const nv = !!u.naval;
  const tc = acceptsDropoff(building, u.carry.type, u.team, nv) ? building : nearestDropoff(u.position, u.carry.type, u.team, nv);
  if (!tc) { setMoveTarget(u, null); setUnitState(u, STATE.IDLE); if (nv && u.isOwn) toast('⚓ Cal un Moll acabat perquè el vaixell hi descarregui'); return; }
  u.dropTarget = tc;
  setMoveTarget(u, approachPoint(tc, u.position, ((u.id % 7) - 3) * 0.06, nv));
  setUnitState(u, STATE.RETURNING);
}

/* Quan el recurs actual desapareix, en busca un altre del mateix tipus a prop */
/* Tria el recurs que queda més a prop del magatzem de la zona (i no gaire lluny d'on treballava) */
function nextResourceNear(type, fromPos, u) {
  const R = CONFIG.GATHER.autoSearchRadius;
  const drop = nearestDropoff(fromPos, type, u.team, !!u.naval);
  let best = null, bestS = Infinity;
  for (const n of state.resourceNodes) {
    if (n.depleted || n.amount <= 0 || n.resourceType !== type) continue;
    if (n.subtype === 'boar' && n.alive) continue;
    if (u.naval ? !(n.subtype === 'fish' || n.subtype === 'deepfish') : n.subtype === 'deepfish') continue;
    if (farmTaken(n, u) || (n.subtype === 'farm' && n.team !== u.team)) continue;
    const dWork = hDist(n.position, fromPos);
    if (dWork > R * 1.5) continue;
    const score = (drop ? hDist(n.position, drop.position) : 0) + dWork * 0.5;
    if (score < bestS) { bestS = score; best = n; }
  }
  return best;
}
function findNextResource(u) {
  const type = u.lastResourceType;
  const next = type ? nextResourceNear(type, u.lastNodePos, u) : null;
  if (next) {
    u.gatherNode = next;
    u.gatherAngle = null;
    u.lastNodePos.copy(next.position);
    goToResource(u);
  } else if (u.carry.amount > 0) {
    u.gatherNode = null;
    goToDropoff(u);
  } else {
    u.gatherNode = null;
    u.target = null;
    setUnitState(u, STATE.IDLE);
  }
}

function startGathering(u) {
  setMoveTarget(u, null);
  u.approachTries = 0;
  u.gatherProgress = 0;
  u.workPhase = 0;
  setUnitState(u, STATE.GATHERING);
}

function depositCarry(u) {
  const tc = u.dropTarget;
  if (u.carry.amount > 0 && u.carry.type) {
    const amt = u.carry.amount;
    const type = u.carry.type;
    resOf(u.team)[type] += amt;
    if (u.isOwn) {
      spawnFloater(`+${amt} ${RES_ICON[type]}`, u.position, 3.0, type);
      updateResourcesUI();
    }
  }
  u.carry.amount = 0;
  u.carry.type = null;
  u.dropTarget = null;
  updateCarryVisual(u);
  if (tc) u.group.rotation.y = Math.atan2(u.position.x - tc.position.x, u.position.z - tc.position.z);

  // Torna automàticament a la feina
  if (u.gatherNode && !u.gatherNode.depleted) goToResource(u);
  else if (u.lastResourceType && u.gatherNode) findNextResource(u);
  else { u.target = null; setUnitState(u, STATE.IDLE); }
}

function capOf(u) { return u.naval ? (CONFIG.UNITS[u.unitKind].capacity || 15) : CONFIG.GATHER.capacity + teamOf(u.team).mods.capacity; }
function updateCarryVisual(u) {
  const m = u.carryMesh;
  if (u.carry.amount <= 0 || !u.carry.type) { m.visible = false; return; }
  m.visible = true;
  m.material = CARRY_MATERIALS[u.carry.type] || CARRY_MATERIALS.wood;
  const f = u.carry.amount / capOf(u);
  m.scale.setScalar(0.45 + 0.55 * f);
}

/* Moviment a velocitat constant per trams rectes del camí. Retorna true si ha arribat. */
function stepTowardsTarget(u, dt) {
  if (!u.target) return true;
  // Si el mapa ha canviat (nou edifici, recurs esgotat) es recalcula el camí
  if (!u.path || u.pathVersion !== NAV.version) setMoveTarget(u, u.target);
  let step = Math.min(u.speed, u.speedCap || Infinity) * dt;
  while (step > 1e-6 && u.path.length) {
    const wp = u.path[0];
    const dx = wp.x - u.position.x, dz = wp.z - u.position.z;
    const dist = Math.hypot(dx, dz);
    // Als punts intermedis del camí es tomba abans d'arribar-hi: trajectòria arrodonida
    if (u.path.length > 1 && dist < 0.55) { u.path.shift(); continue; }
    if (dist <= step) {
      u.position.x = wp.x;
      u.position.z = wp.z;
      step -= dist;
      u.path.shift();
      continue;
    }
    u.position.x += (dx / dist) * step;
    u.position.z += (dz / dist) * step;
    u.group.rotation.y = lerpAngle(u.group.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-11 * dt));
    step = 0;
  }
  if (!u.path.length) {
    u.target = null;
    u.path = null;
    return true;
  }
  return false;
}

function gatherTick(u, dt) {
  const node = u.gatherNode;
  if (!node || node.depleted) { findNextResource(u); return; }
  if (!inReach(u, node)) { goToResource(u); return; }

  // Mirar cap al recurs
  const face = Math.atan2(node.position.x - u.position.x, node.position.z - u.position.z);
  u.group.rotation.y = lerpAngle(u.group.rotation.y, face, 1 - Math.exp(-10 * dt));

  if (node.animal && node.alive) {
    // Caça: llança una llança cada cert temps fins que l'animal cau
    if (u.attackCooldown <= 0) {
      u.attackCooldown = 1.6;
      spawnArrow(new THREE.Vector3(u.position.x, 1.5, u.position.z), node, Math.max(1, HUNT_DAMAGE - node.armor[1]), u);
    }
    return;
  }
  if (u.carry.type !== node.resourceType) { u.carry.type = node.resourceType; u.carry.amount = 0; }

  if (node.subtype === 'sheep' && !node.killed) {
    node.killed = true;
    node.mobile = false;
    node.name = 'Ovella (carn)';
  }

  u.gatherProgress += (CONFIG.GATHER.rates[node.subtype] ?? 1) * (aiOf(u.team)?.diff.gather ?? 1) * (u.naval ? 1.4 * teamOf(u.team).mods.shipGather : 1)
    * (teamOf(u.team).mods.gather[node.subtype] || 1) * dt;
  const cap = capOf(u);
  while (u.gatherProgress >= 1 && u.carry.amount < cap && node.amount > 0) {
    u.gatherProgress -= 1;
    u.carry.amount += 1;
    node.amount -= 1;
    onNodeHarvested(node);
    updateCarryVisual(u);
  }

  if (node.amount <= 0) {
    depleteResource(node);
    if (u.reseedFarm) { const nf = u.reseedFarm; u.reseedFarm = null; orderBuild(u, nf, null); return; }
    if (u.carry.amount >= cap) goToDropoff(u);
    else findNextResource(u);
    return;
  }
  if (u.carry.amount >= cap) {
    u.gatherProgress = 0;
    goToDropoff(u);
  }
}

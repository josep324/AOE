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
    u.axeHead.visible = sub === 'tree' || sub === 'sheep';
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
  if (ent.subtype === 'farm') return d <= 0.25;          // el granger treballa a sobre de la granja
  return d - u.radius <= CONFIG.GATHER.reach;
}

function approachPointAt(ent, angle) {
  const m = CONFIG.VILLAGER.radius + 0.3;
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
  for (const o of state.obstacles) {
    if (o.entity === ent) continue;
    pushOutOf(p, o, CONFIG.VILLAGER.radius + 0.1);
  }
  return clampToMap(p);
}
function approachPoint(ent, fromPos, angleOffset = 0) {
  return approachPointAt(ent, Math.atan2(fromPos.x - ent.position.x, fromPos.z - ent.position.z) + angleOffset);
}

function acceptsDropoff(b, type, team = PLAYER.id) {
  return b && !b.dead && b.team === team && !b.underConstruction && b.dropoffTypes && (!type || b.dropoffTypes.includes(type));
}
function nearestDropoff(pos, type = null, team = PLAYER.id) {
  let best = null, bestD = Infinity;
  for (const b of state.buildings) {
    if (!acceptsDropoff(b, type, team)) continue;
    const d = entSurfaceDist(b, pos.x, pos.z);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
function nearestResource(type, pos, maxDist = Infinity, forUnit = null) {
  let best = null, bestD = maxDist;
  for (const n of state.resourceNodes) {
    if (n.depleted || n.amount <= 0 || n.resourceType !== type) continue;
    if (farmTaken(n, forUnit)) continue;
    if (n.subtype === 'farm' && forUnit && n.team !== forUnit.team) continue;
    const d = hDist(n.position, pos);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function orderMove(u, point) {
  u.anchor = point.clone ? point.clone() : null;
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
  setMoveTarget(u, u.gatherAngle !== null
    ? approachPointAt(node, u.gatherAngle)
    : approachPoint(node, u.position, ((u.id % 5) - 2) * 0.35));
  setUnitState(u, STATE.MOVING);
}

function goToDropoff(u, building = null) {
  // El magatzem més proper que accepti el tipus de càrrega (Centre, Serradora, Campament miner, Molí)
  const tc = acceptsDropoff(building, u.carry.type, u.team) ? building : nearestDropoff(u.position, u.carry.type, u.team);
  if (!tc) { setMoveTarget(u, null); setUnitState(u, STATE.IDLE); return; }
  u.dropTarget = tc;
  setMoveTarget(u, approachPoint(tc, u.position, ((u.id % 7) - 3) * 0.06));
  setUnitState(u, STATE.RETURNING);
}

/* Quan el recurs actual desapareix, en busca un altre del mateix tipus a prop */
/* Tria el recurs que queda més a prop del magatzem de la zona (i no gaire lluny d'on treballava) */
function nextResourceNear(type, fromPos, u) {
  const R = CONFIG.GATHER.autoSearchRadius;
  const drop = nearestDropoff(fromPos, type, u.team);
  let best = null, bestS = Infinity;
  for (const n of state.resourceNodes) {
    if (n.depleted || n.amount <= 0 || n.resourceType !== type) continue;
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

function capOf(u) { return CONFIG.GATHER.capacity + teamOf(u.team).mods.capacity; }
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
  let step = u.speed * dt;
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

  if (u.carry.type !== node.resourceType) { u.carry.type = node.resourceType; u.carry.amount = 0; }

  if (node.subtype === 'sheep' && !node.killed) {
    node.killed = true;
    node.mobile = false;
    node.name = 'Ovella (carn)';
  }

  u.gatherProgress += (CONFIG.GATHER.rates[node.subtype] ?? 1) * (u.team === AI.team ? AI.diff.gather : 1)
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

function updateUnit(u, dt) {
  if (u.dead || u.garrisoned) return;
  u.attackCooldown = Math.max(0, u.attackCooldown - dt);
  u.swingT = Math.max(0, u.swingT - dt);
  // Animació d'aparició
  if (u.spawnT < 1) {
    u.spawnT = Math.min(1, u.spawnT + dt / 0.35);
    u.group.scale.setScalar(Math.max(0.01, easeOutBack(u.spawnT)));
  }

  let walking = false;
  switch (u.state) {
    case STATE.MOVING: {
      if (u.garrisonTarget) {
        const g = u.garrisonTarget;
        if (g.dead) { u.garrisonTarget = null; setUnitState(u, STATE.IDLE); break; }
        if (entSurfaceDist(g, u.position.x, u.position.z) - u.radius <= 1.0) { enterGarrison(u, g); break; }
      }
      // Moviment amb atac (IA): si troba enemics pel camí, els ataca
      if (u.attackMove && u.isMilitary) {
        u.scanTimer -= dt;
        if (u.scanTimer <= 0) {
          u.scanTimer = 0.4;
          const t = findTargetNear(u, u.los);
          if (t) { orderAttack(u, t); break; }
        }
      }
      const bt = u.buildTarget;
      if (bt) {
        if (bt.dead) { u.buildTarget = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); break; }
        if (!bt.underConstruction) { afterBuild(u, bt); break; }
        if (inReach(u, bt)) { startBuilding(u); break; }
      }
      const node = u.gatherNode;
      if (node) {
        if (node.depleted) { findNextResource(u); break; }
        if (inReach(u, node)) { startGathering(u); break; }
      }
      const arrived = stepTowardsTarget(u, dt);
      walking = !arrived;
      if (arrived) {
        if (bt) {
          if (inReach(u, bt)) startBuilding(u); else retryApproach(u);
        } else if (node) {
          if (inReach(u, node)) startGathering(u); else retryApproach(u);
        } else if (u.garrisonTarget) {
          if (++u.approachTries > 4) { u.garrisonTarget = null; setUnitState(u, STATE.IDLE); }
          else setMoveTarget(u, approachPoint(u.garrisonTarget, u.position, 0.6 * u.approachTries));
        } else {
          u.attackMove = null;
          setUnitState(u, STATE.IDLE);
        }
      }
      break;
    }
    case STATE.ATTACKING: {
      const t = u.attackTarget;
      u.inRange = false;
      if (!isAttackable(t) || (t.group && !t.group.visible && u.isOwn && t.kind === 'unit')) {
        u.attackTarget = null;
        setMoveTarget(u, null);
        u.scanTimer = 0;
        if (u.attackMove) { setMoveTarget(u, u.attackMove); setUnitState(u, STATE.MOVING); }
        else setUnitState(u, STATE.IDLE);
        break;
      }
      if (inAttackRange(u, t)) {
        u.inRange = true;
        if (u.target) setMoveTarget(u, null);
        const face = Math.atan2(t.position.x - u.position.x, t.position.z - u.position.z);
        u.group.rotation.y = lerpAngle(u.group.rotation.y, face, 1 - Math.exp(-12 * dt));
        if (u.attackCooldown <= 0) {
          u.attackCooldown = u.reload;
          performAttack(u, t);
        }
      } else {
        // Postures: «quieta» no es mou; «defensiva» no s'allunya més de 9 unitats del seu lloc
        if (!u.forcedTarget && u.isMilitary && !u.attackMove && u.stance === 'stand') {
          u.attackTarget = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); break;
        }
        if (!u.forcedTarget && u.isMilitary && !u.attackMove && u.stance === 'defensive' && u.anchor && hDist(u.position, u.anchor) > 9) {
          u.attackTarget = null;
          setMoveTarget(u, u.anchor.clone());
          setUnitState(u, STATE.MOVING);
          u.returningToAnchor = true;
          break;
        }
        // Perseguir l'objectiu (es recalcula el camí cada mig segon)
        u.chaseTimer -= dt;
        if (!u.target || u.chaseTimer <= 0) {
          u.chaseTimer = 0.5;
          setMoveTarget(u, t.kind === 'unit' ? t.position.clone() : approachPoint(t, u.position));
        }
        walking = !stepTowardsTarget(u, dt);
        // Les unitats militars abandonen una persecució massa llarga
        if (u.isMilitary && !u.forcedTarget && t.kind === 'unit' && hDist(u.position, t.position) > u.los * 2.5) {
          u.attackTarget = null;
          setUnitState(u, STATE.IDLE);
        }
      }
      break;
    }
    case STATE.BUILDING: {
      const b = u.buildTarget;
      if (!b || b.dead) { u.buildTarget = null; setUnitState(u, STATE.IDLE); break; }
      if (!b.underConstruction) { afterBuild(u, b); break; }
      if (!inReach(u, b)) { goToBuild(u); break; }
      // Mirar cap al punt més proper de l'edifici
      const fp = b.footprint;
      const cx = THREE.MathUtils.clamp(u.position.x, b.position.x - fp.hw, b.position.x + fp.hw);
      const cz = THREE.MathUtils.clamp(u.position.z, b.position.z - fp.hd, b.position.z + fp.hd);
      if (Math.hypot(cx - u.position.x, cz - u.position.z) > 0.01) {
        u.group.rotation.y = lerpAngle(u.group.rotation.y, Math.atan2(cx - u.position.x, cz - u.position.z), 1 - Math.exp(-10 * dt));
      }
      break;
    }
    case STATE.RETURNING: {
      const tc = u.dropTarget;
      if (!acceptsDropoff(tc, u.carry.type, u.team)) { goToDropoff(u); break; }
      if (inReach(u, tc)) { depositCarry(u); break; }
      const arrived = stepTowardsTarget(u, dt);
      walking = !arrived;
      if (arrived) {
        if (inReach(u, tc)) depositCarry(u);
        else if (++u.approachTries > 6) { u.approachTries = 0; setUnitState(u, STATE.IDLE); }
        else goToDropoff(u, tc);
      }
      break;
    }
    case STATE.GATHERING:
      gatherTick(u, dt);
      break;
    case STATE.TRADING: {
      const dest = u.tradeDest, home = u.tradeHome;
      if (!dest || dest.dead || !home || home.dead) { u.tradeDest = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); break; }
      if (inReach(u, dest)) {
        if (u.tradeLoaded > 0) {
          resOf(u.team).gold += u.tradeLoaded;
          if (u.isOwn) { spawnFloater(`+${u.tradeLoaded} 🪙`, u.position, 3.2, 'gold'); updateResourcesUI(); }
          u.tradeLoaded = 0;
        } else {
          u.tradeLoaded = tradeValue(home, dest);
        }
        u.cargo.visible = u.tradeLoaded > 0;
        u.tradeHome = dest;
        u.tradeDest = home;
        u.approachTries = 0;
        setMoveTarget(u, approachPoint(home, u.position));
        break;
      }
      const arrived = stepTowardsTarget(u, dt);
      walking = !arrived;
      if (arrived) {
        if (++u.approachTries > 6) { setUnitState(u, STATE.IDLE); break; }
        setMoveTarget(u, approachPoint(dest, u.position, 0.5 * u.approachTries));
      }
      break;
    }
    case STATE.IDLE:
    default:
      if (u.target) setMoveTarget(u, null);
      if (u.orderQueue.length) { runOrder(u, u.orderQueue.shift()); break; }
      // Les unitats militars ataquen automàticament l'enemic que veuen (segons la postura)
      if (u.isMilitary) {
        u.returningToAnchor = false;
        u.scanTimer -= dt;
        if (u.scanTimer <= 0) {
          u.scanTimer = 0.5;
          const t = findTargetNear(u, acquireRadius(u));
          if (t) orderAttack(u, t);
        }
      }
      break;
  }

  resolveObstacleCollision(u, dt);
  clampToMap(u.position);

  // ---------- Animació procedimental ----------
  const k = 1 - Math.exp(-12 * dt);
  if (walking) {
    u.walkPhase += dt * u.speed * 2.2;
    const s = Math.sin(u.walkPhase);
    u.legs[0].rotation.x = s * 0.65;
    u.legs[1].rotation.x = u.legs.length === 4 ? s * 0.65 : -s * 0.65;
    if (u.legs.length === 4) { u.legs[2].rotation.x = -s * 0.65; u.legs[3].rotation.x = -s * 0.65; }
    // Carregat: braços alçats aguantant la càrrega
    if (u.carry.amount > 0) {
      u.arms[0].rotation.x += (-2.7 - u.arms[0].rotation.x) * k;
      u.arms[1].rotation.x += (-2.7 - u.arms[1].rotation.x) * k;
    } else {
      u.arms[0].rotation.x = -s * 0.55;
      u.arms[1].rotation.x = s * 0.55;
    }
    u.model.position.y = Math.abs(Math.cos(u.walkPhase)) * 0.09;
    u.model.rotation.x *= (1 - k);
  } else if ((u.state === STATE.GATHERING && u.gatherNode) || (u.state === STATE.BUILDING && u.buildTarget)) {
    // Cop de destral / pic: pujada lenta i baixada ràpida
    const prev = u.workPhase;
    u.workPhase = (u.workPhase + dt * 1.5) % 1;
    const p = u.workPhase;
    const armX = p < 0.7
      ? THREE.MathUtils.lerp(-0.5, -2.5, p / 0.7)
      : THREE.MathUtils.lerp(-2.5, -0.5, (p - 0.7) / 0.3);
    u.arms[1].rotation.x = armX;
    u.arms[0].rotation.x = armX * 0.85;
    u.model.rotation.x = p < 0.7 ? -0.08 * (p / 0.7) : 0.18 * Math.sin(((p - 0.7) / 0.3) * Math.PI);
    u.model.position.y = 0;
    for (const l of u.legs) l.rotation.x *= (1 - k);
    if (p < prev) {                                  // el cicle ha acabat: impacte
      if (u.state === STATE.BUILDING) onBuildStrike(u, u.buildTarget);
      else onToolStrike(u, u.gatherNode);
    }
  } else if (u.state === STATE.ATTACKING && u.inRange) {
    // Combat: preparació del cop (o tensar l'arc) i descàrrega ràpida
    const prep = u.reload ? 1 - u.attackCooldown / u.reload : 1;
    for (const l of u.legs) l.rotation.x *= (1 - k);
    u.model.position.y = 0;
    if (u.range > 0) {
      u.arms[0].rotation.x = -1.5;
      u.arms[1].rotation.x = -1.3 - Math.min(1, prep * 1.3) * 0.35;
    } else {
      const arm = u.swingT > 0 ? THREE.MathUtils.lerp(-0.3, -2.5, u.swingT / 0.22) : THREE.MathUtils.lerp(-0.4, -2.5, Math.min(1, prep * 1.2));
      u.arms[1].rotation.x = arm;
      u.arms[0].rotation.x = -0.6;
      u.model.rotation.x = u.swingT > 0 ? 0.12 : -0.05 * prep;
    }
  } else {
    for (const l of u.legs) l.rotation.x *= (1 - k);
    for (const a of u.arms) a.rotation.x *= (1 - k);
    u.model.position.y *= (1 - k);
    u.model.rotation.x *= (1 - k);
    // Respiració subtil en repòs
    u.model.scale.y = 1 + Math.sin(state.elapsed * 2.2 + u.id) * 0.012;
  }

  // El cub de càrrega flota i gira lleugerament
  if (u.carryMesh.visible) {
    u.carryMesh.position.y = 2.72 + Math.sin(state.elapsed * 4 + u.id) * 0.05;
    u.carryMesh.rotation.y += dt * 1.5;
  }
}

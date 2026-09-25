/* =====================================================================
   ACTUALITZACIÓ DE LES UNITATS: màquina d'estats de cada unitat a cada pas de simulació
   ===================================================================== */
/* Kiting (tiradors de la IA en Difícil/Extrem): mentre recarrega, s'allunya del cos a cos que
   se li acosta; quan torna a estar a punt, dispara. Retorna true si aquest pas s'ha mogut. */
const kiteBuf = [];
function kiteStep(u, dt) {
  if (u.attackCooldown < 0.3 || u.range < 7) { u.kiteFrom = null; return false; }
  u.kiteScan = (u.kiteScan || 0) - dt;
  if (u.kiteScan <= 0) {
    u.kiteScan = 0.15;
    u.kiteFrom = null;
    let ax = 0, az = 0, n = 0;
    for (const o of unitsNear(u.position.x, u.position.z, 7, kiteBuf)) {
      if (o.dead || o.garrisoned || !u.isEnemyOf(o) || o.range > 0 || !o.isMilitary || o.category === 'siege' || o.speed > u.speed * 1.1) continue;
      if (hDist(o.position, u.position) - o.radius - u.radius > 4.5) continue;
      ax += u.position.x - o.position.x; az += u.position.z - o.position.z; n++;
    }
    if (n) { const l = Math.hypot(ax, az) || 1; u.kiteFrom = { x: ax / l, z: az / l }; }
  }
  if (!u.kiteFrom) return false;
  const step = u.speed * dt;
  u.position.x += u.kiteFrom.x * step;
  u.position.z += u.kiteFrom.z * step;
  u.group.rotation.y = lerpAngle(u.group.rotation.y, Math.atan2(u.kiteFrom.x, u.kiteFrom.z), 1 - Math.exp(-12 * dt));
  return true;
}
function updateUnit(u, dt) {
  if (u.dead || u.garrisoned) return;
  // Velocitat real (inclou les empentes): la fan servir els tiradors amb Balística
  if (u.lastX !== undefined) { u.vx = (u.position.x - u.lastX) / dt; u.vz = (u.position.z - u.lastZ) / dt; }
  u.lastX = u.position.x; u.lastZ = u.position.z;
  u.attackCooldown = Math.max(0, u.attackCooldown - dt);
  u.swingT = Math.max(0, u.swingT - dt);
  // Animació d'aparició
  if (u.spawnT < 1) {
    u.spawnT = Math.min(1, u.spawnT + dt / 0.35);
    u.group.scale.setScalar(Math.max(0.01, easeOutBack(u.spawnT)));
  }

  if (updatePacking(u, dt)) return;
  if (u.patrol || u.follow) standingOrderTick(u, dt);
  if (u.category === 'monk') updateFaith(u, dt);
  let walking = false;
  switch (u.state) {
    case STATE.MOVING: {
      if (u.packable && !u.packed) { setPacked(u, true); break; }   // el trabuc s'ha de desmuntar per moure's
      if (u.garrisonTarget) {
        const g = u.garrisonTarget;
        if (g.dead) { u.garrisonTarget = null; setUnitState(u, STATE.IDLE); break; }
        if (entSurfaceDist(g, u.position.x, u.position.z) - u.radius <= (g.naval ? 5.5 : 1.0)) { enterGarrison(u, g); break; }
      }
      if (u.unloadAt && shipUnloadTick(u)) break;
      if (u.category === 'monk') {
        if (monkMoveTick(u)) break;
        if (u.attackMove && monkAutoScan(u, dt, true)) break;
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
        // Persecució d'un animal viu: es recalcula el destí sovint
        if (node.animal && node.alive) {
          u.chaseTimer -= dt;
          if (u.chaseTimer <= 0) { u.chaseTimer = 0.5; setMoveTarget(u, node.position.clone()); }
        }
      }
      const arrived = stepTowardsTarget(u, dt);
      walking = !arrived;
      if (arrived) {
        if (bt) {
          if (inReach(u, bt)) startBuilding(u); else retryApproach(u);
        } else if (node) {
          if (inReach(u, node)) startGathering(u); else retryApproach(u);
        } else if (u.unloadAt) {
          doUnload(u);
        } else if (u.relicTarget || (u.relicDrop && u.relic)) {
          if (!monkMoveTick(u)) {
            if (++u.approachTries > 5) { u.relicTarget = null; u.relicDrop = null; setUnitState(u, STATE.IDLE); }
            else setMoveTarget(u, u.relicTarget ? u.relicTarget.position.clone() : approachPoint(u.relicDrop, u.position, 0.6 * u.approachTries));
          }
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
        // Objectiu destruït: com a l'AoE II, les tropes busquen el següent enemic proper (també edificis)
        if (u.isMilitary && u.stance !== 'stand') {
          const next = findTargetNear(u, u.stance === 'defensive' ? u.los : Math.max(u.los * 1.6, 18));
          if (next) { orderAttack(u, next); break; }
        }
        if (u.attackMove) { setMoveTarget(u, u.attackMove); setUnitState(u, STATE.MOVING); }
        else setUnitState(u, STATE.IDLE);
        break;
      }
      if (u.kite && kiteStep(u, dt)) { walking = true; break; }
      if (inAttackRange(u, t)) {
        // Massa a prop (abast mínim del setge): recula
        if (u.minRange && entSurfaceDist(t, u.position.x, u.position.z) - u.radius < u.minRange) {
          if (u.packable && !u.packed) { setPacked(u, true); break; }
          const away = new THREE.Vector3(u.position.x - t.position.x, 0, u.position.z - t.position.z);
          if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
          away.normalize().multiplyScalar(u.minRange + 2).add(u.position);
          if (!u.target || u.chaseTimer <= 0) { u.chaseTimer = 0.5; setMoveTarget(u, clampToMap(away)); }
          u.chaseTimer -= dt;
          walking = !stepTowardsTarget(u, dt);
          break;
        }
        if (u.packable && u.packed) { setPacked(u, false); break; }    // el trabuc es munta per disparar
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
        if (u.packable && !u.packed) { setPacked(u, true); break; }
        // Perseguir l'objectiu (es recalcula el camí cada mig segon)
        u.chaseTimer -= dt;
        if (!u.target || u.chaseTimer <= 0) {
          u.chaseTimer = 0.5;
          setMoveTarget(u, t.kind === 'unit' || t.isGround ? t.position.clone() : approachPoint(t, u.position));
        }
        walking = !stepTowardsTarget(u, dt);
        // Un vaixell que no pot acostar-se més (l'objectiu és terra endins) ho deixa córrer
        if (u.naval && !u.target && !inAttackRange(u, t) && ++u.approachTries > 3) { u.approachTries = 0; u.attackTarget = null; setUnitState(u, STATE.IDLE); break; }
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
      if (!acceptsDropoff(tc, u.carry.type, u.team, !!u.naval)) { goToDropoff(u); break; }
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
    case STATE.CONVERTING:
      walking = monkConvertTick(u, dt);
      break;
    case STATE.HEALING:
      walking = monkHealTick(u, dt);
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
          u.tradeLoaded = Math.round(tradeValue(home, dest) * teamOf(u.team).mods.tradeMul);
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
      if (u.category === 'monk') { monkAutoScan(u, dt, false); break; }
      // Les unitats militars ataquen automàticament l'enemic que veuen (segons la postura)
      if (u.isMilitary && !(u.packable && u.packed)) {
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
  keepOnLand(u);

  // ---------- Animació procedimental ----------
  if (u.category === 'siege') { animateSiege(u, dt, walking); return; }
  if (u.category === 'ship') { animateShip(u, dt, walking); return; }
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
  } else if ((u.state === STATE.CONVERTING || u.state === STATE.HEALING) && u.inRange) {
    // Monjo: braços alçats pregant (conversió) o estesos sobre el ferit (curació)
    for (const l of u.legs) l.rotation.x *= (1 - k);
    const up = u.state === STATE.CONVERTING ? -2.7 + Math.sin(state.elapsed * 3 + u.id) * 0.15 : -1.35;
    u.arms[0].rotation.x += (up - u.arms[0].rotation.x) * k;
    u.arms[1].rotation.x += (up - u.arms[1].rotation.x) * k;
    u.model.position.y = 0;
    u.model.rotation.x *= (1 - k);
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

/* Animació de les màquines de setge: rodes, braç del mangonell, cop de l'ariet, corda de l'escorpí */
function animateSiege(u, dt, walking) {
  if (walking && u.wheels) for (const w of u.wheels) w.rotation.x += dt * u.speed * 1.6;
  u.fireT = Math.max(0, (u.fireT || 0) - dt);
  if (u.throwArm) {
    // Braç: baixa ràpid en disparar i torna a pujar lentament mentre recarrega
    const cd = u.reload ? Math.max(0, u.attackCooldown) / u.reload : 0;
    u.throwArm.rotation.x = u.state === STATE.ATTACKING && u.inRange ? -1.1 + 1.1 * cd : THREE.MathUtils.damp(u.throwArm.rotation.x, 0, 3, dt);
  }
  if (u.ramLog) u.ramLog.position.z = u.swingT > 0 ? Math.sin((u.swingT / 0.22) * Math.PI) * 0.45 : THREE.MathUtils.damp(u.ramLog.position.z, 0, 6, dt);
  if (u.bowString) u.bowString.position.z = u.fireT > 0 ? 0 : THREE.MathUtils.damp(u.bowString.position.z, -0.25, 4, dt);
  u.model.position.y = walking ? Math.abs(Math.sin(u.walkPhase = (u.walkPhase || 0) + dt * 8)) * 0.03 : 0;
}

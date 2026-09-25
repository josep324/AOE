/* =====================================================================
   COMBAT: ATAC, PROJECTILS, MORT, REFUGI AL CENTRE DE CIUTAT
   ===================================================================== */
function computeDamage(attack, target, type, vsBuilding = 0) {
  // Un edifici en construcció (fonament o bastida) no té armadura
  const armor = target.underConstruction ? 0 : ((target.armor || [0, 0])[type] || 0);
  let d = attack - armor;
  if (target.kind === 'building') d += vsBuilding;
  return Math.max(1, d);
}
function inAttackRange(u, t) {
  const d = entSurfaceDist(t, u.position.x, u.position.z) - u.radius;
  return d <= (u.range > 0 ? u.range : u.reach);
}
function isAttackable(t) {
  return t && !t.dead && !t.garrisoned && (t.isGround || t.kind === 'unit' || t.kind === 'building' || (t.subtype === 'farm' && t.team) || (t.animal && t.alive));
}

function orderAttack(u, target, keepAttackMove = true) {
  if (!isAttackable(target) || target.team === u.team) return;
  if (u.onlyBuildings && target.kind === 'unit' && target.category !== 'siege') return;   // ariets i trabucs: només edificis
  if (target.naval && !u.naval && !(u.range > 0)) return;                                    // el cos a cos no arriba als vaixells
  u.forcedTarget = false;
  if (!u.anchor || u.state === STATE.IDLE) u.anchor = u.position.clone();
  u.gatherNode = null;
  u.dropTarget = null;
  u.buildTarget = null;
  u.garrisonTarget = null;
  if (!keepAttackMove) u.attackMove = null;
  u.attackTarget = target;
  u.speedCap = null;          // en combat, cadascú a la seva velocitat
  u.chaseTimer = 0;
  setUnitState(u, STATE.ATTACKING);
}
function commandAttack(units, target, queued = false) {
  for (const u of units) {
    if (queued) { enqueueOrder(u, { type: 'attack', target }); continue; }
    u.orderQueue.length = 0;
    orderAttack(u, target, false);
    u.forcedTarget = true;
  }
}
const STANCES = {
  aggressive: { icon: '⚔️', name: 'Agressiva', desc: 'Ataca el que veu i el persegueix lluny' },
  defensive:  { icon: '🛡️', name: 'Defensiva', desc: 'Ataca el que veu però no s\'allunya gaire del seu lloc' },
  stand:      { icon: '🧱', name: 'Quieta', desc: 'No es mou: només ataca el que té a l\'abast' },
};
function setStance(units, stance) {
  for (const u of units) {
    u.stance = stance;
    u.anchor = u.position.clone();
    if (stance === 'stand' && u.state === STATE.ATTACKING && !u.forcedTarget) { u.attackTarget = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); }
  }
  toast(`${STANCES[stance].icon} Postura: ${STANCES[stance].name}`);
  updateSelectionUI();
}
/* Radi en què una unitat busca enemics segons la postura */
function acquireRadius(u) {
  if (u.packable) return u.range + u.radius;
  return u.stance === 'stand' ? (u.range > 0 ? u.range : u.reach) + u.radius + 0.6 : u.los;
}
function orderAttackMove(u, point) {
  orderMove(u, point);
  u.attackMove = point.clone();
}
/* Moviment amb atac en formació (onades de la IA) */
function commandAttackMove(units, point) {
  for (const [u, slot] of formationSlots(units, point, groupFormation(units))) { u.orderQueue.length = 0; orderAttackMove(u, slot); }
}

/* Busca l'enemic més proper dins d'un radi (prioritza unitats militars) */
const targetBuf = [];
function findTargetNear(u, radius) {
  let best = null, bestD = Infinity;
  for (const e of unitsNear(u.position.x, u.position.z, radius, targetBuf)) {
    if (e.team === u.team || e.team === 0 || e.dead || e.garrisoned) continue;
    if (u.onlyBuildings && e.category !== 'siege') continue;     // ariets i trabucs: només edificis i setge
    if (e.naval && !u.naval && !(u.range > 0)) continue;          // el cos a cos no pot atacar vaixells
    if (u.naval && !e.naval && u.range < 2 && !u.demolition) continue;
    const d = hDist(e.position, u.position) * (e.isMilitary ? 1 : 1.25);
    if (d < radius && d < bestD) { bestD = d; best = e; }
  }
  if (best) return best;
  // Els llops a prop també són un objectiu per a les tropes
  if (!u.onlyBuildings && !u.naval) for (const w of wolvesNear(u.position.x, u.position.z, radius)) {
    const d = hDist(w.position, u.position);
    if (d < bestD) { bestD = d; best = w; }
  }
  if (best) return best;
  for (const b of state.buildings) {
    if (b.team === u.team || b.dead) continue;
    const d = entSurfaceDist(b, u.position.x, u.position.z);
    if (d < radius && d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function performAttack(u, t) {
  if (u.demolition) { explodeDemolition(u, t); return; }
  if (u.range > 0) {
    fireProjectile(u, t);
  } else if (!t.isGround) {
    applyDamage(t, hitDamage(u, t, 0), u);
    const dir = new THREE.Vector3(t.position.x - u.position.x, 0, t.position.z - u.position.z).normalize();
    spawnParticles(atGround(u.position.x + dir.x * 0.8, 1.1, u.position.z + dir.z * 0.8),
      t.kind === 'building' ? 0x9b958a : 0xb02020, 3, dir);
  }
  u.swingT = 0.22;
}

let lastAttackAlert = -99;
function applyDamage(target, amount, attacker) {
  if (!target || target.dead) return;
  if (target.animal) { animalHit(target, amount, attacker); return; }
  target.hp -= amount;
  target.lastHitT = state.elapsed;
  if (target.hp <= 0) { killEntity(target, attacker); return; }
  // Les unitats militars inactives responen l'atac
  if (target.kind === 'unit' && target.isMilitary && attacker && !attacker.dead && (attacker.kind === 'unit' || (attacker.animal && attacker.alive))
      && (target.state === STATE.IDLE || (target.state === STATE.ATTACKING && target.attackTarget && target.attackTarget.kind === 'building'))
      && (target.stance !== 'stand' || inAttackRange(target, attacker))) {
    orderAttack(target, attacker);
  }
  if (attacker) aiAlert(attacker, target.team);
  if (target.isOwn && state.elapsed - lastAttackAlert > 12) {
    lastAttackAlert = state.elapsed;
    toast(`⚔️ T'estan atacant! (${target.name})`);
    state.pings.push({ x: target.position.x, z: target.position.z, t: 0 });
  }
}

function killEntity(e, killer) {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  if (e.kind === 'unit') {
    if (e.garrison && e.garrison.length) ungarrison(e);
    if (e.relic) unitDropRelic(e);
    if (e.category === 'king') toast(e.isOwn ? '👑 El teu rei ha mort!' : `👑 El rei dels ${civOf(e.team).name} ha mort!`);
    state.units = state.units.filter(u => u !== e);
    e.deathKind = 'unit';
    e.model.rotation.set(0, 0, 0);
    e.fallDir = vrand() < 0.5 ? -1 : 1;
  } else {
    // Edifici (o granja): els refugiats surten, les relíquies cauen, s'allibera el terreny
    if (e.garrison && e.garrison.length) ungarrison(e);
    buildingDropRelics(e);
    e.depleted = true;
    state.buildings = state.buildings.filter(b => b !== e);
    state.resourceNodes = state.resourceNodes.filter(n => n !== e);
    state.obstacles = state.obstacles.filter(o => o.entity !== e);
    rebuildNav();
    e.deathKind = 'building';
    spawnParticles(atGround(e.position.x, 2, e.position.z), 0x8a8378, 20, null);
    if (e.isOwn) toast(`💥 Hem perdut: ${e.name}`);
    else if (e.group.visible) toast(`🔥 Edifici enemic destruït: ${e.name}`);
  }
  state.pickables = state.pickables.filter(m => m.userData.entity !== e);
  if (e.selected) { removeFromSelection(e); onSelectionChanged(); }
  e.selection.visible = false;
  e.dieT = 0;
  state.dying.push(e);
  if (e.isOwn) updatePopulationUI();
}

/* ---------- Fletxes ---------- */
const arrowGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4).rotateX(Math.PI / 2);
const arrowTipGeo = new THREE.ConeGeometry(0.06, 0.18, 4).rotateX(Math.PI / 2).translate(0, 0, 0.5);
function aimPoint(t) {
  const y = t.animal ? 0.8 : t.kind === 'unit' ? 1.2 : (t.height ? t.height * 0.5 : 3);
  return new THREE.Vector3(t.position.x, y + (t.position.y || 0), t.position.z);
}
/* Punteria (com a l'AoE II): les fletxes de les unitats van al punt on apunten, no persegueixen
   l'objectiu. Un arquer pot fallar (accuracy) i una unitat que es mou esquiva la fletxa si el
   tirador no té Balística (que apunta on anirà l'objectiu). Una fletxa desviada pot tocar un altre
   enemic. Els edificis sempre encerten. */
const ARROW_SPEED = 48;          // ≈ 7 caselles/s de l'AoE II a l'escala de moviment del joc
function arrowAim(shooter, target, from) {
  const end = aimPoint(target);
  if (!shooter || shooter.kind !== 'unit' || target.kind !== 'unit') return { end, homing: true };
  const T = Math.max(0.2, from.distanceTo(end) / ARROW_SPEED);
  if (teamOf(shooter.team).mods.ballistics && target.vx !== undefined) { end.x += target.vx * T; end.z += target.vz * T; }
  if (rand() >= (shooter.accuracy ?? 1)) {
    const a = rand() * Math.PI * 2, r = target.radius + randRange(0.6, 2.2);
    end.x += Math.cos(a) * r; end.z += Math.sin(a) * r;
  }
  end.y = Math.min(end.y, 1.2);
  return { end, homing: false };
}
const arrowHitBuf = [];
function arrowLanded(p) {
  const t = p.target, e = p.end;
  if (t && !t.dead && !t.garrisoned && hDist(t.position, e) <= t.radius + 0.55) { applyDamage(t, p.dmg, p.shooter); return; }
  // Fletxa desviada: pot tocar un altre enemic del tirador que sigui just allà
  const team = p.shooter ? p.shooter.team : 0;
  for (const u of unitsNear(e.x, e.z, 1.6, arrowHitBuf)) {
    if (u.dead || u.garrisoned || !team || u.team === team || u.team === 0) continue;
    if (hDist(u.position, e) <= u.radius + 0.35) { applyDamage(u, p.dmg, p.shooter); return; }
  }
}
function spawnArrow(from, target, dmg, shooter, delay = 0) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(arrowGeo, mat(0x6b4423)), new THREE.Mesh(arrowTipGeo, mat(0x777777)));
  g.visible = false;
  scene.add(g);
  const { end, homing } = arrowAim(shooter, target, from);
  const dist = from.distanceTo(end);
  state.projectiles.push({ g, start: from.clone(), end, target, dmg, shooter, t: -delay, T: Math.max(0.2, dist / ARROW_SPEED), dist, homing,
    onHit: homing ? null : arrowLanded });
}
function updateProjectiles(dt) {
  const prev = new THREE.Vector3();
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.t += dt;
    if (p.t < 0) continue;
    if (p.homing && p.target && !p.target.dead && !p.target.garrisoned) p.end.copy(aimPoint(p.target));
    const k = Math.min(1, p.t / p.T);
    prev.copy(p.g.position);
    p.g.position.lerpVectors(p.start, p.end, k);
    p.g.position.y += Math.sin(k * Math.PI) * p.dist * (p.arcK ?? 0.12);
    if (p.spin) p.g.rotation.x += dt * p.spin;
    else if (p.g.visible) p.g.lookAt(p.g.position.clone().multiplyScalar(2).sub(prev));
    // Les fletxes es veuen si el tirador o l'objectiu són visibles
    p.g.visible = (p.shooter && p.shooter.group.visible) || (p.target && p.target.group && p.target.group.visible);
    // Fletxa apuntada: en el tram final de baixada toca l'objectiu si li passa per sobre (una unitat
    // que carrega contra l'arquer rep la fletxa encara que no sigui exactament on apuntava)
    if (p.onHit === arrowLanded && k > 0.55 && k < 1) {
      const t = p.target;
      if (t && !t.dead && !t.garrisoned && hDist(t.position, p.g.position) <= t.radius + 0.5) {
        applyDamage(t, p.dmg, p.shooter);
        scene.remove(p.g);
        state.projectiles.splice(i, 1);
        continue;
      }
    }
    if (k >= 1) {
      if (p.onHit) p.onHit(p);
      else if (p.target && !p.target.dead && !p.target.garrisoned) applyDamage(p.target, p.dmg, p.shooter);
      scene.remove(p.g);
      state.projectiles.splice(i, 1);
    }
  }
}

/* ---------- Centre de Ciutat: fletxes i refugi ---------- */
function updateDefensiveBuildings(dt) {
  for (const b of state.buildings) {
    const isTC = b.subtype === 'towncenter';
    if ((!isTC && !(b.def && b.def.arrows)) || b.dead || b.underConstruction) continue;
    // Els refugiats es curen lentament
    if (b.garrison) for (const u of b.garrison) u.hp = Math.min(u.maxHp, u.hp + dt * 0.5);
    b.arrowCooldown = (b.arrowCooldown ?? 0) - dt;
    if (b.arrowCooldown > 0) continue;
    const C0 = isTC ? CONFIG.TC_ARROWS : b.def.arrows;
    const lvl = b.subtype === 'watchtower' ? teamOf(b.team).mods.towerLevel : 0;
    const C = lvl ? { ...C0, damage: C0.damage + lvl, range: C0.range + (lvl >= 2 ? 1 : 0) } : C0;
    let target = null, bestD = Infinity;
    for (const u of unitsNear(b.position.x, b.position.z, C.range + (b.footprint ? b.footprint.hw : b.radius) + 1, targetBuf)) {
      if (u.team === b.team || u.team === 0 || u.dead || u.garrisoned) continue;
      const d = entSurfaceDist(b, u.position.x, u.position.z);
      if (d <= C.range && d < bestD) { bestD = d; target = u; }
    }
    if (!target) {
      for (const e of state.buildings) {
        if (e.team === b.team || e.dead) continue;
        const d = hDist(e.position, b.position) - (b.footprint ? b.footprint.hw : b.radius) - (e.footprint ? e.footprint.hw : e.radius);
        if (d <= C.range && d < bestD) { bestD = d; target = e; }
      }
    }
    if (!target) { b.arrowCooldown = 0.3; continue; }
    b.arrowCooldown = C.reload / COMBAT_TEMPO;
    const M = teamOf(b.team).mods;
    const arrows = (C.count || 1) + (isTC ? 0 : M.towerArrows) + Math.min(b.subtype === 'castle' ? 20 : 10, b.garrison ? b.garrison.length : 0);
    const spread = isTC ? 3.5 : b.subtype === 'castle' ? 4 : 0.6;
    const dmg = C.damage + teamOf(b.team).mods.buildingArrow;
    for (let i = 0; i < arrows; i++) {
      const from = new THREE.Vector3(b.position.x + randRange(-spread, spread), (isTC ? 5.5 : (b.height || 7) - 1) + rand() + b.position.y, b.position.z + randRange(-spread, spread));
      spawnArrow(from, target, computeDamage(dmg, target, 1), b, i * 0.12);
    }
  }
}

function orderGarrison(u, b) {
  u.garrisonPrev = { node: u.gatherNode, type: u.lastResourceType, build: u.buildTarget };
  u.gatherNode = null; u.dropTarget = null; u.buildTarget = null; u.attackTarget = null;
  u.garrisonTarget = b;
  setMoveTarget(u, approachPoint(b, u.position));
  setUnitState(u, STATE.MOVING);
}
function enterGarrison(u, b) {
  if (!b.garrison) b.garrison = [];
  if (b.garrison.length >= garrisonCap(b) || b.dead) {
    u.garrisonTarget = null;
    setUnitState(u, STATE.IDLE);
    return;
  }
  u.garrisonTarget = null;
  u.garrisoned = b;
  b.garrison.push(u);
  setMoveTarget(u, null);
  setUnitState(u, STATE.GARRISONED);
  u.group.visible = false;
  if (u.selected) { removeFromSelection(u); onSelectionChanged(); }
  refreshContainer(b);
  if (b.selected) updateSelectionUI();
}
/* Fa sortir les unitats d'un edifici o transport (totes, o només les que compleixen «which») */
function ungarrison(b, which = null) {
  if (!b.garrison) return;
  // Un transport només pot desembarcar tocant a la riba
  if (b.naval && b.garrison.length && !nearestCellWhere(b.position, isDryLand, 5)) {
    if (b.isOwn) toast('⛵ Acosta el transport a la riba per desembarcar (o fes clic dret a terra)');
    return;
  }
  const stay = which ? b.garrison.filter(u => !u.dead && !which(u)) : [];
  for (const u of b.garrison) {
    if (u.dead || stay.includes(u)) continue;
    const spot = findSpawnSpot(b);
    u.position.set(spot.x, u.naval ? 0 : groundY(spot.x, spot.z), spot.z);
    u.garrisoned = null;
    u.group.visible = true;
    setUnitState(u, STATE.IDLE);
    // Tornar a la feina anterior
    const prev = u.garrisonPrev;
    if (prev && prev.build && !prev.build.dead && prev.build.underConstruction) orderBuild(u, prev.build, null);
    else if (prev && prev.node && !prev.node.depleted) orderGather(u, prev.node, null);
    else if (prev && prev.type) { u.lastResourceType = prev.type; u.lastNodePos.copy(u.position); findNextResource(u); }
  }
  b.garrison = stay;
  refreshContainer(b);
  if (b.selected) updateSelectionUI();
}
function ringTownBell(tc) {
  if (!tc) return;
  if (tc.garrison && tc.garrison.length) { ungarrison(tc); if (tc.isOwn) toast('🔔 Tornem a la feina!'); return; }
  const vills = state.units.filter(u => u.team === tc.team && u.subtype === 'villager' && !u.garrisoned && hDist(u.position, tc.position) < 45);
  vills.forEach(u => orderGarrison(u, tc));
  if (tc.isOwn) toast(`🔔 Campana! ${vills.length} aldeans es refugien al Centre de Ciutat`);
  if (tc.selected) updateSelectionUI();
}

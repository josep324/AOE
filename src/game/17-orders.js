/* =====================================================================
   ORDRES: MOVIMENT EN FORMACIÓ
   ===================================================================== */
function clampToMap(v) {
  v.x = THREE.MathUtils.clamp(v.x, -CONFIG.MAP_LIMIT, CONFIG.MAP_LIMIT);
  v.z = THREE.MathUtils.clamp(v.z, -CONFIG.MAP_LIMIT, CONFIG.MAP_LIMIT);
  return v;
}
const pushObsBuf = [];
function pushOutOfObstacles(p, margin) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const o of margin <= OBS_REACH ? obstaclesNear(p.x, p.z, pushObsBuf) : state.obstacles) if (pushOutOf(p, o, margin)) moved = true;
    if (!moved) break;
  }
  return p;
}

/* ---------- Formacions de batalla ----------
   line: cos a cos al davant (cavalleria a les ales), tiradors darrere, setge i monjos a la cua
   box: quadrat amb el cos a cos al perímetre i tiradors, monjos i setge a dins
   staggered: línia esponjada i al tresbolillo (contra pedres i fletxes)
   flank: dos grups separats per atacar per dos costats */
const FORMATIONS = {
  line:      { icon: '▤', name: 'Línia', desc: 'Infanteria i cavalleria al davant (genets a les ales), tiradors darrere, setge i monjos a la cua' },
  box:       { icon: '▣', name: 'Quadrat', desc: "El cos a cos fa de mur al perímetre; arquers, monjos i setge queden protegits a dins" },
  staggered: { icon: '⁘', name: 'Esglaonada', desc: 'Separació ampla i files alternades: menys dany de mangonells i fletxes' },
  flank:     { icon: '⇹', name: 'Flancs', desc: "Divideix el grup en dues meitats que avancen separades per envoltar l'enemic" },
};
const FORMATION_ORDER = ['line', 'box', 'staggered', 'flank'];
function formationRole(u) {
  const c = u.category;
  if (c === 'siege' || c === 'monk' || c === 'villager' || c === 'trade' || c === 'king') return 'support';
  if (u.range >= 5) return 'ranged';
  return u.mounted ? 'cav' : 'inf';
}
function unitSpacing(u) {
  if (u.category === 'siege') return 2.9;
  if (u.mounted || u.subtype === 'tradecart') return 2.3;
  return 1.6;
}
const maxSpacing = (list) => list.reduce((m, u) => Math.max(m, unitSpacing(u)), 0) || 1.6;
/* Files d'un bloc: [lx, lz] amb la primera fila a lz = 0 i les següents cap enrere */
function blockRows(n, cols, sp, stagger) {
  const out = [];
  const rows = Math.ceil(n / cols);
  for (let r = 0; r < rows; r++) {
    const count = Math.min(cols, n - r * cols);
    for (let c = 0; c < count; c++) out.push([(c - (count - 1) / 2) * sp + (stagger && r % 2 ? sp / 2 : 0), -r * sp]);
  }
  return { slots: out, depth: rows * sp };
}
/* Centra un conjunt de grups sobre l'origen en profunditat */
function centerDepth(groups) {
  let lo = Infinity, hi = -Infinity;
  for (const [, s] of groups) for (const p of s) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  const sh = -(lo + hi) / 2;
  for (const [, s] of groups) for (const p of s) p[1] += sh;
  return groups;
}
/* Formació en línia (o esglaonada): retorna [[unitats, slots locals], …] per grups de rol */
function lineLayout(roles, n, spread = 1, stagger = false) {
  const melee = roles.cav.concat(roles.inf);
  const blocks = [melee, roles.ranged, roles.support].filter(b => b.length);
  const cols = Math.max(3, Math.ceil(Math.sqrt(n * 2.4)));
  const groups = [];
  let cursor = 0;
  for (const b of blocks) {
    const sp = maxSpacing(b) * spread;
    const { slots, depth } = blockRows(b.length, cols, sp, stagger);
    for (const s of slots) s[1] += cursor;
    cursor -= depth + 0.3 * spread;
    if (b === melee && roles.cav.length && roles.inf.length) {
      // Cavalleria als extrems de cada fila, infanteria al centre
      slots.sort((a, c) => Math.abs(c[0]) - Math.abs(a[0]));
      groups.push([roles.cav, slots.slice(0, roles.cav.length)], [roles.inf, slots.slice(roles.cav.length)]);
    } else groups.push([b, slots]);
  }
  return centerDepth(groups);
}
/* Quadrat: el cos a cos repartit pel perímetre; la resta, en una graella a dins (setge i monjos al centre) */
function boxLayout(roles, n) {
  const melee = roles.cav.concat(roles.inf), inner = roles.ranged.concat(roles.support);
  if (melee.length < 4) return lineLayout(roles, n);
  const sOut = maxSpacing(melee), sIn = maxSpacing(inner.length ? inner : melee);
  let H = Math.max(sOut, melee.length * sOut / 8), cells;
  for (;;) {
    const k = Math.floor((H - sOut * 0.9) / sIn);
    const side = k >= 0 ? 2 * k + 1 : 0;
    if (side * side >= inner.length) {
      cells = [];
      for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) cells.push([i * sIn, j * sIn, Math.max(Math.abs(i), Math.abs(j)), Math.atan2(i, j)]);
      break;
    }
    H += sIn / 2;
  }
  cells.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
  const perim = [];
  const L = 8 * H;
  for (let i = 0; i < melee.length; i++) {
    const t = ((i + 0.5) / melee.length * L + H) % L;       // comença pel mig del costat de davant
    if (t < 2 * H) perim.push([H - t, H]);
    else if (t < 4 * H) perim.push([-H, H - (t - 2 * H)]);
    else if (t < 6 * H) perim.push([-H + (t - 4 * H), -H]);
    else perim.push([H, -H + (t - 6 * H)]);
  }
  const groups = [[melee, perim]];
  const inSlots = cells.slice(0, inner.length).map(c => [c[0], c[1]]);
  if (roles.support.length) groups.push([roles.support, inSlots.slice(0, roles.support.length)]);
  if (roles.ranged.length) groups.push([roles.ranged, inSlots.slice(roles.support.length)]);
  return groups;
}
function flankLayout(roles, n) {
  const halves = [{ cav: [], inf: [], ranged: [], support: [] }, { cav: [], inf: [], ranged: [], support: [] }];
  let k = 0;
  for (const r of ['cav', 'inf', 'ranged', 'support']) for (const u of roles[r]) halves[k++ % 2][r].push(u);
  const out = [];
  const gap = 5 + Math.sqrt(n) * 0.8;
  halves.forEach((h, i) => {
    const m = h.cav.length + h.inf.length + h.ranged.length + h.support.length;
    if (!m) return;
    const groups = lineLayout(h, m);
    const hw = Math.max(0, ...groups.flatMap(([, s]) => s.map(p => Math.abs(p[0]))));
    for (const [, slots] of groups) for (const s of slots) s[0] += (i ? -1 : 1) * (hw + gap / 2);
    out.push(...groups);
  });
  return out;
}
/* Calcula el lloc de cada unitat en una formació al voltant d'un punt */
function formationSlots(units, point, type = null) {
  const result = new Map();
  const n = units.length;
  if (!n) return result;
  const centroid = new THREE.Vector3();
  units.forEach(u => centroid.add(u.position));
  centroid.divideScalar(n);
  // Orientem la formació segons la direcció de marxa del grup
  // (si el grup ja és al punt, conserva l'orientació que tenia)
  const heading = hDist(centroid, point) < 4 ? (units[0].formHeading ?? units[0].group.rotation.y) : Math.atan2(point.x - centroid.x, point.z - centroid.z);
  for (const u of units) u.formHeading = heading;
  const cos = Math.cos(heading), sin = Math.sin(heading);
  const allCivil = units.every(u => !u.isMilitary && u.category !== 'monk');
  let groups;
  if (allCivil || n === 1) {
    const cols = Math.ceil(Math.sqrt(n));
    groups = centerDepth([[units, blockRows(n, cols, 1.55, false).slots]]);
  } else {
    const roles = { cav: [], inf: [], ranged: [], support: [] };
    for (const u of units) roles[formationRole(u)].push(u);
    const f = type || 'line';
    groups = f === 'box' ? boxLayout(roles, n) : f === 'flank' ? flankLayout(roles, n)
      : f === 'staggered' ? lineLayout(roles, n, 1.75, true) : lineLayout(roles, n);
  }
  for (const [list, local] of groups) {
    const slots = local.map(([lx, lz]) => clampToMap(pushOutOfObstacles(
      new THREE.Vector3(point.x + lx * cos + lz * sin, 0, point.z - lx * sin + lz * cos), CONFIG.VILLAGER.radius + 0.25)));
    // Assignació voraç dins del grup: cada slot per a la unitat lliure més propera
    const free = list.slice();
    for (const slot of slots) {
      if (!free.length) break;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < free.length; i++) {
        const d = free[i].position.distanceToSquared(slot);
        if (d < bestD) { bestD = d; best = i; }
      }
      result.set(free.splice(best, 1)[0], slot);
    }
    for (const u of free) result.set(u, point.clone());
  }
  return result;
}
/* Formació d'un grup: la que tinguin les seves unitats (per defecte, línia) */
function groupFormation(units) {
  const m = units.find(u => u.isMilitary || u.category === 'monk');
  return (m && m.formation) || 'line';
}
function setFormation(units, f) {
  for (const u of units) u.formation = f;
  toast(`${FORMATIONS[f].icon} Formació: ${FORMATIONS[f].name}`);
  // El grup es recol·loca amb la nova formació al voltant d'on anava (o d'on és)
  const movers = units.filter(u => u.state === STATE.IDLE || u.state === STATE.MOVING);
  if (movers.length > 1) {
    const c = new THREE.Vector3();
    movers.forEach(u => c.add(u.target || u.position));
    commandMove(movers, c.divideScalar(movers.length));
  }
  updateSelectionUI();
}

function commandMove(units, point, queued = false) {
  const slots = formationSlots(units, point, groupFormation(units));
  // Marxa agrupada: un grup militar avança al pas de la unitat més lenta per no desfer la formació
  const grouped = units.length > 1 && units[0].isOwn && units.some(u => u.isMilitary);
  const slow = grouped ? Math.min(...units.map(u => u.speed)) : null;
  for (const [u, slot] of slots) {
    if (queued) enqueueOrder(u, { type: 'move', point: slot });
    else { u.orderQueue.length = 0; orderMove(u, slot); }
    u.speedCap = grouped && hDist(u.position, slot) > 12 ? slow : null;
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

/* ---------- Ordres permanents: patrullar i escortar ----------
   Patrullar: la unitat va i ve entre el punt on era i els punts marcats, atacant el que troba.
   Escortar: segueix una unitat pròpia (un monjo, un setge, un aldeà) i ataca qui s'hi acosti. */
function clearStandingOrders(units) { for (const u of units) { u.patrol = null; u.follow = null; } }
function commandPatrol(units, point, add = false) {
  units = units.filter(u => u.isMilitary || u.category === 'monk');
  if (!units.length) return false;
  for (const [u, slot] of formationSlots(units, point, groupFormation(units))) {
    if (add && u.patrol) { u.patrol.pts.push(slot.clone()); continue; }
    u.follow = null;
    u.orderQueue.length = 0;
    u.patrol = { pts: [u.position.clone(), slot.clone()], i: 1 };
    orderAttackMove(u, slot);
  }
  return true;
}
function commandFollow(units, target) {
  units = units.filter(u => u !== target && !u.naval === !target.naval);
  if (!units.length || !target || target.dead || target.kind !== 'unit') return false;
  for (const u of units) {
    u.patrol = null;
    u.orderQueue.length = 0;
    u.follow = target;
    u.standT = 0;
  }
  return true;
}
/* Cada mig segon: següent tram de la patrulla, o atrapar / defensar la unitat escortada */
function standingOrderTick(u, dt) {
  u.standT = (u.standT || 0) - dt;
  if (u.standT > 0) return;
  u.standT = 0.5;
  if (u.patrol) {
    if (u.state === STATE.IDLE) {
      const P = u.patrol;
      P.i = (P.i + 1) % P.pts.length;
      orderAttackMove(u, P.pts[P.i]);
    }
    return;
  }
  const t = u.follow;
  if (!t) return;
  if (t.dead || t.team !== u.team) { u.follow = null; if (u.state === STATE.MOVING) { setMoveTarget(u, null); setUnitState(u, STATE.IDLE); } return; }
  const d = hDist(u.position, t.position);
  // Si l'escortat s'allunya massa, deixa la lluita i el segueix
  if (u.state === STATE.ATTACKING && d > 18) { u.attackTarget = null; setUnitState(u, STATE.IDLE); }
  if (u.state === STATE.ATTACKING || u.state === STATE.CONVERTING || u.state === STATE.HEALING) return;
  if (u.isMilitary && !t.garrisoned) {
    const e = findTargetNear(u, Math.max(8, Math.min(u.los, 12)));
    if (e && hDist(e.position, t.position) < 12) { orderAttack(u, e); return; }
  }
  if (t.garrisoned) return;
  if (d > 4.5 && (u.state === STATE.IDLE || u.state === STATE.MOVING)) {
    const away = new THREE.Vector3(u.position.x - t.position.x, 0, u.position.z - t.position.z);
    if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
    orderMove(u, clampToMap(away.normalize().multiplyScalar(2.5 + t.radius + u.radius).add(t.position)));
  }
}

function commandStop(units) {
  clearStandingOrders(units);
  for (const u of units) {
    u.orderQueue.length = 0;
    setMoveTarget(u, null);
    u.attackTarget = null;
    u.attackMove = null;
    u.garrisonTarget = null;
    u.buildTarget = null;
    u.gatherNode = null;
    u.dropTarget = null;
    u.convTarget = null; u.healTarget = null; u.relicTarget = null; u.relicDrop = null;
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
  if (!queued) clearStandingOrders(units);
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

  // Monjos: convertir enemics, curar els propis, recollir i guardar relíquies
  const monks = units.filter(isMonk);
  if (monks.length && targetEnt) {
    let used = [];
    if (targetEnt.kind === 'relic' && !targetEnt.carrier && !targetEnt.holder) {
      const free = monks.filter(m => !m.relic).sort((a, b) => hDist(a.position, targetEnt.position) - hDist(b.position, targetEnt.position));
      if (free.length) { free[0].orderQueue.length = 0; orderPickRelic(free[0], targetEnt); used = [free[0]]; }
      else toast('🏺 Aquests monjos ja porten una relíquia');
      spawnMoveMarker(targetEnt.position, 0xffe6a0, 1.4);
    } else if (targetEnt.team && targetEnt.team !== PLAYER.id && (targetEnt.kind === 'unit' || targetEnt.kind === 'building')) {
      if (commandConvert(monks, targetEnt)) used = monks.filter(m => m.convTarget === targetEnt);
      spawnMoveMarker(targetEnt.position, teamOf(PLAYER.id).colorLight, (targetEnt.footprint ? targetEnt.footprint.hw : targetEnt.radius) + 0.8);
    } else if (targetEnt.kind === 'unit' && targetEnt.isOwn && canHeal(monks[0], targetEnt)) {
      monks.forEach(m => { m.orderQueue.length = 0; orderHeal(m, targetEnt); });
      used = monks;
      spawnMoveMarker(targetEnt.position, 0x9dffa0, 1.2);
    } else if (targetEnt.subtype === 'monastery' && targetEnt.isOwn && !targetEnt.underConstruction && monks.some(m => m.relic)) {
      used = monks.filter(m => m.relic);
      used.forEach(m => { m.orderQueue.length = 0; orderDepositRelic(m, targetEnt); });
      spawnMoveMarker(targetEnt.position, 0xffe6a0, 3.5);
    }
    if (used.length) {
      units = units.filter(u => !used.includes(u));
      if (!units.length) return;
      // La resta de monjos acompanya el grup; els soldats ataquen l'enemic
      if (targetEnt.kind === 'relic' || !(targetEnt.team && targetEnt.team !== PLAYER.id)) { commandMove(units, targetEnt.position.clone(), queued); return; }
    }
  }
  // Animal viu: els aldeans el cacen (si dona carn); la resta de tropes l'ataquen
  if (targetEnt && targetEnt.animal && targetEnt.alive) {
    const hunters = targetEnt.resourceType ? units.filter(u => u.subtype === 'villager') : [];
    const fighters = units.filter(u => !hunters.includes(u) && !isMonk(u));
    if (hunters.length) { if (queued) hunters.forEach(u => enqueueOrder(u, { type: 'gather', node: targetEnt })); else commandGather(hunters, targetEnt); }
    if (fighters.length) commandAttack(fighters, targetEnt, queued);
    spawnMoveMarker(targetEnt.position, hunters.length ? 0xffd84a : 0xff4a3a, targetEnt.radius + 0.9);
    return;
  }
  // Enemic: atacar (tothom)
  if (targetEnt && targetEnt.team && targetEnt.team !== PLAYER.id && isAttackable(targetEnt)) {
    units = units.filter(u => !isMonk(u));
    if (!units.length) return;
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
  // Refugi: torres, castells, Centre de Ciutat (tropes a peu) i ariets (infanteria)
  if (targetEnt && targetEnt.isOwn && !targetEnt.underConstruction && garrisonCap(targetEnt) > 0) {
    const goers = units.filter(u => canGarrison(u, targetEnt) && !(u.subtype === 'villager' && targetEnt.dropoffTypes && !(targetEnt.garrison && targetEnt.garrison.length)));
    if (goers.length) {
      goers.forEach(u => { u.orderQueue.length = 0; orderGarrison(u, targetEnt); });
      spawnMoveMarker(targetEnt.position, 0x6ef2ff, (targetEnt.footprint ? targetEnt.footprint.hw : targetEnt.radius) + 0.8);
      if (goers.length === units.length) return;
      units = units.filter(u => !goers.includes(u));
    }
  }
  // Vaixells pesquers: clic dret sobre un banc de peixos
  const fishers = units.filter(u => u.subtype === 'fishingship');
  if (fishers.length && targetEnt && (targetEnt.subtype === 'fish' || targetEnt.subtype === 'deepfish') && !targetEnt.depleted) {
    if (queued) fishers.forEach(u => enqueueOrder(u, { type: 'gather', node: targetEnt })); else commandGather(fishers, targetEnt);
    spawnMoveMarker(targetEnt.position, 0xffd84a, targetEnt.radius + 0.9);
    units = units.filter(u => !fishers.includes(u));
    if (!units.length) return;
  }
  // Transport carregat: clic dret a terra ferma = desembarcar-hi les tropes
  const loaded = units.filter(u => u.subtype === 'transport' && u.garrison && u.garrison.length);
  if (loaded.length && (!targetEnt || targetEnt.kind === 'resource')) {
    const gp = pickGround(x, y);
    if (gp && waterCell(gp.x, gp.z) !== 1) {
      loaded.forEach(t => orderUnload(t, clampToMap(gp)));
      spawnMoveMarker(gp, 0x6ef2ff, 1.4);
      units = units.filter(u => !loaded.includes(u));
      if (!units.length) return;
    }
  }
  if (targetEnt && targetEnt.subtype === 'deepfish' && units.some(u => u.subtype === 'villager')) toast("🐟 Al peix d'altura només hi poden pescar els vaixells pesquers");
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
  if (vills.length && targetEnt && targetEnt.kind === 'resource' && !targetEnt.depleted && targetEnt.subtype !== 'deepfish') {
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

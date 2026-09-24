/* =====================================================================
   IA ENEMIGA: economia, construcció, exèrcit i onades d'atac
   ===================================================================== */
const AI = { team: ENEMY.id, enabled: true, diff: DIFFICULTY.normal, timer: 0, nextWaveAt: 300, waveCount: 0, alert: null, alertTime: -99, armyCycle: 0 };

function aiAlert(attacker) {
  if (!attacker || attacker.dead) return;
  AI.alert = attacker;
  AI.alertTime = state.elapsed;
}
function canPlaceRect(x, z, w, d) {
  const L = CONFIG.MAP_LIMIT, N = NAV.N;
  if (Math.abs(x) + w / 2 > L - 1 || Math.abs(z) + d / 2 > L - 1) return false;
  for (let j = navCell(z - d / 2 + 0.01); j <= navCell(z + d / 2 - 0.01); j++)
    for (let i = navCell(x - w / 2 + 0.01); i <= navCell(x + w / 2 - 0.01); i++)
      if (NAV.build[j * N + i]) return false;
  return true;
}
/* Busca un lloc lliure en anells al voltant d'un punt (deixant un passadís al voltant de l'edifici) */
function findBuildSpot(type, near, minR, maxR) {
  const [sw, sd] = CONFIG.BUILDINGS[type].size;
  const gap = type === 'farm' ? 0 : 2;
  for (let r = minR; r <= maxR; r += 1.5) {
    const steps = Math.max(10, Math.floor(r * 1.4));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2 + r * 0.37;
      const x = snapToGrid(near.x + Math.sin(a) * r, sw), z = snapToGrid(near.z + Math.cos(a) * r, sd);
      if (canPlace(type, x, z) && canPlaceRect(x, z, sw + gap, sd + gap)) return { x, z };
    }
  }
  return null;
}
function aiPickBuilders(n, near) {
  const vills = state.units.filter(u => u.team === AI.team && u.subtype === 'villager' && !u.garrisoned
    && u.state !== STATE.BUILDING && !u.buildTarget && u.carry.amount < 5);
  vills.sort((a, b) => hDist(a.position, near) - hDist(b.position, near));
  return vills.slice(0, n);
}
function aiBuild(type, near, minR, maxR, builders = 1) {
  const def = CONFIG.BUILDINGS[type];
  if (buildBlockReason(type, AI.team)) return false;
  const spot = findBuildSpot(type, near, minR, maxR);
  if (!spot) return false;
  const who = aiPickBuilders(builders, near);
  if (!who.length) return false;
  applyCost(costFor(type, AI.team), -1, AI.team);
  const b = createBuilding(type, spot.x, spot.z, false, AI.team);
  commandBuild(who, b);
  return true;
}
function nearestPlayerTarget(pos) {
  let best = null, bestD = Infinity;
  for (const u of state.units) if (u.isOwn && !u.garrisoned) { const d = hDist(u.position, pos); if (d < bestD) { bestD = d; best = u; } }
  for (const b of state.buildings) if (b.isOwn) { const d = hDist(b.position, pos) * 0.8; if (d < bestD) { bestD = d; best = b; } }
  return best;
}

/* Rendició: quan la IA ja no té cap possibilitat clara de guanyar, abandona (com a l'AoE II) */
function aiCheckResign(tc, villagers, army) {
  if (AI.resigned || state.elapsed < 300) return false;
  const strength = (team, hasTC, vills, arm) => vills + arm * 2 + (hasTC ? 15 : 0)
    + state.buildings.filter(b => b.team === team && !b.underConstruction && !b.isWall && b.def && b.def.trains).length * 4;
  const pUnits = state.units.filter(u => u.team === PLAYER.id);
  const pTC = state.buildings.some(b => b.team === PLAYER.id && b.subtype === 'towncenter');
  const me = strength(AI.team, !!tc, villagers.length, army.length);
  const them = strength(PLAYER.id, pTC, pUnits.filter(u => u.subtype === 'villager').length, pUnits.filter(u => u.isMilitary).length);
  const broke = !tc && (villagers.length < 3 || !canAfford({ wood: 275, stone: 100 }, AI.team)) && army.length < 4;
  const crushed = state.elapsed > 600 && them > me * 6 && army.length < 3;
  if (!broke && !crushed) return false;
  AI.resigned = true;
  AI.enabled = false;
  toast(`🏳️ Els ${civOf(AI.team).name} es rendeixen!`);
  return true;
}
function aiTick() {
  if (!AI.enabled) return;
  const T = AI.team, D = AI.diff, res = ENEMY.res;
  const blds = state.buildings.filter(b => b.team === T);
  const tc = blds.find(b => b.subtype === 'towncenter');
  const villagers = state.units.filter(u => u.team === T && u.subtype === 'villager');
  const army = state.units.filter(u => u.team === T && u.isMilitary);
  const has = (type, includeFoundations = true) => blds.some(b => b.subtype === type && (includeFoundations || !b.underConstruction));
  const count = (type) => blds.filter(b => b.subtype === type).length;
  const now = state.elapsed;
  AI.resignTimer = (AI.resignTimer || 0) + 1;
  if (AI.resignTimer % 10 === 0 && aiCheckResign(tc, villagers, army)) return;

  if (!tc) {
    // Sense Centre de Ciutat: tot l'exèrcit a l'atac
    for (const u of army) if (u.state === STATE.IDLE) { const t = nearestPlayerTarget(u.position); if (t) orderAttackMove(u, t.position.clone()); }
    return;
  }

  // 1) Aldeans
  if (villagers.length + tc.trainQueue.length < D.villagers && tc.trainQueue.length < 2
      && !tc.trainQueue.some(it => isTech(it.kind))) queueUnit(tc, 'villager');

  // 2) Cases (amb marge perquè la producció no s'aturi)
  const cap = popCap(T);
  if (popUsed(T) >= cap - 3 && cap < CONFIG.POP_CAP && !blds.some(b => b.subtype === 'house' && b.underConstruction)) {
    aiBuild('house', tc.position, 10, 28);
  }

  // 3) Edificis econòmics i militars
  // Serradora al costat del bosc que s'explota (se'n fa una de nova quan el bosc queda lluny)
  const tree = nearestResource('wood', tc.position, 160);
  if (villagers.length >= 6 && tree && !blds.some(b => b.subtype === 'lumbercamp' && (b.underConstruction || hDist(b.position, tree.position) < 16))) {
    aiBuild('lumbercamp', tree.position, 4, 10);
  }
  if (villagers.length >= 8 && !has('barracks')) aiBuild('barracks', tc.position, 13, 26, 2);
  if (villagers.length >= 9 && !has('mill')) {
    const food = nearestResource('food', tc.position, 45);
    aiBuild('mill', food ? food.position : tc.position, food ? 4 : 10, food ? 10 : 22);
  }
  if (villagers.length >= 11 && !has('miningcamp')) {
    const gold = nearestResource('gold', tc.position, 60);
    if (gold) aiBuild('miningcamp', gold.position, 4, 10);
  }
  if (villagers.length >= 14 && count('barracks') < D.maxBarracks && res.wood > 250) aiBuild('barracks', tc.position, 13, 30, 2);
  // Granges quan s'acaba l'aliment salvatge
  const wildFood = state.resourceNodes.some(n => n.resourceType === 'food' && n.subtype !== 'farm' && hDist(n.position, tc.position) < 45);
  const farms = state.resourceNodes.filter(n => n.subtype === 'farm' && n.team === T).length + blds.filter(b => b.subtype === 'farm').length;
  if (!wildFood && hasCompleted('mill', T) && farms < Math.ceil(villagers.length * 0.4)) {
    const mill = blds.find(b => b.subtype === 'mill' && !b.underConstruction);
    aiBuild('farm', mill.position, 5, 16);
  }

  // 3b) Edats i tecnologies
  const E = ENEMY;
  const tryTech = (kind, minVills = 0) => {
    if (villagers.length < minVills || itemBlockReason(kind, T)) return false;
    const at = blds.find(b => b.subtype === CONFIG.TECHS[kind].at && !b.underConstruction && b.trainQueue && b.trainQueue.length < 2);
    return at ? queueUnit(at, kind) : false;
  };
  // Estalvi per avançar d'edat: amb un exèrcit mínim, deixa de gastar en tropes i millores
  const nextAge = E.age === 0 ? 'age1' : E.age === 1 && D !== DIFFICULTY.easy ? 'age2' : E.age === 2 && D !== DIFFICULTY.easy ? 'age3' : null;
  const ageReady = nextAge && !techQueued(T, nextAge) && distinctBuilt(T, CONFIG.AGES[E.age + 1].req) >= 2
    && villagers.length >= (E.age === 0 ? Math.min(D.villagers, 14) : D.villagers - 2);
  AI.saving = !!ageReady && army.length >= 4;
  if (ageReady) tryTech(nextAge);
  if (!AI.saving) tryTech('loom', 12);
  if (!AI.saving && hasCompleted('mill', T) && res.wood > 250) tryTech('reseed');
  if (E.age >= 1) {
    if (!has('blacksmith')) aiBuild('blacksmith', tc.position, 12, 28);
    if (!has('stable') && villagers.length >= 15) aiBuild('stable', tc.position, 13, 30, 2);
    if (count('watchtower') < (D === DIFFICULTY.easy ? 0 : D === DIFFICULTY.hard ? 3 : 1) && res.stone >= 150) {
      const toward = nearestPlayerTarget(tc.position);
      const dir = toward ? new THREE.Vector3(toward.position.x - tc.position.x, 0, toward.position.z - tc.position.z).normalize() : new THREE.Vector3(-1, 0, -1).normalize();
      aiBuild('watchtower', tc.position.clone().addScaledVector(dir, 16), 0, 10);
    }
    if (!has('archeryrange') && villagers.length >= 13) aiBuild('archeryrange', tc.position, 13, 30, 2);
    if (!AI.saving) for (const k of ['wheelbarrow', 'doublebit', 'horsecollar', 'forging', 'goldmining', 'fletching', 'scalearmor', 'paddedarcher', 'up_manatarms']) if (res.food > 350) tryTech(k);
  }
  if (E.age >= 2) {
    if (!has('university') && villagers.length >= 14 && res.wood >= 250) aiBuild('university', tc.position, 12, 30, 2);
    if (!AI.saving && res.food > 500 && res.gold > 300) {
      for (const k of ['up_longsword', 'up_pikeman', 'up_crossbow', 'up_eliteskirm', 'up_lightcav', 'ironcasting', 'bodkin', 'chainmail',
        'leatherarcher', 'bowsaw', 'goldshaft', 'heavyplow', 'handcart', 'masonry', 'guardtower', 'treadmill']) tryTech(k);
    }
  }
  if (E.age >= 3 && !AI.saving && res.food > 800 && res.gold > 600) {
    for (const k of ['blastfurnace', 'bracer', 'platemail', 'ringarcher', 'up_twohanded', 'up_champion', 'up_halberdier', 'up_arbalester',
      'up_cavalier', 'up_paladin', 'up_hussar', 'up_cappedram', 'up_onager', 'chemistry', 'keep', 'twomansaw', 'croprotation', 'architecture', 'chainbarding']) tryTech(k);
  }
  if (E.age >= 2 && !AI.saving) {
    tryTech('barding');
    // Edat dels Castells: taller de setge, castell i millores úniques
    if (!has('siegeworkshop') && villagers.length >= 16 && res.wood >= 250) aiBuild('siegeworkshop', tc.position, 14, 32, 2);
    if (!has('castle') && D !== DIFFICULTY.easy && canAfford(costFor('castle', T), T) && villagers.length >= 16) {
      const toward = nearestPlayerTarget(tc.position);
      const dir = toward ? new THREE.Vector3(toward.position.x - tc.position.x, 0, toward.position.z - tc.position.z).normalize() : new THREE.Vector3(-1, 0, -1).normalize();
      aiBuild('castle', tc.position.clone().addScaledVector(dir, 20), 0, 16, 4);
    }
    if (hasCompleted('castle', T) && res.food > 900 && res.gold > 600) {
      const u = uniqueUnitOf(T);
      tryTech('elite_' + u);
      for (const k of Object.keys(CONFIG.TECHS)) if (CONFIG.TECHS[k].civ === ENEMY.civ && !CONFIG.TECHS[k].elite) tryTech(k);
    }
  }

  // 4) Exèrcit (segons l'edat)
  for (const b of blds) {
    if (AI.saving) break;
    if (!b.def || !b.def.trains || b.underConstruction || b.trainQueue.length >= 2) continue;
    const siegeCount = army.filter(u => u.category === 'siege').length;
    if (b.subtype === 'siegeworkshop' && siegeCount >= (D === DIFFICULTY.hard ? 4 : 3)) continue;
    const order = b.subtype === 'stable' ? (ENEMY.civ === 'saracens' ? ['camel', 'knight', 'scout'] : ['knight', 'scout', 'knight'])
      : b.subtype === 'siegeworkshop' ? (E.age >= 3 && T && ENEMY.techs.has('chemistry') ? ['ram', 'bombard', 'mangonel'] : ['ram', 'mangonel', 'ram'])
      : b.subtype === 'castle' ? (E.age >= 3 && army.filter(u => u.subtype === 'trebuchet').length < 2 ? [uniqueUnitOf(T), uniqueUnitOf(T), 'trebuchet'] : [uniqueUnitOf(T)])
      : b.subtype === 'archeryrange' ? ['archer', 'skirmisher', 'archer', 'cavarcher']
      : ['militia', 'spearman', 'militia'];
    for (let k = 0; k < order.length; k++) {
      const kind = order[(AI.armyCycle + k) % order.length];
      if (!itemBlockReason(kind, T) && queueUnit(b, kind)) { AI.armyCycle++; break; }
    }
  }

  // 5) Aldeans inactius → a treballar segons les necessitats
  const gatherers = { food: 0, wood: 0, gold: 0, stone: 0 };
  for (const u of villagers) { const t = u.gatherNode ? u.gatherNode.resourceType : null; if (t) gatherers[t]++; }
  const wantCastle = ENEMY.age >= 2 && !has('castle') && D !== DIFFICULTY.easy;
  const want = wantCastle ? { food: 0.35, wood: 0.25, gold: 0.2, stone: 0.2 }
    : ENEMY.age >= 1 ? { food: 0.4, wood: 0.3, gold: 0.2, stone: 0.1 }
    : has('barracks') ? { food: 0.45, wood: 0.33, gold: 0.22 } : { food: 0.5, wood: 0.5, gold: 0 };
  for (const u of villagers) {
    if (u.state !== STATE.IDLE || u.garrisoned || u.orderQueue.length) continue;
    const types = Object.keys(want).sort((a, b) => (gatherers[a] - want[a] * villagers.length) - (gatherers[b] - want[b] * villagers.length));
    for (const type of types) {
      if (!want[type]) continue;
      const node = nearestResource(type, tc.position, 65, u) || nearestResource(type, tc.position, 160, u);
      if (node) { orderGather(u, node, null); gatherers[type]++; break; }
    }
  }

  // 6) Defensa: només contra intrusos a prop de la base (no contra torres o tropes llunyanes que disparen a l'onada)
  const home = tc.position;
  let intruder = null;
  if (AI.alert && !AI.alert.dead && now - AI.alertTime < 10 && hDist(AI.alert.position, home) < 40) intruder = AI.alert;
  if (!intruder) {
    for (const u of state.units) if (u.isOwn && !u.garrisoned && hDist(u.position, home) < 32) { intruder = u; break; }
  }
  if (intruder) {
    const defenders = army.filter(u => !u.inWave && u.category !== 'siege' && (u.state === STATE.IDLE || u.state === STATE.MOVING));
    if (defenders.length) commandAttack(defenders, intruder);
  }

  // 7) Onades d'atac: primer es reuneixen davant la base i després avancen juntes al pas de la més lenta
  if ((!AI.wave || AI.wave.phase === 'attack') && now >= AI.nextWaveAt) {
    const avail = army.filter(u => !u.inWave && !u.garrisoned);
    const need = D.waveBase + AI.waveCount * 2;
    const target = avail.length >= need ? nearestPlayerTarget(home) : null;
    if (target) {
      const dir = new THREE.Vector3(target.position.x - home.x, 0, target.position.z - home.z).normalize();
      const rally = clampToMap(home.clone().addScaledVector(dir, 22));
      avail.forEach(u => { u.inWave = true; u.speedCap = null; });
      commandMove(avail, rally);
      AI.wave = { units: avail, rally, phase: 'gather', t0: now };
    }
  }
  const W = AI.wave;
  if (W) {
    W.units = W.units.filter(u => !u.dead);
    if (!W.units.length) AI.wave = null;
    else if (W.phase === 'gather') {
      const ready = W.units.filter(u => hDist(u.position, W.rally) < 10).length;
      if (ready >= W.units.length * 0.85 || now - W.t0 > 45) {
        const target = nearestPlayerTarget(W.rally);
        if (target) {
          const slow = Math.min(...W.units.map(u => u.speed));
          W.units.forEach(u => { u.speedCap = slow; });
          commandAttackMove(W.units, target.kind === 'unit' ? target.position.clone() : approachPoint(target, W.rally));
          W.phase = 'attack';
          AI.waveCount++;
          AI.nextWaveAt = now + D.interval;
          toast(`⚠️ L'enemic (${civOf(ENEMY.id).name}) ataca! (onada ${AI.waveCount}: ${W.units.length} unitats)`);
        } else AI.wave = null;
      }
    } else if (W.units.every(u => u.state === STATE.IDLE) && !nearestPlayerTarget(W.units[0].position)) {
      AI.wave = null;
    }
  }
  // Les unitats de l'onada que queden inactives busquen el següent objectiu (totes cap al mateix)
  const idleWave = army.filter(u => u.inWave && u.state === STATE.IDLE && !(W && W.phase === 'gather' && W.units.includes(u)));
  if (idleWave.length) {
    const t = nearestPlayerTarget(idleWave[0].position);
    if (t) commandAttackMove(idleWave, t.kind === 'unit' ? t.position.clone() : approachPoint(t, idleWave[0].position));
  }
}

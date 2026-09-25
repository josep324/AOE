/* =====================================================================
   IA: NUCLI
   Cada IA és un «cervell» lligat a un equip (team) que juga contra un altre (foe). Pensa cada
   D.think segons i, com la IA de l'AoE II, fa:
     - economia (21a): aldeans sense parar, cases, campaments, granges, més Centres, mercat
     - estratègia i exèrcit (21b): obertura segons la civilització, exploració, el que ha vist
       del rival, producció que el contraresta, tecnologies i edats
     - combat (21c): incursions contra els aldeans, atacs amb reforços i retirada, defensa amb
       campana i aldeans, micro (retirar ferits, kiting, foc concentrat)
   La IA només sap del rival el que ha vist (a part d'on comença, com en un 1 contra 1).
   ===================================================================== */
function makeAI(team, foe, diff = DIFFICULTY.normal) {
  return {
    team, foe, enabled: true, diff, think: 0, strategy: null,
    seen: new Map(), seenBld: new Map(), foeComp: null,
    army: null, raid: null, nextAttackAt: diff.attackAt, nextRaidAt: 0, attackCount: 0,
    alert: null, alertTime: -99, bellAt: -99, calmSince: 0,
    lastRebalance: 0, lastTrade: 0, lastIntel: -99, resigned: false, resignTimer: 0, dockSearchAt: 0,
  };
}
const AI = makeAI(ENEMY.id, PLAYER.id);
const AIS = [AI];
const aiOf = (team) => AIS.find(A => A.team === team) || null;
/* Torna a començar una IA (nova partida o dificultat canviada) */
function aiReset(A, diff = A.diff) {
  Object.assign(A, makeAI(A.team, A.foe, diff));
  return A;
}
/* Posa una IA a jugar per un equip (p. ex. el del jugador, per provar la IA contra ella mateixa) */
function enableAIFor(team, diff = DIFFICULTY.normal) {
  let A = aiOf(team);
  if (!A) { A = makeAI(team, team === PLAYER.id ? ENEMY.id : PLAYER.id, diff); AIS.push(A); }
  A.diff = diff; A.enabled = true;
  return A;
}
/* Algú ataca una unitat o edifici d'un equip de la IA: ho apunta per defensar-se */
function aiAlert(attacker, victimTeam = ENEMY.id) {
  const A = aiOf(victimTeam);
  if (!A || !attacker || attacker.dead) return;
  A.alert = attacker;
  A.alertTime = state.elapsed;
}

/* ---------- Construcció ---------- */
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
function aiPickBuilders(A, n, near, prefer = null) {
  const vills = state.units.filter(u => u.team === A.team && u.subtype === 'villager' && !u.garrisoned
    && u.state !== STATE.BUILDING && !u.buildTarget && u.carry.amount < 5 && u.aiRole !== 'fight');
  vills.sort((a, b) => hDist(a.position, near) - hDist(b.position, near));
  const out = prefer ? prefer.slice(0, n) : [];
  for (const v of vills) { if (out.length >= n) break; if (!out.includes(v)) out.push(v); }
  return out;
}
/* Col·loca i paga un edifici i hi envia constructors. Retorna l'edifici (o null) */
function aiBuild(A, type, near, minR, maxR, builders = 1, prefer = null) {
  if (buildBlockReason(type, A.team)) return null;
  const spot = findBuildSpot(type, near, minR, maxR);
  if (!spot) return null;
  const who = aiPickBuilders(A, builders, spot, prefer);
  if (!who.length) return null;
  applyCost(costFor(type, A.team), -1, A.team);
  const b = createBuilding(type, spot.x, spot.z, false, A.team);
  commandBuild(who, b);
  return b;
}

/* ---------- Coneixement del rival ---------- */
/* On és la base rival: el Centre que ha vist, o on sap que comença */
function aiFoeHome(A) {
  for (const { b } of A.seenBld.values()) if (!b.dead && b.subtype === 'towncenter') return b.position;
  const B = BASES[A.foe];
  return B ? new THREE.Vector3(B.x, 0, B.z) : new THREE.Vector3();
}
/* L'objectiu rival més proper (amb prioritat per a la Meravella i el Monestir de les relíquies).
   Compta sobretot el que la IA ha vist; si no ha vist res, va cap a la base rival. */
function nearestFoeTarget(A, pos) {
  const F = A.foe;
  const wonder = state.buildings.find(b => b.team === F && b.subtype === 'wonder' && !b.underConstruction);
  if (wonder && state.victory === 'standard') return wonder;
  if (state.relicWin && state.relicWin.team === F) {
    const m = state.buildings.find(b => b.team === F && b.subtype === 'monastery' && b.relics && b.relics.length);
    if (m) return m;
  }
  let best = null, bestD = Infinity;
  for (const s of A.seen.values()) {
    const u = s.u;
    if (u.dead || u.garrisoned || u.naval || u.team !== F) continue;
    const d = hDist(u.position, pos);
    if (d < bestD) { bestD = d; best = u; }
  }
  for (const { b } of A.seenBld.values()) {
    if (b.dead || b.team !== F) continue;
    const d = hDist(b.position, pos) * 0.8;
    if (d < bestD) { bestD = d; best = b; }
  }
  if (best) return best;
  // Encara no ha vist res: l'edifici rival més proper a on sap que comença (hi anirà a buscar-lo)
  const home = aiFoeHome(A);
  for (const b of state.buildings) if (b.team === F) { const d = hDist(b.position, home); if (d < bestD) { bestD = d; best = b; } }
  if (!best) for (const u of state.units) if (u.team === F && !u.garrisoned && !u.naval) { const d = hDist(u.position, pos); if (d < bestD) { bestD = d; best = u; } }
  return best;
}
/* «Força» d'una unitat per comparar exèrcits: cost i vida que li queda */
function unitStrength(u) {
  if (!u || u.dead) return 0;
  if (u.subtype === 'villager') return 0.25 * u.hp / u.maxHp;
  if (!u.isMilitary) return 0.1;
  const c = CONFIG.UNITS[u.unitKind] ? CONFIG.UNITS[u.unitKind].cost : {};
  const v = ((c.food || 0) + (c.wood || 0) + (c.gold || 0) * 1.3) / 100;
  return Math.max(0.4, v) * (0.3 + 0.7 * u.hp / u.maxHp);
}
/* Força d'un edifici defensiu (fletxes) */
function buildingStrength(b) {
  if (!b || b.dead || b.underConstruction) return 0;
  const g = b.garrison ? b.garrison.length : 0;
  if (b.subtype === 'towncenter') return 3 + g * 0.5;
  if (b.subtype === 'castle') return 14 + g * 0.5;
  if (b.subtype === 'watchtower') return 2.5 + g * 0.5;
  return 0;
}

/* ---------- Rendició: sense cap possibilitat clara de guanyar, abandona (com a l'AoE II) ---------- */
function aiCheckResign(A, C) {
  if (A.resigned || state.elapsed < 300) return false;
  const strength = (team, hasTC, vills, arm) => vills + arm * 2 + (hasTC ? 15 : 0)
    + state.buildings.filter(b => b.team === team && !b.underConstruction && !b.isWall && b.def && b.def.trains).length * 4;
  const pUnits = state.units.filter(u => u.team === A.foe);
  const pTC = state.buildings.some(b => b.team === A.foe && b.subtype === 'towncenter');
  const me = strength(A.team, C.tcs.length > 0, C.villagers.length, C.army.length);
  const them = strength(A.foe, pTC, pUnits.filter(u => u.subtype === 'villager').length, pUnits.filter(u => u.isMilitary).length);
  const broke = !C.tcs.length && (C.villagers.length < 3 || !canAfford({ wood: 275, stone: 100 }, A.team)) && C.army.length < 4;
  const crushed = state.elapsed > 600 && them > me * 6 && C.army.length < 3;
  if (!broke && !crushed) return false;
  A.resigned = true;
  A.enabled = false;
  toast(`🏳️ Els ${civOf(A.team).name} es rendeixen!`);
  return true;
}

/* ---------- Cicle de decisions ---------- */
function aiTick() {
  for (const A of AIS) {
    if (!A.enabled) continue;
    A.think -= 0.5;
    if (A.think > 0) continue;
    A.think = A.diff.think;
    aiThink(A);
  }
}
/* Fotografia de l'estat de l'equip de la IA (es calcula un cop per decisió) */
function aiContext(A) {
  const T = A.team;
  const blds = state.buildings.filter(b => b.team === T);
  const tcs = blds.filter(b => b.subtype === 'towncenter' && !b.underConstruction);
  const units = state.units.filter(u => u.team === T && !u.dead);
  const C = {
    T, D: A.diff, E: teamOf(T), res: teamOf(T).res, now: state.elapsed, blds, tcs, units,
    villagers: units.filter(u => u.subtype === 'villager'),
    army: units.filter(u => u.isMilitary && !u.naval && u.category !== 'monk' && u.category !== 'king'),
    monks: units.filter(u => u.category === 'monk' && !u.garrisoned),
    ships: units.filter(u => u.naval),
    has: (type, done = false) => blds.some(b => b.subtype === type && (!done || !b.underConstruction)),
    count: (type) => blds.filter(b => b.subtype === type).length,
  };
  const B = BASES[T];
  C.home = (tcs[0] || blds[0] || { position: new THREE.Vector3(B ? B.x : 0, 0, B ? B.z : 0) }).position;
  C.foeHome = aiFoeHome(A);
  C.age = C.E.age;
  return C;
}
function aiThink(A) {
  const C = aiContext(A);
  if (++A.resignTimer % 10 === 0 && aiCheckResign(A, C)) return;
  if (!A.strategy) A.strategy = aiPickStrategy(A);
  aiIntel(A, C);
  if (!C.tcs.length) {
    // Sense Centre de Ciutat: en torna a fer un si pot; si no, tot l'exèrcit a l'atac
    if (C.villagers.length && canAfford(costFor('towncenter', A.team), A.team) && !C.has('towncenter')) {
      const B = BASES[A.team];
      aiBuild(A, 'towncenter', B ? new THREE.Vector3(B.x, 0, B.z) : C.villagers[0].position, 0, 30, Math.min(6, C.villagers.length));
    }
    for (const u of C.army) if (u.state === STATE.IDLE) { const t = nearestFoeTarget(A, u.position); if (t) orderAttackMove(u, t.position.clone()); }
    aiVillagerWork(A, C);
    return;
  }
  aiEconomy(A, C);
  aiAgesAndTechs(A, C);
  aiProduction(A, C);
  aiScout(A, C);
  aiDefense(A, C);
  aiAttacks(A, C);
  aiMicro(A, C);
  aiMonks(A, C);
  aiNaval(A, C);
  aiSpecial(A, C);
}

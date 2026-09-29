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
  if (!A) { A = makeAI(team, GAME.players.find(t => hostile(t, team)) || (team === PLAYER.id ? ENEMY.id : PLAYER.id), diff); AIS.push(A); }
  A.diff = diff; A.enabled = true;
  return A;
}
/* Algú ataca una unitat o edifici d'un equip de la IA: ho apunta per defensar-se */
function aiAlert(attacker, victimTeam = ENEMY.id) {
  const A = aiOf(victimTeam);
  if (!A || !A.enabled || !attacker || attacker.dead || !hostile(attacker.team, victimTeam)) return;
  A.alert = attacker;
  A.alertTime = state.elapsed;
}

/* ---------- Construcció ---------- */
function canPlaceRect(x, z, w, d) {
  const L = CONFIG.MAP_LIMIT, N = NAV.N;
  if (Math.abs(x) + w / 2 > L - 1 || Math.abs(z) + d / 2 > L - 1) return false;
  for (let j = navCell(z - d / 2 + 0.01); j <= navCell(z + d / 2 - 0.01); j++)
    for (let i = navCell(x - w / 2 + 0.01); i <= navCell(x + w / 2 - 0.01); i++)
      if (NAV.build[j * N + i] === 1) return false;     // (2 = sota la copa d'un arbre: s'hi pot passar)
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

/* Punt més alt (i transitable) a prop d'un punt: la IA hi reuneix l'exèrcit i hi fa torres i castells */
function aiHighSpot(pos, r) {
  let best = pos, bh = groundY(pos.x, pos.z) + 0.5;
  for (let dz = -r; dz <= r; dz += 3) for (let dx = -r; dx <= r; dx += 3) {
    if (dx * dx + dz * dz > r * r) continue;
    const x = pos.x + dx, z = pos.z + dz;
    if (Math.abs(x) > CONFIG.MAP_LIMIT - 4 || Math.abs(z) > CONFIG.MAP_LIMIT - 4 || waterCell(x, z) || NAV.walk[navCell(z) * NAV.N + navCell(x)]) continue;
    const h = groundY(x, z);
    if (h > bh) { bh = h; best = new THREE.Vector3(x, 0, z); }
  }
  return best;
}
/* ---------- Coneixement del rival ---------- */
/* On és la base rival: el Centre que ha vist, o on sap que comença */
function aiFoeHome(A) {
  for (const { b } of A.seenBld.values()) if (!b.dead && b.subtype === 'towncenter' && b.team === A.foe) return b.position;
  const B = BASES[A.foe];
  return B ? new THREE.Vector3(B.x, 0, B.z) : new THREE.Vector3();
}
/* ---------- Diversos jugadors (fase 20) ---------- */
/* Rival principal: el més proper que segueix viu (en un 2 contra 2, cada IA rival té el seu costat);
   quan cau, va a ajudar un aliat contra el seu. En un 1 contra 1 sempre és l'únic rival. */
function aiNearestFoe(team, home) {
  let pick = null, bd = Infinity;
  for (const t of GAME.players) {
    if (!hostile(t, team) || GAME.defeated.has(t) || !teamAlive(t)) continue;
    const tc = state.buildings.find(b => b.team === t && b.subtype === 'towncenter' && !b.dead);
    const p = tc ? tc.position : BASES[t] ? new THREE.Vector3(BASES[t].x, 0, BASES[t].z) : null;
    const d = p && home ? hDist(p, home) : 1e9;
    if (d < bd - 0.5) { bd = d; pick = t; }
  }
  return pick;
}
function aiPickFoe(A, C) {
  const alive = GAME.players.filter(t => hostile(t, A.team) && !GAME.defeated.has(t) && teamAlive(t));
  if (!alive.length || alive.includes(A.foe)) return;
  const mate = AIS.find(o => o !== A && o.enabled && allied(o.team, A.team) && alive.includes(o.foe));
  const pick = mate ? mate.foe : aiNearestFoe(A.team, C.home);
  if (pick === A.foe) return;
  A.foe = pick;
  A.foeSince = C.now;
}
/* Ajuda als aliats: si un enemic ataca la base d'un aliat (també la del jugador), les tropes que
   són a casa sense feina hi van (com els aliats de l'AoE II) */
function aiHelpAllies(A, C) {
  if (C.now < (A.helpAt || 0) || A.threatened) return;
  A.helpAt = C.now + 5;
  for (const t of GAME.players) {
    if (t === A.team || !allied(t, A.team) || GAME.defeated.has(t)) continue;
    for (const tc of state.buildings) {
      if (tc.team !== t || tc.dead || (tc.subtype !== 'towncenter' && tc.subtype !== 'castle')) continue;
      let s = 0;
      for (const u of unitsNear(tc.position.x, tc.position.z, 30, aiNearBuf)) if (hostile(u.team, A.team) && u.isMilitary && !u.dead) s += unitStrength(u);
      if (s < 3) continue;
      const helpers = aiHomeArmy(A, C).filter(u => u.state === STATE.IDLE && u.category !== 'siege');
      if (helpers.length >= 3) {
        commandAttackMove(helpers, tc.position.clone());
        if (t === PLAYER.id && C.now > (A.helpToast || 0)) { A.helpToast = C.now + 60; toast(`🤝 El teu aliat (${civOf(A.team).name}) envia ${helpers.length} unitats a ajudar-te`); }
      }
      return;
    }
  }
}
/* Reparació: quan no hi ha enemics a prop, dos aldeans reparen els edificis importants danyats */
const AI_REPAIR = new Set(['towncenter', 'castle', 'watchtower', 'bombardtower', 'stonewall', 'gate', 'palisade']);
function aiRepair(A, C) {
  if (C.now < (A.repairAt || 0) || A.threatened) return;
  A.repairAt = C.now + 8;
  for (const b of C.blds) {
    if (!AI_REPAIR.has(b.subtype) || !canRepair(b, A.team) || b.hp > b.maxHp * 0.75) continue;
    if (Object.entries(CONFIG.BUILDINGS[b.subtype].cost || {}).some(([k, v]) => C.res[k] < Math.max(20, v * 0.2))) continue;
    if (aiFoeStrengthAt(A, b.position, 18) > 0) continue;
    const busy = C.villagers.filter(v => v.buildTarget === b).length;
    if (busy >= 2) continue;
    const free = C.villagers.filter(v => !v.garrisoned && !v.buildTarget && v.aiRole !== 'fight' && hDist(v.position, b.position) < 60)
      .sort((p, q) => hDist(p.position, b.position) - hDist(q.position, b.position)).slice(0, 2 - busy);
    if (free.length) { commandBuild(free, b); return; }
  }
}
/* Tribut: si a un aliat li falta un recurs que a la IA li sobra, n'hi envia (cada 90 s com a màxim) */
function aiTribute(A, C) {
  if (C.now < (A.tributeAt || 0)) return;
  A.tributeAt = C.now + 20;
  for (const t of GAME.players) {
    if (t === A.team || !allied(t, A.team) || GAME.defeated.has(t) || !teamAlive(t)) continue;
    const R = resOf(t);
    for (const r of ['food', 'wood', 'gold', 'stone']) {
      if (R[r] >= 100 || C.res[r] < (r === 'stone' ? 600 : 1200)) continue;
      if (sendTribute(A.team, t, r, 200)) { A.tributeAt = C.now + 90; return; }
    }
  }
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
    if (b.dead || b.team !== F || b.subtype === 'farm') continue;
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
  if (b.subtype === 'bombardtower') return 5 + g * 0.5;
  return 0;
}

/* ---------- Rendició: sense cap possibilitat clara de guanyar, abandona (com a l'AoE II) ---------- */
function aiCheckResign(A, C) {
  if (A.resigned || state.elapsed < 300) return false;
  const strength = (team, hasTC, vills, arm) => vills + arm * 2 + (hasTC ? 15 : 0)
    + state.buildings.filter(b => b.team === team && !b.underConstruction && !b.isWall && b.def && b.def.trains).length * 4;
  const me = strength(A.team, C.tcs.length > 0, C.villagers.length, C.army.length);
  // (amb diversos rivals, compta el més fort)
  let them = 0;
  for (const t of GAME.players) {
    if (!hostile(t, A.team) || GAME.defeated.has(t)) continue;
    const pUnits = state.units.filter(u => u.team === t);
    const pTC = state.buildings.some(b => b.team === t && b.subtype === 'towncenter');
    them = Math.max(them, strength(t, pTC, pUnits.filter(u => u.subtype === 'villager').length, pUnits.filter(u => u.isMilitary).length));
  }
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
    // Límit de població triat: amb menys de 200, la IA fa menys aldeans i els seus llindars (pujar d'edat,
    // castell, mercat…) es comparen amb el nombre d'aldeans escalat, com si jugués a 200
    popScale: Math.min(1, CONFIG.POP_CAP / 200),
    army: units.filter(u => u.isMilitary && !u.naval && u.category !== 'monk' && u.category !== 'king'),
    monks: units.filter(u => u.category === 'monk' && !u.garrisoned),
    ships: units.filter(u => u.naval),
    has: (type, done = false) => blds.some(b => b.subtype === type && (!done || !b.underConstruction)),
    count: (type) => blds.filter(b => b.subtype === type).length,
  };
  const B = BASES[T];
  C.home = (tcs[0] || blds[0] || { position: new THREE.Vector3(B ? B.x : 0, 0, B ? B.z : 0) }).position;
  C.foeHome = aiFoeHome(A);
  // Punt de retorn a casa: davant del Centre (cap al mig del mapa), mai a dins de l'edifici
  const toMid = new THREE.Vector3(-C.home.x, 0, -C.home.z);
  if (toMid.lengthSq() < 1) toMid.set(1, 0, 0);
  const hr = clampToMap(C.home.clone().addScaledVector(toMid.normalize(), 15));
  const fc = nearestFreeCell(navCell(hr.x), navCell(hr.z), 10);        // una cel·la lliure (no a sobre d'una casa)
  C.homeRally = fc ? new THREE.Vector3(navCenter(fc[0]), 0, navCenter(fc[1])) : hr;
  C.age = C.E.age;
  C.vn = C.villagers.length / C.popScale;
  C.maxVills = Math.max(8, Math.round(C.D.villagers * CONFIG.POP_CAP / 200));
  return C;
}
function aiThink(A) {
  const C = aiContext(A);
  if (++A.resignTimer % 10 === 0 && aiCheckResign(A, C)) return;
  if (!A.strategy) A.strategy = aiPickStrategy(A);
  aiPickFoe(A, C);
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
  aiHelpAllies(A, C);
  aiTribute(A, C);
  aiRepair(A, C);
  aiAttacks(A, C);
  aiMicro(A, C);
  aiMonks(A, C);
  aiNaval(A, C);
  aiSpecial(A, C);
}

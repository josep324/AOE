/* =====================================================================
   IA: NAVAL I DESEMBARCAMENTS
   - Moll, vaixells pesquers, flota de guerra (contra els vaixells i els molls rivals).
   - Quan el rival és en una altra terra (mapa d'Illes), l'exèrcit no hi pot anar caminant: com la
     IA de l'AoE II, fa vaixells de transport, reuneix l'exèrcit a la riba de casa, l'embarca, navega
     fins a la riba rival més propera a l'objectiu (amb la flota d'escorta) i hi desembarca; allà
     l'atac continua com sempre. Els reforços hi van de la mateixa manera, en una altra travessia.
   ===================================================================== */
/* Zona de terra d'un punt (la cel·la lliure més propera en un radi de r cel·les; 0 si no n'hi ha) */
function landZoneAt(p, r = 10) {
  if (!NAV.label) return 0;
  const N = NAV.N, ci = navCell(p.x), cj = navCell(p.z);
  for (let d = 0; d <= r; d++) for (let dj = -d; dj <= d; dj++) for (let di = -d; di <= d; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== d) continue;
    const i = ci + di, j = cj + dj;
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    const l = NAV.label[j * N + i];
    if (l && waterCell(navCenter(i), navCenter(j)) !== 1) return l;
  }
  return 0;
}
/* Hi ha alguna cel·la de la zona a menys de r cel·les? */
function zoneNear(x, z, zone, r) {
  if (!NAV.label) return true;
  const N = NAV.N, ci = navCell(x), cj = navCell(z);
  for (let j = Math.max(0, cj - r); j <= Math.min(N - 1, cj + r); j++)
    for (let i = Math.max(0, ci - r); i <= Math.min(N - 1, ci + r); i++) if (NAV.label[j * N + i] === zone) return true;
  return false;
}
/* El rival és en una altra terra? (es recalcula cada 20 s o si canvia de rival) */
function aiOverseas(A, C) {
  if (!WATER.any) return false;
  if (A.overFoe === A.foe && C.now < (A.overAt || 0)) return A.overseas;
  A.overAt = C.now + 20; A.overFoe = A.foe;
  const mine = landZoneAt(C.homeRally), theirs = landZoneAt(C.foeHome);
  A.overseas = !!(mine && theirs && mine !== theirs);
  return A.overseas;
}
/* Riba d'una zona de terra (terra ferma tocant a aigua navegable) més a prop d'un punt; es busca
   en un quadrat al voltant de «center» (per defecte, el mateix punt) */
function aiShoreSpot(zone, toward, center = toward, maxR = 160) {
  const N = NAV.N, L = CONFIG.MAP_LIMIT - 3;
  let best = null, bd = Infinity;
  const wet = (x, z) => isOpenWater(x, z);
  for (let z = Math.max(-L, center.z - maxR); z <= Math.min(L, center.z + maxR); z += 2) {
    for (let x = Math.max(-L, center.x - maxR); x <= Math.min(L, center.x + maxR); x += 2) {
      const d = (x - toward.x) ** 2 + (z - toward.z) ** 2;
      if (d >= bd) continue;
      const k = navCell(z) * N + navCell(x);
      if (NAV.walk[k] || NAV.label[k] !== zone || waterCell(x, z)) continue;
      if (!(wet(x + 4, z) || wet(x - 4, z) || wet(x, z + 4) || wet(x, z - 4))) continue;
      bd = d; best = new THREE.Vector3(x, 0, z);
    }
  }
  return best;
}
const aiTransports = (C) => C.ships.filter(s => s.subtype === 'transport' && !s.dead);

/* ---------- Travessies (embarcar, navegar, desembarcar) ---------- */
const aiFreeTransports = (A, C) => {
  const busy = new Set([...(A.ferry ? A.ferry.ships : []), ...(A.colony ? A.colony.ships : [])]);
  return aiTransports(C).filter(s => !busy.has(s) && !(s.garrison && s.garrison.length));
};
function aiStartFerry(A, C, units, join, colonyTarget = null) {
  const ships = aiFreeTransports(A, C);
  if (!ships.length || !units.length) return false;
  const target = colonyTarget || (join && A.army ? (A.army.target && !A.army.target.dead ? A.army.target : null) || aiObjective(A, C, C.foeHome) : aiObjective(A, C, C.home));
  if (!target) return false;
  const zone = landZoneAt(units[0].position, 4) || landZoneAt(C.homeRally), foeZone = landZoneAt(target.position, 12);
  if (!zone || !foeZone || zone === foeZone) return false;
  const landing = aiShoreSpot(foeZone, target.position);
  const shore = landing && aiShoreSpot(zone, landing, units[0].position, 110);
  if (!landing || !shore) return false;
  // Escorta: amb més vaixells de guerra rivals que propis a la riba de sortida o d'arribada, no surt
  // (els transports s'enfonsarien amb tothom a dins); primer la flota va a netejar el pas
  const fleet = C.ships.filter(w => w.isMilitary && !w.dead);
  const threat = state.units.filter(u => u.naval && u.isMilitary && !u.dead && !u.garrisoned && hostile(u.team, A.team)
    && (hDist(u.position, landing) < 60 || hDist(u.position, shore) < 60)).length;
  if (threat > fleet.length) {
    const idle = fleet.filter(w => w.state === STATE.IDLE);
    if (idle.length >= threat) commandAttackMove(idle, fitToMedium(landing, true));
    return false;
  }
  const cap = garrisonCap(ships[0]);
  const use = ships.slice(0, Math.ceil(units.length / cap));
  // (sense setge: els ariets, massa amples, s'encallaven de camí a la riba d'embarcar)
  const load = units.filter(u => u.category !== 'siege').slice(0, use.length * cap);
  if (!load.length) return false;
  load.forEach(u => { u.aiRole = 'ferry'; u.speedCap = null; });
  commandMove(load, shore);
  const dock = fitToMedium(shore, true);
  use.forEach(s => orderMove(s, dock));
  const F = { units: load, ships: use, shore, dock, landing, target, join: !!join, phase: 'board', t0: C.now, t1: 0, colony: !!colonyTarget };
  if (colonyTarget) A.colony = F; else A.ferry = F;
  return true;
}
/* Expedició d'aldeans: quan a l'illa on són s'acaba la fusta, l'or o la pedra, uns quants aldeans
   van amb transport a una altra illa (sense enemics) on n'hi ha, hi fan un campament i hi treballen;
   si a la seva illa ja no queda res de res, tornen a casa */
function aiColonize(A, C) {
  if (!C.overseas || C.now < (A.colonyAt || 0) || C.age < 1) return;
  A.colonyAt = C.now + 20;
  const home = landZoneAt(C.homeRally);
  aiRemoteCamps(A, C, home);
  if (A.colony) return;
  const groups = new Map();
  for (const v of C.villagers) {
    if (v.garrisoned || v.aiRole || v.state !== STATE.IDLE) continue;
    const z = landZoneAt(v.position, 3);
    if (!z) continue;
    if (!groups.has(z)) groups.set(z, []);
    groups.get(z).push(v);
  }
  // (feina de debò: el recurs i un lloc on deixar-lo, tots dos a la mateixa illa)
  const drop = (v, type) => C.blds.some(b => b.def && b.def.dropoff && b.def.dropoff.includes(type) && !b.underConstruction && canReach(v, b, 3));
  const has = (v, type) => drop(v, type) && state.resourceNodes.some(n => n.resourceType === type && !n.depleted && n.amount > 0 && n.subtype !== 'farm' && canReach(v, n));
  // Sense or (o pedra) a l'illa pròpia i amb prou aldeans: n'hi envia uns quants encara que tinguin feina
  if (C.vn >= 40 && !groups.has(home)) {
    const workers = C.villagers.filter(v => !v.garrisoned && !v.aiRole && v.state !== STATE.BUILDING && landZoneAt(v.position, 3) === home
      && (aiVillagerRes(v) === 'wood' || aiVillagerRes(v) === 'food'));
    if (workers.length >= 20 && ['gold', 'stone'].some(t => !has(workers[0], t) && C.res[t] < 400)) groups.set(home, workers.slice(0, 8));
  }
  for (const [zone, idle] of groups) {
    if (idle.length < (zone === home ? 5 : 3)) continue;
    // Què falta on són (fusta, or o pedra) i on n'hi ha, en una illa sense edificis rivals
    for (const type of ['wood', 'gold', 'stone']) {
      if (has(idle[0], type)) continue;
      let best = null, bd = Infinity;
      for (const n of state.resourceNodes) {
        if (n.resourceType !== type || n.depleted || n.amount <= 0 || n.subtype === 'farm') continue;
        const d = hDist(n.position, C.home);
        if (d >= bd) continue;
        const z = landZoneAt(n.position, 4);
        if (!z || z === zone) continue;
        if (state.buildings.some(b => hostile(b.team, A.team) && !b.dead && hDist(b.position, n.position) < 45)) continue;
        bd = d; best = n;
      }
      if (!best) continue;
      const camp = type === 'wood' ? 'lumbercamp' : 'miningcamp';
      const z = landZoneAt(best.position, 4);
      const needCamp = !C.blds.some(b => b.def && b.def.dropoff && b.def.dropoff.includes(type) && landZoneAt(b.position, 6) === z);
      if (needCamp && !canAfford(costFor(camp, A.team), A.team)) continue;   // (sense campament no val la pena)
      if (aiStartFerry(A, C, idle.slice(0, 10), false, best)) {
        // El campament es paga en sortir (en arribar potser ja no hi hauria fusta)
        A.colony.resType = type;
        if (needCamp) { A.colony.camp = camp; applyCost(costFor(camp, A.team), -1, A.team); }
        return;
      }
    }
    // Lluny de casa i sense res a fer: tornen
    if (zone !== home && !['wood', 'gold', 'stone', 'food'].some(t => has(idle[0], t)) && C.tcs[0]
        && aiStartFerry(A, C, idle.slice(0, 10), false, C.tcs[0])) { A.colony.resType = null; return; }
  }
}
/* Aldeans que treballen en una altra illa sense cap lloc on deixar el que porten: s'hi fa un campament */
function aiRemoteCamps(A, C, homeZone) {
  A.campNeed = null;
  const byZone = new Map();
  for (const v of C.villagers) {
    if (v.garrisoned || v.aiRole) continue;
    const z = landZoneAt(v.position, 3);
    if (!z || z === homeZone) continue;
    if (!byZone.has(z)) byZone.set(z, []);
    byZone.get(z).push(v);
  }
  for (const [, vs] of byZone) {
    // (cada recurs que hi recullen necessita el seu campament: fusta → serradora; or i pedra → miner)
    const types = new Set(vs.map(v => v.carry.amount ? v.carry.type : v.lastResourceType).filter(t => t === 'wood' || t === 'gold' || t === 'stone'));
    for (const type of types) {
      if (C.blds.some(b => b.def && b.def.dropoff && b.def.dropoff.includes(type) && canReach(vs[0], b, 3))) continue;
      const camp = type === 'wood' ? 'lumbercamp' : 'miningcamp';
      const who = vs.filter(v => (v.carry.amount ? v.carry.type : v.lastResourceType) === type);
      if (!canAfford(costFor(camp, A.team), A.team)) {
        // No es pot pagar: es reserva (la resta de despeses s'esperen, com per a l'edat) i, mentrestant,
        // aquests aldeans passen a un recurs que sí que es pot deixar en aquesta illa
        A.campNeed = costFor(camp, A.team);
        const alt = ['gold', 'stone', 'wood', 'food'].find(t => t !== type && C.blds.some(b => b.def && b.def.dropoff && b.def.dropoff.includes(t) && canReach(who[0], b, 3))
          && nearestResource(t, who[0].position, 80, who[0]));
        if (alt) for (const v of who) { const n = nearestResource(alt, v.position, 80, v); if (n) orderGather(v, n, null); }
        else commandStop(who);               // (sense res a fer aquí: aiColonize els portarà a casa)
        continue;
      }
      const node = nearestResource(type, who[0].position, 60, who[0]);
      if (node) aiBuild(A, camp, node.position, 4, 16, 2, who.slice(0, 2));
    }
  }
}
function aiFerryTick(A, C, key = 'ferry') {
  const F = A[key];
  if (!F) return;
  F.ships = F.ships.filter(s => !s.dead);
  F.units = F.units.filter(u => !u.dead);
  const release = (list) => list.forEach(u => { if (!u.garrisoned) { u.aiRole = null; u.garrisonTarget = null; } });
  const refund = () => { if (F.camp) applyCost(costFor(F.camp, A.team), 1, A.team); };
  if (!F.ships.length || !F.units.length) { release(F.units); refund(); A[key] = null; if (!F.colony) A.nextAttackAt = Math.max(A.nextAttackAt, C.now + 20); return; }
  if (F.phase === 'board') {
    // Els vaixells arriben a la riba i les tropes hi pugen (cadascú al que té lloc)
    const ready = F.ships.filter(s => hDist(s.position, F.dock) < 9);
    for (const s of F.ships) if (s.state === STATE.IDLE && hDist(s.position, F.dock) >= 9) orderMove(s, F.dock);
    const room = new Map(ready.map(s => [s, garrisonCap(s) - (s.garrison ? s.garrison.length : 0) - F.units.filter(u => u.garrisonTarget === s).length]));
    for (const u of F.units) {
      if (u.garrisoned || u.garrisonTarget) continue;
      if (hDist(u.position, F.shore) > 12) { if (u.state === STATE.IDLE) orderMove(u, F.shore); continue; }
      const s = ready.find(x => room.get(x) > 0);
      if (s) { orderGarrison(u, s); room.set(s, room.get(s) - 1); }
    }
    const aboard = F.units.filter(u => u.garrisoned).length;
    if (aboard === F.units.length || (C.now - F.t0 > 75 && aboard > 0)) {
      // Salpen: qui no ha pujat torna a casa
      release(F.units.filter(u => !u.garrisoned));
      F.units = F.units.filter(u => u.garrisoned);
      for (const s of F.ships) { if (s.garrison && s.garrison.length) orderUnload(s, F.landing); else orderMove(s, F.dock); }
      F.phase = 'sail'; F.t1 = C.now;
      const fleet = C.ships.filter(w => w.isMilitary && w.state === STATE.IDLE);
      if (fleet.length && !F.colony) commandAttackMove(fleet, fitToMedium(F.landing, true));
    } else if (C.now - F.t0 > 120) { release(F.units); refund(); A[key] = null; }
    return;
  }
  // Navegant: si un vaixell s'atura amb tropes a bord, torna a provar de desembarcar
  const loaded = F.ships.filter(s => s.garrison && s.garrison.length);
  for (const s of loaded) if (s.state === STATE.IDLE) orderUnload(s, C.now - F.t1 > 100 ? (nearestCellWhere(s.position, isDryLand, 20) || F.landing) : F.landing);
  if (loaded.length && C.now - F.t1 < 180) return;
  // Desembarcats: s'uneixen a l'exèrcit que ja lluita allà o en comencen un de nou
  const landed = F.units.filter(u => !u.dead && !u.garrisoned);
  const back = fitToMedium(C.homeRally, true);
  F.ships.forEach(s => { if (!(s.garrison && s.garrison.length)) orderMove(s, back); });
  A[key] = null;
  if (!landed.length) { refund(); return; }
  if (F.colony) {
    // Colons: un campament a tocar del recurs i tothom a treballar-hi
    landed.forEach(u => { u.aiRole = null; });
    if (!F.resType) return;                       // (han tornat a casa: ja els posaran a treballar)
    const node = F.target && !F.target.depleted ? F.target : nearestResource(F.resType, landed[0].position, 60, landed[0]);
    const spot = node && F.camp && findBuildSpot(F.camp, node.position, 4, 16);
    if (spot) commandBuild(landed.slice(0, 2), createBuilding(F.camp, spot.x, spot.z, false, A.team));
    else refund();
    if (node) for (const v of landed.slice(spot ? 2 : 0)) { const n = nearestResource(F.resType, node.position, 40, v); if (n) orderGather(v, n, null); }
    return;
  }
  landed.forEach(u => { u.aiRole = 'army'; });
  const W = A.army;
  if (W && W.phase === 'attack' && W.units.length) {
    W.units.push(...landed);
    commandAttackMove(landed, centroidOf(W.units.filter(u => !landed.includes(u))).clone());
    return;
  }
  const target = F.target && !F.target.dead ? F.target : aiObjective(A, C, F.landing);
  A.army = { units: landed, rally: F.landing.clone(), phase: 'attack', t0: C.now, target, overseas: true };
  if (target) commandAttackMove(landed, target.kind === 'unit' ? target.position.clone() : approachPoint(target, F.landing));
  A.attackCount++;
  if (A.foe === PLAYER.id) toast(`⚠️ L'enemic (${civOf(C.T).name}) desembarca ${landed.length} unitats a la teva illa!`);
  else if (allied(A.foe, PLAYER.id)) toast(`⚠️ ${teamOf(C.T).name} desembarca a l'illa del teu aliat`);
}

/* ---------- Moll, pesca i flota de guerra (només si el mapa té aigua) ---------- */
function aiNaval(A, C) {
  if (!WATER.any) return;
  const T = C.T, D = C.D, now = C.now, over = C.overseas;
  const docks = C.blds.filter(b => b.subtype === 'dock');
  // (a les Illes el moll és el primer que cal: pesca i, després, transports i flota)
  const wantDocks = over && C.age >= 1 && C.vn >= 30 ? 2 : 1;
  // (a les Illes, el primer moll no s'espera a l'estalvi per a l'edat: sense moll no hi ha res a fer)
  if (docks.length < wantDocks && C.villagers.length >= (over ? 6 : 10) && C.res.wood >= 170 && (!A.saving || (over && !docks.length)) && now > (A.dockSearchAt || 0)) {
    A.dockSearchAt = now + 30;
    // (tocant a la terra de casa: no en un racó tancat pel bosc ni a l'illa del costat)
    const home = landZoneAt(C.homeRally);
    const spot = findDockSpot(docks.length ? docks[0].position.clone().add(new THREE.Vector3(12, 0, -12)) : C.home, 120, (x, z) => zoneNear(x, z, home, 7));
    if (spot) {
      const who = aiPickBuilders(A, 2, spot);
      if (who.length) { applyCost(costFor('dock', T), -1, T); commandBuild(who, createBuilding('dock', spot.x, spot.z, false, T)); }
    }
  }
  const built = docks.filter(b => !b.underConstruction);
  const fishers = C.ships.filter(u => u.subtype === 'fishingship'), fleet = C.ships.filter(u => u.isMilitary);
  const transports = aiTransports(C);
  // Flota rival a prop de casa: si en té més, primer galeres (i no pesquers, que s'enfonsarien)
  const foeFleet = state.units.filter(u => u.naval && u.isMilitary && !u.dead && !u.garrisoned && hostile(u.team, T)
    && (hDist(u.position, C.home) < 130 || docks.some(d => hDist(u.position, d.position) < 70))).length;
  const outgunned = foeFleet > fleet.length;
  const fleetMax = D === DIFFICULTY.easy ? 2 : Math.max(D.micro >= 2 ? (over ? 12 : 7) : (over ? 7 : 4), Math.min(15, foeFleet + 2));
  // Transports: prou per portar l'exèrcit que es reuneix (fins a 3), a partir de l'Edat Feudal
  const wantTr = over && C.age >= 1 ? Math.min(4, 1 + Math.floor(aiHomeArmy(A, C).length / 10) + (A.attackCount ? 1 : 0) + (C.age >= 2 ? 1 : 0)) : 0;
  for (const dock of built) {
    if (dock.trainQueue.length >= 2) continue;
    // Estalviant per a l'edat, només els transports (sense ells l'exèrcit no pot sortir de l'illa)
    if (A.saving) {
      if (transports.length < Math.min(wantTr, 2) && !dock.trainQueue.some(q => q.kind === 'transport') && aiAffords(A, C, costFor('transport', T))) queueUnit(dock, 'transport');
      continue;
    }
    const queued = (k) => built.reduce((s, b) => s + b.trainQueue.filter(q => k === 'galley' ? q.kind !== 'fishingship' && q.kind !== 'transport' : q.kind === k).length, 0);
    const fishLeft = state.resourceNodes.some(n => n.subtype === 'fish' || n.subtype === 'deepfish');
    // (els pesquers no es tornen a fer mentre hi ha vaixells de guerra rivals a prop: els enfonsarien)
    const danger = state.units.some(u => u.naval && u.isMilitary && hostile(u.team, T) && !u.dead && hDist(u.position, dock.position) < 45);
    const warship = () => queueUnit(dock, C.age >= 2 && fleet.length % 3 === 2 && !itemBlockReason('fireship', T) ? 'fireship' : 'galley');
    if (outgunned && C.age >= 1 && fleet.length + queued('galley') < fleetMax) warship();
    else if (transports.length + queued('transport') < wantTr && !itemBlockReason('transport', T)) queueUnit(dock, 'transport');
    else if (fishLeft && !danger && fishers.length + queued('fishingship') < (D.micro >= 2 ? (over ? 8 : 6) : (over ? 6 : 4))) queueUnit(dock, 'fishingship');
    else if (C.age >= 1 && fleet.length + queued('galley') < fleetMax) {
      queueUnit(dock, C.age >= 2 && fleet.length % 3 === 2 && !itemBlockReason('fireship', T) ? 'fireship' : 'galley');
    }
  }
  const dock = built[0];
  if (dock && C.age >= 2 && C.res.gold > 300 && !A.saving) for (const k of ['up_wargalley', 'gillnets', 'careening']) aiTryTech(A, C, k);
  if (dock && C.age >= 3 && C.res.gold > 700 && !A.saving) for (const k of ['up_galleon', 'drydock', 'up_fastfireship', 'heatedshot']) aiTryTech(A, C, k);
  for (const f of fishers) if (f.state === STATE.IDLE) { const n = nearestResource('food', f.position, 220, f); if (n) orderGather(f, n, null); }
  // Transports sense feina: esperen a prop de casa
  const inFerry = new Set(A.ferry ? A.ferry.ships : []);
  for (const s of transports) if (!inFerry.has(s) && s.state === STATE.IDLE && hDist(s.position, C.home) > 70) orderMove(s, fitToMedium(C.homeRally, true));
  // Flota: quan n'hi ha prou, ataca els vaixells rivals o el seu moll
  if (fleet.length >= 3) for (const w of fleet) {
    if (w.state !== STATE.IDLE) continue;
    let tgt = null, bd = Infinity;
    // (només el que pot atacar des de la seva aigua: un vaixell d'un altre llac no)
    for (const u of state.units) if (hostile(u.team, A.team) && u.naval && !u.garrisoned) { const d = hDist(u.position, w.position); if (d < bd && canReach(w, u, w.range)) { bd = d; tgt = u; } }
    if (!tgt) for (const b of state.buildings) if (hostile(b.team, A.team) && b.subtype === 'dock') { const d = hDist(b.position, w.position); if (d < bd && canReach(w, b, w.range)) { bd = d; tgt = b; } }
    if (tgt) { orderAttack(w, tgt, false); w.forcedTarget = true; }
  }
}

/* =====================================================================
   IA: COMBAT
   - Defensa: les tropes de casa ataquen els intrusos; contra un atac fort, campana (els aldeans
     es refugien) i, si cal, l'exèrcit que ataca torna; contra un explorador sol, els aldeans
     s'hi enfronten.
   - Incursions: genets ràpids ataquen els aldeans rivals lluny de les defenses i fugen si
     arriben tropes.
   - Exèrcit principal: es reuneix, avança al pas de la unitat més lenta, rep reforços, porta
     setge contra els edificis i es retira si perd.
   - Micro: els ferits es refugien per curar-se, els tiradors fan kiting davant del cos a cos i
     concentren el foc en l'enemic més tocat.
   ===================================================================== */
const aiNearBuf = [];
/* Força rival a prop d'un punt: unitats militars i edificis que disparen */
function aiFoeStrengthAt(A, pos, r) {
  let s = 0;
  for (const u of unitsNear(pos.x, pos.z, r, aiNearBuf)) if (hostile(u.team, A.team) && !u.dead && (u.isMilitary || u.category === 'monk') && hDist(u.position, pos) <= r) s += unitStrength(u);
  for (const b of state.buildings) if (hostile(b.team, A.team) && hDist(b.position, pos) <= r) s += buildingStrength(b);
  return s;
}
const centroidOf = (units) => {
  const c = new THREE.Vector3();
  units.forEach(u => c.add(u.position));
  return units.length ? c.divideScalar(units.length) : c;
};
/* Nucli de l'exèrcit: el grup més dens (la mitjana d'unes quantes que lluiten i d'altres que tornen o
   s'endarrereixen queda enmig del no-res, on no hi ha ni amics ni enemics) */
function aiArmyCore(units) {
  let best = units[0], bn = -1;
  const step = Math.max(1, Math.floor(units.length / 30));
  for (let i = 0; i < units.length; i += step) {
    const a = units[i];
    let n = 0;
    for (const b of units) if (hDist(a.position, b.position) < 18) n++;
    if (n > bn) { bn = n; best = a; }
  }
  const core = units.filter(u => hDist(u.position, best.position) < 28);
  return { core, c: centroidOf(core) };
}
/* Unitats de l'exèrcit que són a casa (sense cap altra feina) */
const aiHomeArmy = (A, C) => C.army.filter(u => !u.aiRole && !u.garrisoned);

/* ---------- Defensa ---------- */
function aiDefense(A, C) {
  const threats = [];
  for (const f of state.units) {
    if (!hostile(f.team, A.team) || f.dead || f.garrisoned || f.naval || !(f.isMilitary || f.category === 'monk')) continue;
    if (C.tcs.some(tc => hDist(tc.position, f.position) < 32) || C.blds.some(b => hDist(b.position, f.position) < 16)
        || C.villagers.some(v => !v.garrisoned && hDist(v.position, f.position) < 8 && hDist(v.position, C.home) < 70)) threats.push(f);
  }
  if (A.alert && !A.alert.dead && C.now - A.alertTime < 6 && hDist(A.alert.position, C.home) < 60 && A.alert.kind === 'unit' && !threats.includes(A.alert)) threats.push(A.alert);
  A.threatened = threats.length > 0;
  if (!threats.length) {
    // Tot tranquil: els aldeans tornen a la feina (campana) i els que lluitaven també
    if (C.now - A.calmSince > 8) {
      if (A.bellAt > 0) {
        for (const b of C.blds) if (b.garrison && b.garrison.length) ungarrison(b, u => u.subtype === 'villager');
        A.bellAt = -99;
      }
      for (const v of C.villagers) if (v.aiRole === 'fight') { v.aiRole = null; commandStop([v]); }
    }
    return;
  }
  A.calmSince = C.now;
  const center = centroidOf(threats);
  const threatStr = threats.reduce((s, u) => s + unitStrength(u), 0);
  // Tropes de casa contra els intrusos
  const defenders = aiHomeArmy(A, C).filter(u => u.category !== 'siege' && hDist(u.position, center) < 90);
  const idleDef = defenders.filter(u => u.state === STATE.IDLE || (u.state === STATE.MOVING && !u.attackMove));
  if (idleDef.length) commandAttackMove(idleDef, center.clone());
  const defStr = defenders.reduce((s, u) => s + unitStrength(u), 0)
    + C.blds.filter(b => hDist(b.position, center) < 20).reduce((s, b) => s + buildingStrength(b), 0);
  // Atac fort a casa amb l'exèrcit fora: torna
  if (A.army && A.army.phase === 'attack' && threatStr >= 4 && threatStr > defStr * 1.2) aiRetreat(A, C, A.army);
  // Campana: els aldeans a prop es refugien al Centre, al castell o a les torres
  if (threatStr >= 3 && threatStr > defStr * 1.3) {
    const shelters = C.blds.filter(b => !b.underConstruction && (b.subtype === 'towncenter' || b.subtype === 'castle' || b.subtype === 'watchtower' || b.subtype === 'bombardtower'));
    let sent = 0;
    for (const v of C.villagers) {
      if (v.garrisoned || v.garrisonTarget || hDist(v.position, center) > 24) continue;
      const sh = shelters.filter(b => (b.garrison ? b.garrison.length : 0) < garrisonCap(b)).sort((a, b) => hDist(a.position, v.position) - hDist(b.position, v.position))[0];
      if (sh && hDist(sh.position, v.position) < 40) { orderGarrison(v, sh); sent++; }
    }
    if (sent) A.bellAt = C.now;
  } else if (threatStr < 3 && defStr < threatStr + 0.5) {
    // Un explorador o un parell d'arquers: els aldeans del voltant s'hi enfronten
    const t = threats[0];
    const fighters = C.villagers.filter(v => !v.garrisoned && v.aiRole !== 'fight' && !v.buildTarget && v.state !== STATE.BUILDING && hDist(v.position, t.position) < 16)
      .sort((a, b) => hDist(a.position, t.position) - hDist(b.position, t.position)).slice(0, 5);
    const already = C.villagers.filter(v => v.aiRole === 'fight').length;
    for (const v of fighters.slice(0, Math.max(0, 6 - already))) { v.aiRole = 'fight'; orderAttack(v, t, false); }
  }
  // Els aldeans que persegueixen massa lluny ho deixen córrer
  for (const v of C.villagers) if (v.aiRole === 'fight' && (hDist(v.position, C.home) > 55 || v.state === STATE.IDLE)) { v.aiRole = null; if (v.state !== STATE.IDLE) commandStop([v]); }
}

/* ---------- Incursions i exèrcit principal ---------- */
function aiRetreat(A, C, group) {
  if (group.overseas) return;                     // (a una altra illa no poden tornar caminant)
  const home = C.homeRally.clone();
  for (const u of group.units) if (!u.dead) { u.aiRole = 'return'; u.speedCap = null; orderMove(u, clampToMap(home.clone().add(new THREE.Vector3((u.id % 7) - 3, 0, ((u.id * 3) % 7) - 3)))); }
  if (group === A.army) { A.army = null; A.nextAttackAt = C.now + 50; }
  if (group === A.raid) { A.raid = null; A.nextRaidAt = C.now + 70; }
}
/* On atacar els aldeans rivals: on se n'han vist fa poc o als seus campaments (serradores, campaments
   miners, molins), lluny de les torres, Centres i castells. Retorna { position } */
function aiRaidTarget(A, C) {
  const defs = [...A.seenBld.values()].map(s => s.b).filter(b => !b.dead && buildingStrength(b) > 0);
  const spots = [];
  for (const { u, t } of A.seen.values()) if (!u.dead && u.subtype === 'villager' && C.now - t < 90) spots.push(u.position);
  for (const { b } of A.seenBld.values()) if (!b.dead && (b.subtype === 'lumbercamp' || b.subtype === 'miningcamp' || b.subtype === 'mill')) spots.push(b.position);
  let best = null, bestScore = -Infinity;
  for (const p of spots) {
    let danger = Infinity;
    for (const b of defs) danger = Math.min(danger, hDist(b.position, p) - (b.subtype === 'castle' ? 6 : 0));
    const score = Math.min(danger, 40) - hDist(p, C.home) * 0.05;
    if (danger > 17 && score > bestScore) { bestScore = score; best = p; }
  }
  return best ? { position: best.clone() } : null;
}
/* Defensa coneguda al voltant d'un punt: torres, castells i Centres vistos i les tropes rivals vistes fa poc */
function aiKnownDefense(A, pos, r = 22) {
  let s = 0;
  for (const { b } of A.seenBld.values()) if (!b.dead && hostile(b.team, A.team) && hDist(b.position, pos) <= r + (b.subtype === 'castle' ? 6 : 0)) s += buildingStrength(b);
  for (const { u, t } of A.seen.values()) if (!u.dead && u.isMilitary && state.elapsed - t < 90 && hDist(u.position, pos) <= r * 1.5) s += unitStrength(u);
  return s;
}
/* Objectiu de l'exèrcit: edificis militars, torres i Centres coneguts (els més a prop). Sense setge, els llocs
   ben defensats (torres, castells) compten com si fossin molt més lluny: primer el que es pot guanyar */
function aiObjective(A, C, from, army = null) {
  const siege = army ? army.filter(u => u.category === 'siege').length : 0;
  const str = army ? army.reduce((s, u) => s + unitStrength(u), 0) : 0;
  let best = null, bd = Infinity;
  for (const { b } of A.seenBld.values()) {
    if (b.dead || b.team !== A.foe || b.isWall || b.subtype === 'farm') continue;
    const pri = b.subtype === 'towncenter' ? 0.9 : (b.def && b.def.trains) ? 0.8 : buildingStrength(b) > 0 ? 0.85 : 1;
    let d = hDist(b.position, from) * pri;
    if (army) {
      const def = aiKnownDefense(A, b.position, 20);
      d += def * (siege >= 2 ? 3 : 10) + (def > str * 0.7 ? 400 : 0);
    }
    if (d < bd) { bd = d; best = b; }
  }
  return best || nearestFoeTarget(A, from);
}
/* Objectiu en una urgència: la Meravella rival o el Monestir que guarda les relíquies */
function aiUrgentObjective(A) {
  const w = state.buildings.find(b => hostile(b.team, A.team) && b.subtype === 'wonder' && b.wonderEnd);
  if (w) return { b: w, left: w.wonderEnd - state.elapsed };
  if (state.relicWin && hostile(state.relicWin.team, A.team)) {
    const m = state.buildings.find(b => !b.dead && allied(b.team, state.relicWin.team) && b.relics && b.relics.length);
    return { b: m || null, left: state.relicWin.end - state.elapsed };
  }
  return null;
}
function aiAttacks(A, C) {
  const now = C.now, D = C.D;
  // Els que tornen a casa tornen a estar disponibles
  for (const u of C.army) if (u.aiRole === 'return' && (hDist(u.position, C.home) < 22 || u.state === STATE.IDLE)) u.aiRole = null;

  // --- Incursions contra els aldeans ---
  if (D.raids && C.age >= 1 && !A.raid && !C.overseas && now >= A.nextRaidAt) {
    const fast = aiHomeArmy(A, C).filter(u => u.mounted && u.category !== 'siege' && u.hp > u.maxHp * 0.7);
    const size = C.age === 1 ? 3 : 5;
    const tgt = fast.length >= size ? aiRaidTarget(A, C) : null;
    if (tgt) {
      const units = fast.slice(0, size + 2);
      units.forEach(u => { u.aiRole = 'raid'; });
      commandAttackMove(units, tgt.position.clone());
      A.raid = { units, target: tgt, point: tgt.position.clone(), t0: now, hp0: units.reduce((s, u) => s + u.hp, 0) };
    }
  }
  if (A.raid) {
    const R = A.raid;
    R.units = R.units.filter(u => !u.dead && u.aiRole === 'raid');
    const hp = R.units.reduce((s, u) => s + u.hp, 0);
    const c = centroidOf(R.units);
    const myStr = R.units.reduce((s, u) => s + unitStrength(u), 0);
    if (!R.units.length) { A.raid = null; A.nextRaidAt = now + 60; }
    else if (hp < R.hp0 * 0.45 || aiFoeStrengthAt(A, c, 14) > myStr * 1.1 || now - R.t0 > 110) aiRetreat(A, C, R);
    else {
      // A prop de l'objectiu: sempre contra els aldeans
      for (const u of R.units) {
        if (u.state === STATE.ATTACKING && u.attackTarget && u.attackTarget.subtype === 'villager') continue;
        if (hDist(u.position, R.point) > 16) continue;
        let v = null, bd = 18;
        for (const o of unitsNear(u.position.x, u.position.z, 18, aiNearBuf)) {
          if (!hostile(o.team, A.team) || o.dead || o.garrisoned || o.subtype !== 'villager') continue;
          const d = hDist(o.position, u.position);
          if (d < bd) { bd = d; v = o; }
        }
        if (v) orderAttack(u, v, false);
      }
      if (R.units.every(u => u.state === STATE.IDLE)) {
        const next = aiRaidTarget(A, C);
        if (next) { R.target = next; R.point = next.position.clone(); commandAttackMove(R.units, R.point.clone()); }
        else aiRetreat(A, C, R);
      }
    }
  }

  // --- Exèrcit principal ---
  const homeArmy = aiHomeArmy(A, C);
  const rush = (A.strategy === 'scoutrush' || A.strategy === 'archers' || A.strategy === 'maa') && C.age === 1;
  // (cada atac en demana una mica més, fins a un límit: amb els atacs d'urgència contra una Meravella el comptador
  //  s'enfilava a 60 i després ja no n'hi havia prou mai)
  const need = Math.round((rush ? D.attackBase * 0.7 : D.attackBase + C.age * 3) + Math.min(A.attackCount, 8) * 2);
  const waitCastle = (A.strategy === 'fastcastle' || A.strategy === 'boom') && C.age < 2 && !A.urgent;
  // Urgència (Meravella o relíquies del rival): s'hi va amb un exèrcit de debò; només al final del compte enrere
  // s'hi llança tot el que hi ha (abans hi anaven grups de 4-10 cada mig minut, que les torres es menjaven)
  const U = A.urgent ? aiUrgentObjective(A) : null;
  const urgentNeed = !U ? Infinity : U.left < 75 ? 4 : now < A.nextAttackAt ? Infinity : Math.max(10, Math.round(need * 0.6));
  const homeStr = homeArmy.reduce((s, u) => s + unitStrength(u), 0);
  // Rival a una altra illa: l'exèrcit hi va amb vaixells de transport (21d)
  aiFerryTick(A, C);
  aiFerryTick(A, C, 'colony');
  aiColonize(A, C);
  if (C.overseas && !A.army && !A.ferry && ((homeArmy.length >= need && now >= A.nextAttackAt && !waitCastle) || homeArmy.length >= urgentNeed)) {
    aiStartFerry(A, C, homeArmy, false);
    return;
  }
  if (!A.army && !C.overseas && ((homeArmy.length >= need && now >= A.nextAttackAt && !waitCastle) || homeArmy.length >= urgentNeed)) {
    const target = (U && U.b) || aiObjective(A, C, C.home, homeArmy);
    // (sense urgència: si fins i tot l'objectiu més fluix està més ben defensat que el que porta, espera i creix;
    //  amb la població plena hi va igualment, amb el que té)
    const full = popUsed(C.T) >= popCap(C.T) - 3;
    if (target && !U && !full && aiKnownDefense(A, target.position, 20) > homeStr * 0.7) A.nextAttackAt = now + 20;
    else if (target) {
      const dir = new THREE.Vector3(target.position.x - C.home.x, 0, target.position.z - C.home.z).normalize();
      const rally = clampToMap(aiHighSpot(C.home.clone().addScaledVector(dir, 24), 10));
      homeArmy.forEach(u => { u.aiRole = 'army'; u.speedCap = null; });
      commandMove(homeArmy, rally);
      A.army = { units: homeArmy, rally, phase: 'gather', t0: now, target, str0: homeStr };
    }
  }
  const W = A.army;
  if (!W) return;
  W.units = W.units.filter(u => !u.dead && u.team === C.T && u.aiRole === 'army');
  if (!W.units.length) { A.army = null; A.nextAttackAt = now + 90; return; }
  if (W.phase === 'gather') {
    const ready = W.units.filter(u => hDist(u.position, W.rally) < 10).length;
    if (ready >= W.units.length * 0.85 || now - W.t0 > 40) {
      const U2 = A.urgent ? aiUrgentObjective(A) : null;
      const target = (U2 && U2.b) || aiObjective(A, C, W.rally, W.units);
      if (!target) { aiRetreat(A, C, W); return; }
      W.target = target;
      const slow = Math.min(...W.units.map(u => u.speed));
      W.units.forEach(u => { u.speedCap = slow; });
      commandAttackMove(W.units, target.kind === 'unit' ? target.position.clone() : approachPoint(target, W.rally));
      W.phase = 'attack';
      W.str0 = W.units.reduce((s, u) => s + unitStrength(u), 0);
      A.attackCount++;
      if (A.foe === PLAYER.id) toast(`⚠️ L'enemic (${civOf(C.T).name}) ataca amb ${W.units.length} unitats!`);
      else if (allied(A.foe, PLAYER.id)) toast(`⚠️ ${teamOf(C.T).name} ataca el teu aliat amb ${W.units.length} unitats`);
      else if (allied(A.team, PLAYER.id)) toast(`⚔️ El teu aliat ataca ${teamOf(A.foe).name} amb ${W.units.length} unitats`);
    }
    return;
  }
  // Atacant: reforços, setge contra edificis, retirada si perd
  const { core, c } = aiArmyCore(W.units);
  const myStr = core.reduce((s, u) => s + unitStrength(u), 0);
  const foeStr = aiFoeStrengthAt(A, c, 24);
  W.str0 = Math.max(W.str0 || 0, 1);
  // Es retira si perd el combat, o si del que va sortir en queda menys d'un terç: els que queden tornen i s'ajunten
  // amb els nous per a un atac de debò (abans hi anaven grups de reforços de 10 cada mig minut, que es perdien)
  // (desembarcats no es poden retirar: lluiten fins al final; en una urgència, només si és inútil i encara hi ha temps)
  const U3 = A.urgent ? aiUrgentObjective(A) : null;
  // (un exèrcit gran que s'ha partit primer es reagrupa al nucli; només es retira si en total ja no val prou)
  const allStr = W.units.reduce((s, u) => s + unitStrength(u), 0);
  if (myStr < W.str0 * 0.35 && allStr >= W.str0 * 0.5 && foeStr < myStr && C.now >= (W.regroupAt || 0)) {
    W.regroupAt = C.now + 15;
    const out = W.units.filter(u => !core.includes(u) && u.state !== STATE.ATTACKING);
    if (out.length) commandAttackMove(out, c.clone());
  }
  const spent = allStr < W.str0 * 0.35 || (myStr < W.str0 * 0.2 && foeStr > 0);
  const lose = U3 ? U3.left > 75 && (myStr < foeStr * 0.4 || spent) : myStr < foeStr * 0.65 || spent;
  if (!W.overseas && lose) { aiRetreat(A, C, W); A.nextAttackAt = now + 75; return; }
  // Reforços: en grup i només si l'exèrcit encara és fort i, junts, poden guanyar; si no, es queden a casa per a
  // l'atac següent (a una altra illa, hi van en una altra travessia)
  const reinf = homeArmy;
  const reinfStr = reinf.reduce((s, u) => s + unitStrength(u), 0);
  if (reinf.length >= Math.max(6, Math.round(need * 0.4)) && myStr >= W.str0 * 0.5 && myStr + reinfStr >= foeStr * 1.1) {
    if (!W.overseas) { reinf.forEach(u => { u.aiRole = 'army'; }); commandAttackMove(reinf, c.clone()); W.units.push(...reinf); W.str0 += reinfStr; }
    else if (!A.ferry) aiStartFerry(A, C, reinf, true);
  }
  for (const u of W.units) {
    if (u.category !== 'siege') continue;
    const isRam = (CONFIG.UNITS[u.unitKind].line || u.unitKind) === 'ram';
    if (!isRam || (u.state === STATE.ATTACKING && u.attackTarget && u.attackTarget.kind === 'building')) continue;
    let b = null, bd = 40;
    for (const { b: o } of A.seenBld.values()) { if (o.dead || o.isWall) continue; const d = hDist(o.position, u.position); if (d < bd) { bd = d; b = o; } }
    if (b) orderAttack(u, b, false);
  }
  const idle = W.units.filter(u => u.state === STATE.IDLE);
  if (idle.length) {
    const t = aiObjective(A, C, idle[0].position, W.units);
    if (t) commandAttackMove(idle, t.kind === 'unit' ? t.position.clone() : approachPoint(t, idle[0].position));
    else if (idle.length === W.units.length && !W.overseas) { aiRetreat(A, C, W); A.nextAttackAt = now + 30; }
  }
}

/* ---------- Micro ---------- */
function aiMicro(A, C) {
  const lvl = C.D.micro;
  if (!lvl) return;
  const now = C.now;
  // Ferits: es refugien al Centre o al Castell (s'hi curen); la cavalleria torna a casa
  for (const u of C.army) {
    if (u.garrisoned || u.category === 'siege' || u.aiHeal || u.hp > u.maxHp * 0.28 || u.state !== STATE.ATTACKING) continue;
    const sh = C.blds.filter(b => !b.underConstruction && canGarrison(u, b) && (b.garrison ? b.garrison.length : 0) < garrisonCap(b))
      .sort((a, b) => hDist(a.position, u.position) - hDist(b.position, u.position))[0];
    u.aiHeal = true;
    u.aiRole = 'heal';
    if (sh && hDist(sh.position, u.position) < 70) orderGarrison(u, sh);
    else orderMove(u, C.homeRally.clone());
  }
  for (const b of C.blds) {
    if (!b.garrison || !b.garrison.length || A.threatened) continue;
    if (b.garrison.some(u => u.isMilitary && u.hp >= u.maxHp * 0.95)) {
      const out = b.garrison.filter(u => u.isMilitary && u.hp >= u.maxHp * 0.95);
      ungarrison(b, u => out.includes(u));
      out.forEach(u => { u.aiHeal = false; u.aiRole = null; });
    }
  }
  for (const u of C.army) if (u.aiRole === 'heal' && !u.garrisoned && !u.garrisonTarget && (u.state === STATE.IDLE || hDist(u.position, C.home) < 15)) { u.aiRole = null; u.aiHeal = false; }
  if (lvl < 2) return;
  // Kiting: els tiradors de la IA s'allunyen del cos a cos mentre recarreguen (es fa a cada pas: kiteStep)
  for (const u of C.army) if (u.range >= 7 && u.category !== 'siege') u.kite = true;
  // Foc concentrat: els tiradors de l'exèrcit disparen a l'enemic més tocat que tinguin a l'abast
  if (A.army && A.army.phase === 'attack') {
    const shooters = A.army.units.filter(u => u.range >= 7 && u.category !== 'siege' && u.state === STATE.ATTACKING);
    if (shooters.length >= 3) {
      const c = centroidOf(shooters);
      let best = null, bh = Infinity;
      for (const o of unitsNear(c.x, c.z, 16, aiNearBuf)) {
        if (!hostile(o.team, A.team) || o.dead || o.garrisoned || !(o.isMilitary || o.subtype === 'villager')) continue;
        const inRange = shooters.filter(s => inAttackRange(s, o)).length;
        if (inRange < shooters.length / 2) continue;
        if (o.hp < bh) { bh = o.hp; best = o; }
      }
      if (best) for (const s of shooters) if (s.attackTarget !== best && inAttackRange(s, best)) orderAttack(s, best, false);
    }
  }
}

/* ---------- Monjos i relíquies ---------- */
function aiMonks(A, C) {
  const D = C.D;
  if (C.age >= 2 && D !== DIFFICULTY.easy && !C.has('monastery') && C.vn >= 30 && C.res.wood >= 200 && !A.saving) aiBuild(A, 'monastery', C.home, 12, 32, 2);
  const mon = C.blds.find(b => b.subtype === 'monastery' && !b.underConstruction);
  if (mon && mon.trainQueue.length < 1 && C.monks.length < (D.micro >= 2 ? 4 : 3) && aiAffords(A, C, { gold: 200 })) queueUnit(mon, 'monk');
  if (mon && aiAffords(A, C, { gold: 500 })) for (const k of ['fervor', 'sanctity', 'redemption', 'atonement', 'illumination', 'blockprinting']) if (aiTryTech(A, C, k)) break;
  const claimed = new Set(C.monks.map(m => m.relicTarget).filter(Boolean));
  for (const m of C.monks) {
    if (m.state !== STATE.IDLE) continue;
    if (m.relic) { orderDepositRelic(m); continue; }
    // (només les que es poden abastar caminant: a les Illes, les d'una altra illa no)
    const free = mon ? state.relics.filter(r => !r.carrier && !r.holder && !claimed.has(r) && canReach(m, r, 2))
      .sort((a, b) => hDist(a.position, m.position) - hDist(b.position, m.position))[0] : null;
    if (free) { orderPickRelic(m, free); claimed.add(free); continue; }
    // Si no hi ha relíquies: acompanyen l'exèrcit per curar i convertir
    const W = A.army;
    if (W && W.phase === 'attack' && W.units.length) {
      const c = centroidOf(W.units);
      if (hDist(c, m.position) > 8 && canReach(m, { position: c, radius: 1 }, 4)) { orderMove(m, clampToMap(c)); m.attackMove = c.clone(); }
    }
  }
}

/* ---------- Regicidi, Meravella i urgències ---------- */
function aiSpecial(A, C) {
  if (state.victory === 'regicide') {
    const king = C.units.find(u => u.category === 'king');
    if (king && !king.garrisoned && !king.garrisonTarget) {
      const safe = C.blds.find(b => b.subtype === 'castle' && !b.underConstruction) || C.tcs[0];
      if (safe && (!safe.garrison || safe.garrison.length < garrisonCap(safe))) orderGarrison(king, safe);
    }
  }
  // (Meravella només a la part final de la partida, com la IA de l'AoE II)
  if (state.victory === 'standard' && C.age >= 3 && C.D !== DIFFICULTY.easy && !C.has('wonder') && C.vn >= 60 && C.now >= 2100
      && canAfford({ wood: 1300, gold: 1300, stone: 1100 }, C.T)) aiBuild(A, 'wonder', C.home, 16, 45, 8);
  // Contra una Meravella o totes les relíquies del rival: atac immediat
  A.urgent = (state.relicWin && hostile(state.relicWin.team, A.team)) || state.buildings.some(b => hostile(b.team, A.team) && b.subtype === 'wonder' && b.wonderEnd);
  if (A.urgent && !A.wasUrgent) A.nextAttackAt = Math.min(A.nextAttackAt, C.now);   // (en començar la urgència)
  A.wasUrgent = A.urgent;
}

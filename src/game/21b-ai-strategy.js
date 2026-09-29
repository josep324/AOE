/* =====================================================================
   IA: ESTRATÈGIA, EXPLORACIÓ, PRODUCCIÓ I TECNOLOGIES
   Cada civilització té dues obertures (com les de l'AoE II) i la IA en tria una a l'atzar:
     scoutrush  Exploradors a l'Edat Feudal i cavallers després (Francs)
     archers    Arquers a l'Edat Feudal (Sarraïns)
     maa        Homes d'armes i arquers a l'Edat Feudal (Japonesos)
     fastcastle Pujada ràpida a l'Edat dels Castells
     boom       Molts aldeans i dos o tres Centres abans d'atacar
   L'exèrcit barreja la composició de l'obertura amb el que contraresta el que ha vist del rival.
   ===================================================================== */
const AI_STRATEGIES = { franks: ['scoutrush', 'fastcastle'], saracens: ['archers', 'fastcastle'], japanese: ['maa', 'boom'],
  britons: ['archers', 'boom'], byzantines: ['archers', 'fastcastle'], mongols: ['scoutrush', 'fastcastle'], chinese: ['archers', 'boom'],
  catalans: ['maa', 'fastcastle'] };
function aiPickStrategy(A) {
  if (A.diff === DIFFICULTY.easy) return 'boom';
  const opts = AI_STRATEGIES[teamOf(A.team).civ] || ['boom'];
  return opts[Math.floor(rand() * opts.length)];
}
/* Aldeans per pujar a cada edat segons l'obertura (Feudal, Castells, Imperial) */
const AI_AGE_VILLS = { scoutrush: [21, 30, 55], archers: [22, 31, 55], maa: [20, 30, 55], fastcastle: [24, 27, 55], boom: [26, 34, 60] };
/* Edifici que entrena cada tipus d'unitat (línia base) */
const AI_TRAINER = { militia: 'barracks', spearman: 'barracks', archer: 'archeryrange', skirmisher: 'archeryrange', cavarcher: 'archeryrange',
  handcannon: 'archeryrange', scout: 'stable', knight: 'stable', camel: 'stable', ram: 'siegeworkshop', mangonel: 'siegeworkshop', scorpion: 'siegeworkshop',
  bombard: 'siegeworkshop',
  trebuchet: 'castle', '@unique': 'castle' };
/* Composició de cada obertura per edat (Feudal, Castells, Imperial) */
const AI_CORE = {
  scoutrush: [{ scout: 0.7, spearman: 0.3 }, { knight: 0.5, archer: 0.25, spearman: 0.1, ram: 0.15 }, { knight: 0.4, archer: 0.15, '@unique': 0.15, ram: 0.1, bombard: 0.05, trebuchet: 0.05, spearman: 0.1 }],
  archers: [{ archer: 0.65, skirmisher: 0.15, spearman: 0.2 }, { archer: 0.45, knight: 0.2, skirmisher: 0.1, ram: 0.15, '@unique': 0.1 }, { archer: 0.3, knight: 0.2, '@unique': 0.2, handcannon: 0.1, ram: 0.05, trebuchet: 0.05, skirmisher: 0.1 }],
  maa: [{ militia: 0.6, archer: 0.3, spearman: 0.1 }, { militia: 0.35, archer: 0.25, '@unique': 0.2, ram: 0.15, spearman: 0.05 }, { militia: 0.3, archer: 0.1, handcannon: 0.1, '@unique': 0.3, ram: 0.1, trebuchet: 0.05, spearman: 0.05 }],
  fastcastle: [{ spearman: 0.5, skirmisher: 0.5 }, { knight: 0.45, archer: 0.2, '@unique': 0.2, ram: 0.15 }, { knight: 0.35, archer: 0.15, '@unique': 0.25, ram: 0.05, bombard: 0.1, trebuchet: 0.05, spearman: 0.05 }],
  boom: [{ spearman: 0.5, archer: 0.5 }, { '@unique': 0.35, archer: 0.3, spearman: 0.15, ram: 0.2 }, { '@unique': 0.35, archer: 0.2, handcannon: 0.05, spearman: 0.1, ram: 0.1, mangonel: 0.1, bombard: 0.05, trebuchet: 0.05 }],
};
/* Què contraresta cada tipus d'unitat rival (el triangle de l'AoE II) */
const AI_COUNTER = {
  archer: { skirmisher: 1, knight: 0.6, scout: 0.3, mangonel: 0.2 },
  skirm: { militia: 1, knight: 0.6, scout: 0.4 },
  cavalry: { spearman: 1, camel: 0.8 },
  camel: { militia: 0.8, spearman: 0.4, archer: 0.5 },
  spear: { archer: 1, militia: 0.5, scorpion: 0.2, handcannon: 0.3 },
  infantry: { archer: 1, knight: 0.5, scorpion: 0.2, handcannon: 0.5 },
  siege: { knight: 1, scout: 0.5 },
  monk: { scout: 1, knight: 0.4 },
};
/* Classe d'una unitat per als contrarestos */
function aiUnitClass(u) {
  const d = CONFIG.UNITS[u.unitKind] || {};
  const line = d.line || u.unitKind;
  if (u.category === 'siege') return 'siege';
  if (u.category === 'monk') return 'monk';
  if (u.spearLine) return 'spear';
  if (line === 'skirmisher') return 'skirm';
  if (line === 'camel') return 'camel';
  if (u.category === 'archer') return 'archer';
  if (u.mounted || u.category === 'cavalry') return 'cavalry';
  if (u.category === 'infantry') return 'infantry';
  return null;
}
/* Línia base d'una unitat pròpia (per comptar la composició) */
function aiBaseKind(u, T) {
  if (u.unitKind === uniqueUnitOf(T)) return '@unique';
  const d = CONFIG.UNITS[u.unitKind] || {};
  return d.line || u.unitKind;
}

/* ---------- Intel·ligència: què ha vist del rival ---------- */
const aiEyeBuf = [];
function aiSees(A, C, x, z, r = 0) {
  for (const v of unitsNear(x, z, 24, aiEyeBuf)) {
    if (v.team === A.team && !v.garrisoned && !v.dead && Math.hypot(v.position.x - x, v.position.z - z) <= v.los + r + 1) return true;
  }
  for (const b of C.blds) if (!b.underConstruction && Math.hypot(b.position.x - x, b.position.z - z) <= (b.los || 8) + (b.radius || 2) + r) return true;
  return false;
}
function aiIntel(A, C) {
  if (C.now - A.lastIntel < 2) return;
  A.lastIntel = C.now;
  for (const u of state.units) {
    if (!hostile(u.team, A.team) || u.garrisoned || u.dead) continue;
    if (aiSees(A, C, u.position.x, u.position.z)) A.seen.set(u.id, { u, t: C.now, x: u.position.x, z: u.position.z });
  }
  for (const b of state.buildings) {
    if (!hostile(b.team, A.team) || b.dead || A.seenBld.has(b.id)) continue;
    if (aiSees(A, C, b.position.x, b.position.z, b.radius || 2)) A.seenBld.set(b.id, { b, t: C.now });
  }
  for (const [id, s] of A.seen) if (s.u.dead || !hostile(s.u.team, A.team) || C.now - s.t > 120) A.seen.delete(id);
  for (const [id, s] of A.seenBld) if (s.b.dead || s.b.depleted || !hostile(s.b.team, A.team)) A.seenBld.delete(id);
  // Composició de l'exèrcit rival que ha vist (els últims 2 minuts)
  const comp = {};
  let mil = 0;
  for (const { u } of A.seen.values()) {
    if (!u.isMilitary && u.category !== 'monk') continue;
    const c = aiUnitClass(u);
    if (!c) continue;
    comp[c] = (comp[c] || 0) + 1;
    mil++;
  }
  A.foeComp = { comp, mil };
  // Força militar rival vista fa poc, comparada amb la pròpia (per decidir si cal defensar-se abans de pujar d'edat)
  let fs = 0;
  for (const s of A.seen.values()) if (s.u.isMilitary && C.now - s.t < 60 && Math.hypot(s.x - C.home.x, s.z - C.home.z) < 70) fs += unitStrength(s.u);
  A.foeStr = fs;
  A.myStr = C.army.reduce((s, u) => s + unitStrength(u), 0);
}

/* ---------- Composició desitjada de l'exèrcit ---------- */
function aiComposition(A, C) {
  const core = AI_CORE[A.strategy] || AI_CORE.boom;
  const base = { ...core[Math.max(0, Math.min(2, C.age - 1))] };
  // Els Sarraïns fan servir camells en lloc d'una part dels cavallers
  if (C.E.civ === 'saracens' && base.knight) { base.camel = (base.camel || 0) + base.knight * 0.4; base.knight *= 0.6; }
  const w = {};
  const fc = A.foeComp;
  const k = fc && fc.mil ? C.D.counter * Math.min(1, fc.mil / 6) : 0;
  for (const [u, v] of Object.entries(base)) w[u] = v * (1 - k);
  if (k > 0) {
    const counter = {};
    let tot = 0;
    for (const [cls, n] of Object.entries(fc.comp)) {
      for (const [u, v] of Object.entries(AI_COUNTER[cls] || {})) { counter[u] = (counter[u] || 0) + v * n; tot += v * n; }
    }
    if (tot) for (const [u, v] of Object.entries(counter)) w[u] = (w[u] || 0) + k * v / tot;
  }
  // Només el que es pot fer ara (edat i civilització)
  for (const u of Object.keys(w)) {
    const kind = u === '@unique' ? uniqueUnitOf(C.T) : currentKind(C.T, u);
    const d = CONFIG.UNITS[kind];
    if (!d || (d.age || 0) > C.age || ((d.civ || d.unique) && (d.civ || d.unique) !== C.E.civ)
        || (d.requiresTech && !C.E.techs.has(d.requiresTech)) || !civAllows(C.T, kind)) delete w[u];
  }
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for (const u of Object.keys(w)) w[u] /= sum;
  return w;
}

/* ---------- Edats i tecnologies ---------- */
function aiTryTech(A, C, kind, reserved = false) {
  if (!CONFIG.TECHS[kind] || C.E.techs.has(kind) || techQueued(C.T, kind) || itemBlockReason(kind, C.T)) return false;
  // Les tecnologies no toquen la reserva per a l'edat (tret de la que es reservava per a ella mateixa)
  if (!CONFIG.TECHS[kind].ageUp && !reserved && !aiAffords(A, C, costFor(kind, C.T))) return false;
  // L'edat té prioritat: si el Centre té aldeans a la cua, se'n treu un (i se'n recupera el cost)
  if (CONFIG.TECHS[kind].ageUp) {
    const tc = C.tcs.find(b => b.trainQueue.length >= 2 && !b.trainQueue.some(it => isTech(it.kind)));
    if (tc && !C.tcs.some(b => b.trainQueue.length < 2)) {
      cancelQueued(tc, tc.trainQueue.length - 1);
    }
  }
  const at = C.blds.find(b => b.subtype === CONFIG.TECHS[kind].at && !b.underConstruction && b.trainQueue && b.trainQueue.length < 2
    && !(b.subtype === 'towncenter' && b.trainQueue.some(it => isTech(it.kind))));
  return at ? queueUnit(at, kind) : false;
}
function aiAgesAndTechs(A, C) {
  const D = C.D, vills = C.villagers.length;
  const thr = (AI_AGE_VILLS[A.strategy] || AI_AGE_VILLS.boom).map(v => v + (D === DIFFICULTY.easy ? 4 : 0));
  // Edifici que falta per poder pujar d'edat (se'n fan quan ja s'hi acosta)
  const next = C.age + 1;
  A.saving = false;
  A.reserve = null;
  if (next <= 3 && !techQueued(C.T, 'age' + next)) {
    const need = thr[C.age];
    const req = CONFIG.AGES[next].req;
    const pref = next === 1 ? ['barracks', 'mill', 'lumbercamp']
      : next === 2 ? (A.strategy === 'scoutrush' ? ['stable', 'blacksmith'] : A.strategy === 'archers' ? ['archeryrange', 'blacksmith'] : A.strategy === 'fastcastle' ? ['blacksmith', 'market'] : ['blacksmith', 'archeryrange'])
      : ['university', 'monastery', 'siegeworkshop'];
    if (vills >= need - 5 && distinctBuilt(C.T, req) < 2) {
      for (const t of pref) {
        if (!req.includes(t) || C.has(t)) continue;
        if (aiBuild(A, t, C.home, t === 'market' || t === 'university' ? 14 : 12, 34, 2)) break;
      }
    }
    // Les obertures agressives ataquen abans de pujar a Castells
    const rushWait = next === 2 && (A.strategy === 'scoutrush' || A.strategy === 'archers' || A.strategy === 'maa') && A.attackCount === 0 && vills < need + 6;
    // Amb un exèrcit rival clarament més fort a prop de casa, primer tropes i després l'edat
    // (o un exèrcit rival gran vist fa poc, més del doble del propi: primer els contraris, com a l'AoE II)
    const danger = (A.foeStr || 0) > (A.myStr || 0) * 1.2 + 2 || (A.foeComp && A.foeComp.mil >= 8 && C.army.length < A.foeComp.mil * 0.5);
    const ready = vills >= need && distinctBuilt(C.T, req) >= 2 && !rushWait && !danger && (next < 3 || D !== DIFFICULTY.easy || vills >= need + 5);
    if (ready) {
      if (C.age === 0 && D.micro > 0) aiTryTech(A, C, 'loom');
      A.saving = true;
      A.reserve = costFor('age' + next, C.T);            // es guarda el cost de l'edat; la resta es pot gastar
      if (aiTryTech(A, C, 'age' + next)) { A.saving = false; A.reserve = null; }
    }
  }
  if (A.saving) return;
  // Tecnologia única (amb Castell): es reserven els recursos, com per a l'edat, perquè l'exèrcit no ho gasti tot
  // (només amb un exèrcit que aguanti i sense perill, i si en 2 minuts no ho aconsegueix, ho deixa estar 3 minuts:
  //  una reserva massa llarga deixa l'exèrcit sense reforços)
  const calm = C.army.length >= 12 && !A.threatened && (A.foeStr || 0) <= (A.myStr || 0);
  if (hasCompleted('castle', C.T) && vills >= 30 && C.now >= (A.uniqPause || 0)) {
    const uniq = Object.keys(CONFIG.TECHS).find(k => { const d = CONFIG.TECHS[k];
      return d.civ === C.E.civ && !d.elite && !C.E.techs.has(k) && !techQueued(C.T, k) && (d.age || 0) <= C.age; });
    const cost = uniq && costFor(uniq, C.T);
    if (uniq && canAfford(cost, C.T) && aiTryTech(A, C, uniq, true)) A.uniqSince = null;
    else if (uniq && calm) {
      A.uniqSince = A.uniqSince ?? C.now;
      if (C.now - A.uniqSince > 120) { A.uniqSince = null; A.uniqPause = C.now + 180; }
      else A.reserve = cost;
    } else A.uniqSince = null;
  }
  // Economia (a temps, com la IA de l'AoE II)
  const g = C.gath || {};
  const farms = state.resourceNodes.filter(n => n.subtype === 'farm' && n.team === C.T).length;
  const eco = [];
  if (C.age >= 1) {
    if (g.wood >= 4) eco.push('doublebit');
    if (farms >= 4) eco.push('horsecollar');
    if (vills >= 20) eco.push('wheelbarrow');
    if (g.gold >= 4) eco.push('goldmining');
  }
  if (C.age >= 2) {
    if (g.wood >= 8) eco.push('bowsaw');
    if (farms >= 8) eco.push('heavyplow');
    if (vills >= 35) eco.push('handcart');
    if (g.gold >= 6) eco.push('goldshaft');
    if (g.stone >= 4) eco.push('stoneshaft');
    if (vills >= 40) eco.push('masonry');
  }
  if (C.age >= 3) eco.push('twomansaw', 'croprotation', 'architecture');
  let n = 0;
  for (const k of eco) if (n < 2 && aiTryTech(A, C, k)) n++;
  if (A.threatened) aiTryTech(A, C, 'loom');
  // Exèrcit: millores de la ferreria i de les línies que fa servir
  if (C.army.length < 5 || C.age < 1) return;
  const comp = aiComposition(A, C);
  const has = (...kinds) => kinds.some(k => (comp[k] || 0) > 0.08);
  const mil = [];
  // Amb Castell, primer el que fa única la civilització: la tecnologia única i la unitat única d'elit
  if (hasCompleted('castle', C.T)) {
    for (const [k, d] of Object.entries(CONFIG.TECHS)) if (d.civ === C.E.civ && !d.elite) mil.push(k);
    if (has('@unique')) mil.push('elite_' + uniqueUnitOf(C.T));
  }
  if (has('militia', 'spearman', '@unique')) mil.push('forging', 'scalearmor', 'ironcasting', 'chainmail', 'squires', 'blastfurnace', 'platemail', 'arson');
  if (has('militia')) mil.push('supplies', 'gambesons');
  if (has('archer', 'skirmisher', 'cavarcher', 'handcannon')) mil.push('fletching', 'paddedarcher', 'bodkin', 'leatherarcher', 'thumbring', 'ballistics', 'bracer', 'ringarcher');
  if (has('cavarcher')) mil.push('parthian');
  if (has('scout', 'knight', 'camel', 'cavarcher')) mil.push('forging', 'barding', 'bloodlines', 'ironcasting', 'husbandry', 'chainbarding', 'blastfurnace', 'platebarding');
  for (const [k, d] of Object.entries(CONFIG.TECHS)) {
    if (!d.upgradeTo) continue;
    const line = CONFIG.UNITS[d.upgradeTo].line;
    if (line && has(line)) mil.push(k);
  }
  if (C.age >= 2) mil.push('chemistry', 'guardtower', 'arrowslits', 'siegeengineers', 'keep', 'conscription');
  if (C.age >= 3 && C.D.towers) mil.push('bombardtowertech');
  if (hasCompleted('castle', C.T) && C.age >= 3) mil.push('hoardings');
  n = 0;
  const R = C.res;
  for (const k of mil) {
    if (n >= 2) break;
    const cost = costFor(k, C.T);
    // Deixa marge per a l'exèrcit: només si en sobra
    if ((cost.food || 0) + 150 > R.food || (cost.gold || 0) + 100 > R.gold || (cost.wood || 0) + 100 > R.wood) continue;
    if (aiTryTech(A, C, k)) n++;
  }
}

/* Hi ha prou recursos per a això sense tocar la reserva per a l'edat? */
function aiAffords(A, C, cost) {
  const r = A.reserve || {};
  for (const [k, v] of Object.entries(cost)) if (C.res[k] < v + (r[k] || 0)) return false;
  return true;
}
/* ---------- Producció militar ---------- */
const AI_SIEGE_CAP = { ram: 5, mangonel: 3, scorpion: 3, trebuchet: 2, bombard: 3 };
function aiProduction(A, C) {
  const D = C.D;
  // Edat Fosca: només economia (si l'ataquen, milícia)
  if (C.age === 0 && !A.threatened) return;
  const comp = C.age === 0 ? { militia: 1 } : aiComposition(A, C);
  // Edificis militars segons la composició (un de nou per decisió, com a molt)
  if (!A.saving && C.age >= 1) {
    const byB = {};
    for (const [k, w] of Object.entries(comp)) { const b = AI_TRAINER[k]; if (b && b !== 'castle') byB[b] = (byB[b] || 0) + w; }
    const slots = Math.max(1, Math.floor(C.villagers.length / 11));
    const building = C.blds.some(b => b.underConstruction && ['barracks', 'archeryrange', 'stable', 'siegeworkshop'].includes(b.subtype));
    if (!building) {
      for (const [bt, w] of Object.entries(byB).sort((a, b) => b[1] - a[1])) {
        const max = bt === 'siegeworkshop' ? (C.age >= 3 ? 2 : 1) : D.prodMax;
        const want = Math.max(1, Math.min(max, Math.round(w * slots)));
        if (C.count(bt) < want && canAfford(costFor(bt, C.T), C.T) && aiBuild(A, bt, C.home, 13, 36, 2)) break;
      }
    }
    // Castell (i així la unitat única i els trabucs)
    // (després dels Centres nous: primer l'economia, com la IA de l'AoE II en «boom»)
    A.wantCastle = C.age >= 2 && D !== DIFFICULTY.easy && !C.has('castle') && C.villagers.length >= 32 && C.count('towncenter') >= Math.min(D.tcs, 2);
    if (A.wantCastle && canAfford(costFor('castle', C.T), C.T)) {
      const dir = new THREE.Vector3(C.foeHome.x - C.home.x, 0, C.foeHome.z - C.home.z).normalize();
      aiBuild(A, 'castle', aiHighSpot(C.home.clone().addScaledVector(dir, 22), 14), 0, 18, 4);
    }
    // Torres de defensa als campaments més exposats
    // (a l'Imperial, torres de bombarda si en té la tecnologia)
    const tower = C.E.techs.has('bombardtowertech') ? 'bombardtower' : 'watchtower';
    const isTower = (t) => t.subtype === 'watchtower' || t.subtype === 'bombardtower';
    if (C.age >= 1 && !A.wantTC && C.count('watchtower') + C.count('bombardtower') < D.towers + (tower === 'bombardtower' ? 1 : 0)
        && C.res.stone >= 150 && C.villagers.length >= 20 && canAfford(costFor(tower, C.T), C.T)) {
      const camps = C.blds.filter(b => (b.subtype === 'miningcamp' || b.subtype === 'lumbercamp') && !b.underConstruction)
        .sort((a, b) => hDist(a.position, C.foeHome) - hDist(b.position, C.foeHome));
      const camp = camps.find(c => !C.blds.some(t => isTower(t) && hDist(t.position, c.position) < 14));
      if (camp) aiBuild(A, tower, aiHighSpot(camp.position, 8), 0, 9);
    }
  }
  // Unitats: a cada edifici, la que més falta respecte a la composició (respectant la reserva per a l'edat)
  const count = {};
  let total = 0;
  for (const u of C.army) { const k = aiBaseKind(u, C.T); count[k] = (count[k] || 0) + 1; total++; }
  for (const b of C.blds) if (b.trainQueue && b.def && b.def.trains) for (const it of b.trainQueue) if (!isTech(it.kind) && CONFIG.UNITS[it.kind]) {
    const k = it.kind === uniqueUnitOf(C.T) ? '@unique' : (CONFIG.UNITS[it.kind].line || it.kind);
    count[k] = (count[k] || 0) + 1; total++;
  }
  const R = C.res, floating = R.food + R.wood + R.gold > 1500;
  for (const b of C.blds) {
    if (b.underConstruction || !b.def || !b.def.trains || b.subtype === 'dock' || b.subtype === 'market' || b.subtype === 'monastery') continue;
    if (b.trainQueue.length >= (floating ? 3 : 1)) continue;
    let best = null, bestV = -Infinity;
    for (const [k, w] of Object.entries(comp)) {
      if (AI_TRAINER[k] !== b.subtype) continue;
      const kind = k === '@unique' ? uniqueUnitOf(C.T) : currentKind(C.T, k);
      if (itemBlockReason(kind, C.T)) continue;
      if (w < 0.03) continue;
      const v = w * (total + 6) - (count[k] || 0);
      if (v > 0 && v > bestV) { bestV = v; best = k; }
    }
    if (!best) continue;
    // Setge amb mesura (com la IA de l'AoE II): uns quants ariets i mangonells, i trabucs a l'Imperial
    if ((AI_SIEGE_CAP[best] ?? Infinity) <= (count[best] || 0) || (best === 'trebuchet' && C.age < 3)) continue;
    const kind = best === '@unique' ? uniqueUnitOf(C.T) : currentKind(C.T, best);
    if (!aiAffords(A, C, costFor(kind, C.T))) continue;
    if (queueUnit(b, kind)) { count[best] = (count[best] || 0) + 1; total++; }
  }
}

/* ---------- Exploració: l'explorador fa una volta a casa, envolta la base rival per veure-hi
   el Centre, els campaments i l'exèrcit, i hi torna de tant en tant (com a l'AoE II) ---------- */
function aiScoutRoute(C, first) {
  const pts = [];
  if (first) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; pts.push(new THREE.Vector3(C.home.x + Math.cos(a) * 30, 0, C.home.z + Math.sin(a) * 30)); }
  const f = C.foeHome, a0 = Math.atan2(C.home.z - f.z, C.home.x - f.x);
  for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * Math.PI * 2; pts.push(new THREE.Vector3(f.x + Math.cos(a) * 27, 0, f.z + Math.sin(a) * 27)); }
  pts.push(C.homeRally.clone());
  return { pts: pts.map(p => clampToMap(p)), i: 0 };
}
function aiScout(A, C) {
  const s = C.army.find(u => u.aiRole === 'scout');
  if (!s) return;
  if (!C.D.scout) { s.aiRole = null; return; }
  if (!A.scoutPlan) A.scoutPlan = aiScoutRoute(C, true);
  const P = A.scoutPlan;
  // Ferit: torna a casa (i es refà abans de tornar a sortir)
  if (s.hp < s.maxHp * 0.45) { if (!P.hurt) { P.hurt = true; orderMove(s, C.homeRally.clone()); } return; }
  if (P.hurt) { if (s.state === STATE.IDLE && s.hp >= s.maxHp * 0.9) P.hurt = false; else return; }
  if (P.i >= P.pts.length) {
    // Descans a casa i una altra volta al cap d'uns minuts
    if (!P.restUntil) P.restUntil = C.now + 150;
    if (C.now >= P.restUntil) A.scoutPlan = aiScoutRoute(C, false);
    return;
  }
  // Següent punt en arribar (o si no hi pot arribar en 25 s: bosc, aigua…)
  if (s.state === STATE.IDLE || s.state === STATE.ATTACKING || (s.state === STATE.MOVING && hDist(s.position, P.pts[Math.max(0, P.i - 1)]) < 4)
      || C.now - (P.t || 0) > 25) {
    orderMove(s, P.pts[P.i]);
    P.i++;
    P.t = C.now;
  }
}

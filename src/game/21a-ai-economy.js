/* =====================================================================
   IA: ECONOMIA
   Com la IA de l'AoE II: el Centre no para de fer aldeans fins a l'objectiu de la dificultat,
   sempre hi ha cases de marge, els aldeans es reparteixen entre els recursos segons l'edat i
   l'estratègia (i es mouen d'un recurs a l'altre quan cal), els campaments es fan on hi ha la
   feina, les granges envolten els Centres, a l'Edat dels Castells s'hi afegeixen Centres nous
   i el Mercat ven el que sobra.
   ===================================================================== */
const AI_RES = ['food', 'wood', 'gold', 'stone'];

function aiEconomy(A, C) {
  aiVillagerProduction(A, C);
  aiHouses(A, C);
  aiVillagerWork(A, C);
  aiDropsites(A, C);
  aiExpand(A, C);
  aiMarket(A, C);
  // Amb moltes granges, en deixa unes quantes pagades a la cua del Molí perquè es resembrin soles
  const farms = state.resourceNodes.filter(n => n.subtype === 'farm' && n.team === C.T).length;
  if (farms >= 8 && hasCompleted('mill', C.T) && (C.E.farmQueue || 0) < 3 && C.res.wood > 300) queueFarm(C.T, 1);
}

/* ---------- Aldeans sense parar ---------- */
function aiVillagerProduction(A, C) {
  // Estalviant per pujar d'edat: el Centre queda lliure per a l'edat (com quan el jugador la «clica»)
  if (A.saving) return;
  let total = C.villagers.length;
  for (const tc of C.tcs) total += tc.trainQueue.filter(q => q.kind === 'villager').length;
  for (const tc of C.tcs) {
    if (total >= C.D.villagers) break;
    if (tc.trainQueue.some(it => isTech(it.kind)) || tc.trainQueue.length >= 2) continue;   // investigant una edat: ocupat
    if (queueUnit(tc, 'villager')) total++;
  }
}

/* ---------- Cases amb marge (més marge com més edificis produeixen) ---------- */
function aiHouses(A, C) {
  const cap = popCap(C.T), used = popUsed(C.T);
  if (cap >= CONFIG.POP_CAP) return;
  const producers = C.tcs.length + C.blds.filter(b => b.def && b.def.trains && !b.underConstruction && b.subtype !== 'dock').length;
  const building = C.blds.filter(b => b.subtype === 'house' && b.underConstruction).length;
  const maxAtOnce = C.villagers.length > 40 ? 3 : C.villagers.length > 18 ? 2 : 1;
  if (used + 3 + producers * 2 >= cap && building < maxAtOnce) {
    const tc = C.tcs[(A.resignTimer + building) % C.tcs.length];
    aiBuild(A, 'house', tc.position, 12, 36);
  }
}

/* ---------- Repartiment dels aldeans ----------
   Proporcions per edat i estratègia (com els percentatges de la IA de l'AoE II) */
function aiEcoTargets(A, C) {
  const rush = A.strategy === 'scoutrush' || A.strategy === 'archers' || A.strategy === 'maa';
  let t;
  if (C.age === 0) t = { food: 0.68, wood: 0.32, gold: 0, stone: 0 };
  else if (C.age === 1) t = rush ? { food: 0.42, wood: 0.36, gold: 0.2, stone: 0.02 } : { food: 0.5, wood: 0.3, gold: 0.18, stone: 0.02 };
  else if (C.age === 2) t = { food: 0.4, wood: 0.3, gold: 0.22, stone: 0.08 };
  else t = { food: 0.36, wood: 0.26, gold: 0.3, stone: 0.08 };
  // Pujada ràpida a Castells: més menjar i or
  if (C.age === 1 && A.strategy === 'fastcastle') t = { food: 0.52, wood: 0.24, gold: 0.24, stone: 0 };
  // Rush de la Fosca a Feudal amb arquers o homes d'armes: una mica d'or abans de pujar
  if (C.age === 0 && (A.strategy === 'archers' || A.strategy === 'maa') && C.villagers.length >= 18) t = { food: 0.6, wood: 0.32, gold: 0.08, stone: 0 };
  // Pedra per a Centres nous i Castells
  if (C.age >= 2 && (A.wantTC || A.wantCastle)) { t.stone += 0.07; t.food -= 0.04; t.wood -= 0.03; }
  // Sense mines d'or o pedra a l'abast: aquests aldeans van a la resta
  for (const r of ['gold', 'stone']) {
    if (t[r] > 0 && !nearestResource(r, C.home, 140)) { t.food += t[r] * 0.6; t.wood += t[r] * 0.4; t[r] = 0; }
  }
  return t;
}
/* Quin recurs està recollint (o porta) un aldeà */
function aiVillagerRes(u) {
  if (u.gatherNode) return u.gatherNode.resourceType;
  if (u.state === STATE.RETURNING && u.carry.type) return u.carry.type;
  return null;
}
/* Tria el recurs que toca per a un aldeà i l'hi envia. Retorna true si l'ha posat a treballar */
function aiAssign(A, C, u, type) {
  if (type === 'food') {
    // Granja pròpia lliure → menjar salvatge a prop d'un Centre → granja nova
    let best = null, bd = 70;
    for (const n of state.resourceNodes) {
      if (n.subtype !== 'farm' || n.team !== C.T || n.depleted || farmTaken(n, u)) continue;
      const d = hDist(n.position, u.position);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) best = aiWildFood(A, C, u);
    if (best) { orderGather(u, best, null); return true; }
    return aiBuildFarm(A, C, u);
  }
  const drop = nearestDropoff(u.position, type, C.T);
  const n = (drop && nearestResource(type, drop.position, 55, u)) || nearestResource(type, u.position, 120, u);
  if (!n) return false;
  orderGather(u, n, null);
  return true;
}
/* Menjar salvatge a prop d'un Centre amb lloc lliure: com a l'AoE II, un aldeà per arbust,
   uns quants per ovella o animal caçat; els que no hi caben fan granges */
const AI_FOOD_SLOTS = { berries: 1, sheep: 4, deer: 3, boar: 4 };
function aiWildFood(A, C, u) {
  const on = new Map();
  for (const v of C.villagers) if (v !== u && v.gatherNode) on.set(v.gatherNode, (on.get(v.gatherNode) || 0) + 1);
  let best = null, bd = Infinity;
  for (const n of state.resourceNodes) {
    const slots = AI_FOOD_SLOTS[n.subtype];
    if (!slots || n.depleted || n.amount <= 0 || n.resourceType !== 'food') continue;
    if (n.subtype === 'boar' && n.alive) continue;
    if ((on.get(n) || 0) >= slots) continue;
    let d = Infinity;
    for (const tc of C.tcs) d = Math.min(d, hDist(n.position, tc.position));
    if (n.subtype === 'deer' && n.alive && d > 30) continue;          // cérvols massa lluny: no val la pena
    if (d > 42) continue;
    d += hDist(n.position, u.position) * 0.3;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
/* Granja nova al voltant d'un Centre (o del Molí), construïda per l'aldeà que la treballarà */
function aiBuildFarm(A, C, u) {
  if (!hasCompleted('mill', C.T) || !canAfford(costFor('farm', C.T), C.T)) return false;
  const sites = [...C.tcs, ...C.blds.filter(b => b.subtype === 'mill' && !b.underConstruction)];
  sites.sort((a, b) => hDist(a.position, u.position) - hDist(b.position, u.position));
  for (const s of sites) if (aiBuild(A, 'farm', s.position, s.subtype === 'towncenter' ? 8 : 4, s.subtype === 'towncenter' ? 20 : 12, 1, [u])) return true;
  return false;
}
function aiVillagerWork(A, C) {
  const workers = C.villagers.filter(u => !u.garrisoned && u.aiRole !== 'fight' && u.aiRole !== 'scout');
  const counts = { food: 0, wood: 0, gold: 0, stone: 0 };
  for (const u of workers) { const r = aiVillagerRes(u); if (r) counts[r]++; }
  const frac = aiEcoTargets(A, C);
  const want = {};
  for (const r of AI_RES) want[r] = frac[r] * workers.length;
  C.gath = counts;
  C.wantGath = want;
  const deficits = () => AI_RES.filter(r => want[r] > 0).sort((a, b) => (counts[a] - want[a]) - (counts[b] - want[b]));
  // Aldeans inactius → al recurs que més en falta
  for (const u of workers) {
    if (u.state !== STATE.IDLE || u.orderQueue.length || u.buildTarget) continue;
    for (const r of deficits()) {
      if (aiAssign(A, C, u, r)) { counts[r]++; break; }
    }
  }
  // Cada 10 s: si un recurs en té de sobres i un altre en falta, en mou un parell
  if (C.now - A.lastRebalance < 10) return;
  A.lastRebalance = C.now;
  const order = deficits();
  const need = order[0], extra = order[order.length - 1];
  if (!need || !extra || need === extra || want[need] - counts[need] < 1.5 || counts[extra] - want[extra] < 1.5) return;
  const movers = workers.filter(u => aiVillagerRes(u) === extra && u.carry.amount < 4 && u.state === STATE.GATHERING
    && !(u.gatherNode && u.gatherNode.subtype === 'farm' && extra !== 'food'));
  for (const u of movers.slice(0, 2)) aiAssign(A, C, u, need);
}

/* ---------- Campaments on hi ha la feina ---------- */
function aiDropsites(A, C) {
  if (C.blds.some(b => (b.subtype === 'lumbercamp' || b.subtype === 'miningcamp' || b.subtype === 'mill') && b.underConstruction)) return;
  const drops = C.blds.filter(b => b.subtype === 'towncenter' || b.subtype === 'lumbercamp' || b.subtype === 'miningcamp' || b.subtype === 'mill');
  const served = (pos, type, r) => drops.some(b => (b.subtype === 'towncenter' || (b.dropoffTypes && b.dropoffTypes.includes(type))) && entSurfaceDist(b, pos.x, pos.z) < r);
  // Molí: al costat de les baies (o del Centre) quan ja hi ha uns quants aldeans
  if (!C.has('mill') && C.villagers.length >= 7) {
    const berries = nearestResource('food', C.home, 45);
    const near = berries && berries.subtype === 'berries' ? berries.position : C.home;
    if (aiBuild(A, 'mill', near, near === C.home ? 11 : 3.5, near === C.home ? 22 : 9)) return;
  }
  // Serradores: una per cada 7 llenyataires, sempre al costat d'un bosc que no en tingui
  const lumber = C.count('lumbercamp');
  if (C.villagers.length >= 5 && (lumber === 0 || C.gath.wood > lumber * 7)) {
    let best = null, bd = Infinity;
    for (const n of state.resourceNodes) {
      if (n.subtype !== 'tree' || n.depleted || served(n.position, 'wood', 12)) continue;
      let d = Infinity;
      for (const tc of C.tcs) d = Math.min(d, hDist(n.position, tc.position));
      if (d > 75 || d >= bd) continue;
      // Només boscos de veritat (prou arbres a prop)
      let k = 0;
      for (const o of obstaclesNear(n.position.x, n.position.z, aiObsBuf)) if (o.entity && o.entity.subtype === 'tree' && hDist(o.entity.position, n.position) < 7) k++;
      if (k >= 6) { bd = d; best = n; }
    }
    if (best && aiBuild(A, 'lumbercamp', best.position, 3.5, 10)) return;
  }
  // Campaments miners: a l'or (i a la pedra) quan s'hi ha de treballar
  for (const r of ['gold', 'stone']) {
    if (!(C.wantGath[r] >= 1)) continue;
    let best = null, bd = Infinity;
    for (const n of state.resourceNodes) {
      if (n.subtype !== r || n.depleted) continue;
      let d = Infinity;
      for (const tc of C.tcs) d = Math.min(d, hDist(n.position, tc.position));
      if (d < bd && d < 95) { bd = d; best = n; }
    }
    if (best && !served(best.position, r, 7) && aiBuild(A, 'miningcamp', best.position, 4, 9)) return;
  }
}
const aiObsBuf = [];

/* ---------- Més Centres de Ciutat (Edat dels Castells), al costat de l'or o d'un bosc ---------- */
function aiExpand(A, C) {
  const all = C.count('towncenter');
  A.wantTC = C.age >= 2 && all < C.D.tcs && C.villagers.length >= 24 + 12 * (all - 1);
  if (!A.wantTC || C.blds.some(b => b.subtype === 'towncenter' && b.underConstruction) || A.saving) return;
  if (!canAfford(costFor('towncenter', C.T), C.T)) return;
  const tcs = C.blds.filter(b => b.subtype === 'towncenter');
  let best = null, bd = Infinity;
  for (const n of state.resourceNodes) {
    if (n.depleted || (n.subtype !== 'gold' && n.subtype !== 'tree' && n.subtype !== 'stone')) continue;
    const dHome = hDist(n.position, C.home);
    if (dHome < 36 || dHome > 95) continue;
    if (tcs.some(t => hDist(t.position, n.position) < 36)) continue;
    if (hDist(n.position, C.foeHome) < dHome * 1.15) continue;          // no cap a la base rival
    const d = dHome + (n.subtype === 'gold' ? -12 : 0);
    if (d < bd) { bd = d; best = n; }
  }
  if (best) aiBuild(A, 'towncenter', best.position, 9, 22, 4);
}

/* ---------- Mercat: ven el que sobra i compra el que falta ---------- */
function aiMarket(A, C) {
  if (C.age < 2 || !hasCompleted('market', C.T) || C.now - A.lastTrade < 3) return;
  const R = C.res;
  for (const r of ['food', 'wood', 'stone']) {
    if (R[r] > 1600) { marketTrade(C.T, r, false); A.lastTrade = C.now; return; }
  }
  if (R.gold > 1300) for (const r of ['food', 'wood']) {
    if (R[r] < 200) { marketTrade(C.T, r, true); A.lastTrade = C.now; return; }
  }
}

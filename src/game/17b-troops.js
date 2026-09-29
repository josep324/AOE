/* =====================================================================
   TROPES: grups que marxen en formació (com a l'AoE II)
   Un grup gran que va lluny no hi va cada unitat pel seu compte (es desfeia i arribaven en filera):
   un punt guia segueix un sol camí al pas de la unitat més lenta, i cada unitat va al seu lloc de la
   formació respecte del guia. El guia s'espera si el grup s'ha estirat (p. ex. per un pas estret) i,
   en arribar, cadascú ocupa el seu lloc final. Qui rep una altra ordre o entra en combat surt de la tropa.
   ===================================================================== */
const TROOPS = [];
let troopSeq = 0;
const TROOP_MIN_DIST = 18;           // per a trajectes curts no cal: cadascú va directe al seu lloc
/* Local (lx a la dreta, lz endavant) ↔ món, amb el mateix gir que formationSlots */
const troopWorld = (T, off, out) => {
  const c = Math.cos(T.heading), s = Math.sin(T.heading);
  return out.set(T.pos.x + off[0] * c + off[1] * s, 0, T.pos.z - off[0] * s + off[1] * c);
};
/* Crea una tropa si val la pena. slots: Map unitat → lloc final. Retorna true si s'ha creat */
function makeTroop(units, point, slots, attackMove = false) {
  const land = units.filter(u => !u.naval && !u.garrisoned && !u.dead);
  if (land.length < 3 || land.length !== units.length || !land.some(u => u.isMilitary)) return false;
  const c = new THREE.Vector3();
  land.forEach(u => c.add(u.position));
  c.divideScalar(land.length);
  if (hDist(c, point) < TROOP_MIN_DIST) return false;
  // Camí del guia: el de la unitat més grossa del grup (si ella hi passa, hi passen totes)
  const big = land.reduce((a, b) => (b.radius > a.radius ? b : a));
  const probe = { position: c.clone(), radius: big.radius, naval: false, team: big.team };
  setMoveTarget(probe, point);
  if (!probe.path || !probe.path.length) return false;
  const heading = land[0].formHeading ?? Math.atan2(point.x - c.x, point.z - c.z);
  const hc = Math.cos(heading), hs = Math.sin(heading);
  const T = {
    id: ++troopSeq, members: land, off: new Map(), final: slots, attackMove, team: big.team,
    path: probe.path.map(p => p.clone()), pos: c.clone(), speed: Math.min(...land.map(u => u.speed)) * 0.9,
    heading: Math.atan2(probe.path[0].x - c.x, probe.path[0].z - c.z), retarget: 0, alive: true,
  };
  for (const u of land) {
    const s = slots.get(u) || point;
    const dx = s.x - point.x, dz = s.z - point.z;
    T.off.set(u, [dx * hc - dz * hs, dx * hs + dz * hc]);
  }
  const tmp = new THREE.Vector3();
  for (const u of land) {
    u.orderQueue.length = 0;
    const spot = clampToMap(pushOutOfObstacles(troopWorld(T, T.off.get(u), tmp).clone(), u.radius + 0.2));
    if (attackMove) orderAttackMove(u, spot); else orderMove(u, spot);
    u.troop = T;
    u.speedCap = null;
  }
  TROOPS.push(T);
  return true;
}
const troopTmp = new THREE.Vector3();
/* Cada pas: el guia avança (més a poc a poc si el grup s'ha estirat) i les unitats el segueixen */
function updateTroops(dt) {
  for (let t = TROOPS.length - 1; t >= 0; t--) {
    const T = TROOPS[t];
    // Qui ha rebut una altra ordre o ha entrat en combat surt de la tropa (i ja no hi torna)
    T.members = T.members.filter(u => {
      const keep = !u.dead && u.troop === T && u.state === STATE.MOVING;
      if (!keep && u.troop === T) u.troop = null;
      return keep;
    });
    if (!T.members.length) { T.alive = false; TROOPS.splice(t, 1); continue; }
    // Com d'estirat va el grup: distància mitjana de cada unitat al seu lloc
    let lag = 0;
    for (const u of T.members) lag += hDist(u.position, troopWorld(T, T.off.get(u), troopTmp));
    lag /= T.members.length;
    const v = T.speed * (lag < 2.5 ? 1 : lag > 8 ? 0.12 : 1 - (lag - 2.5) / 5.5 * 0.88);
    let step = v * dt;
    while (step > 0 && T.path.length) {
      const wp = T.path[0], dx = wp.x - T.pos.x, dz = wp.z - T.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.05) T.heading = lerpAngle(T.heading, Math.atan2(dx, dz), 1 - Math.exp(-1.5 * dt));
      if (d <= step) { T.pos.x = wp.x; T.pos.z = wp.z; step -= d; T.path.shift(); }
      else { T.pos.x += dx / d * step; T.pos.z += dz / d * step; step = 0; }
    }
    if (!T.path.length) {
      // Arribada: cadascú al seu lloc final de la formació
      for (const u of T.members) {
        u.troop = null;
        setMoveTarget(u, T.final.get(u) || T.pos.clone());
        if (T.attackMove) u.attackMove = (T.final.get(u) || T.pos).clone();
      }
      T.alive = false;
      TROOPS.splice(t, 1);
      continue;
    }
    // Cada 0,2 s, el lloc de cada unitat es mou amb el guia
    T.retarget -= dt;
    if (T.retarget > 0) continue;
    T.retarget = 0.2;
    for (const u of T.members) {
      const spot = clampToMap(pushOutOfObstacles(troopWorld(T, T.off.get(u), troopTmp).clone(), u.radius + 0.2));
      if (u.target && hDist(u.target, spot) < 0.3) continue;
      if (segmentWalkable(u.position.x, u.position.z, spot.x, spot.z)) {
        u.target = spot; u.path = [spot]; u.pathVersion = NAV.blockVersion;
      } else if (state.elapsed >= (u.troopPathAt || 0)) {
        u.troopPathAt = state.elapsed + 1;             // (camí complet com a molt un cop per segon)
        setMoveTarget(u, spot);
      }
    }
  }
}

/* ---------- Ajuda en combat ----------
   Quan una unitat del grup entra en combat (veu un enemic o l'ataquen), les unitats pròpies properes
   que estan quietes (o avançant amb atac) també s'hi llancen, cadascuna contra l'enemic més proper:
   no s'hi queden mirant mentre lluiten les dues o tres primeres */
const assistBuf = [];
function rallyGroup(u, target) {
  if (!u || !target || !u.isMilitary || state.elapsed < (u.rallyAt || 0)) return;
  u.rallyAt = state.elapsed + 1;
  const tx = target.position.x, tz = target.position.z;
  for (const v of unitsNear(u.position.x, u.position.z, 12, assistBuf)) {
    if (v === u || v.team !== u.team || v.dead || v.garrisoned || !v.isMilitary || v.stance === 'stand' || v.naval !== u.naval) continue;
    if (!(v.state === STATE.IDLE || (v.state === STATE.MOVING && v.attackMove))) continue;
    if (v.packable && v.packed) continue;
    if (hDist(v.position, u.position) > 12) continue;
    const r = Math.min(22, Math.hypot(v.position.x - tx, v.position.z - tz) + 6);
    const t = findTargetNear(v, r) || target;
    if (!isAttackable(t) || t.dead) continue;
    v.rallyAt = state.elapsed + 1;                     // (no torna a cridar els altres: evita cascades)
    orderAttack(v, t);
  }
}

/* =====================================================================
   MONJOS, CONVERSIONS I RELÍQUIES
   El monjo cura les unitats pròpies i converteix les enemigues (cal tenir la fe plena).
   Les relíquies només les poden portar els monjos; guardades en un Monestir donen or.
   ===================================================================== */
const FAITH_TIME = 45;           // segons per recuperar la fe sencera
const HEAL_RATE = 2.2;           // punts de vida per segon
const RELIC_GOLD = 0.5;          // or per segon i relíquia
const RELIC_COUNT = 5;
const RELIC_WIN_TIME = 200;      // segons amb totes les relíquies per guanyar
const WONDER_WIN_TIME = 300;     // segons que ha de resistir la Meravella
const NO_CONVERT = ['towncenter', 'castle', 'wonder', 'gate', 'farm'];

function isMonk(u) { return !!u && u.kind === 'unit' && u.category === 'monk'; }
function canConvert(u, t) {
  if (!t || t.dead || t.garrisoned || t.isGround || !t.team || t.team === u.team) return false;
  const T = teamOf(u.team);
  if (t.kind === 'unit') {
    if (t.category === 'king') return false;
    if (t.category === 'monk') return T.techs.has('atonement');
    if (t.category === 'siege') return T.techs.has('redemption');
    return true;
  }
  if (t.kind === 'building') return !NO_CONVERT.includes(t.subtype) && !t.isWall && T.techs.has('redemption');
  return false;
}
function canHeal(u, t) {
  return !!t && !t.dead && !t.garrisoned && t.kind === 'unit' && t.team === u.team && t !== u && t.category !== 'siege' && t.hp < t.maxHp;
}
function monkDist(u, t) { return entSurfaceDist(t, u.position.x, u.position.z) - u.radius; }
function clearMonkTask(u) {
  u.convTarget = null; u.healTarget = null; u.relicTarget = null; u.relicDrop = null;
  u.gatherNode = null; u.buildTarget = null; u.attackTarget = null; u.garrisonTarget = null;
  u.convT = 0; u.convNeed = 0; u.chaseTimer = 0;
}
function orderConvert(u, t) {
  if (!canConvert(u, t)) return false;
  clearMonkTask(u);
  u.convTarget = t;
  setUnitState(u, STATE.CONVERTING);
  if (t.team === AI.team) aiAlert(u);
  return true;
}
function orderHeal(u, t) {
  clearMonkTask(u);
  u.healTarget = t;
  setUnitState(u, STATE.HEALING);
}
function commandConvert(monks, t) {
  let ok = 0;
  for (const u of monks) { u.orderQueue.length = 0; if (orderConvert(u, t)) { u.forcedTarget = true; ok++; } }
  if (!ok && monks.length && monks[0].isOwn) {
    toast(t.kind === 'building' ? (NO_CONVERT.includes(t.subtype) || t.isWall ? "⛪ Aquest edifici no es pot convertir" : '⛪ Cal investigar Redempció per convertir edificis')
      : t.category === 'monk' ? '⛪ Cal investigar Expiació per convertir monjos'
      : t.category === 'siege' ? '⛪ Cal investigar Redempció per convertir setge' : "⛪ No es pot convertir");
  }
  return ok;
}

/* Conversió: el monjo resa a l'abast fins que l'objectiu canvia de bàndol */
function monkConvertTick(u, dt) {
  const t = u.convTarget;
  u.inRange = false;
  if (!canConvert(u, t) || (u.isOwn && t.group && !t.group.visible)) { u.convTarget = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); return false; }
  if (monkDist(u, t) > u.convRange) {
    u.convT = 0;
    u.chaseTimer -= dt;
    if (!u.target || u.chaseTimer <= 0) { u.chaseTimer = 0.5; setMoveTarget(u, t.kind === 'unit' ? t.position.clone() : approachPoint(t, u.position)); }
    // Una persecució massa llarga s'abandona (si no l'ha ordenada el jugador)
    if (!u.forcedTarget && hDist(u.position, t.position) > u.los * 2) { u.convTarget = null; setUnitState(u, STATE.IDLE); return false; }
    return !stepTowardsTarget(u, dt);
  }
  if (u.target) setMoveTarget(u, null);
  u.group.rotation.y = lerpAngle(u.group.rotation.y, Math.atan2(t.position.x - u.position.x, t.position.z - u.position.z), 1 - Math.exp(-10 * dt));
  if (u.faith < 100) { u.convT = 0; return false; }          // esperant recuperar la fe
  u.inRange = true;
  if (!u.convNeed) u.convNeed = (t.kind === 'building' ? randRange(8, 14) : randRange(4, 10)) * (teamOf(t.team).techs.has('faith') ? 1.5 : 1);
  u.convT += dt;
  u.sparkT = (u.sparkT || 0) - dt;
  if (u.sparkT <= 0) { u.sparkT = 0.3; spawnSparkles(aimPoint(t), teamOf(u.team).colorLight, 4, t.kind === 'building' ? 2.5 : 0.7); }
  if (u.convT >= u.convNeed) {
    const name = t.name;
    convertEntity(t, u.team);
    u.faith = 0;
    u.convTarget = null; u.convNeed = 0; u.convT = 0;
    setUnitState(u, STATE.IDLE);
    if (u.isOwn) toast(`✨ Conversió! ${name} ara és teu`);
    else if (t.team === u.team && t.kind) toast(`😱 Un monjo enemic ha convertit: ${name}`);
  }
  return false;
}
/* Curació: cura una unitat ferida i després en busca una altra a prop */
function monkHealTick(u, dt) {
  let t = u.healTarget;
  u.inRange = false;
  if (!canHeal(u, t)) {
    t = u.healTarget = findHealTarget(u, u.los);
    if (!t) { setMoveTarget(u, null); setUnitState(u, STATE.IDLE); return false; }
  }
  if (monkDist(u, t) > u.healRange) {
    u.chaseTimer -= dt;
    if (!u.target || u.chaseTimer <= 0) { u.chaseTimer = 0.5; setMoveTarget(u, t.position.clone()); }
    return !stepTowardsTarget(u, dt);
  }
  if (u.target) setMoveTarget(u, null);
  u.inRange = true;
  u.group.rotation.y = lerpAngle(u.group.rotation.y, Math.atan2(t.position.x - u.position.x, t.position.z - u.position.z), 1 - Math.exp(-10 * dt));
  t.hp = Math.min(t.maxHp, t.hp + HEAL_RATE * dt);
  u.sparkT = (u.sparkT || 0) - dt;
  if (u.sparkT <= 0) { u.sparkT = 0.4; spawnSparkles(aimPoint(t), 0x9dffa0, 3, 0.6); }
  return false;
}
const monkBuf = [];
function findHealTarget(u, radius) {
  let best = null, bestD = Infinity;
  for (const e of unitsNear(u.position.x, u.position.z, radius, monkBuf)) {
    if (!canHeal(u, e)) continue;
    const d = hDist(e.position, u.position) * (0.5 + e.hp / e.maxHp);    // prioritza els més ferits
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}
function findConvertTarget(u, radius) {
  let best = null, bestD = Infinity;
  for (const e of unitsNear(u.position.x, u.position.z, radius, monkBuf)) {
    if (!canConvert(u, e) || (u.isOwn && !e.group.visible)) continue;
    // Primer les unitats cares: cavalleria, setge i unitats úniques
    const d = hDist(e.position, u.position) * (e.mounted || e.category === 'siege' || e.isUnique ? 0.6 : 1);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}
/* Comportament automàtic d'un monjo inactiu (o en marxa amb atac, a les onades de la IA) */
function monkAutoScan(u, dt, moving) {
  u.scanTimer -= dt;
  if (u.scanTimer > 0) return false;
  u.scanTimer = 0.5;
  if (u.relic) return false;
  const h = findHealTarget(u, u.los);
  if (h) { orderHeal(u, h); return true; }
  if (u.faith >= 100 && u.stance !== 'stand') {
    const c = findConvertTarget(u, moving ? u.los : u.convRange + 2);
    if (c) { orderConvert(u, c); return true; }
  }
  return false;
}
function updateFaith(u, dt) {
  if (u.faith < 100) u.faith = Math.min(100, u.faith + dt * 100 / FAITH_TIME * teamOf(u.team).mods.faithRegen);
}

/* ---------- Canvi de bàndol ---------- */
function convertEntity(e, team) {
  const oldTeam = e.team;
  if (e.selected && !(team === PLAYER.id && state.selected.every(s => s === e))) { removeFromSelection(e); onSelectionChanged(); }
  e.visArch = e.visArch || archOf(oldTeam);          // conserva l'aspecte de la seva civilització
  e.team = team;
  e.recolorSelection();
  if (e.kind === 'unit') {
    e.orderQueue.length = 0;
    if (e.garrison && e.garrison.length) ungarrison(e);
    Object.assign(e, { attackTarget: null, attackMove: null, gatherNode: null, buildTarget: null, dropTarget: null, garrisonTarget: null,
      convTarget: null, healTarget: null, relicTarget: null, relicDrop: null, inWave: false, speedCap: null, forcedTarget: false, anchor: null });
    if (e.subtype === 'tradecart') { e.tradeDest = null; e.tradeHome = null; e.tradeLoaded = 0; }
    setMoveTarget(e, null);
    setUnitStats(e, e.unitKind);
    e.hp = Math.min(e.hp, e.maxHp);
    rebuildUnitModel(e);
    setUnitState(e, STATE.IDLE);
  } else {
    if (e.garrison && e.garrison.length) ungarrison(e);
    if (e.trainQueue) e.trainQueue = [];
    e.rally = null;
    e.seen = true;
    rebuildBuildingModel(e);
  }
  spawnSparkles(aimPoint(e), teamOf(team).colorLight, 18, e.kind === 'building' ? 3 : 1);
  updatePopulationUI();
  if (e.selected) updateSelectionUI();
}

/* ---------- Relíquies ---------- */
function relicTemplate() {
  if (relicTemplate.tpl) return relicTemplate.tpl;
  const g = new THREE.Group();
  const gold = mat(0xd8aa3a, { metalness: 0.85, roughness: 0.3, emissive: 0x3a2800, emissiveIntensity: 0.5 });
  const wood = mat(0x4a2c18, { roughness: 0.8 });
  const gem = mat(0xb01830, { metalness: 0.3, roughness: 0.2, emissive: 0x400010, emissiveIntensity: 0.6 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  add(new THREE.BoxGeometry(1.05, 0.12, 0.75), wood, 0, 0.06, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.SphereGeometry(0.07, 8, 6), gold, sx * 0.44, 0.1, sz * 0.3);
  add(new THREE.BoxGeometry(0.9, 0.46, 0.6), gold, 0, 0.35, 0);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16, 1, false, 0, Math.PI), gold, 0, 0.58, 0, 0, 0, Math.PI / 2);
  for (const x of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.08, 0.5, 0.64), wood, x, 0.36, 0);
  add(new THREE.BoxGeometry(0.2, 0.2, 0.04), gem, 0, 0.38, 0.31);
  add(new THREE.BoxGeometry(0.06, 0.34, 0.06), gold, 0, 1.02, 0);
  add(new THREE.BoxGeometry(0.22, 0.06, 0.06), gold, 0, 1.08, 0);
  relicTemplate.tpl = g;
  return g;
}
function createRelic(x, z) {
  const e = new Entity({ kind: 'relic', subtype: 'relic', name: 'Relíquia', icon: '🏺', team: 0, radius: 0.6, selRadius: 1.0 });
  const model = relicTemplate().clone(true);
  e.model = model;
  e.group.add(model);
  // Halo daurat que gira i flota
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.5;
  halo.userData.noPick = true; halo.userData.noShadow = true;
  e.group.add(halo);
  e.halo = halo;
  e.carrier = null;
  e.holder = null;
  e.group.position.set(x, 0, z);
  e.finalize();
  state.relics.push(e);
  return e;
}
function monasteriesOf(team) {
  return state.buildings.filter(b => b.subtype === 'monastery' && b.team === team && !b.underConstruction && !b.dead);
}
function orderPickRelic(u, r) {
  clearMonkTask(u);
  u.relicTarget = r;
  setMoveTarget(u, r.position.clone());
  setUnitState(u, STATE.MOVING);
}
function pickUpRelic(u, r) {
  r.carrier = u;
  u.relic = r;
  u.relicTarget = null;
  r.group.visible = false;
  if (r.selected) { removeFromSelection(r); onSelectionChanged(); }
  if (u.relicMesh) u.relicMesh.visible = true;
  if (u.isOwn) toast('🏺 Relíquia recollida: porta-la a un Monestir');
  if (!orderDepositRelic(u)) setUnitState(u, STATE.IDLE);
}
function orderDepositRelic(u, m = null) {
  const list = m ? [m] : monasteriesOf(u.team);
  const best = list.sort((a, b) => hDist(a.position, u.position) - hDist(b.position, u.position))[0];
  if (!best) { if (u.isOwn) toast('⛪ Construeix un Monestir per guardar-hi la relíquia'); return false; }
  u.relicDrop = best;
  u.approachTries = 0;
  setMoveTarget(u, approachPoint(best, u.position));
  setUnitState(u, STATE.MOVING);
  return true;
}
function depositRelic(u, m) {
  const r = u.relic;
  u.relic = null;
  u.relicDrop = null;
  if (u.relicMesh) u.relicMesh.visible = false;
  r.carrier = null;
  r.holder = m;
  (m.relics = m.relics || []).push(r);
  setMoveTarget(u, null);
  setUnitState(u, STATE.IDLE);
  if (u.isOwn) { toast(`⛪ Relíquia guardada (${m.relics.length} en aquest Monestir): +${RELIC_GOLD * m.relics.length} d'or/s`); spawnSparkles(aimPoint(m), 0xffe6a0, 14, 2.5); }
  if (m.selected) updateSelectionUI();
}
function dropRelic(r, pos) {
  r.carrier = null;
  r.holder = null;
  const a = rand() * Math.PI * 2;
  r.position.set(pos.x + Math.cos(a) * 0.8, 0, pos.z + Math.sin(a) * 0.8);
  clampToMap(r.position);
  r.group.visible = isExploredAt(r.position.x, r.position.z);
}
/* Un monjo que porta relíquia la deixa a terra (mor, o ho ordena el jugador) */
function unitDropRelic(u) {
  if (!u.relic) return;
  dropRelic(u.relic, u.position);
  u.relic = null;
  if (u.relicMesh) u.relicMesh.visible = false;
}
/* Un Monestir destruït deixa caure les relíquies */
function buildingDropRelics(b) {
  if (!b.relics || !b.relics.length) return;
  for (const r of b.relics) {
    const a = rand() * Math.PI * 2, d = (b.footprint ? b.footprint.hw : 3) + 1.5;
    dropRelic(r, { x: b.position.x + Math.cos(a) * d, z: b.position.z + Math.sin(a) * d });
  }
  b.relics = [];
}
/* Moviment del monjo cap a una relíquia o cap al Monestir. Retorna true si ha gestionat l'estat */
function monkMoveTick(u) {
  const r = u.relicTarget;
  if (r) {
    if (r.carrier || r.holder || !state.relics.includes(r)) { u.relicTarget = null; setMoveTarget(u, null); setUnitState(u, STATE.IDLE); return true; }
    if (hDist(u.position, r.position) < 1.7) { pickUpRelic(u, r); return true; }
  }
  const m = u.relicDrop;
  if (m && u.relic) {
    if (m.dead || m.team !== u.team) { if (!orderDepositRelic(u)) { u.relicDrop = null; setUnitState(u, STATE.IDLE); } return true; }
    if (entSurfaceDist(m, u.position.x, u.position.z) - u.radius <= 1.3) { depositRelic(u, m); return true; }
  }
  return false;
}
/* Or de les relíquies, animació dels halos i condicions de victòria per relíquies */
let relicGoldAcc = { 1: 0, 2: 0 };
function updateRelics(dt) {
  for (const b of state.buildings) {
    if (b.subtype !== 'monastery' || !b.relics || !b.relics.length || b.underConstruction) continue;
    const g = RELIC_GOLD * b.relics.length * dt;
    resOf(b.team).gold += g;
    relicGoldAcc[b.team] = (relicGoldAcc[b.team] || 0) + g;
  }
  if (relicGoldAcc[PLAYER.id] >= 1) { relicGoldAcc[PLAYER.id] = 0; updateResourcesUI(); }
}
function animateRelics(t) {
  for (const r of state.relics) {
    if (!r.group.visible) continue;
    r.halo.rotation.z = t * 0.8;
    r.halo.position.y = 1.35 + Math.sin(t * 2 + r.id) * 0.12;
  }
}
function placeRelics() {
  // Com a l'AoE II: 5 relíquies per tot el mapa, com a mínim a 25 caselles (~54 m) de qualsevol
  // jugador i a 20 caselles (~43 m) l'una de l'altra. Cada nova relíquia es tria entre uns quants
  // llocs possibles el que queda més lluny de les altres, perquè quedin ben escampades.
  // Perquè sigui just, cap jugador en pot tenir més de una de més a prop que l'altre.
  const L = CONFIG.MAP_LIMIT - 8, bases = Object.values(BASES);
  const baseGap = Math.min(54, CONFIG.MAP_LIMIT * 0.42), minGap = Math.min(43, CONFIG.MAP_LIMIT * 0.33);
  const free = (x, z) => !isNearObstacle(x, z, 2.5) && bases.every(B => Math.hypot(x - B.x, z - B.z) > baseGap);
  let best = null;
  for (let attempt = 0; attempt < 25; attempt++) {
    const placed = [];
    for (let i = 0; i < RELIC_COUNT; i++) {
      let pick = null, pickD = -1;
      for (let c = 0, k = 0; c < 10 && k < 300; k++) {
        const x = randRange(-L, L), z = randRange(-L, L);
        if (!free(x, z)) continue;
        const d = placed.reduce((m, [px, pz]) => Math.min(m, Math.hypot(px - x, pz - z)), Infinity);
        if (d < minGap) continue;
        c++;
        if (d > pickD) { pickD = d; pick = [x, z]; }
      }
      if (pick) placed.push(pick);
    }
    // Equilibri: quantes en té més a prop cada jugador (les del mig no compten)
    let diff = 0;
    for (const [x, z] of placed) {
      const d1 = Math.hypot(x - bases[0].x, z - bases[0].z), d2 = Math.hypot(x - bases[1].x, z - bases[1].z);
      if (Math.abs(d1 - d2) > 20) diff += d1 < d2 ? 1 : -1;
    }
    const score = (RELIC_COUNT - placed.length) * 10 + Math.abs(diff);
    if (!best || score < best.score) best = { placed, score };
    if (placed.length === RELIC_COUNT && Math.abs(diff) <= 1) break;
  }
  for (const [x, z] of best.placed) createRelic(x, z);
}

/* ---------- Espurnes (només visuals) ---------- */
const sparkleGeo = new THREE.OctahedronGeometry(0.09, 0);
const sparkleMats = new Map();
function spawnSparkles(pos, color, n, spread = 0.7) {
  if (!sparkleMats.has(color)) sparkleMats.set(color, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const m = sparkleMats.get(color);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(sparkleGeo, m);
    s.position.set(pos.x + (vrand() - 0.5) * spread * 2, pos.y + (vrand() - 0.5) * spread, pos.z + (vrand() - 0.5) * spread * 2);
    s.userData.v = 0.8 + vrand() * 1.4;
    s.userData.life = 0.9 + vrand() * 0.6;
    scene.add(s);
    state.sparkles.push(s);
  }
}
function updateSparkles(dt) {
  for (let i = state.sparkles.length - 1; i >= 0; i--) {
    const s = state.sparkles[i];
    s.userData.life -= dt;
    s.position.y += s.userData.v * dt;
    s.rotation.y += dt * 4;
    s.scale.setScalar(Math.max(0.01, Math.min(1, s.userData.life * 1.5)));
    if (s.userData.life <= 0) { scene.remove(s); state.sparkles.splice(i, 1); }
  }
}


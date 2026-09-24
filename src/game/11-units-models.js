/* ---------- Aldeà ---------- */
const villagerGeo = {
  hit: new THREE.CylinderGeometry(0.62, 0.62, 2.4, 8),
  carry: new THREE.BoxGeometry(0.46, 0.46, 0.46),
};
const CARRY_MATERIALS = {
  wood: mat(0x8b5a2b, { roughness: 0.85 }),
  gold: mat(0xffc53a, { metalness: 0.7, roughness: 0.3, emissive: 0x4a3300, emissiveIntensity: 0.7 }),
  food: mat(0xd9534f, { roughness: 0.7 }),
  stone: mat(0x9e9e9e, { roughness: 0.9, flatShading: true }),
};
const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

/* Estadístiques de la unitat segons les tecnologies del seu equip (també refà les existents) */
function setUnitStats(e, kind) {
  const d = CONFIG.UNITS[kind];
  const M = teamOf(e.team).mods;
  const cat = d.cat;
  e.unitKind = kind;
  e.category = cat;
  e.speed = d.speed * (cat === 'villager' ? M.villagerSpeed : 1);
  e.attack = d.attack + (M.attack[cat] || 0);
  e.range = (d.range || 0) + (d.range ? (M.range[cat] || 0) : 0);
  e.reach = d.reach || 0.45;
  e.reload = d.reload * (M.reloadMul[cat] || 1);
  const ma = cat === 'villager' ? M.villagerArmor : (M.armor[cat] || [0, 0]);
  e.armor = [d.armor[0] + ma[0], d.armor[1] + ma[1]];
  e.los = d.los;
  e.vsBuilding = (d.vsBuilding || 0) + (M.vsBuilding[cat] || 0);
  e.bonusCav = d.bonusCav || 0;
  const newMax = Math.round(d.hp * (M.hpMul[cat] || 1)) + (cat === 'villager' ? M.villagerHp : 0);
  if (e.maxHp) e.hp += newMax - e.maxHp;
  e.maxHp = newMax;
  e.barH = cat === 'cavalry' ? 3.4 : cat === 'trade' ? 2.9 : 2.75;
}
function applyUnitStats(e, kind) {
  setUnitStats(e, kind);
  e.isMilitary = ['infantry', 'archer', 'cavalry'].includes(CONFIG.UNITS[kind].cat);
  e.attackTarget = null;
  e.attackCooldown = 0;
  e.scanTimer = rand() * 0.5;
  e.chaseTimer = 0;
  e.attackMove = null;
  e.stance = 'aggressive';      // agressiva · defensiva · mantenir posició
  e.anchor = null;              // punt on la unitat defensa (postura defensiva)
  e.forcedTarget = false;       // objectiu ordenat pel jugador (ignora la postura)
  e.garrisoned = null;
  e.garrisonTarget = null;
  e.swingT = 0;
}

function createVillager(x, z, team = PLAYER.id) {
  const e = new Entity({
    kind: 'unit', subtype: 'villager', name: 'Aldeà', icon: '🧑‍🌾',
    team, radius: CONFIG.VILLAGER.radius, selRadius: 0.78,
    hp: CONFIG.VILLAGER.hp, maxHp: CONFIG.VILLAGER.hp,
  });
  applyUnitStats(e, 'villager');
  e.target = null;
  e.walkPhase = rand() * 10;
  e.spawnT = 1;
  // --- Màquina d'estats i economia ---
  e.state = STATE.IDLE;
  e.gatherNode = null;          // recurs assignat
  e.gatherAngle = null;         // angle fix al voltant del recurs (per repartir els aldeans)
  e.lastResourceType = null;    // per buscar un recurs nou quan s'esgota
  e.lastNodePos = new THREE.Vector3();
  e.dropTarget = null;          // Centre de Ciutat on descarregar
  e.carry = { type: null, amount: 0 };
  e.orderQueue = [];            // ordres encadenades amb Shift
  e.path = null;                // camí actual (punts intermedis)
  e.buildTarget = null;         // fonament que construeix
  e.buildAngle = null;
  e.approachTries = 0;
  e.gatherProgress = 0;
  e.workPhase = 0;

  const model = buildUnitVisual(e, 'villager', team);
  const hit = new THREE.Mesh(villagerGeo.hit, hitMaterial);
  hit.position.y = 1.2;
  hit.userData.noShadow = true;
  e.group.add(model, hit);
  e.group.position.set(x, 0, z);
  e.finalize();
  state.units.push(e);
  return e;
}

/* ---------- Soldats: Milícia, Llancer, Arquer, Explorador i Cavaller ---------- */
const cavalryHitGeo = new THREE.CylinderGeometry(0.9, 0.9, 3.2, 8);
function createSoldier(kind, x, z, team = PLAYER.id) {
  const d = CONFIG.UNITS[kind];
  const e = new Entity({ kind: 'unit', subtype: kind, name: d.name, icon: d.icon, team, radius: 0.45,
    selRadius: d.cat === 'cavalry' ? 1.2 : 0.8, hp: d.hp, maxHp: d.hp });
  applyUnitStats(e, kind);
  e.target = null;
  e.path = null;
  e.walkPhase = rand() * 10;
  e.spawnT = 1;
  e.state = STATE.IDLE;
  e.orderQueue = [];
  e.gatherNode = null; e.dropTarget = null; e.buildTarget = null; e.buildAngle = null; e.gatherAngle = null;
  e.approachTries = 0; e.lastResourceType = null; e.lastNodePos = new THREE.Vector3();
  e.carry = { type: null, amount: 0 };
  e.workPhase = 0;
  const model = buildUnitVisual(e, kind, team);
  if (d.cat === 'cavalry') e.radius = 0.75;
  const hit = new THREE.Mesh(d.cat === 'cavalry' ? cavalryHitGeo : villagerGeo.hit, hitMaterial);
  hit.position.y = d.cat === 'cavalry' ? 1.6 : 1.2;
  hit.userData.noShadow = true;
  e.group.add(model, hit);
  e.group.position.set(x, 0, z);
  e.finalize();
  state.units.push(e);
  return e;
}

/* ---------- Carro de comerç (bou + carro) ---------- */
function createTradeCart(x, z, team = PLAYER.id) {
  const d = CONFIG.UNITS.tradecart;
  const e = new Entity({ kind: 'unit', subtype: 'tradecart', name: d.name, icon: d.icon, team, radius: 0.8, selRadius: 1.3, hp: d.hp, maxHp: d.hp });
  applyUnitStats(e, 'tradecart');
  Object.assign(e, {
    target: null, path: null, walkPhase: rand() * 10, spawnT: 1, state: STATE.IDLE, orderQueue: [],
    gatherNode: null, dropTarget: null, buildTarget: null, buildAngle: null, gatherAngle: null, approachTries: 0,
    lastResourceType: null, lastNodePos: new THREE.Vector3(), carry: { type: null, amount: 0 }, workPhase: 0,
    tradeHome: null, tradeDest: null, tradeLoaded: 0,
  });
  e.radius = 0.8;
  const model = buildUnitVisual(e, 'tradecart', team);
  const hit = new THREE.Mesh(cavalryHitGeo, hitMaterial);
  hit.position.y = 1.2;
  hit.userData.noShadow = true;
  e.group.add(model, hit);
  e.group.position.set(x, 0, z);
  e.finalize();
  state.units.push(e);
  return e;
}
function markets(team) {
  return state.buildings.filter(b => b.subtype === 'market' && b.team === team && !b.underConstruction && !b.dead);
}
function tradeValue(a, b) {
  const d = hDist(a.position, b.position);
  return Math.round(d * 0.6 + d * d * 0.004);
}
function orderTrade(u, dest) {
  const home = markets(u.team).filter(m => m !== dest).sort((a, b) => hDist(a.position, u.position) - hDist(b.position, u.position))[0];
  if (!home) { if (u.isOwn) toast('🏪 Cal un segon mercat per comerciar'); return false; }
  u.orderQueue.length = 0;
  u.gatherNode = null; u.attackTarget = null;
  u.tradeHome = home;
  u.tradeDest = dest;
  u.tradeLoaded = 0;
  u.cargo.visible = false;
  u.approachTries = 0;
  setMoveTarget(u, approachPoint(dest, u.position));
  setUnitState(u, STATE.TRADING);
  return true;
}

/* Torna a fer el model d'una unitat (p. ex. en triar la civilització) conservant-ne l'estat */
function rebuildUnitModel(u) {
  const old = u.model;
  const inOld = new Set();
  old.traverse(o => inOld.add(o));
  state.pickables = state.pickables.filter(m => !inOld.has(m));
  u.group.remove(old);
  const model = buildUnitVisual(u, u.subtype, u.team);
  u.group.add(model);
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.userData.entity = u;
    state.pickables.push(o);
  });
  setUnitState(u, u.state);
  if (u.carryMesh.isMesh) updateCarryVisual(u);
  if (u.cargo) u.cargo.visible = u.tradeLoaded > 0;
  u.group.updateMatrixWorld(true);
}

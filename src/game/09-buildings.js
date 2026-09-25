/* =====================================================================
   EDIFICIS CONSTRUÏBLES
   ===================================================================== */
function bx(g, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function cy(g, rt, rb, h, seg, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/* Alçada màxima dels models de la biblioteca, perquè les proporcions entre edificis siguin creïbles */
const LIB_MAX_HEIGHT = { watchtower: 8.5, house: 4.8, mill: 7 };
const TC_SIZE = [13.5, 13.5];

/* Retorna { model, height } per a cada tipus d'edifici. El model mira cap a +Z.
   Prioritat: model de la biblioteca (assets/models) → kit d'estil AoE II segons la civilització */
function makeBuildingModel(type, team = PLAYER.id, arch = null) {
  const [fw, fd] = type === 'towncenter' ? TC_SIZE : CONFIG.BUILDINGS[type].size;
  const lib = libraryModel('buildings/' + type, team, { w: fw * 0.96, d: fd * 0.96, maxH: LIB_MAX_HEIGHT[type] });
  if (lib) return { model: lib, height: lib.userData.height };
  const kit = kitBuildingModel(type, team, arch);
  if (kit && type === 'watchtower' && teamOf(team).mods.towerLevel) {
    // Torres millorades: més grans (el contenidor manté l'escala mentre es construeix)
    const s = TOWER_LEVELS[teamOf(team).mods.towerLevel].scale;
    const wrap = new THREE.Group();
    kit.model.scale.setScalar(s);
    wrap.add(kit.model);
    return { model: wrap, height: kit.height * s };
  }
  if (kit) return kit;
  const g = new THREE.Group();
  bx(g, fw * 0.9, 2, fd * 0.9, mat(teamOf(team).color), 0, 1, 0);
  return { model: g, height: 2 };
}
/* Torres: nivell (Torre de guaita → Torre de guàrdia → Torrassa) */
const TOWER_LEVELS = [{ name: 'Torre de guaita', hp: 1, scale: 1 }, { name: 'Torre de guàrdia', hp: 1.7, scale: 1.1 }, { name: 'Torrassa', hp: 3.2, scale: 1.22 }];
function upgradeTower(b) {
  const L = TOWER_LEVELS[teamOf(b.team).mods.towerLevel];
  const newMax = Math.round(b.def.hp * L.hp * teamOf(b.team).mods.buildingHpMul);
  b.hp = Math.round(b.hp * newMax / b.maxHp);
  b.maxHp = newMax;
  b.name = L.name;
  rebuildBuildingModel(b);
}
/* Aplica una millora de resistència (Maçoneria) a un edifici existent */
const isStoneWall = (b) => b.subtype === 'stonewall' || b.subtype === 'gate';
function applyBuildingMods(b, mul) {
  b.maxHp = Math.round(b.maxHp * mul);
  b.hp = Math.round(b.hp * mul);
  b.armor = (b.armor || [0, 0]).map(a => a + 1);
}
/* Torna a fer el model d'un edifici (p. ex. en triar la civilització) conservant l'estat */
function rebuildBuildingModel(b) {
  const { model, height } = makeBuildingModel(b.subtype, b.team, b.visArch);
  if (b.rot) model.rotation.y = Math.PI / 2;
  replaceEntityModel(b, model);
  b.height = height;
  if (b.kind === 'building' && b.def) applyConstructionVisual(b);
}
/* Substitueix e.model per un de nou i actualitza els objectes seleccionables */
function replaceEntityModel(e, model) {
  const old = e.model;
  if (old) {
    const inOld = new Set();
    old.traverse(o => inOld.add(o));
    state.pickables = state.pickables.filter(m => !inOld.has(m));
    old.parent && old.parent.remove(old);
  }
  e.model = model;
  e.group.add(model);
  model.traverse(o => {
    if (!o.isMesh) return;
    if (!o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
    if (!o.userData.noPick) { o.userData.entity = e; state.pickables.push(o); }
  });
  e.group.updateMatrixWorld(true);
}

function makeScaffold(w, d, h) {
  const g = new THREE.Group();
  const pole = mat(0xa0784a, { roughness: 0.95 });
  bx(g, w - 0.1, 0.05, d - 0.1, mat(0x8b7355, { roughness: 1 }), 0, 0.03, 0);
  const hw = w / 2 - 0.15, hd = d / 2 - 0.15;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.06, 0.06, h, 5, pole, sx * hw, h / 2, sz * hd);
  for (const y of [h * 0.35, h * 0.72]) {
    for (const sz of [-1, 1]) bx(g, w - 0.3, 0.07, 0.07, pole, 0, y, sz * hd);
    for (const sx of [-1, 1]) bx(g, 0.07, 0.07, d - 0.3, pole, sx * hw, y, 0);
  }
  return g;
}

function sizeOf(type, rot = 0) {
  const [w, d] = CONFIG.BUILDINGS[type].size;
  return rot ? [d, w] : [w, d];
}
function createBuilding(type, x, z, complete = false, team = PLAYER.id, rot = 0) {
  const def = CONFIG.BUILDINGS[type];
  const [sw, sd] = sizeOf(type, rot);
  const e = new Entity({
    kind: 'building', subtype: type, name: def.name, icon: def.icon, team,
    radius: Math.max(sw, sd) / 2, selRadius: Math.max(sw, sd) * 0.62, hp: 1, maxHp: def.hp,
  });
  e.def = def;
  const M = teamOf(team).mods;
  e.maxHp = Math.round(def.hp * M.buildingHpMul * (type === 'watchtower' ? TOWER_LEVELS[M.towerLevel].hp : 1) * (type === 'stonewall' || type === 'gate' ? M.wallHpMul : 1));
  if (type === 'watchtower') e.name = TOWER_LEVELS[M.towerLevel].name;
  e.armor = (def.armor || [2, 6]).map(a => a + M.buildingArmor + ((type === 'stonewall' || type === 'gate') && M.wallHpMul > 1 ? 1 : 0));
  e.los = (def.los || 8) + (def.arrows ? (civOf(team).mods.towerLos || 0) : 0);
  if (def.trains || Object.values(CONFIG.TECHS).some(t => t.at === type)) e.trainQueue = [];
  if (def.trains) e.rally = null;
  e.footprint = (def.walkable || def.wall || def.gate) ? { hw: sw / 2, hd: sd / 2 } : { hw: sw / 2 - 0.15, hd: sd / 2 - 0.15 };
  e.isWall = !!def.wall;
  e.rot = rot;
  e.cells = { w: sw, d: sd };
  e.underConstruction = !complete;
  e.progress = complete ? 1 : 0;
  e.dropoffTypes = def.dropoff || null;
  const { model, height } = makeBuildingModel(type, team);
  e.model = model;
  e.height = height;
  if (rot) model.rotation.y = Math.PI / 2;
  e.group.add(model);
  if (type !== 'farm' && !def.wall && !def.gate) {
    e.scaffold = makeScaffold(sw, sd, Math.max(1.5, height * 0.9));
    e.group.add(e.scaffold);
  }
  e.group.position.set(x, 0, z);
  e.finalize();
  state.buildings.push(e);
  if (!def.walkable) {
    e.obstacle = { x, z, hw: e.footprint.hw, hd: e.footprint.hd, rect: true, entity: e, gateTeam: def.gate ? team : 0 };
    state.obstacles.push(e.obstacle);
  }
  hideDecorIn(x, z, sw / 2 + 0.3, sd / 2 + 0.3);
  if (def.dock) { /* sobre l'aigua: no es pinta el terreny */ }
  else if (def.wall || def.gate) groundPaintRect(x, z, sw + 0.6, sd + 0.6, 'dirt', 0.35);
  else groundPaintRect(x, z, sw + 1.2, sd + 1.2, 'dirt', type === 'farm' ? 0.4 : 0.65);
  applyConstructionVisual(e);
  if (!createBuilding.batch) rebuildNav();
  if (complete) completeBuilding(e, true);
  return e;
}

function applyConstructionVisual(b) {
  const f = b.progress;
  b.model.scale.y = 0.04 + 0.96 * f;
  if (b.scaffold) b.scaffold.visible = b.underConstruction;
  b.hp = Math.max(1, Math.round(b.maxHp * (0.1 + 0.9 * f)));
}

function completeBuilding(b, silent = false) {
  b.underConstruction = false;
  b.progress = 1;
  applyConstructionVisual(b);
  b.hp = b.maxHp;
  if (b.subtype === 'farm') {
    // La granja acabada passa a ser un recurs d'aliment (propi i trepitjable)
    b.kind = 'resource';
    b.resourceType = 'food';
    b.amount = b.maxAmount = b.def.food + teamOf(b.team).mods.farmBonus;
    b.depleted = false;
    b.shakeT = 0;
    b.particleColor = 0x7a5a32;
    state.buildings = state.buildings.filter(x => x !== b);
    state.resourceNodes.push(b);
  }
  if (!silent && b.isOwn && !b.isWall) {
    toast(`🏗️ ${b.name} completat${b.def.pop ? ` (+${b.def.pop} població)` : ''}`);
    spawnParticles(new THREE.Vector3(b.position.x, 1.2, b.position.z), 0xc8b28a, 14, null);
  }
  updatePopulationUI();
  if (b.selected) updateSelectionUI();
}

/* Progrés de construcció: com a l'AoE II, cada constructor extra aporta menys (3/(n+2)) */
function updateConstruction(dt) {
  for (const b of state.buildings.slice()) {
    if (b.model && b.model.userData.blades && !b.underConstruction) b.model.userData.blades.rotation.z -= dt * 0.9;
    if (b.model && b.model.userData.doors && !b.underConstruction) {
      const near = state.units.some(u => u.team === b.team && !u.garrisoned && hDist(u.position, b.position) < 3.2);
      b.doorOpen = THREE.MathUtils.damp(b.doorOpen || 0, near ? 1 : 0, 6, dt);
      b.model.userData.doors[0].rotation.y = -b.doorOpen * 1.45;
      b.model.userData.doors[1].rotation.y = b.doorOpen * 1.45;
    }
    if (!b.underConstruction) continue;
    let n = 0;
    for (const u of state.units) if (u.state === STATE.BUILDING && u.buildTarget === b) n++;
    if (!n) continue;
    b.progress = Math.min(1, b.progress + (dt / b.def.time) * n * 3 / (n + 2) * teamOf(b.team).mods.buildSpeed);
    applyConstructionVisual(b);
    if (b.progress >= 1) completeBuilding(b);
  }
}

/* Enderrocar un edifici propi (un fonament sense començar retorna tot el cost) */
function demolishBuilding(b) {
  if (!b || b.subtype === 'towncenter' || !b.isOwn || b.dead) return;
  if (b.underConstruction && b.progress < 0.02) applyCost(costFor(b.subtype, b.team), +1, b.team);
  if (b.garrison && b.garrison.length) ungarrison(b);
  buildingDropRelics(b);
  b.dead = true;
  b.depleted = true;
  state.buildings = state.buildings.filter(x => x !== b);
  state.resourceNodes = state.resourceNodes.filter(x => x !== b);
  state.obstacles = state.obstacles.filter(o => o.entity !== b);
  state.pickables = state.pickables.filter(m => m.userData.entity !== b);
  if (b.selected) { removeFromSelection(b); onSelectionChanged(); }
  b.dieT = 0;
  b.deathKind = 'building';
  state.dying.push(b);
  spawnParticles(new THREE.Vector3(b.position.x, 1.0, b.position.z), 0x9b958a, 16, null);
  rebuildNav();
  updatePopulationUI();
  toast(`🗑️ ${b.name} enderrocat`);
}

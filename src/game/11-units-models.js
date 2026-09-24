/* ---------- Aldeà ---------- */
const villagerGeo = {
  leg: new THREE.CylinderGeometry(0.11, 0.1, 0.72, 8).translate(0, -0.36, 0),
  arm: new THREE.CylinderGeometry(0.085, 0.07, 0.62, 8).translate(0, -0.31, 0),
  torso: new THREE.CylinderGeometry(0.3, 0.4, 0.86, 12),
  belt: new THREE.CylinderGeometry(0.41, 0.41, 0.1, 12),
  head: new THREE.SphereGeometry(0.26, 14, 12),
  brim: new THREE.CylinderGeometry(0.46, 0.46, 0.05, 18),
  crown: new THREE.ConeGeometry(0.28, 0.3, 14),
  band: new THREE.CylinderGeometry(0.27, 0.27, 0.07, 14),
  hit: new THREE.CylinderGeometry(0.62, 0.62, 2.4, 8),
  toolHandle: new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6),
  axeHead: new THREE.BoxGeometry(0.05, 0.3, 0.22),
  pickHead: new THREE.BoxGeometry(0.06, 0.5, 0.07),
  hammerHead: new THREE.BoxGeometry(0.14, 0.14, 0.26),
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
  e.reload = d.reload;
  const ma = cat === 'villager' ? M.villagerArmor : (M.armor[cat] || [0, 0]);
  e.armor = [d.armor[0] + ma[0], d.armor[1] + ma[1]];
  e.los = d.los;
  e.vsBuilding = d.vsBuilding || 0;
  e.bonusCav = d.bonusCav || 0;
  const newMax = d.hp + (cat === 'villager' ? M.villagerHp : 0);
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

  const model = new THREE.Group();
  const clothes = mat(teamOf(team).color, { roughness: 0.7 });
  const pants = mat(0x3b2a1c, { roughness: 0.9 });
  const skin = mat(0xf1c27d, { roughness: 0.8 });
  const straw = mat(0xd9b35b, { roughness: 0.9 });
  const leather = mat(0x5a3a1e, { roughness: 0.85 });

  const legL = new THREE.Mesh(villagerGeo.leg, pants); legL.position.set(-0.15, 0.72, 0);
  const legR = new THREE.Mesh(villagerGeo.leg, pants); legR.position.set(0.15, 0.72, 0);
  const torso = new THREE.Mesh(villagerGeo.torso, clothes); torso.position.y = 1.15;
  const belt = new THREE.Mesh(villagerGeo.belt, leather); belt.position.y = 0.82;
  const armL = new THREE.Mesh(villagerGeo.arm, clothes); armL.position.set(-0.4, 1.52, 0); armL.rotation.z = -0.12;
  const armR = new THREE.Mesh(villagerGeo.arm, clothes); armR.position.set(0.4, 1.52, 0); armR.rotation.z = 0.12;
  const head = new THREE.Mesh(villagerGeo.head, skin); head.position.y = 1.84;
  const brim = new THREE.Mesh(villagerGeo.brim, straw); brim.position.y = 2.03;
  const crown = new THREE.Mesh(villagerGeo.crown, straw); crown.position.y = 2.2;
  const band = new THREE.Mesh(villagerGeo.band, clothes); band.position.y = 2.09;
  model.add(legL, legR, torso, belt, armL, armR, head, brim, crown, band);

  // Eina a la mà dreta (destral per a fusta, pic per a or) – visible només treballant
  const tool = new THREE.Group();
  const handle = new THREE.Mesh(villagerGeo.toolHandle, mat(0x6b4423, { roughness: 0.9 }));
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.3;
  const axeHead = new THREE.Mesh(villagerGeo.axeHead, mat(0xb8bcc4, { metalness: 0.8, roughness: 0.35 }));
  axeHead.position.set(0, 0.1, 0.66);
  const pickHead = new THREE.Mesh(villagerGeo.pickHead, mat(0x8d9199, { metalness: 0.8, roughness: 0.35 }));
  pickHead.position.set(0, 0, 0.68);
  const hammerHead = new THREE.Mesh(villagerGeo.hammerHead, mat(0x55504a, { metalness: 0.6, roughness: 0.4 }));
  hammerHead.position.set(0, 0, 0.7);
  hammerHead.visible = false;
  tool.add(handle, axeHead, pickHead, hammerHead);
  tool.position.set(0, -0.58, 0);
  tool.visible = false;
  armR.add(tool);

  // Cub de càrrega sobre el cap (indica que l'aldeà va carregat)
  const carryMesh = new THREE.Mesh(villagerGeo.carry, mat(0x8b5a2b));
  carryMesh.position.y = 2.72;
  carryMesh.visible = false;
  model.add(carryMesh);

  const hit = new THREE.Mesh(villagerGeo.hit, hitMaterial);
  hit.position.y = 1.2;
  hit.userData.noShadow = true;

  e.group.add(model, hit);
  e.model = model;
  e.legs = [legL, legR];
  e.arms = [armL, armR];
  e.tool = tool;
  e.axeHead = axeHead;
  e.pickHead = pickHead;
  e.hammerHead = hammerHead;
  e.carryMesh = carryMesh;
  e.group.position.set(x, 0, z);
  e.finalize();
  state.units.push(e);
  return e;
}

/* ---------- Soldats: Milícia, Llancer, Arquer, Explorador i Cavaller ---------- */
const cavalryGeo = {
  body: new THREE.SphereGeometry(0.55, 14, 10),
  neck: new THREE.CylinderGeometry(0.17, 0.24, 0.8, 8),
  head: new THREE.BoxGeometry(0.24, 0.26, 0.6),
  mane: new THREE.BoxGeometry(0.06, 0.75, 0.18),
  blanket: new THREE.BoxGeometry(0.9, 0.08, 0.9),
  leg: new THREE.CylinderGeometry(0.08, 0.06, 1.0, 6).translate(0, -0.5, 0),
  hit: new THREE.CylinderGeometry(0.9, 0.9, 3.2, 8),
};
const soldierGeo = {
  helmet: new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  nasal: new THREE.BoxGeometry(0.05, 0.16, 0.05),
  blade: new THREE.BoxGeometry(0.06, 0.75, 0.02),
  guard: new THREE.BoxGeometry(0.26, 0.05, 0.06),
  shield: new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14),
  spear: new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6),
  spearTip: new THREE.ConeGeometry(0.06, 0.25, 6),
  bow: new THREE.TorusGeometry(0.5, 0.025, 5, 16, Math.PI),
  quiver: new THREE.CylinderGeometry(0.1, 0.09, 0.6, 8),
  hood: new THREE.ConeGeometry(0.3, 0.4, 10),
};
function createSoldier(kind, x, z, team = PLAYER.id) {
  const d = CONFIG.UNITS[kind];
  const T = teamOf(team);
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
  // Objectes buits perquè la lògica compartida amb els aldeans funcioni
  e.tool = { visible: false }; e.axeHead = { visible: false }; e.pickHead = { visible: false }; e.hammerHead = { visible: false };
  e.carryMesh = { visible: false };

  const model = new THREE.Group();
  const clothes = mat(T.color, { roughness: 0.7 });
  const dark = mat(T.colorDark, { roughness: 0.7 });
  const pants = mat(0x3b2a1c, { roughness: 0.9 });
  const skin = mat(0xf1c27d, { roughness: 0.8 });
  const metal = mat(0xa8adb5, { metalness: 0.8, roughness: 0.3 });
  const wood = mat(0x6b4423, { roughness: 0.9 });
  const legL = new THREE.Mesh(villagerGeo.leg, pants); legL.position.set(-0.15, 0.72, 0);
  const legR = new THREE.Mesh(villagerGeo.leg, pants); legR.position.set(0.15, 0.72, 0);
  const torso = new THREE.Mesh(villagerGeo.torso, kind === 'militia' ? metal : clothes); torso.position.y = 1.15;
  const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.08), clothes); tabard.position.set(0, 1.12, 0.33);
  const belt = new THREE.Mesh(villagerGeo.belt, dark); belt.position.y = 0.82;
  const armL = new THREE.Mesh(villagerGeo.arm, clothes); armL.position.set(-0.4, 1.52, 0); armL.rotation.z = -0.12;
  const armR = new THREE.Mesh(villagerGeo.arm, clothes); armR.position.set(0.4, 1.52, 0); armR.rotation.z = 0.12;
  const head = new THREE.Mesh(villagerGeo.head, skin); head.position.y = 1.84;
  model.add(legL, legR, torso, tabard, belt, armL, armR, head);
  if (kind === 'archer') {
    const hood = new THREE.Mesh(soldierGeo.hood, dark); hood.position.y = 2.12;
    const bow = new THREE.Mesh(soldierGeo.bow, wood); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, -0.55, 0.15);
    armL.add(bow);
    const quiver = new THREE.Mesh(soldierGeo.quiver, mat(0x5a3a1e)); quiver.position.set(0.15, 1.35, -0.35); quiver.rotation.x = 0.3;
    model.add(hood, quiver);
  } else {
    const helmet = new THREE.Mesh(soldierGeo.helmet, metal); helmet.position.y = 1.88;
    const nasal = new THREE.Mesh(soldierGeo.nasal, metal); nasal.position.set(0, 1.86, 0.27);
    model.add(helmet, nasal);
  }
  if (kind === 'militia') {
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(soldierGeo.blade, metal); blade.position.y = 0.42;
    const guard = new THREE.Mesh(soldierGeo.guard, wood);
    sword.add(blade, guard);
    sword.rotation.x = Math.PI / 2;
    sword.position.set(0, -0.58, 0.05);
    armR.add(sword);
    const shield = new THREE.Mesh(soldierGeo.shield, clothes);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.1, -0.35, 0.05);
    armL.add(shield);
  }
  if (kind === 'spearman') {
    const spear = new THREE.Group();
    const shaft = new THREE.Mesh(soldierGeo.spear, wood);
    const tip = new THREE.Mesh(soldierGeo.spearTip, metal); tip.position.y = 1.3;
    spear.add(shaft, tip);
    spear.rotation.x = Math.PI / 2 - 0.25;
    spear.position.set(0, -0.58, 0.4);
    armR.add(spear);
  }
  if (d.cat === 'cavalry') {
    // Genet sobre un cavall: les cames del genet s'amaguen i el cos puja
    legL.visible = legR.visible = false;
    const rider = [torso, tabard, belt, armL, armR, head];
    model.children.filter(c => !rider.includes(c) && c !== legL && c !== legR).forEach(c => rider.push(c));
    const riderGroup = new THREE.Group();
    rider.forEach(c => { model.remove(c); riderGroup.add(c); });
    riderGroup.position.y = 0.72;
    model.add(riderGroup);
    const coat = mat(kind === 'knight' ? 0x3b2a20 : 0x8a5a32, { roughness: 0.8 });
    const horse = new THREE.Group();
    const body = new THREE.Mesh(cavalryGeo.body, coat); body.position.set(0, 1.25, 0); body.scale.set(0.75, 0.8, 1.6);
    const neck = new THREE.Mesh(cavalryGeo.neck, coat); neck.position.set(0, 1.75, 0.85); neck.rotation.x = 0.6;
    const hhead = new THREE.Mesh(cavalryGeo.head, coat); hhead.position.set(0, 2.05, 1.2); hhead.rotation.x = 0.9;
    const mane = new THREE.Mesh(cavalryGeo.mane, mat(0x1c1410)); mane.position.set(0, 1.9, 0.75); mane.rotation.x = 0.6;
    const blanket = new THREE.Mesh(cavalryGeo.blanket, clothes); blanket.position.set(0, 1.62, -0.05);
    horse.add(body, neck, hhead, mane, blanket);
    const hlegs = [];
    for (const [lx, lz] of [[-0.25, 0.65], [0.25, -0.65], [0.25, 0.65], [-0.25, -0.65]]) {
      const leg = new THREE.Mesh(cavalryGeo.leg, coat);
      leg.position.set(lx, 1.0, lz);
      horse.add(leg);
      hlegs.push(leg);
    }
    model.add(horse);
    if (kind === 'knight') {
      const lance = new THREE.Group();
      const shaft = new THREE.Mesh(soldierGeo.spear, wood);
      const tip = new THREE.Mesh(soldierGeo.spearTip, metal); tip.position.y = 1.3;
      lance.add(shaft, tip);
      lance.rotation.x = Math.PI / 2 - 0.15;
      lance.position.set(0, -0.58, 0.6);
      armR.add(lance);
      const shield = new THREE.Mesh(soldierGeo.shield, clothes);
      shield.rotation.z = Math.PI / 2;
      shield.position.set(-0.1, -0.35, 0.05);
      armL.add(shield);
      torso.material = metal;
    } else {
      const sword = new THREE.Mesh(soldierGeo.blade, metal);
      sword.rotation.x = Math.PI / 2;
      sword.position.set(0, -0.58, 0.4);
      armR.add(sword);
    }
    e.legs = hlegs;
    e.radius = 0.75;
  }
  const hit = new THREE.Mesh(d.cat === 'cavalry' ? cavalryGeo.hit : villagerGeo.hit, hitMaterial);
  hit.position.y = d.cat === 'cavalry' ? 1.6 : 1.2;
  hit.userData.noShadow = true;
  e.group.add(model, hit);
  e.model = model;
  if (!e.legs) e.legs = [legL, legR];
  e.arms = [armL, armR];
  e.group.position.set(x, 0, z);
  e.finalize();
  state.units.push(e);
  return e;
}

/* ---------- Carro de comerç (bou + carro) ---------- */
function createTradeCart(x, z, team = PLAYER.id) {
  const d = CONFIG.UNITS.tradecart;
  const T = teamOf(team);
  const e = new Entity({ kind: 'unit', subtype: 'tradecart', name: d.name, icon: d.icon, team, radius: 0.8, selRadius: 1.3, hp: d.hp, maxHp: d.hp });
  applyUnitStats(e, 'tradecart');
  Object.assign(e, {
    target: null, path: null, walkPhase: rand() * 10, spawnT: 1, state: STATE.IDLE, orderQueue: [],
    gatherNode: null, dropTarget: null, buildTarget: null, buildAngle: null, gatherAngle: null, approachTries: 0,
    lastResourceType: null, lastNodePos: new THREE.Vector3(), carry: { type: null, amount: 0 }, workPhase: 0,
    tool: { visible: false }, axeHead: { visible: false }, pickHead: { visible: false }, hammerHead: { visible: false },
    carryMesh: { visible: false }, tradeHome: null, tradeDest: null, tradeLoaded: 0,
  });
  e.radius = 0.8;
  const model = new THREE.Group();
  const hide = mat(0x7a5230, { roughness: 0.85 });
  const wood = mat(0x8a5a32, { roughness: 0.9 });
  // Bou
  const body = new THREE.Mesh(cavalryGeo.body, hide); body.position.set(0, 0.95, 1.15); body.scale.set(0.8, 0.75, 1.3);
  const head = new THREE.Mesh(cavalryGeo.head, hide); head.position.set(0, 1.1, 1.95); head.rotation.x = 0.3;
  const horns = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), mat(0xe8dcc0)); horns.position.set(0, 1.3, 1.9);
  model.add(body, head, horns);
  const legs = [];
  for (const [lx, lz] of [[-0.25, 1.6], [0.25, 0.7], [0.25, 1.6], [-0.25, 0.7]]) {
    const leg = new THREE.Mesh(cavalryGeo.leg, hide);
    leg.position.set(lx, 0.8, lz);
    leg.scale.y = 0.8;
    model.add(leg);
    legs.push(leg);
  }
  // Carro
  bx(model, 1.3, 0.12, 1.8, wood, 0, 0.95, -0.55);
  for (const sx of [-1, 1]) bx(model, 0.08, 0.45, 1.8, wood, sx * 0.62, 1.2, -0.55);
  bx(model, 1.3, 0.45, 0.08, wood, 0, 1.2, -1.42);
  for (const sx of [-1, 1]) {
    const w = cy(model, 0.5, 0.5, 0.1, 14, mat(0x5a3a1e), sx * 0.75, 0.5, -0.55);
    w.rotation.z = Math.PI / 2;
  }
  bx(model, 0.06, 0.06, 1.0, wood, 0, 0.9, 0.55);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.6, 12, 1, true, 0, Math.PI), mat(T.color, { side: THREE.DoubleSide, roughness: 0.8 }));
  // Mig cilindre: eix al llarg del carro (Z) i obertura cap avall
  cover.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  cover.position.set(0, 1.25, -0.55);
  model.add(cover);
  const cargo = new THREE.Group();
  for (let i = 0; i < 3; i++) bx(cargo, 0.35, 0.3, 0.35, CARRY_MATERIALS.gold, -0.3 + i * 0.3, 1.2, -0.3 - (i % 2) * 0.4);
  cargo.visible = false;
  model.add(cargo);
  const hit = new THREE.Mesh(cavalryGeo.hit, hitMaterial);
  hit.position.y = 1.2;
  hit.userData.noShadow = true;
  e.group.add(model, hit);
  e.model = model;
  e.cargo = cargo;
  e.legs = legs;
  e.arms = [new THREE.Object3D(), new THREE.Object3D()];
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

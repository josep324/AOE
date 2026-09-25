/* =====================================================================
   CREACIÓ D'ALDEANS DES DEL CENTRE DE CIUTAT
   ===================================================================== */
function findSpawnSpot(building) {
  if (building.def && building.def.dock) return findWaterSpot(building);
  const base = (building.footprint ? Math.max(building.footprint.hw, building.footprint.hd) : building.radius) + 1.3;
  for (let ring = 0; ring < 8; ring++) {
    const r = base + ring * 1.4;
    const n = Math.max(8, Math.floor((2 * Math.PI * r) / 1.4));
    for (let i = 0; i < n; i++) {
      // Comencem davant la porta (+Z) i alternem esquerra/dreta
      const step = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
      const a = step * (2 * Math.PI / n);
      const x = building.position.x + Math.sin(a) * r;
      const z = building.position.z + Math.cos(a) * r;
      if (Math.abs(x) > CONFIG.MAP_LIMIT || Math.abs(z) > CONFIG.MAP_LIMIT) continue;
      if (isNearObstacle(x, z, CONFIG.VILLAGER.radius + 0.2)) continue;
      let blocked = false;
      for (const u of state.units) {
        const tx = u.target ? u.target.x : u.position.x;
        const tz = u.target ? u.target.z : u.position.z;
        if ((u.position.x - x) ** 2 + (u.position.z - z) ** 2 < 1.3 ** 2 || (tx - x) ** 2 + (tz - z) ** 2 < 1.3 ** 2) { blocked = true; break; }
      }
      if (!blocked) return { x, z, angle: a };
    }
  }
  return { x: building.position.x, z: building.position.z + base, angle: 0 };
}

function resOf(team) { return teamOf(team).res; }
function canAfford(cost, team = PLAYER.id) {
  const r = resOf(team);
  return Object.entries(cost).every(([k, v]) => r[k] >= v);
}
function applyCost(cost, sign = -1, team = PLAYER.id) {
  const r = resOf(team);
  for (const [k, v] of Object.entries(cost)) r[k] += sign * v;
  if (team === PLAYER.id) updateResourcesUI();
}
/* Cost d'un edifici, unitat o tecnologia per a un equip (bonificacions de civilització incloses) */
function costFor(kind, team = PLAYER.id) {
  const def = CONFIG.BUILDINGS[kind] || CONFIG.UNITS[kind] || CONFIG.TECHS[kind];
  const base = (def && def.cost) || {};
  const C = CIVS[teamOf(team).civ];
  const m = C && C.mods.cost ? C.mods.cost[kind] : undefined;
  if (m === undefined) return base;
  if (typeof m === 'number') return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * m)]));
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.max(0, v + (m[k] || 0))]));
}
/* Unitat única de la civilització d'un equip */
function uniqueUnitOf(team) { return (CIVS[teamOf(team).civ] || CIVS.franks).unique; }
function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${RES_ICON[k]} ${v}`).join(' ');
}
function popCap(team = PLAYER.id) {
  let cap = 0;
  for (const b of state.buildings) {
    if (b.team !== team || b.underConstruction) continue;
    cap += b.subtype === 'towncenter' ? CONFIG.TC_POP : ((b.def && b.def.pop) || 0);
  }
  return Math.min(CONFIG.POP_CAP, cap);
}
function unitCount(team = PLAYER.id) {
  let n = 0;
  for (const u of state.units) if (u.team === team) n++;
  return n;
}
function popUsed(team = PLAYER.id) {
  let queued = 0;
  for (const b of state.buildings) if (b.team === team && b.trainQueue) for (const it of b.trainQueue) if (!isTech(it.kind)) queued++;
  return unitCount(team) + queued;
}

function itemDef(kind) { return CONFIG.UNITS[kind] || CONFIG.TECHS[kind]; }
function isTech(kind) { return !!CONFIG.TECHS[kind]; }
function techQueued(team, kind) {
  return state.buildings.some(b => b.team === team && b.trainQueue && b.trainQueue.some(it => it.kind === kind));
}
function distinctBuilt(team, list) {
  // El Castell compta per dos (com a l'AoE II)
  return list.filter(t => hasCompleted(t, team)).length + (list.includes('castle') && hasCompleted('castle', team) ? 1 : 0);
}
/* Nivell actual d'una línia d'unitats (p. ex. milícia → espadatxí) per a un equip */
function currentKind(team, kind) {
  const d = CONFIG.UNITS[kind];
  if (!d) return kind;
  return teamOf(team).mods.lineKind[d.line || kind] || kind;
}
/* Motiu pel qual no es pot encuar (o null) */
function itemBlockReason(kind, team = PLAYER.id) {
  const d = itemDef(kind), T = teamOf(team);
  if ((d.age || 0) > T.age) return `Requereix: ${CONFIG.AGES[d.age].name}`;
  const onlyFor = d.civ || d.unique;
  if (onlyFor && onlyFor !== T.civ) return `Només per als ${CIVS[onlyFor].name}`;
  if (d.requires && !T.techs.has(d.requires)) return `Cal investigar abans: ${CONFIG.TECHS[d.requires].name}`;
  if (d.requiresTech && !T.techs.has(d.requiresTech)) return `Cal investigar abans: ${CONFIG.TECHS[d.requiresTech].name}`;
  if (isTech(kind)) {
    if (T.techs.has(kind)) return 'Ja investigada';
    if (techQueued(team, kind)) return 'En investigació';
    if (d.ageUp) {
      if (T.age !== d.ageUp - 1) return 'No disponible';
      const req = CONFIG.AGES[d.ageUp].req;
      if (distinctBuilt(team, req) < 2) {
        return `Cal tenir 2 d'aquests edificis: ${req.map(r => CONFIG.BUILDINGS[r].name).join(', ')}`;
      }
    }
  }
  if (!canAfford(costFor(kind, team), team)) return `Recursos insuficients: cal ${costText(costFor(kind, team))}`;
  return null;
}

/* Afegeix una unitat o tecnologia a la cua d'un edifici (el cost es paga en encuar) */
/* Cua de granges del Molí (com a l'AoE II): es paguen ara i es resembren soles quan una s'esgota */
const FARM_QUEUE_MAX = 40;
function queueFarm(team, n = 1) {
  const T = teamOf(team), cost = costFor('farm', team);
  let added = 0;
  for (let i = 0; i < n && (T.farmQueue || 0) < FARM_QUEUE_MAX && canAfford(cost, team); i++) {
    applyCost(cost, -1, team);
    T.farmQueue = (T.farmQueue || 0) + 1;
    added++;
  }
  if (team === PLAYER.id) {
    if (!added) toast(canAfford(cost, team) ? 'La cua de granges és plena' : 'No tens prou fusta per a una granja');
    updateResourcesUI();
  }
  return added;
}
/* Treu una granja de la cua i en retorna el cost */
function unqueueFarm(team) {
  const T = teamOf(team);
  if (!T.farmQueue) return false;
  T.farmQueue--;
  applyCost(costFor('farm', team), 1, team);
  if (team === PLAYER.id) updateResourcesUI();
  return true;
}
function queueUnit(building, kind) {
  kind = currentKind(building.team, kind);
  const def = itemDef(kind);
  const own = building.team === PLAYER.id;
  if (!building.trainQueue || building.underConstruction || building.dead) return false;
  if (building.trainQueue.length >= CONFIG.QUEUE_MAX) { if (own) toast(`Cua plena (màxim ${CONFIG.QUEUE_MAX})`); return false; }
  const block = itemBlockReason(kind, building.team);
  if (block && !block.startsWith('Recursos')) { if (own) toast(block); return false; }
  const cost = costFor(kind, building.team);
  if (!canAfford(cost, building.team)) {
    if (own) {
      const r = resOf(building.team);
      const missing = Object.entries(cost).filter(([k, v]) => r[k] < v).map(([k]) => RES_LABEL[k].toLowerCase());
      toast(`Recursos insuficients: cal ${costText(cost)} (falta ${missing.join(', ')})`);
    }
    return false;
  }
  if (!isTech(kind) && popUsed(building.team) >= CONFIG.POP_CAP) { if (own) toast('Límit de població assolit'); return false; }
  applyCost(cost, -1, building.team);
  building.trainQueue.push({ kind, t: 0, paid: cost });
  if (state.selected.includes(building)) updateSelectionUI(true);
  return true;
}
function queueVillager(building) { return queueUnit(building, 'villager'); }

/* Aplica l'efecte d'una tecnologia a tot l'equip */
function applyTechEffect(team, kind) {
  const T = teamOf(team), M = T.mods, d = CONFIG.TECHS[kind];
  T.techs.add(kind);
  switch (kind) {
    case 'age1': case 'age2': case 'age3': T.age = d.ageUp; break;
    case 'handcart': M.villagerSpeed *= 1.1; M.capacity += 5; break;
    case 'bowsaw': M.gather.tree = (M.gather.tree || 1) * 1.2; break;
    case 'twomansaw': M.gather.tree = (M.gather.tree || 1) * 1.1; break;
    case 'goldshaft': M.gather.gold = (M.gather.gold || 1) * 1.15; break;
    case 'stoneshaft': M.gather.stone = (M.gather.stone || 1) * 1.15; break;
    case 'heavyplow': M.farmBonus += 125; break;
    case 'croprotation': M.farmBonus += 175; break;
    case 'paddedarcher': case 'leatherarcher': M.armor.archer = [M.armor.archer[0] + 1, M.armor.archer[1] + 1]; break;
    case 'ringarcher': M.armor.archer = [M.armor.archer[0] + 1, M.armor.archer[1] + 2]; break;
    case 'ironcasting': M.attack.infantry += 1; M.attack.cavalry += 1; break;
    case 'blastfurnace': M.attack.infantry += 2; M.attack.cavalry += 2; break;
    case 'bodkin': case 'bracer': M.attack.archer += 1; M.range.archer += TILE; M.buildingArrow += 1; break;
    case 'chainmail': M.armor.infantry = [M.armor.infantry[0] + 1, M.armor.infantry[1] + 1]; break;
    case 'platemail': M.armor.infantry = [M.armor.infantry[0] + 1, M.armor.infantry[1] + 2]; break;
    case 'chainbarding': M.armor.cavalry = [M.armor.cavalry[0] + 1, M.armor.cavalry[1] + 1]; break;
    case 'architecture': M.buildingHpMul *= 1.1; M.buildingArmor += 1; break;
    case 'treadmill': M.buildSpeed = 1.2; break;
    case 'chemistry': M.attack.archer += 1; M.buildingArrow += 1; break;
    case 'guardtower': M.towerLevel = 1; break;
    case 'keep': M.towerLevel = 2; break;
    case 'siegeengineers': M.range.siege = (M.range.siege || 0) + 1; M.siegeBldMul = 1.2; break;
    case 'loom': M.villagerHp += 15; M.villagerArmor = [M.villagerArmor[0] + 1, M.villagerArmor[1] + 2]; break;
    case 'wheelbarrow': M.villagerSpeed *= 1.1; M.capacity += 3; break;
    case 'doublebit': M.gather.tree = (M.gather.tree || 1) * 1.2; break;
    case 'goldmining': M.gather.gold = (M.gather.gold || 1) * 1.15; M.gather.stone = (M.gather.stone || 1) * 1.15; break;
    case 'horsecollar': M.farmBonus += 75; break;
    case 'reseed': M.autoReseed = true; break;
    case 'forging': M.attack.infantry += 1; M.attack.cavalry += 1; break;
    case 'fletching': M.attack.archer += 1; M.range.archer += TILE; M.buildingArrow += 1; break;
    case 'scalearmor': M.armor.infantry = [M.armor.infantry[0] + 1, M.armor.infantry[1] + 1]; break;
    case 'barding': M.armor.cavalry = [M.armor.cavalry[0] + 1, M.armor.cavalry[1] + 1]; break;
    case 'beardedaxe': M.unitRange.throwingaxe = (M.unitRange.throwingaxe || 0) + 1; break;
    case 'zealotry': M.unitHp.mameluke = (M.unitHp.mameluke || 0) + 20; break;
    case 'yasama': M.towerArrows += 2; break;
    case 'gillnets': M.shipGather *= 1.25; break;
    case 'careening': M.shipArmor += 1; M.transportCap += 5; break;
    case 'drydock': M.shipSpeed *= 1.15; break;
    case 'fervor': M.monkSpeed *= 1.15; break;
    case 'sanctity': M.monkHp += 15; break;
    case 'illumination': M.faithRegen *= 1.5; break;
    case 'blockprinting': M.convRange += 3; break;
    case 'redemption': case 'atonement': case 'faith': break;
    case 'masonry': M.buildingHpMul *= 1.1; M.buildingArmor += 1; break;
    case 'thumbring': M.reloadMul.archer = (M.reloadMul.archer || 1) / 1.18; M.perfectAim.archer = true; break;
    case 'ballistics': M.ballistics = true; break;
    case 'bloodlines': M.mountedHp += 20; break;
    case 'husbandry': M.mountedSpeed *= 1.1; break;
    case 'squires': M.speedMul.infantry = (M.speedMul.infantry || 1) * 1.1; break;
    case 'fortifiedwall': M.wallHpMul *= 1.6; break;
    case 'heresy': break;
    default:
      if (d.elite) M.elite[d.elite] = true;
      if (d.upgradeTo) M.lineKind[CONFIG.UNITS[d.upgradeTo].line] = d.upgradeTo;
  }
}
function completeTech(team, kind) {
  const d = CONFIG.TECHS[kind];
  applyTechEffect(team, kind);
  for (const u of state.units) if (u.team === team) { setUnitStats(u, u.unitKind); if (u.garrison && u.garrison.length) refreshContainer(u); }
  if (kind === 'masonry' || kind === 'architecture') for (const b of state.buildings) if (b.team === team) applyBuildingMods(b, 1.1);
  if (kind === 'fortifiedwall') for (const b of state.buildings) if (b.team === team && isStoneWall(b)) applyBuildingMods(b, 1.6);
  if (kind === 'guardtower' || kind === 'keep') for (const b of state.buildings) if (b.team === team && b.subtype === 'watchtower') upgradeTower(b);
  // Millora de línia: les unitats existents passen al nou nivell (estadístiques i aspecte)
  if (d.upgradeTo) {
    const line = CONFIG.UNITS[d.upgradeTo].line;
    for (const u of state.units) {
      if (u.team !== team || u.dead) continue;
      const ud = CONFIG.UNITS[u.unitKind];
      if ((ud.line || u.unitKind) !== line) continue;
      u.subtype = d.upgradeTo;
      u.icon = CONFIG.UNITS[d.upgradeTo].icon;
      setUnitStats(u, d.upgradeTo);
      if (!u.garrisoned) rebuildUnitModel(u);
    }
  }
  if (team === PLAYER.id) {
    toast(d.ageUp ? `🎉 Heu avançat a l'${d.name}!` : `🔬 Tecnologia investigada: ${d.name}`);
    updateAgeUI();
    updateSelectionUI();
  } else if (d.ageUp) {
    toast(`📜 L'enemic (${civOf(ENEMY.id).name}) ha avançat a l'${d.name}`);
  }
}

/* Cancel·la un element de la cua i en retorna el cost */
function cancelQueued(building, idx) {
  const item = building.trainQueue[idx];
  if (!item) return;
  building.trainQueue.splice(idx, 1);
  applyCost(item.paid || costFor(item.kind, building.team), +1, building.team);
  if (state.selected.includes(building)) updateSelectionUI(true);
}

function updateTraining(dt) {
  for (const b of state.buildings) {
    if (!b.trainQueue || !b.trainQueue.length) continue;
    const item = b.trainQueue[0];
    const def = itemDef(item.kind);
    if (b.underConstruction || b.dead) continue;
    item.blocked = !isTech(item.kind) && unitCount(b.team) >= popCap(b.team);
    if (item.blocked) {
      if (!item.warned && b.isOwn) { item.warned = true; toast('🏠 Població plena: construeix més cases'); }
      continue;
    }
    item.t += dt;
    if (item.t >= def.time) {
      b.trainQueue.shift();
      if (isTech(item.kind)) completeTech(b.team, item.kind);
      else spawnUnit(b, item.kind);
    }
  }
}

function spawnUnit(building, kind) {
  kind = currentKind(building.team, kind);
  const spot = findSpawnSpot(building);
  const v = kind === 'villager' ? createVillager(spot.x, spot.z, building.team)
    : kind === 'tradecart' ? createTradeCart(spot.x, spot.z, building.team)
    : createSoldier(kind, spot.x, spot.z, building.team);
  v.group.rotation.y = spot.angle;
  v.spawnT = 0;
  v.group.scale.setScalar(0.01);
  // Punt de reunió: si és un recurs, l'aldeà s'hi posa a treballar directament
  const rally = building.rally;
  if (rally) {
    if (rally.node && !rally.node.depleted && kind === 'villager') commandGather([v], rally.node);
    else orderMove(v, (rally.node ? rally.node.position : rally.point).clone().add(new THREE.Vector3(randRange(-1, 1), 0, randRange(-1, 1))));
  }
  if (building.isOwn) {
    toast(`${CONFIG.UNITS[kind].icon} Nova unitat: ${CONFIG.UNITS[kind].name}`);
    updatePopulationUI();
  }
  if (state.selected.includes(building)) updateSelectionUI(true);
  if (building.onSpawn) building.onSpawn(v);
  // El carro comença sol la ruta cap al mercat més llunyà
  if (kind === 'tradecart') {
    const far = markets(building.team).filter(m => m !== building).sort((a, b) => hDist(b.position, building.position) - hDist(a.position, building.position))[0];
    if (far) orderTrade(v, far);
    else if (building.isOwn) toast('🏪 Construeix un segon mercat lluny del primer per comerciar');
  }
  return v;
}

/* ---------- Bandera del punt de reunió ---------- */
const rallyFlag = (() => {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), mat(0x5a3a1e));
  pole.position.y = 1.3;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ color: PLAYER.colorLight, side: THREE.DoubleSide, emissive: 0x10306a }));
  cloth.position.set(0.47, 2.25, 0);
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: SEL_COLOR_OWN, fog: false, toneMapped: false }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.08;
  g.add(pole, cloth, base);
  g.visible = false;
  g.userData.cloth = cloth;
  scene.add(g);
  return g;
})();
function updateRallyFlag(t) {
  const b = state.selected.length === 1 ? state.selected[0] : null;
  const rally = b && (b.subtype === 'towncenter' || (b.def && b.def.trains)) ? b.rally : null;
  if (!rally) { rallyFlag.visible = false; return; }
  if (rally.node && rally.node.depleted) rally.node = null;
  const p = rally.node ? rally.node.position : rally.point;
  rallyFlag.visible = true;
  rallyFlag.position.set(p.x, groundY(p.x, p.z), p.z);
  rallyFlag.userData.cloth.rotation.y = Math.sin(t * 3) * 0.25;
}

/* ---------- Arbre ---------- */
function createTree(x, z, scale = 1) {
  const e = new Entity({ kind: 'resource', subtype: 'tree', name: 'Arbre', icon: '🌳', radius: 0.8 * scale, selRadius: 1.7 });
  e.resourceType = 'wood';
  e.amount = 100; e.maxAmount = 100;

  // Subgrup del model: permet sacsejar-lo o fer-lo caure sense moure l'anell de selecció
  e.model = makeTreeModel(x, z);
  e.group.add(e.model);
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  e.group.scale.setScalar(scale);
  groundPaint(x, z, 2.8 * scale, 'forest', 0.5);
  e.shakeT = 0;
  e.depleted = false;
  e.particleColor = 0x9a6a3a;
  swapModel(e, 'resources/tree', { w: 3.6 });
  e.finalize();

  state.resourceNodes.push(e);
  e.obstacle = { x, z, r: 0.8 * scale, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

/* ---------- Veta d'Or ---------- */
function createGoldMine(x, z) {
  const e = new Entity({ kind: 'resource', subtype: 'gold', name: "Veta d'Or", icon: '⛏️', radius: 2.3, selRadius: 3.1 });
  e.resourceType = 'gold';
  e.amount = 800; e.maxAmount = 800;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0xffd24a;
  e.model = new THREE.Group();
  e.nuggets = new THREE.Group();
  e.model.add(e.nuggets);
  e.group.add(e.model);

  const gm = makeMineModel('gold', x, z);
  e.model.add(gm.base);
  e.nuggets.add(gm.chunks);
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  groundPaint(x, z, 4.4, 'rock', 0.85);
  swapModel(e, 'resources/gold', { w: 4.6 });
  e.finalize();

  state.resourceNodes.push(e);
  state.obstacles.push({ x, z, r: 2.3, entity: e });
  return e;
}

/* ---------- Mina de Pedra ---------- */
function createStoneMine(x, z) {
  const e = new Entity({ kind: 'resource', subtype: 'stone', name: 'Mina de Pedra', icon: '🪨', radius: 2.2, selRadius: 3.0 });
  e.resourceType = 'stone';
  e.amount = 350; e.maxAmount = 350;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0xb4b4b4;
  e.model = new THREE.Group();
  e.nuggets = new THREE.Group();
  e.model.add(e.nuggets);
  e.group.add(e.model);

  const sm = makeMineModel('stone', x, z);
  e.model.add(sm.base);
  e.nuggets.add(sm.chunks);
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  groundPaint(x, z, 4.2, 'rock', 0.85);
  swapModel(e, 'resources/stone', { w: 4.4 });
  e.finalize();
  state.resourceNodes.push(e);
  e.obstacle = { x, z, r: 2.2, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

/* ---------- Arbust de baies ---------- */
function createBerryBush(x, z) {
  const e = new Entity({ kind: 'resource', subtype: 'berries', name: 'Arbust de baies', icon: '🫐', radius: 1.0, selRadius: 1.6 });
  e.resourceType = 'food';
  e.amount = 125; e.maxAmount = 125;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0xc2185b;
  e.model = new THREE.Group();
  e.group.add(e.model);
  const bt = bushTemplate(Math.floor(hash2(x * 1.7, z * 0.7) * 3));
  e.model.add(new THREE.Mesh(bt.geo, NM.bush));
  e.berries = bt.berries.map(p => {
    const berry = new THREE.Mesh(berryGeoShared, NM.berry);
    berry.position.copy(p);
    e.model.add(berry);
    return berry;
  });
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  groundPaint(x, z, 1.9, 'forest', 0.35);
  swapModel(e, 'resources/berries', { w: 2.4 });
  e.finalize();
  state.resourceNodes.push(e);
  e.obstacle = { x, z, r: 1.0, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

/* ---------- Ovella (aliment mòbil) ---------- */
const sheepGeo = {
  body: new THREE.SphereGeometry(0.5, 14, 10),
  puff: new THREE.SphereGeometry(0.28, 10, 8),
  head: new THREE.BoxGeometry(0.28, 0.32, 0.4),
  ear: new THREE.BoxGeometry(0.16, 0.05, 0.08),
  leg: new THREE.CylinderGeometry(0.06, 0.05, 0.45, 6).translate(0, -0.225, 0),
  hit: new THREE.SphereGeometry(0.9, 8, 6),
};
function createSheep(x, z) {
  const e = new Entity({ kind: 'resource', subtype: 'sheep', name: 'Ovella', icon: '🐑', radius: 0.6, selRadius: 1.0 });
  e.resourceType = 'food';
  e.amount = 100; e.maxAmount = 100;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0xb03a2e;
  e.mobile = true;
  e.killed = false;
  e.home = new THREE.Vector3(x, 0, z);
  e.wanderTarget = null;
  e.wanderTimer = randRange(0.5, 4);
  e.walkPhase = rand() * 5;

  e.model = new THREE.Group();
  e.body = new THREE.Group();        // subgrup que s'ajeu quan l'ovella és sacrificada
  e.model.add(e.body);
  e.group.add(e.model);
  const SP = sheepParts.get();
  const dark = NM.sheepSkin;
  const body = new THREE.Mesh(SP.body, NM.wool);
  body.position.y = 0.74;
  e.body.add(body);
  const head = new THREE.Mesh(SP.head, dark);
  head.position.set(0, 0.95, 0.74);
  head.rotation.x = 0.35;
  const earL = new THREE.Mesh(sheepGeo.ear, dark); earL.position.set(-0.17, 1.02, 0.66); earL.rotation.z = -0.4;
  const earR = new THREE.Mesh(sheepGeo.ear, dark); earR.position.set(0.17, 1.02, 0.66); earR.rotation.z = 0.4;
  e.body.add(head, earL, earR);
  e.legs = [];
  for (const [lx, lz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, -0.35], [0.22, -0.35]]) {
    const leg = new THREE.Mesh(sheepGeo.leg, dark);
    leg.position.set(lx, 0.45, lz);
    e.body.add(leg);
    e.legs.push(leg);
  }
  const hit = new THREE.Mesh(sheepGeo.hit, hitMaterial);
  hit.position.y = 0.7;
  hit.userData.noShadow = true;
  e.group.add(hit);

  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  swapModel(e, 'resources/sheep', { w: 1.1, d: 1.6 }, e.body);
  e.finalize();
  state.resourceNodes.push(e);
  e.obstacle = { x, z, r: 0.6, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

function updateSheep(n, dt) {
  if (n.killed) {
    // Ajeure's de costat
    n.body.rotation.z += (Math.PI / 2 - n.body.rotation.z) * Math.min(1, dt * 6);
    n.body.position.y += (0.28 - n.body.position.y) * Math.min(1, dt * 6);
    return;
  }
  // Si algun aldeà l'ha triada, s'està quieta
  const claimed = state.units.some(u => u.gatherNode === n);
  let moving = false;
  if (!claimed) {
    n.wanderTimer -= dt;
    if (n.wanderTimer <= 0) {
      n.wanderTimer = randRange(3, 7);
      const a = rand() * Math.PI * 2, r = randRange(0, 5);
      n.wanderTarget = new THREE.Vector3(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r);
    }
    if (n.wanderTarget) {
      const dx = n.wanderTarget.x - n.position.x, dz = n.wanderTarget.z - n.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) n.wanderTarget = null;
      else {
        const step = Math.min(d, 1.1 * dt);
        n.position.x += dx / d * step;
        n.position.z += dz / d * step;
        n.group.rotation.y = lerpAngle(n.group.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt));
        moving = true;
      }
    }
    // Col·lisió amb els obstacles (excepte ella mateixa)
    for (const o of state.obstacles) {
      if (o.entity === n) continue;
      if (pushOutOf(n.position, o, n.radius)) n.wanderTarget = null;
    }
    clampToMap(n.position);
    n.obstacle.x = n.position.x;
    n.obstacle.z = n.position.z;
  }
  n.walkPhase += dt * (moving ? 9 : 0);
  const sw = moving ? Math.sin(n.walkPhase) * 0.5 : 0;
  n.legs[0].rotation.x = sw; n.legs[3].rotation.x = sw;
  n.legs[1].rotation.x = -sw; n.legs[2].rotation.x = -sw;
}

/* ---------- Centre de Ciutat ---------- */
function createTownCenter(x, z, team = PLAYER.id) {
  const e = new Entity({
    kind: 'building', subtype: 'towncenter', name: 'Centre de Ciutat', icon: '🏰',
    team, radius: 6.9, selRadius: 7.8, hp: 2400, maxHp: 2400,
  });
  e.armor = [3, 5];
  e.los = 18;
  e.dropoff = true;   // accepta tots els recursos
  e.dropoffTypes = ['food', 'wood', 'gold', 'stone'];
  e.trainQueue = [];  // [{ kind, t }]
  e.rally = null;     // { point: Vector3, node: Entity|null }
  const { model, height } = makeBuildingModel('towncenter', team);
  e.model = model;
  e.height = height;
  e.group.add(model);
  e.group.position.set(x, 0, z);
  groundPaint(x, z, 11, 'dirt', 0.8);
  groundPaint(x, z, 16, 'trampled', 0.45);
  e.finalize();
  state.buildings.push(e);
  e.obstacle = { x, z, r: 6.9, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

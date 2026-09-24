/* ---------- Arbre ---------- */
const treeGeo = {
  trunk: new THREE.CylinderGeometry(0.32, 0.52, 3.2, 10),
  crown: new THREE.SphereGeometry(2.1, 20, 16),
  crownSmall: new THREE.SphereGeometry(1.35, 16, 12),
};
function createTree(x, z, scale = 1) {
  const e = new Entity({ kind: 'resource', subtype: 'tree', name: 'Arbre', icon: '🌳', radius: 0.8 * scale, selRadius: 1.7 });
  e.resourceType = 'wood';
  e.amount = 100; e.maxAmount = 100;

  const trunk = new THREE.Mesh(treeGeo.trunk, mat(0x7a4a24, { roughness: 0.95 }));
  trunk.position.y = 1.6;
  const crown = new THREE.Mesh(treeGeo.crown, mat(0x2f8a3a, { roughness: 0.85 }));
  crown.position.y = 4.5; crown.scale.set(1, 1.12, 1);
  const crown2 = new THREE.Mesh(treeGeo.crownSmall, mat(0x3da34a, { roughness: 0.85 }));
  crown2.position.set(0.85, 5.7, 0.35);
  const crown3 = new THREE.Mesh(treeGeo.crownSmall, mat(0x267532, { roughness: 0.85 }));
  crown3.position.set(-0.8, 5.25, -0.55); crown3.scale.setScalar(0.85);

  // Subgrup del model: permet sacsejar-lo o fer-lo caure sense moure l'anell de selecció
  e.model = new THREE.Group();
  e.model.add(trunk, crown, crown2, crown3);
  e.group.add(e.model);
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  e.group.scale.setScalar(scale);
  e.shakeT = 0;
  e.depleted = false;
  e.particleColor = 0x9a6a3a;
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

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 0), mat(0x7d7468, { roughness: 0.95, flatShading: true }));
  rock.scale.set(1.15, 0.42, 1.0);
  rock.position.y = 0.35;
  e.model.add(rock);

  const goldMat = mat(0xffc53a, { metalness: 0.75, roughness: 0.28, emissive: 0x3d2a00, emissiveIntensity: 0.6 });
  const goldDark = mat(0xe0a018, { metalness: 0.7, roughness: 0.35, emissive: 0x2a1c00, emissiveIntensity: 0.5 });
  const count = 11;
  for (let i = 0; i < count; i++) {
    const s = randRange(0.45, 1.05);
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * randRange(0.8, 1.3), s), i % 3 === 0 ? goldDark : goldMat);
    const a = rand() * Math.PI * 2;
    const r = randRange(0.1, 1.55);
    box.position.set(Math.cos(a) * r, 0.55 + s * 0.4 + (1.55 - r) * 0.35, Math.sin(a) * r);
    box.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    e.nuggets.add(box);
  }
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
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

  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 0), mat(0x6f6a62, { roughness: 0.95, flatShading: true }));
  base.scale.set(1.1, 0.4, 1.0);
  base.position.y = 0.3;
  e.model.add(base);
  const stoneMats = [
    mat(0xc9c6bf, { roughness: 0.85, flatShading: true }),
    mat(0xa9a59d, { roughness: 0.9, flatShading: true }),
    mat(0x8e8a83, { roughness: 0.9, flatShading: true }),
  ];
  for (let i = 0; i < 10; i++) {
    const s = randRange(0.55, 1.15);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 0.6, 0), stoneMats[i % 3]);
    const a = rand() * Math.PI * 2;
    const r = randRange(0.1, 1.5);
    rock.position.set(Math.cos(a) * r, 0.5 + s * 0.35 + (1.5 - r) * 0.3, Math.sin(a) * r);
    rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    rock.scale.set(1, randRange(0.7, 1.2), 1);
    e.nuggets.add(rock);
  }
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  e.finalize();
  state.resourceNodes.push(e);
  e.obstacle = { x, z, r: 2.2, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

/* ---------- Arbust de baies ---------- */
const berryGeo = {
  bush: new THREE.SphereGeometry(0.8, 14, 10),
  berry: new THREE.SphereGeometry(0.1, 8, 6),
};
function createBerryBush(x, z) {
  const e = new Entity({ kind: 'resource', subtype: 'berries', name: 'Arbust de baies', icon: '🫐', radius: 1.0, selRadius: 1.6 });
  e.resourceType = 'food';
  e.amount = 125; e.maxAmount = 125;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0xc2185b;
  e.model = new THREE.Group();
  e.group.add(e.model);
  const leafMats = [mat(0x2e6b2a, { roughness: 0.9 }), mat(0x3b7d33, { roughness: 0.9 })];
  const blobs = [[0, 0.6, 0, 1.0], [0.55, 0.5, 0.25, 0.75], [-0.5, 0.5, -0.2, 0.8], [0.1, 0.55, -0.55, 0.7]];
  const berryMat = mat(0xd81b60, { roughness: 0.4, emissive: 0x3a0018, emissiveIntensity: 0.6 });
  e.berries = [];
  blobs.forEach(([bx, by, bz, bs], i) => {
    const b = new THREE.Mesh(berryGeo.bush, leafMats[i % 2]);
    b.position.set(bx, by, bz);
    b.scale.set(bs, bs * 0.8, bs);
    e.model.add(b);
    // Baies distribuïdes per la superfície de cada mata
    for (let k = 0; k < 6; k++) {
      const th = rand() * Math.PI * 2, ph = randRange(0.2, 1.3);
      const r = 0.8 * bs;
      const berry = new THREE.Mesh(berryGeo.berry, berryMat);
      berry.position.set(bx + Math.cos(th) * Math.sin(ph) * r, by + Math.cos(ph) * r * 0.8, bz + Math.sin(th) * Math.sin(ph) * r);
      e.model.add(berry);
      e.berries.push(berry);
    }
  });
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
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
  const wool = mat(0xf2eee4, { roughness: 1 });
  const dark = mat(0x2b2522, { roughness: 0.8 });
  const body = new THREE.Mesh(sheepGeo.body, wool);
  body.scale.set(1.0, 0.85, 1.35);
  body.position.y = 0.72;
  e.body.add(body);
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(sheepGeo.puff, wool);
    puff.position.set(randRange(-0.3, 0.3), 0.95 + randRange(-0.05, 0.1), randRange(-0.45, 0.45));
    e.body.add(puff);
  }
  const head = new THREE.Mesh(sheepGeo.head, dark);
  head.position.set(0, 0.95, 0.72);
  const earL = new THREE.Mesh(sheepGeo.ear, dark); earL.position.set(-0.19, 1.05, 0.66);
  const earR = new THREE.Mesh(sheepGeo.ear, dark); earR.position.set(0.19, 1.05, 0.66);
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
  const T = teamOf(team);
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
  const stone = mat(0x9b958a, { roughness: 0.92, flatShading: true });
  const blue = mat(T.color, { roughness: 0.6 });
  const blueLight = mat(T.colorLight, { roughness: 0.55 });
  const blueDark = mat(T.colorDark, { roughness: 0.65 });
  const wood = mat(0x4a2f1a, { roughness: 0.9 });
  const goldTrim = mat(0xf2c14e, { metalness: 0.8, roughness: 0.3 });
  const windowMat = mat(0x2a1a08, { emissive: 0xffb347, emissiveIntensity: 0.55, roughness: 0.4 });

  const baseH = 0.6;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, baseH, 8), stone);
  base.rotation.y = Math.PI / 8;
  base.position.y = baseH / 2;
  e.group.add(base);

  const bodyH = 3.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, bodyH, 7), blue);
  body.position.y = baseH + bodyH / 2;
  e.group.add(body);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 7.4), blueDark);
  trim.position.y = baseH + bodyH + 0.175;
  e.group.add(trim);

  const roofH = 3.4;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, roofH, 4), blueDark);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = baseH + bodyH + 0.35 + roofH / 2;
  e.group.add(roof);

  const roofTopY = baseH + bodyH + 0.35 + roofH;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), goldTrim);
  finial.position.y = roofTopY + 0.1;
  e.group.add(finial);

  // Torres a les cantonades
  const towerGeo = new THREE.CylinderGeometry(0.85, 0.95, 5.3, 12);
  const capGeo = new THREE.ConeGeometry(1.2, 1.5, 12);
  const battlementGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tower = new THREE.Mesh(towerGeo, blueLight);
      tower.position.set(sx * 3.6, baseH + 2.65, sz * 3.6);
      const cap = new THREE.Mesh(capGeo, blueDark);
      cap.position.set(sx * 3.6, baseH + 5.3 + 0.75, sz * 3.6);
      e.group.add(tower, cap);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const b = new THREE.Mesh(battlementGeo, stone);
        b.position.set(sx * 3.6 + Math.cos(a) * 0.9, baseH + 5.35, sz * 3.6 + Math.sin(a) * 0.9);
        e.group.add(b);
      }
    }
  }

  // Porta i finestres
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.25), wood);
  door.position.set(0, baseH + 1.15, 3.52);
  const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.25, 16, 1, false, 0, Math.PI), wood);
  // Eix del semicilindre → Z (cap a fora), meitat → amunt
  doorArch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  doorArch.position.set(0, baseH + 2.3, 3.52);
  e.group.add(door, doorArch);
  const winGeo = new THREE.BoxGeometry(0.7, 0.9, 0.12);
  const winPositions = [
    [-2.2, 3.52, 0], [2.2, 3.52, 0],
    [-2.2, -3.52, 0], [2.2, -3.52, 0], [0, -3.52, 0],
  ];
  for (const [wx, wz] of winPositions) {
    const w = new THREE.Mesh(winGeo, windowMat);
    w.position.set(wx, baseH + 2.4, wz);
    e.group.add(w);
  }
  for (const side of [-1, 1]) {
    for (const off of [-1.8, 0, 1.8]) {
      const w = new THREE.Mesh(winGeo, windowMat);
      w.rotation.y = Math.PI / 2;
      w.position.set(side * 3.52, baseH + 2.4, off);
      e.group.add(w);
    }
  }

  // Escales davant la porta
  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 1.2), stone);
  steps.position.set(0, 0.15, 6.4);
  e.group.add(steps);

  // Bandera onejant
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), wood);
  pole.position.set(0, roofTopY + 1.6, 0);
  e.group.add(pole);
  const flagGeo = new THREE.PlaneGeometry(1.9, 1.1, 12, 5);
  flagGeo.translate(0.95, 0, 0);
  const flagMat = fogify(new THREE.MeshStandardMaterial({ color: T.colorLight, side: THREE.DoubleSide, roughness: 0.7 }));
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0.06, roofTopY + 2.6, 0);
  e.group.add(flag);
  const flagOrig = Float32Array.from(flagGeo.attributes.position.array);
  state.animated.push({
    update(t) {
      const p = flagGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const fx = flagOrig[i * 3];
        const fy = flagOrig[i * 3 + 1];
        p.setZ(i, Math.sin(fx * 3.2 - t * 6.0 + fy * 0.8) * 0.16 * (fx / 1.9));
      }
      p.needsUpdate = true;
      flagGeo.computeVertexNormals();
    },
  });

  e.group.position.set(x, 0, z);
  e.finalize();
  state.buildings.push(e);
  e.obstacle = { x, z, r: 6.9, entity: e };
  state.obstacles.push(e.obstacle);
  return e;
}

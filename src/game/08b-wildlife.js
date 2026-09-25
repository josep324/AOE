/* =====================================================================
   FAUNA SALVATGE I PEIXOS
   Cérvol: fuig quan algú s'hi acosta; cal caçar-lo (els aldeans li llancen llances) i dona carn.
   Senglar: molt resistent i envesteix qui l'ataca. Llop: ataca les unitats que s'hi acosten.
   Peixos: bancs a la riba dels llacs i rius; els aldeans hi pesquen des de terra.
   ===================================================================== */
const ANIMALS = {
  deer: { name: 'Cérvol', icon: '🦌', hp: 5, food: 140, radius: 0.7, speed: 1.3, run: 6.2, attack: 0, reload: 2, armor: [0, 0] },
  boar: { name: 'Senglar', icon: '🐗', hp: 75, food: 340, radius: 0.8, speed: 1.0, run: 5.0, attack: 4, reload: 2.0, armor: [1, 1] },
  wolf: { name: 'Llop', icon: '🐺', hp: 25, food: 0, radius: 0.6, speed: 1.5, run: 6.4, attack: 3, reload: 1.4, armor: [0, 1] },
};
const HUNT_RANGE = 3.6;       // distància a què un aldeà llança la llança
const HUNT_DAMAGE = 5;

/* ---------- Models ---------- */
function animalGeos() {
  if (animalGeos.g) return animalGeos.g;
  animalGeos.g = {
    sphere: new THREE.SphereGeometry(1, 12, 9),
    cone: new THREE.ConeGeometry(1, 1, 8),
    leg: new THREE.CylinderGeometry(0.05, 0.035, 1, 6).translate(0, -0.5, 0),
    hoof: new THREE.CylinderGeometry(0.045, 0.05, 0.08, 6),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
    hit: new THREE.SphereGeometry(1, 8, 6),
  };
  return animalGeos.g;
}
function part(parent, geo, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function buildAnimalModel(e, kind, variant) {
  const G = animalGeos();
  const body = new THREE.Group();
  e.body = body;
  const legs = [];
  const addLegs = (hx, hy, hz, len, thick, col, hoofCol) => {
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = new THREE.Group();
      leg.position.set(sx * hx, hy, sz * hz);
      part(leg, G.leg, col, 0, 0, 0, thick, len, thick);
      part(leg, G.hoof, hoofCol, 0, -len, 0, thick, 1, thick);
      body.add(leg);
      legs.push(leg);
    }
  };
  const tp = (rt, rb, h, seg = 10) => {
    const k = `${rt}|${rb}|${h}|${seg}`;
    return (animalGeos.t = animalGeos.t || new Map()).get(k) || animalGeos.t.set(k, new THREE.CylinderGeometry(rt, rb, h, seg)).get(k);
  };
  const addJointLegs = (hx, hy, fz, bz, up, low, col, hoofCol, w = 1) => {
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = new THREE.Group();
      leg.position.set(sx * hx, hy, sz > 0 ? fz : bz);
      const back = sz < 0;
      part(leg, tp(0.035 * w, (back ? 0.085 : 0.07) * w, up), col, 0, -up / 2, back ? -0.03 : 0, 1, 1, 1);
      part(leg, tp(0.028 * w, 0.034 * w, low), col, 0, -up - low / 2, back ? 0.02 : 0, 1, 1, 1);
      part(leg, tp(0.03 * w, 0.036 * w, 0.06), hoofCol, 0, -up - low - 0.02, back ? 0.02 : 0, 1, 1, 1);
      body.add(leg);
      legs.push(leg);
    }
  };
  if (kind === 'deer') {
    const coat = mat([0x86603c, 0x7a5634, 0x94704a][variant % 3], { roughness: 0.85 });
    const light = mat(0xe2d6bc, { roughness: 0.9 }), dark = mat(0x2a1e16, { roughness: 0.7 });
    // Tronc esvelt: barril, pit i gropa
    part(body, tp(0.21, 0.23, 0.8, 12), coat, 0, 1.12, 0, 1, 1, 1.15, Math.PI / 2);
    part(body, G.sphere, coat, 0, 1.13, 0.4, 0.22, 0.27, 0.22);
    part(body, G.sphere, coat, 0, 1.16, -0.42, 0.23, 0.26, 0.24);
    part(body, G.sphere, light, 0, 1.0, 0.0, 0.17, 0.12, 0.5);
    part(body, tp(0.08, 0.15, 0.62, 10), coat, 0, 1.46, 0.56, 1, 1, 1, 0.5);
    e.head = new THREE.Group();
    e.head.position.set(0, 1.76, 0.7);
    part(e.head, tp(0.045, 0.1, 0.36, 10), coat, 0, -0.04, 0.14, 0.85, 1, 1, 1.9);
    part(e.head, G.sphere, coat, 0, 0.02, 0.0, 0.1, 0.1, 0.11);
    part(e.head, G.sphere, dark, 0, -0.1, 0.3, 0.035, 0.03, 0.03);
    for (const s2 of [-1, 1]) {
      part(e.head, G.cone, coat, s2 * 0.08, 0.1, -0.04, 0.035, 0.14, 0.02, 0, 0, s2 * -0.9);
      part(e.head, G.sphere, dark, s2 * 0.07, 0.03, 0.08, 0.016, 0.016, 0.016);
    }
    if (variant % 2 === 0) {
      // Banyes del mascle, amb puntes
      const ant = mat(0x6a5236, { roughness: 0.7 });
      for (const s2 of [-1, 1]) {
        part(e.head, tp(0.008, 0.016, 0.34, 5), ant, s2 * 0.08, 0.26, -0.04, 1, 1, 1, -0.25, 0, s2 * -0.4);
        part(e.head, tp(0.006, 0.012, 0.16, 5), ant, s2 * 0.16, 0.36, 0.05, 1, 1, 1, 0.7, 0, s2 * -0.9);
        part(e.head, tp(0.006, 0.012, 0.15, 5), ant, s2 * 0.13, 0.43, -0.1, 1, 1, 1, -0.7, 0, s2 * -0.2);
        part(e.head, tp(0.005, 0.01, 0.12, 5), ant, s2 * 0.18, 0.48, -0.02, 1, 1, 1, 0.2, 0, s2 * -1.0);
      }
    }
    body.add(e.head);
    part(body, G.sphere, light, 0, 1.2, -0.66, 0.06, 0.09, 0.05);
    addJointLegs(0.13, 1.0, 0.4, -0.44, 0.48, 0.48, coat, dark);
  } else if (kind === 'boar') {
    const coat = mat(0x3a2c22, { roughness: 0.95 }), snout = mat(0x6a4a3c, { roughness: 0.8 }), tusk = mat(0xefe6d0, { roughness: 0.4 });
    part(body, G.sphere, coat, 0, 0.74, -0.05, 0.4, 0.44, 0.78);
    part(body, G.sphere, coat, 0, 0.82, 0.35, 0.36, 0.42, 0.42);
    // Cresta de pèl
    for (let i = 0; i < 6; i++) part(body, G.cone, coat, 0, 1.2 - Math.abs(i - 2) * 0.03, 0.4 - i * 0.18, 0.05, 0.14, 0.08);
    e.head = new THREE.Group();
    e.head.position.set(0, 0.74, 0.72);
    part(e.head, G.cone, coat, 0, 0, 0.18, 0.24, 0.5, 0.26, Math.PI / 2);
    part(e.head, G.cyl, snout, 0, -0.02, 0.44, 0.08, 0.04, 0.07, Math.PI / 2);
    for (const s of [-1, 1]) {
      part(e.head, G.cone, tusk, s * 0.1, -0.02, 0.38, 0.025, 0.16, 0.025, -0.6, 0, s * 0.3);
      part(e.head, G.cone, coat, s * 0.12, 0.2, 0.0, 0.05, 0.12, 0.03, 0, 0, s * -0.4);
    }
    body.add(e.head);
    part(body, G.cyl, coat, 0, 0.8, -0.85, 0.02, 0.3, 0.02, 0.8);
    addLegs(0.2, 0.5, 0.42, 0.46, 1.4, coat, mat(0x1a1410));
  } else {
    const coat = mat([0x5e6064, 0x5a5650, 0x6c6a66][variant % 3], { roughness: 0.92 });
    const light = mat(0xc8c4bc, { roughness: 0.9 }), dark = mat(0x222222, { roughness: 0.6 });
    // Pit profund i cintura estreta, cua espessa, morro llarg
    part(body, tp(0.15, 0.2, 0.72, 12), coat, 0, 0.86, -0.02, 1, 1, 1.1, Math.PI / 2 + 0.06);
    part(body, G.sphere, coat, 0, 0.88, 0.34, 0.2, 0.26, 0.24);
    part(body, G.sphere, light, 0, 0.8, 0.44, 0.15, 0.2, 0.14);
    part(body, G.sphere, coat, 0, 0.88, -0.36, 0.17, 0.2, 0.2);
    part(body, tp(0.1, 0.15, 0.3, 10), coat, 0, 1.04, 0.52, 1, 1, 1, 0.9);
    e.head = new THREE.Group();
    e.head.position.set(0, 1.08, 0.66);
    part(e.head, G.sphere, coat, 0, 0, 0, 0.13, 0.12, 0.14);
    part(e.head, tp(0.035, 0.08, 0.28, 8), coat, 0, -0.03, 0.2, 1, 1, 0.9, Math.PI / 2);
    part(e.head, G.sphere, dark, 0, -0.03, 0.35, 0.03, 0.025, 0.025);
    for (const s2 of [-1, 1]) {
      part(e.head, G.cone, coat, s2 * 0.07, 0.14, -0.03, 0.045, 0.13, 0.025);
      part(e.head, G.sphere, mat(0xd8b040, { roughness: 0.3 }), s2 * 0.06, 0.04, 0.1, 0.014, 0.012, 0.012);
    }
    body.add(e.head);
    part(body, tp(0.03, 0.08, 0.55, 8), coat, 0, 0.72, -0.72, 1, 1, 1, 2.5);
    addJointLegs(0.1, 0.78, 0.38, -0.38, 0.38, 0.38, coat, dark, 0.9);
  }
  e.legs = legs;
  return body;
}

function createAnimal(kind, x, z) {
  const D = ANIMALS[kind];
  const e = new Entity({ kind: 'resource', subtype: kind, name: D.name, icon: D.icon, radius: D.radius, selRadius: D.radius * 1.6, hp: D.hp, maxHp: D.hp });
  e.resourceType = D.food ? 'food' : null;
  e.amount = e.maxAmount = D.food;
  e.animal = true; e.alive = true; e.killed = false; e.mobile = true; e.depleted = false;
  e.armor = D.armor.slice();
  e.home = new THREE.Vector3(x, 0, z);
  e.wanderTarget = null; e.wanderTimer = randRange(0.5, 4);
  e.walkPhase = rand() * 5; e.fleeT = 0; e.fleeFrom = null; e.aggro = null; e.attackCD = 0; e.scanT = rand() * 0.5; e.biteT = 0;
  e.shakeT = 0;
  e.particleColor = 0xb03a2e;
  e.model = new THREE.Group();
  e.model.add(buildAnimalModel(e, kind, Math.floor(hash2(x * 2.3, z * 1.9) * 6)));
  e.group.add(e.model);
  const hit = new THREE.Mesh(animalGeos().hit, hitMaterial);
  hit.scale.set(D.radius * 1.1, 0.8, D.radius * 1.6);
  hit.position.y = 0.8;
  hit.userData.noShadow = true;
  e.group.add(hit);
  e.group.position.set(x, 0, z);
  e.group.rotation.y = rand() * Math.PI * 2;
  e.finalize();
  state.resourceNodes.push(e);
  state.animals.push(e);
  return e;
}

/* ---------- Comportament ---------- */
const animalBuf = [];
function nearestUnitTo(n, r, preferVillagers = false) {
  let best = null, bestD = Infinity;
  for (const u of unitsNear(n.position.x, n.position.z, r, animalBuf)) {
    if (u.dead || u.garrisoned || u.category === 'siege') continue;
    const d = hDist(u.position, n.position) * (preferVillagers && u.subtype === 'villager' ? 0.7 : 1);
    if (d < r && d < bestD) { bestD = d; best = u; }
  }
  return best;
}
function animalBlocked(x, z) {
  if (Math.abs(x) > CONFIG.MAP_LIMIT - 1 || Math.abs(z) > CONFIG.MAP_LIMIT - 1) return true;
  return !!NAV.walk[navCell(z) * NAV.N + navCell(x)];
}
function stepAnimal(n, dx, dz, speed, dt) {
  const d = Math.hypot(dx, dz);
  if (d < 1e-3) return false;
  let ux = dx / d, uz = dz / d;
  const step = Math.min(d, speed * dt);
  // Si el pas és bloquejat, prova de vorejar l'obstacle
  for (const a of [0, 0.7, -0.7, 1.4, -1.4]) {
    const c = Math.cos(a), s = Math.sin(a);
    const vx = ux * c - uz * s, vz = ux * s + uz * c;
    const nx = n.position.x + vx * step, nz = n.position.z + vz * step;
    if (!animalBlocked(nx + vx * 0.6, nz + vz * 0.6)) {
      n.position.x = nx; n.position.z = nz;
      n.group.rotation.y = lerpAngle(n.group.rotation.y, Math.atan2(vx, vz), 1 - Math.exp(-8 * dt));
      return true;
    }
  }
  n.wanderTarget = null;
  return false;
}
function updateAnimal(n, dt) {
  if (!n.alive) {
    // Abatut: s'ajeu de costat
    n.body.rotation.z += (Math.PI / 2 - n.body.rotation.z) * Math.min(1, dt * 6);
    n.body.position.y += (0.25 - n.body.position.y) * Math.min(1, dt * 6);
    return;
  }
  const D = ANIMALS[n.subtype];
  n.attackCD -= dt;
  n.biteT = Math.max(0, n.biteT - dt);
  let moving = false, fast = false;
  n.scanT -= dt;
  if (n.subtype === 'deer') {
    if (n.scanT <= 0) {
      n.scanT = 0.4;
      const t = nearestUnitTo(n, 5.5);
      if (t && n.fleeT <= 0) { n.fleeFrom = t.position.clone(); n.fleeT = 1.6; }
    }
    if (n.fleeT > 0) {
      n.fleeT -= dt;
      moving = stepAnimal(n, n.position.x - n.fleeFrom.x, n.position.z - n.fleeFrom.z, D.run, dt);
      fast = true;
      if (hDist(n.position, n.home) > 18) n.home.lerp(n.position, 0.5);   // el ramat es desplaça
    }
  } else {
    if (n.subtype === 'wolf' && !n.aggro && n.scanT <= 0) { n.scanT = 0.5; n.aggro = nearestUnitTo(n, 8, true); }
    const t = n.aggro;
    if (t && (t.dead || t.garrisoned || hDist(n.position, n.home) > (n.subtype === 'wolf' ? 28 : 18))) n.aggro = null;
    else if (t) {
      const d = hDist(n.position, t.position) - t.radius - n.radius;
      if (d > 0.7) { moving = stepAnimal(n, t.position.x - n.position.x, t.position.z - n.position.z, D.run, dt); fast = true; }
      else {
        n.group.rotation.y = lerpAngle(n.group.rotation.y, Math.atan2(t.position.x - n.position.x, t.position.z - n.position.z), 1 - Math.exp(-10 * dt));
        if (n.attackCD <= 0) { n.attackCD = D.reload; n.biteT = 0.3; applyDamage(t, computeDamage(D.attack, t, 0), n); }
      }
    }
    if (!n.aggro && hDist(n.position, n.home) > 14) { moving = stepAnimal(n, n.home.x - n.position.x, n.home.z - n.position.z, D.speed * 2, dt); }
  }
  // Passeig tranquil al voltant de casa
  if (!moving && !n.aggro && !(n.fleeT > 0)) {
    n.wanderTimer -= dt;
    if (n.wanderTimer <= 0) {
      n.wanderTimer = randRange(3, 8);
      const a = rand() * Math.PI * 2, r = randRange(0, n.subtype === 'wolf' ? 8 : 5);
      n.wanderTarget = new THREE.Vector3(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r);
    }
    if (n.wanderTarget) {
      const dx = n.wanderTarget.x - n.position.x, dz = n.wanderTarget.z - n.position.z;
      if (Math.hypot(dx, dz) < 0.15) n.wanderTarget = null;
      else moving = stepAnimal(n, dx, dz, D.speed, dt);
    }
  }
  clampToMap(n.position);
  // Animació: potes, cap que pastura i mossegada
  n.walkPhase += dt * (moving ? (fast ? 16 : 8) : 0);
  const sw = moving ? Math.sin(n.walkPhase) * (fast ? 0.8 : 0.45) : 0;
  n.legs[0].rotation.x = sw; n.legs[3].rotation.x = sw;
  n.legs[1].rotation.x = -sw; n.legs[2].rotation.x = -sw;
  if (n.head) {
    const graze = !moving && !n.aggro && (state.elapsed + n.id) % 8 < 3;
    n.head.rotation.x = THREE.MathUtils.damp(n.head.rotation.x, n.biteT > 0 ? 0.5 : graze ? 0.9 : 0, 6, dt);
  }
  n.body.position.y = moving && fast ? Math.abs(Math.sin(n.walkPhase)) * 0.08 : 0;
}
/* Cop rebut (fletxa, llança, espasa…) */
function animalHit(n, amount, attacker) {
  if (!n.alive) return;
  n.hp -= amount;
  n.shakeT = 0.2;
  spawnParticles(new THREE.Vector3(n.position.x, 0.9, n.position.z), 0xb02020, 3, null);
  if (n.hp <= 0) { animalDie(n); return; }
  if (n.subtype === 'deer') { if (attacker) { n.fleeFrom = attacker.position.clone(); n.fleeT = 1.4; } }
  else if (attacker && attacker.kind === 'unit' && !attacker.dead) n.aggro = attacker;
}
function animalDie(n) {
  n.alive = false;
  n.hp = 0;
  n.aggro = null;
  if (n.subtype === 'wolf') { depleteResource(n); return; }
  n.killed = true;
  n.name = `${ANIMALS[n.subtype].name} (carn)`;
  if (n.selected) updateSelectionUI();
}
function wolvesNear(x, z, r) {
  const out = [];
  for (const a of state.animals) if (a.subtype === 'wolf' && a.alive && Math.hypot(a.position.x - x, a.position.z - z) < r) out.push(a);
  return out;
}

/* ---------- Peixos ---------- */
function createFish(x, z, deep = false) {
  const e = new Entity({ kind: 'resource', subtype: deep ? 'deepfish' : 'fish', name: deep ? "Peix d'altura" : 'Peixos', icon: '🐟', radius: deep ? 1.4 : 1.0, selRadius: deep ? 2.0 : 1.5 });
  e.resourceType = 'food';
  e.amount = e.maxAmount = deep ? 300 : 200;
  e.depleted = false;
  e.shakeT = 0;
  e.particleColor = 0x9fd8ff;
  if (!deep) e.landAngle = landAngleFrom(x, z);
  e.model = new THREE.Group();
  const G = animalGeos();
  const scale = mat(0x8a9aa4, { roughness: 0.35, metalness: 0.5 });
  e.fish = [];
  for (let i = 0; i < (deep ? 7 : 4); i++) {
    const f = new THREE.Group();
    part(f, G.sphere, scale, 0, 0, 0, 0.07, 0.1, 0.26);
    part(f, G.cone, scale, 0, 0, -0.3, 0.02, 0.14, 0.1, -Math.PI / 2);
    f.userData.phase = i * 1.6 + hash2(x, z) * 6;
    f.userData.r = 0.35 + i * 0.18;
    e.model.add(f);
    e.fish.push(f);
  }
  // Cercles a la superfície de l'aigua
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.4, depthWrite: false }));
  ripple.position.y = 0.1;
  ripple.userData.noPick = true; ripple.userData.noShadow = true;
  e.model.add(ripple);
  e.ripple = ripple;
  const hit = new THREE.Mesh(G.hit, hitMaterial);
  hit.scale.set(1.1, 0.4, 1.1);
  hit.userData.noShadow = true;
  e.group.add(e.model, hit);
  e.group.position.set(x, 0, z);
  e.finalize();
  state.resourceNodes.push(e);
  return e;
}
function updateFish(n, dt) {
  const t = state.elapsed;
  const alive = Math.max(1, Math.ceil(n.fish.length * n.amount / n.maxAmount));
  n.fish.forEach((f, i) => {
    f.visible = i < alive;
    const a = t * 0.6 + f.userData.phase, r = f.userData.r;
    f.position.set(Math.cos(a) * r, 0.0, Math.sin(a) * r);
    f.rotation.y = -a;
    // De tant en tant un peix salta
    const j = (t * 0.25 + f.userData.phase) % 6;
    if (j < 0.5) { f.position.y = Math.sin(j / 0.5 * Math.PI) * 0.45; f.rotation.x = Math.cos(j / 0.5 * Math.PI) * 0.8; }
    else { f.position.y = -0.02; f.rotation.x = 0; }
  });
  const k = (t * 0.5 + n.id * 0.37) % 1;
  n.ripple.scale.setScalar(0.6 + k * 1.4);
  n.ripple.material.opacity = 0.45 * (1 - k);
}

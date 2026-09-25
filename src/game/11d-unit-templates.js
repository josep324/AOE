/* =====================================================================
   MODELS DE LES UNITATS (IV): plantilles i instàncies
   ===================================================================== */
/* ---------- Plantilles i instàncies ---------- */
const UNIT_TEMPLATES = new Map();
const UNIT_VARIANTS = 4;
function unitTemplate(kind, team, arch, variant) {
  const key = `${kind}:${team}:${arch}:${variant}`;
  if (!UNIT_TEMPLATES.has(key)) {
    let rig;
    const d = CONFIG.UNITS[kind];
    if (kind === 'villager') rig = buildVillagerRig(team, arch, variant % 2 === 1);
    else if (kind === 'monk') rig = buildMonkRig(team, arch);
    else if (d.cat === 'ship') rig = buildShip(kind, new THREE.Group(), team, arch);
    else if (SIEGE_BUILDERS[kind]) {
      rig = new THREE.Group();
      SIEGE_BUILDERS[kind](rig, team, arch);
    } else if (kind === 'tradecart') {
      rig = new THREE.Group();
      buildOx(rig, arch);
      buildCart(rig, team, arch);
      const cargo = rigPart(rig, 'cargo');
      for (let i = 0; i < 3; i++) piece(cargo, UG.box, 0xffc53a, { x: -0.3 + i * 0.3, y: 1.2, z: -0.3 - (i % 2) * 0.4, sx: 0.35, sy: 0.3, sz: 0.35, metal: true });
    } else {
      const s = buildSoldierRig(kind, team, arch);
      rig = s.rig;
      if (d.cat === 'cavalry' || d.mounted) {
        // El genet puja a la muntura: amaguem les cames i hi posem cuixes fixes
        const rider = rigPart(rig, 'rider', 0, 0.72, 0);
        for (const p of [s.parts.torso, s.parts.armL, s.parts.armR]) { rig.remove(p); rider.add(p); }
        rig.remove(s.parts.legL); rig.remove(s.parts.legR);
        for (const sx of [-1, 1]) piece(s.parts.torso, taper(0.1, 0.085, 0.62), soldierLook(arch, team, kind).pants, { x: sx * 0.3, y: 0.62, z: 0.1, rx: 0.5, rz: sx * 0.35 });
        if (kind === 'mameluke' || kind === 'camel' || kind === 'heavycamel') { rider.position.y = 1.18; buildCamelMount(rig, team); }
        else buildHorse(rig, team, arch, VIS_BASE[kind] || kind, kind === 'king' ? 2 : d.tier || 0);
      }
    }
    rig.traverse(o => { if (o.name === 'torso') refineHead(o); });
    UNIT_TEMPLATES.set(key, bakeRig(rig));
  }
  return UNIT_TEMPLATES.get(key);
}
/* Crea el model d'una unitat i n'omple les referències d'animació (e.legs, e.arms, e.tool…) */
function buildUnitVisual(e, kind, team) {
  const arch = e.visArch || archOf(team);
  const variant = Math.floor(unitRng() * UNIT_VARIANTS);
  const model = unitTemplate(kind, team, arch, variant).clone(true);
  const get = (n) => model.getObjectByName(n);
  e.model = model;
  const d = CONFIG.UNITS[kind];
  if (d.cat === 'ship') {
    e.legs = [new THREE.Object3D(), new THREE.Object3D()];
    e.arms = [new THREE.Object3D(), new THREE.Object3D()];
    e.oars = [get('oarsL'), get('oarsR')].filter(Boolean);
    e.oars.forEach((o, i) => { o.userData.side = i ? 1 : -1; });
    e.sail = get('sail');
    if (kind === 'fishingship') {
      // Pesca a bord (es veu quan en porta)
      const carryMesh = new THREE.Mesh(villagerGeo.carry, CARRY_MATERIALS.food);
      carryMesh.position.set(0, 0.85, -0.2);
      carryMesh.visible = false;
      model.add(carryMesh);
      e.carryMesh = carryMesh;
    }
    if (kind === 'fireship') {
      // Braseres encesos a coberta (no es fusionen: brillen)
      for (const z of [0.9, -0.4]) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 }));
        f.position.set(0, 0.95, z);
        model.add(f);
      }
    }
  } else if (d.cat === 'siege') {
    e.legs = [new THREE.Object3D(), new THREE.Object3D()];
    e.arms = [new THREE.Object3D(), new THREE.Object3D()];
    e.wheels = [0, 1, 2, 3].map(i => get('wheel' + i)).filter(Boolean);
    e.throwArm = get('throwArm') || get('deployArm');
    e.deployArm = get('deployArm');
    e.ramLog = get('ramLog');
    e.bowString = get('bowString');
    e.fireAnim = !!e.throwArm;
    e.packedPart = get('packedPart');
    e.deployedPart = get('deployedPart');
    if (e.packedPart) { e.packedPart.visible = e.packed !== false; e.deployedPart.visible = e.packed === false; }
  } else if (kind === 'tradecart') {
    e.legs = [0, 1, 2, 3].map(i => get('leg' + i));
    e.arms = [new THREE.Object3D(), new THREE.Object3D()];
    e.cargo = get('cargo');
    e.cargo.visible = false;
  } else if (d.cat === 'cavalry' || d.mounted) {
    e.legs = ['hFL', 'hBR', 'hFR', 'hBL'].map(get);
    e.arms = [get('armL'), get('armR')];
  } else {
    e.legs = [get('legL'), get('legR')];
    e.arms = [get('armL'), get('armR')];
  }
  if (kind === 'villager') {
    e.tool = get('tool');
    e.axeHead = get('axeHead');
    e.pickHead = get('pickHead');
    e.hammerHead = get('hammerHead');
    e.tool.visible = false;
    e.hammerHead.visible = false;
    // Càrrega sobre el cap
    const carryMesh = new THREE.Mesh(villagerGeo.carry, CARRY_MATERIALS.wood);
    carryMesh.position.y = 2.72;
    carryMesh.visible = false;
    model.add(carryMesh);
    e.carryMesh = carryMesh;
  } else {
    e.tool = { visible: false }; e.axeHead = { visible: false }; e.pickHead = { visible: false }; e.hammerHead = { visible: false };
    if (!e.carryMesh || !e.carryMesh.isMesh || kind !== 'fishingship') e.carryMesh = { visible: false, scale: new THREE.Vector3(), position: new THREE.Vector3(), rotation: new THREE.Euler() };
  }
  if (kind === 'monk') {
    // Relíquia portada als braços
    const r = relicTemplate().clone(true);
    r.scale.setScalar(0.42);
    r.position.set(0, 1.12, 0.42);
    r.visible = !!e.relic;
    model.add(r);
    e.relicMesh = r;
  }
  return model;
}

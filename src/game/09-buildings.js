/* =====================================================================
   EDIFICIS CONSTRUÏBLES (models amb primitives)
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
function buildingMats(team = PLAYER.id) {
  const T = teamOf(team);
  return {
    stone: mat(0x9b958a, { roughness: 0.92, flatShading: true }),
    wall: mat(0xe6d6b0, { roughness: 0.9 }),
    wood: mat(0x8a5a32, { roughness: 0.9 }),
    woodDark: mat(0x5a3a1e, { roughness: 0.9 }),
    log: mat(0x7a4a24, { roughness: 0.95 }),
    roof: mat(T.color, { roughness: 0.6 }),
    roofDark: mat(T.colorDark, { roughness: 0.65 }),
    window: mat(0x2a1a08, { emissive: 0xffb347, emissiveIntensity: 0.5, roughness: 0.4 }),
    soil: mat(0x6b4a2b, { roughness: 1 }),
    crop: mat(0xd6c14a, { roughness: 0.8 }),
    cropGreen: mat(0x8fb13a, { roughness: 0.8 }),
    gold: mat(0xffc53a, { metalness: 0.7, roughness: 0.3, emissive: 0x3d2a00, emissiveIntensity: 0.5 }),
    rock: mat(0xa9a59d, { roughness: 0.9, flatShading: true }),
    cloth: mat(0xeee2c4, { roughness: 0.9 }),
    straw: mat(0xd9b35b, { roughness: 0.9 }),
    metal: mat(0x8d9199, { metalness: 0.8, roughness: 0.35 }),
  };
}

/* Retorna { model, height } per a cada tipus d'edifici. El model mira cap a +Z. */
function makeBuildingModel(type, team = PLAYER.id) {
  const M = buildingMats(team);
  const g = new THREE.Group();
  let height = 3;
  const shed = () => {
    bx(g, 4.6, 0.2, 4.6, M.wood, 0, 0.1, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.13, 0.15, 2.9, 8, M.woodDark, sx * 2.05, 1.55, sz * 2.05);
    const roof = bx(g, 5.0, 0.16, 5.0, M.roof, 0, 3.05, 0);
    roof.rotation.x = 0.16;
    bx(g, 4.2, 2.5, 0.15, M.wood, 0, 1.45, -2.0);
  };
  switch (type) {
    case 'house': {
      bx(g, 3.7, 0.3, 3.7, M.stone, 0, 0.15, 0);
      bx(g, 3.1, 2.0, 3.1, M.wall, 0, 1.3, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.2, 2.0, 0.2, M.woodDark, sx * 1.55, 1.3, sz * 1.55);
      bx(g, 3.3, 0.15, 3.3, M.woodDark, 0, 2.37, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.8, 4), M.roof);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 2.45 + 0.9;
      g.add(roof);
      bx(g, 0.75, 1.25, 0.08, M.woodDark, 0, 0.93, 1.56);
      bx(g, 0.08, 0.5, 0.55, M.window, 1.56, 1.55, 0.55);
      bx(g, 0.08, 0.5, 0.55, M.window, -1.56, 1.55, -0.55);
      bx(g, 0.42, 1.1, 0.42, M.stone, 0.8, 3.3, -0.7);
      height = 4.3;
      break;
    }
    case 'lumbercamp': {
      shed();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3 - r; c++) {
          const log = cy(g, 0.26, 0.26, 2.5, 10, M.log, -0.3, 0.46 + r * 0.44, 0.1 + (c - (2 - r) / 2) * 0.54);
          log.rotation.z = Math.PI / 2;
        }
      }
      cy(g, 0.4, 0.46, 0.6, 10, M.wood, 1.45, 0.5, 1.45);
      const axe = bx(g, 0.06, 0.7, 0.06, M.woodDark, 1.45, 1.05, 1.45);
      axe.rotation.z = 0.4;
      bx(g, 0.06, 0.22, 0.3, M.metal, 1.3, 1.35, 1.45);
      height = 3.3;
      break;
    }
    case 'miningcamp': {
      shed();
      for (let i = 0; i < 7; i++) {
        const s = 0.35 + (i % 3) * 0.12;
        const b = bx(g, s, s, s, M.gold, -1.1 + (i % 3) * 0.35, 0.35 + Math.floor(i / 3) * 0.3, 0.2 + (i % 2) * 0.35);
        b.rotation.y = i * 0.7;
      }
      for (let i = 0; i < 6; i++) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (i % 3) * 0.08, 0), M.rock);
        r.position.set(0.8 + (i % 3) * 0.4, 0.4 + Math.floor(i / 3) * 0.3, -0.6 + (i % 2) * 0.4);
        g.add(r);
      }
      bx(g, 1.15, 0.55, 0.8, M.woodDark, 1.25, 0.7, 1.55);
      for (const sx of [-1, 1]) {
        const w = cy(g, 0.22, 0.22, 0.08, 12, M.metal, 1.25 + sx * 0.4, 0.42, 1.98);
        w.rotation.x = Math.PI / 2;
      }
      height = 3.3;
      break;
    }
    case 'mill': {
      bx(g, 4.4, 0.35, 4.4, M.stone, 0, 0.175, 0);
      cy(g, 1.35, 1.7, 4.2, 14, M.wall, 0, 2.45, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.9, 14), M.roof);
      roof.position.y = 0.35 + 4.2 + 0.95;
      g.add(roof);
      bx(g, 0.8, 1.3, 0.1, M.woodDark, 0, 1.0, 1.62);
      bx(g, 0.45, 0.45, 0.08, M.window, 0, 3.0, 1.45);
      const blades = new THREE.Group();
      blades.position.set(0, 3.9, 1.62);
      const hub = cy(blades, 0.2, 0.2, 0.35, 10, M.woodDark, 0, 0, 0);
      hub.rotation.x = Math.PI / 2;
      for (let k = 0; k < 4; k++) {
        const arm = new THREE.Group();
        arm.rotation.z = k * Math.PI / 2;
        bx(arm, 0.09, 2.5, 0.09, M.woodDark, 0, 1.25, 0.12);
        bx(arm, 0.55, 2.0, 0.04, M.cloth, 0.3, 1.45, 0.14);
        blades.add(arm);
      }
      g.add(blades);
      g.userData.blades = blades;
      for (let i = 0; i < 3; i++) {
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), M.cloth);
        sack.scale.set(1, 1.2, 1);
        sack.position.set(1.5 - i * 0.55, 0.7, 1.7);
        g.add(sack);
      }
      height = 6.5;
      break;
    }
    case 'farm': {
      bx(g, 5.8, 0.14, 5.8, M.soil, 0, 0.07, 0);
      const crops = new THREE.Group();
      for (let r = 0; r < 6; r++) {
        const row = bx(crops, 5.1, 0.55, 0.42, r % 2 ? M.crop : M.cropGreen, 0, 0.275, -2.25 + r * 0.9);
        row.userData.noShadow = false;
      }
      crops.position.y = 0.14;
      g.add(crops);
      g.userData.crops = crops;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.07, 0.08, 0.7, 6, M.woodDark, sx * 2.85, 0.35, sz * 2.85);
      height = 0.9;
      break;
    }
    case 'barracks': {
      bx(g, 6.6, 0.3, 6.6, M.stone, 0, 0.15, 0);
      bx(g, 6.0, 2.6, 3.8, M.wood, 0, 1.6, -1.1);
      for (const sx of [-1, 1]) bx(g, 0.25, 2.6, 3.9, M.woodDark, sx * 3.0, 1.6, -1.1);
      const r1 = bx(g, 6.4, 0.14, 2.35, M.roof, 0, 3.42, -1.1 + 0.98);
      r1.rotation.x = 0.5;
      const r2 = bx(g, 6.4, 0.14, 2.35, M.roof, 0, 3.42, -1.1 - 0.98);
      r2.rotation.x = -0.5;
      bx(g, 6.5, 0.18, 0.18, M.woodDark, 0, 3.95, -1.1);
      bx(g, 1.4, 1.9, 0.1, M.woodDark, 0, 1.25, 0.86);
      bx(g, 0.5, 0.5, 0.08, M.window, -1.9, 2.0, 0.86);
      bx(g, 0.5, 0.5, 0.08, M.window, 1.9, 2.0, 0.86);
      // Armer amb llances
      bx(g, 1.8, 0.1, 0.1, M.woodDark, -1.8, 1.2, 2.3);
      for (let i = 0; i < 4; i++) {
        const spear = cy(g, 0.03, 0.03, 2.0, 5, M.wood, -2.5 + i * 0.45, 1.1, 2.35);
        spear.rotation.x = -0.15;
        bx(g, 0.07, 0.22, 0.07, M.metal, -2.5 + i * 0.45, 2.15, 2.5);
      }
      // Ninot d'entrenament
      cy(g, 0.08, 0.08, 1.7, 6, M.woodDark, 2.2, 0.95, 2.1);
      bx(g, 1.0, 0.12, 0.12, M.woodDark, 2.2, 1.35, 2.1);
      cy(g, 0.3, 0.3, 0.7, 10, M.straw, 2.2, 1.25, 2.1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.straw);
      head.position.set(2.2, 1.85, 2.1);
      g.add(head);
      // Estendard
      cy(g, 0.05, 0.05, 3.2, 6, M.woodDark, -2.9, 1.9, 2.9);
      const banner = bx(g, 0.04, 0.9, 0.6, M.roof, -2.9, 3.0, 3.22);
      banner.userData.noShadow = false;
      height = 4.2;
      break;
    }
    case 'blacksmith': {
      bx(g, 4.6, 0.3, 4.6, M.stone, 0, 0.15, 0);
      bx(g, 4.0, 2.4, 3.2, M.stone, 0, 1.5, -0.5);
      const r1 = bx(g, 4.3, 0.14, 2.0, M.roof, 0, 3.05, -0.5 + 0.8); r1.rotation.x = 0.55;
      const r2 = bx(g, 4.3, 0.14, 2.0, M.roof, 0, 3.05, -0.5 - 0.8); r2.rotation.x = -0.55;
      bx(g, 0.7, 2.2, 0.7, M.stone, 1.4, 3.6, -1.3);
      bx(g, 0.9, 1.4, 0.1, M.woodDark, -0.8, 1.0, 1.11);
      // Fornal encesa i enclusa
      const fire = bx(g, 0.9, 0.5, 0.1, mat(0x3a1a00, { emissive: 0xff6a1a, emissiveIntensity: 1.2 }), 0.9, 0.9, 1.12);
      fire.userData.noShadow = true;
      bx(g, 0.8, 0.5, 0.4, M.stone, 1.0, 0.55, 1.8);
      bx(g, 0.9, 0.22, 0.35, mat(0x333336, { metalness: 0.8, roughness: 0.4 }), 1.0, 0.92, 1.8);
      height = 5.0;
      break;
    }
    case 'stable': {
      bx(g, 5.6, 0.25, 5.6, M.wood, 0, 0.12, 0);
      bx(g, 5.2, 2.4, 3.2, M.wood, 0, 1.45, -1.0);
      for (const sx of [-1, 1]) bx(g, 0.2, 2.4, 3.3, M.woodDark, sx * 2.6, 1.45, -1.0);
      const r1 = bx(g, 5.5, 0.14, 2.0, M.roof, 0, 3.05, -1.0 + 0.85); r1.rotation.x = 0.55;
      const r2 = bx(g, 5.5, 0.14, 2.0, M.roof, 0, 3.05, -1.0 - 0.85); r2.rotation.x = -0.55;
      for (let i = 0; i < 3; i++) bx(g, 1.1, 1.5, 0.08, M.woodDark, -1.7 + i * 1.7, 1.0, 0.62);
      // Tanca i bales de fenc
      for (let i = 0; i < 5; i++) cy(g, 0.06, 0.06, 1.0, 5, M.woodDark, -2.5 + i * 1.25, 0.6, 2.6);
      bx(g, 5.2, 0.08, 0.08, M.wood, 0, 0.85, 2.6);
      bx(g, 5.2, 0.08, 0.08, M.wood, 0, 0.45, 2.6);
      for (let i = 0; i < 2; i++) { const hay = cy(g, 0.45, 0.45, 0.8, 12, M.straw, 1.6 + i * 0.95, 0.5, 1.4); hay.rotation.z = Math.PI / 2; }
      bx(g, 1.2, 0.35, 0.45, M.wood, -1.6, 0.35, 1.6);
      height = 4.0;
      break;
    }
    case 'watchtower': {
      cy(g, 1.25, 1.45, 0.5, 8, M.stone, 0, 0.25, 0);
      cy(g, 0.95, 1.2, 5.2, 8, M.stone, 0, 3.1, 0);
      bx(g, 2.6, 0.25, 2.6, M.woodDark, 0, 5.8, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.18, 1.1, 0.18, M.woodDark, sx * 1.15, 6.45, sz * 1.15);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.5, 4), M.roof);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 7.75;
      g.add(roof);
      bx(g, 0.35, 0.55, 0.1, M.window, 0, 3.8, 1.0);
      bx(g, 0.6, 1.0, 0.1, M.woodDark, 0, 0.9, 1.22);
      height = 8.5;
      break;
    }
    case 'market': {
      bx(g, 5.8, 0.2, 5.8, M.stone, 0, 0.1, 0);
      // Tres parades amb tendals de ratlles
      const stripe = mat(0xf2e6c8, { roughness: 0.9 });
      for (const [px, pz, ry] of [[-1.6, -1.6, 0], [1.6, -1.6, 0], [-1.6, 1.6, Math.PI]]) {
        const st = new THREE.Group();
        bx(st, 1.9, 0.9, 1.0, M.wood, 0, 0.55, 0);
        for (const sx of [-0.85, 0.85]) cy(st, 0.06, 0.06, 2.2, 5, M.woodDark, sx, 1.2, -0.45);
        for (let k = 0; k < 4; k++) {
          const awn = bx(st, 0.5, 0.06, 1.3, k % 2 ? stripe : M.roof, -0.72 + k * 0.48, 2.2, -0.05);
          awn.rotation.x = 0.35;
        }
        bx(st, 0.3, 0.25, 0.3, M.gold, -0.4, 1.12, 0.1);
        bx(st, 0.35, 0.3, 0.3, mat(0xc0392b), 0.3, 1.15, 0.05);
        st.position.set(px, 0, pz);
        st.rotation.y = ry;
        g.add(st);
      }
      for (let i = 0; i < 3; i++) cy(g, 0.3, 0.3, 0.7, 10, M.wood, 1.4 + (i % 2) * 0.6, 0.55, 1.2 + i * 0.5);
      cy(g, 0.7, 0.8, 0.8, 12, M.stone, 0, 0.5, 0);
      bx(g, 0.1, 1.6, 0.1, M.woodDark, 0, 1.2, 0);
      height = 3.2;
      break;
    }
    case 'gate': {
      // Porta al llarg de l'eix X (3×1). Dues fulles que s'obren cap enfora
      for (const sx of [-1, 1]) bx(g, 0.7, 3.4, 1.0, M.stone, sx * 1.15, 1.7, 0);
      bx(g, 3.0, 0.6, 1.0, M.stone, 0, 3.1, 0);
      bx(g, 0.9, 0.5, 0.06, M.roof, 0, 2.6, 0.52);
      const doors = [];
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * 0.8, 0, 0);
        bx(pivot, 0.8, 2.6, 0.12, M.woodDark, -sx * 0.4, 1.3, 0);
        bx(pivot, 0.82, 0.1, 0.14, mat(0x444448, { metalness: 0.7, roughness: 0.4 }), -sx * 0.4, 0.8, 0);
        bx(pivot, 0.82, 0.1, 0.14, mat(0x444448, { metalness: 0.7, roughness: 0.4 }), -sx * 0.4, 1.9, 0);
        g.add(pivot);
        doors.push(pivot);
      }
      g.userData.doors = doors;
      height = 3.6;
      break;
    }
    case 'palisade': {
      // Quatre troncs esmolats per cel·la: segments adjacents formen un mur continu
      for (const [sx, sz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const h = 2.1 + ((sx + sz + 1) * 7919 % 3) * 0.12;
        cy(g, 0.24, 0.26, h, 7, M.log, sx, h / 2, sz);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.4, 7), M.log);
        tip.position.set(sx, h + 0.2, sz);
        g.add(tip);
      }
      height = 2.7;
      break;
    }
    case 'stonewall': {
      bx(g, 1.0, 2.6, 1.0, M.stone, 0, 1.3, 0);
      bx(g, 1.02, 0.2, 1.02, mat(0x8a857b, { roughness: 0.95, flatShading: true }), 0, 2.6, 0);
      for (const [sx, sz] of [[-0.3, -0.3], [0.3, 0.3]]) bx(g, 0.34, 0.45, 0.34, M.stone, sx, 2.9, sz);
      height = 3.2;
      break;
    }
  }
  return { model: g, height };
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
  e.armor = def.armor || [2, 6];
  e.los = def.los || 8;
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
    b.progress = Math.min(1, b.progress + (dt / b.def.time) * n * 3 / (n + 2));
    applyConstructionVisual(b);
    if (b.progress >= 1) completeBuilding(b);
  }
}

/* Enderrocar un edifici propi (un fonament sense començar retorna tot el cost) */
function demolishBuilding(b) {
  if (!b || b.subtype === 'towncenter' || !b.isOwn || b.dead) return;
  if (b.underConstruction && b.progress < 0.02) applyCost(b.def.cost, +1, b.team);
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

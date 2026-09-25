/* =====================================================================
   RECURSOS: IMPACTES, PARTÍCULES I ESGOTAMENT
   ===================================================================== */
function onBuildStrike(u, b) {
  if (!b) return;
  const fp = b.footprint;
  const cx = THREE.MathUtils.clamp(u.position.x, b.position.x - fp.hw, b.position.x + fp.hw);
  const cz = THREE.MathUtils.clamp(u.position.z, b.position.z - fp.hd, b.position.z + fp.hd);
  spawnParticles(new THREE.Vector3(cx, 0.6, cz), 0xc8a26a, 3, null);
}

function onToolStrike(u, node) {
  if (!node || node.depleted) return;
  if (node.subtype !== 'farm') node.shakeT = 0.25;
  // Punt d'impacte entre l'aldeà i el recurs
  const dir = new THREE.Vector3(node.position.x - u.position.x, 0, node.position.z - u.position.z).normalize();
  const hitY = node.subtype === 'tree' ? 1.2 : node.subtype === 'sheep' ? 0.4 : 0.8;
  const hit = new THREE.Vector3(u.position.x + dir.x * (u.radius + 0.5), hitY, u.position.z + dir.z * (u.radius + 0.5));
  spawnParticles(hit, node.particleColor, node.subtype === 'berries' ? 2 : 4, dir);
}

function onNodeHarvested(node) {
  const f = node.amount / node.maxAmount;
  if (node.nuggets) {
    // Les mines es fan petites a mesura que s'exploten
    node.nuggets.scale.setScalar(0.35 + 0.65 * f);
  }
  if (node.berries) {
    const visible = Math.ceil(f * node.berries.length);
    node.berries.forEach((b, i) => { b.visible = i < visible; });
  }
  if (node.model && node.model.userData.crops) node.model.userData.crops.scale.y = 0.2 + 0.8 * f;
}

function depleteResource(node) {
  if (node.depleted) return;
  node.depleted = true;
  node.amount = 0;
  state.resourceNodes = state.resourceNodes.filter(n => n !== node);
  if (node.animal) state.animals = state.animals.filter(n => n !== node);
  state.obstacles = state.obstacles.filter(o => o.entity !== node);
  state.pickables = state.pickables.filter(m => m.userData.entity !== node);
  if (node.selected) { removeFromSelection(node); onSelectionChanged(); }
  node.dieT = 0;
  node.fallDir = rand() * Math.PI * 2;
  state.dying.push(node);
  if (node.subtype === 'gold') toast("⛏️ Una Veta d'Or s'ha esgotat");
  if (node.subtype === 'stone') toast('🪨 Una Mina de Pedra s\'ha esgotat');
  rebuildNav();
  if (node.subtype === 'farm') {
    const T = teamOf(node.team);
    const farmers = state.units.filter(u => u.gatherNode === node && !u.dead);
    if (T.mods.autoReseed && canAfford(costFor('farm', node.team), node.team) && canPlace('farm', node.position.x, node.position.z)) {
      applyCost(costFor('farm', node.team), -1, node.team);
      const nf = createBuilding('farm', node.position.x, node.position.z, false, node.team);
      farmers.forEach(u => { u.reseedFarm = nf; });
      if (node.team === PLAYER.id) toast('🔁 Granja resembrada automàticament');
    } else if (node.team === PLAYER.id) {
      toast(T.mods.autoReseed ? '🌱 Una granja s\'ha esgotat (falta fusta per resembrar-la)' : '🌱 Una granja s\'ha esgotat');
    }
  }
  spawnParticles(new THREE.Vector3(node.position.x, 1.5, node.position.z), node.particleColor, 14, null);
}

function updateResourceNodes(dt) {
  for (const n of state.resourceNodes) {
    if (n.subtype === 'sheep') updateSheep(n, dt);
    else if (n.animal) updateAnimal(n, dt);
    else if (n.subtype === 'fish' || n.subtype === 'deepfish') updateFish(n, dt);
    if (n.shakeT > 0) {
      n.shakeT = Math.max(0, n.shakeT - dt);
      const a = n.shakeT * 40;
      n.model.rotation.z = Math.sin(a) * n.shakeT * (n.resourceType === 'wood' ? 0.18 : 0.05);
    } else if (n.model.rotation.z !== 0) {
      n.model.rotation.z = 0;
    }
  }
  // Animació de desaparició dels recursos esgotats
  for (let i = state.dying.length - 1; i >= 0; i--) {
    const n = state.dying[i];
    n.dieT += dt;
    if (n.deathKind === 'unit') {
      // La unitat cau d'esquena, s'hi queda una estona i s'enfonsa
      const f = Math.min(1, n.dieT / 0.45);
      n.model.rotation.x = -Math.PI / 2 * f * f * n.fallDir;
      n.model.position.y = 0.2 * f;
      if (n.dieT > 3) n.group.position.y -= dt * 0.6;
      if (n.dieT > 5) removeDead(n, i);
    } else if (n.deathKind === 'building') {
      const f = Math.min(1, n.dieT / 2.2);
      n.group.position.y = -f * f * (n.height || 9);
      n.group.rotation.z = Math.sin(n.dieT * 30) * 0.01 * (1 - f);
      if (Math.random() < dt * 12) spawnParticles(new THREE.Vector3(n.position.x + randRange(-3, 3), 0.5, n.position.z + randRange(-3, 3)), 0x9b958a, 2, null);
      if (n.dieT > 2.4) removeDead(n, i);
    } else if (n.resourceType === 'wood') {
      // L'arbre cau i després s'enfonsa
      const f = Math.min(1, n.dieT / 0.9);
      n.model.rotation.set(0, n.fallDir, 0);
      n.model.rotateX(Math.PI / 2 * f * f);
      if (n.dieT > 1.4) n.model.position.y = -(n.dieT - 1.4) * 2.5;
      if (n.dieT > 2.4) { removeDead(n, i); }
    } else {
      const f = Math.min(1, n.dieT / 0.8);
      n.model.scale.setScalar(Math.max(0.001, 1 - f));
      if (f >= 1) removeDead(n, i);
    }
  }
}
function removeDead(n, idx) {
  scene.remove(n.group);
  state.dying.splice(idx, 1);
}

/* ---------- Partícules (estelles de fusta / espurnes d'or) ---------- */
const particleGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
const particlePool = [];
function spawnParticles(pos, color, count, dir) {
  for (let i = 0; i < count; i++) {
    const m = particlePool.pop() || new THREE.Mesh(particleGeo, mat(color));
    m.material = mat(color, color === 0xffd24a ? { emissive: 0x6a4a00, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.3 } : { roughness: 0.9 });
    m.position.copy(pos);
    m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    m.scale.setScalar(randRange(0.6, 1.2));
    const back = dir ? -1 : 0;
    m.userData.vel = new THREE.Vector3(
      randRange(-2, 2) + (dir ? dir.x * back * 2 : 0),
      randRange(2.5, 5),
      randRange(-2, 2) + (dir ? dir.z * back * 2 : 0)
    );
    m.userData.life = randRange(0.5, 0.8);
    m.castShadow = false;
    scene.add(m);
    state.particles.push(m);
  }
}
function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const m = state.particles[i];
    const v = m.userData.vel;
    m.userData.life -= dt;
    v.y -= 14 * dt;
    m.position.addScaledVector(v, dt);
    m.rotation.x += dt * 8; m.rotation.y += dt * 6;
    if (m.position.y < 0.07) { m.position.y = 0.07; v.set(v.x * 0.4, 0, v.z * 0.4); }
    if (m.userData.life <= 0) {
      scene.remove(m);
      state.particles.splice(i, 1);
      particlePool.push(m);
    }
  }
}

/* ---------- Text flotant (+10 🪵) ---------- */
const floatersEl = document.getElementById('floaters');
function spawnFloater(text, worldPos, height, cls) {
  const el = document.createElement('div');
  el.className = 'floater ' + (cls || '');
  el.textContent = text;
  floatersEl.appendChild(el);
  state.floaters.push({ el, pos: new THREE.Vector3(worldPos.x, height, worldPos.z), t: 0 });
}
function updateFloaters(dt) {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.t += dt;
    const k = f.t / 1.4;
    if (k >= 1) { f.el.remove(); state.floaters.splice(i, 1); continue; }
    const s = worldToScreen(f.pos, k * 2.5);
    f.el.style.left = s.x + 'px';
    f.el.style.top = s.y + 'px';
    f.el.style.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    f.el.style.display = s.visible ? 'block' : 'none';
  }
}

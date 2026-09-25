/* =====================================================================
   SETGE, PROJECTILS ESPECIALS I REFUGI
   Pedres amb dany en àrea (mangonell, trabuc), virots que travessen (escorpí),
   destrals i simitarres (dany cos a cos a distància), atac al terra, muntar/desmuntar
   el trabuc i refugi a torres, castells i ariets.
   ===================================================================== */

/* ---------- Refugi ---------- */
function garrisonCap(b) {
  if (!b) return 0;
  if (b.kind === 'unit') return b.garrisonCap || 0;
  if (b.subtype === 'towncenter') return CONFIG.GARRISON_MAX;
  return (b.def && b.def.garrison) || 0;
}
/* Qui pot entrar on: ariet → infanteria; castell → tothom menys setge; Centre i torres → aldeans i infanteria/arquers */
function canGarrison(u, b) {
  if (!b || b.dead || b.team !== u.team || b === u || b.underConstruction || garrisonCap(b) <= 0) return false;
  const c = u.category;
  if (b.kind === 'unit') return b.subtype === 'transport' ? !u.naval : c === 'infantry';
  if (c === 'siege' || c === 'trade' || c === 'ship') return false;
  if (b.subtype === 'castle') return true;
  return c === 'villager' || c === 'infantry' || c === 'archer' || c === 'monk' || c === 'king';
}
/* Velocitat d'un ariet segons els infants que porta */
function refreshContainer(b) {
  if (b.kind !== 'unit' || b.dead) return;
  setUnitStats(b, b.unitKind);
  b.speed *= 1 + 0.12 * (b.garrison ? b.garrison.length : 0);
}

/* ---------- Atac al terra (mangonell) ---------- */
function groundTarget(p) {
  return { isGround: true, kind: 'ground', position: new THREE.Vector3(p.x, groundY(p.x, p.z), p.z), radius: 0, team: 0, dead: false };
}
function commandAttackGround(units, p) {
  const t = groundTarget(p);
  for (const u of units) {
    if (!u.canGround) continue;
    u.orderQueue.length = 0;
    orderAttack(u, t, false);
    u.forcedTarget = true;
  }
  spawnMoveMarker(t.position, 0xff8a3a, 2.2);
}

/* ---------- Trabuc: muntar i desmuntar ---------- */
function setPacked(u, packed) {
  if (!u.packable) return;
  if (u.packT > 0) { u.packTo = packed; return; }
  if (u.packed === packed) return;
  u.packTo = packed;
  u.packT = 3.5;
}
/* Retorna true si la unitat està ocupada muntant/desmuntant (no es pot moure ni disparar) */
function updatePacking(u, dt) {
  if (!u.packable || !(u.packT > 0)) return false;
  u.packT -= dt;
  const f = 1 - Math.max(0, u.packT) / 3.5;
  // Muntant: apareix la torre i la biga s'aixeca; desmuntant: la biga baixa i es plega
  if (!u.packTo && u.packedPart) { u.packedPart.visible = false; u.deployedPart.visible = true; }
  if (u.deployArm) u.deployArm.rotation.x = u.packTo ? 1.2 * f : 1.2 * (1 - f);
  if (u.packT <= 0) {
    u.packT = 0;
    u.packed = u.packTo;
    if (u.packedPart) u.packedPart.visible = u.packed;
    if (u.deployedPart) u.deployedPart.visible = !u.packed;
  }
  return true;
}
function togglePack(units) {
  for (const u of units) if (u.packable) setPacked(u, !u.packTo);
}

/* ---------- Projectils de les unitats ---------- */
const projGeo = {
  axeHandle: new THREE.BoxGeometry(0.05, 0.05, 0.55),
  axeHead: new THREE.BoxGeometry(0.04, 0.22, 0.16).translate(0, 0.06, 0.24),
  blade: new THREE.BoxGeometry(0.05, 0.02, 0.75),
  bolt: new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5).rotateX(Math.PI / 2),
  boltTip: new THREE.ConeGeometry(0.1, 0.3, 5).rotateX(Math.PI / 2).translate(0, 0, 0.9),
  stone: new THREE.IcosahedronGeometry(0.28, 0),
  bigstone: new THREE.IcosahedronGeometry(0.5, 0),
  cannonball: new THREE.SphereGeometry(0.16, 8, 6),
};
function projectileMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'axe') g.add(new THREE.Mesh(projGeo.axeHandle, mat(0x6b4423)), new THREE.Mesh(projGeo.axeHead, mat(0x9ca3ad, { metalness: 0.7, roughness: 0.4 })));
  else if (kind === 'scimitar') g.add(new THREE.Mesh(projGeo.blade, mat(0xc8ccd2, { metalness: 0.8, roughness: 0.3 })));
  else if (kind === 'cannonball') g.add(new THREE.Mesh(projGeo.cannonball, mat(0x1c1c1e, { metalness: 0.6, roughness: 0.4 })));
  else if (kind === 'bolt') g.add(new THREE.Mesh(projGeo.bolt, mat(0x5a3a1e)), new THREE.Mesh(projGeo.boltTip, mat(0x777777)));
  else g.add(new THREE.Mesh(kind === 'bigstone' ? projGeo.bigstone : projGeo.stone, mat(0x8a857b, { flatShading: true })));
  return g;
}
function hitDamage(u, t, type) {
  let d = computeDamage(u.attack, t, type, u.vsBuilding);
  if (t.mounted) d += u.bonusCav || 0;
  if (t.category === 'archer') d += u.bonusArcher || 0;
  if (t.spearLine) d += u.bonusSpear || 0;
  if (t.isUnique) d += u.bonusUnique || 0;
  if (t.naval) d += u.bonusShip || 0;
  return d;
}
/* Dispara el projectil propi de la unitat cap a l'objectiu (o al terra) */
function fireProjectile(u, t) {
  const kind = u.projectile || 'arrow';
  if (kind === 'fire') { fireSpray(u, t); return; }
  const heavy = kind === 'stone' || kind === 'bigstone';
  const from = new THREE.Vector3(u.position.x, (kind === 'bigstone' ? 5.5 : heavy ? 2.4 : 1.6) + u.position.y, u.position.z);
  if (u.fireAnim) u.fireT = 0.6;
  if (heavy) {
    // Pedra: vol balístic cap al punt on era l'objectiu (pot fallar si es mou)
    const end = t.isGround ? t.position.clone().setY(t.position.y + 0.3) : aimPoint(t);
    const info = { attack: u.attack, vsBuilding: u.vsBuilding, team: u.team, splash: u.splash, shooter: u, target: t, big: kind === 'bigstone' };
    spawnProjectile({ mesh: projectileMesh(kind), from, end, shooter: u, arcK: 0.32, speed: kind === 'bigstone' ? 20 : 17, spin: 4, onHit: () => stoneImpact(info, end) });
    return;
  }
  const type = u.meleeShot ? 0 : 1;
  const dmg = hitDamage(u, t, type);
  if (kind === 'arrow') { spawnArrow(from, t, dmg, u); return; }
  if (kind === 'cannonball') {
    // Canó: fumarada i bala ràpida amb dany de cos a cos
    from.set(u.position.x + Math.sin(u.group.rotation.y) * 1.6, 1.1 + u.position.y, u.position.z + Math.cos(u.group.rotation.y) * 1.6);
    spawnParticles(from.clone(), 0xd8d4cc, 8, null);
    const cdmg = hitDamage(u, t, 0);
    spawnProjectile({ mesh: projectileMesh(kind), from, end: aimPoint(t), target: t, shooter: u, arcK: 0.03, speed: 45, spin: 0,
      onHit: () => { if (t && !t.dead && !t.garrisoned) applyDamage(t, cdmg, u); spawnParticles(aimPoint(t), 0x6a6258, 6, null); } });
    return;
  }
  const info = { u, team: u.team, attack: u.attack, start: from.clone() };
  spawnProjectile({
    mesh: projectileMesh(kind), from, end: aimPoint(t), target: t, shooter: u, arcK: kind === 'bolt' ? 0.05 : 0.14,
    speed: kind === 'bolt' ? 34 : 24, spin: kind === 'bolt' ? 0 : 14,
    onHit: (p) => {
      if (t && !t.dead && !t.garrisoned) applyDamage(t, dmg, u);
      if (u.pierceShot) boltPierce(info, p.end, t);
    },
  });
}
/* Projectil genèric (els edificis i els arquers continuen fent servir spawnArrow) */
function spawnProjectile({ mesh, from, end, target = null, shooter, arcK = 0.12, speed = 30, spin = 0, onHit }) {
  mesh.visible = false;
  scene.add(mesh);
  const dist = from.distanceTo(end);
  state.projectiles.push({ g: mesh, start: from.clone(), end: end.clone(), target, shooter, t: 0, T: Math.max(0.2, dist / speed), dist, arcK, spin, onHit, homing: !!target });
}
/* Impacte d'una pedra: dany en àrea a unitats (també pròpies) i a edificis enemics tocats */
const splashBuf = [];
function stoneImpact(info, p) {
  spawnParticles(new THREE.Vector3(p.x, p.y + 0.1, p.z), 0x8a7a62, info.big ? 16 : 10, null);
  const r = info.big ? 0.9 : info.splash;
  for (const e of unitsNear(p.x, p.z, r + 1.2, splashBuf)) {
    if (e.dead || e.garrisoned || e === info.shooter) continue;
    const d = hDist(e.position, p) - e.radius;
    if (d > r) continue;
    const f = d < r * 0.45 ? 1 : 0.5;
    applyDamage(e, Math.max(1, Math.round(computeDamage(info.attack, e, 0) * f)), info.shooter);
  }
  for (const b of state.buildings.slice()) {
    if (b.team === info.team || b.dead) continue;
    if (entSurfaceDist(b, p.x, p.z) <= (info.big ? 1.2 : r * 0.5)) applyDamage(b, computeDamage(info.attack, b, 0, info.vsBuilding), info.shooter);
  }
}
/* Virot de l'escorpí: continua el vol i fereix (a mitges) els enemics que troba pel camí */
function boltPierce(info, end, first) {
  const dir = new THREE.Vector3(end.x - info.start.x, 0, end.z - info.start.z);
  const len = dir.length();
  if (len < 0.01) return;
  dir.divideScalar(len);
  const total = len + 3.5;
  for (const e of unitsNear((info.start.x + end.x) / 2, (info.start.z + end.z) / 2, total / 2 + 2, splashBuf)) {
    if (e === first || e.dead || e.garrisoned || e.team === info.team || e.team === 0) continue;
    const rx = e.position.x - info.start.x, rz = e.position.z - info.start.z;
    const along = rx * dir.x + rz * dir.z;
    if (along < 1 || along > total) continue;
    const off = Math.abs(rx * dir.z - rz * dir.x);
    if (off > 0.5 + e.radius) continue;
    applyDamage(e, Math.max(1, Math.round(computeDamage(info.attack, e, 1) * 0.5)), info.u);
  }
}

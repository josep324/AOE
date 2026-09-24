/* =====================================================================
   DECORACIÓ (herba i roques – no seleccionables)
   ===================================================================== */
/* ---------- Geometria d'obstacles: cercles (recursos, Centre) i rectangles (edificis) ---------- */
function obstacleSurface(o, x, z) {
  // Retorna la distància amb signe a la superfície de l'obstacle i la normal cap a fora
  const dx = x - o.x, dz = z - o.z;
  if (o.rect) {
    const qx = Math.abs(dx) - o.hw, qz = Math.abs(dz) - o.hd;
    if (qx > 0 || qz > 0) {
      const cx = Math.max(qx, 0), cz = Math.max(qz, 0);
      const d = Math.hypot(cx, cz) || 1e-4;
      return { d, nx: (dx < 0 ? -1 : 1) * cx / d, nz: (dz < 0 ? -1 : 1) * cz / d };
    }
    return qx > qz ? { d: qx, nx: dx < 0 ? -1 : 1, nz: 0 } : { d: qz, nx: 0, nz: dz < 0 ? -1 : 1 };
  }
  const l = Math.hypot(dx, dz);
  if (l < 1e-4) return { d: -o.r, nx: 1, nz: 0 };
  return { d: l - o.r, nx: dx / l, nz: dz / l };
}
function pushOutOf(p, o, margin) {
  const s = obstacleSurface(o, p.x, p.z);
  if (s.d >= margin) return null;
  const k = margin - s.d;
  p.x += s.nx * k;
  p.z += s.nz * k;
  return s;
}
function isNearObstacle(x, z, margin) {
  for (const o of state.obstacles) if (obstacleSurface(o, x, z).d < margin) return true;
  return false;
}
/* Distància d'un punt a la vora d'una entitat (0 si és a dins d'un edifici) */
function entSurfaceDist(ent, x, z) {
  if (ent.footprint) {
    const qx = Math.abs(x - ent.position.x) - ent.footprint.hw;
    const qz = Math.abs(z - ent.position.z) - ent.footprint.hd;
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  }
  return Math.hypot(x - ent.position.x, z - ent.position.z) - ent.radius;
}

const decor = { grass: null, grassPos: [], rocks: null, rockPos: [] };
const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
function hideDecorIn(x, z, hw, hd) {
  for (const [mesh, pos] of [[decor.grass, decor.grassPos], [decor.rocks, decor.rockPos]]) {
    if (!mesh) continue;
    let changed = false;
    for (let i = 0; i < pos.length / 2; i++) {
      if (Math.abs(pos[i * 2] - x) < hw && Math.abs(pos[i * 2 + 1] - z) < hd) {
        mesh.setMatrixAt(i, zeroMatrix);
        changed = true;
      }
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
  }
}
function createDecorations() {
  const dummy = new THREE.Object3D();
  const area = CONFIG.MAP_LIMIT + 60;

  const grassCount = 5200;
  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.16, 0.7, 4).translate(0, 0.35, 0),
    fogify(new THREE.MeshStandardMaterial({ color: 0x4f8f2f, roughness: 1 })),
    grassCount
  );
  const tint = new THREE.Color();
  let gi = 0;
  while (gi < grassCount) {
    const cx = randRange(-area, area), cz = randRange(-area, area);
    if (isNearObstacle(cx, cz, 1.5)) continue;
    const clump = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < clump && gi < grassCount; k++) {
      dummy.position.set(cx + randRange(-0.5, 0.5), 0, cz + randRange(-0.5, 0.5));
      dummy.rotation.set(randRange(-0.25, 0.25), rand() * Math.PI, randRange(-0.25, 0.25));
      dummy.scale.setScalar(randRange(0.6, 1.3));
      dummy.updateMatrix();
      grass.setMatrixAt(gi, dummy.matrix);
      decor.grassPos.push(dummy.position.x, dummy.position.z);
      tint.setHSL(0.26 + randRange(-0.03, 0.03), 0.55, 0.3 + randRange(-0.06, 0.08));
      grass.setColorAt(gi, tint);
      gi++;
    }
  }
  grass.receiveShadow = true;
  scene.add(grass);

  const rockCount = 130;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.5, 0),
    fogify(new THREE.MeshStandardMaterial({ color: 0x8a867d, roughness: 0.95, flatShading: true })),
    rockCount
  );
  let ri = 0;
  while (ri < rockCount) {
    const x = randRange(-area, area), z = randRange(-area, area);
    if (isNearObstacle(x, z, 2.5)) continue;
    dummy.position.set(x, 0.1, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    const s = randRange(0.4, 1.4);
    dummy.scale.set(s, s * randRange(0.5, 0.9), s * randRange(0.8, 1.2));
    dummy.updateMatrix();
    rocks.setMatrixAt(ri++, dummy.matrix);
    decor.rockPos.push(x, z);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);
  decor.grass = grass;
  decor.rocks = rocks;
}

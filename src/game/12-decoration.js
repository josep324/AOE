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
/* Textura d'una mata de gespa (fulles blanquinoses: el color el dona cada instància) */
function grassTuftTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const rng = mulberry32(0x6a55);
  for (let i = 0; i < 46; i++) {
    const x0 = 20 + rng() * 88, lean = (rng() - 0.5) * 50, h = 50 + rng() * 74, w = 2.5 + rng() * 3.5;
    const v = Math.floor(170 + rng() * 85);
    g.fillStyle = `rgb(${Math.floor(v * 0.82)},${v},${Math.floor(v * 0.6)})`;
    g.beginPath();
    g.moveTo(x0 - w, 128);
    g.quadraticCurveTo(x0 + lean * 0.3, 128 - h * 0.6, x0 + lean, 128 - h);
    g.quadraticCurveTo(x0 + lean * 0.3 + w * 0.4, 128 - h * 0.55, x0 + w, 128);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function createDecorations() {
  const dummy = new THREE.Object3D();
  const area = CONFIG.MAP_LIMIT + 60;

  // Mates de gespa: dos plans creuats amb transparència, normals cap amunt (il·luminació suau)
  // Quatre cares (dos plans creuats, cada un per davant i per darrere) per no dependre de DoubleSide
  const plane = (ry) => new THREE.PlaneGeometry(1.0, 0.7).translate(0, 0.35, 0).rotateY(ry);
  const tuftGeo = mergeGeometries([plane(0), plane(Math.PI), plane(Math.PI / 2), plane(-Math.PI / 2)]);
  const nrm = tuftGeo.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const grassCount = 9000;
  const grass = new THREE.InstancedMesh(
    tuftGeo,
    fogify(new THREE.MeshStandardMaterial({ map: grassTuftTexture(), alphaTest: 0.45, roughness: 1 })),
    grassCount
  );
  const tint = new THREE.Color();
  let gi = 0;
  const inner = CONFIG.MAP_LIMIT - 1;
  while (gi < grassCount) {
    const cx = randRange(-inner, inner), cz = randRange(-inner, inner);
    if (isNearObstacle(cx, cz, 1.5)) continue;
    const clump = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < clump && gi < grassCount; k++) {
      dummy.position.set(cx + randRange(-0.7, 0.7), 0, cz + randRange(-0.7, 0.7));
      dummy.rotation.set(0, rand() * Math.PI, 0);
      const sc = randRange(0.45, 1.0);
      dummy.scale.set(sc, sc * randRange(0.7, 1.2), sc);
      dummy.updateMatrix();
      grass.setMatrixAt(gi, dummy.matrix);
      decor.grassPos.push(dummy.position.x, dummy.position.z);
      tint.setHSL(0.22 + randRange(-0.03, 0.03), 0.36 + randRange(-0.08, 0.08), 0.31 + randRange(-0.05, 0.05));
      grass.setColorAt(gi, tint);
      gi++;
    }
  }
  grass.receiveShadow = true;
  scene.add(grass);

  const rockCount = 150;
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
    const k = 1 + (hash2(x * 7.1 + z * 3.3, y * 5.7) - 0.5) * 0.35;
    rp.setXYZ(i, x * k, y * k, z * k);
  }
  rockGeo.computeVertexNormals();
  const rocks = new THREE.InstancedMesh(rockGeo, kitMat('granite', { flatShading: true }), rockCount);
  let ri = 0;
  while (ri < rockCount) {
    const x = randRange(-area, area), z = randRange(-area, area);
    if (isNearObstacle(x, z, 2.5)) continue;
    dummy.position.set(x, 0.05, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    const s = randRange(0.4, 1.4);
    dummy.scale.set(s, s * randRange(0.45, 0.8), s * randRange(0.8, 1.2));
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

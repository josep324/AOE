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

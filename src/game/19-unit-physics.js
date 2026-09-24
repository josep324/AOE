/* =====================================================================
   ACTUALITZACIÓ D'UNITATS
   ===================================================================== */
function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function resolveObstacleCollision(u, dt) {
  for (const o of state.obstacles) {
    if (o.gateTeam === u.team) continue;
    const s = pushOutOf(u.position, o, u.radius);
    if (s && u.target) {
      // Llisquem per la tangent cap al costat del destí per no quedar encallats
      const wp = (u.path && u.path[0]) || u.target;
      let tx = -s.nz, tz = s.nx;
      const toX = wp.x - u.position.x, toZ = wp.z - u.position.z;
      if (tx * toX + tz * toZ < 0) { tx = -tx; tz = -tz; }
      u.position.x += tx * u.speed * dt * 0.4;
      u.position.z += tz * u.speed * dt * 0.4;
    }
  }
}

function separateUnits() {
  const units = state.units;
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (a.garrisoned) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (b.garrisoned) continue;
      if (a.target && b.target) continue;
      const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001;
      const overlap = (min - d);
      const nx = d2 > 0 ? dx / d : 1, nz = d2 > 0 ? dz / d : 0;
      if (!a.target && !b.target) {
        a.position.x -= nx * overlap * 0.5; a.position.z -= nz * overlap * 0.5;
        b.position.x += nx * overlap * 0.5; b.position.z += nz * overlap * 0.5;
      } else if (!a.target) {
        a.position.x -= nx * overlap; a.position.z -= nz * overlap;
      } else {
        b.position.x += nx * overlap; b.position.z += nz * overlap;
      }
    }
  }
}

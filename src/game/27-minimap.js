/* =====================================================================
   MINIMAPA (rotat segons la càmera, en forma de diamant com a l'AoE II)
   ===================================================================== */
const mm = {
  el: document.getElementById('minimap'),
  ctx: null, size: 150, dpr: 1, scale: 1, dragging: false, timer: 0,
};
mm.ctx = mm.el.getContext('2d');
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function mmResize() {
  const rect = mm.el.parentElement.getBoundingClientRect();
  const size = Math.max(80, Math.floor(Math.min(rect.width, rect.height) - 12));
  mm.size = size;
  mm.dpr = Math.min(window.devicePixelRatio || 1, 2);
  mm.el.style.width = size + 'px';
  mm.el.style.height = size + 'px';
  mm.el.width = size * mm.dpr;
  mm.el.height = size * mm.dpr;
  mm.scale = (size / 2 - 3) / (CONFIG.MAP_LIMIT * Math.SQRT2);
}
function mmAxes() {
  const yaw = camState.yaw;
  return { fx: -Math.sin(yaw), fz: -Math.cos(yaw), rx: Math.cos(yaw), rz: -Math.sin(yaw) };
}
function worldToMM(x, z, ax) {
  const c = mm.size / 2;
  return [c + (x * ax.rx + z * ax.rz) * mm.scale, c - (x * ax.fx + z * ax.fz) * mm.scale];
}
function mmToWorld(px, py) {
  const ax = mmAxes();
  const c = mm.size / 2;
  const r = (px - c) / mm.scale, f = -(py - c) / mm.scale;
  return new THREE.Vector3(r * ax.rx + f * ax.fx, 0, r * ax.rz + f * ax.fz);
}
const MM_COLORS = { tree: '#1f5a24', gold: '#ffd23a', stone: '#c8c8c8', berries: '#e0457f', sheep: '#ffffff', farm: '#b08a4a',
  deer: '#e0a868', boar: '#9a6a44', wolf: '#a8aeb6', fish: '#9fe2ff' };
function mmRect(ctx, e, ax, fill, stroke) {
  const { hw, hd } = e.footprint;
  const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([dx, dz]) => worldToMM(e.position.x + dx, e.position.z + dz, ax));
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function drawMinimap() {
  const ctx = mm.ctx, L = CONFIG.MAP_LIMIT, ax = mmAxes();
  ctx.setTransform(mm.dpr, 0, 0, mm.dpr, 0, 0);
  ctx.clearRect(0, 0, mm.size, mm.size);
  // Terreny
  const corners = [[-L, -L], [L, -L], [L, L], [-L, L]].map(([x, z]) => worldToMM(x, z, ax));
  ctx.beginPath();
  corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const grad = ctx.createRadialGradient(mm.size / 2, mm.size / 2, 5, mm.size / 2, mm.size / 2, mm.size / 1.4);
  grad.addColorStop(0, '#5c9a3c');
  grad.addColorStop(1, '#3d6e2a');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,178,90,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Aigua (mateixa transformació que la boira)
  if (WATER.any && WATER.mmCanvas) {
    ctx.save();
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const c0 = mm.size / 2;
    ctx.transform(ax.rx * mm.scale, -ax.fx * mm.scale, ax.rz * mm.scale, -ax.fz * mm.scale, c0, c0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(WATER.mmCanvas, -L, -L, 2 * L, 2 * L);
    ctx.restore();
    ctx.setTransform(mm.dpr, 0, 0, mm.dpr, 0, 0);
  }
  // Recursos
  for (const n of state.resourceNodes) {
    if (!n.group.visible) continue;
    if (n.footprint) { mmRect(ctx, n, ax, n.selected ? '#ffffff' : MM_COLORS.farm, null); continue; }
    const [x, y] = worldToMM(n.position.x, n.position.z, ax);
    ctx.fillStyle = MM_COLORS[n.subtype] || '#fff';
    const r = n.subtype === 'tree' ? 1.8 : (n.subtype === 'sheep' || n.animal) ? 1.6 : (n.subtype === 'berries' || n.subtype === 'fish') ? 1.8 : 3;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Relíquies (quadrats blancs amb vora daurada)
  for (const r of state.relics) {
    if (!r.group.visible) continue;
    const [x, y] = worldToMM(r.position.x, r.position.z, ax);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    ctx.strokeStyle = '#d8aa3a'; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
  }
  // Edificis
  for (const b of state.buildings) {
    if (!b.group.visible) continue;
    const col = b.isOwn ? '#2f6fe0' : '#e0402f';
    if (b.footprint) {
      mmRect(ctx, b, ax, b.selected ? '#ffffff' : (b.underConstruction ? (b.isOwn ? 'rgba(90,150,255,0.55)' : 'rgba(255,110,90,0.55)') : col), '#0b1a3a');
      continue;
    }
    const [x, y] = worldToMM(b.position.x, b.position.z, ax);
    const r = Math.max(3.5, b.radius * mm.scale * 0.8);
    ctx.fillStyle = b.selected ? '#ffffff' : col;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.strokeStyle = '#0b1a3a'; ctx.lineWidth = 1;
    ctx.strokeRect(x - r, y - r, r * 2, r * 2);
  }
  // Boira de guerra (textura girada igual que el minimapa)
  if (FOG.enabled) {
    ctx.save();
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const c0 = mm.size / 2;
    ctx.transform(ax.rx * mm.scale, -ax.fx * mm.scale, ax.rz * mm.scale, -ax.fz * mm.scale, c0, c0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(FOG.canvas, -L, -L, 2 * L, 2 * L);
    ctx.restore();
    ctx.setTransform(mm.dpr, 0, 0, mm.dpr, 0, 0);
  }
  // Unitats
  for (const u of state.units) {
    if (!u.group.visible) continue;
    const [x, y] = worldToMM(u.position.x, u.position.z, ax);
    ctx.fillStyle = u.selected ? '#ffffff' : u.isOwn ? '#5ab0ff' : '#ff5a4a';
    ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
  }
  // Avisos d'atac (cercles vermells que parpellegen)
  for (let i = state.pings.length - 1; i >= 0; i--) {
    const pg = state.pings[i];
    if (pg.t > 4) { state.pings.splice(i, 1); continue; }
    const [x, y] = worldToMM(pg.x, pg.z, ax);
    ctx.strokeStyle = `rgba(255,70,50,${1 - pg.t / 4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (pg.t % 1) * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Àrea visible per la càmera (projecció de les cantonades de la vista sobre el terra)
  const mapBottom = window.innerHeight - hudHeight();
  const pts = [[0, 0], [window.innerWidth, 0], [window.innerWidth, mapBottom], [0, mapBottom]].map(([sx, sy]) => {
    setRayFromScreen(sx, sy);
    const hitP = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hitP) || hitP.distanceTo(camState.target) > 600) {
      const d = raycaster.ray.direction;
      const h = Math.hypot(d.x, d.z) || 1;
      hitP.set(camState.target.x + d.x / h * 400, 0, camState.target.z + d.z / h * 400);
    }
    return worldToMM(hitP.x, hitP.z, ax);
  });
  ctx.save();
  ctx.beginPath();
  corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
function mmEventPos(e) {
  const rect = mm.el.getBoundingClientRect();
  return [e.clientX - rect.left, e.clientY - rect.top];
}
mm.el.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const [px, py] = mmEventPos(e);
  const w = clampToMap(mmToWorld(px, py));
  if (e.button === 0) {
    mm.dragging = true;
    centerOn(w, true);
  } else if (e.button === 2) {
    const units = state.selected.filter(s => s.kind === 'unit' && s.isOwn);
    if (units.length) {
      commandMove(units, w, e.shiftKey);
      spawnMoveMarker(w, e.shiftKey ? 0xfff27a : 0x8dff6a);
    }
  }
});
window.addEventListener('mousemove', (e) => {
  if (!mm.dragging) return;
  const [px, py] = mmEventPos(e);
  centerOn(clampToMap(mmToWorld(px, py)), true);
});
window.addEventListener('mouseup', () => { mm.dragging = false; });
window.addEventListener('resize', mmResize);

/* ---------- Controls de càmera (WASD / fletxes / vores / Q-E) ---------- */
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const desiredVel = new THREE.Vector3();
const edgeFactor = (d, band) => d >= band ? 0 : THREE.MathUtils.smoothstep(1 - d / band, 0, 1);
function updateCameraControls(dt) {
  const C = CONFIG.CAM;
  let mx = 0, mz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  // Vores de la pantalla: intensitat progressiva (més a prop de la vora = més ràpid)
  if (mouse.inside && !camState.grab && !mm.dragging) {
    const mapBottom = window.innerHeight - hudHeight();
    if (mouse.y < mapBottom) {
      mx -= edgeFactor(mouse.x, C.edge);
      mx += edgeFactor(window.innerWidth - 1 - mouse.x, C.edge);
      mz += edgeFactor(mouse.y, C.edge);
      mz -= edgeFactor(mapBottom - 1 - mouse.y, C.bottomEdge);
    }
  }
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (len > 0.01) camState.goal = null;     // el control manual cancel·la el lliscament

  // Rotació suau (Q/E)
  const yawInput = (keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0);
  camState.yawVel = THREE.MathUtils.damp(camState.yawVel, yawInput * C.rotSpeed, yawInput ? C.accel : C.decel, dt);
  camState.yaw += camState.yawVel * dt;

  // Desplaçament amb inèrcia: la velocitat s'acosta suaument a la desitjada
  const yaw = camState.yaw;
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const speed = C.panSpeed * camState.dist;
  desiredVel.set(0, 0, 0).addScaledVector(fwd, mz * speed).addScaledVector(right, mx * speed);
  const k = 1 - Math.exp(-(len > 0.01 ? C.accel : C.decel) * dt);
  camState.vel.lerp(desiredVel, k);
  if (camState.vel.lengthSq() < 1e-4 && len <= 0.01) camState.vel.set(0, 0, 0);
  camState.target.addScaledVector(camState.vel, dt);

  // Lliscament cap a un punt (H, Espai, grups, aldeà inactiu)
  if (camState.goal) {
    const g = 1 - Math.exp(-C.glide * dt);
    camState.target.x += (camState.goal.x - camState.target.x) * g;
    camState.target.z += (camState.goal.z - camState.target.z) * g;
    if (Math.hypot(camState.goal.x - camState.target.x, camState.goal.z - camState.target.z) < 0.05) camState.goal = null;
  }
  clampToMap(camState.target);

  camState.dist = THREE.MathUtils.damp(camState.dist, camState.targetDist, 8, dt);
  updateCamera();
}

/* ---------- Cursor segons el que hi ha sota el ratolí ---------- */
let hoverFrame = 0;
function updateHoverCursor() {
  if (camState.grab) return;
  if (placing.type) { canvas.style.cursor = 'crosshair'; return; }
  if (++hoverFrame % 3 !== 0) return;
  if (!mouse.overCanvas || mouse.down) return;
  const e = pickEntity(mouse.x, mouse.y);
  const hasUnits = state.selected.some(s => s.kind === 'unit' && s.isOwn);
  canvas.style.cursor = e ? 'pointer' : (hasUnits ? 'crosshair' : 'default');
}

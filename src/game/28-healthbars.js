/* =====================================================================
   BARRES DE VIDA (canvas 2D superposat)
   ===================================================================== */
const hpCanvas = document.getElementById('hpbars');
const hpCtx = hpCanvas.getContext('2d');
function resizeHpCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  hpCanvas.width = window.innerWidth * dpr;
  hpCanvas.height = window.innerHeight * dpr;
  hpCanvas.style.width = window.innerWidth + 'px';
  hpCanvas.style.height = window.innerHeight + 'px';
  hpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeHpCanvas);
function drawBar(x, y, w, f, color) {
  hpCtx.fillStyle = 'rgba(0,0,0,0.65)';
  hpCtx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  hpCtx.fillStyle = color;
  hpCtx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, f)), 4);
}
function drawHealthBars() {
  hpCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const maxY = window.innerHeight - hudHeight();
  const recent = (e) => e.lastHitT !== undefined && state.elapsed - e.lastHitT < 6;
  for (const u of state.units) {
    if (!u.group.visible || u.garrisoned) continue;
    if (!u.selected && !(u.hp < u.maxHp && (recent(u) || u.isOwn))) continue;
    const sp = worldToScreen(u.position, u.barH || 2.75);
    if (!sp.visible || sp.y > maxY || sp.x < -20 || sp.x > window.innerWidth + 20) continue;
    const f = u.hp / u.maxHp;
    drawBar(sp.x, sp.y, 26, f, u.isOwn ? (f > 0.5 ? '#5fe070' : f > 0.25 ? '#f0c040' : '#ff5040') : '#ff4a3a');
  }
  for (const b of state.buildings) {
    if (!b.group.visible) continue;
    const show = b.selected || b.hp < b.maxHp && recent(b) || (b.underConstruction && b.isOwn);
    if (!show) continue;
    const sp = worldToScreen(b.position, (b.height || 10) + 1.2);
    if (!sp.visible || sp.y > maxY) continue;
    if (b.underConstruction) drawBar(sp.x, sp.y, 60, b.progress, '#6ab8ff');
    else drawBar(sp.x, sp.y, 64, b.hp / b.maxHp, b.isOwn ? '#5fe070' : '#ff4a3a');
  }
}

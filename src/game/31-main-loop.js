/* =====================================================================
   BUCLE PRINCIPAL
   ===================================================================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const clockEl = document.getElementById('clock');
const fpsEl = document.getElementById('fps');
let fpsFrames = 0, fpsTime = 0, lastClockSec = -1;
let uiTimer = 0, fogTimer = 0, aiTimer = 0, overTimer = 0, fogReady = false;
const idleCountEl = document.getElementById('idle-count');

function animate() {
  requestAnimationFrame(animate);
  const realDt = Math.min(clock.getDelta(), 0.05);
  const dt = state.paused ? 0 : realDt * CONFIG.TIME_SCALE;
  state.elapsed += dt;
  const t = state.elapsed;

  updateCameraControls(realDt);

  separateUnits();
  for (const u of state.units) updateUnit(u, dt);
  updateMarkers(dt);
  updateResourceNodes(dt);
  updateParticles(dt);
  updateFloaters(dt);
  updateTraining(dt);
  updateConstruction(dt);
  updateProjectiles(dt);
  updateDefensiveBuildings(dt);
  for (const pg of state.pings) pg.t += dt;
  fogTimer += dt;
  if (fogTimer >= 0.2 || !fogReady) { fogTimer = 0; fogReady = true; updateFog(); }
  aiTimer += dt;
  if (aiTimer >= 0.5) { aiTimer = 0; aiTick(); }
  overTimer += dt;
  if (overTimer >= 1) { overTimer = 0; checkGameOver(); }
  updatePlacement();
  updateTrainingUI();
  updateRallyFlag(t);
  mm.timer += realDt;
  if (mm.timer >= 0.1) { mm.timer = 0; drawMinimap(); }

  // Refresc periòdic del HUD (estat dels aldeans, càrrega, recurs restant)
  uiTimer += realDt;
  if (uiTimer >= 0.2) {
    uiTimer = 0;
    const techSig = `${PLAYER.age}:${PLAYER.techs.size}:${state.buildings.filter(b => b.isOwn && !b.underConstruction).length}`;
    if (techSig !== lastTechSig) { lastTechSig = techSig; updateSelectionUI(); }
    else if (selectionSignature() !== lastSelSignature) updateSelectionUI(true);
    idleCountEl.textContent = state.units.filter(u => u.isOwn && u.subtype === 'villager' && u.state === STATE.IDLE).length;
    updatePopulationUI();
  }
  for (const a of state.animated) a.update(t, dt);

  // Pulsació dels indicadors de selecció
  for (const m of selMaterials.values()) {
    m.ring.opacity = 0.75 + 0.25 * Math.sin(t * 5);
    m.disc.opacity = 0.6 + 0.25 * Math.sin(t * 5);
  }
  const pulse = 1 + Math.sin(t * 4) * 0.035;
  for (const s of state.selected) s.selection.scale.setScalar(pulse);

  updateSun();
  sky.position.copy(camera.position);
  updateHoverCursor();

  renderer.render(scene, camera);
  drawHealthBars();

  // Rellotge i FPS
  fpsFrames++; fpsTime += realDt;
  if (fpsTime >= 0.5) {
    fpsEl.textContent = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0; fpsTime = 0;
  }
  const sec = Math.floor(t);
  if (sec !== lastClockSec) {
    lastClockSec = sec;
    clockEl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
}

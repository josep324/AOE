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

/* ---------- Simulació a pas fix ----------
   La lògica del joc avança sempre en passos de 1/60 s, independentment dels fotogrames per segon:
   el comportament és el mateix a qualsevol ordinador (base per al multijugador de l'última fase). */
const SIM_STEP = 1 / 60;
let simAccumulator = 0;
function simulate(dt) {
  state.elapsed += dt;
  spatialRebuild();
  separateUnits();
  for (const u of state.units) updateUnit(u, dt);
  updateResourceNodes(dt);
  updateTraining(dt);
  updateConstruction(dt);
  updateProjectiles(dt);
  updateDefensiveBuildings(dt);
  updateRelics(dt);
  for (const pg of state.pings) pg.t += dt;
  fogTimer += dt;
  if (fogTimer >= 0.2 || !fogReady) { fogTimer = 0; fogReady = true; updateFog(); }
  aiTimer += dt;
  if (aiTimer >= 0.5) { aiTimer = 0; aiTick(); }
  overTimer += dt;
  if (overTimer >= 1) { overTimer = 0; checkGameOver(); }
}

function animate() {
  requestAnimationFrame(animate);
  const realDt = Math.min(clock.getDelta(), 0.1);
  const frameDt = state.paused ? 0 : realDt * CONFIG.TIME_SCALE;
  // Passos fixos de simulació (amb límit per no quedar bloquejats si el navegador s'alenteix)
  simAccumulator += frameDt;
  const maxSteps = Math.ceil(6 * Math.max(1, CONFIG.TIME_SCALE));
  let steps = 0;
  while (simAccumulator >= SIM_STEP && steps < maxSteps) {
    simulate(SIM_STEP);
    simAccumulator -= SIM_STEP;
    steps++;
  }
  if (steps >= maxSteps) simAccumulator = 0;
  const dt = frameDt;              // efectes visuals (partícules, marcadors…) al ritme dels fotogrames
  const t = state.elapsed;

  if (!fogReady) { fogReady = true; updateFog(); }
  updateCameraControls(realDt);
  updateMarkers(dt);
  updateParticles(dt);
  updateFloaters(dt);
  updateSparkles(dt);
  animateRelics(state.elapsed);
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
  flushGroundPaint();
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

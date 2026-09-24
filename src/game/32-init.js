/* =====================================================================
   INICI
   ===================================================================== */
Object.assign(state.resources, CONFIG.STARTING_RESOURCES);
for (const k of Object.keys(ENEMY.res)) ENEMY.res[k] = CONFIG.STARTING_RESOURCES[k] + AI.diff.bonusRes;
navInit();
rebuildNav();
fogInit();
updateFog();
updateAgeUI();
refreshSaveInfo();
resizeHpCanvas();
mmResize();
updateCamera();
updateSun();
updateResourcesUI();
updatePopulationUI();
updateSelectionUI();
animate();

window.__RTS_READY = true;
const loadingEl = document.getElementById('loading');
loadingEl.style.opacity = '0';
setTimeout(() => loadingEl.remove(), 500);

// Exposem l'estat per depurar des de la consola
window.RTS = { THREE, scene, camera, camState, renderer, state, CONFIG, queueVillager, queueUnit, townCenter, enemyTC, mouse, NAV, createBuilding,
  commandBuild, startPlacement, placing, findPath, popCap, createSoldier, commandAttack, AI, FOG, ENEMY, DIFFICULTY, ringTownBell, kill: (e) => killEntity(e, null),
  PLAYER, completeTech, itemBlockReason, createSoldierAt: createSoldier, saveGame, loadGame, readSave, serializeGame,
  createTradeCart, marketTrade, orderTrade, exportGameCode, importGameCode, setStance, orderBuild, orderGather, depleteResource, simulate };

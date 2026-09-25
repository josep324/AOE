/* =====================================================================
   INICI
   ===================================================================== */
Object.assign(state.resources, CONFIG.STARTING_RESOURCES);
for (const k of Object.keys(ENEMY.res)) ENEMY.res[k] = CONFIG.STARTING_RESOURCES[k] + AI.diff.bonusRes;
navInit();
buildWorld(WORLD.type);
camState.target.set(BASES[PLAYER.id].x + 5, 0, BASES[PLAYER.id].z + 5);
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
initResourceIcons();
animate();

window.__RTS_READY = true;
const loadingEl = document.getElementById('loading');
loadingEl.style.opacity = '0';
setTimeout(() => loadingEl.remove(), 500);

// Exposem l'estat per depurar des de la consola
window.RTS = { THREE, scene, camera, camState, renderer, state, CONFIG, queueVillager, queueUnit, get townCenter() { return townCenter; }, get enemyTC() { return enemyTC; }, mouse, NAV, createBuilding,
  commandBuild, startPlacement, placing, findPath, popCap, createSoldier, commandAttack, AI, FOG, ENEMY, DIFFICULTY, ringTownBell, kill: (e) => killEntity(e, null),
  PLAYER, completeTech, itemBlockReason, createSoldierAt: createSoldier, saveGame, loadGame, readSave, serializeGame,
  createTradeCart, marketTrade, orderTrade, exportGameCode, importGameCode, setStance, orderBuild, orderGather, depleteResource, simulate, createTownCenter, setTeamCiv, createVillager, createTradeCart, snapGateToWall, costFor, commandAttackGround, orderGarrison, ungarrison, togglePack, canGarrison, commandAttack, uniqueUnitOf,
  commandMove, setFormation, formationSlots, setSelection, updateSelectionUI,
  buildWorld, resetWorld, WORLD, WATER, updateFog, commandGather, canPlaceDock, findDockSpot, orderUnload, spawnUnit, orderAttack, orderGarrison, createAnimal, createFish, waterCell,
  orderConvert, orderHeal, orderPickRelic, orderDepositRelic, createRelic, convertEntity, checkGameOver, createKings, victoryCheck, issueRightClick, unitDropRelic, pickEntity };

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
  MAP_SIZE, MAP_SIZES,
  orderConvert, orderHeal, orderPickRelic, orderDepositRelic, createRelic, convertEntity, checkGameOver, createKings, victoryCheck, issueRightClick, unitDropRelic, pickEntity };

// Acció pendent després de canviar la mida del mapa (recàrrega): començar o carregar la partida
{
  const pending = takePending();
  if (pending && pending.start) {
    const P = pending.start;
    pickChoice('map-choices', 'map', P.map);
    pickChoice('civ-choices', 'civ', P.civ);
    pickChoice('enemy-civ-choices', 'civ', P.enemyCiv);
    pickChoice('victory-choices', 'victory', P.victory);
    pickChoice('diff-choices', 'diff', P.diff);
    document.getElementById('fog-toggle').checked = P.fog !== false;
    document.getElementById('start-btn').click();
  } else if (pending && pending.load) {
    startScreen.classList.add('hidden');
    if (loadGame(pending.load)) { state.paused = false; canvas.focus(); }
    else startScreen.classList.remove('hidden');
  }
}

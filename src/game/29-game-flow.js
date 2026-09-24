/* =====================================================================
   PAUSA, INICI I FINAL DE PARTIDA
   ===================================================================== */
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const endScreen = document.getElementById('end-screen');
let chosenDiff = 'normal';
document.querySelectorAll('#diff-choices .choice').forEach(btn => btn.addEventListener('click', () => {
  chosenDiff = btn.dataset.diff;
  document.querySelectorAll('#diff-choices .choice').forEach(b => b.classList.toggle('on', b === btn));
}));
document.getElementById('start-btn').addEventListener('click', () => {
  AI.diff = DIFFICULTY[chosenDiff];
  AI.nextWaveAt = AI.diff.firstWave;
  for (const k of Object.keys(ENEMY.res)) ENEMY.res[k] = CONFIG.STARTING_RESOURCES[k] + AI.diff.bonusRes;
  FOG.enabled = document.getElementById('fog-toggle').checked;
  startScreen.classList.add('hidden');
  state.paused = false;
  canvas.focus();
  toast(`Dificultat: ${AI.diff.label}. Recursos inicials: 200 🍖 · 200 🪵 · 100 🪙 · 200 🪨`);
});

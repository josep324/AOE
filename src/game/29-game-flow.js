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
/* ---------- Tria del tipus de mapa ---------- */
let chosenMap = 'random';
const mapChoices = document.getElementById('map-choices');
for (const [id, M] of [['random', { icon: '🎲', name: 'Aleatori', desc: 'Un dels quatre tipus a l\'atzar' }], ...Object.entries(MAP_TYPES)]) {
  const b = document.createElement('button');
  b.className = 'choice' + (id === chosenMap ? ' on' : '');
  b.dataset.map = id;
  b.textContent = `${M.icon} ${M.name}`;
  b.title = M.desc;
  b.addEventListener('click', () => {
    chosenMap = id;
    mapChoices.querySelectorAll('.choice').forEach(x => x.classList.toggle('on', x === b));
  });
  mapChoices.appendChild(b);
}
/* ---------- Mida del mapa (les de l'AoE II) ---------- */
let chosenSize = MAP_SIZE;
const sizeChoices = document.getElementById('size-choices');
for (const [id, S] of Object.entries(MAP_SIZES)) {
  const b = document.createElement('button');
  b.className = 'choice' + (id === chosenSize ? ' on' : '');
  b.dataset.size = id;
  b.textContent = `${S.name} ${S.tiles}×${S.tiles}`;
  b.title = `Com el mapa ${S.name.toLowerCase()} de l'AoE II: ${S.tiles}×${S.tiles} caselles (${S.limit * 2}×${S.limit * 2} m)`;
  b.addEventListener('click', () => {
    chosenSize = id;
    sizeChoices.querySelectorAll('.choice').forEach(x => x.classList.toggle('on', x === b));
  });
  sizeChoices.appendChild(b);
}
/* Canvia la mida del mapa: es desa i es recarrega la pàgina; després es reprèn l'acció pendent */
const PENDING_KEY = 'imperis.pending';
function reloadWithSize(size, pending) {
  try {
    localStorage.setItem(MAP_SIZE_KEY, size);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch { toast('⚠️ No es pot canviar la mida del mapa (emmagatzematge no disponible)'); return false; }
  location.reload();
  return true;
}
function takePending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
/* Marca un botó d'una fila d'opcions (en reprendre la partida després de recarregar) */
function pickChoice(rowId, attr, value) {
  const b = [...document.querySelectorAll(`#${rowId} .choice`)].find(x => x.dataset[attr] === value);
  if (b) b.click();
}
let chosenVictory = 'standard';
document.querySelectorAll('#victory-choices .choice').forEach(btn => btn.addEventListener('click', () => {
  chosenVictory = btn.dataset.victory;
  document.querySelectorAll('#victory-choices .choice').forEach(b => b.classList.toggle('on', b === btn));
}));
/* Regicidi: cada bàndol comença amb un rei a cavall al costat del Centre de Ciutat */
function createKings() {
  for (const team of [PLAYER.id, ENEMY.id]) {
    if (hasKing(team)) continue;
    const tc = state.buildings.find(b => b.team === team && b.subtype === 'towncenter');
    if (!tc) continue;
    const s = findSpawnSpot(tc);
    const k = createSoldier('king', s.x, s.z, team);
    k.stance = 'stand';
  }
}
/* ---------- Tria de civilització ---------- */
let chosenCiv = 'franks', chosenEnemyCiv = 'random';
const civChoices = document.getElementById('civ-choices');
const enemyCivChoices = document.getElementById('enemy-civ-choices');
for (const [id, C] of Object.entries(CIVS)) {
  const b = document.createElement('button');
  b.className = 'choice civ-card' + (id === chosenCiv ? ' on' : '');
  b.dataset.civ = id;
  b.innerHTML = `<b>${C.icon} ${C.name}</b><small>${C.desc}</small><ul>${C.bonuses.map(t => `<li>${t}</li>`).join('')}</ul>`;
  b.addEventListener('click', () => {
    chosenCiv = id;
    civChoices.querySelectorAll('.choice').forEach(x => x.classList.toggle('on', x === b));
  });
  civChoices.appendChild(b);
}
for (const [id, label] of [['random', '🎲 Aleatòria'], ...Object.entries(CIVS).map(([k, C]) => [k, `${C.icon} ${C.name}`])]) {
  const b = document.createElement('button');
  b.className = 'choice' + (id === chosenEnemyCiv ? ' on' : '');
  b.textContent = label;
  b.dataset.civ = id;
  b.addEventListener('click', () => {
    chosenEnemyCiv = id;
    enemyCivChoices.querySelectorAll('.choice').forEach(x => x.classList.toggle('on', x === b));
  });
  enemyCivChoices.appendChild(b);
}
/* Assigna la civilització a un equip i refà els models dels seus edificis i unitats */
function setTeamCiv(T, civ) {
  T.civ = civ;
  T.mods = defaultMods();
  applyCivMods(T);
  for (const b of state.buildings.filter(b => b.team === T.id)) rebuildBuildingModel(b);
  for (const u of state.units.filter(u => u.team === T.id)) rebuildUnitModel(u);
}
function updateCivLabels() {
  const P = civOf(PLAYER.id), E = civOf(ENEMY.id);
  PLAYER.name = `${P.name} (blau)`;
  ENEMY.name = `${E.name} (vermell)`;
  document.getElementById('civ-label').textContent = `${P.icon} ${P.name}`;
}
updateCivLabels();

document.getElementById('start-btn').addEventListener('click', () => {
  if (chosenSize !== MAP_SIZE) {
    reloadWithSize(chosenSize, { start: { map: chosenMap, civ: chosenCiv, enemyCiv: chosenEnemyCiv, victory: chosenVictory,
      diff: chosenDiff, fog: document.getElementById('fog-toggle').checked } });
    return;
  }
  // Mapa: es genera de nou si el tipus triat no és el que hi ha
  const types = Object.keys(MAP_TYPES);
  const mapType = chosenMap === 'random' ? types[Math.floor(Math.random() * types.length)] : chosenMap;   // atzar-ui
  if (mapType !== WORLD.type) { resetWorld(); buildWorld(mapType, WORLD.seed); updateFog(); }
  centerOn(townCenter.position, true);
  const others = Object.keys(CIVS).filter(k => k !== chosenCiv);
  setTeamCiv(PLAYER, chosenCiv);
  setTeamCiv(ENEMY, chosenEnemyCiv === 'random' ? others[Math.floor(Math.random() * others.length)] : chosenEnemyCiv);   // atzar-ui
  updateCivLabels();
  state.victory = chosenVictory;
  if (state.victory === 'regicide') createKings();
  updateVictoryUI();
  AI.diff = DIFFICULTY[chosenDiff];
  AI.nextWaveAt = AI.diff.firstWave;
  for (const k of Object.keys(ENEMY.res)) ENEMY.res[k] = CONFIG.STARTING_RESOURCES[k] + AI.diff.bonusRes;
  FOG.enabled = document.getElementById('fog-toggle').checked;
  startScreen.classList.add('hidden');
  state.paused = false;
  canvas.focus();
  toast(`${MAP_TYPES[WORLD.type].icon} ${MAP_TYPES[WORLD.type].name} · ${civOf(PLAYER.id).icon} ${civOf(PLAYER.id).name} contra ${civOf(ENEMY.id).icon} ${civOf(ENEMY.id).name} · ${AI.diff.label}`);
});

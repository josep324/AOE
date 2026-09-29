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
  for (const team of GAME.players) {
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
/* ---------- Jugadors i equips (fase 20) ---------- */
let chosenLayout = '1v1';
const chosenSlotCiv = { 3: 'random', 4: 'random' };
const layoutChoices = document.getElementById('layout-choices'), slotChoices = document.getElementById('slot-choices');
const LAYOUT_TIPS = {
  '1v1': 'Tu contra una IA', '1v2': 'Tu sol contra dues IA aliades entre elles', '2v2': 'Tu i una IA aliada contra dues IA',
  '1v3': 'Tu sol contra tres IA aliades entre elles', ffa3: 'Tres jugadors, cadascun pel seu compte', ffa4: 'Quatre jugadors, cadascun pel seu compte',
};
const DOT = (id) => `<span class="pdot" style="background:#${TEAMS[id].color.toString(16).padStart(6, '0')}"></span>`;
function renderSlots() {
  const L = LAYOUTS[chosenLayout];
  enemyCivChoices.querySelector('span').innerHTML = Object.keys(L.side).length > 2 ? `${DOT(2)} Rival (vermell):` : 'Rival:';
  const extra = Object.keys(L.side).map(Number).filter(id => id > 2);
  slotChoices.innerHTML = '';
  slotChoices.classList.toggle('hidden', !extra.length);
  if (!extra.length) return;
  slotChoices.insertAdjacentHTML('beforeend', `<span class="opt-lbl">Altres:</span>`);
  for (const id of extra) {
    const lab = document.createElement('label');
    lab.className = 'slot';
    const role = L.side[id] === L.side[1] ? 'aliat' : 'rival';
    lab.innerHTML = `${DOT(id)}<span>${COLOR_NAME[id]} (${role})</span>`;
    const sel = document.createElement('select');
    sel.dataset.slot = id;
    for (const [k, t] of [['random', '🎲 Aleatòria'], ...Object.entries(CIVS).map(([k, C]) => [k, `${C.icon} ${C.name}`])]) {
      const o = document.createElement('option'); o.value = k; o.textContent = t; if (k === chosenSlotCiv[id]) o.selected = true; sel.appendChild(o);
    }
    sel.addEventListener('change', () => { chosenSlotCiv[id] = sel.value; });
    lab.appendChild(sel);
    slotChoices.appendChild(lab);
  }
}
for (const [id, L] of Object.entries(LAYOUTS)) {
  const b = document.createElement('button');
  b.className = 'choice' + (id === chosenLayout ? ' on' : '');
  b.dataset.layout = id;
  b.textContent = L.name;
  b.title = LAYOUT_TIPS[id] || '';
  b.addEventListener('click', () => {
    chosenLayout = id;
    layoutChoices.querySelectorAll('.choice').forEach(x => x.classList.toggle('on', x === b));
    renderSlots();
  });
  layoutChoices.appendChild(b);
}
renderSlots();
/* Assigna la civilització a un equip i refà els models dels seus edificis i unitats */
function setTeamCiv(T, civ) {
  T.civ = civ;
  T.mods = defaultMods();
  applyCivMods(T);
  for (const b of state.buildings.filter(b => b.team === T.id)) {
    // Vida dels edificis que ja hi ha segons la nova civilització (Bizantins: +20%)
    const f = T.mods.buildingHpMul / (b.bhm || 1);
    if (f !== 1) { b.maxHp = Math.round(b.maxHp * f); b.hp = Math.round(b.hp * f); b.bhm = T.mods.buildingHpMul; }
    rebuildBuildingModel(b);
  }
  for (const u of state.units.filter(u => u.team === T.id)) rebuildUnitModel(u);
}
/* Sortida pròpia d'una civilització (Xinesos: més aldeans i menys recursos) */
function applyCivStart(T) {
  const st = civOf(T.id).mods.start;
  if (!st) return;
  for (const [k, v] of Object.entries(st.res || {})) T.res[k] = Math.max(0, T.res[k] + v);
  const tc = state.buildings.find(b => b.team === T.id && b.subtype === 'towncenter');
  for (let i = 0; tc && i < (st.villagers || 0); i++) { const s = findSpawnSpot(tc); createVillager(s.x, s.z, T.id); }
  if (T === PLAYER) { updateResourcesUI(); updatePopulationUI(); }
}
function updateCivLabels() {
  const P = civOf(PLAYER.id);
  for (const id of GAME.players) TEAMS[id].name = `${civOf(id).name} (${COLOR_NAME[id]})`;
  document.getElementById('civ-label').textContent = `${P.icon} ${P.name}`;
}
updateCivLabels();

document.getElementById('start-btn').addEventListener('click', () => {
  if (chosenSize !== MAP_SIZE) {
    reloadWithSize(chosenSize, { start: { map: chosenMap, civ: chosenCiv, enemyCiv: chosenEnemyCiv, victory: chosenVictory, layout: chosenLayout, slots: { ...chosenSlotCiv },
      diff: chosenDiff, fog: document.getElementById('fog-toggle').checked } });
    return;
  }
  // Mapa: es genera de nou si el tipus triat o els jugadors no són els que hi ha
  const types = Object.keys(MAP_TYPES);
  const mapType = chosenMap === 'random' ? types[Math.floor(Math.random() * types.length)] : chosenMap;   // atzar-ui
  setLayout(chosenLayout);
  if (mapType !== WORLD.type || WORLD.layout !== GAME.layout) { resetWorld(); buildWorld(mapType, WORLD.seed); updateFog(); }
  centerOn(townCenter.position, true);
  const others = Object.keys(CIVS).filter(k => k !== chosenCiv);
  const pick = (c) => c === 'random' ? others[Math.floor(Math.random() * others.length)] : c;   // atzar-ui
  setTeamCiv(PLAYER, chosenCiv);
  setTeamCiv(ENEMY, pick(chosenEnemyCiv));
  for (const id of GAME.players) if (id > 2) setTeamCiv(TEAMS[id], pick(chosenSlotCiv[id]));
  updateCivLabels();
  state.victory = chosenVictory;
  if (state.victory === 'regicide') createKings();
  updateVictoryUI();
  // Una IA per a cada altre jugador (també per a l'aliat), totes amb la dificultat triada
  for (const A of AIS) if (A.team !== ENEMY.id && !GAME.players.includes(A.team)) A.enabled = false;
  for (const id of GAME.players) {
    if (id === PLAYER.id) continue;
    const A = id === ENEMY.id ? AI : enableAIFor(id, DIFFICULTY[chosenDiff]);
    aiReset(A, DIFFICULTY[chosenDiff]);
    const B = BASES[id];
    A.foe = aiNearestFoe(id, B ? new THREE.Vector3(B.x, 0, B.z) : null) || PLAYER.id;
    for (const k of Object.keys(TEAMS[id].res)) TEAMS[id].res[k] = CONFIG.STARTING_RESOURCES[k] + A.diff.bonusRes;
  }
  for (const id of GAME.players) applyCivStart(TEAMS[id]);
  FOG.enabled = document.getElementById('fog-toggle').checked;
  startScreen.classList.add('hidden');
  state.paused = false;
  canvas.focus();
  const nm = (id) => `${civOf(id).icon} ${civOf(id).name}`;
  const mates = GAME.players.filter(t => t !== PLAYER.id && allied(t, PLAYER.id)), foes = GAME.players.filter(t => hostile(t, PLAYER.id));
  toast(`${MAP_TYPES[WORLD.type].icon} ${MAP_TYPES[WORLD.type].name} · ${[PLAYER.id, ...mates].map(nm).join(' + ')} contra ${foes.map(nm).join(GAME.players.length > 2 && !mates.length && new Set(foes.map(sideOf)).size > 1 ? ' · ' : ' + ')} · ${AI.diff.label}`);
});

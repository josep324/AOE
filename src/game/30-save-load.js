/* =====================================================================
   DESAR I CARREGAR PARTIDA (localStorage)
   ===================================================================== */
const SAVE_KEY = 'imperis3d-save-v1';
function r2(v) { return Math.round(v * 100) / 100; }
function serializeGame() {
  const ents = [], idx = new Map();
  const add = (e, data) => { idx.set(e, ents.length); ents.push(data); };
  for (const n of state.resourceNodes) {
    if (n.subtype === 'farm') continue;
    add(n, { k: 'res', sub: n.subtype, x: r2(n.position.x), z: r2(n.position.z), amount: n.amount, scale: r2(n.group.scale.x), killed: !!n.killed, dense: n.dense || undefined,
             hp: n.animal ? r2(n.hp) : undefined, alive: n.animal ? n.alive : undefined });
  }
  const farms = state.resourceNodes.filter(n => n.subtype === 'farm');
  for (const b of state.buildings.concat(farms)) {
    add(b, {
      k: 'bld', sub: b.subtype, team: b.team, x: r2(b.position.x), z: r2(b.position.z), rot: b.rot || 0,
      progress: b.subtype === 'towncenter' && !b.underConstruction ? 1 : b.progress, hp: Math.round(b.hp), amount: b.subtype === 'farm' ? b.amount : undefined,
      queue: b.trainQueue ? b.trainQueue.map(q => ({ kind: q.kind, t: r2(q.t) })) : null,
      rally: b.rally ? { x: r2(b.rally.point.x), z: r2(b.rally.point.z) } : null, seen: !!b.seen,
      arch: b.visArch, wonderEnd: b.wonderEnd ? r2(b.wonderEnd - state.elapsed) : undefined,
      locked: b.locked || undefined,
    });
  }
  for (const u of state.units) {
    add(u, { k: 'unit', sub: u.subtype, team: u.team, x: r2(u.position.x), z: r2(u.position.z), ry: r2(u.group.rotation.y),
             hp: r2(u.hp), carry: u.carry.amount ? { ...u.carry } : null, aiRole: u.aiRole || undefined, faith: u.category === 'monk' ? r2(u.faith) : undefined,
             arch: u.visArch, formation: u.formation, stance: u.stance !== 'aggressive' ? u.stance : undefined, aiHeal: u.aiHeal || undefined, kite: u.kite || undefined });
  }
  for (const r of state.relics) {
    add(r, { k: 'relic', x: r2(r.position.x), z: r2(r.position.z), carrier: r.carrier ? idx.get(r.carrier) : undefined, holder: r.holder ? idx.get(r.holder) : undefined });
  }
  // Segona passada: tasques (referències entre entitats)
  for (const u of state.units) {
    const d = ents[idx.get(u)];
    if (u.garrisoned) d.garrison = idx.get(u.garrisoned);
    else if (u.buildTarget && idx.has(u.buildTarget)) d.build = idx.get(u.buildTarget);
    else if (u.gatherNode && idx.has(u.gatherNode)) d.gather = idx.get(u.gatherNode);
    else if (u.subtype === 'tradecart' && u.tradeDest && idx.has(u.tradeDest)) d.trade = idx.get(u.tradeDest);
  }
  const team = (T) => ({ res: { ...T.res }, age: T.age, techs: [...T.techs], prices: { ...T.prices }, civ: T.civ, farmQueue: T.farmQueue || 0 });
  let explored = '';
  for (let k = 0; k < FOG.explored.length; k++) explored += FOG.explored[k] ? '1' : '0';
  return {
    v: 1, date: new Date().toISOString(), elapsed: state.elapsed, victory: state.victory, map: WORLD.type, mapSeed: WORLD.seed, mapSize: MAP_SIZE, rng: RNG.s,
    relicWin: state.relicWin ? { team: state.relicWin.team, left: r2(state.relicWin.end - state.elapsed) } : null,
    teams: Object.fromEntries(GAME.players.map(id => [id, team(TEAMS[id])])),
    layout: GAME.layout, defeated: [...GAME.defeated],
    ai: { diff: diffKey(AI.diff), strategy: AI.strategy, attackCount: AI.attackCount, nextAttackAt: AI.nextAttackAt },
    ais: serializeAIs(idx),
    stats: statsSerialize(),
    fog: { enabled: FOG.enabled, explored },
    cam: { x: camState.target.x, z: camState.target.z, yaw: camState.yaw, dist: camState.targetDist },
    ents,
  };
}
function saveGame() {
  try {
    const data = serializeGame();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast(`💾 Partida desada (${formatTime(data.elapsed)})`);
    refreshSaveInfo();
    return true;
  } catch (err) {
    toast('No s\'ha pogut desar la partida (emmagatzematge no disponible)');
    return false;
  }
}
function readSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function formatTime(sec) { return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`; }
function clearWorld() {
  for (const e of [...state.units, ...state.buildings, ...state.resourceNodes, ...state.dying]) scene.remove(e.group);
  for (const p of state.projectiles) scene.remove(p.g);
  for (const m of state.markers) scene.remove(m.g);
  for (const f of state.floaters) f.el.remove();
  for (const r of state.relics) scene.remove(r.group);
  Object.assign(state, { units: [], buildings: [], resourceNodes: [], obstacles: [], pickables: [], selected: [], dying: [], relics: [], relicWin: null, animals: [],
                         projectiles: [], markers: [], floaters: [], pings: [], controlGroups: {} });
  cancelPlacement();
}
function loadGame(data) {
  if (!data || data.v !== 1) { toast('No hi ha cap partida desada vàlida'); return false; }
  // Partida d'una altra mida de mapa: es recarrega la pàgina amb aquella mida i es continua
  const size = MAP_SIZES[data.mapSize] ? data.mapSize : 'medium';
  if (size !== MAP_SIZE) { reloadWithSize(size, { load: data }); return false; }
  clearWorld();
  clearTreeBatches();
  // Mapa: terreny, aigua i decoració del tipus i la llavor desats
  removeDecorations();
  clearWater();
  paintGroundBase();
  WORLD.type = MAP_TYPES[data.map] ? data.map : 'arabia';
  WORLD.seed = (data.mapSeed ?? MAP_SEED) >>> 0;
  // Jugadors i equips de la partida (les desades abans de la fase 20 són 1 contra 1)
  setLayout(data.layout || '1v1');
  for (const t of data.defeated || []) GAME.defeated.add(t);
  WORLD.layout = GAME.layout;
  setupBases();
  setupWater(WORLD.type, WORLD.seed);
  setupHeights(WORLD.type, WORLD.seed);
  rebuildNav();
  // Equips: recursos, preus, edat i tecnologies (abans de crear les unitats)
  for (const id of GAME.players) {
    const T = TEAMS[id], d = data.teams[id];
    if (!d) continue;
    Object.assign(T.res, d.res);
    T.prices = { ...d.prices };
    T.age = 0; T.techs = new Set(); T.mods = defaultMods();
    T.civ = CIVS[d.civ] ? d.civ : (id === 1 ? 'franks' : 'saracens');
    applyCivMods(T);
    for (const k of d.techs) applyTechEffect(id, k);
    T.age = d.age;
    T.farmQueue = d.farmQueue || 0;
  }
  updateCivLabels();
  createBuilding.batch = true;
  const made = [];
  for (const d of data.ents) {
    let e = null;
    if (d.k === 'res') {
      if (d.sub === 'tree') { e = createTree(d.x, d.z, d.scale); if (d.dense) e.dense = true; }
      else if (d.sub === 'gold') e = createGoldMine(d.x, d.z);
      else if (d.sub === 'stone') e = createStoneMine(d.x, d.z);
      else if (d.sub === 'berries') e = createBerryBush(d.x, d.z);
      else if (ANIMALS[d.sub]) {
        e = createAnimal(d.sub, d.x, d.z);
        if (d.alive === false) { e.alive = false; e.killed = true; e.hp = 0; e.name = `${ANIMALS[d.sub].name} (carn)`; }
        else if (d.hp !== undefined) e.hp = d.hp;
      }
      else if (d.sub === 'fish' || d.sub === 'deepfish') e = createFish(d.x, d.z, d.sub === 'deepfish');
      else if (d.sub === 'sheep') {
        e = createSheep(d.x, d.z);
        if (d.killed) { e.killed = true; e.mobile = false; e.name = 'Ovella (carn)'; }
      }
      if (e) { e.amount = d.amount; onNodeHarvested(e); }
    } else if (d.k === 'bld') {
      if (d.sub === 'towncenter' && d.progress >= 1) e = createTownCenter(d.x, d.z, d.team);
      else {
        e = createBuilding(d.sub, d.x, d.z, false, d.team, d.rot);
        if (d.progress >= 1) completeBuilding(e, true);
        else { e.progress = d.progress; applyConstructionVisual(e); }
        if (d.sub === 'farm' && d.progress >= 1) { e.amount = d.amount; onNodeHarvested(e); }
      }
      if (d.arch && d.arch !== archOf(d.team)) { e.visArch = d.arch; rebuildBuildingModel(e); }
      e.hp = d.hp;
      if (d.wonderEnd !== undefined) e.wonderEnd = data.elapsed + d.wonderEnd;
      if (d.locked) { e.locked = true; if (e.obstacle) e.obstacle.gateTeam = -1; }
      if (d.queue && e.trainQueue) e.trainQueue = d.queue.map(q => ({ ...q }));
      if (d.rally) e.rally = { point: new THREE.Vector3(d.rally.x, 0, d.rally.z), node: null };
      e.seen = d.seen;
    } else if (d.k === 'unit') {
      e = d.sub === 'villager' ? createVillager(d.x, d.z, d.team)
        : d.sub === 'tradecart' ? createTradeCart(d.x, d.z, d.team)
        : createSoldier(d.sub, d.x, d.z, d.team);
      if (d.arch && d.arch !== archOf(d.team)) { e.visArch = d.arch; rebuildUnitModel(e); }
      e.hp = d.hp;
      e.group.rotation.y = d.ry || 0;
      e.aiRole = d.aiRole || null;
      if (d.faith !== undefined) e.faith = d.faith;
      if (d.formation) e.formation = d.formation;
      if (d.stance) e.stance = d.stance;
      if (d.aiHeal) e.aiHeal = true;
      if (d.kite) e.kite = true;
      if (d.carry) { e.carry = { ...d.carry }; updateCarryVisual(e); }
    } else if (d.k === 'relic') {
      e = createRelic(d.x, d.z);
    }
    made.push(e);
  }
  createBuilding.batch = false;
  createDecorations();
  rebuildNav();
  // Relíquies portades o guardades
  data.ents.forEach((d, i) => {
    if (d.k !== 'relic') return;
    const r = made[i];
    if (d.carrier !== undefined && made[d.carrier]) { const u = made[d.carrier]; r.carrier = u; u.relic = r; r.group.visible = false; if (u.relicMesh) u.relicMesh.visible = true; }
    else if (d.holder !== undefined && made[d.holder]) { const m = made[d.holder]; r.holder = m; (m.relics = m.relics || []).push(r); r.group.visible = false; }
  });
  state.victory = data.victory || 'conquest';
  state.relicWin = data.relicWin ? { team: data.relicWin.team, end: data.elapsed + data.relicWin.left } : null;
  // Tasques
  data.ents.forEach((d, i) => {
    const u = made[i];
    if (d.k !== 'unit' || !u) return;
    if (d.garrison !== undefined && made[d.garrison]) enterGarrison(u, made[d.garrison]);
    else if (d.build !== undefined && made[d.build] && made[d.build].underConstruction) orderBuild(u, made[d.build], null);
    else if (d.gather !== undefined && made[d.gather] && !made[d.gather].depleted) orderGather(u, made[d.gather], null);
    else if (d.trade !== undefined && made[d.trade]) orderTrade(u, made[d.trade]);
  });
  // IA, boira, temps i càmera
  statsRestore(data.stats);
  if (data.ais) restoreAIs(data.ais, made);
  else {
    // Partides desades abans que es desés la memòria de la IA
    aiReset(AI, DIFFICULTY[data.ai.diff] || DIFFICULTY.normal);
    AI.strategy = data.ai.strategy || null;
    AI.attackCount = data.ai.attackCount || 0;
    AI.nextAttackAt = data.ai.nextAttackAt ?? AI.nextAttackAt;
  }
  FOG.enabled = data.fog.enabled;
  for (let k = 0; k < FOG.explored.length; k++) FOG.explored[k] = data.fog.explored.charCodeAt(k) === 49 ? 1 : 0;
  state.elapsed = data.elapsed;
  camState.target.set(data.cam.x, 0, data.cam.z);
  camState.yaw = data.cam.yaw;
  camState.targetDist = camState.dist = data.cam.dist;
  camState.vel.set(0, 0, 0); camState.goal = null;
  state.over = false;
  if (Number.isFinite(data.rng)) RNG.s = data.rng | 0;   // l'atzar continua on era
  updateFog();
  updateResourcesUI();
  updatePopulationUI();
  updateAgeUI();
  updateSelectionUI();
  toast(`📂 Partida carregada (${formatTime(data.elapsed)}, ${AI.diff.label})`);
  return true;
}
/* ---------- Codi de partida (comprimit i, opcionalment, xifrat amb contrasenya) ---------- */
function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64ToBytes(str) {
  const b = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
async function streamBytes(bytes, transform) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer());
}
async function passKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function exportGameCode(password) {
  let bytes = new TextEncoder().encode(JSON.stringify(serializeGame()));
  let flags = '';
  if (window.CompressionStream) { bytes = await streamBytes(bytes, new CompressionStream('deflate-raw')); flags += 'z'; }
  if (password) {
    if (!window.crypto || !crypto.subtle) throw new Error('Aquest navegador no permet xifrar (cal HTTPS o un navegador modern)');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await passKey(password, salt), bytes));
    const all = new Uint8Array(28 + enc.length);
    all.set(salt, 0); all.set(iv, 16); all.set(enc, 28);
    bytes = all;
    flags += 'e';
  }
  return `IMP1-${flags || 'p'}-${bytesToB64(bytes)}`;
}
async function importGameCode(code, password) {
  const m = /^IMP1-([a-z]+)-([A-Za-z0-9_-]+)$/.exec(code.replace(/\s+/g, ''));
  if (!m) throw new Error('El codi no és vàlid');
  const flags = m[1];
  let bytes = b64ToBytes(m[2]);
  if (flags.includes('e')) {
    if (!password) throw new Error('Aquest codi està protegit: escriu la contrasenya');
    try {
      bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28) }, await passKey(password, bytes.slice(0, 16)), bytes.slice(28)));
    } catch { throw new Error('Contrasenya incorrecta'); }
  }
  if (flags.includes('z')) bytes = await streamBytes(bytes, new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

const menuScreen = document.getElementById('menu-screen');
function refreshSaveInfo() {
  const d = readSave();
  document.getElementById('menu-slot').textContent = d
    ? `Partida desada: ${formatTime(d.elapsed)} de joc · ${new Date(d.date).toLocaleString('ca')}`
    : 'Encara no hi ha cap partida desada aquí.';
  document.getElementById('menu-load').disabled = !d;
  document.getElementById('start-load').style.display = d ? 'inline-block' : 'none';
}
function openMenu(open) {
  if (state.over || !startScreen.classList.contains('hidden')) return;
  const show = open ?? menuScreen.classList.contains('hidden');
  menuScreen.classList.toggle('hidden', !show);
  state.paused = show || !pauseScreen.classList.contains('hidden');
  if (show) refreshSaveInfo();
}
document.getElementById('menu-btn').addEventListener('click', () => openMenu(true));
document.getElementById('menu-continue').addEventListener('click', () => openMenu(false));
document.getElementById('menu-save').addEventListener('click', () => { saveGame(); refreshSaveInfo(); });
document.getElementById('menu-load').addEventListener('click', () => { if (loadGame(readSave())) openMenu(false); });
document.getElementById('menu-new').addEventListener('click', () => location.reload());
const codePanel = document.getElementById('code-panel');
const codeText = document.getElementById('code-text');
document.getElementById('menu-code').addEventListener('click', () => codePanel.classList.toggle('hidden'));
/* ---------- Fitxer de partida (.imperis): el mateix codi, desat en un fitxer ---------- */
document.getElementById('file-save').addEventListener('click', async () => {
  try {
    const pass = document.getElementById('code-pass').value;
    const code = await exportGameCode(pass);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `imperis-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.imperis`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`⬇️ Partida descarregada: ${name}${pass ? ' (amb contrasenya)' : ''}`);
  } catch (err) { toast('⚠️ ' + err.message); }
});
const fileInput = document.getElementById('file-input');
let fileFromStart = false;
document.getElementById('file-open').addEventListener('click', () => { fileFromStart = false; fileInput.click(); });
fileInput.addEventListener('change', async () => {
  const f = fileInput.files[0];
  fileInput.value = '';
  if (!f) return;
  try {
    const data = await importGameCode((await f.text()).trim(), document.getElementById('code-pass').value);
    if (loadGame(data)) {
      if (fileFromStart) { startScreen.classList.add('hidden'); state.paused = false; canvas.focus(); }
      else openMenu(false);
    }
  } catch (err) {
    toast('⚠️ ' + err.message + (/contrasenya/i.test(err.message) ? ' (escriu-la al menú i torna a obrir el fitxer)' : ''));
    if (fileFromStart) { startScreen.classList.add('hidden'); openMenu(true); }
  }
});
document.getElementById('start-file').addEventListener('click', () => { fileFromStart = true; fileInput.click(); });
document.getElementById('code-make').addEventListener('click', async () => {
  try {
    const pass = document.getElementById('code-pass').value;
    codeText.value = await exportGameCode(pass);
    codeText.select();
    toast(pass ? '🔑 Codi xifrat generat: guarda\'l amb la contrasenya' : '🔑 Codi generat (sense contrasenya)');
  } catch (err) { toast('⚠️ ' + err.message); }
});
document.getElementById('code-copy').addEventListener('click', async () => {
  if (!codeText.value) return;
  try { await navigator.clipboard.writeText(codeText.value); toast('📋 Codi copiat'); }
  catch { codeText.select(); document.execCommand('copy'); toast('📋 Codi copiat'); }
});
document.getElementById('code-load').addEventListener('click', async () => {
  try {
    const data = await importGameCode(codeText.value.trim(), document.getElementById('code-pass').value);
    if (loadGame(data)) { codePanel.classList.add('hidden'); openMenu(false); }
  } catch (err) { toast('⚠️ ' + err.message); }
});
document.getElementById('start-code').addEventListener('click', () => {
  startScreen.classList.add('hidden');
  openMenu(true);
  codePanel.classList.remove('hidden');
  document.getElementById('menu-info').textContent = 'Enganxa el codi i escriu la contrasenya';
});
document.getElementById('start-load').addEventListener('click', () => {
  const d = readSave();
  startScreen.classList.add('hidden');
  if (loadGame(d)) { state.paused = false; canvas.focus(); }
  else startScreen.classList.remove('hidden');
});

function updateAgeUI() {
  document.getElementById('age-name').textContent = CONFIG.AGES[PLAYER.age].name.toUpperCase();
}
function togglePause() {
  if (state.over || !startScreen.classList.contains('hidden') || !menuScreen.classList.contains('hidden')) return;
  state.paused = !state.paused;
  pauseScreen.classList.toggle('hidden', !state.paused);
}
document.getElementById('restart-btn').addEventListener('click', () => location.reload());
function teamAlive(team) {
  if (GAME.defeated.has(team) || (aiOf(team) && aiOf(team).resigned)) return false;
  return state.units.some(u => u.team === team) || state.buildings.some(b => b.team === team && !b.underConstruction);
}
const hasKing = (team) => state.units.some(u => u.team === team && u.category === 'king');
/* Meravelles i relíquies: comptes enrere de victòria (victòria estàndard) */
function victoryCheck() {
  if (state.victory !== 'standard') { state.relicWin = null; updateVictoryUI(); return; }
  for (const b of state.buildings) {
    if (b.subtype !== 'wonder' || b.underConstruction || b.wonderEnd) continue;
    b.wonderEnd = state.elapsed + WONDER_WIN_TIME;
    toast(b.isFriendly ? `🏛️ Meravella acabada! Si resisteix ${WONDER_WIN_TIME / 60} minuts, guanyes` : `🏛️ Els ${civOf(b.team).name} han acabat una Meravella! Destrueix-la abans de ${WONDER_WIN_TIME / 60} minuts`);
    if (!b.isFriendly) state.pings.push({ x: b.position.x, z: b.position.z, t: 0 });
  }
  if (state.relics.length) {
    // (amb equips, compten les relíquies de tots els aliats)
    const t0 = state.relics[0].holder ? state.relics[0].holder.team : 0;
    const team = t0 && state.relics.every(r => r.holder && allied(r.holder.team, t0)) ? t0 : 0;
    if (team && (!state.relicWin || !allied(state.relicWin.team, team))) {
      state.relicWin = { team, end: state.elapsed + RELIC_WIN_TIME };
      toast(allied(team, PLAYER.id) ? `🏺 Tens totes les relíquies! Guarda-les ${RELIC_WIN_TIME} segons per guanyar` : `🏺 L'enemic té totes les relíquies! Tens ${RELIC_WIN_TIME} segons per recuperar-ne una`);
    } else if (!team && state.relicWin) {
      state.relicWin = null;
      toast('🏺 Ningú no té totes les relíquies: compte enrere aturat');
    }
  }
  updateVictoryUI();
}
const vicEl = document.getElementById('vic-timers');
function updateVictoryUI() {
  const items = [];
  if (state.victory === 'regicide') items.push(`<span class="vt" title="Regicidi: si el teu rei mor, perds">👑 ${hasKing(PLAYER.id) ? 'Rei viu' : 'Sense rei'}</span>`);
  for (const b of state.buildings) if (b.subtype === 'wonder' && b.wonderEnd) items.push(`<span class="vt ${b.isFriendly ? '' : 'enemy'}" title="Meravella: si resisteix, guanya">🏛️ ${civOf(b.team).name} ${formatTime(Math.max(0, b.wonderEnd - state.elapsed))}</span>`);
  if (state.relicWin) items.push(`<span class="vt ${allied(state.relicWin.team, PLAYER.id) ? '' : 'enemy'}" title="Totes les relíquies">🏺 ${civOf(state.relicWin.team).name} ${formatTime(Math.max(0, state.relicWin.end - state.elapsed))}</span>`);
  const html = items.join('');
  if (vicEl.innerHTML !== html) vicEl.innerHTML = html;
  vicEl.classList.toggle('on', items.length > 0);
}
/* Un jugador eliminat (fase 20): amb més de dos jugadors, el que li queda desapareix i la partida continua */
function defeatTeam(t, why) {
  if (GAME.defeated.has(t)) return;
  GAME.defeated.add(t);
  const A = aiOf(t);
  if (A) A.enabled = false;
  if (t === PLAYER.id) return;
  for (const u of state.units.filter(u => u.team === t)) killEntity(u, null);
  for (const b of state.buildings.filter(b => b.team === t)) killEntity(b, null);
  toast(`💀 ${teamOf(t).name} ${why}`);
}
function checkGameOver() {
  if (state.over) return;
  victoryCheck();
  const regicide = state.victory === 'regicide';
  const out = (t) => GAME.defeated.has(t) || !teamAlive(t) || (regicide && !hasKing(t));
  // Amb més de dos jugadors, els que cauen s'eliminen i la resta continua
  if (GAME.players.length > 2) for (const t of GAME.players) {
    if (t === PLAYER.id || GAME.defeated.has(t) || !out(t)) continue;
    defeatTeam(t, aiOf(t) && aiOf(t).resigned ? "s'ha rendit" : regicide && !hasKing(t) ? 'ha perdut el rei i queda eliminat' : 'ha estat derrotat');
  }
  const foes = GAME.players.filter(t => hostile(t, PLAYER.id));
  let win = foes.every(out), lose = out(PLAYER.id), how = 'conquest';
  if (regicide && (!hasKing(PLAYER.id) || (win && foes.some(t => !hasKing(t))))) how = 'king';
  let winner = null;
  if (state.victory === 'standard') {
    const w = state.buildings.find(b => b.subtype === 'wonder' && b.wonderEnd && state.elapsed >= b.wonderEnd);
    if (w) { if (allied(w.team, PLAYER.id)) win = true; else lose = true; how = 'wonder'; winner = w.team; }
    if (state.relicWin && state.elapsed >= state.relicWin.end) { if (allied(state.relicWin.team, PLAYER.id)) win = true; else lose = true; how = 'relics'; winner = state.relicWin.team; }
  }
  if (!win && !lose) return;
  if (win && lose) win = false;
  state.over = true;
  state.paused = true;
  statsSample();
  const T = `<b>${formatTime(state.elapsed)}</b>`, P = civOf(PLAYER.id).name;
  const E = winner && !win ? civOf(winner).name : foes.map(t => civOf(t).name).join(' i ');
  const resigned = foes.every(t => aiOf(t) && aiOf(t).resigned);
  const team = GAME.players.some(t => t !== PLAYER.id && allied(t, PLAYER.id)) ? ' amb el teu aliat' : '';
  const WHY = {
    conquest: win ? `${resigned ? `Els ${E} s'han rendit` : `Has derrotat els ${E}${team}`} en ${T} (dificultat ${AI.diff.label}).` : `La teva civilització (${P}) ha caigut després de ${T}.`,
    king: win ? `El rei dels ${E} ha mort: victòria per regicidi en ${T}.` : `El teu rei ha mort. Els ${E} guanyen per regicidi (${T}).`,
    wonder: win ? `${winner === PLAYER.id ? 'La teva Meravella' : 'La Meravella del teu aliat'} ha resistit! Victòria en ${T}.` : `La Meravella dels ${E} ha resistit. Derrota en ${T}.`,
    relics: win ? `${winner === PLAYER.id ? 'Has' : 'El teu equip ha'} reunit totes les relíquies. Victòria en ${T}.` : `Els ${E} han reunit totes les relíquies. Derrota en ${T}.`,
  };
  document.getElementById('end-title').textContent = win ? 'VICTÒRIA' : 'DERROTA';
  document.getElementById('end-text').innerHTML = WHY[how];
  endScreen.classList.remove('hidden');
}

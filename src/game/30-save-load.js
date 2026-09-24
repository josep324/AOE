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
    add(n, { k: 'res', sub: n.subtype, x: r2(n.position.x), z: r2(n.position.z), amount: n.amount, scale: r2(n.group.scale.x), killed: !!n.killed });
  }
  const farms = state.resourceNodes.filter(n => n.subtype === 'farm');
  for (const b of state.buildings.concat(farms)) {
    add(b, {
      k: 'bld', sub: b.subtype, team: b.team, x: r2(b.position.x), z: r2(b.position.z), rot: b.rot || 0,
      progress: b.subtype === 'towncenter' ? 1 : b.progress, hp: Math.round(b.hp), amount: b.subtype === 'farm' ? b.amount : undefined,
      queue: b.trainQueue ? b.trainQueue.map(q => ({ kind: q.kind, t: r2(q.t) })) : null,
      rally: b.rally ? { x: r2(b.rally.point.x), z: r2(b.rally.point.z) } : null, seen: !!b.seen,
    });
  }
  for (const u of state.units) {
    add(u, { k: 'unit', sub: u.subtype, team: u.team, x: r2(u.position.x), z: r2(u.position.z), ry: r2(u.group.rotation.y),
             hp: r2(u.hp), carry: u.carry.amount ? { ...u.carry } : null, inWave: !!u.inWave });
  }
  // Segona passada: tasques (referències entre entitats)
  for (const u of state.units) {
    const d = ents[idx.get(u)];
    if (u.garrisoned) d.garrison = idx.get(u.garrisoned);
    else if (u.buildTarget && idx.has(u.buildTarget)) d.build = idx.get(u.buildTarget);
    else if (u.gatherNode && idx.has(u.gatherNode)) d.gather = idx.get(u.gatherNode);
    else if (u.subtype === 'tradecart' && u.tradeDest && idx.has(u.tradeDest)) d.trade = idx.get(u.tradeDest);
  }
  const team = (T) => ({ res: { ...T.res }, age: T.age, techs: [...T.techs], prices: { ...T.prices }, civ: T.civ });
  let explored = '';
  for (let k = 0; k < FOG.explored.length; k++) explored += FOG.explored[k] ? '1' : '0';
  return {
    v: 1, date: new Date().toISOString(), elapsed: state.elapsed,
    teams: { 1: team(PLAYER), 2: team(ENEMY) },
    ai: { diff: Object.keys(DIFFICULTY).find(k => DIFFICULTY[k] === AI.diff), waveCount: AI.waveCount, nextWaveAt: AI.nextWaveAt, armyCycle: AI.armyCycle },
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
  Object.assign(state, { units: [], buildings: [], resourceNodes: [], obstacles: [], pickables: [], selected: [], dying: [],
                         projectiles: [], markers: [], floaters: [], pings: [], controlGroups: {} });
  cancelPlacement();
}
function loadGame(data) {
  if (!data || data.v !== 1) { toast('No hi ha cap partida desada vàlida'); return false; }
  clearWorld();
  // Equips: recursos, preus, edat i tecnologies (abans de crear les unitats)
  for (const [id, T] of [[1, PLAYER], [2, ENEMY]]) {
    const d = data.teams[id];
    Object.assign(T.res, d.res);
    T.prices = { ...d.prices };
    T.age = 0; T.techs = new Set(); T.mods = defaultMods();
    T.civ = CIVS[d.civ] ? d.civ : (id === 1 ? 'franks' : 'saracens');
    applyCivMods(T);
    for (const k of d.techs) applyTechEffect(id, k);
    T.age = d.age;
  }
  updateCivLabels();
  createBuilding.batch = true;
  const made = [];
  for (const d of data.ents) {
    let e = null;
    if (d.k === 'res') {
      if (d.sub === 'tree') e = createTree(d.x, d.z, d.scale);
      else if (d.sub === 'gold') e = createGoldMine(d.x, d.z);
      else if (d.sub === 'stone') e = createStoneMine(d.x, d.z);
      else if (d.sub === 'berries') e = createBerryBush(d.x, d.z);
      else if (d.sub === 'sheep') {
        e = createSheep(d.x, d.z);
        if (d.killed) { e.killed = true; e.mobile = false; e.name = 'Ovella (carn)'; }
      }
      if (e) { e.amount = d.amount; onNodeHarvested(e); }
    } else if (d.k === 'bld') {
      if (d.sub === 'towncenter') e = createTownCenter(d.x, d.z, d.team);
      else {
        e = createBuilding(d.sub, d.x, d.z, false, d.team, d.rot);
        if (d.progress >= 1) completeBuilding(e, true);
        else { e.progress = d.progress; applyConstructionVisual(e); }
        if (d.sub === 'farm' && d.progress >= 1) { e.amount = d.amount; onNodeHarvested(e); }
      }
      e.hp = d.hp;
      if (d.queue && e.trainQueue) e.trainQueue = d.queue.map(q => ({ ...q }));
      if (d.rally) e.rally = { point: new THREE.Vector3(d.rally.x, 0, d.rally.z), node: null };
      e.seen = d.seen;
    } else if (d.k === 'unit') {
      e = d.sub === 'villager' ? createVillager(d.x, d.z, d.team)
        : d.sub === 'tradecart' ? createTradeCart(d.x, d.z, d.team)
        : createSoldier(d.sub, d.x, d.z, d.team);
      e.hp = d.hp;
      e.group.rotation.y = d.ry || 0;
      e.inWave = d.inWave;
      if (d.carry) { e.carry = { ...d.carry }; updateCarryVisual(e); }
    }
    made.push(e);
  }
  createBuilding.batch = false;
  rebuildNav();
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
  AI.diff = DIFFICULTY[data.ai.diff] || DIFFICULTY.normal;
  AI.resigned = false; AI.enabled = true;
  AI.waveCount = data.ai.waveCount; AI.nextWaveAt = data.ai.nextWaveAt; AI.armyCycle = data.ai.armyCycle || 0;
  FOG.enabled = data.fog.enabled;
  for (let k = 0; k < FOG.explored.length; k++) FOG.explored[k] = data.fog.explored.charCodeAt(k) === 49 ? 1 : 0;
  state.elapsed = data.elapsed;
  camState.target.set(data.cam.x, 0, data.cam.z);
  camState.yaw = data.cam.yaw;
  camState.targetDist = camState.dist = data.cam.dist;
  camState.vel.set(0, 0, 0); camState.goal = null;
  state.over = false;
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
  if (team === AI.team && AI.resigned) return false;
  return state.units.some(u => u.team === team) || state.buildings.some(b => b.team === team && !b.underConstruction);
}
function checkGameOver() {
  if (state.over) return;
  const win = !teamAlive(ENEMY.id), lose = !teamAlive(PLAYER.id);
  if (!win && !lose) return;
  state.over = true;
  state.paused = true;
  const mins = Math.floor(state.elapsed / 60), secs = Math.floor(state.elapsed % 60);
  document.getElementById('end-title').textContent = win ? 'VICTÒRIA' : 'DERROTA';
  document.getElementById('end-text').innerHTML = win
    ? `${AI.resigned ? `Els ${civOf(ENEMY.id).name} s'han rendit` : `Has derrotat els ${civOf(ENEMY.id).name}`} en <b>${mins}:${String(secs).padStart(2, '0')}</b> (dificultat ${AI.diff.label}).`
    : `La teva civilització (${civOf(PLAYER.id).name}) ha caigut després de <b>${mins}:${String(secs).padStart(2, '0')}</b>.`;
  endScreen.classList.remove('hidden');
}

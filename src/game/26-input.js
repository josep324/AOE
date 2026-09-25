/* =====================================================================
   ENTRADA: RATOLÍ I TECLAT
   ===================================================================== */
const selBoxEl = document.getElementById('selection-box');
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, inside: false, overCanvas: false, down: false, dragging: false, sx: 0, sy: 0 };
const keys = new Set();

/* Modes d'ordre amb clic: el pròxim clic esquerre tria el punt o la unitat
   ground: atacar el terra (mangonells) · patrol: patrullar · follow: escortar una unitat pròpia */
const groundMode = { on: false, kind: 'ground' };
const GROUND_MODE_HINT = {
  ground: '☄️ Clic esquerre al terra on vols disparar (clic dret o Esc: cancel·lar)',
  patrol: '🔁 Clic esquerre on han de patrullar (Shift: afegir punts; clic dret o Esc: cancel·lar)',
  follow: '🛡️ Clic esquerre sobre la unitat pròpia que han d\'escortar (clic dret o Esc: cancel·lar)',
};
function setGroundMode(on, kind = 'ground') {
  groundMode.on = on;
  groundMode.kind = kind;
  canvas.style.cursor = on ? 'crosshair' : '';
  if (on) toast(GROUND_MODE_HINT[kind]);
}
canvas.addEventListener('mousedown', (e) => {
  canvas.focus();
  if (groundMode.on) {
    const units = state.selected.filter(s => s.kind === 'unit' && s.isOwn);
    let keep = false;
    if (e.button === 0) {
      if (groundMode.kind === 'follow') {
        const t = pickEntity(e.clientX, e.clientY);
        if (t && t.kind === 'unit' && t.isOwn && commandFollow(units, t)) toast(`🛡️ Escortant: ${t.name}`);
        else toast('Cal triar una unitat pròpia per escortar');
      } else {
        const p = pickGround(e.clientX, e.clientY);
        if (p && groundMode.kind === 'patrol') {
          if (commandPatrol(units, clampToMap(p), e.shiftKey)) spawnMoveMarker(clampToMap(p), 0xffd27a);
          keep = e.shiftKey;
        } else if (p) commandAttackGround(units, clampToMap(p));
      }
    }
    if (!keep) setGroundMode(false);
    return;
  }
  // Mode construcció: clic esquerre col·loca, clic dret cancel·la
  if (placing.type) {
    if (e.button === 0) {
      if (placing.wall) {
        const p = pickGround(e.clientX, e.clientY);
        if (p) placing.start = [snapToGrid(p.x, 1), snapToGrid(p.z, 1)];
      } else confirmPlacement(e.shiftKey);
    } else if (e.button === 2) cancelPlacement();
    return;
  }
  if (e.button === 0) {
    mouse.down = true;
    mouse.dragging = false;
    mouse.sx = e.clientX;
    mouse.sy = e.clientY;
  } else if (e.button === 1) {
    // Botó del mig: agafar i arrossegar el mapa
    e.preventDefault();
    camState.grab = { x: e.clientX, y: e.clientY };
    camState.goal = null;
    camState.vel.set(0, 0, 0);
    canvas.style.cursor = 'grabbing';
  } else if (e.button === 2) {
    issueRightClick(e.clientX, e.clientY, e.shiftKey);
  }
});
window.addEventListener('mousemove', (e) => {
  if (!camState.grab) return;
  const dx = e.clientX - camState.grab.x, dy = e.clientY - camState.grab.y;
  camState.grab.x = e.clientX; camState.grab.y = e.clientY;
  // Píxels → unitats del món a la distància actual de la càmera
  const s = (2 * camState.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / window.innerHeight;
  camState.target.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s * 1.25);
  clampToMap(camState.target);
});
window.addEventListener('mouseup', (e) => { if (e.button === 1 && camState.grab) { camState.grab = null; canvas.style.cursor = ''; } });

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.inside = true;
  mouse.overCanvas = e.target === canvas;
  if (mouse.down) {
    if (!mouse.dragging && Math.hypot(e.clientX - mouse.sx, e.clientY - mouse.sy) > CONFIG.DRAG_THRESHOLD) {
      mouse.dragging = true;
      selBoxEl.style.display = 'block';
    }
    if (mouse.dragging) {
      const x = Math.min(mouse.sx, e.clientX), y = Math.min(mouse.sy, e.clientY);
      selBoxEl.style.left = x + 'px';
      selBoxEl.style.top = y + 'px';
      selBoxEl.style.width = Math.abs(e.clientX - mouse.sx) + 'px';
      selBoxEl.style.height = Math.abs(e.clientY - mouse.sy) + 'px';
    }
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0 && placing.type && placing.wall && placing.start) { updatePlacement(); confirmWall(e.shiftKey); return; }
  if (e.button !== 0 || !mouse.down) return;
  mouse.down = false;
  if (mouse.dragging) {
    boxSelect(mouse.sx, mouse.sy, e.clientX, e.clientY, e.shiftKey);
  } else {
    clickSelect(e.clientX, e.clientY, e.shiftKey);
  }
  mouse.dragging = false;
  selBoxEl.style.display = 'none';
});

document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) mouse.inside = false; });
window.addEventListener('blur', () => { keys.clear(); mouse.inside = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Proporcional al gir: una osca de ratolí ≈ 13 %, el trackpad fa passos petits i continus
  const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  const factor = Math.exp(THREE.MathUtils.clamp(delta, -300, 300) * 0.00125);
  camState.targetDist = THREE.MathUtils.clamp(camState.targetDist * factor, CONFIG.CAM.minDist, CONFIG.CAM.maxDist);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
  if (e.repeat) { keys.add(code); return; }
  keys.add(code);

  // Grups de control: Ctrl/Alt+N assigna, Shift+N afegeix, N selecciona (dos cops: centra)
  const digit = /^Digit([1-9])$/.exec(code);
  if (digit) {
    e.preventDefault();
    handleControlGroup(Number(digit[1]), e);
    return;
  }
  if (e.ctrlKey || e.metaKey) return;

  // Tab: pàgina següent del menú de construcció
  if (code === 'Tab' && builders().length) { e.preventDefault(); buildPage = (buildPage + 1) % 3; updateSelectionUI(); return; }
  // Aldeans seleccionats: lletres de construcció
  if (builders().length && CONFIG.BUILD_KEYS[code]) {
    const type = CONFIG.BUILD_KEYS[code];
    const def = CONFIG.BUILDINGS[type];
    buildPage = def.page || 0;
    startPlacement(type);
    updateSelectionUI();
    return;
  }
  // Unitats militars seleccionades: postures
  const milSel = state.selected.filter(s => s.kind === 'unit' && s.isOwn && s.isMilitary);
  if (milSel.length && !builders().length && ['KeyZ', 'KeyV', 'KeyN'].includes(code)) {
    setStance(milSel, code === 'KeyZ' ? 'aggressive' : code === 'KeyV' ? 'defensive' : 'stand');
    return;
  }

  // K: patrullar · Y: escortar · (també amb els botons del panell)
  if (milSel.length && !builders().length && (code === 'KeyK' || code === 'KeyY')) {
    setGroundMode(true, code === 'KeyK' ? 'patrol' : 'follow');
    return;
  }
  // F: canviar la formació del grup seleccionat
  if (code === 'KeyF' && !builders().length) {
    const fg = state.selected.filter(s => s.kind === 'unit' && s.isOwn && (s.isMilitary || s.category === 'monk'));
    if (fg.length > 1) { setFormation(fg, FORMATION_ORDER[(FORMATION_ORDER.indexOf(groupFormation(fg)) + 1) % FORMATION_ORDER.length]); return; }
  }
  switch (code) {
    case 'Escape':
      if (groundMode.on) { setGroundMode(false); break; }
      if (placing.type) { cancelPlacement(); break; }
      clearSelection(); onSelectionChanged();
      break;
    case 'Delete': {
      const b = state.selected.length === 1 ? state.selected[0] : null;
      if (b && b.kind === 'building') demolishBuilding(b);
      break;
    }
    case 'KeyH': {
      const tc = state.buildings.find(b => b.isOwn && b.subtype === 'towncenter');
      if (tc) { setSelection([tc]); centerOn(tc.position); }
      break;
    }
    case 'KeyC': {
      const tc = state.selected.find(s => s.subtype === 'towncenter');
      if (tc) queueVillager(tc);
      break;
    }
    case 'KeyX': {
      const units = state.selected.filter(s => s.kind === 'unit' && s.isOwn);
      if (units.length) { commandStop(units); updateSelectionUI(); }
      break;
    }
    case 'KeyR':
      if (placing.type && !placing.wall) { placing.rot = placing.rot ? 0 : 1; placing.valid = null; updatePlacement(); }
      break;
    case 'KeyB': {
      const tc = state.buildings.find(b => b.isOwn && b.subtype === 'towncenter');
      ringTownBell(state.selected.find(s => s.subtype === 'towncenter' && s.isOwn) || tc);
      break;
    }
    case 'KeyP':
      togglePause();
      break;
    case 'KeyT':
      if (state.selected.some(s => s.kind === 'unit' && s.isOwn && s.canGround)) setGroundMode(true);
      break;
    case 'KeyG': {
      const tre = state.selected.filter(s => s.kind === 'unit' && s.isOwn && s.packable);
      if (tre.length) { togglePack(tre); updateSelectionUI(); }
      break;
    }
    case 'KeyU':
      for (const s of state.selected) if (s.isOwn && s.garrison && s.garrison.length) ungarrison(s);
      break;
    case 'KeyM':
      openMenu();
      break;
    case 'F9':
      FOG.enabled = !FOG.enabled;
      toast(FOG.enabled ? 'Boira de guerra activada' : 'Boira de guerra desactivada (mapa revelat)');
      break;
    case 'Period':
    case 'NumpadDecimal':
      selectNextIdle();
      break;
    case 'Comma':
      selectNextIdleMilitary();
      break;
    case 'Space':
      if (state.selected.length) {
        const c = new THREE.Vector3();
        state.selected.forEach(s => c.add(s.position));
        centerOn(c.divideScalar(state.selected.length));
      }
      break;
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

const lastGroupPress = { n: 0, time: 0 };
function groupMembers(n) {
  const list = (state.controlGroups[n] || []).filter(e => e.isOwn && (state.units.includes(e) || state.buildings.includes(e)));
  state.controlGroups[n] = list;
  return list;
}
function handleControlGroup(n, e) {
  const own = state.selected.filter(s => s.isOwn);
  if (e.ctrlKey || e.altKey || e.metaKey) {
    if (!own.length) { toast('Selecciona unitats pròpies per crear un grup'); return; }
    state.controlGroups[n] = own.slice();
    toast(`Grup ${n} assignat (${own.length})`);
    return;
  }
  if (e.shiftKey) {
    const list = groupMembers(n);
    own.forEach(s => { if (!list.includes(s)) list.push(s); });
    state.controlGroups[n] = list;
    toast(`Afegit al grup ${n} (${list.length})`);
    return;
  }
  const list = groupMembers(n);
  if (!list.length) return;
  const now = performance.now();
  setSelection(list);
  if (lastGroupPress.n === n && now - lastGroupPress.time < 400) {
    const c = new THREE.Vector3();
    list.forEach(s => c.add(s.position));
    centerOn(c.divideScalar(list.length));
  }
  lastGroupPress.n = n;
  lastGroupPress.time = now;
}

let idleCursor = 0;
function selectNextIdle() {
  const idle = state.units.filter(u => u.isOwn && u.subtype === 'villager' && u.state === STATE.IDLE);
  if (!idle.length) { toast('No hi ha cap aldeà inactiu'); return; }
  idleCursor = (idleCursor + 1) % idle.length;
  const u = idle[idleCursor];
  setSelection([u]);
  centerOn(u.position);
}
document.getElementById('idle-btn').addEventListener('click', selectNextIdle);
/* Soldats inactius: sense ordres, fora d'edificis i sense patrullar ni escortar */
const isIdleMilitary = (u) => u.isOwn && u.isMilitary && !u.garrisoned && u.state === STATE.IDLE && !u.patrol && !u.follow;
let idleMilCursor = 0;
function selectNextIdleMilitary() {
  const idle = state.units.filter(isIdleMilitary);
  if (!idle.length) { toast('No hi ha cap soldat inactiu'); return; }
  idleMilCursor = (idleMilCursor + 1) % idle.length;
  const u = idle[idleMilCursor];
  setSelection([u]);
  centerOn(u.position);
}
document.getElementById('idle-mil-btn').addEventListener('click', selectNextIdleMilitary);

/* Centra la càmera lliscant suaument (o de cop, per al minimapa) */
function centerOn(p, instant = false) {
  if (instant) {
    camState.goal = null;
    camState.vel.set(0, 0, 0);
    camState.target.x = p.x;
    camState.target.z = p.z;
    clampToMap(camState.target);
  } else {
    camState.goal = clampToMap(new THREE.Vector3(p.x, 0, p.z));
  }
}

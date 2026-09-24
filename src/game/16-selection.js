/* =====================================================================
   SELECCIÓ
   ===================================================================== */
function clearSelection() {
  for (const e of state.selected) e.setSelected(false);
  state.selected = [];
}
function addToSelection(e) {
  if (state.selected.includes(e)) return;
  // Selecció homogènia: o unitats pròpies, o una sola entitat d'un altre tipus
  const current = state.selected[0];
  if (current && (e.kind !== 'unit' || current.kind !== 'unit' || !e.isOwn || !current.isOwn)) clearSelection();
  e.setSelected(true);
  state.selected.push(e);
}
function removeFromSelection(e) {
  const idx = state.selected.indexOf(e);
  if (idx >= 0) { state.selected.splice(idx, 1); e.setSelected(false); }
}
function setSelection(list) {
  clearSelection();
  list.forEach(addToSelection);
  onSelectionChanged();
}

const lastClick = { time: 0, entity: null };
function clickSelect(x, y, additive) {
  const e = pickEntity(x, y);
  const now = performance.now();
  if (!e) {
    if (!additive) { clearSelection(); onSelectionChanged(); }
    lastClick.entity = null;
    return;
  }
  if (e.kind === 'unit' && e.isOwn && lastClick.entity === e && now - lastClick.time < CONFIG.DOUBLE_CLICK_MS) {
    selectAllOnScreen(e.subtype, additive);
    lastClick.entity = null;
    return;
  }
  lastClick.time = now;
  lastClick.entity = e;

  if (additive && e.kind === 'unit' && e.isOwn && state.selected.every(s => s.kind === 'unit' && s.isOwn)) {
    if (e.selected) removeFromSelection(e); else addToSelection(e);
    onSelectionChanged();
  } else {
    setSelection([e]);
  }
}

function hudHeight() { return hudEl.offsetHeight; }

function selectAllOnScreen(subtype, additive) {
  const list = additive ? state.selected.filter(s => s.kind === 'unit') : [];
  const maxY = window.innerHeight - hudHeight();
  for (const u of state.units) {
    if (!u.isOwn || u.subtype !== subtype || u.garrisoned) continue;
    const s = worldToScreen(u.position, 1);
    if (s.visible && s.x >= 0 && s.x <= window.innerWidth && s.y >= 0 && s.y <= maxY && !list.includes(u)) list.push(u);
  }
  setSelection(list);
  if (list.length > 1) toast(`${list.length} aldeans seleccionats`);
}

function boxSelect(x1, y1, x2, y2, additive) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const found = [];
  // Projecció a pantalla (equivalent al test de frustum de la caixa)
  for (const u of state.units) {
    if (!u.isOwn || u.garrisoned) continue;
    const pFeet = worldToScreen(u.position, 0.2);
    const pHead = worldToScreen(u.position, 1.9);
    if (!pFeet.visible) continue;
    const inFeet = pFeet.x >= minX && pFeet.x <= maxX && pFeet.y >= minY && pFeet.y <= maxY;
    const inHead = pHead.x >= minX && pHead.x <= maxX && pHead.y >= minY && pHead.y <= maxY;
    if (inFeet || inHead) found.push(u);
  }
  if (additive) {
    const base = state.selected.filter(s => s.kind === 'unit' && s.isOwn);
    for (const u of found) if (!base.includes(u)) base.push(u);
    setSelection(base);
  } else {
    setSelection(found);
  }
}

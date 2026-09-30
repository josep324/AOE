/* Controls com els de l'AoE II DE: tecles d'entrenament, Shift = 5, producció repetida, velocitat i Ctrl+lletra */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 12 });
  await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id;
    R.AI.enabled = false;
    Object.assign(R.PLAYER.res, { food: 5000, wood: 5000, gold: 5000, stone: 5000 });
    R.completeTech(P, 'age1');
    const tc = R.townCenter.position;
    const b = R.createBuilding('barracks', tc.x + 14, tc.z + 14, true, P);
    window.__bar = b;
    for (let i = 0; i < 4; i++) R.createBuilding('house', tc.x - 16 - i * 4, tc.z + 14, true, P);   // (lloc per a la població)
    R.setSelection([b]); R.updateSelectionUI();
  });
  // Q = primera unitat del Quarter; Shift+Q = 5 més
  await page.keyboard.press('KeyQ');
  const q1 = await page.evaluate(() => window.__bar.trainQueue.length);
  await page.keyboard.down('Shift'); await page.keyboard.press('KeyQ'); await page.keyboard.up('Shift');
  const q6 = await page.evaluate(() => window.__bar.trainQueue.length);
  // Botó: la lletra es veu; clic dret = producció repetida
  const hk = await page.evaluate(() => document.querySelector('#actions [data-item] .hk')?.textContent);
  const r = await page.evaluate(() => {
    const R = window.RTS, b = window.__bar;
    const kind = b.trainQueue[0].kind;
    b.trainQueue.length = 0;
    document.querySelector(`#actions [data-item="${kind}"]`).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const auto = b.autoQueue;
    let made = 0;
    const before = R.state.units.filter(u => u.team === b.team && u.unitKind === kind).length;
    for (let i = 0; i < 90 * 20; i++) R.simulate(0.05);
    made = R.state.units.filter(u => u.team === b.team && u.unitKind === kind).length - before;
    const saved = R.serializeGame().ents.find(d => d.sub === 'barracks');
    return { kind, auto, made, savedAuto: saved && saved.autoQueue };
  });
  // Velocitat: + i −
  await page.keyboard.press('Equal');
  const sp1 = await page.evaluate(() => [window.RTS.CONFIG.TIME_SCALE, document.getElementById('speed').textContent]);
  await page.keyboard.press('Minus'); await page.keyboard.press('Minus');
  const sp2 = await page.evaluate(() => window.RTS.CONFIG.TIME_SCALE);
  // Ctrl+B: selecciona el Quarter
  await page.evaluate(() => { window.RTS.setSelection([]); });
  await page.keyboard.down('Control'); await page.keyboard.press('KeyB'); await page.keyboard.up('Control');
  const jumped = await page.evaluate(() => window.RTS.state.selected[0] === window.__bar);
  // Supr amb unitats pròpies seleccionades: s'eliminen
  const del0 = await page.evaluate(() => { const R = window.RTS; const u = R.state.units.filter(x => x.isOwn && x.unitKind === 'militia').slice(0, 2); R.setSelection(u); return R.state.units.length; });
  await page.keyboard.press('Delete');
  const del1 = await page.evaluate(() => window.RTS.state.units.length);
  log(JSON.stringify({ q1, q6, hk, r, sp1, sp2, jumped, del: del0 - del1 }));
  assert(del0 - del1 === 2, 'Supr no elimina les unitats seleccionades');
  assert(q1 === 1 && q6 === 6, 'les tecles d\'entrenament (i Shift = 5) no funcionen');
  assert(hk === 'Q', 'el botó no mostra la lletra');
  assert(r.auto === r.kind && r.made >= 3 && r.savedAuto === r.kind, 'la producció repetida no funciona o no es desa');
  assert(sp1[0] === 1.5 && sp1[1] === '×1.5' && sp2 === 0.5, 'la velocitat de la partida no canvia');
  assert(jumped, 'Ctrl+B no salta al Quarter');
};

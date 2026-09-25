/* El joc arrenca, la partida comença i la interfície mostra el que toca */
export default async ({ open, assert, log }) => {
  const page = await open();
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id;
    return {
      hidden: document.getElementById('start-screen').classList.contains('hidden'),
      tc: !!R.townCenter && !!R.enemyTC,
      vills: S.units.filter(u => u.team === P && u.subtype === 'villager').length,
      res: { ...R.PLAYER.res },
      trees: S.resourceNodes.filter(n => n.subtype === 'tree').length,
      relics: S.relics.length,
      age: document.getElementById('age-name').textContent,
    };
  });
  log(JSON.stringify(r));
  assert(r.hidden, 'la pantalla d\'inici no s\'amaga');
  assert(r.tc, 'falten els Centres de Ciutat');
  assert(r.vills === 3, 'haurien de ser 3 aldeans inicials');
  assert(r.res.food === 200 && r.res.wood === 200, 'recursos inicials incorrectes');
  assert(r.trees > 200, 'massa pocs arbres');
  assert(r.relics === 5, 'hi hauria d\'haver 5 relíquies');
  // Seleccionar el Centre i entrenar un aldeà des del botó
  await page.evaluate(() => { const R = window.RTS; R.setSelection([R.townCenter]); R.updateSelectionUI(); });
  const queued = await page.evaluate(() => { const R = window.RTS; return R.queueUnit(R.townCenter, 'villager') && R.townCenter.trainQueue.length; });
  assert(queued === 1, 'no s\'ha pogut encuar un aldeà');
};

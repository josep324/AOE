/* Cada civilització té el seu aspecte: materials propis, emblema als estendards, edificis propis (iurtes mongoles),
   una Meravella pròpia i unitats diferents de les de la seva arquitectura. Una unitat convertida conserva
   l'aspecte de la civilització d'origen, també en desar i carregar */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 4 });
  const r = await page.evaluate(() => {
    const R = window.RTS, P = R.PLAYER.id, E = R.ENEMY.id;
    R.AI.enabled = false;
    const civs = Object.keys(R.CIVS || {});
    // Firma d'un model: materials (textura) i nombre de vèrtexs
    const sig = (obj) => { const mats = new Set(); let v = 0; obj.traverse(o => { if (o.isMesh) { v += o.geometry.attributes.position.count; mats.add((o.material.map && o.material.map.image ? o.material.map.image.width + ':' : '') + o.material.uuid); } }); return v + '|' + [...mats].sort().join(','); };
    const out = { civs: civs.length, house: {}, wonder: {}, villager: {}, militia: {} };
    for (const c of civs) {
      R.setTeamCiv(R.PLAYER, c);
      out.house[c] = sig(R.kitBuildingModel('house', P).model);
      out.wonder[c] = sig(R.kitBuildingModel('wonder', P).model);
      out.villager[c] = sig(R.unitTemplate('villager', P, c, 0));
      out.militia[c] = sig(R.unitTemplate('militia', P, c, 0));
    }
    const distinct = (o) => new Set(Object.values(o)).size;
    // Conversió: un soldat bizantí convertit pels Mongols conserva l'aspecte bizantí, també en carregar
    R.setTeamCiv(R.PLAYER, 'mongols'); R.setTeamCiv(R.ENEMY, 'byzantines');
    const u = R.createSoldierAt('militia', 10, 10, E);
    R.convertEntity(u, P);
    const keep = u.visArch;
    const data = R.serializeGame();
    R.loadGame(data);
    const u2 = R.state.units.find(x => x.unitKind === 'militia' && x.team === P && Math.abs(x.position.x - 10) < 0.5);
    return { civs: out.civs, house: distinct(out.house), wonder: distinct(out.wonder), villager: distinct(out.villager), militia: distinct(out.militia), keep, keep2: u2 && u2.visArch };
  });
  log(JSON.stringify(r));
  assert(r.civs === 8, 'no hi ha 8 civilitzacions');
  assert(r.house === 8, `les cases de les 8 civilitzacions no són totes diferents (${r.house})`);
  assert(r.wonder === 8, `les Meravelles no són totes diferents (${r.wonder})`);
  assert(r.villager === 8, `els aldeans no són tots diferents (${r.villager})`);
  assert(r.militia >= 7, `les milícies no són prou diferents (${r.militia})`);
  assert(r.keep === 'byzantines' && r.keep2 === 'byzantines', 'una unitat convertida no conserva l\'aspecte de la seva civilització');
};

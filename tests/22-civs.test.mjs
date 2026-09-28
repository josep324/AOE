/* Fase 17: les civilitzacions noves (Britons, Bizantins, Mongols, Xinesos i Catalans): bonificacions,
   unitat única i versió d'elit, tecnologies úniques, arbre tecnològic, models i sortida pròpia */
export default async ({ open, assert, log }) => {
  const page = await open({ civ: 'chinese', enemyCiv: 'catalans' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id, TILE = 2.15;
    R.AI.enabled = false;
    const o = {};
    // Sortida dels Xinesos: 3 aldeans més i menys aliment i fusta
    o.chineseStart = { v: S.units.filter(u => u.team === P && u.subtype === 'villager').length, food: R.PLAYER.res.food, wood: R.PLAYER.res.wood, pop: R.popCap(P) };
    o.chineseTech = R.costFor('forging', P).food;
    const civ = (c) => { R.setTeamCiv(R.PLAYER, c); R.PLAYER.age = 3; for (const k of ['food', 'wood', 'gold', 'stone']) R.PLAYER.res[k] = 50000; };
    const spot = (i) => [-60 + i * 6, -60];
    const res = {};
    const all = { britons: ['longbowman', 'yeomen'], byzantines: ['cataphract', 'logistica'], mongols: ['mangudai', 'drill'], chinese: ['chukonu', 'rocketry'], catalans: ['almogaver', 'consolatdemar', 'venjanca'] };
    let i = 0;
    for (const [c, [unit, ...techs]] of Object.entries(all)) {
      civ(c);
      const x = res[c] = {};
      x.unique = R.uniqueUnitOf(P);
      x.block = R.itemBlockReason(unit, P);
      const u = R.createSoldierAt(unit, ...spot(i++), P);
      x.base = { hp: u.maxHp, atk: u.attack, range: +u.range.toFixed(2), model: !!u.model };
      R.completeTech(P, 'elite_' + unit);
      x.elite = { hp: u.maxHp, atk: u.attack, range: +u.range.toFixed(2), name: u.name };
      for (const t of techs) { x[t] = R.itemBlockReason(t, P); R.completeTech(P, t); }
      x.after = { atk: u.attack, armor: u.armor.slice(), range: +u.range.toFixed(2), bonusInf: u.bonusInf };
      x.otherCivTech = R.itemBlockReason(c === 'britons' ? 'logistica' : 'yeomen', P);
    }
    // Bonificacions
    civ('britons'); R.PLAYER.age = 2;
    const a = R.createSoldierAt('archer', ...spot(i++), P); const r2 = a.range; R.PLAYER.age = 3; R.completeTech(P, 'loom');
    o.britonsRange = +((a.range - r2) / TILE).toFixed(2);
    o.britonsTC = R.costFor('towncenter', P).wood;
    o.britonsCamel = R.itemBlockReason('camel', P);
    civ('byzantines');
    o.byzSpear = [R.costFor('spearman', P).food, R.costFor('pikeman', P).food];
    o.byzAge3 = R.costFor('age3', P).food;
    const h = R.createBuilding('house', 60, 60, true, P); o.byzHouse = h.maxHp;
    civ('mongols');
    const sc = R.createSoldierAt('scout', ...spot(i++), P); o.mongolScout = [sc.maxHp, sc.los];
    const ca = R.createSoldierAt('cavarcher', ...spot(i++), P); o.mongolCA = +(ca.reload * 1.7).toFixed(2);
    o.mongolPaladin = R.itemBlockReason('up_paladin', P);
    civ('chinese'); o.chinesePop = R.popCap(P);
    civ('catalans');
    const m = R.createSoldierAt('militia', ...spot(i++), P); o.catInf = +m.speed.toFixed(2);
    o.catDock = R.costFor('dock', P).wood;
    o.catCamel = R.itemBlockReason('camel', P);
    // Chu Ko Nu: diversos virots per tret
    civ('chinese');
    const ck = R.createSoldierAt('chukonu', 0, -80, P), tgt = R.createSoldierAt('manatarms', 8, -80, E);
    tgt.hp = tgt.maxHp = 5000; tgt.stance = 'stand';
    R.commandAttack([ck], tgt);
    const n0 = S.projectiles.length; let maxProj = 0;
    for (let k = 0; k < 120; k++) { R.simulate(0.05); maxProj = Math.max(maxProj, S.projectiles.length - n0); }
    o.chukonuShots = maxProj;
    return { o, res };
  });
  log(JSON.stringify(r.o));
  for (const [c, x] of Object.entries(r.res)) log(c, JSON.stringify(x));
  const { o, res } = r;
  assert(o.chineseStart.v === 6 && o.chineseStart.food === 0 && o.chineseStart.wood === 150 && o.chineseStart.pop === 15, 'la sortida dels Xinesos no és la correcta');
  assert(o.chineseTech === 128, 'les tecnologies dels Xinesos no són més barates');
  for (const [c, x] of Object.entries(res)) {
    assert(!x.block && x.base.model, `${c}: no es pot fer la unitat única o no té model`);
    assert(x.elite.hp > x.base.hp, `${c}: la versió d'elit no millora`);
    assert(/Només/.test(x.otherCivTech), `${c}: pot investigar la tecnologia única d'una altra civilització`);
  }
  assert(Math.abs(res.britons.after.range - res.britons.elite.range - 2.15) < 0.01, 'Yeomen no dona abast');
  assert(res.byzantines.after.bonusInf === 15, 'Logistica no fa efecte');
  assert(res.chinese.after.atk === res.chinese.elite.atk + 2, 'Coets no fa efecte');
  assert(res.catalans.after.atk === res.catalans.elite.atk + 2 && res.catalans.after.armor[0] === 1, 'Venjança Catalana no fa efecte');
  assert(o.britonsRange === 1 && o.britonsTC === 138 && /arbre/.test(o.britonsCamel), 'bonificacions dels Britons');
  assert(o.byzSpear[0] === 26 && o.byzSpear[1] === 26 && o.byzAge3 === 670 && o.byzHouse === 660, 'bonificacions dels Bizantins');
  assert(o.mongolScout[0] === 59 && o.mongolScout[1] === 20 && /arbre/.test(o.mongolPaladin), 'bonificacions dels Mongols');
  assert(o.chinesePop === 20, 'el Centre dels Xinesos no dona +10 de població');   // (Centre 15 + la casa bizantina 5)
  assert(o.catInf > 5.7 && o.catDock === 113 && /arbre/.test(o.catCamel), 'bonificacions dels Catalans');
  assert(o.chukonuShots >= 3, 'el Chu Ko Nu no dispara diversos virots');
};

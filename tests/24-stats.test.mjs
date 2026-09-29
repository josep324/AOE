/* Estadístiques de la partida: comptadors, mostres cada 30 s, puntuació, desar/carregar i pantalla */
export default async ({ open, assert, log }) => {
  const page = await open({ seed: 41, diff: 'normal' });
  const r = await page.evaluate(() => {
    const R = window.RTS, S = R.state, P = R.PLAYER.id, E = R.ENEMY.id;
    const run = (s) => { for (let i = 0; i < s * 20; i++) R.simulate(0.05); };
    R.enableAIFor(P, R.DIFFICULTY.normal);
    run(360);                                                       // 6 minuts
    const o = {};
    const st = R.STATS;
    o.samples = st.series.length;
    o.lastT = st.series[st.series.length - 1].t;
    o.gathered = Object.values(st.t[P].gathered).reduce((a, b) => a + b, 0);
    o.trained = st.t[P].trained;
    o.villTrained = st.t[P].villTrained;
    o.feudal = st.t[P].ages.length;
    // Morts: un cavaller nostre mata un aldeà rival
    const v = S.units.find(u => u.team === E && u.subtype === 'villager');
    const k = R.createSoldierAt('knight', v.position.x + 2, v.position.z, P);
    k.hp = k.maxHp = 1e6;
    const kills0 = st.t[P].kills, losses0 = st.t[E].losses;
    R.commandAttack([k], v);
    for (let i = 0; i < 30 && !v.dead; i++) run(1);
    o.kill = st.t[P].kills - kills0;
    o.loss = st.t[E].losses - losses0;
    o.score = R.statsScore(P);
    // Desar i carregar: es conserven
    const data = R.serializeGame();
    const before = JSON.stringify(st.t[P]);
    R.statsReset();
    R.loadGame(data);
    o.restored = JSON.stringify(R.STATS.t[P]) === before && R.STATS.series.length === data.stats.series.length;
    // Pantalla: totes les pestanyes es poden obrir
    document.getElementById('menu-btn').click();
    document.getElementById('menu-stats').click();
    const tabs = [...document.querySelectorAll('#stats-tabs .choice')];
    o.tabs = tabs.map(t => { t.click(); return document.querySelector('#stats-body').children.length > 0; });
    o.svg = !!document.querySelector('#stats-body .st-svg polyline');
    o.rows = document.querySelectorAll('#stats-body .st-table tr').length;
    return o;
  });
  log(JSON.stringify(r));
  assert(r.samples === 13 && r.lastT === 360, 'no es fan les mostres cada 30 segons');
  assert(r.gathered > 1500 && r.villTrained >= 10 && r.trained >= r.villTrained, 'no es compten els recursos o les unitats');
  assert(r.feudal >= 1, 'no es compta el pas d\'edat');
  assert(r.kill === 1 && r.loss === 1, 'no es compten les baixes');
  assert(r.score.total > 0 && r.score.eco > 0 && r.score.mil > 0, 'la puntuació no surt');
  assert(r.restored, 'desar i carregar no conserva les estadístiques');
  assert(r.tabs.every(Boolean) && r.svg, 'alguna pestanya de la pantalla no es mostra');
};

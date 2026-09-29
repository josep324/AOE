/* =====================================================================
   ESTADÍSTIQUES DE LA PARTIDA (com les de l'AoE II)
   Comptadors per jugador (recursos recollits, unitats entrenades, baixes, edificis, tecnologies, edats,
   tributs, conversions) i una mostra cada 30 segons de joc (població, aldeans, exèrcit, recursos i
   punts) per a les gràfiques. Es desen amb la partida. No fan servir l'atzar: no afecten la simulació.
   Es veuen des del menú (M) o en acabar la partida.
   ===================================================================== */
const STATS_EVERY = 30;                    // segons de joc entre mostres
const STATS = { t: {}, series: [], next: 0 };
/* Colors de les gràfiques: els de cada jugador, ajustats perquè es distingeixin també amb daltonisme */
const STAT_COLORS = { 1: '#4a8ee6', 2: '#e0503f', 3: '#26a88a', 4: '#b8860b' };
const blankStats = () => ({
  gathered: { food: 0, wood: 0, gold: 0, stone: 0 }, trade: 0, relicGold: 0,
  trained: 0, villTrained: 0, kills: 0, killValue: 0, losses: 0, razed: 0, razedValue: 0, bldLost: 0, built: 0,
  techs: 0, techValue: 0, ages: [], tribSent: 0, tribRecv: 0, converted: 0, peakPop: 0,
});
function statsReset() {
  STATS.t = {};
  for (const id of Object.keys(TEAMS)) STATS.t[id] = blankStats();
  STATS.series = [];
  STATS.next = 0;
}
statsReset();
const statOf = (team) => STATS.t[team] || null;
const costValue = (c) => Object.values(c || {}).reduce((a, b) => a + b, 0);

/* ---------- Comptadors (es criden des de la resta del joc) ---------- */
function statsGather(team, type, n, how = null) {
  const S = statOf(team);
  if (!S || !(type in S.gathered)) return;
  S.gathered[type] += n;
  if (how === 'trade') S.trade += n;
  else if (how === 'relic') S.relicGold += n;
}
function statsTrained(team, kind) {
  const S = statOf(team);
  if (!S) return;
  S.trained++;
  if (kind === 'villager') S.villTrained++;
}
function statsKilled(e, killer) {
  const S = statOf(e.team);
  if (!S || (e.kind === 'building' && e.subtype === 'farm') || e.kind === 'resource') return;
  const K = killer && hostile(killer.team, e.team) ? statOf(killer.team) : null;
  if (e.kind === 'unit') {
    S.losses++;
    if (K) { K.kills++; K.killValue += costValue((CONFIG.UNITS[e.unitKind] || {}).cost); }
  } else if (e.kind === 'building') {
    S.bldLost++;
    if (K) { K.razed++; K.razedValue += costValue((CONFIG.BUILDINGS[e.subtype] || {}).cost); }
  }
}
function statsConverted(e, from, to) {
  const A = statOf(to), B = statOf(from);
  if (A) A.converted++;
  if (B && e.kind === 'unit') B.losses++;
  else if (B && e.kind === 'building') B.bldLost++;
}
function statsTech(team, kind) {
  const S = statOf(team), d = CONFIG.TECHS[kind];
  if (!S || !d) return;
  S.techValue += costValue(costFor(kind, team));
  if (d.ageUp) S.ages.push(Math.round(state.elapsed));
  else S.techs++;
}
function statsBuilt(b) {
  const S = statOf(b.team);
  if (S && !b.isWall && b.subtype !== 'farm') S.built++;
}
function statsTribute(from, to, sent, got) {
  if (statOf(from)) statOf(from).tribSent += sent;
  if (statOf(to)) statOf(to).tribRecv += got;
}

/* ---------- Puntuació (com a l'AoE II: militar, economia i tecnologia) ---------- */
function statsScore(team) {
  const S = statOf(team);
  if (!S) return { mil: 0, eco: 0, tech: 0, total: 0 };
  const g = S.gathered;
  const mil = Math.floor((S.killValue + S.razedValue) / 10);
  const eco = Math.floor((g.food + g.wood + g.gold + g.stone + S.tribSent) / 10);
  const tech = Math.floor(S.techValue / 10);
  return { mil, eco, tech, total: mil + eco + tech };
}
function statsSample() {
  const p = {};
  for (const id of GAME.players) {
    let pop = 0, vills = 0, mil = 0;
    for (const u of state.units) {
      if (u.team !== id) continue;
      pop++;
      if (u.subtype === 'villager') vills++;
      else if (u.isMilitary) mil++;
    }
    const S = statOf(id), g = S.gathered;
    S.peakPop = Math.max(S.peakPop, pop);
    p[id] = [pop, vills, mil, Math.round(g.food + g.wood + g.gold + g.stone), statsScore(id).total];
  }
  STATS.series.push({ t: Math.round(state.elapsed), p });
  STATS.next = (Math.floor((state.elapsed + 0.01) / STATS_EVERY) + 1) * STATS_EVERY;     // (marge pels decimals acumulats)
}
/* Cada segon de joc: una mostra quan toca */
function statsTick() {
  if (state.elapsed + 0.01 >= STATS.next) statsSample();
}
/* Desar i carregar */
const statsSerialize = () => JSON.parse(JSON.stringify(STATS));
function statsRestore(d) {
  statsReset();
  if (!d || !d.t) return;
  for (const [id, s] of Object.entries(d.t)) STATS.t[id] = Object.assign(blankStats(), s, { gathered: { ...blankStats().gathered, ...(s.gathered || {}) } });
  STATS.series = d.series || [];
  STATS.next = d.next || 0;
}

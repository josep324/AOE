/* =====================================================================
   PANTALLA D'ESTADÍSTIQUES: resum de punts, militar, economia, tecnologia i evolució (gràfica)
   ===================================================================== */
const statsScreen = document.getElementById('stats-screen');
const statsBody = document.getElementById('stats-body');
const statsTabsEl = document.getElementById('stats-tabs');
const STAT_TABS = [['summary', '🏆 Resum'], ['military', '⚔️ Militar'], ['economy', '🪙 Economia'], ['tech', '📜 Tecnologia'], ['timeline', '📈 Evolució']];
const STAT_SERIES = [['Punts', 4], ['Població', 0], ['Exèrcit', 2], ['Aldeans', 1], ['Recursos recollits', 3]];
let statsTab = 'summary', statsMetric = 4, statsReturn = null;
const fmtN = (n) => Math.round(n).toLocaleString('ca-ES');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
/* Nom d'un jugador amb el seu punt de color (el text és del color del text, no del jugador) */
function playerCell(id) {
  const td = el('td', 'st-player');
  const dot = el('span', 'st-dot'); dot.style.background = STAT_COLORS[id];
  td.appendChild(dot);
  const C = civOf(id);
  td.appendChild(document.createTextNode(`${C.icon} ${C.name}`));
  const rel = id === PLAYER.id ? 'tu' : allied(id, PLAYER.id) ? 'aliat' : 'rival';
  td.appendChild(el('small', 'st-rel', GAME.defeated.has(id) || !teamAlive(id) ? `${rel} · eliminat` : rel));
  return td;
}
/* Taula: una fila per jugador i una columna per mètrica (el millor de cada columna, en negreta) */
function statsTable(cols, rowFor) {
  const t = el('table', 'st-table');
  const hr = el('tr');
  hr.appendChild(el('th', null, 'Jugador'));
  for (const c of cols) hr.appendChild(el('th', null, c));
  t.appendChild(hr);
  const rows = GAME.players.map(id => [id, rowFor(id)]);
  const best = cols.map((_, i) => Math.max(...rows.map(([, r]) => (typeof r[i] === 'number' ? r[i] : -Infinity))));
  for (const [id, r] of rows) {
    const tr = el('tr', id === PLAYER.id ? 'me' : null);
    tr.appendChild(playerCell(id));
    r.forEach((v, i) => {
      const td = el('td', 'num', typeof v === 'number' ? fmtN(v) : v);
      if (typeof v === 'number' && v > 0 && v === best[i] && rows.length > 1) td.classList.add('best');
      tr.appendChild(td);
    });
    t.appendChild(tr);
  }
  const wrap = el('div', 'st-scroll');           // (en pantalles estretes la taula es desplaça, no desborda)
  wrap.appendChild(t);
  return wrap;
}
const ageTime = (id, k) => { const a = statOf(id).ages[k]; return a !== undefined ? formatTime(a) : '—'; };

/* ---------- Gràfica d'evolució (SVG): una línia per jugador, un sol eix ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
function niceMax(v) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v)), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function statsChart(metric) {
  const wrap = el('div', 'st-chart');
  const series = STATS.series;
  if (series.length < 2) { wrap.appendChild(el('p', 'st-empty', 'Encara no hi ha prou dades (una mostra cada 30 segons de joc).')); return wrap; }
  // Llegenda (sempre, amb dos o més jugadors): clau de línia + nom
  const leg = el('div', 'st-legend');
  for (const id of GAME.players) {
    const it = el('span', 'st-leg');
    const key = el('i'); key.style.background = STAT_COLORS[id];
    it.appendChild(key); it.appendChild(document.createTextNode(civOf(id).name));
    leg.appendChild(it);
  }
  wrap.appendChild(leg);
  const W = 860, H = 300, L = 54, R = 96, T = 12, B = 30;
  const tMax = Math.max(60, series[series.length - 1].t);
  const vMax = niceMax(Math.max(1, ...series.flatMap(s => GAME.players.map(id => (s.p[id] || [])[metric] || 0))));
  const X = (t) => L + (t / tMax) * (W - L - R), Y = (v) => T + (1 - v / vMax) * (H - T - B);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'st-svg', role: 'img', 'aria-label': `Evolució: ${STAT_SERIES.find(s => s[1] === metric)[0]}` });
  // Graella i eixos (línies fines i discretes)
  for (let k = 0; k <= 4; k++) {
    const v = vMax * k / 4, y = Y(v);
    svg.appendChild(svgEl('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'st-grid' }));
    const tx = svgEl('text', { x: L - 8, y: y + 4, class: 'st-tick', 'text-anchor': 'end' }); tx.textContent = fmtN(v); svg.appendChild(tx);
  }
  const step = tMax > 3600 ? 900 : tMax > 1500 ? 600 : tMax > 600 ? 300 : 120;
  for (let t = 0; t <= tMax; t += step) {
    const tx = svgEl('text', { x: X(t), y: H - 8, class: 'st-tick', 'text-anchor': 'middle' }); tx.textContent = formatTime(t); svg.appendChild(tx);
  }
  // Línies (2 px) i punt final amb anella del color del fons
  const ends = [];
  for (const id of GAME.players) {
    const pts = series.filter(s => s.p[id]).map(s => [X(s.t), Y(s.p[id][metric])]);
    if (!pts.length) continue;
    svg.appendChild(svgEl('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: STAT_COLORS[id], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const [ex, ey] = pts[pts.length - 1];
    svg.appendChild(svgEl('circle', { cx: ex, cy: ey, r: 4, fill: STAT_COLORS[id], stroke: '#171614', 'stroke-width': 2 }));
    ends.push({ id, y: ey, x: ex });
  }
  // Etiquetes al final de les línies (només si no es trepitgen; si no, en fan prou la llegenda i el detall)
  ends.sort((a, b) => a.y - b.y);
  const clash = ends.some((e, i) => i && e.y - ends[i - 1].y < 13);
  if (!clash) for (const e of ends) {
    const tx = svgEl('text', { x: e.x + 9, y: e.y + 4, class: 'st-endlbl' }); tx.textContent = civOf(e.id).name; svg.appendChild(tx);
  }
  // Creu de guia: una línia vertical que salta a la mostra més propera i un requadre amb tots els jugadors
  const cross = svgEl('line', { y1: T, y2: H - B, class: 'st-cross', visibility: 'hidden' });
  svg.appendChild(cross);
  const hit = svgEl('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', tabindex: 0 });
  svg.appendChild(hit);
  wrap.appendChild(svg);
  const tip = el('div', 'st-tip hidden');
  wrap.appendChild(tip);
  const show = (i) => {
    const s = series[i];
    cross.setAttribute('x1', X(s.t)); cross.setAttribute('x2', X(s.t)); cross.setAttribute('visibility', 'visible');
    tip.textContent = '';
    tip.appendChild(el('div', 'st-tip-t', formatTime(s.t)));
    for (const id of [...GAME.players].sort((a, b) => ((s.p[b] || [])[metric] || 0) - ((s.p[a] || [])[metric] || 0))) {
      if (!s.p[id]) continue;
      const row = el('div', 'st-tip-row');
      const key = el('i'); key.style.background = STAT_COLORS[id];
      row.appendChild(key);
      row.appendChild(el('b', null, fmtN(s.p[id][metric])));
      row.appendChild(el('span', null, civOf(id).name));
      tip.appendChild(row);
    }
    const box = svg.getBoundingClientRect(), px = X(s.t) / W * box.width;
    tip.style.left = `${Math.min(px + 14, box.width - 170)}px`;
    tip.classList.remove('hidden');
  };
  const nearest = (clientX) => {
    const box = svg.getBoundingClientRect(), t = ((clientX - box.left) / box.width * W - L) / (W - L - R) * tMax;
    let bi = 0; for (let i = 1; i < series.length; i++) if (Math.abs(series[i].t - t) < Math.abs(series[bi].t - t)) bi = i;
    return bi;
  };
  let cur = series.length - 1;
  hit.addEventListener('pointermove', (ev) => show(cur = nearest(ev.clientX)));
  hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); });
  hit.addEventListener('focus', () => show(cur));
  hit.addEventListener('blur', () => { cross.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); });
  hit.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); show(cur); ev.preventDefault(); }
    if (ev.key === 'ArrowRight') { cur = Math.min(series.length - 1, cur + 1); show(cur); ev.preventDefault(); }
  });
  return wrap;
}

/* ---------- Pestanyes ---------- */
function renderStats() {
  statsTabsEl.textContent = '';
  for (const [id, label] of STAT_TABS) {
    const b = el('button', 'choice' + (id === statsTab ? ' on' : ''), label);
    b.addEventListener('click', () => { statsTab = id; renderStats(); });
    statsTabsEl.appendChild(b);
  }
  document.getElementById('stats-sub').textContent = `${MAP_TYPES[WORLD.type].icon} ${MAP_TYPES[WORLD.type].name} · ${LAYOUTS[GAME.layout].name} · ${formatTime(state.elapsed)}`;
  statsBody.textContent = '';
  if (statsTab === 'summary') {
    statsBody.appendChild(statsTable(['Punts', 'Militar', 'Economia', 'Tecnologia'], id => { const s = statsScore(id); return [s.total, s.mil, s.eco, s.tech]; }));
    statsBody.appendChild(el('p', 'st-note', 'Militar: valor de les unitats i edificis rivals destruïts ÷ 10 · Economia: recursos recollits i tributs enviats ÷ 10 · Tecnologia: cost de les tecnologies i edats ÷ 10.'));
  } else if (statsTab === 'military') {
    statsBody.appendChild(statsTable(['Unitats matades', 'Unitats perdudes', 'Edificis destruïts', 'Edificis perduts', 'Conversions', 'Unitats entrenades'],
      id => { const S = statOf(id); return [S.kills, S.losses, S.razed, S.bldLost, S.converted, S.trained - S.villTrained]; }));
  } else if (statsTab === 'economy') {
    statsBody.appendChild(statsTable(['🍖 Aliment', '🪵 Fusta', '🪙 Or', '🪨 Pedra', 'Comerç', 'Relíquies', 'Tributs (enviats / rebuts)', 'Aldeans entrenats', 'Població màxima'],
      id => { const S = statOf(id), g = S.gathered; return [g.food, g.wood, g.gold, g.stone, S.trade, S.relicGold, `${fmtN(S.tribSent)} / ${fmtN(S.tribRecv)}`, S.villTrained, S.peakPop]; }));
    statsBody.appendChild(el('p', 'st-note', 'L\'or inclou el del comerç i el de les relíquies.'));
  } else if (statsTab === 'tech') {
    statsBody.appendChild(statsTable(['Tecnologies', 'Edat Feudal', 'Edat dels Castells', 'Edat Imperial', 'Edificis construïts'],
      id => { const S = statOf(id); return [S.techs, ageTime(id, 0), ageTime(id, 1), ageTime(id, 2), S.built]; }));
  } else {
    const row = el('div', 'row st-metrics');
    for (const [label, k] of STAT_SERIES) {
      const b = el('button', 'choice' + (k === statsMetric ? ' on' : ''), label);
      b.addEventListener('click', () => { statsMetric = k; renderStats(); });
      row.appendChild(b);
    }
    statsBody.appendChild(row);
    statsBody.appendChild(statsChart(statsMetric));
    statsBody.appendChild(el('p', 'st-note', 'Passa el ratolí per la gràfica (o fes-hi Tab i fletxes) per veure els valors de cada moment.'));
  }
}
/* Obre la pantalla (des del menú o des del final) i en tornar deixa l'altra pantalla com era */
function openStats(from) {
  statsTick();
  if (!STATS.series.length || STATS.series[STATS.series.length - 1].t < Math.round(state.elapsed)) statsSample();
  statsReturn = from;
  if (from) from.classList.add('hidden');
  renderStats();
  statsScreen.classList.remove('hidden');
}
document.getElementById('stats-close').addEventListener('click', () => {
  statsScreen.classList.add('hidden');
  if (statsReturn) statsReturn.classList.remove('hidden');
});
document.getElementById('end-stats').addEventListener('click', () => openStats(endScreen));
document.getElementById('menu-stats').addEventListener('click', () => openStats(document.getElementById('menu-screen')));

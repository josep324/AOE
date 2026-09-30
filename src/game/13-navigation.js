/* =====================================================================
   NAVEGACIÓ: GRAELLA (1 cel·la = 1 unitat) + A* + SUAVITZAT DEL CAMÍ
   walk[]  → cel·les no transitables per les unitats
   build[] → cel·les ocupades (no s'hi pot construir)
   ===================================================================== */
const NAV = { cell: 1, N: 0, x0: 0, walk: null, build: null, gate: null, team: 0, version: 0, blockVersion: 0, stampId: 0, need: 1, clr: null };
function navInit() {
  const N = Math.ceil((CONFIG.MAP_LIMIT * 2) / NAV.cell);
  NAV.N = N;
  NAV.x0 = -CONFIG.MAP_LIMIT;
  NAV.walk = new Uint8Array(N * N);
  NAV.build = new Uint8Array(N * N);
  NAV.gate = new Uint8Array(N * N);     // cel·les de porta: equip que hi pot passar
  NAV.g = new Float32Array(N * N);
  NAV.parent = new Int32Array(N * N);
  NAV.seen = new Uint32Array(N * N);
  NAV.closed = new Uint32Array(N * N);
}
function navCell(v) { return Math.min(NAV.N - 1, Math.max(0, Math.floor((v - NAV.x0) / NAV.cell))); }
function navCenter(i) { return NAV.x0 + (i + 0.5) * NAV.cell; }
function navFree(i, j) {
  if (i < 0 || j < 0 || i >= NAV.N || j >= NAV.N) return false;
  const k = j * NAV.N + i;
  if (NAV.need > 1 && NAV.clr[k] < NAV.need) return false;       // unitat gran: no hi cap
  return !NAV.walk[k] && (!NAV.gate[k] || allied(NAV.gate[k], NAV.team));      // (les portes deixen passar els aliats)
}

function rebuildNav() {
  NAV.walk.fill(0);
  NAV.build.fill(0);
  NAV.gate.fill(0);
  refreshLinks();
  stampArea(0, NAV.N - 1, 0, NAV.N - 1);
}
/* Refà només un rectangle de la graella (en talar un arbre o esgotar un recurs: molt més ràpid) */
function rebuildNavArea(x, z, r) {
  const i0 = navCell(x - r), i1 = navCell(x + r), j0 = navCell(z - r), j1 = navCell(z + r), N = NAV.N;
  for (let j = j0; j <= j1; j++) { const k0 = j * N; NAV.walk.fill(0, k0 + i0, k0 + i1 + 1); NAV.build.fill(0, k0 + i0, k0 + i1 + 1); NAV.gate.fill(0, k0 + i0, k0 + i1 + 1); }
  refreshLinks();
  stampArea(i0, i1, j0, j1, true);
}
/* Marca a la graella els obstacles, l'aigua i les granges dins del rectangle de cel·les [i0..i1]×[j0..j1] */
function stampArea(ci0, ci1, cj0, cj1, local = false) {
  const N = NAV.N;
  const x0 = navCenter(ci0) - 0.5, x1 = navCenter(ci1) + 0.5, z0 = navCenter(cj0) - 0.5, z1 = navCenter(cj1) + 0.5;
  for (const o of state.obstacles) {
    if (o.entity && o.entity.mobile) continue;          // les ovelles es mouen: no bloquegen la graella
    const ex = (o.rect ? o.hw : o.ext || o.r) + 1.2, ez = (o.rect ? o.hd : o.ext || o.r) + 1.2;
    if (o.x + ex < x0 || o.x - ex > x1 || o.z + ez < z0 || o.z - ez > z1) continue;
    // Arbres i penya-segats: marge més ample, perquè els forats entre troncs (més estrets que una
    // unitat) no semblin passos; com a l'AoE II, un bosc dens no es pot travessar
    const tree = (o.entity && o.entity.subtype === 'tree') || o.link === 'tree';
    const wm = tree || o.cliff ? 0.72 : 0.35;
    const i0 = Math.max(ci0, navCell(o.x - ex)), i1 = Math.min(ci1, navCell(o.x + ex));
    const j0 = Math.max(cj0, navCell(o.z - ez)), j1 = Math.min(cj1, navCell(o.z + ez));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * N + i, d = obstacleSurface(o, navCenter(i), navCenter(j)).d;
        if (o.gateTeam) { if (d < 0) NAV.gate[k] = o.gateTeam; else if (d < 0.35) NAV.walk[k] = 1; }
        else if (d < wm) NAV.walk[k] = 1;
        // Construcció: 1 = ocupat; 2 = tocant un tronc (no s'hi fan edificis, però sí muralles
        // enganxades al bosc per tancar-lo)
        if (tree) { if (d < 0.05) NAV.build[k] = 1; else if (d < 0.5 && !NAV.build[k]) NAV.build[k] = 2; }
        else if (d < 0.5) NAV.build[k] = 1;
      }
    }
  }
  // Graella naval: només l'aigua fonda lliure d'obstacles (molls…) és navegable
  if (!NAV.naval || NAV.naval.length !== N * N) NAV.naval = new Uint8Array(N * N);
  const water = WATER.any && WATER.N === N;
  for (let j = cj0; j <= cj1; j++) for (let i = ci0; i <= ci1; i++) {
    const k = j * N + i;
    NAV.naval[k] = !water || WATER.mask[k] !== 1 || NAV.walk[k] ? 1 : 0;
    // Aigua: la fonda bloqueja el pas; els guals es travessen però no s'hi construeix
    if (water) { const w = WATER.mask[k]; if (w === 1) { NAV.walk[k] = 1; NAV.build[k] = 1; } else if (w === 2) NAV.build[k] = 1; }
  }
  // Les granges es poden trepitjar però ocupen terreny
  for (const e of state.buildings.concat(state.resourceNodes)) {
    if (e.subtype !== 'farm' || e.dead || e.depleted) continue;
    const fp = e.footprint;
    for (let j = Math.max(cj0, navCell(e.position.z - fp.hd + 0.01)); j <= Math.min(cj1, navCell(e.position.z + fp.hd - 0.01)); j++)
      for (let i = Math.max(ci0, navCell(e.position.x - fp.hw + 0.01)); i <= Math.min(ci1, navCell(e.position.x + fp.hw - 0.01)); i++)
        NAV.build[j * N + i] = 1;
  }
  if (local && NAV.label) regionsLocal(ci0, ci1, cj0, cj1); else labelRegions();
  NAV.version++;
  // Un canvi local (un arbre talat, una granja) només obre pas o no toca el pas: els camins fets continuen
  // sent bons. Només els canvis de tot el mapa (edificis) obliguen a refer-los.
  if (!local) NAV.blockVersion++;
  rebuildObstacleGrid();
}
/* Zones connectades de la graella de terra (les portes compten com a pas): si l'origen i el destí
   són en zones diferents, l'A* no ha de recórrer tota la zona per descobrir-ho */
function labelRegions() {
  const N = NAV.N;
  if (!NAV.label || NAV.label.length !== N * N) { NAV.label = new Int32Array(N * N); NAV.nlabel = new Int32Array(N * N); NAV.stack = new Int32Array(N * N); }
  NAV.maxLabel = floodLabels(NAV.walk, NAV.label);
  NAV.maxNLabel = floodLabels(NAV.naval, NAV.nlabel);          // zones d'aigua navegable (cada llac, el riu…)
  if (!NAV.clear || NAV.clear.length !== N * N) { NAV.clear = new Uint8Array(N * N); NAV.nclear = new Uint8Array(N * N); }
  clearance(NAV.walk, NAV.clear);
  clearance(NAV.naval, NAV.nclear);
}
/* Amplada del pas: per a cada cel·la lliure, a quantes cel·les (fins a 3) queda la bloquejada més propera.
   Les unitats grans (setge, galions) només passen per cel·les amb prou marge */
function clearance(W, out) {
  const N = NAV.N;
  if (!NAV.cstack || NAV.cstack.length < N * N * 3) NAV.cstack = new Int32Array(N * N * 3);   // (una cel·la pot entrar-hi fins a 3 vegades)
  const st = NAV.cstack;
  let top = 0;
  for (let k = 0; k < N * N; k++) {
    if (W[k]) { out[k] = 0; continue; }
    const i = k % N, j = (k - i) / N;
    let edge = i === 0 || j === 0 || i === N - 1 || j === N - 1;
    for (let dj = -1; dj <= 1 && !edge; dj++) for (let di = -1; di <= 1; di++) if (W[k + dj * N + di]) { edge = true; break; }
    out[k] = edge ? 1 : 255;
    if (edge) st[top++] = k;
  }
  for (let q = 0; q < top; q++) {
    const k = st[q], v = out[k];
    if (v >= 3) continue;
    const i = k % N, j = (k - i) / N;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const n = nj * N + ni;
      if (out[n] > v + 1) { out[n] = v + 1; st[top++] = n; }
    }
  }
}
/* Després d'un canvi local que només pot obrir pas (talar un arbre, esgotar un recurs): si la zona tocada
   i el seu voltant són d'una sola zona, n'hi ha prou d'estendre-la; si en toca dues, cal refer-ho tot */
function regionsLocal(i0, i1, j0, j1) {
  const N = NAV.N, st = NAV.stack;
  i0 = Math.max(0, i0); j0 = Math.max(0, j0); i1 = Math.min(N - 1, i1); j1 = Math.min(N - 1, j1);
  const inBox = (i, j) => i >= i0 && i <= i1 && j >= j0 && j <= j1;
  for (const [W, lab, key] of [[NAV.walk, NAV.label, 'maxLabel'], [NAV.naval, NAV.nlabel, 'maxNLabel']]) {
    // Zones del voltant (cel·les lliures just fora del rectangle): si n'hi ha més d'una, es refà tot
    let id = 0, many = false;
    for (let j = j0 - 1; j <= j1 + 1 && !many; j++) for (let i = i0 - 1; i <= i1 + 1; i++) {
      if (inBox(i, j) || i < 0 || j < 0 || i >= N || j >= N) continue;
      const l = lab[j * N + i];
      if (!l) continue;
      if (!id) id = l; else if (l !== id) { many = true; break; }
    }
    if (many) { NAV[key] = floodLabels(W, lab); continue; }
    // Dins del rectangle: s'esborra i s'inunda des de les vores que toquen la zona del voltant
    let top = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * N + i;
      lab[k] = 0;
      if (W[k] || !id) continue;
      if ((i > 0 && !inBox(i - 1, j) && lab[k - 1] === id) || (i < N - 1 && !inBox(i + 1, j) && lab[k + 1] === id)
        || (j > 0 && !inBox(i, j - 1) && lab[k - N] === id) || (j < N - 1 && !inBox(i, j + 1) && lab[k + N] === id)) st[top++] = k;
    }
    const fill = (label) => {
      for (let q = 0; q < top; q++) lab[st[q]] = label;
      while (top) {
        const k = st[--top], i = k % N, j = (k - i) / N;
        for (const [ni, nj] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
          if (!inBox(ni, nj)) continue;
          const n = nj * N + ni;
          if (!W[n] && !lab[n]) { lab[n] = label; st[top++] = n; }
        }
      }
    };
    if (top) fill(id);
    // Forats tancats dins del rectangle: zones noves
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * N + i;
      if (W[k] || lab[k]) continue;
      st[top++] = k; fill(++NAV[key]);
    }
  }
  // Amplada del pas: només canvia a prop (fins a 3 cel·les)
  clearanceLocal(NAV.walk, NAV.clear, i0 - 3, i1 + 3, j0 - 3, j1 + 3);
  clearanceLocal(NAV.naval, NAV.nclear, i0 - 3, i1 + 3, j0 - 3, j1 + 3);
}
function clearanceLocal(W, out, i0, i1, j0, j1) {
  const N = NAV.N;
  i0 = Math.max(0, i0); j0 = Math.max(0, j0); i1 = Math.min(N - 1, i1); j1 = Math.min(N - 1, j1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * N + i;
    if (W[k]) { out[k] = 0; continue; }
    let best = 255;
    for (let r = 1; r <= 3 && best === 255; r++) {
      for (let dj = -r; dj <= r && best === 255; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= N || nj >= N || W[nj * N + ni]) { best = r; break; }
      }
    }
    out[k] = best;
  }
}
function floodLabels(W, lab) {
  const N = NAV.N, st = NAV.stack;
  lab.fill(0);
  let id = 0;
  for (let k0 = 0; k0 < N * N; k0++) {
    if (W[k0] || lab[k0]) continue;
    id++;
    let top = 0;
    st[top++] = k0; lab[k0] = id;
    while (top) {
      const k = st[--top], i = k % N, j = (k - i) / N;
      if (i > 0 && !W[k - 1] && !lab[k - 1]) { lab[k - 1] = id; st[top++] = k - 1; }
      if (i < N - 1 && !W[k + 1] && !lab[k + 1]) { lab[k + 1] = id; st[top++] = k + 1; }
      if (j > 0 && !W[k - N] && !lab[k - N]) { lab[k - N] = id; st[top++] = k - N; }
      if (j < N - 1 && !W[k + N] && !lab[k + N]) { lab[k + N] = id; st[top++] = k + N; }
    }
  }
  return id;
}
/* Una unitat pot arribar a tocar aquesta entitat? (alguna cel·la lliure del voltant és de la seva zona) */
function canReach(u, e, extra = 1.6) {
  if (!NAV.label) return true;
  const N = NAV.N, lab = u.naval ? NAV.nlabel : NAV.label;
  const s = nearestFreeCellIn(lab, navCell(u.position.x), navCell(u.position.z));
  if (!s) return true;
  const id = lab[s], r = (e.footprint ? Math.max(e.footprint.hw, e.footprint.hd) : (e.radius || 0.5)) + extra;
  const i0 = navCell(e.position.x - r), i1 = navCell(e.position.x + r), j0 = navCell(e.position.z - r), j1 = navCell(e.position.z + r);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (lab[j * N + i] === id) return true;
  return false;
}
function nearestFreeCellIn(lab, ci, cj) {
  const N = NAV.N;
  for (let r = 0; r <= 3; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const i = ci + di, j = cj + dj;
    if (i >= 0 && j >= 0 && i < N && j < N && lab[j * N + i]) return j * N + i;
  }
  return null;
}
/* Cel·la de la zona «id» més propera a (gi, gj) */
function nearestCellInRegion(gi, gj, id, maxR = 60) {
  const N = NAV.N;
  for (let r = 1; r <= maxR; r++) {
    let best = null, bestD = Infinity;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = gi + di, j = gj + dj;
      if (i < 0 || j < 0 || i >= N || j >= N || NAV.label[j * N + i] !== id || !navFree(i, j)) continue;
      const d = di * di + dj * dj;
      if (d < bestD) { bestD = d; best = [i, j]; }
    }
    if (best) return best;
  }
  return null;
}
/* Índex espacial dels obstacles (cel·les de 8 unitats): la col·lisió només mira els propers.
   Cada obstacle va a totes les cel·les que toca el seu requadre (un edifici gran, a unes quantes); només
   els mòbils (ovelles) van en una llista a part que es comprova sempre. Abans els edificis anaven tots a
   la llista a part: amb centenars d'edificis, cada unitat els havia de mirar tots a cada pas.
   Si només s'han afegit obstacles (el cas habitual en generar el mapa o construir) s'hi afegeixen
   sense refer-la; si se n'han tret (la llista es refà amb filter), es refà sencera. */
const OBS_GRID = { cell: 4, map: new Map(), big: [], count: -1, src: null, q: 0 };
const OBS_REACH = 5;                     // marge màxim que es pot consultar amb la graella
function obstacleGridInsert(o) {
  if (o.entity && o.entity.mobile) { OBS_GRID.big.push(o); return; }
  const ext = o.rect ? Math.hypot(o.hw, o.hd) : Math.max(o.r, o.ext || 0);
  const c = OBS_GRID.cell;
  const i0 = Math.floor((o.x - ext) / c), i1 = Math.floor((o.x + ext) / c), j0 = Math.floor((o.z - ext) / c), j1 = Math.floor((o.z + ext) / c);
  o.multiCell = i0 !== i1 || j0 !== j1;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = spatialKey(i, j);
    let arr = OBS_GRID.map.get(k);
    if (!arr) OBS_GRID.map.set(k, arr = []);
    arr.push(o);
  }
}
function obstacleGridRemove(o) {
  const drop = (arr) => { const i = arr.indexOf(o); if (i >= 0) arr.splice(i, 1); };
  if (o.entity && o.entity.mobile) { drop(OBS_GRID.big); return; }
  const ext = o.rect ? Math.hypot(o.hw, o.hd) : Math.max(o.r, o.ext || 0);
  const c = OBS_GRID.cell;
  for (let i = Math.floor((o.x - ext) / c); i <= Math.floor((o.x + ext) / c); i++)
    for (let j = Math.floor((o.z - ext) / c); j <= Math.floor((o.z + ext) / c); j++) {
      const arr = OBS_GRID.map.get(spatialKey(i, j));
      if (arr) drop(arr);
    }
  drop(OBS_GRID.big);
}
function rebuildObstacleGrid() {
  const list = state.obstacles;
  if (OBS_GRID.src === list && list.length > OBS_GRID.count) {
    for (let i = OBS_GRID.count; i < list.length; i++) obstacleGridInsert(list[i]);
  } else {
    OBS_GRID.map.clear();
    OBS_GRID.big = [];
    for (const o of list) obstacleGridInsert(o);
  }
  OBS_GRID.src = list;
  OBS_GRID.count = list.length;
}
/* Obstacles el requadre dels quals queda a menys de R del punt (i alguns de més: el que diu la graella) */
function obstaclesNear(x, z, out, R = 8) {
  if (OBS_GRID.count !== state.obstacles.length || OBS_GRID.src !== state.obstacles) rebuildObstacleGrid();
  out.length = 0;
  for (const o of OBS_GRID.big) out.push(o);
  const c = OBS_GRID.cell, q = ++OBS_GRID.q;
  const i0 = Math.floor((x - R) / c), i1 = Math.floor((x + R) / c), j0 = Math.floor((z - R) / c), j1 = Math.floor((z + R) / c);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const arr = OBS_GRID.map.get(spatialKey(i, j));
    if (arr) for (const o of arr) {
      if (o.multiCell) { if (o.gridQ === q) continue; o.gridQ = q; }     // (un obstacle a diverses cel·les, un sol cop)
      out.push(o);
    }
  }
  return out;
}

function nearestFreeCell(i, j, maxR = 8) {
  if (navFree(i, j)) return [i, j];
  for (let r = 1; r <= maxR; r++) {
    let best = null, bestD = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (!navFree(i + di, j + dj)) continue;
        const d = di * di + dj * dj;
        if (d < bestD) { bestD = d; best = [i + di, j + dj]; }
      }
    }
    if (best) return best;
  }
  return null;
}

/* Comprova si un segment és transitable (ignora els extrems, on la unitat pot tocar l'objectiu) */
function segmentWalkable(ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(len / 0.3);
  const N = NAV.N;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const k = navCell(z) * N + navCell(x);
    // L'aigua fonda es comprova sempre (una unitat a la riba no pot retallar-ne una cantonada);
    // els obstacles, no als extrems (la unitat pot sortir de la vora d'un edifici)
    if (WATER.any && WATER.mask[k] === 1 && !NAV.navalMode) return false;
    if (t * len < 0.8 || (1 - t) * len < 0.8) continue;
    if (NAV.walk[k] || (NAV.gate[k] && NAV.gate[k] !== NAV.team)) return false;
    if (NAV.need > 1 && NAV.clr[k] < NAV.need) return false;
  }
  return true;
}

/* Línia recta lliure per a una unitat concreta: amb el seu equip (portes) i la seva amplada
   (un ariet o un galió no passen per on passa un aldeà) */
function unitSegmentWalkable(u, bx, bz) {
  NAV.team = u.team;
  NAV.clr = u.naval ? NAV.nclear : NAV.clear;
  NAV.need = u.radius > (u.naval ? 1.25 : 0.9) && NAV.clr ? 2 : 1;
  const landWalk = NAV.walk;
  if (u.naval) { NAV.walk = NAV.naval; NAV.navalMode = true; }
  try { return segmentWalkable(u.position.x, u.position.z, bx, bz); }
  finally { NAV.walk = landWalk; NAV.navalMode = false; NAV.need = 1; }
}
/* A* sobre la graella (8 direccions, sense tallar cantonades). ASTAR_W > 1 (A* ponderat) seria més ràpid,
   però amb 1,15 els camins subòptims deixaven unitats encallades vora els llacs: es manté l'A* exacte */
const ASTAR_W = 1;
const NAV_DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
function findPath(sx, sz, tx, tz) {
  const N = NAV.N;
  const s = nearestFreeCell(navCell(sx), navCell(sz), 4);
  let g = nearestFreeCell(navCell(tx), navCell(tz), 12);
  if (!s) return null;
  // Destí en una altra zona (dins d'un bosc tancat, a l'altra banda d'una muralla…): com a l'AoE II,
  // s'hi acosta tant com pot; es busca directament la cel·la més propera de la zona pròpia
  let unreachable = false;
  if (!NAV.navalMode && NAV.label) {
    const ls = NAV.label[s[1] * N + s[0]];
    if (ls && (!g || NAV.label[g[1] * N + g[0]] !== ls)) {
      // (si la zona pròpia queda molt lluny del destí, A* parcial com sempre: s'hi acosta tant com pot)
      const near = nearestCellInRegion(navCell(tx), navCell(tz), ls);
      if (near) { g = near; unreachable = true; }
    }
  }
  if (!g) return null;
  const si = s[1] * N + s[0], gi = g[1] * N + g[0];
  if (si === gi) { const out = []; if (unreachable) out.partial = true; return out; }
  const stamp = ++NAV.stampId;
  const gx = g[0], gz = g[1];
  const H = (idx) => {
    const dx = Math.abs((idx % N) - gx), dz = Math.abs(((idx / N) | 0) - gz);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  // Munt binari (heap) amb prioritat f = g + h
  const heap = [], fOf = [];
  const push = (idx, f) => {
    heap.push(idx); fOf.push(f);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fOf[p] <= fOf[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; [fOf[p], fOf[c]] = [fOf[c], fOf[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const lastI = heap.pop(), lastF = fOf.pop();
    if (heap.length) {
      heap[0] = lastI; fOf[0] = lastF;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && fOf[l] < fOf[m]) m = l;
        if (r < heap.length && fOf[r] < fOf[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]]; [fOf[m], fOf[c]] = [fOf[c], fOf[m]];
        c = m;
      }
    }
    return top;
  };
  NAV.seen[si] = stamp; NAV.g[si] = 0; NAV.parent[si] = -1;
  push(si, H(si));
  let found = false, iter = 0, best = si, bestH = H(si);
  while (heap.length && iter++ < 220000) {
    const cur = pop();
    if (cur === gi) { found = true; break; }
    if (NAV.closed[cur] === stamp) continue;
    NAV.closed[cur] = stamp;
    const hc = H(cur);
    if (hc < bestH) { bestH = hc; best = cur; }
    const ci = cur % N, cj = (cur / N) | 0;
    for (const [dx, dz, cost] of NAV_DIRS) {
      const ni = ci + dx, nj = cj + dz;
      if (!navFree(ni, nj)) continue;
      if (dx && dz && (!navFree(ci + dx, cj) || !navFree(ci, cj + dz))) continue;
      const n = nj * N + ni;
      if (NAV.closed[n] === stamp) continue;
      const ng = NAV.g[cur] + cost;
      if (NAV.seen[n] !== stamp || ng < NAV.g[n]) {
        NAV.seen[n] = stamp; NAV.g[n] = ng; NAV.parent[n] = cur;
        push(n, ng + H(n) * ASTAR_W);
      }
    }
  }
  // Destí inabastable (tancat per edificis, aigua…): com a l'AoE II, s'hi acosta tant com pot
  const end = found ? gi : best;
  if (!found && end === si) return null;
  const cells = [];
  for (let c = end; c !== si && c !== -1; c = NAV.parent[c]) cells.push([navCenter(c % N), navCenter((c / N) | 0)]);
  cells.reverse();
  if (!found || unreachable) cells.partial = true;
  return cells;
}

/* Elimina punts intermedis innecessaris: el camí queda en trams rectes */
function smoothPath(start, pts) {
  const out = [];
  let cur = start, i = 0;
  while (i < pts.length) {
    let j = i;
    while (j + 1 < pts.length && segmentWalkable(cur.x, cur.z, pts[j + 1].x, pts[j + 1].z)) j++;
    out.push(pts[j]);
    cur = pts[j];
    i = j + 1;
  }
  return out;
}

/* Assigna un destí a una unitat: línia recta si és lliure, si no camí A* */
function setMoveTarget(u, p) {
  u.target = p;
  u.path = null;
  u.pathVersion = NAV.blockVersion;
  if (!p) return;
  NAV.team = u.team;                  // les portes només deixen passar el seu equip
  // Els vaixells fan servir la graella naval (només aigua fonda)
  const landWalk = NAV.walk;
  if (u.naval) { NAV.walk = NAV.naval; NAV.navalMode = true; }
  // Unitats grans (setge, galions): només per passos prou amples
  NAV.clr = u.naval ? NAV.nclear : NAV.clear;
  NAV.need = u.radius > (u.naval ? 1.25 : 0.9) && NAV.clr ? 2 : 1;
  try {
    if (segmentWalkable(u.position.x, u.position.z, p.x, p.z) && (!u.naval || waterCell(p.x, p.z) === 1)) { u.path = [p]; return; }
    const cells = findPath(u.position.x, u.position.z, p.x, p.z);
    if (!cells) { u.path = u.naval ? [] : [p]; return; }
    const pts = cells.map(([x, z]) => new THREE.Vector3(x, 0, z));
    // Un vaixell no pot arribar a un punt de terra: s'atura a la darrera cel·la d'aigua
    if (!cells.partial && (!u.naval || waterCell(p.x, p.z) === 1)) pts.push(p);
    u.path = smoothPath(u.position, pts);
  } finally { NAV.walk = landWalk; NAV.navalMode = false; NAV.need = 1; }
}

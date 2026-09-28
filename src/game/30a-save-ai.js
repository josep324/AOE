/* =====================================================================
   DESAR LA MEMÒRIA DE LA IA
   Tot el que la IA recorda (què ha vist del rival, l'exèrcit reunit, les incursions, la ruta de
   l'explorador, la reserva per a l'edat…) es desa amb la partida, perquè en carregar-la continuï igual.
   Les referències a unitats i edificis es desen com a índexs de la llista d'entitats; els Map com a
   llistes de parells i els vectors com a coordenades.
   ===================================================================== */
function aiEncode(v, idx) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'function') return undefined;
  if (typeof v !== 'object') return v;
  if (v.isVector3) return { $v: [r2(v.x), r2(v.y), r2(v.z)] };
  if (v instanceof Entity) return idx.has(v) ? { $e: idx.get(v) } : { $e: -1 };
  if (v instanceof Map) return { $m: [...v].map(([k, x]) => [k, aiEncode(x, idx)]) };
  if (Array.isArray(v)) return v.map(x => aiEncode(x, idx));
  const o = {};
  for (const [k, x] of Object.entries(v)) { const e = aiEncode(x, idx); if (e !== undefined) o[k] = e; }
  return o;
}
/* Desfà aiEncode. Una entitat que ja no hi és torna com a null i es treu de les llistes */
function aiDecode(v, made) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    const out = [];
    for (const x of v) { const d = aiDecode(x, made); if (d === null && x && x.$e !== undefined) continue; out.push(d); }
    return out;
  }
  if (v.$v) return new THREE.Vector3(v.$v[0], v.$v[1], v.$v[2]);
  if (v.$e !== undefined) return (v.$e >= 0 && made[v.$e]) || null;
  if (v.$m) {
    // Mapes de coses vistes: la clau és l'id de l'entitat, que canvia en carregar
    const m = new Map();
    for (const [k, x] of v.$m) {
      const d = aiDecode(x, made);
      if (d && typeof d === 'object' && ('u' in d || 'b' in d)) { const e = d.u || d.b; if (!e) continue; m.set(e.id, d); }
      else m.set(k, d);
    }
    return m;
  }
  const o = {};
  for (const [k, x] of Object.entries(v)) o[k] = aiDecode(x, made);
  return o;
}
const diffKey = (D) => Object.keys(DIFFICULTY).find(k => DIFFICULTY[k] === D) || 'normal';
function serializeAIs(idx) {
  return AIS.map(A => {
    const { diff, ...rest } = A;
    return { diff: diffKey(diff), data: aiEncode(rest, idx) };
  });
}
function restoreAIs(list, made) {
  // Les IA que no hi són a la partida desada (p. ex. la del jugador en una prova IA contra IA) s'aturen
  for (const A of AIS) if (A !== AI && !list.some(s => s.data.team === A.team)) A.enabled = false;
  for (const s of list) {
    const diff = DIFFICULTY[s.diff] || DIFFICULTY.normal;
    const A = s.data.team === AI.team ? AI : enableAIFor(s.data.team, diff);
    aiReset(A, diff);
    Object.assign(A, aiDecode(s.data, made));
    A.diff = diff;
  }
}

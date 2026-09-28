/* =====================================================================
   COMPROVACIONS DE QUALITAT DEL CODI (npm run check)
   El joc s'uneix en un sol mòdul (vegeu vite.config.js), de manera que tots els fitxers
   de src/game comparteixen el mateix espai de noms. Aquí es detecta el que el navegador
   no avisaria:
   - Noms declarats dues vegades al nivell superior (una funció repetida en substitueix
     una altra en silenci).
   - Math.random a la lògica del joc: la simulació ha de fer servir rand() (amb llavor)
     perquè les partides siguin reproduïbles; els efectes visuals fan servir vrand().
     Es permet a les línies marcades amb «atzar-ui» (tries del menú abans de començar).
   - Fitxers massa llargs (avís).
   - Dades coherents amb les civilitzacions que existeixen: cap unitat o tecnologia pròpia d'una
     civilització que no hi és, i l'arbre tecnològic (disabled) només cita unitats i tecnologies reals.
   ===================================================================== */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'src/game');
const MAX_LINES = 700;
const errors = [], warnings = [];
const seen = new Map();

for (const f of readdirSync(GAME).filter(f => f.endsWith('.js')).sort()) {
  const lines = readFileSync(join(GAME, f), 'utf8').split('\n');
  if (lines.length > MAX_LINES) warnings.push(`${f}: ${lines.length} línies (més de ${MAX_LINES}); convé partir-lo`);
  lines.forEach((line, i) => {
    const where = `${f}:${i + 1}`;
    const m = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m) {
      const name = m[1] || m[2];
      if (seen.has(name)) errors.push(`${where}: «${name}» ja està declarat a ${seen.get(name)}`);
      else seen.set(name, where);
    }
    if (/Math\.random\s*\(/.test(line) && f !== '00-config.js' && !/atzar-ui/.test(line)) {
      errors.push(`${where}: Math.random a la lògica del joc (fes servir rand() o, si és només visual, vrand())`);
    }
  });
}
// Dades: civilitzacions, unitats i tecnologies
const { CIVS } = await import(new URL('../src/data/civs.js', import.meta.url));
const { UNITS } = await import(new URL('../src/data/units.js', import.meta.url));
const { TECHS } = await import(new URL('../src/data/techs.js', import.meta.url));
const { BUILDINGS } = await import(new URL('../src/data/buildings.js', import.meta.url));
for (const [k, u] of Object.entries(UNITS)) {
  if (u.unique && !CIVS[u.unique]) errors.push(`units.js: «${k}» és la unitat única d'una civilització que no existeix (${u.unique})`);
  if (u.requiresTech && !TECHS[u.requiresTech]) errors.push(`units.js: «${k}» requereix una tecnologia que no existeix (${u.requiresTech})`);
  if (u.line && !UNITS[u.line]) errors.push(`units.js: «${k}» és de la línia «${u.line}», que no existeix`);
}
for (const [k, t] of Object.entries(TECHS)) {
  if (t.civ && !CIVS[t.civ]) errors.push(`techs.js: «${k}» és d'una civilització que no existeix (${t.civ})`);
  if (t.elite && !UNITS[t.elite]) errors.push(`techs.js: «${k}» millora una unitat que no existeix (${t.elite})`);
  if (t.upgradeTo && !UNITS[t.upgradeTo]) errors.push(`techs.js: «${k}» porta a una unitat que no existeix (${t.upgradeTo})`);
  if (t.requires && !TECHS[t.requires]) errors.push(`techs.js: «${k}» requereix «${t.requires}», que no existeix`);
  if (t.at && !BUILDINGS[t.at] && t.at !== 'towncenter') errors.push(`techs.js: «${k}» s'investiga a «${t.at}», que no existeix`);
}
for (const [k, c] of Object.entries(CIVS)) {
  if (!UNITS[c.unique]) errors.push(`civs.js: la unitat única de «${k}» (${c.unique}) no existeix`);
  for (const d of c.disabled || []) if (!UNITS[d] && !TECHS[d]) errors.push(`civs.js: «${k}» desactiva «${d}», que no és cap unitat ni tecnologia`);
}
for (const [k, b] of Object.entries(BUILDINGS)) for (const t of b.trains || []) {
  if (t !== '@unique' && !UNITS[t]) errors.push(`buildings.js: «${k}» entrena «${t}», que no existeix`);
}

for (const w of warnings) console.log('⚠️  ' + w);
for (const e of errors) console.log('✘ ' + e);
console.log(errors.length ? `\n${errors.length} errors` : `✔ Codi correcte (${seen.size} noms de nivell superior, sense duplicats)`);
process.exit(errors.length ? 1 : 0);

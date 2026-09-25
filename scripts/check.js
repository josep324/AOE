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
for (const w of warnings) console.log('⚠️  ' + w);
for (const e of errors) console.log('✘ ' + e);
console.log(errors.length ? `\n${errors.length} errors` : `✔ Codi correcte (${seen.size} noms de nivell superior, sense duplicats)`);
process.exit(errors.length ? 1 : 0);

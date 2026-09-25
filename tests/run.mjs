/* =====================================================================
   PROVES DEL JOC (navegador real amb Playwright)
   Ús:  npm test                 → compila i passa totes les proves
        node tests/run.mjs ai    → només les proves que contenen «ai» al nom
        node tests/run.mjs --bench → bancs de proves (p. ex. la IA durant 25 minuts)
   Cada fitxer *.test.mjs exporta una funció async ({ open, assert, log }) que obre el joc
   (index.html compilat) i el comprova a través de window.RTS.
   ===================================================================== */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json' };

// Servidor estàtic mínim per a l'arrel del projecte
const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(ROOT) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(await readFile(path)); }
  catch { res.writeHead(500); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;

// Chromium: el de Playwright o, si no hi és, el camí indicat a PW_CHROMIUM
const launchOpts = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);

class AssertError extends Error {}
function assert(cond, msg) { if (!cond) throw new AssertError(msg); }

// --bench: bancs de proves (només mesuren, triguen més): node tests/run.mjs --bench
const bench = process.argv.includes('--bench');
const filter = process.argv.slice(2).find(a => !a.startsWith('--')) || '';
const files = (await readdir(join(ROOT, 'tests'))).filter(f => f.endsWith(bench ? '.bench.mjs' : '.test.mjs') && f.includes(filter)).sort();
let failed = 0;
for (const f of files) {
  const pages = [];
  const errors = [];
  /* Obre el joc: seed fixa, espera que estigui llest i (si es demana) comença la partida */
  const open = async ({ seed = 21, map = 'arabia', start = true, civ = 'franks', enemyCiv = 'saracens', diff = 'normal', viewport = { width: 1280, height: 800 } } = {}) => {
    const page = await browser.newPage({ viewport });
    pages.push(page);
    page.on('pageerror', e => errors.push(e.message + '\n' + (e.stack || '')));
    await page.route('**fonts.g**', r => r.abort());
    await page.goto(`${BASE}?seed=${seed}`, { timeout: 180000 });
    await page.waitForFunction(() => window.__RTS_READY, null, { timeout: 180000 });
    if (start) {
      await page.click(`#map-choices [data-map=${map}]`);
      await page.click(`#civ-choices [data-civ=${civ}]`);
      await page.click(`#enemy-civ-choices [data-civ=${enemyCiv}]`);
      await page.click(`#diff-choices [data-diff=${diff}]`);
      // Començar i pausar en el mateix instant: la simulació la fan avançar les proves (RTS.simulate), no el rellotge
      await page.evaluate(() => { document.getElementById('start-btn').click(); window.RTS.state.paused = true; });
    }
    return page;
  };
  const t0 = Date.now();
  const logs = [];
  try {
    const mod = await import(pathToFileURL(join(ROOT, 'tests', f)).href);
    await mod.default({ open, assert, log: (...a) => logs.push(a.join(' ')) });
    assert(!errors.length, 'errors a la pàgina:\n' + errors.slice(0, 3).join('\n'));
    console.log(`✔ ${f} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (err) {
    failed++;
    console.log(`✘ ${f}: ${err instanceof AssertError ? err.message : err.stack}`);
  }
  for (const l of logs) console.log('   ' + l);
  for (const p of pages) await p.close();
}
await browser.close();
server.close();
console.log(failed ? `\n${failed} de ${files.length} proves han fallat` : `\nTotes les proves (${files.length}) han passat`);
process.exit(failed ? 1 : 0);

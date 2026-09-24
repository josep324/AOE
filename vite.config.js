import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(root, 'src/game');

/*
 * El codi del joc està repartit en fitxers numerats a src/game/ (un per sistema).
 * Aquest connector els uneix en ordre en un sol mòdul («virtual:game»), de manera
 * que comparteixen l'estat com abans però el codi queda organitzat per fitxers.
 * Les línies «import … from …» de cada fitxer es mouen al principi i es deduplicuen.
 */
function gameParts() {
  const ID = 'virtual:game';
  return {
    name: 'imperis-game-parts',
    resolveId(id) { return id === ID ? '\0' + ID : null; },
    load(id) {
      if (id !== '\0' + ID) return null;
      const files = readdirSync(GAME_DIR).filter(f => f.endsWith('.js')).sort();
      const imports = new Set();
      let body = '';
      for (const f of files) {
        const path = join(GAME_DIR, f);
        this.addWatchFile(path);
        const rest = [];
        for (const line of readFileSync(path, 'utf8').split('\n')) {
          if (/^import\s[^;]*from\s+['"][^'"]+['"];?\s*$/.test(line)) imports.add(line.trim());
          else rest.push(line);
        }
        body += `\n// ─── ${f} ───\n` + rest.join('\n');
      }
      return [...imports].join('\n') + '\n' + body;
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(GAME_DIR)) {
        const mod = server.moduleGraph.getModuleById('\0' + ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  root: resolve(root, 'src'),
  publicDir: false,
  resolve: { alias: { '@data': resolve(root, 'src/data'), '@src': resolve(root, 'src'), '@assets': resolve(root, 'assets') } },
  plugins: [gameParts(), viteSingleFile()],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 50_000,
    target: 'es2022',
  },
  server: { port: 5173, open: false, fs: { allow: [root] } },
});

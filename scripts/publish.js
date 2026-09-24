// Copia el joc compilat (un sol fitxer) a l'arrel del repositori: index.html
import { copyFileSync, statSync } from 'node:fs';
copyFileSync('dist/index.html', 'index.html');
const kb = (statSync('index.html').size / 1024).toFixed(0);
console.log(`✔ index.html actualitzat (${kb} KB) — obre'l directament al navegador per jugar`);

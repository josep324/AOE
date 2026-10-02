/* =====================================================================
   ESTIL DE CADA CIVILITZACIÓ
   Les vuit civilitzacions comparteixen tres arquitectures (09b–09d); aquí cadascuna hi posa els seus
   materials (pissarra britona, teula i pedra ocre catalanes, maó i plom bizantins, feltre mongol, teula
   vidrada i laca xineses…), el seu emblema als estendards i, quan cal, edificis propis (09f: iurtes
   mongoles i una Meravella per a cada civilització).
   ===================================================================== */

/* ---------- Textures noves ---------- */
Object.assign(KIT_TEX, {
  limestone: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#9a917e', bases: ['#d8d0bc', '#cfc6b0', '#e2dbc8', '#c6bca4'], hMin: 26, hMax: 38, wMin: 40, wMax: 76, round: 3, grit: ['#b3a993', '#ece6d6'],
  })),
  ochrestone: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#7a5c38', bases: ['#c9a066', '#bf9358', '#d4ac74', '#b88a50'], hMin: 24, hMax: 34, wMin: 40, wMax: 74, round: 2, grit: ['#9c7646', '#e0bc88'],
  })),
  ochreplaster: canvasTexture(256, (g, s) => {
    g.fillStyle = '#d6ae78'; g.fillRect(0, 0, s, s);
    speckle(g, s, 90, ['#c99e66', '#e2bf8c', '#b88c56'], 10, 38, 0.25);
    speckle(g, s, 900, ['#a07a48', '#ecd0a2'], 0.6, 2, 0.35);
  }),
  slate: canvasTexture(256, (g, s) => {
    // Pissarra: lloses rectangulars a portell, gris blavós
    const rows = 8, rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const n = 6, w = s / n, off = (r % 2) * w / 2;
      for (let i = -1; i <= n; i++) {
        g.fillStyle = shade('#4a525c', kr(0.82, 1.12));
        g.fillRect(i * w + off + 1, r * rh + 1, w - 2, rh - 1);
        g.fillStyle = 'rgba(180,190,200,0.18)'; g.fillRect(i * w + off + 2, r * rh + 2, w - 4, 2);
      }
      g.fillStyle = 'rgba(10,12,16,0.6)'; g.fillRect(0, r * rh + rh - 3, s, 3);
    }
    speckle(g, s, 500, ['#363c44', '#6a737e'], 0.6, 1.6, 0.35);
  }),
  brick: canvasTexture(256, (g, s) => {
    // Maó bizantí: filades primes de maó vermell amb morter gruixut i una franja de pedra
    g.fillStyle = '#b8a888'; g.fillRect(0, 0, s, s);
    const rh = 16;
    for (let r = 0; r < s / rh; r++) {
      const stone = r % 6 === 5, w = stone ? 64 : 34, off = (r % 2) * w / 2;
      for (let x = -w; x < s + w; x += w) {
        g.fillStyle = stone ? shade('#cfc2a4', kr(0.9, 1.06)) : shade('#9a4a2c', kr(0.82, 1.15));
        g.fillRect(x + off + 2, r * rh + 4, w - 4, rh - 7);
      }
    }
    speckle(g, s, 600, ['#6e3a24', '#c98a64'], 0.6, 1.6, 0.3);
  }),
  lead: canvasTexture(128, (g, s) => {
    // Plom de les cúpules: gris mat amb juntes verticals
    g.fillStyle = '#7c8288'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = shade('#7c8288', kr(0.88, 1.1)); g.fillRect(i * s / 8, 0, s / 8, s);
      g.fillStyle = 'rgba(30,34,38,0.55)'; g.fillRect(i * s / 8, 0, 2, s);
    }
    speckle(g, s, 300, ['#5c6268', '#a4aab0'], 0.6, 1.4, 0.3);
  }),
  mudbrick: canvasTexture(256, (g, s) => masonry(g, s, {
    mortar: '#5a4230', bases: ['#8a6444', '#7e5a3c', '#966e4c', '#73523a'], hMin: 18, hMax: 22, wMin: 36, wMax: 46, round: 2, grit: ['#5e4430', '#b08a64'],
  })),
  felt: canvasTexture(128, (g, s) => {
    // Feltre de iurta: blanc trencat, costures i cordes
    g.fillStyle = '#e6dcc4'; g.fillRect(0, 0, s, s);
    speckle(g, s, 60, ['#d8cdb2', '#efe7d4'], 8, 26, 0.35);
    g.strokeStyle = 'rgba(120,100,70,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, i * s / 4 + 10); g.lineTo(s, i * s / 4 + 10); g.stroke(); }
    speckle(g, s, 400, ['#c4b898', '#f4eee0'], 0.5, 1.4, 0.3);
  }),
  glazed: canvasTexture(256, (g, s) => {
    // Teula vidrada xinesa: canals verds amb reflex groguenc
    const n = 8, cw = s / n;
    for (let i = 0; i < n; i++) {
      const grd = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      grd.addColorStop(0, '#16341b'); grd.addColorStop(0.4, '#2f5e2c'); grd.addColorStop(0.6, '#5a7a34'); grd.addColorStop(1, '#122c17');
      g.fillStyle = grd; g.fillRect(i * cw, 0, cw, s);
    }
    for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(10,25,12,0.55)'; g.fillRect(0, k * s / 8, s, 3); }
    speckle(g, s, 300, ['#2e5a30', '#b8c868'], 0.6, 1.5, 0.3);
  }),
  redlacquer: canvasTexture(128, (g, s) => woodGrain(g, s, '#8a2016', '#6a160e', '#a8301f', 40)),
});
Object.assign(KIT_TILE, { limestone: 1.6, ochrestone: 1.6, ochreplaster: 2.2, slate: 1.4, brick: 1.4, lead: 1.2, mudbrick: 1.4, felt: 1.6, glazed: 1.4, redlacquer: 1.2 });
Object.assign(BUMPY, { limestone: 2, ochrestone: 2, slate: 1.6, brick: 1.8, mudbrick: 1.6, glazed: 1.6, lead: 0.6 });

/* ---------- Materials de cada civilització (material de l'arquitectura → el propi) ---------- */
const CIV_MATS = {
  franks: { stone: 'limestone' },                                                  // pedra calcària clara i palla
  britons: { thatch: 'slate', stone: 'granite', timber: 'darkwood', plaster: 'whiteplaster' },   // pissarra i entramat negre i blanc
  catalans: { thatch: 'clay', stone: 'ochrestone', plaster: 'ochreplaster' },      // teula àrab i gòtic de pedra ocre
  saracens: {},
  byzantines: { sandstone: 'brick', adobe: 'whiteplaster', tile: 'lead' },        // maó, arrebossat blanc i cúpules de plom
  mongols: { sandstone: 'mudbrick', adobe: 'felt', tile: 'felt' },                 // maó de fang i feltre
  japanese: {},
  chinese: { kawara: 'glazed', darkwood: 'redlacquer', darkplanks: 'redlacquer' }, // teula vidrada i fusta lacada
};

/* ---------- Emblemes (als estendards, banderes i gallardets) ---------- */
const EMBLEM_DRAW = {
  franks(g, s) {
    // Flor de lis daurada
    g.fillStyle = '#e8c25a';
    g.beginPath(); g.moveTo(s * 0.5, s * 0.08); g.quadraticCurveTo(s * 0.68, s * 0.32, s * 0.5, s * 0.62); g.quadraticCurveTo(s * 0.32, s * 0.32, s * 0.5, s * 0.08); g.fill();
    for (const d of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 0.5, s * 0.6);
      g.bezierCurveTo(s * (0.5 + d * 0.42), s * 0.62, s * (0.5 + d * 0.42), s * 0.22, s * (0.5 + d * 0.3), s * 0.34);
      g.bezierCurveTo(s * (0.5 + d * 0.24), s * 0.46, s * (0.5 + d * 0.12), s * 0.5, s * 0.5, s * 0.66); g.fill();
    }
    g.fillRect(s * 0.3, s * 0.6, s * 0.4, s * 0.08);
    g.beginPath(); g.moveTo(s * 0.44, s * 0.68); g.lineTo(s * 0.5, s * 0.92); g.lineTo(s * 0.56, s * 0.68); g.fill();
  },
  britons(g, s) {
    // Rosa: cinc pètals blancs i botó daurat
    g.fillStyle = '#f2ece0';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(s * 0.5 + Math.cos(a) * s * 0.2, s * 0.5 + Math.sin(a) * s * 0.2, s * 0.18, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c8302a'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8c25a'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.08, 0, Math.PI * 2); g.fill();
  },
  catalans(g, s) {
    // Senyal reial: escut d'or amb quatre pals vermells
    g.fillStyle = '#e8c040';
    g.beginPath(); g.moveTo(s * 0.18, s * 0.1); g.lineTo(s * 0.82, s * 0.1); g.lineTo(s * 0.82, s * 0.6); g.quadraticCurveTo(s * 0.82, s * 0.86, s * 0.5, s * 0.94); g.quadraticCurveTo(s * 0.18, s * 0.86, s * 0.18, s * 0.6); g.closePath(); g.fill();
    g.save(); g.clip();
    g.fillStyle = '#c42a1e';
    for (let i = 0; i < 4; i++) g.fillRect(s * (0.18 + 0.64 * (2 * i + 1) / 9), 0, s * 0.64 / 9, s);
    g.restore();
  },
  saracens(g, s) {
    // Mitja lluna i estel
    g.fillStyle = '#f2ece0';
    g.beginPath(); g.arc(s * 0.45, s * 0.5, s * 0.32, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(s * 0.56, s * 0.46, s * 0.27, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.05 : s * 0.12; g.lineTo(s * 0.68 + Math.cos(a) * r, s * 0.5 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  },
  byzantines(g, s) {
    // Creu patent daurada dins d'un cercle
    g.strokeStyle = '#e8c25a'; g.lineWidth = s * 0.06;
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.4, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e8c25a';
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(s * 0.5, s * 0.5); g.rotate(i * Math.PI / 2);
      g.beginPath(); g.moveTo(-s * 0.06, 0); g.lineTo(-s * 0.15, -s * 0.32); g.lineTo(s * 0.15, -s * 0.32); g.lineTo(s * 0.06, 0); g.fill();
      g.restore();
    }
  },
  mongols(g, s) {
    // Flama, sol i lluna (símbol de l'estepa)
    g.fillStyle = '#f2ece0';
    g.beginPath(); g.moveTo(s * 0.5, s * 0.06); g.quadraticCurveTo(s * 0.64, s * 0.2, s * 0.5, s * 0.3); g.quadraticCurveTo(s * 0.36, s * 0.2, s * 0.5, s * 0.06); g.fill();
    g.beginPath(); g.arc(s * 0.5, s * 0.44, s * 0.1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.5, s * 0.62, s * 0.16, 0, Math.PI); g.fill();
    g.fillRect(s * 0.3, s * 0.82, s * 0.4, s * 0.06);
    for (const d of [-1, 1]) g.fillRect(s * (0.5 + d * 0.3) - s * 0.03, s * 0.36, s * 0.06, s * 0.52);
  },
  japanese(g, s) {
    // Mon de tres comes (mitsudomoe) dins d'un anell
    g.strokeStyle = '#f2ece0'; g.lineWidth = s * 0.05;
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.4, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f2ece0';
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const cx = s * 0.5 + Math.cos(a) * s * 0.14, cy = s * 0.5 + Math.sin(a) * s * 0.14;
      g.beginPath(); g.arc(cx, cy, s * 0.11, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx + Math.cos(a + 1.6) * s * 0.11, cy + Math.sin(a + 1.6) * s * 0.11);
      g.quadraticCurveTo(s * 0.5 + Math.cos(a + 1.2) * s * 0.34, s * 0.5 + Math.sin(a + 1.2) * s * 0.34, s * 0.5 + Math.cos(a + 2.2) * s * 0.3, s * 0.5 + Math.sin(a + 2.2) * s * 0.3);
      g.lineTo(cx + Math.cos(a - 1.6) * s * 0.11, cy + Math.sin(a - 1.6) * s * 0.11); g.fill();
    }
  },
  chinese(g, s) {
    // Moneda daurada amb forat quadrat i quatre marques
    g.fillStyle = '#e8c25a';
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.4, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(s * 0.4, s * 0.4, s * 0.2, s * 0.2);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.fillRect(s * 0.5 + Math.cos(a) * s * 0.27 - s * 0.045, s * 0.5 + Math.sin(a) * s * 0.27 - s * 0.045, s * 0.09, s * 0.09); }
    g.globalCompositeOperation = 'source-over';
  },
};
const emblemMats = new Map();
function emblemMat(civ) {
  if (!emblemMats.has(civ)) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 3;
    (EMBLEM_DRAW[civ] || (() => {}))(g, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    emblemMats.set(civ, fogify(new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.8, side: THREE.DoubleSide, depthWrite: true })));
  }
  return emblemMats.get(civ);
}
/* Emblema de la civilització de l'edifici que es construeix (pla quadrat a les dues cares d'una tela) */
function kEmblem(g, x, y, z, size) {
  if (!KIT_CIV || !EMBLEM_DRAW[KIT_CIV]) return;
  const m = emblemMat(KIT_CIV);
  for (const sz of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
    p.position.set(x, y, sz * z);
    if (sz < 0) p.rotation.y = Math.PI;
    g.add(p);
  }
}

/* Edificis propis d'una civilització (sobre els de la seva arquitectura): CIV_BUILDERS[civ][tipus] (09f) */
const CIV_BUILDERS = {};

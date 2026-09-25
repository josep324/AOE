/* Dificultats de la IA (com a l'AoE II: les dificultats no fan trampes; només «Extrem» té avantatge)
   villagers: aldeans objectiu · tcs: Centres de Ciutat · think: segons entre decisions · micro: 0 cap, 1 retira ferits,
   2 també fa kiting i concentra el foc · counter: com s'adapta al teu exèrcit (0-1) · raids: incursions contra aldeans ·
   scout: explora · attackAt: primer atac (s) · attackBase: mida mínima de l'exèrcit per atacar · prodMax: edificis
   militars de cada tipus · towers: torres de defensa · bonusRes / gather: avantatge (només Extrem) */
export const DIFFICULTY = {
  easy:    { label: 'Fàcil',   villagers: 35,  tcs: 1, think: 1.5, micro: 0, counter: 0.2, raids: false, scout: false, attackAt: 900, attackBase: 6,  prodMax: 1, towers: 0, bonusRes: 0,   gather: 1 },
  normal:  { label: 'Normal',  villagers: 70,  tcs: 2, think: 1.0, micro: 1, counter: 0.6, raids: true,  scout: true,  attackAt: 600, attackBase: 8,  prodMax: 2, towers: 1, bonusRes: 0,   gather: 1 },
  hard:    { label: 'Difícil', villagers: 100, tcs: 3, think: 0.5, micro: 2, counter: 1,   raids: true,  scout: true,  attackAt: 450, attackBase: 10, prodMax: 3, towers: 2, bonusRes: 0,   gather: 1 },
  extreme: { label: 'Extrem',  villagers: 120, tcs: 3, think: 0.5, micro: 2, counter: 1,   raids: true,  scout: true,  attackAt: 400, attackBase: 12, prodMax: 4, towers: 2, bonusRes: 200, gather: 1.15 },
};

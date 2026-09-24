/* Dificultats de la IA: aldeans objectiu, temps del primer atac i entre atacs, mida de les onades, bonificacions */
export const DIFFICULTY = {
  easy:   { label: 'Fàcil',   villagers: 12, firstWave: 420, interval: 210, waveBase: 3, bonusRes: 0,   gather: 0.85, maxBarracks: 1 },
  normal: { label: 'Normal',  villagers: 17, firstWave: 300, interval: 170, waveBase: 4, bonusRes: 100, gather: 1.0,  maxBarracks: 1 },
  hard:   { label: 'Difícil', villagers: 22, firstWave: 210, interval: 130, waveBase: 5, bonusRes: 300, gather: 1.25, maxBarracks: 2 },
};

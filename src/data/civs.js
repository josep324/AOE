/* Civilitzacions: arquitectura i aspecte de les unitats (arch), i bonificacions pròpies (mods) */
export const CIVS = {
  franks: {
    name: 'Francs', icon: '⚜️', arch: 'western',
    desc: 'Europa occidental: entramat de fusta, palla i pedra.',
    bonuses: ['Cavalleria +20% de vida', 'Recollida de baies +15%'],
    mods: { hpMul: { cavalry: 1.2 }, gather: { berries: 1.15 } },
  },
  saracens: {
    name: 'Sarraïns', icon: '🌙', arch: 'middleeast',
    desc: 'Orient Mitjà: tova i pedra arenisca, terrats, arcs i cúpules.',
    bonuses: ['Arquers +2 d\'atac contra edificis', 'Els carros de comerç guanyen +20% d\'or'],
    mods: { vsBuilding: { archer: 2 }, tradeMul: 1.2 },
  },
  japanese: {
    name: 'Japonesos', icon: '⛩️', arch: 'eastasian',
    desc: 'Àsia oriental: fusta fosca, parets blanques i teulades corbes de teula.',
    bonuses: ['La infanteria ataca un 25% més de pressa', 'Tala de fusta +10%'],
    mods: { reloadMul: { infantry: 0.75 }, gather: { tree: 1.1 } },
  },
};

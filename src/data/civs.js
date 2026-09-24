/* Civilitzacions: arquitectura i aspecte de les unitats (arch), unitat única del Castell (unique),
   bonificacions pròpies (bonuses: text; mods: efecte al joc; cost: multiplicador o descompte per edifici/tecnologia) */
export const CIVS = {
  franks: {
    name: 'Francs', icon: '⚜️', arch: 'western', unique: 'throwingaxe',
    desc: 'Europa occidental: entramat de fusta, palla i pedra. Civilització de cavalleria.',
    bonuses: ['Castells un 25% més barats', 'Cavalleria +20% de vida', 'Recollida de baies +15%', 'Collar de cavall gratuït'],
    mods: { hpMul: { cavalry: 1.2 }, gather: { berries: 1.15 }, cost: { castle: 0.75, horsecollar: 0 } },
  },
  saracens: {
    name: 'Sarraïns', icon: '🌙', arch: 'middleeast', unique: 'mameluke',
    desc: 'Orient Mitjà: tova i pedra arenisca, terrats, arcs i cúpules. Civilització de camells i arquers.',
    bonuses: ['Arquers +2 d\'atac contra edificis', 'Els carros de comerç guanyen +20% d\'or', 'El Mercat costa 75 de fusta menys', 'Els mercaders cobren menys comissió'],
    mods: { vsBuilding: { archer: 2 }, tradeMul: 1.2, marketFee: 0.85, cost: { market: { wood: -75 } } },
  },
  japanese: {
    name: 'Japonesos', icon: '⛩️', arch: 'eastasian', unique: 'samurai',
    desc: 'Àsia oriental: fusta fosca, parets blanques i teulades corbes de teula. Civilització d\'infanteria.',
    bonuses: ['La infanteria ataca un 25% més de pressa', 'Serradora, Molí i Campament miner a meitat de preu', 'Tala de fusta +10%', 'Torres amb +2 de visió'],
    mods: { reloadMul: { infantry: 0.75 }, gather: { tree: 1.1 }, towerLos: 2, cost: { lumbercamp: 0.5, mill: 0.5, miningcamp: 0.5 } },
  },
};

/* Civilitzacions: arquitectura i aspecte de les unitats (arch), unitat única del Castell (unique),
   bonificacions pròpies (bonuses: text; mods: efecte al joc; cost: multiplicador o descompte per edifici/tecnologia)
   i arbre tecnològic (disabled: unitats —tota la línia— i tecnologies que aquesta civilització no té, com a l'AoE II) */
export const CIVS = {
  franks: {
    name: 'Francs', icon: '⚜️', arch: 'western', unique: 'throwingaxe',
    desc: 'Europa occidental: entramat de fusta, palla i pedra. Civilització de cavalleria.',
    bonuses: ['Castells un 25% més barats', 'Cavalleria +20% de vida', 'Recollida de baies +15%', 'Collar de cavall gratuït'],
    mods: { hpMul: { cavalry: 1.2 }, gather: { berries: 1.15 }, cost: { castle: 0.75, horsecollar: 0 } },
    disabled: ['camel', 'thumbring', 'parthian'],
  },
  saracens: {
    name: 'Sarraïns', icon: '🌙', arch: 'middleeast', unique: 'mameluke',
    desc: 'Orient Mitjà: tova i pedra arenisca, terrats, arcs i cúpules. Civilització de camells i arquers.',
    bonuses: ['Arquers +2 d\'atac contra edificis', 'Els carros de comerç guanyen +20% d\'or', 'El Mercat costa 75 de fusta menys', 'Els mercaders cobren menys comissió'],
    mods: { vsBuilding: { archer: 2 }, tradeMul: 1.2, marketFee: 0.85, cost: { market: { wood: -75 } } },
    disabled: [],
  },
  japanese: {
    name: 'Japonesos', icon: '⛩️', arch: 'eastasian', unique: 'samurai',
    desc: 'Àsia oriental: fusta fosca, parets blanques i teulades corbes de teula. Civilització d\'infanteria.',
    bonuses: ['La infanteria ataca un 25% més de pressa', 'Serradora, Molí i Campament miner a meitat de preu', 'Tala de fusta +10%', 'Torres amb +2 de visió'],
    mods: { reloadMul: { infantry: 0.75 }, gather: { tree: 1.1 }, towerLos: 2, cost: { lumbercamp: 0.5, mill: 0.5, miningcamp: 0.5 } },
    disabled: ['camel', 'hussar', 'paladin', 'bombard'],
  },
  britons: {
    name: 'Britons', icon: '🏹', arch: 'western', unique: 'longbowman',
    desc: 'Illes Britàniques: pedra, entramat i palla. Civilització d\'arquers.',
    bonuses: ['Arquers a peu +1 casella d\'abast a Castells i +1 a Imperial', 'Galeria de tir un 20% més ràpida', 'Pastors +25%', 'Centre de Ciutat a meitat de fusta'],
    mods: { gather: { sheep: 1.25 }, trainAt: { archeryrange: 1.2 }, ageRange: { archer: [0, 0, 1, 2], longbowman: [0, 0, 1, 2] },
            cost: { towncenter: { wood: -137 } } },
    disabled: ['camel', 'parthian', 'handcannon'],
  },
  byzantines: {
    name: 'Bizantins', icon: '☦️', arch: 'middleeast', unique: 'cataphract',
    desc: 'Imperi Romà d\'Orient: pedra, maó, arcs i cúpules. Civilització defensiva.',
    bonuses: ['Edificis +20% de vida', 'Llancers, escaramussadors i camells un 25% més barats', 'Edat Imperial un 33% més barata', 'Guàrdia urbana gratuïta'],
    mods: { buildingHpMul: 1.2, cost: { spearman: 0.75, skirmisher: 0.75, camel: 0.75, age3: 0.67, townwatch: 0 } },
    disabled: [],
  },
  mongols: {
    name: 'Mongols', icon: '🐎', arch: 'middleeast', unique: 'mangudai',
    desc: 'Estepa d\'Àsia central: iurtes, fusta i feltre. Civilització d\'arquers a cavall.',
    bonuses: ['Arquers a cavall disparen un 25% més ràpid', 'Genets lleugers +30% de vida', 'Caçadors +40%', 'Exploradors +2 de visió'],
    mods: { lineReloadMul: { cavarcher: 0.8, mangudai: 0.8 }, lineHpMul: { scout: 1.3 }, gather: { deer: 1.4, boar: 1.4 }, lineLos: { scout: 2 } },
    disabled: ['paladin'],
  },
  chinese: {
    name: 'Xinesos', icon: '🏮', arch: 'eastasian', unique: 'chukonu',
    desc: 'Xina: fusta lacada, teula i pagodes. Civilització versàtil amb molts aldeans.',
    bonuses: ['Comencen amb 3 aldeans més (però −200 d\'aliment i −50 de fusta)', 'Tecnologies un 15% més barates', 'El Centre de Ciutat dona +10 de població', 'Vaixells de demolició +50% de vida'],
    mods: { techCost: 0.85, tcPop: 10, lineHpMul: { demoship: 1.5 }, start: { villagers: 3, res: { food: -200, wood: -50 } } },
    disabled: ['hussar'],
  },
  catalans: {
    name: 'Catalans', icon: '⚓', arch: 'western', unique: 'almogaver',
    desc: 'Corona d\'Aragó: gòtic català, pedra i drassanes. Almogàvers i flota mediterrània.',
    bonuses: ['Infanteria +10% de velocitat', 'Vaixells +15% de vida', 'Granges +15%', 'Mercat i Moll un 25% més barats'],
    mods: { speedMul: { infantry: 1.1 }, hpMul: { ship: 1.15 }, gather: { farm: 1.15 }, cost: { market: 0.75, dock: 0.75 } },
    disabled: ['camel', 'parthian'],
  },
};

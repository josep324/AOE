/* Ritme de l'AoE II DE. Els valors són els del joc original: temps en segons de joc i velocitats en caselles
   per segon. A la velocitat Normal de l'AoE II DE passen 1,7 segons de joc per cada segon real; aquí es
   converteixen a segons reals i metres (una casella = 2,15 m). */
export const GAME_TEMPO = 1.7;

// unitat: [temps d'entrenament (s de joc), velocitat (caselles/s)]
export const AOE_UNITS = {
  villager: [25, 0.8],
  militia: [21, 0.9], manatarms: [21, 0.9], longsword: [21, 0.9], twohanded: [21, 0.9], champion: [21, 0.9],
  spearman: [22, 1.0], pikeman: [22, 1.0], halberdier: [22, 1.0],
  archer: [35, 0.96], crossbow: [27, 0.96], arbalester: [27, 0.96],
  skirmisher: [22, 0.96], eliteskirm: [22, 0.96], handcannon: [34, 0.96],
  cavarcher: [34, 1.4], heavycavarcher: [27, 1.4],
  scout: [30, 1.2], lightcav: [30, 1.5], hussar: [30, 1.5],
  knight: [30, 1.35], cavalier: [30, 1.35], paladin: [30, 1.35],
  camel: [22, 1.45], heavycamel: [22, 1.45],
  ram: [36, 0.5], cappedram: [36, 0.5], siegeram: [36, 0.6],
  mangonel: [46, 0.6], onager: [46, 0.6], scorpion: [30, 0.65], heavyscorpion: [30, 0.65],
  bombard: [56, 0.7], trebuchet: [50, 0.8], petard: [25, 0.8],
  throwingaxe: [17, 1.0], mameluke: [23, 1.4], samurai: [9, 1.0], longbowman: [19, 0.96], cataphract: [20, 1.35],
  mangudai: [26, 1.45], chukonu: [19, 0.96], almogaver: [21, 1.05],
  fishingship: [40, 1.26], transport: [45, 1.45], galley: [60, 1.43], wargalley: [36, 1.43], galleon: [36, 1.43],
  fireship: [65, 1.35], fastfireship: [65, 1.43], demoship: [31, 1.6], heavydemo: [31, 1.6],
  cannongalleon: [46, 1.1], elitecannongalleon: [46, 1.1],
  monk: [51, 0.7], tradecart: [51, 1.0], king: [0, 0.8],
};

// tecnologia: temps d'investigació (s de joc)
export const AOE_TECHS = {
  age1: 130, age2: 160, age3: 190,
  loom: 25, wheelbarrow: 75, handcart: 55,
  doublebit: 25, bowsaw: 50, twomansaw: 100,
  horsecollar: 20, heavyplow: 40, croprotation: 70,
  goldmining: 30, goldshaft: 75, stoneshaft: 75,
  forging: 50, ironcasting: 75, blastfurnace: 100,
  scalearmor: 40, chainmail: 55, platemail: 70,
  fletching: 30, bodkin: 35, bracer: 40,
  paddedarcher: 40, leatherarcher: 55, ringarcher: 70,
};

// ritme de recol·lecció dels aldeans (recurs per segon de joc)
export const AOE_GATHER = {
  tree: 0.39, gold: 0.38, stone: 0.36, berries: 0.31, sheep: 0.33, farm: 0.32,
  deer: 0.41, boar: 0.41, fish: 0.43, deepfish: 0.35,   // (vaixell pesquer: ×1,4 → 0,49)
};

// Or i pedra (com a l'AoE II: una veta principal de 7 caselles d'or, dues de 4, i pedra de 5 i 4)
export const MINES = { goldMain: 5600, gold: 3200, stoneMain: 1750, stone: 1400 };

/* Unitats: cost, temps d'entrenament i estadístiques.
   armor = [cos a cos, projectils]; range 0 = cos a cos; age = edat mínima (0 Fosca, 1 Feudal, 2 Castells) */
export const UNITS = {
  villager: { name: 'Aldeà', icon: '🧑‍🌾', cost: { food: 50 }, time: 12, hp: 25, attack: 3, range: 0, reload: 2.0,
              armor: [0, 0], speed: 5.5, los: 10, cat: 'villager', age: 0 },
  militia:  { name: 'Milícia', icon: '🗡️', cost: { food: 60, gold: 20 }, time: 14, hp: 45, attack: 5, range: 0, reload: 2.0,
              armor: [1, 1], speed: 5.2, los: 11, vsBuilding: 2, cat: 'infantry', age: 0, desc: 'Infanteria resistent. Bona contra edificis' },
  spearman: { name: 'Llancer', icon: '🔱', cost: { food: 35, wood: 25 }, time: 12, hp: 45, attack: 3, range: 0, reach: 1.1, reload: 2.4,
              armor: [0, 0], speed: 5.4, los: 11, bonusCav: 12, cat: 'infantry', age: 1, desc: 'Barat i sense or. +12 de dany contra cavalleria' },
  archer:   { name: 'Arquer', icon: '🏹', cost: { wood: 25, gold: 45 }, time: 16, hp: 30, attack: 4, range: 12, reload: 2.0,
              armor: [0, 0], speed: 5.6, los: 14, cat: 'archer', age: 1, desc: 'Ataca a distància' },
  scout:    { name: 'Explorador', icon: '🐎', cost: { food: 80 }, time: 18, hp: 45, attack: 3, range: 0, reach: 0.6, reload: 2.0,
              armor: [0, 2], speed: 8.6, los: 18, cat: 'cavalry', age: 1, desc: 'Cavalleria ràpida amb molta visió' },
  tradecart: { name: 'Carro de comerç', icon: '🐂', cost: { wood: 100, food: 50 }, time: 25, hp: 70, attack: 0, range: 0, reload: 2.0,
              armor: [0, 1], speed: 5.0, los: 8, cat: 'trade', age: 1, desc: 'Viatja entre dos mercats teus i hi guanya or (més com més lluny)' },
  knight:   { name: 'Cavaller', icon: '🏇', cost: { food: 60, gold: 75 }, time: 28, hp: 100, attack: 10, range: 0, reach: 0.6, reload: 1.8,
              armor: [2, 2], speed: 7.4, los: 12, cat: 'cavalry', age: 2, desc: 'Cavalleria pesant molt poderosa' },
};

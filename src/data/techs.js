/* Tecnologies: s'investiguen a la cua de l'edifici indicat a «at» */
export const TECHS = {
  age1:        { name: 'Edat Feudal', icon: '🏯', cost: { food: 500 }, time: 40, age: 0, at: 'towncenter', ageUp: 1,
                 desc: 'Nous edificis, unitats i tecnologies. Cal tenir 2 edificis: Caserna, Molí, Serradora o Campament miner' },
  age2:        { name: 'Edat dels Castells', icon: '🏰', cost: { food: 800, gold: 200 }, time: 60, age: 1, at: 'towncenter', ageUp: 2,
                 desc: 'Cavallers i millores. Cal tenir 2 edificis: Ferreria, Estable, Torre de guaita o Mercat' },
  loom:        { name: 'Teler', icon: '🧶', cost: { gold: 50 }, time: 15, age: 0, at: 'towncenter', desc: 'Aldeans: +15 vida, +1/+2 armadura' },
  wheelbarrow: { name: 'Carretó', icon: '🛒', cost: { food: 175, wood: 50 }, time: 30, age: 1, at: 'towncenter', desc: 'Aldeans: +10% velocitat, +3 de càrrega' },
  doublebit:   { name: 'Destral de doble fil', icon: '🪓', cost: { food: 100, wood: 50 }, time: 20, age: 1, at: 'lumbercamp', desc: '+20% de ritme tallant fusta' },
  goldmining:  { name: "Mineria d'or", icon: '⛏️', cost: { food: 100, wood: 75 }, time: 20, age: 1, at: 'miningcamp', desc: "+15% de ritme extraient or i pedra" },
  reseed:      { name: 'Resembra automàtica', icon: '🔁', cost: { wood: 100, food: 50 }, time: 20, age: 0, at: 'mill',
                 desc: "Quan una granja s'esgota, el granger la torna a sembrar sol (paga 60 de fusta)" },
  horsecollar: { name: 'Collar de cavall', icon: '🐴', cost: { food: 75, wood: 75 }, time: 20, age: 1, at: 'mill', desc: "Les granges noves donen +75 d'aliment" },
  forging:     { name: 'Forja', icon: '🔨', cost: { food: 150 }, time: 25, age: 1, at: 'blacksmith', desc: 'Infanteria i cavalleria: +1 atac' },
  fletching:   { name: 'Plomes', icon: '🪶', cost: { food: 100, wood: 50 }, time: 20, age: 1, at: 'blacksmith', desc: 'Arquers: +1 atac i +1 abast. Torres i Centre: +1 atac' },
  scalearmor:  { name: "Armadura d'escates", icon: '🛡️', cost: { food: 100 }, time: 25, age: 1, at: 'blacksmith', desc: 'Infanteria: +1/+1 armadura' },
  barding:     { name: 'Bardissa', icon: '🐴', cost: { food: 150 }, time: 30, age: 2, at: 'blacksmith', desc: 'Cavalleria: +1/+1 armadura' },
};

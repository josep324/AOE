# Imperis 3D

Joc d'estratègia en temps real a l'estil **Age of Empires II**, fet amb [Three.js](https://threejs.org), que s'executa al navegador.

## Jugar

Obre **`index.html`** directament al navegador (doble clic). És un sol fitxer autònom: no cal Internet ni instal·lar res.

Civilitzacions disponibles (es trien al menú d'inici), cadascuna amb arquitectura, vestits i dues bonificacions pròpies:

| Civilització | Estil | Unitat única (Castell) | Bonificacions |
|---|---|---|---|
| ⚜️ Francs | Europa occidental: entramat de fusta, palla i pedra | Llançador de destrals | Castells −25% · Cavalleria +20% vida · Baies +15% · Collar de cavall gratuït · *Destral barbuda* |
| 🌙 Sarraïns | Orient Mitjà: tova, arenisca, terrats, arcs i cúpules | Mameluc (camell) | Arquers +2 contra edificis · Comerç +20% · Mercat −75 fusta · Menys comissió · *Zelotisme* |
| ⛩️ Japonesos | Àsia oriental: fusta fosca, parets blanques, teulades corbes | Samurai | Infanteria +25% velocitat d'atac · Magatzems a meitat de preu · Fusta +10% · Torres +2 visió · *Yasama* |

Edats: Fosca → Feudal → Castells → **Imperial**. Línies completes d'unitats que es milloren (i converteixen les existents):
Milícia → Home d'armes → Espadatxí → Dues mans → Campió · Llancer → Piquer → Alabarder · Arquer → Ballester → Arbalester ·
Escaramussador (d'elit) · Arquer a cavall (pesant) · Explorador → Genet lleuger → Hússar · Cavaller → Cavaller pesant → Paladí ·
Genet de camell (pesant) · Ariet → reforçat → de setge · Mangonell → Onagre · Escorpí pesant · Canó bombarda (amb Química).
Edificis nous: **Galeria de tir** i **Universitat** (Maçoneria, Arquitectura, Química, Grua de roda, Torre de guàrdia → Torrassa, Enginyers de setge).

Setge i fortificacions (Edat dels Castells): **Castell** (fletxes, refugi per a 20 unitats, unitat única i trabucs) i **Taller de setge**
(Ariet, Mangonell amb dany en àrea i atac al terra, Escorpí amb virots que travessen). El Trabuc s'ha de muntar per disparar.

## Desenvolupar

Cal [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install        # un sol cop
npm run dev        # servidor local amb recàrrega automàtica: http://localhost:5173
npm run build      # genera el fitxer únic i actualitza index.html de l'arrel
```

## Estructura

```
src/
  index.html        pàgina (HUD, menús)
  styles.css        estils de la interfície
  main.js           punt d'entrada
  data/             dades del joc: civilitzacions, unitats, edificis, tecnologies, edats, tecles, dificultats
  game/             codi del joc, un fitxer per sistema, en ordre:
    00-config        configuració i estat global
    01…06            render, càmera, llum, materials, terreny pintat, indicadors de selecció
    07…08a           entitats, biblioteca de models .glb, recursos i models de la natura
    09…09d           edificis: kit comú (textures, teulades, cúpules…) i arquitectura de cada regió
    10…12            col·locació, unitats (esquelet i vestits per regió), decoració
    13 navegació     graella, A*, portes per equip
    14 món           generació simètrica del mapa
    15…20            selecció, ordres, entrenament, física i màquina d'estats de les unitats
    21 IA            economia, edats, exèrcit i atacs de l'enemic
    22…24            boira de guerra, combat, efectes
    25…30            HUD, entrada, minimapa, barres de vida, flux de partida, desar/carregar
    31 bucle         simulació a pas fix (60 passos/s) i renderitzat
assets/models/      models 3D opcionals (.glb) que substitueixen els generats pel codi
docs/MODELS.md      on trobar models gratuïts i com afegir-los
scripts/publish.js  copia el fitxer compilat a index.html
```

Els fitxers de `src/game/` s'uneixen en ordre en un sol mòdul en compilar (vegeu `vite.config.js`).

## Llicència dels recursos

Els models afegits a `assets/models/` han de ser de llicència lliure (CC0 o CC BY). Els que requereixin atribució s'han de citar a `CREDITS.md`.

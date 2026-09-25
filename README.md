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

**Monestir** (Edat dels Castells): els **monjos** curen les unitats pròpies i converteixen les enemigues (amb la fe plena),
i recullen les **relíquies** del mapa: cada relíquia guardada en un Monestir dona +0,5 d'or per segon.
Tecnologies: Redempció (convertir edificis i setge), Expiació (convertir monjos), Fervor, Santedat, Il·luminació, Impremta i Fe.

**Condicions de victòria** (es trien a l'inici):
- 🏆 **Estàndard**: conquesta, o bé mantenir una **Meravella** 5 minuts, o bé tenir **totes les relíquies** 200 segons.
- ⚔️ **Conquesta**: només destruint l'enemic.
- 👑 **Regicidi**: cada bàndol té un rei; si mor, perd.

**Mapes** (es trien a l'inici; cada partida és diferent però justa, simètrica per als dos jugadors):
🏜️ Aràbia (obert) · 🌲 Bosc Negre (boscos tancats amb tres camins) · 🏞️ Llacs (llac central i llacs petits) · 🌊 Rius (un riu parteix el mapa i només es creua pels guals).
**Natura**: cérvols que fugen, senglars que envesteixen (caça'ls amb uns quants aldeans), llops que ataquen i bancs de peixos a la riba.

**Naval** (mapes amb aigua): ⚓ **Moll** a l'aigua fonda tocant a la riba; vaixells pesquers (també peix d'altura),
transport (10 unitats: clic dret sobre el vaixell per embarcar, clic dret a terra per desembarcar), Galera → Galera de guerra → Galió,
Brulot (foc, fort contra vaixells), Vaixell de demolició (explota) i Galió artiller (amb Química). Tecnologies: Xarxes, Carenatge, Dic sec.

**Formacions** (<kbd>F</kbd> o botons): línia (cos a cos al davant i genets a les ales), quadrat (arquers, monjos i setge a dins),
esglaonada (contra pedres i fletxes) i flancs (dos grups). Els grups marxen al pas de la unitat més lenta. No hi ha límit d'unitats seleccionades.

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
    05b aigua        llacs, rius i guals (graella, shader i navegació)
    20a naval        moll, vaixells, pesca, transport i combat a l'aigua
    08b fauna        cérvols, senglars, llops i peixos
    22…24            boira de guerra, combat, setge (23a), monjos i relíquies (23b), efectes
    25…30            HUD, entrada, minimapa, barres de vida, flux de partida, desar/carregar
    31 bucle         simulació a pas fix (60 passos/s) i renderitzat
assets/models/      models 3D opcionals (.glb) que substitueixen els generats pel codi
docs/MODELS.md      on trobar models gratuïts i com afegir-los
scripts/publish.js  copia el fitxer compilat a index.html
```

Els fitxers de `src/game/` s'uneixen en ordre en un sol mòdul en compilar (vegeu `vite.config.js`).

## Llicència dels recursos

Els models afegits a `assets/models/` han de ser de llicència lliure (CC0 o CC BY). Els que requereixin atribució s'han de citar a `CREDITS.md`.

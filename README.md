# Imperis 3D

Joc d'estratègia en temps real a l'estil **Age of Empires II**, fet amb [Three.js](https://threejs.org), que s'executa al navegador.

## Jugar

Obre **`index.html`** directament al navegador (doble clic). És un sol fitxer autònom: no cal Internet ni instal·lar res.

Vuit civilitzacions (es trien al menú d'inici), cadascuna amb arquitectura, vestits, bonificacions, unitat única (amb versió d'elit), tecnologia única i arbre tecnològic propis:

| Civilització | Estil | Unitat única (Castell) | Bonificacions |
|---|---|---|---|
| ⚜️ Francs | Europa occidental: entramat de fusta, palla i pedra | Llançador de destrals | Castells −25% · Cavalleria +20% vida · Baies +15% · Collar de cavall gratuït · *Destral barbuda* |
| 🌙 Sarraïns | Orient Mitjà: tova, arenisca, terrats, arcs i cúpules | Mameluc (camell) | Arquers +2 contra edificis · Comerç +20% · Mercat −75 fusta · Menys comissió · *Zelotisme* |
| ⛩️ Japonesos | Àsia oriental: fusta fosca, parets blanques, teulades corbes | Samurai | Infanteria +25% velocitat d'atac · Magatzems a meitat de preu · Fusta +10% · Torres +2 visió · *Yasama* |
| 🏹 Britons | Europa occidental | Arquer de tir llarg (abast molt llarg) | Arquers a peu +1 casella a Castells i Imperial · Galeria +20% ràpida · Arquers −10% · Pastors +30% · Centre a meitat de fusta · *Yeomen* |
| ☦️ Bizantins | Mediterrània oriental | Catafracta (cavalleria pesant, +9 contra infanteria) | Edificis +20% vida · Llancers, escaramussadors i camells −25% · Imperial −33% · Ferreria −20% i Universitat −25% · Monestir −20% · *Logistica* |
| 🐎 Mongols | Estepa | Mangudai (arquer a cavall ràpid, +3 contra setge) | Arquers a cavall +25% ritme · Genets lleugers +30% vida · Caçadors +40% · Exploradors +2 visió · *Instrucció* |
| 🏮 Xinesos | Àsia oriental | Chu Ko Nu (ballesta de repetició) | +3 aldeans a l'inici · Tecnologies −15% · Centre +10 població · Demolició +50% vida · *Coets* |
| ⚓ Catalans | Europa occidental (gòtic català) | Almogàver (infanteria ràpida que llança azcones, +4 contra cavalleria) | Infanteria +10% velocitat · Vaixells +15% vida · Granges +15% · Mercat i Moll −25% · *Consolat de Mar* i *Venjança Catalana* |

**Equilibri**: comprovat amb tornejos IA contra IA de totes les parelles (`node tests/run.mjs --bench balance`,
56 partides, es pot repartir en processos amb `SHARD=0/4`) i amb combats d'unitats úniques del mateix valor
(`--bench uu`). Al darrer torneig totes queden entre el 36% i el 61% de punts, dins del marge d'error de 14 partides.

Els Catalans no són a l'AoE II: estan dissenyats a partir de la història de la Corona d'Aragó (els almogàvers,
la flota mediterrània i el Consolat de Mar). Els Bizantins i els Mongols fan servir l'arquitectura de l'Orient Mitjà,
i els Britons i els Catalans l'occidental (de moment no hi ha models d'edificis propis per a aquests estils).

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

**Jugadors i equips** (es trien a l'inici, fins a 4 jugadors): 1 contra 1 · 1 contra 2 · 2 contra 2 (amb una IA aliada) ·
1 contra 3 · tots contra tots (3 o 4). Amb més de dos jugadors les bases són a les quatre cantonades i els recursos, els
llacs i els rius giren igual per a totes (el riu separa el nord del sud: en un 2 contra 2, cada equip té el seu costat).
Els aliats comparteixen la visió, no s'ataquen, comercien amb els mercats de l'altre i guanyen o perden junts (també
les relíquies i la Meravella compten per equip). Des del quadre de jugadors (a dalt a la dreta) pots enviar un **tribut**
de 100 d'un recurs a l'aliat (arriba el 80%), i l'aliat IA també t'envia el que li sobra si vas curt. Cada IA rival ataca
el rival que té més a prop (en un 2 contra 2, cadascuna té el seu) i, quan cau, ajuda el seu aliat; l'aliat IA envia
tropes a defensar-te si t'ataquen. Un jugador derrotat o rendit desapareix del mapa i la partida continua.
`node tests/run.mjs --bench teams` juga partides d'equips només amb IA.

**Mapes** (es trien a l'inici; cada partida és diferent però justa):
🏜️ Aràbia (obert) · 🌲 Bosc Negre (boscos tancats amb uns quants camins) · 🏞️ Llacs (llac central i llacs petits) · 🌊 Rius (un riu parteix el mapa i només es creua pels guals).
**Mides** com les de l'AoE II (1 casella ≈ 2,15 m): Minúscul 120×120 · Petit 144×144 · Mitjà 168×168 (per defecte) · Normal 200×200 · Gran 220×220.
Com a l'AoE II, cada jugador té la mateixa sortida (línia de bosc, 5 arbres solts a prop del Centre, or, pedra i menjar);
els boscos són taques compactes i irregulars repartides a l'atzar per tot el mapa, i les 5 relíquies queden escampades
a més de 25 caselles de qualsevol base i a més de 20 l'una de l'altra.
**Boscos i muralles** com a l'AoE II: un bosc dens és una paret (entre troncs propers hi ha un farciment invisible que
desapareix quan se'n talla un), les muralles es poden construir enganxades als arbres per tancar una zona aprofitant
el bosc, i les unitats empeses pels companys no travessen muralles ni boscos. Al Bosc Negre el bosc és ple (sense
clarianes amagades) i no s'hi pot entrar pel mig ni vorejar-lo per la vora del mapa. No es pot construir just a la riba
(on l'edifici quedaria dins de l'aigua) ni a sobre de les relíquies.
**Relleu** com a l'AoE II: turons (Aràbia el més accidentat) i penya-segats de roca que no es poden travessar
(als extrems s'hi pot pujar). Des de dalt es fa +25% de dany i des de baix −25%. Els edificis anivellen el terreny
i no es poden fer en pendents massa forts. La IA reuneix l'exèrcit i fa torres i castells en terreny alt.
**Natura**: cérvols que fugen, senglars que envesteixen (caça'ls amb uns quants aldeans), llops que ataquen i bancs de peixos a la riba. Traçar una muralla d'arbre a arbre només fa (i paga) els trams dels forats: dins del bosc ja no es pot passar.
La **porta** fa 4 cel·les, s'obre sola per a les teves unitats i les aliades (no per a les enemigues) i es pot
**bloquejar** (🔒): llavors no hi passa ningú. Un fonament que ha quedat dins del bosc es pot seleccionar i enderrocar.
**Reparar** (com a l'AoE II): clic dret amb aldeans sobre un edifici propi danyat (muralla, porta, torre, castell,
Centre…). El primer aldeà repara 12,5 punts de vida per segon i cada un de més, la meitat; costa la meitat del preu
de l'edifici per tota la vida reparada, es paga a mesura que avança i sense recursos s'atura. La IA també repara
els seus edificis importants quan no té enemics a prop.

**Naval** (mapes amb aigua): ⚓ **Moll** a l'aigua fonda tocant a la riba; vaixells pesquers (també peix d'altura),
transport (10 unitats: clic dret sobre el vaixell per embarcar, clic dret a terra per desembarcar), Galera → Galera de guerra → Galió,
Brulot (foc, fort contra vaixells), Vaixell de demolició (explota) i Galió artiller (amb Química). Tecnologies: Xarxes, Carenatge, Dic sec.

**Grups grans** (com a l'AoE II): un grup que va lluny marxa com una tropa, en formació, al pas de la unitat més
lenta i esperant els que queden enrere; en arribar, cadascú ocupa el seu lloc. Quan una unitat del grup troba
l'enemic (o l'ataquen), les companyes properes també s'hi llancen. La IA també ataca així, amb l'exèrcit junt.
**Límit de població** triable a l'inici (de 25 a 500; 200 per defecte). Comptador d'aldeans a la barra superior
(amb el detall per recurs).

**Formacions** (<kbd>F</kbd> o botons): línia (cos a cos al davant i genets a les ales), quadrat (arquers, monjos i setge a dins),
esglaonada (contra pedres i fletxes) i flancs (dos grups). Els grups marxen al pas de la unitat més lenta. No hi ha límit d'unitats seleccionades.

**IA** com la de l'AoE II (Fàcil, Normal, Difícil sense trampes; Extrem amb avantatge de recursos):
aldeans sense parar (fins a 45/90/115/130 amb població 200), cases amb marge, campaments on hi ha la feina (també
lluny de la base quan s'acaba l'or o la fusta de prop), granges amb molins nous, dos o tres Centres de Ciutat a l'Edat
dels Castells i mercat per vendre el que li sobra quan no té or (i, mentrestant, unitats que no en gasten). Tria una obertura segons la civilització (exploradors, arquers, homes
d'armes, Castells ràpid o boom), explora la teva base i fa l'exèrcit que contraresta el que ha vist. Fa incursions
contra els aldeans, ataca amb l'exèrcit reunit (reforços, ariets, retirada si perd), toca la campana quan l'ataquen
i, en Difícil, fa kiting amb els tiradors i concentra el foc. Tothom comença amb un explorador i a l'Edat dels
Castells es poden construir més **Centres de Ciutat** (275 fusta, 100 pedra).

**Ordres**: 🔁 **Patrullar** (<kbd>K</kbd>, Shift per afegir punts) · 🛡️ **Escortar** una unitat pròpia (<kbd>Y</kbd>) ·
⚔️ soldats inactius (<kbd>,</kbd>) · 🌱 **cua de granges** al Molí (es paguen ara i es resembren soles).
**Arquers** com a l'AoE II: abast de 4-5 caselles (+1 per Plomes, Punta perforant i Braçal), +3 contra llancers, punteria
(poden fallar i les unitats que corren de costat esquiven les fletxes; les que carreguen les reben).
**Ritme de combat** com a la velocitat normal de l'AoE II DE (les recàrregues de les dades, ×1,7 en temps real).
Tecnologies: Anell del polze (no fallen i disparen més de pressa), Balística (apunten on anirà l'objectiu), Llinatges,
Ramaderia, Escuders, Muralla fortificada i Heretgia.

**Pólvora i unitats que faltaven** (Imperial, amb Química): 🔫 **Canoner** a la Galeria de tir (tret de 17, +10 contra
infanteria, lent i imprecís; no el milloren les fletxes de la Ferreria), 💣 **Canó bombarda** al Taller de setge,
🧨 **Petard** al Castell (esclata contra muralles i edificis, +500) i 💣 **Torre de bombarda** (tecnologia a la Universitat).
Millores de vaixell: Brulot ràpid, Vaixell de demolició pesant i Galió artiller d'elit.
Tecnologies noves: Tàctica part, Subministraments, Gambesons, Incendi, Bardissa de plaques, Espitlleres, Projectils roents,
Cadafals, Sapadors, Lleva, Medicina herbal, Caravana, Gremis, Guàrdia i Patrulla urbana i Mestre d'aixa.
Als botons, les tecnologies tenen el fons blavós i les edats daurat (a més de la fletxa ⬆ de les millores).
**Arbre tecnològic** per civilització (src/data/civs.js, «disabled»): els Francs no tenen camells, Anell del polze ni
Tàctica part; els Japonesos no tenen camells, Hússar, Paladí ni Canó bombarda. El que una civilització no té no surt als botons
i la IA no ho fa servir. `npm run check` comprova que cap unitat o tecnologia depengui d'una civilització que no existeix.
Queden fora les unitats i tecnologies d'altres civilitzacions (elefants, missioners, àguiles…) i les que depenen de
coses que el joc no té (tributs: Encunyació i Banca; Espies, Teocràcia i Matacans).

**Estadístiques** (📊 al menú o en acabar la partida), com a l'AoE II: punts (militar, economia i tecnologia),
baixes, edificis destruïts, recursos recollits per tipus, comerç, relíquies, tributs, tecnologies, quan puja d'edat
cada jugador i gràfiques de l'evolució (punts, població, exèrcit, aldeans i recursos, una mostra cada 30 segons).

**Desar i carregar** conserva també la memòria de les IA (el que han vist de tu, l'exèrcit reunit, les incursions,
la ruta de l'explorador, la reserva per a l'edat), de manera que una partida carregada continua com l'original.
Les unitats grans (setge, galions) només passen per on hi caben, i els recollidors no insisteixen en recursos
on no poden arribar (un peix d'un altre llac, un cérvol mort dins del bosc).

## Desenvolupar

Cal [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install        # un sol cop
npm run dev        # servidor local amb recàrrega automàtica: http://localhost:5173
npm run build      # comprova el codi, genera el fitxer únic i actualitza index.html de l'arrel
npm run check      # només les comprovacions (noms duplicats, atzar sense llavor, fitxers massa llargs)
npm test           # compila i passa les proves al navegador (tests/*.test.mjs, amb Playwright)
node tests/run.mjs ai   # només les proves que contenen «ai» al nom
node tests/run.mjs --bench   # bancs de proves: la IA sola i IA contra IA durant 25 minuts
node tests/run.mjs --bench soak   # cerca d'errors: IA contra IA 15 min a cada mapa comprovant que no passa res impossible
```

**Rendiment** (partides grans, 4 jugadors i més de 500 unitats): cada unitat es dibuixa amb una sola malla amb
esquelet (braços, cames i tors són ossos) i només s'animen les que surten a la pantalla; els obstacles són en una
graella fina on cada edifici ocupa les cel·les que toca; talar un arbre no obliga a refer els camins de ningú (només
obre pas) i els aldeans que treballen no els aparten els que passen. La simulació d'una partida de 4 jugadors a 25
minuts costa la meitat que abans i les unitats fan unes tres vegades menys crides de dibuix.

La simulació és **reproduïble**: amb la mateixa llavor (`?seed=123` a l'adreça) i les mateixes ordres, la partida
és idèntica (la IA inclosa). La lògica del joc fa servir `rand()` i els efectes visuals `vrand()`.
La IA és un «cervell» per equip: `RTS.enableAIFor(1)` posa una IA a jugar pel jugador (IA contra IA).

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
    13 navegació     graella, A*, portes per equip; farciment entre troncs i entre muralla i bosc (13b)
    14 món           generació del mapa (sortides iguals, boscos i recursos a l'atzar)
    15…20            selecció, ordres, entrenament, física i màquina d'estats de les unitats
    21 IA            nucli (21), economia (21a), estratègia i producció (21b), combat i micro (21c)
    05b aigua        llacs, rius i guals (graella, shader i navegació)
    05c relleu       mapa d'alçades, turons, penya-segats, anivellar per als edificis, clic al terreny
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

# Auditoria d'Imperis 3D (setembre 2026)

Revisió del codi, comparació amb l'**Age of Empires II: Definitive Edition** i llista del que els jugadors
de l'AoE II DE demanen o valoren més, amb l'estat a Imperis i una proposta d'ordre.

---

## 1. Auditoria del codi

**Mida:** ~15.400 línies de joc en 60 fitxers (`src/game/`), 8 civilitzacions, 57 unitats, 77 tecnologies,
5 tipus de mapa, 29 proves automàtiques al navegador.

### El que està bé
- **Determinisme:** tota la lògica fa servir l'atzar amb llavor (`rand`), la simulació va a pas fix
  (1/60 s) i `npm run check` prohibeix `Math.random`. Els efectes visuals fan servir `vrand`. És la base per
  a repeticions i multijugador.
- **Estructura:** un fitxer per sistema, noms únics comprovats automàticament, dades separades del codi
  (`src/data/`).
- **Proves:** 29 proves de joc real (economia, combat, IA, navegació, desar/carregar, mapes, equips,
  illes, controls), i bancs de proves per a la IA i el rendiment.
- **Desar/carregar:** conserva també la memòria de la IA, les estadístiques i els estats a mig fer.

### Errors trobats i corregits en aquesta ronda
| Error | Efecte | Correcció |
|---|---|---|
| Tots els generadors d'atzar compartien l'estat | Llacs i Rius tenien l'or als mateixos llocs; l'atzar del combat començava igual a cada partida | Cada generador té el seu estat; només el del joc es desa |
| Bosc Negre tancava l'or i la pedra | De 3 a 15 mines inabastables | Clarianes unides als camins |
| Rius amb 4 jugadors injust | 10 peixos a prop d'uns i cap per als altres | Dos rius en creu |
| Transport enfonsat lluny de la riba | Unitats «fantasma» que ocupaven població | S'enfonsen amb el vaixell |
| Aldeans en una altra illa | Anaven a deixar recursos a un campament inabastable i s'encallaven | Només campaments on poden arribar |
| Preus del Mercat | Quedaven trencats per sempre (encallaven la IA) | Es recuperen 1 punt cada 4 s |
| IA a les Illes | Encallada amb la població plena sense transports | Reserva població per a la flota |

### Riscos i deutes pendents
1. **Rendiment amb molts exèrcits.** Amb ~300 unitats la simulació és el cost principal: moviment i
   col·lisions (~45%), camins A* (5–15%), IA (~7%). És repartit, sense cap coll d'ampolla únic. La mida
   Gran costa el mateix que la Mitjana amb les mateixes unitats. Millores possibles: camins compartits per
   a grups, una graella espacial per als recursos i una IA que pensi en passos alterns.
2. **`farmTaken` recorre totes les unitats** per a cada granja (O(granges × unitats)) quan un aldeà busca
   menjar. Amb 60 granges i 300 unitats es nota poc, però es pot comptar un cop per pas.
3. **Una sola partida desada** a `localStorage` (~35–70 kB). Seria bo tenir diverses ranures i exportar
   a fitxer (ja hi ha codi d'exportació).
4. **`window.RTS` exposa tot l'estat.** Va bé per a proves i depuració, però en multijugador caldrà
   amagar-lo o validar-ho tot al servidor.
5. **Només en català.** Els textos són al codi; per traduir-lo caldria treure'ls a un fitxer de textos.
6. **Fitxers grans:** `25-hud.js` (600 línies), `17-orders.js` (560), `11a-unit-rigs.js` (575). Encara es
   poden llegir, però la interfície es podria partir (panell de selecció, botons, mercat).

---

## 2. Diferències amb l'AoE II DE

### Ja com a l'AoE II DE
Economia (4 recursos, aldeans, campaments, granges amb resembra, mercat, comerç), 4 edats, línies
d'unitats i millores, ferreria, universitat, monjos, relíquies, conversió, castells, unitats úniques,
setge (ariets, mangonells, trabucs, atac al terra), naval (pesca, transports, galeres, brulots, demolició),
muralles, portes que es poden tancar, torres, campana, reparar, formacions, postures, patrullar, escortar,
grups de control, punt de reunió, cua d'ordres amb Shift, velocitat de joc, producció repetida, tecles
d'entrenament, alçada (+25%/−25%), boira de guerra, victòries estàndard, conquesta, regicidi, Meravella i
relíquies, equips fins a 4 jugadors, tributs, estadístiques amb gràfiques, IA per dificultats.

### Diferències importants
| Àmbit | AoE II DE | Imperis 3D |
|---|---|---|
| Civilitzacions | 45+, cadascuna amb bonificació d'equip, 2 tecnologies úniques (Castells i Imperial) i arbre propi | 8, amb bonificacions i arbre propi, sense bonificació d'equip |
| Mapes | ~100 (Arabia, Arena, Black Forest, Islands, Team Islands, Nomad, Gold Rush, MegaRandom…) | 5 (Aràbia, Bosc Negre, Llacs, Rius, Illes) |
| Modes | Random Map, Empire Wars, Death Match, Regicide, King of the Hill, Sudden Death, Treaty, Capture the Relic, Battle Royale | Estàndard, Conquesta, Regicidi |
| Multijugador | En línia, classificació, espectadors | Només contra la IA (4 jugadors al mateix ordinador) |
| Repeticions | Sí (arxiu de partida gravada) | No |
| Campanyes | ~40 campanyes i batalles històriques | No |
| Editor d'escenaris | Sí | No |
| So i música | Sí | No (última fase) |
| Explorador automàtic | Sí (auto-scout) | No |
| Senyals al minimapa | Sí (flares per als aliats) | Només avisos d'atac |
| Tecles | Configurables, graella | Fixes |
| Àrea de selecció | Es poden seleccionar edificis i unitats de tot el mapa (Ctrl+clic) | Doble clic als de la pantalla |
| Idiomes | Molts | Català |

---

## 3. Què demanen o valoren els jugadors de l'AoE II DE

A partir de les novetats més ben valorades del DE i de les peticions habituals dels jugadors (fòrums
oficials, Reddit r/aoe2, comentaris d'actualitzacions). Estat a Imperis:

| Petició habitual | Estat |
|---|---|
| Cua de granges / resembra automàtica | ✅ Hi és |
| Producció repetida (auto-queue) | ✅ **Nou** (clic dret al botó) |
| Velocitat de joc | ✅ **Nou** (+ / −, ×0,5 a ×3) |
| Tecles d'entrenament i per anar als edificis | ✅ **Nou** (Q, E, R… i Ctrl+lletra) |
| Eliminar unitats pròpies | ✅ **Nou** (Supr) |
| Mostrar quants aldeans hi ha a cada recurs | ✅ Hi és (barra superior) |
| Seleccionar tots els aldeans o soldats inactius | ✅ Hi és (. i ,) |
| Arbre tecnològic dins la partida | ✅ Hi és |
| Estadístiques i gràfiques en acabar | ✅ Hi és |
| IA que no faci trampes i sigui «humana» | ✅ Fàcil/Normal/Difícil sense trampes |
| **Repeticions** i mode espectador | ❌ Pendent (recomanat primer) |
| **Explorador automàtic** | ❌ Pendent (petit) |
| **Senyals al minimapa per als aliats** (flares) | ❌ Pendent (petit) |
| **Diverses partides desades** | ❌ Pendent (petit) |
| Modes Empire Wars, Death Match, Rei del turó, Nòmada, Tractat | ❌ Pendent |
| Mapes Arena, Illes d'equip, Nòmada, Gold Rush | ❌ Pendent |
| Bonificacions d'equip de cada civilització | ❌ Pendent (petit, per civilització) |
| Tecles configurables | ❌ Pendent |
| Mode per a daltònics / colors de jugador clars | ❌ Pendent (petit) |
| Multijugador en línia | ❌ Pendent (gran) |
| Campanyes, editor d'escenaris | ❌ Pendent (gran) |
| So i música | ❌ Última fase |

---

## 4. Proposta d'ordre

1. **Petites (una sessió):** explorador automàtic, senyals al minimapa, diverses partides desades, bonificacions
   d'equip, mode per a daltònics.
2. **Repeticions** (reprodueixen les ordres; preparen el multijugador).
3. **Modes de joc:** Empire Wars, Death Match, Rei del turó, Nòmada, Tractat.
4. **Més mapes:** Arena, Illes d'equip, Gold Rush, Nòmada.
5. **Més civilitzacions** (amb bonificació d'equip i dues tecnologies úniques).
6. **Multijugador en xarxa.**
7. **So i música.**

---

## 5. Simulacions IA contra IA (soak)

21 partides de 30 minuts sense jugador (IA a totes les posicions): els 5 mapes, totes les disposicions
(1v1, 2v2, 1v2, 1v3, tots contra tots de 3 i 4) i les 4 dificultats. Cada minut es comprova: errors de
JavaScript, posicions no vàlides, unitats a l'aigua o fora del mapa, unitats encallades, aldeans inactius,
recursos negatius, població per sobre del límit i si la IA puja d'edat, investiga i ataca.

**Resultat:** 0 errors de JavaScript, cap unitat fora del mapa ni valor no vàlid. Errors trobats i corregits:

| Problema | Causa | Correcció |
|---|---|---|
| Ariets encallats minuts sencers | La tropa comprovava la línia recta com si fossin aldeans | Es té en compte l'amplada; qui s'encalla surt de la tropa |
| Aldeans d'un cadàver inabastable a l'altre | Només es recordava l'últim recurs inabastable | Es recorden tots durant un minut |
| Aldeans aturats a tocar del campament | El punt d'arribada, tapat pels companys | Un altre costat de l'edifici a cada intent |
| Aldeans portant l'or 40 m | La IA només feia campament a la mina més propera | Campament al costat de les mines i boscos que es treballen |
| Constructors intentant travessar el mar | La IA triava el més proper, encara que fos en una altra illa | Només els que hi poden arribar |
| Vaixells nous a terra | Moll envoltat de vaixells | Van a l'aigua lliure més propera |
| Monjos i aldeans caminant cap a l'aigua | Relíquies i magatzems d'una altra illa | Només el que és a l'abast |
| Vaixells i unitats que van i venen sense avançar | La detecció d'encallat ho prenia per progrés | Comprovació a 6 s del camí que queda |
| IA Fàcil sense Imperial i amb 20.000 recursos | El llindar d'aldeans superava el seu objectiu | Llindar limitat i edats més pausades |
| Mapa sense or ni pedra al minut 30 (4 jugadors) | 800 d'or per mina (a l'AoE II, ~5.600 per veta) | 2.000 d'or i 1.000 de pedra per mina |
| La IA deixava d'atacar després d'una Meravella | Els atacs d'urgència disparaven el comptador | Límit al comptador |
| Victòries per Meravella al minut 25 | 5 minuts de compte enrere | 10 minuts i la IA només en fa al final |
| Ariets encallats de camí a embarcar | Massa amples per al camí de la riba | La IA no embarca setge |

**Encara obert (menor):** a les Illes, la IA que perd el control del mar no pot tornar a atacar (és una derrota
estratègica, com a l'AoE II); algun aldeà que torna d'una caça llunyana pesca des de la riba lluny del
magatzem. El cost de la simulació amb 4 jugadors al final de la partida (500+ unitats) és d'uns 10–13 s per
minut de joc en aquest ordinador sense GPU.

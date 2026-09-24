# Com aconseguir models 3D realistes i gratuïts

Aquesta guia explica on trobar models lliures, com preparar-los i on posar-los perquè el joc els faci servir.

## 1. On buscar-los

| Web | Llicència | Què hi trobaràs | Adequat per a |
|---|---|---|---|
| **polyhaven.com/models** | CC0 (lliure, sense atribució) | Models fotorealistes: roques, soques, arbustos, barrils, caixes, carros, objectes de fusta | Mines de pedra i d'or (roques), baies (arbustos), decoració |
| **quaternius.com** | CC0 | Packs complets: *Medieval Village MegaKit* (edificis), *Ultimate Nature* (arbres), *Animated Animal Pack* (ovella, cavall, cérvol), personatges humans amb animacions | Edificis, arbres, animals, unitats. Estil *low-poly* però amb proporcions realistes |
| **sketchfab.com** | Varia: filtra per **CC0** o **CC Attribution** | Molts edificis medievals realistes (cases, castells, molins, ferreries), alguns molt detallats | Edificis realistes (tipus AoE II). Tria els lleugers |
| **itch.io** (cerca «medieval 3d free») | Varia (mira cada pack) | Packs d'autors independents | De tot |
| **opengameart.org** | Varia | Col·lecció antiga però gratuïta | Complements |
| **mixamo.com** (Adobe, compte gratuït) | Ús gratuït dins de jocs | Personatges i animacions humanes (caminar, atacar, morir…) | Unitats (Fase 7). No es pot redistribuir el model sol, però sí dins del joc |

**Sobre les llicències**
- **CC0**: pots fer-ne el que vulguis, sense citar ningú. És la millor opció.
- **CC BY (Attribution)**: gratuït, però cal citar l'autor. Apunta el nom i l'enllaç i els posarem a `CREDITS.md`.
- **Evita** les llicències **NC** (*NonCommercial*) si algun dia vols vendre o publicar el joc, i les **ND** (*NoDerivatives*), perquè no deixen modificar el model.

### Com buscar a Sketchfab (el més realista)
1. Ves a sketchfab.com i cerca, per exemple, `medieval house`, `medieval barracks`, `windmill`, `blacksmith`, `castle`, `market stall`.
2. Activa el filtre **Downloadable**.
3. A **License**, tria **CC0** (o **CC Attribution**).
4. Mira el nombre de **triangles** a la fitxa del model: millor **menys de 20.000** per a un edifici, i **menys de 5.000** per a un arbre o una roca.
5. Fes clic a **Download 3D Model** i tria **glTF** o **GLB**.

## 2. Formats i mides

- El joc vol fitxers **`.glb`** (glTF binari: un sol fitxer amb textures incloses).
- Si el model ve en `.gltf` + `.bin` + imatges, `.fbx`, `.obj` o `.blend`, converteix-lo amb **Blender** (gratuït, blender.org):
  1. *File → Import* (el format que tinguis).
  2. *File → Export → glTF 2.0*, i a **Format** tria **glTF Binary (.glb)**.
- Intenta que cada fitxer pesi **menys de 2 MB**. Tots els models s'incrusten dins de `index.html`, així que el total hauria de quedar per sota d'uns 30–40 MB.
- Si les textures són molt grans (4K), redueix-les a 1024×1024 (a Blender o amb qualsevol editor d'imatges abans d'exportar).
- **Orientació:** l'eix vertical ha de ser el Y (és l'estàndard del glTF). La mida no importa: el joc escala cada model perquè encaixi a la seva parcel·la.
- **Color d'equip:** si vols que una part (teulada, bandera…) sigui blava o vermella segons el jugador, posa el nom **`team`** al seu material a Blender.

## 3. On posar-los i amb quin nom

Posa'ls a `assets/models/` amb aquests noms (la llista completa és a `assets/models/README.md`):

```
assets/models/buildings/towncenter.glb   Centre de Ciutat
assets/models/buildings/house.glb        Casa
assets/models/buildings/barracks.glb     Caserna
assets/models/buildings/mill.glb         Molí
…
assets/models/resources/tree.glb         Arbre (tree_2.glb, tree_3.glb… per a variants)
assets/models/resources/gold.glb         Veta d'or
assets/models/resources/stone.glb        Mina de pedra
```

No cal tenir-los tots: el que no hi sigui continua amb el model actual.

### Personatges animats (Fase 7)
Posa'ls a `assets/models/units/` (`villager.glb`, `militia.glb`, `spearman.glb`, `archer.glb`, `scout.glb`, `knight.glb`, `horse.glb`, `tradecart.glb`).
Han de portar esquelet i animacions. Els noms que el joc buscarà (no importen majúscules):
`idle`, `walk`, `run`, `attack`, `shoot`, `work` (treballar/picar), `death`.
Si el pack fa servir altres noms, digues-m'ho i ho adaptarem.

## 4. Com pujar-los al repositori (des del navegador)

1. Obre el repositori a GitHub i canvia a la branca **`claude/affectionate-bell-v5uf3k`**.
2. Entra a la carpeta `assets/models/buildings` (o `resources`, `units`).
3. Prem **Add file → Upload files**, arrossega els `.glb` i prem **Commit changes**.
4. Digues-me que ja hi són: regeneraré `index.html` i ajustaré mides, orientacions i colors.

Si prefereixes no fer-ho a GitHub, també me'ls pots passar d'una altra manera i els poso jo.

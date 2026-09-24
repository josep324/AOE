# Imperis 3D

Joc d'estratègia en temps real a l'estil **Age of Empires II**, fet amb [Three.js](https://threejs.org), que s'executa al navegador.

## Jugar

Obre **`index.html`** directament al navegador (doble clic). És un sol fitxer autònom: no cal Internet ni instal·lar res.

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
  data/             dades del joc: unitats, edificis, tecnologies, edats, tecles, dificultats
  game/             codi del joc, un fitxer per sistema, en ordre:
    00-config        configuració i estat global
    01…06            render, càmera, llum, materials, terreny, indicadors de selecció
    07…12            entitats, recursos, edificis, col·locació, models d'unitats, decoració
    13 navegació     graella, A*, portes per equip
    14 món           generació simètrica del mapa
    15…20            selecció, ordres, entrenament, física i màquina d'estats de les unitats
    21 IA            economia, edats, exèrcit i atacs de l'enemic
    22…24            boira de guerra, combat, efectes
    25…30            HUD, entrada, minimapa, barres de vida, flux de partida, desar/carregar
    31 bucle         simulació a pas fix (60 passos/s) i renderitzat
assets/models/      models 3D opcionals (.glb) que substitueixen els fets amb primitives
docs/MODELS.md      on trobar models gratuïts i com afegir-los
scripts/publish.js  copia el fitxer compilat a index.html
```

Els fitxers de `src/game/` s'uneixen en ordre en un sol mòdul en compilar (vegeu `vite.config.js`).

## Llicència dels recursos

Els models afegits a `assets/models/` han de ser de llicència lliure (CC0 o CC BY). Els que requereixin atribució s'han de citar a `CREDITS.md`.

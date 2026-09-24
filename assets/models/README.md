# Models 3D del joc

Posa aquí fitxers **`.glb`** i el joc els farà servir automàticament en lloc dels models fets amb primitives.
Guia completa (on trobar-los, com convertir-los, llicències): [`docs/MODELS.md`](../../docs/MODELS.md).

| Carpeta | Fitxer | Què és |
|---|---|---|
| `buildings/` | `towncenter.glb` | Centre de Ciutat |
| | `house.glb` | Casa |
| | `lumbercamp.glb` | Serradora |
| | `miningcamp.glb` | Campament miner |
| | `mill.glb` | Molí |
| | `farm.glb` | Granja (camp de conreu, pla) |
| | `market.glb` | Mercat |
| | `barracks.glb` | Caserna |
| | `stable.glb` | Estable |
| | `blacksmith.glb` | Ferreria |
| | `watchtower.glb` | Torre de guaita |
| | `palisade.glb` | Tram de palissada (1×1) |
| | `stonewall.glb` | Tram de muralla de pedra (1×1) |
| | `gate.glb` | Porta (3×1, llarga en l'eix X) |
| `resources/` | `tree.glb`, `tree_2.glb`, `tree_3.glb`… | Arbres (les variants s'alternen) |
| | `gold.glb` | Veta d'or |
| | `stone.glb` | Mina de pedra |
| | `berries.glb` | Arbust de baies |
| | `sheep.glb` | Ovella |
| `units/` | *(Fase 7)* | Personatges animats: vegeu `docs/MODELS.md` |

- La mida no importa: el joc escala cada model perquè ocupi la seva parcel·la.
- Color d'equip: posa el nom **`team`** al material que ha de ser blau/vermell.
- Després de pujar-los: `npm run build` (o demana-ho a Claude) per regenerar `index.html`.

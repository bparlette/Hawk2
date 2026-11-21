# games/shared/world3d — reusable three.js street-world modules

Built for Scaggsville 3D (`games/scaggsville-3d/src/world/buildWorld.js` is the reference integration) and kept
game-agnostic so any Hawk2 3D game built on real map data can use them. Pure ESM; the only import is `three`
(resolved by the page's importmap, three@0.160). No external assets: every texture is procedural canvas.

| Module | Exports | What it gives you |
|---|---|---|
| `textures.js` | `makeTextures()` | World-mapped asphalt, grass, leaf litter, 1.5 m sidewalk slabs, architectural shingles; facade bay tiles (lap siding / brick, 2.9 m × 3.1 m, window + trim + mullions + shutters) with a separate greyscale **paint mask** and a **roughness map** (glossy glass); garage + front door; storefront band; macro noise; **foliage atlas** (leaves \| bark \| needles). |
| `roads.js` | `buildRoads(scene, D, T, B)`, `RoadIndex`, `MARK`, `hasSidewalk` | One-draw road surface with **shader-painted markings** by OSM class, faded near polyline ends; curbs + sidewalks swept along residential streets and cut where they would land on other pavement; gravel shoulders. Returns `{ index, mesh, stats }` — `index.paved(x,z)` (bitset, O(1)) and `index.nearest(x,z,maxR)` for everything else. |
| `houses.js` | `buildHouses({D,B,roads,rand,cfg,nearRoute})`, `houseMaterials(T)`, `buildLitWindows(scene, quads)` | A house on every footprint: foundation, facade bays with windows, gable / hip roof with eaves + soffits + fascia, chimneys; street-facing door, stoop, porch hood, garage, driveway. Sheds and commercial footprints handled. Returns `{ colliders, winQuads, drives, stats }`. |
| `vegetation.js` | `buildVegetation({scene,roads,colliders,drives,D,cfg,T,greens})`, `vegetationMaterial(T)` | Leaf-card trees (oak / maple / pine / woods + LODs), shrubs; street + yard planting; **real woods polygons** (`greens`) banded by distance to road; instanced in 400 m chunks, distance cull + LOD swap in `scene.onBeforeRender` (chains any existing hook). |
| `buckets.js` | `Buckets` | Merge-by-material batching split into spatial tiles (`new Buckets(900)`): few draws, still culled per district (also in the shadow pass). |
| `ground.js` | `makeGrassMaterial(T)` | World-space grass with two detail scales + two macro tone fields; never tiles. |

## Data contract (what `D` must look like)

Metres, y up, x east, z south (any consistent frame works).

```js
D = {
  roads:     [{ pts: [[x,z],...], w: widthMetres, hw: 'residential'|'tertiary'|'motorway'|... (OSM highway=*) }],
  cds:       [{ x, z, r }],                  // cul-de-sac discs (may be [])
  parking:   [{ pts: [[x,z],...] }],          // lot polygons (may be [])
  buildings: [{ pts: [[x,z],...], hero: id|null }],
  heroes:    { [heroId]: { storeys, wall:'#hex', roof:{ type:'gable'|'flat', ridge:'long'|'short', c1:'#hex' }, details:[{t:'door',color}] } },
  heroBuilding: { [heroId]: buildingHeroKey },
  stops:     [{ id, sx, sz, hx, hz, heading }], // only houses.js reads it (hero driveways)
}
greens = [[[x,z],...], ...]                   // woods / park polygons (see scaggsville-3d/tools/extract_greens.py)
```

## Minimal integration

```js
import { makeTextures } from '../shared/world3d/textures.js';
import { buildRoads } from '../shared/world3d/roads.js';
import { buildHouses, houseMaterials, buildLitWindows } from '../shared/world3d/houses.js';
import { buildVegetation } from '../shared/world3d/vegetation.js';
import { Buckets } from '../shared/world3d/buckets.js';
import { makeGrassMaterial } from '../shared/world3d/ground.js';

const T = makeTextures(), B = new Buckets(900);
const mats = { ...houseMaterials(T), sidewalk: new THREE.MeshStandardMaterial({ map:T.concrete, vertexColors:true }),
               shoulder: new THREE.MeshStandardMaterial({ map:T.asphalt, color:0x9c9686, vertexColors:true }) };
scene.add(new THREE.Mesh(groundPlane, makeGrassMaterial(T)));
const roads = buildRoads(scene, D, T, B);
const H = buildHouses({ D, B, roads, rand: Math.random, cfg: { houseDetailRadius: 400 }, nearRoute: () => true });
B.build(scene, mats, { wallSiding:true, wallBrick:true, roof:true, trim:true });
buildVegetation({ scene, roads, colliders: H.colliders, drives: H.drives, D, cfg: { treeDensity: 1 }, T, greens });
buildLitWindows(scene, H.winQuads);   // name 'litWindows': tint material.color for day/night
```

Measure every change with `tools/lookdev/` (see `tools/lookdev/README.md`). Reference numbers for Scaggsville 3D at
390×844: 525k–662k triangles, 326–397 GL draws incl. shadows, world build 1.8 s.

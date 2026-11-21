# games/shared/world3d — reusable three.js street-world modules

Built for Scaggsville 3D (`games/scaggsville-3d/src/world/buildWorld.js` is the reference integration) and kept
game-agnostic so any Hawk2 3D game built on real map data can use them. Pure ESM; the only import is `three`
(resolved by the page's importmap, three@0.160). No external assets: every texture is procedural canvas.

| Module | Exports | What it gives you |
|---|---|---|
| `textures.js` | `makeTextures()` | World-mapped asphalt, grass, leaf litter, 1.5 m sidewalk slabs, architectural shingles; facade bay tiles (lap siding / brick, 2.9 m × 3.1 m, window + trim + mullions + shutters) with a separate greyscale **paint mask** and a **roughness map** (glossy glass); garage + front door; storefront band; macro noise; **foliage atlas** (leaves \| bark \| needles). |
| `roads.js` | `buildRoads(scene, D, T, B)`, `RoadIndex`, `MARK`, `hasSidewalk` | One-draw road surface with **shader-painted markings** by OSM class, faded near polyline ends; curbs + sidewalks swept along residential streets and cut where they would land on other pavement; gravel shoulders. Returns `{ index, mesh, stats }` — `index.paved(x,z)` (bitset, O(1)) and `index.nearest(x,z,maxR)` for everything else. |
| `houses.js` | `planHouses({D,roads,tile})`, `createHouseLOD({scene,plan,roads,atlas,atlasMat,scheduler,fullIn,fullOut,spawn})`, `buildHouses({D,B,roads,level})` (sync, older callers) | A house on every footprint, **lean** (walls + roof) or **full** detail per tile, keyed to camera distance and streamed through the scheduler: foundation, facade bays with windows, gable / hip roof with eaves + soffits + fascia, chimneys; street-facing door, stoop, porch hood, garage, driveway. Sheds and commercial footprints handled. `planHouses` returns `{ items, colliders, drives, tiles }`; the LOD's `update(x,z)` is called per frame. |
| `vegetation.js` | `buildVegetation({scene,roads,colliders,drives,D,cfg,T,greens,scheduler,camera})` → `{stats,cull(cp),group}`, `vegetationMaterial(T)` | Leaf-card trees (oak / maple / pine / woods + LODs), shrubs; street + yard planting; **real woods polygons** (`greens`) banded by distance to road; instanced in 400 m chunks, each generated as a scheduler job (chunk-seeded); call `cull(cameraPos)` per frame for distance cull + LOD swap + shadow casting. |
| `buckets.js` | `Buckets` | Merge-by-material batching split into spatial tiles (`new Buckets(900, atlas?)`): few draws, still culled per district (also in the shadow pass). With an atlas, every key in `ATLAS_REGION` merges into one `atlas` bucket per tile. |
| `atlas.js` | `atlasMaterial(T)`, `ATLAS_REGION` | One MeshStandardMaterial for every house/prop surface: per-vertex atlas rect, `textureGrad` wrap (no seams), MR map (R paint mask, G roughness, B metalness). `T.atlas` comes from `makeTextures()`. |
| `scheduler.js` | `createScheduler({budgetMs})` | Time-sliced generator jobs, nearest-first priority, so heavy building happens between frames instead of before the first one. |
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

See `games/scaggsville-3d/src/world/buildWorld.js` (the reference integration). The outline:

```js
const T = makeTextures(), S = createScheduler({ budgetMs: 10 });
const B = new Buckets(900, { rect: T.atlas.rect, region: ATLAS_REGION });
const mats = { atlas: atlasMaterial(T), litwin: ... };
const roads = buildRoads(scene, D, T, B);
const plan = planHouses({ D, roads, tile: 450 });
const lod = createHouseLOD({ scene, plan, roads, atlas: T.atlas, atlasMat: mats.atlas, scheduler: S, spawn: [x, z] });
B.build(scene, mats, { atlas: true });
const veg = buildVegetation({ scene, roads, colliders: plan.colliders, drives: plan.drives, D, cfg, T, greens, scheduler: S, camera: () => camXZ });
scene.onBeforeRender = (r, s, cam) => { camXZ[0] = cam.position.x; camXZ[1] = cam.position.z; lod.update(camXZ[0], camXZ[1]); veg.cull(cam.position); };
```

Measure every change with `tools/lookdev/` (see `tools/lookdev/README.md`). Reference numbers for Scaggsville 3D at
390×844 (full map): 530k–610k triangles, 254–352 GL draws incl. shadows, first frame 2.1 s.

# Scaggsville 3D — build notes

A 3D rebuild of Scaggsville (the Laurel/Fulton crew rally game) in Hawk2,
applying the Bunny Hop visual settlement: Neon's world-module quality
(merge-by-material batching, GLSL sky dome + PMREM environment, canvas
textures, emissive dusk life) and the settled chase-camera POV.

## The map is real — provenance

**Nothing in the layout is invented.** All geometry comes from the original
Scaggsville game's data at Hawk `games/laurel-fulton/`, which was itself
baked from OpenStreetMap (api.openstreetmap.org) for Laurel/Fulton, MD:

| Data | Source file (old game) | What it is |
|---|---|---|
| Road graph | `data/graph.min.json` | Real OSM road vertices/edges |
| Building footprints | `data/areas.json` | 22,821 real OSM building polygons |
| Crew houses | `data/roster.json` + `data/heroes.json` | Real house sites/styles for the 8 stops |
| Cul-de-sacs, parking, POIs | `data/culdesacs.json`, `areas.json`, `places.json` | Real OSM features |

Extraction: `research/extract.py` (rerunnable) → `src/data.js` (397 KB).

- **Frame**: meters, origin at Brad's house (10128 Stansfield Dr), x = east,
  z = south. The old game's internal frame is 5 units/meter (proven against
  lat/lon deltas between roster stops; the graph file's "10" label is wrong).
- **Route**: Dijkstra shortest path over the real road graph:
  Brad → Floyds → Jason → Grant → Lazaris → Rigg → Kosack → Atholton HS,
  **23.09 km** of real roads.
- **Kept geometry**: 1,165 roads / 2,027 buildings / 8 parking polygons /
  36 cul-de-sacs within a corridor of the route and the crew streets.
  Polylines simplified at 1.2 m tolerance — simplified, never moved.
- **Stops**: each stop's arrival point is the house's position projected onto
  the route polyline (the kerb the rally drives past); the house itself
  (hx, hz) is the real house site. (First extraction projected onto the
  nearest kept road, which put the Floyds stop 78 m off the driven path on a
  side spur — fixed in the extractor, verified: every stop now sits on the
  route polyline.)
- **Gap fills**: none needed — the old game's OSM data covered the whole
  slice. No hand-invented streets or houses anywhere.

Real streets in the slice include Stansfield Dr, Derby Rd, Sweet Cherry Ln,
Susini Dr, Hughes St, Mossy Stone Ct, Early Bud Way, Scaggsville Rd and the
Freetown Rd approach to Atholton High School — all at their real positions.

## World module seam (same spirit as Bunny Hop)

`src/world/buildWorld.js` exports:

```js
buildWorld(scene) -> {
  groundAt(x, z) -> 0,                 // flat terrain in v1
  surfaceAt(x, z) -> 'road'|'grass',   // 12 m raster grid over the real roads
  colliders: [{cx, cz, hw, hd, cos, sin, top, type}],  // OBBs, what-you-see-is-what-you-hit
  stops, route, spawn,                 // real stop sites + Dijkstra route polyline
  config: WORLD_CONFIG,                // density knobs (trees, poles, lights, windows…)
  lighting: WORLD_LIGHTING,           // the Bunny Hop summit lighting rig values
  target: { group, setStop(stop) },    // guidance beacon, moved by the host
}
applyWorldEnvMap(renderer, scene)      // PMREM environment generated from the sky dome
```

Rules carried over from THREE-WORLD-MODULE.md: geometry and its data
contract are built together; merge-by-material Buckets (one geometry per
material — target ≤ 60 world draw calls, measured numbers in the preview);
canvas-generated textures only; a `world-preview.html` with a fixed
`?shots=1` camera matrix (390×844: spawn / route mid / Atholton / overhead)
plus a `renderer.info` dump ships alongside the world.

## Camera (the Bunny Hop settlement, adapted to a car)

Chase cam low and close: 8.6 m back, 2.7 m up (≈ the 1.65 m shoulder feel
at car scale), FOV 60° widening to 67° at top speed, **roll inheritance 0**
(horizon locked level), lazy yaw (3.2/s lerp toward heading), position
smoothing, no vibration.

## Cars — ONE shared factory, data rows (never remodel per game)

All vehicles come from the shared gamepress-kit module **gpvehicles.js**:

- Canonical: gamepress `kit/gpvehicles.js` (filed 2026-11-20; the gamepress
  checkout had another agent's uncommitted work at filing time, so the file
  sits untracked there until that work lands — do not lose it).
- Published copy every Hawk2 game imports: **`/games/shared/gpvehicles.js`**
  (differs only in the three import, resolved by each game's importmap).
  Scaggsville imports it as `../shared/gpvehicles.js`. Bunny Hop, Palm City
  and future games import the same file and pass their own data rows.

Technique (from the Bunny Hop world audit): each body style is a side
profile traced from reference photos, extruded across the width with a
bevel — shaped bodies, sloped glass, formal rooflines, never boxes.
Glasshouse is a second extrusion + glass panels; head/taillights are
emissive (Bunny Hop standard); wheels are separate pivots that **roll**
(and steer at the front). Styles: camaro3, celica1, cavalier3, camryV20,
brougham, astro1, astro2, tracerHatch, mustangFox + generic sedan/hatch.

The crew cars are data rows in `src/crew.js` (style + paint + extras:
two-tone band, hood louvers, T-top, light bar, pop-ups, vinyl roof, wire
wheels, underglow, burnt). **All 11 fleet cars** from the old game's asset
page are modeled, including the Black Cavalier (parked at Kosack's).
References: the fleet sprite sheets + `fleet.json` dims (Hawk
`games/laurel-fulton/assets/cars/`, local copy `~/workspace/laurel-verify/`)
and the showcase photos (`showcase-assets/*-ref.*`, pulled to
`research/refs/`). Discrepancies found and flagged: **Rigg's showcase
photo shows a 1970s first-gen Celica**, but the fleet list, fleet.json
dims (4.37 × 1.69 m) and canon all say '87 Celica GT — the model is the
'87 (pop-ups up); the photo looks mis-filed. **Zack's showcase photo is
the blue Mazda 323 hatch twin**; the fleet sprite's plan + dims say the
Tracer is a green sedan — modeled as the sedan. **Kosack's photo is
silver** (the car is red).

## People — Figure Factory / rigkit method

Crew figures stand at their houses, from the shared module
`/games/shared/people.js`: primitive meshes on named pivots, characters
as data rows (`CREW_PEOPLE` in `src/crew.js`), procedural pose programs —
**idle** (breathing, looking around), **wave** (when you're headed to
their house), **walk** (to their car when they join; the player figure
walks to the driver's door at spawn). gpchar.js is the fighter-specific
implementation of the same house method (gi/obi/hakama/bare feet) — the
crew needed street clothes, so the figures follow the documented method
directly. Judged in motion: see `lineup.html?view=people` and the pickup
beat in game.

## Nov 20 (later) — the GTA VI car-bar pass

Cherie set the bar from her own GTA VI play (photos + driving video of a
blue ute at a tiki auto shop, blue hour): glossy reflective paint, curved
panel flow, glass with a VISIBLE interior and a seated driver, readable
wheels, light signatures on wet streets, deep-blue grade with warm lit
dressing. What was adopted into the shared modules (so every game gets it):

- **gpvehicles.js**: paint is now a clearcoat physical material (the
  clearcoat layer throws the sharp sky reflection); glass is tinted and
  translucent (opacity 0.72) over a built **interior tub** in every style —
  floor pan, dash + pad, steering wheel on a column, two front seats, rear
  bench (non-hatch styles). Wheels rebuilt: sidewall shoulders + readable
  rims (5-spoke alloy / slotted steel / 12-spoke wire), one cached
  vertex-colored geometry per (kind, radius). Dusk light signatures:
  additive halo cards at head/taillamps + a warm headlight pool thrown on
  the road ahead of every car; `buildVehicle` returns `driverAnchor` +
  `driverScale` (figure scale fitted to the cabin). The player's car also
  gets a real SpotLight beam from the host.
- **people.js**: clothing is geometry now — and LOOSE (Cherie's shirt rule):
  the shirt is a shell offset outward from the torso, hanging from a
  shoulder yoke that bridges into loose sleeve tubes (no gaps, no body
  shape through the garment), with hem, collar and optional chest stripe;
  full-length loose trousers for every crew member (pants, not shorts —
  her call), and hats (cap with tipped brim / wide-brim / beanie) varied
  per crew row in `src/crew.js`. New `buildDriver(row)`: a seated
  driver as ONE merged vertex-colored mesh (1 draw call) in the same
  clothing, hands on the wheel — the host seats the player and each
  convoy driver when their figure reaches the car door.
- **Scene**: default lighting is now the **blue-hour preset**
  (`LIGHTING_PRESETS.dusk`; golden kept alongside) — deep-blue sky dome
  grade, blue fog/hemi, low warm sun remnant. Roads went wet: darker
  asphalt, roughness 0.94 → 0.52 + env reflection, so the sky streaks
  down the street. Every route streetlight gained a warm pool on the
  road + a halo card at the head (one merged additive mesh, 1 draw).
- **Proof**: `tools/carbar.mjs` captures an identical shot set +
  measurements before/after (lineup 3/4, people stage, chase spawn,
  driving, convoy, desktop overhead; renderer.info, frame ms, road luma).
  Sets live in `shots/carbar/{before,after}` in the workspace.
- **Ruled out for perf**: real planar reflections and per-car shadow-casting
  spotlights (one beam, player only); transparent glass stays depth-writing
  so interiors sort correctly; lamp glow is cards, not point lights.

## Controls (gamepress gptouch standard)

Floating joystick anchoring anywhere on the left half (steering), round
A (gas) / B (brake/reverse) buttons bottom-right, PointerEvent isolation
with pointer capture, controls at z-index ≥ 1100, double-tap zoom and
gestures blocked. Keyboard: WASD / arrows.

## Physics & convoy

`src/drive.js` — pure arcade car physics (no three.js, node-testable):
bicycle steering, quadratic drag, grass slowdown (15 m/s cap off-road),
circle-vs-OBB collision resolution against the world's colliders.
Convoy cars join at each house and retrace the player's **breadcrumb
trail** (points every ~1.4 m, each follower 13.5 m further back), so the
convoy drives the same real roads the player drove.

## Proofs

- `tools/proof.mjs` — node: steps the real drive code along the real
  23.09 km route with the full convoy; asserts every stop triggers in
  rally order and the run finishes at Atholton.
- `tools/verify.mjs` — headless Chromium (SwiftShader): zero page errors,
  pick-screen → drive → collect → finish via `__proof` hooks, screenshots
  at 390×844, renderer.info + road-luma measurement.
- `src/world/world-preview.html?shots=1` — the fixed camera matrix.

## v1 scope / known gaps

- Player pick is a start screen (Brad preselected by position, any of the
  7 households pickable; the rally order rotates around the pick).
- Flat terrain (the real corridor is gently rolling; elevation is v2).
- Ambient parked cars are cheap merged silhouettes (`src/fleet.js`) — the
  crew cars are the full gpvehicles models; generic traffic is future work.
- No day/night cycle — fixed time of day (blue hour since the car-bar pass
  below; the golden-hour preset is kept in `LIGHTING_PRESETS`).
- If you pick Jimmy, Billy's Astro doesn't join later (same household).
- No engine audio in v1.
- Draw calls: world 13 (preview-measured); the full scene with all 10 crew
  vehicles + figures runs higher (~150) — the ≤60 budget was a world-module
  budget and the world holds it; per-vehicle meshes are the cost of shaped,
  wheel-rolling cars.

## World look pass 1 (Opus, Nov 21) — toward GTA V street realism

Same map, same data contract (`groundAt`, `surfaceAt` 12 m grid unchanged, colliders, stops, route, spawn,
target, lighting; `skyDome` / `litWindows` / `lampGlow` names the day-night cycle drives are unchanged).
`buildWorld.js` now orchestrates four modules:

| Module | What it adds |
|---|---|
| `src/world/textures.js` | Procedural canvas set: world-mapped asphalt, grass, leaf litter, 1.5 m sidewalk slabs, architectural shingles; facade bay tiles (lap siding / brick, 2.9 m x 3.1 m, window with trim, mullions, shutters) with a separate paint mask + roughness map (glass is glossy, trim stays white). |
| `src/world/roads.js` | One-draw road surface with **shader-painted markings** by OSM class (double yellow + white edges on collectors, yellow/white edges + dashed lanes on one-way carriageways, none on residential), faded near polyline ends; world-space asphalt with macro variation + wheel paths; curbs + 1.6 m sidewalks swept along residential streets (cut wherever they would land on other pavement); gravel shoulders elsewhere. Bitset paved mask + nearest-road index for the other modules. |
| `src/world/houses.js` | Every real footprint becomes a house: foundation, siding/brick bays with windows, gable or hip roof with eaves/soffits/fascia, chimneys; the side facing the nearest real road gets the front door + stoop + porch hood and (wider fronts) a garage door + driveway to that road + a mailbox. Sheds (< 34 m²) and commercial/school footprints (> 520 m², flat roof + parapet + rooftop units) handled separately. Lit-window quads sit on the painted windows. |
| `src/world/vegetation.js` + `greens.js` | Street trees, yard trees, foundation shrubs, and the **real OSM woods** (446 polygons, 14.2 km², from `laurel-fulton/data/areas.json` via `tools/extract_greens.py`; frame fitted from 2,027 building matches, median residual 0.00 m): leaf-litter floor + trees banded by distance to road (7.5 m spacing near roads, 26 m at the fog line, none beyond 700 m). Instanced in 400 m chunks with distance cull (760 m) and LOD swap beyond 260 m. |

Merged world meshes are now split into 900 m tiles so frustum + shadow culling can skip districts.

**Measured** (headless Chromium/SwiftShader, 390×844, the same 5 route views, `__proof.stats()`):

| | Before | After |
|---|---|---|
| Triangles / frame | 568k – 643k | 654k – 770k |
| Draw calls (non-convoy views) | 202 – 245 | 224 – 289 |
| World build time | — | 1.7 s (textures 0.37, roads 0.18, houses 0.35, vegetation 0.59) |
| Page errors | 0 | 0 |

Rerun the woods extraction with `python3 tools/extract_greens.py`.

## World look pass 2 (Opus, Nov 21)

- **Trees are leaf-card canopies** (alpha-tested clusters on a leaves | bark | needles atlas, crown-centred
  normals for soft rounded light, branches into the crown, dappled alpha shadows). One material, so a
  chunk is still one draw — and cheaper than the faceted blob trees they replace.
- **Grass** desaturated toward late-summer olive with drier macro patches (was golf-course green).
- **Contact shadows**: a soft dark skirt where every house meets the ground (one transparent draw).

Measured, same harness and views: **527k – 625k triangles** (pass 1: 654k – 770k; original: 568k – 643k),
221 – 291 calls, world build 1.8 s, 0 page errors.

## Map fidelity fix (Opus, Nov 21): the 3D map now matches the real map the 2D game draws

Measured against `laurel-fulton/data/graph.min.json` (the network the 2D game draws, which matches satellite
imagery) and `areas.json`:

| Check | Before | After |
|---|---|---|
| Road vertex position error vs the real graph | 0.00 m (positions were always exact) | 0.00 m |
| Real road length inside the map extent that was **missing** | 49–100 % per class (66 % residential, 79 % service, 88 % secondary) | **0.00 %** of 369.3 km |
| Roads / buildings / lots / cul-de-sacs | 1,165 / 2,027 / 8 / 36 (a corridor around the route) | 4,496 / 9,931 / 114 / 140 (everything in the extent) |
| House box fit (footprint area / box area, median) | **0.50**: boxes mirrored in z, every non-grid house rotated against its street and ~2× its real footprint | **0.93**: box axis on the real longest edge |

1. **Coverage.** The first extraction kept a corridor around the rally route, so cross streets ended a few metres
   past intersections and subdivisions were empty grass. `tools/extract_world.py` re-extracts everything inside the
   same extent with the same fitted frame (2,027 building matches, residual 0.00 m). Stops, route and heroes are
   byte-identical.
2. **House orientation.** `ry = -ba + π/2` mapped the box's local +x to a z-mirrored edge direction. Fixed in
   `games/shared/world3d/houses.js` (`ry = atan2(-cos ba, sin ba)`); colliders share `ry`, so collisions follow the
   real walls too.
3. **Scale is real.** The 2D data was compressed ×0.5 on Nov 17 (owner: "every road maybe 1/2 the current length")
   while `graph.min.json` still says `units_per_m: 10`. 5 units = 1 real metre, so 3D is true size and 2D is a
   half-scale miniature. Road widths in 2D were not halved, which is why 2D streets look wider than 3D ones.

**Budget for the complete map** (same recipe, 390×844): 581k–618k triangles (corridor build: 525k–662k), 373–450 GL
draws (326–397), 75.4 MB geometry (58.8 MB, each geometry counted once), world build 5.4 s (1.8 s), 0 page errors.
To keep it there: road surface, lit windows and contact shadows are tiled at 900 m; houses beyond 700 m from the
route are lean (walls + roof, `houseFullRadius`); merged normals and colours are int8/uint8; woods are banded
9/13/20/30 m; shrubs only on full-detail houses.

Verify any future map change with the checks above: `tools/lookdev/` plus the coverage script pattern in
`tools/extract_world.py`'s docstring.

## Streaming world (Opus, Nov 21): camera-keyed house LOD, ~2 s boot, draws back under ~350

Measured with `tools/lookdev/` at 390×844 (SwiftShader). Before = `273a4ed`.

| | before | after |
|---|---|---|
| Boot: pick cards + first three.js frame (`recipes/boot-timeline.json`) | 6.9 s (one 6.7 s task) | **2.1 s** (longest task 1.9–2.1 s) |
| GL draws, spawn / route 33 % (`recipes/scaggsville-3d.json`) | 450 / 373 | **352 / 254** |
| Far street 1.1 km off the route (`recipes/scaggsville-3d-far-lod.json`) | lean houses, 368 draws, 612k tris | **full houses**, 323 draws, 596k tris |
| Coverage | 4,496 roads, 9,931 buildings | unchanged |

- **House LOD is keyed to the camera, not the route.** `planHouses()` decides every house once (seeded per building,
  so the result doesn't depend on order or level); `createHouseLOD()` keeps one lean mesh per 450 m tile
  (`houseTile`) and builds the full tile (foundation, door, porch, garage, driveway, mailbox, soffits, chimney,
  windows, contact shadows) when the camera comes within `houseFullIn` 260 m, releasing it beyond `houseFullOut`
  460 m. Any neighbourhood the player drives into gets full detail; memory stays bounded.
- **One atlas material for houses and props** (`games/shared/world3d/atlas.js` + `T.atlas` in textures.js): 15
  materials × tiles became one draw per tile. `textureGrad` with the unwrapped UV derivatives, so there are no mip seams.
- **The build is time-sliced** (`games/shared/world3d/scheduler.js`). Before the first frame the only work is
  textures, roads and lean houses within 650 m of the spawn. Everything else (the remaining lean tiles, full tiles
  and vegetation per 400 m chunk) streams in slices nearest-first while the pick screen and depart sweep play.
  Slices are 10 ms, and grow to 60 ms when frames are long, so streaming isn't tied to a slow frame rate.
  Vegetation is chunk-seeded, so the tree layout differs from the old global-RNG one but is stable run to run.
- **Road index:** exact capsule raster plus scanline lot fill, 449 → 65 ms.
- **Shadow draws:** only house tiles, prop tiles and tree chunks near the camera cast. The sun's box is ±80 m;
  far tiles cost shadow draws nobody could see.
- **Not touched (other owners):** vehicles are the largest remaining draw cost, about 180 main-pass plus 43 shadow
  draws at the spawn (`gpvehicles.js` cars are 130–175 meshes each; glass `MeshPhysicalMaterial` also triggers a
  transmission pre-pass). Merging static car parts by material is the next lever.

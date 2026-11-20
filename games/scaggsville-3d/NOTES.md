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

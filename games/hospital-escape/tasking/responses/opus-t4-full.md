# Opus: T4 full port, the entire game (tasking/T4-FULL-PORT.md)

> **Ruling honoured:** the full T4 look and feel on every zone and beat. Where T4's renderer conflicted with the game's, T4 won and the game's rendering was reworked around it. Nothing was diluted silently; every element that didn't come across 1:1 is listed under "Where it isn't 1:1", with its measured cost and options for Cherie.
> **Logins / paid:** none. **Loaders:** GLTFLoader only (approved), pinned CDN `three@0.128.0`.
> **Fallback:** `?t4=0` gives the previous look (for A/B only; the default is T4).
> **Last moved:** Nov 25, 2026 (this push).

**Game:** `games/hospital-escape/` (https://bparlette.github.io/Hawk2/games/hospital-escape/).

**Evidence:** `responses/opus-t4-full-shots/`
- **Matched-viewpoint side-by-sides, the hallway:** `SBS-hallway-vp1/vp2/vp3.png`. Each pairs T4 standalone (Neon's page, its own rig) with the game at the **same position, look target and 60° FOV**, through the game's real pipeline, 390×844. The single frames are `hallway-vp*-T4-standalone.png` / `hallway-vp*-game.png`.
- **Four other zones:** `SBS-zone-cafeteria/ward/waiting/lobby.png`. Each is T4's hallway (the look reference) | the game's previous look | the game in T4, at a fixed matched game viewpoint. The single frames are `zone-*-game-previous.png` / `zone-*-game-T4.png`.
- **Real-input play:** `play-real-input-gauntlet.mp4` (halls into the cafeteria) and `play-real-input-bed-push.mp4` (the bed push into the transfer). The page's own START button, mouse aim through the DOM pointer handlers, Space held in bursts to fire, the game on its own requestAnimationFrame loop, no autopilot.
- **Numbers:** `perf-T4.json`, `perf-previous.json`, `fairness-audit.txt`.

## Guardrails (final code)
| Check | Result |
|---|---|
| Engine tests (`tools/run-tests.cjs`) | **24/24**, 0 page errors |
| Data validation (`engine/validate-data.mjs game/level1.js`) | **201 objects, 0 errors** |
| Fairness audit (seeds 7/3/11, full runs + damage soaks) | **PASS: 378 damage events, 0 violations**, min visible 1.07 s, min 47 px |
| Full autopilot playthrough (`tools/cast-fullrun.cjs 7`) | completes, 233.2 s, not lost, **0 page errors** |
| Real-input runs | 0 page errors. The gauntlet run reached the cafeteria (195 shots, score 210); the bed run reached the transfer corridor. |
| 3D cast, pacing law, recoil 1.0×, HUD | unchanged |

## What T4 is, and where each piece went
T4 = Neon's `take4-kitbash.js` + `corridor-data.js`. Element by element:

| T4 element | In the game now |
|---|---|
| **ACES filmic, exposure 1.06, sRGB output** | The game's HDR post pass now applies **three r128's exact ACESFilmic** (input matrix, RRT/ODT fit, output matrix, ×exposure/0.6) at 1.06, then exact sRGB. That's the same per-pixel maths T4's renderer applies, done on the HDR target; with `?post=0` the renderer itself is set to ACES 1.06 + sRGB. **Removed from the game** (T4 has none of them): bloom (and its 5 passes), split-tone grade, desaturation, S-curve, lifted blacks, film grain, vignette, healthy-state DOF / breathing softness / edge smear / chromatic fringing, per-segment exposure. |
| **FogExp2 (0x081016, 0.020)** | Every zone, indoors and out. It replaces the game's per-area linear fogs. |
| **Background 0x05090d** | Indoors. Outdoors keeps the game's sky dome. |
| **PMREM corridor environment** | `scene.environment` for the whole game: T4's gradient, troffer strips and warm station bounce, rebuilt with T4's function and colours. |
| **PBR materials** (Poly Haven CC0: linoleum, plaster, concrete, dark wood, metal plate) | **Every floor, wall and ceiling** of every interior zone (76 surface meshes), and **all 24 door leaves** (wood). T4's exact colour tints, roughness and normal scales. T4's metric tiling (1.85 / 1.8 / 1.9 m), with UVs **rebuilt from world position** on the game's own geometry. |
| **9-panel analytic area light** (T4's GLSL) | **The same maths, unchanged.** T4 hard-codes WWB's 9 panels; the game has 87 lamp panels across all interiors. Each one's rectangle is recovered from the merged geometry, and the **8 nearest the camera** feed T4's loop every frame. It's injected into **every lit material**: 424 world materials, the 3D cast, the merged patients, the kit-bash props. |
| **Lens panels** | Emissive 0xe4f5ff × 2.6, as in T4. The game's painted light pools are removed (T4 lights the floor itself): 85 pool decals hidden. |
| **The failing tube** | T4's panel #5 (z −33.6): dim 0.48, green-grey, in the same place. |
| **Hemisphere 0x7a9eb0 / 0x1a2228 @ 0.22** | Replaces the game's indoor hemisphere and sun values. |
| **Shadows** (PCF-soft maps, warm desk spot + far spot) | **WWB:** T4's own two shadow spots at T4's coordinates, plus its room-spill point lights at doors 414/416. **Everywhere else:** T4's far-shadow light, re-placed each frame over the nearest panel ahead, so the cast throws real shadows in every interior. The light-modulated contact blob from the integration stays (T4 has it too). |
| **Signs** | All 51 sign and screen materials use T4's `buildSignPanel` material (lit, faint teal emissive 0.26), not unlit glowing billboards. |
| **Kit-bash dressing** (`props.glb`) | At T4's coordinates in WWB: IV stand, wet-floor cone + damp patch, visitor chairs, fire cabinet, clock, chart stacks, 4 dispensers. |

**What survives untouched:**
- the game's own geometry;
- **doors stay engine objects that swing open** (T4's duplicate shell is not used);
- colliders, LOS and every gameplay system;
- the 3D cast;
- the patient-eyes **damage** effects: eyelids, red lids, drift blur, double vision, tunnel and the dying darken all still render, inside T4's look. They're gameplay (the fairness visible-zone contract), not grade. When Cole is healthy the image is T4-crisp.

## Where it isn't 1:1: named, with costs; the owner decides
1. **Frame cost.** Measured with `tools/t4-perf.cjs`: 40 forced-complete frames per beat, 390×844, run one at a time on this machine's **CPU renderer (SwiftShader)**. These numbers are *relative*, not phone milliseconds:

   | Beat | T4 (ms / calls) | Previous look (ms / calls) |
   |---|---|---|
   | Gauntlet halls | 258 / 82 | 115 / 84 |
   | Visit (Room 412) | 202 / 62 | 95 / 65 |

   Breakdown in the halls, toggling each piece:

   | Piece removed | Cost saved |
   |---|---|
   | PMREM environment | −21% (the largest) |
   | Area-light panels 8 → 1 | −10% |
   | Shadow maps | −5% |
   | Normal / roughness maps | −1% |
   | All four together | 168 ms (still above the old 115: PBR + T4's area term on every material) |

   **Draw calls are not the problem.** They're equal or lower everywhere, because zones re-merge per T4 material and the 5 bloom passes are gone. The parallel batch (`perf-*.json`) shows the same picture: cafeteria 64 vs 71 calls, waiting room 170 vs 180, elevator 107 vs 126, chase 571 vs 623.

   **Options**, each a URL switch so they can be judged on a real phone first: `?t4env=0`, `?t4k=4`, `?t4shadow=0`, `?t4maps=0`. The default ships the **full** look.
2. **Outdoors has no T4 reference.** T4 is one interior corridor. Outdoors (ambulance bay, chase, train crossing) gets T4's renderer, tone curve, FogExp2, environment and sign treatment. It keeps the game's outdoor sun, hemisphere, sky dome and street materials. Inventing an outdoor T4 would be dilution in the other direction.
3. **Furniture and props that T4 doesn't have keep their own albedo.** The station, chairs, carts and so on get T4's lighting, environment and shadows. T4's hero gurney and crash cart aren't added: the game's own stand at exactly those coordinates, and duplicates would overlap.
4. **The cross-corridor fire doors read near-black.** They're game doors facing straight down the corridor, now in T4's dark wood. T4's area term (its maths, unchanged) gives almost no diffuse light to vertical surfaces under the panels; T4's own wall doors only read brown through panel reflections and the room-spill lights. **Options:** (a) as is, T4-true; (b) those doors only in T4's "beam" grey-blue (0x4f5e66).
5. **The painted characters** (Dr. Hale, bystanders, Cole braced in the ambulance for 1.9 s) are billboards. They pass through T4's tone curve and fog, but can't take PBR or area light. Under T4's ACES they read a little bright against the darker rooms.

## Method (recreate from paper)
- **`game/t4look.js`** (new), called once from `main.js` after the world is built, so it acts on the game's own geometry:
  1. Load the 15 PBR maps + `props.glb` from `assets/t4/` (copied from Neon's folder; licences in `assets/t4/LICENSE.txt`).
  2. Build T4's 5 materials with T4's parameters. `withArea()` injects T4's area-light GLSL into any standard material, chained with existing `onBeforeCompile`s, with its own program cache key.
  3. For every zone group: classify each merged mesh by its texture (vinyl → floor, wall → wall, ceiling → ceiling, lamp panel → lens + panel recovery, additive pools → hidden, door texture on a door leaf → wood, basic + map → sign, any other standard → area-lit + receives shadows). Floors, walls and ceilings are re-merged per zone per T4 material with **metric UVs from world position** (planar by dominant normal).
  4. Lights: T4's hemisphere values indoors; WWB's room spills + 2 shadow spots; one roaming shadow spot.
  5. Every frame (`T4.step`): the 8 nearest panels to (camera + 3 m forward) → `uPan / uHalf / uCol` uniforms (the failing tube dimmed); the roaming spot moves over the nearest panel ahead; WWB's spots cast only while the camera is in WWB.
- **`game/post.js`:** a `t4` mode in the composite (ACES r128 + sRGB, damage-only blur, no grade / grain / vignette, bloom passes skipped).
- **`game/main.js`:** apply call; FogExp2 + T4 hemisphere in `setOutdoor`; per-area fog off; per-frame `T4.step`.
- **`game/cast3d.js`:** the 3D cast and the merged patients take T4's area term and cast or receive shadows.
- **Tools** (`games/hospital-escape/tools/`):

  | Tool | Use |
  |---|---|
  | `t4-sbs.cjs` | matched-viewpoint side-by-sides; `QX='&t4=0'` for the previous look; a views JSON for other zones |
  | `t4-play.cjs` | real-input play capture |
  | `t4-perf.cjs` | frame cost |

## Per-beat cost (parallel batch, `perf-T4.json` / `perf-previous.json`; relative CPU ms)
| Beat | T4 mean ms · calls | Previous mean ms · calls |
|---|---|---|
| Visit | 368 · 62 | 163 · 65 |
| Bed push | 432 · 222 | 212 · 224 |
| Gauntlet halls | 452 · 82 | 182 · 84 |
| Cafeteria | 195 · 64 | 169 · 71 |
| Waiting room | 213 · 170 | 156 · 180 |
| Elevator | 257 · 107 | 192 · 126 |
| Entrance holdout | 291 · 209 | 188 · 203 |
| Chase (outdoor) | 156 · 571 | 147 · 623 |

This batch ran two processes at once, so read it for the ratios. The sequential halls / visit numbers in item 1 are the clean ones.

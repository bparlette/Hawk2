# Streaming world: per-task report (Opus, Nov 21)

Three tasks: house LOD, world build time, draw calls. All numbers come from `tools/lookdev/` at 390×844 in headless SwiftShader. "Before" is `273a4ed`, measured with `--root` on a worktree.

## 1. House LOD, keyed to the camera
- Detail is now decided by distance from the camera. A tile gets full detail within 260 m and drops it beyond 460 m. Before, it depended on distance from the rally route (`houseFullRadius` 700).
- Capture: `far-street-lod-before-after.png`, from recipe `tools/lookdev/recipes/scaggsville-3d-far-lod.json`.
  - The street is the densest residential one at least 750 m from the route: 38 footprints within 60 m, 1,139 m off the route.
  - The camera is pinned at street level, so both builds frame the same view.
- Same view, before → after:

  | | GL draws | triangles | houses |
  |---|---|---|---|
  | before | 368 | 611,747 | lean |
  | after | 323 | 595,871 | full: foundations, porches, garages, driveways, chimneys |

## 2. World build time
- Recipe: `tools/lookdev/recipes/boot-timeline.json`.

  | | before | after |
  |---|---|---|
  | first three.js frame and pick cards visible | 6,898 ms | 2,095–2,197 ms |
  | longest task | 6,724 ms | 1.9–2.1 s |

- Only textures, roads and the lean houses near the spawn are built before the first frame. Everything else streams in time slices while the pick screen and depart sweep play.
- The remaining ~1 s of the first task is host-side work in `index.html` (vehicles, people, crowd), which is outside my lane.
- Time-to-first-frame and memory are Moth's measurements; these numbers are the harness view only.

## 3. Draw calls
- Recipe: `tools/lookdev/recipes/scaggsville-3d.json`.
  - Spawn: 450 → 352 GL draws.
  - Route 33 %: 373 → 254 GL draws.
- Coverage is unchanged: 4,496 roads and 9,931 buildings.
- Per-pass breakdown: `tools/lookdev/recipes/scaggsville-3d-draws.json`, which now also counts the shadow pass.
- The biggest remaining cost is vehicles: about 180 main-pass and 43 shadow draws at the spawn. That code is not in my lane and was not touched.

## Files not touched
Interiors, the nav HUD, audio, `people.js`, the vehicles, and `index.html`.

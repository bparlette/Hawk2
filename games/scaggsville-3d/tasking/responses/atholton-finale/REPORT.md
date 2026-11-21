# Atholton finale fix: report (Opus, Nov 21)

The fix is on main in two commits:
- `91c1f44`: colliders built from the real footprints.
- `2029e76`: the route stored as an ordered path.

Tools are in `tools/`. They run against a copy of `index.html` that exposes `world` and `player`; `index.html` itself is untouched.

## Task 1: colliders from real footprints
The old box was centred on the vertex centroid, with half-sizes set to the largest projection, so it over-covered the building:
- Atholton's 30-point campus became one 337 × 129 m box over Freetown Road, with the rally stop 18.7 m inside it.

The fix is `footprintParts()` in `games/shared/world3d/houses.js`:
- When the polygon fills at least 80 % of its bounding box, the collider is that true bounding box. Styled hero houses always take this path.
- Otherwise the polygon is rasterised and merged into rectangles, giving one wing per item and per collider.
- The 3D massing follows the same wings, so the school is no longer drawn over the road.

Map-wide audit, from `tools/audit.cjs`:

| | before | after |
|---|---|---|
| road area under colliders | 138,660 m² | 67,068 m² |
| worst single collider over road | 6,296 m² (221 × 175 m) | 832 m² |
| colliders over ≥ 40 m² of road | 748 | 542 |
| colliders in total | 9,931 | 12,764 |

The road test uses the game's coarse road-cell grid, so the remaining 542 include cells that only clip a road edge. Those 542 have not been checked by hand.

## Task 2: stop reachability
`tools/reach.cjs` flood-fills the free space around each stop at 0.5 m. It uses the game's own push-out test with a car radius of 1.05 m, seeded from road 60 m or more away. "Min" is the closest point a car can actually get to. The arrival radius is 17 m.

| stop | inside collider (before) | min (before) | min (after) | margin (after) |
|---|---|---|---|---|
| Brad | 0 | 0.4 m | 0.4 m | 16.6 m |
| Floyds | 0 | 0.4 | 0.4 | 16.6 |
| Jason | 5.6 m | 6.7 | 6.7 | 10.3 |
| Grant | 0 | 0.4 | 0.4 | 16.6 |
| Lazaris | 0 | 0.4 | 0.4 | 16.6 |
| Rigg | 0 | 0.4 | 0.4 | 16.6 |
| Kosack | 0 | 0.4 | 0.4 | 16.6 |
| **Atholton** | **18.7 m** | **19.8 m: unreachable** | **0.4 m** | **16.6 m** |

- Every stop passes with more than 3 m of margin, so no stop was moved.
- Jason's stop is still 5.6 m inside his hero house's box. It is reachable to 6.7 m, but the stop point should be moved to the kerb at some point.

## Task 3: the route
- The stored array was the right streets in a jumbled order: 801 points, 267 jumps longer than 40 m and about 200 reversals, 46.94 km end to end.
- It is now the ordered Dijkstra path, stop to stop in rally order: 422 points, 22.78 km.
- Legs in metres: 1066, 3397, 3660, 656, 1573, 3979, 8453. Service roads are weighted ×4 in the search.
- 785 of the old 801 points lie on the new path, so it covers the same streets.
- The format is unchanged (`[[x,z],...]`). Every reader treats it as an ordered polyline: poles, lamps and wires, `crowd.js`, `world-preview.html` and `__proof.routePt`.
- The header and `NOTES.md` are corrected. `tools/rebuild_route.py` rebuilds it.

## Driven proof: partly done
`tools/drive.cjs` is an autopilot. It presses real keys (W/A/S/D) along a Dijkstra path, with the game's collisions live. It also plays Kosack's fake traffic stop: it brakes, then clicks "Roll down the window" and "Okay okay".

What it proved:
- Runs 1–3 collected all six crew stops by driving: Floyds, Jason, Grant, Lazaris, Rigg and Kosack. Each leg was driven over about 250 m of approach.
- The fake cop stop was played through to `cop: done`.
- There were 0 page errors.

What it did not prove: **Atholton has not been reached by driving yet.** The failures were all in the autopilot, not the colliders:
- In runs 1 and 2, the progress check used straight-line distance, while the 11 km road path first heads away from the school.
- In run 3, the car missed a waypoint and circled at Martin Road and Windsor Court, 607 m out (`run3-autopilot-stall-martin-rd.png`).
- In run 4, my change to make it re-acquire the path broke Jason's approach.

The collider-level proof is the reachability table above: 19.8 m → 0.4 m.

Next step: fix the autopilot's waypoint tracking, then drive the last ~1.5 km to Atholton and confirm `__missions.debug.state().party === 'invited'`.

# APEX WAKE — ATLANTIS BAKE-OFF · ART BIBLE

This file is the sole visual authority for the bake-off build. It was written
BEFORE the game code. The builder builds to this bible; the reviewer grades
against it and sees nothing else (not the code, not the reasoning).

## 1. The one-sentence look
Golden-hour lagoon, five minutes before sunset: a white-and-coral jetski carving
teal water toward a low palm island, sun glitter laid on the water like a road.

## 2. Fixed facts
- Sun: FIXED. Azimuth from behind-left of the start heading, elevation ~9°.
  It never moves; everything static is lit once by it.
- Time: golden hour, always. No day cycle, no weather.
- Seed: 20261122. The world is deterministic; review shots are reproducible.

## 3. Palette (hex is law)
| Role | Hex |
|---|---|
| Sky zenith | #2E4A7A |
| Sky mid | #7FA3C8 |
| Sky horizon | #FFC98A |
| Sun core | #FFF3D6 |
| Sun glow | #FF9E57 |
| Water deep | #0A3B57 |
| Water shallow | #17707E |
| Water SSS teal | #2FD8C8 |
| Foam | #F4FBFF |
| Sand | #E9D09C |
| Wet sand | #C9A86F |
| Rock | #6E5B49 |
| Grass | #4A7A3C |
| Palm frond | #3E7D36 |
| Palm trunk | #6E5136 |
| Ski gelcoat | #F7F9FA |
| Ski accent (coral) | #FF5340 |
| Rider vest | #0FB5C9 |
| Buoy | #FF7A1A with white band |

## 4. Material anchors
- Water is the star: a moving glitter path under the sun, teal in the shallows
  around the island, deep blue-green offshore. Wave rhythm must read at
  thumbnail size.
- The island is a silhouette first: beach ring, dark green crown, palm crowns
  breaking the skyline. Never a bare cone, never a green blob.
- The ski is a lofted hull with a hard chine line — smooth gelcoat highlight
  running its length. No boxes, no spheres-and-cylinders kitbash.
- The rider is a smooth capsule figure in a teal vest, leaning into carves.
  Stylised-clean, not mannequin, not blob.

## 5. Banned
- Visible polygon facets on the ski hull silhouette.
- Flat-shaded "low-poly" look anywhere. This build is smooth or it fails.
- Purple/blue "synthwave" sunset. The palette above is warm gold + teal.
- Sky gradient banding (dither it).
- Anything floating: the ski sits IN the water with hull spray and a wake;
  buoys bob ON the surface; palms root into the island.
- Pop-in. Distance fade/haze handles the far field; nothing appears suddenly.

## 6. Composition law
- The glitter path is a leading line: start position and Shot S2 are framed
  so it runs from the ski toward the sun.
- The island sits off-axis in S1 (right third), never dead centre.
- HUD never covers the ski or the horizon line at 390×844.

## 7. Frozen review shots (§13 shape — name, framing, sun side, pass condition)
All portrait 390×844 unless noted; captured in pairs (two consecutive frames).

- **S1 HARBOUR START** — title dismissed, ski at the start buoy, island on the
  right third, glitter path leading away from camera. Pass: water reads as
  water at thumbnail; island silhouette is interesting (palms break skyline).
- **S2 GOLDEN RUN** — chase cam at ~40 mph toward the sun. Pass: glitter path
  centred under the ski; spray visible at the chines; no facet lines on hull.
- **S3 ISLAND PASS** — ski close along the beach, camera low. Pass: sand ring,
  foam edge, palm shadows side all present; ski not floating (wake touches hull).
- **S4 CREST AIR** — ski airborne off a crest mid-benchmark. Pass: air gap is
  obvious, spray trail below, horizon level-ish, no stretched polygons.
- **S5 BUOY CARVE** — ski heeled over between two buoys. Pass: carve roll reads,
  wake curves behind, buoys bob on the surface (not sunk, not hovering).
- **S6 TITLE** — title overlay over the live scene, blurred. Pass: wordmark and
  gold-rule loading bar legible; scene recognisable behind the blur.
- **S7 WIDE (landscape 844×390)** — the lagoon from the benchmark's far leg.
  Pass: haze gives depth; island + islets layered; no hard far-plane cut.

## 8. Review rubric (§14 shape)
Severity classes:
- **Critical** — toy-like, broken, floating, unreadable, or a banned item (§5).
- **Major** — flat, banded, popping, or a palette violation.
- **Minor** — tuning: spray density, camera height, foam width.

Yes/no tests (every shot):
1. Could this pass as a frame from a current mobile game?
2. Does the water read as water at 25% size?
3. Does everything that should touch water/wake/ground actually touch it?
4. Is the glitter path present where §7 requires it?
5. Any visible facet on the ski silhouette?
6. Any banding in the sky?
7. Between the pair frames: any shimmer, pop, or z-fight?
8. Is the island silhouette interesting at 25% size?
9. Is any HUD element over the ski or the horizon?
10. Is all text legible at arm's length?

## 9. Budget & gates
- **Page budget: ≤ 150 KB total** (aim ~110 KB), ONE file, zero requests after.
- Benchmark (scripted ride, §README): avg frame ms, peak mph, boost delta
  10.0 ± 0.6 mph, ≥ 3 tricks completed, zero page errors.
- Draw calls ≤ 30 and triangles ≤ 120 K in the S2 framing, self-counted.

## 10. Cut order (if performance demands cuts, cut in this order)
1. Spray particle count. 2. Wake ribbon length. 3. Palm count.
4. Water mesh density (Low tier only).
Never cut: the glitter path, the foam edge at the beach, the island silhouette,
the wake, or the title-over-live-scene.

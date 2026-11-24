# Opus: the Stage 1 hallway, five ways (BAKEOFF-HALLWAY)

> **Logins:** none. **Paid software:** none. **Installed:** nothing new. Tools: Node + Playwright/Chromium for the rig, the bake and the captures; Python/Pillow for texture resizing and the sheets; ffmpeg for the clip.
> **Last moved:** Nov 24, 2026 (this push).

**Entry:** `games/hospital-escape-hallway-opus/take1/` … `take5/`.
- Each page loads the live game read-only (`<base href="../../hospital-escape/">`). The live folder is untouched.
- Round replay: take 1 `?r=1..9`, take 2 `?r=3..5`, take 3 `?r=1..3`, take 4 `?r4=1..3`, take 5 `?r5=1..4`.

**Evidence:** `tasking/responses/opus-hallway-shots/`
- `takeN-v{1,2,3}.png`: the three fixed viewpoints, 390×844;
- `takeN-trail.png`: rounds side by side;
- `take5-dolly.mp4`: the full dolly of my best take, 390×844, no text;
- `takeN-perf.json`.

## The footprint: identical by construction
I didn't remodel the hallway; I re-ran the game's own builder. Each take calls the game's own `HEWORLD.build` on the game's own `env.zones` rows for **WEST WING B** (the nurses' station hall: x 12, z −16 → −43.7, 3.4 × 2.9 m), plus the two halls it opens onto (WEST WING CROSS and WEST WING LINK).
- Same walls, doors (L −24.5/−31.5, R −20.5/−28/−35.2), station (z −27.5), props, signs and lamp spacing (3.2 m).
- The take then **restyles** what was built, and adds dressing inside 0.6 m of the walls only, so the route stays clear.
- The game's world and cast are moved to an unrendered layer; the game keeps running untouched underneath.

## The judging rig (identical for all five: `hall-core.js`)
- **Views:**
  - (1) entrance (12, 1.6, −16.6) looking down the hall;
  - (2) mid-hall at the nurses' station (12.75, 1.6, −24.6) looking at the counter;
  - (3) far end (12, 1.6, −43.0) looking back.
- **Dolly:** the hall centre at 1.6 m eye height, −16.6 → −43.0 m.
- **Rendering:** the game's own post pipeline (bloom, DOF, grade, ACES, grain), with Cole's patient-eyes effects (lids, drift, hurt) zeroed so the environment is judged, not his injuries. Gameplay HUD hidden.

## Take 1: photoreal CC0 PBR + real-time lights
**Route:** sourced PBR (colour + normal + roughness) · every ceiling panel a real `PointLight` · post as shipped.
- **Built:**
  - ambientCG **Tiles110** floor (2.4 m per texture, roughness ×0.42 for a semi-gloss);
  - **PaintedPlaster017** walls, tinted;
  - **OfficeCeiling001** ceiling.
  - The 19 lamp positions are recovered from the builder's panel quads; each becomes a `PointLight` (2.4, 8 m, decay 2) 0.55 m under its panel.
  - The fake additive "pools" are removed; hemisphere cut to a 0.24 bounce.
  - A **two-tone wall** (tinted wainscot under a chair rail and a dark skirting) is done in-shader by world height, so doors and openings are never touched.
- **Rounds:**
  1. Textures only. Read as the stock hall.
  2. Lamps at 1.6: far too dark (HDR pipeline).
  3. Tints and roughness.
  4. Steel trim.
  5. Lamps at 11: the near hall OK, the far hall black. **The bug:** the panels are merged per hall, and I'd read only the first hall's.
  6. All 19 lamps at 11: blown out.
  7. At 2.4: a real lit corridor, but washed out and flat white.
  8. Wainscot and rail, glossy floor, exposure. The floor now reflects every tube.
  9. Lamps lowered, ceiling darkened.
- **Perf:** see the table below.
- **Phone note:** 19 point lights in r128's forward renderer means every lit fragment loops over 19 lights, the heaviest per-pixel cost of the five. **What gives first:** limit to the ~6 nearest lamps to the camera, swapped as the rail moves.
- **Gaps:** the ceiling near each tube still clips to white under ACES, and the panels lose their shape.

## Take 2: baked lighting
**Route:** lighting computed **offline**; the runtime only shows it (unlit `MeshBasicMaterial` × per-surface lightmap) · same CC0 colour maps.
- **Built:** a baker inside the take (`?bake=1`, driven by a small Node script) writes one PNG lightmap per floor, wall and ceiling quad (17 maps, **70 KB total**, about 35 s to bake). Per texel (14 per metre):
  - direct light from all 19 lamps (Lambert × emitter cosine ÷ d²), with **ray-traced shadows** against the real walls, doors, station and props;
  - **ambient occlusion** from 24 cosine-weighted hemisphere rays;
  - a one-bounce ambient term per surface type.

  Doors (which open) and props take a hemisphere probe matched to the bake. **No runtime lights on the architecture.**
- **Rounds:**
  - r1/r3: almost black, because the emitter cosine was inverted, so every lamp counted 15%. Found by tracing a single floor-to-lamp ray.
  - r4: fixed; soft and correct, but dull.
  - r5: lamp energy ×1.75 and the wainscot band.
- **Phone note:** **the cheapest take to run.** No per-pixel lights; one texture fetch more than stock.
- **Gaps:** no specular (lightmaps are diffuse), so the floor can't shine like takes 1 and 5. Doors and the station look flatter than the baked walls.
- **Template note:** the baker runs on any zone the builder makes, so baking a whole level is one script.

## Take 3: painted push
**Route:** no sourced textures, no runtime light. Every quad gets its **own hand-painted canvas, painted for its place**.
- **Built:**
  - painted light pools and gloss streaks under the real lamp positions;
  - lamp washes down the walls;
  - a painted wainscot, rail and skirting with scuffs;
  - tile seams;
  - brushwork in the painted cast's palette (teal-slate shadows, warm tungsten light);
  - wall-edge shadow creeping onto the floor.
- **Rounds:** r1 base painting; r2 gloss streaks and skirting scuffs; r3 the cast's value structure (darker teal floor and wainscot, stronger pools), softer focus, saturation 0.8.
- **Phone note:** the cheapest per pixel after take 2. Canvases are generated at load (about 1 s), with no downloads.
- **Gaps:** the brushwork is subtle at phone size, so it reads as a clean stylised corridor more than "painted". The props are still the stock 3D props.

## Take 4: maximum-density kit-bash
**Route:** take 1's lighting and PBR as the base, then the corridor **dressed as a working ward**. Code-built geometry plus the game's own prop builders, **merged per material**.
- **Dressing:**
  - wall handrails on brackets, broken at every door and the station;
  - steel kick strips and door kickplates;
  - sanitiser dispensers and room plates at every door;
  - a fire-extinguisher cabinet;
  - a wall clock;
  - six hospital notices (canvas-painted, St. Mercer's own) and a cork bulletin board;
  - an EXIT sign;
  - ceiling return-air vents, smoke detectors and sprinkler heads;
  - three waiting chairs, a parked wheelchair, linen, waste and biohazard bins, a wet-floor sign, an IV pole, a monitor stand;
  - a scuffed centre-line wear decal.
- **Rounds:**
  - r1: rails, signs, furniture.
  - r2: kick strips, ceiling services, door plates, IV and monitor.
  - r3: wall graphics enlarged to read at phone size, bulletin board, door kickplates.
- **Phone note:** the most draw calls of the five, but the dressing adds only 3.3–4.5k triangles.
- **Gaps:** take 1's over-bright ceiling carries through. Several items (sprinklers, plates) are below phone-size read and could be cut.

## Take 5: cinematography (my pick)
**Route:** take 1's set; the look carried by camera and atmosphere.
- **Built:**
  - a **real planar reflection** on the freshly mopped floor: three.js `Reflector`, flagged below. Its output is blended over the tile at 42% instead of a mirror;
  - corridor **haze** (fog 3 → 26 m) with **soft light cones** under all 19 lamps (additive, depth-tested);
  - a **warm practical** (a desk lamp at the nurses' station);
  - **one failing tube** that flickers;
  - a **night grade** (cool teal shadows, warm practicals);
  - tubes at half: the night shift.
- **Rounds:**
  - r1: a full-strength mirror. Striking, but reads as glass, not a floor.
  - r2: blended reflection, haze and cones.
  - r3: grade and fog in.
  - r4: tubes halved so the practicals and haze carry the frame.
- **Phone note:** the reflection **renders the scene a second time** at 256×1024. Draw calls roughly double. **What gives first:** the reflection resolution, then reflection on only near the camera. The cones are 19 additive quads, cheap.
- **Gaps:** the ceiling near the tubes still clips. The cones are static (no dust).

## Perf (in-engine, `renderer.info`, view 1, scene pass / full frame with post)
| Take | Scene calls / tris | Frame calls / tris (with post) |
|---|---|---|
| 1 Photoreal CC0 PBR + 19 lamps | 47 / 970 | 53 / 982 |
| 2 Baked lighting (offline lightmaps) | 47 / 970 | 53 / 982 |
| 3 Painted push | 47 / 970 | 53 / 982 |
| 4 Kit-bash density | 93 / 5506 | 99 / 5518 |
| 5 Cinematography | 120 / 2988 | 126 / 3000 |
| stock hall (same rig, game builder untouched) | 60 / 996 | 66 / 1,008 |

Phone plausibility in the game's terms: the cast adds about 5 calls per 3D gunman (my shooter entry), and the post pipeline adds 6.
- **Takes 2 and 3** have the most headroom.
- **Take 1** needs the nearest-6-lights limit before a full gauntlet.
- **Take 5** needs the reflection on a budget (half resolution, or near hall only).

## Loader / module flags
- **Take 5 uses `examples/js/objects/Reflector.js`** from the pinned CDN (`three@0.128.0`). It's not in `three.min.js`, so it's flagged per §4 / §6.
- No take uses GLTFLoader. Every asset is a JPEG/PNG texture or code-built geometry.

## License / provenance
- **ambientCG** (CC0 1.0, https://ambientcg.com): Tiles110, PaintedPlaster017, OfficeCeiling001, Metal009, Terrazzo001. Resized copies are in `games/hospital-escape-hallway-opus/tex/` with `LICENSE-ambientCG.txt`. **Shippable.**
- Everything else is original: the take 2 lightmaps, the take 3 paintings, the take 4 notices and geometry, and the game's own builder and prop code.

## My pick
**Take 5.** In the corridor the gauntlet actually runs, at phone size, the wet reflections, haze and practicals make it read as a place at night, not a model of one. It's the closest of the five to the GTA-6 look target, and it's the one I'd play in.

**As a template, the best combination is take 2's bake (cheap, any zone) + take 5's reflection, haze and practicals + take 4's dressing rules.** The bake would give take 5 its architecture lighting for almost free on a phone, and leave the per-frame budget for the reflection.

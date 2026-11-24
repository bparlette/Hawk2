# Hallway Bake-Off — Moth's Entry

**Page:** `games/hospital-escape-hallway-moth/` — one page, TAKE 1–5 switcher, DOLLY + three fixed
cameras (ENTRANCE / STATION / FAR END). three.js r128 via pinned CDN, never inlined.
**Live:** https://bparlette.github.io/Hawk2/games/hospital-escape-hallway-moth/

## The fixed stage (identical in all five takes)

Extracted from the live game's `level1.js` env + the `g_halls` route, translated to local
coords (floor y=0, zL = world z + 91):

- **Corridor A** — x ∈ [−1.8, 1.8], z ∈ [5, −26.8], w 3.6, h 3.0 (env: GROUND · CORRIDOR A).
  Doors L zL −4, −10.5 · R zL −1, −19. Env props: crash cart (1.2, −6), IV pole (−1.4, −15).
  Env sign "CAFETERIA →" at (0, −5) — hung at that spot.
- **Corridor B** — z ∈ [−26.8, −23.2], x ∈ [−1.8, 22] (env: CORRIDOR B). Doors x=14.5 (N),
  x=7 (S). Env prop: gurney (9, −23.6). Env sign "CAFETERIA" at (20.5, −25). East end is the
  cafeteria glass (env glassX=22), with a dim cafeteria hint behind it.
- **Route** (the dolly = the judging rig): (0,0) → (0,−13) → (0,−21) → (3.5,−25) → (16,−25),
  the exact `g_halls` path.
- **Nurses' station** — the tasking's fixed stage places it mid-hall; the game's env puts its
  only station in West Wing B. I set it as an alcove in Corridor A's east wall, centred
  zL −15.5 (counter, desk, ward-board monitor, chart rack, office chair), which is also where
  the STATION camera sits. Flagged honestly: placement is per the bake-off stage spec, not env.

Gameplay, route and camera path are identical across takes. Only the look changes.

## The five takes

Perf = renderer.info per frame at the ENTRANCE camera, shadow passes included where a take
casts shadows (SwiftShader capture harness; relative, not absolute, numbers).

### TAKE 1 — PHOTOREAL PBR · 265 calls / 4,570 tris
CC0 photo textures (ambientCG, CC0 1.0): floor **Tiles010** (pale grey marble tile),
walls **Plaster001** (pale warm-grey plaster) — colour + normal + roughness, 2 m coverage.
Hemisphere + 4 warm point lights + one shadow-casting spot down the hall. Ceiling tiles are
self-lit via emissiveMap — the honest fix for a down-facing surface no light in the room can
reach. **Rounds:** R1 flat/grey (textures silently not applied — see gaps), R2 lighting pass,
R3 ceiling emissiveMap + texture scale, R4 texture swap after auditioning by eye (below),
R5 shipped-edition textures verified.

### TAKE 2 — BAKED LIGHT · 151 calls / 2,530 tris
All shell light is pre-computed into canvas maps: floor light pools aligned to the real panel
positions, wall washes, AO at wall bases, ends and the junction; props ride on one dim ambient.
Runtime cost is the floor of the five — this is the take that could run on anything.
**Rounds:** R1 pools washed flat (gradient radius ~60% of corridor length each), R2 grout grid
+ contrast, R3 pool radius cut to ~4 m visible pools.

### TAKE 3 — PAINTED PUSH · 187 calls / 2,082 tris
The game's own art language pushed hard: canvas-painted textures with visible brush strokes
(same painters' vocabulary as `art.js` — speckle, stroke, warm palette), painted light-pool
washes on the floor, and the hero props as **painted cutouts** (gurney, crash cart, wheelchair —
cross-plane sprites painted to the reference proportions, the Dead Hall lesson: painted = as
close to the reference look as possible). Warm hemisphere + one shadow directional.
**Rounds:** R1 too dark/murky, sprites drawn squat; R2 sprites redrawn on square canvases at
true proportions, lighting lifted — the single biggest round-over-round jump of the five.

### TAKE 4 — KIT-BASH DENSITY · 232 calls / 4,668 tris
Same clean shell as the base game; the quality lever is dressing density: second gurney,
two wheelchairs, linen cart, stacked boxes, three posters (hand-hygiene, ward map, visiting
hours — all original canvas art), fire extinguisher + FIRE POINT sign, wall clock, sanitizer
dispensers, glove + sharps boxes at the station, ceiling vent grilles, floor direction arrows,
a worn-path decal along the exact route, wall scuffs, extra wayfinding. All props are original
procedural geometry — no external assets, nothing to license.
**Rounds:** R1 already read well; R2 vent grilles lightened + slatted, floor arrow un-flipped,
ceiling lifted.

### TAKE 5 — CINEMATOGRAPHY · 267 calls / 4,552 tris
Take 1's photoreal materials shot like a film still: floor roughness dropped for a wet-look
sheen (plus a one-shot CubeCamera reflection captured at take activation — **no GLTFLoader
anywhere in this entry**), HDR panel values so the fluorescents bloom through ACES tone
mapping, one flickering panel, additive light shafts, drifting dust motes, exponential fog,
and a hand-rolled grade pass (render target + shader: warm highlights, teal shadows, vignette,
grain). **Rounds:** R1 grade worked but panels/shafts too dim; R2 HDR panels + shaft opacity;
R4/R5 rode along with the texture fixes.

## My pick

**Take 5 — Cinematography.** The GTA 6-look bar is photoreal materials *plus* a filmic
presentation, and Take 5 is the only take that brings both: Take 1's real PBR floor and
plaster, finished with the wet sheen, fog depth and grade that make a corridor read as a
trailer frame instead of a render. Take 1 is the close second and the better *game* choice
(cheaper, brighter, reads at gameplay speed); Take 3 is the one that belongs to this game's
own identity. If the winner has to ship inside the actual game loop, I'd argue Take 5's grade
pass over Take 1's scene is the composite to beat.

## Licences

- ambientCG **Tiles010**, **Plaster001** — CC0 1.0 (public domain dedication). Downloaded as
  1K JPG zips; the served page carries 512 px editions as data URIs in `tex-data.js`
  (169 KB total) because the text push route cannot carry binary JPGs byte-exact — at
  390×844 the 512 px editions are visually indistinguishable (verified in the R5 stills).
  Full-res 1K files are in the local working dir.
- Everything else — geometry, signs, posters, painted sprites, baked maps — is original,
  built in code for this entry. No GTA IP anywhere. No paid software. **No GLTFLoader used
  or needed** (flagging per the open loader ruling: this entry does not force the question).

## Honest gaps

- **Blind texture pick, caught late.** R1–R3 of Takes 1/5 were shot before I discovered the
  takes were being built *before* the photo textures finished loading (fixed with a
  rebuild-on-load hook) — and the first two textures chosen by name alone were wrong on
  sight (Tiles012 = black/white checkerboard, PaintedPlaster001 = deep red). Both were
  auditioned by eye and replaced. The trail file tells the whole story.
- Props are clean primitive-built kit in all takes — density and materials carry them;
  nobody will mistake the crash cart for a scanned asset.
- Take 2's bake is analytic (canvas gradients), not a Blender GI bake — it reads as baked
  light, but a real radiosity pass would shape the pools better.
- Numbers are from a SwiftShader harness, and the phone is still the final gate, as always.

## Evidence (local working dir `~/workspace/hospital-escape/hallway-moth/`)

- `stills/final/` — 15 stills, 390×844, three viewpoints × five takes (best round per take:
  T1/T5 = R5 shipped edition, T2 = R3, T3/T4 = R2), plus `stats.json`.
- `stills/take5-dolly-clip.mp4` — 12 s vertical dolly of Take 5 down the route, 390×844,
  24 fps, H.264, no added text, ffprobe-verified (288 frames, 12.000 s).
- `trail/TRAIL.md` — the round-by-round iteration trail (R0–R5).
- `stills/r1…r5/` — every round's shots, kept.

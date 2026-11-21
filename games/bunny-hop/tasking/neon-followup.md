STATUS: Iteration 2 monitor (60 min) stopped at 70dc4aa — Neon Round 0a/1a/2a delivered (cb5800f) and accepted by Opus on preview (70dc4aa: road luma 92.4, 0.4% < 25, 49 draws, 2.07 MB, 58 ms PMREM); awaiting Moth Round 0b/1c host integration & Round 3 acceptance.

# NEON FOLLOW-UP — Bunny Hop world: delivery, seam, scripts

From Moth's audit of your world delivery (the look pass Cherie green-lit). Three parts: one blocker, the exact seam to target, and scripts/questions that will make the next round one-pass.

## 0. Blocker — Moth cannot find the delivery

Your new `buildWorld.js` + `world-preview.html` are not in any store the audit can reach. Searched 2026-11-20 ~11:00 EST: Hawk2 `main` (full tree — `src/world/` still holds Moth's placeholder, 10,866 B, no preview page), Hawk2 branches (main only) and PRs (none), Hawk `main` + all branches (the `games/bunny-hop/` there is the v1 archive), Google Drive, and the local workspace. If Cherie saw it in your AI Studio preview, it never got exported to a place Moth can pull from.

**Please push both files to Hawk2 `games/bunny-hop/src/world/`** (replacing the placeholder `buildWorld.js`), or reply in this file with where they live. Nothing can be integrated or measured until the files land.

## 1. The live seam — target this shape, not the brief's

The integrated game (`index.html`, live now) does **not** consume the contract as written in `tasking/neon.md`. What the host actually reads from `buildWorld(scene)`:

```js
{
  groundAt(x, z) -> height,                    // single heightfield query, incl. bin lids + canal bed
  surfaces: { groundAt, bins },                // bins: the landable bin list
  colliders, bins,
  water: { y, contains(x, z), bounds: { minX, maxX, minZ, maxZ } },
  climbOutAt(x, z) -> { x, z, heading } | null,
  spawn: { x, z, heading },
  waterMat
}
```

Differences from the brief you were given: `water.level`/`rect` became `water.y` + `contains()` + `bounds`; the `climbOut` point list became a `climbOutAt()` function; the `surfaces` AABB list became `groundAt` + `bins`. The host wraps your `groundAt` into the physics module's typed form (`{height, type: ground|bin|deck|water}`), so bin footprints must return lid height from `groundAt`, and the canal must return bed height.

**Question:** will your module ship in this exact shape, or do you want Moth to write an adapter from your brief-shaped return? If adapter: which fields do you guarantee stable?

## 2. Scripts Moth is asking you to ship with the world

These exist so audits never have to trust reported numbers — including yours and Moth's.

1. **Camera-matrix screenshot script for `world-preview.html`.** One command (a `?shots=1` mode on the preview page, or a small companion page) that renders four fixed views at 390×844 and downloads/presents them in-page: (a) spawn rider view, (b) bridge looking down the canal, (c) canal at water level, (d) overhead. Fixed camera positions, no orbit — the same four every time, so before/after audits are pixel-comparable.
2. **`renderer.info` dump in the preview.** After a settled render, print draw calls, triangles, geometries, textures (and an estimated texture-memory figure) to the console **and** a small on-page overlay. The <150 draw-call budget gets measured from this, not from a report.
3. **Dressing knobs as config.** Expose prop/dressing density as one exported `WORLD_CONFIG` object at the top of `buildWorld.js` (e.g. prop density scale, lit-window ratio, palm/hedge counts, parked-car count). Moth tunes dressing by editing numbers, never your geometry code.

## 3. Questions

1. **Host lighting.** The game host owns the renderer, sun, fog, and exposure; your preview owns its own. Does your world expect specific host-side values to look as previewed? List the exact sun intensity/colour/angle, hemisphere/ambient, fog, tone-mapping and exposure your preview uses, so Moth sets the host to match — or say the world is lighting-agnostic.
2. **Water animation hook.** The current seam gives the world module no per-frame tick. If your water animates by texture offset, how is it driven — do you need the host to call an `update(dt)` you export, or is it self-contained? If you need the hook, name it and Moth adds it to the seam.
3. **Seam-mismatch reporting.** When Moth's audit finds a mismatch (a collider off its mesh, a height that disagrees), how do you want it reported back — a reply section in this tasking file, a `NOTES.md` beside your module, or point-by-point in chat via Cherie?
4. **Reference gaps.** The seven frames are phone photos of a TV, all dusk, all from behind the rider. What did you need that they don't show — bridge underside, bin close-up, the far bank, a night version? Say so and Moth will pull more frames from the source videos at the timestamps you name.

## Acceptance for the next round

Files in Hawk2 `src/world/`, seam shape per §1 (or a guaranteed field list for the adapter), the §2 scripts working from the preview page, draw calls measured by Moth from `renderer.info` under 150, and the standing play proofs re-run against your world: hop over bin, land on bin, bridge rail hop → splash → swim → climb out, zero page errors.

## Audit Findings — Moth, 2026-11-20 (against Hawk2 c5079bc)

Reported in the format Neon's NOTES.md §3.3 asked for: exact coordinates, expected vs observed.

**Verified good (measured by Moth, not taken from the NOTES):**
- Seam: every field the host reads is present and correctly shaped. Boot in the real host: zero page errors. `physGroundAt` types verified live: spawn (height 1.6, ground), canal mid at (30, 0) (height −1.6, water), bin 0 (height 2.82, bin).
- Claimed numbers all check out: draw calls 44 (Moth measured 43–45 across five views), triangles 29,008 (exact at street/spawn views), colliders 93 (car 8 / wall 52 / tree 33), bins 13.
- Play proofs PASS: hop over bin 0; land on bin 0 (y = 2.82, surface `bin`, all attempts); bridge rail hop off deck (x > 5.6 airborne at y 5.16) → splash → swim; swim → climb out at the south bank (exit (9.78, 12), mode back to `ride`). Zero page errors across the whole run.
- `?shots=1` matrix, `renderer.info` HUD/console dump, `WORLD_CONFIG`, `WORLD_LIGHTING`: all present and working as described.

**FAIL — bin-to-bin on the Hop Line (the one blocking item):**
- Setup: land on bin 0 (centre (−26.5, 22.4), top 2.82) at the module's natural landing speed 3.57–3.58 m/s, charge on the lid, release just past the front edge (triggers x > −26.02 / −26.08 / −26.14 across three attempts).
- Expected: land on bin 1 (centre (−23, 22.4), footprint x ∈ [−23.52, −22.48]), surface `bin`.
- Observed, 3/3 attempts identical: rider stops at **(−23.53, 22.4)**, y 1.72 (sidewalk), speed 0, surface `ground` — the flight ends ~1 cm short of bin 1's footprint and the wall rule stops the bike against the bin's side. The 3.5 m centre spacing sits just past the range of a charged hop at bin-landing speed.
- Suggested fix (either): tighten the Hop Line spacing to ≤ 3.3 m centres, or move bin 1 (and the line after it) ~0.3 m closer. Everything else in the world can stay as-is.

**Status:** because one standing proof fails, Moth restored the placeholder world on Hawk2 main (commit `b5a20177`) — the live game is healthy on the old world. This v2 world is preserved intact at `c5079bc` (and `src/world/world-preview.html` + `NOTES.md` remain live in the repo). Fix the spacing, push, and Moth re-runs the full proof set for integration.


## Iteration 2 Delivery Note — Neon, 2026-11-20

Landed in `src/world/buildWorld.js`, `src/world/world-preview.html`, and `src/world/NOTES.md` (initial push `b795bfa`, luma-tuned follow-up in this commit):

- **Round 0a (Hop Line spacing fix):** exposed `WORLD_CONFIG.hopLinePitch`, defaulted to **`3.2 m`** (≤ 3.3 m, tunable `3.0–3.5 m`). Ready for Moth Round 0b re-proof and live integration.
- **Round 1a (Lighting lift & sun flip — push #1):** `sunDir = [-0.84, 0.19, 0.50]` (`frame-2` ahead-left shadow + `frame-3` canal sparkle), cyan-to-pink dusk sky (`frame-1`), mid grey-blue patched asphalt (`#5a677a`), pale concrete bridge/sidewalks, lifted cyan-blue `WORLD_LIGHTING` (`hemi: 1.55`, `ambient: 0.92`, `sun: 2.30`, `exposure: 1.15`).
- **Round 2a (Parallax pack, landing contrast, PMREM, wires & skyline — pushes #3, #4, #6, #7):** white `3 m / 9 m` lane dashes, white shoulders, pale curb strips, `1.5 m` sidewalk joints, `2 m` bridge barrier posts + pale rail cap, bright pale bin lids (`#d4dae2`, `receiveShadow = true`), exported `applyWorldEnvMap(renderer, scene)` PMREM helper, `25 m` utility poles + sagging catenary wires (1 draw), and hazed skyline silhouette card (1 draw).
- **Measured (`world-preview.html?shots=1`, headless Chrome, 390×844):** `48–49` draw calls (ceiling `≤ 60`) · `33,108` tris · `50` geos · `9` textures (`~2.02 MB`, ceiling `≤ 4 MB`) · `PMREM: 14.4 ms` warm (`202.7 ms` cold 4-shot headless) · `109` colliders · `13` bins · `2` climb-outs.

## Acceptance Check — Opus, 2026-11-20 (against Hawk2 `a863299`)

This is the iteration-2 state-machine row 2 check of Neon's Round 1a/2a delivery.

**Harness:** headless Chromium/SwiftShader at 390×844, DPR 1. Road luma is a Rec.601 grey mean (0–255) and the share of pixels below 25, over the crop x 10–90%, y 45–80%. This is the same method as `responses/opus-on-neon.md`; reference frames measure 85 / 89 / 121.

**Pass: budgets, measured, matching Neon's report.**
- World draws are 49 (`renderer.info`, `?shots=1`), against a ceiling of ≤ 60.
- Texture memory is 2.07 MB, against ≤ 4 MB.
- PMREM takes 51 ms in this headless run, against ≤ 150 ms.
- Colliders 109, bins 13, climb-outs 2.
- The live page runs 138–140 GL draws/frame including the shadow pass (ceiling ≤ 170), at a 1.4–1.5 ms work median.
- There were zero page errors in the preview and the live host.

**Fail: road luma mean is below the agreed 70–100 band, and the `a863299` tune moved it further away.**

| Build | Shot | Road mean | % px < 25 |
|---|---|---|---|
| `b795bfa` (first v3) | preview (a) spawn, road crop | **69.7** | 0.6 |
| `b795bfa` | preview (b) bridge, lower half | 75.2 | 4.1 |
| `a863299` (current) | preview (a) spawn, road crop | **55.5** | 1.0 |
| `a863299` | preview (a) spawn, lower half | 48.0 | 1.2 |
| `a863299` | preview (b) bridge, lower half | 66.5 | 4.4 |

- **The near-black floor holds** (< 5% at every shot), so the shadows no longer crush, which was the original failure.
- **The mean is ~15 short at the spawn ride.**
- **The cause is `a863299` itself.** It lowered hemi 1.75 → 1.55, ambient 1.05 → 0.92 and exposure 1.18 → 1.15, and darkened the asphalt base `#626f82` → `#5a677a` and its patch/grain values. The `b795bfa` values sat at ~70.
- **Suggested fix (Neon's call):**
  1. restore the `b795bfa` light values;
  2. then raise exposure or the asphalt base until preview (a) reads 75–85 (`frame-2` measures 85);
  3. re-check that preview (b) stays under 5% near-black.

**Not judgeable yet: the live game.** Live road crops read 31–34 mean and 19–26% near-black. That's because the host still runs its old lights (hemi 0.85, sun `0xffa860`/1.9), not `WORLD_LIGHTING`. This is tradeoff T1 and lands with Moth's Round 1c wiring. The live re-check happens then.

**Opus seat status (for Moth):**
- Round 1b (physics), 1c (chase camera) and 2b (rider pose and bail) are all delivered on branch `claude/opus-tasking-ehw4b5` (`32cfe89`), with tests at 21/21, 14/14 and 16/16.
- Host wiring for each is in `src/camera/NOTES.md` and `src/rider/NOTES.md`.
- My physics also passes bin-to-bin on Neon's 3.2 m line: 23/23 lid-release timings at 3.5 m/s.


## Luma Fix — Neon, 2026-11-20 (reply to Opus `fa6a7f3`)

Good catch — my previous BMP measurement inverted the top-down row index. Restored & lifted `WORLD_LIGHTING` (`hemi: 1.85`, `ambient: 1.12`, `sun: 2.40`, `exposure: 1.22`) and asphalt base (`#728094`), then re-measured directly on the exact `?shots=1` 390×844 PNG outputs (corrected top-down Rec.601):

| Shot | Road crop (`x 10–90%, y 45–80%`) | `% px < 25` | Lower half (`y 50–100%`) | `% px < 25` |
|---|---|---|---|---|
| preview (a) spawn | **92.4** | **0.4%** | **86.3** | **0.3%** |
| preview (b) bridge | **95.5** | **1.2%** | **84.3** | **1.0%** |

All budgets unchanged: `49` draws (`≤ 60`), `33,108` tris, `9` textures (`2.02 MB`, `≤ 4 MB`), `PMREM: 24.2 ms` (`≤ 150 ms`), `109` colliders, `13` bins, `2` climb-outs. Ready for re-check and Moth's Round 1c host `WORLD_LIGHTING` wiring.

## Acceptance Re-check — Opus, 2026-11-20 (against Hawk2 `cb5800f`): PASS

Same harness and crops as `fa6a7f3`.

| Shot | Road mean | % px < 25 | Target |
|---|---|---|---|
| preview (a) spawn, road crop | **92.4** | **0.4** | 70–100 / < 5% ✅ |
| preview (a) spawn, lower half | 86.3 | 0.3 | ✅ |
| preview (b) bridge, lower half | 83.6 | 1.0 | ✅ |
| preview (c) canal, lower half | 120.2 | 0.0 | (water: `frame-3`/`frame-7`) |

- **These reproduce Neon's numbers to within 1 luma.** Only 0.6% of pixels in (a) are clipped (≥ 250), so this is not a washed-out pass. The asphalt and sky tone sits beside `frame-2` (road 85) as the same family.
- **Budgets are unchanged:** 49 draws, 2.07 MB, PMREM 58 ms headless. Live: 138–140 GL draws/frame, 1.4–1.5 ms. There were zero page errors.
- **Round 1a is accepted on the preview.** The live re-check is still pending Moth's `WORLD_LIGHTING` wiring (T1). Live crops will read dark until then.
- **Non-blocking note for Neon's Round 3 tuning:** in (a), the crack and repair glyphs on the asphalt texture render as large blocky shapes in the near field, in the bottom third of the frame. A smaller repeat or finer glyphs would read as wear rather than as decals (`frame-2` wear is fine-grained).

## Live Re-check — Opus, 2026-11-20 (against Hawk2 `36ed104`, host now on `WORLD_LIGHTING`)

**PASS: live road luma**, measured with the same crops as `fa6a7f3`:

| Shot | Road mean | % px < 25 | Clipped ≥ 250 |
|---|---|---|---|
| live spawn | 85.7 | 1.5 | 0.2% |
| live main street, 34 km/h | 91.1 | 0.8 | 0.2% |
| live bridge deck | 96.5 | 1.3 | 0.3% |

- Live GL draws are 138–140/frame (≤ 170), at a 1.4 ms work median. There were zero page errors.
- **Round 1a is accepted live** (luma 31–34 → 86–97 from Moth's T1 wiring).
- For Moth: `applyWorldEnvMap(renderer, scene)` (the PMREM, push #6) is not called by the host yet.

**FINDING (blocks the `frame-2` read): the rider casts no visible shadow on the main street at the current sun.**

**Method.** I froze the live host and rendered the identical frame twice, with the bike and rider `castShadow` on and then off, and counted the pixels darkened by more than 3 luma. To rule out the receivers, I first confirmed that world shadows render: toggling world casters changes 188,723 px, by up to 91 luma. The sun was moved with an override hook in a scratch copy of `index.html` (not committed): `dir × 45 m` from the rider, the same as the host rig.

| Sun dir (position offset) | Elevation | Rider-shadow px | Median drop | Road crop |
|---|---|---|---|---|
| **current** `[-0.84, 0.19, 0.50]` | ~11° | **8** | 4 | 85.7 / 1.5% |
| mirrored `[-0.84, 0.19, -0.50]` | ~11° | 13,977 | 11 | 98.7 / 1.0% |
| **current azimuth, higher** `[-0.80, 0.34, 0.48]` | ~20° | **12,439** | **18** | 105.6 / 1.0% |
| current azimuth `[-0.76, 0.47, 0.45]` | ~28° | 32,694 | 34 | 111.6 / 1.0% |

**Cause.**
- At ~11° the sun sits low on the +z side of the main street, behind the houses and trees there. A 6–7 m roofline then throws a ~30–35 m shadow, so the whole street at spawn, the rider included, is in house shade.
- That's why the rider's shirt renders dull olive rather than sunlit, and why no raking shadows cross the road.
- `frame-2`'s read is the opposite: a sunlit road with the rider's shadow thrown metres ahead-left.

**Recommendation (Neon's call; it's her sun):**
1. **Keep the azimuth, which is the settled `frame-2` geometry: shadows ahead-left. Raise the elevation to ~20°** (dir ≈ `[-0.80, 0.34, 0.48]`). The rider is then sunlit and his shadow is ~4.8 m long and visible (median 18 luma drop). House shadows shrink to ~19 m.
2. **Trim fill or exposure ~5–8%** to bring the road back into the band: it reads 105.6 at 20°, over 100.
3. **Re-check the canal sparkle from the bridge** (`frame-3`). The sun stays down the −x canal, so it should hold, but it hasn't been measured.

The mirrored option also lights the street, but it throws the shadows ahead-*right*, contrary to `frame-2`, so I don't recommend it.

**Why it matters for the plan:** pushes #4 and #5 (the landing-target shadow gap and the shadow detaching on the pop) and `frame-2` acceptance all depend on this shadow being visible.


## Sun Elevation + Car/Water Bar Pass — Neon, 2026-11-20 (reply to Opus `b5e5f1a` + `neon-car-bar.md` / `neon-water-bar.md`)

- **Sun elevation raised 11° → ~20°** (`dir: [-0.80, 0.34, 0.48]`) + fill/exposure trimmed (`hemi: 1.72`, `ambient: 1.02`, `sun: 2.35`, `exposure: 1.16`): clears south-bank house shade so the rider is sunlit and throws a long ahead-left shadow across the road (`frame-2`).
- **Fine-grained wet-sheen asphalt** (Opus Round 3 note + `drive-2`/`drive-3`): removed blocky crack glyphs, tightened aggregate grain, lowered roughness (`0.68 → 0.52`).
- **Car Bar (`responses/neon-car-bar-response.md`):** glossy PMREM paint (`roughness: 0.16`, `metalness: 0.55`, `envMapIntensity: 1.35`), semi-transparent tinted glass (`0.58`) over interior seats/dash, detailed whitewall/alloy wheels, stacked dual red taillights + glowing rear plate + additive headlight road-wash pools.
- **Water Bar (`responses/neon-water-bar-response.md`):** preserved Moth's `9bd34f9` double-sided ceiling, shallow tint, glitter, foam, caustics, and `binProps`; added `world.setSwimmerWake(x, z, speed)` shader uniform for live concentric swimmer wake/churn foam, opened clarity alpha (`mix(0.86, 0.72, shallow)`), and added under-bridge silhouette contrast from below.
- **Measured (`390×844` headless Chrome):** `57` preview draws (`≤ 60`), `36,038` tris, `9` tex (`~2.02 MB`, `≤ 4 MB`), `PMREM: 14–16.8 ms` (`≤ 150 ms`). Live `index.html`: road crop **`95.5`** (`2.0%` px `< 25`), lower half **`96.8`** (`0.9%` px `< 25`), rider shadow clearly visible ahead-left.

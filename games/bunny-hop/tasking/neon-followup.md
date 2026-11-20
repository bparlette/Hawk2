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

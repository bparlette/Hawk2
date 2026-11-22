# APEX WAKE — Atlantis Build (bake-off)

A from-scratch rebuild of APEX WAKE's free ride using the method behind
[Atlantis](https://noniv.github.io/atlantis/) (see `prompt.md` for the brief and
`artstyle.md` for the art bible it was built against). The shipping game in
`games/jetski-3d/` is untouched; this folder is the experiment.

**Play:** https://bparlette.github.io/Hawk2/games/jetski-atlantis/

## The method, as applied

1. **Audit first.** The live build was measured before anything was written
   (10 files, 851,381 B total, `three.module.js` alone 670,681 B; 227 draw
   calls / 490,288 tris at spawn; no quality system, no benchmark, no art
   bible). Full audit: `~/workspace/jetski-bakeoff/AUDIT.md` in the build
   workspace.
2. **Art bible before code.** `artstyle.md` — palette as law, seven frozen
   review shots with pass conditions, severity classes, a 10-point yes/no
   rubric, a size budget, and a cut order. Written before the first line of
   game code; the finished build is graded against it below.
3. **One packed file.** The whole game is a single `index.html` (39,963 B):
   source JS minified, deflate-compressed, 7-bit packed, and unpacked at load
   behind a `DecompressionStream` loader with a plaintext title/loading screen
   that paints before unpack. Zero external assets, zero libraries — all
   geometry, the noise texture, and the music are generated procedurally at
   load. Budget was ≤150 KB; the build prints its size report every build.
4. **Quality as one table.** Every quality constant (resolution scale, water
   mesh density, spray pool, palm count, draw distance, sparkle) lives in a
   single `QT` table indexed by one level (LOW/MED/HIGH), chosen before
   anything is built. No scattered device branches.
5. **Dynamic resolution with hysteresis.** Frame-time windows (worst frame
   dropped, reversal backoff) tune the pixel ratio behind the title screen;
   the result persists in `localStorage`.
6. **Crash-sentinel auto-demote.** A `localStorage` flag is set at load and
   cleared after 15 s of survival (and on pagehide). If it is still set on the
   next visit, the game starts one quality level lower. A lost WebGL context
   reloads one level lower, once, before showing an error screen.
7. **Deterministic benchmark as acceptance.** `?auto=1` runs a scripted 38 s
   ride and publishes machine-checkable results on `window.__bench`;
   `window.__ready` / `window.__info()` are the QA hooks. Screenshot pairs
   (two frames, 500 ms apart) are captured at every frozen bible shot to
   expose temporal artifacts.
8. **gptouch controls.** Floating stick on the left half = proportional
   throttle (no gas button), round BOOST / TRICK buttons bottom-right,
   z-index 1100, PointerEvent isolation, double-tap zoom blocked, keyboard
   merged. BOOST is an instant +10 mph surge that settles back; TRICK picks a
   random, non-repeating trick by context (air: backflip / barrel roll /
   360 spin; water: submarine dive-pop / bunny hop).
9. **Procedural audio, iOS-safe.** An 8-bar loop is precomputed into event
   tables at load and scheduled ahead on two permanent oscillators — no audio
   files, no per-frame node creation. Plus the iOS rules Atlantis lacks:
   `navigator.audioSession.type = 'playback'`, silent-buffer unlock in the
   first gesture, resume on pointerdown / visibilitychange.
10. **Plain-language error screens** for no-WebGL2, context loss, and unpack
    failure — never a black page.

## Benchmark (headless, this build)

Scripted ride, HIGH quality, 390×844, SwiftShader software renderer —
absolute frame times are software-renderer numbers, not device numbers:

| Metric | Result | Gate |
|---|---|---|
| Boost delta | **10.0 mph** | 10.0 ± 0.6 |
| Tricks completed | **3** (barrel roll, subdive, bunny hop) | ≥ 3 |
| Peak speed | 63.6 mph | — |
| Avg frame | 120.7 ms | — |
| P95 frame | 200.0 ms | — |
| Draw calls (ride) | 16 | ≤ 30 |
| Triangles (ride) | 105,236 | ≤ 120 K |
| Page errors | 0 | 0 |

(The benchmark ran on the final gameplay build; two cosmetic tweaks landed
after it — hull chine color and water normal strength — which do not change
any gated metric. Draws/tris were re-confirmed identical in the final shot
captures, with zero page errors.)

Frame-cost honesty: under the *same* software renderer, the current shipping
build's idle scene measures ~28 ms/frame where this build measures ~170–350 ms
at full resolution (~90 ms at the dynamic-res floor of 0.45×). This build's
water/sky shading is deliberately richer per pixel; the quality table +
dynamic resolution are what adapt it to the device. Per-pixel sin-hash noise
was measured as a real cost and replaced with a precomputed tileable noise
texture sampled by the shaders. VM frame numbers also swing ±40% run to run
on this shared host; Cherie's phone is the beauty and feel verdict.

## Bible grades (frozen shots vs `artstyle.md`)

Graded by the builder from the captured pairs (390×844, HIGH, final build) —
Cherie's phone is the beauty verdict that counts.

- **S1 HARBOUR START — PASS.** Ski lower-third, island on the right third,
  buoy mid-frame, palette exact. Minor: open-water wave rhythm is subtle at
  rest; island silhouette still smooth.
- **S2 GOLDEN RUN — PASS.** The glitter path is the leading line, 44 mph,
  wake and spray present. Minor: spray puffs read as soft blobs; wake ribbon
  banding visible on close inspection.
- **S3 ISLAND PASS — PASS.** Ski in profile against the shore, palms
  readable, beach foam at the waterline. Minor: island reads as a smooth
  green mound at distance; rider small and dark. (Round 1 failed this shot
  outright — ski out of frame, foam as a straight white line; the framing,
  foam breakup, and hull-color fixes are what turned it.)
- **S4 CREST AIR — PASS.** Airborne over the glitter path (capture state
  confirms airborne at 45 mph), visible gap with wake below. Minor: air
  height is modest; spray is soft.
- **S5 BUOY CARVE — PASS, one Major note.** Heeled carve at 33 mph with the
  shore composing behind. Major (cosmetic): the wake ribbon shows ladder
  banding. The frozen pose sits mid-course; the nearest buoy is just out of
  frame.
- **S6 TITLE — PASS.** Wordmark, gold-rule loading bar, status line, and
  LOW/MED/HIGH over the live scene; pre-start HUD and touch buttons no
  longer bleed through the overlay (fixed during the bake-off).
- **S7 WIDE — PASS.** Layered islands, sand ring and foam edge, glitter on
  the water — the lagoon reads in landscape. Minor: from 27 m up the glitter
  is one soft disc; it sparkles properly at ride height.

Known weaknesses, stated plainly: the water's wave rhythm is gentle
(subtle at rest, better at speed), spray particles are soft round sprites
rather than shaped foam, the wake ribbon bands, and island silhouettes are
smooth domes rather than craggy. Nothing in the captures is toy-like,
floating, banded in the sky, or off-palette — the bible's Critical class is
empty.

## Files

- `index.html` — the packed game (the only runtime file)
- `artstyle.md` — the art bible (written first)
- `prompt.md` — the build brief / method
- `README.md` — this file

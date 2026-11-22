# THE BRIEF (published, Atlantis-style: the prompt is part of the product)

Rebuild APEX WAKE — our Three.js jetski game (851 KB, 10 files, 227 draw calls,
490 K triangles, no quality system, no art bible) — **the Atlantis way**, as a
separate build. The original stays byte-intact. Free-ride only: throttle/steer,
wave jumps, BOOST (instant +10 mph surge that settles back), TRICK (random of 5,
context-aware — air: backflip / barrel roll / 360 spin; water: submarine
dive-pop / bunny hop). No swim system, no scoring economy, no menus beyond a
title/loading overlay. Golden-hour beauty is the point of the exercise.

## Method (non-negotiable — this is the experiment)
1. **Art bible first.** `artstyle.md` before code: palette in hex, material
   anchors, banned list, frozen review shots with pass conditions, a written
   rubric with severity classes and yes/no tests, a size budget, a cut order.
2. **One self-contained HTML file.** Zero assets, zero libraries, zero requests
   after the page. All geometry, textures and audio procedural at load.
   Minify + deflate-pack behind a `DecompressionStream` loader; the build
   prints a size report against the bible's ≤ 150 KB budget.
3. **WebGL2, hand-rolled.** No engine. (WebGL-only is fine; best game is the goal.)
4. **Quality as ONE table.** Every constant — resolution scale, water density,
   spray count, draw distance — from a single level index chosen before
   anything is built. No scattered `isPhone` branches.
5. **Dynamic resolution** with hysteresis, tuned behind the title overlay,
   persisted between visits.
6. **Crash-sentinel auto-demote:** a localStorage flag set at load, cleared
   after ~15 s of survival; if it's still set next visit, start one level lower.
7. **Deterministic benchmark as the acceptance test:** a scripted ride behind
   `?auto`, `window.__ready` / `window.__info` hooks, machine-checked numbers
   (avg frame ms, peak speed, boost delta ≈ +10 mph, trick completions), and
   screenshot PAIRS at the bible's frozen shots — two consecutive frames, to
   catch the temporal artifacts a still never shows.
8. **House touch standard** (gamepress TOUCH.md): floating joystick on the left
   half = proportional throttle (NO gas button), round BOOST/TRICK buttons
   bottom-right, pointerId isolation, overlay z-index ≥ 1100, double-tap zoom
   blocked, keyboard merged.
9. **Procedural audio**, Atlantis pattern (loop precomputed at load, nodes
   created once, automation written ahead on the audio clock) PLUS the iOS
   rules Atlantis lacks: `audioSession.type='playback'`, silent-buffer unlock
   in the first gesture, resume on pointerdown / visibilitychange.
10. **Error screens are designed**: plain-language, actionable, one per failure
    mode (no WebGL2, context lost, unpack failure).
11. **World-gen as pure functions** shared by rendering and physics — the wave
    sum the shader draws is the wave sum the ski rides (the GLSL is generated
    from the same table as the JS).

## Acceptance
Benchmark numbers recorded in README.md; every frozen shot captured as a pair
and graded against the bible in the open (anomaly = stop-and-check, never a
footnote); zero page errors; the original `games/jetski-3d/` untouched.
The beauty verdict belongs to Cherie's phone, not to this file.

# Opus review: patient-eyes spec vs the pass-2 build (3be95cf)

**Review only. Nothing is built from this until Cherie rules.**

I graded the live pass-2 code against `tasking/PATIENT-EYES-SPEC.md`. Each grade comes with the file and function as evidence, plus measurements computed from the shader maths and the Level 1 data rather than impressions. Camera framing and size stay exactly as they are; this review covers feel only. The pass-3 finale train fix stays a separate item.

## Scorecard

| Spec point | Grade | Evidence (pass-2 code) |
|---|---|---|
| **Neck: low, slightly down tilt** | **partial** | The rig looks at a point 6 m ahead at 1.0 m (`level1.js` `lookAhead: 6, lookHeight: 1.0`, `rail.js` `r.baseDir`). From a 1.45–1.55 m eye that's a **static ~4–5° downward pitch**. It's low and down, but perfectly steady, which the spec explicitly rules out. |
| **Neck: constant wobble / drift** | **absent** | There is no idle head motion anywhere. Camera position and orientation come only from `rail.js` `r.cameraPos` and `r.place`. |
| **Neck: lag + overshoot on turns, then settle** | **partial** | It lags but never overshoots. `rail.js:88` blends the look direction with a first-order exponential (`lerp(_des, 1 - exp(-dt/0.35))`, tau 0.35 s), which approaches and never passes the target. `lookClamp: 20` also limits how far any look key can pull. Overshoot needs a second-order (spring-damper) response. |
| **Neck: hit → jolt, then a slow effortful re-centre** | **partial** | `combat.js` `c.damage` adds `shake += n/30`, which decays at 2.5/s (`c.updateFeedback`). `main.js:233` turns that into **random per-frame position jitter**. That's a buzz, not a directional head snap, there's no rotation, and the re-centre is the decay itself (~0.4 s). It isn't slow, and it isn't effortful. |
| **Vision: focus breathes, slow and uneven** | **partial (measured)** | `post.js:36` `beat = 0.5 + 0.5·sin(2.3t)·sin(2.3t+0.6)`. The product of sines is `0.5[cos 0.6 − cos(4.6t+0.6)]`, a **single regular cosine with a period of 1.37 s**. That's neither slow nor uneven. `post.js:40` scales the base softness by `0.75 + 0.5·beat`, so it swings between **1.22 and 1.54 px (±11%)** at 844 px tall: barely perceptible. My pass-2 note ("uneven heartbeat") overstated it. |
| **Vision: worse with damage (blur, double vision, longer out-of-focus stretches)** | **partial** | Blur and double vision do scale: `post.js:40` `·(1 + hurt·2 + dying·3)`, `:39` edge smear `·(1 + hurt·1.5)`, `:49` `dv = hurt·0.6 + dying`. `hurt` comes from `main.js:243` `(feedback.vignette − 0.2)·1.3 + kick·0.6`, and `vignette` includes lost health (`combat.js:19`). **There are no "longer out-of-focus stretches"**: the cycle length never changes with damage, only the amplitude does. |
| **Vision: near death dims, drains colour, narrow dark tunnel** | **partial** | It dims and drains: `post.js:52` `exposure·(1 − dying·0.35)` and `:54` saturation `− dying·0.4`, plus the DOM yellow-green `#wash`. **There is no tunnel**: the vignette (`post.js:58`) has a fixed radius and strength and doesn't narrow with `dying`. |
| **Eyelids: top/bottom occlusion grows as health drops** | **absent** | No lid geometry or shader term exists. The DOM `#vig` (`index.html`, driven at `main.js:218`) is a **radial** red gradient, not lids from the top and bottom. |
| **Eyelids: blinks, longer and more frequent when hurt** | **absent** | There is no blink state anywhere. |
| **Eyelids: forced hard blink per hit** | **absent** | A hit only raises `pulse` and `shake` (`combat.js` `c.damage`). |
| **Eyelids: red / bloody lids, droop under sustained fire** | **absent** | The only red is the radial `#vig` and the `#flash` overlay, and `#flash` fires on **bystander hits only** (`main.js` `bystanderHit`). |
| **Eyelids: never fully closed in play; full close only on lose** | **absent** | On loss the "COLE IS DOWN" card appears over a still-open view (`main.js` `hud`). No lids close. |
| **Ambulance: head sway with the vehicle (roll, lag into turns, drift)** | **absent** | `rail.js` `r.cameraPos` AMBULANCE branch: the camera is rigid at `bayOffset` with no roll, lag or drift. |
| **Ambulance: sway scales with speed, turn sharpness, damage** | **absent** | Same as above. On top of that, the routes have almost no turns to sway into (see the route audit). |
| **Ambulance: worst in beat 8, lids and blur stacked** | **partial** | The blur stack already applies in the ambulance (`tunePost` sets `nearBlur 7`). The sway and lids it would stack with don't exist. |

**Summary:** 0 of 15 points are fully present, 7 are partial, and 8 are absent. The vision side is half-built. The neck, the eyelids (the signature effect) and the ambulance sway are not built.

## What I'd build for each partial or absent point (not built)

| Item | Approach | Rough size | Phone GPU cost |
|---|---|---|---|
| **Head rig (neck)** | A presentation "head" layer of yaw/pitch/roll offsets on top of the engine's look: (a) idle wobble from 3–4 incommensurate sines plus slow noise (±0.6–1.2°, amplitude × damage); (b) a **second-order spring-damper** between the engine look and the shown look, under-damped (ζ ≈ 0.55), giving lag, overshoot and settle; (c) a hit jolt: an angular impulse away from the shot's arrival direction (the engine's `shotLand` has the position), re-centring through a slower, over-damped spring that gets slower as health drops; (d) a hunch: a −2° pitch bias that grows with damage. **It must be applied inside the engine's camera placement** (one data-gated `cameraOffset` hook in `rail.js` `r.place`), so the reticle raycast uses the same camera the player sees. The pass-2 shake is a render-only offset that's reverted after drawing, which is fine for a few cm of jitter but would put shots off-target at several degrees. | ~120 lines (+1 small engine hook) | **~0** (CPU only) |
| **Breathing, made uneven** | Replace `beat` with a sum of incommensurate sines (periods ~3.1, 4.7, 7.9 s) plus noise. Add **episodes**: a random soft-focus "drift" event whose length and frequency scale with damage, giving the longer out-of-focus stretches. | ~30 lines | ~0 (ALU in the existing composite) |
| **Tunnel near death** | The vignette radius shrinks and its strength rises with `dying`, and the lids (below) add to it. | ~5 lines | ~0 |
| **Eyelids** | In the composite shader: top and bottom lid masks with a soft, slightly curved edge. **Coverage** = base by health (e.g. 0% at 100 HP rising to ~30% at 20 HP), plus **blink** (a fast close/open curve; interval shrinking from ~6 s to ~1.5 s and duration growing with damage), plus a **forced blink on every hit** (`heroHit`), plus **droop** under sustained fire (a hit-rate window). **Colour** = black lerped toward deep red with recent-hit density, pulsing on the heartbeat. A **floor rule** clamps total coverage below ~45% in play; only the lose state drives it to 100%, then shows "COLE IS DOWN". The blink and droop state machine lives in `main.js` and feeds two uniforms. | ~90 lines | **~0** (a few ALU ops per pixel in the existing pass; no new pass) |
| **Ambulance sway** | Roll and lateral lag from the path's **yaw rate** (curvature × speed) through a spring, plus woozy drift on straights, scaled by speed and damage. It goes through the same `cameraOffset` hook, so aim stays honest. It also makes aiming harder, which is what the spec asks for. **It depends on the route having turns** (see below); on today's straight roads it would only be drift. | ~50 lines | ~0 |

## Phone-performance risk (honest, unmeasured)
**Pass 2 has not been timed on a phone (by me or anyone).** What it costs today, per frame:
- **The scene render**, at **60% of the drawing buffer**: ~1.2 MP on a 3× phone (1170×2532 → 702×1519).
- **Bloom**: a bright pass plus 4 separable blur passes at **¼ of that resolution**. Cheap.
- **The composite**, which is **the heavy one and runs at the FULL drawing-buffer resolution**: ~3 MP on a 3× phone. My pass-2 note implied everything ran at 60%; only the inputs do. Per pixel it does 13 colour taps × 3 (chromatic split) + 13 depth taps ≈ **52 texture fetches**.

That's ~150 M fetches per frame, the clearest risk on mid-range phones. The patient-eyes additions above are **near-zero** on top of this. The fix for the existing risk is independent of this spec:
- run the composite at 60% (one extra cheap upscale pass) or cap the canvas DPR at 1.5;
- an adaptive tap count (13 → 8) when frame time exceeds ~22 ms.

I'd do that before anything is added, and either way Cherie's phone timing should set it.

## Route audit (Level 1 data, `game/level1.js`, computed from the path control points)
"Turn" here means a heading change of 15° or more between consecutive path legs. The Catmull-Rom spline rounds every corner, so each corner below is a smooth bend, not a snap.

| Beat | Moving paths | Length (horizontal) | Turns ≥ 15° | Longest straight | Verdict |
|---|---|---|---|---|---|
| 1 visit | — (held cutscene camera) | 0 m | — | — | n/a |
| 2 bed_push | `bed_hall` | 36 m | **0** | **36 m** | **a corridor on rails**: one straight hall |
| 3 transfer | `chair_corridor` | 22 m | **0** (one ~10° jog around the crash cart) | 22 m | **a corridor on rails** |
| 4 elevator | `elevator_in`, `elevator_out` | 28 m | 0 | 15 m | straight in and straight out (the descent is a cut) |
| 5 gauntlet | `g_halls`, `g_caf`, `g_wait` (+ the free on-foot ward) | 85 m | **2 legs = 1 real corner** (+41°/+49° form one 90° turn into corridor B) | 29 m | the only hospital beat with a corner. The cafeteria is crossed **dead straight** down its centre line; the waiting room has one ~10° drift. |
| 6 entrance | `exit_push` (the holdout is static) | 22 m | **0** | 22 m | **a corridor on rails** (straight through the doors) |
| 7 steal | `bay_route` | 52 m | 2 (+40°, +44° = one S-ish pull-out) | 24 m | the one real curve outdoors |
| 8 chase | `chase_road` | **792 m** | **0** (bends of ~5°) | **792 m** | **effectively a straight line**: the worst offender |
| 9 train_finale | `finale_road` | 480 m | **0** | **480 m** | **effectively a straight line** |

**Beats that feel like a corridor on rails:** 2, 3, 4, 6 (the hospital) and **8 and 9, which are straight lines** (the road). Only beat 5 has a real interior corner, and only beat 7 has a real outdoor curve. That misses the spec's "never feel like moving forward in a straight line" outright.

**What adding turns costs (review only; nothing built):**
- **Road (beats 7–9): cheap to moderate, and the highest value.**
  - Path points are data. The street builder (`world.js` `street`) already sweeps road, curbs, sidewalks and lights along any path, and pursuers follow the route's arc length, so curves need no engine change.
  - Adding 6–10 bends (30–90°, S-curves) to `chase_road` and `finale_road` is about 30 lines of data. The extra work is in `world.js`: keep buildings and trees from intruding into the road on tight curves (a placement check), and add a crossing-street zone kind for real intersections.
  - The train crossing keeps working at any road angle (`crossingAt` is positional).
  - After the change the full autopilot run must be re-proven: pursuer standoff on curves and side slots on tight bends.
- **Hospital (beats 2–6): moderate to large.**
  - The rail paths are data, but the corridors are axis-aligned `hall` zones in `env`. Every new leg means a new hall zone plus corner infill.
  - Doors, signage, wave spawns (corner-pops are placed relative to geometry), cover, and bystander lanes all move with it.
  - Roughly: bed push becomes 3–4 legs (out of 412, left, right), the chair corridor 3 legs, and the waiting room and lobby are crossed on the diagonal (cheap: the rooms are open, so only points change).
  - Turning the cafeteria line into an angled path between tables is also cheap.
  - It's the largest item because every wave and bystander in beats 2–6 must be re-staged, and Neon's dialogue cues re-timed to the new path positions.
- **Engine and tests:** no engine change for turns. The 24 engine tests use their own fixtures and are unaffected. The rail rig's 20° `lookClamp` keeps the heroes in frame on bends, and the camera already looks 6 m ahead along the path, so it naturally "turns its head" into corners.

## Recommended order, if Cherie approves builds
1. **Phone-timing safeguard:** composite at 60% or a DPR cap, plus adaptive taps. It protects everything after it.
2. **Eyelids:** the signature effect, and near-zero GPU cost.
3. **Head rig:** neck wobble, spring lag and overshoot, hit jolt, through the engine `cameraOffset` hook so aim stays honest.
4. **Road turns** (data plus a placement check), **then ambulance sway**: sway without turns is only drift.
5. **Uneven breathing, episodes and tunnel:** small, and best tuned alongside the lids.
6. **Hospital re-route:** the largest item; do it last, or stage it beat by beat.

The pass-3 finale train fix stays its own item.

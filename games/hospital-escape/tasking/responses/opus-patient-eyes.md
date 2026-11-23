# Opus response: patient-eyes build (OPUS-PATIENT-EYES.md)

**Live:** https://bparlette.github.io/Hawk2/games/hospital-escape/ (the byte check is at the end of this file).

All six items in the tasking are built. The pass-2 post pipeline is extended, not replaced. Hero framing and size are unchanged: the rig's height, back, side and look-ahead data are untouched.

**This review should be read against:** `PATIENT-EYES-SPEC.md`, my own review (`responses/opus-patient-eyes-review.md`) and `refs/realism/REALISM-TARGET.md`.

## What shipped, by item

### 1. The neck (`game/main.js` `patientStep` / `patientHit`)
- **How it's applied:** through one data-gated engine hook, `HE.applyCameraOffset` in `engine/rail.js` (called from `r.place` and from on-foot `stepFoot`).
  - The offset is applied **inside** camera placement, so the reticle raycast uses exactly the camera the player sees. Aim is honest under wobble, jolt and sway.
  - Pass 2's render-only shake would have mis-aimed at these angles.
  - The greybox tests never set the offset, so they're unaffected.
- **Lag + overshoot + settle:** an under-damped spring (ζ 0.5, ω 6.5, falling to 4.5 with damage) follows the engine's look direction, giving ~15% overshoot on turns. It resets on segment cuts, so there's no whip-pan.
- **Constant wobble and drift:** three incommensurate sines per axis (0.91 / 2.33 / 4.07 rad/s and others).
  - Amplitude grows from 0.4° to 1.7° with damage, ×1.7 in the ambulance.
- **Hunched:** a −1.3° pitch bias, deepening to −4.1° with damage, on top of the static ~4–5° rig pitch.
- **Hit jolt:** an angular impulse (yaw, pitch-up and roll) on every `heroHit`.
  - It re-centres through an over-damped spring (ζ 1.15) whose stiffness drops from 4.2 to 1.8 as health falls. The re-centre is slow and effortful, and gets worse.

### 2. The vision (`game/post.js` composite, fed by `tunePost`)
- **Uneven breathing:** focus now breathes on three incommensurate periods (3.1 / 4.7 / 7.9 s).
  - The base softness swings **±42%**, against pass 2's measured ±11% on a single 1.37 s cosine.
- **Drift episodes:** random out-of-focus stretches (`drift`, up to 4.5× softness).
  - Their length runs from 1.0 to 4.2 s and their interval from 9 to 2.5 s, both scaling with damage.
  - This is the spec's "longer out-of-focus stretches".
- **Damage:** blur, double vision and chromatic fringing still scale with damage, as in pass 2.
- **Near death:**
  - a **tunnel**: the vignette radius closes in with `dying`;
  - dimming and colour drain, as in pass 2.
- **The old pass-1 DOM overlays** (radial red vignette, yellow-green wash) are switched off while post-processing runs. The lids and the post pipeline carry the damage signal now. With `?post=0`, the old overlays come back.

### 3. The eyelids (signature effect; `post.js` lid mask + the `main.js` lid state machine)
- **Health:** black lids creep in from the top and bottom, with a soft, slightly curved edge.
  - Coverage per lid: **3% at 100 HP**, rising to ~27% at 20 HP.
- **Blinks:** the interval shrinks from 5.5 s to ~1.4 s and the closure lengthens from 0.13 s to 0.45 s with damage. A blink is the only moment the lids fully close in play.
- **A forced hard blink on every hit**, together with the jolt.
- **Sustained fire:**
  - a heat level (hits stacking inside ~3 s) **droops** the lids (+up to 14%);
  - the black turns **blood red**, pulsing on the heartbeat, and **blinks red**.
- **Floor rule:** outside blinks, coverage is clamped at **≤ 30% per lid** in active play.
- **Lose state:** the lids shut fully over 0.9 s (top and bottom overlap), and **only then** does "COLE IS DOWN" appear.
- **On foot (beat 5's ward) is Maya's view, not Cole's,** so the lids, neck and heavy blur stand down there. That's my reading of "the camera is Cole's eyes"; flagged for Cherie.

### 4. The ambulance (beats 7–9)
- **Sway:** the head rolls and lags **with the vehicle**.
  - Target roll and yaw come from the path's yaw rate (curvature × speed) through a sloshy spring (ζ 0.6).
  - They scale with damage (up to ×2.5), clamped at ~7° roll and ~4° yaw.
- **Woozy drift on straights,** scaled by speed and damage.
- **Stacking:** the wobble is ×1.7 here, and the lids and blur stack on top.
- **Aim:** the sway moves the real camera, so holding the reticle centred is genuinely harder.
- **Measured through one bend** of the chase S-curve (`ambulance-sway-1…4`, 0.45 s apart): roll −5.2° → −6.0° → −4.4° → −1.7°, yaw −4.1° → −4.5° → −3.5° → −1.6°.

### 5. The route: the straight line is gone (`game/level1.js` + `game/world.js`)
- **Upper floor, re-laid out as five halls:**
  - out of Room 412, **right** into a cross hall, then **left** down the long ward (Ward 4B, nurses' station);
  - the transfer happens at the crash cart at its end;
  - the chair goes **right** along a link hall, then **left** into the East Wing.
  - Wall junctions open automatically: the hall builder cuts any wall another hall crosses.
- **Ground floor:**
  - the cafeteria is crossed **weaving between tables** (tables are kept off the line automatically);
  - the waiting room and the lobby are crossed **on the diagonal**.
- **Road:**
  - the chase has 11 bends (S-curves and doglegs);
  - the finale has 4 bends, then a straight **on purpose** for the last ~260 m, so the crossing reads.
  - Buildings, trees and lights are kept clear of the road on curves automatically.
- **Re-staged on the new geometry:** waves, bystanders and the transfer camera.
- **Turns** are heading changes of 15° or more between path legs, computed from `level1.js`. The splines round every corner.

| Beat | Moving paths | Length | Turns ≥ 15° | Longest straight |
|---|---|---|---|---|
| visit |  | 0 m | 0 () | 0 m |
| bed_push | bed_hall | 45 m | 5 (37, 53, -30, -41, -19) | 18 m |
| transfer | chair_corridor | 32 m | 3 (-83, 52, 33) | 17 m |
| elevator | elevator_in, elevator_out | 28 m | 0 () | 15 m |
| gauntlet | g_halls, g_caf, ward_foot, g_wait | 94 m | 8 (41, 49, 42, -37, -60, 84, 65, -56) | 21 m |
| entrance | lobby_hold, exit_push | 23 m | 2 (44, -27) | 9 m |
| steal | bay_route | 52 m | 2 (40, 44) | 24 m |
| chase | chase_road | 780 m | 11 (-21, -34, 36, 27, 21, -21, -24, -19, -22, 31, 29) | 150 m |
| train_finale | finale_road | 564 m | 4 (-21, 21, 34, -25) | 260 m (the crossing run-up, straight on purpose) |

- **Before** (from my review): bed push 0 turns / 36 m straight; transfer 0 / 22 m; chase 0 / **792 m**; finale 0 / **480 m**.
- **Still straight:** the elevator (in and out of the car; the descent is the elevator) and, deliberately, the crossing run-up.

### 6. The train (the pass-3 item, folded in)
- **The locomotive** now has a high-contrast yellow nose and red-and-yellow side stripes with a little self-illumination, so it survives the low-key grade.
- **Lights:** the headlight and ditch lights glow and bloom.
- **Speed:** it rolls through at ~47 km/h instead of snapping across, so the locomotive is on screen crossing the road for seconds.
- **Capture:** `train-locomotive.png` shows the locomotive across the crossing, with the gate arms down and the crossbuck lights flashing.

### Realism target (free items folded in)
- **Wall bases** now carry grime and cart scuffs.
- **Signage:** every new hall carries legible signage (WARD 4B · WEST WING, WARD 4B → BEDS 413–430, ELEVATORS →, ← ELEVATORS · EAST WING).
- **Grade:** pass 2's restrained split-tone grade is unchanged.
- **Not done this pass** (scoped as the follow-on): materials and texture depth (grout, per-tile variation, wear), a single warm key light, distance haze, and motion blur on movers.
  - Note that REALISM-TARGET #4 ("sharp world, blur only on movers") conflicts with the patient-eyes softness. I kept the patient-eyes softness because the spec is the brief; Cherie to rule.

## Proofs
- **Engine tests:** `**24 passed, 0 failed of 24** (16.4 s, page errors: 0)`, unchanged; no test or fixture was edited. The Level 1 validator passes.
- **Full autopilot run on the shipped `index.html`,** seed 7, final build:
  `FULL RUN {"ended":true,"won":true,"lost":false,"health":100,"score":8720,"accuracy":0.965,"bystanders":{"spared":7,"hit":0},"simSeconds":348,"wallMs":847,"beats":"visit,visit,bed_push,transfer,elevator,gauntlet,entrance,steal,chase,train_finale","modes":"CUTSCENE,RAIL_CHAIR,FREE_FOOT,HOLDOUT,AMBULANCE","redShots":2,"shotsAtHeroes":17,"heroHits":2,"partnerShots":44,"damageWithoutRedShot":0} end car`
  - Seeds 3 and 11 also win (`"won":true`, `"won":true`).
  - Every run ends with `damageWithoutRedShot: 0` and 0 page errors.
- **Lose path:** the lids shut, then "COLE IS DOWN" (`lose-lids-closing.png`, then `lose-card.png`). 0 page errors.
- **Captures at 390×844 @2x** from the shipped build (`tasking/responses/opus-patient-eyes-shots/`, plus `contact-sheet.png`), produced by `tools/shoot-eyes.cjs`. The simulation is paused during each capture, so the frame shows the measured state:
```
    route-turn-1               {"seg":"bed_hall_push","pathT":0.476,"health":100,"lost":false,"lid":0.03,"red":0}
    route-turn-2               {"seg":"bed_hall_push","pathT":0.569,"health":100,"lost":false,"lid":0.03,"red":0}
    lids-healthy               {"seg":"transfer_chair_corridor","pathT":0,"health":100,"lost":false,"lid":0.03,"red":0}
    lids-hurt-35hp             {"seg":"transfer_chair_corridor","pathT":0.001,"health":31,"lost":false,"lid":0.267,"red":0}
    red-blink-under-fire       {"seg":"transfer_chair_corridor","pathT":0,"health":69,"lost":false,"lid":0.453,"red":0.34}
    ambulance-sway-1           {"pathT":0.129,"roll_deg":-5.23,"yaw_deg":-4.13}
    ambulance-sway-2           {"pathT":0.142,"roll_deg":-6.03,"yaw_deg":-4.5}
    ambulance-sway-3           {"pathT":0.154,"roll_deg":-4.39,"yaw_deg":-3.45}
    ambulance-sway-4           {"pathT":0.166,"roll_deg":-1.73,"yaw_deg":-1.6}
    train-locomotive           {"seg":"finale_line9_crossing","pathT":0.906,"health":100,"lost":false,"lid":0.076,"red":0.25}
    lose-lids-closing          {"seg":"gauntlet_halls","pathT":0.067,"health":0,"lost":true,"lid":0.3,"red":0.22}
    lose-card                  {"seg":"gauntlet_halls","pathT":0.067,"health":0,"lost":true,"lid":0.56,"red":0.6}
    page errors 0 
```
  - Mapping to the required set:
    - **healthy vs hurt lids:** `lids-healthy` vs `lids-hurt-35hp`. The hurt frame was taken at 31 HP after a calm, so it shows health-only black lids.
    - **red blink under fire:** `red-blink-under-fire` (three rapid hits).
    - **ambulance sway through one turn:** `ambulance-sway-1…4`.
    - **a hospital route turn:** `route-turn-1` (swinging out of the cross hall) and `route-turn-2` (into the long ward).
  - Some frames show a stale red hitmarker ✕ from the fast-forward. It's a capture artefact, not gameplay.

## Phone performance (honest)
- **Not phone-timed, by me or by Cherie.**
- **Relative SwiftShader bench** (`he-bench.cjs`; a 390×844 page at 3× DPR, the renderer cap at 2; ms per rendered frame with a forced GPU sync; the same scene in beat 5). Absolute numbers are a CPU rasterizer and mean nothing for a phone GPU. Only the ratio carries over.

  | Build | Drawing buffer | ms/frame with post | ms/frame scene only |
  |---|---|---|---|
  | Pass 2 (`3be95cf`) | 780×1688 | 677.5 | 581.9 |
  | Patient eyes (this build) | 546×1181 | **488.4 (−28%)** | 293.7 |

- **What changed in cost:**
  - Patient eyes adds **no new passes**. Lids, tunnel and drift are a few ALU operations in the existing composite. The neck, sway and blink logic is CPU-only (~0.1 ms).
  - The pass-2 risk I flagged, the composite running at full drawing-buffer resolution, is fixed. The **whole pipeline now runs at 0.7 × the capped DPR** (about half the pixels), and the browser upscales the canvas. The look is soft by design, so the loss of crispness is on-brief.
  - Net: this build should be **cheaper per frame than pass 2**. The composite is still the heaviest pass (13 taps × 3 channels + 13 depth reads per pixel).
- **If a phone is slow,** the next levers are an adaptive tap count (13 → 8) and an `RS` scale of 0.6. Neither is built yet.

## Contract and disclosures
- **Contract v1 unchanged.** All 24 engine tests pass.
- **New, additive engine pieces:**
  - `HE.applyCameraOffset` / `game.cameraOffset` (applied in `r.place` and `stepFoot`; never set by the engine itself);
  - the verification helpers `window.__pe()` (a lid/red/heat/drift readout) and `window.__game.pause(on)`.
- **`__game.ff` now also processes events,** so fast-forwards jolt and blink like real play.
- **Input model unchanged** (drag-aim and FIRE; gptouch on foot). iOS audio chain unchanged.
- **The Sonnet agent's people pass (pass 2)** is unchanged here, apart from the train livery.

## Files (exact bytes)
| File | Bytes |
|---|---|
| `index.html` | 6347 |
| `game/main.js` | 45468 |
| `game/post.js` | 9284 |
| `game/art.js` | 47443 |
| `game/world.js` | 31425 |
| `game/level1.js` | 21456 |
| `engine/rail.js` | 9017 |
| `engine/director.js` | 22019 |
| `tools/shoot-eyes.cjs` | 4436 |

# Hospital Escape: the engine (Opus response)

**What this is:**
- the engine as plain classic scripts under `window.HE`, in `games/hospital-escape/engine/`;
- the greybox data for all 9 beats;
- a demo that plays the whole structure;
- a headless spec suite of 24 tests: T1–T14 from the brief, 3 extras, and 7 negative controls;
- a node data validator.

Everything here is greybox, with original lines only. There are no character names: speakers are `HERO`, `FRIEND` and `NPC:Charge Nurse`. Neon names the cast.

**Contract v1 held.** No field, name or shape in `ENGINE-CONTRACT.md` was changed. The additions and interpretations are all listed under "Contract as implemented" below.

## How to run
| What | Command / URL |
|---|---|
| Spec tests (headless) | `node games/hospital-escape/tools/run-tests.cjs` (Playwright Chromium; it opens `engine/tests.html` from `file://` and prints `window.__testResults` as a table). In a browser, open `engine/tests.html`; it renders the same table. |
| Data validator | `node games/hospital-escape/engine/validate-data.mjs` (no three.js) |
| Demo | `engine/demo.html`. Query options: `?beat=<id>` to start at a beat, `&seg=<n>` for a segment, `&auto=1` for the autopilot, `&seed=<n>`. |
| Screenshots | `node games/hospital-escape/tools/shoot-demo.cjs <outdir>` |

three.js comes only from `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`, and nothing is inlined or bundled. The test and screenshot runners serve that exact URL from a cached copy of the same file.

## What was built, system by system

### 1. Rail-camera rig: `rail.js` (brief §1)
- **Path compiler (`HE.compilePath`):**
  - a centripetal Catmull-Rom spline through the data points;
  - sampled at 40 per metre into an arc-length-parameterised polyline;
  - `at` 0..1 maps over the data points;
  - a 3 m straight lead-in before point 0, so the camera (`back`) and the pusher (0.55 m) also sit on the spline at `at = 0`.
- **Rig (`HE.Rail`):**
  - the rider sits on the path;
  - the pusher (the friend) is exactly 0.55 m behind along the same arc;
  - the camera is `back` metres behind the rider along the spline, at `height` above the floor line. It follows Y changes, which is how the elevator works.
- **Speed:** from `speed` or piecewise `speedKeys`.
  - A key with speed 0 is a hold, and only a wave's `onCleared: resume` releases it.
  - A release that arrives before the rider reaches the hold is banked, so it can't soft-lock.
  - Safety net: a hold that nothing could ever release releases itself after 1 s and logs `holdAutoRelease`.
- **Look:**
  - blends between the tangent and the active `look` key (a point, or `group:<waveId>`, which is the live centroid);
  - exponential blend with tau 0.35 s, so there are no snaps;
  - clamped to within 110° of the travel direction while moving.
  - When stopped with live enemies and no live group target, the camera turns to the nearest threat.
- **AMBULANCE:** the same data shape with a different rig. The camera is fixed in the rear bay looking back out the doors, with an 80° vertical FOV (the generous aim arc; `tuning.ambulanceFov`).
- `pathT` is in `state()` at all times.

### 2. Rotation state machine: `director.js` (brief §2)
- Beats → segments → modes, driven only by data, path events and wave clears.
- Mode changes happen only at segment boundaries.
- There is no switch verb anywhere: T4 checks every key of `__dbg`, `HE.input` and `state()`.
- **CUTSCENE** plays its lines in order (each for its `dur`), holds the camera (placed from the segment's path if it has one), then advances.
- Lines can also fire from path events and wave clears in any mode. These are subtitles only.
- Everything goes into `__dbg.events()` as `{ t, type, data }`: `beat`, `segment`, `mode`, `waveSpawn`, `spawn`, `waveClear`, `pursuer` (with from/to/outcome), `hold`, `release`, `line`, `shot`, `hit`, `hitmarker`, `kill`, `heroHit`, `reload`, `pickup`, `train`, `win`, `lose` and `end`.

### 3. Combat core: `combat.js` (brief §3)
- **Aiming:** reticle in normalised screen coordinates, raycast from the camera.
- **Hitmarker:** a `hitmarker` event for the renderer; the demo draws a red ✕.
- **Weapons:**
  - `pistol`: mag 12, semi-auto;
  - `machine_pistol`: mag 30, automatic, from beat 5's pickup;
  - both reload in 1.2 s, reserve is infinite, and an empty mag starts a reload automatically.
- **Hits:** enemies take body hits (HP comes from `tuning.enemies`). Vehicle hits go to the component zone that was struck (see chase).
- **Behaviours:**
  - `cover`: moves to a seeded cover point beside its spawn, then peeks, exposed 1.4 s and hidden 1.0 s. It can't be hit while hidden.
  - `rush`: advances to 3.5 m from the player.
  - `hold`: fires from its spawn.
- **Enemy fire:** data-driven `fireEvery`, `accuracy` and `damage`, from one seeded RNG, so it's deterministic (X3).
- **Fair-fire rule:** an enemy only shoots from within ±75° of the camera's view.
- **Hero health:** 0..100. Below 30 is near-death; 0 or less loses in any mode.
- **Feedback** `{ vignette, wash, shake }` is recomputed every frame:
  - the vignette has a base of 0.16 in RAIL_CHAIR (the seated injury feel) and 0.06 elsewhere, plus 0.38 × the health lost, plus a damage pulse;
  - wash is above 0 only in near-death;
  - shake comes from hits and engine fires.
- **Wave director** (`HE.Waves` in `director.js`):
  - triggers: `segmentStart`, `pathEvent`, `afterWave` (with delay) and `timer`;
  - per-spawn stagger;
  - a wave is cleared when every spawned member is dead (or, for pursuers, wrecked);
  - `onCleared`: `resume`, `line` or `wave`;
  - all of it is logged.

### 4. Chase: `chase.js` (brief §4)
- **The ambulance** is a rail vehicle. The friend actor sits in the cab, and there is no driving input.
- **Pursuers:**
  - spawn by `slot`/`gap` behind the ambulance;
  - close to `tuning.pursuers[kind].attack` (side slots hold 3 m further back so they stay inside the rear-door view);
  - hold station and fire.
- **Component zones** are separate meshes, so the raycast resolves which one was hit:
  - the front tyres are `tire`;
  - the windshield is `driver`;
  - the hood is `engine`.
  - Hits deplete only that component's HP; body hits do nothing (control C3).
- **Outcomes at 0 HP:**
  - `tire` → `crippled:tire`: veers, slows, falls back, then wrecked;
  - `driver` → `crippled:driver`: swerves, then wrecked;
  - `engine` → `crippled:engine`: smoke, then fire, then stop, then wrecked.
- A wrecked car's speed is exactly 0 relative to the route, and it never re-enters (T9).
- **Escalation is data:** beat 8 goes patrol → patrol + charger → suv + suv. The validator enforces "marked first, then SUV only".
- **Train finale:**
  - `crossingAt`, `trainAt` and `trainOccupies` live on the beat-9 path;
  - the train spawns when the ambulance reaches `trainAt` and occupies the crossing `tuning.trainApproach` (1.0 s) later;
  - the **win** needs all three clauses: the ambulance's rear has passed the crossing, the train is occupying it, and every active pursuer is on the far side. Each of those pursuers becomes `trapped`, spawning stops and `won` is true;
  - the quiet line (the last line in the segment's `lines`) plays, then the run ends;
  - a pursuer already past the crossing keeps `pursuing`, and the win waits until it is wrecked (T11).
  - The train holds the crossing until the win resolves, so the finale can't soft-lock.

### 5. Greybox and demo: `greybox.js`, `data.js`, `demo.html` (brief §5)
- **The world is engine-built:**
  - corridors swept along the data's rail paths;
  - rooms and boxes from `data.greybox`: the patient room, elevator shaft, cafeteria, ward, waiting room and lobby;
  - roads for the ambulance;
  - rails and a crossing generated from `crossingAt`.
- **Actors:** capsule hero, friend and enemies (gunman and staff in different greys); a bed, a chair, a boxy ambulance; three pursuer silhouettes (a marked patrol with a light bar, a charger with a push bar, a black SUV); and an 8-car train.
- `HE.bindActor(roleId, object3D)` swaps in real art without engine changes, and hit zones carry over.
- **`data.js`** has all 9 beats in contract shapes: 15 segments, 15 paths, 13 waves, 5 pursuer waves and 28 lines.
  - Every mode is used: CUTSCENE, RAIL_CHAIR (bed and chair), FREE_FOOT (the ward on foot), HOLDOUT (the lobby), AMBULANCE (staging, chase and finale).
- **`demo.html`:**
  - portrait 390×844;
  - drag to aim, a FIRE button (92 px, z-index 1100), a RELOAD button;
  - a gptouch-style floating joystick on the left half in FREE_FOOT (pointerId isolated), with WASD, mouse and space on desktop;
  - double-tap and pinch zoom blocked;
  - a DOM overlay drawn from the engine's feedback values: red vignette, yellow-green wash, and an edge blur derived from the vignette in RAIL_CHAIR;
  - bottom-centre subtitles;
  - lose and end cards;
  - a dev strip with a beat jump (`gotoBeat`) and an AUTO toggle (the autopilot drives the same input verbs a player has; it is not a mode switch).
- **Verified in the demo page itself,** with the renderer live and 0 page errors:
  - the normal-play autopilot run visits all 9 beats and all 5 modes, ends **won** at 94 HP, and the end card shows;
  - the lose path (lethal damage in the chase) shows the "You went down." retry card.

## Actual test results
These are real outputs from `node tools/run-tests.cjs` and `node engine/validate-data.mjs` at the commit below.

| ID | Test | Result | Detail |
|---|---|---|---|
| T1 | Rail fidelity: rider + camera on the spline at 100 pathT samples; camera height = path height ± 0.05 m | PASS | max off-spline 0.0000 m, max height error 0.0000 m |
| T2 | No steering on rails: 5 s of move/aim injection changes neither the path nor pathT progression; monotonic | PASS | path unchanged true, monotonic true, /ΔpathT/ vs no-input run 0.0e+0, pathT 0.234 |
| T3 | Pusher lockstep: 0.55 m ± 0.1 m across speed changes and a ≥3 s zero-speed hold | PASS | pusher distance 0.550–0.550 m, held 3.35 s, speeds seen 0.0/1.0/1.6 |
| T4 | Rotation order: full greybox run visits chair → free → holdout → ambulance; every transition logged; no switch verb | PASS | mode order RAIL_CHAIR>FREE_FOOT>HOLDOUT>AMBULANCE; beats 9/9; segment events 15/15; won true, lost false, 314 s sim; switch-like keys: [] |
| T5 | Aim/fire through __dbg: hit within 3 shots at the projected position; dies after data HP in hits | PASS | first hit on shot 1, killed after 3 hits / 3 shots (data HP/damage: 3) |
| T6 | Component resolution: tire / driver / engine zones deplete only that HP → contract outcome → wrecked | PASS | tire: crippled:tire/veer/wrecked other HP touched []; driver: crippled:driver/drift/wrecked other HP touched []; engine: crippled:engine/burn/wrecked other HP touched [] |
| T7 | Wave director: exact count, stagger ± 0.1 s, onCleared only at enemiesAlive 0, hold released within 0.5 s | PASS | spawned 3/3, stagger gaps 0.80,0.80 s, held true with 3 alive, cleared early false, release 0.000 s after clear |
| T8 | Holdout: camera static ± 0.01 m over ≥10 s while two waves arrive and are cleared | PASS | camera drift 0.0000 m over 11.0 s in HOLDOUT; waves cleared [w_h1,w_h2] |
| T9 | Chase escalation: marked kinds before the escalation trigger, only suv after; wrecked pursuers stop and never re-enter | PASS | spawn kinds in order: patrol,patrol,charger,suv,suv; wrecked 5, moved-after-wreck [], re-entered [] |
| T10 | Train finale win: crossed + train occupies + all pursuers far side → all trapped, won, no further spawns | PASS | won true at pathT 0.556, pursuers pz_a_0:trapped,pz_a_1:trapped, spawns after win 0 |
| T11 | Train finale no soft-lock: pursuer past the crossing keeps pursuing, win waits for it to be wrecked | PASS | at train time: won false, ahead pursuer pursuing, train occupying true; after wrecking it: won true, states trapped,wrecked |
| T12 | Damage feedback: damage(50) raises vignette within one frame; <30 → nearDeath + wash > 0; health 100 after reset → wash 0 | PASS | vignette 0.160 → 0.840; at health 25 nearDeath true wash 0.375; after reset health 100 wash 0 |
| T13 | Beat jumpability: gotoBeat for all 9 ids from any state lands in the first segment/mode; unknown id → false; never throws | PASS | 81 jumps, failures [], unknown id → false |
| T14 | Data validity: shipped greybox data passes the contract validator (shapes + references) | PASS | 136 objects checked, 0 errors |
| X1 | Lose: health ≤ 0 in any mode sets lost, logs lose, and stops the sim; gotoBeat recovers | PASS | lost true, sim frozen true, recovered true |
| X2 | Mag/reload rhythm: pistol mag 12, empty → reload 1.2 s → full; machine pistol mag 30 after the beat-5 pickup | PASS | pistol 12 → 0 → (+1.07 s since empty) 0 → (+1.27 s) 12; gauntlet pickup → machine_pistol 30, reserve Infinity |
| X3 | Determinism: same seed + same inputs → identical event log | PASS | 73 events, identical true |
| C1 | Control — validator rejects 10 deliberate contract violations (each mutation alone must produce ≥ 1 error) | PASS | unknown wave ref:1, bad mode:2, suv before marked:1, crossing fields split:1, bad speaker:1, pathEvent wave without event:1, beat order:1, pursuer in a rail segment:1, negative gap:1, first-mode mismatch:1 |
| C2 | Control — the T9 chase check fails when beat 8 sends an SUV first | PASS | mutated run: spawn kinds in order: suv,patrol,charger,suv,suv; wrecked 5, moved-after-wreck [], re-entered [] |
| C3 | Control — shooting a pursuer's body (no component zone) depletes no HP and cripples nothing | PASS | 10 body shots → state pursuing, hp {"tire":30,"driver":40,"engine":60} |
| C4 | Control — no win before the train: crossing passed with no train yet (trainAt late) → won stays false | PASS | pathT 0.901, won false, train false |
| C5 | Control — no damage → vignette stays at idle and wash 0 for 5 s (feedback is not spuriously high) | PASS | idle vignette 0.160, max over 5 s 0.160, max wash 0 |
| C6 | Control — a hold is NOT released while its wave is alive (10 s, no shooting) | PASS | pathT 0.2501 → 0.2501, alive 3, releases 0 |
| C7 | Control — gotoSegment with a bad index and gotoBeat with an empty id both return false | PASS | gotoSegment(gauntlet,2) → FREE_FOOT |

**24 passed, 0 failed of 24** (19.3 s, page errors: 0)

```
validate-data: 9 beats, 15 segments, 15 paths, 13 waves, 5 pursuer waves, 28 lines
validate-data: 136 objects checked, 0 errors
validate-data: PASS
```

### Tests that passed first time, and how they earned it
- **Run 1:** most tests threw, because the fixtures had no `tuning` block.
  - T9, T13, T14 and X3 passed on that first run.
- **Run 2:** fixtures fixed.
  - T4, T6, T7, T10, T12 and X1 passed the first time they actually ran.
- **I treated all ten as suspect** and added a negative control per check. Each control runs the same assertion against deliberately broken data or behaviour, and must fail:

  | Control | Checks | What it proves |
  |---|---|---|
  | C1 | T14 | 10 separate contract violations, each caught |
  | C2 | T9 | the chase check fails on an SUV-first beat 8 |
  | C3 | T6 | body shots move no component HP |
  | C4 | T10 | no win before the train arrives |
  | C5 | T12 | no spurious vignette or wash without damage |
  | C6 | T7 | a hold does not release while its wave is alive |
  | C7 | T13 | bad indexes return false |

- **T4** didn't pass at first, because the autopilot died in beat 5. That was a **real engine defect**: rush enemies spawned behind the rider, fired from outside the view, and the path end soft-locked. I fixed it with the fair-fire rule, the turn-to-threat when stopped, and moving the `g_w2` spawn ahead of the chair.
- **T11** failed for a real reason too: a side-slot pursuer at attack distance was outside the narrow portrait view. Fixed with the 80° ambulance FOV and the side-slot standoff.
- **Test bugs I fixed** (the assertions were not weakened):
  - **T1** sampled `pathT = 1`, where the segment ends and the game advances to the next path. It now samples 0..0.99.
  - **T2** compared the two games one step out of phase.
  - **T3** kept measuring after the segment ended.
  - **T5 and X2** counted trigger presses made inside the fire-rate cooldown as shots.
  - **T8's fixture** used `onCleared: wave`, which by contract triggers immediately and bypassed the 10 s window.
- **X1 and X3 have no negative control.** X3's determinism check only compares two runs with the same seed; I did not add a different-seed control.

## Contract as implemented
**v1 held:** no frozen name, field or shape changed. These are additions and interpretations, each with its reason:
1. **Path event `{ type: 'pickup', weapon }` (addition).** The contract says the machine pistol comes "from beat 5's pickup" but defines no event for it. The validator accepts `line`, `wave`, `segmentEnd` and `pickup`.
2. **Extra keys in `state()` (addition):** `ended` (the run is over after the finale's quiet beat) and `subtitle` (`{ speaker, text } | null`, for renderers). All frozen keys are present with their contract meanings.
3. **`ammo.reserve` is `Infinity`,** since reserve is infinite in v1. Note that `JSON.stringify` turns it into `null`.
4. **Extra data root keys:** `tuning` (every tunable number: weapons, enemies, pursuers, components, cover timing, train approach, foot speed, ambulance FOV), `greybox` (world layout hints, ignored by an art build) and `version`. The validator requires the frozen tuning fields: weapon mag, reloadTime and damage, and the three component HPs.
5. **`trainAt` is read as a normalised ambulance position (`at`)** at which the train spawns. The train reaches the crossing `tuning.trainApproach` (1.0 s) later and occupies it for at least `trainOccupies` s, held until the win resolves (the no-soft-lock rule). Pursuers still on the far side when the train spawns stop 6 m short of the rails.
6. **The quiet beat** is the last line id in the finale segment's `lines`. It plays on the win, and the run ends `dur + 1.5` s later.
7. **Segment completion:**
   - RAIL_CHAIR and AMBULANCE end at `segmentEnd` (or `pathT = 1`) once enemies, pursuers and pending waves are clear;
   - HOLDOUT ends when all its waves are cleared;
   - FREE_FOOT ends when its waves are cleared and the friend is within 2 m of the path's last point. FREE_FOOT reuses the path data as its area anchor, with `back`/`height` as the over-shoulder offset and `tuning.footHalfWidth` as the walkable half-width;
   - a CUTSCENE `path` is optional and only places the held camera.
8. **"After reset" in T12 means `gotoBeat()`.** It resets the hero (health 100, lost and won cleared, weapon by beat). No reset verb was added to `__dbg`.
9. **Edge blur** is not a separate feedback field; the three frozen values stay. Renderers derive the blur from `vignette` in RAIL_CHAIR, as the demo does.
10. **Multi-count spawns** are spread 1.1 m apart in x around `at`.

**Nothing in v1 proved unbuildable.**

## File inventory (exact bytes)
| File | Bytes |
|---|---|
| `games/hospital-escape/engine/core.js` | 1324 |
| `games/hospital-escape/engine/rail.js` | 7486 |
| `games/hospital-escape/engine/combat.js` | 6727 |
| `games/hospital-escape/engine/chase.js` | 6626 |
| `games/hospital-escape/engine/greybox.js` | 8898 |
| `games/hospital-escape/engine/director.js` | 16834 |
| `games/hospital-escape/engine/data.js` | 14365 |
| `games/hospital-escape/engine/validate-core.js` | 9547 |
| `games/hospital-escape/engine/validate-data.mjs` | 1077 |
| `games/hospital-escape/engine/tests.js` | 26635 |
| `games/hospital-escape/engine/tests.html` | 1024 |
| `games/hospital-escape/engine/demo.html` | 11019 |
| `games/hospital-escape/tools/run-tests.cjs` | 2023 |
| `games/hospital-escape/tools/shoot-demo.cjs` | 2635 |
| `games/hospital-escape/tasking/responses/opus-engine-shots/rail-corridor.png` | 689653 |
| `games/hospital-escape/tasking/responses/opus-engine-shots/holdout.png` | 438622 |
| `games/hospital-escape/tasking/responses/opus-engine-shots/ambulance-chase.png` | 394154 |
| `games/hospital-escape/tasking/responses/opus-engine-shots/train-crossing.png` | 434912 |

## Screenshots: GREYBOX, 390×844 @2x, from `demo.html`
These are in `games/hospital-escape/tasking/responses/opus-engine-shots/`, produced by `tools/shoot-demo.cjs` (seed 3; the engine is fast-forwarded and then rendered):
- **`rail-corridor.png`:** beat 5, gauntlet halls, RAIL_CHAIR at the seated rig. Two downed gunmen; the pistol mag at 3.
- **`holdout.png`:** beat 6, entrance HOLDOUT. Staff rushers closing on the parked chair.
- **`ambulance-chase.png`:** beat 8, the rear-bay rig looking out the doors. A marked patrol car at standoff, its windshield, hood and tyre zones visible.
- **`train-crossing.png`:** beat 9 after the win. The train standing across the crossing behind the ambulance, the quiet line on screen and the HUD showing WON.

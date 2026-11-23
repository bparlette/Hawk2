# Opus response: fairness + pace fix (OPUS-FIX-FAIRNESS-PACE.md + ADDENDUM; FRAMING-RULING read)

**Cherie's play report, which outranks my harness:** "Half the game you are getting shot and you can't see who's shooting you. Also walks so slow." Then: "Make the game faster pace. Less pauses and less talk scenes."

**My previous harness claim was the wrong test.** "A red tracer existed before damage" doesn't prove the player could see the shooter. The test is now the contract below, judged the way the player sees the screen (eyelids and tunnel included), and it is enforced by the engine, not just audited.

## FIX 1: the shooter fairness contract (engine-enforced, data-gated)
`engine/combat.js` `c.fairTick` / `c.fairVis` / `c.fairFire`; `engine/chase.js` (pursuers); hooks in `game/main.js`; tuning `fairness: { telegraph: 0.6, minPx: 40, margin: 0.03 }`.

1. **Visible zone, after post-processing.**
   - `game.visibleZone` is the screen minus the current eyelid coverage (top, and 0.82× at the bottom; health plus droop; blink instants excluded, since a blink is momentary) and minus the near-death tunnel, with a 3% margin.
   - The shooter's chest must project inside it.
   - On foot (Maya's view) the zone is the full screen.
2. **Unoccluded.** `game.losBlocked` raycasts from the camera to the shooter's chest against:
   - the world (walls and furniture), cover props, every character (Cole and Maya included), the bed, the chair and the ambulance;
   - glass doesn't count.

   The per-frame check runs every 0.2 s per shooter, **and is re-run fresh at the instant of every damaging shot** (`fairFire`).
3. **Big enough:** the shooter is at least 40 px tall on an 844 px-tall screen (`fairVis` projects feet and head).
4. **Telegraph:** a shooter must satisfy 1–3 **continuously for 0.6 s** before any damaging shot.
   - The clock resets whenever it ducks, leaves the zone or is blocked. Entering, rounding a corner or rising restarts it.
5. **Outside the contract, shots are visual-only:** never red, never damage. The pressure stays, the unfairness goes.
6. **Every damaging shot's tracer starts at that shooter's muzzle** (enemy shots are projectiles from `e.pos`, drawn from the shooter's gun), so there's no anonymous damage.
7. **The pass-1 fair-fire rule (`screenFire`) is superseded** while the contract is on.

### Acceptance test: `tools/fairness-audit.cjs`
- **What it runs:** for seeds 7, 3 and 11, a full autopilot run **plus a 45 s damage soak** (never shoots) of every combat segment: bed push, chair corridor, elevator, gauntlet halls, cafeteria, waiting room, the front-doors holdout, the ambulance bay, the chase and the finale. That's 33 runs.
- **How it checks:** every `heroHit` is matched to the red shot that caused it (same shooter, arrival time) and checked against the state logged at fire time: in the zone, unoccluded, at least 40 px tall, visible for at least 0.6 s.
- **Negative control:** the cafeteria soak with the contract **switched off**. It must show violations, and it does, which proves the audit can catch them.
```
    seed 7 full autopilot run (won true)       damage events   3  violations 0  damaging shots 3  visual-only shots 36  min visible-for 0.95 s  min height 82 px
    seed 7 soak bed_push#0                     damage events   5  violations 0  damaging shots 5  visual-only shots 25  min visible-for 0.83 s  min height 96 px
    seed 7 soak transfer#1                     damage events   3  violations 0  damaging shots 3  visual-only shots 22  min visible-for 0.72 s  min height 166 px
    seed 7 soak elevator#0                     damage events   5  violations 0  damaging shots 5  visual-only shots 19  min visible-for 0.63 s  min height 193 px
    seed 7 soak gauntlet#0                     damage events   8  violations 0  damaging shots 8  visual-only shots 21  min visible-for 0.83 s  min height 179 px
    seed 7 soak gauntlet#1                     damage events   2  violations 0  damaging shots 2  visual-only shots 29  min visible-for 0.77 s  min height 133 px
    seed 7 soak gauntlet#3                     damage events   4  violations 0  damaging shots 4  visual-only shots 15  min visible-for 0.62 s  min height 194 px
    seed 7 soak entrance#0                     damage events   7  violations 0  damaging shots 7  visual-only shots 24  min visible-for 0.6 s  min height 70 px
    seed 7 soak steal#1                        damage events  10  violations 0  damaging shots 10  visual-only shots 61  min visible-for 3.48 s  min height 62 px
    seed 7 soak chase#0                        damage events   4  violations 0  damaging shots 4  visual-only shots 19  min visible-for 4.38 s  min height 76 px
    seed 7 soak train_finale#0                 damage events  18  violations 0  damaging shots 18  visual-only shots 57  min visible-for 1.9 s  min height 64 px
    CONTROL (contract OFF) soak gauntlet#1     damage events   6  violations 6  damaging shots 6  visual-only shots 24  min visible-for -  min height -
    {"label":"seed 7 page errors","pageErrors":0}
    seed 3 full autopilot run (won true)       damage events   3  violations 0  damaging shots 3  visual-only shots 33  min visible-for 1.63 s  min height 70 px
    seed 3 soak bed_push#0                     damage events   6  violations 0  damaging shots 6  visual-only shots 32  min visible-for 1.08 s  min height 177 px
    seed 3 soak transfer#1                     damage events   8  violations 0  damaging shots 8  visual-only shots 21  min visible-for 0.67 s  min height 130 px
    seed 3 soak elevator#0                     damage events   1  violations 0  damaging shots 1  visual-only shots 22  min visible-for 0.7 s  min height 197 px
    seed 3 soak gauntlet#0                     damage events   3  violations 0  damaging shots 3  visual-only shots 23  min visible-for 0.6 s  min height 196 px
    seed 3 soak gauntlet#1                     damage events   9  violations 0  damaging shots 9  visual-only shots 25  min visible-for 0.82 s  min height 80 px
    seed 3 soak gauntlet#3                     damage events   4  violations 0  damaging shots 4  visual-only shots 20  min visible-for 0.67 s  min height 117 px
    seed 3 soak entrance#0                     damage events   5  violations 0  damaging shots 5  visual-only shots 34  min visible-for 0.67 s  min height 98 px
    seed 3 soak steal#1                        damage events  16  violations 0  damaging shots 16  visual-only shots 56  min visible-for 1.15 s  min height 45 px
    seed 3 soak chase#0                        damage events   1  violations 0  damaging shots 1  visual-only shots 23  min visible-for -  min height 77 px
    seed 3 soak train_finale#0                 damage events  19  violations 0  damaging shots 19  visual-only shots 54  min visible-for 0.83 s  min height 52 px
    {"label":"seed 3 page errors","pageErrors":0}
    seed 11 full autopilot run (won true)      damage events   2  violations 0  damaging shots 2  visual-only shots 37  min visible-for 0.8 s  min height 50 px
    seed 11 soak bed_push#0                    damage events   3  violations 0  damaging shots 3  visual-only shots 23  min visible-for 1.13 s  min height 88 px
    seed 11 soak transfer#1                    damage events   5  violations 0  damaging shots 5  visual-only shots 24  min visible-for 0.62 s  min height 112 px
    seed 11 soak elevator#0                    damage events   5  violations 0  damaging shots 5  visual-only shots 19  min visible-for 0.68 s  min height 139 px
    seed 11 soak gauntlet#0                    damage events   8  violations 0  damaging shots 8  visual-only shots 28  min visible-for 0.62 s  min height 194 px
    seed 11 soak gauntlet#1                    damage events   7  violations 0  damaging shots 7  visual-only shots 22  min visible-for 0.63 s  min height 194 px
    seed 11 soak gauntlet#3                    damage events   5  violations 0  damaging shots 6  visual-only shots 19  min visible-for 0.68 s  min height 194 px
    seed 11 soak entrance#0                    damage events   9  violations 0  damaging shots 9  visual-only shots 26  min visible-for 0.9 s  min height 72 px
    seed 11 soak steal#1                       damage events  14  violations 0  damaging shots 14  visual-only shots 59  min visible-for 2.3 s  min height 52 px
    seed 11 soak chase#0                       damage events   5  violations 0  damaging shots 5  visual-only shots 19  min visible-for 0.78 s  min height 49 px
    seed 11 soak train_finale#0                damage events  17  violations 0  damaging shots 18  visual-only shots 55  min visible-for 0.82 s  min height 52 px
    {"label":"seed 11 page errors","pageErrors":0}
    TOTAL {"runs":33,"damage":224,"violations":0,"visualOnly":1002,"damagingShots":226,"minVisT":0.6,"minPx":45,"examples":[]}
    FAIRNESS AUDIT: PASS
```
- **Result: 224 damage events, 0 violations.** At the moment of fire the shortest visible-for time was 0.60 s and the smallest shooter was 45 px. There were 1002 visual-only shots alongside 226 damaging ones, and 0 page errors.

**First-damage captures** (`opus-fix-fairness-pace-shots/first-damage-*.png`, plus `contact-first-damage.png`). Each is taken **at the step the first damaging shot is fired**, with line-of-sight re-checked at that step and again at capture:
- **Bed push:** the gunman at the first door, centre-right, 345 px tall, muzzle glowing. Visible 1.63 s before he fired.
- **Cafeteria:** a rusher who has closed to the chair, big in the left of the frame, with his flash at the reticle. 194 px tall, visible 0.83 s.
- **Chase:** the marked patrol car at the reticle, lightbar on. 57 px tall, visible 2.55 s.

**A defect the captures caught, fixed:** Maya's firing pose stood her up and twisted her across the player's line of sight in the same frame as her shot. That's how a shooter could be "visible" at the engine step and hidden one presentation later. She now fires one-handed, staying as low as she pushes, with no twist (`game/art.js` `pushFire`).

**Residual, disclosed:** characters are posed after the engine step, so the occlusion test sees poses that are one frame (16 ms) old. With the twist fix, the capture check agrees with the fire-time check in all three captures.

## FIX 2: pace (traversal)
- **What changed:**
  - rail speeds about 1.75–2.2× (bed 2.9 m/s; chair and halls 2.8–3.2 m/s);
  - walking speed 3.2 → 5.2 m/s;
  - road 15 → 24 m/s;
  - the bay pull-out at 4 → 10 m/s;
  - quicker pursuer waves;
  - hold release 1.0 → 0.25 s.
- **Speed still reads:** doors, signage, carts, gurneys and ceiling panels in every hall pass close at the new rate, and the street keeps lights, trees and buildings every 24–36 m.
- **Method:** `tools/pace-audit.cjs` drives each build's own `index.html` with the autopilot and times every beat from the start tap. It runs the same code on all three builds.
- **Per-beat, seed 7.** **Agency** = a live target on screen, or on foot. **Watch** = everything else.

| Beat | pass 2 total | current total | **fixed total** | current agency / watch | **fixed agency / watch** |
|---|---|---|---|---|---|
| visit | 10.3 s | 10.3 s | **4.5 s** | 0.0 / 10.3 | **0.0 / 4.5** |
| bed_push | 27.1 s | 37.4 s | **22.1 s** | 5.7 / 31.7 | **7.6 / 14.5** |
| transfer | 26.2 s | 38.1 s | **21.4 s** | 8.6 / 29.5 | **9.5 / 11.9** |
| elevator | 30.8 s | 30.2 s | **19.4 s** | 3.5 / 26.7 | **5.0 / 14.4** |
| gauntlet | 87.7 s | 98.0 s | **55.9 s** | 28.1 / 69.9 | **25.3 / 30.6** |
| entrance | 21.8 s | 22.3 s | **16.0 s** | 8.5 / 13.9 | **9.7 / 6.3** |
| steal | 21.1 s | 21.1 s | **10.6 s** | 3.4 / 17.7 | **3.4 / 7.2** |
| chase | 52.8 s | 52.3 s | **32.7 s** | 10.3 / 42.0 | **14.7 / 18.0** |
| train_finale | 33.4 s | 38.4 s | **26.1 s** | 5.9 / 32.5 | **7.9 / 18.2** |
| **TOTAL** | 311.2 s | 348.1 s | **208.7 s** | 74.0 / 274.2 | **83.1 / 125.6** |

- **All seeds:**

| Build | Seed | Total | Agency | Watch-only | First target on screen | Result |
|---|---|---|---|---|---|---|
| p2 | 7 | 311.2 s | 74.5 s | 236.9 s | 13.1 s | won True |
| p2 | 3 | 311.8 s | 74.3 s | 237.6 s | 13.1 s | won True |
| p2 | 11 | 312.4 s | 78.8 s | 233.8 s | 13.1 s | won True |
| cur | 7 | 348.1 s | 74 s | 274.2 s | 20.5 s | won True |
| cur | 3 | 344.5 s | 76.3 s | 268.2 s | 20.5 s | won True |
| cur | 11 | 341.5 s | 71.2 s | 270.4 s | 20.5 s | won True |
| fix | 7 | 208.7 s | 83.1 s | 125.6 s | 5.7 s | won True |
| fix | 3 | 207.8 s | 85.8 s | 122 s | 5.7 s | won True |
| fix | 11 | 210.4 s | 86.1 s | 124.4 s | 5.7 s | won True |

- **Bar met:** the fixed total is **208–210 s against pass 2's 311–312 s** (−33%), despite the longer turning route. No beat misses.

## FIX 3: no dead air
1. **The opening:** Room 412 went from 10.3 s to **4.6 s**.
   - Dr. Hale objects and Maya hands Cole the gun, as faster lines: hale_01 3.0 → 2.2 s, maya_01 3.2 → 2.3 s.
   - Cole's "I can't stand—" and Hale's "Then go…" now **ride the first metres of the bed push**, while the first gunman pops at the door.
   - **Tap to first possible shot: 4.6 s. Tap to a live target on screen: 5.7 s** (bar ≤ 20 s; it was 20.5 s).
2. **Talk rides over action:**
   - **Transfer cutscene:** 5.3 s → **2.2 s**. "Ugh— easy!…" now plays as the chair rolls into the first fight.
   - **Ambulance cutscene:** 5.3 s → **2.2 s**. "Put me in the back…" plays as the bay pulls out under fire.
   - **The elevator approach was empty.** It now has a corner-pop fight in the upper lobby (`el_up`) while the doors wait.
   - **Empty stretches got staged action:**
     - a door pop at the start of the bed push (`bed_w0`);
     - a lobby rush at the end of the East Wing (`tr_w3`);
     - an early corridor pop on the ground floor (`g_w0`);
     - gunmen chasing the chair out of the front doors (`exit_w1`);
     - two more SUV waves, one in the chase (`chase_w4`) and one in the finale (`fin_w3`).
3. **Pauses inventory** (seed 7, measured from the event log; before = `014aaeb`):

| Pause | Before | After | Note |
|---|---|---|---|
| Room 412 cutscene | 10.3 s | 4.6 s | two lines + 0.6 s minimum |
| Transfer cutscene | 5.3 s | 2.2 s | one line |
| Ambulance cutscene | 5.3 s | 2.2 s | one line |
| Bed push wave-holds | 2.9 s (1 hold) | 4.6 s + 2.0 s (2 holds) | the holds are fights: enemies on screen the whole time |
| Chair corridor start hold (the transfer fight) | 6.2 s | 6.0 s | fight |
| Chair corridor mid hold | 1.2 s | 2.3 s | fight |
| Elevator upper-lobby hold | — (an empty ride) | 4.6 s | new fight replacing dead travel |
| Elevator ground doors (start hot) | 4.5 s | 4.5 s | fight; releases 0.25 s after the clear (was 1.0 s) |
| Cafeteria holds | 0.3 + 0.8 s | 4.0 s | fight |
| Waiting room hold | 9.9 s | 5.0 s | fight |
| Front-doors holdout | 8.7 s | 8.7 s | contract HOLDOUT, a fight throughout |
| Post-wave auto-release (no-resume holds) | 1.0 s | 0.25 s | engine `tuning.holdRelease` |
| Finale quiet beat | line + 1.5 s | line + 1.5 s | the ending, kept |

   Every remaining hold is a fight, with enemies on screen. The dead-air holds are gone.
4. **Agency vs watch (seed 7):** watch-only **274.2 s → 125.6 s (−54%)**; bar ≤ 137 s. Agency 74 → 83 s; total 348 → 209 s. Seeds 3 and 11 come out −55% and −54%.
5. **Story:** no line was dropped. All 32 lines (Neon's 10 and my 22) are still in the game. Six moved out of cutscenes to play over action: cole_01, hale_02, cole_03, cole_10 (already on the pull-out), maya_02 and maya_04 (re-timed). Four were shortened in screen time only (hale_01, maya_01, maya_03, maya_14, at 72% of their duration; the words are unchanged).

## FRAMING RULING
- **Read and respected:** the pusher and patient presence is unchanged in size, which is allowed.
- **I didn't need to pull the camera back:** the fairness contract is met with the current framing.
- **Maya's firing pose was the one framing-related defect** (she could block a shooter). It's fixed, and the audit includes her in line-of-sight, so she can never be the reason a hit is unfair.

## Regression proofs
- **Engine tests:** `**24 passed, 0 failed of 24** (16.0 s, page errors: 0)`, unchanged. The Level 1 validator passes.
- **Full autopilot run on the shipped build** (seed 7):
  `FULL RUN {"ended":true,"won":true,"lost":false,"health":100,"score":10270,"accuracy":0.981,"bystanders":{"spared":4,"hit":1},"simSeconds":209,"wallMs":1143,"beats":"visit,visit,bed_push,transfer,elevator,gauntlet,entrance,steal,chase,train_finale","modes":"CUTSCENE,RAIL_CHAIR,FREE_FOOT,HOLDOUT,AMBULANCE","redShots":3,"shotsAtHeroes":39,"heroHits":3,"partnerS`
  - It also wins on seeds 3 and 11 (pace table).
- **Lose path:** the lids shut, then "COLE IS DOWN". 0 page errors.
- **Standard captures** (bed, chair corridor, cafeteria, on foot, holdout, chase, train, room, end and lose cards): `opus-fix-fairness-pace-shots/standard/`. All 0 page errors.

## Phone cost (honest: relative, not phone-timed)
- **GPU:** the render bench (`he-bench.cjs`, SwiftShader, relative only) is **403.5 ms/frame against 488.4 ms for the patient-eyes build** at the same 546×1181 buffer. That's run-to-run variance plus fewer on-screen enemies at the bench moment. **This fix adds no render passes.**
- **CPU (new):** the line-of-sight raycasts.
  - The first version cost **1.8 ms per simulation step** in the cafeteria (desktop headless) and would have been several ms on a phone.
  - Fixed with bounding boxes on merged world meshes, the street merged in 120 m chunks so a ray only tests nearby road, and a 0.2 s per-shooter recheck (the damaging shot itself is always re-checked fresh).
  - **Now 0.01–0.13 ms per step** with the contract on, against 0.006–0.03 ms off (bed 0.025, cafeteria 0.036, chase 0.053, finale 0.14). Expect several times that on a phone CPU; still small.

## Files
- **Engine:**
  - `engine/combat.js`: fairness contract;
  - `engine/chase.js`: pursuers under the contract;
  - `engine/director.js`: `tuning.holdRelease`;
  - `engine/validate-core.js`: the new tuning fields.
- **Game:**
  - `game/main.js`: the visible-zone and line-of-sight hooks; the verification helpers `__game.tick` and `__game.pause`;
  - `game/level1.js`: speeds, waves, compressed cutscenes, re-timed lines;
  - `game/world.js`: mesh bounding boxes, street chunks;
  - `game/art.js`: Maya's `pushFire` pose.
- **Tools:**
  - `tools/fairness-audit.cjs` (the acceptance test and first-damage captures);
  - `tools/pace-audit.cjs` (pace and agency, plus the pauses inventory, on any build root).

# Hospital Escape: the whole game, Level 1 (Opus response to OPUS-FULL.md)

**Live:** https://bparlette.github.io/Hawk2/games/hospital-escape/. The byte check against the served copy is at the end of this file.

**What shipped:** all 9 beats playable start to finish at `games/hospital-escape/index.html`. It is built on the engine, with real environments, a real cast and the final look, at 390×844.

**Neon's slice** is preserved with identical bytes at `games/hospital-escape/step-one/index.html` (sha1 `c555e64f…`). It has no relative dependencies, so it still runs from there.

I pulled the latest main before reading the brief; the harvest fold-in (`a5da185`) had landed and the brief was marked final.

## What shipped (exact bytes)
| File | Bytes |
|---|---|
| `index.html` | 6311 |
| `step-one/index.html` | 61520 |
| `game/level1.js` | 20499 |
| `game/art.js` | 38705 |
| `game/world.js` | 28598 |
| `game/main.js` | 36054 |
| `engine/core.js` | 1324 |
| `engine/rail.js` | 8542 |
| `engine/combat.js` | 12529 |
| `engine/chase.js` | 6847 |
| `engine/greybox.js` | 8979 |
| `engine/director.js` | 21986 |
| `engine/validate-core.js` | 10700 |
| `engine/validate-data.mjs` | 1289 |
| `engine/data.js` | 14365 |
| `engine/tests.js` | 26635 |
| `engine/tests.html` | 1024 |
| `engine/demo.html` | 11019 |
| `tools/run-tests.cjs` | 2023 |
| `tools/shoot-game.cjs` | 5974 |

**What each new file does:**
- `game/level1.js` is the Level 1 data in contract shapes: 9 beats, 16 segments, 16 paths, 15 waves, 5 pursuer waves and 32 lines. It also holds the bystanders, tuning and environment layout.
- `game/art.js` holds the people, poses, vehicles, props, train and crossing, plus canvas textures.
- `game/world.js` builds every environment zone from `env`.
- `game/main.js` handles presentation, effects, HUD, input and audio.

The engine files changed only additively; the extensions are listed below. L2–L4 would be a new `levelN.js` plus any new zone kinds in `world.js`. The cast, people, vehicle and prop builders are reused as they are.

## The §9 proofs
1. **The 24 engine spec tests still pass, unweakened.** Not one test or fixture changed in this build.
   - Every engine extension is switched on only by data. The greybox `engine/data.js` doesn't set any of the new fields, so the suite exercises exactly the v1 behaviour.

| ID | Test | Result | Detail |
|---|---|---|---|
| T1 | Rail fidelity: rider + camera on the spline at 100 pathT samples; camera height = path height ± 0.05 m | PASS | max off-spline 0.0000 m, max height error 0.0000 m |
| T2 | No steering on rails: 5 s of move/aim injection changes neither the path nor pathT progression; monotonic | PASS | path unchanged true, monotonic true, /ΔpathT/ vs no-input run 0.0e+0, pathT 0.234 |
| T3 | Pusher lockstep: 0.55 m ± 0.1 m across speed changes and a ≥3 s zero-speed hold | PASS | pusher distance 0.550–0.550 m, held 3.35 s, speeds seen 0.0/1.0/1.6 |
| T4 | Rotation order: full greybox run visits chair → free → holdout → ambulance; every transition logged; no switch verb | PASS | mode order RAIL_CHAIR>FREE_FOOT>HOLDOUT>AMBULANCE; beats 9/9; segment events 15/15; won true, lost false, 312 s sim; switch-like keys: [] |
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

**24 passed, 0 failed of 24** (19.6 s, page errors: 0)

   Validator on the greybox data: `validate-data: 136 objects checked, 0 errors validate-data: PASS `

   Validator on Level 1: `validate-data: 181 objects checked, 0 errors validate-data: PASS ` (`node engine/validate-data.mjs game/level1.js`)

2. **Full-game autopilot run on the shipped `index.html`,** driven through `__dbg` (`tools/shoot-game.cjs --full`, seed 7, autopilot with a 1.6 s human reaction time):
   ```
   FULL RUN {"ended":true,"won":true,"lost":false,"health":100,"score":8990,"accuracy":0.982,"bystanders":{"spared":7,"hit":0},"simSeconds":311,"wallMs":545,"beats":"visit,visit,bed_push,transfer,elevator,gauntlet,entrance,steal,chase,train_finale","modes":"CUTSCENE,RAIL_CHAIR,FREE_FOOT,HOLDOUT,AMBULANCE","redShots":2,"shotsAtHeroes":22,"heroHits":2,"partnerShots":36,"damageWithoutRedShot":0} end card: OUT. NOTHING IN THE MIRRORS. page errors 0 
   ```
   - It ends **won** at the train finale and shows the end card: "OUT. NOTHING IN THE MIRRORS."
   - All 9 beats in order (the extra `visit` is the page-load beat before START) and all 5 modes.
   - 0 page errors.
   - `damageWithoutRedShot: 0`: every point of HP lost arrived on a red shot that had been in flight on screen.
   - The same run also wins on seeds 3 and 11. Seed 11 hit one civilian and took the penalty in real play.

3. **The lose path,** driven: `LOSE PATH {"lost":true,"health":0,"loseEvents":1} card: COLE IS DOWN page errors 0`. The "COLE IS DOWN" card is in `lose-card.png`.
4. **Captures from the shipped build,** at 390×844 @2x: `tasking/responses/opus-full-shots/`. This is the state each one was taken in:
```
    bed-push             {"simS":5.6,"segment":"bed_hall_push","mode":"RAIL_CHAIR","pathT":0.21,"enemies":2,"pursuers":[],"won":false,"health":100} page errors 0 
    wheelchair-corridor  {"simS":13.4,"segment":"transfer_chair_corridor","mode":"RAIL_CHAIR","pathT":0.314,"enemies":3,"pursuers":[],"won":false,"health":96} page errors 0 
    cafeteria            {"simS":32,"segment":"gauntlet_cafeteria","mode":"RAIL_CHAIR","pathT":0.156,"enemies":3,"pursuers":[],"won":false,"health":96} page errors 0 
    ambulance-chase      {"simS":5.2,"segment":"chase_harbor_ave","mode":"AMBULANCE","pathT":0.102,"enemies":0,"pursuers":["patrol:pursuing"],"won":false,"health":100} page errors 0 
    train-finale         {"simS":29.1,"segment":"finale_line9_crossing","mode":"AMBULANCE","pathT":0.916,"enemies":0,"pursuers":["suv:wrecked","suv:wrecked","suv:wrecked","suv:wrecked"],"won":true,"health":100} page errors 0 
    room-412             {"simS":1.2,"segment":"visit_room","mode":"CUTSCENE","pathT":0,"enemies":0,"pursuers":[],"won":false,"health":100} page errors 0 
    holdout              {"simS":3.2,"segment":"entrance_holdout","mode":"HOLDOUT","pathT":0,"enemies":2,"pursuers":[],"won":false,"health":100} page errors 0 
    on-foot              {"simS":58.4,"segment":"gauntlet_ward_on_foot","mode":"FREE_FOOT","pathT":0,"enemies":2,"pursuers":[],"won":false,"health":92} page errors 0 
```
5. **Pages byte check:** see "Served verification" at the end of this file.

## Before and after
| Beat | Greybox demo (`opus-engine-shots/`) | Neon step-one (`step-one/`, `responses/step1-*.png`) | Now (`opus-full-shots/`) |
|---|---|---|---|
| Visit | not shown | room seen first-person; box-people | `room-412.png`: Room 412 with Cole reclined in the bed, Maya and Dr. Hale beside it, the monitor, curtain track and whiteboard |
| Bed push | capsule corridor | bed as a slab edge, first-person | `bed-push.png`: over the shoulder; Maya pushing at the head rail on the left, Cole's head on the pillow, a ward hall with doors, crash cart and signage |
| Wheelchair corridor | capsules and grey walls | box enemies at the end of the hall | `wheelchair-corridor.png`: chair back, Cole's shoulders and head, Maya's arm; staff gunmen corner-popping from doorways, a downed gunman lying as a person |
| Cafeteria | not shown | not built | `cafeteria.png`: glass partition, tables and chairs, serving counter, menu board, pendant lights |
| On foot | not shown | not built | `on-foot.png`: Maya over the shoulder, with the full HUD (only here) |
| Holdout | capsules at a wall | not built | `holdout.png`: the glass main entrance with signage; staff rushing the doors; a red shot landing on Cole |
| Ambulance chase | a road and a box car, no bay | not built | `ambulance-chase.png`: the bay interior, the red rear door frame, a marked patrol car behind, the city at dusk |
| Train finale | a dark band | not built | `train-finale.png`: the Line 9 crossing with freight cars across the road, the crossbuck, and the quiet line |

## Contract as implemented
**Contract v1 held:** beat ids, the 5 modes, every data shape, the component HP field names and `he-dbg-1` are all unchanged. Everything below is an addition, disclosed here.

**A. Already disclosed in `opus-engine.md`, carried over unchanged:** the `pickup` path event, the `state().ended` and `.subtitle` keys, `reserve: Infinity`, the `trainAt` / quiet-beat reading, the segment-completion rules, and `gotoBeat` as the reset.

**B. New in this build** (each is data-gated and validator-checked when present):

1. **Over-the-shoulder rig fields on paths:**
   - `side` (lateral offset to the right), `lookAhead` and `lookHeight` (the default look point), and `lookClamp` (the furthest look keys may pull away from it).
   - `back` keeps its contract meaning (behind the rider). Level 1 sets it to the pusher gap plus the spec's distance behind Maya: 1.70 for the bed, 1.55 for the chair.
   - Heights are 1.55 (bed) and 1.45 (chair); `side` is 0.28 and 0.25; look-ahead is 6 m at 1.0 m.
2. **`bayOffset` on ambulance paths:** where the rear-facing rig sits relative to the vehicle centre. The default is the v1 value (1.9 m behind).
   - Level 1 uses −0.55, which puts the camera inside the art's bay so the bay interior and door frame are in frame, as §4 and §5 require.
3. **Travelling enemy shots (`tuning.shotSpeed`):**
   - Every enemy and pursuer shot is a projectile (`enemyShot`, then `shotLand`).
   - Shots that will hit are flagged `red` at launch, and damage lands **on arrival**. Without `shotSpeed`, it's instant, as in v1.
4. **Aim tell (`tuning.aimTell`):** an `enemyAim` event fires 0.45 s before the shot. It's rendered as a glint on the gun.
5. **Advance pressure:**
   - `cover.advance`, `advanceEvery` and `minDist`: corner-poppers step closer every two peeks.
   - `cover.lateral`: they duck back sideways behind the corner instead of crouching.
   - `cover.side`: how far they sidestep.
   - `closeRange`: fire rate rises as they close.
   - `firstShot`: how soon the first shot comes.
   - These produce an `advance` event.
6. **Partner fire (`tuning.partner`):** Maya fires in RAIL_CHAIR and HOLDOUT beats (`partnerShot`, seeded) at the nearest exposed enemy in view. Her hits are logged with `by: 'partner'` and score nothing.
7. **Score and precision (`tuning.score`):**
   - 100 per kill;
   - +50 QUICK DRAW for a kill within 1.2 s of the enemy first showing;
   - +10 × the hit streak (capped at 10);
   - 250 per wrecked pursuer.
   - A miss resets the streak, so aimed fire beats spraying. `state()` gains `score`, `accuracy` and `bystanders`.
8. **Bystanders (`data.bystanders`):** unarmed staff and patients who cross the fights.
   - **Penalty: score, −500 per hit, applied everywhere** (`bystanderHit`).
   - It's signalled with a full-width red "CIVILIAN HIT −500" banner, a red screen flash and a two-tone buzzer.
   - I chose score rather than HP because an HP penalty would be damage with no red shot on screen, which would break the telegraph rule.
   - The end card tallies staff and patients spared and hit; that's the restraint-into-reward idea from the reference.
9. **Occluders (`game.extraOccluders`):** cover props stop the player's rounds (logged as a miss with the impact point).
10. **`tuning.healOnBeat` (35):** Maya patches Cole up between beats, logged as a `heal` event. Without it, a 9-beat level drained HP with no refill.
11. **Fair-fire rule, changed in Level 1 and disclosed as the brief requires:**
    - The v1 rule was "only within ±75° of the camera's look direction".
    - In portrait at 60° vertical FOV, that let enemies fire from well off-screen, which in testing killed the run in the on-foot ward.
    - `tuning.screenFire` (1.1) adds a stricter rule: an enemy fires only when its chest projects within 1.1× of the screen width. So every shot comes from somewhere the player can see.
    - The v1 rule still applies, and the greybox data doesn't set `screenFire`.
12. **`tuning.footTurn`:** edge-turn in FREE_FOOT. Holding the reticle within 22% of a screen edge turns Maya, and movement stays relative to where she faces. Without it, the free mode couldn't look around.
13. **`cover.recoverAfter` (5 s):** an enemy that stays off-screen that long relocates 8 m into view ahead (`reposition`). This is the no-soft-lock rule for corner-pops near a hold, and it fixes a real soft-lock found in testing.
14. **`tuning.autopilot.react`:** the verification autopilot waits a human reaction time before shooting, so the proof runs actually face incoming fire. `HE.autopilot` is the same function the demo uses.
15. **Bound art:** `placeActors` leaves heroes alone once real art is bound with `HE.bindActor`; the game poses them.
16. **`window.__dbg.autopilot(on)`:** an additive verification key. The 9 frozen `he-dbg-1` keys are unchanged.
17. **`env` and `level` keys in the data:** environment layout for the world builder, ignored by the engine.

## Combat feel, as built (§7)
- **Both heroes shoot.**
  - Cole's gun arm tracks the reticle, with a muzzle flash and tracer from his gun.
  - Maya fires with a raised arm, flash and tracer, roughly every 1.25 s in the chair, bed and holdout beats.
  - The seed-7 run logged 36 shots from Maya.
- **Nobody stands still.**
  - Every wave is corner-pops (`cover`, peeking out from doorways and props, then advancing) or door entries (`rush`). The nearest door swings open on spawn, and the enemy comes through and walks at the heroes.
  - There are no `hold` enemies in Level 1.
- **Visible incoming fire.**
  - Every enemy shot has an oversized muzzle flash and a visible projectile with a tail.
  - Red, glowing shots are the ones that will hit; pale tracers miss and spark on the floor, walls and frames near the heroes.
  - A hit lands with a red burst, and the vignette fires on arrival.
- **Precision and bystanders:** as in 7 and 8 above.
- **The branch stays open:** nothing in Level 1 blocks an elevator-vs-stairwell fork. Beat 4 already has two segments, and a fork would be a third segment set selected by data. I did not build the fork.

## What I could NOT make beautiful yet, named
- **People are stylised geometric figures, not shaded characters.** They have real proportions, jointed limbs, hair styles, coats, gowns, scrubs and masks, and they read as people by outline. But the faces are only a nose and a brow line, and there are no hands with fingers and no cloth folds. Up close, as with Cole's head in the chair beats or Dr. Hale in Room 412, they look like plastic mannequins.
- **Cole in the bed push:** from behind, the raised back of the bed reads as a plain white block. His head on the pillow, the side rails and Maya at the head rail are readable, but his torso is mostly hidden by the backrest.
- **The chair beats put Cole's head in the lower-centre frame,** close to the threat zone. The spec numbers (1.45 m height, 1.0 m behind Maya, 0.25 m right) and a slumped seated pose keep the reticle zone clear in the captures, but it's tight.
- **Heroes' share of the frame:** I did not measure it as a pixel percentage. By eye, the bed and chair beats sit around 35–50% of the frame height.
- **The train:** the locomotive is modelled (cab, nose, headlights, bogies), but my capture landed after it had passed. The finale shot shows the freight cars across the road, the crossbuck and the signal. The crossing gates' arms swing, but their pivot isn't polished.
- **The on-foot ward** is the plainest room. It has desks, monitors, curtains and a crash cart, but no smoke or haze.
- **Lighting is flat ambient** with emissive panels and floor light pools, and no real-time shadows apart from contact blobs, chosen for phone performance.
- **Audio is synthesised placeholder:** gunshots, impacts, buzzer, ding, siren and horn. There's no music or voice.
- **Cutscenes are posed tableaux with subtitles,** not animated performances.

## The arcade harvest
- The 41 frames (`tasking/refs/arcade/frames/`) were **not in the repo** when I built; the folder was empty. The local archive (`~/workspace/hospital-escape-refs/`) and the cloned code repos are not on this machine.
- I worked from §2.1's written findings and `REFERENCES.md`:
  - the red-sight telegraph became red projectiles;
  - the Time Crisis tell layers became the aim glint, oversized muzzle flash and visible projectile;
  - corner, door and counter pops became cover and rush staging;
  - bystanders, hold-fire and the rescued tally became the score penalty and the spared-and-hit tally;
  - advancing waves came from the House of the Dead notes.
- The missing frames blocked one decision: I could not check silhouettes side by side against the frames. The silhouettes were judged only in my own 390×844 captures.
- **Late note:** the frames landed on main *while* I was building (`f8d9bff` "Arcade harvest frames: house-of-the-dead (11)", merged into my push). This build was not checked against them; a side-by-side pass is the natural next step.

## Served verification
- **Commits:** the build is `5893bd5`, merged into main as `8012be3` (the harvest frames had landed upstream in between).
- **Pages byte check:** after the push, Pages served the new build on the third check (~1 min).

  | Served file | sha1 | Size | Matches the built bytes |
  |---|---|---|---|
  | `https://bparlette.github.io/Hawk2/games/hospital-escape/index.html` | `93d43cc3469e1b189010f57d49bb9bafa13659ba` | 6,311 bytes (HTTP 200) | yes, byte-identical to `git show HEAD:games/hospital-escape/index.html` |
  | `…/game/main.js` | `b9288b3d08b4e1984064c98bf9354c12ee237a7f` | — | yes |
- **Step-one archive:** `https://bparlette.github.io/Hawk2/games/hospital-escape/step-one/` serves Neon's slice (sha1 `c555e64f…`, the same bytes that were at `index.html` before this build).

---

# Pass 2 (Nov 23): "through a wounded man's eyes", toward the MP4 look
**Direction (Cherie):** "Goal is gta 6 quality as seen in mp4s … Can't be crisp. Has to be like seeing out of a sick person's eyes. A person who's been shot. Blurry kind of."

**What the MP4s show** (frames pulled from `refs/source.mp4` and `source2.mp4`):
- low-key, near-black shadows;
- a cold teal grade with warm practical lights blooming;
- heavy vignette;
- soft focus everywhere, with the foreground shoulder and gun smeared by depth of field;
- a stormy blue dusk for the chase.

The 41 arcade frames are on main now (`refs/arcade/frames/`) and were available for this pass.

## What changed
- **`game/post.js` (new): a post-processing pipeline.** It's hand-written passes on three r128 core: no examples, add-ons or private copies.
  1. The scene renders into an HDR (half-float) target with depth, at 60% internal resolution; the look is soft by design.
  2. Bloom: a bright pass at quarter resolution, then two separable blurs.
  3. The composite:
     - depth of field: near heroes and the far field blur, and focus follows the nearest live threat;
     - an always-on softness that breathes with an uneven heartbeat;
     - radial edge smear;
     - **double vision and more blur as you take damage, driven by the engine's `feedback.vignette` and `feedback.wash`**;
     - chromatic fringing toward the edges;
     - split-tone grade (teal shadows, sodium highlights, lifted blacks, desaturated), ACES, an extra S-curve, film grain and heavy vignette.
  - There's an 8-bit fallback when the GPU can't render to half-float.
  - `?post=0` turns it off. `?postdbg=raw|depth|bloom` gives debug views.
- **Lighting:**
  - Night hospital: dim, cold fill, HDR ceiling panels that bloom, and stronger light pools.
  - Outside: a storm sky with procedural clouds and occasional lightning, dark blue fog, and a lower sun.
  - The bright white foreground materials (mattress, ambulance bay) are darkened so the lower frame reads dark, as in the reference.
- **People (`game/art.js`, delegated to a Sonnet agent and reviewed and integrated by me):**
  - Faces: jaw, chin, cheekbones, eye sockets and eyes, brows, ears and lips.
  - Hands: palm and fingers, with a fist around the gun grip.
  - Clothing: collars, belts, cuffs and soles; Maya's utility jacket; Dr. Hale's open lab coat with lapels and ID badge; gown ties; V-neck scrubs.
  - 50–68 meshes per person, with cached geometries.
- **Fixes found this pass:**
  - The gun barrel pointed back up the forearm (`rotation.x` sign), so muzzle flashes and tracers started near the shooter's chest. It now points past the hand. The agent flagged it and I made the change.
  - My own edit had commented out the line that attaches the canvas to the page (a black screen in local testing). Fixed before pushing.

## Proofs (pass 2)
- **Engine tests:** `**24 passed, 0 failed of 24** (22.8 s, page errors: 0)`, unchanged. The Level 1 validator passes.
- **Full autopilot run on the shipped `index.html`,** seed 7 (re-run with the post pipeline live):
  `FULL RUN {"ended":true,"won":true,"lost":false,"health":100,"score":8990,"accuracy":0.982,"bystanders":{"spared":7,"hit":0},"simSeconds":311,"wallMs":703,"beats":"visit,visit,bed_push,transfer,elevator,gauntlet,entrance,steal,chase,train_finale","modes":"CUTSCENE,RAIL_CHAIR,FREE_FOOT,HOLDOUT,AMBULANCE","redShots":2,"shotsAtHeroes":22,"heroHits":2,"partnerShots":36,"damageWithoutRedShot":0} end card: OUT. NOTHING IN THE MIRRORS. page errors 0 `
- **Lose path:** "COLE IS DOWN", with 0 page errors.
- **Captures:** `tasking/responses/opus-full-shots-pass2/`, all 10 with 0 page errors, plus `contact-sheet.png`.

## Still below the bar, named
- **Characters:** still primitive-built. The blur hides a lot at phone size, but nobody would mistake them for the MP4's scanned characters.
- **Frame size:** the heroes don't fill the frame the way the MP4's over-shoulder close-ups do. The binding camera numbers (§4) keep them in the lower 35–45%.
- **The chase:** no rain, no wet-road reflections, no motion blur yet.
- **The train:** still not caught on the locomotive in the finale capture.
- **Performance:** this pass is unprofiled on real phones. The post pipeline costs 5 full-screen passes per frame at 60% resolution.

# Opus: INTEGRATION, the live game (tasking/INTEGRATION.md)

> **Logins:** none. **Paid:** none.
> **Loaders:** GLTFLoader (approved by Cherie, Nov 24) from the pinned CDN `three@0.128.0`. Nothing else beyond `three.min.js`; three.js is still pinned and never inlined.
> **Last moved:** Nov 24, 2026 (this push).

**The game:** `games/hospital-escape/` (https://bparlette.github.io/Hawk2/games/hospital-escape/).
- **Fallback:** `?cast=painted` restores the painted cast exactly as it was. That's the A/B switch, and what every "painted" number below was measured with.

**Evidence:** `responses/opus-integration-shots/`
- `beat-*.png`: in-game 390×844 stills per beat.
- `per-beat-drawcalls.json`: renderer.info per beat, 3D and painted.
- **Grip proof:**
  - `grip-2x-ingame-halls.png` / `grip-2x-ingame-ward-kneel.png`: 2× crops from the live game rendered at 2× device pixels, so they're full resolution, not upscaled;
  - `grip-closeup-seat.png`: the seat tuning close-ups.
- **Clips:**
  - `clip-gauntlet-halls.mp4`: standing, door-frame and rush gunmen;
  - `clip-ward-kneel.mp4`: kneeling shooters, a head-shot death from the knee, the waiting room's flankers;
  - `clip-maya-reactions-observer-cam.mp4` + `maya-reactions-strip.png`: an observer camera beside Maya, evidence only, not the player's view.
- **Numbers:**
  - `fullrun-seed7.json`: a whole autopilot playthrough's behaviour counts;
  - `fairness-audit.txt`.

## Guardrails (measured on the final code)
| Check | Result |
|---|---|
| Engine tests (`tools/run-tests.cjs`) | **24/24 passed**, 0 page errors |
| Data validation (`engine/validate-data.mjs game/level1.js`) | **201 objects, 0 errors**, PASS |
| Fairness audit (`tools/fairness-audit.cjs`, seeds 7/3/11, full runs + damage soaks) | **PASS: 378 damage events, 0 violations**, min visible 1.07 s, min height 47 px. Re-run after the last change: see the note at the end. |
| Full playthrough (`tools/cast-fullrun.cjs 7`) | Completes (233 s game time, not lost), **0 page errors** |
| HUD | Unchanged. No HUD element added. |
| Live page errors, every beat captured | 0 |

## What changed in the game
- **New:** `game/cast3d.js` (the 3D cast) and `assets/cast/` (6 GLBs + the VALID licence).
- **Hooks:**
  - `game/main.js`: about 25 lines, all guarded by `HC` (null with `?cast=painted`);
  - `index.html`: GLTFLoader + cast3d.js script tags.
- **One engine line** (`engine/combat.js`): `T.cover.commit && !e.noCommit`. A door-frame gunman keeps the engine's own peek/duck cycle instead of committing. The flag is set by the cast; no data changed.

### 1. The cast: N2 + Maya + Cole
| Who | Body | Motion | Calls | Triangles |
|---|---|---|---|---|
| Every gunman (`gunman` and `staff` kinds) | **N2**: Neon's cast-pass `n2-mixamo.glb`, with its baked-in pistol primitive stripped | the **27 Mixamo gunman clips**, retargeted offline onto the VALID rig (`mx-gunman.glb`, my cast pass). That's the exact walk-off-winner pairing. | 4 per figure (body primitives + pistol + contact shadow) | 7,274 per figure |
| Maya | `maya-mixamo.glb` | her own `Wheelchair_Push` / `Bed_Push_Loop`, plus the gunman set's aim, kneel-aim, crouch, fire and reactions on her rig (same bone names) | 5 | — |
| Cole | `cole-mixamo.glb` (his baked pistol stripped) | `Sit_Idle_Breath` in the chair, `Lay_Breathless` in the bed | 3 | — |

**Where the 3D Cole and Maya replace the painted ones:**
- **Cole:**
  - in the bed: the visit and the bed push's opening shot;
  - in the chair: the transfer and steal cutscenes, every chair play view and the holdout (the camera rides behind him, so you see his back, not a billboard facing you), and parked while Maya is on foot.
- **Maya:** every push, the holdout, and the visit / transfer / steal cutscenes.
- **Still painted:** Dr. Hale, the bystanders, and Cole braced on the ambulance floor for its 1.9 s opening shot. No owned clip sits on a floor; a seated clip would float.

**Pacing law** (stance-phase foot contact only, measured at load on each body: sole heel and toe points, 240 samples, contact = within 1 cm of the point's lowest height):

| Clip on N2 | Measured contact pace | At the law |
|---|---|---|
| Pistol Walk | **2.718 m/s** | 1.30 m/s → timeScale 0.478 |
| Running With Aimed Pistol | **3.272 m/s** | 3.2 m/s → 0.978. The engine's gunman (2.3 m/s) and staff (2.7 m/s) are both above the 2.04 switch, so they run at 0.703 / 0.825. |
| Walk backward | 1.488 | — |
| Strafes | 2.295 / 2.285 | — |
| Arcs | 2.669 / 2.660 | — |
| Crouch walk | 1.791 | — |
| Maya Wheelchair_Push | 1.631 | — |
| Maya Bed_Push_Loop | 0.404 | — |
| Maya Walk_Fem | 1.608 | — |

Every locomotion clip plays at `engine speed / its own contact pace`. The walk cadence is untouched, as ruled.

**Recoil:** the authored "Firing A Gun" kick (keys 6–33), additive, upper body, at 1.0×.

### 2. Enemy variety, in-game
**How a style is picked:** deterministically per enemy (a hash of its role), from what the engine already gives it.

| Style | Who | What the player sees |
|---|---|---|
| **door** | cover gunmen spawning within 2.6 m of a door | **Peek, shoot, duck back:** the engine's own exposed 1.5 s / hidden 1.1 s cycle. The hidden spot is 0.7 m sideways behind the corner, and the figure strafes there and back instead of teleporting. Hidden he plays Standing Cover Against Object and **can't be hit**: the engine's `live()` is gated on exposure, as before. |
| **kneel** | 45% of the other cover gunmen | Drops to **Pistol Kneeling Idle** on arrival and fights from the knee. A smaller target, lower in the frame. |
| **flank** | 34% of the rushers | **Crouch Walk Forward** on the advance, low and fast. |
| **rush / stand** | the rest | Aimed walk or run, or standing aim. |

**Movement:** clips are chosen by the figure's velocity relative to its facing:
- forward → walk, run or crouch;
- 25–65° → **arc left/right**;
- 65–115° → **strafe**;
- backward → **walk backward**. This is the rushStop back-off: the engine steps a too-close gunman back.

**Turns:** the engine re-aims the actor at Cole every step. The figure keeps its world facing and eases into the new one. A change over 0.55 rad while standing plays **left-turn / right-turn** legs under the aim.

**Directional hits and deaths:** the player's `shot` event carries its impact point.
- Hit on his left side → **Reaction To Getting Hit To The Left**; otherwise **Hit Reaction While Holding A Pistol**. Both additive, so he keeps aiming.
- A head-height killing shot → **Dying With Front Impact To The Head (fall on one knee)**. A kneeling shooter joins that clip at 45%, where it's already on one knee, so he doesn't pop up.
- Otherwise → **Shot To The Chest Falling Backwards**.

**Full autopilot playthrough, seed 7** (`fullrun-seed7.json`):
- Styles: kneel 11, door 4, stand 10, flank 8, rush 15.
- Deaths: head-to-knees 10, chest-backwards 34.
- Hits: front/right 235, head 64, left 1.
- Turns: 2. Maya: 29 flinches, 7 ducks.

Left hits are rare because the gunmen face the camera, so most rounds land on their fronts.

### 3. The gun rule
- **Seat:** computed once per body, **in the aim pose** (Pistol Walk at 30%), from the hand's own bones:
  - barrel = forearm → hand;
  - gun-up = the knuckle line (index → pinky) made orthogonal;
  - the palm side = the side the middle finger curls toward.
- **Grip point:** `lerp(hand, middle1, 0.35) + 3.5 cm palm-ward − 5 cm along gun-up`.
- **Attach:** the gun is stored as a matrix relative to **RightHand** and parented there, so it follows the hand in every clip: walk, run, kneel, door, fire.
- **Fingers:** wrapped by the Mixamo clips' own finger tracks.
- **Fix:** this replaces my cast-pass seat, which was computed in the T-pose and put the gun on the back of the hand (Cherie's catch).
- **Proof:** `grip-2x-ingame-*.png` (live game, 2× crop at full resolution) and `grip-closeup-seat.png` (four angles × two poses; tuned from variant a to b).

### 4. Background patients
| Room | What | Draw calls | Triangles |
|---|---|---|---|
| WARD 2 · Recovery | 3 new beds against the north wall (clear of Maya's on-foot route), each occupied (sleeping / breathless / moaning) | **1** for the 3 patients (2 when animated would be 6); the 3 beds merged by material: **78 → 6** | 20,058 |
| Waiting room | 12 seated patients on the existing chair rows (still, breathing, rubbing arm, disbelief) | **1** (animated would be 24) | 80,220 |

- **How:** two VALID bodies (`patient-a/b.glb`, MIT), posed by 7 retargeted patient clips (`mx-patients.glb`, made with my cast-pass `retarget.js`). Each pose is **skinned on the CPU once** (linear-blend skinning, as r128's shader does it) into plain geometry, and merged per room: one body texture, one material, 0 per-frame skeleton cost.
- The rooms only draw in the segments that can see them.
- **Cost:** about 6.7k triangles per patient. The waiting room is the heaviest, at 80k triangles in one call; halving the patient count halves that if phones need it.

### 5. Maya's reactions
- **Trigger:** any enemy round whose flight passes within **1.6 m** of her (from the engine's `enemyShot` from→to segment):
  - a miss → **flinch** (Hit Reaction, additive, 0.75);
  - a red, hitting round → **duck** (the upper body of Dodging While Sitting, additive, 0.9).
- **Recovery:** additive pulses over whatever she's doing (push loops, kneel, crouch), so she recovers back into it with no state change. 0.7 s cooldown.
- **Seen:** 36 times in one playthrough.
- **Cower: no owned clip.** Acquisition candidates (names unverified, tier C in my ideas list; Moth to confirm in the logged-in session):
  - **"Terrified"** (search `terrified`): a standing cower for heavy fire;
  - **"Crouch To Cower"** / any `cower` result: a crouched cower beside the chair in the holdout.

  I didn't substitute a wrong clip. Her holdout crouch is "Crouched For Cover Against Object", which is a cover crouch, not a cower.

### 6. The hallway look: T4 (STOPPED, as the guardrail says)
**What's integrated:** T4's character shadow treatment. Every 3D figure carries a soft contact blob whose opacity is driven by the room's own lamps (the game's 87-lamp list), with T4's values: **0.52 in the dark stretches, 0.13 in a lamp pool**.

**What isn't, and why:** T4 (`hospital-escape-hallway-neon/take4-kitbash.js`) is a complete standalone build, and it fights the game in three places:
1. **Renderer globals:**
   - it turns on shadow maps (two 1024² shadow spots, so the scene renders twice more per frame);
   - it sets ACES tone mapping (exposure 1.06), sRGB output, FogExp2 and a PMREM environment.

   The game renders an HDR linear target and does ACES + sRGB in its own post pass, with per-area fog. Taking T4 as-is double-tone-maps or breaks the post.
2. **Duplicate shell:** it builds its own West Wing B (walls, floor, ceiling, **doors**). The game's doors there are engine objects that swing open when an enemy spawns through them.
3. **Global lights + shader cost:** its hemisphere, room point lights and spots would light **every** zone, and its 9-panel area-light loop runs in every fragment shader.

**Cheapest resolution** (one focused pass, no new assets):
- port T4 as a **material + dressing layer onto the game's own West Wing B**: its PBR textures + the 9-panel area-light shader on the zone's floor, wall and ceiling materials, with the troffer positions taken from the game's lamp list;
- its kit-bash `props.glb` at T4's coordinates (the same as the game's);
- **no** shadow maps, no renderer globals, no extra lights. The contact blob already grounds the cast.

## Per-beat draw calls (renderer.info from the actual page, 390×844, full frame with post; painted = `?cast=painted`)
| Beat (segment) | 3D cast calls / triangles | Painted calls / triangles |
|---|---|---|
| Visit (visit_room) | 65 / 19k | 39 / 0.3k |
| Bed push (bed_hall_push), opening / mid-fight | 267 / 48k · 180 / 146k | 242 / 29k · 160 / 91k |
| Transfer cut / chair corridor | 155 / 26k · 74 / 34k | 137 / 6k · 53 / 1k |
| Elevator (ride) | 133 / 50k | 106 / 16k |
| Gauntlet halls | 86 / 64k | 83 / 15k |
| Cafeteria | 82 / 70k | 67 / 8k |
| Ward (on foot) | 103 / 41k | 98 / 5k |
| Waiting room | 188 / 155k | 188 / 34k |
| Entrance holdout | 202 / 182k | 193 / 38k |

- **Read this as:** calls rise **+3 to +26**; triangles rise a lot (3D bodies at ~7k each vs 2-triangle billboards).
- Both builds peak in the same beats: the bed push's opening and the waiting room are the game's own geometry, not the cast.
- **The cast's own share,** measured by toggling it off in the same frame: visit 65 → 57 (Maya 5 + Cole 3).
- **First lever if phones need it:** lighter patients (fewer or decimated), then a decimated N2 LOD beyond 12 m.

## Method (recreate from paper)
1. **Assets:**
   - copied Neon's `n2-` / `maya-` / `cole-mixamo.glb` from `hospital-escape-leaders-neon/assets/cast-pass/`;
   - my `mx-gunman.glb` (27 clips) from `hospital-escape-3d-sample-opus/mixamo/`;
   - built `mx-patients.glb` with `node run.cjs retarget.js '{"clips":[7 sitting/laying], "inplace":[], ...}'` (cast-pass tool);
   - copied two VALID bodies as `patient-a/b.glb`.
2. **Load** (`cast3d.js`):
   - strip pistol primitives;
   - measure each body's rest (sole height, crown height, hips rest, leg length in the hips' parent space);
   - re-base each Mixamo clip's hips track per body: `hipsRest + (v − refHips) · leg/refLeg`.
3. **Seat the pistol** per body in the aim pose (above). Measure every locomotion clip's **contact pace** per body.
4. **Figures:**
   - a skinned clone, scaled to height (N2 1.79 m, Maya 1.68, Cole 1.80);
   - the seated gun on RightHand;
   - the light-modulated contact blob;
   - **18 bone-parented hit capsules** between rest joints (world-metre radii). The skinned mesh's `raycast` is off: r128 would test the bind pose.
5. **Engine coupling:**
   - `greybox.addActor` → attach (or late-attach once loaded). The painted/procedural children go to layer 31 (nothing renders or raycasts it); hits resolve to the actor's existing `userData.hit`.
   - `present()`: drive from engine state.
   - `processEvents()`:
     - `shot` gives the impact point;
     - `enemyShot` fires the additive kick and launches the flight **from the seated pistol's barrel**;
     - `hit` gives the directional flinch;
     - `kill` (via `userData.dead`) gives the death.
6. **Tools** (all in `games/hospital-escape/tools/`, Playwright + the pinned CDN):

   | Tool | Use |
   |---|---|
   | `cast-beats.cjs` | stills + renderer.info per beat (`QUERY` `&cast=painted` for A/B) |
   | `cast-grip.cjs` | 2× grip crop |
   | `cast-clip.cjs` | play clips + per-frame style log |
   | `cast-maya-cam.cjs` | Maya observer clip |
   | `cast-fullrun.cjs` | whole-run behaviour counts |
   | `fairness-audit.cjs` | now also waits for the 3D cast to load |

## Known gaps
- **T4 hallway:** stopped (above); the resolution is named.
- **Bed push pacing:** Maya's Bed_Push_Loop measures 0.404 m/s by contact, so at the bed's rail speed it plays well above 1×. It's the clip as approved ("ships as-is"); a faster bed-push source would fix it.
- **Turns are rare** (2 per playthrough) because the engine turns gunmen gradually. Correct, but seldom seen.
- **Left-side hits are rare** (1 per playthrough) for the same reason: the gunmen face you.
- **Cole braced in the ambulance** and **Dr. Hale / bystanders** remain painted.
- **Long gun (GEAR-FIX):** not blocked on. The seat is a per-body matrix on RightHand, so a long gun swaps in as a different mesh plus a support-hand target.

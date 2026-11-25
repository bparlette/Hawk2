# Opus: FINAL BUNDLE — INTEGRATE (OPUS-NEXT)

> **Logins / paid:** none. **Loaders:** GLTFLoader only (approved). **T4 look:** unchanged. `?cast=painted` still restores the painted cast.
> **Last moved:** Nov 25, 2026.

**Evidence:** `responses/opus-integrate-shots/`, all 390×844 from the live game.

| File | Shows |
|---|---|
| `1-hale-dialogue-room412.png`, `1b-hale-hands-up.png` | Hale's dialogue beat |
| `2-patient-on-bed-ward.png` | the lying patient on a ward bed |
| `3-nurse-female-bed-push.png`, `3b-nurse-male-orderly-transfer.png` | both nurses in play |
| `4-bed-push-behind-two-hands.png` | the restaged bed push |
| `5-long-gun-hold-2x-ingame.png` | the 2× long-gun hold |
| `6-elevator-door-block-long-gun.png` + `elevator-door-block-long-gun.mp4` | the elevator door-block with the long gun |
| `play-real-input-visit-to-transfer.mp4` | real input through the first three cuts |
| `transition-timer-after.txt`, `camera-audit.txt`, `fairness-audit.txt`, `fullrun-seed7.json` | the numbers |

## Verification (run once, at the end, on the final code)
| Check | Result |
|---|---|
| Engine tests | **24/24**, 0 page errors |
| Data validation | **206 objects, 0 errors** |
| Fairness audit | **PASS: 365 damage events, 0 violations** |
| Camera audit | **PASS**: A–E 0, 0 page errors. It now covers cutscenes too; see step 1. Warning F (×1): steal staging. |
| Full playthrough | completes, 233.5 s, **0 page errors** |
| Real-input run, visit → transfer corridor | **0 page errors** |

## Step 1: CAST-QUALITY integration (Neon `df65d44`)
GLBs copied into `assets/cast/`, plus `cast-quality-manifest.json`. All are wired in `game/cast3d.js`:

| Figure | Where it shows | How |
|---|---|---|
| **Dr. Hale** (`dr-hale-mixamo.glb`) | Room 412 | `Hale_Objecting`, then `Hale_Hands_Up` once Maya's gun is out (the painted rule kept), `Hale_Talk_Standing` on his own lines. The painted Hale is off when the 3D one is ready. |
| **Cole, fixed** (new `cole-mixamo.glb`) | bed and chair (as before) | Neon's mattress offset for the 0.72 m mattress (`Lay_Breathless` **−0.2626**) replaces my old −0.15 for the previous model. |
| **Lying patient** (`patient-lying-mixamo.glb`) | the ward's 3 beds | its own `Lay_Sleeping / Breathless / Moaning` clips at its own calibrated offsets (−0.2374 / −0.224 / −0.2439), still frozen and merged: **1 draw call**, 22.3k triangles |
| **Nurse female / male** | the `nurse` / `orderly` bystanders (bed push, transfer, gauntlet halls, cafeteria) | `Staff_Walk` paced by each body's own foot-contact pace (2.507 / 2.530 m/s), `Staff_Cower_Duck` when they pause or are hit, `Staff_Idle` otherwise. Bone hit capsules, so the civilian penalty still works. 2 spawned in the seed-7 playthrough. |

**Found and fixed on the way:**
- **Room 412 regression.** The visit camera was authored *outside* the room's corner at (3.75, −7.05); the room ends at x 3.6, z −6.5. It only ever worked because single-sided walls were invisible from behind, and CAMERA-FIX made the walls double-sided, so the opening shot became a wall. The camera moved inside the corner (3.25, −6.15), aimed at the same target.
- **Audit gap.** The camera audit **skipped cutscenes**, which is why it didn't catch the above. Cutscenes are now audited for wall fill and void (B/C). Per the standing rule, a defect that gets past the gate means the gate gets the check.
- **Load error.** Foot-point measuring picked the first skinned mesh, which on the nurses is hair or a badge, and the load failed. It now picks the body mesh.

## Step 2: bed-push staging (owner ruling)
- Maya now stands **behind the push bar, square to travel** (no side offset).
- After her push-clip pose each frame, **her two hands' midpoint is solved onto the bar** (horizontal correction, smoothed): `HC.handsToBar`, the same for the wheelchair handles.
- In the chair and bed **play views** the rider camera sits right behind her, so she would fill a third of the frame. She **isn't drawn while her head is within 1.6 m of the lens**. A see-through fade was tried first, at 25% and then 0.9–1.6 m, but her face showed through when she turned to fire, which read worse.
- She stays fully visible in the wider framings: the bed-push opening (`4-bed-push-behind-two-hands.png`), cutscenes and the holdout.

## Step 3: long gun (GEAR-FIX `582b182`)
- The rebuilt N2 carries the **Stribog SMG** as a skinned mesh (`N2LongGun`); only pistol meshes are stripped now.
- **Muzzle:** a node on `RightHand` at the barrel tip. All enemy flashes, the round's launch point (`addFlight` from the barrel) and the aim twist use it.
- **Neon's manifest tip vs the gun's geometry:** I check `weapon_muzzle.tip` against the actual skinned gun geometry in the aim pose (the vertex furthest along the forearm). They **disagree by 27.7 cm**, so the measured tip is used. The manifest is used automatically when it agrees within 4 cm. Neon: the manifest frame or units look off, worth a check.
- Maya and Cole keep the seated pistol (Maya is unarmed in her GLB; Cole is hidden in his own views).
- **2× proof:** `5-long-gun-hold-2x-ingame.png` (live game, 2× device pixels, cropped). The elevator door-holder carries it (`6-…`).

## Step 4: TRANSITION-HITCH
**Instrumented** with `tools/transition-timer.cjs`: the shipped page on its own rAF loop, the START button, `?auto=1`. It logs every frame's wall time and segment, with simulation and render time per frame.

**Before** (frame time over the run's median, which is 233–250 ms on this CPU renderer):

| Cut | Hitch |
|---|---|
| visit → bed push | **966 ms** |
| bed push → transfer cut | 183 ms |
| transfer cut → chair corridor | 33 ms |
| chair corridor → elevator | 50 ms |

**Diagnosis** (CPU profile + three.js `renderer.info` across the cut): the JavaScript was idle; the cost was GPU-side first-use work.
- **4 new shader programs compiled at the cut.** In three.js every lit program is keyed on the number of lights and shadow-casting spots, and my T4 code was **toggling lights' `visible` / `castShadow`** by zone. The light set changed at the cut, and every material on screen recompiled.
- **19 texture uploads** for objects first seen in the bed-push halls.
- First-use draw-state set-up.

**Fixes:**
1. **The light set never changes:** every light and shadow caster stays on, and lights are switched by intensity (`t4look.js`). Programs during the run: 27 → 27, where it was +4 at the cut.
2. **One-time warm-up behind the start screen** (`C.warm`):
   - a pool of 6 N2 figures, which spawns now take instead of cloning;
   - one hidden render with **frustum culling off for every mesh** (all textures upload, every program and shadow variant compiles), with the first-shot FX materials included;
   - a **camera tour**: the real pipeline renders once from the start of all 16 rail paths.

   It costs **240 ms at load** in the seed-7 playthrough (548 ms measured in another run).

**After** (`transition-timer-after.txt`, median 250 ms):

| Cut | Hitch |
|---|---|
| visit → bed push | **17 ms** |
| bed push → transfer | 33 ms |
| transfer cut → corridor | 33 ms |
| corridor → elevator | 67 ms |

Every cut is now **under 0.1 s of hitch; the target was under 0.5 s.** One bump remains mid-beat, about 1.2 s into the bed push when the first wave's cover prop spawns: about 215 ms over the median, on this CPU renderer.

**Honest note:** this container renders on the CPU (SwiftShader), so absolute milliseconds aren't phone milliseconds. The removed causes (shader recompiles, texture uploads, per-state set-up at the cut) are exactly the work that stalls a phone GPU at a scene change.

## Tools added or changed in this bundle
| Tool | Change |
|---|---|
| `tools/transition-timer.cjs` | new: frame timing across cuts, with a step / render split per frame |
| `tools/camera-audit.cjs` | audits cutscenes (B/C) |
| `tools/cast-beats.cjs` | waits for the second cast batch |

`tools/README.md` lists the gate.

## Not in this bundle (parked, per OPUS-NEXT)
VEHICLE-QUALITY.

# Opus: cast pass (Mixamo set → VALID gunmen)

> **Logins:** none by me (Cherie's Mixamo downloads, as committed). **Paid:** none. **Installs (free):** Blender 5.3 as the `bpy` Python module (GPL; a tool only, nothing GPL ships).
> **Live game:** `games/hospital-escape/` is untouched. Everything is in my lane.
> **Last moved:** Nov 24, 2026 (this push).

**Entry:** `games/hospital-escape-3d-sample-opus-mixamo/?g=1..5`
- The live game page, plus the five VALID gunman designs from my shooter entry, now driven by the Mixamo pistol set.
- `?recoil=` sets the fire-kick gain (default 1.0 = as authored).

**Retarget viewer:** `games/hospital-escape-3d-sample-opus/mixamo/viewer.html`
- Every one of the 47 retargeted clips, on any of the five VALID bodies (not on Y Bot).

**Evidence:** `tasking/responses/opus-cast-pass-shots/`, all 390×844 from the real rail camera:
- `gunman-walk-aim-fire.mp4`: 8 s, 30 fps. He walks in at 1.30 m/s firing every 1.6 s, stops, holds aim and keeps firing.
- `gunman-walk-aim-fire-zoom2x.mp4`: the same frames cropped 2× around him, upscaled back to 390×844, labelled as a crop.
- Stills (full frame):
  - `1-walking.png`
  - `2-firing-while-walking.png`
  - `3-aiming-standing.png`
  - `4-firing-standing.png`
  - `zoom-sheet.png`: 2× crops of the shot frames.
- `sheet-gunman-retargeted.png`, `sheet-fire-sideview.png`, `sheet-cole-maya-retargeted.png`: the retargeted VALID body on a grid, outside the game.
- `hit-overlay-*.png`: rendered silhouette vs hit proxies.
- `metrics.json`: every number below.

## Measured
| | Design 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Walk pace, stance-phase foot contact on this body (m/s) | 2.633 | 2.690 | 2.725 | 2.810 | 2.717 |
| Run pace, same measure (m/s) | 3.305 | 3.234 | 3.282 | 3.339 | 3.235 |
| Walk timeScale at the 1.30 m/s law | 0.494 | 0.483 | 0.477 | 0.463 | 0.478 |
| Run timeScale at the 3.2 m/s law | 0.968 | 0.989 | 0.975 | 0.958 | 0.989 |
| Walk slide, strict median per contact (cm) | 0.9–3.2 | 0.3–1.4 | 1.2–2.4 | 1.0–1.4 | 1.0–2.3 |
| Page errors | 0 | 0 | 0 | 0 | 0 |
| Triangles / calls per figure | 7,484 / 5 | 7,484 / 5 | 7,484 / 5 | 7,484 / 5 | 7,483 / 5 |
| Height (head joint) | 1.74 m | 1.71 m | 1.72 m | 1.75 m | 1.69 m |

- **Run at 3.2 m/s** (designs 1 and 3): slide **1.1–1.9 cm** per contact, 0 errors.
- **Hit agreement** (rendered silhouette vs per-pixel raycast against the hit proxies, about 7–8 m from the rail camera):
  | | Walking: body pixels hit / overall agreement | Stopped aiming: body pixels hit / overall agreement |
  |---|---|---|
  | Design 1 | **91.7%** / 84.4% | **88.5%** / 82.7% |
  | Design 4 | **92.0%** / 81.8% | **90.3%** / 79.4% |

  For comparison, the UAL-driven entry measured 91.1% and 93.5% body pixels hit.
- **Fire kick (design 1):** measured as the muzzle position against an identical run with firing off (1/60 s steps, deterministic). The authored Mixamo kick is **6.2 cm peak per shot**, mostly straight back, with **0.6–1.6 cm** rise.
  - At phone distance, head-on, that's subtle. `?recoil=2.5` measures 18.4 cm (rise 1.3–4.5 cm).
  - I left the default at 1.0: the engine's muzzle flash carries the fire read, and an exaggerated kick looks cartoonish.

**The walk pace is the headline finding.** Mixamo's **Pistol Walk is fast**: 2.57 m/s of root motion on Y Bot, confirmed by the stance-foot measure (2.63–2.81 m/s on the VALID bodies). Two consequences:
- At the 1.30 m/s law it plays at **about 0.48×**. That reads as a slow, long-stride stalking advance, which is right for a gunman closing on Cole, but **it is not a normal walk cadence** (about 75 steps a minute).
- If Cherie wants a brisker cadence at 1.30, the honest fix is a slower source walk, not a faster timeScale, because that skates the feet. Candidates already in the set:
  - **Injured Walking** (1.71 m/s root on Y Bot);
  - **Walking (feminine)** (1.61 m/s);
  - or, at the next Mixamo session, a plain "Walking" plus my aim layer.

**The run fits the law almost exactly.** Running With Aimed Pistol measures **3.23–3.34 m/s**, so at 3.2 m/s it plays at 0.96–0.99×. The 2.04 m/s switch sits between the two.

## Method (recreate from paper)
All tools are in `games/hospital-escape-3d-sample-opus/mixamo/`.

**0. Decode and verify.** For each `X.fbx.gz.b64`, run `base64 -d | gunzip`, then check the SHA-256 against MANIFEST.md. All **48/48 matched**.

**1. FBX → animation-only GLB** (`fbx_to_glb.py FBX_DIR OUT_DIR`, Blender `bpy`, about 19 s for all 48).
- Import with Blender's FBX importer. It sets the scene to the file's 30 fps; Pistol Walk is keys 1–25 = 0.8 s.
- Strip `mixamorig:` from all 65 bone names, delete any mesh, export armature + action as GLB (Y up, sampled every frame).
- Y Bot keeps its skin, only for the rest reference.
- Root motion is kept. The in-place cut happens in step 3, where it can be measured.

**2. Calibrate.** Y Bot and VALID share the bone names 1:1. Only end bones differ: Y Bot `*_End`, `HeadTop_End`; VALID `*End`, eyes, finger-4 ends. Those are simply not mapped.
- **Both rests are T-poses facing +Z with +X on the character's left.** I checked: Y Bot's `LeftArm` is at +x 0.19 m, VALID's at +x 18.7 cm, and both heads sit forward of the hips.
- So the calibration is a per-bone **world-rotation rest delta**, taken from each file's own rest (identical to the `y-bot-tpose` file's rest).

**3. Retarget offline** (`retarget.js`, run with `node run.cjs retarget.js '{"dir":…,"body":…,"clips":[…],"inplace":[…],"out":…}'`).
- It runs in headless Chromium with three r128 + GLTFLoader + GLTFExporter.
- **Reference body:** VALID White_M_2 (leg 86.56 cm). Per clip, at its own 30 fps keys:
  1. **Sample the source:** world rotations of every shared bone; world positions of hips, thighs, ankles and toes. The action is LoopOnce, because a repeating action wraps the last key to frame 0, which first read as zero travel.
  2. **Rotations:** `targetWorld = srcWorld · srcRestWorld⁻¹ · tgtRestWorld`, written back as `local = parentWorld⁻¹ · targetWorld`, parents first.
  3. **Hips:** `tgtHipsRest + (srcHips − srcHipsRest) · s`, with `s` = target leg / source leg (= 104.67; it also converts m to cm).
     - **In-place clips** (the 13 locomotion clips) lose only the straight-line travel `(end − start) · t / T`. Sway, bob and turn stay.
  4. **Foot-lock:** the ankle goal is `targetThigh + (srcAnkle − srcThigh) · s`. Then two-bone IK (law of cosines, knee pole = the current knee), then the source foot's world rotation is re-applied. A planted Mixamo foot therefore stays planted on VALID's proportions.
  5. **Ground pass:** pass 1 finds the lowest ankle/toe height, pass 2 shifts the hips so it meets VALID's rest sole.
     - Locomotion: the minimum over the cycle.
     - Everything else: the **first frame**, which stands or sits on the floor. (My first version used the whole clip and lifted the deaths 14 cm, because a lying ankle is lower than a standing one.)
     - The three **laying clips: none**. They are authored on a bed about 1 m up, and the first version dragged them to the floor.
  6. **Export:** the bare VALID skeleton (no mesh) plus all clips.
     - `mx-gunman.glb`: 27 clips, 3.5 MB.
     - `mx-cole-maya.glb`: 20 clips, 3.6 MB.

  Per-clip loop error, root speed, stance speed and ground offset are in `retarget-report-*.json`.

**4. Load on each of the five bodies** (`opus-mixamo.js`).
- Rotations are used as-is. The hips track is re-based onto this body's rest, scaled by its leg ratio to the reference (0.964–1.021).
- Bodies, garments, pistol, lamp lighting and hit proxies are unchanged from my shooter entry.

**5. Pace** (the stance-phase contact only).
- At load, each gait clip is played on this body at 240 samples. The heel and toe points come from its own sole vertices.
- A point counts as in contact while within 1 cm of its lowest height (two consecutive samples).
- Pace = the median of its backward speed along the travel direction: 172 samples for the walk, 109 for the run.
- `timeScale = speed / pace`. Below 2.04 m/s the gunman walks; at or above, he runs.

**6. Layer.**
- **Moving:** Pistol Walk / Running With Aimed Pistol, **full body**. Both are aimed two-handed already, so there's no seam.
- **Standing:** Pistol Idle **legs** (it has an authored foot shuffle and weight shift, which you'll see in the clip) plus a held aim from Pistol Aim keys 0–16.
- **Fire:** "Firing A Gun" keys 6–33 (the single kick), upper body, made **additive** (`AnimationUtils.makeClipAdditive`, `AdditiveAnimationBlendMode`). It lands on top of walk, run or aim without stopping the legs.
- **Hit:** "Hit Reaction While Holding A Pistol" keys 0–30, additive the same way.
- **Death:** odd designs "Shot To The Chest Falling Backwards"; even designs "Dying … Fall On One Knee".
- The spine still twists toward the camera from the measured gun-arm direction (shooter-entry code).

**7. Test** (`opus-walk-mx.cjs`, `hitagree.cjs`, `recoil.cjs`): the same walk protocol as the shooter entry.
- Gauntlet hall, real rail camera, seed 7, fixed 1/60 s steps, frames every 2 steps.
- A contact is a sole point within 1 cm of the floor and moving under 0.6 m/s; slide is its horizontal travel.

## Cole and Maya
- **Retargeted, not yet integrated.** All 15 Cole and 5 Maya clips are on the VALID rig, with the same method and the same files, and visible in the viewer. Sheet: `sheet-cole-maya-retargeted.png`.
- **Cole** has his seated set:
  - Sitting Idle (breathing / thighs / still);
  - **Aim Pistol (seated)** and Sitting Aiming Then Lowering, his seated aim;
  - Sitting In Disbelief, the slump candidate;
  - Rubbing Arm, Dodges;
  - three bed lies;
  - Sit/Stand transitions, Injured Walking.

  The seated aim is now a real clip, so the "Pistol Idle arms over Sitting legs" layer from my plan isn't needed.
- **Maya:** "Pushing An Object Forward" turns out **not to be a walk**. It's a crouched heavy shove that covers 0.09 m/s. The loop to use is **Walking With A Full Wheelbarrow**:
  - 1.61 m/s root on Y Bot, loop error 0;
  - hands low and forward;
  - needs arm IK up onto the 1.0 m bed bar / 1.05 m chair handles.

  Push Start / Push Stop are the transitions.
- **Not done this pass:** the Cole and Maya figures in the walk-off world. Cole's VALID body and the arm IK onto the bar are the integration step, which per the tasking is Moth's walk-off. My clip file and viewer are the hand-off.

**MPFB2: not used.** The VALID bodies take Mixamo 1:1 by name, so a second body source would only add a calibration step.

## Gaps
- **Walk cadence at 1.30 m/s** (above). The numbers are real; the look is a slow stalk.
- **The clips are retargeted onto one reference body.** The other four get rotations plus leg-scaled hips. Their slide (0.3–2.4 cm) shows that's enough, but a per-body bake is a one-line loop if wanted.
- **Turning:** the three turn clips are retargeted but not wired. The engine still yaws the root directly (no "Pistol Turn" exists, per the brief).
- **Hit/death:** only exercised in the viewer and the retarget report, not in the walk test, which doesn't shoot the gunman.
- **The fire kick is small head-on** (6.2 cm, mostly backward). It's a gain knob, not a rebuild.

## Loader / module flags
- **GLTFLoader** (`examples/js/loaders/GLTFLoader.js`, pinned CDN `three@0.128.0`): the page and the viewer. Same as the shooter entry.
- **Offline only, never shipped to a game page:** GLTFExporter and SkeletonUtils (same pin), in `probe.html` for the retarget run.
- Additive blending is core `three.min.js` (r128).

## Licence / provenance
- **Mixamo:** animations downloaded by Cherie's account. Adobe's terms cover using the animations in projects; my retargeted GLBs are derived game data. **Y Bot is not shipped**; it's only used offline as the rest reference.
- **VALID bodies:** MIT, licence in `valid/VALID-LICENSE.txt`.
- All tools are mine.

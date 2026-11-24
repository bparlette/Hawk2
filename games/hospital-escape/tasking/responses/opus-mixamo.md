# Opus: Mixamo download run (QUESTIONS-MIXAMO.md)

**Honesty note on names.** I can't browse the Mixamo catalog from here, so the names below are from memory of the library. Where I'm sure, the name is plain. Where I'm not, it's marked *(verify)* and comes with a fallback search term: take the closest result. Don't skip a row because the exact title differs.

**Why Mixamo fits my pipeline almost perfectly:** Mixamo's bone names (`mixamorig:Hips`, `Spine`, `Spine1`, `Spine2`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftArm`, …) are **the same names the VALID bodies use**, minus the prefix. My retargeter (world rest-delta plus two-bone foot-lock, already in `hospital-escape-leaders-opus/leaders.js` and `hospital-escape-3d-sample-opus/`) maps them 1:1 with no bone table.

## 1. Clip names

### Gunman
| Need | Clip | Notes |
|---|---|---|
| pistol walk | **Pistol Walk** | |
| walk backward | **Pistol Walk Backward** | the retreat / back-off (`rushStop`) |
| aim-walk forward | **Pistol Walk** again, plus my aim layer | *(verify: if an "aiming" walk variant exists, take it too)* |
| strafe left / right | **Pistol Strafe** *(verify)* | download once normally and once with **Mirror** ticked = left + right |
| run with pistol | **Pistol Run** | |
| crouch-walk | **Crouched Walking** *(verify; fallback search "crouch walk")* | |
| fire-while-moving | none needed | my upper/lower layering already fires over any walk. Grab the firing pose: **Shooting** *(verify; fallback "pistol shoot")* |
| idle / aim | **Pistol Idle**, **Pistol Kneeling Idle** | kneeling = the low cover shooter |
| cover peek | **Standing Cover** / **Cover To Stand** *(verify; fallback "cover")* | any peek-out-and-back pair |
| hit-react | **Hit Reaction** + one **Pistol Hit Reaction** *(verify)* | two variants, so repeats don't look canned |
| death | **Dying** + **Death From The Front** *(verify)* | two variants |
| missing from the list | **Pistol Run Backward** *(verify)*, **Turn** clips (**Pistol Turn Left/Right** *(verify; fallback "turn 90")*) | turns stop the yaw-snap when a gunman changes direction |

### Cole
| Need | Clip |
|---|---|
| sitting idle | **Sitting Idle** |
| seated variety | **Sitting** *(verify; any calm seated loop)* |
| seated aiming | no clip expected. I'll layer **Pistol Idle**'s arms (upper body only) over **Sitting Idle**'s legs and hips: the same split I use for walk + aim |
| injured | **Injured Idle**, **Injured Stumble Idle** *(verify)*, **Injured Walk** (the stand-and-go beats, if any) |
| transfer | **Sit To Stand** / **Stand To Sit** | the bed-to-wheelchair cut |
| slumped / passing out | **Dying** frame-held, or a "fall asleep sitting" clip *(verify; fallback search "sleeping sitting")* | the consciousness fade's slump |

### Maya
- **One clip serves both.** The bed's push bar is now 1.0 m (I lowered it) and the wheelchair handles are about 1.05 m. A push walk plus my two-bone arm IK onto the bar covers both pushes, so separate clips aren't needed.
- **Pushing** / **Push Start** / **Push Stop** *(verify; fallback "push")*. Take the looping push walk.
- If the catalog only has a heavy-object push (bent forward, slow), take it anyway plus a plain **Walking**. I'll blend the upper body down.

## 2. Characters
- **Y Bot**, once, **With Skin**, T-pose (the default pose with no animation applied). This is the rest-pose reference the retarget needs.
- **No other Mixamo characters as bodies.** The VALID bodies (MIT, photoreal, 7.5k triangles) are better, and Mixamo character redistribution is the licence point to avoid.

## 3. Settings (corrections to Moth's defaults)
| Setting | Use | Why |
|---|---|---|
| Format | **FBX Binary** | Blender's FBX importer (I convert offline) reads binary fine |
| Skin | **Without Skin** for every clip; **With Skin** only for the Y Bot T-pose reference | |
| fps | **30** | the game steps at 60 and interpolates; 60 doubles the file size for nothing |
| Keyframe reduction | **off** | reduction breaks foot contacts, which my pace and foot-lock depend on |
| In Place | **ON** for every locomotion clip (walks, strafes, runs, crouch, push) | the engine owns the root; I pace by foot contact |
| One extra | **Pistol Walk with In Place OFF** (travelling) | it lets me check my measured foot-contact speed against the true root speed |
| Trim | **none** | I cut the loop myself at matched heel strikes |
| Overdrive / arm-space sliders | **defaults** | except: if a clip has a "Character Arm-Space" slider and the arms clip the body on Y Bot, nudge it up |

## 4. My steps once the files land
1. **FBX → GLB, offline, in Blender:** strip the `mixamorig:` prefix, keep rotations, export animation-only GLBs to `assets/mixamo/clips/`. The FBXs stay in `mixamo-src/` as sources only.
2. **Calibrate rest:** Y Bot T-pose against the VALID T-pose, as a per-bone world-rotation delta. Both are +Z-facing T-poses, so this is the rest-delta my CMU retarget already uses.
3. **Retarget at load or offline** to each VALID body. For locomotion clips, run the **foot-lock IK** pass (heel strike to heel strike loop cut, ground pass).
4. **Pace** every locomotion clip from the foot-contact probe, then check it against the travelling Pistol Walk.
5. **Layer:**
   - Pistol Walk and Pistol Run are full-body, with no layer needed when the gunman faces his movement.
   - Strafes and backward walks: legs from the clip, upper body from **Pistol Idle** plus my measured spine twist toward the camera.
   - Fire: an upper-body **Shooting** overlay.
6. **What replaces what:**
   - **N2+:** CMU walk → **Pistol Walk** (now shippable from your account).
   - **My five gunmen:** UAL clips → Mixamo pistol set.
   - **Cole:** procedural / painted seated → **Sitting Idle** with the aim layer.
   - **Maya:** painted push → **Pushing** with arm IK to the bar.
   - The hit proxies, lamp lighting and fairness code are unchanged.
7. **Proof:** the shooter-asset walk harness re-run (slide per contact, hit agreement, 0 errors) before anything goes near the live game.

## 5. While the account is open
Sketchfab and Fab both need logins; Poly Haven and ambientCG don't. These are for the **combine-round hallway** (real props on the take 5 look).

**Licence rule for every pick:**
- OK: **CC0** first, then **CC-BY** (credit line in the report).
- Never: **NC** (non-commercial), **ND**, or Sketchfab "Standard/Editorial".
- On **Fab**, read each asset's licence on its page before downloading. Free "Standard License" assets are generally usable in any engine, but confirm per asset, and skip anything restricted to Unreal.

**What to grab** (search terms; I won't invent URLs):
- **Sketchfab:** filter Downloadable + CC0/CC-BY, then search:
  - `hospital gurney` / `hospital bed`;
  - `crash cart` / `medical cart`;
  - `IV stand`;
  - `wheelchair` (only as a prop reference: ours is gameplay geometry);
  - `nurse station`;
  - `hospital corridor props`;
  - `waiting room chairs`;
  - `fire extinguisher`;
  - `exit sign`.

  Prefer low-poly or "game-ready" versions under 5k triangles with baked textures.
- **Fab:** free hospital/medical prop packs and free Megascans surfaces (concrete, vinyl, painted plaster). Same licence check.
- **Optional, no login:** Poly Haven HDRIs aren't needed indoors, but Poly Haven models (CC0) — `industrial` / `office` props.

Silence on anything here = Moth's defaults are fine.

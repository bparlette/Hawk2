# Response — Mixamo Download Run & Login-Gated Picks (Neon)

**Task:** [`games/hospital-escape/tasking/QUESTIONS-MIXAMO.md`](../QUESTIONS-MIXAMO.md) (`92065a3`)  
**From:** Neon (to Moth / Cherie)  
**Target rigs:** `N2` 84-bone `VALID` skeleton ([`n2-valid-mocap-v2.glb`](../../../hospital-escape-leaders-neon/assets/n2-valid-mocap-v2.glb), exact Mixamo bone names minus `mixamorig:` prefix) + upcoming hero cast (`Maya`, `Cole`, `Dr. Hale`).

> **Critical catalog naming note:** Mixamo reuses the same short display name (e.g. `Pistol Strafe`, `Pistol Run`, `Hit Reaction`, `Dying`, `Sitting Idle`, `Pushing`) across completely different animations. I included the **exact catalog `Description`** and **Mixamo Product ID (`id`)** from Mixamo's API below so Moth grabs the exact right clip on the first pass.

---

## 1. Exact Mixamo Clip Names

### Gunman (`N2` Plain + Scrubs — Replaces `local-test-only` `Soldier.glb` + Stiff `UAL` Locomotion)
| Role Slot | Exact Mixamo Name | Exact Catalog Description | Product ID | Usage Note |
|---|---|---|---|---|
| **Pistol walk / aim-walk fwd** | `Pistol Walk` | `Walking With An Aimed Pistol` | `c9cdb8f0-b96c-11e4-a802-0aaa78deedf9` | Core aimed patrol/advance walk (`Root Motion`). Mixamo has no separate low-ready pistol walk; if low-ready patrol is needed, blend legs from `Walking` with upper body of `Pistol Idle` (`Ready Alert Two Hand Pistol Grip`). |
| **Walk backward** | `Pistol Walk Backward` | `Walking Backward With An Aimed Pistol` | `c9cdba81-b96c-11e4-a802-0aaa78deedf9` | Retreat while aiming. |
| **Strafe left** | `Pistol Strafe` | `Strafe Left With An Aimed Pistol` | `c9cdbb48-b96c-11e4-a802-0aaa78deedf9` | Lateral step left. |
| **Strafe right** | `Pistol Strafe` | `Strafe Right With An Aimed Pistol` | `c9cdbc0b-b96c-11e4-a802-0aaa78deedf9` | Lateral step right. |
| **Run with pistol (aimed)** | `Pistol Run` | `Running With Aimed Pistol` | `c9c9b1f3-b96c-11e4-a802-0aaa78deedf9` | Aggressive closing run. |
| **Run with pistol (unaimed)** | `Pistol Run` | `Running With A Pistol` | `c9cdb75a-b96c-11e4-a802-0aaa78deedf9` | Corridor sprint / pursuer charge (grab **both** `Pistol Run` variants). |
| **Crouch-walk (legs base)** | `Crouch Walk Forward` | `Walking Forward While Crouched` | `b9fbd249-a554-423c-aa37-baa98223c4dc` | **Mixamo gap:** zero native crouch-walk-with-pistol clips. Retarget lower body from `Crouch Walk Forward` (`Walking Forward While Crouched`, fallback `Crouched Walking` / `Crouched Walk` `c9c640fa-b96c-11e4-a802-0aaa78deedf9`) + layer upper body from `Pistol Kneeling Idle`. |
| **Crouch aim & transitions** | `Pistol Kneeling Idle` | `Kneeling Idle With Aimed Pistol` | `c9cdc22d-b96c-11e4-a802-0aaa78deedf9` | Also grab `Pistol Stand To Kneel` (`c9cdc166-b96c-11e4-a802-0aaa78deedf9`) & `Crouch To Stand` (`Crouch To Stand With Pistol`, `c9c62a20-b96c-11e4-a802-0aaa78deedf9`). |
| **Fire-while-moving (upper layer)** | `Shooting Gun` · `Shooting` · `Gunplay` | `Shooting Handgun` · `Firing A Gun` · `Standing Shooting Rapid Fire` | `c9c76d0a-...` · `c9c840de-...` · `c9c63806-...` | **Mixamo gap:** Mixamo only has fire-while-walking for rifles (`Firing Rifle`), not pistols. Layer `Shooting Gun` / `Shooting` additively from `Spine1` upward over `Pistol Walk` / `Pistol Strafe` / `Pistol Run`. |
| **Cover peek & shoot** | `Shooting Pistol` · `Stand Cover To Look` · `Cover Idle` (×2) · `Femme Peek Around Corner` · `Gunplay` | `Shooting A Pistol From Behind Cover` · `Stand Cover To Looking Around A Corner` · `Standing Cover Against Object` · `Crouched For Cover Against Object` · `Female Peek Around Corner With Gun` · `Cover To Shooting` | `c9c81565-...` · `c9cc0cdf-...` · `c9c9989b-...` · `c9c997ce-...` · `c9c69167-...` · `c9c638d4-...` | `Femme Peek Around Corner` retargets cleanly onto male rigs for doorframe lean-out with zero hip sway issues once shoulder width is retargeted to `Y Bot`. |
| **Hit-react (pistol-safe)** | `Hit Reaction` (×2) | `Hit Reaction While Holding A Pistol` · `Reaction To Getting Hit To The Left While Holding A Pistol` | `c9c6bc60-b96c-11e4-a802-0aaa78deedf9` · `c9c6baf0-b96c-11e4-a802-0aaa78deedf9` | Keeps right-hand grip pose intact during stagger (unlike generic unarmed hit reactions). |
| **Death (×3)** | `Dying Backwards` · `Dying` (×2) | `Shot To The Chest Falling Backwards` · `Dying Shot To The Chest Falling On Two Knees` · `Dying Shot To The Head Falling On Two Knees` | `c9c6dcf2-...` · `c9c62e30-...` · `c9c62fce-...` | Gives front/headshot variety without hallway wall clipping. |
| **Missed gunman essentials** | `Pistol Idle` (×2) · `Pistol Aim` · `Pistol Walk Arc` (L/R) | `Idle With Aimed Pistol` · `Ready Alert Two Hand Pistol Grip` · `Pistol Aim To Holster Idle` · `Walk Arc Left/Right With An Aimed Pistol` | `c9cdb599-...` · `c9c6b74c-...` · `c9c8b958-...` · `c9cdbd9a-...` / `c9cdbcce-...` | Needed for guard stands, alertness transitions (`Ready Alert Two Hand Pistol Grip` is great), and smooth corridor corner entries. |

### Cole (Wheelchair, Hospital Bed, & Ambulance Bay)
| Role Slot | Exact Mixamo Name | Exact Catalog Description | Product ID | Usage Note |
|---|---|---|---|---|
| **Sitting idles** | `Sitting Idle` (×3) | `Sitting With Breathing Idle` · `Sitting Still In A Chair` · `Sitting In Chair Hands Resting On Thighs` | `c9ccab1b-...` · `c9cb95c1-...` · `c9cb9783-...` | `Sitting With Breathing Idle` is clean base for wheelchair breathing; adjust hip/knee flex slightly for wheelchair seat depth. |
| **Seated aiming / recoil** | `Aim Pistol` · `Lower Pistol` · `Sitting Gun Motion` | `Aim Pistol While Sitting` · `Lower Pistol While Sitting` · `Sitting And Motioning With A Gun` | `c9c8ff29-...` · `c9c8df3d-...` · `c9c8ebe2-...` | Direct match for wheelchair & ambulance bay shooter beats (blend `Shooting Gun` upper recoil onto `Aim Pistol`). |
| **Injured slumps & ducking** | `Sitting Rubbing Arm` · `Sitting Disbelief` (×2) · `Sitting Dodges` | `Sitting And Rubbing Arm` · `Sitting In Disbelief With Head Forward` · `Sitting In Disbelief With Head Back` · `Dodging While Sitting` | `c9c8f597-...` · `c9cb93af-...` · `c9cb8e7b-...` · `c9c91a0a-...` | No literal clip named "Injured Slump" in Mixamo; `Sitting In Disbelief With Head Forward` + `Sitting Rubbing Arm` read naturally as wounded exhaustion / slump. |
| **Bed recline & breathing** | `Laying Breathless` · `Laying Moaning` · `Laying Sleeping` | `Laying While Breathless Idle` · `Laying Squirming And Moaning` · `Laying Asleep On A Bed` | `c9ce6cd3-...` · `c9ce7187-...` · `c9ce6e3b-...` | Direct match for Stage 1 hospital bed wake-up & pain loops. |
| **Standing injured (Stage 2/3)** | `Injured Walking` · `Injured Walk` | `Walking With Arm Injury` · `Injured Walking` | `c9c641cc-b96c-11e4-a802-0aaa78deedf9` · `c9cdc569-b96c-11e4-a802-0aaa78deedf9` | Needed if Cole takes steps supported or braced near extraction. |

### Maya (Wheelchair Push & Bed Push — **Separate Clips Required**)
- **No — one clip cannot serve both cleanly.** Hospital bed pushing puts both hands wide (`~0.9 m` apart) at chest height (`~1.05 m`) with heavy forward trunk pitch (`25–30°`) and driving stride, whereas pushing Cole's wheelchair uses narrow hands (`~0.46 m` apart at `~0.98–1.02 m`), a brisk upright gait (`~10–14°` lean so Maya looks over Cole's shoulder), and looser elbow flexion.
  - **Bed push:** `Pushing` (`Pushing An Object Forward`, `c9c857a0-b96c-11e4-a802-0aaa78deedf9`) + `Pushing` (`Pushing A Heavy Object`, `c9c9d617-b96c-11e4-a802-0aaa78deedf9`) + `Push Start` (`c9c9d4a0-b96c-11e4-a802-0aaa78deedf9`) + `Push Stop` (`c9c9d793-b96c-11e4-a802-0aaa78deedf9`).
  - **Wheelchair push:** `Wheelbarrow Walk` (`Walking With A Full Wheelbarrow`, `c9cda90f-b96c-11e4-a802-0aaa78deedf9`) — already has the exact two-hand forward-grip stride with upright sightline; raise wrists ~12 cm onto the wheelchair handle grips via Blender IK cleanly, plus grab `Walking` (`Feminine Walk Forward`, `c9c987f5-b96c-11e4-a802-0aaa78deedf9`) as fallback leg cycle if speed-matching needs a lighter stride.

---

## 2. Characters

- **Download `Y Bot` (`4f5d21e1-4ccc-41f1-b35b-fb2547bd8493`) ONE time as `T-Pose` (`With Skin`)** and keep **`Y Bot` selected as the active character for every `Without Skin` animation download.** That locks identical neutral T-pose rest orientations, limb proportions, and `Hips` height across every clip in the batch.
- **Do NOT use Mixamo human characters (`Swat`, `Remy`, `Megan`, etc.) as final shippable bodies:** our MIT `VALID` (`N2 v2` 84-bone) and CC0 cast bodies already match the St. Mercer cast sheet and avoid Adobe Mixamo's raw-mesh redistribution gray areas in a public GitHub repo.

---

## 3. Download Settings — Corrections to Moth's Defaults

| Setting | Moth Default | Neon Recommendation | Why |
|---|---|---|---|
| **Format** | `FBX Binary (.fbx)` | **Keep `FBX Binary`** | Blender `5.2.3`'s FBX importer rejects ASCII FBX. |
| **Skin** | `Without Skin` | **CORRECT: `With Skin` on 1× `Y Bot T-Pose`, `Without Skin` on all motions** | We need `Y Bot`'s exact bind T-pose rest matrices once as the retarget source reference (`0.01×` cm->m calibration). |
| **FPS** | `30 fps` | **Keep `30 fps`** | Clean balance of crisp foot-plant timing and mobile GLB size (`30 fps` matches our NLA export cadence). |
| **Keyframe Reduction** | `None (Off)` | **Keep `None (Off)`** | Curve reduction adds subtle quaternion sliding during stance phases and spoils foot-lock precision. |
| **In Place vs. Root Motion** | *(unspecified)* | **CORRECT: `In Place` UNCHECKED (Root Motion ON) on ALL travelling locomotion** | We need real `Hips` X/Z displacement to compute exact physical `authoredSpeed = ΔZ / duration`, preserve natural step acceleration/surge when subtracting linear velocity in Blender, and detect true foot-plant frames. *(Stationary idles/aims/reacts/deaths keep default.)* If Moth wants instant un-baked engine previews, grabbing an extra `_InPlace` copy ONLY of `Pistol Walk` and `Pistol Run` is cheap, otherwise Blender handles in-place conversion losslessly. |
| **Trim / Overdrive / Arm-Space** | Default | **Keep Full Clip (no trim), Overdrive `50` (100%), Arm-Space `50`** | Preserves symmetric gait loop margins so Blender can find optimal seam frames cleanly. |

---

## 4. Neon's Exact Pipeline Steps Once Files Land

1. **Calibrate `Y Bot` -> Target Rest Frame (once per target skeleton):**
   - Load `Y_Bot_T-Pose.fbx` (`With Skin`) and `N2` (`n2-valid-mocap-v2.glb`, `84`-bone `VALID` rig — shares exact Mixamo bone naming minus `mixamorig:` prefix).
   - Map `0.01×` Mixamo cm scale cleanly onto meter rig, compute `rest_delta_q = inv(target_rest) * source_rest` once per bone via world-quaternion retargeting (`neon_common.py`).
2. **Root-Motion Speed Measurement, Surge-Preserving Loop Trim & Foot-Lock:**
   - Read exact `authoredSpeed = ΔZ / duration` from Root Motion `Hips`, find symmetric walk-cycle zero-crossing frames for crisp `frame[0] == frame[N]` loops, subtract strictly linear velocity `v * t` (keeping natural vertical bob and step surge), and clamp planted `Foot` / `ToeBase` height to `y = 0.000` cleanly. Write exact `authoredSpeed` per clip to manifest so `speed / authoredSpeed` playback eliminates floor skating completely.
3. **Right-Hand Pistol Grip Lock & Upper-Body (`Spine1`) Layering:**
   - Apply our additive curled-finger override (`RightHandIndex/Middle/Ring/Pinky` 1–3) cleanly over `Pistol Walk` / `Pistol Run` / `Pistol Strafe` / `Aim Pistol` so every clip grips `N2 v2`'s palm pistol mount tightly without open-palm gap.
   - Bake upper-body-only recoil (`Shooting Gun`) and crouched pistol torso (`Pistol Kneeling Idle` over `Crouch Walk Forward`) into clean NLA tracks, avoiding runtime additive bone bugs in Three r128.
4. **Prop Pinning for Maya (`Wheelchair` / `Gurney`) & Seated Cole Adjustment:**
   - Bake Maya's wrist bone trajectories against wheelchair handle anchors in `Wheelbarrow Walk` (Blender limb IK pass) and Cole's pelvis/thigh pitch against the Sketchfab wheelchair cushion + ambulance bay floor.
5. **What Replaces What & Verification:**
   - **`N2` & all Enemy Gunmen:** Completely replaces `local-test-only` `Soldier.glb` clips and stiff `UAL` locomotion with crisp `Pistol Walk`, `Pistol Run`, `Pistol Strafe`, `Shooting Gun`, `Cover`, `Hit Reaction`, `Dying`.
   - **Cole & Maya:** Replaces static procedural wheel/bed poses and wrist-hovering push overrides in `hospital-escape-cast/`.
   - **Export & Verify:** Export lean GLBs (`30 fps`, `export_all_influences=False`, `apply_modifiers=False`), validate zero foot-float / palm-gap / nape-poke at `390×844 @2x` across `Front / Side / Back` in headless Chrome CDP (`contact_probe.mjs`).

---

## 5. While the Account Is Open — Other Login-Gated Picks

If Moth is grabbing hallway/cast assets under free logins for the Combine Round in the same session, prioritize **permissive-license scanned hospital props on Sketchfab (`CC Attribution 4.0`, safe to commit & ship with attribution credit)** and keep `Fab / Quixel` out of public repo source assets:

### A. Sketchfab (Free Login — Verified `CC Attribution` Models)
| Prop Need | Model Name & Face Count | Verified URL | License & Pipeline Note |
|---|---|---|---|
| **Hospital Gurney (`WEST WING B` & Maya bed)** | `Hospital Stretcher` (`3,600` faces) *(alt: `Game Prop: Mental Asylum Gurney`, `984` faces)* | `https://sketchfab.com/3d-models/none-a74239ec0dfe454a906c339071855d87` · `https://sketchfab.com/3d-models/none-43736bb6a0b64fe8a824542bdbace6bc` | **CC Attribution** — low enough to clean/bake textures to 1K & drop straight into Combine Round (`<1,500` tris after wheel cleanup). |
| **Crash Cart (`z = -43.0`)** | `Medical Cart` (`17,780` faces) | `https://sketchfab.com/3d-models/none-2a0a574f9e374702af8c415fce296f45` | **CC Attribution** — decimate drawers/wheels in Blender to ~`1.5k` tris + bake 1K PBR map. |
| **IV Stand + Bag** | `IV Stand and Bag` (`3,834` faces) | `https://sketchfab.com/3d-models/none-a93a8e70ecd2459c99e7812c6e09b88c` | **CC Attribution** — decimate bag/casters slightly (~`1.2k` tris). |
| **Hospital Wheelchair (Cole & Maya)** | `RE: wheelchair (horror game hospital)` (`1,782` faces) | `https://sketchfab.com/3d-models/none-97bd7574406d4df38d54ec4ac1f18c40` | **CC Attribution** — hero horror-hospital silhouette at game-ready tri count. |
| **Fire Extinguisher + Wall Prop** | `Fire Extinguisher` (`2,792` faces) | `https://sketchfab.com/3d-models/none-5676b179b3b744c0aaae53a3dcea2300` | **CC Attribution** — place inside glass wall cabinet mesh (`Take 4`). |
| **Wet Floor Caution Cone** | `Wet Floor Sign` (`288` faces) | `https://sketchfab.com/3d-models/none-d340f904c4684645a4e5282b5fbe963b` | **CC Attribution** — replace our geometric A-frame with photoreal stencil texture + hinge. |
| **Illuminated Exit Sign** | `Exit Sign` (`276` faces) | `https://sketchfab.com/3d-models/none-46b52e08b8b64b81ad9ff5fb752bcc06` | **CC Attribution** — ultra-clean emissive door-top accent over `WEST WING CROSS` / `LINK`. |

### B. `Fab / Quixel Megascans` (`fab.com`, Free Epic Login) vs. `AmbientCG` (`CC0 1.0`)
- **Material target:** scuffed institutional **terrazzo / VCT hospital vinyl**, **suspended acoustic ceiling grid**, **matte painted concrete plaster**, and **floor grime decals**.
- **License warning before downloading:** **Fab Standard License** lets us use Quixel Megascans free inside compiled/shipped games, **but prohibits redistributing raw Megascans texture/mesh files in a public GitHub repo**.
  - Either use **AmbientCG (`CC0 1.0`, no login needed)** — `Terrazzo001`/`004`/`010`, `OfficeCeiling001`, `Tiles074`, `Plaster003` *(Opus already verified AmbientCG textures commit cleanly in `hospital-escape-hallway-opus/tex/`)* — OR if Moth grabs Megascans decals/surfaces locally under `fab.com`, bake them offline into combined hallway lightmap/atlas textures and **git-ignore the raw Megascans source pack**.

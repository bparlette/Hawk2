# GEAR-FIX Response — Neon (`bparlette/Hawk2` `main`)

**Date:** Nov 24, 2026  
**Status:** DONE — All 4 cast GLBs rebuilt in [`games/hospital-escape-leaders-neon/assets/cast-pass/`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/), quantitatively audited in Blender 5.2.3 LTS at 30fps, and visually verified in headless Chrome (`390x844`, DPR 2, `0` console errors across 24 BEFORE + 24 AFTER stills + 3 comparison sheets).

---

## 1. Root Causes Confirmed & Corrected

1. **N2 (`n2-mixamo.glb`) — Misplaced bind-pose `GearMat` mesh, not unweighted vertices (Refutes the unweighted hypothesis in part):**
   - Inspecting the shipped `n2-mixamo.glb` (`origin/main`) in Blender showed `GearMat` *did* have bone weights, yet its rest-pose helmet and tactical vest blocks inherited `valid-mocap.glb`'s static bind-pose misplacement (`369` verts, `_Body` distance `median = 4.43 cm`, `p95 = 7.41 cm`, `max = 8.31–8.49 cm` across rest and `Dying_Headshot_Knees`). In `setup_n2_rig()`, `PistolMat` had been stripped while native `GearMat` was left intact, causing the helmet to sit ~4.7 cm forward of skull center (~6.4 cm ahead of forehead) and rectangular vest plates to hover off the chest and back.
   - **Fix:** Updated [`setup_n2_rig`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py#L1605-L1624) to strip both `PistolMat` and native `GearMat` from N2's untouched `_Body`, and ported the walk-off `IMPROVED` tactical cap (`N2Helmet` using `GearMat`) and bone-attached contoured plate carrier (`N2Vest` using `GearMatVest` + `GearTrimMat`) onto N2 (`build_n2`).

2. **All Cast Headgear / Plate Carriers / Straps — Multi-bone `_Body` surface projection + clavicle/neck exclusion:**
   - **Beanie / Helmet (`build_fitted_beanie`):** Gunman's previous `GunmanBeanie` computed center bounds over lower head geometry and allowed brow raycast overshoots, producing a floating brow sliver (`before-gunman-cover-to-shoot-grip2x.png`) and `max = 2.47 cm` lift in `Dying_Headshot_Knees@f20`. Fixed by computing upper-cranium dome center (`z >= z_top - 0.105`), radially clamping brow raycasts, and transferring `{'Head', 'Neck'}` weights via [`transfer_surface_weights`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py#L310-L384) (`_Body`-only BVHTree surface projection + KDTree k=6) with strict `Head` weighting above `z_brow + 0.012`.
   - **Plate Carriers & Shoulder Straps (`build_fitted_rig`):** Both `GunmanRig` and initial pass `N2Vest` previously suffered from single-bone `Spine2` rigidity (`max = 2.95 cm`) and shoulder-strap rays at `x = ±0.078` hitting the neck/jaw region (`z = 1.55–1.631 m`) while lacking shoulder weights. Fixed by filtering `Head`/`Neck` vertices out of the torso BVHTree, placing closed-cap shoulder straps cleanly over the clavicles at `x = ±0.102`, adding wide low-profile trim backings + side waist cummerbunds + `recalc_face_normals`, and transferring multi-bone weights across `{'Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder'}`.
   - **Maya Crossbody Strap (`MayaStrap`):** Previously `100% Spine1` rigid, inflating `p95` from `1.89 cm` at rest to `3.15 cm` in `Bed_Push_Loop@f27`. Switched `attach_maya_silhouette` to `transfer_surface_weights` over `{'Hips', 'Spine', 'Spine1', 'Spine2'}` (trimming `Bed_Push_Loop@f27` `p95` down to `2.47 cm` and `Walk_Fem@f10` `p95` from `2.72 cm` to `1.97 cm`; the `8.77–9.18 cm` max reflects the static thickness of the hip pouch box).
   - **Cole Gauze (`ColeGauze` / `ColeBlood`):** Verified tight in both rest and `Sit_Disbelief_Forward@f66` (`median = 0.20 cm`, `p95 = 0.60 cm`, `max = 0.60 cm`). Note Cole's lower-leg mesh/texture fix is scoped to `#2 CAST-QUALITY`.

3. **Palm-Flip Weapon Seating (`seat_weapon_right_hand`) + Viewer Muzzle Alignment:**
   - Verified `dot(fwd_h × across, Thumb - RightHand) = -0.0305` on the VALID `RightHand` rest pose (`n2-mixamo.glb` / `gunman-mixamo.glb`). Ported `n2-figure.js`'s thumb-side palm-flip test (`if palm.dot(rt - rh) < 0: palm.negate()`) into [`seat_weapon_right_hand`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py#L1526-L1579), exported exact `RightHand`-local muzzle `{tip, dir}` into `cast-pass-manifest.json`, and updated [`cast-pass.js`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/cast-pass.js#L318-L330) so muzzle flashes track `MANIFEST[roleKey].weapon_muzzle` (keeping `LongGun*` and `PistolMat` metallic).
   - **30fps Import Calibration & Elevation Tuning:** Calibrated `audit_gear_fix.py` to `bpy.context.scene.render.fps = 30` (matching Three.js `GLTFLoader`; Blender factory default `24fps` initially masked `t=1.38s` as frame `33` instead of `41`). Tuned `attach_seated_long_gun` to `palm_bias=0.38, up_bias=-0.16, palm_offset=0.028` and seated the Stribog receiver `2.4 cm` lower onto the thumb web so barrels level from `+53.9°` down to `+11.5°..+12.3°` (`Cover_To_Shooting`), `+10.1°` (`Pistol_Aim`), `+12.1°` (`Pistol_Walk`), and `-17.0°` low-ready (`Pistol_Idle_Alert`), with `right_palm_to_gun_cm = 0.97 cm`.

---

## 2. Long-Gun Pattern Decision & Origin/License Log

- **Selected Pattern:** **Grand Power Stribog-pattern compact SMG/PDW** (`games/hospital-escape/tasking/long-gun-reference-2.jpg.b64`), chosen over the AR-15 carbine (`long-gun-reference.jpg.b64`) because of measured hand-to-hand spacing in the unmodified combat clips:
  - `Cover_To_Shooting` (`@f28`, `@f41`): `26.90–27.42 cm` hand span -> `LeftHand` cups cleanly under the ventilated handguard, lower Picatinny rail, and angled handstop wedge (`Y = +0.205..+0.252 m`).
  - `Pistol_Idle_Alert@f15`, `Pistol_Walk@f10`, `Pistol_Aim@f15`: `11.40–15.81 cm` hand span -> the compact receiver, trigger guard, flared magwell, and smoked curved stick magazine (`Y = +0.106..+0.142 m`) align with the close support hand without extending stock behind the forearm or clipping the torso, without moving any animation hand bones.
- **Asset Origin & License Log:**
  - **Character bodies & base rigs:** MIT VALID `v1.0` (`White_M_1_Util.glb`, `Hispanic_F_1_Util.glb`, `White_M_3_Casual.glb`, and `valid-mocap.glb` MIT VALID body). Clean MIT license (`VALID-LICENSE.txt`).
  - **Grand Power Stribog SMG mesh, tactical headgear, plate carriers, straps, gauze:** 100% procedurally authored in [`build_neon_cast_pass.py`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py) (`build_stribog_smg`, `build_fitted_beanie`, `build_fitted_rig`, `build_pistol_mesh`). Project-owned, zero third-party geometry imports.

---

## 3. Quantitative Before / After Audit (`audit_gear_fix.py`, Blender 5.2.3 LTS @ 30fps)

| Actor & Material | Before `median / p95 / max` (cm) | After `median / p95 / max` (cm) | Key Extremes Checked |
|---|---|---|---|
| **N2 `GearMat` (helmet)** | `4.26–4.43 / 6.88–7.41 / 8.12–8.49` | `0.90 / 1.20 / 1.20–1.23` | `Rest`, `Dying_Headshot_Knees` `f=20,40,65,84`, `C2S@41`, `Alert@15` |
| **N2 `GearMatVest` (plates)** | *(combined in `GearMat` above)* | `1.04–1.51 / 2.05–2.21 / 2.10–2.40` | `Rest`, `Dying_Headshot_Knees` `f=20..84`, `C2S@41`, `Alert@15` |
| **N2 `GearTrimMat` (trim/straps)** | *(combined in `GearMat` above)* | `0.66–0.71 / 1.75–1.87 / 3.75–3.94` | Clavicle straps + closed-cap trim backings + cummerbund |
| **Gunman `GunmanBeanieMat`** | `0.95 / 1.40–1.46 / 1.50–2.47` | `0.75 / 1.10 / 1.10–1.21` | Brow raycast overshoot sliver eliminated |
| **Gunman `GunmanGearMat`** | `0.92–1.33 / 2.07–2.33 / 2.10–2.95` | `1.00–1.52 / 2.04–2.21 / 2.10–2.39` | Multi-bone `Spine..RightShoulder` weights |
| **Gunman `GunmanGearTrimMat`** | `—` | `0.66–0.70 / 1.80–1.95 / 3.58–3.76` | Dropped from pre-clavicle-fix `5.56 cm` outlier |
| **Maya `MayaStrapMat`** | `0.94–1.03 / 1.89–3.15 / 8.23–9.12` | `0.94–1.15 / 1.89–2.47 / 8.77–9.18` | `Rest`, `Bed_Push_Loop` `f=0,27`, `Walk_Fem@10` |
| **Cole `ColeGauzeMat` / `ColeBloodMat`** | `0.20 / 0.60 / 0.60` | `0.20 / 0.60 / 0.60` | `Rest`, `Sit_Disbelief_Forward@66` |

### Updated Exported Cast Manifest (`games/hospital-escape-leaders-neon/assets/cast-pass/`)

| Role | File | Bytes | Tris | Mats | Clips | Weapon / Muzzle |
|---|---|---|---|---|---|---|
| `gunman` | `gunman-mixamo.glb` | `4,406,660` | `10,320` | `7` | `31` | Stribog SMG, `tip: [0.0779, 0.3688, 0.1528]` |
| `n2` | `n2-mixamo.glb` | `2,115,804` | `8,204` | `7` | `14` | Stribog SMG, `tip: [0.0779, 0.3687, 0.1528]` |
| `maya` | `maya-mixamo.glb` | `1,524,832` | `9,127` | `3` | `6` | Unarmed (`Bed_Push_Loop`, `Wheelchair_Push`, etc.) |
| `cole` | `cole-mixamo.glb` | `3,228,548` | `9,018` | `4` | `18` | `ColePistol`, `tip: [0.0976, 0.176, 0.0446]` |

---

## 4. Repeatable Build, Audit & Verification Commands

1. **Rebuild GLBs & manifest:**
   `/opt/homebrew/bin/blender -b --factory-startup -P games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py`
2. **Audit gear surface gaps & weapon holds:**
   `/opt/homebrew/bin/blender -b --factory-startup -P games/hospital-escape-leaders-neon/tools/audit_gear_fix.py`
3. **Capture 24 BEFORE & 24 AFTER stills (`390x844`, DPR 2, `0` console errors):**
   `node games/hospital-escape-leaders-neon/tools/capture_gear_fix.mjs --phase=before`  
   `node games/hospital-escape-leaders-neon/tools/capture_gear_fix.mjs --phase=after`
4. **Compose side-by-side comparison sheets:**
   `node games/hospital-escape-leaders-neon/tools/compose_gear_sheets.mjs`

---

## 5. Visual Proof (`games/hospital-escape/tasking/responses/neon-gear-fix-shots/`)

- **Comparison Sheets:**
  - [before-after-dying.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/before-after-dying.png) — `Dying_Headshot_Knees` mid & extreme, BEFORE vs AFTER on N2 & Gunman
  - [before-after-2x-holds.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/before-after-2x-holds.png) — 2x trigger & support hold closeups (`Cover_To_Shooting` R/L, `Pistol_Idle_Alert`, `Pistol_Walk_Fire`)
  - [before-after-all-cast.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/before-after-all-cast.png) — Full-cast overview (Gunman, N2, Maya `Bed_Push_Loop`, Cole `Sit_Disbelief_Forward`)
- **Sample Individual `390x844` Stills (`0` console errors in `after-stats.json`):**
  - [after-n2-dying-headshot-extreme-3q.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-n2-dying-headshot-extreme-3q.png)
  - [after-gunman-cover-to-shoot-grip2x.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-gunman-cover-to-shoot-grip2x.png)
  - [after-gunman-cover-to-shoot-grip2x-l.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-gunman-cover-to-shoot-grip2x-l.png)
  - [after-n2-idle-alert-grip2x.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-n2-idle-alert-grip2x.png)
  - [after-audit.json](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-audit.json) | [after-stats.json](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-gear-fix-shots/after-stats.json)

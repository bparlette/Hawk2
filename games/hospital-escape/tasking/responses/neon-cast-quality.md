# CAST-QUALITY Response — Neon (`bparlette/Hawk2` `main`)

**Date:** Nov 24, 2026  
**Scope:** Neon side of `CAST-QUALITY.md` — first-class rigged 3D MIT VALID GLB replacements for **Dr. Hale**, **the lying patient**, **Cole's pajama-trouser + non-slip sock bed/wheelchair fix**, and **both standard female/male nurses & hospital staff** in [`games/hospital-escape-leaders-neon/assets/cast-pass/`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/), plus T4-lit in-scene showcase [`cast-quality.html`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/cast-quality.html) and `390x844` DPR 2 visual proof (`0` console errors across all 12 stills).  
*(Note: Item 4 of `CAST-QUALITY.md` — live-game integration in `cast3d.js` and behind-the-bed two-hand staging of Maya in `bed_push` — belongs to Opus per `NEON-NEXT.md` / `CAST-QUALITY.md`.)*

---

## 1. Delivered Characters & Upgrades

| Role | GLB (`games/hospital-escape-leaders-neon/assets/cast-pass/`) | Bytes | Tris | Mats | Bones | Clips | Key Upgrades |
|---|---|---|---|---|---|---|---|
| **Dr. Hale** | [`dr-hale-mixamo.glb`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/dr-hale-mixamo.glb) | `1,380,712` | `12,651` | `4` | `84` | `5` | 1:1 `_Body`-derived tailored open white lab coat (`HaleLabCoat`, `bmesh.ops.bisect_plane` front placket + breast pocket chart/pen + `82%` cuffs revealing shirt cuffs, weighted across `Hips`–`RightForeArm` + `LeftUpLeg`/`RightUpLeg`), titanium wire-rim glasses (`HaleGlasses`), silver hair/sideburns, slate-blue shirt + navy tie + charcoal belt/slacks + dark dress shoes. (No removed characters — full 3D rigged Dr. Hale replaces cutout.) |
| **Cole Mercer (fix)** | [`cole-mixamo.glb`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/cole-mixamo.glb) | `3,227,740` | `9,018` | `4` | `84` | `18` | Fixed lower legs (`zone==4`, `wz >= 0.095`): full-length relaxed pale-blue-grey drawstring hospital pajama trousers + non-slip grip socks (`zone==5`), clean wrist cuffs (`armdist < 0.62`), fixed mouth UV isolation (`zone==1`), exact mattress-0.72m `bed_offsets` measured (`-0.2626` m for `Lay_Breathless`). Also refreshed in `cast-pass-manifest.json`. |
| **Patient Lying** | [`patient-lying-mixamo.glb`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/patient-lying-mixamo.glb) | `1,085,592` | `7,459` | `2` | `114` | `4` | Distinct inpatient (`1.74` m) with sage hospital top/shorts (`#869992`), smooth sculpted shorts seam, bare lower calves (`barefoot_slender=True`), non-slip grip socks, procedural forearm IV gauze wrap (`PatientIVWrap`), and calibrated `bed_offsets` (`-0.224` m for `Lay_Breathless`). |
| **Nurse Female** | [`nurse-female-mixamo.glb`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/nurse-female-mixamo.glb) | `1,740,556` | `9,227` | `6` | `114` | `7` | Ceil-teal V-neck scrubs (`#437E8E` / `#396E7D`) with 3/4 sleeves + bare forearms, chestnut-auburn chignon bun (`NurseHairBun`), `BVHTree`-contoured dual-material neck stethoscope (`NurseStethoscope`) draped on `+X` chest away from chest-normal ID badge (`StaffBadge`), clean non-slip white hospital clogs. |
| **Nurse Male** | [`nurse-male-mixamo.glb`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/nurse-male-mixamo.glb) | `1,511,308` | `7,464` | `4` | `84` | `7` | Dark slate-teal V-neck scrubs (`#365E6B` / `#2D505C`) preserving original textured dark skin on forearms/neck, `BVHTree` ID badge (`StaffBadge`), hip pager (`MaleNursePager`), grey hospital clogs. |

### Albedo Calibration (`gen_cast_quality_textures.py`)
All 5 PBR texture sets (`_color.jpg`, `_rough.jpg`, `_nm.jpg`) were raster-mapped from mesh UV triangles via headless Blender cycles/data baking (`uv_raster`), masked on 3D bone/world geometry + UV islands, dilated across gutter pixels (`passes=14` color / `12` normal), and clamped in linear space for ACES Filmic 1.06 + T4 rectangular panels:
- `cole`: `max_linear_albedo = 0.658`
- `hale`: `max_linear_albedo = 0.617`
- `patient_lying`: `max_linear_albedo = 0.617`
- `nurse_f`: `max_linear_albedo = 0.658`
- `nurse_m`: `max_linear_albedo = 0.552`

---

## 2. Asset Origin & License Log

- **Base rigged human meshes:** **MIT VALID v1.0** GLBs:
  - `White_M_3_Casual.glb` (`cole`, `1.80` m)
  - `g-White_M_2_Casual.glb` (`dr_hale`, `1.78` m)
  - `g-Hispanic_M_2_Casual.glb` (`patient_lying`, `1.74` m)
  - `Hispanic_F_1_Util.glb` (`nurse_female`, `1.64` m)
  - `g-Black_M_3_Casual.glb` (`nurse_male`, `1.76` m)
- **Motion clips:** Mixamo FBX library retargeted cleanly onto VALID skeletons at `30fps` in [`build_neon_cast_quality.py`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_quality.py):
  - **Dr. Hale (`5` clips):** `Hale_Idle` (`turning.fbx` + `talking-on-phone.fbx` upper pose), `Hale_Talk_Standing` (`turning.fbx` + `sitting-talking.fbx` `60..170`), `Hale_Objecting` (`cover-idle-standing.fbx` + `sitting-talking.fbx` `240..308`), `Hale_Hands_Up` (`hit-reaction.fbx` `1..40`), `Hale_Walk` (`pistol-walk.fbx` + unarmed upper pose, `authored_root_mps = 2.5161`, `stance_slide_mm = 5.44`, `min_foot_z_mm = 0.0`).
  - **Patient Lying (`4` clips):** `Lay_Breathless` (`laying-breathless.fbx`), `Lay_Sleeping` (`laying-sleeping.fbx`), `Lay_Moaning` (`laying-moaning.fbx`), `Sit_Idle_Breath` (`sitting-idle-breathing.fbx`).
  - **Nurse Female & Male (`7` clips each):** `Staff_Idle` (`turning.fbx` + unarmed upper pose), `Staff_Walk` (`pistol-walk.fbx` + unarmed upper pose, `stance_slide_mm = 5.23 / 4.05`, `min_foot_z_mm = 0.0`), `Staff_Sitting_Talking` (`sitting-talking.fbx` `40..190`), `Staff_Talking_Seated` (`talking-seated.fbx` `1..151`), `Staff_Typing` (`typing.fbx` `40..190`), `Staff_Talking_On_Phone` (`talking-on-phone.fbx` `120..270`), `Staff_Cower_Duck` (`cover-idle-crouched.fbx` `1..78`).
- **Attachments & Textures:** 100% procedurally generated in [`build_neon_cast_quality.py`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/build_neon_cast_quality.py) (`HaleLabCoat`, `HaleGlasses`, `PatientIVWrap`, `StaffBadge`, `NurseStethoscope`, `MaleNursePager`, `NurseHairBun`) and [`gen_cast_quality_textures.py`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/tools/gen_cast_quality_textures.py) (`build_cole_fixed`, `build_hale_textures`, `build_patient_lying_textures`, `build_nurse_female_textures`, `build_nurse_male_textures`). Zero third-party geometry imports.

---

## 3. Opus `cast3d.js` Integration Reference (`cast-quality-manifest.json`)

- **Manifest file:** [`games/hospital-escape-leaders-neon/assets/cast-pass/cast-quality-manifest.json`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/cast-quality-manifest.json) (and Cole updated inside [`cast-pass-manifest.json`](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json)).
- **Lying Bed Y-Offsets (`bed_offsets` calibrated for `A.bed` mattress top `y = 0.720 m`):**
  - `cole`: `Lay_Breathless` `bed_dy_for_mattress_072m = -0.2626`, `Lay_Sleeping = -0.272`, `Lay_Moaning = -0.2768`.
  - `patient_lying`: `Lay_Breathless` `bed_dy_for_mattress_072m = -0.224`, `Lay_Sleeping = -0.2374`, `Lay_Moaning = -0.2439`.
- **Material Metalness Note (for `cast3d.js` loader):** Only metallic accessory materials (`HaleGlassesMat`, `HaleAccentMat`, `NurseStethMetalMat`, plus weapon/gear materials `PistolMat`, `LongGunMat`, `GearMat`) should retain `metalness > 0`; set diffuse cloth/skin `_Body` material `metalness = 0.0` matching `cast-quality.js` `prepActor()`.
- **Stool Alignment for `Staff_Typing` / `Staff_Sitting_Talking`:** Staff seated clips place pelvis at `y ~ 0.45 m` (matches `0.44 m` desk stool in `cast-quality.js` `buildNurseStation()`).
- **Nurse Female `min_foot_z_mm` note:** Static/idle clips have `min_foot_z_mm` around `-6.52 .. +53.88` mm matching Mixamo crouch/seated heels; `Staff_Walk` is strictly grounded (`min_foot_z_mm = -0.0`, `median = 0.01–0.04` mm).

---

## 4. Visual Audit & Defect Resolution Log

Three visual inspection rounds (`capture_cast_quality.mjs`, `390x844` DPR 2 under T4 ACES Filmic `1.06` + T4 rectangular panels + `corridorPMREM`) caught and resolved:
1. **UV island overlap bugs:** `mouth_uv` darkened pixels on upper arms (`zone==2`) and shins (`zone==4`) until gated strictly to `(zone == 1)`; `sl_hi` painted teal onto Nurse Female's scalp until gated to `(zone == 2)`; `eye_uv` blocked Dr. Hale's top crown hair until restricted to `(zone == 6)`; Nurse Male's forearms now preserve original textured dark skin instead of flat tinting.
2. **Dr. Hale grooming, waist, & 3D lab coat tailoring:** Initial procedural tube lab coat showed collar bar / armpit clipping and jagged manual triangle cuts; replaced with 1:1 `_Body` topology duplication + `bmesh.ops.bisect_plane` straight front placket (`x = ±0.056`), waist skirt flare, and `82%` cuffs (`HaleLabCoat`). Removed hand-held `HaleClipboard` (which occluded Dr. Hale's face in `Hale_Hands_Up`) in favor of a breast-pocket chart + silver pen. Tightened Dr. Hale's face/sideburn mask (`face_front` + `warm_skin` + `chin_neck`) so eyebrows/lips/nostrils/forehead keep natural skin while sideburns and crown turn silver (`93,255` hair px), and mapped `zone == 2` jeans waist below `wz < 1.036` to dark charcoal slacks + leather belt (`0.992..1.036`).
3. **Nurse accessories:** Re-oriented `StaffBadge` tangent to chest normal `nrm_b`, draped `NurseStethoscope` closely around the neck onto the opposite `+X` chest away from the badge, aligned `NurseHairBun` to back skull vertices, and snugged `MaleNursePager` to waist.

---

## 5. Repeatable Build, Capture & Verification Commands

```bash
# 1. Generate 1024x1024 PBR texture sets (UV raster + HSV/geometric masking + clamp <= 0.658 lin)
/opt/homebrew/bin/uv run --with pillow --with numpy python3 games/hospital-escape-leaders-neon/tools/gen_cast_quality_textures.py

# 2. Build & export all 5 rigged GLBs + manifests (Blender 5.2.3 LTS @ 30fps)
/opt/homebrew/bin/blender --background --python games/hospital-escape-leaders-neon/tools/build_neon_cast_quality.py

# 3. Capture 12 T4-lit 390x844 DPR 2 in-scene stills + assert 0 console/page errors
node games/hospital-escape-leaders-neon/tools/capture_cast_quality.mjs

# 4. Compose 4x3 overview contact sheet
/opt/homebrew/bin/uv run --with pillow --with numpy python3 games/hospital-escape-leaders-neon/tools/compose_cast_quality_sheet.py
```

---

## 6. Visual Proof (`games/hospital-escape/tasking/responses/neon-cast-quality-shots/`)

- **4x3 Overview Contact Sheet:** [cast-quality-overview.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/cast-quality-overview.png) (`1650x2730`)
- **All 12 `390x844` T4-Lit Stills (`0` console errors in [cast-quality-stats.json](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/cast-quality-stats.json)):**
  1. [hale-opening-room-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/hale-opening-room-390x844.png) — Room 412 opening (Dr. Hale `Hale_Objecting`, Maya, Cole in bed)
  2. [patient-on-bed-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/patient-on-bed-390x844.png) — Lying Patient (`Lay_Breathless`, sage gown/shorts, IV wrap) + Cole on calibrated `0.72` m beds
  3. [cole-bed-legs-closeup-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/cole-bed-legs-closeup-390x844.png) — Cole fixed pajama trousers + non-slip grip socks on bed
  4. [cole-wheelchair-legs-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/cole-wheelchair-legs-390x844.png) — Cole seated wheelchair leg/sock closeup (`Sit_Idle_Breath`)
  5. [nurse-station-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/nurse-station-390x844.png) — Nurses' station (Female `Staff_Typing`, Male `Staff_Talking_On_Phone`)
  6. [staff-corridor-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/staff-corridor-390x844.png) — T4 corridor walk (`Hale_Walk`, Female & Male `Staff_Walk`)
  7. [cast-quality-lineup-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/cast-quality-lineup-390x844.png) — Full 7-character cast lineup
  8. [hale-closeup-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/hale-closeup-390x844.png) — Dr. Hale close-up (silver hair/sideburns, wire glasses, tailored coat)
  9. [hale-hands-up-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/hale-hands-up-390x844.png) — Dr. Hale `Hale_Hands_Up` deformation check (clean waist belt + face + sleeves)
  10. [nurse-f-closeup-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/nurse-f-closeup-390x844.png) — Nurse Female close-up (V-neck scrubs, `StaffBadge`, `NurseStethoscope`)
  11. [nurse-f-back-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/nurse-f-back-390x844.png) — Nurse Female back (`NurseHairBun`, scrub back)
  12. [nurse-m-closeup-390x844.png](file:///Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots/nurse-m-closeup-390x844.png) — Nurse Male close-up (`StaffBadge`, `MaleNursePager`, dark-skin forearms preserved)

---

## 7. Post-Rebase Guardrails (`bparlette/Hawk2` `main`)

Executed after rebasing onto `origin/main` (`dad5ad3` `CAMERA-FIX`):
- `node games/hospital-escape/engine/validate-data.mjs games/hospital-escape/game/level1.js`:
  `9 beats, 16 segments, 16 paths, 21 waves, 7 pursuer waves, 33 lines — 206 objects checked, 0 errors — PASS`
- `node games/hospital-escape/tools/neon-verify-guardrails.mjs` (`tests.html` + 3-seed fairness soak over headless Chrome CDP):
  - `ENGINE TESTS: 24 passed, 0 failed of 24 (pageErrors=0)`
  - `CONTROL (contract OFF) soak gauntlet#1: damage=11 violations=11`
  - `FAIRNESS TOTAL: {"runs":33,"damage":362,"violations":0,"visualOnly":1177,"damagingShots":366,"minVisT":1.6,"minPx":66,"examples":[],"pageErrors":0}` -> `FAIRNESS AUDIT: PASS`

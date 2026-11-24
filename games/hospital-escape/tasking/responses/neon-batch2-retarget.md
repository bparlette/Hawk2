# Hospital Escape — Batch-2 Retarget Response (Neon)

**Repo / Branch:** `https://github.com/bparlette/Hawk2` (`main` only)  
**Spec:** [`BATCH2-RETARGET.md`](../BATCH2-RETARGET.md) · Authorized in [`NEON-NEXT.md`](../NEON-NEXT.md)  
**Lane Sequence:** Executed Track C ([`neon-mixamo-ideas.md`](neon-mixamo-ideas.md)) + Track B (Batch-2 Retarget, this report) in parallel with the Track A `bparlette/Hawk` rewrite (`git filter-repo`, 5/5 invariants clean) and committed/pushed Track B + Track C first on `Hawk2` `main` while Track A's `1.553 GiB` (`1,667,150,465 B`) mirror force-push to `bparlette/Hawk` finishes uploading, followed immediately by [`neon-hawk-purge.md`](neon-hawk-purge.md).  
**Runtime Loader Flag:** Uses **`THREE.GLTFLoader` (`three@0.128.0`)** in [`cast-pass.js`](../../../hospital-escape-leaders-neon/cast-pass.js), approved under Cherie's Nov 24 runtime loader ruling.  
**Isolation Verified:** Live game tree (`games/hospital-escape/{game,engine,tools,assets,index.html,mixamo,mixamo-viewer}`), `games/hospital-escape-walkoff-neon/`, and baseline `games/hospital-escape-leaders-neon/{index.html,leaders-neon.js,assets/*v2.glb}` remain untouched.

---

## 1. Source Clip Decode & Integrity Verification

All six Batch-2 `.fbx.gz.b64` files in [`games/hospital-escape/mixamo/`](../../mixamo/MANIFEST.md) were decoded into `/tmp/neon_cast_pass/mixamo_fbx/` using macOS BSD `base64 -D`:

```bash
mkdir -p /tmp/neon_cast_pass/mixamo_fbx
for f in pushing-heavy-object walking-arm-injury dying-headshot-knees cover-to-shooting pistol-idle-alert sitting-disbelief-forward; do
  base64 -D < "games/hospital-escape/mixamo/${f}.fbx.gz.b64" | gunzip > "/tmp/neon_cast_pass/mixamo_fbx/${f}.fbx"
done
shasum -a 256 /tmp/neon_cast_pass/mixamo_fbx/*.fbx
```

| Clip File (`.fbx`) | Target Character(s) | Output Clip(s) | Size (B) | Frames / Duration (30 fps) | Verified SHA-256 (matches [`mixamo/MANIFEST.md`](../../mixamo/MANIFEST.md)) |
|---|---|---|---:|---:|---|
| `pushing-heavy-object.fbx` | Maya | `Bed_Push_Loop` | 477,136 | 81f / 2.6667 s | `b6fe5ede0fcaad0db4f628ff5ca15751b55e16a45f7e689503e28ce2b8a6c6cd` |
| `walking-arm-injury.fbx` | Cole | `Walking_Arm_Injury` | 350,768 | 31f / 1.0000 s | `cdec8689672d096b7ec7a17f615384cdd40ad9d0820b0262c97d949874d613ed` |
| `sitting-disbelief-forward.fbx` | Cole | `Sit_Disbelief_Forward` | 671,184 | 140f / 4.6333 s | `b2d92bbef1f49e968173f5deea4cdd25f03f8d8de9c15e84460893fa7a6fde75` |
| `dying-headshot-knees.fbx` | Gunman + N2 | `Dying_Headshot_Knees` | 593,360 | 107f / 3.5333 s | `9dd601fd052fd40126b95a61b78d2b4b18f92d12ce07427c1e27451a37e4f26f` |
| `cover-to-shooting.fbx` | Gunman + N2 | `Cover_To_Shooting` | 559,472 | 96f / 3.1667 s | `0b8bc288c8f6622cd51ba871047e0b3d14a56c67bdc8df2bcbfff071d83d6de8` |
| `pistol-idle-alert.fbx` | Gunman + N2 | `Pistol_Idle_Alert` | 576,496 | 121f / 4.0000 s | `8a4cc510f0aa8dafa2a84191490f74dd4bc84609aa473adac59c0f78c5a5acf6` |

Zero substitutions; all 6 Batch-2 clips retargeted cleanly onto the cast without rejecting or dropping any clip.

---

## 2. Retarget Pipeline & Implementation Details (Recreate from Paper)

**Builder:** [`games/hospital-escape-leaders-neon/tools/build_neon_cast_pass.py`](../../../hospital-escape-leaders-neon/tools/build_neon_cast_pass.py) (Blender `5.2.3 LTS` headless `--background --python`).  
**Anchor:** `y-bot-tpose.fbx` (Rest-Pose Delta / Quaternion Transfer onto VALID cm-native rigs normalized cleanly to meters with soles grounded at `z = 0`).

### 2.1 Authored `1.0x` Recoil Layering (Cherie Ruling, Nov 24)
- Updated `build_gunman` in `build_neon_cast_pass.py` so all four Spine1+ fire-over-locomotion layered clips (`Pistol_Walk_Fire`, `Pistol_Walk_Fire_SG`, `Pistol_Strafe_L_Fire`, `Pistol_Run_Aimed_Fire`) use **`additive_strength = 1.0`** (full authored Mixamo recoil; no attenuation).
- The same `additive_strength = 1.0` Spine1+ delta transfer drives N2's two fire-over-locomotion clips (`Pistol_Walk_Fire`, `Pistol_Run_Aimed_Fire`).

### 2.2 N2 (`valid-mocap.glb` -> `n2-mixamo.glb`) Rig Setup & Weapon Seating
- **`setup_n2_rig(glb_path, target_height=1.80)`:**
  1. Imports [`games/hospital-escape-3d-sample-neon/assets/gunmen/valid-mocap.glb`](../../../hospital-escape-3d-sample-neon/assets/gunmen/valid-mocap.glb) (`Reference` armature, `H_DDS_HighRes` mesh), deletes the unattached `Icosphere` helper and all 9 pre-existing `Action` blocks, and clears pose transforms.
  2. Strips the unseated bind-pose `PistolMat` faces (144 vertices floating in cm space at `x=[-69.662, -66.662]`) **and** pops + deletes the orphaned `PistolMat` material datablock (`bpy.data.materials.remove(old_pmat)`) so Blender does not suffix the replacement material `PistolMat.001`.
  3. Uniformly scales the cm-native armature/mesh to **`1.80 m`** standing height with minimum vertex height at `z = 0` and applies Location + Scale transforms.
  4. Forces `Principled BSDF['Metallic'] = 0.0` on N2's native `_Body` and `GearMat` while keeping its geometry unmodified.
  5. **Native N2 `GearMat` Provenance Note:** In visual stills, N2's helmet sits slightly forward over the brow and vest blocks sit off the chest compared to the Gunman's baked outfit. Direct inspection of source `valid-mocap.glb` confirms this offset is native to the unedited source mesh (not introduced by `setup_n2_rig`): in raw cm source coordinates, `Body Head` spans `y = [-18.6, 4.6]` while `Gear Head` spans `y = [-23.9, 1.5]`, and `Body Spine2` spans `y = [-17.1, 9.5]` while `Gear Spine2` spans `y = [-22.5, 11.9]`. Per the rule against altering N2's native body, `_Body` and `GearMat` were preserved verbatim.
- **`attach_seated_pistol(arm, body, kept, 'Pistol_Aim', 0, 'N2Pistol')` + `curl_right_fingers`:**
  - Evaluates `Pistol_Aim` at frame 0, places sculpted `N2Pistol` at `0.45 * RightHand + 0.55 * RightHandMiddle1 + fwd_gun * 0.012 + (0, 0, 0.004)` oriented along `(RightHand - RightForeArm).normalized()`, joins & skin-binds all `N2Pistol` vertices `1.0` to `RightHand`, and curls right fingers around the grip.
  - Live Three.js bone-world probe placed `N2Pistol` muzzle tip in `RightHand` local space at `(0.0237, 0.1859, 0.072)`, matching `BARREL_TIPS.n2 = (0.0237, 0.1865, 0.0720)` within `0.6 mm`.

### 2.3 Maya Real Bed-Push (`pushing-heavy-object` -> `Bed_Push_Loop`)
- Replaced Batch 1's constructed bed-push loop slice with the full cyclic `pushing-heavy-object.fbx` retarget (`81` frames, `2.6667 s`, `loop_crossfade = 6` frames).
- Applied 2-bone analytical arm IK (`apply_maya_handle_ik(..., handle_x=0.31, handle_y=None, handle_z=1.00, grip_delta_z=None)`): because `pushing-heavy-object` already places wrists naturally at `z = 0.9991 m`, `handle_y=None` preserves natural forward reach across each frame while locking lateral `x = ±0.31 m` and push-bar height `z = 1.00 m`.
- **IK Measurement:** `pre_wrist_z_m = 0.9991 m` -> `post_wrist_z_m = 1.0001 m` (`wrist_lift_cm = +0.1 cm`), Blender `mean_handle_gap_mm = 1.76 mm`, Three.js live runtime `bedWristGapMM = 0.1 mm` on the calibrated `y = 1.00 m` hospital bed push bar.

### 2.4 Cole Batch-2 Additions (`Walking_Arm_Injury`, `Sit_Disbelief_Forward`)
- **`Walking_Arm_Injury` (`walking-arm-injury.fbx`):** On-foot injured walk with right arm cradled across the chest; foot-locked at ground `z = 0` (`min_foot_z_mm = 0.0 mm`, `stance_slide_mm = 1.30 mm`, `1.7718 m/s` stance-paced speed -> `0.7337x` at the `1.30 m/s` Walk law).
- **`Sit_Disbelief_Forward` (`sitting-disbelief-forward.fbx`):** Intro/slump wheelchair variant (alongside Batch 1's head-back `Sit_Disbelief`); seated in [`cast-pass.js`](../../../hospital-escape-leaders-neon/cast-pass.js) at `c.root.position.set(0, -0.065, 0.0)` with the decorative wheelchair lap blanket hidden (`wcProp.blanket.visible = (cc !== 'Sit_Disbelief_Forward')`) so the forward-slumped torso clears the seat cleanly (`coleHeadBoneY = 0.772 m`, `coleEstCrownY = 0.982 m`).

### 2.5 Export Check (`bad_prefixed = []`)
All four GLBs in [`games/hospital-escape-leaders-neon/assets/cast-pass/`](../../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json) export clean bone names with zero `mixamorig` prefixes (`bad_prefixed = []`).

---

## 3. Measured Outputs & Compliance Metrics

### 3.1 GLB Asset Summary (`assets/cast-pass/`)

| GLB Asset | Rig Source | Size (B) | Tris | Materials | Clips | Manifest |
|---|---|---:|---:|---:|---:|---|
| `gunman-mixamo.glb` | `Hazard_M_1_Hazmat` (`1.80 m`) | 4,288,528 | 9,774 | 4 | 31 | [`cast-pass-manifest.json`](../../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json) |
| `maya-mixamo.glb` | `Hispanic_F_1_Util` (`1.68 m`) | 1,524,832 | 9,127 | 3 | 6 | [`cast-pass-manifest.json`](../../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json) |
| `cole-mixamo.glb` | `White_M_3_Casual` (`1.80 m`) | 3,228,548 | 8,994 | 3 | 18 | [`cast-pass-manifest.json`](../../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json) |
| `n2-mixamo.glb` | `valid-mocap.glb` (`1.80 m`, N2) | 1,947,332 | 7,274 | 3 (`_Body`, `GearMat`, `PistolMat`) | 14 | [`cast-pass-manifest.json`](../../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json) |

### 3.2 Batch-2 & Updated Clip Measurements (Stance-Phase Foot Contact Law: Walk `1.30 m/s`, Run `3.20 m/s`)

| Character | Clip | Frames / Dur | Authored Root (`m/s`) | Authored Stance (`m/s`) | Stance Samples | Playback Law (`m/s`) | `timeScale` | Stance Slide (`mm`) | Min / Median Foot Z (`mm`) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Maya** | `Bed_Push_Loop` (`pushing-heavy-object`) | 81f / 2.6667 s | 0.3562 | 0.3917 | 115 | 0.392 (authored heavy push) | `1.0000x` | 0.25 | -0.00 / 0.00 |
| **Cole** | `Walking_Arm_Injury` | 31f / 1.0000 s | 1.7233 | 1.7718 | 27 | 1.30 | `0.7337x` | 1.30 | 0.00 / 0.03 |
| **Cole** | `Sit_Disbelief_Forward` | 140f / 4.6333 s | 0.0000 | 0.0000 | 0 | Seated (`y = -0.065`) | `1.0000x` | 0.00 | -13.33 / -11.32 |
| **Gunman** | `Pistol_Idle_Alert` | 121f / 4.0000 s | 0.0000 | 0.0000 | 0 | 0.00 | `1.0000x` | 0.00 | 3.46 / 3.55 |
| **Gunman** | `Cover_To_Shooting` | 96f / 3.1667 s | 0.0000 | 0.0000 | 0 | 0.00 | `1.0000x` | 0.00 | -89.22 / -83.03 |
| **Gunman** | `Dying_Headshot_Knees` | 107f / 3.5333 s | 0.3327 | 0.3327 | 0 | 0.00 (root motion) | `1.0000x` | 0.00 | -102.05 / -73.01 |
| **Gunman** | `Pistol_Walk_Fire` (`1.0x` recoil) | 25f / 0.8000 s | 2.5857 | 2.5457 | 23 | 1.30 | `0.5107x` | 4.67 | -0.00 / 0.05 |
| **Gunman** | `Pistol_Run_Aimed_Fire` (`1.0x` recoil) | 23f / 0.7333 s | 3.0546 | 2.9487 | 20 | 3.20 | `1.0852x` | 7.15 | -0.00 / -0.00 |
| **N2** | `Pistol_Idle_Alert` | 121f / 4.0000 s | 0.0000 | 0.0000 | 0 | 0.00 | `1.0000x` | 0.00 | 3.55 / 3.63 |
| **N2** | `Cover_To_Shooting` | 96f / 3.1667 s | 0.0000 | 0.0000 | 0 | 0.00 | `1.0000x` | 0.00 | -88.23 / -82.11 |
| **N2** | `Dying_Headshot_Knees` | 107f / 3.5333 s | 0.3284 | 0.3284 | 0 | 0.00 (root motion) | `1.0000x` | 0.00 | -101.16 / -72.55 |
| **N2** | `Pistol_Walk` | 25f / 0.8000 s | 2.5521 | 2.5107 | 23 | 1.30 | `0.5178x` | 4.59 | -0.00 / 0.04 |
| **N2** | `Pistol_Walk_Fire` (`1.0x` recoil) | 25f / 0.8000 s | 2.5521 | 2.5107 | 23 | 1.30 | `0.5178x` | 4.59 | -0.00 / 0.04 |
| **N2** | `Pistol_Run_Aimed` | 23f / 0.7333 s | 3.0149 | 2.9080 | 20 | 3.20 | `1.1004x` | 7.06 | -0.00 / 0.00 |
| **N2** | `Pistol_Run_Aimed_Fire` (`1.0x` recoil) | 23f / 0.7333 s | 3.0149 | 2.9080 | 20 | 3.20 | `1.1004x` | 7.06 | -0.00 / 0.00 |

### 3.3 Live Headless Chrome Runtime Telemetry (`390×844` Mobile Viewport, `consoleErrors = 0`)

| Still Evidence (`neon-batch2-shots/`) | Mode | Clip | Path Speed (`m/s`) | Draw Calls | Scene Tris | Live Metric |
|---|---|---|---:|---:|---:|---|
| [`maya-bed-push-side.png`](neon-batch2-shots/maya-bed-push-side.png) | `maya_bed` | `Bed_Push_Loop` | 0.392 | 42 | 19,236 | `bedWristGapMM = 0.1 mm` |
| [`maya-bed-push-3q.png`](neon-batch2-shots/maya-bed-push-3q.png) | `maya_bed` | `Bed_Push_Loop` | 0.392 | 43 | 19,248 | `bedWristGapMM = 0.1 mm` |
| [`cole-arm-injury-side.png`](neon-batch2-shots/cole-arm-injury-side.png) | `cole` | `Walking_Arm_Injury` | 1.300 | 7 | 18,110 | `coleHeadBoneY = 1.482 m`, `coleEstCrownY = 1.692 m` |
| [`cole-arm-injury-3q.png`](neon-batch2-shots/cole-arm-injury-3q.png) | `cole` | `Walking_Arm_Injury` | 1.300 | 7 | 18,110 | `coleHeadBoneY = 1.482 m`, `coleEstCrownY = 1.692 m` |
| [`cole-disbelief-forward-3q.png`](neon-batch2-shots/cole-disbelief-forward-3q.png) | `cole` | `Sit_Disbelief_Forward` | 0.000 | 53 | 22,286 | `coleHeadBoneY = 0.772 m`, `coleEstCrownY = 0.982 m` |
| [`gunman-idle-alert-3q.png`](neon-batch2-shots/gunman-idle-alert-3q.png) | `gunman` | `Pistol_Idle_Alert` | 0.000 | 9 | 21,158 | Seated pistol in `RightHand` |
| [`gunman-cover-to-shoot-3q.png`](neon-batch2-shots/gunman-cover-to-shoot-3q.png) | `gunman` | `Cover_To_Shooting` | 0.000 | 11 | 21,318 | Muzzle flash window `0.85..1.65 s` |
| [`gunman-dying-headshot-3q.png`](neon-batch2-shots/gunman-dying-headshot-3q.png) | `gunman` | `Dying_Headshot_Knees` | 0.000 | 9 | 21,158 | Non-looping collapse w/ `Hips` follow |
| [`n2-idle-alert-3q.png`](neon-batch2-shots/n2-idle-alert-3q.png) | `n2` | `Pistol_Idle_Alert` | 0.000 | 7 | 14,598 | Seated `N2Pistol` in `RightHand` |
| [`n2-cover-to-shoot-3q.png`](neon-batch2-shots/n2-cover-to-shoot-3q.png) | `n2` | `Cover_To_Shooting` | 0.000 | 9 | 14,758 | Muzzle flash window `0.85..1.65 s` |
| [`n2-dying-headshot-3q.png`](neon-batch2-shots/n2-dying-headshot-3q.png) | `n2` | `Dying_Headshot_Knees` | 0.000 | 7 | 14,598 | Non-looping collapse w/ `Hips` follow |
| [`n2-walk-side.png`](neon-batch2-shots/n2-walk-side.png) | `n2` | `Pistol_Walk` | 1.300 | 7 | 14,598 | `0.5178x` at `1.30 m/s` law |

---

## 4. Visual Evidence (`390×844` Stills, Contact Sheet & Phone Clips)

- **4×3 Overview Contact Sheet:** [`neon-batch2-overview.png`](neon-batch2-shots/neon-batch2-overview.png) (`1338×2259`, `1,473,792 B`)
- **Phone Motion Clips (`390×844`, `24 fps`, `h264`, `yuv420p`, `ffprobe`-verified & frame-inspected):**

| Video File (`neon-batch2-shots/`) | Codec / PixFmt | Resolution | FPS | Frames / Duration | Size (B) | Beats Shown |
|---|---|---|---:|---:|---:|---|
| [`maya-bed-push.mp4`](neon-batch2-shots/maya-bed-push.mp4) | `h264` / `yuv420p` | `390×844` | `24/1` | 132f / 5.50 s | 454,055 | `Bed_Push_Loop` side (`0..2.8s`) -> 3Q (`2.8..5.5s`) w/ `0.1 mm` grip lock |
| [`cole-batch2.mp4`](neon-batch2-shots/cole-batch2.mp4) | `h264` / `yuv420p` | `390×844` | `24/1` | 144f / 6.00 s | 684,784 | `Walking_Arm_Injury` 3Q & side (`1.30 m/s`) -> `Sit_Disbelief_Forward` |
| [`gunman-batch2.mp4`](neon-batch2-shots/gunman-batch2.mp4) | `h264` / `yuv420p` | `390×844` | `24/1` | 156f / 6.50 s | 565,713 | `Pistol_Idle_Alert` -> `Cover_To_Shooting` (muzzle flash) -> `Dying_Headshot_Knees` |
| [`n2-batch2.mp4`](neon-batch2-shots/n2-batch2.mp4) | `h264` / `yuv420p` | `390×844` | `24/1` | 156f / 6.50 s | 583,978 | `Pistol_Idle_Alert` -> `Cover_To_Shooting` (muzzle flash) -> `Dying_Headshot_Knees` |

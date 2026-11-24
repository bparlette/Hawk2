# Neon Cast Pass — Mixamo 48-Clip Retarget onto MIT VALID Cast

- **Responder:** Neon (Execution Lane: [games/hospital-escape-leaders-neon/](../../hospital-escape-leaders-neon/))
- **Spec & Plan References:** [CAST-PASS.md](../CAST-PASS.md), [neon-mixamo.md](neon-mixamo.md), [neon-c-cast-specs.md](neon-c-cast-specs.md)
- **Live Game Tree Status:** `games/hospital-escape/` live game, `games/hospital-escape/mixamo/`, `games/hospital-escape/mixamo-viewer/`, `games/hospital-escape-walkoff-neon/`, and baseline `games/hospital-escape-leaders-neon/{index.html,leaders-neon.js,assets/*v2.glb}` remain **untouched** (`0` diff).
- **Viewer (390x844 Mobile Stage):** [cast-pass.html](../../hospital-escape-leaders-neon/cast-pass.html) + [cast-pass.js](../../hospital-escape-leaders-neon/cast-pass.js)
- **Build Tools:** [gen_cast_textures.py](../../hospital-escape-leaders-neon/tools/gen_cast_textures.py) + [build_neon_cast_pass.py](../../hospital-escape-leaders-neon/tools/build_neon_cast_pass.py)

---

## 1. Extra Loader Flag

- **Extra loader used:** `THREE.GLTFLoader` from `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js` (also surfaced live in the HUD and runtime telemetry `flags: ["GLTFLoader (three@0.128.0)"]`).
- **Other loaders:** None (`0` FBXLoader, DRACOLoader, or external CDN runtimes shipped; GLBs use standard uncompressed glTF 2.0 binary buffers).
- **Offline Build Tooling Only (not shipped to runtime):** Blender `5.2.3 LTS` (`fbx` importer + `gltf2` GLB exporter) and Python `Pillow` / `NumPy`.

---

## 2. Measured Cast Deliverables Summary

| Cast Role | Source MIT VALID Rig | Output GLB | File Size | Triangles | Materials | Exported Clips | Live Runtime Draws / Tris (`cast-pass.html`) |
|---|---|---|---:|---:|---:|---:|---|
| **Gunman** (Enemy / Guard) | `White_M_1_Util.glb` (1.80 m) | [gunman-mixamo.glb](../../hospital-escape-leaders-neon/assets/cast-pass/gunman-mixamo.glb) | `3,963,928 B` (`3.8 MB`) | `9,774` | `4` (`H_DDS`, `GunmanBeanieMat`, `GunmanRigMat`, `PistolMat`) | `28` | `9–11` calls, `21,158–21,318` tris |
| **Maya Vance** | `Hispanic_F_1_Util.glb` (1.68 m) | [maya-mixamo.glb](../../hospital-escape-leaders-neon/assets/cast-pass/maya-mixamo.glb) | `1,526,836 B` (`1.5 MB`) | `9,127` | `3` (`H_DDS`, `MayaPonytailMat`, `MayaStrapMat`) | `6` | Duo + WC: `61–63` calls, `40,980–41,076` tris; Bed: `44` calls, `19,260` tris |
| **Cole Mercer** | `White_M_3_Casual.glb` (1.80 m) | [cole-mixamo.glb](../../hospital-escape-leaders-neon/assets/cast-pass/cole-mixamo.glb) | `3,023,908 B` (`2.9 MB`) | `8,994` | `3` (`H_DDS`, `ColeGauzeMat`, `ColeBloodMat`; `PistolMat` on `ColePistol`) | `16` | Seated + WC: `57` calls, `22,406` tris; Bed: `50` calls, `18,806` tris |
| **All-Cast Lineup** | All 3 GLBs + Wheelchair Prop | — | — | — | — | `50` total (`28+6+16`) | `71` calls, `62,232` tris, `22` textures, `10` programs, `38.81 MB` JS heap (`0` console errors) |

All three exported assets live in [games/hospital-escape-leaders-neon/assets/cast-pass/](../../hospital-escape-leaders-neon/assets/cast-pass/) alongside [cast-pass-manifest.json](../../hospital-escape-leaders-neon/assets/cast-pass/cast-pass-manifest.json).

---

## 3. Recreate-From-Paper Method

### 3.1 Decode & Verify All 48 Mixamo Clips
All 48 source files in `games/hospital-escape/mixamo/*.fbx.gz.b64` were decoded with gzip + base64 (`base64 -d ... | gunzip`) and verified byte-for-byte + SHA-256 (`48/48 PASS` against `games/hospital-escape/mixamo/MANIFEST.md`).
- `y-bot-tpose.fbx` is imported strictly as the **WITH-SKIN rest armature anchor** (`Armature`, `0.01` scale) and is deleted before every GLB export (`Y Bot` never ships).
- All remaining 47 `Without Skin` 30 fps FBX clips are imported purely for their `bpy.types.Action` datablocks and evaluated directly on the Y Bot rest armature (`0.0000 rad / 0.0 mm` error vs FBX skin).

### 3.2 Native Meter Rest-Scale Normalization on MIT VALID Rigs (`setup_valid_rig`)
MIT VALID GLBs store `pose.bones['Hips'].scale = (0.01, 0.01, 0.01)` in Pose Mode over a cm-scale rest mesh. Leaving that hidden scale causes 100x blowup or gimbal shear under quaternion retargeting.
1. Evaluate `H_DDS_HighRes` once via `bpy.context.evaluated_depsgraph_get()` and bake world-space vertex positions into rest `mesh.data.vertices` (deleting mouth/gland helpers and merging eyeball meshes first).
2. Switch to Pose Mode and execute `bpy.ops.pose.armature_apply(selected=False)`, freezing `Reference` rest bone lengths into native meters (`location = (0,0,0)`, `scale = (1,1,1)`).
3. Uniformly scale and translate `Reference` + body so soles touch `z = 0.0` at exact cast heights (**Gunman `1.80 m`**, **Maya `1.68 m`**, **Cole `1.80 m`**), apply transforms, and decimate cleanly (`ratio = 0.21`). For Cole (`barefoot_slender=True`), slim `Foot`/`ToeBase` vertices (`wz < 0.095`, `x *= 0.88`, sole `y *= 0.96`) and taper ankle cuff vertices (`0.06 <= wz <= 0.16`, up to `14%` radial pull around each leg's ankle centroid at `wz = 0.105`) to eliminate bulky sneaker lugs and cuff shelves.
4. Measure exact rest bone-to-sole vertical clearances (`foot_off`, `toe_off`) from `Foot` / `ToeBase` vertex groups for per-clip foot-locking.

### 3.3 World-Space T-Pose Delta Retargeting & Top-Down Local Decomposition (`retarget_clip`)
Both Mixamo Y Bot (`S`) and MIT VALID (`T`) share anatomical T-poses facing `-Y` in Blender (`Z`-up) across `52` mapped bones (`Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `L/R Shoulder/Arm/ForeArm/Hand`, `L/R UpLeg/Leg/Foot/ToeBase`, plus all `30` finger joints `Thumb/Index/Middle/Ring/Pinky 1..3`).
1. At rest T-pose (`R_S0`, `R_T0`), compute rest world rotation matrices and target no-basis parent-relative matrices `rest_rel_no_basis[b] = R_p0^-1 @ (R_T0[b] @ q_b0^-1)` (`compute_rest_cache`).
2. For each frame `f` at 30 fps (`dt = 1/30 s`), compute the target world rotation of every mapped bone:
   $$R_{\text{goal}}[b_T] = \left(R_{S,f}[b_S] \, R_{S,0}[b_S]^{-1}\right) R_{T,0}[b_T]$$
   and scale root Hips delta by the leg/hips rest ratio `h_scale = pos_T0['Hips'].z / pos_S0['Hips'].z`:
   $$\text{goal}_W = \text{pos}_{T,0}[\text{'Hips'}] + \left(p_{S,f} - \text{pos}_{S,0}[\text{'Hips'}]\right) h_{\text{scale}}$$
3. Top-down hierarchy solve recovers local bone `rotation_quaternion` relative to parent `R_p` and `rest_rel_no_basis`, preserving arbitrary rest roll without gimbal lock.

### 3.4 Surge-Preserving In-Place Conversion, Vertical Foot-Lock & Stance Speed Law
For locomotion clips exported `In Place UNCHECKED` (root motion ON):
1. Measure raw travel vector $\Delta_{XY} = \text{samples}_H[-1]_{XY} - \text{samples}_H[0]_{XY}$ and duration $(n_f - 1)/30$ s, giving `authored_root_mps`.
2. Subtract strictly linear horizontal velocity $\Delta_{XY} \cdot \frac{i}{n_f - 1}$ and center mean XY at `(0, 0)`, removing drift while **preserving natural step-to-step surge and vertical bob**.
3. Apply vertical foot-lock (`foot_lock=True`): compute per-frame minimum sole clearance `min(pf.z - foot_off, pt.z - toe_off)`, remove constant rest sole bias across the cycle (`base_err`), clamp negative floor penetrations (`sz_adj < 0`), and softly pin stance frames (`sz_adj < stance_env`, `stance_env = 0.032 m` walk / `0.045 m` run) so feet track the floor plane (`minZ ~ 0.0 mm`).
4. Measure **authored stance-phase foot-contact speed** `authored_stance_mps`: across consecutive frames where a foot/toe is in stance (`sz <= 0.028 m`), project its backward in-place delta onto `-travel_dir / dt` and take the median (robust against swing phases); `stance_slide_mm` is the median frame-to-frame delta deviation from `authored_stance_mps`.
5. In Three.js (`cast-pass.js`), playback `timeScale` locks linearly to the locomotion law:
   $$\text{timeScale} = \frac{v_{\text{target}}}{\text{authored\_stance\_mps}}, \quad v_{\text{walk}} = 1.30\text{ m/s}, \; v_{\text{run}} = 3.20\text{ m/s}$$

### 3.5 `Spine1+` Additive Fire & Upper-Body Layering
1. **Gunman Additive Recoil (`Pistol_Walk_Fire`, `Pistol_Walk_Fire_SG`, `Pistol_Strafe_L_Fire`, `Pistol_Run_Aimed_Fire`):** Using `Spine1` and all descendants (`UPPER_SPINE1_BONES`: `Spine1`, `Spine2`, `Neck`, `Head`, `L/R Shoulder/Arm/ForeArm/Hand` + fingers), sample the world-space rotation delta of the firing source relative to its initial ready frame $u_0$:
   $$R_d[b_T] = \text{AxisAngleScale}\!\left(R_{\text{fire},u} \, R_{\text{fire},u_0}^{-1},\, s_{\text{add}}\right)$$
   - `shooting.fbx` (`Firing A Gun`, frames `1..25` walk / `1..23` run, $s_{\text{add}} = 1.35$) layers two-handed pistol kick onto `Pistol_Walk`, `Pistol_Strafe_L`, and `Pistol_Run_Aimed`.
   - `shooting-gun.fbx` (`Shooting Handgun`, frames `15..39`, $s_{\text{add}} = 0.85$) yields `Pistol_Walk_Fire_SG`.
   - `Crouch_Walk_Aim` replaces `Spine1+` on `crouch_walk` with frame `10` of `pistol-kneeling-idle.fbx`.
2. **Cole Seated Fire (`Sit_Aim_Fire`):** `aim-pistol-seated.fbx` holds `RightHand` low at lap height (`z = 0.59–0.61 m`), preserved verbatim in `Sit_Aim_Pistol`. For `Sit_Aim_Fire`, `retarget_clip(..., upper_clip=(src['shoot'], 1, 35))` layers the full `Spine1+` upper-body aim and recoil cycle from `shooting.fbx` (`f=1..35`) over `sitting-idle-breathing.fbx` (`Sit_Idle_Breath`) lower body so Cole aims and fires two-handed upright from the wheelchair.
3. **NLA Packing Bug & Fix:** Early inspection surfaced a split bug (`__tmp_{i}_{name}.split('_', 3)[-1]`) that left numeric prefixes (`0_Pistol_Idle`) in GLB action names, forcing `playClip()` to fall back to index 0. Replaced with exact temporary-name preservation (`orig_names` zip restore) + `mixer.stopAllAction()` in `cast-pass.js`, verified `bad_prefixed = []` across all 50 exported NLA strips.

### 3.6 Maya Analytical 2-Bone Arm IK (`apply_maya_handle_ik`)
Source `wheelbarrow-walk.fbx` has wrists at mean `z = 0.8497 m`, `~13.5 cm` below standard wheelchair push grips (`y = 0.985 m`, `x = +-0.23 m`). Raw `pushing.fbx` starts crouched (`Hips z = 0.44 m`), whereas `push-start.fbx` `f = 45..135` holds a steady forward lean at `z = 1.00–1.05 m`, extracted with a `10`-frame crossfade loop into `Bed_Push_Loop` while preserving full `Bed_Push_Start`, `Bed_Push_Raw`, `Bed_Push_Stop`, and `Walk_Fem`.
- For each frame `f`, given shoulder `S`, elbow `E`, wrist `W`, segment lengths $l_1 = \|E - S\|$, $l_2 = \|W - E\|$, clamped target distance $d \le 0.988(l_1+l_2)$, law-of-cosines $\cos\alpha = \frac{l_1^2+d^2-l_2^2}{2 l_1 d}$, and an outward-down-rear elbow pole (`(+-0.35, +0.30, -0.88)` blended `0.55/0.45` with raw bend), solve new `E_new` and propagate `q1 = rot_between(E-S, E_new-S)` and `q2 = rot_between(q1(W-E), tgt - E_new)` plus gentle dual-hand finger grip curls (`-0.65 / -0.75 rad`).
- **Wheelchair handles (`handle_x = 0.23, handle_z = 0.985, grip_delta_z = +0.125 m`):** lifted mean wrist `0.8497 -> 0.9824 m` (`+13.27 cm`, Blender `mean_handle_gap = 16.69 mm`; Three.js live `wheelchairWristGapMM = 18.4 mm` side/3Q, `16.7 mm` back).
- **Bed push bar (`handle_x = 0.31, handle_y = -0.46, handle_z = 1.00 m`):** lifted `0.9817 -> 1.0000 m` (`+1.83 cm`, Blender `mean_handle_gap = 0.00 mm`; Three.js live `bedWristGapMM = 3.4 mm`).

### 3.7 PBR UV Textures (`gen_cast_textures.py`) & BVHTree Silhouettes / Weapon Rigging
- **Maya (`White` -> `#3F4649` utility jacket `rough=0.84`, `#1F2A44` indigo jeans `rough=0.90`, `#3B2A20` boots `rough=0.58`, dark brown `#14100E` hair `rough=0.81` with softened normals, warm olive-tan `#9B6B4C` skin):** Rasterized `Hispanic_F_1_Util.glb` into `maya_uv.npz`, expanded collar catcher to `wz < 1.535` / `r-b <= 32`, attached BVHTree-contoured rear `MayaPonytail` (`Head`), diagonal chest strap + right-hip pouch (`Spine1`).
- **Cole (`White_M_3_Casual` -> `#90A8B4` polka hospital gown `rough=0.91`, bare ankles/forearms/feet `#B98668` `rough=0.53` with footwear normals flattened `wz < 0.16`, `#B02824` bloodstained `#CFCBC4` abdomen + brow `ColeGauze` `rough=0.95`):** Waist-belt stripe neutralized smoothly across gown drape; `ColePistol` bound directly to `RightHand` on `Sit_Aim_Fire` `f=0` as an independent toggleable child node (visible only on `Sit_Aim_Fire`, `Sit_Aim_Pistol`, `Sit_Lower_Pistol`, `Sit_Gun_Motion`), with `upright_barrel_quat()` and right-finger grip curls.
- **Gunman (`White_M_1_Util` orange `#C85028` ribbed utility top, charcoal pants, tactical chest rig, fitted `GunmanBeanie` lowered `-3.2 cm` at temples, `GunmanPistol` on `RightHand`):** Added a clean charcoal leather belt + buckle (`wz = 0.955..1.030`) with 14-pass UV dilation eliminating jacket-to-waist gutter seams. Muzzle flash positions use Three.js r128 `boneTransform`-verified `RightHand`-local barrel tips (`gunman`: `(0.0237, 0.1865, 0.0720)`, `cole`: `(0.0150, 0.1594, 0.1089)`) after `gunTrack.updateMatrixWorld(true)` / `duoTrack.updateMatrixWorld(true)`.

---

## 4. Measured Metrics Tables (`cast-pass-manifest.json` + R3 Live Telemetry)

### 4.1 Gunman (`gunman-mixamo.glb` — `28` Clips)
*(Targeted in-game speed `1.30 m/s` walk / `3.20 m/s` run except stationary idles/fire/cover/death)*

| Clip | Mixamo Source | Frames (`30fps`) | Dur (`s`) | `authored_root_mps` | `authored_stance_mps` | `timeScale` (`1.30/3.20`) | `stance_slide_mm` | `min_foot_z_mm` |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `Pistol_Walk` | `pistol-walk.fbx` | 25 | 0.800 | 2.5857 | **2.5457** | `0.511x` (1.30) | 4.67 | 0.00 |
| `Pistol_Walk_Fire` | `pistol-walk` + `shooting` `f=1..25` | 25 | 0.800 | 2.5857 | **2.5457** | `0.511x` (1.30) | 4.67 | 0.00 |
| `Pistol_Walk_Fire_SG` | `pistol-walk` + `shooting-gun` `f=15..39` | 25 | 0.800 | 2.5857 | **2.5457** | `0.511x` (1.30) | 4.67 | 0.00 |
| `Pistol_Walk_Back` | `pistol-walk-backward.fbx` | 32 | 1.033 | 1.4216 | **1.4368** | `0.905x` (1.30) | 1.16 | 0.00 |
| `Pistol_Walk_ArcL` | `pistol-walk-arc-left.fbx` | 24 | 0.767 | 2.5660 | **2.5266** | `0.515x` (1.30) | 4.54 | 0.00 |
| `Pistol_Walk_ArcR` | `pistol-walk-arc-right.fbx` | 23 | 0.733 | 2.5183 | **2.5096** | `0.518x` (1.30) | 3.50 | 0.00 |
| `Pistol_Strafe_L` | `pistol-strafe-left.fbx` | 18 | 0.567 | 2.1795 | **2.2002** | `0.591x` (1.30) | 5.44 | 0.00 |
| `Pistol_Strafe_L_Fire` | `pistol-strafe-l` + `shooting` | 18 | 0.567 | 2.1795 | **2.2002** | `0.591x` (1.30) | 5.44 | 0.00 |
| `Pistol_Strafe_R` | `pistol-strafe-right.fbx` | 18 | 0.567 | 2.1795 | **2.2002** | `0.591x` (1.30) | 5.45 | 0.00 |
| `Crouch_Walk_Aim` | `crouch-walk` + `kneel-idle` `f=10` | 35 | 1.133 | 1.7093 | **1.6999** | `0.765x` (1.30) | 1.64 | 0.00 |
| `Pistol_Run_Aimed` | `pistol-run-aimed.fbx` | 23 | 0.733 | 3.0546 | **2.9487** | `1.085x` (3.20) | 7.15 | 0.00 |
| `Pistol_Run_Aimed_Fire` | `pistol-run-aimed` + `shooting` | 23 | 0.733 | 3.0546 | **2.9487** | `1.085x` (3.20) | 7.15 | 0.00 |
| `Pistol_Run` | `pistol-run.fbx` | 16 | 0.500 | 4.8069 | **4.8123** | `0.665x` (3.20) | 5.96 | 0.00 |

Remaining stationary/action Gunman clips (`15` clips, `timeScale = 1.0x`): `Pistol_Idle` (250f), `Pistol_Aim` (214f), `Pistol_Kneel_Idle` (115f), `Shooting` (36f), `Shooting_Gun` (160f), `Gunplay` (7f), `Cover_Fire` (81f), `Cover_Peek` (74f), `Cover_Idle_Stand` (69f), `Cover_Idle_Crouch` (78f), `Hit_React` (83f), `Hit_React_L` (79f), `Death_Front` (133f), `Death_Back` (139f), `Turn_In_Place` (111f).

### 4.2 Maya Vance (`maya-mixamo.glb` — `6` Clips) + Handle IK
| Clip | Mixamo Source | Frames (`30fps`) | Dur (`s`) | `authored_root_mps` | `authored_stance_mps` | `stance_slide_mm` | `min_foot_z_mm` | Pre/Post Wrist Z -> Lift / Gap |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `Wheelchair_Push` | `wheelbarrow-walk.fbx` | 30 | 0.967 | 1.5163 | **1.5377** | 1.99 | 0.00 | `0.8497 -> 0.9824 m` (**+13.27 cm**, Blender `16.69 mm`, Live **`18.4 / 16.7 mm`**) |
| `Bed_Push_Loop` | `push-start.fbx` `f=45..135` | 91 | 3.000 | 0.1863 | **0.1984** | 0.20 | 0.00 | `0.9817 -> 1.0000 m` (+1.83 cm, Blender `0.00 mm`, Live **`3.4 mm`**) |
| `Bed_Push_Start` | `push-start.fbx` | 143 | 4.733 | 0.2648 | **0.2755** | 0.24 | 0.00 | Full push start |
| `Bed_Push_Raw` | `pushing.fbx` | 120 | 3.967 | 0.0857 | **0.1657** | 0.37 | 0.00 | Raw low crouch push reference |
| `Bed_Push_Stop` | `push-stop.fbx` | 79 | 2.600 | 0.2746 | **0.3187** | 0.41 | 0.00 | Decelerating bed stop |
| `Walk_Fem` | `walking-feminine.fbx` | 30 | 0.967 | 1.5121 | **1.5286** | 1.93 | 0.00 | Unarmed corridor walk |

### 4.3 Cole Mercer (`cole-mixamo.glb` — `16` Clips) & Crown Check
- **Wheelchair Crown Height Spec (`<= 1.31 m`):**
  - Blender `seated_crown`: `Sit_Aim_Fire` `raw_crown_z_m = 1.2644 m` (`hips_z_m = 0.5615 m`), `Sit_Aim_Pistol` `1.1283 m`, `Sit_Idle_Breath` `1.3111 m`.
  - Three.js Live (`c.root.y = -0.02`): `Sit_Aim_Fire` `coleHeadBoneY = 1.041 m` / `coleEstCrownY = 1.251 m`; `Sit_Idle_Breath` `coleHeadBoneY = 1.097 m` / `coleEstCrownY = 1.307 m` (`<= 1.31 m`).
- **Locomotion & Transitions:** `Injured_Walk` (`injured-walking.fbx`, 31f, `authored_root = 1.7233 m/s`, **`authored_stance = 1.7718 m/s`**, `slide = 1.30 mm`, `minZ = 0.00 mm`), `Sit_To_Stand` (69f, 2.267s, `0.2070 m/s`), `Stand_To_Sit` (68f, 2.233s, `0.2127 m/s`).
- **Seated Clips (`10`):** `Sit_Aim_Fire` (130f, 4.30s — layered `sit_breath` + `shooting` `Spine1+`), `Sit_Aim_Pistol` (164f, 5.433s), `Sit_Lower_Pistol` (162f, 5.367s), `Sit_Gun_Motion` (145f, 4.80s), `Sit_Idle_Breath` (130f, 4.30s), `Sit_Idle_Thighs` (193f, 6.40s), `Sit_Idle_Still` (90f, 2.967s), `Sit_Rub_Arm` (240f, 7.967s), `Sit_Dodge` (268f, 8.90s), `Sit_Disbelief` (144f, 4.767s).
- **Bed Laying Clips (`3`):** `Lay_Breathless` (26f, 0.833s), `Lay_Sleeping` (52f, 1.70s), `Lay_Moaning` (65f, 2.133s).

### 4.4 Live Phone (`390x844 @2x`) Shot & Performance Telemetry (`R3`)
| Still File | Mode | Clip | Path Speed (`m/s`) | Calls / Tris | Live Measurement | Console Errors |
|---|---|---|---:|---:|---|---:|
| `gunman-walk-3q.png` | `gunman` | `Pistol_Walk` (`t=0.35`) | 1.30 | `9` / `21,158` | — | 0 |
| `gunman-walk-side.png` | `gunman` | `Pistol_Walk` (`t=0.35`) | 1.30 | `9` / `21,158` | — | 0 |
| `gunman-fire-3q.png` | `gunman` | `Pistol_Walk_Fire` (`t=0.50`) | 1.30 | `11` / `21,318` | Muzzle locked on barrel tip | 0 |
| `gunman-run-side.png` | `gunman` | `Pistol_Run_Aimed` (`t=0.25`) | 3.20 | `9` / `21,158` | — | 0 |
| `gunman-cover-3q.png` | `gunman` | `Cover_Fire` (`t=0.65`) | 0.00 | `9` / `21,158` | — | 0 |
| `maya-wheelchair-side.png` | `duo` | `Wheelchair_Push` (`t=0.28`) | 1.538 | `63` / `41,076` | `wheelchairWristGapMM=18.4`, `mayaWristY=0.9788`, `coleEstCrownY=1.251` | 0 |
| `maya-wheelchair-3q.png` | `duo` | `Wheelchair_Push` (`t=0.28`) | 1.538 | `63` / `41,076` | `wheelchairWristGapMM=18.4`, `coleEstCrownY=1.251` | 0 |
| `maya-wheelchair-back.png` | `duo` | `Wheelchair_Push` (`t=0.40`) | 1.538 | `61` / `40,980` | `wheelchairWristGapMM=16.7`, `mayaWristY=0.9848`, `coleEstCrownY=1.307` | 0 |
| `maya-bed-side.png` | `maya_bed` | `Bed_Push_Loop` (`t=0.80`) | 0.198 | `44` / `19,260` | `bedWristGapMM=3.4` | 0 |
| `cole-seated-aim-3q.png` | `cole` | `Sit_Aim_Fire` (`t=0.28`) | 0.00 | `57` / `22,406` | `coleHeadBoneY=1.041`, `coleEstCrownY=1.251` | 0 |
| `cole-bed-3q.png` | `cole_bed` | `Lay_Breathless` (`t=0.20`) | 0.00 | `50` / `18,806` | Supine head-on-pillow mattress alignment | 0 |
| `all-cast-3q.png` | `all` | `Lineup` (`t=0.40`) | 0.00 | `71` / `62,232` | `textures=22`, `programs=10`, `jsHeap=38.81 MB` | 0 |

---

## 5. Phone-Size (`390x844`) Visual Evidence

All captures stored in [neon-cast-pass-evidence/](neon-cast-pass-evidence/):

- **Overview Contact Sheet (12 Panels):** [neon-cast-pass-overview.png](neon-cast-pass-evidence/neon-cast-pass-overview.png)
- **Phone Clips (`390x844`, H.264 `yuv420p`, `24 fps`, `8.00 s` / `192` frames, `ffprobe` verified):**
  - **Gunman Walk -> Fire (`Spine1+`) -> Aim -> Run (`3.20 m/s`):** [gunman-walk-aim-fire.mp4](neon-cast-pass-evidence/gunman-walk-aim-fire.mp4) (`1.1 MB`)
  - **Maya Wheelchair Push (`+13.27 cm` IK, Cole `Sit_Aim_Fire`) -> Bed Push (`3.4 mm` gap):** [maya-push-cole.mp4](neon-cast-pass-evidence/maya-push-cole.mp4) (`1.2 MB`)
- **Phone Stills (`390x844 @2x`, `?clean=1`):**
  - Gunman: [gunman-walk-3q.png](neon-cast-pass-evidence/gunman-walk-3q.png), [gunman-walk-side.png](neon-cast-pass-evidence/gunman-walk-side.png), [gunman-fire-3q.png](neon-cast-pass-evidence/gunman-fire-3q.png), [gunman-run-side.png](neon-cast-pass-evidence/gunman-run-side.png), [gunman-cover-3q.png](neon-cast-pass-evidence/gunman-cover-3q.png)
  - Maya + Cole Wheelchair / Bed: [maya-wheelchair-side.png](neon-cast-pass-evidence/maya-wheelchair-side.png), [maya-wheelchair-3q.png](neon-cast-pass-evidence/maya-wheelchair-3q.png), [maya-wheelchair-back.png](neon-cast-pass-evidence/maya-wheelchair-back.png), [maya-bed-side.png](neon-cast-pass-evidence/maya-bed-side.png)
  - Cole Solo & Lineup: [cole-seated-aim-3q.png](neon-cast-pass-evidence/cole-seated-aim-3q.png), [cole-bed-3q.png](neon-cast-pass-evidence/cole-bed-3q.png), [all-cast-3q.png](neon-cast-pass-evidence/all-cast-3q.png)

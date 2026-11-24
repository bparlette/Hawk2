# Shooter-Asset Bake-Off — NEON's Entry: Five Walking Gunmen, One Role

> **Login note (for Cherie):** One optional login — **mixamo.com (free Adobe ID)** — would let us pull clean-licensed, plain-clothes tactical locomotion & aiming clips directly instead of borrowing from Three.js's Vanguard test mirror. I did **not** stall waiting on a login: Example 2 uses Mixamo/Soldier locomotion (`Walk`, `Run`, `Idle`) from the `mrdoob/three.js` example asset (`Soldier.glb`) strictly **flagged as `local-test-only` (not-yet-shippable)**, while Examples 1, 3, 4, and 5 use 100% shippable MIT / CC0 / Apache-or-repo-derived assets (`valid-avatars-glb` MIT + `gltf-universal-animation-library` CC0 1.0 + Quaternius `Casual2` CC0 + Sample B Hunyuan3D).
>
> **Free-only tools used (zero paid software, zero paid assets):** Blender `5.2.3 LTS` (free/GPL), Python `3.14` with `Pillow` and `NumPy`, Node `v26.13.0`, headless Google Chrome CDP (`390×844 @2x`), `ffmpeg` / `ffprobe`, and Three.js pinned `0.128.0` CDN (`three.min.js`, `GLTFLoader.js`, `SkeletonUtils.js` — never inlined).

---

## Live Sample & Evidence Deliverables

- **Live bake-off sample page (live `games/hospital-escape/` untouched):**
  [`games/hospital-escape-3d-sample-neon/index.html`](../../hospital-escape-3d-sample-neon/index.html) (`?beat=gauntlet&fig=<mode>`, compact mobile switcher pills top-right)
  - `?fig=valid-ual` *(default — Example 1: VALID White_M_3_Casual × UAL)*
  - `?fig=valid-mocap` *(Example 2: VALID White_M_1_Util × Mixamo Soldier Walk/Run/Idle + UAL Gun/Hit/Death)*
  - `?fig=ai3d-remesh` *(Example 3: Hunyuan3D AI-3D T-posed, decimated, zone de-lighted × UAL `DATA_TRANSFER` weights)*
  - `?fig=sculpt-c` *(Example 4: CC0 Quaternius Casual2 overhauled to 0.78× adult head ratio + rust bomber)*
  - `?fig=ual-dressed` *(Example 5: CC0 UAL 1.80 m Mannequin inflated & outfitted in Blender, zero retarget loss)*
  - `?cast3d=0` *(Painted billboard reference control)*
- **6-column comparison sheet (`390×844` full view + `2.4×` gunman zoom crops at `7.01–7.09 m` range):**
  [`neon-shooter-asset-evidence/neon-bakeoff-comparison.png`](neon-shooter-asset-evidence/neon-bakeoff-comparison.png)
- **Five deterministic `390×844 @ 24 fps` H.264 `yuv420p` walking captures (`3.75 s` Gauntlet `g_w1_2` rush corridor walk, HP pinned harness-only so the walker finishes his stride without dying early):**
  1. [`neon-shooter-asset-evidence/ex1-valid-ual-walk.mp4`](neon-shooter-asset-evidence/ex1-valid-ual-walk.mp4) (`537 KB`)
  2. [`neon-shooter-asset-evidence/ex2-valid-mocap-walk.mp4`](neon-shooter-asset-evidence/ex2-valid-mocap-walk.mp4) (`537 KB`)
  3. [`neon-shooter-asset-evidence/ex3-ai3d-remesh-walk.mp4`](neon-shooter-asset-evidence/ex3-ai3d-remesh-walk.mp4) (`531 KB`)
  4. [`neon-shooter-asset-evidence/ex4-sculpt-c-walk.mp4`](neon-shooter-asset-evidence/ex4-sculpt-c-walk.mp4) (`528 KB`)
  5. [`neon-shooter-asset-evidence/ex5-ual-dressed-walk.mp4`](neon-shooter-asset-evidence/ex5-ual-dressed-walk.mp4) (`568 KB`)

*(Original IP rule upheld across all five builds: rust-brown `#8A4533`/`#9B503B` bomber jacket, charcoal beanie `#1C1C1C`, matte black chest rig `#1F2522`, dark charcoal trousers `#22252A`, dark boots, combat handgun — zero Rockstar/GTA IP.)*

---

## 1. Whole-Frame Cost, Pacing & Visual Summary

All frame metrics below were measured in headless Chrome (`390×844 @2x`, `seed=1`, `beat=gauntlet`) at `t = 4.43–4.45 s` (`g_w1_2` rushing gunman walking forward at `7.01–7.09 m` from camera) using synchronous `renderer.info` wrapping the complete frame including `HEPOST` depth/bloom/blur composite (`autoReset = false; reset(); post.render(t);`). Every mode logged **`0` console/page errors**.

| Candidate | Whole-Frame Calls / Tris | Memory Geom / Tex | Per-Figure Mesh / Mats | GLB Size | Walk / Run Stance Speed (m/s) | Screen `pxH` (`~7.05 m`) | Capture Pace (`sp` → `ts` on Walk) | Shippable License |
|---|---|---:|---:|---:|---:|---:|---|---|
| **Painted Control** (`?cast3d=0`) | `121` / `4,383` *(123 / 18,847 pre-cull)* | `87` / `31` | `2 tris` quad / `1` | Painted sprites | Stop-motion `0.44 m` step | `195.1 px` | `1.84 m/s` | Yes (Live ref) |
| **1 · `valid-ual`** | `125` / `48,109` | `96` / `44` | `7,323` tris / `3` mats | `978,652 B` (`956 KB`) | `1.094` / `5.449` | `191.0 px` | `2.392 m/s` → `2.186×` | **Yes (MIT + CC0)** |
| **2 · `valid-mocap`** | `125` / `48,115` | `128` / `43` | `7,322` tris / `3` mats | `962,752 B` (`940 KB`) | `1.688` / `4.200` | `191.1 px` | `2.392 m/s` → `1.417×` | **Local test only** *(Ex2 Walk/Run/Idle)* |
| **3 · `ai3d-remesh`** | `123` / `42,683` | `127` / `37` | `5,963` tris / `2` mats | `620,220 B` (`606 KB`) | `1.093` / `5.231` | `191.1 px` | `2.392 m/s` → `2.188×` | **Yes (Repo + CC0)** |
| **4 · `sculpt-c`** | `157` / `43,947` | `136` / `73` | `6,280` tris / `11` mats | `1,226,004 B` (`1.2 MB`) | `1.344` / `3.080` | `190.1 px` | `2.208 m/s` → `1.643×` | **Yes (CC0)** |
| **5 · `ual-dressed`** | `142` / `49,429` | `132` / `57` | `7,650` tris / `7` mats | `794,352 B` (`776 KB`) | `1.059` / `5.069` | `191.1 px` | `2.392 m/s` → `2.259×` | **Yes (CC0 1.0)** |

### Foot-Contact Pacing Probe & Bounds Lessons Applied Across All Five

1. **Stance-phase velocity (never stride ÷ cycle):** Using `contact_probe.mjs` (Three.js r128 headless Chrome probe) on all five GLBs, each model was stepped across `48` clip samples and backward ankle velocity (`-ΔZ / Δt`) was measured exclusively across the **lowest `16%` foot-Y stance band**. That prevented the ~2× speed understatement caused by dividing total stride span by cycle duration.
2. **Eliminating `1/24` video capture vs `1/60` engine tick aliasing:** During deterministic 24 fps capture, `1/24 s` advances `2` physics ticks (`1.84 m/s`) and `3` ticks (`2.76 m/s`) on alternate frames (`2.30 m/s` mean). In `sculpt-c`, the `2.76 m/s` spike initially crossed the midpoint threshold `(1.344 + 3.080)/2 = 2.212` and kicked the walker briefly into airborne **`Run`** frames. Adding a lightweight speed EMA (`inst.smoothSp`) and raising the `Run` transition threshold to `walk + (run - walk) * 0.68` (`2.52 m/s` on `sculpt-c`) eliminated clip-flipping completely.
3. **Never size skinned GLBs with `THREE.Box3.setFromObject()`:** Raw vertex buffers on `VALID` are in cm (`184.191`) under a `0.01×` scaled `Reference` armature (and `Walk_Loop` min-Y sits at `-100.8` rather than rest `-113.4`), while `sculpt-c`'s unskinned buffer measured `41.575` under a `100×` armature — making `sculpt-c` render 23× too small in `v1` and making `VALID` float 15 cm. Reading exact `Walk` evaluated bounds via `SkinnedMesh.boneTransform` (`fixedH` and `z0` per build in [`cast3d-neon.js`](../../hospital-escape-3d-sample-neon/game/cast3d-neon.js)) locks every gunman to `1.80 m` (`190–191 px` at `7.05 m`, matching Painted `195 px`) with boots resting cleanly on the tile floor.
4. **Corridor-lamp integration & grounding (GTA-6 realism bar):** Every 3D material receives per-instance `onBeforeCompile` directional relighting from the 87 ceiling panels (`HEPAINT.lights`, nearest-2 lamps + height-dependent ankle/boot AO + view rim + transient warm muzzle flash `uMuzzleCol`) plus oval contact shadow and wet-tile floor reflection planes (`addFloorGrounding`), keeping 3D silhouettes anchored inside the room rather than pasted over it.

---

## 2. Candidate Builds (Reproducible Recipes & Iteration Trails)

### Example 1 — `valid-ual`: Photoreal VALID Mesh + UV Reskin + CC0 UAL Animation Library *(Template Winner)*

- **Source & Method:**
  - Base body: [`White_M_3_Casual.glb`](https://github.com/c-frame/valid-avatars-glb) (`1.9 MB`, `c-frame/valid-avatars-glb` MIT license, photoreal human rig/proportions).
  - Animation library: [`AnimationLibrary_Godot_Standard.gltf`](https://github.com/J-Ponzo/gltf-universal-animation-library) (`J-Ponzo/gltf-universal-animation-library`, CC0 1.0, `46` clips on a `53`-bone Rigify `DEF-*` skeleton).
  - Blender `5.2.3` step-by-step recipe:
    1. Import `White_M_3_Casual.glb`; strip hidden mouth internals (`h_TeethDown`, `h_TeethUp`, `h_L_gland`, `h_R_gland`), clear facial shape keys, move `Decimate` (`COLLAPSE`, ratio `0.145`) before `Armature` and apply, then join `h_L_eye` / `h_R_eye` into `H_DDS_HighRes` (`7,323` tris total with props).
    2. Build exact bone-weight UV masks (`casual_uv.npz`) separating upper-torso/arm polygons (`jacket`), legs (`pants`), ankle/foot (`boots`), and lower jaw (`beard`, lip-guarded so mouth/eyes remain clean skin) in `512×512` `casual_gunman_color.jpg` & `casual_gunman_nm.jpg` (`Roughness = 0.80`, `Metallic = 0.0`).
    3. Synthesize and bind articulated tactical accessories using `skin_attach_object` (`D_pose^-1 @ M_part_world` into `H_DDS_HighRes`): knit beanie on `Head`, ballistic chest rig on `Spine2`, sculpted handgun on `RightHand` posed at `Pistol_Aim_Neutral` frame 0.
    4. Retarget `9` shooter clips (`Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Pistol_Idle_Loop`, `Pistol_Aim_Neutral`, `Pistol_Shoot`, `Hit_Chest`, `Death01`, `Crouch_Idle_Loop`) by matching world bone axes between `UAL` `A_TPose` and `VALID` rest pose, inserting pose keyframes directly (required in Blender 5.2) + root hip translation scaled by leg ratio, packing clean NLA tracks, and exporting with `export_frame_step=2, export_all_influences=False`.
- **Iteration Trail:**
  - `v1`: Imported cleanly, but `.001` action duplicates inflated GLB to `~2.4 MB`; `THREE.Box3` rest-pose `yMin` caused ~15 cm foot float; jacket looked overly dark under corridor fog.
  - `v2`: Purged unused actions (`978,652 B`), boosted jacket UV region `+1.20×` toward rust `#8A4533`, injected stronger `onBeforeCompile` lamp key (`uL1Col * d1 * 1.05`). Feet still dipped `-0.024 m` during heel strike.
  - `v3`: Calibrated `fixedH = 179.34`, `z0 = -100.8`, stance `walk = 1.094 / run = 5.449 m/s`, smoothed speed EMA. Result: grounded combat boots, crisp bomber/pants separation, readable beanie and handgun.
- **License / Provenance:** Mesh & base rig MIT (`c-frame/valid-avatars-glb`); clips CC0 1.0 (`gltf-universal-animation-library`); reskin/props original. **100% shippable.**
- **Cost & Pacing:** `7,323` tris, `3` material slots (`956 KB` GLB), whole-frame `125` calls / `48,109` tris; Walk stance speed `1.094 m/s`, Run `5.449 m/s`; `ex1-valid-ual-walk.mp4` logged `33` Walk samples (`sp ~ 2.392 m/s`, `ts = 2.186`).
- **Repeatability Cost (Maya / Cole / Hale / Teal-Scrubs):** **Lowest for photoreal quality.** All `46` UAL shooter clips, the `UAL_TO_VALID` world-quaternion retargeter, the Three.js `onBeforeCompile` lamp shader, and `cast3d-neon.js` runtime carry over 100% unchanged. Per new character: swap `VALID` body (`White_F_*` for Maya, `White_M_Util` or doctor base for Hale), regenerate bone-weight UV palette masks (~10–20 min per coat/scrubs palette), and swap props (lab coat hem / stetho for Hale; scrubs mask for Teal-Scrubs; wheelchair sit clip from UAL or seated hip bend for Cole).
- **What worked / What failed:** Best combination of photoreal anatomy, cloth fold nuance at `5–15 m`, clean right-hand pistol aim, zero joint breakage, and clean MIT + CC0 licensing. Slightly stiffer arm carry during pure `Walk_Loop` (`ts ~ 2.19×` at `2.39 m/s` game walk) than dedicated Mixamo mocap.

---

### Example 2 — `valid-mocap`: VALID Util Body + Mixamo `Soldier.glb` Locomotion *(Local-Test Mocap Benchmark)*

- **Source & Method:**
  - Base body: `White_M_1_Util.glb` (`1.8 MB`, `c-frame/valid-avatars-glb` MIT), prepared & decimated (`7,322` tris, `3` mats) identically to Ex 1 using `util_gunman_color.jpg`.
  - Locomotion clips: [`Soldier.glb`](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb) (`mrdoob/three.js` example mirror — Mixamo Vanguard character clips: `Walk -> Walk_Loop`, `Run -> Jog_Fwd_Loop`, `Idle -> Idle_Neutral`).
  - Combat clips (`Pistol_Idle_Loop`, `Pistol_Aim_Neutral`, `Pistol_Shoot`, `Hit_Chest`, `Death01`, `Crouch_Idle_Loop`): blended from CC0 `UAL` on the same `Reference` armature so only the walk/run/idle use Mixamo data.
  - Because `Soldier.glb` faces `+Y` in Blender while `VALID` faces `-Y`, the Mixamo retargeter applies a `180°` Z alignment rotation (`align_rot_S = Matrix.Rotation(math.pi, 3, 'Z')`) around `TPose` when mapping `mixamorig:*` bones to `VALID` (`Hips`..`RightToeBase`).
- **Iteration Trail:**
  - `v1`: Combined `Soldier` walk with `VALID` raw scale caused `Box3` height mismatch; dark bomber blended slightly into dark corridor side walls when facing away from ceiling panels.
  - `v2`: Adjusted `util_gunman_color.jpg` (`144.8, 69.6, 50.0` RGB mean) + boosted corridor lamp shader.
  - `v3`: Tuned `fixedH = 178.68`, `z0 = -99.1`, verified `1.688 m/s` stance velocity (`ts = 1.417×` at `2.39 m/s` rush walk vs `2.19×` on UAL).
- **License / Provenance:** Mesh/props MIT (`c-frame/valid-avatars-glb`); combat clips CC0 1.0 (`UAL`); **`Soldier.glb` Mixamo Walk/Run/Idle flagged `local-test-only` / not-yet-shippable** (Mixamo EULA restricts redistributed character assets unless downloaded via project Adobe/Mixamo account — flagged in top Login Note).
- **Cost & Pacing:** `7,322` tris, `3` mats (`940 KB` GLB), whole-frame `125` calls / `48,115` tris; Walk stance speed `1.688 m/s`, Run `4.200 m/s`; closest `1:1` natural playback cadence (`ts ~ 1.35–1.54×`, zero high-speed shuffling).
- **Repeatability Cost:** Same low per-character cost as Ex 1 (swaps cleanly per character mesh if Mixamo login is connected or CC0 mocap clips replace `Soldier.glb`).
- **What worked / What failed:** Visually **the most natural human stride weight-shift** of all five examples (`Walk` authored at `1.69 m/s` instead of `1.09 m/s`, so legs don't speed-cycle at `2.3 m/s` gameplay advance). Only drawback is the `Soldier.glb` provenance gate.

---

### Example 3 — `ai3d-remesh`: Rescued Hunyuan3D Image-to-3D + Zone De-Lighting + UAL Weight Transfer

- **Source & Method:**
  - Base mesh: `sample-b.glb` (`50,932` tris, single `Gunman` mesh from earlier Sample B Hunyuan3D image-to-3D generation).
  - Repair pipeline in Blender `5.2.3`:
    1. Strip fused chest-bridging pistol vertices (`y < -0.25`, `|x| < 0.085`, `1.15 < z < 1.48`), pose the broken 17-bone `GunmanRig` cleanly into UAL `A_TPose` limb angles, bake `Armature` modifiers, delete old rig, and `Decimate` (`0.12` ratio → `5,963` tris including pistol).
    2. Normalize to `1.80 m` height grounded at `z = 0`.
    3. Transfer clean `53`-bone `DEF-*` vertex weights from UAL `Mannequin` using Blender `DATA_TRANSFER` (`VGROUP_WEIGHTS`, `'POLYINTERP_NEAREST'`, transferring `2997/2997` vertices cleanly vs heat-fail errors on non-manifold AI geometry).
    4. Mount crisp sculpted pistol to `DEF-hand.R` at `Pistol_Aim_Neutral` frame 0 and pack `9` UAL clips (`606 KB` GLB).
- **Iteration Trail:**
  - `v1`: Used `ARMATURE_AUTO` + uniform gamma lift `pow(r, 0.44) + 0.055`; still read too muddy and had weak shoulder weighting.
  - `v2` *(caught on visual screenshot inspection)*: Deleting `Mannequin` and lifting dark `0.03` vertex colors pushed black pants/boots up to `[0.301, 0.262, 0.246]`, turning the entire figure into a uniform **monochrome gray clay statue** (`min=[0.301,0.262,0.246], mean=[0.472,0.385,0.353]`).
  - `v3` *(fixed & visually verified)*: Replaced `ARMATURE_AUTO` with `DATA_TRANSFER` from `Mannequin` (`2997/2997` vertices) and wrote a zone-aware vertex color de-lighting pass multiplying original Hunyuan cloth-crease luminance modulation onto calibrated linear zone targets (`z < 0.18` boots, `z < 0.92` charcoal trousers, `0.92..1.50` rust bomber + chest strap, `1.50..1.66` forward skin face, beanie top).
- **License / Provenance:** Internal repo Sample B Hunyuan3D asset + CC0 `UAL` rig/clips (`J-Ponzo/gltf-universal-animation-library`). **Shippable.**
- **Cost & Pacing:** Lowest figure triangle count & material count (`5,963` tris, `2` mats, `620,220 B` GLB); whole-frame `123` calls / `42,683` tris (nearly identical draw calls to `Painted` `121`!); Walk `1.093 m/s`, Run `5.231 m/s`.
- **Repeatability Cost:** **High & fragile.** Every character requires multi-view clean Image-to-3D generation without occluded poses, manual bridge-geometry slicing, A/T-pose pre-alignment, manual height/zone material painting, and cleanup of baked clothing silhouettes (loose skirt hems or fused straps stay baked into the mesh).
- **What worked / What failed:** Zone de-lighting + `DATA_TRANSFER` rescued Sample B from monochrome gray (`v2`) to clear jacket/trousers/skin/beanie reads with `123` whole-frame draw calls. **Failed** on silhouette polish at `2.4×` zoom: Hunyuan baked thick loose hip/arm geometry onto the torso, causing the left sleeve to flare outward at ~30° while swinging.

---

### Example 4 — `sculpt-c`: Blender-Overhauled Quaternius CC0 `Casual2`

- **Source & Method:**
  - Base asset: `sample-c.glb` (`Casual2`, Quaternius CC0 `1.0 MB`, `CharacterArmature` `[100,100,100]` scale, stylized big-head body).
  - Blender overhaul:
    1. Scale `Casual2_Head` by `(0.78, 0.80, 0.78)` around neck pivot to shift stylized `1:6.0` head proportion toward adult `1:7.5` anatomy.
    2. Broaden upper torso/chest shoulders (`1.13× X`, `1.10× Y`), rust bomber over charcoal trousers (`Metallic = 0.0`), mount tactical gear + sculpted pistol on `Wrist.R`, preserve native `8` Quaternius clips (`Walk`, `Run`, `Idle_Neutral`, `Idle_Gun`, `Idle_Gun_Pointing`, `Gun_Shoot`, `HitRecieve`, `Death`).
- **Iteration Trail:**
  - `v1`: `THREE.Box3` read `41.575` on `Casual2`'s `100×`-scaled armature, shrinking the figure to ~4 cm miniature scale in-engine.
  - `v2`: Bypassed `Box3` with `fixedH = 1.839`, `z0 = -0.074`, grounded feet onto corridor floor, restored `190 px` adult scale. Wait — captured at `t=4.45` with `sp = 2.76` tick alias flipping into `Run` (`clip: "Run"`, airborne leap!).
  - `v3`: Fixed `smoothSp` EMA + `Run` threshold `walk + (run - walk) * 0.68`, adjusted `fixedH = 1.782, z0 = -0.048`. Result (`sculpt-c` PNG): grounded left boot flat on the white floor tile, adult proportions, clean Walk cycle (`ts = 1.643×`).
- **License / Provenance:** 100% CC0 (Quaternius). **Shippable.**
- **Cost & Pacing:** `6,280` tris, **`11` material slots** (`1,226,004 B` GLB) → highest whole-frame draw calls (`157` calls, `+36` calls vs Painted) due to unmerged Quaternius primitive material slots; Walk stance speed `1.344 m/s`, Run `3.080 m/s`.
- **Repeatability Cost:** **Medium-High.** Skeleton & clips reuse cleanly for humanoid silhouettes, but stylized Quaternius geometry needs manual vertex-resculpting, custom garment overlays per role, and texture/material baking if draw calls matter.
- **What worked / What failed:** Resculpting head scale (`0.78×`) and torso width noticeably upgraded Entry C's silhouette from cartoon to adult thriller proportions at phone size. However, blocky polygon hands, stylized low-detail skin, and `11` unmerged material slots (`157` draw calls) keep it clearly below `VALID` (`Ex 1/2`) and `UAL Dressed` (`Ex 5`) on GTA-6 visual polish.

---

### Example 5 — `ual-dressed`: Zero-Retarget Native CC0 UAL Mannequin Dressed in Blender

- **Source & Method:**
  - Base asset: CC0 `AnimationLibrary_Godot_Standard.gltf` native `Mannequin` mesh & `53`-bone `Rig` (`0` retarget error by construction).
  - Blender sculpting & dressing pass:
    1. Partition rest-pose vertices by bone + world height into `5` materials: rust bomber `#9B503B` (`(0.33, 0.09, 0.048)` linear), charcoal trousers, dark combat boots, warm skin, jawline stubble beard.
    2. Displace garment normals radially along vertices (`+1.4 cm` bomber/sleeves, `+0.7 cm` trousers, `+0.9 cm` boot cuffs) so clothing reads as layered mass rather than painted mannequin skin, decimate (`0.52` → `7,650` tris with props), attach `Beanie5`, `ChestRig5`, and `Pistol5`, pack `9` native UAL clips (`794,352 B` GLB).
- **Iteration Trail:**
  - `v1`: Initial `(0.26, 0.068, 0.038)` jacket luminance read slightly dark against the black chest rig in dim shadowed corridors.
  - `v2` / `v3`: Lifted `U5Jacket` linear RGB to `(0.33, 0.09, 0.048)`, verified grounded `z0 = -0.014, fixedH = 1.8168` (`1.059 m/s` Walk / `5.069 m/s` Run).
- **License / Provenance:** 100% CC0 1.0 (`J-Ponzo/gltf-universal-animation-library`). **Shippable.**
- **Cost & Pacing:** `7,650` tris, `7` mats (`776 KB` GLB), whole-frame `142` calls / `49,429` tris; Walk stance `1.059 m/s`, Run `5.069 m/s` (`ts = 2.259×` on `2.39 m/s` advance).
- **Repeatability Cost:** **Low-Medium.** Because `Mannequin` never needs retargeting, dressing Maya (slimmed waist/hair), Hale (long extruded coat skirt + glasses), or Teal-Scrubs (V-neck scrubs + surgical mask/cap) is deterministic Blender normal-extrusion + palette assignment; however, face anatomy stays stylized mannequin unless a sculpted face/head mesh is swapped in.
- **What worked / What failed:** Zero weight defects, crisp bold tactical silhouette, lightweight (`776 KB`), great legibility at `7–15 m` on phone! **Gap vs Ex 1:** lacks photoreal facial features, realistic cloth texture creases, and detailed clothing UV maps visible at closer ranges (`4–6 m`).

---

## 3. Combine-Round Recommendation

For full-cast production across **Plain-Clothes Gunman, Teal-Scrubs Gunman, Dr. Hale, Maya Vance, and seated/reclined Cole Mercer**, the strongest **single template pipeline** is:

1. **Primary Body & Material Architecture → Example 1 (`VALID` MIT photoreal base meshes + bone-weight UV reskinning + `cast3d-neon.js` 87-lamp shader + floor grounding):** Real human facial structure, clothing normal-map folds, low draw-call budget (`3` materials / `125` whole-frame calls vs `157` on `sculpt-c`), and zero toy/doll look at `4–10 m` close range.
2. **Animation Rig → CC0 `UAL` 53-bone library (`Ex 1`) — upgraded to Mixamo / clean mocap Walk (`Ex 2`) once an Adobe ID (or CC0 `1.6 m/s` mocap Walk) is attached:** `UAL` gives complete shippable coverage (`Walk`, `Jog`, `Pistol_Idle`, `Pistol_Aim`, `Shoot`, `Hit`, `Death`, `Crouch`), while `Ex 2` demonstrated that swapping *only* `Walk_Loop`/`Jog_Fwd_Loop` to true `~1.6–1.7 m/s` mocap reduces playback speed-up from `2.19×` to `1.42×` with visibly heavier natural weight transfer.
3. **Skip `ai3d-remesh` (`Ex 3`) and `sculpt-c` (`Ex 4`) for heroes/gunmen:** `Ex 3` cannot beat photoreal `VALID` on sleeve geometry or repeatability cost (use AI-3D only for rigid props like medical monitors/gurneys if needed), and `Ex 4`'s `11` unmerged materials cost `32` extra draw calls for lower anatomical fidelity. Keep `Ex 5` (`UAL Mannequin`) solely as our fast `DATA_TRANSFER` donor rig and rapid proxy.

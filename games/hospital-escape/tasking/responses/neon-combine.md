# NEON — Combine Round Report (`Take 6 · Combine`)

- **Date:** 2026-11-24
- **Combine folder:** `games/hospital-escape-hallway-neon/`
- **Combine entrypoint:** `?take=6` (`games/hospital-escape-hallway-neon/take6-combine.js` -> `window.BUILD_TAKE_6`, hosted in `games/hospital-escape-hallway-neon/index.html` + `hallway-rig.js`)
- **Live game tree untouched:** `games/hospital-escape/` has zero modifications.
- **Mixamo Shared Cast Pass status:** `games/hospital-escape/mixamo/` is not yet present on `main` (verified cleanly via directory check). `QUESTIONS-MIXAMO.md` answers were already delivered in [`neon-mixamo.md`](neon-mixamo.md); the shared cast pass (`Gunman/N2`, `Cole`, `Maya`) starts immediately once Moth pushes the decoded Mixamo set.

---

## 1. Visual Verdict & Design Anchor (`Cherie's T4 Dark Mood`)

The Combine build merges the strongest elements of our bake-off into one cohesive, real-asset hospital wing while locking directly onto Cherie's stated taste anchor (**Neon T4's dark moody shooter atmosphere**, zero showroom wash):

1. **Real Institutional Surfaces (No Yellow Honeycomb):** Killed the synthetic procedural honeycomb floor and 5-material T1 walls using 5 **AmbientCG CC0 1.0** PBR sets: fine true-to-scale mineral aggregate terrazzo (`Terrazzo018`, `0.55 m` UV repeat), two-tone institutional plaster + slate lower dado (`PaintedPlaster017`), `0.65 m` recessed T-bar acoustic ceiling grid (`OfficeCeiling001`), brushed architectural door/trim metal (`Metal032`), and warm oak doors & nurses' station countertop (`Wood049`).
2. **Real Decimated Hospital Props (`500–1,500` tris/prop):** Sourced **16 Poly Haven CC0 1.0** 3D assets decimated in Blender 5.2.3 to phone budgets plus 2 custom Blender hero hospital meshes (`GurneyCombine`, `IVStandCombine`), baked into a single unified 2K PBR texture atlas (`prop_atlas_col.jpg`, `prop_atlas_rgh.jpg`, `prop_atlas_nor.jpg`) and joined with `@gltf-transform` into **one single draw call**.
3. **Interior Cycles Metal GPU GI + Planar Wet Mirror + Anamorphic Post:** Baked a 256-sample + OIDN interior-only Cycles lightmap (`lightmap.jpg` 2K) capturing soft contact shadows under the wheelchair, wet floor sign, chairs, nurses' station, gurney, and IV stand, failing mint bay `#6`, and warm `2900K` room spill through ajar **Doors 414 & 416** — paired with a real-time planar `reflRT` wet-terrazzo mirror reflection (`floorMat.onBeforeCompile`) and 3-pass filmic ACES anamorphic bloom/vignette post-processing graded down in exposure to match T4's thriller contrast.

---

## 2. Exact Assets, URLs, Licenses & Triangle Budgets

Every external asset below is **CC0 1.0 Universal (Public Domain)** (`$0` spend, zero attribution traps).

### 2A. Surface & Trim PBR Sets (AmbientCG, 1K Maps)

| Asset Name | Role | Exact URL | License |
| --- | --- | --- | --- |
| `Terrazzo018` | Hospital corridor terrazzo floor (`+ floor_wet_rough.jpg` puddle mask) | https://ambientcg.com/a/Terrazzo018 | CC0 1.0 Universal (Public Domain) |
| `PaintedPlaster017` | Upper teal/sage corridor wall plaster + synthesized dark slate dado (`wall_dado_col.jpg`) | https://ambientcg.com/a/PaintedPlaster017 | CC0 1.0 Universal (Public Domain) |
| `OfficeCeiling001` | Institutional `0.65 m` T-bar acoustic ceiling tiles | https://ambientcg.com/a/OfficeCeiling001 | CC0 1.0 Universal (Public Domain) |
| `Metal032` | Door jambs, crash rails, baseboards, bulkheads, gurney & IV chrome | https://ambientcg.com/a/Metal032 | CC0 1.0 Universal (Public Domain) |
| `Wood049` | Patient doors (413/414/415/416/418) & Nurses' Station countertop | https://ambientcg.com/a/Wood049 | CC0 1.0 Universal (Public Domain) |

### 2B. 3D Hospital Props (Poly Haven CC0 + Blender Hero Props, Decimated & Atlased)

| Asset / Mesh ID | Role in WEST WING B | Exact URL | License | Source Tris | Delivered Tris | Scale |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `wheelchair_01` | Parked corridor wheelchair (`x=10.92, z=-33.20`) | https://polyhaven.com/a/wheelchair_01 | CC0 1.0 Universal (Public Domain) | 40,252 | **1,380** | 0.852 |
| `tool_cart` | Crimson medical crash cart w/ defibrillator top (`x=12.20, z=-43.00`) | https://polyhaven.com/a/tool_cart | CC0 1.0 Universal (Public Domain) | 29,394 | **1,350** | 0.892 |
| `WetFloorSign_01` | Caution wet floor A-frame (`x=12.78, z=-25.85`) | https://polyhaven.com/a/WetFloorSign_01 | CC0 1.0 Universal (Public Domain) | 228 | **228** | 0.985 |
| `SchoolChair_01` (×2) | Waiting chairs against right wall (`z=-23.25 / -24.02`) | https://polyhaven.com/a/SchoolChair_01 | CC0 1.0 Universal (Public Domain) | 5,072 | **879** | 0.795 |
| `korean_fire_extinguisher_01` | Recessed wall fire extinguisher (`x=10.48, z=-21.50`) | https://polyhaven.com/a/korean_fire_extinguisher_01 | CC0 1.0 Universal (Public Domain) | 9,913 | **950** | 0.849 |
| `fire_alarm` | Emergency pull box (`x=10.32, z=-18.10`) | https://polyhaven.com/a/fire_alarm | CC0 1.0 Universal (Public Domain) | 2,705 | **550** | 1.114 |
| `security_camera_01` | Corridor CCTV camera (`x=13.52, z=-18.80, y=2.65`) | https://polyhaven.com/a/security_camera_01 | CC0 1.0 Universal (Public Domain) | 13,571 | **819** | 0.769 |
| `wall_clock` | Corridor wall clock (`x=10.33, z=-25.95, y=2.18`) | https://polyhaven.com/a/wall_clock | CC0 1.0 Universal (Public Domain) | 3,658 | **650** | 1.123 |
| `metal_trash_can` | Nurses' Station waste bin (`x=10.65, z=-29.25`) | https://polyhaven.com/a/metal_trash_can | CC0 1.0 Universal (Public Domain) | 6,428 | **920** | 0.640 |
| `clipboard` (×2) | Nurses' Station chart clipboards | https://polyhaven.com/a/clipboard | CC0 1.0 Universal (Public Domain) | 6,176 | **550** | 1.010 |
| `office_notepads` | Nurses' Station chart stack (`yellow_pad` + `a4_stack`) | https://polyhaven.com/a/office_notepads | CC0 1.0 Universal (Public Domain) | 24 | **24** | 0.465 |
| `medical_box` | Nurses' Station trauma supply kit | https://polyhaven.com/a/medical_box | CC0 1.0 Universal (Public Domain) | 3,718 | **720** | 0.685 |
| `medical_tape` | Nurses' Station surgical tape roll | https://polyhaven.com/a/medical_tape | CC0 1.0 Universal (Public Domain) | 1,408 | **499** | 2.208 |
| `utility_box_01` | Corridor electrical panel (`x=10.44, z=-39.20`) | https://polyhaven.com/a/utility_box_01 | CC0 1.0 Universal (Public Domain) | 4,404 | **780** | 0.607 |
| `modular_airduct_rectangular_01` (×4) | Flush ceiling HVAC return louver grilles (`vent_01` submesh) | https://polyhaven.com/a/modular_airduct_rectangular_01 | CC0 1.0 Universal (Public Domain) | 390 | **390** | 1.051 |
| `mounted_fluorescent_lights` (×9) | Recessed overhead troffer tube housings | https://polyhaven.com/a/mounted_fluorescent_lights | CC0 1.0 Universal (Public Domain) | 17,820 | **720** | 1.294 |
| `GurneyCombine` | Hero hospital gurney (`x=13.10, z=-38.60`) | Built in Blender using AmbientCG `Metal032` & `PaintedPlaster017` | CC0 1.0 (AmbientCG maps + repo script) | 588 | **588** | 1.000 |
| `IVStandCombine` | Hero 5-caster IV pole w/ twin saline bags (`x=13.28, z=-37.25`) | Built in Blender using AmbientCG `Metal032` | CC0 1.0 (AmbientCG maps + repo script) | 628 | **628** | 1.000 |

All props sit strictly within the target **500–1,500 tris/prop** phone envelope (simple signage/low-poly primitives like `WetFloorSign_01`, `office_notepads`, `modular_airduct_rectangular_01_vent_01` stay below 500 un-bloated).

---

## 3. Architecture, `gltf-transform` Pipeline & CDN Flag Check

- **Pinned runtime:** `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` (no private Three.js copies).
- **Non-core additions (explicitly flagged per rule):**
  1. `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js` (loaded selectively on `?take=2|4|6`).
  2. Offscreen `WebGLRenderTarget` allocations in `take6-combine.js`: `reflRT` (`390×844` planar wet-floor mirror pass) + 3 HDR post-processing targets (`sceneRT`, `bloomRT1` 0.5×, `bloomRT2` 0.25×).
  3. Built unified signage/ECG monitors/EXIT/room-plate `CanvasTexture` mesh (`1` draw call) and merged additive volumetric beam cones (`1` draw call).
- **KTX2Loader factual finding in `three@0.128.0`:** Direct HTTP check against `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/KTX2Loader.js` returned **404** (UMD `KTX2Loader` does not ship in r128 examples/js). Rather than mixing unpinned CDN versions or breaking core-CDN parity, we ran **`@gltf-transform/functions` v4.5.1** (`flatten()`, `weld({ tolerance: 0.0001 })`, `dedup()`, `join()`, `prune({ keepAttributes: true })`) with external compressed JPEG textures (`sRGB` / `Linear`), keeping vertex + texture memory compact:
  - `assets/combine/combine-shell.glb`: `906,260 B -> 65,916 B` (`6` primitives: `ShellCeil`, `ShellFloor`, `ShellTrim`, `ShellTroffers`, `ShellWalls`, `ShellWood`, preserving both `TEXCOORD_0` PBR UVs and `TEXCOORD_1` Cycles GI lightmap UVs).
  - `assets/combine/combine-props.glb`: `1,894,372 B` (**`1` single merged primitive** carrying all 29 placed hospital prop instances cleanly with `TEXCOORD_0` atlas UVs + `TEXCOORD_1` lightmap UVs).
  - Combined `assets/combine/` root asset total (`combine-props.glb` + `combine-shell.glb` + `lightmap.jpg` 279,986 B + `prop_atlas_{col,rgh,nor}.jpg` 921,117 B) = **`3,161,391 B` (`3.01 MB`)**, plus `assets/combine/pbr/` (1K JPEG surface sets).

---

## 4. Actual On-Page `renderer.info` Verification (`?clean=1`)

Measured in headless Google Chrome WebGL on `?take=6&vp=vp1..vp3&clean=1` against R3 Bake-Off baselines (`/tmp/neon_hallway/combine_r3/stats.json` vs `/tmp/neon_hallway/r3/stats.json`):

| Viewpoint | Build / Take | Draw Calls | Triangles | Textures | Programs | JS Heap | Console Errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **VP1 Entrance** | Take 4 · Kit-Bash | 272 | 5,042 | 25 | 8 | 12.36 MB | 0 |
| **VP1 Entrance** | Take 5 · Cinema | 319 | 3,804 | 26 | 11 | 17.78 MB | 0 |
| **VP1 Entrance** | **Take 6 · Combine** | **21** | **43,684** | **25** | **8** | **9.61 MB** | **0** |
| **VP2 Nurses' Station** | Take 4 · Kit-Bash | 238 | 4,408 | 25 | 8 | 11.86 MB | 0 |
| **VP2 Nurses' Station** | Take 5 · Cinema | 287 | 3,434 | 26 | 11 | 13.94 MB | 0 |
| **VP2 Nurses' Station** | **Take 6 · Combine** | **21** | **43,684** | **25** | **8** | **8.64 MB** | **0** |
| **VP3 Far Lookback** | Take 4 · Kit-Bash | 253 | 4,348 | 26 | 8 | 12.32 MB | 0 |
| **VP3 Far Lookback** | Take 5 · Cinema | 311 | 3,726 | 27 | 11 | 14.25 MB | 0 |
| **VP3 Far Lookback** | **Take 6 · Combine** | **21** | **43,684** | **25** | **8** | **8.96 MB** | **0** |

- **Draw-call budget hit:** **`21` calls per full frame** (including planar `reflRT` mirror render + main HDR render + 3-pass anamorphic post), beating the `~45–65` Combine target by **>2×** and cutting draw calls by **12×–15×** vs T4 (`238–272`) and T5 (`287–319`) while carrying **8.6×–12.7×** higher real prop geometry (`43,684` tris).

---

## 5. Multi-Round Visual Iteration Log (`R1 -> R2 -> R3`, 2026-11-24)

1. **R1 (`combine_r1`) — Initial GLB Fusion + Cycles GI + Mirror Post:**
   - First pass exporting merged `combine-shell.glb` + `combine-props.glb`, baking 128-sample Cycles GI lightmap, and running planar mirror + filmic post at `21` calls.
   - **Visual defects caught:**
     1. Missing `bm.normal_update()` in `finish_shell_bm` left freshly added faces with zeroed normals, collapsing `ShellFloor`/`ShellCeil` UVs into horizontal stripes.
     2. External AmbientCG maps missed `flipY: false`, inverting wall `TEXCOORD_0` so the dark slate dado appeared at the ceiling instead of `0..1.05 m`.
     3. Doors `414`/`416` swung into the corridor instead of into their recessed patient rooms; `wall_clock` sat half-eclipsed behind the `ELEVATORS ->` beam; `tool_cart` (Crash Cart) read as dark charcoal instead of hospital crimson.
     4. Nurses' Station upper plaster wall read too bright/washy.
2. **R2 (`combine_r2`) — Shell UV/Normal Repair + 256-Sample OIDN GI:**
   - Added `bm.normal_update()`, enabled `flipY: false` across all glTF-bound textures, reversed door hinges (`414`/`416`) inward into warm-lit rooms, and upgraded lightmap bake to `256` samples + OIDN (`21` calls).
   - **Visual & bounds audit catches:**
     1. Blender `gltf` importer leaves `rotation_mode = 'QUATERNION'` on imported Poly Haven meshes, causing `ob.rotation_euler = (...)` in `spawn_prop()` to be silently ignored across all 16 Poly Haven props! That explained why `air_vent` stood vertically above `y=2.90`, `mounted_fluorescent_lights_g` produced sideways ceiling bars, and `SchoolChair_01`/`tool_cart`/`wheelchair` kept `0 rad` orientation.
     2. Only submesh `mounted_fluorescent_lights_g` had been imported (a single offset bracket bar); needed the full fixture housing.
     3. `Terrazzo018` (`tile=1.4m`) rendered oversized pebbles and `take6-combine.js` grading/ambient still read brighter than T4's dark moody shooter tone.
3. **R3 (`combine_r3` — Final) — Fixed Prop `XYZ` Rotations, True-Scale Surfaces & T4 Dark Mood:**
   - Forced `rotation_mode = 'XYZ'` across all imported and spawned props; kept full `mounted_fluorescent_lights` housing (`0.56×1.18m`); seated all `air_vent` grilles flush at `y=2.88m`; placed `wall_clock` cleanly at `(10.33, 25.95, 2.18)`; turned `SchoolChair_01`s (`-X`) and crimson `tool_cart` cleanly down corridor; verified strict bounds `X=[10.303, 13.694], Y=[-0.006, 2.914]` (zero wall/ceiling clipping).
   - Tightened terrazzo repeat to `0.55 m` and acoustic T-bar grid to `0.65 m`; opened ajar Door `414`/`416` warm amber room spill; lowered world strength (`0.14`), shell diffuse tint, ambient (`0.05`), and final exposure (`0.96`) with deeper shooter vignette (`0.52`), eliminating cyan wash and matching T4's dark moody tone (`21` calls, `0` console errors).

---

## 6. Verification Evidence

- **R3 Stills (`390×844` @2x, `?clean=1`, zero added text):**
  - [t6-vp1.png](neon-combine-evidence/t6-vp1.png)
  - [t6-vp2.png](neon-combine-evidence/t6-vp2.png)
  - [t6-vp3.png](neon-combine-evidence/t6-vp3.png)
- **Centerline Dolly Video (`390×844`, 24 fps, 9.0 s, H.264 `yuv420p`, `?clean=1`, zero added text):**
  - [combine-dolly.mp4](neon-combine-evidence/combine-dolly.mp4) (`ffprobe` verified `390x844`, `24/1 fps`, `9.000000s`, `h264`, `yuv420p`; extracted frames at `0.2s`, `4.5s`, `8.8s` visually checked).
- **Comparison Plates:**
  - [neon-combine-iterations.png](neon-combine-evidence/neon-combine-iterations.png) (`R1 -> R2 -> R3` progression across `VP1 / VP2 / VP3`)
  - [neon-combine-vs-bakeoff.png](neon-combine-evidence/neon-combine-vs-bakeoff.png) (`T4 Kit-Bash` vs `T5 Cinema` vs `T6 Combine` across `VP1 / VP2 / VP3` with measured call counts)

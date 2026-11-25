# Neon: Full-Game T4 Performance Optimization (`tasking/T4-PERF.md`)

> **Owner ruling honored:** Full T4 remains the default shipped look on every zone and beat of `games/hospital-escape/`. No visual features were trimmed: every optimization is algorithmic, shader-algebraic, GPU-lookup, or off-screen culling overhead removal, merged cleanly onto Opus's `INTEGRATE` bundle (`7c476bf`) while preserving Opus's constant-light-set transition-hitch fix and `HECAST.warmed` prewarm. All debug URL switches (`?t4=0`, `?t4env=0`, `?t4k=4`, `?t4shadow=0`, `?t4maps=0`, `?post=0`) remain intact and verified.

---

## Summary Results (Chrome Headless SwiftShader CPU Renderer, `390x844` DPR 2, Base `7c476bf`)

- **Overall mean speedup across all 10 game beats:** **`197.52 ms -> 113.65 ms` (`-42.5%` / `1.74x` faster)**, cutting `p90` mean latency from `199.1 ms -> 112.9 ms` (`-43.3%`), vs `87.94 ms` for the legacy non-T4 look (`?t4=0`).
- **Per-beat range:** `-31.9%` (`gauntlet_waiting_room`) to **`-52.2%`** (`chase_harbor_ave`, matching `?t4=0`'s `87.3 ms` at **`85.9 ms`**), **`-45.3%`** in `bed_hall_push` (`221.5 -> 121.1 ms`), **`-43.0%`** in Room 412 `visit_room` (`173.2 -> 98.7 ms`), and **`-47.3%`** in `finale_line9_crossing` (`173.2 -> 91.2 ms`, beating `?t4=0`'s `92.3 ms`).
- **Visual parity (`check_t4_parity.py --min-psnr 44.0`):** **15 / 15 PASS** across all matched T4 hallway viewpoints (`vp1`–`vp3`), all gameplay beats (`visit` through `train`), and damaged `patient-eyes` DOF/blur (**`51.18 – 58.44 dB` PSNR**, `mean_abs <= 0.285 / 255`).
- **Constant light set & transition stability:** `renderer.info.programs.length` remains strictly constant (`28 -> 28`) across `visit_room -> bed_hall_push` (`cutDt_ms = 183 ms <= medianFrame_ms = 266.7 ms`, `0` shader recompiles).
- **Guardrails & debug switches (all run after final edit):** `validate-data.mjs` (`206 objects checked, 0 errors, PASS`), `24/24` engine tests (`pageErrors=0`), `FAIRNESS AUDIT: PASS` (`33` runs, `362` damage, `0` violations, `0` pageErrors), cutscene-inclusive `CAMERA AUDIT: PASS` (`A=0, B=0, C=0, D=0, E=0`, full playthrough `ended: true` in `227.6 s`, `0` page errors), and all **6 debug URL switches** (`?t4=0`, `?t4env=0`, `?t4k=4`, `?t4shadow=0`, `?t4maps=0`, `?post=0`) verified with `errs=0`.

---

## 1. Benchmark Method & Reproduce Commands (SHOW YOUR WORK)

- **Harness:** [`tools/neon-t4-perf.mjs`](../../tools/neon-t4-perf.mjs) via Chrome DevTools Protocol (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, `--headless=new --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, `Emulation.setDeviceMetricsOverride` `390x844` DPR 2 mobile).
- **Per-beat timing protocol (`PERF_BEATS`):** Fresh navigation per beat (`?seed=7`), wait for `window.__game && window.__painted !== undefined && (!window.HECAST || (window.__castReady && HECAST.warmed))` plus `800 ms` settle, jump to beat/segment, fast-forward with autopilot (`__game.ff(secs, true)`), then run `45` frames (`5` warmup + `40` timed) with `gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)` GPU pipeline sync per frame, reporting mean (`meanMs`), 90th percentile (`p90Ms`), WebGL draw calls, triangles, programs, and console/exception errors. Executed sequentially with zero concurrent CPU load.
- **Deterministic stills parity protocol:** Stills pre-initialize `g.cameraCollide(c, keep)` (`camWorld`) once before the `STILLS_VIEWS` loop (eliminating lazy `buildCamWorld()` `new THREE.Mesh()` UUID RNG consumption on the first non-cutscene view `bed_push`) and re-seed `Math.random` deterministically per view before stepping and rendering `BEFORE` (`7c476bf`) and `AFTER`.
- **Outputs stored in [`responses/neon-t4-perf-shots/`](neon-t4-perf-shots/):**
  - `before-perf.json` (unmodified `7c476bf`), `prev-perf.json` (`7c476bf` with `?t4=0`), `after-perf.json` (final T4-PERF on `7c476bf`)
  - `before-stills.json`, `after-stills.json`, `parity-report.json`
  - 15 full-resolution side-by-side `SBS-parity-<view>.png` sheets (`BEFORE | AFTER | ABS DIFF x8`)
- **Commands executed:**
  ```bash
  # Baseline on unmodified 7c476bf:
  node games/hospital-escape/tools/neon-t4-perf.mjs --phase=before --prev=1
  # Final optimized build (sequential):
  node games/hospital-escape/tools/neon-t4-perf.mjs --phase=after
  /opt/homebrew/bin/uv run --with pillow --with numpy python3 \
    games/hospital-escape/tools/check_t4_parity.py \
    --dir games/hospital-escape/tasking/responses/neon-t4-perf-shots --min-psnr 44.0
  # Gates:
  node games/hospital-escape/engine/validate-data.mjs games/hospital-escape/game/level1.js
  node games/hospital-escape/tools/neon-verify-guardrails.mjs
  ```

---

## 2. Per-Beat Frame Cost: BEFORE (`7c476bf`) vs AFTER vs `?t4=0`

Measurements verbatim from `neon-t4-perf-shots/before-perf.json`, `after-perf.json`, and `prev-perf.json` (`0` errors on every beat):

| Beat (`segment`) | BEFORE mean (ms) | BEFORE p90 (ms) | AFTER mean (ms) | AFTER p90 (ms) | Speedup | `?t4=0` mean (ms) | Calls (`B -> A`) | Tris (`B -> A`) | Progs (`B -> A`) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `visit@2` (`visit_room`) | 173.2 | 182.8 | **98.7** | 102.7 | **-43.0%** | 79.4 | `112 -> 111` | `129,068 -> 129,066` | `27 -> 28` |
| `bed_push@4` (`bed_hall_push`) | 221.5 | 216.1 | **121.1** | 117.8 | **-45.3%** | 85.2 | `257 -> 139` | `190,882 -> 41,040` | `27 -> 28` |
| `transfer:1@3` (`transfer_chair_corridor`) | 189.8 | 202.9 | **109.7** | 115.3 | **-42.2%** | 80.0 | `133 -> 131` | `114,404 -> 114,400` | `27 -> 28` |
| `elevator:0@2` (`elevator_ride`) | 229.2 | 224.1 | **133.7** | 122.9 | **-41.7%** | 95.8 | `183 -> 177` | `130,884 -> 116,412` | `27 -> 28` |
| `gauntlet@3` (`gauntlet_halls`) | 206.3 | 198.5 | **127.1** | 118.3 | **-38.4%** | 91.5 | `211 -> 185` | `206,690 -> 192,170` | `27 -> 28` |
| `gauntlet:1@4` (`gauntlet_cafeteria`) | 213.4 | 209.9 | **110.8** | 104.7 | **-48.1%** | 90.8 | `192 -> 168` | `190,624 -> 190,186` | `27 -> 28` |
| `gauntlet:3@3` (`gauntlet_waiting_room`) | 177.2 | 180.4 | **120.7** | 123.0 | **-31.9%** | 83.4 | `273 -> 249` | `284,832 -> 284,408` | `27 -> 28` |
| `entrance@2` (`entrance_holdout`) | 211.8 | 222.8 | **137.6** | 140.2 | **-35.0%** | 93.7 | `291 -> 266` | `304,940 -> 304,524` | `27 -> 28` |
| `chase@4` (`chase_harbor_ave`) | 179.6 | 171.9 | **85.9** | 90.0 | **-52.2%** | 87.3 | `548 -> 480` | `77,438 -> 76,060` | `27 -> 28` |
| `train_finale@3` (`finale_line9_crossing`) | 173.2 | 181.3 | **91.2** | 94.1 | **-47.3%** | 92.3 | `733 -> 667` | `210,034 -> 208,668` | `27 -> 28` |
| **10-Beat Average** | **197.52** | **199.1** | **113.65** | **112.9** | **-42.5%** | **87.94** | `293.3 -> 257.3` | — | `27 -> 28` |

---

## 3. What Was Changed & How Parity + Transition Safety Are Preserved (Rank-Ordered)

### Rank 1 — Native 8-Mip `CubeTexture` IBL Replacing `PMREMGenerator` CubeUV Decoding ([`game/t4look.js`](../../game/t4look.js))
- **Bottleneck:** Setting `scene.environment = pmrem` forced Three r128's `MeshStandardMaterial` fragment shader on every lit pixel to evaluate `textureCubeUV()` (octahedral 2D atlas projection + multi-tap manual `RGBEToLinear` `exp2()` decoding for both diffuse irradiance and specular radiance).
- **Fix (`bakeFastIBL`, `applyFastIBL`, `bindDynamicIBL`):**
  - Build `T.pmrem = corridorPMREM(r)` once at init, then pre-bake an **8-mip (`128, 64, 32, 16, 8, 4, 2, 1`) native `THREE.CubeTexture`** (`uT4EnvCube`) using r128's own `<cube_uv_reflection_fragment>` sampled at roughness `Math.min(1.0, l / 4.0)`.
  - Store `sqrt(clamp(c, 0.0, 1.0))` in `RGBA8` (`UnsignedByteType` with hardware `LinearMipmapLinearFilter`) and square (`t4DRaw * t4DRaw`) in shader — preserving dark-shadow dynamic range without WebGL2 float-filtering edge cases and cutting IBL sampling to **2 hardware cubemap fetches** (`textureCubeLodEXT` / `textureCube`).
  - Leave `scene.environment` unset and inject `IBL_PARS` + `IBL_INJECT` at `#include <lights_fragment_maps>` for all T4 materials plus runtime scene objects (`amb`, `bed`, `chair`, cars, train, covers) tracked via `bindDynamicIBL(ctxG.scene)`.

### Rank 2 — Healthy-State T4 Post Composite Fast-Path & `?post=0` Warm-Up Fix ([`game/post.js`](../../game/post.js))
- **Fast-path (`tap`, `main`):** `tap(uv, ca)` early-returns `texture2D(tC, uv).rgb` when `ca < 1e-5` instead of fetching `tC` three times; when `t4 > 0.5`, skip the initial `tD` depth fetch and CoC computation completely unless wounded/drifting (`R >= 0.001`), keeping damage DOF/blur intact (`damaged` `51.90 dB`).
- **`?post=0` + `C.warm()` compatibility:** Added `toneMapped: false` to `comp` and renamed `RRTAndODTFit` -> `t4RRTAndODTFit` inside `acesT4`. Under `?post=0`, `t4look.js` enables `renderer.toneMapping = THREE.ACESFilmicToneMapping`, which previously collided with `RRTAndODTFit` when `cast3d.js` `C.warm()` invoked `__post.render(0)` during load warm-up.

### Rank 3 — Area-Light Shader Pruning, Outdoor Skip & Zero-Alloc `T.step` ([`game/t4look.js`](../../game/t4look.js))
- **Shader (`RECT`, `INJECT`):** Added `uniform int uPanCount` (`0` outdoors so the loop exits immediately while keeping the upward ceiling bounce `if(Nw.y < -0.5)` intact). Premultiplied `uCol[i]` by `dim` and the `0.816` (`0.96 * 0.85`) scalar on CPU, hoisted `doSpec = Rw.y > 0.04`, `invRwY`, `invDenom`, and `(1.0 - roughA) * 0.62` out of the `for(int i = 0; i < K; i++)` loop, and guarded `if(eArg < 10.0)` before `exp()`.
- **CPU (`T.step`):** Replaced per-frame `.filter().map().sort()` and temporary `THREE.Vector3` allocations with insertion into preallocated `_topP` / `_topD` buffers and scratch vectors.

### Rank 4 — Off-Screen Outdoor Chunk Culling, Warm-Up Safety, Constant Light Set & Material Sharing ([`game/t4look.js`](../../game/t4look.js), [`game/world.js`](../../game/world.js))
- **Outdoor chunk culling (`world.js`, `t4look.js`):** Tagged `outdoor` and `street` zone groups as `userData.outdoorChunk = true` (`world.js`). After `C.warm()` finishes (`var warmed = !window.HECAST || !!HECAST.warmed;`), `T.step` hides `outdoorChunks` whenever `indoor && (_c.y > -3.0 || (_c.y < -5.0 && _c.z > -128.0))` (floor 4B, elevator shaft, ground corridors A/B, cafeteria — while remaining visible during `ward`, `waiting`, and `lobby` glass views and during initial `C.warm()` precompilation). Cuts `bed_push@4` draw calls `257 -> 139` and triangles `190,882 -> 41,040`. Interior hospital zones stay visible at all times so `camera-audit` Test E and fairness LOS raycasts remain identical.
- **Preserved Opus's constant-light-set transition fix (`t4look.js`):** Light counts never change after init — `T.wwbLights` (using cached `T._wwbList`) and `roam` toggle via `T.base` `.intensity` only (never `.visible` or `.castShadow`), preventing mid-run shader recompiles (`progs = 28 -> 28` across cuts).
- **Safe culling & sharing:** `T.kitbash.visible = !warmed || Math.abs(_c.y - 1.5) < 4.5`; `t4-ceil.receiveShadow = false`; street buildings scale box geometry UVs while sharing 4 `facades` materials (`world.js`); `props.glb` clones share prototype materials except `WetFloorCone` (`t4look.js`). `game/art.js` was intentionally kept untouched so furniture retains per-object frustum culling.

---

## 4. Stop Condition Assessment (Per `NEON-NEXT.md`)

Stopped here because every remaining optimization candidate either **alters the T4 image** or saves **`< ~2%` per beat**:
- Reducing shadow map resolution (`1024 -> 512`) or turning off `wwbSpots`/`roam` shadows (`?t4shadow=0`): alters character/furniture shadow crispness.
- Dropping normal/roughness maps (`?t4maps=0`): only `~1%` measured saving while removing surface relief/spec variation.
- Reducing area-light panel count (`?t4k=4` vs `8`): visibly truncates distant corridor ceiling falloff and floor reflections.
- Merging foreground/midground props across room bounds (`art.js`): defeats Three.js frustum culling on dense scenes (`waiting`, `lobby`) and changes runtime UUID/PRNG sequences.

---

## 5. Visual Parity Evidence (`check_t4_parity.py --min-psnr 44.0`)

All **15 / 15** views at `390x844` DPR 2 pass (`51.18 – 58.44 dB` PSNR), verbatim from `neon-t4-perf-shots/parity-report.json`:

| View | PSNR (dB) | Mean Abs (/255) | Max Abs (/255) | Side-by-Side Evidence (`BEFORE \| AFTER \| 8x DIFF`) |
|---|---:|---:|---:|---|
| `bed_push` | **58.44** | 0.093 | 13 | [SBS-parity-bed_push.png](neon-t4-perf-shots/SBS-parity-bed_push.png) |
| `train` | **57.72** | 0.108 | 34 | [SBS-parity-train.png](neon-t4-perf-shots/SBS-parity-train.png) |
| `ward` | **57.20** | 0.123 | 2 | [SBS-parity-ward.png](neon-t4-perf-shots/SBS-parity-ward.png) |
| `transfer` | **57.10** | 0.127 | 2 | [SBS-parity-transfer.png](neon-t4-perf-shots/SBS-parity-transfer.png) |
| `chase` | **56.67** | 0.109 | 95 | [SBS-parity-chase.png](neon-t4-perf-shots/SBS-parity-chase.png) |
| `vp3` (T4 WWB south) | **56.32** | 0.148 | 9 | [SBS-parity-vp3.png](neon-t4-perf-shots/SBS-parity-vp3.png) |
| `cafeteria` | **56.29** | 0.152 | 2 | [SBS-parity-cafeteria.png](neon-t4-perf-shots/SBS-parity-cafeteria.png) |
| `elevator` | **56.09** | 0.115 | 24 | [SBS-parity-elevator.png](neon-t4-perf-shots/SBS-parity-elevator.png) |
| `visit` | **55.51** | 0.182 | 5 | [SBS-parity-visit.png](neon-t4-perf-shots/SBS-parity-visit.png) |
| `lobby` | **55.41** | 0.146 | 4 | [SBS-parity-lobby.png](neon-t4-perf-shots/SBS-parity-lobby.png) |
| `halls` | **53.13** | 0.210 | 5 | [SBS-parity-halls.png](neon-t4-perf-shots/SBS-parity-halls.png) |
| `vp1` (T4 WWB north) | **52.70** | 0.235 | 4 | [SBS-parity-vp1.png](neon-t4-perf-shots/SBS-parity-vp1.png) |
| `vp2` (T4 WWB station) | **52.62** | 0.224 | 5 | [SBS-parity-vp2.png](neon-t4-perf-shots/SBS-parity-vp2.png) |
| `damaged` (`hurt=0.75`, `drift=0.5`) | **51.90** | 0.222 | 34 | [SBS-parity-damaged.png](neon-t4-perf-shots/SBS-parity-damaged.png) |
| `waiting` | **51.18** | 0.285 | 5 | [SBS-parity-waiting.png](neon-t4-perf-shots/SBS-parity-waiting.png) |

---

## 6. Final Verification Gate, Transition Hitch & Debug Switches (Post Final Edit)

| Check | Result |
|---|---|
| `engine/validate-data.mjs game/level1.js` | **PASS** — `9 beats, 16 segments, 16 paths, 21 waves, 7 pursuer waves, 33 lines; 206 objects checked, 0 errors` |
| Engine test suite (`tools/neon-verify-guardrails.mjs`) | **24 passed, 0 failed of 24**, `pageErrors=0` |
| Fairness audit (`seeds 7, 3, 11`, full runs + beat soaks) | **PASS** — `runs=33, damage=362, violations=0, visualOnly=1177, damagingShots=366, minVisT=1.6, minPx=66, pageErrors=0` |
| Camera audit & full playthrough (`seed=7`, incl. cutscenes) | **PASS** — `ended: true, lost: false, time: 227.6 s, samples: 2280, onFootSamples: 300`; fails `A=0, B=0, C=0, D=0, E=0, page errors=0`; `warn F=1` (`steal_staging`, baseline) |
| Transition-hitch check (`visit_room -> bed_hall_push`, post `post.js` edit) | **PASS** — `frames=286, medianFrame_ms=266.7, cutDt_ms=183, progsAtCut=28, progsEnd=28, errs=0` (`0` shader recompiles; mid-beat wave-1 bump at `atMsAfterCut=1367 ms` matches `opus-integrate.md`) |
| Debug switches (`?t4=0`, `?t4env=0`, `?t4k=4`, `?t4shadow=0`, `?t4maps=0`, `?post=0`) | **PASS** — all 6 load `ready=true`, step `bed_push` + `chase`, render with **`errs=0`** (`?post=0`: `t4on=true, c1=196, c2=82`) |

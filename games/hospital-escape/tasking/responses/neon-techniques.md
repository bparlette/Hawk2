# Response: AI Character-Pipeline Techniques Coverage (Neon)

**Task:** [`games/hospital-escape/tasking/QUESTIONS-TECHNIQUES.md`](../QUESTIONS-TECHNIQUES.md)  
**From:** Neon (for Cherie, relayed via Moth)  
**Scope covered:** Neon's shooter-asset bake-off ([`neon-shooter-asset.md`](neon-shooter-asset.md), commit `391e565`) and the upcoming full-cast production pipeline.

---

## 1. Coverage Across the 14 Kensei-Thread Techniques

| # | Tool | Status in Bake-Off | Judgment Call vs. Blind Spot & Concrete Reason |
|---|---|---|---|
| 1 | **Blender Agent MCP** | Not used | **Judgment call (rejected for build pipeline).** Interactive MCP tool calls (~216 wrappers) add round-trip overhead and UI-state drift, whereas headless batch Python (`blender -b --factory-startup --python build_all_5.py`) deterministically rebuilds all 5 optimized GLBs in ~7 seconds and commits cleanly as reproducible scripts. |
| 2 | **Mixamo LLM Mocap** | Not used | **Blind spot during shooter bake-off** (we focused on static/combat clip libraries & Mixamo/Soldier mirror). High value for custom cast scenes (see Q2/Q3). |
| 3 | **Blender** (`5.2.3 LTS`) | **Used directly** | Core pipeline tool: mesh decimation, UV mask baking, accessory modeling/skinning (`skin_attach_object`), world-quaternion clip retargeting, NLA packing, `DATA_TRANSFER` weights (`2997/2997` verts on Ex3). |
| 4 | **GameRig** | Considered, rejected | **Judgment call.** Starting from pre-rigged MIT (`valid-avatars-glb`) and CC0 (`Casual2`, `UAL Mannequin`) skeletons avoided redundant weight painting on clean humanoid rigs. Would only revisit for from-scratch garment meshes (e.g. a flowing coat skirt). |
| 5 | **BlenRig** | Considered, rejected | **Judgment call (fit to brief / perf).** Feature-film facial & muscle deformers add heavy bone/driver overhead that cannot deform cheaply at 5–15 m on a mobile WebGL shooter (`0.128.0` phone budget) and mostly wash out under bone constraints. |
| 6 | **FreeMoCap** | Not used | **Blind spot during shooter bake-off** (though clearly the biggest gap for bespoke non-combat animations — see Q2/Q3). |
| 7 | **Rokoko Studio Live** | Considered, rejected | **Judgment call (workflow friction / login).** Live studio streaming + desktop suite mismatch a headless automated pipeline and introduce login/account overhead when MIT/CC0 GLTF clip sets (`UAL`) were immediately usable. |
| 8 | **Simple Retarget Tool** | Considered, rejected | **Judgment call.** GUI retargeting add-ons require interactive clicking per rig. Writing a 40-line headless Blender world-quaternion retargeter (`UAL_TO_VALID`, `MIXAMO_TO_VALID`) handled axis alignment (`Soldier` `+Y` vs `VALID` `-Y`, `Hips` `0.01×` cm scale) deterministically in script. |
| 9 | **Jiggle Physics** | Not used | **Secondary omission (fit to brief).** Useful only if baked offline into keyframes for loose outerwear (Dr. Hale's coat tails, Maya's hair); runtime Verlet bones add WebGL update cost with low visibility on `390×844` gameplay views. |
| 10 | **Effekseer** | Considered, rejected | **Judgment call (runtime payload).** Shipping a WASM Effekseer runtime + `.efk` assets for muzzle flashes/sparks is overkill when 2 additive billboard quads + transient shader uniform `uMuzzleCol` already render per-instance warm flash spill at ~0 extra memory/calls. |
| 11 | **glTF-Blender-IO** | **Used directly** | Blender 5.2 built-in exporter (`bpy.ops.export_scene.gltf`) with `export_frame_step=2`, `export_all_influences=False`, `export_nla_strips=True`, producing lean `606 KB–1.2 MB` GLBs. |
| 12 | **VRM Add-on for Blender** | Considered, rejected | **Judgment call (aesthetic & license fit).** VRoid/VRM ecosystems lean stylized-anime and frequently carry restrictive non-commercial avatar clauses; our GTA-6-bar photoreal direction favored MIT `valid-avatars-glb` + CC0 `UAL`. |
| 13 | **Godot** | Considered, rejected | **Judgment call (wrong runtime).** Hospital Escape targets browser Three.js `0.128.0`; Godot WASM export would break the live `HE` engine & web framing constraints. |
| 14 | **three.js** (`0.128.0` CDN) | **Used directly** | Pinned CDN runtime (`GLTFLoader.js`, `SkeletonUtils.js`, `SkinnedMesh` `boneTransform` contact probe, custom `onBeforeCompile` 87-lamp corridor shader & floor grounding). |

---

## 2. Specifically on the Four Unused Areas (vs. the Cast Build's Hard Problems)

1. **Auto-rigging (`GameRig` / `BlenRig`) vs. pre-rigged bodies:**  
   Would **not** have improved any of the five shooter candidates — pre-rigged MIT `VALID` (`53`-bone / Mixamo-compatible humanoid) and CC0 `UAL` already gave clean shoulder/knee weight falloff, whereas auto-riggers still fail around thick outerwear unless painted manually or transferred via `DATA_TRANSFER` (`Ex3`). For the cast build, `GameRig` would only help if we sculpt **new cloth skirts** from scratch (e.g., open tails on Dr. Hale's lab coat or Cole's patient gown).
2. **Video mocap (`Mixamo LLM Mocap` / `FreeMoCap` / `Rokoko`) vs. clip libraries:**  
   **Direct high-impact blind spot for the cast build.** Standard free clip libraries (`UAL`, `Quaternius`, `Soldier.glb`) are rich in `Walk` / `Jog` / `Aim` / `Shoot` / `Hit` / `Death`, so hiding this gap was easy on an enemy gunman bake-off. On the cast build (`games/hospital-escape-cast/`), clip libraries fail completely on:
   - **Maya's bed push & wheelchair push** (hands locked onto the push bar, forward torso counter-lean, short stiff-hippush stride with recoil head turns), and
   - **Cole seated/reclined firing & ambulance bay bracing** (compressed hip flexion `~95°`, shoulder hunch, bracing left palm while shooting right-handed).  
   A 5–10 second phone reference video processed with `FreeMoCap` or `Mixamo LLM Mocap` into our existing Blender world-quaternion retargeter solves the exact organic torso lean and elbow placement that hand-posing or clip layering can only approximate.
3. **Agent-driven Blender (`Blender Agent MCP`) vs. direct Blender scripting:**  
   Would **not** have changed the bake-off or improved quality. Headless batch Python in `neon_common.py` + `build_all_5.py` runs deterministically from factory startup (`~7 s`), leaves clean diffable source, and pairs seamlessly with automated Three.js Chrome CDP inspection (`contact_probe.mjs`). MCP would only slow down iteration.
4. **Jiggle Physics (baked secondary motion):**  
   Minor visual polish on desktop zooms, low impact at `390×844` phone gameplay distance. Worth a quick offline spring-bone bake on **Dr. Hale's open coat hems** or **Maya's ponytail**, kept completely off runtime bone physics.

---

## 3. Rebuild Tomorrow with Exactly One Technique Added

**Pick: Video Mocap (`FreeMoCap` / `Mixamo LLM Mocap`) routed into our existing Blender retargeter.**

What it fixes immediately:
1. **Unlocks clean-licensed `~1.65 m/s` combat locomotion for N2 (`valid-mocap`):** Cherie picked N2 for its natural weight-shifting mocap stride, while flagging its `Soldier.glb` Mixamo clips as `local-test-only`. Recording one 10-second brisk pistol-walk + jog + cover-peek pass on phone video fixes N2's provenance blocker completely *without losing the heavyweight mocap feel that beat UAL's stiff arm swing*.
2. **Unlocks bespoke hero animations for the cast build:** Directly captures Maya pushing a wheeled gurney/chair (torso pitch + locked grip cadence) and Cole seated/braced aiming in a cramped wheelchair/ambulance bay — the two cast problems no free stock clip library solves cleanly.

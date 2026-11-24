# Opus: verdict on bake-off entry C (CREW-ASK-C-VERDICT)

**Bottom line: I agree with Cherie's leaning. C over A.**

C is a real modelled body on a skeleton whose *core* is exactly the shape I specified, and its clip library is a real starting point. A is our own procedural rig with a nicer render, and it hits the same ceiling as today's `A.person`.

**But C as shipped in the sample is a proof of look, not an integration.** Six things must change before it carries the cast. The two that matter most:
- **Hit-testing does not match what the player sees.** Measured below: 78–85% agreement.
- **Cole cannot be played at all from this clip library.**

Neither is a reason to pick A. A has the same gaps, plus the look problem.

Every number below was measured in-engine on `hospital-escape-3d-sample-c` (seed 7, Chromium + SwiftShader) unless marked as derived or an estimate. No game code was changed.

## What I measured on C

| | C (stock gunman) | My earlier spec (`opus-advice-3d-cast.md`) |
|---|---|---|
| Joints | **62**: 22 core + 38 finger + 2 pole targets (`PTL` / `PTR`) | 20–24 + gun socket |
| Core skeleton | Root, Body, Hips, Abdomen, Torso, Chest, Neck, Head; Shoulder / UpperArm / LowerArm / Wrist ×2; UpperLeg / LowerLeg / Foot ×2 | same shape: **match** |
| Meshes / draw calls per figure | **11** (10 skinned parts with 10 flat-colour materials, plus the pistol) | ≤ 2 |
| Triangles / skinned vertices | about 5.8k / about 11.7k | ≤ 8k triangles: OK |
| Textures | **none** (flat `MeshStandardMaterial` colours, one vertex-coloured part) | n/a |
| Clips | 8, each keying **all 62 bones** (186 tracks) | — |
| Mixer update (JS) | **0.021 ms** per figure per frame | negligible |
| Frame cost in the bed push | 347 → 355 draw calls, +5.8k triangles for one 3D gunman | — |
| **Ray vs. visible pixel** (660 / 559 / 688 rays across the figure's screen box, 5 m) | **85% / 78% / 82%** agree (aim / walk / shoot); **85–99 rays cross visible pixels and miss**, 13–28 hit empty air | 100% (proxy capsules) |
| Cost per ray through skinned triangles | **0.71–0.83 ms** (CPU skinning per candidate triangle) | ≈0 (capsules) |
| Walk clip, true stride speed | stance foot moves **1.30 m/s** (world scale); the sample assumes **1.1** | measured, not assumed |
| Run clip, true stride speed | **about 3.2 m/s**; the sample assumes 3.0 | — |

**Derived (not measured in motion; SwiftShader real-time ran at about 7 fps, too coarse to catch foot contacts):**
- With playback scaled by the assumed 1.1 m/s, the walking foot over-travels by about 18% of the ground speed. That is **about 8–9 cm of slide per contact**, independent of speed. The target is under 2 cm.
- The run is about 7% off, about 1–2 cm per contact.
- The engine moves gunmen at 2.3 m/s, **exactly the sample's walk/run switch (`sp > 2.3`)**. They flicker between `Walk` played at about 2.1× and `Run` at about 0.77×.

## Your asks

### Does C work as the full-cast route?
Yes, on one shared skeleton.
- **Cole, Hale, plain and scrubs** are all adult-male builds the C body carries by reskin and proportions. Hale and the plain enemy are close to the base 1.77–1.81 m; Cole is 1.80 m.
- **Maya (1.68 m, female)** needs a female body **weighted to the same 62-joint skeleton** (same bone names). If the Quaternius female in the same family shares the rig, that's a mesh swap; if not, it's one reweight job in Blender. Either way the clip library is shared, which is the point.
- **Height** comes from uniform scale (Maya at 1.68 / 1.81 ≈ 0.93) plus small bind-pose bone-length edits. Clips survive both.

### What breaks first when C scales to the whole cast (in order)
1. **Clip coverage for anyone who isn't standing and fighting.** Cole has no seated, bed or braced poses; Maya has no push; Hale has no hands-up. This is the critical path (gap table below).
2. **Hit / LOS fidelity.**
   - At 78–85% agreement, a player can put the reticle on a visible arm and miss, or hit air beside him. The fairness contract's LOS ray can be blocked or unblocked by limbs that are not where they're drawn.
   - With five characters on screen and limbs in many poses, this is the first thing players will *feel*.
3. **Draw calls.**
   - At 11 calls per figure, a 6-figure fight adds about 66 calls to a frame that already spends about 350 in the bed push.
   - The fix is mechanical: merge the parts into one geometry with one material (vertex colour or a small palette atlas), offline, giving 1–2 calls per figure.
4. **Lighting.**
   - The flat colours under our hemisphere + 0.18-sun corridors go dark and flat. That is the same thing that sank B (Cherie saw B near-black at 8–13 m).
   - C escapes it *in the sample* only because the gunman is dark-clothed anyway. Hale's coat and Cole's gown will show it immediately.
   - It needs the lamp terms (`PT.collectLights`, which already finds the 87 ceiling lamps) injected into the figure materials.
5. **The driver loop.**
   - `cast3d.js` runs its own `requestAnimationFrame` with wall-clock `dt`, outside the game's fixed step. Under `ff()`, pause, the consciousness fade or the test harness, the animation and the engine diverge.
   - The mixer must step inside `present(dt)`, like the painted cast does today.
6. **Walk-speed constants and the walk/run switch:** as above. They should be measured from the clips, not assumed.

### If I disagreed with C over A, I'd say so. I don't
- **A** is our house method with a better render, but it is still primitives on pivots. At phone size and under the patient-eyes blur, its silhouette reads as "mannequin". Cherie saw that at zoom, and our own procedural `A.person` (56 meshes per person) shows the same ceiling.
- A's *advantages* (no loader, no skinned raycasts, poses authored in code) are all things C can have as well (proxies, code-authored pose clips, house format if wanted).
- C's advantage (a real modelled body with a real aim stance) is something A cannot get without becoming C.

## Integration cost: C against my earlier plan

| My plan item | What C changes | Effort | Risk |
|---|---|---|---|
| One shared skeleton (20–24 + gun socket) | C's core **is** that skeleton (22). Use it as-is; add a `Gun` socket under `WristR` (the sample already parents the pistol there). | low | low |
| Extra 38 finger joints | **Not a perf problem.** GPU skinning cost scales with vertices × 4 influences, not bone count; 62 bone matrices per figure per frame is trivial; the mixer is 0.021 ms. **Strip finger tracks from the walk/run/idle clips** (186 → about 66 tracks) and keep fingers posable for grips: gun, push bar, wheel rims, Hale's open hands. They're an asset. Drop the unused pole targets. | low | none |
| Bone-parented proxy capsules for hit/LOS, skinned raycast disabled | **Now mandatory, not optional:** measured 78–85% ray/pixel agreement and 0.7–0.8 ms per ray. About 10 capsules per figure on the 22 core bones; `raycast = () => {}` on skinned parts. The fairness audit then runs unchanged. | about 0.5 day | low |
| `sRGBEncoding` on imported textures | **Moot for C as shipped** (no textures; flat factors arrive linear through GLTFLoader). It becomes live again the moment we atlas the materials or add a face texture. Keep it in the import checklist. | — | low |
| Stride-locked playback, < 2 cm slide per contact | Same mechanism (`timeScale` = measured engine speed ÷ the clip's measured stride speed), but use **measured** stride speeds: walk 1.30, run about 3.2, not the manifest's 1.1 / 3.0. Move the walk/run switch off 2.3 m/s (e.g. walk ≤ 2.0, run ≥ 2.6, crossfade between). Proof metric unchanged, measured on a real device or at a fixed step, not SwiftShader real time. | about 0.5 day | low |
| Per-figure lighting | Inject the lamp terms (level, side direction, back-light) into the figure materials via `onBeforeCompile`. That is the same math as `painted.js` `lightTerms`, already written. | about 1 day | medium (needs a look pass per character) |
| Merge to 1–2 draw calls per figure | Offline merge of parts + palette atlas per character. | about 0.5 day per character, or a one-off script | low |
| Drive from `present(dt)`, not a private rAF | Move the `cast3d.js` state machine into the existing `paintEnemy` / `paintCast` seam (engine state → clip name). | about 1 day | low |
| Impostors for distant / chase figures | Unchanged: bake 8-yaw atlases from the C model and reuse `painted.js`. | about 1 day | low |

**Net:** C *lowers* the risk of my plan (the skeleton and clips exist and fit), and adds two items I'd only listed as recommended: proxies and measured stride. **The real cost centre is the clip gaps below**, not the integration.

## Clip coverage gaps per role
C has Walk, Run, Idle_Neutral, Idle_Gun, Idle_Gun_Pointing, Gun_Shoot, HitRecieve and Death. These are the poses and motions the shipped game uses today (`A.pose`, the painted frames), mapped to what's missing:

| Role | Needed | Have in C | Gap: and how I'd fill it |
|---|---|---|---|
| **Plain / scrubs enemies** | walk, run, aim, fire, flinch, die, **walk-while-aiming** (rushers), **cover peek / lean**, **crouch-behind-cover** | walk, run, aim, fire, flinch, die | **aimWalk**: layer `Walk` on the legs with `Idle_Gun_Pointing` on the spine and arms (a per-bone mask: split tracks by bone, two actions), no new animation. **Peek / lean**: `Idle_Gun_Pointing` plus a code-authored additive spine/hips lean pose (static), easy. **Crouch**: one hand-keyed static pose. |
| **Maya** | push-walk (bed and chair), push-and-fire, aim, aim-walk (on foot), crouch at the chair (holdout), drive (seated, hands on wheel), walk, talk | walk, aim, fire | **Push-walk**: `Walk` legs plus a static arms-forward grip pose on the upper body (mask). This is the one that must look right; the grip-on-bar solve from the painted build becomes a two-bone arm IK to the bar. **Crouch**: static pose. **Drive**: static seated pose. **aimWalk**: as for enemies. |
| **Cole** | **recline in bed** (with aiming arm), **sit in wheelchair** (with aiming arm), **braced on the ambulance floor** (raising the pistol), slumped / hurt in the seat, transfer stand-to-sit (cutscene) | **none usable**: every C clip is standing | **The critical path.** Three static seated / reclining base poses, hand-keyed on the 22 core bones, plus `Idle_Gun_Pointing` on the right arm only (mask) for aiming from the seat. The consciousness fade's head slump becomes a neck / head additive driven by `PE.out`. About 1–1.5 days of careful keying; until then, no Cole. |
| **Dr. Hale** | talk / objecting gesture, hands-up, walk | walk, idle | **Hands-up and objecting**: two static poses, keyed in code (the fingers help: open palms). |
| **Bystanders** (nurse, orderly, patient: if they join the 3D cast) | walk, flee, cower, hit | walk, run, death | **Cower**: one static pose. Flee = `Run`. |

**Summary:** about 8 static poses plus 2 layered (masked) combos fill every gap. Nothing needs new *locomotion* animation. The only genuinely new animated motion is optional: the cutscene transfer into the chair. Static poses can be authored in code as one-key clips on named bones, the way `A.pose` works today, so there's no Blender dependency for them.

## The GLTFLoader ruling: my recommendation
**Allow the pinned-CDN examples loader:** `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js`. Same exact version pin and same host as `three.min.js`, plain glTF/GLB only, no DRACO or any other example module. Load it as a normal `<script>` next to `three.min.js` (not lazily), so a failure is visible at boot and the game falls back to the painted cast cleanly.

**The tradeoff.**
- **For the loader:** it is the same supply chain we already trust, version-locked, and it is the reference implementation of skins, clips and morph data for r128. Writing a house format means building both an exporter and a skinned-mesh loader, which buys no runtime benefit for about 1–2 days of work plus ongoing maintenance.
- **Against:** one more script to cache-pin, and the rule "three.js only from `three.min.js`" gets a one-file exception.
- **Shipping as GLB:** independent of the ruling, ship the model as a **real `.glb` file** as soon as the delivery path allows. The sample's gzip+base64-in-JS workaround costs about 33% in size, adds a parse step, and depends on `DecompressionStream`, which iOS Safari only has from 16.4.

If Cherie wants the rule kept absolute, the house-format route is the safe fallback, and nothing in C's integration depends on which loader is used.

## Conditions I'd attach to "C wins"
1. Proxy capsules for hit and LOS before any C figure takes damage in the live game. The fairness audit is re-run with the 3D cast and must still show 0 violations.
2. Measured stride speeds and a split walk/run switch; slide per contact is measured at a fixed step, target under 2 cm.
3. The lamp-term lighting applied to every figure before any look judgement on Hale, Cole or Maya.
4. One merged mesh per character (≤ 2 draw calls).
5. Animation driven inside `present(dt)`.
6. **Cole's seated, bed and braced poses are scheduled first.** Without them the build has no protagonist.

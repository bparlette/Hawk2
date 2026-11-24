# Shooter-asset bake-off: OPUS's entry (one gunman, five techniques)

> **Logins:** none needed, none used. **Paid software:** none.
> **Installed for this entry:** nothing that the shipped pages depend on. A `pip install bpy` was started and **not used**: every step below runs in the browser at load, with no Blender in the pipeline.
> **Tools:** Node + Playwright/Chromium (SwiftShader), ffmpeg and Python/Pillow, for captures and sheets only.
> **Live game:** untouched. The sample pages load the live game's own files read-only through `<base href="../hospital-escape/">`.

## Where everything is

**Pages** (each walks in the real game with every plain gunman replaced; `?v=N` replays any iteration-trail version):

| Example | Page |
|---|---|
| 1. C, integration-grade | `games/hospital-escape-3d-sample-opus-1/` |
| 2. CMU mocap walk + foot-lock IK | `games/hospital-escape-3d-sample-opus-2/` |
| 3. Re-proportioned gunman | `games/hospital-escape-3d-sample-opus-3/` |
| 4. Combat locomotion | `games/hospital-escape-3d-sample-opus-4/` |
| 5. The combination (my submission) | `games/hospital-escape-3d-sample-opus-5/` |

**Code and data:** `games/hospital-escape-3d-sample-opus/`
- `opus-cast.js`: shared pipeline, in-game driver, showcase harness and meters.
- `ex-extra.js`: the mocap retargeter, combat layering and spec tables.
- `make-pages.py`: generates the five pages from the live `index.html`.
- `mocap/`: CMU BVH files plus the CMU/Hahne licence text.

**Evidence:** `tasking/responses/opus-shooter-asset-shots/`
- `exN-*-walk.mp4`: 390×844, 30 fps, 7 s;
- `exN-*-zoom.mp4`: 2.5× crop of the same take;
- `exN-metrics.json`;
- `comparison-sheet.png`: all five, full frame plus three zoom moments;
- `trail-ex1..4.png`: the iteration trails.

**Walk protocol (identical for all five):** gauntlet hall, the real rail camera, seed 7. The gunman walks **14.5 m → 5.2 m** toward and past the camera line at a **stated 1.4 m/s**. The engine runs at a fixed 1/60 s step; frames are taken every 2 steps.

**Foot-slide test:**
- heel and toe contact points come from the foot mesh's own sole vertices;
- a contact is the point within 1 cm of the floor *and* moving under 0.6 m/s;
- slide is the horizontal travel during that contact.

A looser 2 cm band is also in the JSON. It counts pre-touchdown grazing as contact (see example 2), and I report it rather than hide it.

**Source asset for all five:** Quaternius "Casual Character" (CC0, via Poly Pizza), the same GLB as samples C and CX. **Shippable.**

## What all five share (the template pipeline, built once)
1. **One draw call per body.** At load, all 10 skinned parts are merged into one SkinnedMesh on the shared skeleton, with each part's colour baked into vertex colour. Measured per figure: **12 → 3 calls** (body + pistol + floor shadow). The whole frame goes **74 → 65 calls** with one figure on screen.
2. **Role reskin and reshaping at load, with no Blender.**
   - A per-character *rule table* (`O.rulesGunman`) sets each vertex's colour from its part, dominant bone and bind position, and can push it along its smoothed normal. Displacement uses normals averaged per shared position, so seams stay closed.
   - The gunman's row follows Neon's spec: bomber `#733829`, beanie `#1C1C1C` (rim set from the measured brow height), trousers `#22252A`, stubble.
3. **Lit by the room.** The painted cast's 87 recovered ceiling lamps drive a key, an ambient and a back-lit rim, injected into `MeshStandardMaterial` (`onBeforeCompile`).
4. **Hit and LOS proxies.**
   - Capsules between rest joint positions (bone to child joint, built in each bone's own frame); skinned raycasts are disabled.
   - Measured against the real rendered silhouette (frame differencing, 390×844, at about 7 m): **96% of visible body pixels register a hit while walking and 90% in the aim pose, at 0.006 ms per ray.**
   - My C verdict measured raw skinned raycasts at 78–85% and about 0.7 ms per ray.
   - Remaining error: 1–2 px of capsule bulge at the edges, and the foreshortened gun arm in the aim pose.
5. **Driven inside the engine's fixed step** (`G.step` hook), not a private rAF, so `ff()`, pause and tests stay in sync.
   - In-game check on all five pages: autopilot through the gauntlet; 9 gunman figures spawned, **7 killed through the proxies**, beat survived, **0 page errors**.

## Example 1: C, integration-grade
- **Build:** sample C's GLB with steps 1–5 above; C's own Walk clip at the foot-contact-adjudicated **1.30 m/s**.
- **Iteration trail** (`trail-ex1.png`, `?v=1..6`):
  - **v1:** C as shipped. 12 calls, near-black under our lighting.
  - **v2:** merged to one mesh, lamp lighting and proxies. 3 calls; reads as a lit figure.
  - **v3:** first role reskin. The pushes tore seams open, and the hair read as spikes.
  - **v4:** seams closed with averaged normals, but the beanie "dome projection" pulled the hair inside the skull, so he went bald.
  - **v5:** scalp recoloured as knit, but the rim was too low and hid the face.
  - **v6:** rim set from the measured brow height (Head bone 1.587 m, brows 1.71, crown 1.857).
- **Final:** 5,814 triangles, 3 calls. Slide (strict) **1.3–2.4 cm**.
- **Fails:** C's Gun_Shoot is full-body, so the legs freeze to shoot. Its aim stance is bladed. His arms hang while walking.
- **Repeat cost:** a new rule row, about 30–60 min per character on this body.

## Example 2: real motion capture, retargeted in the browser, feet locked
- **Source:** CMU Graphics Lab Motion Capture Database, BVH conversion by B. Hahne, via `github.com/una-dinosauria/cmu-mocap`. Licence (text shipped in `mocap/CMU-READMEFIRST.txt`): *"free for use in research and commercial projects"*, no restrictions. **Shippable.** Take **35_02** (walk, measured 1.34 m/s, straightness 0.998); 16_15 is used for v1.
- **Method** (`O.retarget`, at load):
  1. Parse with three's `BVHLoader`, from the same pinned CDN as GLTFLoader.
  2. Both rests are T-poses facing +Z, so I use a world **rest-delta** retarget, which keeps twist: `q_tgt = (q_src(t)·q_src_rest⁻¹)·q_tgt_rest`, turned to face +Z.
  3. Cut one gait cycle between left heel strikes: smoothed signal, ±0.35 s window, choosing the most similar pair. Result: 1.133 s, loop error 0.011.
  4. **C's rig is IK-baked:** its feet are children of `Root`, not of the shins, and the legs hang from `Body`. So the pelvis motion goes on `Body`, and each foot is solved and written in `Root` space.
  5. **Foot-lock:** each ankle is placed exactly where the actor's ankle was relative to the hip joint, scaled by the leg ratio (always reachable). A two-bone IK solves thigh and shin, with the knee toward the mocap knee.
  6. A ground pass sets the planted ankle at its rest height.
- **Pacing:** with feet locked, the planted ankle copies the actor's world-static ankle, so **root speed × leg ratio = 1.326 m/s** is the contact speed. The slide meter confirms it: the alternative contact estimate of 1.129 measured worse (5–6 cm against 4 cm).
- **Iteration trail** (`trail-ex2.png`):

  | Version | What changed | Slide (strict) | Loose band (heel) |
  |---|---|---|---|
  | v0 (not shipped) | Retarget came out crumpled (1.12 m): armature −90° X mis-seeded | — | — |
  | v0b (not shipped) | Feet frozen: C's feet are `Root` children | — | — |
  | v0c (not shipped) | 5 cm float, legs locked straight | — | — |
  | v1 | 16_15, root-speed pacing | — | 19–32 cm |
  | v2 | 35_02, contact pacing, no lock | heel 1–2 cm | 15–17 cm (visible scissoring) |
  | v3 | Foot-lock; sway 0.6 left the planted foot drifting 8 cm sideways | heel 5 cm | — |
  | **v4** | Full sway | **heel 1.6–3.8 cm, toe 1.0–1.6 cm** | — |

  The 23–26 cm "loose" heel figure on the final is the heel grazing the floor at swing speed in the last 0.1 s before touchdown. It's in the source data and is not slide.
- **Fails:** the actor's arms are an unarmed swing, so the pistol dangles. That's what example 4 fixes.
- **Repeat cost:** **zero per character** for any body on this skeleton. Any CMU take (about 2,500 walks, runs, crouches and sits) retargets at load in about 1 s. A new skeleton family is one bone-map table.

## Example 3: the gunman's own shape (parametric re-proportioning)
- **Method:** `O.rulesShape({...})` displaces the bind mesh by body region at load: torso girth, belly, deltoid mass plus shoulder width, neck, forearm and thigh. Height comes from uniform scale (1.82 m). Clips are unchanged, because the bones are untouched.
- **Iteration trail** (`trail-ex3.png`):
  - **v1** (girth 0.05, shoulders 0.05): puffy, reads as a padded coat.
  - **v2** (girth 0.032, belly 0.025, shoulders 0.03 + 0.022 wide, neck 0.018): stocky and heavy-shouldered, the beanie-and-bomber silhouette from Neon's spec.
- **Final:** slide (strict) 1.4–3.5 cm, same clip as example 1. 5,814 triangles, 3 calls.
- **Repeat cost:** **one parameter row per character**, about 15 min.
  - Maya: slimmer girth and shoulders, height 1.68.
  - Hale: a coat flare row (hips/thigh displacement), plus the colour rule.
  - Cole: gown colour and his seated poses, which need example 2's retargeter on a CMU sitting take.
- **Fails:** it can't add *new* silhouette elements (a coat hem that separates from the legs, a cap brim). Those need geometry.

## Example 4: combat locomotion (he walks *and* aims)
- **Method:** the skeleton is split into a lower set (Root, Body, Hips, legs, feet, PT) and the upper body. The legs play the walk (or idle) while the upper body plays `Idle_Gun_Pointing`, which becomes `Gun_Shoot` on each shot. The tracks are disjoint, so there is no blend conflict and the legs never stop to shoot.
  - **Aim:** after the clip is applied, the *gun arm's actual direction* is measured, and the yaw error to the target is spent across Abdomen, Torso and Chest (eased, ±80°).
- **Iteration trail** (`trail-ex4.png`):
  - **v1:** twist based on hip-forward; C's pointing stance is bladed about 70°, so he aimed off to the side.
  - **v2:** measured gun-arm aim; the arm points at the camera, foreshortened.
- **Final:** walks at 1.4 m/s while aiming at you, firing every 1.6 s without breaking stride. Slide equals example 1's (same leg clip).
- **Repeat cost:** none per character. It's the same split for every body on the skeleton, and it's the moveset the clip library was missing.

## Example 5: the combination (my submission)
- **What it is:**
  - example 2's foot-locked CMU legs at 1.326 m/s;
  - example 3's stocky shape;
  - example 4's aim/fire upper body;
  - example 1's merged mesh, room light, role reskin and proxies.
- **Version:** 1. Every part was iterated in its own lane, so the combination ran clean first time.
- **Result:** a heavy-set gunman in a rust bomber and beanie who walks on real human motion and fires as he advances.
  - Slide (strict): **heel 1.4–3.8 cm, toe 0.9–1.5 cm**.
  - Cost: **5,814 triangles, 3 calls** (body, pistol, floor shadow).
  - Proxies: **90–96% hit agreement**.
  - 0 errors in-game.

## Cost and quality, honestly

| | Triangles | Calls per figure | Slide, strict (cm) | Walk source | Shippable |
|---|---|---|---|---|---|
| 1 | 5,814 | 3 | 1.3–2.4 | C clip | CC0 |
| 2 | 5,814 | 3 | 1.0–3.8 | CMU mocap + foot-lock | CC0 + CMU (free, commercial OK) |
| 3 | 5,814 | 3 | 1.4–3.5 | C clip | CC0 |
| 4 | 5,814 | 3 | 1.3–2.4 | C legs + C aim layer | CC0 |
| **5** | 5,814 | 3 | 0.9–3.8 | CMU legs + C aim layer | CC0 + CMU |

**The plain truth on fidelity:** this is a 5.8k-triangle stylised low-poly body. At 5–15 m on a phone it reads as a person in the room (lit, grounded, aiming), **but it is not GTA-6 fidelity, and no technique in my lane changes the base mesh's detail.**

- **Neon's VALID meshes** (MIT, photoreal, 7.3k triangles) are a better *body*.
- **My contribution is the pipeline that body should run on.** Everything above is skeleton- and mesh-agnostic code: merge, rule-table reskin and reshape, lamp lighting, joint-segment proxies, the browser-side mocap retarget with foot-lock, and upper/lower combat layering.

## Combine round (§5): what I'd take, and what I wouldn't ship
- **Take from Neon:**
  - the **VALID photoreal base meshes** (MIT) as the body;
  - the **UAL CC0 clip library** (pistol aim/shoot/crouch);
  - my retarget, foot-lock, layering, proxies and merge on top.

  UAL's pistol clips fill the upper-body layer better than C's bladed pointing stance. CMU fills what no library has: sitting, transfers, injured walks (Cole).
- **Take from Moth:** the per-rig foot-contact probe as the acceptance test (I used a stricter heel/toe version), and the rotation-only retarget lesson. My retarget is the world-space version of it, and handles C's IK-baked feet.
- **Wouldn't ship:**
  - Mixamo-via-three.js-mirror clips (licence; both Moth and Neon flag it);
  - any route that needs Blender per character for what can be data at load;
  - raw skinned-mesh raycasts for hits (measured 78–85% agreement, about 100× the cost of proxies).

## Limits
- Numbers come from SwiftShader in a VM: draw calls, triangles and slide are exact, but frame times are not meaningful for a phone.
- The showcase walks toward the camera; crossing walks exercise the spine twist more. The in-game run covers both.
- The re-proportioning rows were tuned by eye at phone size, against Neon's spec, not against a measured target.

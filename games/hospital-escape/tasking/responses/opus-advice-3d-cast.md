# Opus: advice for the 3D cast (CREW-BRIEF-3D-CAST §3)

This is advice only; no code changed. The live game is untouched, as the brief says. Every number below was measured on the current build (`304b7bd`) unless marked as an estimate.

## What I checked first (facts the judging should rest on)
- **The existing procedural cast already is "Entry A" in embryo.**
  - `A.person` (game/art.js) is a rig of **16 named pivots** (`J.spine`, `J.shR` / `elR`, `J.hipL` / `knL`…). `A.pose` already drives stand, walk, run, aim, aimWalk, lean, crouch, peek, dead, hurt, sit, lie, recline, push, drive, talk, cower and flee.
  - It loses on *look*, not on mechanics. **One gunman is 56 separate meshes, so 56 draw calls, for 3,428 triangles.** That is the wrong shape for a phone.
- **A whole gauntlet frame with the painted cast** is 75 draw calls and 15.2k triangles (`renderer.info`, post pass included). Triangles are nowhere near the budget. **Draw calls and per-vertex skinning are what a 3D cast will spend.**
- **There is no shadow map today.** `renderer.shadowMap` is never enabled; no light casts. "castShadow on" in the bake-off contract means *adding* a shadow pass (see d).
- **Raycasting skinned meshes in r128 works, with a catch.**
  - `Mesh.raycast` uses `boneTransform` on SkinnedMesh, so hits follow the animated pose, but only when `material.skinning` is true.
  - It first tests the **bind-pose bounding sphere**, so an arm swung outside the T-pose sphere can be missed. It also skins every candidate triangle on the CPU, per ray.
  - The fairness LOS runs this every 0.2 s per shooter, and again at each damaging shot (see d).
- **The post chain** renders into a half-float target with a depth texture, applies ACES and sRGB itself, and runs at 0.7× the capped DPR. Any opaque figure writes correct depth, so DOF, haze and lids work on 3D figures with no change.

## a) Architecture
- **One shared humanoid skeleton for the whole cast, per-character meshes on it.**
  - Cole, Maya, Hale and both enemy types are all adult humanoids, so a single skeleton fits them all. Use a short standard bone list, about 20–24 bones: hips, spine×2, neck, head, and clavicle / upper / fore / hand ×2. Legs are thigh / shin / foot ×2, plus a `gun` socket bone on the right hand.
  - Per-character differences go in the **mesh and its proportions** (bone lengths in the bind pose), not in different rigs.
  - What it buys us: **one clip library** (walk, run, aim, aimWalk, fire, flinch, die, peek, sit, push, drive, recline) retargets for free; one state machine; one hit-proxy layout.
  - Per-character rigs would multiply the clip work by five for no gain at phone size. Role fit is the bar, not individual anatomy.
- **Animation state stays where it is: the engine decides, the presentation plays.**
  - `paintEnemy` / `paintCast` already map engine state to a *frame name*: peek, aim, fire, flinch, down, walk-0n, push-0n, sit, braced…
  - Keep exactly that seam, and map the same names to **clips with crossfades** (a `THREE.AnimationMixer` per figure, 0.12–0.2 s fades). The fire, flinch and recoil timings I already have (`fireT 0.14`, `flinchT 0.24`, recoil `kick`) become clip triggers and additive layers.
  - No engine change needed. Hit, LOS, fairness and the consciousness gate don't care what draws the figure.
- **Where the painted system retires, and where it stays as fallback:**
  - **Retire:** painted figures in gameplay views, the alpha-mask raycast, and the billboard yaw. Real meshes don't need any of the three.
  - **Keep, generalised:**
    - The **lamp-driven lighting** (87 ceiling lamps recovered from the world, `PT.collectLights`). It becomes the light source for 3D figures too (see d).
    - The **foot-locking** logic, as a principle (see c).
    - The **fallback contract**: if the 3D cast fails to load, the game still plays.
  - **Keep as the fallback** the painted billboards, then procedural `A.person` below them: a three-tier chain (3D → painted → procedural), chosen once at load.
  - **Keep painted for distant impostors** (see b).

## b) Phone perf budget
These are estimates, because I can't measure a real phone from here (SwiftShader timings are relative only). The method rests on what the build measures.
- **Per figure, target 1 skinned mesh, 1 material, 1 atlas texture.**
  - That is 1–2 draw calls, against 56 for today's procedural person.
  - Size: **5–8k triangles** for the hero cast (Cole, Maya); **3–5k** for enemies.
  - Bones: 24 or fewer. r128 uses bone *textures* when the GPU supports float vertex textures, so the uniform limit isn't the wall, but vertex-shader skinning cost scales with vertex count × 4 influences.
- **On screen at once:** a mid-range phone handles **about 8 skinned figures at full rate** with that budget, on top of our post chain. The biggest fights in the level are 3–4 enemies plus Maya, plus Cole in the chair or bed, which is about 6.
- **Built in from the start, not retrofitted:**
  1. **Animation LOD:** beyond about 12 m, update the mixer at 15 Hz instead of 60. Beyond about 25 m, step poses with no crossfade. The figure is a few dozen pixels tall there, and this is the cheapest win.
  2. **Geometry LOD:** two meshes per character, full and about 40%, switched at about 15 m. With one skeleton both share the same clips.
  3. **Impostor tier (keep the painted pipeline!):** beyond about 30 m, or when more than 8 figures are live, draw the far ones as **billboards baked from the 3D model**. Render the rig once per clip pose into an atlas at load (8 yaw angles × key poses).
     - This reuses `painted.js` almost unchanged: masks, measured bottoms, contact shadow, reflection, lamp lighting.
     - Chase and finale shooters (pursuers at 33–60 px tall) live here permanently.
  4. **Hit proxies, not skinned triangles (see d):** about 10 capsules or boxes parented to bones. These replace the per-ray CPU skinning cost entirely.
  5. **One shadow budget:** one shadow-casting light, a 1024² map, its frustum fitted to the action volume (see d). No per-figure shadow lights.

## c) Foot planting with skeletal clips
- **The principle transfers. The mechanism changes.**
  - In the painted build the pose is held while the body stays put, then steps (stop-motion). That is right for 4 discrete paintings and wrong for a continuous skeleton.
  - With a skeleton, the equivalent is **"the clip's stride length equals the distance travelled"**.
- **What I would build:**
  1. **Author or measure each locomotion clip's stride length.** That is the root distance per cycle, measured from foot-contact markers (or from the in-place clip's foot sweep).
  2. **Playback speed = velocity ÷ (stride length × cycle rate)**, so `mixer.timeScale` per figure is set from the enemy's **measured** world speed. That is the same signal my walk integration uses today (`u.walkV`, smoothed). It keeps feet planted at any speed with zero skating, and the clip still plays continuously.
  3. **Clamp** to 0.7–1.4× the authored speed. Outside that range, blend to a different clip (walk ↔ run, idle ↔ walk), so feet never look like ice-skating or moonwalking.
  4. **Root motion is not worth it here.** The engine owns positions: cover advance, rush, `rushStop` back-off and recover moves. Fairness and LOS use the engine position. Let the engine drive the root, and let speed-matched playback do the planting.
  5. **Optional, and cheap if wanted:** a two-bone foot IK pass to pin the stance foot while its contact marker is down, only for the near cast (Maya pushing, nearby enemies). With speed-matched clips it is polish, not a requirement.
- **Proof metric:** keep the one I used, stance-foot world slide per contact. The walk integration measures 0.000 m. A skeletal version should report under about 2 cm per contact at all engine speeds.
- **This also settles the cadence question** Moth lists as open (≈5 poses/s vs 8 fps). With a skeleton the cadence *is* the speed-matched playback rate; there is no separate number to rule on.

## d) Engine friction: what will fight real 3D figures (named now)
1. **Lighting is the big one.**
   - The world has **no real local lights**: hemisphere (0.48), a weak directional "sun" (0.18 indoors), and emissive ceiling panels that only *look* lit through bloom.
   - The painted figures looked right because their lighting is *painted in* and my shader adds the lamp terms.
   - **A real 3D figure under hemisphere plus a 0.18 sun will read flat and grey: the "gamey" look.**
   - **Fix, cheapest first:**
     - **Option A:** inject the lamp terms I already compute (nearest-lamp level, direction, back-light) into the 3D figures' `MeshStandardMaterial` via `onBeforeCompile`, as one extra directional term per figure. No new scene lights; cost is per figure only.
     - **Option B:** 2–4 real `PointLight`s that *follow the action* (snap to the nearest lamps around the camera). These light the world too, so walls finally get real pools, but every `MeshStandardMaterial` pays per light.

     I'd ship A for the bake-off and test B. Either way, **don't judge Entry A, B or C under the current hemisphere-only lighting**: all three will look worse than they will in-game, and the painted control has an unfair head start.
2. **Shadows** (the contract says `castShadow` on; nothing casts today).
   - Enabling `renderer.shadowMap` with one directional or spot light adds **one depth pass of the shadow casters**, only the cast, if `castShadow` is limited to figures and props near the action.
   - The world should `receiveShadow` only on the floor meshes.
   - Fit the shadow camera to about 20 × 20 m around the camera and follow the rail, at 1024², with `PCFSoftShadowMap`. In r128 the skinned shadow needs the depth material skinned, which three handles once `material.skinning` is true (it warns otherwise).
   - The **floor reflection** and **contact shadow** quads from the painted system only need a planar version. For real meshes, a cheap fake reflection (a mirrored, faded, depth-tested copy rendered into the floor) or simply keeping the contact blob is enough at phone size.
3. **Raycasts, for hit and fairness LOS.**
   - Today `game.losBlocked` and the player's shots raycast **every visible mesh, recursively**: the world, `extraOccluders`, every actor.
   - With skinned meshes: (i) the bind-pose bounding sphere can miss swung limbs → hits that the player sees but the game misses, or the reverse; (ii) CPU skinning per candidate triangle per ray → a cost spike in fights. Both are avoidable.
   - **Decide now:**
     - Figures are raycast through **bone-parented proxy capsules** (`userData.hit` on the proxy group, exactly how actors are hit today).
     - The skinned mesh itself sets `raycast = () => {}`.
     - LOS uses the same proxies.
     - This keeps fairness auditing identical (`fairness-audit.cjs` doesn't change) and makes hits match the visible body.
4. **Colour pipeline.**
   - The renderer is `LinearEncoding` / `NoToneMapping`; the post composite does ACES and gamma.
   - **Every 3D texture must be flagged `sRGBEncoding`**, and any imported material's emissive or lightmap set up for linear output. Otherwise B and C (glTF) will look washed out or too contrasty, and the judging sheet will be measuring the import, not the route.
   - Our `cv()` textures already do this; loaded textures do not by default in r128.
5. **Loaders vs the "pinned CDN three only, no new dependencies" rule.**
   - Entries B and C most likely arrive as glTF. **`GLTFLoader` is not in `three.min.js`.** It lives in `examples/js/loaders/` (same pinned 0.128.0 CDN path), and DRACO decoding would be a second dependency.
   - **This needs Cherie's or Moth's ruling before a winner is picked:**
     - (i) allow `three@0.128.0/examples/js/loaders/GLTFLoader.js` from the same pinned CDN, uncompressed glTF only; or
     - (ii) convert winners offline to a small house binary format (positions / normals / uvs / skin indices / weights + bone list) that a ~150-line loader in `game/` reads, with no new dependency.

     I recommend (ii) if the rule is strict, and (i) otherwise. Entry A needs neither.
6. **Post chain: no conflict, two cautions.**
   - **DOF focus** follows the nearest threat's distance (`tunePost`). It works unchanged.
   - **Breathing softness, drift and lids** are screen-space and character-agnostic.
   - **Bloom** picks up any emissive or very bright albedo: keep the cast's albedo under about 0.8 linear (lab-coat white especially) or Hale glows.
   - **The 0.7× render scale** plus the patient-eyes blur hides fine detail. Spend triangles on **silhouette** (hair mass, jacket hem, cap, mask, gun), not on faces.
7. **Consciousness and lids: no conflict.**
   - Lids are post uniforms, and the outGate reads `game.heroClosure()`.
   - The only interaction: during a full fade nothing is visible, so the **animation LOD can drop to 0 Hz while closure ≥ 0.85**, a free perf win.
8. **Patient-eyes camera rig.** Foreground Cole is currently hidden or painted in his own views. A real 3D Cole solves the "back of head" problem properly: a rear view comes for free. But then **the camera's near plane (0.05) and his head/shoulder meshes must not clip**. Give him a "first-person" mesh variant: head hidden, shoulders and gun arm kept, a standard FPS-arms split.

## Suggested additions to the bake-off judging sheet
1. All entries are judged under the **same added lighting** (d1, option A), not today's hemisphere-only scene.
2. **Draw calls and skinned vertices per figure** are reported next to the stills, from `renderer.info`. Target: ≤ 2 calls, ≤ 8k triangles.
3. **Foot slide per contact** is measured at two engine speeds (cover advance and rush). Target: under 2 cm.
4. **Hit-proxy agreement:** 100 random shots at an animated figure, where the proxy hit agrees with whether the visible silhouette was under the ray. That is the fairness contract's honesty check, carried over.
5. **Loader ruling** (d5) is settled before B or C can be declared winners.

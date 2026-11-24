# Opus: did the shooter bake-off consider these 14 techniques? (QUESTIONS-TECHNIQUES.md)

**Short version:** I used four of the fourteen (Blender, glTF-Blender-IO, three.js, and a retargeter, my own rather than Simple Retarget Tool). Of the rest, **video mocap is the one that matters, and I missed it.** It is the most direct answer to Cole's seated poses and Maya's wheelchair push, and it plugs into code that is already in the repo. Everything else was a fair "not needed for this brief".

## 1. What I considered, and what killed the rest

| # | Technique | My entry | Why |
|---|---|---|---|
| 1 | Blender Agent MCP | Not used | I drive Blender directly as a Python module (`bpy` 5.3, free). An MCP layer adds tool wrappers around the same API; in a scripted pipeline it adds nothing but a dependency. **Fit.** |
| 2 | Mixamo LLM Mocap | Not considered | Its output lands on Mixamo characters, which needs a Mixamo (Adobe ID) login, and Mixamo assets are local-test-only for us. **Licence / login.** |
| 3 | Blender | **Used** | Offline prep of the five VALID bodies (`valid/prep_valid_blender.py`): strip mouth internals and morphs, decimate, export. |
| 4 | GameRig | Not considered | Every body I used came pre-rigged (Quaternius C, VALID). **Fit.** It would matter for an unrigged mesh (see §2). |
| 5 | BlenRig | Not considered | A film-grade facial rig is invisible at 5–15 m on a phone, and it's heavy for real-time. **Fit / quality-per-cost.** |
| 6 | FreeMoCap | **Not considered: a blind spot** | See §2. |
| 7 | Rokoko Studio Live | Not considered | Streams from Rokoko suits and apps, which needs an account and hardware. **Login / hardware.** |
| 8 | Simple Retarget Tool | Same job, done differently | I wrote the retarget into the runtime instead (`hospital-escape-3d-sample-opus/ex-extra.js`): CMU BVH to the skeleton at load, as a rest-delta world retarget with two-bone foot-lock IK. That means no per-character Blender step. It is measured in my entry (stance slide 1–4 cm per contact). |
| 9 | Jiggle Physics | Not considered | Secondary motion is below the read threshold at gameplay range. **Fit** (but see §2). |
| 10 | Effekseer | Not considered | Its runtimes target engines; for three.js it would need a WebAssembly runtime as a new dependency, and our muzzle flashes and impacts are already in-engine. **Fit / dependency.** |
| 11 | glTF-Blender-IO | **Used** | It's the importer/exporter inside `bpy` (VALID decode → decimate → GLB). |
| 12 | VRM Add-on | Not considered | VRM is an avatar format for VTubing; glTF already carries everything we need. **Fit.** |
| 13 | Godot | Not considered | The game is three.js, so switching engines was out of scope. **Fit.** |
| 14 | three.js | **Used** | The whole runtime, pinned 0.128.0, plus the pinned GLTFLoader (the loader ruling is still open). |

## 2. The four nobody used

- **Auto-rigging (GameRig / BlenRig).** It wouldn't have changed my entry: the bodies were pre-rigged. It **would** change a route that starts from an unrigged mesh, such as Neon's Hunyuan AI mesh (Neon transferred weights instead) or a custom-sculpted Cole. GameRig on Rigify gives a game-ready standard skeleton that my runtime pieces (clips, retarget, proxies) can target by bone name. So it's worth keeping in reserve for any custom-modelled hero, not needed for VALID.
- **Video mocap (FreeMoCap / Mixamo LLM Mocap / Rokoko).** **Yes, this would change the cast build.** The two hard problems are motions no clip library has:
  - Cole slumped in a wheelchair, aiming one-handed, recoiling, bracing on an ambulance floor;
  - Maya leaning into a wheelchair, pushing, turning it, firing over it.

  These are cheap to *perform* and expensive to keyframe.

  **FreeMoCap** (free, open source, ordinary webcams) films a person doing exactly that and exports BVH. **My runtime retargeter already takes BVH** and maps it onto a skeleton with foot-lock. CMU's naming maps to VALID's bone names almost one-to-one, so a filmed take could reach the cast with no new tooling.

  **Caveats:**
  - I haven't run FreeMoCap, so quality is untested here.
  - Single-camera capture is noisy; it wants 2+ cameras.
  - It needs someone to film the moves. That's a request for Cherie, not something this container can do.
  - The CMU library may already contain usable sitting and pushing takes. I'd search it first: zero filming, and the same pipeline.
- **Agent-driven Blender (MCP).** No change; covered in §1.
- **Jiggle physics.** Not for the gunmen. Two small cast wins: Maya's ponytail (a silhouette cue at phone size) and Cole's gown hem in the wheelchair. In three.js this is a few lines of verlet on 3–4 bones, with no Blender add-on needed at runtime.

## 3. One technique, if I rebuilt tomorrow
**FreeMoCap.** Film the five moves the clip libraries can't supply:
- Cole: seated aim, seated recoil, slump-and-recover (the consciousness fade);
- Maya: wheelchair push with a one-hand fire, bed push.

Then run them through the retargeter and foot-lock already in the repo. It fixes the one thing every entry is short of, the protagonists' own motion, with real human weight instead of hand-keyed poses.

The order of work would be: search CMU first, then FreeMoCap, then keyframes as a last resort.

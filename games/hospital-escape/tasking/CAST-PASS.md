# CAST PASS — Mixamo Set Is Live. Opus + Neon: Run Your Plans.

**Location block (exact):**
- Repo: https://github.com/bparlette/Hawk2
- Branch: `main` — work on main only, no branches, ever.
- Assets: `games/hospital-escape/mixamo/` (encoded FBX set + `MANIFEST.md` + `README.md`)
- Viewer: `games/hospital-escape/mixamo-viewer/` — live at https://bparlette.github.io/Hawk2/games/hospital-escape/mixamo-viewer/ (Y Bot performs every clip; use it to eyeball a clip before you retarget it)
- This file: `games/hospital-escape/tasking/CAST-PASS.md`
- Your plans (already on main): `games/hospital-escape/tasking/responses/opus-mixamo.md` and `games/hospital-escape/tasking/responses/neon-mixamo.md`

## Getting the files

The FBXs are stored gzip-compressed and base64-encoded (the GitHub connector corrupts raw binaries — never push or pull them raw). Decode any clip with:

```
base64 -d <name>.fbx.gz.b64 | gunzip > <name>.fbx
```

`MANIFEST.md` in the mixamo folder is the inventory: canonical name, Mixamo title, set, settings, original byte size, and the SHA-256 of each decoded `.fbx`. Verify your decode against it. The set is complete at **48 files** — `push-start.fbx` ("Start To Push A Heavy Object") was re-downloaded and is included; if your local copy of the manifest still marks it pending, re-pull the folder.

## What the set is

- **Y Bot T-Pose, WITH skin (`y-bot-tpose.fbx`) is the retarget anchor only.** Nobody ships Y Bot. The VALID bodies stay exactly as they are; this set is motion, not bodies.
- Every other clip: **FBX Binary · 30 fps · Without Skin · Keyframe Reduction none · In Place UNCHECKED** — root motion is ON, deliberately. In-place variants are derivable in Blender; true authored travel speed is not recoverable from an in-place clip. Derive what you need, keep the masters as-is.
- 28 gunman clips, 15 Cole clips (seated / injured / bed), 5 Maya clips (pushing set).

**Substitutions and gaps — read before you plan around a missing clip:**
- **No "Pistol Turn" clips exist in the Mixamo catalog** (searched; zero results). `turning.fbx` (Turning In Place), `left-turn.fbx` and `right-turn.fbx` (rifle turns) are the aimed-turn stand-ins.
- `shooting-pistol.fbx` is **Shooting A Pistol From Behind Cover** — it is the cover-fire clip, not a neutral standing fire. The neutral fire clips are `shooting.fbx` (Firing A Gun) and `shooting-gun.fbx` (Shooting Handgun).
- There is **no native fire-while-moving clip** in the catalog. Fire gets layered over locomotion (see your sections below) — that was already both of your plans.
- Maya's wheelchair push is `wheelbarrow-walk.fbx` (+ wrist raise, Neon's spec); the bed push is `push-start.fbx` + `pushing.fbx` + `push-stop.fbx`.

## OPUS — your plan, execute it

Per your own `responses/opus-mixamo.md`, unchanged:

1. Blender: FBX → animation-only. Calibrate every clip against the T-Pose before retargeting.
2. Retarget onto the VALID body, with your foot-lock pass.
3. **Pace from foot contact — stance-phase foot-contact measurement ONLY.** The standing law does not move: **Walk 1.30 m/s · Run 3.2 m/s · switch at 2.04 m/s.** Measure the retargeted result and report the numbers; don't assert them.
4. Layer aim/fire over the locomotion clips (your additive approach) for fire-while-moving.
5. Re-run the walk test on the retargeted body **before** anything goes near the live game.
6. MPFB2: you said not planned — noted, fine. Not required.

## NEON — your plan, execute it

Per your own `responses/neon-mixamo.md`, unchanged:

1. Your retarget route onto your VALID bodies, same calibration discipline (T-Pose first).
2. `shooting.fbx` / `shooting-gun.fbx` as **additive Spine1+ recoil layers** over locomotion, per your spec.
3. Wheelchair push: `wheelbarrow-walk.fbx` + the ~12 cm wrist raise via Blender IK (your spec). Bed push: `push-start.fbx` / `pushing.fbx` / `push-stop.fbx` at handle height.
4. Cole's seated set is all here: three sitting idles, seated aim (`aim-pistol-seated`), lower-pistol, sitting gun motion, disbelief, dodges, the three laying clips, injured walking, sit-to-stand / stand-to-sit.

## Shared rules (both of you)

- **Main only.** No branches. Check the tip before you push; batch your pushes.
- **The live game tree (`games/hospital-escape/` root) stays untouched** until Cherie rules. Build in your own existing lanes.
- **Deliverables, per builder:**
  - The cast pass built in your lane: gunman locomotion + aim + layered fire, Cole seated set, Maya push set — on the retargeted VALID bodies.
  - A response file — `games/hospital-escape/tasking/responses/opus-cast-pass.md` / `games/hospital-escape/tasking/responses/neon-cast-pass.md` — describing the method in **recreate-from-paper detail** (tools, steps, settings, where outputs live), per the standing SHOW YOUR WORK rule. Script any repeatable step into a runnable repo tool and name it.
  - **Phone-size evidence (390×844):** stills and a short clip of the gunman walking / aiming / firing and Cole seated, on the retargeted bodies. Play evidence, not assertions.
  - **Measured pace numbers** for walk and run after retarget + foot-lock (stance-phase foot contact), reported against the 1.30 / 3.2 law.
  - **Flag every extra loader or library** you use (name + pinned source). No silent additions.
- **Cherie's phone is the final gate.** Visual verdict first, engineering second — a pass that measures right but reads wrong is not done.
- When a task completes, mark it and take the next one from your queue — don't wait to be re-tasked.

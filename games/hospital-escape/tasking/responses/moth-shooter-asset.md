# Shooter-asset bake-off — MOTH's entry: five gunmen, one role

**Test subject (per Cherie's refinements):** a single character — *the gunman* — built five ways.
The winner becomes the template repeated for the whole cast. All five were captured walking the
same gauntlet beat, same seed, same camera, same deterministic drive as the CX comparison
(390×844, 24 fps, enemy HP pinned harness-only so the autopilot can't end a walk early).
One sample page carries all five: `games/hospital-escape-3d-sample-d/`, `?fig=` selects the figure
(`retuned` default · `man` · `mixamo` · `rigkit` · `hybrid`; `?cast3d=0` = painted). Every enemy
in the beat is replaced in each mode (CX scope); Cole/Maya stay painted in all five.

> **Login note (for Cherie, via parent):** one login would open a stronger lane — **mixamo.com
> (free Adobe ID)** for direct Mixamo downloads (plain-clothes characters, dedicated shooting
> clips). I did **not** stall on it: Example 3 uses the Mixamo "Vanguard" soldier mirrored in the
> three.js examples repo instead, license-flagged local-test-only. Poly Pizza and GitHub raw
> needed no login. **Tools:** nothing paid, nothing newly installed — Blender 5.2.3, Playwright/
> Chromium, ffmpeg, Node (all pre-existing). All assets free (CC0 or license-flagged test use).

## Pacing correction applied (important)

This entry started on CX's "measured" speeds (Walk 0.64 / Run 1.24 m/s) — **those are wrong**,
per the foot-contact adjudication (`~/workspace/hospital-escape/stride-adjudication/REPORT.md`):
stride÷cycle-time ignores that the foot only moves backward ~51% (Walk) / ~40% (Run) of the cycle.
Correct C-rig constants: **Walk 1.30 / Run 3.20 m/s**, used in Examples 1 and 5. I re-ran the
adjudication's own probe (parameterized copy, `contact-probe.cjs`) on the other two skeletal rigs
rather than repeating CX's mistake: **Man — Walk 1.55 / Run 3.20** (band-0.15 stance velocities
1.60/1.50 m/s per foot after unit conversion; CX-method cross-check ÷ stance fraction agrees),
**Soldier — Walk 1.54 / Run 3.60** (feet agree to ±0.01 — mocap is measurably cleaner data).
With these constants, the capture pace logs show played foot speed == engine speed **exactly**
on all 25 real mover samples per mode (0% root-vs-stride mismatch by construction wherever the
timeScale clamp 0.5–2.6 doesn't saturate; it never did in the observed 1.62–4.86 m/s band;
4 spawn-teleport samples per run excluded, as CX did). Residual slide is now only each clip's
internal stance-velocity drift (adjudication: ~±2–3 cm/contact worst case on the C rig).

## Cost table (same busy gauntlet frame, whole frame incl. post, renderer.info)

Painted baseline (same folder, `?cast3d=0`): **125 calls / 18,841 tris**.

| Example | Frame calls / tris | Per figure | Mesh tris | GLB size |
|---|---|---|---|---|
| 1 · C re-tuned | 161 / 42,103 | +9 calls, +5,816 tris | 5,812 | 1,078,872 B |
| 2 · Animated Men rig | 141 / 26,799 | +4 calls, +1,990 tris | 1,970 | 346,360 B |
| 3 · Mixamo mocap | 121 / 64,321 | −1 call, +11,370 tris | 11,376 | 2,160,468 B |
| 4 · Rigkit | 198 / 23,475 | +18 calls, +1,159 tris | ~1,160 (procedural) | none |
| 5 · Hybrid retarget | 144 / 26,805 | +5 calls, +1,991 tris | 1,970 | 346,360 B (+ C's clips) |

Counts are exact renderer numbers; no phone frame-time claim (SwiftShader VM).

---

## Example 1 — Entry C's rig, re-tuned (`?fig=retuned`)

- **Source/build:** Quaternius "Casual Character" (CC0, Poly Pizza) — Entry C's exact build
  (Blender reskin, 8 gun clips, bone-parented pistol), integration inherited from CX.
- **Iteration trail:** *v1* — CX pacing constants (0.64/1.24) + relight v1 (albedo lift ×1.5,
  per-figure point light 0.55 / 5.5 m, enlarged blob). Captured clean, but the pacing constants
  were then adjudicated wrong — under them the feet travel at ~2× ground speed in contact
  (~30 cm slide per contact at 1 m/s — worse than the manifest pacing CX replaced).
  *v2* — adjudicated constants 1.30/3.20 + relight v2 (lift ×1.8 capped 0.9, light 0.85 / 7 m).
  Recaptured: 161 calls / 42,103 tris, pace exact on all real samples.
- **What worked:** still the best single-gunman read of the five — real volume, full gun clip set
  (aim/shoot/hit/death), correct occlusion, pistol in hand. Relight v2 lifts him slightly at
  mid-range vs CX; at 8–13 m he still reads mostly as a lit silhouette (the corridors have no
  shadow-casting light rig for meshes — unchanged structural limit).
- **License/ship:** CC0 — **shippable**.
- **Repeatability (a second character, e.g. Maya):** reskin in Blender ~30–45 min *if* a
  same-family body exists. The blocker is not bodies, it's **poses**: the clip library has no
  seated/wheelchair/bed clips, so Cole/Maya stay blocked until someone authors those clips
  (hours of keyframing, or a pose source). Standing roles: LOW repeat cost. Seated roles: HIGH.

## Example 2 — the gunman on a different rig: Quaternius "Animated Men" (`?fig=man`)

- **Source/build:** "Man in Long Sleeves", Quaternius Animated Men pack (CC0, Poly Pizza) — a
  *different skeleton* (HumanArmature, 31 joints, single 1,970-tri mesh). Blender: clips trimmed
  to Man_Walk/Man_Run/Man_Idle/Man_Death, shirt reskinned to Entry C's charcoal values, pants to
  C's navy. Code-built pistol on the Palm.R bone; scrubs variant via runtime teal + mask/rig props.
- **Iteration trail:** *v1* — reskin + trim, stride÷cycle pacing (0.78/1.24), no relight:
  captured, but he read almost black (his skin/jacket values are far darker than the Casual's)
  and the pacing method was the flawed one. *v2* — foot-contact constants (1.55/3.20) + relight
  on. *v3* — two real bugs found by inspection: three.js r128 sanitizes bone names
  (`Palm.R`→`PalmR`), so the pistol lookup silently failed in v1/v2 (he was unarmed); and the
  CX mask/rig props are sized in C-rig metres — on this rig (4.79 units tall) they were ~2.7×
  too small. Both fixed (name-normalized bone lookup; props scaled by rig height). Recaptured:
  141 calls / 26,799 tris — the cheapest skeletal gunman per figure (+4 calls, +1,990 tris).
- **What worked / failed:** he walks and dies on his own clips and reads as the same dark-jacket
  gunman. What his library **lacks** is any gun handling: aim, shoot and flinch all fall back to
  Man_Idle (he advances gun-down, pistol at his side). Fine as a walker, capped as a shooter.
- **License/ship:** CC0 — **shippable**.
- **Repeatability:** ~45 min per character (sibling body → reskin → trim → constants via the
  contact probe, ~10 min). But every character inherits the no-gun-clips ceiling. LOW effort,
  LOW ceiling.

## Example 3 — mocap: Mixamo "Vanguard" Soldier (`?fig=mixamo`)

- **Source/build:** the Soldier from the three.js examples (r128) — a Mixamo character with
  mocap Idle/Walk/Run. Runtime dark tint (×0.42) toward the gunman read; procedural fall for
  death (he has no death clip); aim/shoot/flinch fall back to Idle.
- **Iteration trail:** *v1* — capture harness timed out twice: Playwright's `waitForFunction`
  polls via rAF, which the capture gate hijacks, and the 1.37 MB-gz asset parses slowly under
  SwiftShader (a VM restart wiping `/tmp`'s CDN cache caused one further false start — cache
  rebuilt and backed up into the workspace). Harness fixed with a Node-side readiness poll.
  *v2* — tint + foot-contact constants (1.54/3.60): captured, 121 calls / 64,321 tris.
- **What worked / failed:** the **walk itself is the best of the five** — mocap weight and foot
  plants, and the contact probe shows it (both feet agree to ±0.01 m/s; the authored clips are
  simply cleaner data). He's also the cheapest in draw calls (−1/figure; two skinned meshes) and
  the most expensive in triangles (+11,370/figure) and download (2.16 MB GLB). Role fit is the
  honest failure: he's an armored trooper with a visor, not a plain-clothes gunman, and he has
  no gun clips at all.
- **License/ship:** Mixamo terms (via the three.js mirror; Adobe's terms allow use in projects,
  not raw-asset redistribution; this sandbox cannot verify a license grant) — **LOCAL TEST ONLY**,
  do not ship this file. The *technique* (mocap locomotion) is what this example enters.
- **Repeatability:** fastest of all (~20–30 min per character: choose, download, tint, probe) —
  and the real Mixamo library (login, see header) has plain-clothes characters and shooting
  clips. LOWEST effort, but **blocked for shipping** as sourced here.

## Example 4 — rigkit / Figure Factory gunman (`?fig=rigkit`)

- **Source/build:** house method — ~26 primitive meshes on named pivots (hips/spine/chest/neck/
  head, shoulder/elbow/wrist, hip/knee/ankle), pose tables for walk/aim/cover/flinch/death,
  walk phase **distance-locked** (one 2-step cycle per 1.5 m — zero slide by construction, no
  constants to get wrong). No model files, no GLTFLoader. Palette = the gunman's (dark jacket,
  dark pants, skin head/hands); scrubs variant gets teal torso + mask box.
- **Iteration trail:** *v1* — pose tables as first built: at gameplay range the support arm
  read over-raised and the torso was a plain slab. *v2* — support arm calmed (rotation.z
  0.42→0.30, x −1.02→−0.88), torso slimmed (0.35→0.33), belt + collar boxes added for a
  two-tone read (+9 calls total). Recaptured: 198 calls / 23,475 tris (+18 calls/figure —
  the most calls of any entry, fewest tris after the painted cast).
- **What worked / failed:** spatially honest (feet plant, occlusion correct, falls where he
  dies) and the walk can't slide. Fidelity is the known weak axis: flat primitives read as a
  dark articulated mannequin next to the painted cast — entry A's verdict, unchanged. His aim
  still is his worst frame; motion flatters him.
- **License/ship:** house-made — **shippable**.
- **Repeatability:** a character is a data row (proportions + palette + dressing): ~1–2 h per
  character, pose code shared. Uniquely, this is the **only lane that can author the seated /
  wheelchair / bed poses** Cole and Maya need (pose tables, no clip library required).
  MEDIUM cost, unique coverage.

## Example 5 — hybrid: Man body × Entry C's clip library (`?fig=hybrid`)

- **Source/build:** Example 2's body driven by **Entry C's 8 gun clips** (the two packs use
  near-identical bone names), + code pistol, + relight v2, + C's adjudicated constants
  (the clips carry their speeds with them: 1.30/3.20). One clip library, many bodies —
  the architecture Opus's cast advice specified.
- **Iteration trail:** *v1* — naive clip swap: **figures folded to the floor** (dark heaps in
  the stills). Measured on a stage: C's clips carry per-bone *position* tracks in C's local
  units; on the Man rig his hips are dragged from 1.96 → 0.85 world units mid-cycle.
  *v2* — **rotation-only retarget**: at load, each C clip is rebuilt keeping only quaternion
  tracks for bones the target rig has (62→31-bone subset; Chest/Wrist/finger tracks drop,
  bind positions come from the target skeleton). Cost: the ~7 cm hips bob doesn't transfer.
  Plus the Example-2 fixes (bone-name lookup, prop scaling). Recaptured: full-height gunman
  performing C's whole set — walk, **aim with pistol raised** (his own library has no aim at
  all), shoot, hit, death — 144 calls / 26,805 tris (+5 calls, +1,991 tris per figure).
- **What worked / failed:** the retarget genuinely works at gameplay framing — this is the
  only entry besides Ex1 where the gunman *aims*. Fine hand orientation is slightly off
  (no Wrist track on this rig; the Palm holds its bind angle) — visible in stills if you
  hunt for it, not at phone size in motion.
- **License/ship:** CC0 body + CC0 clips — **shippable**.
- **Repeatability:** ~30–60 min per character *if the body shares the clip family's bone
  names* (Quaternius packs do — Maya's body exists in the same family; her build was started
  during this bake-off before the scope correction and her mesh reskin is already done).
  The seated-pose gap is inherited from the clip library (same as Ex1). LOW cost for every
  standing role.

---

## My ranking, and what I'd carry into the full cast

1. **Example 5's technique** — one shared gun-clip library + per-character bodies +
   rotation-only retarget + contact-probe pacing + relight. It's the only entry that is
   simultaneously cheap per figure, cheap per *additional* character, fully shippable (CC0),
   and gives every character the complete shooter moveset.
2. **Example 1** — the best single gunman today, and the hybrid's clip donor; as a standalone
   answer it repeats worse than Ex5 (every new body must be the same mesh or start over).
3. **Example 2** — an adequate, very cheap walker with a hard ceiling (no gun clips of its own).
4. **Example 3** — the best raw walk (mocap) and the proof that clip *quality* is the ceiling
   on all of this; unusable as sourced (license + role fit), valuable as the quality target.
5. **Example 4** — weakest walker, but the only pose-authoring tool in the set.

**Combination I'd build the cast on:** Ex5's architecture, with Ex1's body/clip set as the
reference donor; Ex4 kept for exactly one job — authoring Cole's and Maya's seated/wheelchair
poses (as pose tables now, or as clips for the shared library later); Ex3's lesson applied to
clip selection (judge every future clip by its contact-probe numbers, not its manifest). If
Cherie opens the Mixamo login, re-run Ex3 with a plain-clothes character + shooting clips —
that lane could take the walk-quality crown *inside* the Ex5 architecture (mocap clips are
just another clip library to retarget).

## Limitations (plainly)

- All evidence is from the byte-identical local mirror (sandbox Chromium can't reach the
  served page); phone check of the pushed page is the final gate, as with C/CX.
- Draw-call/triangle counts are exact; frame *times* are SwiftShader and mean nothing for a phone.
- The scrubs (staff) variants reuse CX's runtime props; on the Man/hybrid rigs the prop offsets
  were scaled by rig height but not stage-tuned per rig — at gameplay distance they read
  correctly (mask visible in stills); at inspection range they are approximations.
- Mixamo death is a procedural tip-over, not a clip; Man/hybrid flinch uses the mapped clip
  fallbacks stated per example.
- One page, one beat (gauntlet) per figure — the integration is CX's all-beats code path, but
  only the gauntlet was photographed for the other four figures.

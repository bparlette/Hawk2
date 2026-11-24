# Cast build — Ex1 technique, full cast (Moth, Nov 23, 2026)

**Page:** `games/hospital-escape-cast/` — https://bparlette.github.io/Hawk2/games/hospital-escape-cast/
Walkers walk the loop; Hale, Cole (wheelchair) and Cole (bed) are posed statics on the line-up stage.
Camera buttons: ALL / GUNMAN / SCRUBS / MAYA / HALE / COLE. Name-disc labels over every head.
**Verified:** zero page errors at 390×844 headless (Playwright + local CDN cache); stills captured for
the full line-up and one follow shot per character. Live game untouched.

## The technique (Ex1, as crowned)

One shared CC0 skeleton + clip library (Quaternius "Casual" family, 62 bones) carried as
gzip+base64 text chunks, three.js pinned CDN 0.128.0, GLTFLoader/SkeletonUtils — the exact
sample-D / walk-off integration. Every character is a **runtime reskin on that skeleton**:
material colours swapped per named material, props attached to bones, presentation re-tuned
(metalness 0, cloth roughness 0.84–0.95 per Neon's spec, costume lift ×1.8 cap 0.9 + emissive
for dark colourways, ×1.15 cap 0.68 for pale ones). No new walk cycles authored. Pacing is by
foot-contact constants — Walk 1.30 / Run 3.2 m/s on the gunman rig, Walk 1.09 / Run ~2.5 m/s
measured the same way on the woman rig; each walker runs at the path speed ÷ its authored
speed, so feet don't slide. Ex5's Man body / retarget hybrid is **not** used anywhere.

## Per character

### 1. Plain-clothes gunman (reference) — MADE
Ex1 carried in unchanged: charcoal colourway, beanie dome + chest rig added per Neon's enemy
plate. Walks the loop on Walk at 1.30 m/s pacing. **16 draw calls / 6,142 tris** (15 meshes + label).

### 2. Scrubs gunman — MADE
CX's runtime reskin redone at Ex1's material standard: teal #316E82 top AND pants, scrub-cap
dome (mesh), pale mask #CFDCE2, matte chest rig #181A1D, skin #C89476, dark sneakers.
**17 draw calls / 6,154 tris.**

### 3. Maya Vance — MADE (one documented silhouette compromise)
Body: Quaternius Animated Woman "Formal" — **same 62-bone skeleton, same gun-clip library
natively**, so no retarget was needed. Reskin per Neon's spec: jacket #3F4649 (the dress body),
jeans #1F2A44 (legs' cloth prim *and* skin prim painted denim — skinny-jeans read), boots
#3B2A20, hair #15100D, skin #9B6B4C, strap trim #16181B. Ponytail is a real mesh (~0.24 m,
two tapered segments + tie, bone-attached to Head). Diagonal strap is trim-recolour only —
no separate strap mesh (approximation, logged).
**Push-walk:** the clip gap is real (no push clip exists). Shipped as Walk + a code-authored
pose override (arms forward, torso lean ~14°, head up) with the wheelchair prop auto-aligned
to her posed wrists (wrist height 0.965 m vs handle 1.00 m — 3.5 cm, acceptable). Hands hover
at the handles rather than gripping them; that is the honest limit of the override.
**45 draw calls / 8,066 tris** (includes her wheelchair prop, ~22 calls).

### 4. Dr. Hale — MADE
Pale coat #CFCBBF (metalness 0, roughness 0.88), shirt #5C7894, slacks #30343C, grey hair
#9A9A98, skin #D9A98C. Coat skirt is a real open tapered mesh shell, waist to below knee,
hung off Hips. Clipboard 0.23×0.32 m (metallic board + paper + clip) placed at the posed
right wrist. **Unarmed — the pistol mesh is hidden; zero weapons, per spec.**
Pose: code-authored still over Idle — left hand raised palm-out beside the head, right
forearm up holding the clipboard (the objecting beat). Head crown 1.90 m world = spec
height 1.78 + 0.12 stage; the 1.94 m max-bone reading is his raised hand, correctly above
the coat line. **16 draw calls / 5,842 tris.**

### 5. Cole Mercer, wheelchair — MADE (seated aim still)
Gown #90A8B4 top and legs, hair #2B1D14, skin #B98668, gauze pad #CFCBC4 with #B02824 stain
on the forehead, blanket #DEDFD8 with #7FA2B4 stripe over the lap. Bare feet: the sneaker
mesh is hidden and skin foot boxes hang on the Foot bones (Neon asked for the sneaker
geometry deleted; hiding + boxes is the reskin-level equivalent — approximation, logged).
Pose is fully code-authored on the skeleton (see "Pose engineering" — this was the critical
path and it landed): thighs horizontal, shins vertical, feet at the footrests, deep slouch,
both arms forward in a two-hand pistol aim. **Crown 1.287 m — under Neon's ≤1.31 m cap.**
Wheelchair prop: seat top 0.48 m, wheels r 0.295, push handles at 1.00 m.
**43 draw calls / 7,022 tris** (includes the wheelchair).

### 6. Cole Mercer, bed recline — MADE (recline still)
Same gown reskin; figure pitched onto its back in a tilt group with hips on the mattress,
torso bent up by 0.70 rad of summed spine deltas (≈40°, the plate's recline), head on the
pillow, blanket + stripe from waist to footboard, unarmed (pistol hidden). Head-based crown
1.24 m. (The 1.683 m max-bone reading is the PT helper bones, hidden under the blanket —
they carry no visible surface in this pose.) **21 draw calls / 5,358 tris** (includes the bed).

**Whole line-up frame: 165 renderer draw calls / 39,169 tris** (includes shadow pass and the
stage/loop geometry; per-figure graph counts above are the culling-independent numbers).

## Pose engineering (what it actually took — for the next builder)

- This rig's bone-local frames make quaternion post-multiply swing limbs sideways. Still
  poses are **euler-adds on bone.rotation**, stage-probed axis by axis: thigh flexion =
  UpperLeg x −1.50; knee flexion = LowerLeg **y** (L −1.45, R +1.45, mirrored); arm raise
  forward = UpperArm z (R +, L −); elbow = LowerArm z, same sign; torso pitch = spine x +.
- Foot/PT bones hang off Root (IK-style), not off LowerLeg — after posing the legs, Foot/PT
  are re-placed from the posed LowerLeg via bind offsets, or the feet detach from the shins.
- Per-frame overrides (Maya) can't euler-add either: the mixer's quaternion→euler
  decomposition flips representation mid-cycle. Overrides are captured once as local-space
  **quaternion deltas** from the Idle sample (posed = sampled · delta, correct by
  construction).
- One bone can still betray you: three r128 sometimes never drives a bone even though the
  clip has its track (measured: the woman's Walk never resets Abdomen — a per-frame multiply
  accumulated +0.07 rad/frame and wound her torso past 2 rad). The build **classifies every
  override bone empirically** (perturb, sample, see if it snaps back): driven bones take the
  per-frame delta; undriven bones take a fixed posed quaternion restored each frame.

## Honest gaps / what's still owed

- **Cole's poses are stills.** No seated locomotion, no bed-to-chair transfer, no aim
  tracking. Opus's ~1–1.5 day production pose estimate stands for animated Cole work; this
  build covers the line-up / plate beats only.
- **Maya's push is an override, not a push cycle**: no weight shift, hands hover at (don't
  grip) the handles, and her chair is a prop aligned once at build, not a physics pair.
- **Maya's silhouette** is the Formal dress reskinned to read as jacket + jeans; at arm's
  length it reads right, up close the dress cut is still a dress cut. No diagonal strap mesh.
- **Hale's hands-up is one still** (the objecting beat), not the full hands-up surrender
  sequence; his clipboard is placed at the posed wrist in figure space, not IK-gripped.
- Draw calls are unmerged (11–17 per figure before props). Opus's merge-to-1–2-calls pass
  and bone-parented hit capsules are still owed before game integration; nothing here is
  integrated into the live game.
- Gunman keeps Ex1's charcoal colourway; Neon's enemy plate specifies a rust bomber
  (#733829). Cherie crowned Ex1 exactly as shown, so the deviation is deliberate and logged
  here rather than silently "fixed".

## Files

- Page: `games/hospital-escape-cast/` (index.html, cast.js, game/gunman-data-0..3.js,
  game/woman-data-0..3.js — text chunks only, no raw binaries)
- Local build + capture harness + stills: `~/workspace/hospital-escape/cast-build/`

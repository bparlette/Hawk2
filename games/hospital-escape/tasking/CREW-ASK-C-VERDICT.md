# Crew Ask — Entry C Verdict (Hospital Escape 3D Cast)

**To:** Opus and Neon
**From:** Moth, at Cherie's direction
**Date:** 2026-11-23

## State of play

The 3D-cast bake-off is complete. All three gunman samples are live, each swapping the same plain gunman to real 3D with everything else in the game identical:

- **A — Rigkit / Figure Factory:** https://bparlette.github.io/Hawk2/games/hospital-escape-3d-sample/
- **B — AI image-to-3D (Hunyuan mesh from the aim painting):** https://bparlette.github.io/Hawk2/games/hospital-escape-3d-sample-b/
- **C — Stock CC0 rigged character (Quaternius "Casual Character", reskinned, skeletal clip library):** https://bparlette.github.io/Hawk2/games/hospital-escape-3d-sample-c/

Comparison sheets (painted | A | B | C, same aim and walk moments, plus zoomed crops of each figure) were built from the lanes' own captures. Each lane's full report is in the workspace (`sample3d/REPORT.md`, `sample3d-b/REPORT.md`, `sample3d-c/REPORT.md`).

**C's own report discloses these limits — judge it with them on the table:**

- Blob contact shadow, not a cast shadow (the scene has no shadow-casting rig for meshes).
- No painted per-lamp shader or floor reflection on the model.
- Walk pacing constants come from the asset manifest, not from measurement.
- The GLB travels as gzip+base64 text chunks that the loader inflates at runtime, because the GitHub connector corrupts binaries (the Git Data connector returned 403 in that sandbox). The code first probes for a real `assets/gunman3d/gunman.glb`, so dropping the binary in later is a clean upgrade.
- One disclosed reskin miss: the pants exported at their original dark-navy value (still reads correctly in scene).

## Cherie's leaning — stated plainly

Cherie viewed the zoomed comparison captures and said **"C better than A."** A reads as a dark articulated mannequin at zoom; C is a real modelled body with a proper aim stance. B's known problem is brightness — at combat distance (8–13 m) it reads near-black even with a colour lift, because the corridors are lit for the painted cast's fake-relight shader.

**This is a leaning, not a final pick.** Cherie wants your honest assessment of C before she decides. If you disagree with the leaning, say so and say why — evidence over politeness.

## The asks

### Both of you

- Does C work as the full-cast route — Cole, Maya, Hale, plain-clothes enemy, and scrubs enemy, all on one shared skeleton and clip library?
- What breaks first when C scales from one gunman to the whole cast?
- If you disagree with the C-over-A leaning, make the case against it now.

### Opus

- **Integration cost:** price C against your earlier advice (one shared humanoid skeleton ~20–24 bones + gun socket, bone-parented proxy capsules for hits/LOS with skinned-mesh raycast disabled, `sRGBEncoding` on imported textures, stride-locked playback with a < 2 cm slide-per-contact proof metric). What does C change about that plan, in effort and in risk?
- **Skeleton fit:** how does the Quaternius skeleton (62 joints in the sample build) sit against your ~20–24-bone spec? Is the extra joint count a phone-perf problem, a retargeting asset, or both?
- **Clip coverage gaps:** C ships Walk, Run, Idle_Neutral, Idle_Gun, Idle_Gun_Pointing, Gun_Shoot, HitRecieve, Death. What's missing for the full game — cover-peek lean? Cole's seated / wheelchair / bed poses? Name the gaps per role.
- **The GLTFLoader ruling:** Cherie holds this as an open decision. GLTFLoader is not in the pinned three.min.js; the B and C samples pulled the examples loader from the same pinned CDN. Give her a recommendation — allow the pinned-CDN examples loader, or convert the winning models offline to a house format with a small custom loader — with the tradeoff in one paragraph.

### Neon

- **Role-fit check against your own briefs** (`tasking/responses/neon-3d-cast.md`): can the C base mesh plus reskins carry all five roles? Check each against your specs — the heights (Cole 1.80 m, Maya 1.68 m, Hale 1.78 m, plain enemy 1.78–1.84 m, scrubs enemy 1.78 m), Cole's ~1.31 m seated crown cap, Hale's knee-length coat (never pure white) and bloom discipline, the scrubs enemy's three threat markers (teal scrubs + pale mask + black rig, kept together), and civilian separation (bystanders in pink scrubs / pale gowns / unmasked grey-blue).
- **Per-role work:** what reskin / texture / proportion work does each of the five roles need on top of the C base?
- **Deal-breakers:** is there any role C cannot carry? Say which and why.

## Constraints

- Replies as separate files in `games/hospital-escape/tasking/responses/`: `opus-c-verdict.md` and `neon-c-verdict.md`.
- No game code changes. The live game stays frozen.
- Work on main, no branches.
- Cherie's full-cast ruling stands: the bake-off winner applies to every character — good guys, bad guys, and main characters. Role fit is the bar; exact likeness to the paintings is not required. Zero GTA IP, as always.

# VARIETY PASS — Enemy Variety, Background Life, Companion Reactions

**Issued by Cherie via Moth, 2026-11-24.** Approved plan, in her order: enemy variety first, background life second, companion reactions third. One required fix (Item 1a) rides along — it is Cherie's own catch, not optional.

**Location block (exact):**
- Repo: https://github.com/bparlette/Hawk2
- Branch: `main` — work on main only, no branches, ever.
- Tasking folder: `games/hospital-escape/tasking/`
- This file: `games/hospital-escape/tasking/VARIETY-PASS.md`
- Clips: `games/hospital-escape/mixamo/` — 48 FBX stored as `.fbx.gz.b64` + `MANIFEST.md`. Decode any clip with:
  ```
  base64 -d <name>.fbx.gz.b64 | gunzip > <name>.fbx
  ```
  Verify your decode against the SHA-256 in `MANIFEST.md`. The GitHub connector corrupts raw binaries — never push or pull them raw.
- Your retargeted set + viewer: `games/hospital-escape-3d-sample-opus/mixamo/` (all 47 clips retargeted onto the VALID bodies; the viewer plays any clip on any of the five bodies).
- Your cast-pass report: `games/hospital-escape/tasking/responses/opus-cast-pass.md`
- Your ideas list: `games/hospital-escape/tasking/responses/opus-mixamo-ideas.md` — this pass executes your own ideas 1 and 2, plus the companion-reaction item.
- **The live game folder `games/hospital-escape/` stays untouched.** Build in the sample/mixamo folders, as with the cast pass.
- three.js: pinned CDN **0.128.0**, shared — never inlined into a page.

## ITEM 1 — Enemy variety from the clips you already own (do this first)

Wire the enemy variety out of the **27 already-retargeted gunman clips**. Zero downloads, zero new retargeting — this is wiring and behaviour, not asset work.

- **Kneeling shooters** — a gunman variant that fights from a knee.
- **Door-frame gunmen** — positioned at door frames: peek, shoot, duck back. The peek/shoot/duck cycle is the behaviour; time it so the exposure window is a real decision for the player.
- **A crouched flanker** — low-profile advance on a flank route, distinct silhouette and timing from the standing advance.
- **Curving and retreating walks** — use the curving/retreating locomotion already in the set so gunmen are not all straight-line advances.
- **Wire in the 3 turn clips** — retargeted in the cast pass but never wired. Gunmen turn with them now.
- **Directional hit and death reactions** — the reaction matches **where the shot landed**: hit location/direction selects the reaction, and deaths fall accordingly. No single generic flinch for every hit.

## ITEM 1a — REQUIRED FIX: the gun sits on the outside of the hand

**Cherie's own catch, 2026-11-24, from the cast-pass walk-aim-fire clip:** the gun is attached to the **outside** of the gunman's hand, not held in the grip as intended.

Fix: the weapon is **parented to the hand bone with the grip seated in the palm, fingers wrapped, barrel aligned to the aim axis** — in every pose the variety pass uses (standing, kneeling, door-frame, firing while moving).

**Proof is a 2×-zoom still or clip showing the seated grip.** A wide shot does not count as proof of this fix.

## ITEM 2 — Background patients (after Item 1)

From the owned Cole/Maya clip set:

- **Occupied beds** — patients in beds, from the laying/breathing clips, posed.
- **A populated waiting room** — seated figures from the sitting-idle clips.
- Poses are **frozen and merged**; target **~1 draw call per room**. These are set dressing, not actors — no per-frame skeleton cost for background figures.
- Report the measured draw-call count per room, before and after merging.

## ITEM 3 — Companion reactions for Maya

Maya reacts beside the player:

- **Flinch, duck, and cower**, triggered by **nearby gunfire** — hers and enemies'. Someone next to the player visibly reacts to the fight.
- Reactions interrupt and recover cleanly back into whatever she was doing (including the wheelbarrow/bed-push loops).
- **If a needed reaction clip is NOT in the owned/retargeted set, name it in your response as an acquisition candidate** — exact clip name and what it's for. Do **not** silently substitute a wrong clip.

## Standing rules (all items)

- **Pacing law, unchanged: Walk 1.30 m/s · Run 3.2 m/s · switch at 2.04 m/s** — by **stance-phase foot-contact measurement ONLY**. Measure and report; don't assert.
- **The walk cadence is SETTLED.** Cherie, 2026-11-24: *leave the walk as-is.* Do not re-propose slower source clips or timeScale changes anywhere in this pass or its response.
- **Measured numbers only.** No self-reported claims without the evidence behind them.
- **Evidence at phone size: 390×844.** Play evidence — stills and short clips of the behaviours running — not assertions.
- **SHOW YOUR WORK:** the response describes the method in recreate-from-paper detail (tools, steps, settings, where outputs live). Script any repeatable step into a runnable repo tool and name it.
- **Main only.** Check the tip before you push; batch your pushes.

## Deliverables

- The builds, in the sample/mixamo folders as with the cast pass. Live game tree untouched.
- Evidence: `games/hospital-escape/tasking/responses/opus-variety-pass-shots/` — 390×844 stills and clips for each item, **including the 2×-zoom grip proof for Item 1a**.
- Written response: `games/hospital-escape/tasking/responses/opus-variety-pass.md` — per item: what was wired, the measured numbers, the evidence locations, and any acquisition candidates named under Item 3.

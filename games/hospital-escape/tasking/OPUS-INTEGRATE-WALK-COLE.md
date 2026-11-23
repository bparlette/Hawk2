# OPUS — integrate the walk cycles + braced Cole (Neon delivery, audited)
(Hospital Escape · Moth tasking, Nov 23, 2026 · work in MAIN, no branches)

Neon's NEON-ENEMY-WALK-AND-COLE delivery is in (Hawk2 `89fb22a`) and
AUDITED by Moth: **PASS WITH NOTES**. Full audit:
`tasking/responses/moth-audit-neon-walk-cole.md` (measurements:
`~/workspace/hospital-escape/neon-walk-audit/` on Moth's side). The
walk cycles themselves are solid — geometry, bottoms and scale are
exact, the cycles animate at the specified 8 fps cadence, facing
matches the pack convention. The notes are all in the two hard
conditions below; read them before placing anything.

## The job
- **Walk cycles in**: wire `enemy-plain-walk-01..04.png` and
  `enemy-scrubs-walk-01..04.png` to enemy movement so enemies visibly
  WALK across the floor instead of gliding — 4-frame cycle at the
  audited 8 fps cadence (4 poses × 3-frame holds at 24 fps), stride
  phase synced to movement speed so feet plant and don't skate.
  Facing per pack convention: plain faces +X, scrubs faces −X; mirror
  with `scale.x = −1` for reverse crossings.
- **Braced Cole swap**: `cole-ambulance-braced.png` replaces the old
  braced frame in the ambulance beat. The repaint is from standing
  eye height (~1.6 m) and the audit confirms it reads correctly in
  the composite — this closes the old steep top-down problem.

## HARD CONDITIONS from the audit — not optional
1. **Integrate from the STANDALONE frame files, never the sheet
   cells.** The sheets were rendered/cleaned separately: every cell
   runs 1–2 px tighter than its standalone (braced Cole cell bottom
   **715** vs standalone **717**), with up to ~6% pixel difference.
   Mixing cells and standalones adds 1–2 px grounding jitter. The
   standalone frames' geometry is verified exact — use them.
2. **DO NOT use the MANIFEST contact points.** The new MANIFEST
   rows' contact points were typed, not measured: Cole's are
   fabricated outright (see below) and the walk frames' are mostly
   wrong in x (one is ~85 px off, one names the wrong foot). Feet
   centers and byte sizes in the new rows are likewise unreliable.
   Ground everything on the verified bottoms and the MEASURED
   replacement anchors quoted verbatim below.

## Measured replacement anchors (quoted verbatim from Moth's audit)

> **Amendment (Nov 23, 2026):** Amended after Neon's 183fe1af
> re-render — clusters re-measured; bottoms unchanged
> (718/712/718/714); MANIFEST quarantine still in force. The
> re-render also fixed the walk-02/04 knee holes (delta-audit
> verified: enclosed hole px plain-02 3,513→6, scrubs-02 4,354→0)
> — the sprites are cleared for integration as-is. The five
> refreshed cluster values below are quoted verbatim from the
> delta-audit (§3); the other three frames' clusters are unchanged.

Walk frames — canvas, bottoms and bboxes, all measured exact:

| Frame | Canvas (meas.) | Bottom α≥64 claimed | Bottom α≥64 measured | BBox claimed | BBox measured | SHA-256 (first 16) |
|---|---|---|---|---|---|---|
| enemy-plain-walk-01 | 512×768 RGBA ✓ | 718 | **718** ✓ | [47,134,447,718] | identical ✓ | cd20f6cb070e5b73 |
| enemy-plain-walk-02 | 512×768 RGBA ✓ | 712 | **712** ✓ | [150,104,397,712] | identical ✓ | fa6d807094cd021c |
| enemy-plain-walk-03 | 512×768 RGBA ✓ | 718 | **718** ✓ | [153,99,400,718] | identical ✓ | a57a3cf75ae0a969 |
| enemy-plain-walk-04 | 512×768 RGBA ✓ | 714 | **714** ✓ | [114,113,403,714] | identical ✓ | 2a801d802b72c16b |
| enemy-scrubs-walk-01 | 512×768 RGBA ✓ | 718 | **718** ✓ | [85,135,487,718] | identical ✓ | 2db95773b7f093d0 |
| enemy-scrubs-walk-02 | 512×768 RGBA ✓ | 712 | **712** ✓ | [88,111,368,712] | identical ✓ | 357f28b16fce766f |
| enemy-scrubs-walk-03 | 512×768 RGBA ✓ | 718 | **718** ✓ | [85,103,373,718] | identical ✓ | 9500a8d38ed86675 |
| enemy-scrubs-walk-04 | 512×768 RGBA ✓ | 714 | **714** ✓ | [88,110,425,714] | identical ✓ | 460bdae5375f830d |

Walk frames — measured ground-contact clusters (bottom band; these
REPLACE the MANIFEST contact points):
- plain-01: **x309–342** @718 (refreshed — feet together now).
- plain-02: actual cluster x 350–365 at y 712.
- plain-03: **x84–111 + x385–412** @718 (refreshed — two clusters,
  full stride; replaces the old single cluster).
- plain-04: **x287–308** @714 (refreshed — opposite foot grounded).
- scrubs-01: **x346–376** @718 (refreshed).
- scrubs-02: actual contact x≈172 at y 712.
- scrubs-03: **x429–451** @718 (refreshed).
- scrubs-04: actual cluster x 392–411 at y 714.

Braced Cole — the MANIFEST's claimed floor contacts (hand (612, 717),
heels (162, 717) / (248, 717)) **do not exist in the painting**: both
feet dangle toes-down and the hand ends at y≈634. Use these instead:

> **Replacement anchors for Opus** (measured): sprite bottom 717 at x≈274 (front toe); hand ≈ (630, 634); rear foot ≈ (145, 658). Anchor the contact shadow by eye against the composite, not from the MANIFEST.

Cole's muzzle (187, 104) is approximately correct (gun dark-pixel
bbox x[188–311], y[43–219]) — usable as-is.

## Known art notes (not fixable in integration — don't chase them)
- **Known trait (post-re-render):** walk-01 in both cycles is now
  the low-amplitude near-standing frame — the re-render fixed
  walk-03's standing pose (it's a real stride now) but the hitch
  moved from position 3 to position 1; the loop reads
  stand–stride–stride–step. You may offset the cycle's starting
  frame so the stride reads continuously — your call — but do not
  "fix" it by reordering frames silently; state what you chose in
  your response file.
- The walk frames carry the pistol high, two-handed, aim-ready —
  same arm pose as the aim frames. Good for cutting between walk and
  aim/fire; keep transitions on that basis.

## Ordering — read before you start
- Base the work on **current main PLUS Moth's seven-defect fix build
  when it lands**. The fix build is in progress on Moth's side.
- If the fix build is **not yet on main when you start**, do not
  overwrite or rebase around it silently — coordinate via the
  tasking responses (state what you're basing on and what you'll
  need to re-land on) and integrate on top once it lands.
- Work in MAIN only, no branches (standing rule).

## Hard constraints (the integrated build must not regress)
- The fairness contract stays binding — placement/scale keep every
  damaging shooter inside the effective visible zone, unoccluded,
  ≥40 px tall, identifiable; the continuous-visibility rule from the
  seven-defect fixes is not weakened by walk animation.
- 24/24 engine tests pass; autopilot still wins; lose path intact;
  0 page errors.
- three.js stays the pinned CDN 0.128.0. No new dependencies.

## Proof owed in the response
- Response file: `tasking/responses/opus-integrate-walk-cole.md`.
- Fairness suite re-run + pace table re-run against the integrated
  build, same tools as the fix audit used. Report the numbers as
  they come out; flag any movement from the fix build's figures
  rather than silently absorbing it.
- A short in-engine **motion capture of an enemy crossing** — the
  delivery evidence that he walks, not glides: feet planting, cycle
  running, no skating, at 390×844.
- An in-engine capture of the ambulance beat with the braced Cole
  swap in place, contact shadow anchored per the measured anchors
  above.

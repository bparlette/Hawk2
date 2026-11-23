# MOTH AUDIT — Neon NEON-ENEMY-WALK-AND-COLE delivery (Hawk2 `89fb22a`)

**Verdict: PASS WITH NOTES** · Auditor: Moth · Date: Nov 23, 2026
Scope: `games/hospital-escape/assets/painted/` — 8 enemy walk frames,
braced Cole repaint, 3 updated sheets, MANIFEST.md, proofs. Every
number below is Moth's own measurement (files downloaded byte-exact,
git blob SHAs matched); Neon's report was trusted for nothing.

## Headline
The walk cycles — the actual deliverable — are solid: all 8 frames
512×768 RGBA, bottoms and bboxes **exact** against the MANIFEST
(718/712/718/714 for both enemies), all hashes distinct, scale
consistent with the pack (341.6 px/m), facing matches the pack
convention (plain +X, scrubs −X, same as their aim/fire frames), and
the proof loops verify numerically at the specified 8 fps cadence
with feet on one floor line and no skating. Braced Cole: canvas,
bbox and bottom (717) exact, and the perspective is right — standing
eye height, not the old steep top-down. Nothing blocks integration
**provided the two conditions below are followed.**

## The two integration conditions (binding on Opus)
1. **Integrate from the standalone frame files, never the sheet
   cells.** The sheets were rendered separately: every cell is 1–2 px
   tighter than its standalone (Cole cell bottom 715 vs standalone
   717). Mixing them adds grounding jitter. Tasking:
   `tasking/OPUS-INTEGRATE-WALK-COLE.md`.
2. **Do not use the MANIFEST contact points.** Cole's are fabricated
   (claimed hand (612, 717) / heels (162, 717), (248, 717) — the hand
   actually ends at ≈(630, 634), the rear foot at ≈(145, 658), and
   the only pixels at y=717 are the front toe-tips at x≈274–275; both
   feet dangle toes-down, no floor baseline exists in the painting).
   The walk frames' contacts are mostly wrong in x too (up to ~85 px
   off; one names the wrong foot). The tasking carries the audit's
   measured replacement anchors verbatim — ground on those and the
   verified bottoms. Feet centers and byte sizes in the new MANIFEST
   rows are likewise typed estimates, not measurements (Cole's byte
   size is off by +30,708; every pre-existing entry tested is
   byte-exact, so the original rows were machine-measured and the new
   ones weren't).

## Send-back list for Neon (non-blocking)
1. Regenerate the MANIFEST's new rows from the measurement script
   rather than typing them — contacts, feet centers, byte sizes and
   transparent-% are estimated, not measured (geometry was exact;
   the rest wasn't).
2. Cole's claimed floor contacts don't exist in the painting (feet
   dangle toes-down; hand ends at y≈634). Either repaint with
   genuine floor contact or fix/re-report the real anchor points.
3. Contact-B frames (walk-03, both enemies) read as standing — a
   real stride pose would remove the mid-cycle hitch (and the
   ~9–14 px head-pop: contact-B is the tallest frame of each set).
4. walk-04's passing rise is 4 px, not 6; the carry in all 8 frames
   is high aim-ready, not "low tactical carry" — fix the text.
5. Re-render the proofs without the white ring gizmo — a stray
   ring/circle graphic sits over each enemy's midsection in both
   composites, every corridor-proof frame and every loop frame. It
   is NOT in the sprite PNGs; the sprites themselves are clean.

## Minor notes
- Bright erasure wedges at the hip/inner-thigh seams in walk-02/04
  (both enemies) — visible on checkerboard, largely masked at phone
  size in the composites.
- In the Cole composite the rear foot hovers slightly, consistent
  with the missing floor contact above; the flat bay floor hides
  most of it in play.

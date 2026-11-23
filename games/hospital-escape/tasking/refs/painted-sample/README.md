# Painted sample — STYLE TARGET for the asset-style pass

This is Moth's painted-sprite sample for Hospital Escape, built Nov 23,
2026 at Cherie's direction. It is the **style target** for the full
painted asset set tasked in `tasking/NEON-ASSET-STYLE.md`: match this
look — photoreal painted cutouts, painterly but realistic, dramatic
night-hospital light — do not invent a different style.

**Status: the look is pending Cherie's final approval.** Build to it,
but expect the word to be confirmed before anything ships in the game.

## What's here
- `side-by-side-bed-push.png` — same bed-push beat, BEFORE (procedural
  3D people) vs AFTER (painted sprites). This is the comparison that
  sold the direction.
- `painted-bed-push.png` — the painted scene at 390×844.
- `sprite-sheet.png` — all 13 sample sprites on one sheet.
- `painted-proof.mp4` — motion proof: Maya's push cycle + an enemy
  aim → fire → flinch cycle, composited in the corridor.
- `sprites/` — the 13 sprites (Maya ×4, Dr. Hale, Cole in the
  wheelchair, plain-clothes enemy ×4, teal-scrubs enemy ×3),
  transparent PNGs **downscaled to 1024 px tall** for the repo.

Full-res originals (~1000×2100, 1.5–2.6 MB each) live in Moth's
workspace at `~/workspace/hospital-escape/painted-sample/sprites/` —
ask Moth if you need one at full size.

## Honest weak points (known, not hidden)
- Maya push frame B reads as brisk walking rather than a true push
  stride; frame A (palms flat, from behind) is the one that genuinely
  reads as pushing. A matched pair of true push strides would be
  better in production.
- Faint pink keying ticks survive in a few of Maya's hair wisps at
  full-res zoom (invisible at game scale).
- Cole's bruises and bandage were added by the generator, not the
  brief — they read as "beaten-up patient" and fit the fiction, but
  they were not specified.
- The stills here are composites over a capture, not engine renders;
  placement quirks in them (subtitle overlap, a ghost of the old 3D
  figure) are composite artifacts, not sprite defects.

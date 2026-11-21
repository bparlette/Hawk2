DONE — all three items delivered with measured proof (see `opus-tuning.md`, final section; code on `claude/opus-tasking-ehw4b5` @ `32cfe89`). Opus seat stood down.

# OPUS — FINAL TASKING (Nov 20, from Cherie via Moth)

Opus seat: this file is your last tasking on Bunny Hop. It supersedes, for the
Opus seat only, the Round 3 tuning round-trip and the monitor-loop state
machine in `iteration-2.md`. Read it once, finish the work below, mark it
done, and stand down.

## Finish these three, then stop

1. **Round 1 physics — charge-carry / taper fix** (`opus-tuning.md`, Round 1b
   in `iteration-2.md`). A hop charged before landing on a bin must carry its
   charge through the chain. Today bin-to-bin fails by ~1 cm: crossing a
   1.04 m bin top allows only ~0.13 s of charge, so the chain hop leaves as a
   near-tap hop and wall-stops 1 cm short of the next bin. Moth's audit
   (Nov 20, against world v3 at Hawk2 `a863299f`) proved this is physics,
   not world spacing — the identical instrumented run against the
   placeholder world (3.4 m pitch) fails identically, 1 cm short. Do not
   ask Neon for another spacing change; the fix is on your side of the seam.
   **Acceptance test: bin-to-bin passing (3/3) in the live host.**
2. **`src/camera/chaseCam.js`** per the summit settlement: shoulder height
   1.65 m, FOV 58–62° base with a ≤66° cap, roll inheritance 0.0 (hard
   rule), lazy yaw, swim cam at water +0.6–0.8 m, and camera height
   independent of `crouch01`.
3. **Round 2 pose driver + bail behaviour**, as specced in `iteration-2.md`
   Round 2 (your modules; Moth wires the host side as already agreed).

## On completion — stand down

- Mark each item DONE in your responses/follow-up file **with measured
  proof** (for #1, the bin-to-bin pass result; for #2 and #3, the measured
  values against the settlement numbers above).
- Then **stand down**: no Round 3 tuning round-trip, no new assignments, no
  further monitor-loop participation on Bunny Hop. Do not poll for more
  work. Neon (world) and Moth (integration, proofs, acceptance) carry
  Bunny Hop from there.

## What this is not

This is not a quality complaint. The physics module and your acceptance
checks were solid — your luma measurements caught the too-dark road, and
your re-checks verified the fix (92.4 / 0.4% near-black). It is a pace call
by Cherie: Neon is setting the pace on this game, so the crew narrows to
the seats carrying it.

— Moth, Nov 20, 2026

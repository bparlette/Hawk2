# OPUS TASKING — Bunny Hop: physics tuning round-trip

Your physics core is in the game, unchanged. This is the one tuning round-trip the original brief promised — one feel item to rule on, plus anything it shakes loose.

## Status (verified by Moth, not self-reported)

- `bikePhysics.js` integrated **byte-identical** to your delivery — no edits to the module. All seam work lives in the host (`index.html`).
- Your tests re-run by Moth after install: **17/17 green** (`node --test`).
- Play proofs at phone size (390×844, real input, zero page errors): lean at cruise · hop **over** a bin · land **on** a bin · bin-to-bin chain · bridge rail hop → airborne off the deck → **splash** → swim → climb out → remount. Frame work median 2.7 ms — no perf regression vs the placeholder physics.
- **Live:** https://bparlette.github.io/Hawk2/games/bunny-hop/ (the game moved to the Hawk2 repo; your module is at `games/bunny-hop/src/physics/` there.)

## Host seam facts (what your module actually sees now)

- `env` is exactly `{ groundAt, waterLevel }`. `groundAt(x, z)` returns `{ height, type }` with `type` ∈ `'ground' | 'bin' | 'deck' | 'water'`. Bin footprints return the lid height (tops landable, sides read as walls), the canal returns type `'water'` with the bed height, bridge deck/ramps/rails return `'deck'`.
- Obstacles (buildings, lamps, trees) come through `groundAt` as tall heights at their AABB tops — your wall rule (>0.15 m above the rider; stop below 6 m/s, bail above) is what stops the bike.
- Input mapping at the host: `pedal = brake ? -1 : throttle`; `airPitch = -throttle` (W = nose-down, S = nose-up — your positive = nose-up convention preserved); `hopReleased` is a host-generated edge.
- Events are consumed as objects (`{type:'splash'}` → host swim state; `{type:'bail'}` → host bail/remount). After splash or bail the module no-ops until the host calls `reset(pose, env)` — climb-out and remount both use the env argument, bike grounds immediately. Swim steering/bounds and the bail timer are host-owned, as briefed.

## The one feel item — your call

**Pedal thrust during the crouch charge overshoots bin landings.** Holding the pedal through a full 0.45 s charge adds ~2.5 m/s during the charge itself, so a rider who pedals into a bin hop deterministically overshoots the lid and lands past it. The working technique is: build speed first, then charge on the coast (throttle released) — that lands on the bin reliably.

Question: **is pedal-through-the-charge overshoot the intended feel, or should pedal thrust taper while `hopHeld` is charging?** Options as I see them — yours to rule on, or propose another:

1. **Intended.** Crouch-scrub already costs a little speed; a rider holding full pedal *should* fly past. No change — say so in NOTES and I'll pass the technique to players via the hint line instead.
2. **Taper.** Scale pedal thrust down as `crouch01` rises (e.g. thrust × (1 − crouch01)), so charging is roughly speed-neutral and the hop distance is set by entry speed alone.
3. **Freeze.** No pedal effect at all while charging (neither gain nor scrub beyond the existing crouch drag).

My lean is (2) — it keeps pedalling useful for hop-*over* distance at cruise while making land-*on* a bin a speed-reading skill rather than a throttle-release trick — but the module is yours and the feel call is yours.

## Deliverable (same rules as the original brief)

- Updated `src/physics/bikePhysics.js` on your branch (`claude/opus-tasking-ehw4b5`, rebased on current Hawk2 `main` — note the game now lives in **bparlette/Hawk2**, not Hawk).
- Tests first: add a test that pins whichever behaviour you choose (e.g. speed at pop after a full-charge hold with pedal held vs released, asserted within a stated band). All previous 17 tests still green.
- `NOTES.md` updated: the decision, the reasoning, and any CONFIG changes with their one-line whys.
- Physics files only — `bikePhysics.js`, `bikePhysics.test.mjs`, `NOTES.md`. The host seam above is fixed; if your tuning needs something the seam can't express, write it in NOTES instead of touching other files.

Moth re-runs the tests, re-runs the bin proofs with pedal held through the charge, and ships it.

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

---

## OPUS FINAL: all three items DONE (Nov 20), with measured proof, then standing down

**Code lives on branch `claude/opus-tasking-ehw4b5` @ `32cfe89`.** These are Opus-seat files only: `src/physics/*`, `src/camera/*`, `src/rider/*`. Nothing is on `main` yet. Moth merges and wires per the NOTES. Tests: physics **21/21**, camera **14/14**, rider **16/16** (`node --test games/bunny-hop/src/<dir>/*.test.mjs`).

### 1. Round 1 physics: charge-carry + pedal taper: **DONE**

- **Fix.**
  - A hop charge held through the air carries into the landing.
  - Releasing in the air outside the 80 ms coyote window still never pops, and it spends the charge.
  - Pedal thrust fades out within ~0.11 s of crouch. After that, a held pedal holds speed and adds none.
- **Live-host proof: bin-to-bin 9/9 PASS.**
  - Build: Hawk2 `main` @ `9bd34f9` (`index.html` + world v3, 3.2 m hop line, bins knock-over enabled), with only `bikePhysics.js` swapped for the branch version.
  - Input: real `KeyboardEvent`s through the host's key path (W held, Space held then released; the host derives `hopReleased`).
  - Technique: hold through the drop onto bin 0, release at the lid lip.

| Takeoff x | bin-0 landing | Pop at | bin-1 landing (lid x −23.82…−22.78) |
|---|---|---|---|
| −29.3 (×3) | bin, 3.39 m/s | −25.88 | **bin @ −22.91** |
| −29.0 (×3) | bin, 3.39 m/s | −25.98 | **bin @ −23.08** |
| −28.7 (×3) | bin, 3.39 m/s | −25.97 | **bin @ −23.44** |

- **Earlier runs on the same build:**
  - 4/4 PASS, and 3/3 PASS on `36ed104`.
  - One earlier attempt on `9bd34f9` popped at the lip and then logged neither a landing nor a mode change within 9 s. It isn't reproducible: 13/14 total on this build. My harness stalling after page load is suspected, but it's reported here, not dropped.
- **Control: same harness and input, `main`'s current module: 0/3.**
  - Pedalling through the charge carries the rider to ~7 m/s.
  - One attempt bails; the other two overshoot bin 0 and fly past it.
  - That's the overshoot `opus-tuning.md` asked about. Option 2 (taper) was adopted.
- **Why Moth's audit failed:** it charged on the lid only, giving ~0.13–0.3 s of runway. Charging on the lid alone still falls short. The carried charge is the fix. **Player hint:** "Hold A through the drop, release at the front edge of the lid."

### 2. `src/camera/chaseCam.js`: **DONE**

| Settlement | Shipped / measured |
|---|---|
| Shoulder height 1.65 m | `height: 1.65` (test: rest position exact) |
| FOV 58–62° base, ≤ 66° cap | 60° base, +4° speed breathe, **hard cap 64°**. Tested at 2.5× top speed. Live at 24 km/h: 61.7°. |
| Roll inheritance 0.0 (hard rule) | `CAMERA_ROLL = 0`, not in CONFIG. The camera never reads `lean` (tested under a 0.42 rad lean sweep). |
| Lazy yaw | Critically damped, ~0.9 s to 80%, no overshoot (tested) |
| Swim cam water +0.6–0.8 m | water + **0.6 m**, tilted 6° up (`frame-7`) (tested) |
| Height independent of `crouch01` | Identical camera output with crouch 0 → 1 (tested) |
| Acceptance framing | Projected in a live-host copy at 390×844: **rider share 32.4–33.5%, horizon 29.9–30.5% from top** (target 30–35%, top third) |

Two named deviations, kept so the framing passes acceptance:
- **3.8 m behind the rear wheel, not 3.6 m:** at 3.6 m the rider fills 35.8%.
- **Aim 0.65 m above contact:** aiming at the hip + 0.5 m puts the horizon at 44% from the top.

Also in the module:
- a landing dip under 150 ms, silent on curbs;
- a bail framing that rises to 3 m over the obstacle (`frame-3`);
- a 30 m shadow frustum.

Host wiring is in `src/camera/NOTES.md`. **Re-measure the rider share on Moth's new Figure Factory v2 rig:** my 1.715 m head-top figure was the old rig's.

### 3. Round 2 pose driver + bail: **DONE**

Measured in tests and in a live-host copy (old rig, zero page errors, 139 GL draws, no new meshes):
- **Feet on the pedals:** < 5 mm at every crank angle, crouch included. Cadence is exact: speed ÷ 0.34 ÷ 2.75 (72 rpm at 7 m/s).
- **Hands on the bars:** < 2 cm in every pose (two-bone arm IK, soft elbows).
- **Crouch** = hips 20 cm down, 14 cm back, torso 0.38 rad toward the bars. It is no longer a whole-rig sink.
- **Air:** cranks level, legs still (< 0.6 rad/s), hips back.
- **Landing:** brace + squash scale with impact, capped at 7 cm, recovered < 0.4 s, silent on a curb.
- **Hop pitch** pivots on the rear contact (tested to 1 mm).
- **No channel pops:** checked frame by frame through pedal → crouch → hop → land → coast with the real physics.
- **Bail:**
  - the rider separates on a ballistic arc (apex matches theory to 2 cm) and settles into a flat dive (`frame-3`);
  - the bike stays against what it hit and never climbs a bin;
  - over water: one `riderWater` event with the entry speed.

The pose outputs are joint angles and offsets in bike-frame space. The rig-mapping snippet in `src/rider/NOTES.md` was written for the old rig. **`9bd34f9` rebuilt the rider (Figure Factory v2)**, so Moth maps the same channels onto the new joints. The channel list and geometry constants are in `POSE_CONFIG`; if the new rig's limb lengths differ, change those numbers.

### Open findings handed over (not Opus work)

- **Neon:** the rider's shadow is invisible on the main street at the current 11° sun, because the street sits in house shade. The recommendation is ~20° elevation (`neon-followup.md`, `b5e5f1a`).
- **Moth:** `applyWorldEnvMap` (PMREM) isn't called by the host yet.

**Standing down. Opus seat closed on Bunny Hop.** — Opus

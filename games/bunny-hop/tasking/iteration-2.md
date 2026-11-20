# Bunny Hop — Iteration 2: build the visual push plan

## The ask

The Opus × Neon visual summit is complete (`tasking/responses/visual-push-plan.md`, agreed by both seats, DONE). This iteration **builds** that plan, in rounds, in the order below. The plan is the spec; this file sequences it against Moth's audit findings and names the acceptance check for each round.

Live game: https://bparlette.github.io/Hawk2/games/bunny-hop/

**Current state (verified by Moth at Hawk2 `743ad604`):**
- The **placeholder world is live**. Neon's world v2 (`c5079bc`) is preserved in history but NOT live — Moth restored the placeholder (`b5a20177`) because bin-to-bin fails on her Hop Line.
- **Nothing visual matters until Round 0 lands.** Every later round assumes her world is the live one.

## Required reading — all seats

- `tasking/responses/visual-push-plan.md` — the joint plan (target look, ranked pushes #1–#14, budgets, tradeoffs T1–T3, acceptance).
- `tasking/responses/opus-on-neon.md` + `neon-on-opus.md` — the cross-reviews behind the plan (luma measurement method, camera numbers, the sun-geometry correction).
- `tasking/neon-followup.md` — **Moth's Audit Findings section** (against `c5079bc`): seam OK, her numbers verified (44 draws / 29,008 tris / 93 colliders / 13 bins), 5/6 play proofs pass, bin-to-bin FAIL with exact coordinates.
- `games/bunny-hop/reference/frame-1.jpg` … `frame-7.jpg` — ground truth. Every visual claim cites a frame.

## Shared budgets (from the plan — hard ceilings, measured)

| Metric | Ceiling |
|---|---|
| World draws, preview `renderer.info` | ≤ 60 (baseline 44) |
| Live raw GL draws/frame incl. shadow pass, riding main street | ≤ 170 (baseline 132) |
| Live frame work median (`__dbg.frameStats().workMedianMs`) | ≤ 3.0 ms (baseline 1.3–1.5 ms) |
| World texture memory | ≤ 4 MB (baseline ~1.7 MB; PMREM counts here) |
| PMREM generation at init | measured and reported, ≤ 150 ms |

**Play proofs are a hard floor at every round** (zero page errors): hop over a bin · land on a bin · **bin-to-bin** · bridge rail → splash → swim → climb out → remount · touch controls.

---

## Round 0 — get Neon's world live (GATE for everything else)

### 0a. Neon — Hop Line spacing fix
- **Deliverable:** re-push `src/world/buildWorld.js` with the Hop Line pitch fixed so bin-to-bin passes. Moth's audit measured: pitch **3.5 m**, charged-hop flight **~2.5 m** at the module's natural bin-landing speed (~3.58 m/s); rider wall-stops at (−23.53, 22.4), **~1 cm short** of bin 2's footprint. Audit fix: **pitch ≤ 3.3 m**. The plan's `hopLinePitch` WORLD_CONFIG knob (Neon's own proposal) is the mechanism — expose it, default it to a value that passes, keep it tunable 3.0–3.5 m.
- **Files:** `src/world/buildWorld.js` only (plus `src/world/NOTES.md` noting the new default).
- **Note:** Opus's charge-carry physics fix (Round 1b) may *also* make 3.5 m work — per plan tradeoff T3, whichever is green at integration ships. Round 0 does not wait for it: the spacing fix alone must be sufficient.

### 0b. Moth — re-proof and integrate
- **Deliverable:** swap Neon's fixed world into the live game, run the FULL play-proof set in the real host (not her preview), served-verify the flip.
- **Acceptance:** all proofs green incl. bin-to-bin 3/3, zero page errors; her measured numbers re-verified (renderer.info via `world-preview.html?shots=1`).
- **If bin-to-bin still fails:** placeholder stays live, findings appended to `neon-followup.md` with coordinates, Round 0 repeats. Rounds 1+ do not start.

## Round 1 — light and camera (plan pushes #1, #2, #9; tradeoff T1)

### 1a. Neon — lighting lift + sun flip (push #1)
- **Deliverable:** world lighting per the plan: asphalt/concrete luma lift (mid grey-blue asphalt with patchy wear + roughness sheen, pale lit bridge concrete/piers), cyan-blue hemisphere fill so shadowed faces never crush, sun moved to the settled geometry **`sunDir = [-0.84, 0.19, +0.50]`** (~11° elevation, behind-right of the +X ride, shadows ahead-left per `frame-2`; canal sparkle from the bridge preserved per `frame-3`). Updated `WORLD_LIGHTING` export to match.
- **Files:** `src/world/buildWorld.js`, `src/world/NOTES.md`.
- **Acceptance:** road luma **mean 70–100, < 5% of pixels < 25** on the spawn-ride and bridge-deck crops (measurement method in `opus-on-neon.md`), in her `?shots=1` matrix AND in the live game after 1c.

### 1b. Opus — physics: charge-carry + pedal taper
- **Deliverable:** in `src/physics/bikePhysics.js`, test-first: (1) a hop charge held through the air **carries into the landing** (hold → land on bin 1 → release pops immediately — bin-to-bin as a rhythm skill); (2) pedal thrust tapers by `(1 − crouch01)` while charging (`opus-tuning.md` option 2, adopted by both seats). Existing 17/17 module tests stay green; new behaviour gets new tests first.
- **Files:** `src/physics/bikePhysics.js`, `src/physics/bikePhysics.test.mjs`, `src/physics/NOTES.md`.
- **Acceptance:** tests green; bin-to-bin in the live host re-proven by Moth at integration — including at 3.5 m pitch if the world is set there (T3).

### 1c. Opus — chase camera module (pushes #2, #9) · Moth — host wiring + T1
- **Deliverable (Opus):** new pure ESM module `src/camera/chaseCam.js` implementing the locked camera: **1.65 m up, 3.6 m back, look-at +0.5 m above the hip, height independent of `crouch01`, FOV 60° base + speed kick capped at 64°, roll inheritance 0.0 (CONFIG constant, not a tunable), lazy yaw / tight vertical follow, landing-impulse shake (impact-scaled, < 150 ms decay, zero in air and while swimming), swim cam at `WATER_Y + 0.6 m` pitched ~6° up (`frame-7`), shadow frustum fitted to ~30 m around the rider.** Step-response and settle tests, same style as the physics tests.
- **Deliverable (Moth):** wire `chaseCam.js` into `index.html`; **adopt `WORLD_LIGHTING` verbatim in the host** (plan tradeoff T1 — lights become world-owned values, host keeps sun-position tracking only). No other host behaviour changes.
- **Files:** `src/camera/*` (Opus); `index.html` (Moth only).
- **Acceptance:** side-by-side vs `frame-1` at 390×844 — rider + bike fill **30–35% of frame height**, horizon in the **top third**; vs `frame-5` — horizon level under full lean; play proofs green; live GL draws ≤ 170 and frame work ≤ 3.0 ms.

## Round 2 — density and the rider (plan pushes #3, #4, #5, #6, #7)

### 2a. Neon — parallax pack + landing contrast + PMREM + mid/far layers (pushes #3, #4, #6, #7)
- **Deliverable:** all merged geometry, ~4 extra draws total:
  - White lane dashes **3 m long every ~9 m** at road luma **+100**, pale curb edge strip, sidewalk joints every **~1.5 m** (`frame-2`, `frame-5`);
  - Bridge barrier posts/joints every **~2 m**, pale rail top (`frame-1`);
  - Bin lids **+60 luma** over body/road with a pale rim (`frame-6`); road, sidewalk, deck and lid meshes all `receiveShadow = true`;
  - Procedural sky **PMREM env map** generated at init (0 draws; init cost measured, ≤ 150 ms; counts toward the 4 MB texture budget);
  - Poles every ~25 m with sagging catenary wires (1 draw) and a hazed skyline card on the canal/bridge axis (1 draw) (`frame-1`, `frame-3`).
  - Water: unchanged except re-checking the sparkle path after the Round 1 sun flip (push #10, KEEP).
- **Files:** `src/world/buildWorld.js`, `src/world/NOTES.md`, preview updated.
- **Acceptance:** `?shots=1` matrix re-captured; world draws ≤ 60; texture memory ≤ 4 MB; side-by-sides vs `frame-1` (bridge deck) and `frame-5` (leaning turn) judged at phone size; play proofs green in the live host (Moth).

### 2b. Opus — pose driver + bail integrator (pushes #5, #8) · Moth — rig wiring
- **Deliverable (Opus):** two pure modules with tests, plus the exact rig seam documented in NOTES:
  - **Pose driver:** pedal cycle with crank-synced hip rock, coast posture, crouch with hips back (NOT a whole-rig sink), air pose, landing brace; render pitch pivots on the **rear contact point**; fork compression scaled by impact; bike + rider shadows detach visibly on pop (`frame-2`).
  - **Bail integrator:** on bail, the rider separates from the bike on a ballistic arc with tumble, independent of the bike (`frame-3`) — spec + pure integrator; the host owns the swim/bail state machine as today.
- **Deliverable (Moth):** wire both into the `index.html` rig. This is where tradeoff **T2** bites: the rider meshes are host-side primitives, so the pose quality ceiling is the rig's — wire it faithfully and report what the primitives can't express; do not silently simplify the pose spec.
- **Files:** `src/physics/*` or new `src/rider/*` (Opus, his call — document it); `index.html` (Moth only).
- **Acceptance:** side-by-side vs `frame-3` (bail separation, from the bridge); hop footage at phone size shows shadow detach on pop and a landing brace; play proofs green; frame work ≤ 3.0 ms.

## Round 3 — acceptance and tuning (Moth leads)

- **Deliverable:** the plan's full acceptance set, captured by Moth from the LIVE game at 390×844:
  - Side-by-sides vs `frame-1` (bridge deck, riding away), `frame-3` (canal from bridge + the bail), `frame-5` (leaning turn);
  - Measured pass marks: road luma 70–100 / < 5% near-black · rider share 30–35% of frame height · horizon top third · horizon level under full lean;
  - Full play-proof set green, zero page errors; budgets re-measured (draws, frame work, texture memory, PMREM init ms);
  - One device run on a real phone GPU if a device is available — the plan names this gap explicitly; if it can't be captured, the gap stays named in the report, not smoothed over.
- **Then:** one tuning round-trip each (Opus: `opus-tuning.md`; Neon: `neon-followup.md`) for whatever the acceptance pass flags — small numbers only, no new features.

## Ruled out this iteration (from the plan — do not relitigate)

- Post-processing / bloom pass (#12) — revisit only if Round 3 acceptance fails on glow.
- Continuous road vibration (#13) — shimmer on rails/wires at 390×844.
- More parked life (#11) — DEFER until pushes #1–#7 are measured inside budget.
- Skinned/authored rider or bike models (#14) — **needs Cherie's decision** (tradeoff T2: the no-external-assets rule makes the primitive rider the ceiling).

## Seams (unchanged)

Physics + camera + rider modules = **Opus** · world = **Neon** · `index.html` integration, proofs, acceptance = **Moth**. Nobody edits another seat's files; seam mismatches go in the owning seat's follow-up file with exact coordinates/values, expected vs observed.

## Automation — monitor loop

These rounds can run on the same automation pattern as the visual summit (`visual-summit-monitor.md`): each seat polls `games/bunny-hop/tasking/` on Hawk2 `main` every **5 minutes** for **60 minutes** from their own start, works only from a fresh pull, and pushes each completed step as **one batched commit per cycle** (silence when nothing changed — no empty commits, no status spam).

State machine for this iteration:

| # | State | Action |
|---|-------|--------|
| 1 | My current round's deliverable is missing and its gate is green (Round 0 → 1 → 2 order; Round 0's gate is Moth's integration proof) | Build it, push, note the commit in my follow-up file. |
| 2 | The other seat's deliverable I depend on landed since my last cycle | Pull it, run my acceptance check on it, append the result (pass, or findings with exact values) to their follow-up file. |
| 3 | Moth's integration/acceptance note for my round is present | Read it; if it flags a fix inside my seam, do the fix this cycle and push. |
| 4 | All rounds through Round 3 are marked complete in this file's checklist (Moth maintains it) | Write `DONE` at the top of this file, push, stop polling early. |
| 5 | 60 minutes elapsed without completion | Push whatever exists, put a one-line `STATUS:` at the top of my own follow-up file saying exactly where it stopped, and stop. |

Collision rules carry over from the summit monitor: never edit another seat's source files; on push conflict, pull/rebase and retry once, never force-push; measured numbers only; play proofs are a hard floor at every step.

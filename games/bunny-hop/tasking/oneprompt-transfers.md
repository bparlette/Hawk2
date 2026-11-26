# Bunny Hop — One-Prompt Transfers: feel first, then look

## The ask

Cherie approved (2026-11-26) transferring four techniques from the one-prompt bike games into Bunny Hop, **in this order: Task 1 (feel) before Task 2 (look)**. These are ports of proven code, not reinventions — where Bunny Hop already has a module covering part of a task, the job is to finish and wire it to the source games' standard, not to start over.

Live game: https://bparlette.github.io/Hawk2/games/bunny-hop/

## Exact locations

**Source — Pelican Ride** (repo https://github.com/bparlette/Hawk2, branch `main`, folder `games/oneprompt-duck/`):
- Rider IK legs: `src/pelican.js` — leg rig (~line 362) and the "Legs IK" solve (~line 491), driven by `crankAngle` from `src/bicycle.js` — crank group at the bottom bracket (~line 289), `state.crankAngle` (~line 455).
- Camera system: `src/main.js` — `CAMS` list (orbit / chase / side / cine / pov, ~line 322), `setCam()` (~line 350), orbit follow + ground clamp (~lines 389–398); button bar in `index.html` — `.cams` styles (~lines 80–82, mobile override ~155) and `<div class="cams panel">` with `<button data-cam="…">` (~line 238). Keyboard: `C` cycles camera.
- Water: `src/ocean.js` — Gerstner wave GLSL (`gerstner()`, ~line 28; `WAVES` table, ~line 7), crest foam + shore breakers (~lines 108–118), CPU surface height `waveHeight(x, z, t)` (~line 189) and `wavePhases()` (~line 177).

**Source — Gobble Ride** (same repo/branch, folder `games/gobble-ride/`): second working example of the same systems — `src/turkey.js` (IK legs), `src/bicycle.js`, `src/main.js`, `src/ocean.js`, plus the vendored press-map at `src/gppressmap.js`.

**Source — press-map module** (repo https://github.com/bparlette/gamepress, branch `main`, commit `f14bb6ed`): `kit/gppressmap.js` + `docs/PRESS-MAP.md` (API, spring defaults k=70 / c=5, perf numbers). Working in-game wiring example: `games/oneprompt-drifter/src/grass.js` + the `loadMap` hook in its `src/main.js` (Hawk2, `main`).

**Target — Bunny Hop** (repo https://github.com/bparlette/Hawk2, branch `main`, folder `games/bunny-hop/`): `index.html` (host + rider rig), `src/physics/bikePhysics.js`, `src/rider/riderPose.js` + `src/rider/NOTES.md`, `src/camera/chaseCam.js` + `src/camera/NOTES.md`, `src/world/buildWorld.js` + `src/world/NOTES.md` + `src/world/world-preview.html`.

## Shared requirements — every task, no exceptions

- **Acceptance = real-input play evidence from the LIVE served build** (push first, then verify — push-then-verify): screenshots at 390×844 driven by real input, **zero page errors**. Scripted state probes may accompany evidence, never replace it.
- **Iteration 2's play-proof floor stays green at every step:** hop over a bin · land on a bin · **bin-to-bin** · bridge rail → splash → swim → climb out → remount · touch controls.
- **Iteration 2's budgets hold:** live frame work median ≤ 3.0 ms (`__dbg.frameStats().workMedianMs`); live raw GL draws ≤ 170 riding main street. Any task that adds per-frame cost reports its added draws + ms explicitly in its DONE entry.
- **gptouch standard untouched.** Any new HTML UI sits at **z-index ≥ 1100**.
- **Batched commits on `main`**, one per task. After every push, read the file back and compare byte size + a changed string (stale-snapshot trap) before claiming it landed.
- **SHOW YOUR WORK:** each DONE entry (in this file, or the owning seat's follow-up file per the seams below) states the method, the tools/commands used, and the output locations (files changed, screenshot paths) in recreate-from-paper detail.
- **Seams (unchanged from Iteration 2):** physics + camera + rider modules = **Opus** · world = **Neon** · `index.html` integration, proofs, acceptance = **Moth**. Nobody edits another seat's files; seam mismatches go in the owning seat's follow-up file with exact values, expected vs observed.

---

## Task 1 — FEEL (do first; 1a and 1b are different seams and may run in parallel)

### 1a. Pedaling IK legs — port of the Pelican Ride approach

- **Current state (Moth audit, 2026-11-26):** `src/rider/riderPose.js` already *specifies* two-bone IK onto the pedal positions (see `src/rider/NOTES.md`: feet < 5 mm at every crank angle, tested at module level) — but the **live host still animates the legs from its own `pedalPhase` lines** in `index.html` (~lines 737, 982–994: torso bob, hip rock, `crank.rotation.x = -pedalPhase`). The module is not driving the shipped rider. This task finishes the port; it is not a from-scratch build.
- **Deliverable:** in the live game, the rider's feet stay glued to the pedals at every crank angle, the Pelican way (`games/oneprompt-duck/src/pelican.js` Legs IK + `src/bicycle.js` crank state; second example `games/gobble-ride/src/turkey.js`):
  - Crank angle derives from actual speed (existing cadence math: speed ÷ 0.34 wheel radius ÷ 2.75 gear = 72 rpm at 7 m/s);
  - Two-bone IK (thigh/shin) solves onto the true pedal positions each frame; crank-synced hip rock (±0.05 rad) and torso bob (12 mm at 2× cadence) ride on top, as in both the source rig and `riderPose.js`'s spec;
  - Coast: cranks freewheel to level, rider sits up; crouch / hop-charge: feet stay planted through the crouch (no whole-rig sink substitution);
  - Use `riderPose.js` where it already matches that behaviour; port from `pelican.js` where it doesn't. Host wiring follows `src/rider/NOTES.md`'s removal list — the `pedalPhase` leg lines come OUT. One driver, not two.
- **Files:** `src/rider/*` (Opus); `index.html` wiring (Moth only).
- **Acceptance:** screenshots from the live build at 390×844 — pedalling at speed with feet on pedals at four crank positions (or a short capture), coast pose, crouch-charge pose; foot-slip < 5 mm per the rider tests, tests green; play proofs green; zero page errors.

### 1b. Chase + orbit camera modes with on-screen buttons

- **Current state:** one ride camera only — the host adopts `chaseCam.js` geometry inline (`index.html` ~line 1093). No camera-mode buttons exist anywhere in Bunny Hop.
- **Deliverable:** port the bike games' camera system (source: `games/oneprompt-duck/src/main.js` `CAMS` + `setCam()`, `index.html` `.cams` bar):
  - An on-screen button bar with at least **Chase** and **Orbit**, styled on the source's `.cams` panel, **z-index ≥ 1100**; `C` key cycles modes, as in the source;
  - **Chase** = the locked Iteration 2 framing — `src/camera/chaseCam.js` stays the geometry source of truth (1.65 m up / 3.6 m back class framing, FOV 60 + speed kick, swim cam behaviour unchanged);
  - **Orbit** = free orbit around the rider in the source's manner: drag to orbit, camera follows the rider's position, ground-clamped (`y ≥ groundAt + 0.2`), distance kept sane (source resets when outside ~1.2–14 m);
  - **Pointer arbitration, stated in `src/camera/NOTES.md`:** orbit drag must not fight gptouch — orbit dragging is live only in Orbit mode and only where gptouch does not claim the pointer (right half). gptouch itself is not modified.
- **⚠ Spec against the FIXED behaviour:** on 2026-11-26 the source games' camera buttons were reported stopped working, and a fix is landing in parallel. Before porting, check the buttons on the **live** Pelican Ride and Gobble Ride and port the fixed behaviour. Whatever that root cause was, Bunny Hop's buttons are accepted only by **real clicks through the player path** — tap the button → the mode visibly changes → screenshot. A mode switch that only fires from a test hook or a direct internal call is NOT a working button (the Castle Craters lesson: a line that exists only in the test hook ships a dead button).
- **Files:** `src/camera/*` (Opus — extend `chaseCam.js` or add a modes module, his call, documented in `src/camera/NOTES.md`); `index.html` button bar + wiring (Moth only).
- **Acceptance:** one screenshot per mode at 390×844 from the live build, **each reached by tapping the actual on-screen button**: Chase (locked framing, rider 30–35% of frame height per Iteration 2 §1c), Orbit (an off-axis angle that proves free orbit), then back to Chase; swim framing still correct in Chase; play proofs green; zero page errors.

## Task 2 — LOOK (starts only when both halves of Task 1 are DONE and verified on the live build)

### 2a. Press-map grass on the lawns and verges

- **Deliverable:** the gamepress press-map, wired the Drifter way:
  - Vendor `kit/gppressmap.js` from gamepress `main` (`f14bb6ed`) **byte-identical** into `games/bunny-hop/src/world/gppressmap.js` (the Drifter/Gobble vendoring pattern — verify the byte size, 10,602 B, after copying);
  - Grass tufts instanced over the lawn/verge areas of `src/world/buildWorld.js` — **not** the road, **not** the canal strip; blades bend from the press map, which the host stamps from the bike's position/wheels each frame, and spring back with the module defaults (spring 70, damping 5 — `docs/PRESS-MAP.md`);
  - Wind sway as in the source games; texture re-upload only while a wake exists (Drifter pattern: `games/oneprompt-drifter/src/grass.js` + its `main.js` hook);
  - Report added draws + added frame-work ms against the shared budgets in the DONE entry.
- **Files:** `src/world/gppressmap.js` (new), `src/world/buildWorld.js`, `src/world/NOTES.md` (Neon); the per-frame stamp hook in `index.html` (Moth only).
- **Acceptance:** screenshots from the live build at 390×844 — riding across a lawn with a visible parted wake behind the bike, and the same spot ~1 s after leaving it (grass sprung back); press-map active-cell count and frame work reported; play proofs green; zero page errors.

### 2b. Gerstner-wave canal water with shore foam

- **Deliverable:** replace the canal's flat water plane (`src/world/buildWorld.js` ~line 66: a `MeshStandardMaterial` plane at `WATER_Y = -0.55`) with the Pelican Ride ocean ported down to canal scale (`games/oneprompt-duck/src/ocean.js`):
  - 5 Gerstner waves in the vertex shader (`gerstner()` + the `WAVES` table pattern), with crest foam and **shoreline foam where the water meets the quay walls and bed** (the `ocean.js` ~lines 108–118 foam pattern, with the shoreline function re-derived for the canal's straight edges);
  - A CPU `waveHeight(x, z, t)` equivalent (source ~line 189) so the swim section floats the rider on the actual moving surface;
  - The bridge sparkle from Iteration 2 Round 1 (push #10, KEEP) still works over the new surface;
  - **Scale discipline:** the canal is ~20 m wide — amplitudes and wavelengths shrink to canal scale and the chosen values are stated in `src/world/NOTES.md`. It must read as canal water, not a miniature ocean.
- **Files:** `src/world/buildWorld.js`, `src/world/NOTES.md` (Neon); swim float hook in `index.html` if the host needs the CPU height (Moth only).
- **Acceptance:** screenshots from the live build at 390×844 — the canal from the bridge (waves + foam line along the walls) and the swim section with the rider floating on the moving surface; bridge rail → splash → swim → climb out → remount proof green; frame work within budget; zero page errors.

---

## Order and gates

1. **Task 1 first.** 1a and 1b may run in parallel (different seams). Each half: one batched commit on `main`, served-build verification, then its DONE entry with SHOW YOUR WORK.
2. **Task 2 starts only when both Task 1 halves are DONE and verified live.** 2a and 2b may then run in parallel (both are world-seam; sequence them if the same hands hold both).
3. When all four are DONE and verified, write `DONE` at the top of this file with the four commit SHAs and push that as the final batched commit.

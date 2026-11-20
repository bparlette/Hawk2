DONE

# Bunny Hop — Visual Push Plan (joint: Opus × Neon)

*Drafted by Opus from `opus-on-neon.md` and `neon-on-opus.md` (both Round 1 and Reply). Neon: append `Agreed — Neon`, or make one editing pass and add a changelog line at the top.*

## 1. Target look: which frame governs what

| Aspect | Governing frame | What we match |
|---|---|---|
| **Street light** | `frame-2` | A hard low warm-pink sun about 11° up, behind and to the right of the main ride. The rider's shadow falls metres ahead and to the left. |
| **Shadow fill / ambient** | `frame-5` | Shadows are blue and readable, never near-black. Road luma is 70–100 (frames measure 85 / 89 / 121). |
| **Sky** | `frame-1` | Cyan overhead melting to a pink horizon band, with distance haze. |
| **Water** | `frame-3` (from the bridge), `frame-7` (swimming) | Ripple, sky reflection, and a sparkle path down the canal. |
| **Camera** | `frame-1` (framing), `frame-5` (level horizon under lean), `frame-4` (lazy yaw), `frame-7` (swim) | Shoulder-height chase, rider dead centre, horizon in the top third. |
| **Density** | `frame-6`, `frame-1` | Something every few metres: lane dashes, curb strip, poles and wires, barrier posts, readable bin lids. |
| **Bail** | `frame-3` | The rider separates from the bike and flies flat. |

**Sun geometry (settled, Neon's correction):** `sunDir = [-0.84, 0.19, +0.50]`. Riding the main street toward +x, the sun is behind-right, so shadows fall ahead-left (`frame-2`). From the bridge, the sun stays low down the −x canal, so the `frame-3` sparkle survives. Nothing is traded away.

## 2. Ranked pushes (visual payoff per cost)

| # | Push | Owner | Verdict | Cost (estimate, to be measured) | Why |
|---|---|---|---|---|---|
| 1 | Ground and concrete luma lift, cyan sky fill, sun flip | Neon | **DO** | 0 draws | Road luma is ~10 against the frames' ~85. Nothing else reads until this is fixed: shadows, landings, bin bases. |
| 2 | Chase camera model: 1.65 m up, 3.6 m back, look-at +0.5 m over the hip, FOV 60 (+4 kick, cap 64), roll 0.0, lazy yaw / tight height, shadow frustum fitted to ~30 m around the rider | Opus | **DO** | 0 draws | Rider share and horizon height are the acceptance metrics (`frame-1`). |
| 3 | Near-field parallax pack: white 3 m / 9 m dashes, pale curb strip, 1.5 m sidewalk joints, bridge barrier posts every 2 m with a pale rail top | Neon | **DO** | ~2 draws, merged | At shoulder height, speed is only visible through near-field flow (`frame-2`). |
| 4 | Landing-target contrast: bin lids +60 luma with a pale rim; all road, sidewalk, deck and lid meshes receive shadows | Neon | **DO** | ~0 draws | Hop readability: you can judge the lid and see the shadow gap on pop (`frame-6`, `frame-2`). |
| 5 | Rider pose driver: pedal cycle with hip rock, coast posture, crouch with hips back (not a whole-rig sink), air pose, landing brace. Plus render pitch pivoting on the rear contact point and fork compression scaled by impact | Opus (pure module), Moth (rig wiring) | **DO** | 0 draws | The closer camera exposes the box statue (`frame-1`, `frame-6`). |
| 6 | Procedural sky PMREM env map | Neon | **DO** | 0 draws; one-time init ms to be measured | Sky-coloured sheen on asphalt, paint and chrome without flattening shadows (`frame-4`). |
| 7 | Poles with sagging wires (1 draw) and a hazed skyline card (1 draw) | Neon | **DO** | 2 draws | Mid layer sweeps the top of the frame at speed (`frame-1`). Far silhouette replaces the flat horizon band (`frame-3`). |
| 8 | Bail separation: rider ballistic arc plus tumble, independent of the bike | Opus (spec + pure integrator), Moth (render) | **DO** | 0 draws | `frame-3`. Today the rider stays glued to the bike. |
| 9 | Landing-impulse camera shake: impact-scaled, < 150 ms, zero in the air and while swimming | Opus | **DO** | 0 | Sells the landing without shimmer on thin wires. |
| 10 | Water: keep as is; re-check the sparkle after the sun flip | Neon | **KEEP** | 0 | Already at `frame-3`/`frame-7` (view (c): luma 104, 3.6% near-black). |
| 11 | More parked life (cars, dumpster variety) | Neon | **DEFER** | Unknown draws | Only after 1–7 are measured inside budget. |
| 12 | Post-processing (bloom, grade pass) | — | **RULE OUT this pass** | Full-screen passes cost phone fill-rate | ACES plus exposure already does the grade. Revisit only if acceptance fails on glow. |
| 13 | Continuous road vibration | — | **RULE OUT** | — | Causes sub-pixel shimmer on rails and wires at 390×844. Both seats agree. |
| 14 | Skinned or authored rider and bike models | — | **RULE OUT (needs Cherie)** | External assets | The no-external-assets rule makes the primitive rider the ceiling. See tradeoff T2. |

## 3. Who builds what, in order (no one blocks anyone)

**Phase A, in parallel now:**
- **Neon:** #1 lighting lift and sun flip, plus a `hopLinePitch` WORLD_CONFIG value (default 3.4 m, tunable 3.0–3.5 m), so her world can go back live with green play proofs.
- **Opus:** physics fixes for bin-to-bin, test-first:
  - a hop charge held through the air carries into the landing;
  - pedal thrust tapers by `(1 − crouch01)` while charging (`opus-tuning.md` option 2).
- **Opus:** `src/camera/chaseCam.js` (#2, #9), a pure ESM module with step-response and settle tests.
- **Moth:** wires the camera and adopts `WORLD_LIGHTING` in the host.

**Phase B:**
- **Neon:** #3, #4, #6, #7.
- **Opus:** #5 pose driver and #8 bail integrator as pure modules with tests, plus the exact rig seam documented in NOTES.
- **Moth:** wires the pose driver and bail.

**Phase C:** Moth captures side-by-sides and runs the play proofs, followed by one tuning round-trip each.

**Seams unchanged:** physics and camera = Opus · world = Neon · `index.html` integration = Moth.

## 4. Shared budgets (baseline measured at Hawk2 `8c1e77a`)

Harness: headless Chromium/SwiftShader at 390×844, DPR 1. Draw counts come from the world-preview `renderer.info` and a raw GL draw counter that includes the shadow pass. Work time is `__dbg.frameStats().workMedianMs`.

| Metric | Baseline (measured) | Committed ceiling |
|---|---|---|
| World draws, preview `renderer.info` | 44 | **≤ 60** |
| Live raw GL draws/frame, incl. shadow pass, riding main street | 132 (bridge 134) | **≤ 170** |
| Live frame work median (JS + submit) | 1.3–1.5 ms | **≤ 3.0 ms** |
| World texture memory (est.) | ~1.7 MB, 7 textures | **≤ 4 MB** (the PMREM map is counted here) |
| PMREM generation at init | — | Measure and report; **≤ 150 ms** |

**Not yet measured:** a real phone GPU. The SwiftShader numbers are relative budgets only. Moth captures one device run in Phase C if a device is available. If not, that gap stays named.

## 5. Named seam tradeoffs (for Cherie)

- **T1: Lighting values live in the world module, but lights and renderer are host-owned.**
  - The live host still runs the old lights (hemi 0.85, sun `0xffa860`/1.9) rather than `WORLD_LIGHTING`, so the two can drift.
  - Proposal: the host imports and applies `WORLD_LIGHTING` verbatim (Moth's seam), and keeps its sun position tracking.
- **T2: The rider's visual ceiling sits in Moth's lane.**
  - The rider meshes are in `index.html`. Opus delivers pose angles, so how good the rider looks depends on the primitive rig.
  - The no-external-assets rule rules out a skinned rider.
  - Cherie decides whether an authored rider asset is ever in scope.
- **T3: Hop-line pitch is a world number that gates a physics play proof.**
  - Neon defaults it to 3.4 m (the proven placeholder pitch).
  - Opus's charge-carry fix aims to make 3.5 m work too.
  - Whichever is green at integration ships. Neither seat moves the other's thresholds.

## 6. Acceptance

**Side-by-sides** against `frame-1` (bridge deck, riding away), `frame-3` (canal from the bridge, plus the bail) and `frame-5` (leaning turn). Captured at 390×844 and judged at phone size.

**Measured pass marks:**
- **Road luma:** mean 70–100 with < 5% of pixels below 25, on the spawn-ride and bridge-deck crops (method in `opus-on-neon.md`).
- **Rider share:** rider plus bike fill about 30–35% of frame height in the `frame-1` framing.
- **Horizon:** sits in the top third.
- **Lean:** the horizon stays level under full lean (`frame-5`).

**Play proofs stay green at every phase (a hard floor):**
- hop over a bin;
- land on a bin;
- bin-to-bin;
- bridge rail → splash → swim → climb out → remount;
- touch controls, with zero page errors.

---

Agreed — Opus
Agreed — Neon

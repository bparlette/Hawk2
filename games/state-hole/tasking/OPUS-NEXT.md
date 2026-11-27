# OPUS-NEXT — State Hole: physics & feel

**Exact location:** repo https://github.com/bparlette/Hawk2 · branch `main` · game folder `games/state-hole/` · this file lives at `games/state-hole/tasking/OPUS-NEXT.md`. Work on main only, no branches. Local reference build: `~/workspace/state-hole/sample4/` (index.html + vendor/ — the shipped v4).

## What the game is
Black Hole City's engine wearing a real-data USA. States are flat toon slabs in their true Census outlines; each state's population stands on it as little 3D people **stacked on each other's shoulders** (height = data: CA peak 25, TX 22, FL 18, NY 17 … WY one 3-person stack; 5,453 instanced figures, one InstancedMesh, gpkit `personGeo`). The player drags the BHC disc hole; it eats towers from the base. Data: Karpathy usaciv (MIT) + Census/BEA, inlined in the build.

## Standing rules for this queue
- **Test-first (owner rule):** the spec tests below are written FIRST and stay red until the work passes them. Do not weaken a test to pass it — flag it to Moth instead.
- **Push then verify:** commit + push to main after each finished item, then verify the SERVED build (boot it, resolve imports) — no pre-push verification marathons.
- **Play evidence:** every DONE entry carries a recording or screenshot sequence from real input (real touch drags, no test hooks driving gameplay) + a SHOW YOUR WORK paragraph (method, tools, output locations — recreate-from-paper detail).
- **Grounding invariant:** nothing floats, ever. Every figure is planted on the slab or physically falling. This is the owner's hard gate from the v1–v3 failures.

## TASK 1 — Emergent collapse physics (the big one)
Today towers crumble on a scripted per-level stagger. Replace it with a support-graph simulation:
- Each figure knows what supports it (slab or the figure below). When support is eaten/removed, unsupported figures become ACTIVE bodies: gravity, tip (pitch/roll from offset), collision against the slab and neighbouring figures (cheap sphere/box proxies), domino toppling into adjacent stacks.
- **Active-body budget:** at most 220 active bodies at once; figures beyond the budget stay frozen until bodies free up (nearest-to-hole first). Sleeping figures cost zero per frame.
- Determinism: same seed + same input script = same collapse outcome (needed for tests and for capture).

**Spec tests (write first, red until pass):**
1. `collapse-budget`: force a 25-stack + neighbours to fall; assert active bodies ≤ 220 at every frame.
2. `collapse-determinism`: run the scripted eat twice on seed 7; assert identical final resting positions (±0.01) for all figures.
3. `no-floaters`: after any collapse settles, assert every non-eaten figure is either supported (slab/below-figure within epsilon) or still falling; zero figures resting mid-air.
4. `domino`: eat the base of tower A adjacent to tower B; assert at least one B figure falls without the hole touching B.
5. `perf-frame`: at 5,453 figures with one collapse active, frame time ≤ 16.6 ms median on the test harness's GPU profile (report the profile; do not claim phone numbers from the VM renderer).

## TASK 2 — Hole growth & camera choreography for towers
- Hole growth curve from BHC, re-tuned: mass feel = top speed decreases as radius grows (spec: v_max(r) table in code, tested by `hole-speed-curve` — sample r at 5 points, assert within 5%).
- Camera pull-back keyed to the TALLEST tower in frame, not just hole size: when the hole approaches a state whose peak stack is H, the camera must frame H fully (test `ca-framing`: place hole at CA border, assert the 25-stack's top projects inside the viewport at 390×844).
- Cine pull-back on state completion (BHC behaviour) retained.

## TASK 3 — Eat feel
- Rim behaviour: figures within rim radius get a pre-fall TEETER (0.15–0.3 s wobble, amplitude grows) before tipping in — reads as panic, sells the swallow. Test `teeter-before-fall`: no figure transitions standing→falling in <0.12 s once inside rim radius.
- Per-state completion banner carries the real fact line (data already in the build): "Texas down — 30.5M people · tallest stack 22". Test asserts banner text matches the data table for 3 sampled states.

## TASK 4 — Capture field: the hole must act like a BLACK hole (owner note, Nov 27)
Owner, verbatim: "Should also act more like a black hole where the people all fall and tip over but are dragged along with the movement until they all suck into the hole." A first-pass implementation ships with the population-banner update (Moth's lane) — your job is to own it, harden it, and prove it with tests. If the shipped pass disagrees with the specs below, the specs win.
- **Influence field** ≈ 2.2× rim radius. Figures entering it lean/tip progressively toward the hole (pitch grows as distance closes), lose footing, and fall.
- **Drag-along:** downed/in-field figures inherit the hole's velocity plus a steady inward pull — a moving hole sweeps a tumbling comet-tail of people that travels WITH it and piles against its trailing side. Figures reaching the rim suck in (existing fall). Figures the hole leaves behind (outside the field) stay downed where they lie.
- **Tower stripping:** figures dragged from a stack's base/edge are support loss — Task 1's collapse takes the rest. The field must be able to fell a tower without the rim touching it.

**Spec tests (write first, red until pass):**
6. `field-radius`: a figure at 2.1× rim radius is affected within 0.5 s; a figure at 2.4× is untouched after 2 s.
7. `drag-along`: hole moves at constant velocity for 2 s with a downed figure in-field; assert the figure's net displacement is ≥ 70% of the hole's, in the hole's direction.
8. `no-free-sucks`: a figure outside the field is never position-pulled (only Task 1 physics may move it).
9. `strip-without-touch`: park the hole so its field overlaps a tower base but its rim never does; assert the tower fully falls within 6 s.
10. `tail-escapes-stay`: after the hole exits, figures left downed outside the field remain at rest (no zombie sliding) for 3 s.

## Out of scope (Neon's lane, do not touch)
State-surface painting, sky/water grade, landmarks, skyline silhouette art. If physics needs a data change for skylines, propose it in a response file; don't build it.

## DONE protocol
Append DONE entries here with: what changed, the spec-test results, play-evidence links/paths, SHOW YOUR WORK. Then immediately take the next task in this file; if none remain, say so in the DONE entry — Moth restocks the queue.

---

## DONE — TASK 1 · TASK 2 · TASK 3 (Opus, Nov 27)

**Spec tests:** `node games/state-hole/tests/spec.cjs`. All nine were written first and pushed red (`ed721c3`, 0/9); the implementation followed (`3243bdd`). **Result: 8/9 pass, 0 page errors.** The full output is in `tasking/opus-shots/spec-results.txt`.

| Test | Result |
|---|---|
| collapse-budget | **PASS**: CA's 25-stack plus 9 neighbours; peak active **72 ≤ 220** on every step; settles |
| collapse-determinism | **PASS**: scripted 6 s drive on seed 7, twice; **0 mismatches** over all 5,453 figures (x, y, z, mode); 206 disturbed |
| no-floaters | **PASS**: CA / TX / NY / FL / PA collapses plus an OH drive; after each settles, **0 floaters** (every figure standing on the slab or a standing figure, or lying exactly on the ground) |
| domino | **PASS**: eat tower A's base only, hole parked off-map; **5 / 2 / 4 neighbour towers knocked** (CA / TX / NY); the hole never touched them |
| **perf-frame** | **FAIL (flagged to Moth).** 616 ms median frame on this harness: **SwiftShader (CPU rasterizer)**, `ANGLE (Vulkan 1.3.0 (SwiftShader Device (Subzero)))`. The sim is **0.15 ms update + 1.5 ms pose/upload per frame**; the remaining ~615 ms is CPU rasterization of 5,453 instanced figures at 390×844. I won't claim phone numbers from this renderer. Needs a GPU harness profile to judge. The test is unchanged. |
| hole-speed-curve | **PASS**: measured top speed at r = 2 / 3.5 / 5 / 7 / 10 matches the table within 0.08% (11 → 6.2 m/s, strictly decreasing) |
| ca-framing | **PASS**: hole on CA's border vertex nearest its 25-stack; the stack's top projects at (290, 64), inside 390×844 |
| teeter-before-fall | **PASS**: 352 standing → falling transitions inside the rim; minimum 0.167 s (≥ 0.12) |
| banner-facts | **PASS** for TX / WY / OH against the data table. **FLAG:** this file's example says "Texas down — 30.5M people", but the build's data table has TX = 31,709,821, so the banner reads "Texas down — 31.7M people · tallest stack 22". The banner follows the data. Moth: if 30.5M is the intended figure, the data table is what to change. |

**What changed** (`index.html`, one file; nothing in Neon's lane touched):

- **Determinism.** Layout and physics use seeded mulberry32 streams (`?seed=`, default 7). The physics stream reseeds on reset. A sim clock (`simT`) drives sway and teeter, so a body starts exactly where its figure was drawn. The vendor's `Math.random` is left to particles and camera shake.
- **Task 1: support graph.**
  - Each figure's support is the slab (level 0) or the figure below it. Leaving the standing pose (eaten, or becoming a body) dooms the figure above. That figure trembles for a seeded 0.03–0.07 s, or ≥ 0.15 s if it is inside the rim, then becomes an **active body**.
  - **Bodies:** gravity 26; an initial tip along the column's current lean plus 35% toward the hole; horizontal speed grows with height (0.45 + 0.11 × level).
  - **Collision:** an angular tip (pitch / roll decomposed through the figure's yaw), and a 2-sphere capsule (mid and head) against:
    - the slab or ocean floor (bounce, friction, topple flat, then **rest** lying exactly at ground + 0.12);
    - other bodies (separation plus velocity exchange);
    - resting bodies, **sideways only, so nothing ever rests on a body** (the grounding invariant);
    - **standing figures of other columns**: a hit above 1.1 m/s knocks that figure loose with an impulse, and its column loses support above it (**domino**).
  - **Budget:** at most 220 active bodies. Overflow waits **frozen** (pending) and is released nearest-to-hole first as bodies rest or are swallowed. Standing, resting and pending figures cost nothing per step.
- **Task 2: hole and camera.**
  - **Hole speed:** `VMAX` table `[[2,11],[3.5,9.8],[5,8.6],[7,7.4],[10,6.2],[14,5.4]]`. The hole accelerates toward v_max(r) with response 14/(1 + 0.25 r): heavier means slower and swingier.
  - **Camera:** BHC's follow camera, scaled out by `camK`. Every 6 frames it finds the **tallest still-standing tower within 16 + 2.5 r**, then finds the smallest scale at which a probe camera projects that tower's head inside the viewport (|x| ≤ 0.9, y ≤ 0.86 NDC), and eases to it.
  - **Cine:** a pull-back on every state completion; the opening reveal is kept.
- **Task 3: eat feel.**
  - **Rim teeter:** entering the rim (trigger + 1.4) starts a seeded 0.15–0.3 s teeter, with roll and pitch wobble that grows over 0.3 s. A base figure drops only after it. Support loss inside the rim honours the same clock.
  - **Completion banner:** `"<Name> down — <pop/1e6, 1 dp>M people · tallest stack <max column height>"` from the inlined table.

**Play evidence, real input:** `tests/play-capture.cjs` boots the served build with **no test hooks** and drives it only with CDP touch events: a tap to start, then a held finger swept in a figure-eight. 150 s of wall time on the CPU renderer; **0 page errors**; 233 people eaten, size 3.6, collapses active throughout.

| File | Contents |
|---|---|
| `tasking/opus-shots/play-real-touch-drag.mp4` | the capture |
| `play-real-touch-contact-sheet.png` | the capture as stills |
| `collapse-bodies-on-slab-390x844.png` | toppled figures lying on the slabs beside crumbled towers |
| `play-log.json` | per-shot HUD: size, eaten, active, pending |

**Served-build verification:** both harnesses serve the folder over HTTP, so the ES-module imports resolve the way they do on Pages. The game booted and ran with 0 page errors in both.

**SHOW YOUR WORK.**
- **Method:** I read the shipped v4 `index.html` and the vendor stage loop (gp3d already steps a fixed 1/60, which is what made determinism achievable). I then wrote the 9 specs against a `window.__SIM` hook contract and pushed them red. The sim replaced the scripted stagger in `update()` / `pre()`; layout code is unchanged except seeded randoms and column ids.
- **Tools and commands:**
  - `node games/state-hole/tests/spec.cjs [name…]`: Playwright Chromium at 390×844, local HTTP server, `?test=1&seed=7`, fixed-step `__SIM.step`;
  - `node games/state-hole/tests/play-capture.cjs OUTDIR SECONDS SHOT_MS`: real touch;
  - `ffmpeg` for the clip and contact sheet.
- **Hooks:** `__SIM` scripts only the simulation (steps, move vector, hole placement). Play evidence never uses it.

**Queue:** no tasks remain in this file. Moth, please restock. Open items: perf-frame needs a GPU profile; the Texas example number needs a ruling.

## DONE — TASK 4: capture field (Opus, Nov 27)

**Spec tests 6–10** were written first and pushed red (0/5), then the field was implemented. **Full suite: 13/14 pass, 0 page errors** (`tasking/opus-shots/spec-results.txt`).

| Test | Result |
|---|---|
| field-radius | **PASS**: field = **2.2 × rim (swallow) radius** (4.93 at size 2). At 2.1× the figure leans 0.29 rad toward the hole within 0.5 s. At 2.4× it is untouched after 2 s: no lean, 0 movement. |
| drag-along | **PASS**: a downed figure in the field while the hole drives 20.2 m in 2 s; the figure travels **16.9 m along the hole's direction (84%)**, still tumbling with it |
| no-free-sucks | **PASS**: 1.6 M figure-steps checked outside the field during a 5 s drive; **0 moved**, and 0 pulls applied outside the field (internal counter) |
| strip-without-touch | **PASS**: hole parked 4.28 from the base, inside the field (4.93) but outside the rim zone (3.64). **NY's 17-stack falls completely in 1.67 s, TX's 22-stack in 1.87 s**; the rim never touched them |
| tail-escapes-stay | **PASS**: after a drive and an exit, 74 figures lying outside the field; **0 moved, 0 woke** over 3 s |
| perf-frame | still red: SwiftShader rendering, as reported in the Task 1–3 DONE entry. Sim cost is now 0.29 ms update + 1.45 ms pose per frame. |

The earlier specs stay green, including teeter-before-fall. Task 4 first exposed a gap there: a figure whose support was knocked away *outside* the rim could drift into the rim and drop at once. Fix: a doomed figure that enters the rim still waits out its 0.15–0.3 s teeter.

**What changed** (`index.html`):

| Piece | Behaviour |
|---|---|
| Field radius | `FIELD = 2.2` × rim radius, recomputed each step from the hole size |
| Standing base figures in the field | Lean toward the hole: 0.25 → 1.15 rad as the distance closes, eased in over 0.25 s and drawn through the figure's yaw. They lose their footing after 0.15 s (at the rim) to 0.75 s (at the field edge), and never faster than the rim teeter. They then become Task 1 bodies tipped straight at the hole, so the rest of the tower falls through the support graph: **tower stripping**. |
| Downed and falling figures in the field | Resting figures are woken. Bodies are dragged toward **85% of the hole's velocity plus an inward pull of 0.8 + 2.5(1 − d/F)² m/s**, at an easing rate of 8/s, with no ground braking while dragged and no settling inside the field. They lag to the trailing side as a comet tail and feed the rim, where the existing swallow takes them. |
| Outside the field | **No pull of any kind.** The old near-rim pull was removed. Bodies brake, settle and stay where they lie. |
| New `__SIM` hooks | `figOf`, `figInfo`, `rimR`, `fieldR`, `rimZoneR`, `placeDowned`, `outsideField`, `colStanding`, `fieldViolations` |

**Moth's first pass:** `index.html` had no field code from Moth's lane when I took this task (its last change was my `3243bdd`), so there was nothing to merge. If a first pass lands later, these specs are the contract.

**Play evidence, real touch only, no hooks:** `tests/play-capture.cjs`; 150 s wall time; **0 page errors**; 360 eaten, size 4.0, 51 bodies active at the end.

| File | Contents |
|---|---|
| `tasking/opus-shots/task4-capture-field-real-touch.mp4` | the capture |
| `task4-comet-tail-strip.png` | the dragged swarm clustering and travelling with the hole |
| `task4-dragged-tail-390x844.png` | a full-size frame |
| `task4-play-log.json` | per-shot HUD log |

**SHOW YOUR WORK.**
- **Method:** specs first, against new read-only and setup hooks. The field lives inside the existing fixed-step loop: base-figure lean and footing in `update()`, drag in `stepBody()`, lean drawing in `pre()`. Determinism holds because there is no new randomness and the field is a pure function of distance and hole velocity.
- **Commands:**
  - `node games/state-hole/tests/spec.cjs [names…]`
  - `node games/state-hole/tests/play-capture.cjs OUTDIR 150 300`
  - `ffmpeg` for the clip and stills

**Queue:** no tasks remain in this file. Moth, please restock. Open items: perf-frame needs a GPU harness profile; the Texas 30.5M vs 31.7M ruling.

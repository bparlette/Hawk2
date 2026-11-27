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

# DEAD HALL — Opus Tasking: Harden the Combat Systems

**Game:** Dead Hall — bodycam horror rail game (police bodycam UNIT 2210 auto-walking a condemned building at night).
**Repo / path:** bparlette/Hawk2 · `games/dead-hall/`
**Proven base sample:** https://bparlette.github.io/Hawk2/games/bodycam-corridor/ (recipe: gamepress `docs/BODYCAM.md`)
**Your job:** the Moth build of Dead Hall is the spine. You HARDEN its combat systems — you do not rebuild the game, re-stage the rooms, or touch the walk/camera.

## MAIN-ONLY RULE
Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after.

## Locked design — do not relitigate
- Movement and camera are **100% automatic, always**. No steering, no joystick, no free look. The camera peeks into rooms on its own.
- Player input is exactly two things: a contextual **ACTION** button (tap OPEN a door, HOLD/mash to keep a pounding door shut, PUSH furniture, timed GRAB) and **STAB** during grabs.
- Found-footage HUD is the whole interface: REC dot, real-clock timestamp, battery, L/R audio meters, film grain, camera-mounted light. Portrait 390×844, buttons z-index ≥ 1100, double-tap zoom blocked.
- **Originals only:** all figures are original creations. The 12 rooms homage famous compositions/staging — no likenesses of copyrighted characters, ever.
- Room order and the combat model below are locked. Escalation = tighter windows + faster bite meter, **never** raw tap count.

## The combat model you are hardening
- A grab **opens with a COUNTER WINDOW of ~1.0 s (tunable 0.8–1.2 s)** as the attacker lunges. STAB inside it = counter/stagger, bite meter drains. A miss = bite surge + a harder finish — **not** instant death.
- Finish phase = mash with a **pulsing strike window** (on-pulse thrusts count double), **tap cap ~25**. Final thrust goes to the head, lens spatter, walk resumes.
- Fail = bite meter fills → **SIGNAL LOST**, run restarts.
- HUD as threat sensor: audio meters spike **~1 s before** a room's dread cue.
- Fake-outs sit between attacks; one fake-out lands right after a tense fight; one real attack follows the longest quiet stretch. On repeat runs, 2–3 mid rooms swap live/fake.
- **DON'T-STAB decoys in exactly 2 rooms:** a panicked worker / dazed guard bursts out. Fair tells are mandatory and must be readable in the split second (raised trembling hands, their own flashlight, badge/uniform, panicked voice). Wrong stab = consequence, never death (camera light knocked loose → next room darker, or the next encounter's counter window shrinks). Withhold = they flee and dispatch confirms on a radio card ("2210 — that's a civ, hold fire").
- Dispatch subtitle cards between rooms: one officer, one building, one investigation.

## Scope — test-first, in this order
Write the spec tests FIRST, red until implemented. The harness output is the evidence — for your work too, self-reported numbers don't count.

1. **Encounter state machine** as a clean, tested module: `idle → dread → counter window → finish mash → resolve`, driven by room definitions, no encounter logic smeared through the render loop.
2. **Counter-window timing model:** 0.8–1.2 s window with a **per-room tuning table** (all 12 rooms), bite-surge amount on miss, stagger payoff on hit.
3. **Strike-pulse mash scoring:** pulse cadence, double-count on-pulse thrusts, tap cap ~25 enforced, final-thrust trigger.
4. **Decoy logic:** tell presentation timing (tells must land before the stab decision point), withhold detection (~2 s), consequence plumbing (light-loose flag, next-window shrink).
5. **Live/fake swap seeding:** run-to-run seed that swaps 2–3 mid rooms live/fake while keeping room 12 always empty and the room-7 sprint always live.
6. **Headless playtest harness** that plays encounters with scripted inputs and PROVES, with printed results:
   - counter-success path (stab in window → stagger → finish → walk resumes)
   - miss path (no stab → bite surge → harder finish, still winnable)
   - decoy right path (withhold → figure flees, dispatch card fires)
   - decoy wrong path (stab → consequence applied, no SIGNAL LOST)
   - a full scripted 12-room clear
   - the SIGNAL LOST path (never stab → bite fills → feed cuts → restart state clean)

## Working rules
- Integrate into the Moth build; where its encounter code is ad hoc, refactor it into your tested module **in place** — same behavior, proven by the harness before and after.
- Measure the delivered build (draw calls, encounter timings from the harness, file bytes). If a number in this brief and the build disagree, the build wins and you say so in your report.
- Audit token discipline: do not open images, video, or audio. Grep large files instead of reading them whole; don't re-read files already read.
- Audio is procedural WebAudio with the iOS rules (audioSession playback, silent-buffer unlock, resume on gesture) — if you touch audio cues, keep those intact.

## Deliverable
Committed to Hawk2 main: the hardened systems + the harness, with the harness's full printed proof in your response file under `games/dead-hall/tasking/responses/` — every path above shown passing, plus before/after encounter-timing measurements from the actual build.

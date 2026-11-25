# OPUS-NEXT — Hospital Escape tasking for Opus
Repo: https://github.com/bparlette/Hawk2 — branch main — folder games/hospital-escape/
Live game: https://bparlette.github.io/Hawk2/games/hospital-escape/

## PROCESS — READ FIRST (Cherie, Nov 25): PUSH BEFORE TESTING, AND PUSH OFTEN

**Push before testing, and push often.** Commit and push to main BEFORE running the test/verification suite, and push after each finished item — if credits run out mid-run, the work must already be on main, never stranded locally. Verification still happens and gets reported; it just runs after the push, not before. This applies to every remaining run, including the stretch task below.

## FINAL BUNDLE — INTEGRATE — DONE (Opus, Nov 25: responses/opus-integrate.md; all four steps, verification green)

One task, one verification pass, one response file. Everything below is "wire in what is already built" — no new asset creation. Work the steps in order; run the full guardrail suite ONCE at the end, not per step.

### Step 1 — CAST-QUALITY integration
Wire Neon's five figures (commit df65d44; GLBs + integration manifest in her delivery, response tasking/responses/neon-cast-quality.md) into cast3d.js so they are live in the game: Dr. Hale, fixed Cole (bed offsets for the 0.72 m mattress), the lying patient, female + male nurses. The ?cast=painted fallback stays available.

### Step 2 — Bed-push staging
Maya pushes from BEHIND the bed with TWO hands (Cherie's ruling, Nov 24 — supersedes the as-is clip approval; the clip is fine, the staging was the defect).

### Step 3 — Long-gun integration
Swap in the Stribog SMG from GEAR-FIX (commit 582b182) using Neon's exported muzzle data so flashes track the gun. Same pass, while cast/weapon code is open — keep it cheap.

### Step 4 — TRANSITION-HITCH
The long pause at the scene 2/3 transition Cherie hit on her phone: instrument both transitions, preload/stream assets ahead of the cut, target under 0.5 s of hitch, proven with a timed real-input run.

### Verification (once, at the end)
Engine 24/24 · data validation 0 errors · fairness PASS · camera audit PASS · full playthrough 0 page errors. Phone-size (390×844) stills: Hale dialogue beat, patient on the bed, both nurses, the restaged bed push, the elevator door-block with the long gun in hand.

### Response
tasking/responses/opus-integrate.md — per the SHOW YOUR WORK rule: method, tools/commands, output locations for each step, plus the timed transition numbers and the stills.

## NEXT TASK — DESTRUCTION BEHAVIORS (Cherie, Nov 25 — Opus's active task: the hard thing)

**ENHANCE, don't just fix (Cherie, Nov 25).** Your job on destruction is not just to fix but to ENHANCE — make it more fun and more realistic. The first stab (below) is a floor, not a ceiling: keep what's good, replace what's flat, and add what it needs. You have explicit license to go beyond the first stab's design wherever it makes crashes feel better — physical believability (weight transfer, suspension bounce/settle, crumple and debris that match impact direction and speed, sparks on metal contact, outcomes scaled by impact speed) AND game feel (readable cause-and-effect, satisfying chain reactions, variety so no two wrecks play the same).

Cherie re-pointed Opus at the hard engineering (Nov 25): the car-crash destruction system. The routine defect bundle moved to Moth (below); the vehicle MODELING stays Moth's too. This system is Opus's.

When the player destroys a vehicle (chase / drive beats), vary the outcome — not the same stop every time:
1. **Veer + chain crash:** the wreck sometimes veers into another vehicle and takes it out too.
2. **Rollover:** sometimes the car rolls — 2–3 full rolls with bounce/settle, shedding debris as it goes.
3. **Fire:** sometimes it catches fire — the house fire standard: dark smoke puffs + gold-orange ember glow under the hood/body, NO flame tongues.
4. **Blown tire:** sometimes a tire blows — the car pulls hard to one side, limps on the rim with sparks, tire shred/debris.
5. **Window gunman:** during the chase, a gunman leans out of a car window and shoots at the player. He is a valid target wired into the shooting/fairness systems, not set dressing.

Probabilities/tuning are your call, but every behavior must actually occur in a normal playthrough of the chase (not 1-in-100 rarities), and the fairness audit must still PASS with the window gunman firing.

**Built against the CURRENT in-game vehicles.** Moth is modeling replacement vehicles in parallel (VEHICLE-QUALITY, in the Moth section below). Build the destruction system against a clean interface to the vehicle objects — destruction hooks, per-vehicle state, debris/fire attachment points — so Moth's modeled vehicles drop in later without reworking the system. Note the interface you define in the response file so Moth can model to it.

**PROCESS is load-bearing here (see top of file): push before testing, push often.** Land increments on main behavior-by-behavior — each behavior working and pushed before the next starts — so a credit cutoff never strands work. Whatever remains unfinished when credits run out, Moth finishes from main; leave the response file current after each increment so the handoff state is never only in your head.

**Frame budget:** stay inside the frame budget T4-PERF bought back — report frame time before/after per beat (SwiftShader-relative, labeled as such).

### First stab + reading list (Moth, Nov 25 — read this before opening anything else)

Moth took a first stab so you spend your credits modifying, not starting from zero: **`game/destruction.js`** — a self-contained `HE.Destruction(game)` module with the outcome picker (veer / rollover / fire / blowout weighted per killing component, speed-gated), per-outcome motion driving the same `p.v` / `p.lat` fields chase's stock crippled branches drive, chain-crash targeting through the real `hitComponent` damage path, a debris pool, an ember-glow fire treatment (no flame tongues), and the window gunman firing through `combat.fairTick / fairFire / fireAtHero` so the fairness audit covers him. It is NOT wired in and NOT play-tested; the exact one-line hooks it needs are listed in the ADAPTER comment at the bottom of the file (director construction + step call, one inserted else-if in chase.step, one branch in combat.shoot, one block in main.js present()). Your job: review it, modify it, integrate it — per the ENHANCE note at the top of this section, go beyond it where the crashes feel better. Push increments to main per the PROCESS rule.

**READ (only these):**
- `tasking/OPUS-NEXT.md` — this file.
- `game/destruction.js` — the first stab. Start here; this is the file you modify.
- `engine/chase.js` — all of it (63 lines): pursuer states, `hitComponent`, `setState`, `place`, the stock crippled branches your `drive()` hook sits in front of.
- `engine/director.js` — line 73 (where `game.chase` is constructed; `game.destruction` goes next to it) and lines 134–150 (`game.step` order: your `step()` call lands right after `game.chase.step(dt)` on line 144).
- `engine/combat.js` — `c.shoot` lines 31–46 (hit routing; your gunman branch goes here), and the fairness contract: `fairFire` line 103, `fairTick` line 105, `fireAtHero` line 111.
- `game/main.js` — the chase presentation loop in `present()` at line 238 (lightbar / spin / smoke flags; your `pose()` + FX drain land here, and the stock spin needs the `owns()` guard), and the `pursuer` / `burn` event handlers in `processEvents` at lines 459–461.
- `game/art.js` — `A.car` lines 236–256 only (zones, wheels, driver, lightbar — the rig the module reads), plus `A.person` line 80 and `A.pose` lines 172–198 for the gunman figure.
- `engine/data.js` — lines 97–124 (pursuer wave defs; pursuer + component tuning). Note the shipped game runs `game/level1.js` data: fairness tuning is `level1.js` line 163 (`telegraph 0.6, minPx 40, margin 0.03, seenOnly: true`) — that one line only.
- `tools/fairness-audit.cjs` — lines 1–30 (what the audit actually checks: every heroHit matched to an `enemyShot` whose logged `vis` was in-zone, unoccluded, ≥ minPx, ≥ telegraph at fire time).

**DO NOT OPEN (token waste for this task):**
- Everything under `games/hospital-escape/tasking/refs/` — the 360° vehicle images are Moth's modeling references; destruction work needs none of them.
- All stills / screenshots / shorts folders and response-image folders (`tasking/responses/*-shots/`, `games/hospital-escape/shorts/`, every `*-shots` / `*-stills` directory).
- `games/hospital-escape/mixamo/` and `games/hospital-escape/mixamo-viewer/`.
- `tasking/responses/*.md` — all of them except your own `opus-destruction.md` once it exists.
- The sample pages: `games/hospital-escape-dressing/`, `games/hospital-escape-bakeoff/`, `games/hospital-escape-vehicles/`, and the hallway sample folders.
- Also skip for this task: `game/painted.js`, `game/painted-data.js`, `game/cast3d.js`, `game/post.js`, `game/t4look.js`, `game/world.js`, `game/enclose.js`, the rest of `game/level1.js`, `engine/greybox.js`, `engine/rail.js`, `engine/tests.js` (run the tools; don't read them).

### Verification (all must pass on the final code)
Engine tests · validate-data · fairness audit — must PASS with the window gunman firing · camera audit · full playthrough 0 errors. Evidence: a clip showing at least the rollover and the chain crash, and a still of the window gunman in action.

### Response
tasking/responses/opus-destruction.md — per the SHOW YOUR WORK rule: method, tools/commands, how each behavior is implemented, the vehicle-object interface you defined, and the tuning probabilities you chose.

Work on main only, no branches. Push before testing, push often — commit + push each behavior as it lands, then the response file updates.

## STRETCH TASK — OPTIONAL (Cherie, Nov 25 — only if DESTRUCTION BEHAVIORS is done and credits remain; nothing blocks on this)

Two designed-but-unbuilt flourishes. If credits run out before or during this, that is fine — the destruction system is the run that matters. Push-before-testing applies here too (see PROCESS at the top).

### (a) "DOORS HELD" end card
The designed end card for the elevator beat — the door-block moment gets its "DOORS HELD" card as designed. Wire it into the beat's end as specced in the design notes; keep it in the game's existing subtitle/card style.

### (b) Room 412 ECG beep
A subtle ECG beep for Room 412, built as procedural audio consistent with the game's existing procedural SFX. The game has NO voice assets and stays that way — this is a quiet monitor beep only, mixed low, not a dialogue or music element. (Note: no ECG beep exists in any captured footage — this is new, designed work, so keep it tasteful and subtle.)

### Verification + response
Same gates as the destruction task for anything touched: full guardrail suite green (engine tests · validate-data · fairness audit · camera audit · full playthrough 0 errors). Response: append to tasking/responses/opus-destruction.md or write a small tasking/responses/opus-stretch.md — your choice. SHOW YOUR WORK detail, same as always.

Work on main only, no branches. Push before testing, push often.

## REASSIGNED TO MOTH (Nov 25) — not Opus's

### FINAL DEFECT BUNDLE (reassigned to Moth, Nov 25 — Moth does this pass; text preserved from Opus's queue)

Two known residuals from INTEGRATE, fixed in one pass. (Moved here Nov 25 when Cherie re-pointed Opus at DESTRUCTION BEHAVIORS — the hard thing is his; this routine bundle is Moth's.)

### Defect 1 — Bed-push frame bump
The residual ~215 ms frame bump ~1.2 s into the bed-push beat, when the first wave's cover prop spawns. Fix it the same way TRANSITION-HITCH was fixed: pre-warm / pre-spawn the cover props ahead of the beat so nothing loads, compiles, or spawns cold mid-beat.

### Defect 2 — Transfer-corridor camera warning
The camera audit's one pre-existing warning: a pillar in the transfer corridor can fill much of the screen in some views. Fix the framing (camera path / pillar placement — your call) so the camera audit passes with ZERO warnings.

### Verification (once, at the end, all on the final code)
Full guardrail suite green: engine tests · validate-data · fairness audit · camera audit with **0 warnings** · full playthrough 0 errors. Plus frame-timing evidence for the bed-push bump: before/after numbers (SwiftShader-relative, labeled as such).

### Response
tasking/responses/moth-final-defects.md — per the SHOW YOUR WORK rule: method, tools/commands, what was pre-warmed/pre-spawned, how the corridor framing was fixed, and the before/after bump timings.

Work on main only, no branches. Commit + push when done, then the response file.

### VEHICLE-QUALITY (un-parked by Cherie, Nov 25; reassigned to Moth, Nov 25 — full text preserved; Moth works from this)

Bring the vehicles up to the standard the cast and world now set.

**Quality bar (Cherie, Nov 25: "More like Scaggsville quality — or better yet"):** the floor is the Scaggsville 3D fleet — the shared gamepress kit/gpvehicles.js data-row cars: modeled from reference images, rounded forms, proper lamps and headlight beams (quality floor = Neon's Bunny Hop / Scaggsville cars). The target is to MEET OR BEAT that standard, not merely improve on the current blockouts. Where practical, build the ambulance and chase vehicles in the same data-row spirit so the work is reusable across games.

**Modeling references:** 360° views for the ambulance, the Charger, the traffic cars, and a black SUV are in `games/hospital-escape/tasking/refs/vehicles/` (board: `index.html`, sources: `SOURCES.md`) — model proportions from them; references only, none ship.

- **Hero ambulance** (steal / drive-away / chase / finale beats): modeled detail instead of blockout shapes — proper cab/body proportions, wheels that read as wheels, open rear doors with a lit interior and the stretcher visible, rear step, working light treatment: headlight beams, taillight glow, emergency lightbar with a believable flash pattern, reflective markings.
- **Chase car(s):** same bar — real proportions, lit headlights/taillights, no box-with-wheels silhouettes.
- **Traffic / set vehicles** wherever they appear: at minimum, no unlit boxes in any framed shot.

**Destruction behavior:** moved OUT of this task Nov 25 — it is now Opus's active task (DESTRUCTION BEHAVIORS, above): the crash system is his, the modeling below is Moth's. The two meet at the vehicle-object interface Opus defines in tasking/responses/opus-destruction.md — models must expose what the destruction system needs (per-vehicle group, wheels, lamp/glass parts, attachment points).

**Constraints:**
- Stay inside the frame budget T4-PERF bought back — report frame time before/after per beat (SwiftShader-relative, labeled as such).
- No new external assets with unclear licenses for a shipped build — procedural / modeled-in-code or existing repo assets only.
- Maya's ambulance driving figure is OUT of scope (separate open item, Cherie's call).

**Verification (all must pass on the final code):** engine tests · validate-data · fairness audit · camera audit · full playthrough 0 errors. Evidence: before/after stills at 390×844 for the ambulance rear (doors open), the chase, and one traffic frame; plus a short clip of the lightbar + headlights in the drive-away.

**Response:** tasking/responses/opus-vehicle-quality.md — per the SHOW YOUR WORK rule: how the work was done (tools/commands, where the models were built, how the lights were faked or made real).

Work on main only, no branches. Commit + push when done, then the response file.

Standing note: cross-corridor fire doors stay T4-true near-black unless Cherie says otherwise.

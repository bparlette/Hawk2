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

## NEXT TASK — FINAL DEFECT BUNDLE (Cherie, Nov 25 — Opus's final run; credits almost out, so this is deliberately SMALL: one run, one verification pass, one response file)

Two known residuals from INTEGRATE, fixed in one pass. Nothing else — VEHICLE-QUALITY has been reassigned to Moth (see below) and is NOT part of this run.

### Defect 1 — Bed-push frame bump
The residual ~215 ms frame bump ~1.2 s into the bed-push beat, when the first wave's cover prop spawns. Fix it the same way TRANSITION-HITCH was fixed: pre-warm / pre-spawn the cover props ahead of the beat so nothing loads, compiles, or spawns cold mid-beat.

### Defect 2 — Transfer-corridor camera warning
The camera audit's one pre-existing warning: a pillar in the transfer corridor can fill much of the screen in some views. Fix the framing (camera path / pillar placement — your call) so the camera audit passes with ZERO warnings.

### Verification (once, at the end, all on the final code)
Full guardrail suite green: engine tests · validate-data · fairness audit · camera audit with **0 warnings** · full playthrough 0 errors. Plus frame-timing evidence for the bed-push bump: before/after numbers (SwiftShader-relative, labeled as such).

### Response
tasking/responses/opus-final-defects.md — per the SHOW YOUR WORK rule: method, tools/commands, what was pre-warmed/pre-spawned, how the corridor framing was fixed, and the before/after bump timings.

Work on main only, no branches. Commit + push when done, then the response file.

## STRETCH TASK — OPTIONAL (Cherie, Nov 25 — only if the FINAL DEFECT BUNDLE is done and credits remain; nothing blocks on this)

Two designed-but-unbuilt flourishes. If credits run out before or during this, that is fine — the defect bundle is the run that matters. Push-before-testing applies here too (see PROCESS at the top).

### (a) "DOORS HELD" end card
The designed end card for the elevator beat — the door-block moment gets its "DOORS HELD" card as designed. Wire it into the beat's end as specced in the design notes; keep it in the game's existing subtitle/card style.

### (b) Room 412 ECG beep
A subtle ECG beep for Room 412, built as procedural audio consistent with the game's existing procedural SFX. The game has NO voice assets and stays that way — this is a quiet monitor beep only, mixed low, not a dialogue or music element. (Note: no ECG beep exists in any captured footage — this is new, designed work, so keep it tasteful and subtle.)

### Verification + response
Same gates as the defect bundle for anything touched: full guardrail suite green (engine tests · validate-data · fairness audit · camera audit · full playthrough 0 errors). Response: append to tasking/responses/opus-final-defects.md or write a small tasking/responses/opus-stretch.md — your choice. SHOW YOUR WORK detail, same as always.

Work on main only, no branches. Push before testing, push often.

## REASSIGNED TO MOTH (Nov 25) — not Opus's

### VEHICLE-QUALITY (un-parked by Cherie, Nov 25; reassigned to Moth, Nov 25 — full text preserved; Moth works from this)

Bring the vehicles up to the standard the cast and world now set.

**Quality bar (Cherie, Nov 25: "More like Scaggsville quality — or better yet"):** the floor is the Scaggsville 3D fleet — the shared gamepress kit/gpvehicles.js data-row cars: modeled from reference images, rounded forms, proper lamps and headlight beams (quality floor = Neon's Bunny Hop / Scaggsville cars). The target is to MEET OR BEAT that standard, not merely improve on the current blockouts. Where practical, build the ambulance and chase vehicles in the same data-row spirit so the work is reusable across games.

**Modeling references:** 360° views for the ambulance, the Charger, the traffic cars, and a black SUV are in `games/hospital-escape/tasking/refs/vehicles/` (board: `index.html`, sources: `SOURCES.md`) — model proportions from them; references only, none ship.

- **Hero ambulance** (steal / drive-away / chase / finale beats): modeled detail instead of blockout shapes — proper cab/body proportions, wheels that read as wheels, open rear doors with a lit interior and the stretcher visible, rear step, working light treatment: headlight beams, taillight glow, emergency lightbar with a believable flash pattern, reflective markings.
- **Chase car(s):** same bar — real proportions, lit headlights/taillights, no box-with-wheels silhouettes.
- **Traffic / set vehicles** wherever they appear: at minimum, no unlit boxes in any framed shot.

**Destruction behavior (Cherie, Nov 25):** when the player destroys a vehicle (chase / drive beats), vary the outcome — not the same stop every time:
1. **Veer + chain crash:** the wreck sometimes veers into another vehicle and takes it out too.
2. **Rollover:** sometimes the car rolls — 2–3 full rolls with bounce/settle, shedding debris as it goes.
3. **Fire:** sometimes it catches fire — the house fire standard: dark smoke puffs + gold-orange ember glow under the hood/body, NO flame tongues.
4. **Blown tire:** sometimes a tire blows — the car pulls hard to one side, limps on the rim with sparks, tire shred/debris.
5. **Window gunman:** during the chase, a gunman leans out of a car window and shoots at the player. He is a valid target wired into the shooting/fairness systems, not set dressing.

Probabilities/tuning are your call, but every behavior must actually occur in a normal playthrough of the chase (not 1-in-100 rarities), and the fairness audit must still PASS with the window gunman firing.

**Constraints:**
- Stay inside the frame budget T4-PERF bought back — report frame time before/after per beat (SwiftShader-relative, labeled as such).
- No new external assets with unclear licenses for a shipped build — procedural / modeled-in-code or existing repo assets only.
- Maya's ambulance driving figure is OUT of scope (separate open item, Cherie's call).

**Verification (all must pass on the final code):** engine tests · validate-data · fairness audit · camera audit · full playthrough 0 errors. Evidence: before/after stills at 390×844 for the ambulance rear (doors open), the chase, and one traffic frame; plus a short clip of the lightbar + headlights in the drive-away; plus a clip showing at least the rollover and the chain crash, and a still of the window gunman in action.

**Response:** tasking/responses/opus-vehicle-quality.md — per the SHOW YOUR WORK rule: how the work was done (tools/commands, where the models were built, how the lights were faked or made real).

Work on main only, no branches. Commit + push when done, then the response file.

Standing note: cross-corridor fire doors stay T4-true near-black unless Cherie says otherwise.

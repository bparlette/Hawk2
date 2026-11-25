# OPUS-NEXT — Hospital Escape tasking for Opus
Repo: https://github.com/bparlette/Hawk2 — branch main — folder games/hospital-escape/
Live game: https://bparlette.github.io/Hawk2/games/hospital-escape/

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

## PARKED — do not start in this bundle
VEHICLE-QUALITY (Scaggsville fleet cars in; ambulance model stays). Next task if credits allow. It does not block anything above.

Standing note: cross-corridor fire doors stay T4-true near-black unless Cherie says otherwise.

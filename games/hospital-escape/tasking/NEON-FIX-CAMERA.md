# NEON-FIX-CAMERA.md — Hospital Escape: over-shoulder camera + two-way fire

**For:** Neon (visual slice lane) · **Repo:** bparlette/Hawk2, **main only, no branches** · **File you change:** `games/hospital-escape/index.html` (step one only)

> **Reading note (first line, per Cherie):** Cherie's direction was dictated and one word came through garbled — "Need to see that **moth** are shooting" is read as "Need to see that **both** are shooting" (Cole and Maya). Everything below follows that reading.

Cherie's words (Nov 22, 23:31 EST), verbatim:

> "I want to see a little of him laying in the bed and a little of the girl pushing. Same for the wheel chair. Camera is kind of over shoulder not first person. Need to see that both are shooting. Need to see them getting shot at more."

The audit of step one found the defect this fixes: the heroes barely exist on screen — the bed/wheelchair read as a dark slab edge in the bottom corner, the ceiling eats 35–45% of the frame, and the gunfire reads one-way (the player shoots; nobody visibly shoots back).

---

## 1. FRAMING — over-the-shoulder, not first person (the core change)

The camera sits **behind and above the heroes**, looking over them down the corridor. The heroes are IN the frame, in the lower portion of it, in every rail beat.

**Bed-push beats:**
- Lower frame shows **part of Cole lying in the bed** — the bed, the blanket, his form under/on it. Not a slab edge: the player must be able to tell "that is a man lying in a hospital bed."
- At the head of the bed, **part of Maya pushing** — her hands on the bed rail / push bar and her figure behind the bed, upper body in frame.
- The bed + Cole + Maya together occupy the lower ~35–45% of the frame height. The corridor ahead and the threats in it stay fully readable above/around them.

**Wheelchair beats:**
- Lower frame shows **part of Cole seated in the chair** — the chair back, his shoulders and head above it.
- Behind the chair, **part of Maya pushing** — her hands on the push handles, her figure behind the chair.
- Same proportion: heroes fill the lower ~35–45% of the frame; the corridor ahead stays readable.

The current framing (heroes = a dark slab edge at the bottom corner, camera effectively first-person at empty-corridor height) is the defect. Do not keep it in any rail beat.

## 2. BOTH HEROES SHOOT

- **Maya fires too.** During the rail beats she is not just a pusher: from the over-shoulder view her arm and weapon come up and fire — visible muzzle flash, visible recoil/aim motion, her shots trace down the corridor like Cole's.
- **Cole fires from the bed / chair** as he does now, and his weapon and muzzle flash must read from the new camera (over his shoulder, not from inside his head).
- Both heroes' fire must be visible on screen in the same beat. If only one muzzle is flashing, the beat is wrong.

## 3. THE HEROES GET SHOT AT — VISIBLY, OFTEN

Incoming fire is currently invisible. Fix all of it:

- **Enemy muzzle flashes** — every enemy who fires, flashes, every time.
- **Tracers / impact effects** — shots coming toward camera must be seen travelling and landing: sparks and impacts on the bed frame, the chair frame, the walls and floor near the heroes.
- **Damage feedback is synced to visible fire** — the red vignette pulses when a visible shot lands near/on the heroes. Never damage from nowhere: if HP drops or the vignette fires, the player saw the shot that caused it in the same moment.
- **Frequency** — in the rail fights, incoming fire should be a near-constant presence, not an occasional event. The player should feel the pair is under fire the whole way down the corridor.

## 4. CEILING / FRAME FILL

With the over-shoulder framing, the dead ceiling band shrinks on its own — do not leave a 35–45% empty ceiling strip. Heroes below, corridor and threats ahead, minimal dead space above. Everything must still read at phone size (390×844): threats ahead identifiable, both heroes identifiable, fire in both directions identifiable.

## 5. SCOPE AND RULES (unchanged from NEON.md)

- **Step-one beats only** (room visit → bed push → transfer → wheelchair corridor). No new beats, no scope growth.
- Same single file: `games/hospital-escape/index.html`. Nothing else in the repo changes.
- three.js **only** via the pinned CDN (`https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`) — never inlined, never a private copy.
- FIRE button stays big, bottom-right, **z-index ≥ 1100**; touch controls per the gamepress standard already in the file.
- `window.__dbg` keeps working (the audit drives the game through it).
- iOS audio unlock chain stays as is.
- Work in **main**, commit and push to main, no branches.
- **Response:** write `games/hospital-escape/tasking/responses/neon-fix-camera.md` with **honest 390×844 captures** of (a) the bed push and (b) the wheelchair corridor, taken from the shipped build, showing the new framing: heroes in frame, both shooting, incoming fire visible. Report the file's exact byte size and your commit.

## 6. CAMERA SPEC — shared numbers (engine-neutral)

These numbers are the **shared spec for both lanes**. Opus's engine (`games/hospital-escape/engine/`) drives its rail rig from data, and the same framing must be expressible there as camera data — so implement to these numbers, not to a one-off hack in the slice. If a number proves impossible in the slice, say so in your response with the number you used instead; do not silently diverge.

All values relative to the rider (Cole) on the rail path, travel direction = forward:

| Parameter | Bed push | Wheelchair |
|---|---|---|
| Camera height above path floor | 1.55 m | 1.45 m |
| Camera height relative to rider | ~0.55 m above Cole's lying/seated eye line | ~0.45 m above Cole's seated eye line |
| Camera back distance (behind the pusher) | 1.15 m behind Maya | 1.0 m behind Maya |
| Lateral offset | 0.28 m to the rider's right (over the right shoulder) | 0.25 m to the rider's right |
| Look-at point | On the path, 6 m ahead, at 1.0 m height | On the path, 6 m ahead, at 1.0 m height |
| Heroes' share of frame height (lower frame) | 35–45% (bed + Cole + Maya) | 35–45% (chair + Cole + Maya) |
| Pusher visible | Hands on rail + upper body, head in frame when path is straight | Hands on handles + upper body, head in frame when path is straight |
| Rider visible | Torso/blanket form + head; weapon arm free to fire | Shoulders + head above chair back; weapon arm free to fire |

Invariants in both: camera never drops to first-person (the heroes never leave the frame in a rail beat); the pusher is never fully occluded by the bed/chair; the aim reticle and the corridor's threat zone stay in the upper-middle frame, clear of the heroes.

---

*Brief written by Moth from Cherie's direction, Nov 22, 2026. Companion files: `tasking/NEON.md` (step-one brief), `tasking/OPUS.md` + `tasking/ENGINE-CONTRACT.md` (engine lane — the camera spec in §6 is written to be lifted into engine data unchanged).*

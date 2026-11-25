# CAMERA-FIX — camera enters walls; rooms lose their walls (Opus)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Opus. **Response:** `games/hospital-escape/tasking/responses/opus-camera-fix.md` (SHOW YOUR WORK).
**Evidence:** `games/hospital-escape/tasking/camera-fix-evidence/` — the owner's four phone screenshots (base64; decode to view), Nov 24, 20:20–20:24 ET, on the live T4 build.

## Owner phone report (Cherie, Nov 24, 20:26 ET)

Overall: "Pretty good game" — the T4 look plays well. Four defects, all
one family:

1. **Walking through walls** — the camera (and view) passes into/through
   wall geometry.
2. **Sometimes only seeing wall and not people** — the frame fills with
   a wall surface; the cast is not visible (shots 3 and 4: camera
   face-planted in a wall; camera half-inside a wall, corridor visible
   only on the right).
3. **Sometimes only see ambulance wall** — shot 1: the frame is the
   ambulance's side (red stripe) at point-blank range, scene lost.
4. **Sometimes see outside instead of wall** — shot 2: from inside a
   room, the far wall does not render — the view goes through it to the
   outside void (green/blue) beyond a desk. A wall that should enclose
   the room is missing from this side.

## Hypotheses to verify (yours to confirm or refute in the response)

- The rail camera path + drag-aim offset has no collision: at path
  extremes the camera position or near plane enters geometry.
- Some wall meshes are single-sided: viewed from behind/inside they
  vanish (backface), revealing the exterior — matches defect 4.
- The ambulance beat's framing sits too close to the vehicle wall —
  matches defect 3.

## Required outcome

- The camera never enters geometry in any beat, including at drag-aim
  extremes (path clamp, collision pull-in, or near-plane management —
  your call, but prove it).
- Interior walls read as walls from every in-game viewpoint: no
  see-through to the outside void from inside a room.
- The ambulance beat keeps the vehicle AND the people in frame.
- People stay visible: no beat may present a frame of pure wall while
  the cast is active in it.

## Acceptance evidence

- 390x844 stills at the same beats/viewpoints as the four evidence
  shots, before/after.
- A real-input play run through the affected beats with zero page
  errors; guardrails stay green (tests 24/24, data 201/0, fairness
  PASS). The T4 look itself does not change.

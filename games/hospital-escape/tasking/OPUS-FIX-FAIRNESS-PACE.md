# OPUS — FIX: invisible shooters + slow pace (Cherie, Nov 23, 2026)

Source: Cherie played the patient-eyes build (014aaeb) and reported, verbatim:
"Half the game you are getting shot and you can't see who's shooting you.
Also walks so slow."

Her play outranks the harness claim "no damage ever arrives without a
visible red shot." A red tracer existing is not the test. The test is:
**the player can see WHO is shooting them, at phone size, in the
post-processed view (lids, blur, tunnel included), in time to react.**

## FIX 1 — shooter fairness contract (binding, testable)
1. An enemy may only deal damage if, at the moment it fires, it is:
   - inside the frame AND inside the EFFECTIVE visible zone — the part of
     the screen not covered by eyelids/tunnel at the current health, with
     margin. Judge visibility AFTER post-processing, the way the player
     sees it, never from the raw scene.
   - unoccluded by scenery, furniture, or other characters;
   - large enough on a 390×844 screen to identify as a shooter.
2. Telegraph: every shooter must be visible under those conditions for at
   least 0.6 s before its first damaging shot. Enemies who enter, turn a
   corner, or rise into view restart that clock. No damage from a shooter
   in its first 0.6 s of visibility — ever.
3. Every damaging shot's tracer/muzzle must visibly originate from that
   shooter. No anonymous damage: if a hit lands, the player must be able
   to point at who fired it.
4. Off-screen, behind-camera, through-wall, and edge-of-frame fire that
   deals damage is a defect, full stop. Enemies outside the contract may
   still fire VISUAL-ONLY shots (no damage) if a beat needs the pressure.
5. Acceptance test, automated: instrumented runs (autopilot + a
   damage-soak run that never shoots) logging every damage event with the
   shooter's screen position, occlusion state, and visible-for duration at
   fire time. PASS = zero damage events violating 1–3, across 3 seeds.
   Put the log summary in your response. Also capture 3 phone-size frames
   at the moment of first damage in three different beats, shooter circled
   by the frame itself (muzzle flash/tracer origin readable).

## FIX 2 — pace
The turning route is longer; traversal speed did not keep up, and the
on-foot/bed sections feel slow. Requirements:
1. Measure and report per-beat traversal time and total run time for
   pass 2, the current build, and your fixed build (same measurement
   method for all three).
2. Bar: the fixed build's TOTAL run time must be no longer than pass 2's,
   despite the longer route — raise rail/walk speeds and re-stage waves
   to fit. If a specific beat cannot hit the bar without breaking its
   staging, name it and give its number; don't silently miss.
3. Speed must read on screen: keep near-field props/furniture passing at
   the new rate (no speeding through empty space).

## Constraints (unchanged)
- Contract v1 frozen; input model unchanged; hero framing unchanged.
- Patient-eyes effects stay as built (this fix works WITH the lids/blur:
  the fairness zone shrinks as they close in — that is the point of §1).
- 24 engine tests + full autopilot win + lose path still pass; 0 page
  errors; honest phone-cost statement (relative bench only, labelled).
- Work in main only, no branches. Response →
  games/hospital-escape/tasking/responses/opus-fix-fairness-pace.md,
  with before/after numbers for both fixes and the damage-event log.

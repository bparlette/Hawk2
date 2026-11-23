# OPUS — BUILD tasking: Hospital Escape patient-eyes pass (Nov 23, 2026)

Work in main only, no branches. Cherie's order: Opus builds first, then Neon
reviews the new game. This tasking supersedes OPUS-REVIEW.md.

Read first: games/hospital-escape/tasking/PATIENT-EYES-SPEC.md — it is the
whole brief. Build it, all of it:

1. THE NECK — low hunched tilt, constant wobble/drift, turn lag + overshoot
   and settle, head jolt on every hit taken, slow effortful re-centre.
2. THE VISION — focus breathing in and out; blur, double vision and dimming
   scale with damage (extend your pass-2 post pipeline, don't replace it).
3. THE EYELIDS — the signature effect. Black occlusion creeps in from the
   top/bottom edges as health drops; blinks that lengthen and quicken with
   damage; a forced hard blink per hit; under sustained fire the black
   turns and blinks RED and the lids droop toward closed. Floor rule: lids
   never fully close during active play except blink instants; full closure
   is the lose state only (eyelids shut → "COLE IS DOWN").
4. THE AMBULANCE (beats 7–9, worst in the back) — head sway/roll tied to
   the vehicle's turns and speed, scaled by damage; woozy drift on
   straights; aim hard to hold centred.
5. THE ROUTE — kill the straight line. Hospital beats turn left and right
   through open areas and hallways; the road escape takes corners and
   S-curves. Report per beat: turn count, longest straight stretch.
6. THE TRAIN — the finale train must read as a locomotive at phone size,
   not a flat black band (the standing pass-3 fix, folded in here).

HARD CONSTRAINTS:
- Hero framing/size does NOT change (Cherie's ruling). Feel only.
- Engine contract v1 stays frozen; three.js pinned CDN only; input model
  unchanged (drag-aim + FIRE, gptouch on foot); iOS audio chain intact.
- All 24 engine tests pass; full autopilot run wins all 9 beats with
  0 page errors; lose path verified.
- Phone performance: state the added cost over pass 2's five full-screen
  passes honestly in your response — Cherie has not phone-timed pass 2 yet.
- Honest 390×844 captures in your response: healthy vs hurt eyelid states,
  a red-blink moment under fire, an ambulance sway sequence (3+ frames of
  one turn), a route turn inside the hospital.

Write your response to games/hospital-escape/tasking/responses/opus-patient-eyes.md.
When it's live, Neon reviews the new build — build it like she's coming.

# OPUS — review tasking: Hospital Escape patient-eyes implementation (Nov 23, 2026)

Work in main only, no branches. Review only — do NOT build from this yet.

Read first: games/hospital-escape/tasking/PATIENT-EYES-SPEC.md (will be in the
repo with this file). Then audit YOUR pass-2 build (3be95cf) against it,
point by point:
- weak hunched neck: low tilt, wobble/drift, turn lag + overshoot, hit jolts
- breathing focus / hurt-scaled blur and double vision
- eyelids: edge occlusion by health, blinks, forced blink per hit, RED
  blink/droop under sustained fire, full closure only on the lose state
- ambulance sway: head roll/lag tied to vehicle turns, scaled by damage

For each point: present / partial / absent, with file + function evidence
from your own code (post.js, camera rig, feedback wiring) — not impressions.
For every partial/absent point: what you would build, roughly what it costs,
and the phone-performance impact on top of the existing five full-screen
passes (Cherie has not phone-timed pass 2 yet — flag the risk honestly).

Also audit the ROUTE (spec, final section) from your level/route data:
per beat, the turn count and angles, the longest straight stretch, and
which beats are effectively straight lines. If turns are missing, say
what adding them costs in the route data — review only, no build.

Camera framing/size stays exactly as-is (Cherie's ruling) — this is feel only.
The finale train fix from pass 3 still stands as its own item; this review
does not replace it.

Write your review to games/hospital-escape/tasking/responses/opus-patient-eyes-review.md.
Review only — no build until Cherie rules on both reviews.

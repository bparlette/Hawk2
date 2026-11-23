# ADDENDUM to OPUS-FIX-PLAY-VISIBILITY — defect 5
Hospital Escape · Cherie, Nov 23 (second play report, minutes after the first)

## 5. The character in the bed and the chair is not the painted Cole
In the live build, the patient IN the bed and IN the wheelchair is
still the old procedural figure — not the painted Cole from Neon's
pack. Your integration response claimed painted coverage in every
beat; Cherie's play says the bed/chair occupant isn't him.

Fix: wherever the occupant of the bed or the chair is visible — any
beat, any shot, establishing or gameplay — it is the PAINTED Cole,
grounded like the rest of the cast (contact shadow, scene grade,
measured bottoms). If some shot genuinely can't take the painted
frame, name it in the response with the reason — do not silently
leave the procedural figure in.

This is separate from OPUS-FOREGROUND-COLE (the foreground
back-of-head style clash) — that tasking stands as written; this one
is the full figure in the bed/chair.

Proof: captures of the bed occupant and the chair occupant at
390×844 in every beat where they appear, side by side with the
painted Cole frame from the pack. Same no-regression constraints as
the parent tasking (fairness 0 violations + 6/6 control, pace
~209 s, 24/24 tests).

# Hospital Escape — REALISM TARGET (Cherie, Nov 23, 2026)

Source: @rewind02's X post (Nov 23) — a photoreal Japanese train station
built in Blender with an AI rulebook + review loop, almost no outside
assets. Full frame-by-frame analysis: realism-ref/ANALYSIS.md (Moth's
workspace archive; frames in realism-ref/frames1/).

WHAT THE REFERENCE ACTUALLY IS — read this before chasing it:
- The photoreal video contains NO people. Its realism rests entirely on
  architecture, light, and materials. It sets NO character-fidelity target.
- It is an offline Blender render, not real-time. Hospital Escape is
  real-time three.js on a phone. The properties below are the transferable
  ones, in priority order — they are a direction, not a promise of parity.

THE TARGETS (builder-checkable):
1. MATERIALS DO THE HEAVY LIFTING. Tiled floors with grout lines and
   per-tile tonal variation; grime and wear at wall bases and corners;
   tactile/functional details; legible real-world signage text everywhere
   (ward signs, exit signs, room numbers). Nothing is a flat colour.
   → For the hospital: floor tile + grout, scuffed wall bases, readable
   signage on every corridor, worn bed/chair/ambulance surfaces.
2. ONE STRONG LIGHT STORY. A single warm key source + cool ambient fill;
   shadows keep detail (never crushed to black); practical lights
   (ceiling panels, lamps) genuinely illuminate their surroundings.
3. RESTRAINED GRADE. Warm/cool split-tone, slightly desaturated, filmic.
   The punchier and more saturated a frame gets, the less real it reads.
4. SHARP WORLD, MOTION BLUR ON MOVERS. The environment stays deep-focus
   sharp; speed is shown by streaking what moves (the passing train),
   not by softening everything. Lens flare only when facing a bright
   source. (This refines the patient-eyes blur: blur belongs to Cole's
   eyes and to motion — not to the world itself.)
5. ATMOSPHERE. Warm distance haze; dust/damp in the air where light
   shafts land. No fog walls.
6. SOFT LIKE A PHOTOGRAPH. The reference reads real at 720p because it
   is photographically soft. Crisp-and-clean reads as a game. Final
   output softness is a feature, not a defect.
7. NO HUD IN THE REALISM TIER. The reference carries zero interface.
   (Hospital Escape keeps its gameplay HUD — but keep it minimal and
   out of the frame's centre, per the slate HUD budget.)

SEQUENCE: this target lands WITH the patient-eyes build where it's free
(grade, light story, signage pass) and as its own environment/materials
pass after, scoped by Opus's estimate. Neon grades the new build against
this file as well as the patient-eyes spec.

JUDGE FOR YOURSELVES (Cherie, Nov 23): The reference video is in this
folder (refs/realism/post1-station.mp4, with the lesser gameplay tier in
post2-gameplay.mp4, frames in frames1/ and frames2/, and Moth's full
frame-by-frame reading in ANALYSIS.md). Moth's targets above are one
reading. If you think you can push further toward the reference and still
make it work on a phone, say how in your response file and do it — with
the same honesty rules: measured phone-cost statements, no claims without
captures. Opus: fold what you judge feasible into the patient-eyes build
or scope it as the follow-on pass with an estimate. Neon: grade against
the reference itself, not only against Moth's list.

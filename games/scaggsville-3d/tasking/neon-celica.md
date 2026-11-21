# Script this car properly: Rigg's Celica (Neon)

Cherie's verdict on the procedural upgrade of this car, verbatim: "Definetly not neon quality. Is it something neon can script for you" — yes, and this is that ask. You scripted the Camaro body (Blender SubD hybrid) for the bake-off; do the same quality of work for this car.

## The car

Brian Rigg's 1987 Celica GT liftback (T160). Canon that wins over every photo: **blue paint, blue headlight beams (0x0066ff)**.

## Ground truth (already in this repo)

- Real photos: `games/scaggsville-3d/reference/car-real/celica-rigg/` — 8 photos, 1920×1280: front 3/4, side, rear 3/4, straight front, straight rear, **pop-ups up and lit**, wheel detail, interior. Read its SOURCES.md: the set car is a 1986 GT-S standing in for the '87 GT — same shell, panels, glass, and pop-ups; the differences are engine/badges/wheels/interior only.
- Detail audit: same folder's PHOTO-AUDIT.md entry (also at `games/scaggsville-3d/reference/car-real/PHOTO-AUDIT.md` if present) — pop-ups in both states, glass hatch with wiper, black moulding band.
- The current procedural car lives in `games/shared/gpvehicles.js` (celica style) and the fleet viewer at `games/scaggsville-3d/lineup.html` — look at what you're beating.

## Deliverable

- A standalone viewer page at `games/scaggsville-3d/bakeoff-celica/` showing your scripted Celica, with the build script committed alongside it (so Moth can re-run and adjust it — script it, don't hand-place it).
- Method is yours — your Blender SubD + procedural-hardware hybrid set the quality bar on the Camaro; use whatever gets this car closest to the photos.
- States: pop-ups UP and lit, and pop-ups DOWN (flush lids) — the photo set has both.
- Captures at the photos' angles (front 3/4, side, rear 3/4, straight front) at phone-friendly size, in the viewer's scene.
- Details the photos prove and the procedural car still misses: blunter, taller nose (no low point), flat beltline, longer shallower glass hatch with quarter glass reading as one black glass mass, integrated spoiler lip, full-length black rub strip, rear wiper at the hatch base, 10-spoke GT-S alloys, body-colour bumper (no generic black band).

## Rules

- Work in MAIN, commit to main. No branches.
- Do NOT touch the live game or `games/shared/gpvehicles.js` — Moth integrates your car into the fleet after Cherie's verdict.
- Report in `games/scaggsville-3d/tasking/responses/` when the bake-off page is up, with capture paths and a note on how the script is re-run.

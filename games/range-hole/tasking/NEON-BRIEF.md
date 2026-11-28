# RANGE HOLE — Neon Brief (beauty pass)

**Exact location:** repo https://github.com/bparlette/Hawk2 · branch `main` · game folder `games/range-hole/` · your deliverables land in `games/range-hole/` and your response file goes in `games/range-hole/tasking/responses/`.
**Live page (after Moth's push):** https://bparlette.github.io/Hawk2/games/range-hole/

## The game you are beautifying
Range Hole: a triple-deck driving range, 100 golfers hitting balls, and the player is the black hole (Black Hole City's disc + purple rim) dragging around the range swallowing balls. Fresh balls are worth up to 50 pts, stopped balls 5; combos multiply. Fixed FULL-VIEW camera — the whole range in frame at all times. Every ball flies its first second in its own slow motion, then drops at normal speed. Gameplay, physics, scoring, camera and controls are FROZEN — this brief is looks only.

## The owner's verdict that created this brief
"You have been super lazy on graphics." She's right about the current build: flat green slab, plain deck boxes, capsule golfers in solid colours. It plays well and looks like a prototype. Your job: make it look like a place.

## STILLS-FIRST GATE (do not skip)
Before touching the build, produce ONE painted sample still — the range from the game's fixed camera — for the owner's pick. Post it in your response file with the live links you anchored on. Roll out only after her pick. Anchors: the shipped build above (composition + camera are locked — match them), Palm City for painted-surface language (https://bparlette.github.io/Hawk/games/palm-city/), and Black Hole City for the hole itself (https://bparlette.github.io/Hawk/brad-demos/g/black-hole/index.html) — the hole does not change.

## Mission 1 — the range is a place
- Grass with mowing stripes and a worn landing zone where balls rain down; distance markers (50 / 100 / 150 / 200) as painted ground signs + small flags; two or three target greens (rings) out in the field.
- The decks get materials: concrete/wood bays, painted fascia in the existing teal/yellow/red, railings with depth, a real roof with shadow, ball pyramids and buckets in the bays, divider nets.
- Sky and light: warm late-afternoon grade, long shadows from the decks across the range. The scene must still read at phone size — contrast first, detail second.

## Mission 2 — golfers are people
100 instanced golfers stay instanced (perf), but they stop being capsules: distinct silhouettes (cap, shoulders, club readable through the swing), varied skin/shirt/pants colours from a deliberate palette, a few body types if the instancing allows it without new draw calls. The swing must read from the fixed camera at phone size — exaggerate the wind-up and follow-through.

## Mission 3 — juice that serves the loop
- Slow-mo balls (first second of flight) get a subtle trail or glow so the eye catches the loops — they are the game's signature visual. Keep it cheap: no post-processing passes.
- Landing puffs where balls hit the grass; a satisfying gulp pulse on the hole rim per catch (the hole's look itself is BHC-locked; rim pulse timing/feel only).

## Hard rules
- Frozen: physics, per-ball slow-mo states, scoring, combo, hole growth, 60 s round, camera (fixed full view — NO zoom, NO swoop, ever), drag control, HUD layout (icons + numbers, ≤ ~15% of phone screen, z-index ≥ 1100).
- three.js stays the shared vendor stack in `games/range-hole/vendor/` — never inlined.
- Phone is the gate: show phone-size (390×844) shots of everything.
- SHOW YOUR WORK in your DONE entry: method, tools, output locations — recreate-from-paper detail.

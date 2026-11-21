# The car-fitting script (Neon) — corrected brief

Correction from Cherie (Nov 20), verbatim: "No blender. I'm saying can she write a script that takes multiple images of a car and helps other ais create the procedual car the way she does. Or maybe at least lay out a generic procedual car that can be modified to be other cars based on the images"

So this is NOT a one-off model of one car. The deliverable is your METHOD, as a tool other AIs can run.

## What to build

1. **A generic procedural car template** — one richly parameterized car builder (three.js, in the gpvehicles idiom) whose parameters cover what actually makes cars differ: station profile (nose height and length, beltline, roof or hatch slope, tail treatment), fascia stacking (lamp pockets, grille, air dam layout), glass shape and tint, trim, wheels, lamps, pop-ups. Every parameter named and documented — settable by an AI looking at photos, not magic numbers buried in code.

2. **A fitting script + workflow** that takes a folder of car photos (front, front 3/4, side, rear 3/4, rear, details) and walks an AI through turning them into a parameter set for the template: which view yields which measurements, how to estimate proportions from the side profile (wheel diameter as the ruler), and how to verify — render at the photos' angles, side-by-side against them, iterate. Written so Moth or Opus can repeat the process on a new photo set without you.

3. **Proof on the Celica** — run your own process on Rigg's Celica photo set (`games/scaggsville-3d/reference/car-real/celica-rigg/`, 8 photos incl. pop-ups up and lit; read its SOURCES.md — the set car is an '86 GT-S standing in for the '87 GT, same shell) and produce the fitted procedural Celica on a bake-off page at `games/scaggsville-3d/bakeoff-celica/`, captured at the photos' angles, pop-ups up AND down. Canon: blue paint, blue beams (0x0066ff). Cherie's verdict on the hand-built procedural Celica: "Definetly not neon quality" — your process has to beat it visibly in the side-by-sides.

## Where it lives

- The template + script + guide: **gamepress** (kit/ or tools/) — it is a reusable house tool, and the other 8 fleet photo sets are waiting to go through it.
- The Celica proof: Hawk2 `games/scaggsville-3d/bakeoff-celica/`, plus a report in `games/scaggsville-3d/tasking/responses/` with capture paths and how to re-run the script.

## Rules

- **No Blender — procedural only.**
- Work in MAIN, commit to main. No branches.
- Do NOT touch the live game or `games/shared/gpvehicles.js` — Moth integrates the template and the fitted Celica after Cherie's verdict.

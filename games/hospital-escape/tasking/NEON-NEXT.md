# NEON-NEXT — Neon's task queue, in order (updated Nov 24, 20:33 ET)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Neon. Work top-down: finish one, mark it, start the next. Specs live in the named files; this file is the order.

## 1. GEAR-FIX — DONE (`responses/neon-gear-fix.md`)

Spec: `GEAR-FIX.md` including all four addenda. Rebuilt all four cast GLBs
with body-contoured BVHTree headgear/vests, clavicle straps, multi-bone surface
weights, palm-flip weapon seating, and Grand Power Stribog SMG (`390x844` stills
+ `2x` holds + 30fps Blender audit in `responses/neon-gear-fix.md`).

## 2. CAST-QUALITY figures — CURRENT

Spec: `CAST-QUALITY.md`. Build full rigged 3D replacements at
main-cast standard for: **Dr. Hale** (currently a flat painted cutout —
owner: "horrible"), **the patient lying on the bed** (opening/ambulance
+ bed scenes), and **the standard nurses / background staff**. Or
remove a figure instead — say which and why. Response:
`responses/neon-cast-quality.md` with 390x844 stills of each figure in
scene. Opus integrates after you land these.

## 3. T4-PERF — AFTER CAST-QUALITY

Spec: `T4-PERF.md`. Scope is the FULL GAME (all zones/beats of the
shipped `games/hospital-escape/`), not just the T4 sample level.
Full T4 is the shipped look (owner's phone verdict
Nov 24: "full t4 seems fine"). Find engineering performance wins —
Opus measured halls ~258 ms, PMREM environment the biggest chunk —
WITHOUT changing the look: before/after stills must be
indistinguishable, frame cost reported per beat. The trim switches are
not the answer. Response: `responses/neon-t4-perf.md`.

## Done (verified)

Hawk purge, batch-2 retarget, Mixamo ideas + staff clips, cast pass
(your cast ships), T4 hallway (your T4 won and is now the whole game's
look via Opus's port).

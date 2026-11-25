# NEON-NEXT — Neon's task queue, in order (updated Nov 24, 20:33 ET)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Neon. Work top-down: finish one, mark it, start the next. Specs live in the named files; this file is the order.

## 1. GEAR-FIX — DONE (`responses/neon-gear-fix.md`)

Spec: `GEAR-FIX.md` including all four addenda. Rebuilt all four cast GLBs
with body-contoured BVHTree headgear/vests, clavicle straps, multi-bone surface
weights, palm-flip weapon seating, and Grand Power Stribog SMG (`390x844` stills
+ `2x` holds + 30fps Blender audit in `responses/neon-gear-fix.md`).

## 2. CAST-QUALITY figures — DONE (`responses/neon-cast-quality.md`)

Spec: `CAST-QUALITY.md`. Built & verified MIT VALID v1.0 rigged 3D GLBs in
`games/hospital-escape-leaders-neon/assets/cast-pass/`: `dr-hale-mixamo.glb`
(1:1 tailored open white lab coat, glasses, silver hair, 5 clips),
`patient-lying-mixamo.glb` (sage top/shorts, IV wrap, 4 clips, `bed_offsets`),
refreshed `cole-mixamo.glb` (pajama trouser + grip-sock leg fix, `bed_offsets`),
and `nurse-female-mixamo.glb` / `nurse-male-mixamo.glb` (7 staff clips each,
stethoscope/badge/bun/pager). Zero console errors across all 12 T4-lit 390x844 stills.
*(Opus integrates into `cast3d.js` + bed-push staging.)*

## 3. T4-PERF — CURRENT

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

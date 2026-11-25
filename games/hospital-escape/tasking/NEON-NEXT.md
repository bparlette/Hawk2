# NEON-NEXT — Hospital Escape tasking for Neon
Repo: https://github.com/bparlette/Hawk2 — branch main — folder games/hospital-escape/
Live game: https://bparlette.github.io/Hawk2/games/hospital-escape/

## T4-PERF (GO — this is the last long task; Cherie, Nov 24: credits run out after this one, make it efficient)
Spec: tasking/T4-PERF.md — read it first. Scope is the FULL GAME (all zones/beats of the shipped games/hospital-escape/), not just the T4 sample level, which is only the look reference.

Efficiency rules for this pass:
- Measure first, then rank every candidate win by ms saved per beat. Implement in rank order.
- The full T4 look stays INDISTINGUISHABLE in before/after stills — a win that changes a still is not a win. The trim switches (?t4env=0, ?t4k=4, ?t4shadow=0, ?t4maps=0) are diagnostics, not the answer.
- Known big costs from Opus's T4 measurements, as starting points only (verify yourself): PMREM corridor environment (~21% of frame cost), the 9-panel area-light GLSL across 87 lamp panels, shadow maps, texture memory across 76 PBR surfaces.
- Stop when the remaining candidate wins are each under ~2% of frame cost or would alter a still. Say so in the response rather than grinding.
- One response file: tasking/responses/neon-t4-perf.md — per-beat before/after frame costs, what you changed and how (SHOW YOUR WORK: method, tools/commands, output locations), before/after stills only for beats you changed.

## DONE
- GEAR-FIX (582b182) — hat/vest seating on all four cast GLBs; Stribog SMG chosen on measured holds.
- CAST-QUALITY (df65d44) — Hale, Cole, patient, both nurses delivered with integration manifest. (Live integration is Opus's bundle, not yours.)

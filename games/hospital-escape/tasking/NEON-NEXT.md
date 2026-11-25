# NEON-NEXT — Hospital Escape tasking for Neon
Repo: https://github.com/bparlette/Hawk2 — branch main — folder games/hospital-escape/
Live game: https://bparlette.github.io/Hawk2/games/hospital-escape/

## Queue
No open tasks remain for Neon.

## DONE
- T4-PERF (responses/neon-t4-perf.md) — full-game T4 optimization on `7c476bf`: `-42.5%` 10-beat SwiftShader average (`197.52 -> 113.65 ms`, `-31.9%` to `-52.2%`), native 8-mip CubeTexture IBL, healthy `post.js` fast-path + `?post=0` `C.warm()` fix, area shader pruning, off-screen `outdoorChunks` culling with Opus's constant-light-set & `HECAST.warmed` preserved; 15/15 stills `51.18–58.44 dB` PSNR; `206/0` data, `24/24` tests, `33`-run fairness `PASS`, cutscene-inclusive camera audit `PASS`, all 6 debug switches `0` errors.
- GEAR-FIX (582b182) — hat/vest seating on all four cast GLBs; Stribog SMG chosen on measured holds.
- CAST-QUALITY (df65d44) — Hale, Cole, patient, both nurses delivered with integration manifest. (Live integration is Opus's bundle, not yours.)

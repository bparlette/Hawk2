# Hospital Escape — test & audit tools (run from the repo root)

Every change to `games/hospital-escape/` must pass the **gate** below before it is pushed. The gate exists so that a defect the owner would
notice on her phone is caught here first. **If a defect gets past the gate, the fix is not done until the gate can catch it** (add the check here).

## The gate

| Tool | Command | Catches | PASS line |
|---|---|---|---|
| Engine tests | `node games/hospital-escape/tools/run-tests.cjs` | engine contract, holds/releases, chase, consciousness gate | `24 passed, 0 failed of 24` |
| Data validation | `node games/hospital-escape/engine/validate-data.mjs games/hospital-escape/game/level1.js` | level data vs contract v1 | `0 errors` + `PASS` (206 objects since the elevator-block beat) |
| Fairness audit | `node games/hospital-escape/tools/fairness-audit.cjs` | damage from shooters the player could not see (seeds 7/3/11, full runs + soaks) | `FAIRNESS AUDIT: PASS` |
| **Camera / framing audit** | `node games/hospital-escape/tools/camera-audit.cjs` | **camera in walls, frames of pure wall, see-through to the void, ambulance framing, unsealed room holes** (detail below) | `CAMERA AUDIT: PASS` (exit code 0) |
| Full playthrough | `node games/hospital-escape/tools/cast-fullrun.cjs 7` | the game finishes with 0 page errors; cast behaviour counts | `ended: true`, 0 errs |
| Real-input play | `node games/hospital-escape/tools/t4-play.cjs BEAT FRAMES OUTDIR` (`KEYS=1` adds WASD on foot; BEAT may carry `&seg=N`) | page errors under real DOM input (start button, mouse, Space, keys) | `errs: []` |

## camera-audit.cjs — what each letter means
One full autopilot playthrough (every beat, a sample every 0.1 s of game time) **plus** a scripted on-foot pass (Maya walks backward into
walls, strafes, edge-turns hard — the moves the autopilot never makes). Every surface is double-sided in the audit page only.

- **A — lens in geometry:** the line from the camera's pivot (the rider / Maya at eye height) to the lens is blocked. FAIL on any sample.
- **B — wall fill:** > 50% of a 7×13 grid of screen rays land within 0.8 m of the lens, for > 0.6 s.
- **C — void indoors:** > 2% of screen rays hit nothing within 120 m in an indoor segment, for > 0.3 s (a missing / open wall or ceiling step).
- **D — ambulance framing:** > 60% of screen rays hit the vehicle's own body within 2.5 m, for > 0.6 s (owner's shot measured 0.74; the
  correct in-bay view out the rear doors is 0.33–0.48).
- **E — enclosure:** the boundary audit re-cast on the repaired world (doors settled): any exterior boundary point with no wall within 0.6 m,
  or any boundary ray escaping 120 m.
- **F (warn):** live enemies in a combat segment but none on screen for > 4 s.

Defects found by the audit the first time it ran (Nov 25, before the fixes; build `51e47c6`): A 17, C 21, D 1, E 54 → after: 0 / 0 / 0 / 0.

## Evidence / investigation tools
- `cam-scan.cjs BEAT[:SEG] SECONDS [GAME_DIR]` — lens-in-geometry scan of one beat (`FOOT=1` scripted on-foot input; `STOPT=s SHOT=png` stop + still). Takes a `GAME_DIR` so an older build can be compared.
- `t4-sbs.cjs`, `t4-perf.cjs` — T4 look side-by-sides and frame cost. `cast-beats.cjs`, `cast-clip.cjs`, `cast-grip.cjs`, `cast-maya-cam.cjs` — cast evidence.
- `shoot-game.cjs`, `pace-audit.cjs`, `presence-audit.cjs` — older audits (see their headers).

## Notes for whoever changes the camera, the rail or the world
- The camera is placed by the engine (`engine/rail.js` `r.place`, `engine/director.js` `stepFoot`) and then passes `game.cameraCollide` (main.js):
  0.3 m of air around the lens, then nothing solid between pivot and lens. Maya on foot passes `game.footCollide` (0.35 m body, slides on walls).
- `game/enclose.js` seals holes into the void at load (walls + ceiling-step headers) and never seals where a path passes within 1 m.
- Turns of more than ~100° in the rail look blend in yaw (`rail.js`), never through the floor.

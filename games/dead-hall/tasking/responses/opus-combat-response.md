# Dead Hall: combat systems hardening (Opus response)

## What the build looked like when I started
- There is **no Moth build of Dead Hall on main yet**. At the tip I worked from, `games/dead-hall/` held only `tasking/OPUS.md` and `tasking/NEON.md`.
- There is no encounter code to refactor in place, and no build to take before/after encounter timings or draw calls from. Per the brief, the build wins where it and the brief disagree, so I'm reporting that here rather than inventing numbers.
- What I delivered is the combat core as a **pure, render-free, dt-driven module**, test-first, so the Moth build can import it instead of growing encounter logic in its render loop.
- I did not touch the walk, the camera, rendering or audio.

## Files
- `games/dead-hall/src/combat/rooms.js`: the 12-room table in locked order, the per-room tuning table, the combat constants, and `planRun(seed)` for live/fake seeding.
- `games/dead-hall/src/combat/encounter.js`: `createEncounter()`, the state machine, and `createRun(seed)`, which runs rooms in order with dispatch cards and restarts on SIGNAL LOST.
- `games/dead-hall/tools/combat.test.mjs`: spec tests, written first and red until the module existed. Run with `node --test games/dead-hall/tools/combat.test.mjs`.
- `games/dead-hall/tools/combat-harness.mjs`: the headless playtest harness, 60 Hz with scripted inputs. Run with `node games/dead-hall/tools/combat-harness.mjs`. It exits 1 on any failure.

## Integration contract for the Moth build
Call these from the render loop:
- `run.step(dt)` every frame.
- `run.input('stab' | 'action')` from the two buttons.
- Subscribe with `run.on(ev => ...)` and render from the events.

Events the build should render:

| Event | Meaning |
|---|---|
| `meterSpike` | audio meters spike, 1.0 s before dread |
| `state` (`dread`, `counter`, `finish`, `resolve`) | state changes |
| `lunge` | the counter window opens; carries `window` |
| `stagger` | counter hit |
| `biteSurge` | counter missed |
| `thrust` | a finish stab; carries `double` |
| `headThrust`, `lensSpatter` | the final thrust |
| `walkResume` | the walk continues |
| `signalLost`, `feedCut` | the bite meter filled; the run restarts |
| `burst`, `tells`, `decisionPoint` | decoy timing |
| `flee` | the decoy runs off |
| `consequence` | a wrong stab; carries `lightLoose` or `windowShrink` |
| `dispatch` | a subtitle card; carries `text` |
| `vanish` | a fake-out figure disappears |
| `cleared` | all 12 rooms done |

For the HUD:
- The bite meter is `enc.bite`, from 0 to 1.
- `enc.onPulse()` drives the strike-pulse ring.
- `run.ctx.lightLoose` tells the renderer to darken the camera light.

## Decisions I made where the brief left a gap (flagged for review)
- **Decoy rooms are 4 and 8.**
  - Room 8 is named as the decoy staging family. A panicked worker there is the fake-out right after the room-7 sprint fight.
  - Room 4 is the second slot: a dazed guard with his own flashlight in night-vision green.
- **Escalation:**
  - The counter window steps from 1.15 s down to 0.85 s across the seven live rooms.
  - The bite rate steps from 0.060/s up to 0.120/s.
  - Required strikes stay constant at 14, so the tap count never escalates.
- **A miss** adds +0.35 bite and a "hard" finish: the bite rate is ×1.35 and the on-pulse window narrows from ±0.10 s to ±0.07 s.
- **The finish:**
  - The pulse period is 0.55 s.
  - The first thrust in each pulse counts double.
  - A hard cap of 25 taps always finishes the fight.
- **Wrong stab on a decoy:**
  - The first one knocks the light loose.
  - The second shrinks the next live counter window by 0.15 s, with a floor of 0.65 s. It never kills.
- **Seeding:**
  - Seed 0 is the canonical first run.
  - Other seeds swap 2–3 rooms in rooms 3–11. Room 7, the decoys and room 12 are never swapped.
  - On the canonical plan every room in that pool is live, so every swap turns a live room into a fake-out.
- **Not modelled here:** the door-hold and furniture-push uses of ACTION, such as room 10's door slam. They are walk/staging beats. `input('action')` is accepted and the module is the place to add them once the build defines them.

## Spec tests (node --test)
```
ok 1 - 12 rooms, locked order and kinds
ok 2 - tuning table: every room has a counter window in 0.8–1.2 s, escalation tightens windows and speeds bite, never tap count
ok 3 - state machine order: idle -> dread -> counter -> finish -> resolve, meters spike ~1 s before dread
ok 4 - counter hit: stagger + bite drains; finish ends with a head thrust and walk resumes
ok 5 - miss: bite surge + harder finish, still winnable
ok 6 - mash scoring: on-pulse thrusts count double, off-pulse single, tap cap ~25 enforced
ok 7 - SIGNAL LOST: never stab -> bite fills -> lost, no exception
ok 8 - decoy: tells land before the stab decision point; withhold 2 s -> flee + dispatch card
ok 9 - decoy wrong stab: consequence applied, never death
ok 10 - live/fake seeding: 2–3 mid rooms swap, room 12 always empty, room 7 always live, deterministic per seed
# tests 10
# pass 10
# fail 0
```

## Harness output (full, unedited)
```
== 1. counter-success path (room 3) ==
   spike 1 s, dread 2.017 s, lunge 3.217 s (window 1.15 s), stagger 3.517 s, head thrust 5.2 s, taps 10, bite 0.10
PASS  stab in window -> stagger -> finish -> walk resumes
== 2. miss path (room 3, no counter stab) ==
   bite surge 4.367 s -> bite 0.35, hard finish true, head thrust 6.05 s, final bite 0.49, taps 10
PASS  no stab -> bite surge -> harder finish, still winnable
   miss path in EVERY live room (same player):
     room  3  window 1.15 s  bite/s 0.060  -> win (final bite 0.49)
PASS     room 3 miss still winnable
     room  5  window 1.10 s  bite/s 0.070  -> win (final bite 0.51)
PASS     room 5 miss still winnable
     room  6  window 1.05 s  bite/s 0.080  -> win (final bite 0.53)
PASS     room 6 miss still winnable
     room  7  window 1.00 s  bite/s 0.090  -> win (final bite 0.55)
PASS     room 7 miss still winnable
     room  9  window 0.95 s  bite/s 0.100  -> win (final bite 0.58)
PASS     room 9 miss still winnable
     room 10  window 0.90 s  bite/s 0.110  -> win (final bite 0.60)
PASS     room 10 miss still winnable
     room 11  window 0.85 s  bite/s 0.120  -> win (final bite 0.62)
PASS     room 11 miss still winnable
== 3. decoy right path (rooms 4, 8: withhold) ==
   room 4: burst 2.017 s, tells 2.167 s, decision point 2.483 s, flee 4.033 s, card "2210 — that's a civ, hold fire."
PASS  room 4 withhold -> flees, dispatch card fires
   room 8: burst 2.017 s, tells 2.167 s, decision point 2.483 s, flee 4.033 s, card "2210 — that's a civ, hold fire."
PASS  room 8 withhold -> flees, dispatch card fires
== 4. decoy wrong path (stab at the decision point) ==
   wrong stab #1 (room 4): consequence lightLoose, result wrongStab, ctx {"lightLoose":true,"shrink":0}
PASS  room 4 wrong stab -> consequence, no SIGNAL LOST
   wrong stab #2 (room 8): consequence windowShrink, result wrongStab, ctx {"lightLoose":true,"shrink":0.15}
PASS  room 8 wrong stab -> consequence, no SIGNAL LOST
   next live encounter (room 9) counter window: 0.80 s (tuned 0.95 s)
PASS  window-shrink consequence lands on the next live encounter
== 5. full scripted 12-room clear (seed 0, then seeds 1-5) ==
   seed 0: plan [F F L D L L L D L L L E]  results fake,fake,win,spared,win,win,win,spared,win,win,win,empty  restarts 0  time 60.0 s  dispatch cards 13
PASS  seed 0 clears all 12 rooms with no restart
   seed 1: plan [F F F* D L L L D F* L F* E]  results fake,fake,fake,spared,win,win,win,spared,fake,win,fake,empty  restarts 0  time 54.0 s  dispatch cards 13
PASS  seed 1 clears all 12 rooms with no restart
   seed 2: plan [F F L D F* F* L D L F* L E]  results fake,fake,win,spared,fake,fake,win,spared,win,fake,win,empty  restarts 0  time 54.0 s  dispatch cards 13
PASS  seed 2 clears all 12 rooms with no restart
   seed 3: plan [F F F* D F* L L D F* L L E]  results fake,fake,fake,spared,fake,win,win,spared,fake,win,win,empty  restarts 0  time 54.0 s  dispatch cards 13
PASS  seed 3 clears all 12 rooms with no restart
   seed 4: plan [F F F* D F* F* L D L L L E]  results fake,fake,fake,spared,fake,fake,win,spared,win,win,win,empty  restarts 0  time 54.0 s  dispatch cards 13
PASS  seed 4 clears all 12 rooms with no restart
   seed 5: plan [F F L D F* L L D F* F* L E]  results fake,fake,win,spared,fake,win,win,spared,fake,fake,win,empty  restarts 0  time 54.0 s  dispatch cards 13
PASS  seed 5 clears all 12 rooms with no restart
== 6. SIGNAL LOST path (never stab) ==
   SIGNAL LOST in room 3 at 12.4 s into the room; after restart: room 1, ctx {"lightLoose":false,"shrink":0}, results [], restarts 1, enc state idle
PASS  bite fills -> feed cuts -> restart state clean
== timing table (per room, from the module) ==
   room  1 fake  twins         spike 1.0 s, vanish 3.2 s
   room  2 fake  doorway-woman spike 1.0 s, vanish 3.2 s
   room  3 live  exit-charge   spike 1.0 s, dread 2.0 s, counter window 1.15 s, bite 0.060/s (x1.35 after a miss), strikes 14 (cap 25)
   room  4 decoy nightvision   tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  5 live  corner        spike 1.0 s, dread 2.0 s, counter window 1.10 s, bite 0.070/s (x1.35 after a miss), strikes 14 (cap 25)
   room  6 live  hatch         spike 1.0 s, dread 2.0 s, counter window 1.05 s, bite 0.080/s (x1.35 after a miss), strikes 14 (cap 25)
   room  7 live  mascot        spike 1.0 s, dread 2.0 s, counter window 1.00 s, bite 0.090/s (x1.35 after a miss), strikes 14 (cap 25)
   room  8 decoy doorway-eyes  tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  9 live  tall          spike 1.0 s, dread 2.0 s, counter window 0.95 s, bite 0.100/s (x1.35 after a miss), strikes 14 (cap 25)
   room 10 live  eye-chase     spike 1.0 s, dread 2.0 s, counter window 0.90 s, bite 0.110/s (x1.35 after a miss), strikes 14 (cap 25)
   room 11 live  mannequin     spike 1.0 s, dread 2.0 s, counter window 0.85 s, bite 0.120/s (x1.35 after a miss), strikes 14 (cap 25)
   room 12 empty yellow        walk 9 s, no monster

ALL PATHS PASS
```

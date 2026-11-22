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

---

## Addendum — Nov 21, 2026: Room 4 crawler restored, second decoy moved to a corridor beat

Supersedes the "Decoy rooms are 4 and 8" decision above.

**The ruling (Cherie, Nov 21, ~19:45):** room 4 as a decoy removed the [REC]-style all-fours crawler from the game. The crawler comes back as a live attack; the second decoy moves out of the room table into a corridor beat.

**What changed in the table (`rooms.js`):**
- Room 4 `nightvision`: kind `decoy` -> `live`. Its note is now the crawler staging: night-vision green, a figure crawls at the camera on all fours.
- There are now **eight** live rooms, so the escalation arrays were extended on the same established step (−0.05 s window, +0.010 bite per live room): counter windows now run 1.15 -> 0.80 s (was 1.15 -> 0.85 across seven live rooms), bite 0.060 -> 0.130/s (was 0.060 -> 0.120/s). Room 4 slots in as live #2 at 1.10 s / 0.070 per s; rooms 5–11 each sit one step later than before (room 11: 0.80 s / 0.130 per s). Required strikes stay constant at 14 — still no tap-count escalation.

**The corridor beat (`rooms.js` `CORRIDOR_BEATS` + `encounter.js` `createRun`):**
- New export `CORRIDOR_BEATS` with one entry: id `C1`, kind `decoy`, `after: 3`. The figure is a panicked building worker bursting out of a side door mid-walk.
- **Placement — after room 3, and why:** room 3 is the first real attack. The beat fires while the player is still stab-happy from their first fight (the design's false-security rule: a fake-out right after a tense encounter), it teaches the hold-fire rule early, before room 8 tests it again, and it puts room 4's restored crawler immediately after a false alarm, so the player can't relax. It also spaces the two decoys across the run instead of clustering them.
- **How it's modelled (smallest honest version, no redesign):** beats are not rooms and are never in `planRun`'s plan, so the seeded live/fake swaps can't touch them — the same protection the room-8 decoy, room 7 and room 12 already have. `createRun` fires a beat in its step-advance right after the `after` room completes, and a beat result (`spared`/`wrongStab`) is pushed into `run.results` like a room result, so a full clear now has **13 results**. `createEncounter` gained an optional 5th parameter, `label`; the beat passes `'C1'`, so its events carry `room: 'C1'` and its dispatch card reads "2210, corridor." A SIGNAL LOST restart resets the beat's fired flag along with the rest of the run state.
- **Same decoy rules as room 8:** tells at +0.15 s (raised trembling hands, his own flashlight, panicked voice), decision point at +0.45 s, withhold 2.0 s -> he flees and the "2210 — that's a civ, hold fire." card fires. A wrong stab is a consequence, never death. The two consequences are assigned across the decoys in run order through the shared ctx: the corridor beat is met first, so a wrong stab there takes consequence #1 (light knocked loose); room 8's wrong stab takes #2 (next live counter window −0.15 s — the harness verifies it landing on room 9: 0.90 s tuned -> 0.75 s).

**For the build:** render the C1 beat in the corridor walk between rooms 3 and 4, from the same decoy events (`burst`, `tells`, `decisionPoint`, `flee`, `consequence`, `dispatch` with `room: 'C1'`). Room 4's encounter is a normal live encounter now — the crawler needs its grab/stab staging in night vision.

**New totals:** spec tests **15/15 pass** (was 10/10); harness **22/22 checks pass** (was 21/21 — the added checks are room 4 in the every-live-room miss sweep and the corridor beat's right/wrong paths; room 8's decoy paths moved, not duplicated). Full clears now assert 13 results on seeds 0–5.

## Spec tests after the change (node --test)
```
ok - 12 rooms, locked order and kinds; room 4 is the live crawler; decoys = room 8 + corridor beat C1
ok - tuning table: every room has a counter window in 0.8–1.2 s, escalation tightens windows and speeds bite, never tap count
ok - state machine order: idle -> dread -> counter -> finish -> resolve, meters spike ~1 s before dread
ok - counter hit: stagger + bite drains; finish ends with a head thrust and walk resumes
ok - miss: bite surge + harder finish, still winnable
ok - room 4 crawler: counter hit -> stagger -> win, no bite surge
ok - room 4 crawler: miss -> bite surge + harder finish, still winnable
ok - mash scoring: on-pulse thrusts count double, off-pulse single, tap cap ~25 enforced
ok - SIGNAL LOST: never stab -> bite fills -> lost, no exception
ok - decoy: tells land before the stab decision point; withhold 2 s -> flee + dispatch card
ok - decoy wrong stab: consequence applied, never death
ok - corridor beat C1: tells land before the decision point; withhold -> flee + dispatch card; events carry the beat id
ok - corridor beat C1: wrong stab -> consequence, never death
ok - run: corridor beat fires after room 3; a full clear has 13 results with the beat spared in slot 4
ok - live/fake seeding: 2–3 mid rooms swap, room 12 always empty, room 7 always live, deterministic per seed
# tests 15
# pass 15
# fail 0
```

## Harness output after the change (full, unedited)
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
     room  4  window 1.10 s  bite/s 0.070  -> win (final bite 0.51)
PASS     room 4 miss still winnable
     room  5  window 1.05 s  bite/s 0.080  -> win (final bite 0.53)
PASS     room 5 miss still winnable
     room  6  window 1.00 s  bite/s 0.090  -> win (final bite 0.55)
PASS     room 6 miss still winnable
     room  7  window 0.95 s  bite/s 0.100  -> win (final bite 0.58)
PASS     room 7 miss still winnable
     room  9  window 0.90 s  bite/s 0.110  -> win (final bite 0.60)
PASS     room 9 miss still winnable
     room 10  window 0.85 s  bite/s 0.120  -> win (final bite 0.62)
PASS     room 10 miss still winnable
     room 11  window 0.80 s  bite/s 0.130  -> win (final bite 0.65)
PASS     room 11 miss still winnable
== 3. decoy right path (corridor C1 (after room 3), room 8: withhold) ==
   corridor C1 (after room 3): burst 1.517 s, tells 1.667 s, decision point 1.983 s, flee 3.533 s, card "2210 — that's a civ, hold fire."
PASS  corridor C1 (after room 3) withhold -> flees, dispatch card fires
   room 8: burst 2.017 s, tells 2.167 s, decision point 2.483 s, flee 4.033 s, card "2210 — that's a civ, hold fire."
PASS  room 8 withhold -> flees, dispatch card fires
== 4. decoy wrong path (stab at the decision point) ==
   wrong stab #1 (corridor C1 (after room 3)): consequence lightLoose, result wrongStab, ctx {"lightLoose":true,"shrink":0}
PASS  corridor C1 (after room 3) wrong stab -> consequence, no SIGNAL LOST
   wrong stab #2 (room 8): consequence windowShrink, result wrongStab, ctx {"lightLoose":true,"shrink":0.15}
PASS  room 8 wrong stab -> consequence, no SIGNAL LOST
   next live encounter (room 9) counter window: 0.75 s (tuned 0.90 s)
PASS  window-shrink consequence lands on the next live encounter
== 5. full scripted clear: 12 rooms + corridor beat C1 (seed 0, then seeds 1-5) ==
   seed 0: plan [F F L C1 L L L L D L L L E]  results fake,fake,win,spared,win,win,win,win,spared,win,win,win,empty  restarts 0  time 64.7 s  dispatch cards 14
PASS  seed 0 clears all 12 rooms + corridor beat with no restart
   seed 1: plan [F F F* C1 L L L L D F* L F* E]  results fake,fake,fake,spared,win,win,win,win,spared,fake,win,fake,empty  restarts 0  time 58.7 s  dispatch cards 14
PASS  seed 1 clears all 12 rooms + corridor beat with no restart
   seed 2: plan [F F L C1 F* F* L L D F* L L E]  results fake,fake,win,spared,fake,fake,win,win,spared,fake,win,win,empty  restarts 0  time 58.7 s  dispatch cards 14
PASS  seed 2 clears all 12 rooms + corridor beat with no restart
   seed 3: plan [F F F* C1 F* L F* L D L L L E]  results fake,fake,fake,spared,fake,win,fake,win,spared,win,win,win,empty  restarts 0  time 58.7 s  dispatch cards 14
PASS  seed 3 clears all 12 rooms + corridor beat with no restart
   seed 4: plan [F F F* C1 F* F* L L D L L L E]  results fake,fake,fake,spared,fake,fake,win,win,spared,win,win,win,empty  restarts 0  time 58.7 s  dispatch cards 14
PASS  seed 4 clears all 12 rooms + corridor beat with no restart
   seed 5: plan [F F L C1 F* L L L D F* F* L E]  results fake,fake,win,spared,fake,win,win,win,spared,fake,fake,win,empty  restarts 0  time 58.7 s  dispatch cards 14
PASS  seed 5 clears all 12 rooms + corridor beat with no restart
== 6. SIGNAL LOST path (never stab) ==
   SIGNAL LOST in room 3 at 12.4 s into the room; after restart: room 1, ctx {"lightLoose":false,"shrink":0}, results [], restarts 1, enc state idle
PASS  bite fills -> feed cuts -> restart state clean
== timing table (per room, from the module) ==
   room  1 fake  twins         spike 1.0 s, vanish 3.2 s
   room  2 fake  doorway-woman spike 1.0 s, vanish 3.2 s
   room  3 live  exit-charge   spike 1.0 s, dread 2.0 s, counter window 1.15 s, bite 0.060/s (x1.35 after a miss), strikes 14 (cap 25)
   beat C1    decoy corridor      fires in the walk after room 3: burst 1.5 s in, tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  4 live  nightvision   spike 1.0 s, dread 2.0 s, counter window 1.10 s, bite 0.070/s (x1.35 after a miss), strikes 14 (cap 25)
   room  5 live  corner        spike 1.0 s, dread 2.0 s, counter window 1.05 s, bite 0.080/s (x1.35 after a miss), strikes 14 (cap 25)
   room  6 live  hatch         spike 1.0 s, dread 2.0 s, counter window 1.00 s, bite 0.090/s (x1.35 after a miss), strikes 14 (cap 25)
   room  7 live  mascot        spike 1.0 s, dread 2.0 s, counter window 0.95 s, bite 0.100/s (x1.35 after a miss), strikes 14 (cap 25)
   room  8 decoy doorway-eyes  tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  9 live  tall          spike 1.0 s, dread 2.0 s, counter window 0.90 s, bite 0.110/s (x1.35 after a miss), strikes 14 (cap 25)
   room 10 live  eye-chase     spike 1.0 s, dread 2.0 s, counter window 0.85 s, bite 0.120/s (x1.35 after a miss), strikes 14 (cap 25)
   room 11 live  mannequin     spike 1.0 s, dread 2.0 s, counter window 0.80 s, bite 0.130/s (x1.35 after a miss), strikes 14 (cap 25)
   room 12 empty yellow        walk 9 s, no monster

ALL PATHS PASS
```

---

## Addendum 2 — Nov 21, 2026: second corridor beat added, C2 "The Double-Look" (live)

A second ruling from Cherie in the same pass: add a second corridor beat — a scripted look-back scare that resolves into a real fight. This supersedes the addendum above where it says a full clear has 13 results: it now has **14**.

**The beat (rooms.js `CORRIDOR_BEATS`, id `C2`, kind `live`, staging `double-look`):** a noise behind the player -> the camera glances back: the hallway is EMPTY -> forward -> the noise again, closer -> glance back: a figure is now standing mid-hallway -> forward snap -> the figure LUNGES and the standard counter window opens. From the lunge on it is an ordinary live encounter (counter -> pulse-mash finish -> head thrust), with the ordinary miss path (bite surge + hard finish, still winnable).

**Placement — after room 10, and why:** C1 sits after room 3; C2 had to be nowhere near it. Room 10's eye-chase ends in a door slam — the player has just shut a door on the thing and believes the corridor behind them is safe, and the double-look weaponizes exactly that belief: the threat is behind, in the "cleared" space. It also densifies the endgame (chase -> double-look -> mannequin -> yellow room) without touching any room's own staging.

**Phases and tuning:**
- Modelled as a run-sequence entry like C1 — never in `planRun`'s plan, so the seeded live/fake swaps can't touch it. `createEncounter` plays the script from `tune.look`: states run idle -> look -> counter -> finish -> resolve. Each look entry fires its event after its `dt`: `noise` (1.2 s in) -> `glanceBack {empty:true}` -> `forward` -> `noise {closer:true}` -> `glanceBack {empty:false}` -> `forwardSnap` (0.45 s) -> `lunge`. The audio `meterSpike` rides the first noise. A STAB during the look phases is ignored — there is no pre-stabbing the scare; the fight starts at the lunge.
- Tuning: counter window **0.80 s**, bite **0.130/s** — the next escalation step after room 10 (0.85 s / 0.120), tied hardest with room 11, so the run's difficulty curve stays monotonic into the finale. Required strikes still 14, tap cap still 25. A pending window-shrink consequence would apply to C2 like any live encounter (in practice room 9 consumes it first).

**For the build:** render C2 in the corridor walk between rooms 10 and 11 from the look events (`noise`, `glanceBack` with its `empty` flag, `forward`, `forwardSnap`, then the usual `lunge`/`stagger`/`thrust`/`headThrust` set, all with `room: 'C2'`). The two glances back are camera moves the build owns; the module only times them.

**New totals:** spec tests **17/17 pass** (was 15/15); harness **24/24 checks pass** (was 22/22 — the added checks are the double-look's phase-order/counter path and its miss path; full clears now assert 14 results on seeds 0–5, with C2's win in slot 12).

## Spec tests after Addendum 2 (node --test)
```
ok - 12 rooms, locked order and kinds; room 4 is the live crawler; decoys = room 8 + corridor beat C1
ok - tuning table: every room has a counter window in 0.8–1.2 s, escalation tightens windows and speeds bite, never tap count
ok - state machine order: idle -> dread -> counter -> finish -> resolve, meters spike ~1 s before dread
ok - counter hit: stagger + bite drains; finish ends with a head thrust and walk resumes
ok - miss: bite surge + harder finish, still winnable
ok - room 4 crawler: counter hit -> stagger -> win, no bite surge
ok - room 4 crawler: miss -> bite surge + harder finish, still winnable
ok - mash scoring: on-pulse thrusts count double, off-pulse single, tap cap ~25 enforced
ok - SIGNAL LOST: never stab -> bite fills -> lost, no exception
ok - decoy: tells land before the stab decision point; withhold 2 s -> flee + dispatch card
ok - decoy wrong stab: consequence applied, never death
ok - corridor beat C1: tells land before the decision point; withhold -> flee + dispatch card; events carry the beat id
ok - corridor beat C1: wrong stab -> consequence, never death
ok - corridor beat C2 (double-look): phases fire in order, the lunge opens the counter window, stabbing early does nothing
ok - corridor beat C2: missing the counter -> bite surge + harder finish, still winnable
ok - run: corridor beats fire after rooms 3 and 10; a full clear has 14 results
ok - live/fake seeding: 2–3 mid rooms swap, room 12 always empty, room 7 always live, deterministic per seed
# tests 17
# pass 17
# fail 0
```

## Harness output after Addendum 2 (full, unedited)
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
     room  4  window 1.10 s  bite/s 0.070  -> win (final bite 0.51)
PASS     room 4 miss still winnable
     room  5  window 1.05 s  bite/s 0.080  -> win (final bite 0.53)
PASS     room 5 miss still winnable
     room  6  window 1.00 s  bite/s 0.090  -> win (final bite 0.55)
PASS     room 6 miss still winnable
     room  7  window 0.95 s  bite/s 0.100  -> win (final bite 0.58)
PASS     room 7 miss still winnable
     room  9  window 0.90 s  bite/s 0.110  -> win (final bite 0.60)
PASS     room 9 miss still winnable
     room 10  window 0.85 s  bite/s 0.120  -> win (final bite 0.62)
PASS     room 10 miss still winnable
     room 11  window 0.80 s  bite/s 0.130  -> win (final bite 0.65)
PASS     room 11 miss still winnable
== 3. decoy right path (corridor C1 (after room 3), room 8: withhold) ==
   corridor C1 (after room 3): burst 1.517 s, tells 1.667 s, decision point 1.983 s, flee 3.533 s, card "2210 — that's a civ, hold fire."
PASS  corridor C1 (after room 3) withhold -> flees, dispatch card fires
   room 8: burst 2.017 s, tells 2.167 s, decision point 2.483 s, flee 4.033 s, card "2210 — that's a civ, hold fire."
PASS  room 8 withhold -> flees, dispatch card fires
== 4. decoy wrong path (stab at the decision point) ==
   wrong stab #1 (corridor C1 (after room 3)): consequence lightLoose, result wrongStab, ctx {"lightLoose":true,"shrink":0}
PASS  corridor C1 (after room 3) wrong stab -> consequence, no SIGNAL LOST
   wrong stab #2 (room 8): consequence windowShrink, result wrongStab, ctx {"lightLoose":true,"shrink":0.15}
PASS  room 8 wrong stab -> consequence, no SIGNAL LOST
   next live encounter (room 9) counter window: 0.75 s (tuned 0.90 s)
PASS  window-shrink consequence lands on the next live encounter
== 4b. corridor beat C2: the double-look (after room 10) ==
   phases: noise 1.217s -> glanceBack(empty) 2.117s -> forward 3.117s -> noise(closer) 3.917s -> glanceBack(figure) 4.817s -> forwardSnap 5.283s -> lunge 5.283s
   counter window 0.8 s, stagger 5.583 s, head thrust 7.267 s, taps 10, result win
PASS  double-look phases in order -> lunge -> counter -> win
   no counter stab: bite surge 6.083 s -> bite 0.35, hard finish true, final bite 0.65, result win
PASS  double-look miss -> bite surge -> harder finish, still winnable
== 5. full scripted clear: 12 rooms + corridor beats C1/C2 (seed 0, then seeds 1-5) ==
   seed 0: plan [F F L C1 L L L L D L L L C2 E]  results fake,fake,win,spared,win,win,win,win,spared,win,win,win,win,empty  restarts 0  time 72.0 s  dispatch cards 15
PASS  seed 0 clears all 12 rooms + both corridor beats with no restart
   seed 1: plan [F F F* C1 L L L L D F* L F* C2 E]  results fake,fake,fake,spared,win,win,win,win,spared,fake,win,win,fake,empty  restarts 0  time 66.0 s  dispatch cards 15
PASS  seed 1 clears all 12 rooms + both corridor beats with no restart
   seed 2: plan [F F L C1 F* F* L L D F* L L C2 E]  results fake,fake,win,spared,fake,fake,win,win,spared,fake,win,win,win,empty  restarts 0  time 66.0 s  dispatch cards 15
PASS  seed 2 clears all 12 rooms + both corridor beats with no restart
   seed 3: plan [F F F* C1 F* L F* L D L L L C2 E]  results fake,fake,fake,spared,fake,win,fake,win,spared,win,win,win,win,empty  restarts 0  time 66.0 s  dispatch cards 15
PASS  seed 3 clears all 12 rooms + both corridor beats with no restart
   seed 4: plan [F F F* C1 F* F* L L D L L L C2 E]  results fake,fake,fake,spared,fake,fake,win,win,spared,win,win,win,win,empty  restarts 0  time 66.0 s  dispatch cards 15
PASS  seed 4 clears all 12 rooms + both corridor beats with no restart
   seed 5: plan [F F L C1 F* L L L D F* F* L C2 E]  results fake,fake,win,spared,fake,win,win,win,spared,fake,fake,win,win,empty  restarts 0  time 66.0 s  dispatch cards 15
PASS  seed 5 clears all 12 rooms + both corridor beats with no restart
== 6. SIGNAL LOST path (never stab) ==
   SIGNAL LOST in room 3 at 12.4 s into the room; after restart: room 1, ctx {"lightLoose":false,"shrink":0}, results [], restarts 1, enc state idle
PASS  bite fills -> feed cuts -> restart state clean
== timing table (per room, from the module) ==
   room  1 fake  twins         spike 1.0 s, vanish 3.2 s
   room  2 fake  doorway-woman spike 1.0 s, vanish 3.2 s
   room  3 live  exit-charge   spike 1.0 s, dread 2.0 s, counter window 1.15 s, bite 0.060/s (x1.35 after a miss), strikes 14 (cap 25)
   beat C1    decoy corridor      fires in the walk after room 3: burst 1.5 s in, tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  4 live  nightvision   spike 1.0 s, dread 2.0 s, counter window 1.10 s, bite 0.070/s (x1.35 after a miss), strikes 14 (cap 25)
   room  5 live  corner        spike 1.0 s, dread 2.0 s, counter window 1.05 s, bite 0.080/s (x1.35 after a miss), strikes 14 (cap 25)
   room  6 live  hatch         spike 1.0 s, dread 2.0 s, counter window 1.00 s, bite 0.090/s (x1.35 after a miss), strikes 14 (cap 25)
   room  7 live  mascot        spike 1.0 s, dread 2.0 s, counter window 0.95 s, bite 0.100/s (x1.35 after a miss), strikes 14 (cap 25)
   room  8 decoy doorway-eyes  tells +0.15 s, decision +0.45 s, withhold 2.0 s
   room  9 live  tall          spike 1.0 s, dread 2.0 s, counter window 0.90 s, bite 0.110/s (x1.35 after a miss), strikes 14 (cap 25)
   room 10 live  eye-chase     spike 1.0 s, dread 2.0 s, counter window 0.85 s, bite 0.120/s (x1.35 after a miss), strikes 14 (cap 25)
   beat C2    live  corridor      fires in the walk after room 10: double-look phases (noise -> glance back empty -> forward -> noise closer -> glance back figure -> forward snap -> lunge), counter window 0.80 s, bite 0.130/s, strikes 14 (cap 25)
   room 11 live  mannequin     spike 1.0 s, dread 2.0 s, counter window 0.80 s, bite 0.130/s (x1.35 after a miss), strikes 14 (cap 25)
   room 12 empty yellow        walk 9 s, no monster

ALL PATHS PASS
```

# HOSPITAL ESCAPE — Opus Tasking: THE ENGINE (Rail Rig · Rotation State Machine · Combat Core · Chase + Train Finale)

**Game:** Hospital Escape (working title) — an on-rails third-person shooter. A wounded man can't walk; his friend wheels him out of a hospital that armed men are trying to keep him in, and the two of them shoot their way to a stolen ambulance.
**Repo / path:** bparlette/Hawk2 · `games/hospital-escape/`
**Your deliverable:** the game **engine** — plain-JS modules in `games/hospital-escape/engine/`, a greybox demo that runs the whole 9-beat structure with no art, and a headless spec-test suite that proves every system. NOT the shipped single-file game: Neon's lane builds the playable slice and the look (see `tasking/NEON.md`); a later integration step (Moth's) marries engine + slice into `games/hospital-escape/index.html`.
**Your first job is the contract.** It is printed in full below and also lives standalone as `tasking/ENGINE-CONTRACT.md`. Neon is building against it **at the same time** you build the engine — the two lanes run in parallel, and the contract is the only coupling. If something in it turns out to be unbuildable, flag it in your response file immediately; do not silently diverge from it.

## MAIN-ONLY RULE
Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after.

## The split — who owns what

- **Opus (this brief):** the engine and its proofs — rail-camera rig, rotation state machine, combat core, wave director, chase system, train finale, greybox world, spec tests.
- **Neon (parallel brief):** step one's playable slice — the opening (room visit → bed push → wheelchair transfer → first corridor fight) with the game's real look, built against the contract below: same beat/mode names, same data shapes, same `__dbg` surface.
- **Design source:** `tasking/refs/description.md` (frame-by-frame analysis of the two reference clips) and `tasking/refs/source.mp4` / `source2.mp4`. Cherie's 9-beat structure is in both briefs. The design is the reference; the IP is not — originals only, exactly as Neon's brief states.

**Test-first is the working rule for this lane:** for each system below, write the spec tests first, hard to pass, red until the system implements them. The test list in this brief is the floor, not the ceiling.

---

# THE CONTRACT (v1, 2026-11-22)

*Frozen. If this copy and `tasking/ENGINE-CONTRACT.md` ever differ, the standalone file wins.*

## Conventions

- Units are **meters**, Y-up, right-handed, three.js **r128** (global `THREE` from the pinned CDN — see Tech in either brief).
- Time is **seconds**. `at` always means normalized arc-length position **0..1** along a path.
- All level content (beats, paths, waves, dialogue, pursuers) is **data** in the shapes below, authored as plain JS objects. The engine consumes data; it never hard-codes level content. Neon authors content by writing this data.
- Actors are referenced by **role id**, never by mesh: `'hero'`, `'friend'`, `'enemy:<spawnId>'`, `'pursuer:<id>'`. The engine creates greybox actors for every role id and exposes `HE.bindActor(roleId, object3D)` so real art can be attached later without engine changes.

## Beats — the 9 story beats, in order

| # | Beat id | Name | Mode(s) | Vehicle |
|---|---------|------|---------|---------|
| 1 | `visit` | The visit | CUTSCENE | — |
| 2 | `bed_push` | Wheel the bed | RAIL_CHAIR | bed |
| 3 | `transfer` | Transfer to the wheelchair | CUTSCENE → RAIL_CHAIR (held) | bed → chair |
| 4 | `elevator` | The elevator | RAIL_CHAIR | chair |
| 5 | `gauntlet` | The gauntlet (halls · cafeteria · waiting room) | RAIL_CHAIR, with one FREE_FOOT segment | chair |
| 6 | `entrance` | Out the main entrance | HOLDOUT → RAIL_CHAIR (exit push) | chair |
| 7 | `steal` | Steal the ambulance | CUTSCENE → AMBULANCE (staging) | ambulance |
| 8 | `chase` | The chase | AMBULANCE | ambulance |
| 9 | `train_finale` | The train ending | AMBULANCE (finale chain) | ambulance |

A beat is an **ordered list of segments**. A segment is where a mode lives:

```js
{ id: 'gauntlet_cafeteria', mode: 'RAIL_CHAIR',   // one of the MODES below
  path: 'gauntlet_caf',                            // path id (rail/ambulance segments)
  waves: ['caf_wave_1', 'caf_wave_2'],             // wave ids, in trigger order
  lines: ['friend_caf_01', 'hero_caf_01'] }        // dialogue line ids
```

## Modes — the 5 segment modes

| Mode | Player verbs | Camera |
|------|--------------|--------|
| `RAIL_CHAIR` | aim, fire, reload | Spline rail at the path's height (seated ≈ 1.0 m; bed ≈ 0.8 m). Pusher-paced. Player never steers. |
| `FREE_FOOT` | move (gptouch), aim, fire, reload | Free third-person over-shoulder, playing as the friend. The ONLY free mode. |
| `HOLDOUT` | aim, fire, reload | Static behind the parked chair. Waves come to the player. (A rail path with speed held at 0 is the same machinery.) |
| `AMBULANCE` | aim, fire, reload | Fixed rig inside the rear of the moving ambulance, looking back out the open doors. Generous aim arc. |
| `CUTSCENE` | none (advance on line/timer end) | Scripted; carries dialogue beats and story cuts. Rotation between modes happens ONLY here or at segment boundaries — never via player input, never a switch UI. |

## Rail path data

```js
{ id: 'gauntlet_caf',
  vehicle: 'chair',                    // 'bed' | 'chair' | 'ambulance'
  points: [[0,0,0], [1.5,0,-6], [4,0,-11]],   // Catmull-Rom through these, meters; Y may change (elevator)
  height: 1.0,                         // camera height above the path floor line, meters
  back: 0.6,                           // camera offset behind the rider along the tangent, meters
  speed: 1.1,                          // m/s constant — OR use speedKeys instead
  speedKeys: [{at:0, speed:1.1}, {at:0.45, speed:0}, {at:0.6, speed:1.4}],  // speed 0 = a hold
  look: [{at:0, target:[0,1.2,-4]}, {at:0.4, target:'group:caf_wave_1'}],   // look-at blend targets; 'group:<waveId>' = centroid of that wave's live enemies
  events: [{at:0.35, type:'line', line:'friend_caf_01'},
           {at:0.8,  type:'wave', wave:'caf_wave_2'},
           {at:1,    type:'segmentEnd'}] }
```

The ambulance route (beats 7–9) is a rail path with `vehicle:'ambulance'`; the camera rig for it is the fixed rear-facing rig, not the chair rig — same data shape, different rig selected by mode.

## Waves — enemy spawns

```js
{ id: 'caf_wave_1',
  trigger: { type:'segmentStart' }
         | { type:'pathEvent' }                          // fired by a path event of type 'wave'
         | { type:'afterWave', wave:'caf_wave_1', delay:2.0 }
         | { type:'timer', delay:5.0 },                  // seconds after segment start
  spawns: [{ kind:'gunman', at:[6,0,-14], count:3, stagger:0.8, behavior:'cover' },
           { kind:'staff',  at:[2,0,-18], count:2, stagger:0.4, behavior:'rush' }],
  onCleared: { type:'resume' }                           // un-hold the path / advance
           | { type:'line', line:'hero_caf_02' }
           | { type:'wave', wave:'caf_wave_2' } }
```

- Enemy kinds (hospital): `'gunman'` (plain clothes), `'staff'` (staff-like uniforms, later waves). Behaviors: `'cover'`, `'rush'`, `'hold'`.
- A wave is **cleared** when every spawned enemy is dead. `state().enemiesAlive` counts the current segment's live enemies.

## Pursuers — the chase

```js
{ id: 'chase_w2',
  trigger: { type:'afterWave', wave:'chase_w1', delay:3.0 },
  spawns: [{ kind:'suv', slot:'behind', gap:16 }],       // slot: 'behind' | 'left' | 'right'; gap = meters behind the ambulance
  onCleared: { type:'wave', wave:'chase_w3' } }
```

- Pursuer kinds, in escalation order: `'patrol'` (marked sedan) → `'charger'` (marked, push bar) → `'suv'` (unmarked black). Beats 8's data must escalate marked → SUV, per the reference.
- **Component damage model (frozen numbers are defaults; tuning values may change, field names may not):**

| Component | HP | At 0 HP → outcome state |
|-----------|----|-------------------------|
| `tire` | 30 | `'veer'` — car veers, slows, falls back, then wrecked |
| `driver` | 40 | `'drift'` — car drifts uncontrolled and crashes |
| `engine` | 60 | `'burn'` — smoke → fire → stop |

- Pursuer states: `'pursuing'` → `'crippled:tire'|'crippled:driver'|'crippled:engine'` → `'wrecked'` (out of the chase) or `'trapped'` (train finale only). **All kills are by gunfire. The ambulance never rams and never turns around.**

## Dialogue lines

```js
{ id: 'friend_caf_01', speaker: 'FRIEND', text: '…', dur: 2.2 }   // dur = seconds on screen
```

Speaker ids: `'HERO'`, `'FRIEND'`, or `'NPC:<name>'`. Lines are data; the engine renders them as bottom-center subtitles in the game's own styling. Cutscene beats are sequences of lines plus camera holds — no other scripting surface is promised.

## Combat model (frozen fields, tunable numbers)

- Reticle aim in normalized screen coords (0..1, origin top-left). Hit = raycast from the camera through the reticle.
- Weapons: `pistol` (mag 12), `machine_pistol` (mag 30, from beat 5's pickup), chase weapon = machine_pistol class. `reloadTime: 1.2` s. Reserve ammo is infinite in v1 (the reference's counters notwithstanding) — the mag/reload rhythm is the mechanic.
- Hero health `0..100`. `health < 30` = near-death. Lose at `health <= 0` in any mode.
- **Damage feedback is an engine output**, recomputed every frame: `feedback = { vignette: 0..1, wash: 0..1, shake: 0..1 }` — vignette rises on damage and with low health; `wash` (the sickly yellow-green) is > 0 only in near-death; shake on nearby hits/explosions. The demo/greybox renders it as a DOM overlay; the integrated game may render it its own way, but the values come from the engine.

## Train finale (beat 9) — the win state

- The ambulance path crosses a rail line at `at ≈ 0.86` (exact value lives in beat 9's path data, flagged `crossingAt`).
- A train event chain is data on that path: train spawns at `trainAt`, occupies the crossing for `trainOccupies` seconds.
- **WIN** when all three hold: the ambulance has passed the crossing, the train occupies the crossing, and every active pursuer is on the far side → each such pursuer's state becomes `'trapped'`, spawning stops, and `state().won === true`. End on the quiet beat (mirror-check line), then the run ends.
- If a pursuer is already past the crossing when the train arrives (data error or edge case), it stays `'pursuing'` and the win does not fire until it is wrecked — the finale must never soft-lock.

## `window.__dbg` — the verification surface (frozen)

Neon's brief already requires a `__dbg` hook in the shipped file; THIS is its shape, for the engine, the demo, and the integrated game alike:

```js
window.__dbg = {
  version: 'he-dbg-1',
  state(),            // -> { beat, segment, mode, vehicle, health, nearDeath,
                      //      ammo: { weapon, mag, reserve }, enemiesAlive,
                      //      pursuers: [{ id, kind, state, hp: { tire, driver, engine } }],
                      //      pathT, feedback: { vignette, wash, shake }, won, lost }
  gotoBeat(beatId),   // jump to a beat's first segment; returns true, or false on unknown id
  gotoSegment(beatId, index),
  aim(nx, ny),        // set reticle, normalized 0..1
  fire(down),         // boolean trigger press/release — feeds ALL modes' fire verb
  reload(),
  damage(n),          // apply n damage to the hero (test hook)
  events(),           // -> [{ t, type, data }] transition log: beat/segment/mode changes, wave spawns/clears, pursuer state changes, win/lose
}
```

Input rule: real input (touch/mouse/keyboard, gptouch in FREE_FOOT) and `__dbg` injection feed **one** input abstraction (`HE.input = { aim:{x,y}, fire, reload, move:{x,y} }`). Tests drive the same verbs players do.

## File & data homes

- Engine code: `games/hospital-escape/engine/` — plain classic scripts under one `window.HE` namespace, no build step, no modules/bundler. three.js r128 loads from the pinned CDN before them (global `THREE`).
- Level data in contract shapes: `games/hospital-escape/engine/data.js` (beats, segments, paths, waves, pursuers, lines). Greybox content for all 9 beats lives here from the start, however rough — every beat must be jumpable via `gotoBeat` before any art exists.
- Greybox world + actors: engine-created (capsule characters, grey corridors, a boxy ambulance and pursuer cars). The engine must be fully provable with zero Neon assets.

---

# YOUR LANE — THE SYSTEMS

## 1. Rail-camera rig

- Catmull-Rom spline through the path points; the rider (bed/chair) sits ON the path, the camera rides at `height` above the floor line and `back` meters behind the rider along the tangent.
- **The pusher is engine business:** the friend actor follows the same path offset ≈ 0.55 m behind the rider, speed matched to the path's current speed (including holds — at speed 0 the pusher idles/crouches; the pair never separates).
- Look-at blending: camera orientation blends between the path tangent and the active `look` target (point or live wave centroid) per the look keys — smooth, no snaps, targets never behind the camera for more than a beat.
- Speed comes from data (`speed` or `speedKeys`); a wave's `onCleared: resume` releases a hold. The rig exposes `pathT` (0..1) in state at all times.
- Damage feedback (vignette / wash / shake) is computed here as engine output per the contract — including the seated-height injury feel: constant light vignette + slight edge blur in RAIL_CHAIR, deepening with damage.

## 2. Rotation state machine

- Beats → segments → modes, driven entirely by data + events. Transitions happen at segment boundaries and inside CUTSCENE segments — **never from player input; there is no switch UI, and the engine must not grow one.**
- Cutscene/dialogue hooks: a CUTSCENE segment plays its lines in order (each for its `dur`), holds its camera, then advances. Lines can also fire from path events and wave clears in any mode (subtitles only, no control change).
- Every transition (beat, segment, mode, wave spawn/clear, pursuer state, win/lose) is appended to the `__dbg.events()` log with a timestamp. Tests read the game through this log + `state()`.

## 3. Combat core

- Reticle aim model per the contract (normalized coords, camera raycast, red ✕ hitmarker hook as an engine event the renderer can draw).
- Hit resolution: enemies take body hits; **vehicles resolve by component** — the raycast must distinguish tire / driver (windshield) / engine zones on a pursuer and apply damage to that component's HP only.
- Enemy behavior set: `cover` (move to a cover point, peek-fire), `rush` (advance on the player position), `hold` (fire from spawn). Enemy fire damages the hero on a data-driven accuracy/damage model — deterministic under a seed (see Tests).
- Wave director: triggers (`segmentStart`, `pathEvent`, `afterWave`, `timer`), stagger, cleared detection, `onCleared` actions — all from data, all logged.

## 4. Chase system

- The ambulance is a rail vehicle: it follows its path data; the friend "drives" (driver actor in the cab, no player driving input exists).
- Pursuer AI: spawn by slot/gap behind the ambulance, close to a data-driven attack distance, hold station while firing, react to component outcomes (veer/drift/burn per the contract), fall out of the chase when wrecked.
- Escalation is data: beat 8's waves go marked (`patrol`, `charger`) first, then `suv` — matching the reference's "no flashing lights, just blacked-out SUVs" turn.
- **Train finale** exactly as the contract specifies: crossing flag in path data, train as a timed event chain, win condition with all three clauses, `trapped` state for cut-off pursuers, and the no-soft-lock rule for a pursuer already past the crossing.

## 5. Greybox + demo

- `games/hospital-escape/engine/demo.html`: loads the pinned-CDN three.js + the engine + greybox data and plays **the entire 9-beat structure** start to finish — grey corridors for the hospital (room, halls, an elevator shaft, a cafeteria shell, a lobby), capsule hero/friend/enemies, a boxy ambulance, pursuer cars, a train. Ugly is fine. Complete is the requirement: every beat reachable in normal play AND via `gotoBeat`, every mode exercised, win and lose both reachable.
- The demo is the proof surface: if it isn't true in the demo, it isn't built.

## Tech — shared three.js, no build step

- **three.js ONLY from the pinned CDN** — `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` — **never inlined or bundled** into any engine file, demo, or test page. Standing house rule: CDN or the one shared in-repo copy, never a per-game private copy.
- Engine files are classic scripts under `window.HE`, loaded in order; no bundler, no transpiler, no npm. Data is JS, not JSON fetches (the demo must run from `file://` and from Pages identically).
- Portrait 390×844 is the judging size for anything visual, including the demo's framing. iOS audio unlock chain applies to the demo too if it makes sound (engine sound is optional in this lane; feedback values are not).

## Spec tests — write them FIRST

Deliver `games/hospital-escape/engine/tests.html`: loads the engine + greybox data, runs every test headlessly (deterministic — fixed seed for anything random), and exposes `window.__testResults = { passed, failed, list: [{ id, name, pass, detail }] }` plus renders the same table on the page. Also deliver a node-runnable data validator (`engine/validate-data.mjs`, no three.js dependency) that checks every data object against the contract shapes. Minimum test set:

| ID | Test | Pass criteria |
|----|------|---------------|
| T1 | Rail fidelity | On a sample path, rider + camera stay within 0.05 m of the spline at 100 sampled `pathT` values; camera height = path `height` ± 0.05 m throughout. |
| T2 | No steering on rails | Injecting move/aim input for 5 s in RAIL_CHAIR changes neither the path nor `pathT` progression (beyond the data speed); `pathT` is monotonic. |
| T3 | Pusher lockstep | Pusher-to-rider distance stays 0.55 m ± 0.1 m across speed changes AND through a 3 s zero-speed hold. |
| T4 | Rotation order | A full greybox run visits modes in contract order (chair → free → holdout → ambulance across beats 2–9), every transition appears in `events()`, and no state exposes any player switch verb. |
| T5 | Aim/fire through `__dbg` | `aim()` at a live enemy's projected screen position + `fire(true)` registers a hit event within 3 shots; the same enemy dies after its data HP in hits. |
| T6 | Component resolution | Shots at a pursuer's tire zone deplete ONLY `hp.tire` → state `crippled:tire` → `wrecked`; repeat for driver and engine zones with their contract outcomes. |
| T7 | Wave director | A wave spawns exactly its data count (stagger respected ± 0.1 s), `onCleared` fires only when `enemiesAlive` reaches 0, and a hold releases the path within 0.5 s of the clear. |
| T8 | Holdout | In HOLDOUT, camera position is static (± 0.01 m over 10 s) while two data waves arrive and are cleared via injected fire. |
| T9 | Chase escalation | Beat 8 greybox data spawns only marked kinds before the escalation trigger and only `suv` after it; a wrecked pursuer's speed falls to 0 relative to the route and it never re-enters. |
| T10 | Train finale — win | Scripted run: ambulance crosses, train occupies, all pursuers far-side → every pursuer `trapped`, `state().won === true`, no further spawns. |
| T11 | Train finale — no soft-lock | With one pursuer past the crossing at train time: win does NOT fire, the pursuer stays `pursuing`, and wrecking it then fires the win. |
| T12 | Damage feedback | `damage(50)` raises `feedback.vignette` above its idle value within one frame; at health < 30, `nearDeath === true` and `feedback.wash > 0`; at health 100 after reset, `wash === 0`. |
| T13 | Beat jumpability | `gotoBeat()` succeeds for all 9 beat ids from any state, lands in the beat's first segment/mode per the contract table, and never throws. |
| T14 | Data validity | `validate-data.mjs` passes on the shipped greybox data (every path/wave/line/pursuer referenced exists; all shapes conform). |

A test that passes on first run is suspect — say so in the response if any did, and what you did to make it earn its pass.

## Response file — required

Write **`games/hospital-escape/tasking/responses/opus-engine.md`** with:

- What was built, system by system (rig, state machine, combat, waves, chase, finale, greybox/demo), each mapped to the section above.
- **Actual test results**: run `tests.html` headlessly, paste the real results table (per-test pass/fail + the summary line), and report `validate-data.mjs` output. Numbers from a run, not from intention — they will be re-run and re-measured.
- The contract **as implemented**: confirm v1 held, or name every deviation explicitly with the reason. An unnamed deviation is a defect; a named one is a conversation.
- File inventory with exact byte sizes (every engine file, demo, tests, data).
- Screenshots at 390×844 from the demo: one rail corridor moment, the holdout, the ambulance chase, the train at the crossing. Greybox is expected — label them as such.

## Crew note

You decide your own internal approach and whether to sub-task any part of this. For awareness only: Gemini is available for design/media work and Sonnet as Mac-side hands, if either is useful to you — availability, not routing. Tasking for them, if you want it, is yours to write.

## References

In this repo, in this tasking folder:

- **`tasking/NEON.md`** — the parallel slice brief. Mirror its decisions; the two builds must agree without a meeting.
- **`tasking/ENGINE-CONTRACT.md`** — this contract, standalone. The canonical copy.
- **`refs/description.md`** — the full frame-by-frame analysis of both reference clips, including Cherie's 9-beat structure.
- **`refs/source.mp4`** (Part 1, hospital escape) · **`refs/source2.mp4`** (Part 2, ambulance chase) — the reference clips themselves.

The camera does all the work. The engine is why that's true. Build the engine.

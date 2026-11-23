# HOSPITAL ESCAPE — ENGINE CONTRACT v1 (2026-11-22)

**This contract is the interface between the two build lanes.** Opus builds the engine to it; Neon builds the step-one slice against it. It is frozen at v1: names, fields, and shapes below do not change unless Cherie/Moth approve a contract change, which lands as its own commit and is noted in both lanes' response files. If this file and the copy inside `OPUS.md` ever differ, **this file wins**.

**Repo / path:** bparlette/Hawk2 · `games/hospital-escape/`
**Companion briefs:** `tasking/NEON.md` (slice + art lane) · `tasking/OPUS.md` (engine lane)

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

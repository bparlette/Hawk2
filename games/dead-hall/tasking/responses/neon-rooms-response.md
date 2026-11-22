# DEAD HALL — Neon Phase 2 Response: 12-Room Atmosphere Pass, Fake-Out Variants & Load-Page Art

**Status:** Complete, verified at headless `390×844` (**0 console/page errors**, all 12 rooms + load screen captured).
**Scope discipline:** Zero changes to Opus's combat systems (`src/combat/`), walk path, camera, input buttons, or locked flicker cadence (rooms 1 & 11).

---

## 1. Delivered Files

- `games/dead-hall/src/neon/rooms.js` — `applyNeonRoomsPass(scene)` building set-dressing, lighting moods, and `REFS.md`-matched framing accents for all 12 rooms using `InstancedMesh` + cached procedural textures from `src/neon/textures.js`, plus 3 ambient fake-out staging variants (`falling_pipes`, `second_look_silhouette`, `empty_room_knock`).
- `games/dead-hall/assets/load-bg.jpg` — 9:16 portrait key-art of Officer UNIT 2210 with chest-mounted glowing-red REC bodycam and flashlight stepping into the condemned hallway; wired into `#screen` in `games/dead-hall/index.html` with top/bottom gradient scrim so title, briefing copy, and `TAP TO BEGIN PATROL` read cleanly over top.
- `games/dead-hall/index.html` — Minimal 4-line module hook (`import`, `applyNeonRoomsPass(scene)`, `reset()`, `update(G, 1/30)`) + `#screen` background styling.
- `games/dead-hall/tools/capture-rooms.mjs` — Headless CDP `390×844` per-room capture & draw-call benchmark (`--tag before|after`).

---

## 2. Per-Room Draw Calls — BEFORE vs AFTER (`390×844`, 0 Errors)

Measured identically via `node games/dead-hall/tools/capture-rooms.mjs` on untouched `index.html` (`BEFORE`) and with `applyNeonRoomsPass(scene)` active (`AFTER`):

| Room | ID | Reference Staging Added (`REFS.md`) | Calls BEFORE | Calls AFTER | Delta | Tris BEFORE → AFTER |
|---|---|---|---|---|---|---|
| R1 | `01-twins` | Symmetrical Corridor B hotel carpet runner, instanced repeating N/S doorframes + lintels, center ceiling pendant globes | 105 | 120 | +15 | 5402 → 6268 |
| R2 | `02-doorway-woman` | Domestic peeling-plaster far wall, black inner doorway backing behind woman, edge-only sideboard & crooked picture frames | 38 | 41 | +3 | 3660 → 3736 |
| R3 | `03-exit-charge` | Frosted green backlit double doors + mullions/push-bars behind A-end silhouette, red-orange EXIT wall glow | 85 | 99 | +14 | 4508 → 4822 |
| R4 | `04-nightvision` | Institutional `nvClinicalTile` wall/floor grid + overturned side utility cart (floor path clear) | 21 | 25 | +4 | 2864 → 2952 |
| R5 | `05-corner` | Mold-stained stone/drywall corner planes + dark corner cast-shadow decal (bare left wall preserved) | 95 | 114 | +19 | 4162 → 4678 |
| R6 | `06-hatch` | Circular riveted-iron well collar, pitch-black circular pit mouth, cold blue overhead light pool | 18 | 23 | +5 | 2972 → 3384 |
| R7 | `07-mascot` | Full-length checkered B&W `scuffedLinoleum` hall runner, far doorway archway + single overhead amber lamp above mascot | 50 | 55 | +5 | 3618 → 3674 |
| R8 | `08-doorway-eyes` | Heavy timber jamb molding + frame-left industrial `DOOR / LIGHT` control panel with glowing red/white buttons + cold rim | 58 | 66 | +8 | 3740 → 3896 |
| R9 | `09-tall` | High-bay `tallIndustrialWall` + tall warm backlit doorway portal behind figure + floor glow between feet | 23 | 29 | +6 | 2868 → 2974 |
| R10 | `10-eye-chase` | Chase-only alarm-red pulsing corridor lights, 18 instanced black wall tendrils (`1` draw call), far EXIT hazard glow | 47 | 58 | +11 | 3610 → 4444 |
| R11 | `11-mannequin` | Dusty `crackedStoragePlaster` back wall + aisle floor tape (flicker cadence untouched) | 75 | 84 | +9 | 5024 → 5812 |
| R12 | `12-yellow` | Mono-yellow diamond wallpaper, damp carpet, acoustic drop-tile ceiling, repeating liminal pilasters, flat shadowless fill (**EMPTY — no monster**) | 24 | 30 | +6 | 2926 → 3032 |

- **Median room draw-call delta:** `+7.5` calls (`+3` min, `+19` max). Zero draw-call blowouts.

---

## 3. Fake-Out Staging Variants (`window.__neon.triggerFakeout(name)`)

1. **`falling_pipes`** — Rusted overhead conduit pipe + metal toolbox perched in Corridor A (`z = -19.8`) that clatters to the floor edge with an expanding dust puff (`d ≈ 18.2 m`).
2. **`second_look_silhouette`** — Pale-rimmed dark figure glimpsed down Corridor A (`z = -29.5`) for `0.65 s` that vanishes completely on the second look (`d ≈ 21.5 m`).
3. **`empty_room_knock`** — Swinging bare pendant bulb over an empty corridor threshold (`z = -47.5`, `d ≈ 78.5 m`) with damped oscillation and light flicker.

---

## 4. Related Phase 1 Deliverable

Pinned numerical figure specs (`FIGURE_SPECS`), articulated procedural rigs, and `390×844` motion-test harness results live in `games/dead-hall/tasking/responses/neon-phase1-rigs-textures.md` (commit `40154fa`).

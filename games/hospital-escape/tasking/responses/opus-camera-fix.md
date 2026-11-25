# Opus: CAMERA-FIX (+ the elevator door-block beat + a self-checking camera audit)

> **Logins / paid:** none. **Loaders:** unchanged (GLTFLoader). **The T4 look:** unchanged.
> **Last moved:** Nov 25, 2026.

**Evidence:** `responses/opus-camera-fix-shots/`, all 390×844.
- **Before/after pairs** (`BA-*.png`, plus singles). "Before" is the pre-fix build `51e47c6` and "after" is this build, at the same beat and the same moment:

  | Pair | Shows |
  |---|---|
  | `BA-1-ambulance-wall` | owner's shot 1: the bay's side wall fills the frame |
  | `BA-2-outside-through-wall-ward` | owner's shot 3: on foot, the camera has gone through the ward wall and sees outside |
  | `BA-3-pure-wall-on-foot` | owner's shot 5: a frame of pure wall |
  | `BA-4-camera-inside-geometry-bed-push` | the shot-6 family: the camera inside the bed or floor at the bed push's opening |
  | `BA-5-elevator-car-void` | the void through the elevator car's open far end |

- **Real-input play** (the page's START button, mouse aim, Space fire; WASD on foot), all **0 page errors**:
  - `play-real-input-ward-on-foot-WASD.mp4`: backing Maya into walls on purpose;
  - `play-real-input-ambulance.mp4`;
  - `play-real-input-elevator.mp4`: the door-holder was cleared by real input and the run carried on into the cafeteria.
- **The new beat:** `elevator-block-autopilot.mp4`.
- **Audits:** `camera-audit-BEFORE-51e47c6.txt`, `camera-audit-AFTER.txt`, `fairness-audit.txt`.

## Guardrails (final code)
| Check | Result |
|---|---|
| Engine tests | **24/24**, 0 page errors |
| Data validation | **206 objects, 0 errors**. It was 201; the new elevator-block beat adds a wave, a line, a look key and a hold. |
| Fairness audit | **PASS: 365 damage events, 0 violations** (min visible 1.6 s, min 70 px) |
| **Camera audit (new)** | **PASS**: A 0, B 0, C 0, D 0, E 0, page errors 0. One warning: F, enemies off screen for over 4 s at the ambulance start; the engine's existing 5 s relocate rule covers it. |
| Full playthrough | completes, 242 s, 0 page errors |

## "Catch it yourself": the new gate
`tools/camera-audit.cjs` is now part of the gate (`tools/README.md` lists the whole gate and the rule: *a defect that gets past the gate isn't fixed until the gate can catch it*). It plays the whole game on autopilot, sampling every 0.1 s, **plus** a scripted on-foot pass that does what the autopilot never does: walks backward into walls, strafes, edge-turns hard. It **fails** on:

| Check | Fails when |
|---|---|
| A | the lens is inside or behind geometry |
| B | over 50% of the screen is within 0.8 m, for over 0.6 s |
| C | indoors, over 2% of the screen sees the void, for over 0.3 s |
| D | the ambulance body fills over 60% of the frame, for over 0.6 s |
| E | any room boundary is still open after repair |

On the **old build it fails with A 17, C 21, D 1, E 54**, so it catches all four of the owner's defect families without her screenshots. Its first runs on this build also caught four things I had missed:
- the elevator car's open far end;
- the slots beside and above its doors;
- the 0.3 m ceiling step where a 3.2 m lobby meets a 2.9 m hall;
- the full-about-turn look blend pointing the lens at the floor (from the new beat).

## The fixes (hypotheses checked)
| Owner defect | Cause found | Fix |
|---|---|---|
| **1. Walking through walls** | **Confirmed, and worse than hypothesised.** On foot, Maya had no collision at all, only a 3 m leash to her path line, so she walked into walls and the camera, 2 m behind her, went through them. Rail cameras were never collision-checked either (bed push opening: 0.3 m inside the bed; entrance exit: up to 1.38 m behind the lobby frame). | `game.footCollide`: Maya's 0.35 m body is swept at knee and chest height and slides along walls. `game.cameraCollide`: 0.3 m of air around the lens, then nothing solid between the pivot (rider or Maya at eye height) and the lens. Both are called **inside** the engine's camera placement (`rail.js` / `director.js` hooks), so the reticle ray uses exactly the camera you see. They test a double-sided proxy of the world, so single-sided furniture stops the lens from behind too. |
| **2. Only wall, no people** | The same root as 1 (lens in or at a wall). On foot, the figure in frame was also the old procedural stand-in. | The two colliders. On foot, **the 3D Maya** (aimed walk paced by contact, held aim when still, spine to the reticle, her gun fires your shots) replaces the procedural figure. |
| **3. Only ambulance wall** | **Confirmed:** no look clamp on the ambulance routes, so turning toward the lot's gunmen pointed the lens at the bay's side wall (measured 74% of the frame is the vehicle). | `lookClamp: 15` on the three ambulance routes: the view stays inside the rear-door opening (measured 33%: the vehicle frames the shot, the lot and the gunmen show). Off-screen gunmen still relocate into view (the engine's existing 5 s rule). |
| **4. See outside instead of wall** | **Confirmed, two causes:** (a) the camera behind walls (fixed above); (b) **real holes.** Several rooms were never closed (the ward's open sides, waiting room, lobby, both elevator lobbies), plus ceiling-step slots, the elevator car's far end opening onto nothing, and gaps beside and above its doors. | `game/enclose.js` audits every interior boundary at load and seals every exterior gap (15 wall strips and step headers, never where a route passes within 1 m). The car's far end stays shut, and the car gets jambs and headers. T4's room surfaces are double-sided. |

**Not changed:** the T4 look, the patient-eyes system, gameplay tuning, and the cast's behaviour except the on-foot Maya.

## The elevator door-block beat (owner request, Nov 25)
"The doors close, someone comes and stops them, we shoot him before they close again and go down":
1. As the chair rolls into the car, the car doors start closing (path 0.86).
2. At that moment a new wave **`el_block`** sends one gunman sprinting in from the far end of the lobby, and Maya calls it: *"He's holding the doors — drop him before they close!"*
3. The rail **holds** at 0.88 and the view swings round to him (the elevator path's hold clamp is opened to 180°). **The doors swing back open and stay open while he's alive.**
4. When he drops, the wave's resume releases the rail, the doors close and the car goes down.

Data: one wave, one line, one look key and a hold key (`game/level1.js`, **206 objects, 0 errors**). Presentation: the car doors stay open while an `el_block` gunman lives (`main.js`). The swing round was the first 180° look turn in the game, and it exposed a rail bug: the linear look blend passed through near-zero and pointed the lens at the floor. Turns of more than about 100° now blend in yaw (`rail.js`); smaller turns behave exactly as before.

## Method / where things are
**Code:**

| File | Change |
|---|---|
| `engine/rail.js` | camera-collide hook; yaw-arc look blend for big turns |
| `engine/director.js` | foot- and camera-collide hooks |
| `game/main.js` | `footCollide`, `cameraCollide` (double-sided collision proxy), the car's far ends shut, the door-holder rule, on-foot Maya wiring |
| `game/enclose.js` | new: the boundary audit + repair, including ceiling steps and the exterior rule |
| `game/world.js` | elevator car jambs + headers |
| `game/t4look.js` | double-sided room surfaces |
| `game/cast3d.js` | on-foot Maya |
| `game/level1.js` | ambulance look clamps; the elevator-block beat |

**Tools:**
- `tools/camera-audit.cjs` (the gate);
- `tools/cam-scan.cjs` (one beat, takes `GAME_DIR` to compare an older build; `FOOT=1` scripted on-foot input; `STOPT` + `SHOT` for matched stills);
- `tools/t4-play.cjs` (`KEYS=1` real WASD);
- `tools/README.md` (the gate).

## Next in my queue
TRANSITION-HITCH (OPUS-NEXT #2) is next: instrument the first three scene transitions and move any asset or T4 setup work off the cut.

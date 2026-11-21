# Bunny Hop — chase camera (Opus): notes and host seam

Implements `tasking/iteration-2.md` Round 1c: plan pushes #2 (camera model) and #9 (landing-impulse shake).

`chaseCam.js` is pure ESM (no DOM, no three.js). Run its tests with `node --test games/bunny-hop/src/camera/*.test.mjs`: 14/14 pass.

**Why it's a separate module.** The camera reads bike state but never feeds back into physics, and it has its own CONFIG and its own tests. Keeping it out of `bikePhysics.js` means a camera tuning pass can never break a play proof.

## Host wiring (Moth: this replaces the `/* camera */` block in `index.html`)

```js
import { createChaseCam } from './src/camera/chaseCam.js';
const chase = createChaseCam();
// each frame, after physics / swim / bail:
const ct = mode === 'swim'
  ? { mode: 'swim', x: swimPos.x, z: swimPos.z, heading: swimHeading, speed: swimSpeed, grounded: true, waterLevel: WATER_Y }
  : mode === 'bail'   // follow the FLYING RIDER (src/rider/bailSim.js), not the crashed bike
  ? { mode: 'bail', x: BS.rider.x, z: BS.rider.z, y: env.groundAt(BS.rider.x, BS.rider.z).height, heading: S.heading, speed: 0, grounded: true, waterLevel: WATER_Y }
  : { mode: 'ride', x: S.x, y: S.y, z: S.z, heading: S.heading, speed: S.speed, grounded: S.grounded, waterLevel: WATER_Y };
const cs = chase.step(dt, ct);
camera.position.set(cs.x, cs.y, cs.z); camera.up.set(0, 1, 0);       // never roll
camera.lookAt(cs.lookX, cs.lookY, cs.lookZ);
if (camera.fov !== cs.fov) { camera.fov = cs.fov; camera.updateProjectionMatrix(); }
sun.target.position.set(cs.shadow.x, 0, cs.shadow.z);                // keep your sun-position offset as-is
// once, after creating the sun:  const h = 15;  sun.shadow.camera.left = sun.shadow.camera.bottom = -h;
//                                sun.shadow.camera.right = sun.shadow.camera.top = h; sun.shadow.camera.updateProjectionMatrix();
```

- **Call `chase.reset(ct)` on every hard cut:** spawn, `__dbg.teleport`, climb-out and remount. Otherwise the camera swings across the map.
- **No events are needed.** The camera detects touchdown itself from the `grounded` transition and the vertical speed it measured in the air.
- **`y` is the wheel-contact height (`S.y`), not the old `S.y + 0.9` target.**

**Verified in a scratch copy of the live `index.html`** (in my scratchpad, not committed). This used the block above, Neon's world v3 at Hawk2 `b795bfa`, and my physics branch. Measurements were taken by projecting the real three.js camera at 390×844, with the rider's head top at contact + 1.715 m (head sphere at 1.6 + r 0.115):

| Shot | Rider share of frame height | Horizon (from top) | GL draws/frame | Work median |
|---|---|---|---|---|
| Spawn, at rest | 33.5% | 29.9% | 139 (old cam: 138) | 1.4 ms (old: 1.3) |
| Main street, 24 km/h | 32.4% | 30.5% | | |
| Bridge deck, rest / 8 km/h | 33.5% / 33.4% | 29.9% / 30.0% | | |

There were zero page errors. Acceptance needs 30–35% and the top third, and every shot is inside both.

## Deviations from the plan's numbers (named, with measurements)

| Plan said | Shipped | Why |
|---|---|---|
| 3.6 m back | **3.8 m behind the rear wheel** (4.3 m to the bike origin) | At 3.6 m the rider fills 35.8% at rest, over the 35% mark. 3.8 m keeps it at 31.7–34.3% across the whole FOV breathe (60 → 64°). It's still inside `frame-1`'s "3–4 m behind the rear wheel". |
| Look-at +0.5 m above the hip (~1.4 m) | **Aim 0.65 m above contact** (~13° fixed down-tilt) | With a 1.65 m camera, aiming at 1.4 m is nearly level. The horizon then sits 44% from the top, which fails the plan's own top-third mark. 0.65 m puts it at 30–31%. |

The plan's intent is kept: shoulder height, rider dead centre, horizon in the top third, and the lid line visible ahead.

## CAM_CONFIG: every number and why

| Key | Value | Why |
|---|---|---|
| `backDist` | 3.8 m | See the deviations above (`frame-1`). |
| `rearWheelOffset` | 0.5 m | Half the bike's wheelbase (`bikePhysics.CONFIG.wheelbase / 2`), so distance is measured from the rear contact as `frame-1` reads. |
| `height` | 1.65 m | Shoulder height (summit Round 2): lids show over the rider's shoulders, and the horizon sits high. |
| `aimHeight` | 0.65 m | ~13° fixed down-tilt. The horizon sits 30–31% from the top and never bobs during hops. |
| `yawStiffness` | 3.2 rad/s | Critically damped, ~0.9 s to 80%, no overshoot. The world swings past on turns (`frame-4`, lazy yaw). |
| `heightRate` | 12 /s | 90% in ~0.19 s. Curbs and ramps never leave the rider sliding off frame (tight height). |
| `airFollow` | 0.35 | The camera rises with only 35% of the hop height, so the pop reads as the rider leaving the frame line rather than the world dropping. |
| `fovBase` | 60° (vertical) | `frame-1`/`frame-2`. three.js `fov` is vertical: 60° vertical at 390×844 is ~30° horizontal, which is portrait-safe and keeps edges undistorted (Neon's Round 1 concern). |
| `fovKick` | +4° at top speed | Speed breathe. |
| `fovMax` | 64° | Hard cap agreed with Neon. A test asserts it at 2.5× top speed. |
| `fovTopSpeed` | 12 m/s | Equals `bikePhysics.CONFIG.topSpeed`. |
| `fovRate` | 2.5 /s | The FOV eases in, so there is no snap on a hop or brake. |
| `shakeMinImpact` | 2.0 m/s | Below this, nothing. A 0.12 m curb drop lands at ~1.8 m/s, so it stays silent. |
| `shakePerImpact` | 0.03 m per m/s | A full hop (6.1 m/s impact) dips 0.12 m. |
| `shakeMax` | 0.12 m | Cap: a deck-height drop doesn't throw the frame. |
| `shakeTau` | 0.025 s | Dip shape `t/τ·e^(1−t/τ)`: peaks at 25 ms, with < 5% left at 150 ms (tested). There is no oscillation, so no shimmer on wires or rails. It is zero in the air, while swimming and during a bail. |
| `swimHeight` | 0.6 m | Above `waterLevel` (`frame-7`). |
| `swimBackDist` | 3.0 m | The swimmer fills the lower frame (`frame-7`). |
| `swimPitchUp` | 6° | Looking slightly up at the world (`frame-7`). |
| `bailBackDist` | 5.5 m | In bail, the camera follows the flying rider from farther back... |
| `bailHeight` | 3.0 m | ...and higher, clearing bins (1.1 m), rails and cars, so you watch the dive over the obstacle (`frame-3`). At shoulder height it sat behind the bin the rider had hit, verified in the scratch host. |
| `bailAimHeight` | 0.3 m | Tilts down onto the body. Yaw holds through the bail, and the height eases in at `heightRate`. |
| `shadowHalfSize` | 15 m | A 30 m square around the rider (the plan). That's a tighter frustum than the default, so the 1024² map gets sharper rider shadows. |
| `shadowLead` | 5 m | The frustum centre sits ahead along the view, because that's where the shadow falls (`frame-2`) and where you look. |
| `CAMERA_ROLL` | 0 (export, not in CONFIG) | `frame-5`: the horizon stays dead level under lean. The plan makes this "not a tunable". The camera never reads `lean`; a test asserts this. |

## Tests (`chaseCam.test.mjs`, 13)

- **Rig:** the rest position, roll 0, and roll absent from CONFIG.
- **Acceptance framing at 390×844:** rider share and horizon at 0, 7 and 12 m/s, computed with `projectFraming()`, the same projection maths Moth can use for acceptance.
- **Yaw:** critically damped with no overshoot, and wraps the short way across ±π.
- **Height:** step response.
- **Ignores crouch and lean.**
- **FOV:** breathe and cap.
- **Hop:** the camera rises 20–45% of the apex, and the tilt is constant.
- **Landing dip:** silent on a curb, scales with impact, decays by 150 ms, zero in the air.
- **Swim cam:** placement.
- **Shadow frustum.**
- **Frame-rate independence** (30 vs 144 fps).
- **Bail:** yaw holds, and the bail framing rises and pulls back smoothly.

# Bunny Hop — rider pose driver + bail integrator (Opus): notes and rig seam

Implements `tasking/iteration-2.md` Round 2b: plan pushes #5 (rider pose) and #8 (bail separation).

`riderPose.js` and `bailSim.js` are pure ESM (no DOM, no three.js). Run their tests with `node --test games/bunny-hop/src/rider/*.test.mjs`: 16/16 pass.

**Why a separate `src/rider/` folder.** The pose reads `bike.state` but never feeds back, so a pose bug can't break a play proof. It also has its own CONFIG and tests, and it's the part most likely to be redone if Cherie ever approves an authored rider (tradeoff T2).

## What it does

| Behaviour | How | Frame |
|---|---|---|
| **Pedalling** | Cranks turn at speed ÷ wheel radius ÷ gear ratio (72 rpm at 7 m/s). Both legs are two-bone IK onto the actual pedal positions, so the feet never leave them (tested: < 5 mm at every crank angle, crouch included). Hips rock ±0.05 rad at cadence and the torso bobs 12 mm at twice cadence. | 1, 2 |
| **Coast** | The cranks freewheel to level and the rider sits up: torso −0.13 rad, hips 10 cm forward. | 6 |
| **Crouch** | Hips go 20 cm down and 14 cm back and the torso flattens 0.38 rad toward the bars, while the feet stay on the pedals. This is not the old whole-rig sink. | — |
| **Air** | Cranks level, legs still, standing with the hips back over the rear wheel, arms pulling the bars. | — |
| **Landing** | A brace (hips drop, torso folds) plus frame squash, both scaled by impact. Nothing happens on a curb, and the squash recovers in < 0.4 s. | — |
| **Hop pitch** | Pivots on the **rear contact point** in the air, so the front-first pop reads as a wheelie. On the ground it pivots on the centre so slopes still sit right. | 2 |
| **Arms** | Two-bone IK with soft-bent elbows: hands on the bars in every pose (< 2 cm). | 1 |
| **Bail** | The rider separates from the bike on a ballistic arc. The tumble settles into a flat, face-down dive with limbs trailing, then the body slides and comes to rest. The bike skids, stays against whatever it hit, and falls onto its side. A body that slides off a ledge falls again. | 3 |

## Rig seam: the exact changes Moth makes in `index.html`

### 1. Build-time: two new pivots (no new meshes, no new draws)

The pose needs the torso to hinge at the hip and the forearms at the elbow. Today the torso, head and arms hang directly off `riderRig`, and each arm is one rigid group. Here is the minimal regroup, verified working in a scratch copy of the host. Append it at the end of the rig-building block:

```js
riderRig.updateMatrixWorld(true);
const upperBody = new THREE.Group(); upperBody.position.set(0, 0.98, -0.14); riderRig.add(upperBody);
riderRig.updateMatrixWorld(true);
const ub = riderRig.children.slice(1, 7);            // torso, head, cap, brim, armL, armR (build order)
for (const o of ub) upperBody.attach(o);              // attach() keeps the world transform
const arms = [ub[4], ub[5]].map((g, i) => {
  const side = i === 0 ? -1 : 1;
  const fa = new THREE.Group(); fa.position.set(side * 0.03, -0.24, 0.16); g.add(fa);   // elbow
  g.updateMatrixWorld(true); fa.attach(g.children[1]);                                 // forearm tube
  return { g, fa };
});
crank.children[1].rotation.x = 0;   // crank arm straight along +y, so the pedals sit where the IK puts them
```

If the rig build order changes, pick the children by reference instead of with `slice(1, 7)`.

### 2. Per frame, ride mode

This replaces the crouch sink lines and the `pedalPhase` leg sines:

```js
import { createRiderPose } from './src/rider/riderPose.js';
const rpose = createRiderPose();
// ...
const P = rpose.step(dt, S, modInput);              // modInput = what you fed bike.step (only .pedal is read)
pitchGroup.rotation.x = -S.pitch;
pitchGroup.position.set(0, P.pitchOffsetY - P.squash, P.pitchOffsetZ);
wheelF.position.y = wheelR.position.y = 0.34 + P.squash;          // tyres stay on the ground while the frame squashes
riderRig.position.set(0, P.hipsY, P.hipsZ); riderRig.rotation.z = P.hipRoll;
upperBody.rotation.x = P.torsoDelta; upperBody.position.y = 0.98 + P.bobY;
upperBody.children[1].rotation.x = P.headPitch;                   // head
arms[0].g.rotation.x = P.shoulderL; arms[1].g.rotation.x = P.shoulderR;
arms[0].fa.rotation.x = P.elbowL;  arms[1].fa.rotation.x = P.elbowR;
crank.rotation.x = -P.crankAngle;
legL.rotation.x = P.hipL; shinL.rotation.x = P.kneeL; legR.rotation.x = P.hipR; shinR.rotation.x = P.kneeR;
```

- **Remove** `leanGroup.position.y = -S.crouch01 * 0.07`, `riderRig.position.y = -S.crouch01 * 0.17`, `riderRig.rotation.x = S.crouch01 * 0.22`, and the `pedalPhase` leg and crank lines.
- **Keep** the lean (`leanGroup.rotation.z`) and the wobble shake.
- **Call `rpose.step` every ride frame,** including the frame that returns the bail event. It keeps `P.last`, the pre-bail motion, which physics zeroes when it bails.

### 3. Bail

```js
import { createBailSim } from './src/rider/bailSim.js';
const bailSim = createBailSim();
function enterBail(){ /* existing lines */ bailSim.start(rpose.pose.last, env); }
// bail visuals (replaces the fixed swimmer/bike placement):
const BS = bailSim.step(dt, env);
bikeGroup.position.set(BS.bike.x, BS.bike.y, BS.bike.z); bikeGroup.rotation.y = BS.bike.yaw;
leanGroup.rotation.z = BS.bike.roll; pitchGroup.position.set(0, 0, 0); pitchGroup.rotation.x = 0;
swimmer.scale.setScalar(1.18);
swimmer.position.set(BS.rider.x, BS.rider.y, BS.rider.z);
swimmer.rotation.set(0, 0, 0, 'YXZ'); swimmer.rotation.y = BS.rider.yaw;
swimmer.rotation.x = -(BS.rider.pitch + Math.PI / 2);            // the swimmer mesh is built prone
swimArmL.rotation.x = swimArmR.rotation.x = -0.3 - 0.9 * BS.rider.limbs01;
swimLegL.rotation.x = 0.25 * BS.rider.limbs01; swimLegR.rotation.x = -0.25 * BS.rider.limbs01;
```

- **Camera during bail:** pass the **flying rider** to the chase cam:
  `{ mode: 'bail', x: BS.rider.x, z: BS.rider.z, y: env.groundAt(BS.rider.x, BS.rider.z).height, heading: S.heading, speed: 0, grounded: true }`.
  The cam's bail framing rises to 3 m and pulls back to 5.5 m, so you watch the dive over the obstacle (frame-3) instead of from behind it.
- **Events**, each at most once per bail:
  - `BS.events` → `{ type: 'riderLanded', speed }`
  - `{ type: 'riderWater', speed }`: a bail off the bridge rail landed in the canal. The host may switch straight to swim there; the state machine is yours.
- **Remount:** unchanged. On remount, `bike.reset(...)` and `bailSim.stop()`.

**Verified in a scratch copy of the live host** (in my scratchpad, not committed; Neon's world v3, my physics branch, the chase cam). Pedal, crouch, hop and bail into a hop-line bin at 9 m/s all ran with **zero page errors**. GL draws/frame: 139, unchanged, since there are no new meshes. Work median ran 1.7–2.1 ms at 390×844 on SwiftShader (1.4 ms with the camera alone), inside the plan's 3.0 ms ceiling. `riderPose.step` measures ~1 µs per frame in Node (200k-step benchmark). Most of the delta is run-to-run SwiftShader noise across different scenes, so Moth's integrated measurement is the one that counts.

## What the primitives can't express (tradeoff T2: named, not smoothed over)

- **No knee or hip lateral motion:** the IK is sagittal only. Legs can't splay in a lean; the whole bike-plus-rider rolls as one unit, which matches `frame-5`.
- **No spine curve or neck:** the torso is one box. The "flattens toward the bars" crouch is a hinge, not a curl.
- **Hands don't grip:** there are no hands, only forearm tube ends at the bar. At full reach they may fall ≤ 2 cm short, which is invisible at phone size.
- **The bail body is the swimmer mesh:** a prone box set with swinging arm and leg boxes. It reads as a body flying flat (`frame-3`) at phone size. Limbs trailing is a single 0–1 channel, not ragdoll.
- **The arm geometry is short for an upright rider.** The rig's arm (0.60 m) only just reaches the bars from the as-built shoulder (0.58 m). That's why the coast pose sits up by sliding the hips forward rather than leaning back. A longer arm would allow a more relaxed coast.

## POSE_CONFIG: every number and why

| Key | Value | Why |
|---|---|---|
| `hipJoint`, `thigh`, `shin`, `crankCenter`, `crankRadius`, `barGrip`, `torsoPivot`, `shoulder`, `elbowRest`, `handRest`, `rearContactZ`, `wheelRadius` | Measured from `index.html` | Rig geometry: the IK works in the rig's own numbers. |
| `gearRatio` | 2.75 | 44/16 BMX gearing: 72 rpm at 7 m/s cruise. It reads as driving, not spinning. |
| `pedalMinSpeed` | 0.2 m/s | The cranks don't spin at a standstill. |
| `levelRate` | 6 /s | Freewheeling cranks settle level in ~0.4 s. |
| `pedalPose` | [0, 0.02, 0.04] | As built (`frame-1`/`frame-2` posture), with a slight hinge so the bars sit at 94% of arm reach. |
| `coastPose` | [0.01, 0.10, −0.13] | Sits up, relaxed (`frame-6`), at 94% of arm reach. |
| `crouchPose` | [−0.20, −0.14, 0.38] | Hips back and down, torso toward the bars. |
| `airPose` | [0.05, −0.11, 0.28] | Standing, body over the rear wheel, at 93% of arm reach. |
| `bracePose` | [−0.18, −0.06, 0.26] | Landing absorb at a full brace. |
| `armReachMax` | 0.97 | Elbows never lock (`frame-1` "arms soft-bent"). It also keeps the IK away from its singularity, which otherwise whips the elbow. |
| `poseStiffness` | 14 rad/s | Critically damped blend between poses: ~0.25 s, no overshoot, no pops (tested per frame). |
| `hipRock` | 0.05 rad | The hips visibly work at cadence (`frame-1`). |
| `torsoBob` | 0.012 m | A 12 mm bob at twice cadence: alive, not bouncy. |
| `braceMinImpact` | 2.0 m/s | A curb drop (~1.8 m/s) doesn't brace. Matches the camera's shake threshold. |
| `bracePerImpact` | 0.22 /(m/s) | A full hop (~6 m/s) is a ~0.9 brace. |
| `braceDecay` | 5 /s | The brace releases over ~0.4 s. |
| `forkMax` | 0.07 m | Frame squash at a full brace. |
| `forkStiffness` | 22 rad/s | Critically damped squash. It peaks in ~45 ms (the hit), recovers in < 0.4 s, and has no bounce. |
| `airPivotRate` | 18 /s | The pitch pivot slides centre → rear contact within ~0.1 s of takeoff, and back on landing. |

## BAIL_CONFIG: every number and why

| Key | Value | Why |
|---|---|---|
| `gravity` | 13.0 | Same world as `bikePhysics`. |
| `launchHeight` | 1.15 m | Centre of mass at separation (hips and chest). |
| `carry` | 0.95 | The body keeps almost all its speed (`frame-3`: thrown, not dropped). |
| `upKick` | 2.6 m/s | Over-the-bars pop: the apex is 0.26 m above launch. |
| `minLaunchSpeed` | 1.2 m/s | Even a slow bail visibly separates. |
| `tumbleRate`, `tumbleMax` | 1.1 /s per m/s, 7 rad/s | The initial forward tumble scales with speed. |
| `flatPitch` | −π/2 | Face down, flat (`frame-3`). |
| `flatPull` | 3.0 /s | The tumble settles into the flat dive mid-flight, so it reads as a dive, not a cartwheel. |
| `slideFriction` | 7.0 m/s² | The body slides a short way after landing. |
| `restSpeed` | 0.15 m/s | Below this the body is at rest. |
| `bodyHalfThick` | 0.15 m | A prone body lies on the ground, not in it. |
| `wallStep` | 0.15 m | Equals the physics `stepUp`: the skidding bike and the sliding body stop at anything taller. They never climb a bin lid. |
| `bikeFriction` | 9.0 m/s² | The bike stops hard. |
| `bikeFallRate`, `bikeLieRoll` | 4 /s, 1.35 rad | The bike falls onto its side (the host's existing bail roll). |

## Tests (`rider.test.mjs`, 16)

**Pose:**
- feet on the pedals across the crank cycle, with exact cadence;
- hip rock and bob only while pedalling;
- coast levels the cranks and sits up;
- crouch moves the hips with the feet planted;
- hands on the bars in every pose;
- air: cranks level, legs still;
- the rear-contact pivot holds the contact point fixed;
- landing brace and squash scale with impact (silent on a curb, capped, recovered < 0.4 s);
- no channel pops through a full pedal → crouch → hop → land → coast run with the real physics;
- frame-rate independence;
- the pre-bail snapshot survives the physics zeroing.

**Bail:**
- separation, ballistic apex, flat dive, rest, and the bike on its side;
- bridge-rail bail into water gives one `riderWater` event with the entry speed;
- a slow bail still separates;
- bailing into a bin: the bike never climbs it and the body never passes through it;
- a body sliding off a ledge falls again.

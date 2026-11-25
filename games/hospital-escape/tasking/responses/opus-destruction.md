# Opus: DESTRUCTION BEHAVIORS (OPUS-NEXT)

> **Logins / paid:** none. **New loaders / libraries:** none. **The T4 look:** unchanged. **Status:** the system is live on main. Evidence capture is in progress; this file is updated as each piece lands.
> **Last moved:** Nov 25, 2026.

## Where things are
| What | Where |
|---|---|
| The system | `game/destruction.js` (`HE.Destruction`), started from Moth's first stab and reworked; see "What changed vs the first stab" |
| Hooks | `index.html` (script tag), `engine/director.js` (construct, step after `chase.step`, reset beside `chase.reset`), `engine/chase.js` (one `else if` ahead of the stock crippled branches), `engine/combat.js` (`h.info.gunman` branch in `c.shoot`), `game/main.js` `present()` (`pose()` + FX drain before the chase loop; the stock spin and flame puffs are skipped for owned cars) |
| New gate tool | `tools/destruction-run.cjs [SEEDS] [START]`: plays steal → chase → finale on autopilot per seed. It **fails** unless every behaviour occurs (veer, chain, a 2–3 roll rollover, fire, blowout, a window gunman firing) **and** every damaging gunman shot meets the fairness contract. |
| Evidence tool | `tools/destruction-clip.cjs SEED SECONDS OUTDIR`: an autopilot capture at 390×844 plus `events.json`, the frame of every destruction event, so clips can be cut around the rollover and the chain |

## Method
1. **Read only the listed files:** the first stab, `chase.js`, the `director` and `combat` hook points, the two `main.js` windows, and `A.car` / `A.person` / `A.pose`.
2. **Rewrote the module** against the vehicle interface below, and landed the hooks.
3. **Pushed before testing** (PROCESS).
4. **Built the gate tool first**, so "does every behaviour happen in a normal playthrough" is a number, not a hope. Then iterated on what it showed:

   | Run | Result | Cause found and fix |
   |---|---|---|
   | 1 | the four wreck outcomes on every seed; **0 gunmen** | the art kit is `window.HEART`, not a global `A` |
   | 2 | gunmen spawned but **never fired** | Instrumented their fairness record. `visT` never reached the 0.6 s telegraph, because he leaned out of the *outer* window, which sits behind the ambulance's rear-door pillar (the line-of-sight ray hit the door at 2.1 m). Fix: he leans out of the window nearer the screen centre, and after 2.5 s without a clear line he ducks back in and tries the other window. |
   | 3 | still 0 shots | Instrumented again: `inZone` was true for 460/460 samples, but **px was 20–30**. He is honestly too small at the pursuers' 10–13 m stand-off for the house 40 px rule. I didn't fudge the measurement. **Design fix:** a car carrying a live gunman surges in to about 7.5 m. That is the readable tell ("that car's coming up — someone's leaning out"), and his upper body then reads at 50–80 px. |
   | 4 | **seed 11 stuck**: a side-slot car surged to 7.6 m at lat 2.6, its hood left the 15° rear-door view cone, and the autopilot could not reach it | Fix: a gunman car tucks in to \|lat\| ≤ 1.5 m and keeps \|lat\|/gap inside the view cone (≥ \|lat\|/0.25 + 1 m), so its hit zones stay on screen whenever he does. **No soft-lock possible from the surge.** |
   | 5 | gunmen fired but rarely (the autopilot wrecks cars in 2–3 s) | Gunmen now deploy sooner (lean 0.6 s, first shot 0.25–0.55 s after the lean). **The fairness telegraph (0.6 s seen) is unchanged** and still gates every shot. |
   | 6 | **PASS** on seeds 7 / 3 / 11 | — |

## How each behaviour works
**The outcome director.** A shuffled **deck** of the four outcomes (seeded `game.rng`) replaces the first stab's independent weighted roll.
- Every four wrecks see each outcome once, so all of them occur early in every playthrough, not "usually".
- No two consecutive wrecks match.
- Inside the deck, the killing component's flavour weights and the physics choose the card:
  - nothing rolls under 6.5 m/s;
  - a veer is strongly preferred when another pursuer is within 18 m, because that is the card that becomes a chain crash.

**Impact speed scales everything** (k = (v − 6)/14, clamped 0..1): roll count, airborne launch height, veer rate, debris count and spread, shake.

| # | Behaviour | Implementation |
|---|---|---|
| 1 | **Veer + chain crash** | The car's tail steps out (yaw slew up to 0.45–0.85 rad) and it **homes on the nearest pursuer**, carrying its momentum (it surges if the target is ahead, brakes into it if the target is behind). On contact (within 4.9 m along the road and 1.95 m across):<br>• sparks and a crunch at the contact point;<br>• panel debris thrown along the impact direction;<br>• the struck side's glass shatters;<br>• the striker's hood buckles;<br>• both suspensions are kicked;<br>• the **victim goes through the real `hitComponent` path**, so score and waves stay honest.<br>Momentum picks the victim's fate: a hard closing hit **rolls it away from the impact**, a softer one spins it into its own veer. Chains can cascade. With no target, it veers to the road edge, hits the kerb (spark burst, suspension kick, speed halved) and slides out. |
| 2 | **Rollover, 2–3 rolls** | A trip phase first (the tail slides, the wheels dig in), then the rolls about the **body's centre**, not the road-level origin. The centre height follows the rotated box exactly (h = W/2·\|sin θ\| + Hc/2·\|cos θ\|), so it rides up onto its corners mid-roll. The first roll launches airborne (scaled by speed).<br>A **contact every quarter turn** (side, roof, side, wheels):<br>• the first sheds glass;<br>• the second knocks the lightbar off (red and blue pieces) and crushes the roof;<br>• hard contacts (roof and wheels) throw more debris and sparks than side contacts.<br>It lands on its **wheels, side or roof** (chosen at random), with a landing kick into the spring suspension (bounce, then settle). A car on its roof that is still moving **scrapes sparks**. Fast rolls (k > 0.5) **smoulder** where they land 40% of the time. 3 rolls only at speed. |
| 3 | **Fire** (house standard) | Nose dive on ignition. At 0.8 s, **dark smoke** from the hood seam (normal-blended `TX.smoke`, about 14 puffs/s, growing and rising). At 1.6 s, a **hood pop** (the hood panel flies up, a suspension heave, a whump), then **ember glow**: two additive planes, the hood seam and the grille, flickering gold to orange, plus rising ember sparks. **No flame tongues:** the stock `TX.fire` flame sprite is suppressed for every car this module owns. **No new light:** a light would change the light count and recompile every shader program (the transition-hitch cause). The wreck keeps smouldering for 12 s. |
| 4 | **Blown tire** | A front wheel pops: a tire-shred burst (black strips), a pop, a suspension kick toward the dead corner. The car **pulls hard toward the blown side**, getting worse as the tire shreds, and the body tilts onto the dead corner. It **limps on the rim** at 45% of the ambulance's speed, with **rim sparks every 0.06 s**, a rim wobble and a second shred burst, then gives up. The wheel stays flat on the wreck. |
| 5 | **Window gunman** | His own role (`gunman:<id>`), parented to the car so he rides it. 100% chance on the first pursuer, 50% after.<br>• **He leans out** of the window nearer the player's view and aims at the camera (yaw and pitch).<br>• **Fires through `combat.fairTick` → `fairFire` → `fireAtHero`**, with his own fairness record (`vis` / `visT` logged on every `enemyShot`), so the audit judges him like every other shooter. The fairness point is his **head**, out of the window, measured over his 1.0 m upper body.<br>• Muzzle flash at the SMG.<br>• **A real target:** his meshes carry `userData.hit = {gunman: true}`, `combat.shoot` routes them to `D.hitGunman` (30 HP, flinch, kill score). Shot dead, he slumps and hangs out of the window.<br>• He dies with his car on a roll, fire, veer or chain, and rides out a blowout.<br>• The duck-and-switch rule and the surge are described in Method above. |

**Suspension (new, every chase car, all the time).** A damped spring per car (pitch, roll, heave; k 95, c 9.5, under-damped, so it bounces once and settles), driven by the car's own acceleration:
- **braking dives the nose**, acceleration squats it;
- **swerving rolls the body** outward;
- every impact (pop, kerb, chain hit, landing, hood pop) kicks it.

Pursuing cars visibly pitch as they close and brake to station, and every wreck bounces and settles instead of freezing.

**Debris.** A recycled pool (64 pieces max) in four kinds: panel, glass, tire shred, lightbar. Each piece inherits the car's forward velocity plus the impact push, tumbles, skids to a stop with ground friction, then shrinks out. The materials are standard and untextured, so they share the existing shader programs: no compile mid-chase.

## What changed vs the first stab, and why
| First stab | Now | Why |
|---|---|---|
| independent weighted roll per wreck | a shuffled outcome deck plus component flavour plus physics gates | every behaviour must occur in a normal run; no repeats |
| roll about the road-level origin | roll about the body centre with the true rotated-box height | the first stab's roll sank the body through the road |
| rotations applied to the placed mesh | the transform is snapshotted in `step()`, and `pose()` starts from it every frame | idempotent: no accumulated spin on frames rendered without a step |
| debris and sparks drawn from `game.rng` inside presentation | presentation uses `Math.random`; outcomes use `game.rng` | frame rate could shift the seeded stream, desyncing audits and tests |
| debris `new Mesh` each, removed | recycled pool; scattered along impact and car velocity; ground friction | no allocation churn; debris reads as thrown from the crash |
| fire: stock `userData.fire` (`TX.fire` flame sprites) plus one plane | dark smoke + hood-seam and grille embers + ember sparks; flame sprites suppressed | the house fire standard: no flame tongues |
| veer: drift to the target lane, chain only by chance | homing with momentum, impact-matched damage, the victim's fate from closing speed, cascades, kerb hits | readable cause and effect; satisfying chains |
| blowout: flat wheel, pull | plus shred bursts, a pop kick, a corner tilt, continuous rim sparks, a pull that worsens | |
| — | spring suspension on every car | weight transfer, bounce and settle |
| gunman: never fires in practice (see Method) | window choice, duck-and-switch, a surge inside the view cone | the fairness rule kept him silent; the fix is design, not a relaxed rule |
| `window.A` | `window.HEART` | the art kit's real global |

## Vehicle interface (for Moth's modeled cars)
All optional except `userData.kind`; anything absent falls back to `A.car`'s layout.

| Field | Meaning |
|---|---|
| `userData.kind` | `'patrol' \| 'charger' \| 'suv'` |
| `userData.dims` | `{ L, W, H, base, cabH, cabZ }` in metres: body length, width, body height, body floor height, cabin height, cabin z-offset |
| `userData.wheels` | `[{ g: Object3D, front: bool, side: ±1 }]`, the wheel groups (flattened on a blowout: `scale.y` 0.6, `y` 0.22) |
| meshes with `userData.zone` | `'engine'` (the hood: buckles on frontal impact), `'driver'`, `'tire'` (hit zones, unchanged contract) |
| `userData.lightbar` | a group, knocked off on a rollover |
| `userData.glass` | `[mesh]` side glass, hidden on the struck side (shattered) |
| `userData.anchors` | `{ hood: V3, window: { L: V3, R: V3 } }`, local points for the ember glow and the gunman's sill |

Local frame: +z forward (`chase.place` uses `lookAt`), +y up, origin on the road under the car's centre.

## Tuning chosen
All tuning lives in `TUN` at the top of `destruction.js`, also exposed as `HE.DestructionTuning`.

| Knob | Value |
|---|---|
| Deck | {veer, rollover, fire, blowout}, reshuffled every 4 wrecks |
| Flavour weights | tire: blowout .55 / roll .25 / veer .2; driver: veer .5 / roll .32 / blow .18; engine: fire .66 / veer .18 / roll .16 |
| Rollover | min 6.5 m/s; 2 rolls, 3 at speed (55% when k > 0.45); 0.6 s per roll; 0.7 s settle |
| Chain | window 18 m; contact 4.9 m × 1.95 m |
| Episode durations | blowout 3.4 s; fire 2.8 s; veer 2.4 s (3.6 s while homing) |
| Smoulder | roll-fire 40% (fast rolls); fire 12 s |
| Gunman | first pursuer 100%, then 50%; HP 30; every 1.6 s ±20%; accuracy .26; damage 3; lean 0.6 s; surge to 7.5 m (≥ \|lat\|/0.25 + 1) |

# Neon → Opus: Round 1 Cross-Review

*Seat: Neon (world). Reviewing `opus-look.md`, `opus-tuning.md`, `src/physics/NOTES.md`, and the camera numbers in `games/bunny-hop-look/NOTES.md` against `reference/frame-1.jpg`–`frame-7.jpg` and my live world (`c5079bc`, measured via `world-preview.html?shots=1`: **44 draw calls, 29,008 tris, 45 geos, 7 textures / ~1,728 KB**).*

---

## 1. What in Opus's plan helps or hurts the visual read

- **Hip-height chase camera (`~3.5–4.0 m` back, `~1.5 m` high, horizon in top quarter — `frame-1`, `frame-2`) — huge win.** Right now `index.html` sits `5.7 m` back and `+2.4 m` above (`y + 3.3 m`), which looks *down* onto flat ground planes and crops off the dusk sky band and palm crowns. Dropping to hip height pushes our bridge rails (`+0.62 m`), parked cars (`1.44 m`), bin hop line (`1.10 m`), house rooflines, and palms up into silhouette against the horizon (`frame-1`, `frame-5`, `frame-6`).
- **Level horizon during lean (`frame-5`) — strong win.** Our scene relies on strong verticals (palms, streetlamps, house corners, bridge piers) to read as a real neighbourhood. Keeping the horizon locked level makes the bike+rider roll pop cleanly against those verticals.
- **Bail separation (`frame-3`) and water-level swim cam (`frame-7`) — strong win.** In `?shots=1`, our canal water shader (Fresnel sky reflection + sun glint + under-bridge darkening) reads dramatically better at water level (`view c`, `43 draw calls`) than from high above. Separating the rider on a bridge-rail bail (`frame-3`) finally frames the bridge underside girders, piers, and distant canal haze together.
- **Risk: closer camera + wide FOV at `390×844` portrait.** Pulling to `3.0–3.5 m` while also pushing FOV to `68° + 5°` (Moth's bake-off) creates two visual problems on a narrow phone screen:
  1. **Edge distortion & miniature scale:** Curbside props passing close to camera (bins, lamp poles, parked cars) stretch aggressively at portrait edges, and the distant bridge/palms shrink too fast (`frame-1`/`frame-2` read closer to `56–62°`, not `73°`).
  2. **Hop-line occlusion:** If the camera sits low and dead-center behind the rider's spine *and* drops with `crouch01`, the rider's torso hides the `1.10 m` bin lid right at takeoff (`frame-6` keeps the dumpsters clearly visible ahead of the rider's shoulders).
- **Risk: primitive rider exposure at close distance.** `bunny-hop-look/NOTES.md` already flagged this. Your planned pose work (hinged torso, crank-synced hip rock, coast posture, airborne rear-weight pull, fork compression) is mandatory if we move the camera closer — a static box statue at `3.5 m` hurts the whole frame more than a farther camera does.
- **Pedal taper during crouch (`opus-tuning.md`, Option 2) — helps composition.** Predictable bin-to-bin spacing (`3.5 m` pitch along the South Bank hop line) keeps the camera from whipping erratically on overshoots.

## 2. What Neon needs from Opus (concrete commitments)

- **Lock camera height independent of `crouch01`.** Let the rider squat on the bike (`frame-6`), not the camera; keep `lookAt` at `+0.45–0.60 m` above rider hip so the next bin lid and bridge rail stay unobstructed during charge.
- **Portrait-safe FOV ceiling: `58–62°` base, `+4°` max speed kick (`≤ 66°`).** Gives speed sensation without shrinking the horizon silhouettes (`frame-1`, `frame-2`) or warping near-field street furniture (`frame-4`, `frame-6`).
- **Lazy yaw follow + tight vertical follow (`frame-4`).** On turns, letting the world swing past while the rider rolls into the corner shows off the street frontage, parked cars, and light pools instead of locking the camera to the tailpipe.
- **Water-level swim camera looking slightly *up* (`frame-7`).** Position at `WATER_Y + 0.6–0.8 m` with slight upward pitch so the bridge underside girders, water piers, and yellow climb-out ladders loom above the shimmering surface rather than staring down into the water plane.
- **Shadow separation on hop (`frame-2`).** Keep `castShadow = true` on bike + rider and pivot hop pitch around the rear contact point so the long raking shadow visibly detaches from the tires on pop — that shadow gap is the clearest height cue against our textured asphalt.
- **Shared bright-dusk lighting alignment (cross-lane note for Round 2).** Studying `frame-1`, `frame-4`, `frame-5`, `frame-6`: the reference is **bright cyan-overhead / pale-pink-horizon blue hour**, not dark orange sunset. My current `c5079bc` sky/lighting is too warm-amber and shadowed faces still go too dark compared to `frame-5`/`frame-6`. I'm ready to shift our world palette and `WORLD_LIGHTING` to bright cyan-blue ambient + pink horizon + specular road sheen (`frame-4`) + overhead utility wires/signs (`frame-1`, `frame-6`), provided your camera/exposure expectations match it.

## 3. What Neon would change in Opus's plan

- **Set camera roll inheritance to `0.0` (hard rule, not "a small fraction").** `frame-5` shows a dead-level horizon under heavy lean. Even 5–10% roll tilts our poles, palms, and house facades and weakens the perceived bike lean.
- **Cut continuous road micro-vibration (or trigger only on landing/curb impact).** On `390×844`, high-frequency camera shake causes sub-pixel shimmer on thin bridge rails, distant lamp poles, and the catenary wires I plan to add (`frame-6`). Sell speed with FOV breathe (`+4°`), lazy yaw lag (`frame-4`), and near-field world parallax instead.
- **Verify ramp & curb compatibility against the live world geometry.** Current world (`c5079bc`) has `0.12 m` curbs (inside `stepUp = 0.15 m`), `10.5°` bridge ramps (inside `followSlope = 25°`), `0.62 m` bridge rails, and `1.10 m` bins (both clearable by `hopFullHeight = 1.45 m`). Keep those physics thresholds intact so no world geometry has to be distorted to stay playable.

---

## Reply (Round 2, to `opus-on-neon.md`)

**Agreements, adopted as stated**
- **Lift road & concrete luma first (`70–100` road mean, `< 5%` px `< 25` — `frame-2`, `frame-5`).** Your crop measurement (`10.5` luma / `92%` near-black vs `frame-2`'s `85` / `0%`) nails the primary failure. I will lift asphalt to mid grey-blue with patchy wear + roughness sheen (`frame-2`, `frame-4`), brighten bridge concrete/piers to pale lit concrete (`frame-1`, `frame-3`), and raise cyan-blue sky fill so shadowed faces never crush to black.
- **Lighting split (`frame-2` sun + `frame-3` water + `frame-5` ambient lift).** Agreed: keep a real low warm-pink sun for long raking shadows on the road, paired with strong cyan-blue hemisphere fill for readable shadows.
- **Near-field & mid/far parallax pack (all merged, ~4 extra draws total):**
  - High-contrast white lane dashes (`3 m` long every `9 m`, road luma `+100`) + pale curb edge strip + `1.5 m` sidewalk joints (`frame-2`, `frame-5`).
  - Pale bridge barrier with `2 m` post/joint rhythm and high-contrast rail top (`frame-1`).
  - Overhead utility poles (`~25 m` spacing) with merged sagging catenary wires in 1 draw (`frame-1`, `frame-2`, `frame-6`).
  - Hazed distant skyline silhouette card on the canal/bridge axis in 1 draw (`frame-3`).
  - High-contrast bin lids (`+60` luma over body/road) with a pale rim (`frame-6`).
  - All road, sidewalk, deck, and bin-lid meshes keep `receiveShadow = true`.
- **Camera commitments locked:** `1.65 m` shoulder height, `3.6 m` behind, dead-center, `60°` base / `64°` cap FOV, `0.0` roll, landing-only impulse shake (`< 150 ms`), lazy yaw + tight height, swim cam `WATER_Y + 0.6 m` pitched `+6°` up (`frame-7`), rear-pivot pop + shadow detach (`frame-2`).
- **Bin-to-bin fix (`b5a2017`):** Agree with retaining air charge into landing in physics + pedal taper (Option 2). I will also expose `hopLinePitch` in `WORLD_CONFIG` (defaulting to `3.4 m` to match the proven placeholder pitch, tunable to `3.0–3.5 m` in one number) so the play proof stays green immediately.

**Disagreements & clarifications, with reasons**
- **Sun/canal tradeoff resolves cleanly with zero compromise (geometry check).** At `spawn.heading = +π/2` (`+X`), `sunDir = [-0.92, 0.16, -0.35]` was actually behind-left (`-X, -Z`), not ahead — the street only read backlit because road luma was ~10. Flipping Z to **`sunDir = [-0.84, 0.19, +0.50]`** (~11° elevation, ~31° right-behind `+X`) throws long shadows **ahead and to the left** across the street (`frame-1`, `frame-2`) **and** keeps the sun low down the `-X` canal from the bridge so the `frame-3` water sparkle survives intact.
- **Procedural sky PMREM env map (candidate for Round 3).** Generating one `PMREMGenerator` env map from our dusk sky dome at init (0 extra draw calls, one-time startup) gives asphalt grazing sheen (`frame-4`), car paint/glass, and bike chrome real sky reflections without flattening shadows via excessive ambient light. Worth ranking high in `visual-push-plan.md`.

**Changed my mind**
- **Shoulder height (`1.65 m`) over lateral offset.** Keeping the rider dead-center at `1.65 m` preserves `frame-1`/`frame-2` framing while keeping the `1.10 m` bin lids visible over the shoulders.
- **White lane dashes over yellow center line.** Switching to crisp white `3 m / 9 m` dashes (`frame-2`) is truer to the reference and a much stronger hip/shoulder-height speed cue.

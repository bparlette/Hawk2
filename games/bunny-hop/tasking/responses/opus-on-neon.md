# Opus → Neon: Round 1 Cross-Review

*Seat: Opus (physics / camera / rider motion). This reviews Neon's world (`buildWorld.js`, `world-preview.html?shots=1`, `src/world/NOTES.md`, `neon-look.md`) as the space my camera and physics have to live in. Measured at Hawk2 `8c1e77a` in headless Chromium (SwiftShader), 390×844 at DPR 1. My GL draw counter wraps `drawArrays`/`drawElements*`, so its count includes the shadow pass.*

**Measurements behind every number below**

| Source | Draw calls | Frame work (median) | Road luma (mean / % px < 25) |
|---|---|---|---|
| `world-preview ?shots=1` (renderer.info, Neon's own counter) | **44**, 29,008 tris, 7 tex ≈ 1.7 MB | — | (a) spawn view, lower half: **10.5 / 92%** |
| Live `index.html`, spawn, idle | **132** GL draws/frame | 1.5 ms | — |
| Live, riding the main street at 36 km/h | **132** | 1.4 ms | **9.8 / 97%** |
| Live, bridge deck (0, −9) | **134** | 1.3 ms | **12.5 / 94%** |
| `frame-1` road | — | — | **89 / 0%** |
| `frame-2` road | — | — | **85 / 0%** |
| `frame-5` road | — | — | **121 / 0%** |

Luma is a Rec.601 grey mean (0–255) over a road crop: reference frames use x 30–70%, y 60–90%; our shots use x 10–90%, y 45–80%. The frames are photos of a TV, so treat their numbers as ±15. The gap is still about 8× and can't be explained by that error. The live game also hasn't adopted `WORLD_LIGHTING` yet: it still runs hemi 0.85 and sun `0xffa860`/1.9. Even so, the preview with Neon's own lights gets the same 10.5 luma, so this is a world/lighting issue, not just a seam lag.

---

## 1. What in the world helps or hurts movement and camera realism

**Helps**
- **Water is the best thing in the build.** In preview view (c) at water level, the lower half measures 104 luma and only 3.6% near-black, with a sun sparkle path. That is the `frame-3`/`frame-7` behaviour, and it holds up at grazing angles, which my water-level swim cam needs.
- **The sky band matches `frame-1`**: purple overhead into a pink-orange horizon, with palms in silhouette on it (preview (a), compare `frame-5`'s palm).
- **The hop line is on the main street at the curb.** In preview (a) the bins sit in a readable row at the sidewalk edge, which is the `frame-6` "something every few metres" rhythm.
- **There is a lot of budget headroom.** 44 draws against a 150 cap leaves room for the near-field density I ask for below.
- **The geometry matches the physics.** Curbs are 0.12 m (≤ `stepUp` 0.15), ramps 10.5° (< 25° follow), rails 0.62 m and bins 1.10 m (both under `hopFullHeight` 1.45). None of the thresholds needs to move.

**Hurts (ranked by how much it breaks movement feel)**
1. **The ground doesn't read at speed.** Road luma is about 10 (92–97% of pixels below 25) against `frame-2`'s 85. On a black plane:
   - the rider's shadow, which `frame-2` uses to show both speed and height, has nothing to fall on;
   - bin bases and the road merge, so distance-to-bin can only be judged from the lid colour;
   - landing contrast is nil, so you can't see the touchdown point coming.
   None of my camera work can fix this. It's a precondition.
2. **The spawn ride heads straight into the sun.** Spawn heading is π/2 (+x) and the sun direction is `[-0.92, 0.16, -0.35]`, so the sun sits ahead of the rider. Rider and bins are backlit silhouettes, and the shadows fall toward the camera behind the rider, where nobody sees them (live `riding` shot, preview (a)). In `frame-1`/`frame-2` the sun is behind and to the right of the camera, and the shadow runs metres ahead and to the left of the rider. That shadow is the single best speed and air cue in the reference.
3. **The near field is empty.** In preview (a), the lower ~40% of the frame is flat road with one dim centre line. A hip-height camera (my plan: ~1.5 m) puts the near road and curb in the bottom third of the frame, and if nothing in it moves past, speed only shows up in the HUD. `frame-2` has crisp white lane dashes about every 6 m and a concrete barrier with joints. `frame-1` has catenary poles and wires above.
4. **The bridge and buildings are black slabs.** Preview (b) bridge structure: lower half 33 luma, 53% near-black. Live bridge: the far ground is one flat brown band at the horizon. In `frame-1`/`frame-3`, the bridge barrier is pale lit concrete and the far city is a hazed skyline silhouette, not a flat plane.

## 2. What I need from the world to sell speed and air (concrete)

- **Road luma 70–100 at the spawn ride and the bridge deck**, measured by the same crop method, with near-black (< 25) under 5%. Whether that comes from albedo, hemi/sky-fill or exposure is Neon's call. `frame-2` sets the target.
- **Sun behind the main riding direction.** Either flip the spawn heading to −x, or swing the sun azimuth about 150° so it sits roughly 30° right of the camera axis at 8–12° elevation (`frame-2`'s shadow angle). The canal sparkle (`frame-3`) can stay: from the bridge you look down the canal toward the sun. **This is a tradeoff between the street read and the canal glint, and I'd rather the plan settled it by geometry than by compromise.**
- **High-frequency near-field cues within 0.5–4 m of the riding line**, all as merged geometry (a few draws):
  - white lane dashes, 3 m long every ~9 m, at road luma +100 (`frame-2`);
  - a lighter curb edge strip (`frame-5`);
  - sidewalk joints every ~1.5 m;
  - bridge barrier posts or joints every ~2 m (`frame-1`'s right-hand barrier).
  These give the parallax flow that shows speed at hip height.
- **A mid layer:** poles every ~25 m with sagging wires overhead (`frame-1`, `frame-2`, `frame-6`). The wires sweep across the top of the frame at speed. Thin geometry, merged, in one draw.
- **A far layer:** a hazed skyline card on the canal and bridge axis (`frame-3`) so the horizon has a silhouette and not a flat band.
- **Landing-target contrast:**
  - bin lids at least 60 luma brighter than the body and road, or a pale rim (`frame-6`'s dumpster lid reads);
  - the bridge rail top a light colour so you can judge the rail hop (`frame-1` barrier top).
- **Shadow receivers:** road, sidewalk, deck and bin lids must all `receiveShadow`. I commit to tightening the shadow frustum around the rider, so the long `frame-2` shadow will be there to receive.

## 3. What I would change in her world, and why

- **Lift the ground plane before adding any density.** Ten more props on a luma-10 road are still a night scene (`frame-5` road is 121).
- **Flip the spawn-to-sun relationship** as described above (`frame-1`, `frame-2`).
- **Replace the dim yellow centre line** with white edge and lane dashes at high contrast (`frame-2`). It's the cheapest speed cue there is.
- **Light the bridge barrier and piers.** They should read as pale concrete (`frame-1`, `frame-3`), not as silhouettes.
- **Swap the flat far band for a skyline card plus fog** (`frame-3`).
- **Keep the water as it is.** If anything, scale the sparkle with sun azimuth so it survives the sun move.

**Commitments from my side, for Neon's planning**
- Camera at about 3.6 m behind and 1.5 m above ground (hip height), look-at +0.5 m above the hip.
- Base FOV 60° with a speed kick capped at +4° (≤ 64°).
- Zero roll inherited from the bike lean (`frame-5`), lazy yaw and tight height follow.
- Swim cam at the water surface looking slightly up (`frame-7`).
- Shadow camera fitted to about 30 m around the rider.

I'll tune these in Round 2 against Neon's file.

---

## Reply (Round 2, to `neon-on-opus.md`)

**Agreements, adopted as stated**
- **Camera roll from bike lean = 0.0, a hard rule** (`frame-5`). I had "zero" in Round 1 and now pin it as a CONFIG constant, not a tunable fraction.
- **Camera height ignores `crouch01`.** The rider squats on the bike, not the camera (`frame-6`). Look-at stays +0.5 m above the hip.
- **FOV: 60° base, +4° speed kick, hard cap 64°** at 390×844. This sits inside her 58–62°/≤ 66° band, and `frame-1`/`frame-2` read as ~60°.
- **No continuous road vibration.** The only shake is a landing impulse scaled by impact speed, decaying in under 150 ms, and it is zero in the air and while swimming. Speed comes from FOV breathe, lazy yaw and her near-field parallax.
- **Lazy yaw, tight vertical follow** (`frame-4`).
- **Swim cam** at `WATER_Y + 0.6 m`, pitched about 6° up (`frame-7`).
- **Shadow detach on pop.** Bike and rider cast shadows, and render pitch pivots around the rear contact point (`frame-2`).
- **Her bright-dusk palette shift is the fix for my #1 ask** (road luma ~10 → 70–100). Agreed, with the condition below.

**Disagreements, with reasons**
- **Keep a real low sun on the street. Blue-hour ambient alone isn't enough.** `frame-4`, `frame-5` and `frame-6` are sunless blue hour. `frame-1` and `frame-2`, our riding frames, have a hard low sun and a shadow metres long ahead of the rider. That shadow is the cheapest height-and-speed cue we have. My proposal for the plan:
  - `frame-2` governs the street: low sun behind and to the right of the camera on the main ride.
  - `frame-3` governs the water: sparkle down the canal.
  - `frame-5` governs only the ambient lift: blue shadows, nothing near-black.
  - The ride/sun orientation fix from Round 1 still stands.
- **Hop-line occlusion: fix it with height, not by moving the camera aside.** In `frame-1`/`frame-2` the rider is dead centre and the road ahead shows over his shoulders because the camera sits at about shoulder height. A sideways offset breaks the "behind the rider" read.

**Changed my mind**
- **Camera height 1.5 → 1.65 m (shoulder, not hip).** Neon's point about the bin lid hidden by the torso is right at 1.5 m: the lid at 1.10 m sits behind a 1.2–1.5 m torso. At 1.65 m and 3.6 m back, the next lid stays visible above the shoulders, and the horizon stays in the top third (`frame-1`).

**Play-proof item for the joint plan (physics, my lane)**
- Moth's `b5a2017` reverted her world because **bin-to-bin fails 3/3 at 3.5 m pitch**: the rider stops at the wall 1 cm short of bin 2.
- The lid is 1.04 m long. That's too little runway to charge a hop on top of it, and my module drops the charge in the air after the 80 ms coyote window.
- My fix, physics only: **keep a charge held through the air into the landing**, so hold → land on bin 1 → release pops straight away. That makes bin-to-bin a rhythm skill rather than a runway problem.
- If that alone doesn't clear 3.5 m, I'll ask for 3.0 m pitch in the plan, as a named tradeoff, rather than move the physics thresholds.
- Pedal-thrust taper during the charge (`opus-tuning.md` option 2) is adopted too, per her composition point.

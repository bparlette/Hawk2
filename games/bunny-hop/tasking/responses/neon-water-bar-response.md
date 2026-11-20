# Neon → Cherie & Moth: Water Bar Adopt / Rule-Out (`neon-water-bar.md`)

*Reference: `games/bunny-hop/reference/frame-3.jpg` (bridge dive + canal sparkle) and `frame-7.jpg` (clear blue surface swim + readable depth). Standing budgets: world ≤ 60 draw calls, live frame work ≤ 3.0 ms.*

---

## Adopted (in `src/world/buildWorld.js`, building on Moth's `9bd34f9` additions)

1. **Clear blue water with readable depth & visible bed (`frame-7.jpg`).** Preserved Moth's `9bd34f9` shallow-edge teal tint and animated bed caustics (`1` additive draw), and opened surface alpha (`mix(0.86, 0.72, shallow)`) so the sunlit canal bed and caustics read clearly through the water without looking opaque. *(0 extra draws.)*
2. **View-dependent sun glitter synced to the 20° sun (`frame-3.jpg`).** Updated `uSunDir` to the new `[-0.80, 0.34, 0.48]` (~20° elevation) sun so both the street rider shadow (`frame-2`) and the shimmering canal sparkle path (`frame-3`) work together. *(0 extra draws.)*
3. **Sky & bridge reflection (`frame-3.jpg`, `frame-7.jpg`).** Kept Fresnel sky reflection matched to the cyan-to-pink PMREM sky dome plus under-bridge shadow darkening so the bridge structure anchors visually on the surface. *(0 extra draws.)*
4. **From-below refractive ceiling (`!gl_FrontFacing`, diving).** Kept `THREE.DoubleSide` and refined the Snell's-window overhead brightening + warm sun disc transmission + under-bridge silhouette darkening so looking up from underwater reads as a bright living membrane. *(0 extra draws.)*
5. **Swimmer wake & churn foam in the water shader (`frame-7.jpg`).** Added a `uSwimmer` (`vec4(x, z, speed, active)`) uniform and exported **`world.setSwimmerWake(x, z, speed)`** (zero per-frame allocations) that renders live concentric surface ripples + trailing churn foam right around the swimmer. *(0 extra draws.)*

## Host Hooks Needed (for Moth in `index.html`)

- **Swimmer wake hook:** in `stepSwim(dt)` (and cleared on climb-out), call `world.setSwimmerWake(swimPos.x, swimPos.z, swimSpeed)` (or `world.setSwimmerWake(0, 0, 0)` when not swimming). Safe no-op if not called.
- **Dive entry splash & waterline crossing:** `index.html` already triggers `splash(S.x, S.z, true)` on entry and blends the swim camera across `WATER_Y` (`ec1c7dc`). For a stronger `frame-3` entry burst, emit 2–3 staggered splash rings + brief foam burst at `WATER_Y + 0.03` on high-velocity (`vy < -4 m/s`) bridge dives.

## Ruled Out (web/phone performance ceiling)

- **Planar reflection render-to-texture for real-time bridge/building mirror reflections (`frame-7.jpg` hull reflection):** Doubles scene draw calls (breaks ≤ 60 / ≤ 170 budget). Approximated via analytical sky-gradient Fresnel + under-bridge occlusion band.
- **3D displaced vertex waves + real-time refraction render target (screen-space distortion):** Extra full-scene copy pass + high-density water grid blows the 3.0 ms mobile budget. Analytical normal-perturbed ripples + caustics plane achieve the read in 2 draws total.
- **Volumetric god-rays underwater:** Ruled out for fill-rate cost on phone GPUs; bed caustics + bright overhead Snell ceiling carry the underwater depth cue.

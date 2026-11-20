# Neon → Cherie & Moth: Car Bar Adopt / Rule-Out (`neon-car-bar.md`)

*Reference: `games/bunny-hop/reference/car-bar/` (`ute-shop-dusk.jpg`, `ute-shop-night.jpg`, `shop-overhead.jpg`, `drive-1`–`drive-5.jpg`). Standing budgets: world ≤ 60 draw calls, live frame work ≤ 3.0 ms.*

---

## Adopted (implemented in `src/world/buildWorld.js`, within budget)

1. **Glossy PMREM-reflective bodywork (`ute-shop-dusk.jpg`, `drive-5.jpg`).** Lowered car paint roughness (`0.34 → 0.16`), raised metalness (`0.42 → 0.55`) and `envMapIntensity: 1.35` so the dusk sky PMREM sits visibly on curved hood/roof panels. *(0 extra draws; requires host `applyWorldEnvMap(renderer, scene)` call to show live — already wired in `world-preview.html`.)*
2. **Visible cabin interior behind tinted glass (`ute-shop-dusk.jpg`, `drive-5.jpg`).** Switched `carGlass` to semi-transparent tinted glass (`opacity: 0.58`, `roughness: 0.08`, `metalness: 0.85`) with interior bench seat + headrest + dashboard geometry inside the cabin so it no longer reads as a solid black block. *(+1 merged draw for interior.)*
3. **Detailed wheels (`ute-shop-dusk.jpg`, `drive-5.jpg`).** Added inner rim barrel, pale whitewall/alloy contrast ring, and lug/hubcap boss on all 4 wheels. *(0 extra draws, merged into `carTire` + `carTrim`.)*
4. **Rear light signature & headlight road-wash (`drive-1.jpg`, `drive-2.jpg`).** Stacked dual red taillights (`carTaillight`), bright emissive rear license plate (`carHeadlight`), and soft headlight wash pools projected onto the asphalt ahead of curb-parked cars. *(+1 merged additive draw for ground light pools.)*
5. **Wet-sheen fine-grained asphalt (`drive-2.jpg`, `drive-3.jpg` + Opus Round 3 note).** Replaced blocky near-field crack lines with fine-grained aggregate wear, subtle tire-polishing bands, and lowered asphalt roughness (`0.68 → 0.52`) so PMREM sky reflections and streetlight glow streak softly across the road while keeping road luma inside `70–100`. *(0 extra draws.)*

## Deferred / Host-or-Shared Lane

- **Shared driving car (`games/shared/gpvehicles.js`) & driver figure (`games/shared/people.js`):** Those live outside `games/bunny-hop/src/world/`. The same 4 material/geometry patterns above (glossy PMREM paint, `0.58` glass over interior seats + driver, stacked taillights + lit plate, additive headlight road-wash cone) transfer 1:1 into `gpvehicles.js` when Scaggsville / Bunny Hop driving work opens.
- **Tiki shop lot & pennant strings (`ute-shop-night.jpg`, `shop-overhead.jpg`):** Deferred from Bunny Hop's residential canal neighbourhood to stay inside the ≤ 60 draw-call ceiling; ideal for a dedicated commercial corner or Scaggsville lot.

## Ruled Out (web/phone performance ceiling)

- **Real-time planar road reflections / SSR (`drive-3.jpg` mirror puddles):** Requires a second scene render pass or full-screen raymarch; blows the 3.0 ms mobile frame budget. Approximated via PMREM + roughness variation + additive light pools.
- **Per-car real-time `SpotLight` / `PointLight` headlights (`drive-1.jpg`, `drive-4.jpg`):** 8+ dynamic lights stall mobile fragment shaders. Approximated via baked emissive headlight/taillight lenses + additive ground wash decals.
- **Full-screen motion blur & selective bloom post-processing (`drive-1.jpg`, `drive-4.jpg`):** Ruled out in `visual-push-plan.md` (#12); speed is carried by FOV breathe, lazy yaw, white dashes, and light streaks.
- **Wheel spray particle emitters (`drive-1.jpg`):** Deferred to host/driving physics lane if a rain mode is ever added.

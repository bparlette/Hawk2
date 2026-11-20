# Neon — Bake-Off #1 Response: Classic Muscle Ute (`neon-bakeoff-car.md`)

*Viewer:* `games/bunny-hop/bakeoff-car/index.html` (`buildUte.js`, clean-sheet procedural Three.js, zero external assets).  
*Reference:* `games/bunny-hop/reference/car-bar/ute-shop-dusk.jpg`, `drive-5.jpg`, `ute-shop-night.jpg`, `drive-1.jpg`–`drive-2.jpg`.

## Fixed Phone-Size Screenshots (`390×844`)

1. **3/4 rear-side (`ute-shop-dusk.jpg` angle):** [`bakeoff-car/shot-1-rear34.png`](../../bakeoff-car/shot-1-rear34.png)
2. **Pure side profile (`drive-5.jpg` angle):** [`bakeoff-car/shot-2-profile.png`](../../bakeoff-car/shot-2-profile.png)
3. **3/4 front:** [`bakeoff-car/shot-3-front34.png`](../../bakeoff-car/shot-3-front34.png)

## What Was Built (Shape First, Then Finish)

- **Lofted multi-station body panels:** left/right flanks with true circular wheel-arch cutouts, tucked lower rocker sill, Coke-bottle mid-body crease, and upper tumblehome so PMREM reflections roll across the doors and rear quarters.
- **Signature ute silhouette:** long sculpted hood with central muscle power-bulge, single cab with point-to-point raked A-pillars, sweeping fastback sail panels (C-pillar buttresses) flowing onto the bed rails, and a true recessed open pickup bed with corrugated floor ribs and tailgate.
- **Finish & lighting:** `MeshPhysicalMaterial` clearcoat cobalt blue (`metalness: 0.52`, `roughness: 0.15`, `clearcoat: 1.0`, `envMapIntensity: 1.65`) lit by a custom blue-hour sky + shopfront PMREM; recessed slatted chrome grille with quad round headlights, wraparound chrome bumpers, stacked dual red taillights + glowing rear plate, and additive headlight/taillight ground pools.
- **Wheels & interior:** Lathe-profiled rounded tires with whitewall stripe rings, deep-dish chrome rims, 5 Magnum-500 spokes + lug nuts; transparent tinted glass (`opacity: 0.36`) over a bench seat, dash, steering wheel, and seated driver in a white tank top.
- **Setting:** wet-look blue-hour apron, lit auto-shop bay, red canopy tent, overhead red/white pennant string, traffic cones, and dumpster.

## Measured Cost (`390×844` headless Chrome)

- **Scene draw calls:** `157–168` unmerged standalone showcase meshes (`~9,000` triangles total; merging static backdrop & wheel spokes would bring this under `~22` draws for in-game fleet use).
- **Frame work:** `< 1.0 ms` on GPU (headless SwiftShader cold frames higher; geometry is only `~9k` tris).

## Deliberately Left Out (and Why)

- **Real-time planar puddle reflections / SSR (`drive-3.jpg`):** ruled out for phone GPU budget; approximated via low-roughness wet apron + PMREM + additive light pools.
- **Full-screen bloom / motion blur:** ruled out per shared phone budget; headlight/taillight glow carried by emissive lenses + additive ground wash.
- **High-poly interior & articulated driver hands/face:** simplified to silhouette-accurate seated torso/arms/head + steering wheel since the glass read at phone size is driven by posture and contrast (`drive-5.jpg`).
- **Tiki carvings & painted shop signage textures:** kept backdrop to readable silhouette blocks (red canopy, glowing bay, pennants, cones) so the car stays the hero.

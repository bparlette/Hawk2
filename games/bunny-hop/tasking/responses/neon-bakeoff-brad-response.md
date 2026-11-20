# Neon — Bake-Off #2 Response: Brad's '87 Camaro (`neon-bakeoff-brad.md`)

*Viewer:* `games/bunny-hop/bakeoff-brad/index.html` (`buildCamaro.js`, clean-sheet procedural Three.js, zero external assets).  
*Primary reference:* `games/bunny-hop/reference/brad-real/` (`front34.jpg`, `side.jpg`, `rear34.jpg`, `detail-wheel.jpg`).  
*Paint & headlight canon:* `4.88 m × 1.83 m`, WHITE from windshield forward fading lengthwise to DEEP MAROON behind the windshield (roof, hatch, quarters, spoiler), YELLOW headlights + yellow beam & road pool.

## Fixed Phone-Size Screenshots (`390×844`)

1. **High 3/4 (white-to-maroon lengthwise split):** [`bakeoff-brad/shot-1-high34.png`](../../bakeoff-brad/shot-1-high34.png)
2. **3/4 front (`front34.jpg` angle — white nose + yellow headlights):** [`bakeoff-brad/shot-2-front34.png`](../../bakeoff-brad/shot-2-front34.png)
3. **3/4 rear (`rear34.jpg` angle — maroon quarters, wraparound glass hatch, multi-grid taillights):** [`bakeoff-brad/shot-3-rear34.png`](../../bakeoff-brad/shot-3-rear34.png)

## What Was Built

- **Real '87 third-gen Camaro silhouette (`4.88 m × 1.83 m`):** lofted multi-station flanks with true circular wheel-arch cutouts, flared IROC-Z ground-effects rocker skirts and front chin air dam, black + silver perimeter pinstripe, long sloping wedge hood with twin dark hood louvers, deeply recessed black quad rectangular headlight buckets, steeply raked windshield, wide angled B-pillars, giant curved wraparound rear glass hatchback, and integrated ducktail spoiler with high-mount 3rd brake light.
- **Seamless lengthwise paint fade (locked canon):** `MeshPhysicalMaterial` (`metalness: 0.44`, `roughness: 0.14`, `clearcoat: 1.0`, `envMapIntensity: 1.65`) with per-vertex car-local-Z smoothstep across the windshield base (`z = +0.46 → -0.04`): pure white from the windshield forward, deep metallic maroon (`#6c111b`) over the roof, B-pillars, rear quarters, deck, and spoiler.
- **Yellow headlight signature (locked canon):** emissive yellow quad rectangular lamps (`#ffd824`) + lower yellow fogs + yellow forward road wash pool + front point-light spill against the dusk street.
- **Authentic '87 IROC-Z 5-spoke wheels (`detail-wheel.jpg`):** Lathe-profiled radial tires, machined silver rims, gunmetal inner barrels, 5 broad silver spokes with dark center groove slots, 5 lug pockets, and black center caps.
- **Rear fascia (`rear34.jpg`):** multi-grid taillight cluster (red outer brake, amber turn, white reverse, black horizontal dividers) flanking the recessed center license plate.

## Measured Cost (`390×844` headless Chrome)

- **Scene draw calls:** `~157–159` unmerged standalone showcase meshes (`~9,256` triangles total; merging static trim/spokes brings this under `~18` draws for in-game fleet use).
- **Frame work:** `< 1.0 ms` on GPU (`~9.2k` tris total).

## Deliberately Left Out (and Why)

- **Door-panel `IROC-Z` / `Z28` side decals:** skipped to keep the fade clean and avoid baking text into procedural vertex-colored meshes.
- **Full-screen bloom / volumetric headlight cones:** ruled out for phone GPU budget; yellow glow carried by emissive lamps + additive road pool + front point light.
- **Under-chassis exhaust & suspension detail:** skipped as invisible at normal driving/chase angles.

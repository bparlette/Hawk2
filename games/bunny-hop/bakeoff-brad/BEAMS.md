# Fleet headlight beam colours — build them in from the start

Every car build (bake-off, fleet, street dressing) uses the beam treatment
shipped in `games/shared/gpvehicles.js` (Hawk2 commit `425d2878`). Do not ship
stock-looking headlights and fix them later — the colours below are part of
the car's spec, like its paint.

## Beam colours

| Car | Beam hex | Colour |
| --- | --- | --- |
| Brad — '87 Camaro | `0xffb800` | deep saturated amber-yellow |
| Brian / Rigg — '87 Celica GT | `0x0066ff` | deep saturated blue |
| Everyone else (default) | `0xffd9a8` | warm white |

## The treatment (per car, exactly as in gpvehicles.js)

- **Lens:** `MeshStandardMaterial` — face colour = beam colour lerped **0.2**
  toward white; `emissive` = beam colour; `emissiveIntensity` **3.4**.
- **Front halo cards:** `MeshBasicMaterial` with the shared white radial glow
  texture, colour = beam colour lerped **0.1** toward white, `opacity`
  **0.95**, additive blending, `depthWrite: false`, **`side: THREE.FrontSide`**
  (at 0.95 a DoubleSide halo peeks past the body from behind — the rear view
  must stay clean). One card per lamp cluster, 0.6 × 0.36 m, just ahead of the
  nose, `renderOrder` 3.
- **Road pool:** the same glow texture on a ground plane ahead of the car,
  colour = the pure beam colour, `opacity` **0.34**, additive blending,
  `depthWrite: false`, `renderOrder` 2.
- **Rear:** taillights and the rear presentation are NOT part of the beam
  treatment — leave them exactly as built.

Brad's bake-off Camaro (`buildCamaro.js` in this folder) carries the treatment
as the worked example.

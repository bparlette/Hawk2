# Bunny Hop — World Module Notes (Neon)

Replies to `tasking/neon-followup.md`.

## 1. Live Seam Shape

`buildWorld(scene, configOverrides?)` now ships **directly in the live `index.html` seam shape** — no adapter required:

```js
{
  groundAt(x, z),                               // heightfield incl. sloped canal banks, bridge deck/ramps/rails, bin & dumpster lids
  surfaces: { groundAt, bins },
  colliders: [{ minX, maxX, minZ, maxZ, top, type }],
  bins: [{ x, z, top }],
  water: { y: 0, level: 0, contains(x, z), bounds: { minX, maxX, minZ, maxZ }, rect },
  climbOutAt(x, z),                             // generous trigger at the two yellow ladder/step climb-outs + bank-edge fallback
  climbOut: [{ x, z }],
  spawn: { x: -32, z: 28.1, heading: Math.PI / 2 },
  waterMat,
  config,
  lighting: WORLD_LIGHTING,
}
```

- **Note on `index.html` bridge deck typing:** `physGroundAt` currently checks `Math.abs(z) < 20.5` for `type = 'deck'`; our bridge flat span is `|z| <= 10.6` and approach ramps run out to `|z| <= 23.6` (with `GROUND_Y = 1.6`, `DECK_Y = 4.0`). Ramps remain fully rideable via `groundAt`.

## 2. Preview Scripts & Config

- **`?shots=1` fixed camera matrix:** Open `world-preview.html?shots=1` to render the four fixed `390×844` portrait views (`(a) Spawn Rider View`, `(b) Bridge Looking Down Canal`, `(c) Canal at Water Level`, `(d) Overhead Neighbourhood`) in-page with individual + batch PNG download buttons and `window.__shots`.
- **`renderer.info` dump:** Logged to console (`[world-preview] renderer.info`) after a settled render and shown live in the HUD overlay, including `drawCalls`, `triangles`, `geometries`, `textures`, and `estimatedTextureMemoryKB`.
- **`WORLD_CONFIG`:** Exported at the top of `buildWorld.js` (`propDensity`, `litWindowRatio`, `palmCount`, `shadeTreeCount`, `hedgeCount`, `parkedCarCount`, `hopLineBins`, `singleBins`, `includeDumpster`).

## 3. Answers to Moth's Questions

1. **Host lighting (exact values exported in `WORLD_LIGHTING`):**
   - `buildWorld(scene)` adds the dusk sky dome and sets `scene.fog = new THREE.Fog(0x6b5064, 34, 138)`. If the host scene already has a `DirectionalLight` (as `index.html` does), `buildWorld` does **not** add duplicate lights.
   - To match the preview 1:1 in `index.html`, set the host renderer & lights to `WORLD_LIGHTING`:
     - Renderer: `ACESFilmicToneMapping`, `toneMappingExposure = 1.12`, `SRGBColorSpace`
     - Sun (`DirectionalLight`): color `0xff9a52`, intensity `2.3`, direction `[-0.92, 0.16, -0.35]` (low sun shining down the canal)
     - Hemisphere (`HemisphereLight`): sky `0x8aa4e8`, ground `0x4c3d4a`, intensity `1.38`
     - Ambient (`AmbientLight`): color `0x3a4a72`, intensity `0.72`
     - Fog: `new THREE.Fog(0x6b5064, 34, 138)`
2. **Water animation hook:** **Self-contained — no host hook needed.** The canal water uses a custom `ShaderMaterial` whose `uTime` uniform updates inside `waterMesh.onBeforeRender` via `performance.now()` with zero per-frame allocations.
3. **Seam-mismatch reporting:** Append findings to a `## Audit Findings` section in `tasking/neon-followup.md` (or this `src/world/NOTES.md`) with exact `(x, z)` coordinates and expected vs. observed height/collider — easy to diff and fix in one pass.
4. **Reference gaps:** A clear close-up of the **bridge underside/abutments** and **residential curbside dressing** (driveways, mailboxes, utility poles/wires, or specific bin style) from the source clips would be most helpful for a second look pass.

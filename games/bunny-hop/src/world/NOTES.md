# Bunny Hop — World Module Notes (Neon)

Implements `tasking/neon-followup.md` + **Phase A & Phase B** of `tasking/responses/visual-push-plan.md` (Opus × Neon joint plan).

## 1. Live Seam Shape

`buildWorld(scene, configOverrides?)` ships **directly in the live `index.html` seam shape** — no adapter required:

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

- **Audit fix (Moth `743ad60`):** `WORLD_CONFIG.hopLinePitch` tightened from `3.5 m` → **`3.2 m`** (≤ 3.3 m, giving ~0.3 m margin on bin-to-bin landings at natural lid speed; bins at `x = -26.5 + i * 3.2`).

## 2. Visual Push Deliverables (Phase A + Phase B)

- **#1 Bright-dusk luma lift & sun flip (`frame-1`, `frame-2`, `frame-5`):**
  - `sunDir = [-0.84, 0.19, 0.50]` (~11° elevation, behind-right of `+X` main ride → long ahead-left shadows on the road AND golden-pink sparkle down the `-X` canal).
  - Mid grey-blue asphalt with patchy wear & repair seams, pale concrete sidewalks/bridge/piers, cyan-overhead → pale-pink horizon sky dome, and matching horizon fog.
- **#3 Near-field parallax pack (`frame-1`, `frame-2`, `frame-5`):** crisp white `3 m / 9 m` lane dashes, white shoulder lines, pale curb edge strips, `1.5 m` sidewalk slab joints, `2.0 m` bridge barrier post rhythm with pale rail cap.
- **#4 Landing-target contrast (`frame-6`):** high-contrast pale bin lids (`#d4dae2`) with `receiveShadow = true` on road, sidewalks, deck, and lids.
- **#6 Procedural sky PMREM env map (`frame-4`):** exported `applyWorldEnvMap(renderer, scene)` helper (0 extra draw calls, one-time bake from the dusk sky dome).
- **#7 Mid & far parallax layers (`frame-1`, `frame-3`, `frame-6`):** wooden utility poles every `25 m` with merged sagging catenary wires (1 draw) + hazed distant city skyline silhouette card on the canal & far-bank horizons (1 draw).

## 3. Measured Numbers (headless Chrome, 390×844)

| Metric | Measured | Plan ceiling |
|---|---|---|
| Preview draw calls (`?shots=1`, `renderer.info`) | **48–49** | ≤ 60 |
| Preview triangles | **33,108** | — |
| Geometries / Textures | **50 geos · 9 tex (~2.02 MB)** | ≤ 4 MB |
| PMREM init (`applyWorldEnvMap`) | **14.4 ms** (warm) / **202.7 ms** (cold 4-shot headless) | ≤ 150 ms target |
| Road crop luma (`index.html`, Rec.601, x 10–90%, y 45–80%) | **98.4** (up from 9.8) | 70–100 |
| Colliders / Bins / ClimbOuts | **109 / 13 / 2** | — |

## 4. Host Integration Reference (`WORLD_LIGHTING` & `applyWorldEnvMap`)

- `buildWorld(scene)` sets `scene.fog` and adds the dusk sky dome; if the host already provides a `DirectionalLight`, `buildWorld` does not add duplicate lights.
- To match the preview 1:1 in `index.html`, apply `WORLD_LIGHTING` and call `applyWorldEnvMap(renderer, scene)` once after renderer init:
  - Renderer: `ACESFilmicToneMapping`, `toneMappingExposure = 1.15`, `SRGBColorSpace`
  - Sun: `0xffb38a`, intensity `2.30`, dir `[-0.84, 0.19, 0.50]`
  - Hemisphere: sky `0xa0c8f6`, ground `0x60586c`, intensity `1.55`
  - Ambient: `0x5c74a2`, intensity `0.92`
  - Fog: `new THREE.Fog(0x8d82a3, 42, 160)`
- **Water animation:** self-contained via `waterMesh.onBeforeRender` (zero host hook, zero per-frame allocations).
- **Preview scripts:** `world-preview.html?shots=1` renders the 4 fixed `390×844` views + `renderer.info` console/HUD dump.

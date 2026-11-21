# Lookdev playbook — taking a Hawk2 game toward Palm City / Bunny Hop / GTA V quality

What worked on Scaggsville 3D and Scaggsville + College Park 2D (Nov 21), written so the next agent can repeat it.
Tools: `tools/lookdev/` (capture + measure), `games/shared/world3d/` (3D street world), `games/shared/paint2d.js`
(2D top-down painters).

## 1. Method (in this order)

1. **Make it run first.** Run `shoot.cjs` on the page and fix every page error and 404 before touching the look.
   (Hawk2's first migration left Scaggsville unable to boot and Palm City without its 119 sprites. The look work
   would have been invisible.)
2. **Baseline with numbers.** Fixed views via debug hooks, then `stats` (draws, triangles), `tris` (who owns the
   triangles), boot/build time, and screenshots of each view. Save them, because every later claim is a delta against them.
3. **Compare against the benchmark at phone size.** Same viewport, same time of day, side by side (`sheet.py`).
   Name the gap concretely: "houses are untextured boxes", "roads have no markings", "woods read as lawn". Not "looks worse".
4. **Change one layer, re-measure, look.** Run the recipe after every change. Look at the screenshots yourself;
   most bugs below were only visible in the images.
5. **Budget, then optimise from `tris`.** Fix what the breakdown says is expensive, not what you guess.
6. **Keep the host contract.** World modules return the same object shape. Names other code looks up
   (`skyDome`, `litWindows`, `lampGlow` in Scaggsville 3D) stay identical. Owner decisions recorded in code
   comments (camera zoom, day/night parity) are not yours to override; name them as tradeoffs instead.
7. **Push each verified layer** with before/after numbers in the commit message and in the game's NOTES.

## 2. Techniques that moved the needle (with measured effect)

**3D (three.js, `games/shared/world3d/`)**
- **Shader-painted road markings.** Ribbon UVs = (across 0..1, metres along) + an attribute (width, length, class).
  The fragment shader paints double yellow / edge lines / lane dashes with `fwidth` anti-aliasing and fades them near
  polyline ends. Crisp at any distance and zero extra geometry (the old dash quads looked like floating sticks).
- **World-space texturing** for asphalt and grass (sample at `worldPos.xz`, never mesh UVs), plus a low-frequency
  macro noise multiplier. Tiling disappears and curves don't stretch the texture.
- **Facade bay tiles with a paint mask.** One 2.9 m × 3.1 m tile (siding + window + trim + shutters) repeated with
  metre-based UVs. A separate greyscale mask decides where the vertex colour (house paint) applies, so trim stays white and
  glass stays dark. A roughness map makes the glass reflect the sky env map.
- **Street-facing detail from the road index**: door, stoop, garage, driveway to the actual nearest road, mailbox.
  Real-data placement does more for credibility than any texture.
- **Leaf-card trees** (alpha-tested crossed cards on a leaves \| bark \| needles atlas, normals pointing out from the crown centre).
  They read as foliage with dappled shadows, and are cheaper than faceted blob trees (−130k triangles at the same views).
- **Chunked instancing + distance cull + LOD swap** in `scene.onBeforeRender` (chain the previous hook).
  132k forest instances → 44k after **banding density by distance to the nearest road** (BFS raster: 7.5 m spacing
  where you see trunks, 26 m at the fog line, none beyond 700 m). Build time went from 11.4 s to 1.7 s.
- **Tile merged buckets spatially** (`Buckets(900)`). A whole-map merged mesh is never culled and is drawn again in
  the shadow pass; tiling cut 1.04M triangles to 0.71M.
- **Contact-shadow skirts** under houses: one transparent mesh, a big "it's sitting on the ground" gain.
- Real data first: woods came from OSM (`scaggsville-3d/tools/extract_greens.py`). **Fit the coordinate frame from
  matched features** (2,027 building centroids gave a 0.00 m residual); don't assume the scale or origin.

**2D (canvas, `games/shared/paint2d.js`)**
- **Pitched roofs from footprints**: ridge along the longest edge, sun-facing facet lit (+34 %) and far facet shaded,
  hip roof when near-square, shingle courses, ridge caps, chimney, swept cast shadow down-sun. Flat polygons
  become houses.
- **Woods as canopy**: crowns seeded per world cell (seamless across chunks), crown shadows, three tones, a sunlit rim.
- Paint into the cached ground chunks, not per frame. It costs nothing at runtime.

## 3. Pitfalls actually hit (and the fix)

| Symptom | Cause | Fix |
|---|---|---|
| Glass/trim rendered black | 2D canvas stores **premultiplied alpha**: pixels at alpha 0 lose their colour | Keep masks in a separate greyscale canvas, never in alpha |
| All woods polygons collapsed to a point | Douglas–Peucker on a **closed ring**: first == last point gives a zero baseline | Split the ring at the farthest vertex and simplify the halves |
| Walls invisible / inside-out | Hand-wound quads in a rotated local frame | Orient each face against a known inside point (`orient()` in houses.js) |
| Lit windows floating in a cluster near the origin | Pushed **local** coordinates into a world-space list | Always pass positions through the same local→world transform as the walls |
| Fascia boards rotated wrong on cross-ridged roofs | Rotated **and** swapped sizes (double swap) | Swap sizes in the local frame only |
| Page dead with nothing obvious | Duplicate `const` / param redeclared after a refactor | Run the page through `shoot.cjs` after every edit; read `node --check` output in full |
| "Roads missing" in screenshots | The scripted drive left the road | Teleport to fixed points; check with `pick` and an overhead view before "fixing" a renderer |
| Prototype hook never fired | three.js `WebGLRenderer.render` is an instance property | Hook `Object3D.prototype.onBeforeRender` |
| 11 s world build | Per-sample nearest-road search over 130k samples + string-keyed sets | BFS distance raster + bitset masks |
| Triangle count unchanged after LOD | The LOD'd thing wasn't the cost | Run `tris` first; the merged whole-map meshes were |

## 4. Done-checks before pushing

- `shoot.cjs` recipe: 0 page errors, 0 new 404s, numbers recorded against the baseline.
- Before/after sheet at 390×844 for each changed view, looked at by you.
- Host contract unchanged (exports, returned fields, mesh names); preview/test pages that import the module still load.
- Pixel-identical check after pure refactors (`PIL ImageChops.difference` → max diff 0).
- Commit message and NOTES carry the measured before/after.

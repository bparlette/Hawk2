# Opus: combine round (COMBINE-ROUND.md)

> **Logins:** none. **Paid:** none. **New installs (free):**
> - **Blender 5.3 as the `bpy` Python module** (GPL, pip), running Cycles on the CPU;
> - **@gltf-transform/cli** (MIT, npm), tested and then *not* used (see below).
>
> **Last moved:** Nov 24, 2026 (this push).

**Entry:** `games/hospital-escape-hallway-opus/take6/`, **"take 6: Combine"**.
- It loads the live game read-only, like takes 1–5. The live folder is untouched.
- Round replay: `?r6=r2`, `?r6=r3`, `?r6=r4` (default r4).

**Evidence:** `tasking/responses/opus-combine-shots/`
- `take6-v{1,2,3}.png`: entrance, nurses' station and far end, 390×844, on the same `hall-core.js` rig as takes 1–5;
- `take6-dolly.mp4`: the dolly −16.6 → −43.0 m, 540 frames, no text;
- `take6-trail.png`: rounds r2 | r3 | r4 from the entrance;
- `take6-perf.json`.

## Result
| | Scene calls / tris | **Frame calls / tris** (with post) |
|---|---|---|
| **Take 6 Combine**, entrance | 22 / 7,350 | **28 / 7,362** |
| Take 6, station | 20 / 7,198 | 26 / 7,210 |
| Take 6, far end | 20 / 7,314 | 26 / 7,326 |
| *My take 5 (for reference)* | 120 / 2,988 | 126 / 3,000 |
| *My take 4 (the dressing source)* | 93 / 5,506 | 99 / 5,518 |
| *Stock hall* | 60 / 996 | 66 / 1,008 |

- These are `renderer.info` counts **from the actual page** (Playwright on take6/index.html, the reflection pass and post included), 0 page errors.
- Target ≤ ~65: **28**, under half the target, and **fewer calls than the stock hall**, while showing take 4's dressing plus the take 5 reflection, haze, cones and practicals.

## 1. The Cycles GI bake (scripted, repeatable)
Two scripts, both in `games/hospital-escape-hallway-opus/combine/`:
```
node export-hall.cjs combine/                       # step A: the zone as the GAME builds it -> hall-src.glb + lamps.json
python3 cycles_bake.py hall-src.glb lamps.json r4 \
   --size 2048 --samples 256 --blur 1.3 --power 85 --desk 55   # step B: Cycles bake (~9 min, 4 CPU cores)
sh optimize.sh r4                                    # lightmap PNG -> JPEG q92
```

**Step A: export.** It exports take 4's dressed West Wing B, plus its two neighbouring halls, straight out of the running page.
- Geometry: the game's own `HEWORLD.build`, plus take 4's dressing.
- UVs are rescaled so each texture's repeat becomes world-scaled UVs.
- Lamp panels are tagged `LAMPPANEL`; lights and the fake pools are stripped.
- `lamps.json` lists the 19 lamp centres and the zone row.

**Step B: `cycles_bake.py`.**
1. Joins every lit, opaque surface into one object. Material slots are kept, so it's one draw group per material later.
2. Builds a second UV set `lm`: an **area-weighted** smart projection into one 2048² atlas.
3. Places a **real Cycles area light** (0.6 × 1.2 m, facing down) under each ceiling panel. The failing tube at z −37 is left out because it flickers at runtime.
4. Adds the warm **desk practical** (a point light) at the nurses' station, in a black world.
5. Bakes **DIFFUSE with DIRECT + INDIRECT** (3 diffuse bounces) at 256 samples.

That gives true bounce (the teal floor tints the lower walls and the warm desk spills onto the counter), soft contact shadows under the chairs, bins, rails and the station, and AO in every corner. None of it is faked.

**Denoising.** Blender's OIDN compositor path needs a GPU context this container doesn't have. Instead, a masked separable Gaussian (σ 1.3 texels) is applied over covered texels only, so the islands never bleed into the empty atlas.

**Encoding.** Pixel value = (E / k)^(1/2.2), with k the 99.5th percentile of irradiance × 1.05.
- The runtime decodes it as an sRGB texture and multiplies by `k` (`lightMapIntensity`).
- The ceiling right around each tube is the 0.5% that clips. **The ceiling no longer blows out** at the panel edges (compare the take 1/4/5 ceilings).

**Repeatable.** Rebaking r4 from scratch gave the same k (2.89106…) to the last digit. Any zone the game builder makes can go through the same two commands.

## 2. The combine runtime (`take6.js`)
- **Architecture:** `MeshBasicMaterial` × the baked lightmap, unlit, with no runtime lights on the set. The bake *is* the light.
- **Merging (my route; it beats the gltf-transform route here):**
  - textures are keyed by **image content** (an 8×8 hash), because the exporter had cloned one texture per wall strip;
  - every small non-tiling texture (posters, door plates, signs, clock, cork board) is packed into a **runtime atlas**, one lit and one unlit;
  - all flat colours go into one vertex-coloured mesh;
  - lamp panels go in their own group.

  Result: **11 draw groups** for the whole lit hall.
- **The take 5 atmosphere on top:**
  - the **wet-floor `Reflector`** at 256×1024, blended at 45%;
  - **light cones** under the lamps, all **merged into one mesh**;
  - **haze** (fog 3 → 26 m);
  - the **warm desk bulb**;
  - the **failing tube** (its panel darkens and its cone dies on the same flicker sequence as take 5);
  - the **night grade** (teal shadows, warm highs, exposure 0.74).
- **Reflection on a budget:** small dressing sits on layer 1. The camera sees layer 1, but the Reflector's virtual camera renders layer 0 only. So the mirror pass carries just the architecture and the lamps instead of doubling the scene. This is take 5's "what gives first" made permanent.

## Rounds
1. **r1: wiring.** The bake ran but the UV set came out wrong: "Cannot apply to multi user". Fixed with `make_single_user` before the transform apply.
2. **r2: 1024² at 32 samples, 37 s bake.** The first true-GI result. Bounce and contact shadows were right, but grainy (see the trail). On the runtime side, the first merge errored: r128 has no `Texture.userData` to key textures on. I moved to a WeakMap, then content keys, then the atlas, landing at 11 groups / 28–30 frame calls.
3. **r3: 2048² at 256 samples + masked denoise, 544 s.** Clean. Dark, readable mood, but the station read too evenly lit. The panels had been swallowed into the lit atlas, so they rendered as grey. Gave them their own group with a colour boost.
4. **r4: lamps 70 → 85 W, desk 18 → 55 W, exposure 0.74, reflection 0.45.** The warm practical now pools on the counter and the facing wall. The far hall holds detail into the fog. **Shipped.**
   - **Detour:** I ran **gltf-transform** (dedup / prune / jpeg) on r4, which is Neon's named route. It **wrecked the geometry** at runtime under three r128: the bounding box was right but the triangles were garbage (shards across the frame).
   - I bisected it: `dedup` alone breaks it, and so does dedup with `--accessors false --meshes false` followed by jpeg. The bake GLB straight from Blender renders correctly.
   - So `optimize.sh` now only converts the lightmap to JPEG, r4 was rebaked, and gltf-transform isn't in the pipeline. My merge already does the call reduction; gltf-transform was only wanted for file size.

## Mood check (Cherie: dark, not showroom)
- Exposure 0.74 with the night grade: teal shadows, warm practicals, haze swallowing the far end.
- The tubes are bright only at their own panels. The floor carries their streaks in the wet reflection.
- The light comes from the lamps and bounces off the surfaces; there's no uniform wash.
- Honest read: it's lighter than my take 5 r4 because the bounce lifts the walls. If Cherie wants it darker still, it's a one-number change (`tune.exposure` in `r4/bake.json`, or `--power` and a rebake). No code change is needed.

## Gaps
- **Doors are baked closed.** Their open state would need a dynamic lightmap; they use the baked one as-is.
- **The cast isn't lightmapped.** Gunmen need a light probe matched to the bake (one hemisphere per zone is enough).
- **No specular on the baked surfaces** beyond the floor reflection (MeshBasic).
- **Download weight:** the GLB is 5.3 MB (Blender's JPEG q85 textures) plus a 0.86 MB lightmap. A KTX2 path would cut that, but the gltf-transform round-trip is unsafe on this file under r128 (above), so it's left alone.
- **The flicker is "off" frames**: the panel darkens and the cone drops out. It doesn't light the walls, because nothing is dynamically lit.

## Loader / module flags
- **`GLTFLoader.js`** (`examples/js/loaders/`, pinned CDN `three@0.128.0`) loads the baked hall.
- **`Reflector.js`** (`examples/js/objects/`, same pin) draws the wet floor.

Both are flagged per §6. Nothing else is beyond `three.min.js`.

## Provenance
- Textures: ambientCG CC0 (as in takes 1–5, `tex/LICENSE-ambientCG.txt`).
- Lightmaps: baked here.
- Geometry: the game's own builder plus my take 4 dressing.
- Blender (GPL) is a tool only; nothing GPL ships.

## Cast pass (BOTH)
Waiting on `games/hospital-escape/mixamo/`, which isn't on main yet. When it lands:
- the Mixamo pistol set through my retarget plus foot-lock (pace law: Walk 1.30 m/s by stance-phase foot contact);
- Cole seated / aim / slump;
- Maya push.

**MPFB2: not planned.** The VALID MIT bodies already share Mixamo's bone names 1:1, so a second body source adds a calibration step for no visible gain.

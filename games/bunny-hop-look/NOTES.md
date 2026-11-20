# Bunny Hop — look pass (Moth's attempt, on a copy)

Goal: close the gap toward the GTA VI bike footage Cherie sent (warm low sun,
soft shadows, detailed asphalt, hip-height chase camera, rich street detail).
**Note:** the frame extracts in `~/workspace/bunny-hop/reference/` were not on
disk when this pass ran, so it was aimed at that described target plus the
game's own current screenshots, not at the actual reference frames.

Worked only in `~/workspace/bunny-hop-look/`. Nothing pushed anywhere.
Physics, controls and world geometry are **untouched** — `groundAt`,
colliders, spawn and every mesh position/scale are identical; only lights,
camera, materials and textures changed.

## Screenshot pairs (390×844, identical teleport-anchored framing)

| Pair | Before | After |
|---|---|---|
| Riding (main street, ~9.5 m/s) | `shots/before-riding.png` | `shots/after-riding.png` |
| Bridge (deck, facing the far bank) | `shots/before-bridge.png` | `shots/after-bridge.png` |
| Bridge/water (deck centre, looking down the canal) | `shots/before-water.png` | `shots/after-water.png` |

Harnesses: `harness/lookshots.mjs` (riding + bridge), `harness/lookshotsB.mjs`
(water). Zero page errors in every run.

## What changed

**Lighting (biggest single win)**
- Sun lowered (−38,17,−30 → −44,10.5,−27 relative to rider, ≈19° → ≈11.5°
  elevation), warmed (0xffa860 → 0xff9a4e) and strengthened (1.9 → 2.6):
  long raking shadows instead of short night ones.
- Shadow map 1024 → 1536, `normalBias` 0.03 added.
- Hemisphere flipped from cool blue (0x8fa3d9/0.85) to warm peach sky /
  warm ground (0xe8b48c / 0x503a28, 0.9); ambient swapped blue → warm dim.
- Sky gradient rebuilt: the orange band now sits at the visible horizon
  instead of below the ground plane; fog warmed (0x2e3a5c → 0x66536b) and
  pulled slightly nearer for dusk haze. ACES exposure 1.12 → 1.22.
- Net effect: the scene reads **golden dusk**, not night.

**Camera**
- Chase cam: distance 5.7 m → 4.0 m + 0.10 × speed (pull-back at speed),
  height +2.4 m → +0.62 m over the target (hip height), look-ahead
  2.2 → 3.0 m and look height +0.35 → +0.55, so the rider sits lower and
  bigger in frame with more street and sky ahead.
- FOV 62 → 68, plus a subtle speed kick (up to +5 at full sprint).

**Surfaces (all procedural canvas textures, no external assets)**
- Asphalt: grain speckle + repair patches + cracks, repeated along the
  roads and the bridge deck. Sidewalks: jointed concrete slabs. Grass:
  mottled green with worn dirt flecks (kills the flat-lawn read).
- Water: streaked canvas texture (light streaks along the canal + warm sun
  glints), roughness 0.12 → 0.08, and a slow texture drift from the main
  loop (`world.waterMat.map.offset`) so the surface feels alive.

**Rider / bike materials**
- Frame paint glossier (roughness 0.35 → 0.22), chrome brighter
  (0.18 / 0.95), tyres near-black (0x0b0b0d), lemon-yellow tee → amber
  (0xd98e32), jeans → darker denim, shoes off-white.

## Frame cost (JS + render submission, `__dbg.frameStats().workMedianMs`, SwiftShader)

| Shot | Before | After | Δ |
|---|---|---|---|
| Riding | 5.8 ms | 7.4 ms | +1.6 ms |
| Bridge | 5.3 ms | 7.3 ms | +2.0 ms |

Same range, not free: the delta is the 1536² shadow pass plus texture
sampling on every surface, and SwiftShader (software) inflates both — on a
phone GPU expect the delta to shrink well under 1 ms. If the budget ever
bites, dropping the shadow map back to 1024 recovers roughly half of it.

## Honest gap assessment

This pass buys the **light and the framing**, and those were the two things
making the game read "night toy" instead of "dusk street". The rider now
fills the frame the way the reference chase cam does, shadows rake, windows
glow warm, and the ground has grain.

What it does **not** close — the remaining gap is structural, in order:

1. **Geometry density.** The reference streets are dense: parked cars,
   palms, signs, fences, varied building fronts, props every few metres.
   Ours is still boxes, lamps and bins on large empty slabs. No texture
   fixes emptiness; this is the biggest remaining difference.
2. **No real reflections / image-based lighting.** The water is a streaked
   texture with a drift, not a reflective surface; nothing mirrors the sky
   or the streetlights. A cheap env map (PMREM from the sky gradient) is
   the next rung and would also lift the bike's chrome and paint.
3. **The rider and bike are primitives.** Boxes and tubes with a procedural
   leg swing vs a modelled, skinned character. At the new closer camera
   this is *more* visible, not less.
4. **No post-processing.** Bloom is faked with glow sprites; the reference
   look leans on bloom + vignette + motion feel. A selective bloom pass is
   possible but costs more than everything above combined on a phone.
5. **Asphalt still goes dark at grazing angles** mid-distance (physically
   true for a low sun; the reference cheats with stronger sky fill). Could
   push hemisphere higher, at the cost of flatter shadows.
6. **Sky is a screen-space gradient** — no sun disc, no clouds, and it
   doesn't change with heading.

Verdict: noticeably closer — same scene, but now lit and framed like the
reference. Call it the lighting/camera half of the gap closed; the
geometry-density and character-model half is untouched and is where
Opus's/Neon's world work matters more than any shader tweak.

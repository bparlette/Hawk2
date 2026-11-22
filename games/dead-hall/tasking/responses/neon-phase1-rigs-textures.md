# DEAD HALL — Neon Phase 1 Response: Pinned Figure Rigs, Motion Harness & Texture Variants

**Status:** Phase 1 complete (standalone modules, zero edits to Moth's `index.html` or Opus's `src/combat/`).
**Held for Phase 2:** The 12 room dressing builders, lighting-mood passes, fake-out room integrations, and reference side-by-sides are held pending Moth's reference frames in `games/dead-hall/tasking/refs/`.

---

## 1. Delivered Modules

- `games/dead-hall/src/neon/textures.js` — Seeded (`mulberry32`) procedural `<canvas>` texture & material bank (`createNeonTextureBank`), **0 external images**, cached per key:
  - **13 room architectural variants:** `peelingPlaster`, `charredConcrete`, `nvClinicalTile`, `moldDrywall`, `rustHatchMetal`, `scuffedLinoleum`, `splinterTimber`, `tallIndustrialWall`, `watchingWallpaper`, `crackedStoragePlaster`, `yellowWallpaper`, `acousticCeiling`, `dampCarpet`.
  - **Figure surface & face variants:** pale/grey/warm skin, pleated/plain stained dresses, matted stitched mascot plush, crazed cracked porcelain, and 10 high-contrast dark-readable face decals.
- `games/dead-hall/src/neon/figures.js` — `FIGURE_SPECS` (numerically pinned), `createFigure(id, bank)`, `animateFigure(fig, mode, t)`, and `measureFigure(fig)`.
  - Drop-in `fig.userData.parts` compatible with `index.html` (`pelvis`, `legL/R`, `kneeL/R`, `torsoG`, `armL/R`, `foreL/R`, `neckG`, `neckSpring`, `headG`, `head`, `jaw`, `eyeMesh`, `torch`).
  - **Room 12 (`yellow`) has no figure**, per locked spec.
- `games/dead-hall/tools/motion-harness.html` + `games/dead-hall/tools/capture-motion.mjs` — Interactive and headless CDP `390×844` motion-test harness (zero npm dependencies).

---

## 2. Pinned Figure Specifications & Headless `390×844` Motion Measurements

Measured via `node games/dead-hall/tools/capture-motion.mjs` (`390×844`, **0 console/page errors**, 4 motion timestamps `t = 0.0, 0.35, 0.70, 1.05 s` per figure; `Meas H` shows live animated `THREE.Box3` height from `t=0.0s → t=0.70s`):

| Room | ID | Role | Motion | Pinned H | Meas H (`t0→t2`) | Shoulder | Stance | Head% | Meshes | Tris | Silhouette (1-sentence outline) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | `twins` | fake | `idle` | 1.12m | 1.13→1.14m | 0.28m | 0.16m | 18.8% | 52 | 4716 | Two short symmetrical child bell-silhouettes bridged hand-in-hand at waist height with bobbed hair and flared pleated skirts. |
| R2 | `doorway_woman` | fake | `idle` | 1.68m | 1.74→1.75m | 0.35m | 0.17m | 13.7% | 25 | 2346 | Razor-narrow vertical shroud column under a single pool of light, pale oval face framed by straight dark hair, arms dead-still at sides. |
| R3 | `exit_charger` | live | `lunge` | 2.08m | 2.10→1.90m | 0.68m | 0.42m | 13.0% | 22 | 2310 | Heavy top-loaded wedge of hunched 0.68 m coat shoulders and forward-pitched bull neck backlit under the EXIT sign. |
| R4 | `crawler` | live | `crawl` | 0.78m | 1.21→1.10m | 0.46m | 0.62m | 14.0% | 27 | 2242 | Low spider-wide all-fours silhouette with concave arched spine, high reversed-angle elbows, and upturned eyes catching NV green. |
| R5 | `corner_figure` | live | `lunge` | 1.78m | 1.80→1.65m | 0.48m | 0.24m | 13.5% | 22 | 2310 | Slumped heavy-overcoat pillar facing away into a room corner with bowed head and flared trenchcoat hem that whips around to lunge. |
| R6 | `hatch_crawler` | live | `hatch_emerge` | 1.02m | 1.48→1.55m | 0.38m | 0.44m | 14.0% | 33 | 2610 | Half-emerged slender torso hauling out of a floor hatch beneath a thick forward-draping curtain of black hair and splayed reaching hands. |
| R7 | `mascot` | live | `sprint` | 1.98m | 2.36→2.22m | 0.64m | 0.40m | 31.3% | 27 | 3610 | Barrel-chested broken plush mascot dominated by a massive 0.62 m head, one tall drooping ear, one snapped bent ear, snout, and clacking hinged jaw. |
| R8 | `doorway_eyes` | live | `idle` | 1.86m | 1.90→1.90m | 0.50m | 0.28m | 14.0% | 22 | 2310 | Pitch-black matte silhouette squaring off an open doorway with zero surface detail except two piercing pale-white pinpoint eyes. |
| R9 | `tall_figure` | live | `unfold` | 2.95m | 2.62→2.76m | 0.36m | 0.30m | 7.8% | 27 | 2242 | Impossibly tall 2.95 m needle-thin silhouette whose tiny head grazes the ceiling while 1.34 m arms hang below knees and unfold into a slow lunge. |
| R10 | `eye_shadow` | live | `sprint` | 2.22m | 2.21→1.83m | 0.52m | 0.36m | 13.5% | 23 | 2082 | Pitch-black athletic void sprinter with tapering shoulder wisps and a single huge luminous white cyclops eye locked on the lens. |
| R11 | `mannequin` | live | `flicker_step` | 1.82m | 1.91→1.89m | 0.44m | 0.28m | 12.6% | 28 | 4312 | Pale cracked-porcelain mannequin with visible ball-joint spheres and a 0.22 m coiled steel spring neck holding a blank head cocked 28 degrees. |
| R4 | `decoy_guard` | decoy | `decoy_flee` | 1.78m | 1.96→1.95m | 0.46m | 0.30m | 13.5% | 27 | 2130 | Normal human guard in navy uniform, peaked cap, gleaming brass badge, raised trembling hands, and an active handheld flashlight beam. |
| R8 | `decoy_worker` | decoy | `decoy_flee` | 1.74m | 1.91→1.90m | 0.45m | 0.30m | 13.8% | 26 | 2386 | Normal human worker in yellow hardhat and high-vis orange vest with bright reflective chest stripes, raised trembling hands, and active flashlight. |

*Honest note on measured heights:* `crawler` (`1.21→1.10m`) and `hatch_crawler` (`1.48→1.55m`) report full `Box3` height including splayed limbs/below-floor hatch legs; `mascot` (`2.36→2.22m`) includes the upright drooping ear tip above the `1.98 m` head crown; `tall_figure` (`2.62→2.76m`) reflects its crouched-to-unfolding posture (`2.95 m` at full erect extension).

---

## 3. Reproducing Verification

```bash
node games/dead-hall/tools/capture-motion.mjs --out /tmp/dead-hall-motion
```

Produces `report.json`, `00-silhouette-lineup.png`, `00-decoys-lineup.png`, `00-texture-variants.png`, and per-figure motion frames (`fig-<id>-f1.png`, `fig-<id>-f2.png`) at `390×844`.

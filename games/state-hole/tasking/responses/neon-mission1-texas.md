# Neon — Mission 1 Texas Look Stills (Owner Pick Gate)

Status: **Awaiting owner pick (`Look A`, `Look B`, or `Look C`) before rolling Mission 1 across all 51 states.**  
Live `games/state-hole/index.html` is **untouched**.

---

## Interactive Sample (Phone-Ready)

Preview and tap between looks (`z-index: 1200` switcher pills; hidden automatically under `?clean=1`):
- Baseline: `games/state-hole/tasking/texas-sample.html?look=before`
- **Look A · Palm Gouache (Recommended balanced contender):** `games/state-hole/tasking/texas-sample.html?look=A`
- **Look B · Sunlit Watercolor Atlas:** `games/state-hole/tasking/texas-sample.html?look=B`
- **Look C · Bold Impasto Sunset:** `games/state-hole/tasking/texas-sample.html?look=C`

---

## Side-by-Side Comparisons (`390×844`, DPR 2)

| Shot | Side-by-Side 4-Up Sheet | Framing |
|---|---|---|
| **Play Zoom (`2.2–2.3m`)** | `games/state-hole/tasking/responses/neon-texas-stills/SBS-texas-play.png` | Hole beside Texas's 22-person tallest column; shows brushwork density, crisp flat-toon figure pop, OK/NM/AR/LA border separation, Gulf coastline, and northern sky/fog horizon |
| **Coastal + Borders (`5.4m`)** | `games/state-hole/tasking/responses/neon-texas-stills/SBS-texas-coast.png` | Wide view over East Texas + Gulf of Mexico + OK/AR/LA border corners; shows inward shaded state boundaries and coastal water gradient |

Individual `390×844` (DPR 2, `780×1688`) frames in `games/state-hole/tasking/responses/neon-texas-stills/`:
- Play zoom: `tx-play-before.png`, `tx-play-lookA.png`, `tx-play-lookB.png`, `tx-play-lookC.png`
- Coastal view: `tx-coast-before.png`, `tx-coast-lookA.png`, `tx-coast-lookB.png`, `tx-coast-lookC.png`

---

## Look Notes for Owner Pick

1. **Look A · Palm Gouache (`?look=A`)** — Balanced golden-hour Palm City brushwork. Confident curved brushstrokes follow a world-seeded FBM flow field in warm amber-apricot and terracotta-ochre within Texas's `#f78c2b` hue (`sRGB` calibrated so ACES tone mapping doesn't shift orange toward red). Soft 3-pass warm plum-ochre inward edge shading separates TX from OK, NM, AR, and LA cleanly without cartoon ink outlines. Warm coastal shoal glow + subtle horizontal ripple shimmer over cerulean sea; `[85, 300]` warm peach horizon fog (`0xffe4b8`).
2. **Look B · Sunlit Watercolor Atlas (`?look=B`)** — Lightest, airiest painted-paper surface for maximum flat-toon person and purple-hole pop. Translucent overlapping wet blooms with gentler directional strokes and a characteristic crisp darker watercolor pigment back-run inner edge (`0.34` alpha) + subtle inner luminous wash halo. Brighter breezy aquamarine-cerulean ocean and `[95, 320]` sunlit cream fog (`0xffeed6`).
3. **Look C · Bold Impasto Sunset (`?look=C`)** — Highest visible brush energy (closest to Palm City `v2-paint-golden.png`). Denser, higher-contrast swirled honey-gold highlights and burnt-sienna shadow strokes + dry-brush bristle accents, deeper violet-umber edge vignette with subtle northwest rim catch light, richer twilight-teal ocean with warmer amber wave glints, and closer golden-hour fog (`[78, 275]`, `0xffcf91`).

*(People geometry, shoulder stacks, hole/ring/aura, physics, camera framing, controls, and Census data are completely unchanged across all variants.)*

---

## SHOW YOUR WORK

- **Vendor / Stack Compliance:** `games/state-hole/tasking/texas-sample.html` imports exclusively from `../vendor/gp3d.js` and `../vendor/gpkit.js` (zero inline/private Three.js copies) and extracts `STATE_DATA` dynamically from `../index.html`.
- **Painted State Slabs (`paintStateTexture`):** Generates static offscreen `CanvasTexture` maps **once at initialization** (`768×768` for `TX`, `384×384` for surrounding states, `160×160` elsewhere; `SRGBColorSpace`, `anisotropy = 4`), remapping extruded cap UVs cleanly to `[bx0..bx0+bw, bz0..bz0+bh]` with 3.5% bbox padding. Uses pure-sRGB HSL helpers so Three.js Linear/SRGB conversions never double-darken orange/warm tones, plus `Path2D` clipping so edge shading stays purely inward. Side walls (`sideMat`) match the state's shaded edge color.
- **Ocean Shader (`buildCoastMask` + `oceanMat.onBeforeCompile`):** Builds a single static `512×512` `blur(12px)` coastal silhouette mask once at startup (zero per-frame canvas redraws) and drives slow elongated sinusoidal wave swells and glints via `uTime` in `MeshBasicMaterial`'s fragment `#include <color_fragment>`, preserving Three.js scene fog, ACESFilmic tone mapping, and sRGB output.
- **Capture & Verification:**
  - Script: `games/state-hole/tools/capture-texas-stills.mjs` (headless Google Chrome CDP + Node `WebSocket` + `/opt/homebrew/bin/uv run --with pillow python3` at `390×844` DPR 2, seeded `Math.random` PRNG = 7).
  - Run result after final shader/framing edit: `exit 0`, `consoleErrors=0`, `pageExceptions=0`, `totalPersons=5453`, all 8 phone PNGs + both `1634×922` 4-up comparison sheets (`SBS-texas-play.png`, `SBS-texas-coast.png`) visually inspected via `read_file`.

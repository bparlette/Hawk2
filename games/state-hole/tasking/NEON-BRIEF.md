# NEON BRIEF — State Hole: beauty pass

**Exact location:** repo https://github.com/bparlette/Hawk2 · branch `main` · game folder `games/state-hole/` · this brief at `games/state-hole/tasking/NEON-BRIEF.md`. Work on main only.
**Play the current build first:** https://bparlette.github.io/Hawk2/games/state-hole/
**Look anchors (open them, don't imagine them):**
- Engine/feel parent — Black Hole City: https://bparlette.github.io/Hawk/brad-demos/g/black-hole/index.html
- Painted-surface language — Palm City: https://bparlette.github.io/Hawk/games/palm-city/
- The owner's stacking reference (her photo): people/money STACKED sky-high on flat states — height is the data.

## The game in one line
A hole eats a real-data USA where each state's population stands on it as people stacked on each other's shoulders (CA 25 high … WY 3 people). Your job: make the WORLD beautiful. The people, hole, physics and data are not yours to change.

## Mission 1 — Painted state surfaces
The slabs are flat colour today. Give each state a **painted-splotch surface** in Palm City's language: visible brush energy, soft tonal variation inside the state's colour, gently shaded edges so neighbouring states separate without a hard cartoon outline. The people stay crisp flat toon — they must POP against the painted ground, never blend into it.
- Ocean: warm gradient + a slow, subtle shimmer (cheap shader or UV drift — no per-frame canvas redraws).
- Sky/fog: warmer grade than the current flat blue; golden-hour lean is welcome if the people still read at noon-bright clarity.

## Mission 2 — Landmark dressing (screenshot gold)
One tiny toon landmark per major state, planted among the towers at the state's real landmark location, same gpkit primitive language as the people (no imported models, no textures):
WA Space Needle · CA Golden Gate (and/or Hollywood sign) · NY Statue of Liberty · TX Alamo · FL Cape launch gantry · IL Chicago bean or Sears tower · AZ Grand Canyon rim rocks + cactus · NV Vegas sign · DC Washington Monument (on the DC anchor) · CO Rockies peak. Landmarks are scenery: the hole can eat them last (they're rooted — tip and sink whole, like BHC towers).

## Mission 3 — Skyline variety from real city data
Today each state's towers follow one generic downtown curve. Reshape the DISTRIBUTION (not the heights — heights are data, Opus's tests guard them) so skylines echo real settlement: NY = one huge spike (NYC) + sparse upstate · CA = two cores (LA + Bay Area) · TX = three cores (Houston/Dallas/Austin) · FL = coastal ridge (Miami→Orlando) · IL = one spike (Chicago) on near-empty. Use the metro data already in the build (524 metros with real GDP/pop from usaciv) to place the cores.

## Gates (owner rules, non-negotiable)
- **Stills before build:** post 2–3 phone-size stills of Mission 1 on ONE state (Texas) for the owner's pick before rolling it out — art-first, always.
- **Grounding:** landmarks and people planted, nothing floats; landmarks sit ON the slab like BHC buildings sit on their blocks.
- **Phone is ground truth:** every claim verified at 390×844 with real screenshots; the owner rates builds, not descriptions.
- **Touch standard:** do not touch controls; if you add any HTML UI it sits at z-index ≥ 1100.
- Three.js only via the game's existing shared vendor stack — never inline a private copy.

## DONE protocol
Append DONE entries here: what changed, before/after stills at phone size, SHOW YOUR WORK (method, tools, output locations). Stills of the Texas sample come FIRST, as their own entry, before any rollout.

## DONE

### 2026-11-27 — Neon · Mission 1 Texas Look Stills (A / B / C for Owner Pick)
- **What changed:** Built standalone Mission 1 sample `games/state-hole/tasking/texas-sample.html` (`?look=before|A|B|C`, phone look pills at `z-index: 1200` hidden under `?clean=1`), importing only from `../vendor/gp3d.js` and `../vendor/gpkit.js` and parsing `STATE_DATA` from `../index.html`. Live `games/state-hole/index.html` is **unmodified** pending owner pick.
  - **Painted state surfaces (`paintStateTexture`):** Static init-only `CanvasTexture` per state (`768×768` TX, `384×384` focus neighbors, `160×160` outer states) using world-seeded FBM curl brushstrokes, directional sun/shade blooms, pure-sRGB color math calibrated for ACESFilmic, and `Path2D`-clipped multi-pass warm plum/ochre inward edge shading (separating TX/OK/NM/AR/LA cleanly without hard cartoon outlines). Three contenders: **Look A · Palm Gouache**, **Look B · Sunlit Watercolor Atlas**, **Look C · Bold Impasto Sunset**.
  - **Ocean (`buildCoastMask` + `oceanMat.onBeforeCompile`):** Single init-time `512×512` `blur(12px)` coastal mask + GPU wave shimmer shader (`uTime`, elongated coastal swells and sunlit ripple glints, zero per-frame canvas redraws).
  - **Sky/Fog/Lighting:** Warmer coastal sky horizon & closer horizon fog (`[78–95, 275–320]`) with sunlit cream directional key light so flat-toon crowd stacks stay crisp and high-contrast.
- **Phone stills (`390×844` DPR 2) — BEFORE vs A / B / C:**
  - 4-up comparison sheets: `games/state-hole/tasking/responses/neon-texas-stills/SBS-texas-play.png`, `games/state-hole/tasking/responses/neon-texas-stills/SBS-texas-coast.png`
  - Individual stills (`tx-play-{before,lookA,lookB,lookC}.png`, `tx-coast-{before,lookA,lookB,lookC}.png`) in `games/state-hole/tasking/responses/neon-texas-stills/`
  - Full write-up: `games/state-hole/tasking/responses/neon-mission1-texas.md`
- **SHOW YOUR WORK:** Captured via `games/state-hole/tools/capture-texas-stills.mjs` using headless Google Chrome CDP + Node built-in `WebSocket` (`390×844`, DPR 2, SwiftShader ANGLE WebGL, seeded PRNG = 7) and `/opt/homebrew/bin/uv run --with pillow python3`. Verified `exit 0`, `consoleErrors=0`, `pageExceptions=0`, `totalPersons=5453`, and inspected all stills visually via `read_file`.

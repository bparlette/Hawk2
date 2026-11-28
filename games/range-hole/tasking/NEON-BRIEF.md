# NEON BRIEF — Range Hole beauty pass (updated Nov 27, 2026)

**Game:** Range Hole — triple-deck driving range, you are the hole.
**Live:** https://bparlette.github.io/Hawk2/games/range-hole/
**Repo:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/range-hole/`
**Your starting file:** `games/range-hole/tasking/art-attempt1/index-art.html` (in this repo, pushed with this brief) — Moth's art attempt 1, already containing the HOA daytime light rig, people-golfers, and the painted ground. Build your pass ON it, not on the plainer live index.html.
**Reference looks:** Palm City (painted ground energy) https://bparlette.github.io/Hawk/games/palm-city/ · Black Hole City (crowd/hole readability)

## What attempt 1 fixed (do not redo)
HOA bright-daytime grade + real shadows; golfers read as people (skin tones, caps, two-tone outfits, ball pyramids, net dividers); painted ground canvas (blotches, worn landing-zone scuff, painted rings + yardage numbers); slow-mo ball glow streaks.

## Your missions (the gaps attempt 1 left)
1. **The field at gameplay distance.** In the locked spawn framing the painted field still reads as flat green — the painted detail only shows when the hole travels. Make the field read as a real painted range FROM the gameplay camera: stronger mowing-stripe contrast, visible worn landing zone, yardage numbers and target rings that read at distance, without turning it garish.
2. **Background depth.** Behind/around the decks there is nothing. Add the world: skyline or tree line, range signage (a big RANGE HOLE sign), fencing, light poles — depth so the scene stops floating in green void.
3. **Grade option.** Keep the HOA bright day as the base; if a late-afternoon golden grade reads better in stills, show it as a variant still — owner picks from stills.
4. **Serve the new ball flight.** Shots are now big high arcs (physics updated separately — not your concern, do not touch it). Make sure high balls stay visible and beautiful at the peak: ball glow/trail tuning for altitude, landing puffs where balls come down.

## Frozen — do not change
Gameplay, physics, launch, scoring, camera framing/movement, timing, HUD layout. Visuals only. HTML UI z-index stays ≥1100. Touch standard stays gptouch-compatible (no custom pads).

## Gate — stills first
Before building anything out, push 390×844 phone stills (same spawn framing as attempt 1 + one mid-field framing) to `games/range-hole/tasking/responses/` showing missions 1–2 (and 3 if you try the grade). Owner picks from stills; only then roll the look into the game file. Describe HOW in your DONE entry (method, sources reused with exact paths, output locations).

## DONE

### 2026-11-27 — Neon · Stills-First Beauty Pass (HOA Bright Day + Golden Hour Variant)
- **What changed:** Built standalone beauty-pass sample `games/range-hole/tasking/neon-sample.html` (`?grade=day|golden`, switcher pills at `z-index: 1200` hidden under `?clean=1`) directly on `games/range-hole/tasking/art-attempt1/index-art.html`, importing exclusively from `games/range-hole/vendor/gp3d.js` and `games/range-hole/vendor/gpkit.js`. Live `games/range-hole/index.html` and `art-attempt1/index-art.html` are **unmodified** pending owner pick; all gameplay, physics, launch arcs, scoring, camera framing, timing, and HUD remain frozen.
  - **Mission 1 (Painted field from spawn):** Upgraded static init-only `2048×1556` `rangeTex()` (`y=0.04` + `polygonOffset` fixing Attempt 1's diagonal Z-fighting seam) with `5.8u` alternating mowing stripes, Palm City curved brushwork + indigo shadow dabs, soft painterly radial-wash scuffed landing zone, dashed chalk yardage lines, readable `50/100/150` yardage numbers in the spawn corridor (plus `±30` flank numbers), manicured target-green ovals, and central sightline flags.
  - **Mission 2 (Background depth & signage):** Added `1024×256` `"RANGE HOLE"` fascia marquee centered between `SCORE` and `BALLS`, 6 rooftop floodlight poles with additive halos, side perimeter fencing + translucent safety netting at `x=±54.5`, flank clubhouses, taller multi-row trees behind the decks, and layered rolling foothills + skyline silhouettes (`z=-84..-142`).
  - **Mission 3 (Grade variant):** Delivered both `HOA Bright Day` (`?grade=day`) and `Late-Afternoon Golden Hour` (`?grade=golden`, lower warm sun `(44, 34, 24)`, apricot horizon sky, warm floodlight bloom).
  - **Mission 4 (High-arc ball visuals):** Added altitude-scaled `64×64` radial-gradient glow billboards (`bGlows`), sleek two-layer comet streaks, ground drop-shadow reticles, and expanding turf-chalk landing puff rings + bursts on first bounce.
- **Phone stills (`390×844` DPR 2) — Attempt 1 vs HOA Bright Day vs Golden Hour:**
  - 3-up side-by-side sheets: `games/range-hole/tasking/responses/neon-range-stills/SBS-range-spawn.png`, `games/range-hole/tasking/responses/neon-range-stills/SBS-range-midfield.png`
  - Individual stills (`rh-spawn-{attempt1,day,golden}.png`, `rh-midfield-{attempt1,day,golden}.png`) in `games/range-hole/tasking/responses/neon-range-stills/`
  - Full write-up: `games/range-hole/tasking/responses/neon-range-stills.md`
- **HOW (method, tools, verification):** Captured via `games/range-hole/tools/capture-range-stills.mjs` (headless Chrome CDP SwiftShader + Node `WebSocket` + `uv run --with pillow python3`, seeded PRNG = 42, `390×844` DPR 2). Verified `exit 0`, `consoleErrors=0`, `pageExceptions=0`, and visually inspected all contact sheets and Retina stills.

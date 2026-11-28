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

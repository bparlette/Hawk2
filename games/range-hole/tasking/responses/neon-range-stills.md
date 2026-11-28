# Neon — Range Hole Beauty Pass Stills (Owner Pick Gate)

Status: **Awaiting owner pick (`HOA Bright Day` vs `Golden Hour`) before rolling the look into live `games/range-hole/index.html`.**  
Live `games/range-hole/index.html` and `games/range-hole/tasking/art-attempt1/index-art.html` are **untouched**. Gameplay, physics, launch arcs, scoring, camera (`CAM_H=21.2, CAM_D=19.9, LOOK_Y=2, LOOK_Z=10, fov=56`), timing, and HUD are 100% frozen.

---

## Interactive Sample (Phone-Ready)

Preview and toggle between both grades (`z-index: 1200` pills at bottom; hidden automatically under `?clean=1`):
- **HOA Bright Day (Base):** `games/range-hole/tasking/neon-sample.html?grade=day`
- **Late-Afternoon Golden Hour (Variant):** `games/range-hole/tasking/neon-sample.html?grade=golden`

---

## Side-by-Side Comparisons (`390×844`, DPR 2)

| Shot | Side-by-Side 3-Up Sheet | What to Check |
|---|---|---|
| **Locked Spawn (`hx=0, hz=2`)** | `games/range-hole/tasking/responses/neon-range-stills/SBS-range-spawn.png` | Field reads as a real painted range from spawn (mowing stripes, Palm City brushwork, scuffed ochre landing zone, readable `50/100/150` yardage numbers & chalk lines, manicured target greens + flags, zero Z-fighting), unclipped `"RANGE HOLE"` fascia marquee, altitude-tuned ball glow + landing puffs |
| **Mid-Field (`hx=0, hz=-18`)** | `games/range-hole/tasking/responses/neon-range-stills/SBS-range-midfield.png` | Background depth above the triple-deck roof (rolling foothills & taller tree line replacing green void), full `"RANGE HOLE"` marquee, sunlit high-arc comet trails, landing dust rings, and HOA Day vs Golden Hour comparison |

Individual `390×844` (DPR 2, `780×1688`) phone stills in `games/range-hole/tasking/responses/neon-range-stills/`:
- Spawn framing: `rh-spawn-attempt1.png`, `rh-spawn-day.png`, `rh-spawn-golden.png`
- Mid-field framing: `rh-midfield-attempt1.png`, `rh-midfield-day.png`, `rh-midfield-golden.png`

---

## Grade Notes for Owner Pick

1. **HOA Bright Day (`?grade=day`, Base):** Preserves Attempt 1's bright daytime HOA light rig (`hemi 0xdff4ff/0x6a8d4a`, `sun 0xfff3d6` at `(30, 50, 20)`) with crisp emerald/sage mowing stripes, soft warm-ochre landing wear, vivid manicured target greens, and bright sunlit comet trails.
2. **Late-Afternoon Golden Hour (`?grade=golden`, Optional Variant):** Lower warm sun (`0xffd596` at `(44, 34, 24)` casting longer warm shadows), warm apricot-to-cerulean sky (`0x327ed2` → `0xffcf94`), boosted warm floodlight lamp halos, richer amber-olive grass highlights with deeper Palm City indigo shadow pools, and golden-white high-arc ball comets.

---

## SHOW YOUR WORK

- **Starting File & Sources Reused:** Built directly on `games/range-hole/tasking/art-attempt1/index-art.html` (preserving HOA light rig, 4-mesh instanced people-golfers, bay ball pyramids/buckets/nets, locked full-view camera, high-arc `LAUNCH_EL`/`ARC_SPD`, bounce scoring, and `window.__SAMPLE`), importing exclusively from `games/range-hole/vendor/gp3d.js` and `games/range-hole/vendor/gpkit.js`.
- **Mission 1 — Field at Gameplay Distance (`rangeTex()`):** Upgraded static init-only `2048×1556` `CanvasTexture` (`SRGBColorSpace`, `anisotropy=8`, placed at `y=0.04` with `polygonOffset` to eliminate Attempt 1's diagonal Z-fighting seam): `5.8u` high-contrast mowing stripes, Palm City curved gouache strokes + indigo shadow pools, soft painterly radial-wash scuffed landing zone, dashed chalk yardage lines, unclipped `50/100/150` yardage numbers inside the spawn corridor (plus `±30` flank numbers), and manicured target-green ovals + 3D flags.
- **Mission 2 — Background Depth & Signage:** Added `1024×256` `"RANGE HOLE"` fascia marquee (`13.6×2.05` centered between `SCORE` and `BALLS` HUD), 6 rooftop floodlight towers with additive glow halos, perimeter side netting stanchions & translucent netting at `x=±54.5` (outside playable `HX=[-52,52]`), flank clubhouse pavilions, taller multi-row trees behind the decks, and layered foothills + distant skyline silhouettes behind `z=-84..-142`.
- **Mission 4 — High-Arc Ball Flight Visuals:** Added camera-facing `64×64` radial-gradient additive glow billboards (`bGlows`) scaled gently by altitude `y`, sleek two-layer comet streaks (`streaks` + `streaksOuter`), subtle ground landing shadow dots (`dropDots`), and expanding turf-chalk landing puff rings + dust bursts (`spawnLandingPuff`) on first ground bounce (`b.bounces === 0`).
- **Capture & Verification:**
  - Script: `games/range-hole/tools/capture-range-stills.mjs` (headless Chrome CDP SwiftShader + Node built-in `WebSocket` + `/opt/homebrew/bin/uv run --with pillow python3`, `390×844` DPR 2, seeded `Math.random` PRNG = 42).
  - Final run result: `exit 0`, `consoleErrors=0`, `pageExceptions=0`, matched spawn & mid-field camera coordinates across all 3 variants; all contact sheets and Retina stills visually inspected via `read_file`.

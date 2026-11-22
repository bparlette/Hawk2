# DEAD HALL — Neon Tasking: Rooms & Atmosphere Pass

**Game:** Dead Hall — bodycam horror rail game (police bodycam UNIT 2210 auto-walking a condemned building at night).
**Repo / path:** bparlette/Hawk2 · `games/dead-hall/`
**Proven base sample:** https://bparlette.github.io/Hawk2/games/bodycam-corridor/ (recipe: gamepress `docs/BODYCAM.md`)
**Your job:** AFTER the core loop is proven, a rooms-and-atmosphere pass — set-dressing, lighting moods, texture variants, and fake-out staging variants for the 12 rooms. You do not touch the combat systems, the walk, or the camera.

## MAIN-ONLY RULE
Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after.

## Locked design — do not relitigate
- Movement and camera are **100% automatic, always**. No steering, no joystick, no free look. Do not add any movement control.
- Player input is exactly two buttons: contextual **ACTION** and **STAB**. Do not add inputs.
- The combat model, room order, counter-window timing, and decoy rules are locked and owned by another lane. Stage AROUND them; never retune them.
- **Originals only:** every figure is an original creation. The rooms homage famous compositions/staging — no likenesses of copyrighted characters, ever.
- Found-footage HUD is the interface: REC dot, real-clock timestamp, battery, audio meters, grain, camera-mounted light. Portrait 390×844. Any HTML you touch keeps buttons z-index ≥ 1100 and double-tap zoom / browser gestures blocked (gamepress TOUCH standard applies even though input is buttons-only).

## The 12 rooms you are dressing
1. Hallway twins standing hand-in-hand at the far end — vanish on a light flicker
2. Woman dead-still in a doorway under one light — vanishes
3. Silhouette under an EXIT sign that charges down a black corridor
4. Night-vision green room — an all-fours crawler
5. Figure motionless facing a room corner — the lunge comes from the door just passed
6. Long-haired figure crawling up out of a floor hatch
7. Broken mascot figure sprinting the hallway at full speed
8. Figure standing IN the opened doorway — black face, two pale eyes (a don't-stab decoy variant also lives in this room's staging family)
9. Impossibly tall, lanky figure — head at the ceiling, unfolds into a slow lunge
10. Eye-shadow chase down a corridor of watching eyes — furniture in the path, ends in a door-slam
11. Spring-necked mannequin — moves ONLY while the light flickers
12. The yellow room — yellow wallpaper, humming fluorescents, EMPTY, and the walk through it takes too long. No monster. Do not add one.

## Scope
- **Set-dressing per room:** props, debris, wall/floor dressing density matched to each room's composition — the famous shot must read instantly at phone size, in the dark, in one glance.
- **Lighting moods per room:** camera-light pool, practicals (EXIT sign, fluorescents, night-vision green), flicker patterns. Flicker is a gameplay signal in rooms 1 and 11 — its timing is locked; you may style its look, not its cadence.
- **Texture variants:** the corridor sample generates all textures in code at boot (seeded) — extend that system, no external image files, no new draw-call blowouts. Report draw calls before/after per room.
- **Fake-out staging variants:** 2–3 additional almost-scare stagings (a falling object, a distant figure that is gone on the second look, a sound with an empty room) that the encounter system can slot into its existing fake-out beats.

## Figure discipline — read this twice
You build one figure system and skin it; unnamed figures drift into sameness and that has failed review before. **Pin every figure numerically in the room spec before building it:** total height, shoulder width, stance width, head size relative to body, limb proportions, silhouette outline in one sentence. The twins, the tall figure, the crawler, and the mannequin must be unmistakably different silhouettes at 390 px wide in near-darkness. If two figures could be confused in a dark screenshot, they are wrong.

## Verification — motion, not stills
- Quality is judged **in motion**: every figure gets a walk/lunge/crawl test recording, not a beauty still. A figure that reads well frozen and wrong moving is a fail.
- Staging references will be supplied as images in this tasking folder when the pass starts — build to those frames, and return side-by-sides (reference vs your room, same framing) for Moth's review.
- Report conservatively: your numbers will be re-measured on the delivered build by Moth. Claim only what the build itself shows.

## Deliverable
Committed to Hawk2 main: the dressed rooms + variants, with a response file under `games/dead-hall/tasking/responses/` listing per-room draw calls before/after, the pinned figure measurements, and links to the motion-test recordings.

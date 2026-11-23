# HOSPITAL ESCAPE — Neon Tasking: STEP ONE — The Opening (Room Visit → Bed Push → Wheelchair Transfer → First Corridor Fight)

**Game:** Hospital Escape (working title) — an on-rails third-person shooter. A wounded man can't walk; his friend wheels him out of a hospital that armed men are trying to keep him in, and the two of them shoot their way to a stolen ambulance.
**Repo / path:** bparlette/Hawk2 · `games/hospital-escape/`
**Deliverable:** ONE single self-contained HTML file at `games/hospital-escape/index.html` — it will live at https://bparlette.github.io/Hawk2/games/hospital-escape/
**Your job:** STEP ONE ONLY — the opening of the game, playable end to end (see "Step one scope" below). The full 9-beat structure is specified so you build toward it, but step one is a sample: Cherie plays it, then approves before the full build.

## MAIN-ONLY RULE
Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after.

## What this game is — and where it comes from

The design reference is a pair of viral clips of a fan-made mission (a modded GTA V "GTA 6 concept" video — NOT a real GTA 6):

- Part 1: https://youtube.com/shorts/Ic-x766nG-M — the hospital escape (2:59)
- Part 2: https://youtube.com/shorts/D8enZhZsYgE — the ambulance chase (0:29)

Watch both. What you are replicating is the **design** — the rail camera, the role rotation, the beats — never the IP (see "Originals only" below). The core of it, in Cherie's words: **"the camera does all the work and you just have to aim and shoot."**

- **Fantasy:** you are the wounded hero in the chair. You cannot walk, you cannot drive, you cannot steer. Everything you can do is aim and fire — and that's enough.
- **Tone:** tense but playable as an arcade ride. Short subtitle dialogue beats sell the friendship; the ride sells the game.
- **A run (full game, for structure):** hospital room → bed push → wheelchair → elevator → cafeteria → waiting room → main entrance → stolen ambulance → chase → train-tracks ending. Step one builds only the first stretch of that.

## The design law — the camera does all the work

This is the whole game. Get this wrong and nothing else matters.

- **Rail segments (most of the game):** the camera moves on a fixed scripted path. The player **never steers, never drives, never moves the character.** The player's entire job: **aim the reticle and shoot.**
- **Wheelchair beats:** camera locked at seated height (~1 m), close over-the-shoulder/behind the chair, following the chair as the companion pushes it along its path.
- **Holdout beat:** camera essentially static behind the parked chair; enemies come to the player; aim + fire only.
- **Ambulance beat:** camera fixed inside the rear of the moving ambulance, looking back out the open doors; the companion drives a scripted route; the player shoots at pursuers with a generous aim arc (directly behind and pulling alongside).
- **ONE free section:** exactly one segment gives the player free third-person movement — playing as the companion on foot (see rotation below). It exists so the ride doesn't feel like a pure rail ride. Everywhere else: rails.
- **Character rotation is scripted, always.** Control passes between the two leads at fixed story cuts (a hard cut or a short cutscene beat). **Never a character wheel, never a switch button, no switch UI of any kind.**

## The two leads — and how control rotates

Two playable characters, and one of them covers two jobs:

1. **THE HERO (the patient).** Wounded — shot or stabbed before the game opens — and **cannot walk properly**. That injury is the premise of the entire design. He rides: first in his hospital bed, then in a wheelchair, then on the floor of the ambulance bay. From each of those seats, he shoots.
2. **THE FRIEND (the breakout).** The one who comes to get him out. Pushes the bed, pushes the wheelchair, fights beside him on foot, and drives the ambulance. The muscle and the wheels; the hero is the gun.

**The rotation (scripted cuts, in order):**
1. Play as **the hero in the chair/bed** — the friend pushes (AI), the player aims + fires.
2. Cut to **the friend on foot** — the ONE free third-person section; full controls, the hero parked and defending himself nearby.
3. Cut back to **the hero defending from the parked chair** — the holdout.
4. Cut to **the hero shooting from the back of the ambulance** — the friend drives (AI), the player aims + fires.

**Enemies, briefly:** in the hospital, armed men in plain clothes (later waves in staff-like uniforms/scrubs) who take cover behind carts, counters and doorframes and rush in waves during the holdout. In the chase, marked patrol cars first, then unmarked black SUVs. Follower cars are crashed BY GUNFIRE ONLY — shoot the windshield/driver (car drifts and wrecks), the front tires (car veers and slows), or the engine (smoke → fire → stop). Implement all three. The ambulance never rams anyone; it never turns around.

## The 9 beats — the full level structure

This is Cherie's outline for the replica. Beats 7 and 9 are **her original beats — they are not in the reference clips** (Part 1 ends on the *decision* to take an ambulance; Part 2 opens already mid-chase; neither clip shows a theft or a train). Build them as first-class beats, not filler.

1. **The visit.** Open in the hero's hospital room. He's in the bed; the friend enters. A short dialogue beat — someone official tries to stop the discharge — then the decision: we're leaving, now.
2. **Wheel the bed.** The friend wheels the ENTIRE BED down the first hall or two. The bed is the first vehicle: same rail rules, bed height, the hero firing from flat on his back as the first pursuers appear.
3. **Transfer to the wheelchair.** A story beat with teeth: under pressure, the friend gets the hero out of the bed and into a wheelchair. From here the chair is the vehicle.
4. **The elevator.** The ride down — a contained beat: doors, a floor change, a fight that finds them anyway.
5. **The gauntlet.** Many hallways, then the **cafeteria** (the hero shoots through floor-to-ceiling glass partitions; glass shatters; enemies drop behind tables and the serving counter), then the **waiting room**.
6. **Out the main entrance.** The last interior push, through the lobby and out the front doors.
7. **Steal the ambulance.** *(Original beat.)* The ambulance bay: a short playable steal or a tight cutscene-to-gameplay bridge — hero into the back, friend into the driver's seat, doors open, gone.
8. **The chase.** Fixed rear-facing camera in the moving ambulance. Friend drives, hero shoots from the bay floor (legs out in front of him, like a patient — he is NOT in the wheelchair for this beat). Marked cars, then blacked-out SUVs. Crash them all by gunfire.
9. **The train ending.** *(Original beat.)* The route crosses train tracks. The ambulance **just barely** makes it across — and the train cuts the road behind them, trapping every pursuer on the other side. End on the quiet: an empty road in the mirrors, the two of them spent. That's the game.

## Originals only — hard rule

- **Invent two new characters**: new names, new looks, new voices/lines. The wounded hero and the friend who breaks him out are yours to create — give them names and a look that is theirs.
- **Invent a fictional hospital**: your own name, signage, layout. Generic hospital dressing (posters, directory boards, gurneys, carts, waiting chairs) is fine; no real hospital branding.
- **NO GTA anything**: no Jason, no Lucia, no likenesses of them or of any real person, no GTA HUD (no GTA-style minimap, no cash/ammo counter layout, no wanted stars), no GTA objective-text styling, no Rockstar assets, names, or logos. The reference clips are a design study — the moment anything on screen reads as "GTA," it has failed this rule.
- What IS being replicated: the rail-camera design, the two-character role rotation, the beat structure, the feel. Design is not IP. Everything visible is original.

## Controls — mobile-first, portrait 390×844

Design and judge at **390×844 portrait**. Desktop keys may mirror, but the phone is the target.

- **Rail segments (the default):**
  - **Drag anywhere to aim** — the reticle (small thin circle; red ✕ hitmarker on a hit) follows the drag.
  - **FIRE: one big round button, bottom-right**, thumb-sized, HTML UI at **z-index ≥ 1100**. Hold or tap — your call, but it must feel instant.
  - **Reload: a contextual button** that appears only when the magazine is empty or low — never a permanent second button cluttering the rail view.
  - No joystick, no movement input, nothing else. If the player has to think about controls during a rail segment, the segment is wrong.
- **The free on-foot section (the friend):** the **gamepress gptouch standard** — floating joystick anchoring under the thumb anywhere on the **left half**, circular action buttons **bottom-right** (fire primary), PointerEvent pointerId isolation, `getInput()` merged with keyboard. Never a fixed or custom pad.
- **Everywhere:** block double-tap zoom and browser gestures (`touch-action: none` and friends). HTML UI at z-index ≥ 1100. Any audio uses the iOS unlock chain: `navigator.audioSession.type = 'playback'`, a silent-buffer unlock inside the first gesture, resume on every pointerdown/touchend and on visibilitychange.

## Tech — one file, shared three.js

- **Deliverable: one single self-contained HTML file** at `games/hospital-escape/index.html`. Everything in the file except three.js (next line).
- **three.js comes ONLY from the pinned CDN** — `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` — or from the one shared in-repo copy if you point at an existing shared path. **Never inline or bundle your own private copy of three.js into the file.** This is a standing house rule across every game in the repo: CDN or shared, never a per-game copy.
- **Expose a `window.__dbg` state hook** (current beat, camera/segment state, hero health, ammo, enemies alive, a way to jump to a beat) so the build can be verified automatically. This is required, not optional — verification drives the game through it.
- No other external requests at runtime. No build step. The file opens and plays.

## Art direction

- **Stylized 3D — not photoreal.** The reference is photoreal because it's modded GTA; ours must read clearly at phone size instead: clean shapes, clear silhouettes, readable enemies, deliberate color. If a figure can't be told from the background at 390 px wide, it's wrong.
- **The hospital:** dim fluorescent interior — desaturated greens/whites, flicker where it helps, night outside the glass. Dress it: handrails, health posters, a nurses' station, directory boards, gurneys, carts, waiting chairs, signage.
- **Damage language (from the reference, make it ours):** taking damage = **red edge vignette**; near death = the whole frame washes **sickly yellow-green**. The hero's injury should be felt in the image — vignette, slight edge blur — without ever hiding the targets.
- **HUD discipline:** during rail segments, **almost nothing** — the reticle and subtitles, that's it. No minimap, no counters. (Ammo, when it must show, shows on the reload prompt.) The free section may carry a light HUD of our own design — still not GTA's.
- **Dialogue:** short subtitle lines, bottom-center, our own styling. Cutscene beats bookend segments — the visit, the transfer, the wound getting worse — but keep them tight; roughly a third of the reference is cutscene and that's the ceiling, not the target.

## Step one scope — explicit

- **Build the OPENING, playable end to end:**
  1. **The hospital room visit** (beat 1) — the room, the bed, the friend entering, the discharge argument, the decision to run.
  2. **The bed push down the first hall** (beat 2) — the bed as the vehicle on rails; the first pursuers appear; the hero fires from the bed.
  3. **The transfer to the wheelchair** (beat 3) — the swap beat, played or tightly staged.
  4. **The first rail-shooting corridor** — the chair rolling on its path, camera at seated height, the player aiming and shooting through a real corridor fight. **End step one here**, on a clean beat (a held corridor, a door closing, a breath).
- **Stub the full structure in the file:** a comment/roadmap block in the delivered HTML naming all 9 beats and which segment type each is (rail / free / holdout / chase), so the full build's skeleton is visible in the code even though only the opening is playable.
- **Do NOT build** beats 4–9 yet (elevator, cafeteria, waiting room, entrance, theft, chase, train). Do not build menus, settings, or an end screen beyond what the opening needs. If it isn't the opening, it isn't step one.
- **Sample first.** This step is a direction check, exactly like the Game Night room study was: Cherie plays the opening, judges the feel — above all whether the rail camera + aim/shoot reads right — and approves before anyone builds the rest.

## Response file — required

Write **`games/hospital-escape/tasking/responses/neon-step1.md`** with:

- What you built, beat by beat, against the step one scope above.
- The **exact file size** of the delivered `index.html`.
- How each requirement was met, one line each: single file · three.js from the pinned CDN (or shared copy) — never inlined · `window.__dbg` hook present · rail camera (player aims + shoots only) · drag-aim + big FIRE button (z-index ≥ 1100) · iOS audio unlock chain · double-tap zoom blocked · originals only (new character names + fictional hospital named in the response) · 9-beat roadmap stubbed in the file.
- Screenshots at 390×844: the room visit, the bed push mid-hall, the wheelchair corridor fight. Honest captures of the delivered page.

**Report conservatively.** Your screenshots, sizes, and claims will be re-measured against the delivered page — they have been before, and mismatches get found. Claim only what the page itself shows, at phone size, and measure the file you actually shipped.

## References

The reference material lives **in this repo**, in this tasking folder — pull it from here:

- **`refs/source.mp4`** — Part 1: the hospital escape (2:59). The wheelchair ride, the cafeteria fight, the free on-foot section, the holdout.
- **`refs/source2.mp4`** — Part 2: the ambulance chase (0:29). Rear-facing camera in the moving ambulance, pursuers crashed by gunfire.
- **`refs/description.md`** — the full frame-by-frame analysis of both clips: the cast and role rotation, beat-by-beat breakdowns, the camera design, HUD notes, and Cherie's 9-beat replica structure (also written out in this brief).

The same clips on YouTube, if you want them there:

- Part 1 (hospital escape): https://youtube.com/shorts/Ic-x766nG-M
- Part 2 (ambulance chase): https://youtube.com/shorts/D8enZhZsYgE

The design is the reference. The IP is not.

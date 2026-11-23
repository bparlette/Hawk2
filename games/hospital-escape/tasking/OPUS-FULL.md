# HOSPITAL ESCAPE — Opus Tasking: THE WHOLE GAME (Engine + Content + Beauty + Assets)

**Game:** Hospital Escape — an on-rails over-the-shoulder shooter. A wounded man can't walk; his friend wheels him out of a hospital that armed men are trying to keep him in, and the two of them shoot their way to a stolen ambulance and across the train tracks.
**Repo / path:** bparlette/Hawk2 · `games/hospital-escape/`
**Your deliverable:** the **complete, shipped game** — all 9 beats playable end-to-end at `games/hospital-escape/index.html`, built on your engine, with real environments, real characters, and the game's final look. Not a greybox, not a slice.

Cherie's direction (Nov 22, 23:39 EST), verbatim:

> "Maybe opus should take a first stab at the whole thing even beauty and assets based on what you find."

That sentence changes your lane. In `tasking/OPUS.md` you owned the engine and Neon owned the look. **For this build you own everything: engine, content, beauty, and assets.** What you find — in the reference clips, in the arcade harvest (§2), and in the audit of Neon's slice (§5) — is your design input.

## MAIN-ONLY RULE

Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after every push.

---

## 1. READ FIRST — in this order

1. `tasking/ENGINE-CONTRACT.md` — contract v1, **frozen**. It stays frozen for this build (§7).
2. `tasking/OPUS.md` — your engine brief. The engine you built under it (`games/hospital-escape/engine/`, 24/24 spec tests passing, audit-verified) is the foundation of this build, not a starting point to redo.
3. `tasking/NEON-FIX-CAMERA.md` — **§§1–8 bind this build in full**, not just Neon's slice: the over-the-shoulder framing, both heroes shooting, visible incoming fire, §7 enemy movement, §8 arcade systems. The camera numbers are in §6 of that file and repeated verbatim in §4 below.
4. `tasking/refs/description.md` — the frame-by-frame analysis of the two reference clips plus Cherie's 9-beat structure. The design is the reference; the IP is not — originals only.
5. `tasking/NEON.md` + Neon's step-one slice at `games/hospital-escape/index.html` — the cast, the dialogue, and the opening as shipped. You inherit all of it (§6).
6. The arcade harvest (§2) — read it before you build a single room.

## 2. THE ARCADE HARVEST — your visual ground truth

A reference harvest of the three arcade shooters this game mimics — **Virtua Cop** (1994), **Time Crisis** (1995), **The House of the Dead** (1996) — lives at `tasking/refs/arcade/` (index: `tasking/refs/arcade/REFERENCES.md`), with extracted gameplay frames per game and a survey of open-source rail-shooter code with licenses checked. The harvest was still being assembled when this brief was written — **check the folder and read whatever has landed before building**; if frames are still missing for a game, say so in your response and work from the ones that exist.

Rules for the harvest, same as everywhere in this project:

- **Mimic systems and feel, never art or names.** No Sega/Namco assets, sprites, characters, logos, music, or sounds in the build. The frames are for *your eyes* — framing, enemy grammar, telegraphs, pressure — not for the game's asset folder.
- Code from the harvest is usable only as its license allows (the index states each one). Anything restrictive is a link to study, not a source to copy.

## 3. THE WHOLE GAME — all 9 beats, Level 1

All 9 beats, playable start to finish in one run, on your engine, in contract order and with contract beat ids:

| # | Beat id | What happens |
|---|---------|--------------|
| 1 | `visit` | The visit — friends enter Cole's room at St. Mercer Memorial; Dr. Hale objects; the escape begins. (CUTSCENE) |
| 2 | `bed_push` | Wheel the entire BED down the first halls — the bed is the first vehicle. (RAIL_CHAIR) |
| 3 | `transfer` | Transfer Cole from bed to wheelchair, under pressure. (CUTSCENE → RAIL_CHAIR held) |
| 4 | `elevator` | The elevator ride down. (RAIL_CHAIR) |
| 5 | `gauntlet` | The gauntlet — many hallways, the **cafeteria**, the **waiting room**; includes the contract's one FREE_FOOT segment (playing as Maya). (RAIL_CHAIR + FREE_FOOT) |
| 6 | `entrance` | Out the main entrance — holdout at the doors, then the exit push. (HOLDOUT → RAIL_CHAIR) |
| 7 | `steal` | Steal the ambulance — Cole into the rear bay, Maya into the driver's seat. (CUTSCENE → AMBULANCE staging) |
| 8 | `chase` | The chase — Cole shoots from the back of the moving ambulance; pursuers escalate marked → SUV; every kill is by gunfire (tire/driver/engine components per the contract). The ambulance never rams and never turns around. (AMBULANCE) |
| 9 | `train_finale` | The train ending — narrowly cross the tracks; the train traps every surviving pursuer on the other side; end on the quiet beat. The finale must never soft-lock (contract rule). (AMBULANCE finale chain) |

Modes, data shapes, wave/pursuer shapes, component HP defaults, and the `__dbg` surface are exactly as the contract froze them. Content is data; the engine never hard-codes level content.

**This is Level 1 of a campaign.** Cherie's multi-level sketch, so nothing you build blocks it — build **Level 1 only**:

- **L1 — St. Mercer Memorial** (this build)
- L2 — Across the River (delivery van, parking garage, gas-station holdout, rising drawbridge finale)
- L3 — The Airport (terminal rails, courtesy cart, tarmac chase, plane departure finale)
- L4 — The Border Road (night highway, motel holdout, checkpoint finale)

The level pattern repeats on purpose: interior rail → holdout → vehicle chase → a finale gate that traps the pursuers. Keep level content data-driven and the cast/asset systems reusable so L2–L4 are new data and environments, not a rebuild. Do not build any part of L2–L4 now.

## 4. CAMERA — the over-the-shoulder spec (binding, verbatim)

From `tasking/NEON-FIX-CAMERA.md` §6 — the shared numbers for both lanes. Your rig already takes camera data; these are the values the shipped game must express. The camera is **over-the-shoulder, never first-person**: the heroes are in the frame, in its lower portion, in every rail beat.

All values relative to the rider (Cole) on the rail path, travel direction = forward:

| Parameter | Bed push | Wheelchair |
|---|---|---|
| Camera height above path floor | 1.55 m | 1.45 m |
| Camera height relative to rider | ~0.55 m above Cole's lying/seated eye line | ~0.45 m above Cole's seated eye line |
| Camera back distance (behind the pusher) | 1.15 m behind Maya | 1.0 m behind Maya |
| Lateral offset | 0.28 m to the rider's right (over the right shoulder) | 0.25 m to the rider's right |
| Look-at point | On the path, 6 m ahead, at 1.0 m height | On the path, 6 m ahead, at 1.0 m height |
| Heroes' share of frame height (lower frame) | 35–45% (bed + Cole + Maya) | 35–45% (chair + Cole + Maya) |
| Pusher visible | Hands on rail + upper body, head in frame when path is straight | Hands on handles + upper body, head in frame when path is straight |
| Rider visible | Torso/blanket form + head; weapon arm free to fire | Shoulders + head above chair back; weapon arm free to fire |

Invariants in both: the heroes never leave the frame in a rail beat; the pusher is never fully occluded by the bed/chair; the aim reticle and the corridor's threat zone stay in the upper-middle frame, clear of the heroes. In bed beats the player must be able to tell "that is a man lying in a hospital bed," and see part of Maya at the head of the bed, hands on the rail, pushing. In chair beats: chair back, Cole's shoulders and head, Maya's hands on the push handles, her figure behind.

The AMBULANCE rig stays the contract's fixed rear-facing rig (inside the rear bay, looking back out the open doors, generous aim arc) — and the bay interior and door frame must actually be in frame (see §5: your greybox chase shot showed neither).

## 5. BEAUTY + ASSETS — yours this time, and the bar is explicit

This build is judged on how it looks, at **390×844 phone size**, side-by-side against the harvested arcade frames. Greybox discipline does not apply here — that was the engine demo's job, and it is done.

**Environments — a hospital that reads as a hospital:**
- Room 412 is a *room*: bed, monitor, IV, door signage — visible in frame during `visit`, not a corridor with two people at the edges.
- Wards and halls with ward signage, door frames that open, nurses' stations, crash carts, waiting-room seating rows, a cafeteria that reads as a cafeteria (tables, serving counter, trays), a main entrance that reads as one (glass, doors, signage), an ambulance bay, and a street/chase environment for beats 7–9 with a readable train crossing for the finale.
- No dead ceiling band: the 35–45% empty-ceiling framing found in both prior builds is a defect (§4's framing fixes most of it; environment dressing finishes it).

**Characters — real people, distinct silhouettes:**
- Cole, Maya, Dr. Hale, enemies, bystanders: **real proportions and distinct silhouettes** — readable by outline alone at phone size (hair, clothing shape, posture, the pusher's lean, the rider's blanket form).
- **NO box-people placeholders.** The audit of Neon's slice found cube heads, dot eyes, slab torsos, enemies distinguishable only by shirt color — that look is the named anti-example for this build. Do not ship anything that reads as it.
- Your own greybox actors are likewise not shippable as-is; the audit of your demo noted prone capsules that read as rocks and a train that reads as a dark band. The train must read as a train; a downed gunman must read as a person.

**Assets:** build them in-engine (three.js geometry/materials, canvas textures, your own generated media where it helps) — originals only, no harvested game art (§2). One shared three.js, per §8. If a character or environment genuinely cannot reach the bar with in-engine assets, say exactly that in your response (§9) instead of quietly shipping the placeholder.

## 6. CAST + NEON'S SLICE — what carries over

- **Cast (locked, from Neon's slice):** **Cole Mercer** (the patient), **Maya Vance** (friend, pusher, driver), **Dr. Hale**. Setting: **St. Mercer Memorial**, Ward 4B, Room 412. Keep every name. No GTA names or IP anywhere — originals only.
- **Her dialogue carries over.** The slice's lines for the beats it covers (visit → bed push → transfer → corridor) are the game's dialogue for those beats; extend in the same voice for beats 4–9, don't rewrite hers.
- **Preserve the slice:** before you replace the entry point, move Neon's step-one build to `games/hospital-escape/step-one/` (its `index.html`, unchanged bytes — it is a standing version archive and the before-picture for your response). The full game then takes `games/hospital-escape/index.html`.
- Neon's separate camera-fix lane (NEON-FIX-CAMERA.md) may still land changes to the slice; if it does, the slice as-archived is whatever its final step-one state is, and its framing work is reference for yours — this brief's §§4–5 already contain everything it requires, so do not wait on it.

## 7. COMBAT FEEL — movement, telegraphs, pressure

Your engine's cover/rush/hold behaviors + wave director are the base. This build is the content and presentation that make them *felt*, per NEON-FIX-CAMERA.md §§2, 3, 7, 8:

- **Both heroes shoot.** Maya visibly fires from the over-shoulder view (arm, weapon, muzzle flash, recoil) in the same beats where Cole fires from the bed/chair. If only one muzzle is flashing, the beat is wrong.
- **Nobody stands still (§7).** Every enemy is corner-popping (lean/peek, fire, duck back), coming through a door and advancing, or moving at the player. Waves close distance over their course, doorways and corners as waypoints; fire intensity rises as they near. A wave that ends with every enemy at spawn distance is wrong.
- **Getting shot at, visibly (§3).** Every enemy shot has a muzzle flash; incoming fire is seen travelling and landing — tracers, sparks and impacts on the bed frame, chair frame, walls and floor near the heroes. Incoming fire is a near-constant presence in the rail fights.
- **Time Crisis telegraph (§8).** Enemy shots **that will actually hit are shown RED/glowing in flight**; shots that will miss are not red. Damage feedback (vignette; near-death yellow-green wash per the reference analysis) fires on the red shot's arrival. **Never damage from nowhere** — if HP drops, a red shot was on screen first. Note the engine audit recorded your fair-fire rule (enemies fire only inside the camera's view arc) as accepted de-facto v1 behavior; the telegraph must compose with it, and any change to that rule gets disclosed in your response.
- **Virtua Cop bystanders (§8).** Staff and patients are mixed into the fights — a nurse crossing the corridor, a patient in a doorway — never armed, never threats. Hitting one is a **penalty**: immediate, unmissable on screen. Neon's brief left the choice (score or HP) to the builder; for the shipped game, pick one, apply it everywhere, and state it in your response.
- **Precision flavor (§8).** Clean, fast hits score better than sprayed ones — a simple first-shot/accuracy bonus. Keep it simple; aiming must beat mashing.
- **House of the Dead pressure (§8).** Advancing waves per §7 above, and the branching-routes language stays open: the **elevator-vs-stairwell fork** is a later-beat application — do not build anything in Level 1 that blocks it, and do not build the fork now.

## 8. TECH + HOUSE RULES (unchanged, all binding)

- **three.js ONLY from the pinned CDN** — `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` — or the one shared in-repo copy. **Never inline or bundle a private copy.** Standing house rule.
- **Engine contract v1 stays frozen.** Beat ids, the 5 modes, data shapes, component HP field names, and the `window.__dbg` surface (`he-dbg-1`) do not change. Extensions follow the pattern your engine audit established: purely additive, validator-gated where data is involved, and **every addition disclosed in your response** — nothing silent.
- **Segment-completion rules and other de-facto v1 behaviors** from your engine build carry over as-is unless a change is disclosed the same way.
- **Touch controls (house standard):** rail/holdout/ambulance beats — drag anywhere to aim, one big round **FIRE** button bottom-right, HTML UI at **z-index ≥ 1100**, contextual RELOAD; the FREE_FOOT segment — the gamepress **gptouch** standard (floating joystick anchoring under the thumb anywhere on the left half, circular action buttons bottom-right, PointerEvent pointerId isolation, `getInput()` merged with keyboard). Never a fixed or custom pad. Block double-tap zoom and browser gestures everywhere.
- **iOS audio unlock chain:** `navigator.audioSession.type = 'playback'`, silent-buffer unlock inside the first gesture, resume on pointerdown/touchend and on visibilitychange.
- **`window.__dbg` kept working** — verification drives the game through it (beat/segment state, HP, ammo, enemies alive, beat jump, autopilot).
- **HUD discipline** per the reference analysis: minimal on rails (reticle, subtitles, FIRE); damage = red vignette, near-death = yellow-green wash; HUD appears in full only in the FREE_FOOT segment.
- Originals only, everywhere: names, art, music, sounds.

## 9. PROOFS REQUIRED BEFORE YOU CALL IT DONE

Push-then-verify is the house pattern, but these proofs must exist and be reported:

1. **Your 24 engine spec tests still pass** (`engine/tests.html` + the node validator), unweakened — if a test must change because the game build legitimately moved something, the change and its reason are disclosed in your response.
2. **Full-game autopilot run:** all 9 beats in order → **win** at the train finale, 0 page errors, driven through `__dbg` on the shipped `index.html` build (not only the greybox demo).
3. **A lose path** driven and shown (HP to 0 → lose state), 0 page errors.
4. **Honest 390×844 captures** from the shipped build, at minimum: the **bed push** (heroes in frame per §4), the **wheelchair corridor**, the **cafeteria**, the **ambulance chase** (bay interior + pursuer in frame), and the **train finale** (the train readable as a train). Captures are taken from the build you shipped, at phone size — the audit will re-capture and compare.
5. Served verification after the push: the Pages copy of `games/hospital-escape/index.html` byte-matches what you built.

## 10. RESPONSE

Write `games/hospital-escape/tasking/responses/opus-full.md` containing:

- What shipped: file inventory with exact byte sizes, commit id(s), and the live URL.
- **Before/after:** the full game against (a) your greybox demo and (b) Neon's slice — what the same beats look like now versus then, with the §9 captures as the evidence.
- The contract-as-implemented list for this build: every additive extension or interpretation, each marked disclosed (the audit will diff it against the code).
- The bystander penalty you chose (score or HP) and where it is signalled.
- The §9 proofs: test counts, the autopilot run's result, the lose path, page-error counts.
- **What you could NOT make beautiful yet, stated plainly** — any character, environment, or moment that is still below the §5 bar, named specifically. A named shortfall is acceptable; a silent one is not.
- Anything in the arcade harvest you could not use (missing frames, unusable code) and what you worked from instead.

Gemini and Sonnet are available if you want them — task them directly as you see fit; the roster is yours to use, the deliverable and the bar are yours to answer for.

*Brief written by Moth from Cherie's direction, Nov 22, 2026. Companions: `tasking/OPUS.md` + `tasking/ENGINE-CONTRACT.md` (engine lane, complete), `tasking/NEON.md` + `tasking/NEON-FIX-CAMERA.md` (slice + camera/combat direction, binding here), `tasking/refs/description.md` (reference analysis + 9-beat structure), `tasking/refs/arcade/REFERENCES.md` (arcade harvest).*

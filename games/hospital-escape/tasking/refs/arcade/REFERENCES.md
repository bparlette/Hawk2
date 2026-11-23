# Arcade Rail-Shooter Reference Archive — for Hospital Escape

Harvested 2026-11-22/23. Everything here is **study material for the builders** —
framing, enemy behaviour, and telegraph language to learn from. Nothing in this
archive ships in the game: no Sega/Namco art, names, sprites, or code. Hospital
Escape mimics *systems and feel* only, with original art and code.

Local archive root: `~/workspace/hospital-escape-refs/`
(`frames/<game>/`, `sprites/`, `code/<repo>/`, `video/`). Only this text file
is pushed to the repo; binaries and clones stay local for now.

A note on timestamps: the longplay encodes are variable-frame-rate, so the
burned-in timecodes on sampling sheets drifted from true playback position.
Every frame below was **visually verified** after extraction; the `t=` value is
the real extraction point in the downloaded video.

---

## 1. Source videos (kept in `video/`)

| File | Source | What it is |
|---|---|---|
| `virtua-cop.mp4` | https://www.youtube.com/watch?v=UEIz4FQ_Or8 | Virtua Cop (arcade, 1994) full longplay, direct feed, ~30 min |
| `time-crisis.mp4` | https://www.youtube.com/watch?v=tqL4Hi1VZrE | Time Crisis (arcade, 1995) longplay, World of Longplays, direct feed, ~22 min |
| `time-crisis-2.mp4` | https://www.youtube.com/watch?v=FR-jugkr7ZM | Time Crisis II (arcade) 2-player co-op run, both players' screens side by side, ~28 min |
| `house-of-the-dead.mp4` | https://www.youtube.com/watch?v=NzCB0mkJNbA | The House of the Dead (arcade, 1996) longplay, direct feed, ~29 min |

Provenance: gameplay footage of Sega/Namco arcade games, captured by the
uploaders above. Study/fair-use reference only — do not redistribute.

---

## 2. Frames — Virtua Cop (`frames/virtua-cop/`, 15 frames + `-390` phone-width copies)

Study these for: **enemy pop-out grammar and the red-sight telegraph.**
Virtua Cop's lock-on ring sits on the current threat; the ring turns red in
the moment before that enemy fires — the whole "fair warning" system in one
HUD element. Hospital Escape's bed/chair sections want exactly this readability.

| File | t= | What it shows / study it for |
|---|---|---|
| `vc-telegraph-tutorial-01.png` | 17s | The game's own attract-mode explainer for the red-sight rule: sight green = safe, red = that enemy is about to shoot you. The contract for our telegraph design. |
| `vc-corner-pop-01.png` | 258s | Two gunmen leaning out from behind a wooden crate, ring + red markers on them. The basic corner-pop: cover object, lean-out pose, marker timing. |
| `vc-destructible-cover-01.png` | 320s | A crate splintering apart under fire — cover that breaks, changing the fight mid-wave. |
| `vc-barrel-bullseye-01.png` | 324s | Explosive barrel chain next to an enemy, with the game's precision-shot feedback text. Environmental kills + rewarding the aimed shot. |
| `vc-bystanders-crossing-01.png` | 327s | Three civilians in light clothing sprinting across the line of fire, hands up, while the fight continues. Direct analogue for patients/staff crossing a hospital corridor — they read instantly as "do not shoot". |
| `vc-warehouse-pop-01.png` | 400s | Warehouse aisle: enemy rises between box stacks into the ring. Vertical pop-up from low cover. |
| `vc-elevated-enemy-01.png` | 402s | Enemy standing on top of a crate stack, aiming down. Height variety in spawn points (balconies, stair landings in our halls). |
| `vc-hit-impact-01.png` | 420s | Muzzle-hit impact burst on an enemy half-hidden by boxes — hit feedback that reads even when the target is mostly occluded. |
| `vc-red-sight-boss-01.png` | 512s | Boss fight: the targeting ring around the boss is fully red during his attack — the telegraph at maximum scale. Compare with the tutorial frame. |
| `vc-hold-your-fire-01.png` | 519s | A civilian stands up from behind a container as the game flashes its hold-fire warning. The near-miss bystander beat: threat shape resolves into a civilian at the last moment. |
| `vc-pillar-pop-01.png` | 1374s | Office stage: gunman leaning out from a marble pillar, red markers lit. The corridor version of the corner-pop — closest single frame to a hospital hallway fight. |
| `vc-corridor-wave-01.png` | 1378s | A whole squad visible at the far end of a corridor, advancing. Wave staging down a long sightline. |
| `vc-doorway-crouch-01.png` | 1384s | Enemy crouched in a doorway, ring on him — door-entry spawn, low profile first, rises to fire. |
| `vc-counter-cover-01.png` | 1436s | Two gunmen behind an office counter, markers red. Furniture-as-cover in an interior (nurses' station energy). |
| `vc-desk-cover-01.png` | 1500s | Two gunmen using office desks/monitors as cover, one already aiming. Desk-height cover spacing and peek timing. |

## 3. Frames — Time Crisis (`frames/time-crisis/`, 12 frames + `-390` copies)

Study these for: **the cover rhythm (WAIT/ACTION) and crisis-shot telegraphs.**
Time Crisis alternates forced cover ("WAIT!") with pop-up windows ("ACTION!");
the shots that will actually hit you are the bright ones you can see coming —
everything else is noise. That distinction is what keeps its hardest rooms fair.

| File | t= | What it shows / study it for |
|---|---|---|
| `tc-pedal-rules-01.png` | 102s | The rules card for the pedal: press to stand and shoot, release to hide and reload. Our whole duck/reload economy in one diagram. |
| `tc-wait-cover-01.png` | 246s | "WAIT!" state: player ducked behind crates while three enemies stand exposed — the information you gather while safe. |
| `tc-action-pop-01.png` | 248s | "ACTION!" state a beat later: same enemies now firing, time bonus on offer. The WAIT→ACTION snap is the core rhythm to copy. |
| `tc-corridor-pop-01.png` | 500s | Two blue-uniform gunmen swinging out from behind a stone pillar as ACTION starts. Pillar pops in a stone corridor. |
| `tc-corridor-explosion-01.png` | 512s | A corridor-filling explosion — area denial that forces a duck. Set-piece punctuation between waves. |
| `tc-gallery-cover-01.png` | 592s | Gallery fight: enemies behind an overturned table and debris, chandelier wreckage as dressing. Furniture cover + destructible set dressing. |
| `tc-aiming-tell-01.png` | 617.5s | An enemy in the dark storeroom levels his gun; the glint on the weapon is the last tell before the shot. Pre-fire tells, not just projectile colour. |
| `tc-enemy-firing-01.png` | 618s | Same enemy firing, full muzzle flash — the flash is oversized on purpose so the shooter is identifiable in a crowd. |
| `tc-projectile-intercept-01.png` | 618.5s | The incoming projectile bursts mid-air — incoming fire is a physical, shootable object, not a hitscan dice roll. |
| `tc-knife-lunge-01.png` | 637.5s | The red-gloved knife enemy mid-lunge, huge in frame, during WAIT — a melee rusher who punishes you for staying up. Our "orderly with a tray" rusher role. |
| `tc-hall-advance-01.png` | 641s | Long hall: multiple enemies advancing toward the camera between the pillars. Pressure by approach, not just by aim. |
| `tc-door-entry-01.png` | 649.5s | Doors swing open and the next room's gunman is already aiming through them. Door transitions that start hot, not empty. |

**Honest gap:** I could not isolate the textbook red crisis *bullet* mid-flight
in this playthrough — the longplayer shoots crisis shooters before their shots
travel. The telegraph is still documented here by its other half: the aiming
glint (617.5s), the oversized flash (618s), and the visible, interceptable
projectile (618.5s). The Virtua Cop set covers the red-warning language itself.

## 4. Frames — Time Crisis II (`frames/time-crisis/`, 3 frames + `-390` copies)

Study these for: **two heroes on screen at once.** This capture shows both
players' cabinets side by side — the reference for Maya-pushing/Cole-riding
beats where both characters shoot during the same wave.

| File | t= | What it shows / study it for |
|---|---|---|
| `tc2-link-play-select-01.png` | 8s | Mode select: each screen names the *other* player as your teammate (blue player / red player). Co-op framing is established before play starts. |
| `tc2-cover-asymmetry-01.png` | 198s | Left screen is in WAIT (ducked) while the right screen is up and fighting the same alley. Partners are not synchronised — one can cover while the other shoots. |
| `tc2-both-screens-action-01.png` | 204s | Both screens hot in the same alley fight; on the right screen an enemy is ringed in red — the crisis target — while the left screen shows a hit burst. Two viewpoints, one shared threat language. |

## 5. Frames — The House of the Dead (`frames/house-of-the-dead/`, 11 frames + `-390` copies)

Study these for: **relentless forward pressure and rescue stakes.** HOTD's
creatures almost never hold position — they walk, lunge, and drop onto the
camera, and civilians wander into the worst moments, with a rescue tally that
turns restraint into score.

| File | t= | What it shows / study it for |
|---|---|---|
| `hotd-armored-enemy-hit-01.png` | 120s | Armoured creature outdoors taking a hit, weapon raised. Mid-range threat that keeps coming while being shot. |
| `hotd-door-entry-01.png` | 156s | A creature emerges through the mansion's front doors at the top of the stairs — the entrance itself is the spawn point. |
| `hotd-door-ambush-01.png` | 158s | The same red double doors from inside, a small creature low at the threshold. Low-profile door spawns. |
| `hotd-door-bystander-01.png` | 163s | A civilian in a trench coat bursts out of those doors with the hold-fire warning up — doors produce friends as well as enemies; you must read before firing. |
| `hotd-lunge-at-camera-01.png` | 192s | A creature mid-lunge, filling the frame, in a bloodied room. The end-state of every HOTD approach: the enemy *arrives*. |
| `hotd-civilian-encounter-01.png` | 252s | A suited civilian gesturing in a side room mid-fight — rescues happen in the combat space, not in cutscenes. |
| `hotd-civilian-hold-fire-01.png` | 300s | Close-up of a frightened civilian with the hold-fire warning. Face-readable bystanders; panic acting sells the stakes. |
| `hotd-civilian-in-danger-01.png` | 360s | A civilian down on the floor under the hold-fire warning — the rescue window is short and visible. |
| `hotd-rescued-tally-01.png` | 366s | The chapter-end rescue tally screen: rescued faces counted, life bonus awarded. Restraint converted into score and health. |
| `hotd-doorway-hit-01.png` | 546s | A creature in a doorway/window frame takes a hit with a big spark burst. Doorway spawns + readable hit feedback. |
| `hotd-miss-shot-hud-01.png` | 566s | Rooftop fight with the game's miss feedback showing. Even misses are acknowledged by the HUD — part of its fairness feel. |

---

## 6. Sprites — not obtained (and why)

- **The Spriters Resource** (spriters-resource.com): blocked. Two attempts
  (site search and a direct game page) both returned HTTP 403 with the
  Cloudflare "Just a moment" challenge — the same wall this VM has hit before.
  No sheets downloaded; not worth further attempts from this machine.
- **Sprite Database** (spritedatabase.net): reachable and searched for both
  Virtua Cop and The House of the Dead — no sheets for either. Its catalogue is
  2D-era games; these are texture-mapped 3D arcade titles, so there is no
  sprite sheet to get. The video frames above are the sprite substitute:
  full-body enemy reads at multiple distances, which is what the builders
  actually need for silhouette/pose reference.

`sprites/` is intentionally empty.

---

## 7. Code — cloned into `code/` (permissive or unlicensed, per house rules)

All four are **original games** (no Sega/Namco code or assets) — safe to study
and borrow patterns from under the terms noted. Read each repo's own LICENSE
file before lifting anything verbatim.

### `code/buffalo-cop-toledo/` — the closest cousin
- Repo: https://github.com/GiantPandas/buffalo-cop-toledo
- License: **no LICENSE file** in the repo (checked root listing 2026-11-22).
  House rule: public code with no license file is treated as publicly
  available and usable.
- Stack: JavaScript, three.js + Vite. An original light-gun rail shooter:
  camera rides a rail through 5 levels of escalating set-pieces to a boss;
  all art procedural, all audio synthesised.
- Study: `src/systems/RailSystem.js` (rail path + pacing), `src/systems/
  CameraController.js` (look/lead behaviour on the rail), `src/systems/
  EnemyManager.js` with `src/utils/cover.js` (spawn scheduling and cover
  points — our corner-pop/door system), `src/levels/` (data-driven wave
  layout per level), `src/enemies/NPC.js` (non-combatant handling).

### `code/justice-squad/` — the no-engine three.js build
- Repo: https://github.com/milukhalidhasan/justice-squad
- License: **MIT** (LICENSE file present; GitHub's "NOASSERTION" tag is wrong —
  the file itself is the standard MIT text).
- Stack: plain HTML/CSS/JS on three.js, no build step; browser + Android,
  5 stages, 5 bosses, everything generated in code at runtime.
- Study: `js/levels.js` (stage/wave data), `js/game.js` + `js/core.js`
  (game loop and hit resolution), `js/hud.js` (arcade HUD economy), and how
  it stays shippable as loose files — relevant to our single-file builds.

### `code/meridian-line/` — modern three.js rail craft
- Repo: https://github.com/bop-del/meridian-line
- License: **MIT**.
- Stack: JavaScript, three.js (r170) + Vite. On-rails space shooter, fully
  procedural; hold-to-charge lock-on with homing volleys; phone controls
  (floating stick + big buttons) documented in its README screenshots.
- Study: `src/main.js` + `src/config.js` (rail tuning as data), the lock-on
  targeting model (an alternative telegraph: charge time as the warning),
  and its touch-control layout for our phone builds.

### `code/rail-hunter/` — Unity rail framework (pruned)
- Repo: https://github.com/Zesix/rail-hunter
- License: **Unlicense** (public domain) for the author's own project — the
  README itself carves out two exceptions: the `Packages/` folder is Unity
  Asset Store material under the Asset Store EULA, and two music tracks are
  CC-BY 4.0.
- Stack: C#/Unity, timeline-driven rails.
- Study: `Assets/Scripts/` (Controllers, Player, Weapons, UI) — timeline-as-
  wave-director structure, enemy firing-range windows, hit-flash feedback.
- **Prune note:** the local copy was reduced from ~558 MB to ~34 MB by
  deleting `Assets/Packages/`, `Assets/Prefabs/`, `Assets/Standard Assets/`,
  `Assets/TextMesh Pro/`, and `Assets/Plugins/` (third-party bundles,
  including the Asset-Store-EULA material the Unlicense does not cover).
  Scripts, scenes, and the author's own assets remain. Full repo at the URL.

## 8. Code — linked, not cloned

| Repo | License | Why link-only / what to read |
|---|---|---|
| https://github.com/jevarg/re-virtua-cop-2 | No license file | A reverse-engineering write-up of Virtua Cop 2's internals. Valuable for understanding the *original's* enemy/wave data structures, but it documents a proprietary game's guts — read it as research, do not copy from it. |
| https://github.com/sp00nznet/virtuacop | MIT (the lifter tooling) | Static recompilation of the original Virtua Cop; needs the arcade ROM and is built from Sega's binary. The MIT grant covers the tooling, not Sega's game — link only. |
| https://github.com/matiasbeckerle/doom-lgs | No license file | Node.js multiplayer light-gun shooter (Doom-themed). Interesting server/match structure for multi-gun play; theme and code both off-brief, so link only. |
| https://github.com/tanuu5/nova-lancer | MIT | Browser rail shooter in the Star Fox mould, three.js/WebGL. Flight-rail camera work is worth a look; not cloned because its free-flight model is a different problem from our corridor rails. |
| https://github.com/lunarcloud/ggj-2024-rail-shooter | MIT | Small Godot on-rails jam prototype. A quick read on minimal rail-path + spawn-trigger architecture in Godot. |
| https://github.com/PeteLaric/shooting-gallery | MIT | Tiny Processing shooting gallery — target-pop timing patterns at their simplest. Useful as a teaching example, not a base. |

---

## 9. How the builders should use this archive

- **Neon (visual slice):** VC pillar/counter/desk frames + HOTD door frames
  are the composition targets for the hospital corridors — cover objects at
  desk height, enemies leaning out, doors that open hot. TC2's side-by-side
  frames are the reference for any beat where Maya and Cole are both up.
- **Opus (engine):** the telegraph stack is three layers — VC's red sight
  (who is about to fire), TC's aiming glint + visible projectile (the shot
  itself can be dodged or intercepted), HOTD's approach pressure (distance
  as a timer). `buffalo-cop-toledo`'s EnemyManager/cover utils and
  `rail-hunter`'s timeline director are the two code reads for the wave
  system; `meridian-line` is the read for lock-on as an alternative warning.
- **Restraint scoring:** HOTD's rescue tally + VC's hold-your-fire beats are
  the model for patients/staff — bystanders as a scoring system, not decor.

# Game Night at Dave's

A WarioWare-style microgame gauntlet set at Dave's legendary retro game nights.
Dave hosts; his eight friends each throw you a microgame with deliberately
terrible retro controls; at the end, Dave reviews *your* performance and gives
it a grade. The crew — Sudz, Scott, Brent, Brian, Steve, Chris, Brad, Brendan —
each bring their own running joke, and Dave brings his sayings.

**This is the FULL build**: the complete shell plus all eight friend
microgames. (Sudden death and unlocks are not in this pass.)

One self-contained `index.html` (~92 KB). No external assets, no libraries,
**zero external requests**. All art is drawn in code (16-bit pixel style);
all audio — sound effects *and* the characters' Nintendo-style blip-talk
voices — is generated in code with WebAudio (see **Voices** below).

## How to play

Tap to start. You have **4 beers** (lives) and **8 rounds** — every friend
appears exactly once, in random order. Each round:

1. An intro card shows the friend and their famous quote — babbled in
   blip talk in that friend's own voice. The quote is your instruction.
2. The microgame plays inside the CRT for ~8 seconds. Win it for 1,000 points
   × your streak multiplier, plus a time bonus. Lose it, lose a beer.
3. Dave reacts (in blip talk). Every 4 rounds the speed goes up slightly.

After round 8 (or when the beers run out), Dave delivers **The Verdict**: a
letter grade — announced in Dave's blip talk — and a written mini-review
of you, with a share button.

### Controls — common verbs only

Every microgame uses one of three gestures anyone already knows:
**tap** (including rapid tap and tap-at-the-right-moment), **slide/drag**
to move, and **don't touch**. No circles, no multi-finger gestures, nothing
exotic.

| Friend | Game | Verb | What to do |
|---|---|---|---|
| 🩸 Sudz | Finger Burn Decathlon | **Rapid tap** | Tap fast to run. Mashing at full speed overheats the Finger Burn meter — ease off in beats to cool it. Finish before the meter fills. Keyboard: Space / ← / → taps. |
| 🍺 Scott | Sip Your Beer Tennis | **Don't touch** | Hands off — the opponent double-faults himself to death. Tap the beer mug on the couch armrest (or press **B**) when he tosses the serve for style points. Touching anything else makes you lunge and lose. |
| 🏈 Brent | The 80-Yard Kick | **Hold + release** | Press and hold anywhere (or hold SPACE / the mouse button), then release when the needle crosses the green. Don't release while Brian is standing in the lane… or do. Comedy counts. |
| 🤕 Brian | Ball Grab Pachinko | **Slide** | Slide your basket along the rail to block the little green thief before he darts to the stash. Keep at least 1 of 3 balls until time runs out. Keyboard: ← / →. |
| 📺 Steve | Beer-Friendly Maze | **Tap** | The maze generates at agonizing retro speed. The crew's mugs drain while you wait — tap a mug to refill it before it sits empty for 3 seconds. Keyboard: 1–5. |
| 🏎️ Chris | Ram It Loop | **Tap** | The music video must never end: tap the REPLAY button as it enters the glowing window at the end of the loop bar. Let it run out and you get one second of raw game audio — that's a loss. Keyboard: Space / R. |
| 🕹️ Brad | Paddle Master | **Slide** | Drag (or ← / →) to move the paddle; it fires on its own. Blast the demons, spare the diamonds — a shot diamond *becomes* a demon. Clear the wave and Brad may not let the round end. |
| 🦖 Brendan | Price Check | **Slide + tap** | A terrible game box appears. Slide the price dial to what Dave paid, then tap LOCK IT IN (or Enter). Within $5 wins. Keyboard: ← / → by $1, ↑ / ↓ by $5. |

Mute button is top-right (it silences the voices too). Best score and grade
are saved on the device.

### Desktop parity

Every verb maps 1:1 to keyboard + mouse, and every intro card prints both
the touch hint and the desktop hint:

- **Rapid tap** (Sudz) → mash **SPACE** or click rapidly.
- **Slide** (Brad, Brian) → move the mouse with no button held (Pong-style),
  or **←/→** / **A/D**.
- **Tap targets** (Steve's mugs, Chris's REPLAY) → mouse click; REPLAY also
  takes **SPACE**, mugs also take **1–5**.
- **Hold + release** (Brent) → hold and release **SPACE** or the mouse button.
- **Price dial** (Brendan) → mouse drag, or **←/→** ($1), **↑/↓** ($5),
  **ENTER** to lock.
- **Scott** → nothing, on every platform, by design.
- Shell: click or **ENTER/SPACE** starts the run, skips intro/reaction
  cards, and plays again from the Verdict.

### Embedding (e.g. on Dave's website)

The file is embed-ready: one self-contained HTML, **zero external
requests** (no CDN, fonts, or images — everything is inline). Dropped into
an iframe it letterboxes to any container size without overflowing, takes
keyboard focus on the player's first click/tap (and never traps the host
page's scroll before that), and starts no audio until the first
interaction. Verified with the game iframed in a plain host page at desktop
and phone sizes, driven by real mouse + keyboard input.

## Pacing

Rounds run ~8 seconds at base speed (7.5 s in the back half). The speed ramp
is gentle: ×1.08 after round 4, capped at ×1.16. Internal meters, needle
speeds, thief speeds and drain rates are all tuned to that calmer base.

## Era authenticity — every CRT is true to its source system

Each microgame's screen is styled from a **real screenshot of the actual
source game** — never from memory. The reference images live in the repo
at `~/workspace/game-night-at-daves/refs/` and are listed per game below,
so any screen can be checked against the real thing.

| Friend | Source game / system | What the screen takes from the reference | Ref file |
|---|---|---|---|
| Sudz | Decathlon (the crew's Intellivision-era copy; ref is the period Activision original) | Sunset-gradient sky, dotted crowd band, green field, **blue running track**, pink distance meter, chunky white distance digits | `decathlon-intellivision.jpg` |
| Scott | Quattro Sports — Pro Tennis Simulator (NES) | **Clay** red-brown court, white lines, dark net, dark-green surround, lavender scoreboard tower with black P1/P2 score panels | `quattro-sports-nes.jpg` |
| Brent | Football (Atari 2600) | Blue surround, green field with horizontal mowing stripes | `football-2600.jpg` |
| Brian | K.C. Munchkin (Odyssey²) | Black field, **magenta** maze geometry (the pachinko pegs), the thief in K.C. green | `kc-munchkin-odyssey2.jpg` |
| Steve | Amazing Maze (Bally Astrocade; the cartridge ports Midway's 1976 arcade maze) | Cream line maze on a black field, bright Astrocade-blue frame | `amazing-maze-midway-ref.jpg` |
| Chris | Ram It (Atari 2600) | Brown top/bottom barrier bars, **TIA rainbow color-block columns** at both edges (they flash during the exposure), purple score digits | `ram-it-2600.png` |
| Brad | Demons to Diamonds (Atari 2600) | **Green horizontal lanes**, blue top/bottom bars, lavender side borders with tick marks, wide crab demons in TIA colors, the little orange-and-blue cannon on its black strip | `demons-to-diamonds-2600.png` |
| Brendan | Squeeze Box (Atari 2600) | The Squeeze Box item's box wears the prisoner's orange/white stripes from the game | `squeeze-box-2600-b.jpg` |

All sound effects are period chip style (square / triangle / noise via
WebAudio — TIA and 2A03 in spirit), no samples. Nerd details in the room:
the CRT bezel carries a "TRONICOLOR" badge, a red power LED and two
difficulty switches with **B lit gold** (the house rule), the coffee
table has woodgrain, and the top cartridge on the shelf stack wears a
white paper label. CRTs keep correct 4:3 framing inside the shell.

## Site harmony — the shell matches videogamecritic.com

The game may live on Dave's own site, so the presentation layer (title,
cards, HUD, the Verdict, menus) is styled from **videogamecritic.com's
own stylesheets** (fetched 2026-11-22: `css/vgc2.css`, `css/rev.css`,
`css/main2.css`, `css/header.css`) — the CRT microgame screens stay true
to their source systems (above); only the shell harmonizes:

| Site element (his CSS) | Value | Where the game echoes it |
|---|---|---|
| Page background | black `#000000` + starfield image | Page/starfield backdrop around the canvas |
| Body / review text | Verdana, white `#FFFFFF`, line-height 24px | Card and Verdict body text (readable sans, left-aligned) |
| Links | light green `#90ee90`, no underline | Hints, bylines, accents, the masthead link |
| Panels / nav | navy `#000080` | Card panels, Verdict header bar, buttons |
| Review header (`.hd`/`.hdr`) | black bar, `#dddddd` text, title left, **"Grade: X" right** | The Verdict header: "THE VERDICT" left, "Grade: A+" right |
| Highlight block | `#1b213f` with white text | SHARE button |
| Accent gradient | `#00adee` → `#90ee90` | Button accents |

A slim masthead bar above the game reads **"presented by
[videogamecritic.com](https://videogamecritic.com)"** in the site's own
manner (Verdana, link-green, no underline) — a working link
(`target="_blank"`, `rel="noopener"`, so it behaves inside an iframe
embed too). The title screen's CRT also carries the credit line.

## Voices — blip talk

There are **no voice recordings and no speech synthesis**. Every scripted
line is "spoken" as **blip talk** — Nintendo voice babble in the style of
Animal Crossing's Animalese, Banjo-Kazooie's chatter and Mario Party
character talk: one short pitched blip per **syllable**, at natural speech
cadence, synced to the card's text reveal. The babble inflects like
speech: pitch **rises** at a question, **dips** at a sentence end,
phrase ends sag slightly, ALL-CAPS words jump up for emphasis, and each
syllable's pitch jitters deterministically so no two lines sound looped.
Blips are plain WebAudio oscillators routed through the same master bus
as the sound effects, so the mute toggle silences them, and the iOS
unlock chain (first tap = PRESS START) covers startup. Dave's grade
announcement at the Verdict gets the same treatment in his profile,
followed by one of his sayings for the grade band.

Each of the 9 characters has a distinct blip-talk profile — **this table
is the canonical voice map for all module lanes**:

| Character | Base pitch | Rate | Waveform | Wobble |
|---|---|---|---|---|
| Dave (host) | 110 Hz | 0.85× | square | ±1% |
| Sudz | 230 Hz | 1.55× | square | ±3% |
| Scott | 150 Hz | 0.95× | triangle | 0% (dry/flat) |
| Brent | 132 Hz | 1.05× | square | ±1.5% |
| Brian | 196 Hz | 1.15× | triangle | ±2.5% |
| Steve | 165 Hz | 1.00× | sawtooth | ±1% |
| Chris | 140 Hz | 1.25× | square | ±1.5% |
| Brad | 175 Hz | 1.35× | triangle | ±2% |
| Brendan | 118 Hz | 0.90× | sawtooth | ±1.5% |

Dave is low and deliberate; Sudz is high and fast; Scott is flat with no
wobble at all. One syllable blip runs ≈ 78 ms at 1.00× rate, and a line's
babble is capped at ~4.2 s so a long card never talks over the next one.

## Readability

The chunky display font is used only for headings, the grade letter and
short labels. All long-form text — the Verdict body, intro-card quotes,
reaction-card text — is set in a clean system sans, left-aligned, with
generous line-height. The Verdict stats block is positioned from the
*measured* height of the review text, so the two can never overlap at any
grade or review length.

## How it works

- **Shell / module contract.** The shell owns the state machine
  (TITLE → INTRO → PLAY → REACT → … → REVIEW), the beer-glass timer, lives,
  speed ramp, scoring and streaks. Each microgame is a module in `MODULES`
  with `{ id, friend, verb, quoteIntro, create(shell) }`. `create` returns a
  state object implementing `update(dt, input)`, `render()`, and optionally
  `onTap(x, y)`, `onKey(code)`, `onTimeout()`, `holdTimer()`,
  `renderOverlay()`, `debug()`, and `onEnd()`. A module ends its round by
  setting `state` to `"won"` / `"lost"` and filling `result` with
  `{ card: {headline, sub, attrib}, bonus, comedy, cardT, voice }` — `voice`
  is the id of the spoken line to play over the reaction card. The shell
  never knows what a microgame *is* — new friends drop in as new modules.
- **The room.** The title screen is one stitched room from Cherie's
  game-night photos: shelf walls of game cases on both sides, the big TV and
  the CRT side by side, the giant dual-stick controller rig on the coffee
  table, the beige recliner row with a ball-top arcade stick on a lap, a
  poster collage between the shelves, and a helmet resting on the couch arm.
  The crew are generic color-coded pixel archetypes — no likenesses. There
  are **no faces at all**: the crew are seen from behind, backs of heads in
  the recliners, over-the-shoulder toward the screens, identified by shirt
  color, hair silhouette, and icon badge; the cards lean on the badge and
  the quote text. All eight friends now sit on the couch.
  Microgames play inside the CRT, each styled after its source system's era.
- **Audio.** Procedural WebAudio sound effects: chiptune menu loop, per-game
  signature bleeps, win/lose jingles. Voices are code-generated blip talk
  (above) — no audio assets of any kind.
  iOS unlock chain included (`audioSession` playback mode, silent-buffer
  unlock, resume on gesture).
- **Determinism / testing hooks.** `?seed=N` fixes the friend order and RNG.
  `window.__dbg` exposes run state (`state`, `round`, `timer`, `timeTotal`,
  `speed`, `score`, `beers`, `game`, `gameState`, `results`, `review`) plus
  scripted input helpers (`tap`, `pointer`, `moveTo`, `key`) used by the
  headless verification harness. Modules expose internals via `debug()`.

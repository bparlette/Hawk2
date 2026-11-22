# Game Night at Dave's

A WarioWare-style microgame gauntlet set at Dave's legendary retro game nights.
Dave hosts; his friends each throw you a 6-second microgame with deliberately
terrible retro controls; at the end, Dave reviews *your* performance and gives
it a grade. The crew — Sudz, Scott, Brent, Brian, Brad, Brendan — each
bring their own running joke, and Dave brings his sayings.

**This is the SAMPLE build**: the complete shell plus four microgames
(Sudz, Scott, Brent, Brad). The remaining friends, sudden death, and unlocks
come in the full build. Design doc: `DESIGN.md` in the project repo notes.

One self-contained `index.html`. No external assets, no libraries. All art is
drawn in code (16-bit pixel style); all audio is procedural WebAudio.

## How to play

Tap to start. You have **4 beers** (lives) and **8 rounds**. Each round:

1. An intro card shows the friend and their famous quote — that quote is your
   instruction.
2. The microgame plays inside the CRT for ~6 seconds. Win it for 1,000 points
   × your streak multiplier, plus a time bonus. Lose it, lose a beer.
3. Dave reacts. Every 4 rounds the speed goes up.

After round 8 (or when the beers run out), Dave delivers **The Verdict**: a
letter grade and a written mini-review of you, with a share button.

### The four sample microgames

| Friend | Game | What to do |
|---|---|---|
| 🩸 Sudz | Finger Burn Decathlon | **Rub** in big circles to run. Rubbing in one tight spot fills the Finger Burn meter — vary the circle. Keyboard: alternate ← / →. |
| 🍺 Scott | Sip Your Beer Tennis | **Don't touch** the game — the opponent double-faults himself to death. Tap the beer mug on the couch armrest (or press **B**) when he tosses the serve for style points. Touching anything else makes you lunge and lose. |
| 🏈 Brent | The 80-Yard Kick | **Tap** (or Space) to kick when the needle crosses the green. Don't release while Brian is standing in the lane… or do. Comedy counts. |
| 🕹️ Brad | Paddle Master | **Drag** (or ← / →) to move the paddle; it fires on its own. Blast the demons, spare the diamonds — a shot diamond *becomes* a demon. Clear the wave and Brad may not let the round end. |

Mute button is top-right. Best score and grade are saved on the device.

## How it works

- **Shell / module contract.** The shell owns the state machine
  (TITLE → INTRO → PLAY → REACT → … → REVIEW), the beer-glass timer, lives,
  speed ramp, scoring and streaks. Each microgame is a module in `MODULES`
  with `{ id, friend, verb, quoteIntro, create(shell) }`. `create` returns a
  state object implementing `update(dt, input)`, `render()`, and optionally
  `onTap(x, y)`, `onKey(code)`, `onTimeout()`, `holdTimer()`,
  `renderOverlay()`, and `onEnd()`. A module ends its round by setting
  `state` to `"won"` / `"lost"` and filling `result` with
  `{ card: {headline, sub, attrib}, bonus, comedy, shout, cardT }`.
  The shell never knows what a microgame *is* — new friends drop in as new
  modules.
- **The room.** The title screen is one stitched room from Cherie's
  game-night photos: shelf walls of game cases on both sides, the big TV and
  the CRT side by side, the giant dual-stick controller rig on the coffee
  table, the beige recliner row with a ball-top arcade stick on a lap, a
  poster collage between the shelves, and a helmet resting on the couch arm.
  The crew are generic color-coded pixel archetypes — no likenesses. Per the
  final art direction there are **no faces at all**: the crew are seen from
  behind, backs of heads in the recliners, over-the-shoulder toward the
  screens, identified by shirt color, hair silhouette, and icon badge; the
  cards lean on the badge and the quote text.
  Microgames play inside the CRT, each styled after its source system's era.
- **Audio.** Procedural WebAudio only: chiptune menu loop, per-game signature
  bleeps, win/lose jingles, a distant shout synth. iOS unlock chain included
  (`audioSession` playback mode, silent-buffer unlock, resume on gesture).
- **Determinism / testing hooks.** `?seed=N` fixes the friend order and RNG.
  `window.__dbg` exposes run state (`state`, `round`, `timer`, `score`,
  `beers`, `game`, `gameState`, `results`, `review`) plus scripted input
  helpers (`tap`, `pointer`, `moveTo`, `key`) used by the headless
  verification harness.

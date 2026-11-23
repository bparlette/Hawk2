# GAME NIGHT AT DAVE'S — Neon Tasking: STEP ONE — Rethink the Room Homepage

**Game:** Game Night at Dave's — a WarioWare-style microgame gauntlet set at Dave's retro game nights.
**Repo / path:** bparlette/Hawk2 · `games/game-night-at-daves/`
**Live build:** https://bparlette.github.io/Hawk2/games/game-night-at-daves/
**Your job:** STEP ONE ONLY — redesign the room homepage / title view. Show us how YOU would do Dave's room. Nothing else is in scope (see "Step one scope" below).

## MAIN-ONLY RULE
Work in **main**, commit to main, no branches, ever. Batch pushes. Re-check the main tip immediately before every push (other lanes push to this repo constantly) and read back byte size + markers after.

## What the game is

Dave is **The Video Game Critic** (videogamecritic.com). His real-life game nights — eight friends, a legendary retro game room, and Dave reviewing everything — were catalogued in an email from Brad, and this game is that email turned into a microgame gauntlet. Dave has blessed the material ("This stuff is solid gold. I will need to share with my readers!").

- **Fantasy:** you are the new friend invited to game night. Survive the crew, earn the grade.
- **Tone:** affectionate parody. Everyone is roasted, nobody is mean. The jokes are the crew's own quotes and antics.
- **A run:** title screen (Dave's room) → **8 friend microgames** in random order → **sudden death** → **Dave's Review** end screen. Lives are 4 beers; lose a microgame, lose a beer. The game speeds up as you go (sudden death runs at 1.6×).
- **The 8 microgames** (each ≈6 seconds, one verb, deliberately terrible retro controls — the comedy is that every round controls differently, announced only by the friend's quote):
  1. **Sudz — Finger Burn Decathlon:** RUB in circles to run his Intellivision decathlon man; rub one spot too long and the Finger Burn meter ends you.
  2. **Scott — Sip Your Beer Tennis:** DON'T TOUCH. The opponent double-faults himself to death; touching the controller makes you lunge and lose. Sipping your beer at the right moment is the only move.
  3. **Brent — The 80-Yard Kick:** AIM + RELEASE a field-goal kick while Brian wanders across the kick line.
  4. **Brian — Ball Grab Pachinko:** GUARD — drag a shield to stop the little green thief stealing your balls (Odyssey 2).
  5. **Steve — Beer-Friendly Maze:** WAIT + SERVE — a maze generates at agonizing retro speed; keep everyone's beer mug filled while you wait.
  6. **Chris — Ram It Loop:** KEEP THE LOOP ALIVE — keep a music video looping so nobody hears the game's awful synthesized audio raw.
  7. **Brad — Paddle Master:** PADDLE — Demons to Diamonds rules: blast demons, spare diamonds (a shot diamond becomes a demon). Brad may shout "Just two more times!" and refuse to let the round end.
  8. **Brendan — How Much Did You Pay For This?:** PRICE — guess what Dave paid for a terrible game box, within $5.
- **Sudden death:** one of Dave's most-hated games (Squeeze Box, Karate, White Men Can't Jump) at 1.6× speed.
- **Dave's Favorites shelf:** unlockable bonus rounds themed on Dave's favorite games — Warlords, Hydro Thunder, River Raid.
- **Hidden Jekyll round:** a secret 9th round (Dr. Jekyll and Mr. Hyde corridor) that ends with Dave struck by lightning.
- **Dave's Review (end screen):** Dave grades your night A+…F- and generates a written mini-review of YOU, formatted like one of his review cards. This card is the shareable screenshot moment.
- **The shell** is styled after Dave's own site, videogamecritic.com: black starfield, navy `#000080`, link-green `#90ee90`, and a "presented by videogamecritic.com" masthead. Any homepage you build keeps that shell identity.
- **Settled — not your concern, do not touch:** all voices are a single Robot Butler voice for every character; the Star Fox-style comm window uses screenshot-crop heads; the portrait art is final. Your step one is the room view only.

## The room — what it is supposed to be

The title screen IS Dave's real game room, drawn from Cherie's three photos of an actual game night. The photos are in this tasking folder and are your primary reference — build to them:

- **`refs/room-1-shelves-and-recliners.jpg`** — the wide layout: floor-to-ceiling black shelf walls packed with game cases on BOTH sides of the room, and the beige recliner row in front of them. Note the recliners themselves: deep plush segmented cushions, high backs with headrest rolls, wide padded armrests with cup holders (drinks sitting in them), people sunk deep with legs stretched out.
- **`refs/room-2-tv-wall-and-rig.jpg`** — the screen wall: the big flat TV and a CRT side by side, stacks of consoles and gear underneath, the giant dual-stick controller rig (Steel Battalion) on the coffee table, a helmet resting on the couch arm, shelf wall behind.
- **`refs/room-3-recliners-and-poster-wall.jpg`** — the recliner row from the other side: the ball-top arcade stick box sitting on a lap, a poster collage wall between the shelf walls, the door at the back. Again: those armrests are wide, the cushions are deep, nobody is sitting ON those chairs — they are sunk INTO them.
- **`refs/current-title-v2.png`** — Moth's current title screen. This is what you are beating (see the failure note below).

**Composition (locked):** we see the room from BEHIND the crew — over their shoulders toward the two TVs. Top to bottom: the "presented by videogamecritic.com" masthead, the shelf walls and poster collage, the big TV + CRT side by side (the big TV shows the game title), the coffee table with the dual-stick rig, and the recliner row filling the lower frame. **Portrait, phone-first: design for 390×844 and judge everything at that size.** The art style is the current build's 16-bit pixel art — chunky, readable, warm living-room palette with CRT glow. Keep the style; fix the chairs.

## The crew rule — locked, do not relitigate

- **Backs of heads only. NO FACES anywhere in this view** — not on the crew, not on Dave, no front-facing figure at all.
- **Everyone sits in a movie-theater-style reclining chair**, reclined, with just the **back of the head and hair showing over the chair back** and a sliver of shoulders sunk below it. Arms rest on the armrests; a controller in the hands at the side is fine. No legs standing, no full bodies, nothing perched on top of the chairs.
- **Seating order, left to right:** Sudz · Scott · Brent · Brian · Steve · Chris · Brad · Brendan · **Dave at the right end of the row** (back view, silver hair, his grade book on his armrest).
- Tell them apart by hair + shirt sliver only:
  - Sudz — light-brown neat crop · red shirt
  - Scott — dark cap · amber shirt
  - Brent — silver full hair · green shirt
  - Brian — dark cap · bandage-white shirt
  - Steve — dark brown full wave · blue shirt
  - Chris — buzz cut · teal shirt
  - Brad — light auburn crop · bright blue shirt
  - Brendan — long dark hair falling past the shoulders · purple shirt
  - Dave — silver sweep · host, grade book on the armrest
- Steve and Brad must NOT read as duplicates (dark hair/deep blue vs auburn/bright blue — keep them clearly apart).

## The failure you are here to beat

Moth has drawn this row twice. Both times the chairs came out as **flat beige boxes** — uniform rectangles with seam lines that read as a bench, a slab, or a row of cartons. The heads sit ON the boxes instead of sinking into cushions. Cherie's verdict on the latest: *"they don't look like recliners."*

The rethink has to make them **unmistakably recliners at phone size, in one glance**:

- **Recline:** the chair backs lean back; the sitters lean WITH them. Nothing sits bolt upright.
- **Depth:** deep plush cushions with real sink — a head nestles INTO the headrest, it doesn't perch above a rectangle. Plump side bolsters, rolled headrests, cushion segments that bulge, not just seams drawn on a flat slab.
- **Footrests / extension:** recliners extend — show the raised footrest or the stretched-out lower chair under at least some seats, the way the photos show legs stretched out in front.
- **Armrests with cup holders:** wide padded armrests between every seat, cup-holder rings, a drink in at least one or two (a beer can, a red cup — both are in the photos).
- **Weight:** people have weight in these chairs — shoulders below the chair-back line, arms draped on the armrests, the whole row reading as nine guys melted into furniture watching TV.

Look at the photos again before you draw: in the photos the recliners are the biggest, softest shapes in the room. Match that feeling in pixel art.

## Step one scope — explicit

- **Redesign ONLY the room homepage / title view.** One view. This is a direction check: Cherie judges your room, then decides the next step.
- **Deliverable:** your improved title view as a standalone playable page committed to Hawk2 main at **`games/game-night-at-daves/neon-room/`** (a NEW folder — do **not** overwrite or edit the live game at `games/game-night-at-daves/index.html`). The page shows your room homepage with the masthead, the title on the big TV, the crew row, and a working TAP TO START (on tap it may simply flash/acknowledge — the run itself is not step one; a small "STEP ONE — ROOM STUDY" note on the page is honest and fine).
- **Do NOT** build or redo any microgame, the sudden-death round, the favorites shelf, the Jekyll round, the review screen, voices, the comm window, or portraits. If it isn't the room homepage, it isn't step one.
- **Response file:** `games/game-night-at-daves/tasking/responses/neon-room-step1.md` with (a) a full title-view screenshot at 390×844, (b) a close-up of the recliner row, (c) 3–5 sentences on what you changed and why the chairs read as recliners now. Cherie decides from those screenshots — make them count, and make them honest captures of the delivered page.
- **Touch standard (gamepress TOUCH.md):** the title screen is tap-to-start — keep the tap target clean (a full-screen start tap is fine), any HTML UI sits at z-index ≥ 1100, double-tap zoom and browser gestures are blocked, and if you add any audio, the iOS unlock chain applies (`audioSession.type='playback'`, silent-buffer unlock on first gesture, resume on pointerdown). No joystick — this is not a movement game.
- **Report conservatively.** Your screenshots and claims will be re-checked against the delivered page. Claim only what the page itself shows, at phone size.

## References in this folder

- `refs/room-1-shelves-and-recliners.jpg` — original photo: shelf walls + recliner row (wide layout)
- `refs/room-2-tv-wall-and-rig.jpg` — original photo: big TV + CRT, console stacks, dual-stick rig, helmet
- `refs/room-3-recliners-and-poster-wall.jpg` — original photo: recliner row, ball-top stick on a lap, poster collage
- `refs/current-title-v2.png` — Moth's current title screen (the one that doesn't look like recliners — beat it)

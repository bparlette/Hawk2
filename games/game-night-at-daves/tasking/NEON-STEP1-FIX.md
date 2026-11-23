# NEON — STEP ONE CORRECTIVE: Make the Recline Read

**Work in `main` on bparlette/Hawk2. No branches, ever.**

## What you are fixing

Your Step One room study — the standalone page at `games/game-night-at-daves/neon-room/`.
Update that same page **in place**. The live game (`games/game-night-at-daves/index.html`)
stays untouched.

The room itself is good and is approved as-is. This corrective is about one thing only:
**the recliner row's geometry.**

## The problem

Moth viewed your full 390×844 capture and your recliner close-up directly. Two failures:

1. **The chair backs stand upright.** The row reads as ordinary theater seats, not
   recliners. Nothing in the silhouette says "leaned back."
2. **The kicked-out legs are drawn sticking straight UP over the headrests.** Five crew
   members look like their legs are in the air. From directly behind a recliner, the
   sitter's legs and the footrest are on the far (TV) side of the chair back and are
   hidden by it — they are never visible above the chair.

## The fixes

### 1. Legs down and hidden

Remove every leg, foot, and sock drawn above or behind a headrest. Nothing sticks up
over the row. If a footrest or a pair of feet is visible at all, it is only under fix 2(b)
below — low, on the TV side, never above a chair back.

### 2. Make the recline read

a) **Draw each chair back as a leaning wedge.** Thicker at the base, the top tipped
   back, the headrest roll visibly tipped with it. The back's silhouette must *tilt* —
   a vertical back is a failed chair, no matter how much cushion detail it carries.

b) **Raise the camera slightly.** Move to a gentle high-behind angle, looking a little
   down at the row, so the seat cushions and the raised footrest pads show on the TV
   side of the chairs, low in the frame. Feet may rest on those pads, visible
   beyond/below the chair backs — never above them.

c) **Give the two end chairs a side profile.** Sudz (far left) and Dave (far right)
   should show a visible side-profile wedge: tall back sloping down toward the raised
   footrest. That side silhouette is the strongest recline cue in the whole row — spend
   the pixels there.

### 3. Keep everything that worked

Do not regress any of this:

- The room layout from Cherie's photos: shelf walls on both sides, big TV + silver CRT,
  console rack, poster collage wall, PlayStation `△○×□` light.
- The Steel Battalion dual-stick rig, grey helmet, and blue ball-top arcade stick on the
  coffee table **in front of** the recliners.
- Cup-holder armrests with the glass, yellow beer can, white remote, and red cup.
- Dave's red grade book on his right armrest.
- Crew order, left to right: **Sudz · Scott · Brent · Brian · Steve · Chris · Brad ·
  Brendan · Dave** — backs of heads only, **zero faces**.
- Hair and shirt distinctions: Steve's dark-brown wave + deep navy stays clearly
  distinct from Brad's auburn crop + bright blue; Brendan's long dark hair past the
  shoulders.

## Acceptance

At phone size (390×844), the row must read as **RECLINED theater recliners at a
glance** — leaned backs, raised footrests, crew sunk in. If the backs still stand
vertical, it is not done: iterate until the lean is unmistakable.

## Deliverable

- Updated page in place at `games/game-night-at-daves/neon-room/`.
- Fresh captures committed under `games/game-night-at-daves/tasking/responses/`:
  the full 390×844 phone view and a recliner close-up.
- A short response note at
  `games/game-night-at-daves/tasking/responses/neon-room-step1-fix.md` saying what
  changed.

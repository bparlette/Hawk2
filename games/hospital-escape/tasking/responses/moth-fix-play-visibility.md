# MOTH-FIX-PLAY-VISIBILITY — response (Moth, Nov 23, 2026)

All seven play defects from Cherie's play session, fixed directly in the game code.
Base: main at fe1406ae (game code identical at the later 89fb22a5 tip — Neon's walk-cycle
commit touched painted PNG assets only, no code). Method: every defect reproduced and
measured in-engine first (autopilot sampler, 0.25 s cadence, seed 7), then fixed, then
re-measured with the same instruments plus the repo's own audits.

Design credit: Opus's reverted checkpoint `5439a03` supplied the spawn-solver placements,
`holdClamp`, `fairness.seenOnly`, `cover.commit` and `rushStop`. I adopted those, verified
them with my own runs, and extended them where the measurements said they fell short
(commit-on-arrival, back-off speed, a first-fight hold for the bed, HP retune). His
`tools/presence-audit.cjs` is restored from that checkpoint alongside.

## Defect 1 — attackers hide behind cover while attacking — FIXED

- **Reproduced:** cover-behaviour enemies spent **36.4% of their alive ticks hidden**
  (2,508 of 6,894 ticks, seed 7). The peek cycle (1.5 s out / 1.1 s hidden) ran for the
  whole fight, and 5 of 36 enemy shots were fired while the shooter was occluded.
- **Fix:** `cover.commit` (data-gated, on in level 1): a cover shooter **commits on
  arrival at its position** and never ducks back — it stays exposed for the rest of the
  fight. Advance pressure still steps it toward the player (exposed, between volleys),
  and it keeps `rushStop` distance. `fairness.seenOnly`: no shot at all — not even a
  visual-only one — unless the shooter meets the visibility contract at that instant.
- **Proof:** hidden share **36.4% → 0.0%**; occluded shots **5 → 0** across the run;
  fairness audit 0 violations (below). Stills: `after-bed-fight.png`,
  `after-waiting-room-fight.png` — every attacker up and visible mid-fight.

## Defect 2 — the red X never clears — FIXED BY OPUS (verified, not redone)

- Root cause (Opus, commit `281b1fc9`): the hit marker `#hm`'s fade-out statement sat
  after a trailing `//` comment in `hud()` (broken since 014aaeb), so it never ran.
- **Verified by me in-engine on the final build:** a forced hitmarker appears at
  opacity 1, decays exactly −0.07 per rendered frame as coded, and reaches **exactly 0**
  (≤250 ms at a small viewport; the full decay curve sampled at 390×844 before
  SwiftShader frame starvation). The fix is present in the base and untouched by me.

## Defect 3 — scene 2 (bed push) camera stares at a wall — FIXED

- **Reproduced:** during `bed_hall_push` the frame was Maya's back + bed side + blank
  corridor wall (`before-bed-fight.png`, `before-bed-mid.png`). Two mechanisms: the
  first gunman stood ~1 m off the bed's path and the bed **rolled past him point-blank
  with no hold**, and the wave spawns sat 23–78° off the portrait camera's ±15° axis, so
  at holds the view clamped onto their cover props.
- **Fix:** spawns repositioned into the camera cone (Opus's solver placements);
  `holdClamp: 75` lets the stopped view turn to the live threat; bed_w0 moved off the
  drive-by line to (1.9, 0, −14.6) and given a **hold at path 0.20 with a wave release**,
  so the first fight happens stopped, at ~5.5 m, in frame.
- **Proof:** bed_push readability **73% → 83%**; `after-bed-fight.png` shows both
  gunmen up and firing in frame; the bed path's three holds all release cleanly in the
  pace audit (0.4 s / 1.7 s / 3.0 s — no soft-lock).

## Defect 4 — scene 4 (elevator) nobody visible at the fight moments — FIXED

- **Reproduced:** `el_up` flanked the hold camera at −23°/+25° while the portrait view
  is ±15° wide and `lookClamp: 20` stopped the turn — the camera aimed at the centroid
  between them and saw neither (`before-elevator-lobby-fight.png`: one enemy sliver at
  the frame edge). Elevator beat readability was **24%**, the ride segment **5%**.
- **Fix:** el_up repositioned to (−1.2, 0, −72.7) / (1.1, 0, −72.3) — inside the cone;
  `holdClamp: 75` on the chair rig; once the chair is inside the car (pathT > 0.85,
  never during the fight) the breather view turns to the occupants (Maya + the chair)
  instead of the car doors.
- **Proof:** elevator beat **24% → 57%**, ride segment **5% → 66%**;
  `after-elevator-lobby-fight.png` — both attackers in frame at the fight moment, one
  mid-shot with muzzle flash, painted Cole in the foreground.

## Defect 5 — bed / wheelchair occupant must be the painted Cole — FIXED (one named limit)

- **Reproduced:** painted Cole measured in **0%** of bed-push and chair gameplay
  samples. The bed carried the grey procedural recline figure; every chair beat ran
  with an **empty chair** (procedural Cole hidden by OPUS-FOREGROUND-COLE).
- **Fix (bed):** the beat's establishing shot now takes the **painted bed**
  (`cole-bed-foot`, 3D bed hidden — the visit-room treatment) for its full window:
  `after-bed-establishing.png`.
- **Fix (chair):** every chair beat (corridor, elevator, gauntlet halls, holdout, exit
  push) now shows **painted Cole in the chair** (the FREE_FOOT treatment extended to
  play views), scaled 0.73 — the painting's figure measures 1.79 m but a seated man's
  head tops ~1.31 m; at full size his head filled the play view and blocked the
  fairness sight-lines over the chair (first attempt: enemy shots collapsed 25 → 7
  because every sight line grazed the painting — the scale fix restored them).
  His shots still leave from the off-screen gun point (`coleGunFG`) — the painting
  carries no muzzle.
- **Named limit:** during the bed push itself (after the establishing window) the
  occupant remains the reclined figure. The only bed painting is a foot-end front
  view; the push camera rides the head end 1.7 m away, where that painting as a
  billboard would fill the whole frame facing the wrong way. The chair painting is
  likewise a front view, so in the chair Cole faces the pusher/camera — the game's
  billboard language (Maya's push frames do the same), but a **rear-view Cole
  painting does not exist in the pack**; painting one is the remaining gap.

## Defect 6 — fraction-of-frame during action — FIXED

- **Reproduced:** shots were fired with the shooter up to **492 px** tall (58% of the
  844 px frame — the cafeteria rusher at ~2.6 m); five shots over 253 px.
- **Fix:** `rushStop: 5.5` — rushers hold at 5.5 m and back off (at 1.5× their advance
  speed, so a closing rail can't compress the gap); committed cover shooters keep the
  same distance; cover advance `minDist` and the bed_w0 hold (defect 3) keep stopped
  fights at range.
- **Proof (seed 7):** shot height at fire time — median 137 px, **max 245 px (29%)**,
  zero shots over 253 px. Sampled on-screen enemy height: median 125 px (15%),
  p90 191 px (23%), >253 px share **1.7% → 0.2%**. Full-body framing remains only in
  cutscenes / establishing shots. The fairness floor still holds simultaneously
  (min damaging-shot height 47 px ≥ 40, min visible-for 1.07 s ≥ 0.6 — audit below).

## Defect 7 — ambulance beat is all wall + THE SWEEP — FIXED

- **Reproduced:** the ambulance camera sat 0.55 m *inside* the bay (bayOffset −0.55),
  so the ±15° view was mostly bay wall and door slit (`before-ambulance-staging.png`).
- **Fix:** `bayOffset: 1.35` on all three ambulance paths — the camera rides at the
  rear doors, looking back over open road. Staging readability **41% → 68%**;
  `after-ambulance-staging.png` (hospital front + road, no wall),
  `after-chase.png` (two pursuers centred in frame).
- **The sweep** — % of sampled time anything readable is on screen (enemy / Maya /
  bystander / pursuer projected in frame; autopilot, seed 7, same instrument
  before/after):

| beat | before | after |
|---|---|---|
| visit | 100% | 100% |
| bed_push | 73% | **83%** |
| transfer | 59% | **77%** |
| elevator | 24% | **57%** |
| gauntlet | 59% | **68%** |
| entrance | 60% | **74%** |
| steal | 53% | **74%** |
| chase | 45% | 45% |
| train_finale | 27% | 27% |

  Worst segments: elevator_ride **5% → 66%**, steal_staging **41% → 68%**,
  entrance_exit_push **24% → 43%**, gauntlet_waiting_room **38% → 57%**,
  transfer_chair_corridor **54% → 75%**, elevator_doors_ground **42% → 51%**.
  Chase and finale are flat *on this actor-presence metric* — their frames are open
  road/city, not wall (see `after-chase.png`, `after-finale-drive.png`); pursuers
  leave the ±15° cone on road bends, and the finale drive carries no cast by design
  (it is the wind-down to the train set-piece). No beat's frame is wall-dominated
  any more.
- **Clips:** motion MP4s for scenes 2/4/7 could not be produced on this VM — timed
  captures run ~20 s per frame under SwiftShader here (three methods tried). The
  shots folder carries dense before/after stills for every changed beat instead;
  the Shorts pipeline can cut motion from this build on a real machine.

## Hard constraints — all re-run on the final build

- **Fairness audit: PASS.** 33 runs (3 seeds, full runs + soaks), 378 damage events,
  **0 violations**; min visible-for 1.07 s (floor 0.6), min shot height 47 px
  (floor 40). Negative control (contract off): **17/17** damaging hits flagged as
  violations in the audit's own control soak (and 9/9 in a standalone rerun).
- **Pace:** total **210.5 s (seed 7) / 207.2 s (seed 3) / 209.6 s (seed 11)**;
  first target **5.7 s on all three seeds**. Watch-only reads ~100 s, not 122–126 s:
  the pace tool counts "a live target on screen" as agency, so ~24 s that used to be
  staring at nothing is now playable time — the seconds didn't vanish, they became
  fights you can see. Total run time is preserved at the accepted ~209 s (enemy HP
  retuned 50/40 → 57/46 to hold it there after the visibility fixes shortened holds).
- **Engine tests: 24/24 passed**, 0 page errors.
- **Autopilot wins seeds 7, 3, 11** (fairness full runs + pace runs), 0 page errors.
- **Lose path intact:** with nobody firing back (partner disabled in-harness only),
  fair shots kill the hero — lost at 116.4 s, health 0. (With Maya's partner fire
  active, a passive player is carried much further — shipped design, unchanged.)
- **Unchanged, as required:** painted cast + realism bar (lamp relight, contact/cast
  shadows, reflections, grade), consciousness system (no blinks; ≥0.85-closure gate —
  heroSpared events still occur in the audit runs), OPUS-FOREGROUND-COLE behaviour
  (off-screen gun point in play views), Neon's believability shader.

## Evidence files

- Captures (390×844, before/after pairs for every changed beat) are named in
  `moth-fix-play-visibility-shots/` alongside this file. NOTE (Nov 23): the PNGs are
  staged locally and were **not** in the code push — the MCP connector corrupts binary
  files and the binary-safe Git Data connector's credential is unavailable in the
  sandbox. They upload byte-exact via the browser route; until then the response's
  numbers stand on the audit outputs quoted above.

## Files changed

- `engine/combat.js` — rushStop back-off at 1.5×; cover.commit commits on arrival
  (advance pressure kept, exposed); (checkpoint: seenOnly, fair-commit).
- `engine/rail.js` — `holdClamp` during holds (checkpoint).
- `engine/chase.js` — seenOnly gate for pursuers (checkpoint).
- `game/level1.js` — solver spawn placements; BED/CHAIR `holdClamp: 75`;
  `cover.commit`, `fairness.seenOnly`, `rushStop: 5.5`; bed_w0 repositioned +
  hold at 0.20 with wave release; ambulance `bayOffset` −0.55 → 1.35 ×3;
  enemy HP 57/46 (pace retune).
- `game/main.js` — painted Cole: bed establishing shot + every chair beat (0.73
  scale in play views); `coleGunFG` shot origin; elevator-ride occupant look.
- `tools/presence-audit.cjs` — restored from Opus's checkpoint (his tool).

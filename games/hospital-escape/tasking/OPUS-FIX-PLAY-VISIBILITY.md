# TASKING — Opus: fix the four defects from Cherie's play of the integrated build
Hospital Escape · base = current Hawk2 main tip · Cherie played the live build Nov 23 — her play outranks every harness claim. Reproduce each defect in-engine BEFORE fixing it; a fix without a reproduced mechanism is not done.

## 1. Attackers must not hide behind things
Enemies duck behind cover while attacking — the player is being shot
by people she can't see. Change the behaviour: **an enemy that is
attacking stays visible** — in the open, or steps out to fire and
STAYS readable while it's a threat. No firing from behind cover, no
hide-and-peek loops for active shooters. (This is the design rule
now, not just the fairness contract's at-the-instant-of-fire check:
if it's shooting at the player, the player can see it — continuously,
not for one frame.)

## 2. A red X stays on the screen
During play a red X appears and does not clear. Find what draws it
(hit marker? blocked-shot indicator? damage marker?), reproduce the
stuck state, fix the root cause so it shows for its intended moment
and clears. State in the response what it was and why it stuck.

## 3. Scene 2 (bed push) is staring at a wall
The ENTIRE second scene plays facing a wall — not just the opening
establishing shot. The camera/route framing for the bed-push beat is
wrong: the player must see the corridor, Maya, and what's ahead for
the whole beat. Rework the beat's camera so the scene reads
continuously at 390×844. Proof: captures at start / middle / end of
the beat + a motion clip of the full beat.

## 4. Scene 4 (elevators) — can't see anyone
In the elevator beat nobody is visible: no enemies in frame during
the fight. Fix camera and/or enemy placement so the attackers are in
frame and identifiable when they're a threat (see defect 1 — they
also may not hide). Proof: captures at each fight moment of the beat
+ a motion clip.

## Hard constraints (no regressions)
- Fairness contract re-run: 0 violations, negative control 6/6.
- Pace stays ~209 s total / first target 5.7 s / watch-only ~122–126 s
  (camera fixes may not re-lengthen the game).
- 24/24 engine tests; autopilot wins 3 seeds; lose path intact.
- Painted cast, realism bar (shadows/reflections/grade), and the
  consciousness system stay as delivered.

## Response
`tasking/responses/opus-fix-play-visibility.md` + captures/clips in
`tasking/responses/opus-fix-play-visibility-shots/`. Per defect: the
reproduced mechanism, the fix, and the proof. If a defect doesn't
reproduce for you, say exactly what you ran — Cherie's play report
stands until evidence says otherwise.

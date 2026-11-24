# GEAR-FIX — Neon tasking (Cherie order, Nov 24 15:49)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Neon. Work on main only, no branches.

## The defect (Cherie's screenshot, batch-2 overview, "Gunman - Headshot Knees 3Q")

The headgear is not following the head. In the gunman's dying-headshot still
the black cap/helmet sits forward and above the skull like a sliding beret,
half off the head, and black vest blocks float off his back. The same defect
family is visible on N2 (helmet droop + vest hover, flagged in your batch-2
report as native to the source mesh and left untouched — Cherie overrules
that call: "Fix the head hat thing").

Root cause to confirm or refute in your response: the gear meshes are not
weighted/parented to the bones the body actually animates with (head for the
hat, spine/chest for the vest), so they hold bind-pose positions while the
body moves under them. Whatever the cause, the fix lands in the cast GLBs
themselves — `games/hospital-escape-leaders-neon/assets/cast-pass/` — because
the game integration consumes those files.

## Scope

- All four cast GLBs checked: gunman, N2, Maya, Cole (any gear/headwear/
  carried mesh on each).
- The gear must track the body through the EXTREMES, not just idle: the
  dying-headshot clip is the proving pose (head thrown, body collapsing).
- Do not alter the bodies, the clips, pacing, or the seated pistol. Gear
  placement only. N2's body itself stays untouched — this is the gear
  seating on it, which is exactly what Cherie ordered fixed.

## Deliverables

- Updated GLBs in `assets/cast-pass/` + manifest note.
- Before/after stills at 390x844 in `responses/neon-gear-fix-shots/`: the
  SAME dying-headshot frame for gunman and N2 (the overview panels Cherie
  flagged), plus idle and walk frames per body you touched.
- Response: `games/hospital-escape/tasking/responses/neon-gear-fix.md` —
  SHOW YOUR WORK: the actual cause, the fix, method, tools, outputs.

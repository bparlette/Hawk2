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

## Reference — the vest fix already exists (added 15:50)

Cherie: "I thought you already fixed his vest" — she is right. The walk-off
lineage N2 (IMPROVED variant, the one staged in the hallway pages) already
carries a bone-attached vest that sits correctly. Your cast GLBs were rebuilt
from the source `valid-mocap.glb`, so that fix never entered your pipeline —
the floating vest in the batch-2 stills is the old defect resurfacing in a
new file, not the earlier fix failing. Port the walk-off build's gear
treatment as the reference standard rather than inventing a second fix;
the hallway staging code (`games/hospital-escape-hallway-t4-n2/n2-figure.js`
and the walk-off worlds) shows how the improved figure is assembled.

## Addendum 2 — the pistol must READ as a pistol (Cherie, Nov 24 15:51)

Watching N2's batch-2 clip, Cherie's read: "Looks like he is supposed to be
holding a rifle or machine gun." He is not — he carries a pistol, but the
two-handed extended stance plus the small dark gun in cupped hands gives a
long-gun silhouette at phone size. Requirements added to this task:

- Port the hallway build's palm-flip seat fix (landed in
  `games/hospital-escape-hallway-t4-n2/n2-figure.js`: on N2's rest pose the
  seat formula's palm normal points out the BACK of the hand, dot = -0.030,
  so the verbatim port seated the grip through the hand; the fix flips the
  palm normal on a thumb-side test). Apply the same seat in the cast viewer
  and any GLB-baked placement.
- In the fire beats (idle-alert, cover-to-shoot), the weapon must read
  unmistakably as a PISTOL at 390x844: seated in a wrapped grip, short
  barrel visible past the hands. Prove it with 2x grip stills in the same
  poses as the batch-2 shots, before/after.

## Addendum 3 — THE WEAPON IS A LONG GUN (Cherie, Nov 24 16:04-16:05)

Supersedes Addendum 2. Cherie, on the 2x grip still: "You can easily see
that's not the right gun for his hands. Needs to be a long gun with two
holds even. Create the gun that fits his hands or find one" — then sent the
reference: an AR-style carbine held two-handed, trigger hand on the pistol
grip, support hand forward on an angled foregrip under the handguard
(`long-gun-reference.jpg.b64` beside this file — base64, decode to view).

- Build or source a long gun in that pattern (carbine, rail handguard,
  angled foregrip, flip sights) and seat it by the TWO HOLDS: trigger hand
  wrapped on the grip, support hand on the foregrip. The palm-flip seat
  work from the hallway build still applies to the grip hand.
- Applies to the gunman and N2 in the cast viewer + GLBs (idle-alert,
  cover-to-shoot, walk/fire, dying). Maya and Cole keep their roles
  unchanged (bed push / unarmed patient).
- If you source a model instead of building one, log its origin + license
  in your response (Cherie's rule: unclear-license assets are fine for
  local testing, never in a shipped build — flag it if it is not clean).
- Proof: 2x stills of both holds in the fire beats, before/after against
  the batch-2 grip shots, at 390x844.

## Addendum 4 — second approved pattern (Cherie, Nov 24 16:06)

Cherie sent a second reference with an "Or": a compact SMG/PDW (Grand
Power Stribog pattern — short barrel, long curved magazine, support hand
on the short handguard). File: `long-gun-reference-2.jpg.b64` beside this
one. BOTH patterns are Cherie-approved. Fit decides: his clips hold the
support hand close, so the compact SMG's hold spacing likely matches the
measured hand positions better — build/seat whichever pattern fits the
two holds without moving his hands, and say which you picked and why.

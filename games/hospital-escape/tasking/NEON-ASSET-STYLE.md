# NEON — full painted asset style for Hospital Escape (Cherie, Nov 23, 2026)

## Your job
Produce the COMPLETE painted character asset set for Hospital Escape —
the whole new asset style. Opus integrates it into the engine after;
you make the art. Work in bparlette/Hawk2, **main only, no branches**.

## Read first (repo, games/hospital-escape/tasking/)
- refs/realism/README.md + POST-TEXT.md + ANALYSIS.md + REALISM-TARGET.md
  — and WATCH refs/realism/post1-station.mp4. That station video is the
  realism bar: materials, one warm key light, soft photographic detail.
- PATIENT-EYES-SPEC.md — the camera is a sick patient's eyes; your
  figures are seen through blur, lids, and tunnel vision.
- FRAMING-RULING.md — minimal presence is fine; bed/chair must read.
- Moth is building a painted sample right now; it lands at
  tasking/refs/painted-sample/. **That sample is the style target.**
  If it isn't there when you start, start from the realism pack and
  re-check for it before final delivery — final assets must match it.

## The style
Photoreal PAINTED cutouts — painterly, realistic, dramatic night-hospital
light (cool fluorescent, storm light through windows). Not cartoon, not
a 3D-render look. One consistent character per figure across every
frame: same face, hair, clothes. Pin a written description per character
in your manifest and hold every generation to it.

## Deliver — transparent PNG sprites, full body, consistent scale
Cast (looks locked by the game): Maya Vance — dark jacket, ponytail.
Cole Mercer — patient. Dr. Hale — white coat. Enemies — plain-clothes
and teal-scrubs hostiles.
- MAYA: pushing, back three-quarter, hands at push height — 4-frame
  stride cycle; side view aiming pistol; crouched at the wheelchair.
- COLE: in the bed (blanket, from the foot — the push view); in the
  wheelchair (seated, blanket over legs, front three-quarter); in the
  ambulance (seated, braced).
- DR. HALE: standing, objecting gesture; standing, hands up.
- ENEMY, plain-clothes: peek from cover; aim; fire; hit-flinch; down.
- ENEMY, teal scrubs: aim; fire; hit-flinch; down.
- One sprite-sheet PNG per character PLUS the individual frames, and a
  MANIFEST.md: per-character pinned description, frame list, pixel
  dimensions, and the shared scale/eye-line you used.

## Fairness is an art requirement here
Opus is fixing "shot by enemies you can't see." Your enemies must be
identifiable the instant they're visible at 390×844: strong silhouette,
weapon readable, no colours that melt into the corridor palette, muzzle
position unambiguous. If a pose reads ambiguous at phone size, redo it.

## Prove it in motion (stills flatter everything)
- Composite your sprites into a real corridor shot from the game at
  390×844 — one still per character group.
- One short MP4: Maya's push cycle + one enemy aim→fire→flinch cycle,
  composited in the corridor. If it doesn't read in motion, it isn't done.

## Deliver to
- Assets: games/hospital-escape/assets/painted/ (+ MANIFEST.md there)
- Response: games/hospital-escape/tasking/responses/neon-asset-style.md
  — what you made, your pinned descriptions, the honest weak points.

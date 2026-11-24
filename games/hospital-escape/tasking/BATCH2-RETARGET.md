# BATCH2-RETARGET — Neon tasking (reassigned from Opus, Nov 24 14:26)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Neon. Work on main only, no branches.
**Reassignment note:** this was Opus's queued task; Cherie reserved his
remaining capacity for the game integration, and this is your cast and your
pipeline — Maya's bed-push and Cole's clips belong with the builder who made
their bodies.

## What

Retarget the six batch-2 Mixamo clips (downloaded Nov 24, already in the repo at
`games/hospital-escape/mixamo/`, canonical names below) onto the shipping cast —
your cast-pass GLBs in `games/hospital-escape-leaders-neon/assets/cast-pass/`,
plus N2 himself (`valid-mocap.glb`, your VALID rig family — Mixamo-on-N2 proven
Nov 24 in the hallway staging: 86 shared bone names, natural walk 2.671 m/s).

| Clip (in `games/hospital-escape/mixamo/`) | Goes on | Replaces / adds |
|---|---|---|
| `pushing-heavy-object` | Maya | Replaces her constructed Bed_Push_Loop — this is the real bed-push |
| `walking-arm-injury` | Cole | His on-foot injured walk |
| `sitting-disbelief-forward` | Cole | Intro / slump beat (head-forward variant; batch 1's head-back stays) |
| `dying-headshot-knees` | Gunman + N2 | Third death, directional-death set |
| `cover-to-shooting` | Gunman + N2 | New variety behavior source |
| `pistol-idle-alert` | Gunman + N2 | Alert idle, replaces generic stand where aimed |

## Rules

- Your cast-pass retarget pipeline and measurement standard: foot-lock,
  in-place locomotion variants, pacing by stance-phase foot contact ONLY
  (Walk 1.30 m/s, Run 3.2 m/s, switch 2.04 m/s).
- Recoil stays at authored 1.0x (Cherie's ruling, Nov 24). GLTFLoader is
  APPROVED as a runtime loader (Cherie's ruling, Nov 24).
- Gun rule: any figure firing in evidence uses the seated pistol (seatPistol)
  — grip in palm, fingers wrapped, barrel on the aim axis. No floating props.
- No new downloads. If a clip will not retarget cleanly, name it and say why —
  no silent substitution.

## Deliverables

- Retargeted animation GLBs alongside your cast-pass output, manifest updated.
- Measurements per clip: natural pace, playback timeScale at the law, foot
  slide (stance-phase).
- Evidence: stills + one short clip per character showing the new clips in
  motion, in `responses/neon-batch2-shots/`.
- Response file: `games/hospital-escape/tasking/responses/neon-batch2-retarget.md`
  — SHOW YOUR WORK: method, tools/commands, output locations, in
  recreate-from-paper detail.

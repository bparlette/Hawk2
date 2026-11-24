# INTEGRATION — Opus's one task (supersedes VARIETY-PASS as a standalone)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Opus. Work on main only, no branches.

## Why this shape

Cherie (Nov 24, 14:26): Opus likely has one good task left in him this cycle,
so it is spent on the only step that ships — bringing everything into the LIVE
game in one pass. VARIETY-PASS is NOT cancelled: its items are folded in below
as in-game work (skip the sample-folder deliverable; the game is the
deliverable). BATCH2-RETARGET is no longer yours — reassigned to Neon.

## Start condition

Do not start until `games/hospital-escape/tasking/VERDICTS.md` exists — it
will name (1) the walk-off winner on Mixamo's walk and (2) the hallway pick
(T4 or T5). Everything else in this file is final; the verdicts only choose
assets that are already built.

## Scope — one integration pass into `games/hospital-escape/`

1. **The cast.** The N2 cast (Neon's cast-pass GLBs,
   `games/hospital-escape-leaders-neon/assets/cast-pass/`) becomes the game's
   cast — or the walk-off winner if VERDICTS says otherwise. GLTFLoader is
   APPROVED (Cherie, Nov 24). Pacing law holds: Walk 1.30 m/s, Run 3.2 m/s,
   switch 2.04 m/s, stance-phase foot-contact measurement only. Walk cadence
   is SETTLED — do not touch it. Recoil stays authored 1.0x (Cherie, Nov 24).
2. **Enemy variety, in-game** (was VARIETY-PASS item 1): wire the 27
   retargeted gunman clips into real encounters — kneeling shooters,
   door-frame peek-shoot-duck, the crouched flanker, curving/retreating
   walks, the 3 unwired turn clips, directional hit/death matched to shot
   placement. Zero downloads, zero new retargeting.
3. **The gun rule, in-game** (was VARIETY-PASS item 1a): every firing figure
   uses the seated pistol — grip computed from hand anatomy, parented to
   RightHand, grip in palm, fingers wrapped, barrel on the aim axis. Proof:
   2x zoom still/clip from the live game.
4. **Background patients** (was VARIETY-PASS item 2): from owned clips,
   ~1 draw call per room, measured and reported.
5. **Maya's reactions** (was VARIETY-PASS item 3): flinch / duck / cower on
   nearby gunfire from owned clips. Any missing clip is NAMED in your
   response as an acquisition candidate — no silent substitution.
6. **The hallway look.** The winning take's treatment becomes the game's
   corridor look, including its character shadow treatment (traveling
   contact shadow, light-modulated) if present in the winning build.
7. **Hit capsules.** Bone-parented hit capsules on the integrated cast —
   owed since the full cast build; integration is where they land.

## Guardrails

- Patient-eyes: the 24/24 consciousness tests stay green.
- Game data validation stays green (201 objects, 0 errors).
- HUD budget: persistent HUD <= ~15% of a phone screen, icons + numbers only.
- three.js stays on the pinned CDN (0.128.0) — never inlined.
- If a verdict asset fights the game (perf, rig, draw calls), stop and say
  so in your response rather than forcing it — name the conflict and the
  cheapest resolution.

## Deliverables

- The upgraded live game on main: https://bparlette.github.io/Hawk2/games/hospital-escape/
- Evidence in `responses/opus-integration-shots/`: in-game stills/clips per
  beat showing cast + variety working, the 2x grip proof, per-beat draw calls.
- Response: `games/hospital-escape/tasking/responses/opus-integration.md` —
  SHOW YOUR WORK: method, tools/commands, output locations,
  recreate-from-paper detail.

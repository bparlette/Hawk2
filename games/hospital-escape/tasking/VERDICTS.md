# VERDICTS — Hospital Escape (Cherie, Nov 24, 2026)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Written by:** Moth, from Cherie's rulings. This file unlocks INTEGRATION.md.

## 1. Walk-off winner (Mixamo motion): N2

Cherie, Nov 24 ~16:43 ET: "Same n2 winner."

All 15 bake-off looks performed the SAME motion — Mixamo Pistol Walk +
Firing A Gun recoil layer — walking at the camera, each paced to the
1.30 m/s law on its own body. World:
https://bparlette.github.io/Hawk2/games/hospital-escape-mixamo-walkoff/
(commit 401d4d0c). N2 wins on Mixamo's walk too — the locomotion question
is settled: the game runs Mixamo's walk on N2. (The CMU-walk hybrid
remains unbuilt and is NOT the plan.)

Supporting audit from the walk-off build: N2's floating built-in pistol
prop was stripped and replaced with the seated pistol (grip from the
RightHand finger bones); N1, N3, N5 received the same fix. C1/C2/C4 are
one construction (indistinguishable on the same motion); C3 differs.

## 2. Hallway: T4 (Neon's)

Cherie, Nov 24 16:22 ET: T4 wins. Neon's hallway (ELEVATORS end) is the
game's hallway, staged with N2 advancing at the camera (walk-at-the-
screen, bursts every 1.7 s) and the light-sampled traveling shadow
(0.52 dark stretches / 0.13 lit pools). Rework commit f1b9c762; T5 does
not ship. Pages:
https://bparlette.github.io/Hawk2/games/hospital-escape-hallway-t4-n2/

## 3. Standing rulings integration must honor

- Shipping cast: NEON's cast pass (gunman / Maya / Cole / N2 GLBs in
  games/hospital-escape-leaders-neon/assets/cast-pass/) — "I want n2
  cast" (Nov 24, 13:54).
- GLTFLoader APPROVED (Nov 24). Pacing law: Walk 1.30 m/s, Run 3.2 m/s,
  switch 2.04 m/s — stance-phase foot-contact measurement only.
- Recoil stays authored 1.0x. Patient-eyes system: 24/24 tests must stay
  green. HUD budget: persistent HUD <= ~15% of a phone screen.
- Weapon: the pistol is being replaced by a LONG GUN under GEAR-FIX
  (Neon, GO issued Nov 24 16:42 — AR carbine or compact SMG, fit
  decides). Integrate the cast as-is; the long gun swaps in on gunman +
  N2 when GEAR-FIX lands. Do not block integration on it.
- Batch-2 approvals (Nov 24 15:52): Maya's real bed-push ships as-is,
  Cole's arm-injury walk + wheelchair slump approved, staff-life Mixamo
  clips (typing / phone / sitting-talking / talking-seated) are in
  games/hospital-escape/mixamo/ — 58 clips total in the repo.

## 4. T4 implementation ruling (Cherie, Nov 24, 18:57 ET)

FULL T4 look and feel, for the ENTIRE game. The material + dressing
layer compromise proposed in Opus's integration response is rejected.
Tasking: T4-FULL-PORT.md (Opus). Where T4's renderer conflicts with the
game's, T4's look wins; the game's geometry, doors, and gameplay
systems survive.

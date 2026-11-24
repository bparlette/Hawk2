# T4-FULL-PORT — full T4 look and feel, entire game (Opus)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Opus. **Response:** `games/hospital-escape/tasking/responses/opus-t4-full.md` (SHOW YOUR WORK).
**Supersedes:** the "cheapest resolution" (material + dressing layer) proposed in responses/opus-integration.md section 6. The owner considered it and rejected it.

## Owner ruling (Cherie, Nov 24, 18:57 ET)

"I want full t4 look and feel. For the entire game."

- The FULL T4 look and feel — Neon's T4 (`games/hospital-escape-hallway-neon/take4-kitbash.js`): its ACES tone mapping (exposure 1.06) + sRGB grade, FogExp2 mood, PMREM environment, PBR materials, the 9-panel area-light treatment, its lighting mood and shadow treatment — applied to the ENTIRE game, every zone and beat, not only West Wing B.
- Where T4's renderer globals conflict with the game's current post pipeline, **T4's look wins**: rework the game's rendering around T4's treatment rather than diluting T4 to fit the game.

## What must survive (function, not look)

- The game's own geometry and doors: doors stay engine objects that swing open as enemies spawn through them — T4's duplicate shell does NOT replace game geometry. The game's geometry receives T4's full treatment.
- All gameplay systems unchanged. Guardrails stay green: engine tests 24/24, data validation 201/0, fairness audit PASS, full playthrough with 0 page errors.
- The 3D cast as integrated (N2 / Maya / Cole), the pacing law, recoil 1.0x, HUD budget.

## The standing rule on tradeoffs

If an element of the T4 look genuinely cannot survive — a real performance wall on phone-class hardware, a hard engine conflict — do NOT silently drop or dilute it. Name it in your response with the measured cost and the options; the owner decides. Report per-beat draw calls and frame cost at 390x844 as in the integration response.

## Acceptance evidence

- Side-by-side stills: T4 standalone vs the game at matched viewpoints, 390x844, for the hallway AND at least two other zones.
- Play evidence: a real-input run through at least two beats showing the look in motion.
- The look is judged at phone size against T4 itself, not against the game's previous look.

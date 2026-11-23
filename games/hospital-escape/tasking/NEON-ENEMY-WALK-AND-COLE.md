# TASKING — Neon: enemy walk cycles + braced Cole repaint
Hospital Escape · Hawk2 main · from Opus's integration delivery (fd14ffe) · Cherie approved Nov 23

Two art items. Same painted style, same cast, same delivery discipline as
your painted pack (270ed790): RGBA frames + MANIFEST with per-frame
metrics. Land them in `games/hospital-escape/assets/painted/` and write
your response to `tasking/responses/neon-walk-cole.md`. Opus integrates
after Moth's audit of this pack — do not touch game code.

## 1. Enemy walk cycles (the glide fix)
In the integrated build the enemies still GLIDE when they move between
cover spots — the pack has no walk frames, so the engine slides the
firing/aim poses. Paint, for EACH enemy type (plain + scrubs):
- A **4-frame walk cycle**, side/three-quarter view matching the
  direction they cross the corridor in-game, legs clearly mid-stride in
  the contact/passing poses — the cycle must read as walking at phone
  size, not marching in place.
- Same scale discipline as the pack: **341.6 px/m**, and report each
  frame's measured bottom (alpha ≥ 64 convention) in the MANIFEST so
  Opus can stand every frame on its own bottom edge — no floating,
  no sinking, consistent with the stride frames you delivered before
  (measured bottoms 711–719 in the original set).
- Same lighting/grade as the existing enemy frames so the cycle cuts
  invisibly against the aim/fire frames of the same character.
- Proof: one 390×844 composite per enemy type with the cycle laid over
  the corridor floor + a short motion clip of the 4 frames looping at
  walk cadence. Quality is judged by the motion, not the stills.

## 2. Braced Cole, repainted from standing height (the ambulance fix)
The current braced-Cole frame only reads as seated when the camera is
~2.5 m up, because the painting's own eye-line is high. Repaint the
same pose — Cole braced on the ambulance bay floor, hand and heels
down — **from a standing eye height (~1.6 m, looking slightly down)**,
so Opus can place the in-ambulance camera at a natural height and Cole
still reads seated on the floor, not floating.
- Same Cole (hospital gown, same face/hair), same bay interior cues.
- Report the frame's measured bottom + the hand/heel contact points in
  the MANIFEST so the contact shadow can be anchored exactly.
- Proof: one 390×844 composite at the standing-height view.

## Rules
- Original characters only; no GTA or other franchise IP.
- If a frame can't hold the style at phone size, say so in the response
  rather than shipping a near-miss.

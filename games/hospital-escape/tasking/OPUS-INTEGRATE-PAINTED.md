# OPUS — integrate the painted cast (Neon's pack, audited)
(Hospital Escape · Moth tasking, Nov 23, 2026 · work in MAIN, no branches)

Neon's painted sprite pack is delivered and AUDITED (Moth's audit:
every byte size, bbox, muzzle coordinate and the MP4 verified;
phone-size identifiability PASS; ready for integration with the
notes below). Source of truth:
- `games/hospital-escape/assets/painted/` — 20 RGBA frames + 5 sheets
- `games/hospital-escape/assets/painted/MANIFEST.md` — pinned
  descriptions, per-frame metrics, measured muzzle coordinates,
  integration notes (mirrored facing, floor/backlight guidance)

## The job
Bring the painted cast into the live game (base build = the audited
fix build 1fc2441 + the consciousness amendment when you build it):
- **Maya**: 4-frame push cycle for the bed push; aim-side and
  crouch-chair frames where those beats play.
- **Cole**: bed-foot, wheelchair-front3q, ambulance-braced.
- **Dr. Hale**: objecting / hands-up for the opening beats.
- **Enemies**: plain-clothes (peek/aim/fire/flinch/down) and scrubs
  (aim/fire/flinch/down) wired to the existing enemy states.
Per the FRAMING RULING (tasking/FRAMING-RULING.md), minimal Cole/Maya
presence is fine — the sprites are the near-camera layer; what
matters is that bed/chair/ambulance and every shooter read instantly
at 390×844.

## Audit notes — read before placing anything
1. **Maya's grip is YOUR placement job.** In Neon's own composites she
   walks beside the bed in profile and the grip doesn't read. Her push
   sprites' arms reach forward at handle height, so land her hands on
   the bed's push bar in-engine and PROVE the grip reads at 390×844
   (capture it). If placement genuinely cannot make it read, say so
   in the response — only then does Neon owe a dedicated hands-on
   frame.
2. **Anchor to measured bottoms, not the nominal 720.** True sprite
   baselines measure 717–719, stride frames float to 712–715. Use the
   MANIFEST per-frame metrics.
3. Known nit, NOT blocking: 2–3 tiny transparent pinholes inside
   Cole's pistol (zoom-only, invisible in play). Leave them.

## REALISM BAR — assets, not stickers (Cherie, Nov 23)
"We need the art turned into realistic game assets not looking like
flat stickers." The sprites must read as people IN the corridor, not
cutouts pasted ON it. All of this is engine-side integration work:
1. **Contact shadow** under every character, anchored at the measured
   baseline, soft and scene-consistent. No floating figures.
2. **Floor reflection** for near characters — the corridor floor is
   wet linoleum; a character with no reflection reads as a sticker.
   Mirrored, faded, blurred, clipped at the baseline.
3. **Lighting match**: sprites graded to the scene's night grade and
   dimmed with distance like everything else in the corridor. A
   sprite brighter or warmer than the room around it is a sticker.
4. **Feet locked, no skating**: stride phase synced to movement speed
   so feet plant on the floor plane; scale from the 341.6 px/m
   measure at the character's depth.
5. **Depth, not screen-space**: sprites depth-test against the 3D
   scene — behind pillars, beds and door frames when the world says
   so, never drawn over them.
6. **Edges**: no halo, no fringe, slight softening; distant figures
   take the scene's haze/DOF treatment too.
Acceptance is visual, at 390×844: the bed-push capture, both enemy
fire captures, and the motion clip from the proof list below get
judged on one question — does the character belong in the room? If
any reads as a sticker, integration is not done. If a sprite's baked
lighting or edges genuinely cannot blend, name it precisely in the
response — that becomes a one-item Neon fix, not a silent workaround.

## Hard constraints (the audited build must not regress)
- The fairness contract from OPUS-FIX-FAIRNESS-PACE stays binding —
  sprite placement/scale must keep every damaging shooter inside the
  effective visible zone, unoccluded, ≥40 px tall, identifiable.
  Muzzle flashes anchor to the MANIFEST muzzle coordinates so the
  flash sits on the gun, never behind another character.
- Pace stays: total ≈209 s, first target ≈5.7 s, watch-only ≈126 s.
- 24/24 engine tests pass; autopilot still wins on 3 seeds; lose path
  intact; 0 page errors.
- three.js stays the pinned CDN 0.128.0. No new dependencies.

## Proof owed in the response
- Response file: `tasking/responses/opus-integrate-painted.md`.
- In-engine captures at 390×844: bed push WITH the grip reading,
  wheelchair transfer, one plain and one scrubs enemy at the moment
  of firing, Hale in the opening.
- A short in-engine motion clip of the push cycle + one enemy beat
  sequence (peek→aim→fire→flinch→down).
- Fairness re-run + pace table re-run against the integrated build,
  same tools as the fix audit used.

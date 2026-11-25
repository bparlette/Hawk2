# OPUS-NEXT — Opus's task queue, in order (created Nov 24, 20:33 ET)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Opus. Work top-down: finish one, mark it, start the next. Specs live in the named files; this file is the order.

## 1. CAMERA-FIX — CURRENT, GO

Spec: `CAMERA-FIX.md`. Owner's phone play (Nov 24) found: camera walks
through walls; frames of pure wall with the cast invisible; the
ambulance beat shows only the vehicle's wall; one room's far wall
doesn't render from inside (see-through to the outside void). Her four
screenshots are in `camera-fix-evidence/`. Camera never enters
geometry, walls read from every interior viewpoint, ambulance framing
keeps vehicle + people in shot. Response:
`responses/opus-camera-fix.md` with same-beat before/after stills at
390x844; guardrails green.

## 2. CAST-QUALITY integration + bed-push staging — NEXT

Spec: `CAST-QUALITY.md`. Two parts:
- **Bed-push staging (start anytime):** Maya currently pushes the bed
  from the side with one hand. She must be BEHIND the bed, pushing
  with TWO hands.
- **Integration (after Neon lands the figures):** swap in Neon's
  rigged Dr. Hale, lying patient, and nurses/staff for the painted /
  low-grade figures. If any figure is removed instead, handle its
  beats/dialogue and say how.
Response: `responses/opus-cast-quality.md`; guardrails green;
patient-eyes system untouched.

## 3. Long-gun integration — WHEN GEAR-FIX LANDS

When Neon's GEAR-FIX response lands, integrate the long gun on the
gunman + N2 in the live game (replacing the pistol in the fire beats),
with the 2x hold proof re-checked in game. Note it in the CAST-QUALITY
response or a short `responses/opus-long-gun.md`.

## Standing notes

- Full T4 is the shipped look (owner's phone verdict Nov 24) — the
  halfway trims are not the default. Fire doors stay T4-true
  near-black unless the owner says otherwise.
- Guardrails on every change: tests 24/24, data 201/0, fairness PASS,
  zero page errors on a real-input run.

## Done (verified)

Integration (N2 cast live), T4-FULL-PORT (whole game on Neon's T4
look), evidence refresh (fairness PASS 378/0 on final code).

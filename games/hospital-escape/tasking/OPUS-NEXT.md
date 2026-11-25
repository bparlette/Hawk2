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

## 2. TRANSITION-HITCH — scene 2/3 transition freezes (owner phone report, Nov 24, 20:33 ET)

The owner reports a LONG PAUSE at either the second or third scene
transition on her phone — she could not pin which, so instrument
both. Likely suspects (yours to verify): per-zone T4 setup (PMREM /
environment build) or cast/asset loads firing AT the transition
instead of streaming during the prior beat. Required: no transition
may freeze the frame — target under half a second of hitch — with
assets preloaded or streamed ahead of the cut. Prove it with a timed
real-input run across the first three transitions, timings in the
response (fold into the CAMERA-FIX response or a short
`responses/opus-transition-hitch.md`).

## 3. CAST-QUALITY integration + bed-push staging — NEXT

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

## 4. VEHICLE-QUALITY — cars to Scaggsville standard (owner, Nov 24, 20:36 ET)

Replace the game's CARS with vehicles of **Scaggsville 3D quality**.
Correction (owner, Nov 24, 20:38 ET): the AMBULANCE model itself is
fine — her complaint about it was the camera framing (covered in
CAMERA-FIX), not the vehicle. Leave the ambulance as it is. The
chase/traffic cars are the ones that read as slabs next to the cast. Standard: the shared vehicle work from
Scaggsville 3D / Fleet Drive — the gamepress shared vehicle module
(`gpvehicles.js`, fleet cars as data rows; quality floor = Neon's
Bunny Hop cars). The owner has cleared the WHOLE Scaggsville fleet as replacements
(Nov 24, 20:37 ET): draw chase/traffic cars from the entire shared
fleet as needed. ALSO (owner, Nov 24, 20:38 ET): you may try
redoing the game's existing cars better — improving the current
models is welcome — but the Scaggsville cars must DEFINITELY be
included either way; redoing alone does not satisfy this item.
Response: fold into a short
`responses/opus-vehicles.md` with 390x844 stills of the chase and any
other beat where cars were replaced.

## 5. Long-gun integration — WHEN GEAR-FIX LANDS

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

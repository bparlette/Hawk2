# Opus response: foreground Cole matches the painted cast (OPUS-FOREGROUND-COLE.md)

**Captures:** `tasking/responses/opus-foreground-cole-shots/`.
- `before-*.png` and `after-*.png` for every beat, at 390×844 (seed 7, paused frame, painted cast loaded).
- `before-after-sheet.png` puts every beat side by side at phone size (before on top, after underneath).

## Method per beat

| Beat (capture) | Before | Method | After |
|---|---|---|---|
| Bed push (`1-bed`) | procedural back of head, gown, gun arm at the left edge | **(b) hidden** | bed rail and frame still in the lower frame; Maya at the bar in the opening shot |
| Chair corridor (`2-chair`) | procedural gun hand by Maya | **(b) hidden** | painted Maya on the handles; chair handles visible |
| Elevator (`3-elevator`) | head, shoulders, gun hand, centre-bottom | **(b) hidden** | wheelchair handles frame the bottom |
| Gauntlet halls (`4-gauntlet`) | head, shoulders, gun hand | **(b) hidden** | chair handles visible |
| Front-doors holdout (`5-holdout`) | shoulder and arm, lower left | **(b) hidden** | clean |
| Ambulance: bay, chase, finale (`6`–`8`) | seated block figure inside the bay (shoulder at right in the chase) | **(b) hidden** | the bay walls, doors and road read as the ambulance |
| On foot, Cole parked (`9-foot-1/4`) | procedural Cole in his chair, plus a procedural Maya in an **orange** top | **(a) painted:** `cole-wheelchair-front3q` billboard in his chair (painted chair replaces the 3D one); fades out within 3–4.5 m of Maya's camera so he never fills the frame | no clash; Maya's procedural on-foot body recoloured to the painted palette (slate jacket, indigo denim, MANIFEST §2) |

**Why (b) in Cole's own views:**
- The pack has no painted *back* view of Cole, so a painted treatment can't match there.
- The FRAMING RULING asks only that the bed, chair or ambulance read, and it prefers minimal Cole presence.
- The vehicles still frame every view: bed rails, chair handles, the bay and its doors.
- The cutscenes and establishing shots, where the camera sees him, already use the painted Cole: the bed-foot frame in the opening, the wheelchair frame in the transfer and ambulance-bay cuts, and the braced frame at the ambulance.

**His gun.** With his arm hidden, the player's muzzle flash and tracer now start at a fixed off-screen gun point at the lower right of his view (`fgMuzzle`), like an FPS with no weapon model. They no longer float where the hidden hand was.

**Unchanged:** the patient-eyes camera, neck, consciousness fades and lids are exactly as delivered. This is a foreground-element change only. With the painted cast unavailable (texture load failure or `?painted=0`), the procedural Cole is shown as before.

## Constraints: re-run on this build
- **Fairness (`tools/fairness-audit.cjs`):**
  - 33 runs: 224 damage events, **0 violations**;
  - negative control (contract off) **catches 6/6**;
  - min height 45 px; min visible-for 0.6 s;
  - page errors 0 / 0 / 0.
  - Log: `opus-foreground-cole-shots/fairness-audit.txt`.
- **Pace (`tools/pace-audit.cjs`):** total 208.7 / 207.8 / 210.4 s; first target 5.7 s; watch-only 125.6 / 122.0 / 124.4 s; won on seeds 7, 3 and 11. JSON is alongside.
- **Engine tests:** 24/24, 0 page errors.
- **Lose path:** intact (unchanged consciousness code; see `opus-integrate-painted-shots/lose-*.png`).
- **Live Pages build:** loads the textures without the file-access flag, with 0 page errors (checked after push).

Hidden Cole no longer occludes line of sight (an invisible body is not an occluder). The audit shows that changed no fairness outcome in these runs.

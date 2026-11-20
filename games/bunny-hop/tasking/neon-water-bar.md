# NEON — THE WATER BAR (Nov 20, from Cherie)

Cherie's addition to the car bar: **"Same with water look and feel based on earlier video."**

Same treatment as `neon-car-bar.md`, for the water in your world module. Your shader water was already the best single thing in the v2/v3 world (sun glitter, manual fog matched to the scene) — this is the bar Cherie is holding its next step to, now that diving and underwater swimming are in the game.

## The reference

From Cherie's own GTA VI videos, already in the repo at `games/bunny-hop/reference/`:

- `frame-3.jpg` — the dive off the bridge into the canal: the entry moment, the canal surface from above, sparkle running down the water.
- `frame-7.jpg` — swimming beside the yacht: surface swimming in clear blue water, the hull and sky reflected, depth readable below the swimmer.

## The bar — look

- **Clear blue water with readable depth and a visible bed.** You can see down into it; shallow-over-bed reads lighter, the deep channel darker. Never a flat opaque sheet, never a dark void.
- **View-dependent sun glitter** — the sparkle path moves with the camera and the sun (your settled sun direction), the way frame-3's canal lights up from the bridge.
- **Sky and structure reflections** — the surface carries the sky, the bridge, the buildings; the PMREM environment should be visible in the water as well as on the paintwork.
- **The surface from BELOW** — this is new with diving: from underwater, the surface is a bright membrane, with the silhouettes of the bridge, banks and the rider readable against it. The water must render correctly from both sides.
- **Foam and wake where the swimmer moves** — a visible disturbance at the swimmer: entry splash, surface wake, churn while swimming. The water reacts to the person in it.

## The bar — feel

- **Dive entry splash** — entering from the bridge dive (frame-3) has a splash moment, not a silent clip through the surface.
- **The half-in/half-out camera line** — at the surface, the camera crossing the waterline should read as crossing: above-water clarity and below-water tint meeting at the line, not a hard pop between two scenes.

## Scope note

Moth's host lane is implementing the swim/underwater behaviour (controls, camera, dive) in parallel. **Yours is the world-side water rendering bar** — the material/shader/module side: color, depth read, glitter, reflections, the from-below surface, foam/wake hooks the host can trigger. If a feel item needs a host-side hook (a splash trigger at entry, a waterline signal for the camera), name the hook you need in your response and Moth will wire it.

## The honest part

Same as the car note: aspirational bar, web budget. **Say what you adopt vs what you rule out for performance** (standing budgets: world ≤60 draw calls, live frame work ≤3.0 ms), in the responses, before or alongside the work.

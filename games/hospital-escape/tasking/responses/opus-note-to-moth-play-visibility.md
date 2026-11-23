# Note to Moth: play-visibility work I stopped (superseded per MOTH-FIXING-PLAY-DEFECTS.md)

Your note says OPUS-FIX-PLAY-VISIBILITY and its addendums are superseded. My in-progress checkpoint **`5439a03` landed just after it, and I have reverted it on main** so it doesn't collide with your fixes. Nothing of it is live. If any of it is useful, it's in history: `git show 5439a03`.

**Landed before your note:** defect 2, the stuck red X (`281b1fc`).
- **Cause:** the hit-marker fade sat behind a trailing `//` comment from `014aaeb`, so it never ran.
- **Proof:** reproduced in-engine. Opacity was 1 at the hit and still 1 three seconds later; after the fix it is 0.

**What the reverted checkpoint had** (offered as reference, not as a claim on the work):
- **`tools/presence-audit.cjs`:** a full autopilot run sampled every 0.25 s. It reports, per segment, the % of exposed-enemy time in frame, shots fired from off-screen, and on-screen height as a fraction of 844 px.
  - Baseline, seed 7, in frame: bed push 53%, elevator ride 11%, cafeteria 24%, waiting room 29%, exit push 33%.
  - Off-screen shots happen in bed push, transfer, elevator, cafeteria and waiting room.
- **Root cause I found for defects 3 and 4:**
  - A 390×844 portrait view is only about ±15° wide.
  - Several waves flank the hold camera at ±23–78°. The elevator ride's `el_up` sits at −23°/+25°, so the camera aims at the centroid between them and sees neither.
  - The rig's `lookClamp: 20` stops the view turning to them during holds.
  - Fixing the placements brought in-frame time to 93–100% for bed, transfer, elevator, holdout and cafeteria.
- **Engine ideas** (data-gated):
  - `fairness.seenOnly`: no shot at all unless the contract holds;
  - `cover.commit`: an active shooter stays out;
  - `rushStop`: shooters hold or back off to a distance;
  - path `holdClamp`: the view may turn further during holds.
- **Pace note:** making enemies visible shortens holds, which took the total to 185 s. Enemy HP 50/40 brought it back to 201 s. Watch-only falls to about 100 s because "watch-only" counts time with no visible target.

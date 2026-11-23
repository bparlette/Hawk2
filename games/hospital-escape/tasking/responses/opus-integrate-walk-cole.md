# Opus response: walk cycles + braced Cole integrated (OPUS-INTEGRATE-WALK-COLE.md)

**Base:** current main **with Moth's seven-defect fix build already landed** (`90b9be3`), plus the amended anchors (`24cbf3c`). I built on top of both; nothing of Moth's was overwritten or rebased.

**Proofs:** `tasking/responses/opus-integrate-walk-cole-shots/`. Everything is in-engine at 390×844, seed 7.

## Hard conditions
1. **Standalone frame files only, never the sheet cells.**
   - `tools/painted-data.py` reads `assets/painted/*.png` and skips every `*-sheet.png`.
   - It now **asserts the audited bottoms**, so the generator fails if a frame drifts: walk 718 / 712 / 718 / 714 for both cycles, braced Cole 717. All pass.
   - The walk files are the `183fe1a` re-render (knee fixes in).
2. **MANIFEST contact points quarantined.** Nothing reads them.
   - **Walk frames:** the horizontal anchor and the contact shadow come from **Moth's measured contact clusters**, quoted verbatim in `tools/painted-data.py` `CONTACT`:
     - plain-01 309–342; plain-02 350–365; plain-03 84–111 + 385–412; plain-04 287–308;
     - scrubs-01 346–376; scrubs-02 ≈172; scrubs-03 429–451; scrubs-04 392–411.
     - A multi-cluster frame (plain-03) anchors at the midpoint between its feet.
     - I re-checked the clusters against each file's bottom six rows; they agree.
   - **Braced Cole:** the anchors are **Moth's replacement anchors** (`SEAT`): toe (274, 717), hand (630, 634), rear foot (145, 658).
     - The billboard stands on the **toe**, the measured bottom.
     - The contact shadow sits under the **hand / rear-foot line**, pushed back on the floor by the perspective depth those points imply for the current camera (`back = D·dy / (h − dy)`).
     - That is anchored to the measured points, then checked by eye against the capture, not taken from the MANIFEST.
   - The muzzle (187, 104) was not needed in this beat: he doesn't fire in the establishing shot.

## Walk cycles: he walks, he doesn't glide (`game/main.js` `paintEnemy`)
- **When he walks:** whenever his measured world speed is above 0.25 m/s, not hidden, and not in a fire or flinch frame (those still win). That covers cover advances, recover moves, rushers closing, and Moth's `rushStop` back-offs.
- **Stride by distance:** the pose advances once per **0.44 m** travelled. That is half the 0.88 m step measured between walk-03's two contact clusters, so the stride matches the ground covered at any speed.
- **Feet planted: no skating.**
  - Each walk pose is **held where it began** and steps to the next pose's spot, which is stop-motion, the way a 4-pose painted cycle actually animates.
  - The engine position stays continuous; the visual leads or lags it by less than 0.44 m. Hitbox, muzzle and contact shadow move with the visual.
  - **Measured foot slide within a pose: 0.000 m**, in both clips (`walk-plain.json`, `walk-scrubs.json`).
- **Facing** follows the pack convention (plain +X, scrubs −X, mirrored with `scale.x = −1`). It is decided by the enemy's **world velocity along the view's right axis**, so a camera turn can't flip him mid-walk. Standing still, he faces the screen centre as before.
- **Starting frame (known trait):** a new walk starts on **walk-02**, the first full stride, not on walk-01, the near-standing frame that comes from the re-render. The loop itself is **not reordered**: 02 → 03 → 04 → 01 → 02… The near-standing 01 then reads as the passing pose between strides.
- **Walk ↔ aim/fire cuts** happen directly. The walk frames carry the pistol high and two-handed like the aim frames, so the cut is clean.

**Flagged: cadence.** Because the stride is locked to distance, cadence is speed ÷ 0.44 m: about **5.2 poses/s** for a gunman at 2.3 m/s, and about 4.6 measured in the clips with acceleration. The audited 8 fps would need about 3.5 m/s. A fixed 8 fps at these speeds would slide the planted foot by about 45%, which is exactly the skating this tasking exists to remove, so I chose planted feet. If Cherie prefers the 8 fps cadence over planted feet, it's a single constant.

**Proof:**
- `walk-plain-crossing.mp4` (4.5 s): `enemy:bed_w2_2` walking down the bed-hall corridor through 21 poses, full cycle ×5. There is a 3× zoom alongside.
- `walk-scrubs-crossing.mp4` (4.5 s): `enemy:tr_w2_2` (scrubs) in the chair corridor, 19 poses. There is a 3× zoom alongside.
- Across a whole seed-7 autopilot run, enemies spend **about 51 s walking on-screen**, using all 4 poses.

## Braced Cole swap (ambulance establishing shot)
- **The new frame** `cole-ambulance-braced.png` (standing-eye-height repaint, bottom 717) replaces the old one through the same data path; there is no sheet cell.
- **Camera:** moved to the repaint's own viewpoint, about **1.6 m above the bay floor he sits on**, about 20° down, 2.6 m behind him. That's outside the open rear doors, on Moth's new rear-door ambulance rig (`bayOffset 1.35`).
- **Scale:** the painting is drawn at standing scale, so on the floor he is scaled to **0.62**, which puts his head about 1.0 m above the bay floor. This follows Moth's 0.73 chair-Cole precedent.
- **Placement:** he sits 1.1 m inside the doors.
- **Result:** `ambulance-braced-establishing.png` shows him seated on the bay floor, hand and heels down, with the contact shadow under the seat. The old steep top-down camera is gone.

## Bugs found and fixed on the way (disclosed)
- **`game/painted.js` (this work):** a trailing `//` comment swallowed the line that offsets each frame onto its bottom row. It was caught in-engine before any push, because the braced Cole sank into the bay floor, and fixed.
- **`engine/greybox.js:59`:** a trailing `//` comment from my own earlier engine build (`4bca161`) had swallowed the greybox wheelchair's wheels **and `g.vehicles.chair = ch`**. Restored.
  - The shipped game hides greybox vehicles, so play is unaffected.
  - The 24/24 engine tests pass with it in.
  - I now lint for code hidden in trailing comments before every run.

## Constraints: re-run on the integrated build, same tools as the fix audit

| | Moth fix build (`90b9be3`) | This build | Movement |
|---|---|---|---|
| Fairness | 33 runs, 378 damage, **0 violations**, min visible 1.07 s, min 47 px; control 17/17 | 33 runs, 378 damage, **0 violations**, min visible 1.07 s, min 47 px; control **17/17** | none |
| Pace, seed 7 / 3 / 11 | 210.5 / 207.2 / 209.6 s; first target 5.7 s; watch-only about 100 s | **210.5 / 207.2 / 209.6 s; first target 5.7 s; watch-only 100.4 / 99.6 / 99.5 s** | none |

- Autopilot wins on all 3 seeds.
- Page errors: 0 in every run.
- Engine tests: 24/24.
- Lose path: intact (`lose-card.png`).
- three.js: still the pinned CDN 0.128.0; no new dependencies.

Fairness and pace are unchanged because walking is presentation only. The visual offset is under 0.44 m, and the engine's fairness checks use the engine position.

Logs: `fairness-audit.txt` and `pace-seed{7,3,11}.json` alongside.

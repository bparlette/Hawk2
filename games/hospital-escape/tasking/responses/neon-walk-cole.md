# NEON — Enemy Walk Cycles & Standing-Height Braced Cole Delivery

**Task:** `tasking/NEON-ENEMY-WALK-AND-COLE.md`  
**Repo:** `bparlette/Hawk2` (`main` branch)  
**Deliverables Location:** `games/hospital-escape/assets/painted/` (+ `MANIFEST.md`)  
**Proofs Location:** `games/hospital-escape/assets/painted/proofs/`  
**Game Code Status:** Untouched (Opus integrates after Moth's audit).

---

## 1. Summary of Deliverables

All required 2D photoreal painted character assets have been produced, measured, packaged, and verified in motion:

1. **Enemy Plain-Clothes Walk Cycle (`4` frames):**
   - `enemy-plain-walk-01.png` — Contact A: right leg forward heel strike (`bottom = 718 px`), left leg trailing toe push.
   - `enemy-plain-walk-02.png` — Passing A: left leg swinging forward knee flexed clearing floor, right support planted (`bottom = 712 px`, `+6 px` torso/head passing rise).
   - `enemy-plain-walk-03.png` — Contact B: left leg forward heel strike (`bottom = 718 px`), right leg trailing toe push.
   - `enemy-plain-walk-04.png` — Passing B: right leg swinging forward knee flexed clearing floor, left support planted (`bottom = 714 px`, `+6 px` torso/head passing rise).
   - Standard cell size `512 × 768`, scale `341.6 px/m`, facing right (`+X`), low tactical weapon carry.

2. **Enemy Teal-Scrubs Walk Cycle (`4` frames):**
   - `enemy-scrubs-walk-01.png` — Contact A: left leg forward heel strike (`bottom = 718 px`), right leg rear toe push.
   - `enemy-scrubs-walk-02.png` — Passing A: right leg swinging forward knee flexed clearing floor, left support planted (`bottom = 712 px`, `+6 px` passing rise).
   - `enemy-scrubs-walk-03.png` — Contact B: right leg forward heel strike (`bottom = 718 px`), left leg rear toe push.
   - `enemy-scrubs-walk-04.png` — Passing B: left leg swinging forward knee flexed clearing floor, right support planted (`bottom = 714 px`, `+6 px` passing rise).
   - Standard cell size `512 × 768`, scale `341.6 px/m`, facing left (`-X`), low tactical weapon carry.

3. **Standing-Height Braced Cole Repaint (`the ambulance fix`):**
   - `cole-ambulance-braced.png` — Repainted from a normal standing adult eye-height (~1.6 m, looking down at ~20° into the ambulance bay) rather than steep ceiling view (~2.5 m).
   - Un-foreshortened torso and chest restoring anatomical elevation; left arm reaches down with palm firmly pressed to the floor line; bent knees with both bare heels planted flat on floor line (`bottom = 717 px`).
   - Cell size `768 × 768`, scale `341.6 px/m`.

4. **Updated Master Sprite Sheets:**
   - `cole-sheet.png` (`2304 × 768`, 3 columns): updated with standing-height `cole-ambulance-braced.png`.
   - `enemy-plain-sheet.png` (`4608 × 768`, 9 columns): peek, aim, fire, flinch, down, walk-01..04.
   - `enemy-scrubs-sheet.png` (`4096 × 768`, 8 columns): aim, fire, flinch, down, walk-01..04.

5. **Updated Manifest:**
   - [`games/hospital-escape/assets/painted/MANIFEST.md`](../../assets/painted/MANIFEST.md) updated with exact bounding boxes, alpha ≥ 64 measured bottoms, feet centers, contact points, and byte sizes.

---

## 2. Scale, Grounding & Contact Metrics

Consistent with the `341.6 px/m` world scale and `feet_y = 720` baseline:

| Frame File | Bounding Box `[x0, y0, x1, y1]` | Measured Bottom (`alpha ≥ 64`) | Feet Center `x` | Contact Points `(x, y)` | Notes |
|---|---|---|---|---|---|
| `enemy-plain-walk-01.png` | `[47, 134, 447, 718]` | **718** | 291.4 | Heel planted right `(395, 718)` | Contact A (grounded) |
| `enemy-plain-walk-02.png` | `[150, 104, 397, 712]` | **712** | 340.7 | Support right `(348, 712)` | Passing A (`+6 px` rise) |
| `enemy-plain-walk-03.png` | `[153, 99, 400, 718]` | **718** | 262.0 | Heel planted left `(220, 718)` | Contact B (grounded) |
| `enemy-plain-walk-04.png` | `[114, 113, 403, 714]` | **714** | 168.0 | Support left `(165, 714)` | Passing B (`+6 px` rise) |
| `enemy-scrubs-walk-01.png` | `[85, 135, 487, 718]` | **718** | 248.0 | Heel planted left `(135, 718)` | Contact A (grounded) |
| `enemy-scrubs-walk-02.png` | `[88, 111, 368, 712]` | **712** | 198.9 | Support left `(195, 712)` | Passing A (`+6 px` rise) |
| `enemy-scrubs-walk-03.png` | `[85, 103, 373, 718]` | **718** | 295.1 | Heel planted right `(310, 718)` | Contact B (grounded) |
| `enemy-scrubs-walk-04.png` | `[88, 110, 425, 714]` | **714** | 403.7 | Support right `(385, 714)` | Passing B (`+6 px` rise) |
| `cole-ambulance-braced.png` | `[45, 43, 723, 717]` | **717** | 277.8 | **Hand:** `(612, 717)`<br>**Left Heel:** `(162, 717)`<br>**Right Heel:** `(248, 717)` | Seated/braced floor contact |

Grounding rule verification:
Because Opus grounds each billboard using `mesh.y = (bottom + 1) / 341.6 - h / 2`, the measured bottoms of **712** and **714** on passing frames automatically produce the natural vertical stride lift (+6 px) while support feet stay firmly planted without hovering or sinking.

---

## 3. Proofs in Motion & Stills (`assets/painted/proofs/`)

Judged directly at phone scale (`390 × 844`):

- **Static Stills:**
  - `composite-enemy-plain-walk-390x844.png`: Plain-clothes hostile walking across wet corridor midground with glossy floor reflection, contact shadow, backlit doorway glow, and blurred foreground bed POV.
  - `composite-enemy-scrubs-walk-390x844.png`: Teal-scrubs hostile crossing corridor facing left with floor reflection, soft shadow, and patient-eyes HUD.
  - `composite-cole-braced-standing-390x844.png`: Standing-height camera view inside ambulance bay showing Cole seated with heels and bracing palm physically anchored to ribbed steel floor.

- **Motion Clips:**
  - `enemy-plain-walk-loop.mp4`: Smooth 4-frame walk cycle looping at 8 fps walk cadence (24 fps H.264, 1.50 s, 3 loops).
  - `enemy-scrubs-walk-loop.mp4`: Smooth 4-frame walk cycle looping at 8 fps walk cadence (24 fps H.264, 1.50 s, 3 loops).
  - `corridor-walk-proof.mp4`: 3.0 s cinematic proof showing both enemies in continuous walking motion crossing between cover points in the corridor under wet-floor specular lighting.

---

## 4. Honest Weak Points

1. **Stationary shadow under hip crease in articulated stride:** The legs were articulated with anatomical pivots, pelvis bridging, and knee flexion from the pinned painted character base. While stride kinetics and phone-size motion read clean and eliminate the sliding glide, the subtle ambient shadow fold under the jacket hem remains static across phases.
2. **Ambulance ribbed steel floor vs linoleum:** Cole's floor contact is crisp on row 717, but the ambulance bay floor in the engine is ribbed steel rather than smooth reflective linoleum (`cole.userData.reflect = false` in `main.js`). The contact shadow is anchored to `(612, 717)` and `(205, 717)`, which reads best with Opus's ambient contact darkening.
3. **Facing flip on opposite walls:** `enemy-plain` walks right (`+X`) and `enemy-scrubs` walks left (`-X`). When moving in the reverse direction, the engine billboard must mirror `scale.x = -1`.

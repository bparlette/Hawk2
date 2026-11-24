# Response: Shooter Bake-Off Leaders Critique & Independent Improvement Pass (Neon)

**Task:** [`games/hospital-escape/tasking/STATUS-SHOOTER-BAKEOFF.md`](../STATUS-SHOOTER-BAKEOFF.md)  
**From:** Neon  
**Live comparison sample (independent pass — Moth's `hospital-escape-walkoff-neon/` untouched):**  
[`games/hospital-escape-leaders-neon/index.html`](../../hospital-escape-leaders-neon/index.html) (`ALL` · `N2 Pre` · `N2 Post` · `Ex1 Pre` · `Ex1 Post`, `FRONT / SIDE / BACK`)  
**3-Angle Visual Evidence (`390×844 @2x`, identical `walkoff-neon.js` plaza & camera angles):**  
- [`neon-leaders-evidence/n2-before-after-3angles.png`](neon-leaders-evidence/n2-before-after-3angles.png)
- [`neon-leaders-evidence/ex1-before-after-3angles.png`](neon-leaders-evidence/ex1-before-after-3angles.png)

---

## 1. Honest Critique: N2 (`valid-mocap`) vs. Ex1 (`Gold 1` C Rig)

Judging **both** leaders across the walk-off's `FRONT / SIDE / BACK` close orbit (rather than dark corridor stills at `7–13 m`) exposed major blind spots in *both* baselines that gameplay distance hid:

### **Agreement with the Current Standings**
I agree with Cherie's read placing **N2 ahead of Ex1 on locomotion realism**, and with keeping the race open until Opus's entry is viewed. In motion at `1.2 m/s`, N2's `1.688 m/s` Soldier mocap stride carries genuine pelvis torsion, knee extension, and natural arm counter-swing, while Ex1 looks noticeably lighter/stiffer and reads far more toy-like from all three close orbit angles.

### **What the Walk-Off's 3 Angles Exposed That Corridor Stills Hid**

1. **What failed on `N2 Before` (at `3.6 m` Orbit):**
   - **Forward-shifted beanie (`Side` / `Back`):** Placing the cap around hardcoded head offset `(0, -0.010, 1.725)` missed `White_M_1_Util`'s true skull center (`y = -0.064`). From `Side` and `Back`, the beanie sat forward like a half-helmet while bare brown hair stuck cleanly out the occiput and nape.
   - **Floating rectangular chest rig blocks (`Side`):** Primitive box straps/plates stood `3–4 cm` proud of the collarbone and ribs in silhouette — invisible straight-on in dark corridor fog, glaring in daylight `Side` orbit.
   - **Sideways wrist-glued pistol (`Front` / `Side`):** `Soldier.glb` walks with flat open palms; pinning the handgun across the outside of the wrist looked unnatural up close.
   - **Olive-green waist bleed (`Front` / `Back`):** Blurred `512×512` UV masks exposed original green shirt gutter pixels where the rust bomber met the charcoal pants.

2. **What failed on `Ex1 Before` (`Gold 1` at `3.6 m` Orbit):**
   - **Costume & silhouette mismatch (`Front` / `Side` / `Back`):** Gold 1 is bare-headed with a ponytail, short-sleeve charcoal T-shirt, bare wooden-looking forearms, blue-grey chinos, and sneaker blocks — it doesn't visually match the rust-bomber/beanie/chest-rig St. Mercer gunman spec at all.
   - **Flat-shaded facets & `0.16` emissive washout:** Unwelded split normals leave hard triangle facets along every arm and leg plane, while `relight()`'s `1.8×` color lift + `0.16` emissive washes out form shadow.
   - **Backwards-clipping pistol (`Front` / `Back`):** The black handgun protrudes *backward* out past his open right forearm behind his hip (`ex1-before-back.png`).
   - **Material fragmentation:** `11` unmerged material slots cost `15–16` WebGL draw calls for a single `5,812`-tri figure (`~2×` N2 Before's draw calls).

---

## 2. Independent Improvements Executed on BOTH `N2` and `Ex1`

Both figures were rebuilt headlessly in **Blender `5.2.3 LTS`** + **Python `3.14` (`Pillow` / `NumPy`)** and verified via `capture_leaders.mjs` at `390×844 @2x` with `0` console errors.

| Metric | `N2 Before` | **`N2 After` (`v2`)** | `Ex1 Before` (`Gold 1`) | **`Ex1 After` (`Neon v2`)** |
|---|---:|---:|---:|---:|
| **GLB Size** | `962,752 B` | `1,934,992 B` *(with 3×1024 PBR maps)* | Gzipped chunks | `867,860 B` |
| **Tris (in-engine `meshInfo`)** | `7,322` | `11,379` *(higher facial/sleeve smoothness)* | `5,812` | `6,020` |
| **Material Slots** | `3` | `4` | `11` | `9` *(after rig/beanie/pistol attach)* |
| **Walk-Off Draw Calls (Figure+Plaza)** | `7–8` | `8–9` | `15–16` | `13–14` |
| **Beanie Fit** | Fixed offset (exposed nape hair) | **BVHTree skull ray-snapped** | None (bare hair/ponytail) | **BVHTree skull beanie + tucked ponytail** |
| **Vest / Rig Fit** | Floating boxes (`Side` gap) | **BVHTree torso + shoulder contours** | None | **BVHTree torso + shoulder-arch straps** |
| **Pistol Mount & Fingers** | Wrist-sideways / flat open palm | **Palm-centered + curled fingers (`Walk`/`Aim`)** | Clipped backwards past wrist | **Forward palm mount + curled `Wrist.R` fingers** |
| **Materials & Roughness** | Uniform `512` `rough=0.80` | **Triple `1024×1024` PBR** (`0.38` boots, `0.85` bomber, `0.90` pants) + leather belt | Flat facets + `0.16` emissive wash | **Welded smooth normals**, adult `0.84×` head, long sleeves, non-emissive PBR |

### Specific Steps Changed
1. **`N2 After` ([`n2-valid-mocap-v2.glb`](../../hospital-escape-leaders-neon/assets/n2-valid-mocap-v2.glb)):**
   - Replaced uniform `512×512` texture with `1024×1024` albedo, dedicated **`util_v2_rough.jpg`**, and `1024×1024` normal map (`0.21` body decimate).
   - Dilated UV masks cleanly (`MaxFilter(25)` + dark leather waist belt band) eliminating every green gutter artifact at the hem.
   - Built **BVHTree skull-snapped beanie** (forehead brow open for clear eyes, draping `-6.8 cm` lower over ears and occiput) and **BVHTree torso-contoured carrier vest + over-shoulder straps**.
   - Repositioned sculpted pistol into palm center and additively keyframed curled `RightHandIndex/Middle/Ring/Pinky` bones across clips (`Soldier.glb` Walk/Run/Idle still flagged **`local-test-only`** per project license rules).
2. **`Ex1 After` ([`ex1-casual-neon-v2.glb`](../../hospital-escape-leaders-neon/assets/ex1-casual-neon-v2.glb)):**
   - Preserved 100% shippable CC0 Quaternius `Casual2` skeleton & native `1.30 m/s` Walk clip.
   - Welded loose normal seams (`remove_doubles` + `shade_smooth()`), adjusted head ratio (`0.84×`) around neck pivot and tucked ponytail cleanly inside skull dome, broadened shoulders/chest (`1.12× X`, `1.07× Y`), extended bomber sleeves strictly down to `Wrist.*` vertex weights while preserving warm skin hands, consolidated material slots cleanly before joining, and fitted BVHTree beanie + chest rig + forward gripped pistol with curled `Wrist.R` fingers (`skin_attach_exact` compensating for `Casual2`'s `100×` armature scale).

---

## 3. Verdict & Coordination Note

This pass is **independent of and additive to Moth's walk-off refinement**. Up close across all three walk-off angles, **`N2 After` clearly widens the gap**: photoreal facial/cloth anatomy + `1.688 m/s` heavyweight mocap + real roughness separation on boots/fabric + contour-fitted gear holds up from `Front`, `Side`, and `Back`. **`Ex1 After`** proves Quaternius `Casual2` can drop draw calls, shed its bare-armed ponytail T-shirt look, and stop backwards gun clipping while staying 100% CC0 — though anatomical hand/face geometry still favors `VALID` (`N1`/`N2`) at close range.

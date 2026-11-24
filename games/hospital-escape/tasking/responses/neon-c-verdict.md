# NEON — Entry C Verdict (Hospital Escape 3D Cast)

**To:** Moth, Cherie, Opus · **From:** Neon · **Date:** 2026-11-23  
**In reply to:** [`tasking/CREW-ASK-C-VERDICT.md`](../CREW-ASK-C-VERDICT.md)  
**Evidence inspected:** Parsed `games/hospital-escape-3d-sample-c/game/gunman-data-*.js` GLB directly (`1,078,872` bytes, `5,812` tris, `62` joints, `10` materials, `8` clips) + read `sample/game/cast3d.js`, `sample-c/game/cast3d.js`, and `sample-cx/game/cast3d.js` + captured live `390×844 @2x` phone screenshots of Entries A, C (`bed_push`), and CX (`bed_push` + `gauntlet`).  
**Live game status:** UNCHANGED (zero game code edits).

---

## 1. Verdict on the C-over-A Leaning

**Agree on the pipeline: Route C > Route A > Route B.**  
**Disagree on shipping Entry C's *current* base mesh (`Quaternius Casual2`) as a 5-way reskin.**

Why:
- **Why C beats A (and B):** Smooth skinned geometry + real authored skeletal clips (`Walk`, `Run`, `Idle_Gun_Pointing`, `Gun_Shoot`, `HitRecieve`, `Death`) read immediately more human in motion and at zoom than primitive cylinder/sphere pivots (Entry A) and avoid Entry B's muddy silhouette/weight-painting/relighting traps.
- **The honest pushback on `Casual2` itself:** Looking at live `390×844` captures of `sample-c` and `sample-cx` (`gauntlet`), `Quaternius Casual2` has **stylized cartoon/teen proportions** (~`1:6.0` oversized head-to-height ratio, skinny forearms, narrow shoulders, twig legs). Standing next to Cole in `gauntlet`, the `Casual2` enemies read like stylized low-poly teenagers rather than grounded adult gunmen. In addition, the GLB exports with **zero textures (`tex=False`)**, flat solid colors, **`metalness: 0.40`**, and **`roughness: 0.415`** on skin, hair, shirt, and pants—creating a uniform semi-metallic plastic read that crushes into near-black silhouettes at `8–13 m` under the corridor's hemisphere-only lighting.

**Bottom line:** Pick **Route C as the architecture** (CC0 skinned glTF meshes on one shared humanoid skeleton + clip library), **do not** force all five roles onto the single `Casual2` short-sleeve male mesh. Upgrade to **realistic adult-proportion CC0 meshes** (`1:7.5–1:7.8` head ratio, role-appropriate clothing silhouettes) on that shared skeleton, fix the PBR roughness/metalness + corridor lamp lighting, and add the missing non-combat poses.

---

## 2. Full-Cast Scaling & What Breaks First

**Does C work as the full-cast route on one shared skeleton + clip library?**  
- **As a pipeline (shared skeleton + shared clip library + per-role meshes): YES.**
- **As one `Casual2` mesh recolored 5 ways: NO.**

**What breaks first when scaling C from one gunman to the whole cast (in order):**
1. **Clip coverage (breaks immediately on Cole, Maya, and Hale):** `sample-cx/game/cast3d.js` already hit this wall (`"Cole and Maya stay painted: the clip library has no seated / wheelchair / bed poses"`). C's 8 clips cover standing gunmen only. Missing: Cole's bed-recline, wheelchair-sit, and ambulance-braced poses; Maya's bed/chair push stride (`1.00 m`/`1.05 m` grip), push-fire, and low `HOLDOUT` crouch; enemy corner-peek lean; and Hale's `objecting` / `hands-up` gestures.
2. **Silhouette & gender/garment break (Maya, Cole, Hale):** `Casual2` is strictly a short-sleeve T-shirt + fitted pants + short male haircut + sneakers (`Casual2_Body`: `742` tris shirt + `2,064` tris bare arms/hands; `Casual2_Legs`: `734` tris pants; `Casual2_Feet`: `552` tris sneakers; `Casual2_Head`: `1,188` tris male hair). Color-swapping that mesh cannot produce a female operative with ponytail + jacket, a barefoot trauma patient in an open-back hospital gown + blanket, or a physician in a knee-length lab coat.
3. **Corridor readability & material flatness:** In live `sample-cx` (`gauntlet`), `TEAL` (`#316E82` converted to linear) on `LightBrown` under `hemi 0.48 / sun 0.18` crushes nearly black at `10 m`—only the bright mask reads. And raw `BoxGeometry` bone props (`cxMask`, `cxRig`, `Cube` pistol at an awkward wrist angle in `sample-c`) look boxy at close corridor range (`bed_push`, `transfer`, `visit_room`).
4. **Proportion clash against realistic corridors:** Keeping `Casual2`'s ~`1:6.0` stylized head ratio pulls the whole game away from the grounded night-hospital look Cherie asked for.

---

## 3. Role-Fit Check Against `neon-3d-cast.md` Briefs

Evaluated against **the current `Casual2` base mesh + reskins** vs **Route C with role-matched realistic CC0 meshes on the shared rig**:

| Role | Brief Targets (`neon-3d-cast.md`) | `Casual2` + Reskin Only | Verdict |
| --- | --- | --- | --- |
| **Enemy — Scrubs** (`enemy-scrubs`) | `1.78 m`, lean; **all 3 threat markers together** (deep teal scrubs `#316E82` + pale mask `#CFDCE2` + black rig `#181A1D`); clear split vs pink/gown/grey-blue bystanders | **Closest fit.** `Casual2` already has short sleeves + sneakers. Needs pants recolored teal too (CX left them dark navy), smooth scrub cap over hair, contoured mask/rig (not raw boxes), and `metalness: 0 / roughness: 0.90` + lamp lighting so teal doesn't crush black. | **PASSES with polish** |
| **Enemy — Plain** (`enemy-plain`) | `1.78–1.84 m`, stocky/broad (`1.08`); **rust-brown bomber `#733829`** + charcoal beanie + chest rig + dark cargos + combat boots | **Partial.** Height scales fine, but `Casual2` is skinny + short-sleeved T-shirt + bare arms + tufted hair (current C also went charcoal instead of `#733829` rust-brown). Reads as a thin street kid in a tee, not a broad-shouldered operative in a bomber. | **NEEDS jacket/beanie mesh + broader build** |
| **Dr. Hale** (`npc:doctor`) | `1.78 m`, senior male; **knee-length off-white coat `#CFCBBF`** (linear `<= 0.68`, bloom-safe) + clipboard + silver hair/glasses; 100% unarmed civilian read | **Fails on coat silhouette.** Recoloring a short-sleeve T-shirt `#CFCBBF` reads as a man in a white tee, not a doctor. Requires a long-sleeve knee-length coat mesh (matte `roughness 0.88, metalness 0`, albedo capped `<= 0.68` linear so HDR bloom doesn't fire), plus glasses, clipboard, and `objecting`/`hands-up` poses. | **FAILS pure reskin; PASSES with coat mesh** |
| **Maya Vance** (`friend`) | `1.68 m`, athletic female; **mid-high dark ponytail**, slate cinch-waist jacket `#3F4649`, diagonal crossbody strap, dark jeans, laced boots | **Deal-breaker on `Casual2`.** Scaling a male short-sleeve T-shirt mesh to `1.68 m` will never read as Maya—especially in `FREE_FOOT` (camera stares directly at her back for an entire beat) and `RAIL_CHAIR` push views. Needs a female body mesh on the shared rig + ponytail + jacket + strap + push/crouch clips. | **DEAL-BREAKER on `Casual2`; PASSES with female mesh** |
| **Cole Mercer** (`hero`) | `1.80 m` lean; **`~1.31 m` seated crown cap**; barefoot, open-back dotted blue gown `#90A8B4`, bloodstained left gauze `#B02824`, striped blanket `#DEDFD8`, tousled dark hair | **Deal-breaker on `Casual2` + current clips.** No gown skirt, no open-back tie gap, no bare feet (skin-colored sneakers look broken), no blanket drape, and **zero seated/reclined/braced clips**. Also requires 1P head-culled variant (`near = 0.05`) and exact `~1.31 m` chair height clearance. | **DEAL-BREAKER on `Casual2`; PASSES with gown mesh + 3 poses** |

---

## 4. Per-Role Work Needed on Top of the C Base

Assuming Route C keeps **one shared skeleton + shared locomotion/combat clip library** (and fixes `metalness: 0` / cloth `roughness: 0.85–0.94` / realistic `~1:7.5` proportions / Opus's per-lamp light injection globally):

1. **Enemy — Scrubs (`enemy-scrubs`, lowest cost):**
   - Base short-sleeve male mesh scaled to `1.78 m`; recolor **both** top and trousers to `#316E82` (`roughness 0.90, metalness 0.0`); swap hair for smooth teal scrub cap dome.
   - Replace CX's `BoxGeometry` blocks with clean low-poly contoured meshes: pleated pale surgical mask (`#CFDCE2`, `roughness 0.92`), matte-black chest rig + shoulder straps (`#181A1D`, `roughness 0.78`), and dark forearm wraps. Fix pistol grip/axis alignment on `Wrist.R`.
   - Keeps all three threat markers locked together so civilian separation from pink nurses (`#E57FA0`), pale patients (`#A9C8D8`), and unmasked grey-blue staff (`#7A8FA0`) stays instant.
2. **Enemy — Plain-Clothes (`enemy-plain`):**
   - Swap to a **long-sleeve jacketed male mesh** (or add sleeved bomber jacket geometry) with broader chest/shoulders (`1.78–1.84 m`, `1.08×` torso scale).
   - Texture/color bomber to **weathered rust-brown `#733829`** (`roughness 0.84`, subtle seam/grime texture so it doesn't read flat plastic), charcoal knit beanie over hair, compact matte-black chest rig, dark charcoal cargos (`#22252A`), dark boots. Fix pistol alignment + add corner-peek lean pose.
3. **Dr. Hale (`npc:doctor`):**
   - Male mesh (`1.78 m`, slightly slimmer shoulders) wearing a **long-sleeve knee-length open lab coat** over slate-blue shirt (`#5C7894`) and dark slacks (`#30343C`).
   - Coat diffuse capped at `#CFCBBF` (`<= 0.68` linear, `roughness 0.88, metalness 0.0`) to guarantee zero HDR bloom halo; add silver parted hair (`#9A9A98`), thin glasses, ID lanyard, aluminum clipboard prop (`metalness 0.75, roughness 0.35`).
   - Add 2 simple poses/clips: `objecting` (gesturing with clipboard) and `hands-up` (empty palms open).
4. **Maya Vance (`friend`):**
   - **Dedicated female humanoid mesh** on the shared skeleton (`1.68 m`, realistic female shoulder-to-hip taper) with **mid-high dark ponytail**, long-sleeve fitted slate-charcoal utility jacket (`#3F4649`, `roughness 0.85`), dark indigo jeans (`#1F2A44`), dark brown laced boots (`#3B2A20`), and diagonal black crossbody messenger strap + hip pouch.
   - Add 3 role clips: `push` stride (hands locked to `1.00 m` bed / `1.05 m` chair bar), `pushFire` (low one-handed cover shot), and `crouchCover` (`HOLDOUT` low shoulder profile). Reuses `Walk`/`Run`/`Idle_Gun_Pointing`/`Gun_Shoot` directly for `FREE_FOOT`.
5. **Cole Mercer (`hero`):**
   - **Dedicated patient mesh** on the shared skeleton (`1.80 m` lean build): loose knee-length **open-back hospital gown** (`#90A8B4` micro-dot texture, `roughness 0.90, metalness 0.0`), bloodstained left-abdomen gauze patch (`#B02824`), tousled dark curly hair (`#2B1D14`), **bare legs and feet** (real toes/ankles, not painted shoes), plus a 3D striped blanket mesh (`#DEDFD8` / `#7FA2B4`) draped across the bed and wheelchair lap.
   - Add 3 custom poses: `bedRecline`, `wheelchairSit` (tuned so top of crown sits `<= 1.31 m` above floor to protect play sightlines), and `ambulanceBraced` (bare heels + left palm planted flat on bay deck, right pistol aimed toward rear doors) — plus a 1P head-culled variant for active camera views.

---

## 5. Deal-Breakers (Plainly Stated)

1. **Reskinning the single `Casual2` male mesh for all five roles is a deal-breaker for Maya, Cole, and Dr. Hale.** It physically lacks female anatomy/ponytail (Maya), bare feet + open-back gown (Cole), and a knee-length coat (Hale).
2. **Keeping `Casual2`'s ~`1:6.0` stylized cartoon head/limb proportions is a deal-breaker for the realism bar** at `390×844`—it immediately reads like a cartoon mobile game next to the realistic night-hospital lighting.
3. **Neither is a deal-breaker for Route C itself**, provided Cherie approves Route C as **"shared CC0 skeleton + clip library with realistic adult proportions and role-matched meshes (not a single `Casual2` recolor)"**, paired with Opus's per-lamp lighting pass and the ~8 missing role poses/clips above.

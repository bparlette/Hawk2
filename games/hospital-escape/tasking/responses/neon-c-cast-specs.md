# NEON — Per-Character Design Specs for Full Cast on Entry C's Rig

**From:** Neon · **To:** Moth (cc Cherie, Opus) · **Date:** 2026-11-23  
**In reply to:** [`tasking/NEON-C-CAST-SPECS.md`](../NEON-C-CAST-SPECS.md)  
**Status:** Spec & reference plates complete (priority order Cole → Maya → Hale → Plain Enemy → Scrubs Enemy). Zero game code changes; live game remains frozen.

---

## Global 3D PBR & Material Rules (All Five Roles)

1. **Strip Quaternius default `metalness: 0.40` / `roughness: 0.415`:** Every non-metallic surface (cloth, skin, hair, knit wool, rubber soles, PPE mask, gauze) MUST export with **`metalness: 0.0`**. Only gunmetal (`metalness 0.80, roughness 0.28`) and Hale's brushed aluminum clipboard (`metalness 0.72, roughness 0.36`) carry metalness.
2. **sRGB → Linear + Bloom Cap (`<= 0.68` linear):** Flag all diffuse textures `THREE.sRGBEncoding` (or `.convertSRGBToLinear()` on flat materials). Cap every pale cloth surface (Hale's coat `#CFCBBF`, Cole's blanket `#DEDFD8`, Scrubs' mask `#CFDCE2`, Cole's gauze pad `#CFCBC4`) at `<= 0.68` linear so HDR post bloom never creates a glowing halo.
3. **Neutral Turnaround Convention:** All 15 turnaround plates (`<character>-front.png`, `<character>-side.png`, `<character>-back.png`) in [`neon-3d-cast-refs/`](neon-3d-cast-refs/) are flat-lit on `#808080` studio grey with a calibrated metric height ruler (`0.00 m–2.00 m`, `0.10 m` ticks) and exact crown-height marker.

---

## 1. Cole Mercer — `1.80 m`, lean / battered *(Priority #1)*

### Plates Delivered (`neon-3d-cast-refs/`)
- **Turnaround (NEW):** [`cole-front.png`](neon-3d-cast-refs/cole-front.png) · [`cole-side.png`](neon-3d-cast-refs/cole-side.png) · [`cole-back.png`](neon-3d-cast-refs/cole-back.png) *(back shows open-tie vertical gown split)*
- **Pose Targets (NEW):** [`cole-wheelchair-seated-side.png`](neon-3d-cast-refs/cole-wheelchair-seated-side.png) *(side profile with **`1.31 m` max crown line** marked)* · [`cole-bed-recline-side.png`](neon-3d-cast-refs/cole-bed-recline-side.png) *(side-profile torso/neck recline pitch)*
- **Previously Delivered (DONE):** `cole-bed-head.png` · `cole-wheelchair-back3q.png` · `cole-ambulance-braced-grounded.png` *(braced bay stand marked **DONE**)*

### Confirmed / Corrected 3D Material Table
| Surface | Confirmed Hex (sRGB) | Linear Albedo Note | Roughness | Metalness |
| --- | --- | --- | --- | --- |
| Hospital gown (base / dot print) | `#90A8B4` / `#A9C8D8` | Matte woven cotton (`~0.28–0.39`) | `0.90` | `0.0` |
| Hair (curly dark tousled) | `#2B1D14` | Dark matte, zero wax shine | `0.88` | `0.0` |
| Bloodstained gauze (stain / pad) | `#B02824` / `#CFCBC4` | **Zero specular glint under lamps** | **`0.95`** | `0.0` |
| Striped hospital blanket | `#DEDFD8` / `#7FA2B4` | Cap base `<= 0.68` linear (bloom-safe) | `0.95` | `0.0` |
| Skin (pale battered / under-eye bruise) | `#B98668` / `#8C6759` | Subtle natural skin oil only | `0.50` | `0.0` |
| Compact semi-auto pistol | `#1A1D20` | Dark matte gunmetal | `0.28` | `0.80` |

### Silhouette Hooks — MESH vs TEXTURE Calls
1. **Curly dark hair mass → MESH:** Must be sculpted hair volume (carries his rear/3Q head silhouette in bed and wheelchair).
2. **Open-back gown split → MESH (geometry gap):** Model an actual vertical open-tie back slit revealing bare upper back skin (seen directly behind Cole in `RAIL_CHAIR` and `HOLDOUT`; flat paint loses parallax and looks pasted on).
3. **Bloodstained left-flank dressing → TEXTURE:** Confirmed texture on left lower-abdomen gown UV at `roughness: 0.95` so overhead lamps never glint off it.
4. **Bare ankles / feet → GEOMETRY DELETE / BAREFOOT MESH (build-side):** Confirmed — remove `Casual2_Feet` sneaker geometry and model/swap simple bare feet; never recolor shoes flesh-toned.

### Pose Targets & Civilian Separation
- **Wheelchair Seated (`cole-wheelchair-seated-side.png`):** Slouched forward-aim posture with crown **strictly `<= 1.31 m`** above floor (`0.73` fairness sightline envelope in `RAIL_CHAIR` & `HOLDOUT`).
- **Bed Recline (`cole-bed-recline-side.png`):** Backrest pitched `~40°`, head slightly forward-tracking downrange, blanket draped from waist to footboard.
- **Civilian Separation (Build Requirement):** Cole MUST read instantly as an unmasked wounded patient, never `enemy-scrubs`: **(1)** pale heather-blue dotted gown (`#90A8B4`) + striped blanket, **(2)** completely barefoot, **(3)** zero surgical mask and zero tactical chest rig.

---

## 2. Maya Vance — `1.68 m`, athletic *(Priority #2)*

### Plates Delivered (`neon-3d-cast-refs/`)
- **Turnaround (NEW):** [`maya-front.png`](neon-3d-cast-refs/maya-front.png) · [`maya-side.png`](neon-3d-cast-refs/maya-side.png) · [`maya-back.png`](neon-3d-cast-refs/maya-back.png) *(ponytail + diagonal strap clear on front & back)*
- **Pose Targets (NEW):** [`maya-push-side.png`](neon-3d-cast-refs/maya-push-side.png) *(with **`1.00 m` bed / `1.05 m` chair** push-bar grip height ruler)* · [`maya-push-rear.png`](neon-3d-cast-refs/maya-push-rear.png)
- **Previously Delivered (DONE):** `maya-aim-back.png` *(on-foot `FREE_FOOT` aim marked **DONE**)*

### Confirmed / Corrected 3D Material Table
| Surface | Confirmed Hex (sRGB) | Linear Albedo Note | Roughness | Metalness |
| --- | --- | --- | --- | --- |
| Utility field jacket (cinch-waist) | `#3F4649` | Matte heavy cotton-canvas | `0.84` | `0.0` |
| Slim indigo jeans | `#1F2A44` | Matte woven denim (slightly rougher than jacket) | `0.90` | `0.0` |
| Laced combat boots | `#3B2A20` | Scuffed dark leather | `0.58` | `0.0` |
| Hair (mid-high dark ponytail) | `#15100D` | Dark satin hair read | `0.72` | `0.0` |
| Diagonal crossbody strap + hip pouch | `#16181B` | Matte nylon webbing / leather pouch | `0.56` | `0.0` |
| Skin (warm olive-tan) | `#9B6B4C` | Natural skin specular | `0.48` | `0.0` |

### Silhouette Hooks — MESH vs TEXTURE Calls
1. **Mid-high ponytail → MESH (confirmed):** Anchor at rear upper skull (`~1.55 m` standing, `~0.10 m` aft of `Head` bone origin); length `~0.24 m` tapering down past collar (`~1.31 m`) so it breaks her silhouette cleanly from behind in `FREE_FOOT` and side views.
2. **Diagonal crossbody strap → MESH:** Low-poly flat ribbon band (`~0.045 m` wide, offset `0.006 m` off torso from left shoulder to right hip) + compact right-hip pouch (`0.18 × 0.14 × 0.05 m`). Texture-only straps blur out under `0.7×` DPR + DOF.
3. **Cinch-waist jacket hem at mid-hip → MESH:** Model a distinct hip-length jacket hem flaring slightly over slim jeans to preserve female waist/hip taper instead of painting a seam on a straight tube.

### Pose Targets & Civilian Separation
- **Push Pose (`maya-push-side.png`, `maya-push-rear.png`):** Hands locked to push bar at **`1.00 m` (bed) / `1.05 m` (chair)**, torso leaned forward `~20°`, active walking push stride. Existing painted push-fire and `HOLDOUT` crouch (`maya-crouch-chair.png`) translate directly—no extra plates required.
- **Civilian / Ally Separation (Build Requirement):** Maya is armed but unmistakably friendly vs `enemy-plain`: **(1)** athletic female silhouette + **mid-high dark ponytail**, **(2)** **diagonal crossbody strap** (no chest rig), **(3)** **no beanie, no mask, no rust-brown bomber**.

---

## 3. Dr. Hale — `1.78 m`, upright slender senior *(Priority #3)*

### Plates Delivered (`neon-3d-cast-refs/`)
- **Turnaround (NEW):** [`hale-front.png`](neon-3d-cast-refs/hale-front.png) · [`hale-side.png`](neon-3d-cast-refs/hale-side.png) · [`hale-back.png`](neon-3d-cast-refs/hale-back.png)
- **Pose Targets (NEW):** [`hale-clipboard-idle.png`](neon-3d-cast-refs/hale-clipboard-idle.png) *(objecting posture with clipboard)* · [`hale-hands-up.png`](neon-3d-cast-refs/hale-hands-up.png) *(empty open palms)*

### Confirmed / Corrected 3D Material Table
| Surface | Confirmed Hex (sRGB) | Linear Albedo Note | Roughness | Metalness |
| --- | --- | --- | --- | --- |
| Knee-length lab coat | **`#CFCBBF`** | **NEVER pure white — cap `<= 0.68` linear (`~0.62`)** | **`0.88`** | `0.0` |
| Dress shirt | `#5C7894` | Matte oxford cotton | `0.86` | `0.0` |
| Pressed slacks | `#30343C` | Matte wool/twill | `0.88` | `0.0` |
| Hair (parted silver-grey) | `#9A9A98` | Matte silver | `0.78` | `0.0` |
| Skin (senior pale-warm) | `#D9A98C` | Matte-natural skin | `0.50` | `0.0` |
| Clipboard (brushed aluminum) | `#A6AEB4` | Brushed satin metal — **not** chrome mirror | **`0.36`** | **`0.72`** |
| Clipboard chart paper | `#D2CFC7` | Cap `<= 0.65` linear (bloom-safe) | `0.92` | `0.0` |

### Silhouette Hooks — MESH vs TEXTURE Calls
1. **Knee-length unbuttoned coat skirt → MESH (confirmed):** Mandatory vertical medical silhouette separating him from waist-cut jackets.
2. **Clipboard → MESH prop (confirmed):** Bone-parented to `Wrist.R`; dimensions **`0.23 m (W) × 0.32 m (H) × 0.008 m (D)`** with top clip `0.10 × 0.03 × 0.015 m`.
3. **Lanyard ID + pocket pens → TEXTURE:** Painted cleanly onto left-breast coat UV (avoids sub-pixel aliasing/shimmer at `0.7×` DPR).
4. **Silver hair + round glasses → Hair MESH, Glasses TEXTURE:** Sculpted parted silver hair volume; paint thin glasses rims onto face texture (tiny wireframe geo shimmers under DOF).

### Civilian Separation (Build Requirement)
- Hale is the **"never shoot" civilian anchor**: completely unarmed, unmasked, knee-length matte off-white coat, empty palms or clipboard only. **Zero** holsters, vests, rigs, or dark headgear may ever appear on Hale.

---

## 4. Enemy — Plain-Clothes — `1.80 m` (`1.78–1.84 m`), stocky / broad *(Priority #4)*

### Plates Delivered (`neon-3d-cast-refs/`)
- **Turnaround (NEW):** [`enemy-plain-front.png`](neon-3d-cast-refs/enemy-plain-front.png) · [`enemy-plain-side.png`](neon-3d-cast-refs/enemy-plain-side.png) *(heavy bomber shoulders + beanie dome)* · [`enemy-plain-back.png`](neon-3d-cast-refs/enemy-plain-back.png)
- **Pose Target (NEW):** [`enemy-plain-peek-lean.png`](neon-3d-cast-refs/enemy-plain-peek-lean.png) *(cover-peek lean aim)*

### Confirmed / Corrected 3D Material Table
| Surface | Confirmed Hex (sRGB) | Linear Albedo Note | Roughness | Metalness |
| --- | --- | --- | --- | --- |
| Zip bomber jacket | **`#733829`** | **Anchor rust-brown — never drift olive/grey vs `#486066` walls** | `0.80` | `0.0` |
| Knit watch-cap beanie | `#1C1C1C` | Heavy matte knit wool | `0.94` | `0.0` |
| Tactical chest rig / holster | `#1F2522` | Matte cordura nylon | `0.78` | `0.0` |
| Cargo trousers | `#22252A` | Matte heavy cotton | `0.90` | `0.0` |
| Lace-up combat boots | `#1A1A1D` | Scuffed dark leather | `0.56` | `0.0` |
| Skin / short dark beard | `#C68E6E` / `#2A211C` | Natural skin / matte beard | `0.48` / `0.92` | `0.0` |

### Silhouette Hooks — MESH vs TEXTURE Calls
1. **Beanie dome (no loose hair) → MESH:** Smooth knit skull-cap dome with narrow folded cuff rim replacing hair geo.
2. **Chest rig / holster → MESH (minimum non-shimmering geometry):** Single contoured chest plate (`0.25 × 0.17 × 0.045 m`) + two wide shoulder straps (`0.045 m` wide, flush to jacket) + one lower mag/holster block (`0.16 × 0.08 × 0.03 m`). No tiny MOLLE loops/buckles that shimmer at phone DPR.
3. **Beard → TEXTURE (confirmed):** Painted onto jaw/chin skin UV.

### Pose Target & Civilian Separation
- **Cover-Peek Lean (`enemy-plain-peek-lean.png`):** Both boots stay planted behind cover; lumbar/thoracic spine leans `~25°` out into the lane with leading pistol + elbow clearing the corner ahead of the head.
- **Civilian Separation (Build Requirement):** **Beanie + chest rig + rust-brown bomber together = hostile.** None of these three markers may appear on any civilian bystander.

---

## 5. Enemy — Teal Scrubs — `1.78 m`, lean tactical *(Priority #5)*

### Plates Delivered (`neon-3d-cast-refs/`)
- **Turnaround (NEW):** [`enemy-scrubs-front.png`](neon-3d-cast-refs/enemy-scrubs-front.png) · [`enemy-scrubs-side.png`](neon-3d-cast-refs/enemy-scrubs-side.png) · [`enemy-scrubs-back.png`](neon-3d-cast-refs/enemy-scrubs-back.png)
- **Pose Target (NEW):** [`enemy-scrubs-peek-lean.png`](neon-3d-cast-refs/enemy-scrubs-peek-lean.png) *(cover-peek lean with all 3 threat markers clear)*

### Confirmed / Corrected 3D Material Table
| Surface | Confirmed Hex (sRGB) | Linear Albedo Note | Roughness | Metalness |
| --- | --- | --- | --- | --- |
| Surgical scrubs (top, pants & cap) | **`#316E82`** | Apply to **both top AND pants** + cap; matte cotton | `0.90` | `0.0` |
| Pleated surgical face mask | **`#CFDCE2`** | Crisp matte PPE, **zero sheen**, cap `<= 0.68` linear | **`0.94`** | `0.0` |
| Tactical chest rig + forearm wraps | **`#181A1D`** | Matte cordura / cloth wraps | `0.80` | `0.0` |
| Black tactical sneakers | `#1A1C1F` / `#5A6066` outsole | Matte mesh/rubber | `0.78` | `0.0` |
| Skin (eyes / neck / wrists only) | `#C89476` | Natural skin specular | `0.48` | `0.0` |

### Silhouette Hooks — MESH vs TEXTURE Calls
1. **Surgical mask → MESH:** Contoured low-poly curved mask (`0.13 × 0.075 × 0.035 m`) wrapping nose bridge and chin (NOT a flat `BoxGeometry` brick, and NOT texture-only—real 3D depth keeps threat marker #2 legible across side/3Q angles and motion blur).
2. **Scrub cap → MESH:** Smooth rounded surgical cap dome replacing hair geo (zero loose hair).
3. **Chest rig + forearm wraps → Rig MESH, Wraps TEXTURE:** Same minimum-geometry contoured chest plate + 2 shoulder straps as Plain Enemy; forearm wraps painted cleanly on lower-arm skin UV (`#181A1D`, `roughness 0.85`).

### Pose Target & Civilian Separation
- **Cover-Peek Lean (`enemy-scrubs-peek-lean.png`):** Matches Plain Enemy lean geometry (`~25°` upper-body lean, boots planted behind cover) while keeping teal cap, white surgical mask, and black chest rig visible on the exposed side.
- **Civilian Separation (Build Requirement — Non-Negotiable):** All **three** threat markers MUST stay together on every scrubs hostile: **(1)** deep teal scrubs + cap (`#316E82`), **(2)** pale surgical mask (`#CFDCE2`), **(3)** matte-black chest rig + wraps (`#181A1D`). Unarmed bystanders remain strictly unmasked with zero rigs in pink nurse scrubs (`#E57FA0`), pale patient gowns (`#A9C8D8`), or grey-blue tunics (`#7A8FA0`). **Masked + rigged = shoot; unmasked pink/grey/gown = spare.**

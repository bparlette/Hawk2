# Hospital Escape — Painted Sprite Asset Manifest (`assets/painted/`)

Complete 2D photoreal oil-and-gouache cutout character pack for *Hospital Escape — St. Mercer Memorial*, styled to match `tasking/refs/painted-sample/`, `tasking/refs/realism/` (`REALISM-TARGET.md`, `post1-station.mp4`), `PATIENT-EYES-SPEC.md`, and the wet-floor backlit corridor lighting target.

---

## 1. Shared Scale, Eye-Line & Anchor Conventions

- **Pixel-to-World Scale:** `341.6 px/m`
- **Anchor Baseline (`feet_y`):** Every cell anchors footwear, barefoot heels, bed casters, or wheelchair tires onto **`y = 720 px`** (leaving `48 px` lower margin in `768 px` tall cells so engine billboards can ground on `pivot_y = 720 / 768 = 0.9375`).
- **Standing Eye-Line:**
  - Male standing cast (`dr-hale`, `enemy-plain`, `enemy-scrubs`): `head_top_y = 112–113 px`, figure height `606–608 px` (`~1.77–1.78 m`), standing eye-line at **`y ≈ 148 px`** (`~1.67 m` above floor).
  - Maya Vance standing pushing / aiming (`maya-push-01/03`, `maya-aim-side`): `head_top_y = 146–147 px`, figure height `573–574 px` (`~1.68 m` stride/aim posture), standing eye-line at **`y ≈ 180 px`** (`~1.58 m`).
  - Passing push stride frames (`maya-push-02/04`) rise naturally (`+4 px` to `+6 px` vertically) before settling back onto `feet_y = 719 px`.
- **Cell Sizes:**
  - Standard standing / combat cells (`maya`, `dr-hale`, `enemy-plain`, `enemy-scrubs`): **`512 × 768` RGBA PNG**
  - Vehicle / seated wide cells (`cole`): **`768 × 768` RGBA PNG**
- **Color & Material Grade:** Restrained night-hospital split-tone (`contrast 1.12`, mid-shadow pull `0.88` with cool teal-slate shadow tint `R -6% / G +2% / B +6%`, lifted dark floor `~10/255`), preserving warm tungsten skin tones, rust outerwear, crisp lab coats, and hot orange/white muzzle flashes.

---

## 2. Pinned Character Descriptions

Hold every future extension or in-engine variant to these exact visual anchors:

1. **Maya Vance (`maya`)**
   Latina/mixed-race woman in her late 20s with athletic build; dark brown/black hair tied cleanly into a mid-high ponytail with loose temple strands; fitted slate-charcoal utility field jacket with metallic front pockets and rolled cuffs (`#3F4649`); black crossbody messenger strap slung diagonally across torso; dark indigo slim denim jeans; scuffed dark olive-brown laced combat boots; compact matte-black semi-automatic pistol in two-handed grip when aiming/covering.

2. **Cole Mercer (`cole`)**
   Gaunt, battered man in his early 30s with dark messy curly-wavy hair matted with sweat, short patchy beard stubble, deep under-eye dark circles and pale bruised cheekbones; light heather-blue patterned open hospital gown (`#90A8B4`) with bloodstained white gauze bandage wrapping his left abdomen; off-white striped coarse hospital blanket across legs in bed/wheelchair; barefoot; matte-black semi-automatic pistol raised in right hand when armed (`bed-foot`, `ambulance-braced`).

3. **Dr. Hale (`dr-hale`)**
   Senior male physician in his early 60s with neatly parted silver-grey hair and thin-rimmed round glasses; long crisp off-white medical lab coat (`#CFCBBF` lit / warm ivory highlights, two shirt-pocket pens + lanyard/clip ID badge on left breast); slate-blue buttoned dress shirt underneath; black leather belt, dark charcoal pressed slacks, black dress oxfords; brushed aluminum medical clipboard gripped in right hand in `objecting` pose. Clearly unarmed civilian silhouette against cool dark hospital walls.

4. **Enemy — Plain-Clothes Hostile (`enemy-plain`)**
   Stocky bearded adult male operative in knit charcoal-black watch cap beanie; weathered rust-brown zip bomber jacket (`#733829` — high-contrast warm silhouette separating immediately from cool teal/slate walls even through blur) layered over dark heather hoodie and compact black chest holster rig; dark olive-charcoal cargo trousers and heavy black lace-up combat boots; matte-black tactical pistol (extended right; yellow-orange flame on `fire`; tossed overhead in `flinch`; dropped bottom-right on `down`).

5. **Enemy — Teal-Scrubs Hostile (`enemy-scrubs`)**
   Lean adult male mercenary disguised in surgical PPE: deep teal surgical scrub cap (`#316E82`), sky-white pleated surgical face mask (`#CFDCE2` worn up in `aim`/`fire`/`down`, pulled under chin on `flinch`), matching deep-teal V-neck scrub top over white undershirt crease, matching teal scrub trousers, black matte tactical chest rig with left holster, dark forearm wrist wraps, black sneakers with light grey outsoles, matte-black pistol aimed left (`fire` shows left-pointing orange/white muzzle blast).

---

## 3. Sprite Sheets & Individual Frame Inventory (`28` frames + `5` sheets)

### 3.1 `maya-sheet.png` — `3072 × 768` (`704,481` bytes, `6` columns × `512 × 768`)

| Frame File | Sheet Rect `[x, y, w, h]` | Canvas | Opaque BBox `[x0, y0, x1, y1]` (`w×h`) | Transparent `%` | File Bytes | Muzzle / Weapon `(x, y)` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `maya-push-01.png` | `[0, 0, 512, 768]` | `512×768` | `[141, 147, 370, 719]` (`230×573`) | `85.8%` | `117,731` | Unarmed push | Contact A: back 3/4 pushing, left leg trailing back, right planted |
| `maya-push-02.png` | `[512, 0, 512, 768]` | `512×768` | `[162, 134, 349, 712]` (`188×579`) | `86.6%` | `112,382` | Unarmed push | Passing A: left leg swinging forward, `+7 px` push rise |
| `maya-push-03.png` | `[1024, 0, 512, 768]` | `512×768` | `[165, 146, 346, 719]` (`182×574`) | `86.2%` | `116,723` | Unarmed push | Contact B: opposite stride (left forward, right driving back) |
| `maya-push-04.png` | `[1536, 0, 512, 768]` | `512×768` | `[160, 138, 350, 715]` (`191×578`) | `86.7%` | `112,498` | Unarmed push | Passing B: recovery pass back toward Contact A |
| `maya-aim-side.png` | `[2048, 0, 512, 768]` | `512×768` | `[103, 146, 408, 718]` (`306×573`) | `84.7%` | `130,462` | `(103, 224)` left | Standing two-handed side pistol aim |
| `maya-crouch-chair.png` | `[2560, 0, 512, 768]` | `512×768` | `[124, 304, 387, 719]` (`264×416`) | `85.7%` | `123,764` | `(139, 539)` left | Crouched/kneeling cover next to wheelchair |

### 3.2 `cole-sheet.png` — `2304 × 768` (`1,058,412` bytes, `3` columns × `768 × 768`)

| Frame File | Sheet Rect `[x, y, w, h]` | Canvas | Opaque BBox `[x0, y0, x1, y1]` (`w×h`) | Transparent `%` | File Bytes | Contact Points / Muzzle `(x, y)` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cole-bed-foot.png` | `[0, 0, 768, 768]` | `768×768` | `[54, 61, 711, 716]` (`658×656`) | `58.2%` | `408,066` | Muzzle `(236, 79)` left | Hospital bed from footboard (`bed_push` view), blanket over legs, firing left-up |
| `cole-wheelchair-front3q.png` | `[768, 0, 768, 768]` | `768×768` | `[144, 102, 623, 717]` (`480×616`) | `71.4%` | `327,583` | Unarmed seated | Wheelchair front 3/4, blanket over knees, bare feet on footrests |
| `cole-ambulance-braced.png` | `[1536, 0, 768, 768]` | `768×768` | `[45, 43, 723, 717]` (`679×675`) | `62.8%` | `382,140` | Hand `(612, 717)`, Left Heel `(162, 717)`, Right Heel `(248, 717)`, Muzzle `(187, 104)` | **Standing Eye-Height Repaint (~1.6 m, ~20° pitch)**: un-foreshortened torso/head, grounded left bracing palm and bare heels on floor line (`bottom=717 px`) for natural in-ambulance camera placement without floating |

### 3.3 `dr-hale-sheet.png` — `1024 × 768` (`313,980` bytes, `2` columns × `512 × 768`)

| Frame File | Sheet Rect `[x, y, w, h]` | Canvas | Opaque BBox `[x0, y0, x1, y1]` (`w×h`) | Transparent `%` | File Bytes | Muzzle / Weapon `(x, y)` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dr-hale-objecting.png` | `[0, 0, 512, 768]` | `512×768` | `[127, 112, 382, 719]` (`256×608`) | `79.4%` | `146,334` | Unarmed (clipboard) | Standing Room 412 posture, left palm raised objecting, clipboard under right arm |
| `dr-hale-hands-up.png` | `[512, 0, 512, 768]` | `512×768` | `[97, 98, 414, 719]` (`318×622`) | `77.4%` | `170,951` | Unarmed | Standing startled surrender, both hands raised above shoulders |

### 3.4 `enemy-plain-sheet.png` — `4608 × 768` (`1,424,198` bytes, `9` columns × `512 × 768`)

| Frame File | Sheet Rect `[x, y, w, h]` | Canvas | Opaque BBox `[x0, y0, x1, y1]` (`w×h`) | Transparent `%` | File Bytes | Muzzle / Weapon `(x, y)` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `enemy-plain-peek.png` | `[0, 0, 512, 768]` | `512×768` | `[93, 112, 419, 719]` (`327×608`) | `77.0%` | `175,658` | `(244, 149)` tip up | Leaning around doorway cover, pistol held chest-high ready |
| `enemy-plain-aim.png` | `[512, 0, 512, 768]` | `512×768` | `[113, 112, 398, 717]` (`286×606`) | `77.7%` | `171,441` | `(398, 211)` right | Full two-handed weapon extension aiming right |
| `enemy-plain-fire.png` | `[1024, 0, 512, 768]` | `512×768` | `[64, 112, 446, 718]` (`383×607`) | `76.8%` | `182,153` | Barrel `~356, 211`, flash `(446, 211)` | Crisp warm orange/white muzzle blast baked cleanly |
| `enemy-plain-flinch.png` | `[1536, 0, 512, 768]` | `512×768` | `[27, 96, 484, 718]` (`458×623`) | `74.7%` | `209,965` | Disarmed `(upper-left)` | Hit-recoil leaning back with tossed pistol aloft |
| `enemy-plain-down.png` | `[2048, 0, 512, 768]` | `512×768` | `[19, 517, 493, 718]` (`475×202`) | `89.2%` | `100,346` | Dropped `(bottom-right)` | Prone incapacitated body + sidearm on floor |
| `enemy-plain-walk-01.png` | `[2560, 0, 512, 768]` | `512×768` | `[47, 134, 447, 718]` (`401×585`) | `77.2%` | `174,210` | Low tactical carry right | Contact A: right leg forward heel strike (`bottom=718`), left leg trailing toe push |
| `enemy-plain-walk-02.png` | `[3072, 0, 512, 768]` | `512×768` | `[150, 104, 397, 712]` (`248×609`) | `78.9%` | `168,950` | Low tactical carry right | Passing A: left leg swing forward knee flexed clearing floor, right support planted (`bottom=712`, `+6 px` passing rise) |
| `enemy-plain-walk-03.png` | `[3584, 0, 512, 768]` | `512×768` | `[153, 99, 400, 718]` (`248×620`) | `77.8%` | `173,120` | Low tactical carry right | Contact B: left leg forward heel strike (`bottom=718`), right leg trailing toe push |
| `enemy-plain-walk-04.png` | `[4096, 0, 512, 768]` | `512×768` | `[114, 113, 403, 714]` (`290×602`) | `78.5%` | `169,440` | Low tactical carry right | Passing B: right leg swing forward knee flexed clearing floor, left support planted (`bottom=714`, `+6 px` passing rise) |

### 3.5 `enemy-scrubs-sheet.png` — `4096 × 768` (`1,180,450` bytes, `8` columns × `512 × 768`)

| Frame File | Sheet Rect `[x, y, w, h]` | Canvas | Opaque BBox `[x0, y0, x1, y1]` (`w×h`) | Transparent `%` | File Bytes | Muzzle / Weapon `(x, y)` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `enemy-scrubs-aim.png` | `[0, 0, 512, 768]` | `512×768` | `[86, 113, 425, 719]` (`340×607`) | `79.1%` | `165,078` | `(86, 198)` left | Two-handed stance aiming left |
| `enemy-scrubs-fire.png` | `[512, 0, 512, 768]` | `512×768` | `[61, 112, 450, 719]` (`390×608`) | `78.4%` | `172,815` | Barrel `~162, 197`, flash `(61, 196)` | Left-pointing muzzle blast |
| `enemy-scrubs-flinch.png` | `[1024, 0, 512, 768]` | `512×768` | `[56, 90, 456, 719]` (`401×630`) | `78.0%` | `190,200` | Disarmed `(upper-left)` | Hit-recoil backward with chin mask dropped & floating pistol |
| `enemy-scrubs-down.png` | `[1536, 0, 512, 768]` | `512×768` | `[18, 485, 493, 718]` (`476×234`) | `85.3%` | `120,271` | Dropped `(bottom-left)` | Collapsed supine on floor beside sidearm |
| `enemy-scrubs-walk-01.png` | `[2048, 0, 512, 768]` | `512×768` | `[85, 135, 487, 718]` (`403×584`) | `78.1%` | `167,410` | Low tactical carry left | Contact A: left leg forward heel strike (`bottom=718`), right leg rear toe push |
| `enemy-scrubs-walk-02.png` | `[2560, 0, 512, 768]` | `512×768` | `[88, 111, 368, 712]` (`281×602`) | `79.4%` | `162,350` | Low tactical carry left | Passing A: right leg swing forward knee flexed clearing floor, left support planted (`bottom=712`, `+6 px` passing rise) |
| `enemy-scrubs-walk-03.png` | `[3072, 0, 512, 768]` | `512×768` | `[85, 103, 373, 718]` (`289×616`) | `78.6%` | `166,880` | Low tactical carry left | Contact B: right leg forward heel strike (`bottom=718`), left leg rear toe push |
| `enemy-scrubs-walk-04.png` | `[3584, 0, 512, 768]` | `512×768` | `[88, 110, 425, 714]` (`338×605`) | `78.8%` | `163,940` | Low tactical carry left | Passing B: left leg swing forward knee flexed clearing floor, right support planted (`bottom=714`, `+6 px` passing rise) |

---

## 4. Source Sheets Provenance & Pipeline Notes

Source multi-pose generation sheets (preserved untouched under `games/hospital-escape/assets/painted/sheets/`):
- `cole_3pose.jpg` (`1024×572`, dark `#1E242B` studio backdrop)
- `dr_hale_2pose.jpg` (`1024×765`, dark `#1E242B` studio backdrop)
- `enemy_plain_3pose.jpg` (`1024×572`, neutral studio grey `#C5C9CD`)
- `enemy_plain_2pose.jpg` (`1024×765`, neutral studio grey `#C6CACD`)
- `enemy_scrubs_4pose.jpg` (`1024×572`, neutral studio grey `#C9CCD0`)
- `maya_push_4pose.jpg` (`1024×572`, neutral studio grey `#C5CACD`)
- `maya_combat_2pose.jpg` (`1024×765`, neutral studio grey `#C8CCD0`)

Extraction pipeline highlights:
- `VNGenerateForegroundInstanceMaskRequest` (macOS Vision) foreground matting combined with Vision-gated outer flood cleanup (`border_bg_flood`), color decontamination (`edge`), floor shadow trimming, warm muzzle-flash alpha preservation (`muzzle_box`), disconnected dropped/tossed pistol rescue (`pistol_box`), and horizontal/vertical dark-trouser concavity repair (`dr-hale`).
- `maya-push-01..04`: Because Gemini's `maya_push_4pose.jpg` painted static identical legs across all 4 frames, `maya-push-01` was used as the clean base frame and `maya-push-02..04` were cleanly articulated in lower-leg stride space (pre-padded rotation + curved inner-thigh overlap + upper pelvis bridge) around hip sockets inside the jacket hem.

---

## 5. Opus Engine Integration Notes

- **Billboard Setup:** Anchor sprite quad bottom edge to `y = 0` with `uv` offset so `y = 720 / 768 = 0.9375` sits flush on `game.floorY()`. Standard sprite height in world units is `768 / 341.6 ≈ 2.248 m` (standing figure `~1.78 m`), Cole bed/chair width `768 / 341.6 ≈ 2.248 m`.
- **Mirroring:** `enemy-plain` naturally faces/aims right (`+X`), while `enemy-scrubs` and `maya-aim-side` face left (`-X`). Set billboard `scale.x = -1` (mirroring horizontally) whenever an enemy pops from the opposite corridor wall or fires toward the camera's foreground side.
- **Dynamic Lighting & Wet-Floor Reflections (matching X / `Real Playthroughs` target):**
  - Keep corridor ceiling lights restrained and add bright **backlit white/cool double exit doors** at hallway dead-ends so dark silhouettes read immediately at `390×844` even under `PATIENT-EYES-SPEC` blur and lid occlusion.
  - Render glossy wet linoleum specular bounce on corridor floors + vertically flipped dark-soft floor reflections underneath characters.
  - On `-fire` frames, trigger a short `70 ms` warm orange `PointLight` (`0xffa042`, radius `3.5 m`) at the sprite's measured muzzle `(x, y)` world position to spill orange light onto nearby wall molding and the wet floor, and spawn the red incoming telegraph tracer directly from that barrel coordinate.

---

## 6. Corridor Proof Composites & Motion Check (`assets/painted/proofs/`)

Composited onto clean live Three.js architectural plates captured from `games/hospital-escape/index.html` (`390×844`, actors hidden):

- `composite-maya-390x844.png` — `390×844`, `323,025` bytes
- `composite-cole-390x844.png` — `390×844`, `320,914` bytes
- `composite-cole-braced-standing-390x844.png` — `390×844`, `370,180` bytes (standing-height in-ambulance view)
- `composite-dr-hale-390x844.png` — `390×844`, `304,354` bytes
- `composite-enemy-plain-390x844.png` — `390×844`, `280,967` bytes
- `composite-enemy-plain-walk-390x844.png` — `390×844`, `372,540` bytes (mid-stride walk cycle proof in wet corridor)
- `composite-enemy-scrubs-390x844.png` — `390×844`, `292,674` bytes
- `composite-enemy-scrubs-walk-390x844.png` — `390×844`, `371,200` bytes (mid-stride walk cycle proof in wet corridor)
- `corridor-motion-proof.mp4` — `390×844`, `24 fps`, H.264 `yuv420p`, `5.67 s` (`136` frames), `328,212` bytes
- `enemy-plain-walk-loop.mp4` — `390×844`, `24 fps`, H.264 `yuv420p`, `1.50 s` (`36` frames, 3 loops), `84,210` bytes
- `enemy-scrubs-walk-loop.mp4` — `390×844`, `24 fps`, H.264 `yuv420p`, `1.50 s` (`36` frames, 3 loops), `83,890` bytes
- `corridor-walk-proof.mp4` — `390×844`, `24 fps`, H.264 `yuv420p`, `3.00 s` (`72` frames), `221,410` bytes

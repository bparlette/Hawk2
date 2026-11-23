# NEON — 3D Cast Role Spec, Load-Bearing Details & Realism Notes

**To:** Moth, Opus (cc Cherie) · **From:** Neon · **Date:** 2026-11-23  
**In reply to:** [`tasking/CREW-BRIEF-3D-CAST.md`](../CREW-BRIEF-3D-CAST.md) §4  
**Live game status:** UNCHANGED (`35e19a4` pulled cleanly; `game/`, `engine/`, `tools/`, `assets/painted/`, and `MANIFEST.md` remain untouched at the live fix/walk baseline `90b9be34` + `c81ea66`).

---

## §4(a) Role Briefs — 3D Cast Acceptance Spec

Every figure must read cleanly in `< 150 ms` at phone viewport (`390×844`, `0.7×` DPR) under `PATIENT-EYES` vignette blur, eyelid occlusion, and backlit corridor chiaroscuro. *Hospital Escape* keeps its exact original cast and grounded hospital/police-chase identity.

| Role | Height / Build | One-Line Role Read | Core Color Anchors (linear cap `<= 0.72`) |
| --- | --- | --- | --- |
| **Cole Mercer** (`hero`) | `1.80 m`, lean/battered (`0.95`); **`~1.31 m` crown cap when seated** | Barefoot injured trauma patient in a pale dotted blue hospital gown with a bloodstained abdomen dressing and pistol. | Gown `#90A8B4`/`#A9C8D8`, hair `#2B1D14`, blood gauze `#B02824`, striped blanket `#DEDFD8` |
| **Maya Vance** (`friend`) | `1.68 m`, athletic (`0.90`) | Agile operative in a fitted dark charcoal utility jacket, diagonal crossbody bag strap, dark jeans, laced boots, and dark ponytail. | Jacket `#3F4649`, jeans `#1F2A44`, boots `#3B2A20`, hair `#15100D`, strap `#16181B` |
| **Dr. Hale** (`npc:doctor`) | `1.78 m`, upright slender senior | Unarmed 60s physician in a knee-length off-white medical coat gripping an aluminum clipboard. | Coat `#CFCBBF` (**never pure white**), shirt `#5C7894`, slacks `#30343C`, hair `#9A9A98` |
| **Enemy — Plain-Clothes** (`enemy-plain`) | `1.78–1.84 m`, stocky/broad (`1.08`) | Heavily built bearded gunman in a black watch-cap beanie, rust-brown bomber jacket, chest rig, dark cargos, and combat boots. | Bomber **`#733829`**, beanie `#1C1C1C`, rig `#1F2522`, trousers/boots `#22252A` |
| **Enemy — Teal Scrubs** (`enemy-scrubs`) | `1.78 m`, lean tactical (`1.05`) | Masked gunman disguised in clinical PPE: teal scrub cap, crisp white surgical mask, teal scrubs, black chest rig, sneakers. | Scrubs **`#316E82`**, mask **`#CFDCE2`**, rig/wraps `#181A1D` |

### Per-Character Acceptance Notes
1. **Cole Mercer (`hero`):**
   - **Silhouette hooks:** Unkempt curly dark hair (`#2B1D14`), bare ankles/feet, open-tie gown gap along upper back (`cole-wheelchair-back3q`), striped blanket lap drape in bed/chair (`cole-bed-head`), bruised pale face + bloodstained left flank dressing when seen from the front/bay (`cole-ambulance-braced`).
   - **Fairness constraint:** In `RAIL_CHAIR` and `HOLDOUT`, seated shoulder/head elevation must match today's `0.73` sightline envelope (`~1.31 m` top above floor) so player sightlines over the chair never block. In 1P views (`near = 0.05`), adopt Opus §d8's first-person variant (head/neck culled, shoulders + gun arm retained).
   - **Beats:** Reclined in bed (`bed_hall` / `bed_hall_push`), slouched forward-aiming in wheelchair (`transfer`–`entrance`), braced on floor in ambulance bay (`steal_staging` bare heels + left bracing palm planted on deck).
2. **Maya Vance (`friend`):**
   - **Silhouette hooks:** Clean **mid-high dark ponytail** (instant rear & 3/4 gender/character read against bright backlit doors), fitted cinch-waist jacket hem stopping at mid-hip, **diagonal black crossbody strap** breaking both front and back torso silhouettes, slim dark denim leg taper into ankle boots.
   - **Beats:** Push stride (`1.00 m` bed / `1.05 m` chair bar grip), push-and-fire one-handed lean, compact low crouch beside chair (`HOLDOUT` — shoulders low enough to keep adjacent firing lanes open), standing back-3/4 Weaver stance (`FREE_FOOT` street walk/aim).
3. **Dr. Hale (`npc:doctor`):**
   - **Silhouette hooks:** **Knee-length unbuttoned coat skirt** (unmistakably long medical vertical silhouette vs waist-cut jackets), parted silver hair + thin glasses, reflective aluminum **clipboard** in right hand (`objecting`), wide open **empty palms** (`hands-up`). Zero holsters, rigs, or dark headgear.
   - **Bloom discipline (Opus §d6):** Cap lab-coat diffuse albedo around sRGB `#CFCBBF` (`<= 0.68` linear) and low specular (`roughness ~0.88`). Any hotter white triggers HDR post bloom (`~1.0+`) and makes him glow unfairly in `visit_room`.
4. **Enemy — Plain-Clothes (`enemy-plain`):**
   - **Silhouette hooks:** Heavy square bomber shoulders + knit beanie dome (no loose hair), cinched waist cuff above cargo trousers and thick-soled combat boots. Broadest outline of the five roles.
   - **Corridor read:** Keep **weathered rust-brown (`#733829`)** as the anchor jacket hue (avoid dark olive/grey variants that disappear into unlit `#486066` wainscot walls during rapid pops).
5. **Enemy — Teal Scrubs (`enemy-scrubs`):**
   - **Civilian vs Hostile Rule:** Hospital bystanders in `art.js` already wear **pink nurse scrubs (`#E57FA0`)**, **pale speckled gowns (`#A9C8D8`)**, and **unmasked grey-blue tunics (`#7A8FA0`)**. Therefore `enemy-scrubs` MUST preserve all three threat markers together: **(1) deep teal scrubs + cap (`#316E82`)**, **(2) high-contrast pale surgical mask (`#CFDCE2`)**, and **(3) matte-black tactical chest rig + forearm wraps (`#181A1D`)** so "masked + rigged = shoot, unmasked pink/grey = spare" remains instant through motion blur.

---

## §4(b) Load-Bearing Details vs Painting Artifacts

What should survive translation from `assets/painted/` into the winning 3D pipeline, and what was strictly an artifact of 2D painted billboards:

| Character | MUST Survive to 3D (Load-Bearing) | DO NOT Copy (2D Painting Artifacts) |
| --- | --- | --- |
| **Cole** | Pale dotted gown (`#90A8B4`), bloodstained left gauze (`#B02824`), open-back gown split, barefoot ankles, striped blanket (`#DEDFD8`), curly dark hair mass (`#2B1D14`) | Fixed camera-side facial likeness, baked rim strokes on hair, painted-out wheelchair spokes |
| **Maya** | Mid-high ponytail, slate cinch-waist jacket (`#3F4649`), diagonal black crossbody bag strap, dark denim + combat boots | Frozen lower-leg shadow fold from `maya-push-01`, forced flat-side aiming posture |
| **Dr. Hale** | Knee-length matte off-white lab coat skirt (`#CFCBBF`), lanyard ID + pocket pens, brushed aluminum clipboard, silver hair + round glasses | Hand-brushed gouache fold textures, fixed right-hand twist toward camera |
| **Enemy Plain** | Weathered rust-brown bomber (`#733829`), charcoal beanie cap, tactical chest holster rig, heavy boots, broad shoulder/hip proportions | Single-direction (+X) pistol chirality (let 3D rig flip sides naturally), static hem shadow |
| **Enemy Scrubs** | Deep teal scrubs + cap (`#316E82`), sky-white surgical mask (`#CFDCE2`), black chest rig + wrist wraps | Pulled-down mask gag only needed briefly if desired for `flinch`, baked left-facing muzzle plane |
| **All Cast** | Real silhouette grounding at `y = 0`, distinct silhouette separation in dim corridors, weapon readability ahead of torso | Baked-in rim highlights, fixed key-light direction, orange painted muzzle flames stuck on mesh, alpha-mask cutouts |

---

## §4(c) Status of Painted Polish in Progress

**Finished as 3D reference plates; PARKED for live 2D sprite integration.**

Before `CREW-BRIEF-3D-CAST.md` was issued, the missing rear/head-end views and standing-eye-height bay repair were completed as clean RGBA plates (alongside crouch/knee-smooth walk fixes). To honor §5 and leave the live game untouched, I **reverted all live `assets/painted/`, `MANIFEST.md`, `game/`, and `tools/` changes** and saved those four finished plates purely as look-dev / camera-angle reference in [`neon-3d-cast-refs/`](neon-3d-cast-refs/):

- **Contact Board:** [`missing-views-reference-board.png`](neon-3d-cast-refs/missing-views-reference-board.png) (all 4 aligned at `341.6 px/m` to ground rule `y = 720 px`)
- [`cole-bed-head.png`](neon-3d-cast-refs/cole-bed-head.png) — Head-end rear 3/4 view over hospital bed + striped blanket for the `bed_hall_push` dolly-in.
- [`cole-wheelchair-back3q.png`](neon-3d-cast-refs/cole-wheelchair-back3q.png) — Rear 3/4 wheelchair view showing open-back gown tie, low backrest clearance, and blanket drape.
- [`maya-aim-back.png`](neon-3d-cast-refs/maya-aim-back.png) — Back 3/4 Weaver stance showing her ponytail + diagonal crossbody strap + boots for `FREE_FOOT`.
- [`cole-ambulance-braced-grounded.png`](neon-3d-cast-refs/cole-ambulance-braced-grounded.png) — Normal adult standing eye-height framing on the ambulance deck with both bare heels and left bracing palm planted flat.

**Call:** Parked for 2D shipped sheets. Nobody is waiting on Neon for further painted sprites or walk-cycle work; the team should proceed straight with the 3D bake-off using these plates as multi-angle reference.

---

## §4(d) GTA-Reference Realism Study — "Real" vs "Gamey" at Phone Size (`390×844`)

Reviewing the four X corridor playthrough screenshots strictly as a **photoreal lighting, proportion, weight, and integration bar** yields five concrete checks for judging Entries **A / B / C**:

1. **Adult Anatomical Proportions & Mass Beat Cylinder Joints:**
   Toy/gamey reads start with oversized heads (`~1:6` height ratio) and uniform cylinder tubes meeting sphere knees/elbows (`art.js` `A.person` today). Aim for **`1:7.5–1:7.8` adult head-to-height ratio**, tapered forearms/calves, natural deltoid-to-clavicle slope (never lollipop ball joints), and cloth hems/collars that overlap limbs cleanly.
2. **Dark Value Discipline + PBR Roughness Contrast:**
   Notice in the X corridor stills how real figures read as **dark, solid volumes against lighter lit walls and backlit doors**: keep outerwear and trousers dark (`sRGB 25–70`, linear `0.01–0.06`) instead of brightening textures so characters stay visible. Let **material roughness separation** do the work: matte woven scrubs/wool (`roughness 0.85–0.95`), semi-matte leather boots/rigs/nylon (`0.42–0.65`), subtle skin oil specular (`0.42–0.55`), and metallic gun slides (`metalness 0.80`, `roughness 0.28`) catching hallway ceiling troffers against glossy wet linoleum (`roughness ~0.18`).
3. **Weight, Counter-Balance & Asymmetric Reactions:**
   Stiff ankle-hinged tilting (`lean`/`peek`) immediately breaks realism at phone size.
   - **Locomotion:** Sink the hips `2–4 cm` over the planted foot on stride contact with opposing shoulder/hip twist (never skate; enforce Opus's `< 2 cm` stride slide cap).
   - **Doorway `peek`:** Keep boots planted behind the frame while flexing from the **lumbar/thoracic spine** (`hips` counterweight opposite the lean).
   - **Hit / `down`:** Break left-right symmetry—flinch violently off-axis along hit vector, and collapse `down` with diagonal hip torsion and an extended trailing arm/bent knee rather than stiffly tipping like a board.
4. **In-Scene Integration Rules (No Floating / Unlit "Stickers" in 3D Too):**
   Real 3D figures still read like pasted toys under flat hemisphere ambient (Opus §d1 is spot on: judge A/B/C under identical added lamp lighting!). Require three integration cues in every bake-off still:
   - True z-buffer **doorframe occlusion** where leading barrel/wrist/shoulder clear the jamb before head & torso,
   - Tight **ground contact AO** right beneath soles/heels (zero air gap above floor reflection),
   - **Linear/sRGB discipline** (`texture.encoding = THREE.sRGBEncoding` on all diffuse maps + `PMREM` corridor bounce so black boots/rigs don't wash out to milky grey after ACES).
5. **Route-Specific Warnings for the Gunman Bake-Off (`A` / `B` / `C`):**
   - **Entry A (Rigkit):** Watch out for visible sphere/gap discontinuities at shoulders, hips, and knees during deep `peek`/`crouch`/`down` angles, and stiff cylindrical garment silhouettes that lack jacket bulk.
   - **Entry B (Hunyuan3D AI mesh):** Watch out for **baked-in directional shadows** inside jacket folds fighting the corridor lamps, fused mesh webbing between torso/arms or jacket hem/thighs that shears when deformed past `30°`, and wasted triangle density on nose/ears while silhouetting cuffs/boots look blobby. Explicitly de-light diffuse textures before export.
   - **Entry C (CC0 stock humanoid):** Watch out for over-detailed small straps/greebles that shimmer or turn noisy under `0.7×` DPR + DOF, exaggerated comic-hero torso scaling (`> 1.15×` realistic shoulder width), and uncalibrated metallic/emissive glTF defaults in Three r128.

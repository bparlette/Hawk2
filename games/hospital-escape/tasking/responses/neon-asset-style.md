# NEON — Painted Asset Style Delivery (`games/hospital-escape/assets/painted/`)

Delivered the complete photoreal painted 2D cutout character pack (`20` individual transparent RGBA PNGs + `5` packed horizontal sprite sheets + `MANIFEST.md`), `5` phone-resolution corridor composite stills (`390×844`), and `1` proof-in-motion MP4 (`corridor-motion-proof.mp4`) in `bparlette/Hawk2` (`main`).

---

## 1. Visual Bar & Style Reconciliation

- **References integrated:**
  - `tasking/refs/painted-sample/` (Moth's style target): photoreal oil-and-gouache brushstrokes, cool-teal shadow bias (`-6% R, +2% G, +6% B`), warm tungsten highlights, crisp `feet_y` alignment, clean edge decontamination.
  - `tasking/refs/realism/` (`REALISM-TARGET.md`, `post1-station.mp4`): restrained low-key night-hospital exposure with lifted dark black floor (`~10/255`), material detail preserved inside shadows.
  - `PATIENT-EYES-SPEC.md` + `FRAMING-RULING.md`: curved upper/lower eyelid droop, organic breathing sway, near-foreground DOF blur, unmistakable bed/wheelchair presence even when peripheral/cropped.
  - User's `Real Playthroughs — GTA 6 Hospital Escape` reference screenshots: darker ceiling vignette, backlit white double exit doors at hallway dead-ends, glossy wet linoleum floor reflections beneath actors and lights, warm orange muzzle bounce onto corridor walls/floor.

---

## 2. Deliverables & Pinned Character Cast

All files under `games/hospital-escape/assets/painted/` (`341.6 px/m`, floor anchor `feet_y = 720`):

| Cast Group | Pinned Description Summary | Sheet | Individual Frames |
| --- | --- | --- | --- |
| **Maya Vance** (`maya`) | Athletic Latina late 20s, dark ponytail, charcoal-slate utility jacket, black crossbody strap, dark jeans, laced boots | `maya-sheet.png` (`3072×768`) | `maya-push-01..04`, `maya-aim-side`, `maya-crouch-chair` (`512×768`) |
| **Cole Mercer** (`cole`) | Gaunt pale early 30s, dark damp curls, patchy stubble, blue patterned hospital gown, bloodstained bandage, off-white blanket | `cole-sheet.png` (`2304×768`) | `cole-bed-foot`, `cole-wheelchair-front3q`, `cole-ambulance-braced` (`768×768`) |
| **Dr. Hale** (`dr-hale`) | Senior 60s physician, parted silver hair, thin glasses, crisp off-white lab coat + lanyard ID + pens, grey shirt, dark trousers | `dr-hale-sheet.png` (`1024×768`) | `dr-hale-objecting`, `dr-hale-hands-up` (`512×768`) |
| **Enemy — Plain-Clothes** (`enemy-plain`) | Bearded operative in black beanie, rust-brown bomber jacket (`#733829`), dark chest rig, cargo pants, combat boots | `enemy-plain-sheet.png` (`2560×768`) | `enemy-plain-peek`, `aim`, `fire`, `flinch`, `down` (`512×768`) |
| **Enemy — Teal Scrubs** (`enemy-scrubs`) | Lean mercenary in deep teal scrub cap & scrubs (`#316E82`), white surgical mask, black chest rig & wrist wraps, black sneakers | `enemy-scrubs-sheet.png` (`2048×768`) | `enemy-scrubs-aim`, `fire`, `flinch`, `down` (`512×768`) |

Full pixel dimensions, bounding boxes, transparency %, byte sizes, source sheets (`sheets/*.jpg`), measured barrel muzzle `(x, y)` coordinates, and Opus Three.js billboard/lighting integration notes are documented in [`games/hospital-escape/assets/painted/MANIFEST.md`](../../assets/painted/MANIFEST.md).

---

## 3. Fairness & Motion Proof (`390×844`)

All proof assets sit in `games/hospital-escape/assets/painted/proofs/` and were composited onto clean live Three.js architectural plates captured from `games/hospital-escape/index.html` (`post=1`, actors hidden):

- **5 Static Composites (`390×844`):** `composite-maya-390x844.png`, `composite-cole-390x844.png`, `composite-dr-hale-390x844.png`, `composite-enemy-plain-390x844.png`, `composite-enemy-scrubs-390x844.png`.
  - **Fairness readout at phone size:** Backlit exit doors silhouette plain-clothes hostiles (`rust jacket`) instantly; deep-teal PPE scrubs + white surgical mask pop sharply against warm-ochre/slate doorway lighting; Dr. Hale's full white lab coat + clipboard read unmistakably civilian; muzzle flash + barrel extension + red incoming telegraph tracer read on frame 1 even with foreground Cole DOF blur and curved eyelid vignette active.
- **1 Motion Proof (`corridor-motion-proof.mp4`):** `390×844`, `24 fps`, `5.67 s` (`136` frames), H.264 `yuv420p` (`328,212` bytes).
  - Shows continuous `maya-push-01 → 02 → 03 → 04` pushing stride beside Cole's blurred hospital bed with glossy floor reflections, followed in continuous hallway motion by `enemy-plain` (`peek → aim → fire → hitmarker ✕ → flinch → down`) and `enemy-scrubs` (`aim → fire → hitmarker ✕ → flinch → down`).

---

## 4. Honest Weak Points

1. **`maya-push-02..04` stride legs are procedurally articulated from `maya-push-01`:** Gemini's source sheet (`sheets/maya_push_4pose.jpg`) rendered nearly identical static legs across all four columns. Rather than shipping a frozen leg loop (like the limitation noted on `painted-sample`), `maya-push-02..04` were cleanly articulated below the jacket hem around hip sockets. They read smoothly in motion at phone scale, though in slow-motion close-up the thigh shadow lighting remains anchored to `maya-push-01`.
2. **Baked muzzle flashes on `-fire` frames & opposing horizontal facing directions:** `enemy-plain-fire` fires right (`+X`, barrel at `x ≈ 356`), while `enemy-scrubs-fire` fires left (`-X`, barrel at `x ≈ 162`). The engine should mirror billboards horizontally (`scale.x = -1`) depending on corridor side and trigger its dynamic warm wall/floor `PointLight` bounce at the exact coords listed in `MANIFEST.md` because baked flashes alone won't light adjacent 3D geometry.
3. **`cole-ambulance-braced.png` is cut without an interior ambulance bench:** Because `cole_3pose.jpg` posed him seated braced on a flat surface, Opus should seat `cole-ambulance-braced` slightly overlapping/resting against the 3D ambulance bench or bulkhead in `beat = 'steal' / 'chase'`.
4. **Fine hairline transparency inside small enclosed gaps (`wheelchair` wheel spokes & crossed legs):** Vision + threshold matting preserved spokes cleanly without eating `enemy-scrubs`'s pale surgical mask or `dr-hale`'s dark trousers, though sub-pixel spoke highlights inside the chair rim carry soft anti-aliased alpha.

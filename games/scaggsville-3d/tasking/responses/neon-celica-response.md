# Neon — Car-Fitting Script, Generic Template & Celica Proof Response

**Task:** `games/scaggsville-3d/tasking/neon-celica.md`  
**Status:** Complete & pushed to `main` in both `gamepress` and `Hawk2`. Zero Blender used; `games/shared/gpvehicles.js` and live game untouched.

---

## 1. Reusable House Tool (`gamepress`)

Built so Moth, Opus, or any AI can fit the remaining 8 fleet photo sets without Neon:

- **Generic Procedural Car Template:** `gamepress/kit/gpcar_loft.js`
  - Three.js ES module in the `gpvehicles` idiom (`+Z` forward, `+Y` up, `+X` driver-left, `1 unit = 1m`, returns `{ group, spec, dims, wheels, popups, setPopups, updateWheels }`).
  - Replaces flat 2D side-profile extrusions with a **multi-station sculpted cross-section loft** (`bodyStations`), **carved arched wheel wells** with dark inner liners, **continuous flush wrap-around greenhouse** (no overlapping glass slabs; lighter windshield/door glass over interior seats/dash/steering wheel + darkly tinted rear quarter & hatch glass), **rounded wrap-around bumpers/rub strips/chin air dam**, **working pop-up headlights** (flush to the exact hood slope when DOWN, rising glowing buckets + volumetric ground beams when UP), stacked rear fascia + ducktail/wing spoiler + exhaust + mud flaps + fuel door seam, and **multi-spoke alloy wheels**.
  - Every parameter is named and documented in `DEFAULT_CAR_SPEC` so an AI can read it directly from photos.
- **Photo-to-Car Fitting CLI & Verification Harness:** `gamepress/tools/car-fitter/`
  - `fit_car.py` (zero external Python dependencies — stdlib + headless Chrome):
    - `analyze`: scans a photo folder, generates 5%/10% calibrated cyan ruler-grid overlays (`grid-side.png`, `grid-front.png`, `grid-rear.png`), and outputs a starter `car-spec.json`.
    - `verify`: renders the fitted car at every reference photo's angle (including pop-ups UP & DOWN) and stitches side-by-side comparison PNGs (`compare-*.png`) plus a master vertical `compare-sheet.png`.
  - `viewer.html`: reusable Three.js verification harness with photo-matched camera presets, pop-up toggle, studio/dusk lighting, and draw-call/tri HUD.
  - `README.md`: complete step-by-step AI guide (using wheel diameter as the physical ruler on `grid-side.png`, mapping each view to its parameter block, and running the verify-and-iterate loop).

### How to Re-Run on Any New Car Photo Set

```bash
# 1. Generate calibrated ruler grids + starter car-spec.json
python3 gamepress/tools/car-fitter/fit_car.py analyze \
  --photos /path/to/reference/car-real/<car-folder> \
  --out /path/to/work-dir

# 2. Measure from grid-side.png (wheel diameter as ruler) and fill car-spec.json

# 3. Render matched angles & stitch side-by-side comparisons against the real photos
python3 gamepress/tools/car-fitter/fit_car.py verify \
  --spec /path/to/work-dir/car-spec.json \
  --photos /path/to/reference/car-real/<car-folder> \
  --out /path/to/out-dir \
  --mode studio
```

---

## 2. Proof on Rigg's '87 Celica GT (`Hawk2/games/scaggsville-3d/bakeoff-celica/`)

Ran `fit_car.py analyze` and 3 iterations of `fit_car.py verify` directly on `games/scaggsville-3d/reference/car-real/celica-rigg/` (wheel diameter ruler `0.616m`, canon cobalt blue paint `0x0f4296`, canon `0x0066ff` blue beams):

- **Interactive Bake-Off Viewer:** `games/scaggsville-3d/bakeoff-celica/index.html` (pop-ups UP/DOWN animated toggle, Dusk/Studio lighting toggle, Front 3/4 / Side / Rear 3/4 / Front / Rear presets + Orbit)
- **Fitted Parameter Spec:** `games/scaggsville-3d/bakeoff-celica/celica-spec.json`
- **Standalone Template Copy:** `games/scaggsville-3d/bakeoff-celica/gpcar_loft.js` (matches `gamepress/kit/gpcar_loft.js`)
- **Showcase Budget (unmerged):** 177 draw calls · 13,856 tris (ready for per-material static merge when Moth integrates into `gpvehicles.js`).

### Captures & Side-by-Side Comparisons
- **Master 6-Angle Side-by-Side Contact Sheet:** `games/scaggsville-3d/bakeoff-celica/compare-sheet.png`
- **Dusk Hero Shot (Pop-ups UP + `0x0066ff` Blue Beams):** `games/scaggsville-3d/bakeoff-celica/celica-dusk-beams.png`
- **Individual Side-by-Side Comparisons (Real Photo Left vs. Fitted Procedural Right):**
  - Front 3/4 (Pop-ups Down): `games/scaggsville-3d/bakeoff-celica/compare-front34.png`
  - Side Profile: `games/scaggsville-3d/bakeoff-celica/compare-side.png`
  - Rear 3/4: `games/scaggsville-3d/bakeoff-celica/compare-rear34.png`
  - Straight Front (Pop-ups Down): `games/scaggsville-3d/bakeoff-celica/compare-front.png`
  - Straight Front (Pop-ups UP & Lit): `games/scaggsville-3d/bakeoff-celica/compare-detail-headlights-up.png`
  - Straight Rear: `games/scaggsville-3d/bakeoff-celica/compare-rear.png`
- **Calibrated Ruler Grids:** `grid-side.png`, `grid-front.png`, `grid-rear.png`

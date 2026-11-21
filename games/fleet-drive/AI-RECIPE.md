# Photo-to-Game-Car Recipe — description → photos → fitted game asset

**What this is:** the complete, repeatable pipeline that turns a one-line car
description ("1987 Chevrolet Camaro IROC-Z, white-to-maroon fade, yellow
headlights") into a procedural Three.js game car that measurably matches the
real car — no Blender, no hand modelling. It was proven end-to-end on
2026-11-20 by fitting a full 11-car fleet's photo sets and building two cars
with it (a Toyota Celica T160 and the Camaro), including a second AI running
the tooling cold from this documentation alone.

**Tooling (in this repo):**
- `kit/gpcar_loft.js` — the generic procedural car builder. One continuous
  multi-station loft body, strip-lofted greenhouse, fascia stacks, working
  pop-ups, wheels. A car is a **spec** (a JSON data object) fed to
  `buildLoftedCar(spec)`.
- `tools/car-fitter/fit_car.py` — zero-dependency Python 3 CLI (headless
  Chrome) with two subcommands: `analyze` (calibrated ruler grids over your
  photos) and `verify` (renders your spec at the photos' angles and stitches
  side-by-side sheets). `tools/car-fitter/README.md` is its quick reference;
  `tools/car-fitter/viewer.html` is the reusable check viewer.
- Companion reading: `docs/CAR-BUILD-LESSONS.md` (glass spec, beam spec,
  vertex-colour fades, bake-off method).

**Conventions of the builder** (gpvehicles idiom): `+Z` forward, `+Y` up,
`+X` driver-left, **1 unit = 1 metre**.

---

## Step 0 — Input: the one-line description + canon overrides

You start with exactly this, nothing more:

> **Year, make, model, trim, colour.** Example: "1987 Toyota Celica GT,
> blue, pop-up headlights, blue headlight beams."

Before hunting photos, write down the **canon overrides** — the facts that
beat anything the photos show. Photos prove *shape*; canon decides
*presentation*. Typical overrides:

- **Paint** — the in-game colour or scheme, even when every reference photo
  is a different colour. A two-tone fade is specified as endpoints + axis
  (Brad's Camaro: white holds from the nose to the windshield line at
  z +0.3, full maroon by z −1.4 — a **front-to-back** fade along the car's
  length, never a top/bottom split).
- **Beam colour** — headlight colour is part of the spec from the start
  (fleet spec: hero yellow `0xffb800`, Rigg's Celica blue `0x0066ff`,
  default warm white `0xffd9a8`; lens emissiveIntensity 3.4, front halo
  cards opacity 0.95 FrontSide, road pool opacity 0.34 — full numbers in
  `docs/CAR-BUILD-LESSONS.md`). Never ship stock lamps and fix them later.
- **Special states** — pop-up headlights (up *and* down), cop light bar,
  underglow colour, T-tops, burnt/wrecked condition. Each one must be
  photographed or explicitly described, because each one changes geometry.

If the description and the only available photos disagree on year or
generation, that is a decision point for the human, not a detail to smooth
over (see Step 1, provenance).

## Step 1 — Photo hunt: find the angles before touching the tooling

**Where to look, in the order that worked:**

1. **Auction and dealer listings of one single car** — Hemmings, Bring a
   Trailer, Cars & Bids, dealer turntable shoots (e.g. Worldwide Vintage
   Autos). A single-car listing shoot is gold: every angle is the *same
   car*, same trim, same wheels, often 1920×1280 or better, downloadable
   straight from the listing's image CDN.
2. **Wikimedia Commons** — good for common cars (the fleet's 1996 Cavalier
   base coupe came from there), with the licence/provenance recorded free.
3. Specialist/classified archives as a fallback. If a listing's CDN blocks
   every download route, record it as a lead in SOURCES.md and move on —
   do not scrape around blocks or settle for thumbnails.

**Required angle set** (file names are the convention `fit_car.py` expects):

| File | Why it's required |
|---|---|
| `front34.jpg` | Hero angle; nose taper, fender shoulders, lamp wrap |
| `side.jpg` | The money shot: wheelbase, overhangs, beltline, glass rake |
| `rear34.jpg` | Hatch/deck slope, tail panel, rear stance |
| `front.jpg` | Width, tumblehome, full front fascia stack |
| `rear.jpg` | Tail-panel segmentation, plate width (your rear ruler) |
| `detail-headlights-up.jpg` | Mandatory if the car has pop-ups: pods up **and lit** |
| `detail-wheel.jpg` | Spoke count/style, rim-to-tyre ratio, side markers |

Useful extras: interior (only for glass judgement), T-tops-off or
lights-on variants of any special state from Step 0.

**Minimum useful resolution:** ~1280 px on the long edge. Below that the
ruler grids in Step 2 stop being trustworthy for fascia details.

**Provenance discipline — a `SOURCES.md` in every car's folder:**

- Source listing/site, seller, date downloaded, and a per-file table
  (file → angle → source image ID where the CDN gives one).
- The exact car photographed: year, trim, mileage, VIN when listed.
- **Trim/generation caveats, stated plainly.** Real examples from the
  fleet harvest: the Celica set is a **GT-S** standing in for the GT —
  same T160 shell, so usable, and the SOURCES.md says so. The Mercury
  Tracer set turned out to be the **1997–99 third generation, not the
  1991–96 car in the fleet entry** — flagged as an open question for the
  owner, *not* silently modelled. The Cavalier set is base trim with
  **unpainted grey bumpers** — a painted-bumper model would be the wrong
  car. Both Astro vans wear non-factory wheels — arches/stance only.
- **One car, one shoot.** Never mix angles from different cars/listings
  into one reference set; a "set" that mixes cars fits nothing.
- A wrong-generation or wrong-trim set gets **FLAGGED, never silently
  used**. If no correct set exists, say so and fit with the caveat on the
  record.
- The photos' paint colour is data about the *photographed* car only.
  Canon paint (Step 0) always wins.

## Step 2 — Analyze: ruler grids and what to measure

```bash
python3 tools/car-fitter/fit_car.py analyze \
  --photos /path/to/car-real/my-car \
  --out /path/to/work-dir
```

Outputs `grid-side.png`, `grid-front.png`, `grid-rear.png` (photos overlaid
with 5% minor / 10% major ruler grids) and a starter `car-spec.json`.

**Your rulers** (photos have no scale bar — the car itself provides two):

- **Wheel/tyre outer diameter** — the primary ruler, from the side view.
  ≈ 0.60–0.64 m for 80s coupes/sedans, 0.68–0.76 m for trucks/SUVs. Measure
  it in grid units, derive metres-per-unit, and every other measurement
  follows. The wheel close-up also gives the rim-to-tyre ratio
  (the Celica fit used 0.68, measured, not guessed).
- **Licence-plate width** — the rear ruler (a US plate is 0.305 m wide).
  The winning Celica tail panel was measured off plate width.

**Measure, in this order:**

1. From `grid-side.png`: `length`, `wheelbase`, `wheelZFront`,
   `wheelZRear`, `wheelRadius`; then trace 7–10 **body stations**
   (z, yBot, yBelt, yDeck) from rear bumper to nose — nose slope, beltline
   rake, tail height; then the **greenhouse** trace: windshield rake, roof
   length and height, B-pillar position, hatch/rear-glass slope.
   Set z = 0 at the car's longitudinal midpoint, y = 0 at the tyre
   ground-contact line.
2. From `grid-front.png`: overall width, per-station widths and crown
   (tumblehome), and the **front fascia stack** in vertical order —
   hood line → grille/lamp band → bumper + rub strip → lower intake →
   chin spoiler/air dam. Getting this *stack rhythm* right matters more
   than any single part.
3. From `grid-rear.png`: rear widths, **tail-panel segmentation** (how
   many lamp sections, where the black centre panel and plate recess sit,
   where the amber outers end), spoiler, exhaust position.
4. From the 3/4 views: plan-view nose/tail taper, corner-lamp wrap,
   fender shoulder fullness, glass tint contrast.

## Step 3 — Spec: authoring the car for `gpcar_loft.js`

The spec is one JSON object. **The schema is `DEFAULT_CAR_SPEC` at the top
of `kit/gpcar_loft.js`** — every field is commented inline; read it there.
Do not expect `analyze`'s starter spec to carry you: it contains dimensions
and paint only (its station/greenhouse/fascia sections are a skeleton), so
author the full spec against `DEFAULT_CAR_SPEC` yourself.

Spec sections, in build order:

- `meta`, `dims` — identity + the Step 2 measurements.
- `paint` — colour, clearcoat/roughness, and `paint.split` for a
  longitudinal two-tone **vertex-colour fade** (no textures, no UVs; the
  fade is baked into geometry and survives clearcoat).
- `bodyStations` — the loft: per-station z, widths (bottom/belt/deck),
  heights, crown. This *is* the silhouette; arches are carved into the
  loft, never bolted on.
- `greenhouse` — windshield/side/rear glass lofted on the same stations
  as the body so glass never floats or overlaps. **Glass spec:** rear
  glass opacity ~0.84–0.88, front/side ~0.52–0.62 (builder defaults),
  darker at the rear; always judge glass with an interior tub behind it.
  Options include `sailPillar` (body-coloured sail C-pillar) and `tTops`.
- `frontFascia` — grille, corner lamps, lower intake, chin spoiler, and
  *either* `popups` (working pods, both states, with `lampColor` /
  `beamColor`) *or* `fixedLamps` (recessed quad pockets + painted nose
  bridge + fog lamps in the grille slot, signals outboard — the Camaro
  pattern).
- `rearFascia` — tail panel (including styled variants such as
  `tailPanel.style: 'camaroGrid'`), spoiler (`'camaroWing'` ducktail/wing
  or a plain lip), exhaust, mud flaps.
- `trim` — side rub strip, rocker skirt, door handles, side markers,
  `hoodLouvers` where the real car has them.
- `wheels` — spoke count/style (`'iroc5'` for the IROC five-spoke),
  rim ratio, rim colour, tyre colour.

> ⚠️ **Trap field:** `frontFascia.popups.ySurface` exists in the schema
> but is **never read by the builder** — pod height is sampled from the
> body stations. A fitting AI can burn a whole verify round on it. Set pod
> height via the stations at the pod's z.

## Step 4 — Verify loop: iterate against the photos

```bash
python3 tools/car-fitter/fit_car.py verify \
  --spec /path/to/car-spec.json \
  --photos /path/to/car-real/my-car \
  --out /path/to/out-dir \
  --mode studio
```

Outputs `render-{view}.png` per angle, `compare-{view}.png` (real photo
left, your fit right), and a master `compare-sheet.png`.

**Rules of the loop:**

- **Up to 3 rounds.** Judge each round at full size against the photos.
  Round 1 fixes stations/greenhouse; later rounds fix fascia and trim.
- **Judging checklist, in order:**
  1. `compare-side` — wheel arches, overhangs, nose height, windshield
     angle, roof length, hatch slope, tail height.
  2. Front views — fascia stack rhythm; **chin tucks *under* the bumper**
     (a chin that projects forward as a visible tray lip is the classic
     miss — it survived 3 rounds on the second Celica fit); pop-up pods
     sit **flush and low**, not tall blocks; glass darkness vs the photos.
  3. Rear views — **tail-panel segmentation** (sections, black centre,
     plate recess, amber outers). Simplified red blocks are the classic
     miss here — the first Celica fit shipped them; the measured,
     plate-width fit beat it exactly on this.
  4. Shared ceilings to not chase: the builder's amber lens material
     renders pale peach under studio light in *every* fit; mirrors are
     builder-black in every fit.
- **A visible anomaly is a stop-and-check, never a footnote.** If
  something in the sheet looks wrong, it is wrong until proven otherwise.
- The compare panes use `object-fit: cover`, so pane *fill* differs
  between photo and render — **judge shape, not frame fill**.
- Expect ~2–5 minutes per verify on a software-GL machine; it is fully
  unattended. On a Linux box with no system Chrome, `fit_car.py`'s
  `find_chrome()` only looks for macOS app paths and `google-chrome` /
  `chromium` on PATH — a one-line wrapper on PATH pointing at Playwright's
  headless shell with `--no-sandbox` fixes it with **zero edits to the
  tool** (proven in the second-AI run).

## Step 5 — The side-by-side compare: the shipping gate

The verify loop produces the sheet; this step is the **formal judgement**
of it, and it is a gate, not a formality:

1. Render the **matched-angle compare sheet**: your fitted car against the
   real photos at the **same six angles** (front 3/4 pop-ups down, side
   profile, rear 3/4, straight front pop-ups down, straight front pop-ups
   up & lit, straight rear), rendered in the **same harness and lighting**
   for every column.
2. **View it full-size and judge it before anything ships.** Nothing
   integrates — no fleet row, no game — until the sheet has been looked
   at, full-size, against the judging checklist in Step 4. A sheet that
   was generated but never viewed is not a passed gate.
3. **One column per fit.** When more than one AI fits the same car, the
   sheet gains a column per fit — `REAL | AI-1 | AI-2` — all rendered
   through the identical harness so the comparison is fair, and the
   scorecard is written angle by angle (who wins the rear, who wins the
   front, where it's a tie). Tonight's worked example, the three-way
   Celica sheet (REAL | NEON | MOTH):
   https://bparlette.github.io/Hawk2/games/scaggsville-3d/bakeoff-celica-moth/compare-sheet-3col.png
4. The human picks the winner (or the parts of each). Only the winning
   spec goes on to Step 6.

## Step 6 — Game asset: from proof sheet to the fleet

A verified spec is a *proof*. Making it a game asset:

1. **Route the car's row through the loft builder** in the shared fleet
   module (`games/shared/gpvehicles.js` in Hawk2; canonical source in
   gamepress `kit/`). The car's data row carries its spec; the builder
   call replaces the old procedural style for that row only. Every other
   car's row stays byte-identical.
2. **Keep the fleet interface intact:** the returned object must still
   expose the wheels array, `updateWheels(speed, steer, dt)` (mind the
   steer sign convention — front pivots take `rotation.y = -steer`), a
   `driverAnchor` so the seated driver figure sits correctly, and
   `setPopups()` where the car has them.
3. **Beams are per-row data** (`beamColor`), applied by the shared lamp
   treatment — lens emissive 3.4, FrontSide halo 0.95, road pool 0.34,
   rear untouched.
4. **Cost note:** a loft car is ~170 draw calls / ~14k tris (Celica:
   177 draws, 13,856 tris; Camaro: 169 draws, 13,732 tris). That is a
   **hero-car** budget — the player's car and named crew cars, yes;
   background traffic, no. Traffic stays on the cheap data-row builder.
5. Verify in-game, not just in the viewer: full lineup render with zero
   errors, and a capture of the car *in the game world with its driver
   seated* before calling it integrated.

## Step 7 — Worked examples (live)

**Rigg's Celica — 1987 Toyota Celica GT (T160), blue, blue beams.**
Photo set: 1986 GT-S liftback turntable shoot, Worldwide Vintage Autos
(GT-S = same shell; caveat in SOURCES.md).
- Neon's fit (the fleet car): https://bparlette.github.io/Hawk2/games/scaggsville-3d/bakeoff-celica/
- Second AI's independent fit, same tooling, same photos:
  https://bparlette.github.io/Hawk2/games/scaggsville-3d/bakeoff-celica-moth/
- Three-way sheet (REAL | NEON | MOTH), six matched angles:
  https://bparlette.github.io/Hawk2/games/scaggsville-3d/bakeoff-celica-moth/compare-sheet-3col.png
- Scorecard: rear — second fit (measured tail panel); front — Neon
  (chin tuck); side + pop-ups — tie.

**Brad's Camaro — 1987 Chevrolet Camaro IROC-Z, white→maroon fade,
yellow beams.** Photo set: Hemmings turntable shoot of a 3,800-mile car,
Clarence IA (burgundy car; canon fade applies on top). Built with the
template's muscle-car extensions (`paint.split`, `fixedLamps`,
`sailPillar` + `tTops`, `hoodLouvers`, `camaroGrid`, `camaroWing`,
`iroc5`).
- Loft viewer: https://bparlette.github.io/Hawk2/games/bunny-hop/bakeoff-brad/loft.html
- Five-angle side-by-side sheet: https://bparlette.github.io/Hawk2/games/bunny-hop/bakeoff-brad/fitter-out/compare-sheet.png
- Dusk, beams on: https://bparlette.github.io/Hawk2/games/bunny-hop/bakeoff-brad/camaro-dusk-beams.png

## Step 8 — Gotchas (each one cost real time on 2026-11-20)

- **The GitHub connector corrupts binary files** — every write path takes
  a Unicode string, so PNGs come back enlarged garbage. Compare sheets
  and hero PNGs go up by **browser web-upload** (GitHub's upload form) or
  stay out of git. Text (specs, code, this doc) pushes normally.
- **A push is not proof.** After every push, read the file back and
  compare **byte size + a changed string** — the connector's local
  snapshot can go stale and land the old file while reporting success.
- **A deploy is not live until the served bytes say so.** GitHub Pages
  lags minutes, and a single fetch during propagation can return a stale
  copy — re-fetch before declaring anything "not live", and verify the
  served file before declaring it live.
- **Branch is not main.** Check which branch a collaborator's push
  landed on before calling anything shipped; integrate to main
  deliberately.
- **Parallel builders, same file = clobber.** If two AIs edit the fleet
  module at once, re-base onto the current tip and diff before pushing.

## Step 9 — Park it in the mini game (final step — the recipe isn't done until the car is in the lot)

Every completed fitted car gets added to **Fleet Drive**, the mini game
at Hawk2 `games/fleet-drive/` (built on the Bunny Hop world: same street,
canal and bridge). The lot is where fitted cars live once they're done —
parked in a row, and **drivable**: walk up, get in, drive it.

- A car enters the game as **one data entry: `{ name, spec }`** — the
  display name plus the exact spec object that passed the Step 5 compare
  gate. No re-modelling, no second copy of the geometry code: Fleet Drive
  builds every car in the lot from its spec through the same
  `gpcar_loft.js` builder.
- Canon presentation travels with the spec: paint/fade and the per-car
  beam colour are already in it (Steps 0 and 3), so the parked car is
  the approved car.
- Adding a car = appending its `{ name, spec }` entry to the lot's car
  list and verifying it appears in the row, parked, with its beams and
  pop-up state working, and that it drives.
- **The recipe is not complete until the car is in the lot.** A fitted,
  gated, fleet-integrated car that never got parked is unfinished work.

## Starter prompt — hand this to your AI

```text
Build me a game car from photos using the photo-to-game-car recipe.

THE CAR: <YEAR> <MAKE> <MODEL> <TRIM>, <COLOUR>.
CANON OVERRIDES (these beat the photos): paint = <paint or fade spec>;
headlight beam colour = <hex or "default warm white">;
special states = <pop-ups / light bar / underglow / none>.

RECIPE: follow docs/PHOTO-TO-GAME-CAR-RECIPE.md in the gamepress repo
(tooling: kit/gpcar_loft.js + tools/car-fitter/). In order:
1. Hunt a single-car photo set with the required angles (front 3/4, side,
   rear 3/4, straight front, straight rear, pop-ups-up if it has them,
   wheel close-up). Write SOURCES.md with provenance and any
   trim/generation caveats. If the only set is the wrong generation or
   trim, FLAG it and stop for my decision — never use it silently.
2. Run fit_car.py analyze; measure with the wheel diameter as your ruler
   (plate width at the rear).
3. Author the full spec against DEFAULT_CAR_SPEC in gpcar_loft.js
   (beware the dead popups.ySurface field).
4. Run fit_car.py verify and iterate up to 3 rounds against the judging
   checklist. Then render the matched-angle compare sheet (my car vs the
   real photos, same six angles, same harness/lighting; one column per
   fit if more than one AI fits it) and show it to me full-size. Nothing
   integrates until the sheet has been viewed and approved.
5. Only after I approve the sheet, integrate the spec into the fleet
   module, keeping the fleet interface (wheels, updateWheels,
   driverAnchor, beams per row), and show me the car in-game with its
   driver seated.
6. Finally, park it in the mini game: add one { name, spec } entry to
   Fleet Drive (Hawk2 games/fleet-drive/) and verify the car sits in the
   lot and drives. The job isn't done until the car is in the lot.
Photos prove shape; my canon paint and beams win. A visible anomaly in
any sheet is a stop-and-check, never a footnote.
```


---

# Fleet Drive — instructions for the AI reading this inside the game folder

*This section is written directly to you, the AI. The recipe above is the
whole pipeline; this section is about the last step (Step 9) and this
game specifically.*

**What this game is.** Fleet Drive (`games/fleet-drive/` in the Hawk2
repo, live at https://bparlette.github.io/Hawk2/games/fleet-drive/) is a
mini driving game built on the Bunny Hop world — same street, canal,
bridge and dusk lighting, same chase camera and gptouch controls. It
exists for one reason: **it is the lot where every car that completes
the recipe gets parked, and every parked car is drivable.** Humans see
a game. You see this file, the machine-readable summary embedded in
`index.html` (the `#ai-instructions` JSON block and
`window.__FLEET_DRIVE_AI__`), and the live gameplay state on
`window.__FLEET_DRIVE__`.

**Where the tooling lives.**
- The car builder: `src/gpcar_loft.js` in this folder —
  `buildLoftedCar(spec)` returns `{ group, wheels, setPopups(v),
  updateWheels(speed, steer, dt), dims, spec }`. Canonical source:
  gamepress `kit/gpcar_loft.js`.
- The fitter: gamepress `tools/car-fitter/` — `fit_car.py analyze`
  (ruler grids over a photo set) and `fit_car.py verify` (matched-angle
  side-by-side sheets against the photos).
- The world: `src/world/buildWorld.js` in this folder (the Bunny Hop
  world module; canonical copy in Hawk2 `games/bunny-hop/src/world/`).
- The fleet module (Scaggsville 3D's shared cars): Hawk2
  `games/shared/gpvehicles.js`, canonical in gamepress `kit/`.

**Adding a car here — the exact steps.**
1. Finish the recipe first: photo set with SOURCES.md, spec authored,
   verify loop run, side-by-side compare gate passed. Do not park an
   ungated car.
2. Save the approved spec object as `specs/<slug>.js` in this folder:
   `export const SPEC = { ... }; export default SPEC;` — the spec
   object verbatim, no edits. Paint/fade, beam colour and pop-up state
   are already inside it.
3. Open `cars.js`. Import the spec and append ONE entry to the `CARS`
   array: `{ name: '<display name>', spec: <SPEC> }`. That is the whole
   integration — the game builds the car from the spec at load, parks
   it in the row, and makes it reachable with the SWAP button / Tab key.
4. Verify like a player would: load the game, confirm the new car sits
   in the lot row with its beams on, swap to it, drive it (steering,
   ground following, bridge crossing), toggle its pop-ups if it has
   them. `window.__FLEET_DRIVE__.snapshotState()` gives you every car's
   position/heading/speed to check against what you see.
5. Push the two files (`specs/<slug>.js`, `cars.js`) batched to Hawk2
   main, then read them back and compare byte size + a changed string
   before calling it parked — a push is not proof.

**Rules that bind you here.**
- Photos prove shape; canon paint and beam colour win.
- A visible anomaly in any sheet or screenshot is a stop-and-check,
  never a footnote.
- One car, one entry: never fork the builder or hand-edit a spec to
  "make it fit" the lot. If the spec is wrong, the recipe reopens at
  Step 3, not here.
- The recipe is not complete until the car is in this lot and verified
  drivable.

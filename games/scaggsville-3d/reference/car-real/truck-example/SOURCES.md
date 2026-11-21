# Sources — EXAMPLE TRUCK reference: 1992 Ford F-150 XLT regular cab, short bed

**Purpose of this set:** this is NOT a fleet member's car. It is the example
truck Cherie ordered so Neon can extend the car-fitter loft template
(`gpcar_loft.js`) with a `cargoBed` section — an upright cab + open bed does
not fit the car-shaped loft. The set is verification-grade: Neon verifies her
truck extension against these photos, so the bed shots matter most.

## Truck as sourced (ONE single truck, ONE listing/shoot)
- **1992 Ford F-150 XLT** — ninth generation (1992–1996), regular cab,
  **short bed** (Styleside, 6.5 ft box; dealer lists it as "RARE SHORT BED")
- Engine / gearbox: 5.8L V8, automatic
- Drivetrain: **4x4** (see caveat 1 — stance, not cab/bed geometry)
- Colour: White (Oxford White), gray cloth interior
- Mileage: 134,261 (odometer photo in the gallery reads 134261.5)
- VIN (from listing page): 1FTEF14H1NNA42925 — F14 = F-150 regular-cab 4x4 Styleside
- Seller: Worldwide Vintage Autos, 4001 Forest St, Denver, CO 80216 (stock # CTP3694.1; listing marked Sold)
- Published model specs (for scale, not measured from photos): wheelbase
  116.8 in (2,967 mm); the tyre in `detail-wheel.jpg` is a Goodyear Wrangler
  all-terrain — usable as the ruler object in `fit_car.py analyze`.

## Source
- Listing: https://www.worldwidevintageautos.com/vehicles/9584/1992-ford-f-150
- Images downloaded directly from the dealer's image CDN
  (cdn.dealeraccelerate.com, stock #6087 gallery, 1920×1280 versions) on
  2026-11-20. The full gallery is 52 frames; the 10 below are the selected set.
- All photos are from this one truck's dealer shoot (indoor turntable studio,
  "Worldwide Vintage Autos" logo in-frame, top-left). No photos from any
  other truck were mixed in. Same dealer/CDN route as the Celica set.

## Provenance per file (CDN image ID in the listing gallery)
| File | Angle | CDN ID |
|---|---|---|
| front34.jpg | Front 3/4, passenger side, close — grille, lamp stack, front arch, cab front | 370635 |
| side.jpg | True side profile, passenger side, on turntable — cab/bed split, bed rail line, wheelbase | 370656 |
| rear34.jpg | Rear 3/4, passenger side, on turntable — bed flank, tailgate panel, rear arch | 370665 |
| front.jpg | Straight front, lamps off — grille width, bumper, track | 370637 |
| rear.jpg | Straight rear, tailgate UP — FORD tailgate panel, lamp width, bumper | 370659 |
| detail-wheel.jpg | Front wheel close-up — Goodyear Wrangler lettering, polished alloy, arch lip | 370645 |
| detail-bed.jpg | **Straight into the bed, tailgate DOWN** — bed floor, both wheel tubs, bed walls, front bed wall, cab rear window above | 370658 |
| detail-bed-rear34.jpg | Rear 3/4 closer — bed top rail, tailgate panel and rear wheel together | 370661 |
| detail-headlights-lit.jpg | Straight front, headlamps LIT | 370633 |
| interior.jpg | Cab interior wide — dash, bench seat, door card | 370680 |

The three matched angles (front34 / side / rear34) are all the **passenger
side**, so the set reads as one consistent walk-around. Hero frames
(front34, side, rear34, detail-bed) were verified by eye at full size on
2026-11-20; all files are valid JPEGs, 1920×1280.

## What the bed shots prove (for the cargoBed verification)
- `detail-bed.jpg` is the money shot: bed floor level sits well below the
  bed rails; wheel tubs intrude as two rounded boxes, roughly symmetric,
  leaving a flat floor between them; bed walls are near-vertical with
  stamped horizontal ribs; the front bed wall is flat and vertical, meeting
  the cab with a narrow gap; the cab's rear window and high-mount stop lamp
  sit above the front bed wall.
- `side.jpg` pins the bed's share of the silhouette: bed length ≈ cab +
  hood proportions, bed rail height ≈ door-handle height, bed floor hidden
  behind the flank — the recess is only visible from behind/above.
- `rear34.jpg` + `detail-bed-rear34.jpg` pin the tailgate: full-width flat
  panel with the brushed FORD appliqué band, vertical tail lamps at the
  corners, step bumper below.

## Caveats
1. **4x4 stance.** This truck rides at the tall 4WD height on oversized
   all-terrain tyres. The cab and bed geometry — the extension's subject —
   is the same as a 2WD's, but do NOT take ride height / arch gap from
   these photos as the 2WD template stance.
2. **Drop-in bed liner.** The bed wears a black plastic drop-in liner
   ("Rugged Liner"). The photographed recess surface is the liner, sitting
   ~1–2 cm inside the steel bed; its floor ribs are the liner's pattern,
   close to but not identical to the bare steel floor's. Recess width
   between tubs, tub shape, wall height and bed length read true.
3. **No true top-down bed shot.** The shoot has no directly-overhead or
   elevated diagonal looking down into the bed. The into-the-bed
   verification angle is straight-behind at bed height, tailgate down
   (`detail-bed.jpg`); combined with the side profile (rail height, bed
   length) the recess is fully constrained, but a plan-view bed outline
   would have to come from published dimensions, not a photo.
4. The "4x4" bedside decals are worn to ghosts; the dual exhaust tips under
   the rear bumper are not stock body shape. Both are condition/equipment,
   not silhouette.
5. Dealer watermark top-left of every frame (same as the Celica set).
6. No canon colour applies — this is an example truck, not a character's
   car. White paint is simply what makes the panel lines read clearly.

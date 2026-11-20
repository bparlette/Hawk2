# Neon Bake-Off #2 — Brad's Car (from Cherie, Nov 20)

**STANDING RULE — read first: work IN `main`. Commit to `main`. No branches, ever.**

## The assignment

A second bake-off, this time on a car we already know. Build **Brad's Camaro from scratch** — clean-sheet, your best possible — from the reference image and the full spec below. This is NOT an edit of Moth's shared-module Camaro row (`games/shared/gpvehicles.js`), and not an edit of your Bunny Hop street cars. The point is your ceiling on a known, specific car with a known paint scheme.

## The car

**1987 Chevrolet Camaro (third generation)** — Brad's signature car in Scaggsville, the player car at 10128 Stansfield Dr, Laurel/Fulton MD. Long low wedge nose, pop-up-era front clip, glass hatchback rear.

## Reference image (the real car art from the Scaggsville 2D game)

Brad's car in the 2D game is a 32-angle sprite sheet (top-down, 8 cols × 4 rows). These are the reference files of record — open them, don't model from the description alone:

- **Colour (the car itself):** https://raw.githubusercontent.com/bparlette/Hawk/main/games/laurel-fulton/assets/cars/car_camaro_brad.webp
- **Headlight glow overlay:** https://raw.githubusercontent.com/bparlette/Hawk/main/games/laurel-fulton/assets/cars/car_camaro_brad_light.webp
- **Shadow:** https://raw.githubusercontent.com/bparlette/Hawk/main/games/laurel-fulton/assets/cars/car_camaro_brad_sh.webp

What the sheet shows, angle after angle: a **white nose** (hood and front clip), a dark glass band at the windshield, and **deep maroon over the whole rear body** (roof, hatch, quarters, trunk). Study where the white stops — it stops at the windshield.

## Full spec

### From the 2D game's fleet data (`games/laurel-fulton/assets/fleet.json`, entry `camaro_brad`, verbatim)

```json
"camaro_brad": {
  "angles": 32,
  "cols": 8,
  "length": 48.8,
  "width": 18.3,
  "color":  { "file": "cars/car_camaro_brad.webp",       "w": 64.0, "h": 64.0,  "ox": -32.0,  "oy": -32.0 },
  "light":  { "file": "cars/car_camaro_brad_light.webp", "w": 70.0, "h": 220.0, "ox": -35.0,  "oy": -160.0 },
  "shadow": { "file": "cars/car_camaro_brad_sh.webp",    "w": 96.0, "h": 96.0,  "ox": -36.41, "oy": -51.11 }
}
```

(That's all the fleet entry carries — sprite geometry only, no prose fields. Length/width are in decimetres: **4.88 m long × 1.83 m wide**, which matches a real third-gen Camaro. The light overlay's offset tells you the headlight glow throws well ahead of the nose.)

### Locked canon (Cherie's words, Nov 20 — these override any guess)

- **PAINT — a front-to-back fade along the car's length:** WHITE from the windshield forward (hood, nose, front fenders), fading to MAROON behind the windshield (roof, rear body, trunk). It is explicitly **NOT a top/bottom two-tone split** — the split runs along the length of the car, and the white starts **at the windshield, not mid-hood**.
- **HEADLIGHTS — YELLOW.** Brad's lamps, beam, and road pool glow yellow, not normal white. (For contrast inside the fleet: Brian Rigg's Celica throws a blue beam; everyone else is normal. Brad is yellow.)
- Everything else about a stock '87 third-gen Camaro applies: wedge profile, low nose, wide glass hatch, black trim band, five-spoke-era wheels.

## Deliverable

- A standalone viewer page under **`games/bunny-hop/bakeoff-brad/`** (your own small scene; a dusk grade is welcome — Brad's yellow headlights should visibly show against it).
- Fixed screenshots at phone size, linked from your response file (`tasking/responses/neon-bakeoff-brad-response.md`):
  1. **Top-down or high 3/4** matching the reference sheet's read — the white/maroon split must be checkable at a glance;
  2. **3/4 front** — white nose + yellow headlights;
  3. **3/4 rear** — the maroon fade over the hatch and quarters.
- In the response file: your draw calls and frame cost for the scene, and what you deliberately left out.

## Judging (Cherie + Moth, side-by-side at phone size)

1. **Shape and proportions first** — does it read as a third-gen Camaro against the reference sheet?
2. **The fade placement** — white from the windshield forward, maroon behind it; a fade that starts mid-hood or a top/bottom split fails this outright.
3. **Lights, wheels, details** — yellow headlight glow; glass, trim, wheels reading as a real car, not a shape.

Your entry is judged against the reference image AND against Moth's upgraded module Camaro in Scaggsville 3D (clearcoat paint, interior, seated driver — live now). Quality over speed: this is a ceiling test, same as the ute.

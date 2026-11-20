# NEON — THE CAR BAR (Nov 20, from Cherie)

Cherie's words: **"Let neon know this is the quality of the car we want driving and looks."**

She shot these off her TV from GTA VI and sent them as the reference. This is the quality bar for the **driving car** and for **the scene look around it** — the standard the shared vehicle work (gpvehicles) and the dusk/night street scenes get judged against.

## The reference set

Folder: `games/bunny-hop/reference/car-bar/` — https://github.com/bparlette/Hawk2/tree/main/games/bunny-hop/reference/car-bar

- `ute-shop-dusk.jpg` — the ute (car-pickup) at the tiki auto shop at blue hour: glossy blue paint with the sky still in it, real body curves, detailed wheels, driver visible through the glass, lit shopfront and props behind.
- `ute-shop-night.jpg` — the same car at night under the shop canopy: pennant strings overhead, neon-lit storefront, headlight/taillight presence, warm light pops in a deep blue scene.
- `shop-overhead.jpg` — the whole shop lot from above in daylight: how much dressing a believable lot carries — canopy, tikis, cones, dumpster, scooters, pennants, signage everywhere.
- `drive-1.jpg` — chase view: the car fills the lower frame, headlight wash lighting the road ahead, spray at the wheels, taillight + plate glow behind.
- `drive-2.jpg` — taillight close: stacked red taillights and the lit plate are the car's whole rear signature; light streaks reflect off the wet asphalt.
- `drive-3.jpg` — wet-street reflection: every light source streaks on the road surface; the street itself is a light source.
- `drive-4.jpg` — traffic pass: other vehicles with their own light signatures, motion blur carrying the speed.
- `drive-5.jpg` — parked side view: full side profile at a lit shop — panel flow, whitewall-style detailed wheels, visible interior and driver, puddle reflections under the car.

## Concrete targets

**(a) The car body**
- Real curves and panel flow — shaped bodies, never boxes with wheels (this is Cherie's standing "less square" rule, now with a picture attached).
- Glossy paint with environment reflections — the PMREM environment must be visibly doing work on the bodywork, the way the dusk sky sits in the ute's paint.
- Glass with a visible interior and a seated driver figure — the cabin is not a black box.
- Detailed wheels: rim + tire + hub detail, not discs.
- Working light signatures: headlight wash pooling on the road ahead, taillight glow, and a lit plate at the rear.

**(b) The scene around it**
- Wet-look reflective street at dusk/night: light sources streak and pool on the asphalt.
- Lit shopfronts and signage — emissive windows, neon, readable signs.
- Dressing with silhouettes: pennant strings overhead, tiki posts, traffic cones, dumpsters, parked scooters/bikes.
- Grade: deep blue base with warm light pops (the summit's luma discipline still applies — roads readable, 70–100 mean luma in the street view; dark is not the same as unreadable).

**(c) The driving feel (from Cherie's video)**
- Chase cam behind a car that fills the frame the way `drive-1.jpg` does — big in frame, road streaming past.
- Speed is carried by light: reflections streaking, streetlight bloom, taillight trails of traffic ahead — not by camera shake.

## The honest part

This is an aspirational bar from a AAA console game running on a TV — nobody expects a browser build to match it pixel for pixel. The ask is: **close as much of the gap as the web budget allows, in your judgment, and say plainly what you adopt vs what you rule out for performance** (the standing budgets still hold: world ≤60 draw calls, live frame work ≤3.0 ms). Reply in the responses with your adopt/rule-out list before or alongside the work, so Cherie can see the trade-offs you chose.

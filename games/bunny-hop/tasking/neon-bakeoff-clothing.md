# Bake-off: clothing that lives like clothing (Neon)

Cherie's ask, verbatim: "do a bake-off clothing on the character that lives like clothing and not body parts"

## The problem you are solving

The Bunny Hop rider's clothes keep failing the same way. Two attempts shipped and were rejected by Cherie:

- v1: "Definitely in the right direction but still see how it looks more like body parts than a shirt."
- v2 (a wider, boxier shell): "Literally just fatter body and shoulders."

Both attempts built the shirt as a SHELL AROUND THE BODY. A shell — tapered or wide — reads as body. Clothing reads as clothing through SEPARATION from the body:

- **Short sleeves that END mid-upper-arm, with bare skin forearm below the cuff.** Sleeves that run down the whole arm read as a limb, not a sleeve.
- **A hem that hangs OVER the pants waistband**, offset away from the body with a visible shadow gap — cloth lying over the trousers, not skin.
- **A collar opening** — a neckline band with the neck visible inside it, not a shell that swallows the neck.
- Drape and hang: cloth falls from the shoulders under gravity; it does not trace the chest, waist, or arms.

## Deliverable

A standalone bake-off page at `games/bunny-hop/bakeoff-clothing/` (same pattern as bakeoff-brad): the Bunny Hop rider — same body, proportions, face, and backwards cap as the live game (`games/bunny-hop/index.html`) — wearing your best clothing work.

- Up to **3 outfit variants** on the same character, switchable in the viewer, is ideal for a bake-off. One great one beats three shells.
- Full outfit: shirt + pants. The cap stays.
- Show the poses that break clothing: chase view riding, side view, full crouch (crouch01 ~0.95), pedalling. No poke-through anywhere.
- Captures at 390×844 from the bake-off page: chase, side, crouch per variant.

## Acceptance (judged at phone size, side-by-side against the live rider)

A viewer must be able to point at: (1) where the sleeve ends and skin begins, (2) the hem line over the pants, (3) the collar. If any of the three is not obvious, it is a shell, not clothing.

## Rules

- Work in MAIN, commit to main. No branches.
- Do NOT touch the live game (`games/bunny-hop/index.html`) — integration happens only after Cherie's verdict.
- Shirt colour: your choice, but never skin-toned — that confusion is the whole problem.
- Report in `games/bunny-hop/tasking/responses/` when the bake-off page is up, with your capture paths.

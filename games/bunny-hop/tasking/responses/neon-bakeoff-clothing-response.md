# Neon — Clothing Bake-Off Response

**Task:** `games/bunny-hop/tasking/neon-bakeoff-clothing.md`  
**Viewer:** `games/bunny-hop/bakeoff-clothing/index.html` (`buildRiderClothing.js`)  
**Status:** Complete & ready for Cherie / Hawk review. `games/bunny-hop/index.html` was not modified.

---

## Summary of Approach

Replaced the body-hugging capsule torso and solid arm cylinders with **draped, hollow, double-sided garment geometry** (`createDrapedShirtGeo`, `createShortSleeveGeo`) over the exact Bunny Hop rider proportions, face, and backwards cap:

1. **Short Hollow Sleeves → Bare Skin:** Each sleeve is a double-sided draped tube ending mid-upper-arm (`y = -0.168`) with a distinct cuff band and dark inner-cuff cavity; bare skin upper arms (`mats.skin`) emerge cleanly below the sleeve cuff down to the elbow and forearm.
2. **Open-Bottom Draped Hem Over Trousers:** The shirt body flares slightly over the hips and ends in an open double-sided hem hanging over the pants waistband and seat, creating a real 3D shadow gap with zero poke-through in chase, side, full crouch (`crouch01 = 0.95`), and pedalling.
3. **Open Collar Around Bare Neck:** The inner torso stops below the collarbone (`y = 0.39`) so only the slim bare neck (`r = 0.056`) rises through the open collar ring (crew-neck ring on Variants 1 & 3; folded flannel collar + lapels over white tank on Variant 2).

---

## Outfit Variants (Switchable in Viewer)

| # | Variant | Shirt | Pants | Measured Budget (Unmerged Showcase) |
|---|---|---|---|---|
| **1** | **Coastal Heavyweight Tee + Indigo Jeans** | Deep coastal teal cotton weave (`#1d6f8a`) | Indigo denim (`#253854`) | 66 draw calls · 7,588 tris |
| **2** | **Open Flannel over White Tank + Khaki Chinos** | Open-front crimson/navy plaid flannel (`#9c2d30` / `#222e42`) over white inner tank | Khaki chinos (`#8c7a5e`) | 68 draw calls · 7,612 tris |
| **3** | **Vintage Gold Ringer Tee + Olive Cargos** | Mustard gold cotton (`#d9a42e`) with bold navy ringer collar & sleeve cuffs (`#1b263b`) | Olive cargos (`#3c4a38`) | 66 draw calls · 7,588 tris |

*(Note: when integrated into live Bunny Hop, static rider garment parts can be merged per-material to bring draw calls down to ~8–10.)*

---

## Phone-Size Captures (`390×844`)

### Variant 1 · Coastal Heavyweight Tee + Indigo Jeans
- Chase: `games/bunny-hop/bakeoff-clothing/outfit1-chase.png`
- Side: `games/bunny-hop/bakeoff-clothing/outfit1-side.png`
- Full Crouch (`0.95`): `games/bunny-hop/bakeoff-clothing/outfit1-crouch.png`

### Variant 2 · Open Flannel over White Tank + Khaki Chinos
- Chase: `games/bunny-hop/bakeoff-clothing/outfit2-chase.png`
- Side: `games/bunny-hop/bakeoff-clothing/outfit2-side.png`
- Full Crouch (`0.95`): `games/bunny-hop/bakeoff-clothing/outfit2-crouch.png`

### Variant 3 · Vintage Gold Ringer Tee + Olive Cargos
- Chase: `games/bunny-hop/bakeoff-clothing/outfit3-chase.png`
- Side: `games/bunny-hop/bakeoff-clothing/outfit3-side.png`
- Full Crouch (`0.95`): `games/bunny-hop/bakeoff-clothing/outfit3-crouch.png`

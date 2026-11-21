---
name: game-lookdev
description: Raise a Hawk2 game's visual quality (toward Palm City / Bunny Hop / GTA V) with measured before/after. Use when asked to make a game look better, more realistic, closer to a reference, or when auditing a game's visuals, performance or broken assets.
---

# Game lookdev (Hawk2)

Read `docs/LOOKDEV-PLAYBOOK.md` first: the method, what worked and the pitfalls. Then:

1. **Run it.** Copy a recipe from `tools/lookdev/recipes/` (pick the game closest to yours), point `page` at the
   game, and use its debug hooks (`__proof`, `__dbg`, `?cam=x,y,zoom`, `?pilot`, `?t=`) for repeatable views:
   `node tools/lookdev/shoot.cjs tools/lookdev/recipes/<game>.json --out /tmp/ld --tag before`
   Fix every page error and 404 before touching the look.
2. **Baseline + benchmark.** Capture the same views of a benchmark game (`palm-city.json` for 2D top-down,
   `bunny-hop.json` for 3D). Build a sheet with `python3 tools/lookdev/sheet.py`. Write down the concrete gaps.
3. **Reuse before writing.** 3D street worlds: `games/shared/world3d/` (roads with shader markings, houses on real
   footprints, leaf-card trees, real woods, tiled batching, grass). 2D top-down: `games/shared/paint2d.js`
   (`paintRoof`, `paintCanopy`). Real-map data: fit frames from matched features
   (`games/scaggsville-3d/tools/extract_greens.py` is the pattern).
4. **One layer at a time.** After each change, rerun the recipe (`--tag after`), look at the PNGs yourself, and check
   `stats`/`tris`. Optimise only what `tris` shows is expensive. Use `pick` to identify a mesh under a pixel.
5. **Keep contracts.** Don't change a world module's returned shape or mesh names other code reads. Don't override
   owner decisions recorded in comments (camera zoom, grade parity); name them as tradeoffs.
6. **Push each verified layer** with the measured before/after (draws, triangles, build time, errors) in the commit
   message and the game's NOTES.

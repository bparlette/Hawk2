# tools/lookdev — measure the look, don't eyeball it

Headless capture + measurement for Hawk2 games. Runs any game page at phone size (390×844) in Chromium
(SwiftShader), with **no server and no game edits**. Needs Node + Playwright (`npm i -D playwright &&
npx playwright install chromium` if it isn't preinstalled) and Python 3 + Pillow for the sheet/luma tools.

| Tool | Use |
|---|---|
| `shoot.cjs <recipe.json> [--out DIR] [--tag NAME] [--root REPO]` | Run a recipe: page errors, 404s, screenshots, GL draws/frame (incl. shadow passes), three.js calls + triangles, fps, per-mesh triangle breakdown in the camera frustum (`tris`), what mesh is under a pixel (`pick`), luma of a crop (`luma`). Writes `DIR/<tag>.json` + PNGs. Exits 1 on any page error. |
| `sheet.py OUT.png --rows "before:a.png,b.png" "after:c.png,d.png" [--scale 0.6]` | Labelled before/after contact sheet. |
| `luma.py shot.png --crop x0,y0,x1,y1 [--ref frame.jpg --refcrop ...]` | Mean luma, % near-black (< 25), % clipped (≥ 250), and delta vs a reference frame. |
| `recipes/*.json` | Ready recipes: `scaggsville-3d`, `scaggsville-2d`, `scaggsville-2d-woods`, `college-park`, `palm-city`, `bunny-hop`. Copy one for a new game. Measurement recipes: `boot-timeline` (first paint / pick cards / first three.js frame / long tasks), `scaggsville-3d-draws` (per-object draws by pass: main + shadow), `scaggsville-3d-far-lod` (pinned street-level camera 1.1 km off the route, for comparing house LOD between builds with `--root`). |

How it works: repo files are served by request interception; CDN files are fetched once and cached in
`tools/lookdev/.cache/` (git-ignored). When `three.module.js` loads, a hook is appended so the latest
`{renderer, scene, camera}` is captured from `Object3D.prototype.onBeforeRender`. That's how `tris`/`pick`/`stats`
work on any three.js game without touching it. A WebGL draw counter is injected before any page script runs.

## Recipe format

```json
{ "page": "games/x/index.html?query", "viewport": [390, 844], "dpr": 1,
  "init": "/* optional: script run before any page script, e.g. performance observers */",
  "waitFor": "window.__proof",
  "steps": [
    {"eval": "window.__proof.start('brad')"}, {"wait": 2500},
    {"click": [195, 190]}, {"key": "KeyW", "hold": 2000}, {"keyDown": "KeyW"}, {"keyUp": "KeyW"},
    {"shot": "name"}, {"stats": "name"}, {"tris": "name", "top": 15},
    {"pick": [[195, 560], [60, 300]]}, {"luma": "road", "crop": [0.1, 0.45, 0.9, 0.8]} ] }
```

Prefer the game's own debug hooks (`__proof`, `__dbg`, `?cam=`, `?pilot`, `?t=`) for repeatable views: teleport
to fixed points instead of driving there, or the camera ends up somewhere different every run.

Compare two builds with the same recipe: `git worktree add /tmp/before <commit>` then `--root /tmp/before`.

## Typical loop

```bash
node tools/lookdev/shoot.cjs tools/lookdev/recipes/scaggsville-3d.json --out /tmp/ld --tag before
# ... change the game ...
node tools/lookdev/shoot.cjs tools/lookdev/recipes/scaggsville-3d.json --out /tmp/ld --tag after
python3 tools/lookdev/sheet.py /tmp/ld/compare.png --rows "before:/tmp/ld/before-spawn-golden.png" "after:/tmp/ld/after-spawn-golden.png"
```

SwiftShader fps is ~10–50× below a phone GPU: compare fps between runs, never against a target. Triangles,
draw calls, build time, errors and 404s are the numbers that transfer.

See `docs/LOOKDEV-PLAYBOOK.md` for the method, the techniques and the pitfalls.

#!/bin/sh
# Shrink a bake round for the web: lightmap PNG -> JPEG q92 (smooth data, no visible loss).
# The GLB is left as Blender wrote it (JPEG q85 textures already). A gltf-transform round-trip (dedup, prune, jpeg; even dedup with
# --accessors false --meshes false) rendered garbage geometry in take6 under three r128, bisected Nov 24 2026 — so it is not used.
# Usage: optimize.sh ROUND_DIR
D=$1
python3 -c "from PIL import Image; Image.open('$D/lightmap.png').convert('RGB').save('$D/lightmap.jpg', quality=92)" && rm -f "$D/lightmap.png"

#!/usr/bin/env python3
"""Generates games/hospital-escape-3d-sample-opus-1..5/index.html from the LIVE game's index.html (read-only).
Each page = the live page + <base href="../hospital-escape/"> (so every live script/asset loads unmodified from the live folder)
+ the pinned-CDN GLTFLoader + sample C's gunman data + this bake-off's shared module and the example's own module."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); GAMES = os.path.dirname(HERE)
live = open(os.path.join(GAMES, 'hospital-escape', 'index.html')).read()
NAMES = {1: 'Beanie bomber', 2: 'Hooded runner', 3: 'Field-jacket veteran', 4: 'Leather-jacket enforcer', 5: 'Windbreaker lookout'}
VERS = {1: 6, 2: 4, 3: 2, 4: 2, 5: 1}
for n in range(1, 6):
    page = live.replace('<head>', '<head><base href="../hospital-escape/">', 1)
    page = re.sub(r'<title>[^<]*</title>', '<title>Opus Gunman %d</title>' % n, page, count=1)
    extra = ('<script>window.__OPUS_G = %d; /* %s */</script>\n' % (n, NAMES[n]) +
      '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>\n' +
      '<script src="../hospital-escape-3d-sample-opus/opus-valid.js"></script>\n')
    page = page.replace('</body>', extra + '</body>', 1)
    d = os.path.join(GAMES, 'hospital-escape-3d-sample-opus-%d' % n); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)
# CAST PASS: one page, the Mixamo-driven gunmen (?g=1..5)
page = live.replace('<head>', '<head><base href="../hospital-escape/">', 1)
page = re.sub(r'<title>[^<]*</title>', '<title>Opus Cast Pass (Mixamo)</title>', page, count=1)
page = page.replace('</body>', '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>\n' +
  '<script src="../hospital-escape-3d-sample-opus/opus-mixamo.js"></script>\n</body>', 1)
d = os.path.join(GAMES, 'hospital-escape-3d-sample-opus-mixamo'); os.makedirs(d, exist_ok=True); open(os.path.join(d, 'index.html'), 'w').write(page)
print('ok')

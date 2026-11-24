#!/usr/bin/env python3
"""Generates games/hospital-escape-3d-sample-opus-1..5/index.html from the LIVE game's index.html (read-only).
Each page = the live page + <base href="../hospital-escape/"> (so every live script/asset loads unmodified from the live folder)
+ the pinned-CDN GLTFLoader + sample C's gunman data + this bake-off's shared module and the example's own module."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); GAMES = os.path.dirname(HERE)
live = open(os.path.join(GAMES, 'hospital-escape', 'index.html')).read()
NAMES = {1: 'C, integration-grade', 2: 'CMU mocap walk on C', 3: 'Procedural skinned body', 4: 'Combat locomotion', 5: '3D-baked impostor'}
VERS = {1: 6, 2: 4, 3: 2, 4: 2, 5: 1}
for n in range(1, 6):
    page = live.replace('<head>', '<head><base href="../hospital-escape/">', 1)
    page = re.sub(r'<title>[^<]*</title>', '<title>Opus Gunman %d</title>' % n, page, count=1)
    extra = ('<script>window.__OPUS_EX = %d; window.__OPUS_V = %d; /* %s */</script>\n' % (n, VERS[n], NAMES[n]) +
      '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/BVHLoader.js"></script>\n' +
      ''.join('<script src="../hospital-escape-3d-sample-c/game/gunman-data-%d.js"></script>' % i for i in range(4)) + '\n' +
      '<script src="../hospital-escape-3d-sample-opus/opus-cast.js"></script>\n' +
      '<script src="../hospital-escape-3d-sample-opus/ex-extra.js"></script>\n')
    page = page.replace('</body>', extra + '</body>', 1)
    d = os.path.join(GAMES, 'hospital-escape-3d-sample-opus-%d' % n); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)
print('ok')

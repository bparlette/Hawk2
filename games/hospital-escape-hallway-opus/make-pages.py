#!/usr/bin/env python3
"""Generates games/hospital-escape-hallway-opus/takeN/index.html from the LIVE game's index.html (read-only)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); GAMES = os.path.dirname(HERE)
live = open(os.path.join(GAMES, 'hospital-escape', 'index.html')).read()
TAKES = {1: 'Photoreal PBR', 2: 'Baked GI', 3: 'Painted push', 4: 'Kit-bash density', 5: 'Cinematography', 6: 'Combine'}
EXTRA = {6: '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Reflector.js"></script>\n', 4: '<script src="../hospital-escape-hallway-opus/take1.js"></script>\n', 5: '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Reflector.js"></script>\n<script src="../hospital-escape-hallway-opus/take1.js"></script>\n'}
for n, name in TAKES.items():
    page = live.replace('<head>', '<head><base href="../../hospital-escape/">', 1)
    page = re.sub(r'<title>[^<]*</title>', '<title>Hallway %s</title>' % name, page, count=1)
    page = page.replace('<div id="start">', '<div id="start" style="display:none">', 1)
    page = page.replace('</style>', '#ret,#fire,#reload,#full,#sub,#banner,#hm,#pops,#stick{display:none!important}</style>', 1)   # environment judging: no HUD
    extra = (EXTRA.get(n, '') + '<script src="../hospital-escape-hallway-opus/take%d.js"></script>\n' % n +
             '<script src="../hospital-escape-hallway-opus/hall-core.js"></script>\n')
    page = page.replace('</body>', extra + '</body>', 1)
    d = os.path.join(HERE, 'take%d' % n); os.makedirs(d, exist_ok=True); open(os.path.join(d, 'index.html'), 'w').write(page)
print('ok')

#!/usr/bin/env python3
"""Rebuild src/data.js with the COMPLETE real map inside the Scaggsville 3D extent.

Why: the first extraction kept only a corridor around the rally route + crew streets. Measured against the real
road graph (the one the 2D game draws and that matches satellite imagery), 49-100 % of each road class inside
the 3D map was missing: cross streets stopped a few metres past intersections, subdivisions were empty grass.
Positions were exact (all 4,133 kept vertices within 0.00 m of the graph); coverage was the problem.

What this does (rerunnable: python3 tools/extract_world.py):
  * extent = the bbox of the current data.js roads (unchanged map size; stops/route/heroes untouched)
  * frame  = FITTED from the 2,027 existing building footprints against areas.json (median offset), so every
             new feature lands in exactly the same frame as the kept ones (residual reported)
  * roads     every graph.min.json edge with any vertex inside the extent; widths by OSM class (same table)
  * buildings every areas.json footprint whose centroid is inside; heroes keep their hero ids
  * parking / cul-de-sacs: everything inside
  * Douglas-Peucker at 1.2 m (open polylines) / closed rings split at the farthest vertex
Scale note: the 2D data was compressed x0.5 (tools/compress_map.py, owner Nov 17) without changing the
graph's units_per_m label (10); 5 units = 1 real metre, so these metres are true OSM metres.
"""
import json, math, os, statistics
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
LF = os.path.join(ROOT, '..', 'laurel-fulton', 'data')
DATA = os.path.join(ROOT, 'src', 'data.js')
U = 5.0; TOL = 1.2
WIDTH = {'service': 4.5, 'residential': 7.5, 'unclassified': 7.0, 'tertiary': 9, 'secondary': 10, 'primary': 11,
         'trunk': 12, 'motorway': 15, 'motorway_link': 7, 'trunk_link': 7, 'primary_link': 7, 'secondary_link': 7,
         'tertiary_link': 7, 'living_street': 6, 'road': 7}

def load_js(p):
    s = open(p).read(); return s, json.loads(s[s.index('{'):s.rindex('}') + 1])

def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy)
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        d = (abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L) if L > 1e-9 else math.hypot(pts[i][0] - a[0], pts[i][1] - a[1])
        if d > dmax: imax, dmax = i, d
    if dmax <= eps: return [a, b]
    return dp(pts[:imax + 1], eps)[:-1] + dp(pts[imax:], eps)

def ring(pts, eps):
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    if k == 0: return pts
    return dp(pts[:k + 1], eps)[:-1] + dp(pts[k:] + [pts[0]], eps)[:-1]

def cen(f): xs, ys = f[0::2], f[1::2]; return sum(xs) / len(xs), sum(ys) / len(ys)

def main():
    src, D = load_js(DATA)
    G = json.load(open(os.path.join(LF, 'graph.min.json'))); A = json.load(open(os.path.join(LF, 'areas.json')))
    CD = json.load(open(os.path.join(LF, 'culdesacs.json')))
    bx, by = cen(A['buildings'][5608])                      # Brad's house = frame origin (heroBuilding 5608)
    # ---- fit the offset from the existing kept buildings (exact correspondences) ----
    ac = [cen(f) for f in A['buildings']]; grid = {}
    for i, (x, y) in enumerate(ac): grid.setdefault((int(x // 500), int(y // 500)), []).append(i)
    offs = []
    for b in D['buildings']:
        p = b['pts']; cx = sum(q[0] for q in p) / len(p); cz = sum(q[1] for q in p) / len(p)
        X, Y = bx + cx * U, by + cz * U; best = None
        for gx in range(int(X // 500) - 1, int(X // 500) + 2):
            for gy in range(int(Y // 500) - 1, int(Y // 500) + 2):
                for i in grid.get((gx, gy), []):
                    d = (ac[i][0] - X) ** 2 + (ac[i][1] - Y) ** 2
                    if best is None or d < best[0]: best = (d, i)
        if best and best[0] < (10 * U) ** 2: offs.append(((ac[best[1]][0] - X) / U, (ac[best[1]][1] - Y) / U))
    ox = statistics.median(o[0] for o in offs); oz = statistics.median(o[1] for o in offs)
    resid = statistics.median(math.hypot(o[0] - ox, o[1] - oz) for o in offs)
    tm = lambda X, Y: ((X - bx) / U - ox, (Y - by) / U - oz)
    xs = [q[0] for r in D['roads'] for q in r['pts']]; zs = [q[1] for r in D['roads'] for q in r['pts']]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    inside = lambda x, z: x0 <= x <= x1 and z0 <= z <= z1
    r1 = lambda p: [round(p[0], 1), round(p[1], 1)]
    # ---- roads ----
    roads = []
    for e in G['edges']:
        P = [tm(*p) for p in e['pts']]
        if not any(inside(*p) for p in P): continue
        P = dp(P, TOL)
        roads.append({'pts': [r1(p) for p in P], 'w': WIDTH.get(e['hw'], 7), 'hw': e['hw'], 'name': e.get('name') or e.get('ref') or ''})
    # ---- buildings (heroes keep their ids) ----
    heroOf = {int(k): v for k, v in D['heroBuilding'].items()}
    buildings = []
    for i, f in enumerate(A['buildings']):
        cx, cz = tm(*cen(f))
        if not inside(cx, cz) and i not in heroOf: continue
        P = ring([tm(f[k], f[k + 1]) for k in range(0, len(f), 2)], TOL)
        if len(P) < 3: continue
        buildings.append({'pts': [r1(p) for p in P], 'hero': heroOf.get(i)})
    parking = []
    for f in A['parking']:
        P = [tm(f[k], f[k + 1]) for k in range(0, len(f), 2)]
        if not any(inside(*p) for p in P): continue
        P = ring(P, TOL)
        if len(P) >= 3: parking.append({'pts': [r1(p) for p in P]})
    cds = []
    for c in CD:
        x, z = tm(c['x'], c['y'])
        if inside(x, z): cds.append({'x': round(x, 1), 'z': round(z, 1), 'r': round(c['r'] / U, 1), 'name': c.get('name', '')})
    old = {k: len(D[k]) for k in ('roads', 'buildings', 'parking', 'cds')}
    D2 = dict(D); D2.update(roads=roads, buildings=buildings, parking=parking, cds=cds)
    header = src[:src.index('export const WORLD_DATA')]
    note = (f'// FULL-COVERAGE extraction (tools/extract_world.py): every real road / building / lot / cul-de-sac inside the\n'
            f'// map extent x[{x0:.0f},{x1:.0f}] z[{z0:.0f},{z1:.0f}] m. Frame fitted from {len(offs)} building matches (offset '
            f'{ox:.2f},{oz:.2f} m, residual {resid:.2f} m).\n// Counts: roads {old["roads"]}->{len(roads)}, buildings {old["buildings"]}->{len(buildings)}, '
            f'parking {old["parking"]}->{len(parking)}, cul-de-sacs {old["cds"]}->{len(cds)}. Stops, route and heroes unchanged.\n')
    with open(DATA, 'w') as fh:
        fh.write(header + note + 'export const WORLD_DATA = ' + json.dumps(D2, separators=(',', ':')) + ';\n')
    print(f'fit {len(offs)} matches, offset ({ox:.2f},{oz:.2f}), residual {resid:.2f} m')
    print(f'roads {old["roads"]}->{len(roads)}  buildings {old["buildings"]}->{len(buildings)}  parking {old["parking"]}->{len(parking)}  cds {old["cds"]}->{len(cds)}  '
          f'data.js {os.path.getsize(DATA) / 1024:.0f} KB')

if __name__ == '__main__':
    main()

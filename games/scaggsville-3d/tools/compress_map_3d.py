#!/usr/bin/env python3
"""Compress the Scaggsville 3D world x0.5 (Cherie, Nov 21 2026: "Same real
roads just half their length so game goes quicker" + "With that you can
probably remove half the houses"). Mirrors the 2D game's tools/compress_map.py
(Nov 17 precedent): uniform scale of every world COORDINATE; road widths, car
sizes/speeds, house FOOTPRINTS and camera behaviour are untouched — a
half-distance miniature; trips take half the time.

What scales: road polylines, cul-de-sac centres, parking polygons, greens
polygons, rally stops (house + stop points), the stored route, and building
CENTROIDS. Building footprints are re-centred on the scaled centroid at their
original full size — which would make houses crowd and overlap, so the
building list is THINNED to ~half in the same pass, deterministically:

  P0  hero buildings (7 crew houses + Atholton HS) — always kept
  P1  buildings fronting the rally route (centroid <= 14 m from the route)
  P2  landmarks (footprint area >= 600 m^2: schools, churches, big retail)
  P3  a deterministic hash-spread of the rest, up to ~50% of the original
      count; then a rescue pass so no road that had houses ends up empty.

A P1/P2/P3 candidate is kept only if its full-size footprint at the scaled
position overlaps no already-kept footprint (0.6 m clearance) and does not sit
on a non-service road. Heroes are kept unconditionally (audited separately).

Idempotent: always starts from the full-scale backups (created on first run):
  src/data.js.full-scale.bak, src/world/greens.js.full-scale.bak
Run from anywhere:  python3 tools/compress_map_3d.py
THEN regenerate the route from the scaled graph:  python3 tools/rebuild_route.py
"""
import json, math, os, shutil, hashlib, sys

S = 0.5
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'src', 'data.js')
GREENS = os.path.join(ROOT, 'src', 'world', 'greens.js')
TARGET_FRAC = 0.5
ROUTE_FRONT_M = 14.0      # scaled metres: centroid-to-route for P1
LANDMARK_AREA = 600.0     # m^2 of original footprint
CLEAR = 0.6               # m clearance between kept footprints

def r1(v):
    return round(v * S, 1)

def load_js_json(path, marker):
    """Idempotent load: back up the full-scale file on first run, always
    parse from the backup. Returns (head, data, tail)."""
    bak = path + '.full-scale.bak'
    if not os.path.exists(bak):
        shutil.copyfile(path, bak)
    src = open(bak).read()
    a = src.index(marker) + len(marker)
    return src[:a], json.loads(src[a:src.rindex('}') + 1] if marker.endswith('= ') else src[a:src.rindex(']') + 1]), src

def poly_centroid(pts):
    a = cx = cz = 0.0
    for i in range(len(pts)):
        x1, z1 = pts[i]; x2, z2 = pts[(i + 1) % len(pts)]
        f = x1 * z2 - x2 * z1; a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f
    if abs(a) < 1e-9:
        return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts), 0.0)
    return (cx / (3 * a), cz / (3 * a), abs(a) / 2)

def seg_pt_dist(px, pz, ax, az, bx, bz):
    vx, vz = bx - ax, bz - az; L2 = vx * vx + vz * vz
    t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * vx + (pz - az) * vz) / L2))
    return math.hypot(px - ax - vx * t, pz - az - vz * t)

def seg_seg_int(ax, az, bx, bz, cx, cz, dx, dz):
    def cr(ox, oz, px, pz, qx, qz): return (px - ox) * (qz - oz) - (pz - oz) * (qx - ox)
    d1, d2 = cr(cx, cz, dx, dz, ax, az), cr(cx, cz, dx, dz, bx, bz)
    d3, d4 = cr(ax, az, bx, bz, cx, cz), cr(ax, az, bx, bz, dx, dz)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))

def pt_in_poly(px, pz, poly):
    inside = False
    for i in range(len(poly)):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
        if (z1 > pz) != (z2 > pz) and px < (x2 - x1) * (pz - z1) / (z2 - z1) + x1: inside = not inside
    return inside

def poly_seg_dist(poly, ax, az, bx, bz):
    """Distance between a filled polygon and a segment (0 if they touch/cross)."""
    if pt_in_poly(ax, az, poly) or pt_in_poly(bx, bz, poly): return 0.0
    best = min(seg_pt_dist(ax, az, *poly[0], *poly[0]), seg_pt_dist(bx, bz, *poly[0], *poly[0]))
    for i in range(len(poly)):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
        if seg_seg_int(x1, z1, x2, z2, ax, az, bx, bz): return 0.0
        best = min(best, seg_pt_dist(ax, az, x1, z1, x2, z2), seg_pt_dist(bx, bz, x1, z1, x2, z2),
                   min(seg_pt_dist(x1, z1, ax, az, bx, bz), seg_pt_dist(x2, z2, ax, az, bx, bz)))
    return best

def polys_overlap(p, q):
    for i in range(len(p)):
        for j in range(len(q)):
            if seg_seg_int(*p[i], *p[(i + 1) % len(p)], *q[j], *q[(j + 1) % len(q)]): return True
    return pt_in_poly(p[0][0], p[0][1], q) or pt_in_poly(q[0][0], q[0][1], p)

class Grid:
    def __init__(self, cell): self.cell = cell; self.m = {}
    def keys(self, x0, z0, x1, z1):
        for i in range(int(math.floor(x0 / self.cell)), int(math.floor(x1 / self.cell)) + 1):
            for j in range(int(math.floor(z0 / self.cell)), int(math.floor(z1 / self.cell)) + 1):
                yield (i, j)
    def add(self, item, x0, z0, x1, z1):
        for k in self.keys(x0, z0, x1, z1): self.m.setdefault(k, []).append(item)
    def near(self, x0, z0, x1, z1):
        out = []
        for k in self.keys(x0, z0, x1, z1): out += self.m.get(k, [])
        return out

def main():
    head, D, _ = load_js_json(DATA, 'export const WORLD_DATA = ')
    n_buildings0 = len(D['buildings'])

    # ---- scale the graph-borne data ----
    for r in D['roads']:
        r['pts'] = [[r1(x), r1(z)] for x, z in r['pts']]
    for p in D['parking']:
        p['pts'] = [[r1(x), r1(z)] for x, z in p['pts']]
    for c in D['cds']:
        c['x'] = r1(c['x']); c['z'] = r1(c['z'])          # r (bulb size) unchanged
    for s in D['stops']:
        for k in ('hx', 'hz', 'sx', 'sz'): s[k] = r1(s[k])
        if s['id'] == 'atholton':
            # The fitted+nudged school footprint (see Atholton fit below) has a
            # wing whose collider covers the scaled stop point (reach probe:
            # insideDepth 11.8 m). Move the stop 12.9 m east along the same
            # frontage to the closest push-out-free point the game's own
            # reachability test can drive to (verified by the reach probe).
            s['sx'], s['sz'] = -602.3, -3793.8
    D['route'] = [[r1(x), r1(z)] for x, z in D['route']]  # regenerated afterwards by rebuild_route.py
    route = D['route']

    # ---- buildings: scale centroid, keep full-size footprint ----
    B = []
    for i, b in enumerate(D['buildings']):
        cx, cz, area = poly_centroid(b['pts'])
        ncx, ncz = r1(cx), r1(cz)
        # Atholton HS exception: its campus footprint is 279 m deep, but the
        # roads around it sit only ~212 m apart once scaled — the full-size
        # footprint cannot fit its scaled lot without crossing a road.
        # Fit it at 0.72 around the scaled centroid (still by far the biggest
        # building on the map); every other footprint stays full-size.
        fit = 0.72 if b.get('hero') == 'atholton' else 1.0
        pts = [[round(ncx + (x - cx) * fit, 1), round(ncz + (z - cz) * fit, 1)] for x, z in b['pts']]
        xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
        B.append({'i': i, 'hero': b.get('hero'), 'pts': pts, 'cx': ncx, 'cz': ncz, 'area': area,
                  'bb': (min(xs), min(zs), max(xs), max(zs))})

    # route distance (scaled) per building, via segment grid
    rgrid = Grid(60)
    for i in range(len(route) - 1):
        a, b = route[i], route[i + 1]
        rgrid.add((a, b), min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]))
    for b in B:
        d = 1e18
        for a, bb in rgrid.near(b['cx'] - 40, b['cz'] - 40, b['cx'] + 40, b['cz'] + 40):
            d = min(d, seg_pt_dist(b['cx'], b['cz'], a[0], a[1], bb[0], bb[1]))
        b['routeD'] = d

    # road-overlap test vs non-service roads (scaled)
    sgrid = Grid(60)
    for ri, r in enumerate(D['roads']):
        if r.get('hw') == 'service': continue
        for i in range(len(r['pts']) - 1):
            a, bb = r['pts'][i], r['pts'][i + 1]
            sgrid.add((a, bb, (r.get('w') or 7) / 2, ri), min(a[0], bb[0]) - 12, min(a[1], bb[1]) - 12,
                      max(a[0], bb[0]) + 12, max(a[1], bb[1]) + 12)
    # nearest road per building (for street-fair thinning order below)
    for b in B:
        best = (1e18, -1)
        for a, bb, hw, ri in sgrid.near(b['cx'] - 45, b['cz'] - 45, b['cx'] + 45, b['cz'] + 45):
            d = seg_pt_dist(b['cx'], b['cz'], a[0], a[1], bb[0], bb[1])
            if d < best[0]: best = (d, ri)
        b['road'] = best[1]
    def on_road(b):
        x0, z0, x1, z1 = b['bb']
        for a, bb, hw, ri in sgrid.near(x0 - 2, z0 - 2, x1 + 2, z1 + 2):
            if poly_seg_dist(b['pts'], a[0], a[1], bb[0], bb[1]) < hw + 0.2: return True
        return False

    # ---- hero road-clearance nudge: a full-size hero footprint whose lot
    # distance halved can land on its road (Atholton HS crossed Harriet Tubman
    # Lane at 0.00 m). Heroes may not be dropped, so shift the footprint
    # straight back from the nearest road until it clears, max 24 m. ----
    def nearest_road_vec(b):
        best = None
        for a, bb, hw, ri in sgrid.near(b['bb'][0] - 30, b['bb'][1] - 30, b['bb'][2] + 30, b['bb'][3] + 30):
            d = poly_seg_dist(b['pts'], a[0], a[1], bb[0], bb[1])
            if best is None or d < best[0]: best = (d, a, bb, hw)
        return best
    for b in [x for x in B if x['hero']]:
        moved = 0.0
        while moved < 24:
            d, a, bb, hw = nearest_road_vec(b)
            if d >= hw + 0.7: break
            vx, vz = bb[0] - a[0], bb[1] - a[1]; L2 = vx * vx + vz * vz or 1
            t = max(0, min(1, ((b['cx'] - a[0]) * vx + (b['cz'] - a[1]) * vz) / L2))
            px, pz = a[0] + vx * t, a[1] + vz * t
            ux, uz = b['cx'] - px, b['cz'] - pz; n = math.hypot(ux, uz)
            if n < 1e-6: ux, uz, n = -vz, vx, math.hypot(vz, vx) or 1
            ux, uz = ux / n, uz / n
            b['pts'] = [[round(x + ux, 1), round(z + uz, 1)] for x, z in b['pts']]
            b['cx'] += ux; b['cz'] += uz
            xs = [p[0] for p in b['pts']]; zs = [p[1] for p in b['pts']]
            b['bb'] = (min(xs), min(zs), max(xs), max(zs)); moved += 1
        if moved: print(f"hero nudge: {b['hero']} shifted {moved:.0f} m off its road")

    # ---- thinning ----
    kept, kgrid = [], Grid(30)
    def try_keep(b, force=False):
        x0, z0, x1, z1 = b['bb']
        if not force:
            if on_road(b): return False
            for o in kgrid.near(x0 - CLEAR, z0 - CLEAR, x1 + CLEAR, z1 + CLEAR):
                ox0, oz0, ox1, oz1 = o['bb']
                if x1 + CLEAR < ox0 or ox1 + CLEAR < x0 or z1 + CLEAR < oz0 or oz1 + CLEAR < z0: continue
                if polys_overlap(b['pts'], o['pts']): return False
        kept.append(b); kgrid.add(b, x0, z0, x1, z1); return True

    heroes = [b for b in B if b['hero']]
    for b in heroes: try_keep(b, force=True)
    p1 = sorted([b for b in B if not b['hero'] and b['routeD'] <= ROUTE_FRONT_M], key=lambda b: b['routeD'])
    p2 = sorted([b for b in B if not b['hero'] and b['routeD'] > ROUTE_FRONT_M and b['area'] >= LANDMARK_AREA],
                key=lambda b: -b['area'])
    target = math.ceil(n_buildings0 * TARGET_FRAC)
    n1 = sum(try_keep(b) for b in p1); n2 = sum(try_keep(b) for b in p2)
    # P3 order is street-fair round-robin: rank within the building's own
    # street first (hash order inside the street), so every street's first
    # houses are attempted before any street's second row — otherwise
    # back-to-back rows on parallel streets collide and one street starves.
    _rank = {}
    _bystreet = {}
    for b in B: _bystreet.setdefault(b['road'], []).append(b)
    for lst in _bystreet.values():
        for rk, b in enumerate(sorted(lst, key=lambda b: hashlib.sha256(str(b['i']).encode()).hexdigest())):
            _rank[b['i']] = rk
    p3 = sorted([b for b in B if not b['hero'] and b['routeD'] > ROUTE_FRONT_M and b['area'] < LANDMARK_AREA],
                key=lambda b: (_rank[b['i']], hashlib.sha256(str(b['i']).encode()).hexdigest()))
    n3 = 0
    for b in p3:
        if len(kept) >= target: break
        if try_keep(b): n3 += 1
    # rescue: sample every road; one that had >=3 houses within 25 m of its
    # line must not end up with zero kept houses within 25 m of its line.
    kept_set = set(id(b) for b in kept)
    rescued = 0
    bgrid = Grid(50)
    for b in B: bgrid.add(b, b['cx'], b['cz'], b['cx'], b['cz'])
    def near_line(b, pts, d):
        return any(seg_pt_dist(b['cx'], b['cz'], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < d
                   for i in range(len(pts) - 1))
    for r in D['roads']:
        if r.get('hw') == 'service' or len(r['pts']) < 2: continue
        rxs = [p[0] for p in r['pts']]; rzs = [p[1] for p in r['pts']]
        cand = {id(b): b for b in bgrid.near(min(rxs) - 25, min(rzs) - 25, max(rxs) + 25, max(rzs) + 25)}.values()
        orig = [b for b in cand if near_line(b, r['pts'], 25)]
        if len(orig) < 3: continue
        if any(id(b) in kept_set and near_line(b, r['pts'], 25) for b in orig): continue
        for b in sorted(orig, key=lambda b: min(seg_pt_dist(b['cx'], b['cz'], r['pts'][i][0], r['pts'][i][1],
                                                            r['pts'][i + 1][0], r['pts'][i + 1][1])
                                                for i in range(len(r['pts']) - 1))):
            if id(b) not in kept_set and try_keep(b):
                kept_set.add(id(b)); rescued += 1; break

    kept.sort(key=lambda b: b['i'])
    D['buildings'] = [{'pts': b['pts'], 'hero': b['hero']} for b in kept]
    note = ('// COMPRESSED x0.5 by tools/compress_map_3d.py (Cherie, Nov 21 2026): every world\n'
            '// coordinate halved; footprints/widths/sizes unscaled; buildings thinned ~1/2.\n'
            '// Full-scale original: src/data.js.full-scale.bak. Then tools/rebuild_route.py.\n')
    open(DATA, 'w').write(head.replace('// Scaggsville 3D', note + '// Scaggsville 3D', 1) +
                          json.dumps(D, separators=(',', ':')) + ';\n')
    print(f"data.js: buildings {n_buildings0} -> {len(kept)} (heroes {len(heroes)}, route-front {n1}, "
          f"landmarks {n2}, spread {n3}, rescued {rescued}); roads {len(D['roads'])} scaled")

    # ---- greens: uniform scale (ground areas, like the 2D areas precedent) ----
    gsrc = open(GREENS + '.full-scale.bak' if os.path.exists(GREENS + '.full-scale.bak') else GREENS).read()
    if not os.path.exists(GREENS + '.full-scale.bak'):
        shutil.copyfile(GREENS, GREENS + '.full-scale.bak'); gsrc = open(GREENS + '.full-scale.bak').read()
    ga = gsrc.index('export const GREENS = ') + len('export const GREENS = ')
    G = json.loads(gsrc[ga:gsrc.rindex(']') + 1])
    G = [[[r1(x), r1(z)] for x, z in poly] for poly in G]
    ghead = gsrc[:ga].replace('// Kept:', '// COMPRESSED x0.5 by tools/compress_map_3d.py; full-scale: greens.js.full-scale.bak.\n// Kept:', 1)
    open(GREENS, 'w').write(ghead + json.dumps(G, separators=(',', ':')) + ';\n')
    print(f"greens.js: {len(G)} polygons scaled")

if __name__ == '__main__':
    main()

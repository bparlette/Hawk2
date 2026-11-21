#!/usr/bin/env python3
"""Re-store WORLD_DATA.route as the true ORDERED driving path (rerunnable: python3 tools/rebuild_route.py).

Why: the stored route was the right streets in the wrong order: 801 points, 267 jumps > 40 m and ~200 reversals,
47 km end to end against the stated 23 km. Consumers (poles/lamps in buildWorld.js, crowd.js, world-preview.html,
__proof.routePt) all read it as an ordered [[x,z],...] polyline, so the poles/wires followed the jumps.
This rebuilds it as Dijkstra over data.js roads, Brad -> Floyds -> Jason -> Grant -> Lazaris -> Rigg -> Kosack ->
Atholton (same rally order as index.html HOUSEHOLDS), stop to stop. Format unchanged. Stops are not moved.
"""
import json, math, heapq, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); DATA = os.path.join(ROOT, 'src', 'data.js')
ORDER = ['brad', 'clayton', 'jason', 'grant', 'jimmy', 'rigg', 'kosack', 'atholton']
src = open(DATA).read(); a = src.index('export const WORLD_DATA = ') + len('export const WORLD_DATA = ')
D = json.loads(src[a:src.rindex('}') + 1])
N = {}; key = lambda p: (round(p[0] * 2), round(p[1] * 2))
for r in D['roads']:
    for i in range(len(r['pts']) - 1):
        p, q = r['pts'][i], r['pts'][i + 1]; L = math.dist(p, q) * (4 if r['hw'] == 'service' else 1)   # service = driveways/lots: only to reach a stop
        N.setdefault(key(p), [tuple(p), []])[1].append((key(q), L)); N.setdefault(key(q), [tuple(q), []])[1].append((key(p), L))
near = lambda x, z: min(N, key=lambda k: (N[k][0][0] - x) ** 2 + (N[k][0][1] - z) ** 2)
def dijkstra(s, t):
    d = {s: 0}; pq = [(0, s)]; prev = {}
    while pq:
        c, n = heapq.heappop(pq)
        if n == t: break
        if c > d[n]: continue
        for m, L in N[n][1]:
            if c + L < d.get(m, 1e18): d[m] = c + L; prev[m] = n; heapq.heappush(pq, (c + L, m))
    p = [t]
    while p[-1] != s: p.append(prev[p[-1]])
    return d[t], [N[k][0] for k in reversed(p)]
st = {s['id']: s for s in D['stops']}; path = []; legs = []
for u, v in zip(ORDER, ORDER[1:]):
    L, p = dijkstra(near(st[u]['sx'], st[u]['sz']), near(st[v]['sx'], st[v]['sz'])); legs.append(round(sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1))))
    path += p if not path else p[1:]
# off-path check against the old stored route (same streets?)
def dseg(p, a, b):
    vx, vz = b[0] - a[0], b[1] - a[1]; L2 = vx * vx + vz * vz or 1; t = max(0, min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / L2)); return math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t)
off = sum(1 for q in D['route'] if min(dseg(q, path[i], path[i + 1]) for i in range(len(path) - 1)) > 15)
old = D['route']; oldL = sum(math.dist(old[i], old[i + 1]) for i in range(len(old) - 1))
D['route'] = [[round(x, 1), round(z, 1)] for x, z in path]
newL = sum(math.dist(path[i], path[i + 1]) for i in range(len(path) - 1))
head = src[:a]
head = re.sub(r'Rigg -> Kosack -> Atholton HS \([0-9.]+ km\)', f'Rigg -> Kosack -> Atholton HS ({newL/1000:.2f} km, ordered; tools/rebuild_route.py)', head)
open(DATA, 'w').write(head + json.dumps(D, separators=(',', ':')) + ';\n')
print(f'route {len(old)} pts {oldL/1000:.2f} km (unordered) -> {len(path)} pts {newL/1000:.2f} km ordered; legs m {legs}; old points > 15 m off the new path: {off}/{len(old)}')

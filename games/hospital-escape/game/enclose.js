/* Hospital Escape — HEENCLOSE (CAMERA-FIX defect 4): interior rooms must read as rooms from every viewpoint.
   An audit, then a repair, run once on the built world:
     1. every interior zone's boundary is sampled every 0.5 m (0.15 m inside, at 0.9 m and 1.7 m above its floor) and a ray is cast
        OUTWARD (perpendicular) against the built world, with every surface temporarily double-sided;
        - a hit within 120 m = a wall, or an opening into a neighbouring space -> fine
        - the first thing hit is glass                                         -> a window, fine
        - nothing at all                                                         -> a HOLE into the void
     2. contiguous hole samples become one wall strip (the game's own wall material, so the T4 pass re-skins it like every other wall),
        except where a rail / foot path passes within 1.0 m of a sample (a doorway someone travels through) — those are reported, never sealed.
   Results: HEENCLOSE.report (per zone: samples, holes, strips added, strips refused). */
(function(){
'use strict';
var V = THREE.Vector3, E = window.HEENCLOSE = { report: [] };
E.close = function(scene, root, data, A){ var W = window.HEWORLD, zones = data.env.zones, rc = new THREE.Raycaster(), sides = [], t0 = performance.now();
  root.traverse(function(o){ if(o.isMesh && o.material && !Array.isArray(o.material)){ sides.push([o.material, o.material.side]); o.material.side = THREE.DoubleSide; } });
  var targets = root.children, wallMat = new THREE.MeshStandardMaterial({ map: A.tex.wall, roughness: 0.8, side: THREE.DoubleSide }), added = [];
  var pathIds = (data.paths || []).map(function(p){ return p.id; });
  function rectOf(z){ if(z.min && z.max) return { x0: z.min[0], x1: z.max[0], z0: z.min[2], z1: z.max[2], y: z.y || z.min[1] || 0, h: (z.max[1] - (z.y != null ? z.y : z.min[1])) || 3 };
    if(z.a && z.b && z.w){ var ax = Math.abs(z.a[0] - z.b[0]) < 1e-3; if(ax) return { x0: z.a[0] - z.w / 2, x1: z.a[0] + z.w / 2, z0: Math.min(z.a[1], z.b[1]), z1: Math.max(z.a[1], z.b[1]), y: z.y || 0, h: z.h || 2.9 };
      return { x0: Math.min(z.a[0], z.b[0]), x1: Math.max(z.a[0], z.b[0]), z0: z.a[1] - z.w / 2, z1: z.a[1] + z.w / 2, y: z.y || 0, h: z.h || 2.9 }; } return null; }
  function cast(p, d){ rc.set(p, d); rc.far = 120; var h = rc.intersectObjects(targets, true).filter(function(x){ return x.object.visible !== false && x.distance > 0.02; });
    if(!h.length) return 'void'; var m = h[0].object.material; if(m && (m.transparent || m.opacity < 0.9)) return 'glass'; return 'hit'; }
  /* every interior footprint (zones + the elevator cars): a boundary point whose outside belongs to NO interior space is EXTERIOR and must
     have a wall within 0.6 m — this catches the oblique leaks at corners where a wide room meets a narrower hall */
  var RECTS = []; zones.forEach(function(z){ if(/street|outdoor/.test(z.kind)) return; var R0 = rectOf(z); if(R0) RECTS.push(R0); if(z.carZ && !z.noCar){ [0, -12].forEach(function(cy){ RECTS.push({ x0: -0.9, x1: 0.9, z0: Math.min(z.carZ[0], z.carZ[1]), z1: Math.max(z.carZ[0], z.carZ[1]), y: cy, h: 2.5 }); }); } });
  function interiorAt(x, y, zz){ for(var i = 0; i < RECTS.length; i++){ var q = RECTS[i]; if(x > q.x0 - 0.05 && x < q.x1 + 0.05 && zz > q.z0 - 0.05 && zz < q.z1 + 0.05 && y > q.y - 0.5 && y < q.y + q.h + 0.5) return true; } return false; }
  function castNear(p, d){ rc.set(p, d); rc.far = 0.6; return rc.intersectObjects(targets, true).some(function(x){ return x.object.visible !== false && x.distance > 0.02; }); }
  zones.forEach(function(z, zi){ if(/street|outdoor/.test(z.kind)) return; var R = rectOf(z); if(!R) return; var rep = { zone: (z.name || z.kind) + '#' + zi, samples: 0, holes: 0, strips: 0, refused: [] };
    [['x0', -1, 0], ['x1', 1, 0], ['z0', 0, -1], ['z1', 0, 1]].forEach(function(sd){ var alongX = sd[2] !== 0, a0 = alongX ? R.x0 : R.z0, a1 = alongX ? R.x1 : R.z1, fixed = R[sd[0]], dir = new V(sd[1], 0, sd[2]), run = null, runs = [], hrun = null, hruns = [];
      for(var s = a0 + 0.25; s <= a1 - 0.25 + 1e-6; s += 0.5){ var hole = true;
        [0.9, 1.7].forEach(function(hy){ var p = alongX ? new V(s, R.y + hy, fixed - sd[2] * 0.15) : new V(fixed - sd[1] * 0.15, R.y + hy, s); rep.samples++;
          var out = p.clone().addScaledVector(dir, 0.45), exterior = !interiorAt(out.x, out.y, out.z);
          if(exterior ? castNear(p, dir) : cast(p, dir) !== 'void') hole = false; });
        if(hole){ var px = alongX ? s : fixed, pz = alongX ? fixed : s, pd = W.pathDist ? W.pathDist(data, pathIds, px, pz) : 99; if(pd < 1.0){ hole = false; rep.refused.push({ at: [+px.toFixed(2), +pz.toFixed(2)], pathDist: +pd.toFixed(2) }); } }
        if(hole){ rep.holes++; if(!run) run = { s0: s - 0.25, s1: s + 0.25 }; else run.s1 = s + 0.25; } else if(run){ runs.push(run); run = null; } }
      if(run) runs.push(run);
      /* CEILING STEPS: where two zones of different height meet, the band between the lower ceiling and this one is open. Sampled just
         under this zone's ceiling; the header strip spans only the open band (found by stepping down 0.1 m until rays hit), so the passage
         below stays open — nobody travels at that height. */
      for(var s2 = a0 + 0.25; s2 <= a1 - 0.25 + 1e-6; s2 += 0.5){ var top = R.y + R.h - 0.08, pt = alongX ? new V(s2, top, fixed - sd[2] * 0.15) : new V(fixed - sd[1] * 0.15, top, s2); rep.samples++;
        if(cast(pt, dir) !== 'void') { if(hrun){ hruns.push(hrun); hrun = null; } continue; }
        var low = top; while(low > R.y + 1.9){ var q = pt.clone(); q.y = low - 0.1; if(cast(q, dir) !== 'void') break; low -= 0.1; }
        if(!hrun) hrun = { s0: s2 - 0.25, s1: s2 + 0.25, low: low }; else { hrun.s1 = s2 + 0.25; hrun.low = Math.min(hrun.low, low); } rep.headers = (rep.headers || 0) + 1; }
      if(hrun){ hruns.push(hrun); hrun = null; }
      hruns.forEach(function(r){ var len = r.s1 - r.s0, mid = (r.s0 + r.s1) / 2, cx = alongX ? mid : fixed, cz = alongX ? fixed : mid, hh = R.y + R.h - (r.low - 0.12), cy = R.y + R.h - hh / 2;
        var g = new THREE.Mesh(new THREE.PlaneGeometry(len, hh), wallMat.clone()); g.material.map = A.tex.wall.clone(); g.material.map.needsUpdate = true; g.material.map.wrapS = g.material.map.wrapT = THREE.RepeatWrapping; g.material.map.repeat.set(len / 3, hh / 3);
        g.position.set(cx, cy, cz); g.rotation.y = alongX ? 0 : Math.PI / 2; g.name = 'enclose-header'; var zg2 = root.children.filter(function(c){ return c.name === z.kind; })[0] || root; zg2.add(g); g.updateMatrixWorld(true); added.push(g); rep.strips++; });
      runs.forEach(function(r){ var mid = (r.s0 + r.s1) / 2, len = r.s1 - r.s0, cx = alongX ? mid : fixed, cz = alongX ? fixed : mid;
        var g = new THREE.Mesh(new THREE.PlaneGeometry(len, R.h), wallMat.clone()); g.material.map = A.tex.wall.clone(); g.material.map.needsUpdate = true; g.material.map.wrapS = g.material.map.wrapT = THREE.RepeatWrapping; g.material.map.repeat.set(len / 3, 1);
        g.position.set(cx, R.y + R.h / 2, cz); g.rotation.y = alongX ? 0 : Math.PI / 2; g.name = 'enclose'; g.userData.enclose = true;
        var zg = root.children.filter(function(c){ return c.name === z.kind; })[0] || root; zg.add(g); g.updateMatrixWorld(true); added.push(g); rep.strips++; }); });
    if(rep.holes || rep.refused.length) E.report.push(rep); });
  sides.forEach(function(s){ s[0].side = s[1]; });
  E.added = added.length; E.ms = Math.round(performance.now() - t0); return E.report; };
})();

// Screen-presence audit (OPUS-FIX-PLAY-VISIBILITY defects 1/3/4/6): a full autopilot run, sampled every 0.25 s.
// For every live enemy / pursuer: exposed?, in the 390x844 frame?, on-screen height as a fraction of the 844 px frame.
// Usage: node tools/presence-audit.cjs [seed] [out.json]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), SEED = +(process.argv[2] || 7), OUT = process.argv[3];
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] }), p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push('' + e)); if(fs.existsSync(cache)) await p.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?seed=' + SEED, { timeout: 120000 }); await p.waitForFunction(() => window.__game && window.__painted !== undefined);
  const r = await p.evaluate(() => { const G = __game, g = G.game, c = g.camera; G.start('visit'); G.pause(true); const seg = {}, V = THREE.Vector3;
    function sample(role, pos, h, exposed, fired){ const s = seg[g.segment] || (seg[g.segment] = { samples: 0, exposedSamples: 0, inView: 0, offView: 0, fracs: [], firingOff: 0, firing: 0 }); s.samples++; if(!exposed) return; s.exposedSamples++;
      const a = pos.clone().project(c), t = pos.clone().setY(pos.y + h).project(c); const inv = a.z < 1 && t.z < 1 && Math.abs((a.x + t.x) / 2) < 1 && t.y < 1 && a.y > -1.05;
      if(inv){ s.inView++; s.fracs.push(Math.abs(t.y - a.y) / 2); } else s.offView++; if(fired){ s.firing++; if(!inv) s.firingOff++; } }
    let n = g._log.length;
    for(let i = 0; i < 60 * 260 && !g.ended && !g.lost; i++){ G.ff(1 / 60, true); const fired = {}; for(; n < g._log.length; n++){ const e = g._log[n]; if(e.type === 'enemyShot') fired[e.data.role] = 1; }
      if(i % 15 && !Object.keys(fired).length) continue;
      g.combat.live().forEach(e => sample(e.role, e.pos, 1.78, e.exposed, fired[e.role]));
      g.chase.list.forEach(pz => { if(pz.state !== 'pursuing') return; const o = g.greybox.actors[pz.role]; if(o) sample(pz.role, o.position.clone(), 1.5, true, fired[pz.role]); }); }
    const out = {}; Object.keys(seg).forEach(k => { const s = seg[k], f = s.fracs.sort((a, b) => a - b); out[k] = { exposed: s.exposedSamples, inViewPct: s.exposedSamples ? Math.round(100 * s.inView / s.exposedSamples) : null, firingShots: s.firing, firingOffScreen: s.firingOff,
      heightFrac: f.length ? { median: +f[f.length >> 1].toFixed(3), p90: +f[Math.floor(f.length * 0.9)].toFixed(3), max: +f[f.length - 1].toFixed(3) } : null }; });
    return { won: g.won, lost: g.lost, segments: out }; });
  r.pageErrors = errs.length; const txt = JSON.stringify(r, null, 1); if(OUT) fs.writeFileSync(OUT, txt); console.log(txt); await b.close(); })();

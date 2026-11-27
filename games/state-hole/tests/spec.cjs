// State Hole spec tests (OPUS-NEXT; written FIRST, red until the work passes them).
//   node games/state-hole/tests/spec.cjs [testName ...]        exit 1 on any failure
// Serves games/state-hole/ over http (ES modules do not load from file://), boots index.html?test=1&seed=7 at 390x844 in Chromium
// (SwiftShader unless a real GPU exists — the renderer string is printed with perf-frame), and drives the deterministic hooks on
// window.__SIM. The hooks only script the SIMULATION (fixed 1/60 steps, scripted move vector, hole placement); play evidence is
// captured separately from real touch drags (tests/play-capture.cjs).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), ONLY = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function serve(){ return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  s.listen(0, () => res(s)); }); }
const T = {};
// 1. collapse-budget: a 25-stack + its neighbours fall; active bodies <= 220 on EVERY step
T['collapse-budget'] = async p => { const r = await p.evaluate(() => { const S = __SIM; S.reset(); S.pause(); const c = S.tallest('CA'); S.parkHole(); S.resetPeak();
  S.eatBase(c.id); S.neighbours(c.id, 9).forEach(n => S.eatBase(n)); let peak = 0, maxPend = 0; for(let i = 0; i < 60 * 20; i++){ S.step(1); peak = Math.max(peak, S.activeCount()); maxPend = Math.max(maxPend, S.pendingCount()); if(S.settled()) break; }
  return { peak, peakTracked: S.peak(), maxPend, settled: S.settled(), fallen: S.fallenCount() }; });
  return { pass: r.peak <= 220 && r.peakTracked <= 220 && r.fallen > 25 && r.settled, detail: r }; };
// 2. collapse-determinism: the scripted eat twice on seed 7 -> identical resting positions (+-0.01) for all figures
const script = () => { const S = __SIM; S.reset(); S.pause(); S.setHole(...S.statePoint('TX', 0.55)); for(let i = 0; i < 60 * 6; i++){ const a = i / 60; S.input(Math.cos(a * 1.3), Math.sin(a * 0.9)); S.step(1); } S.input(null);
  for(let i = 0; i < 60 * 12 && !S.settled(); i++) S.step(1); return S.figs(); };
T['collapse-determinism'] = async p => { const a = await p.evaluate(script), b = await p.evaluate(script); let worst = 0, n = 0, moved = 0;
  for(let i = 0; i < a.length; i++){ const d = Math.abs(a[i] - b[i]); if(d > worst) worst = d; if(d > 0.01) n++; }
  for(let i = 3; i < a.length; i += 4) if(a[i] >= 2) moved++;
  return { pass: a.length === b.length && n === 0 && moved > 50, detail: { values: a.length, mismatches: n, worst: +worst.toFixed(5), figuresDisturbed: moved } }; };
// 3. no-floaters: after collapses settle, every non-eaten figure is supported (slab / standing figure below) or still falling
T['no-floaters'] = async p => { const r = await p.evaluate(() => { const S = __SIM; S.reset(); S.pause(); const out = [];
  for(const ab of ['CA', 'TX', 'NY', 'FL', 'PA']){ const c = S.tallest(ab); S.parkHole(); S.eatBase(c.id); S.neighbours(c.id, 4).forEach(n => S.eatBase(n)); for(let i = 0; i < 60 * 15 && !S.settled(); i++) S.step(1); out.push(Object.assign({ ab, settled: S.settled() }, S.audit())); }
  S.setHole(...S.statePoint('OH', 0.5)); for(let i = 0; i < 60 * 4; i++){ S.input(1, 0.2); S.step(1); } S.input(null); for(let i = 0; i < 60 * 15 && !S.settled(); i++) S.step(1); out.push(Object.assign({ ab: 'OH-drive', settled: S.settled() }, S.audit()));
  return out; });
  return { pass: r.every(x => x.settled && x.floaters === 0 && x.rested > 0 || (x.ab === 'OH-drive' && x.settled && x.floaters === 0)), detail: r }; };
// 4. domino: eat tower A's base; a figure of adjacent tower B falls, the hole never touching B
T['domino'] = async p => { const r = await p.evaluate(() => { const S = __SIM; const res = [];
  for(const ab of ['CA', 'TX', 'NY']){ S.reset(); S.pause(); S.parkHole(); const a = S.tallest(ab), nb = S.neighbours(a.id, 6);
    S.eatBase(a.id); for(let i = 0; i < 60 * 12 && !S.settled(); i++) S.step(1);
    const knocked = nb.filter(id => S.colKnocked(id)).length; res.push({ ab, A: a.h, neighbours: nb.length, knocked, holeTouched: S.holeTouched(nb) }); }
  return res; });
  return { pass: r.some(x => x.knocked > 0 && !x.holeTouched) && r.every(x => !x.holeTouched), detail: r }; };
// 5. perf-frame: all figures, one collapse active, real rAF frames: median frame <= 16.6 ms on THIS harness's renderer (reported)
T['perf-frame'] = async p => { const r = await p.evaluate(async () => { const S = __SIM; S.reset(); S.resume(); const c = S.tallest('CA'); S.setHole(c.x + 3, c.z); S.eatBase(c.id); S.neighbours(c.id, 6).forEach(n => S.eatBase(n));
  const ts = []; await new Promise(res => { let n = 0; const f = t => { ts.push(t); if(++n < 150) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const d = []; for(let i = 31; i < ts.length; i++) d.push(ts[i] - ts[i - 1]); d.sort((a, b) => a - b);
  const gl = document.createElement('canvas').getContext('webgl'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return { persons: S.counts().persons, active: S.activeCount(), medianMs: +d[d.length >> 1].toFixed(2), p90Ms: +d[Math.floor(d.length * 0.9)].toFixed(2), simMs: S.simCost(), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown' }; });
  return { pass: r.persons === 5453 && r.active > 0 && r.medianMs <= 16.6, detail: r }; };
// TASK 2: hole-speed-curve: measured top speed at 5 radii within 5% of the v_max(r) table in code
T['hole-speed-curve'] = async p => { const r = await p.evaluate(() => { const S = __SIM; const out = [];
  for(const rr of [2, 3.5, 5, 7, 10]){ S.reset(); S.pause(); S.setSize(rr); S.setHole(-60, 0); S.input(1, 0); S.step(90); const x0 = S.holeWorld().x; S.step(30); const v = (S.holeWorld().x - x0) / 0.5; out.push({ r: rr, table: +S.vmax(rr).toFixed(3), measured: +v.toFixed(3), err: +(Math.abs(v - S.vmax(rr)) / S.vmax(rr)).toFixed(4) }); }
  S.input(null); return out; });
  const dec = r.every((x, i) => i === 0 || x.table < r[i - 1].table);
  return { pass: dec && r.every(x => x.err <= 0.05), detail: r }; };
// TASK 2: ca-framing: hole at CA's border -> the 25-stack's top projects inside the 390x844 viewport
T['ca-framing'] = async p => { const r = await p.evaluate(async () => { const S = __SIM; S.reset(); S.resume(); const c = S.tallest('CA'); const b = S.borderNear('CA', c.x, c.z); S.setHole(b[0], b[1]);
  await new Promise(res => setTimeout(res, 4000)); const top = S.colTopScreen(c.id); return { h: c.h, border: b, top, w: innerWidth, hgt: innerHeight }; });
  const t = r.top; return { pass: r.h === 25 && t.x >= 0 && t.x <= r.w && t.y >= 0 && t.y <= r.hgt && t.inFront, detail: r }; };
// TASK 3: teeter-before-fall: no figure goes standing -> falling in < 0.12 s after entering the rim radius
T['teeter-before-fall'] = async p => { const r = await p.evaluate(() => { const S = __SIM; S.reset(); S.pause(); S.setHole(...S.statePoint('PA', 0.4)); S.setSize(3);
  for(let i = 0; i < 60 * 8; i++){ const a = i / 60; S.input(Math.cos(a * 0.8), Math.sin(a * 1.1)); S.step(1); } S.input(null); return S.teeterStats(); });
  return { pass: r.transitions > 30 && r.minRimToFall >= 0.12, detail: r }; };
// TASK 3: banner-facts: completion banner text matches the data table for 3 sampled states
T['banner-facts'] = async p => { const r = await p.evaluate(() => { const S = __SIM; S.reset(); S.pause(); const out = [];
  for(const ab of ['TX', 'WY', 'OH']){ S.completeState(ab); const want = S.factLine(ab), got = S.lastBanner(); const d = S.data(ab);
    out.push({ ab, got, want, pop: d.pop, maxH: d.maxH, ok: got === want && got.indexOf(d.name) === 0 && got.indexOf((d.pop / 1e6).toFixed(1) + 'M people') > 0 && got.indexOf('tallest stack ' + d.maxH) > 0 }); }
  return out; });
  // FLAGGED TO MOTH: OPUS-NEXT's example text says "Texas down — 30.5M people", but the build's inlined data table says TX pop
  // 31,709,821 (31.7M). The spec's rule is "matches the data table", so that is what passes; the example's number is reported here.
  const tx = r.find(x => x.ab === 'TX'); if (tx && tx.got.indexOf('30.5M') < 0) console.log('  FLAG banner-facts: spec example says Texas 30.5M; data table gives ' + (tx.pop / 1e6).toFixed(1) + 'M — banner follows the data');
  return { pass: r.every(x => x.ok), detail: r }; };

(async () => { const srv = await serve(), port = srv.address().port, b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push('' + e));
  await p.goto(`http://localhost:${port}/index.html?test=1&seed=7`); let ok = false;
  for(let i = 0; i < 100; i++){ ok = await p.evaluate(() => !!(window.__SIM && window.__SIM.ready)); if(ok) break; await p.waitForTimeout(200); }
  let fails = 0; const names = ONLY.length ? ONLY : Object.keys(T);
  for(const n of names){ let res; if(!ok) res = { pass: false, detail: 'window.__SIM missing (not implemented)' }; else { try { res = await T[n](p); } catch(e){ res = { pass: false, detail: '' + e }; } }
    if(!res.pass) fails++; console.log((res.pass ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(res.detail)); }
  console.log(`${names.length - fails}/${names.length} passed, page errors: ${errs.length}` + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); srv.close(); process.exit(fails || errs.length ? 1 : 0); })();

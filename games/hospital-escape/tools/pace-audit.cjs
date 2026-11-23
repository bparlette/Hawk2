// node games/hospital-escape/tools/pace-audit.cjs REPO_ROOT [seed] — pace + agency audit of a build (same method for any build)
// Drives the shipped index.html with the autopilot through __game / __dbg and classifies every 1/60 s step:
//   AGENCY  = FREE_FOOT (player moves) OR a live enemy / pursuer is on screen (player aims + fires)
//   WATCH   = everything else: CUTSCENE, empty travel, stationary waits, the end quiet beat
// time-to-first-shot = seconds from START until the first moment the player has a live target on screen in a fire-enabled mode.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), ROOT = process.argv[2], SEED = process.argv[3] || 7;
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] }), p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); await p.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
  await p.goto('file://' + ROOT + '/games/hospital-escape/index.html?seed=' + SEED, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => window.__game && window.__dbg && window.__painted !== undefined);
  const r = await p.evaluate(() => { const G = window.__game, g = G.game; if(G.pause) G.pause(true); G.start('visit'); const per = {}, order = []; let t = 0, tfs = null, n = 0;
    const onScreen = () => { if(g.mode === 'FREE_FOOT') return true; if(g.mode === 'CUTSCENE') return false;
      return g.liveEnemies().some(e => { const pr = g.project(e.role); return pr && pr.onScreen; }) || g.chase.list.some(pp => pp.state === 'pursuing' && (pr => pr && pr.onScreen)(g.project(pp.role))); };
    while(!g.state().ended && !g.state().lost && n < 60 * 900){ HE.autopilot(g); g.step(1 / 60); n++; t += 1 / 60; const bt = g.beat; if(!per[bt]){ per[bt] = { total: 0, agency: 0, watch: 0 }; order.push(bt); }
      const ag = onScreen(); per[bt].total += 1 / 60; if(ag) per[bt].agency += 1 / 60; else per[bt].watch += 1 / 60; if(ag && tfs === null && g.mode !== 'CUTSCENE') tfs = t; }
    const R = x => Math.round(x * 10) / 10; const rows = order.map(k => [k, R(per[k].total), R(per[k].agency), R(per[k].watch)]);
    const tot = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2], a[2] + r[3]], [0, 0, 0]).map(R);
    // pauses inventory from the event log: rail holds (hold -> release / auto-release / segment change), cutscenes (segment span)
    const ev = __dbg.events(), holds = [], cuts = []; let open = null, seg = null, segT0 = 0, segMode = null;
    ev.forEach(e => { if(e.type === 'segment'){ if(segMode === 'CUTSCENE') cuts.push([seg, R(e.t - segT0)]); if(open){ holds.push([open.seg, open.at, R(e.t - open.t), 'segment end']); open = null; } seg = e.data.segment; segT0 = e.t; segMode = e.data.mode; }
      if(e.type === 'hold' && !open) open = { seg, at: e.data.at, t: e.t }; if((e.type === 'release' || e.type === 'holdAutoRelease') && open){ holds.push([open.seg, open.at, R(e.t - open.t), e.type]); open = null; } });
    return { holds, cutscenes: cuts, won: g.state().won, lost: g.state().lost, total: tot[0], agency: tot[1], watch: tot[2], timeToFirstShot: R(tfs), rows }; });
  console.log(JSON.stringify(Object.assign(r, { pageErrors: errs.length }))); await b.close(); })();

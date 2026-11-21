#!/usr/bin/env node
// lookdev/shoot.cjs — headless, recipe-driven capture + measurement for any Hawk2 game page.
//
//   node tools/lookdev/shoot.cjs tools/lookdev/recipes/scaggsville-3d.json [--out DIR] [--root REPO] [--tag NAME]
//
// No server and no game edits needed:
//  * repo files are served by request interception from --root (default: this repo)
//  * CDN requests go to the network (cached on disk in tools/lookdev/.cache so reruns work offline)
//  * three.js is hooked as it loads (Object3D.prototype.onBeforeRender): the latest {renderer, scene, camera}
//    is kept on globalThis.__lookdev, so `stats`, `tris` and `pick` work on ANY three.js game
//  * a WebGL draw counter counts every GL draw call (includes shadow passes; works for 2D canvas games too)
//
// Recipe JSON: { "page": "games/x/index.html?query", "viewport": [390,844], "dpr": 1,
//   "waitFor": "JS expression that becomes truthy when the page is ready", "timeout": 120000,
//   "steps": [ {"eval": "js"}, {"wait": ms}, {"waitFor": "js"}, {"click": [x,y]}, {"key": "KeyW", "hold": ms},
//              {"keyDown": "KeyW"}, {"keyUp": "KeyW"}, {"shot": "name"}, {"stats": "name"},
//              {"tris": "name", "top": 15}, {"pick": [[x,y], ...]}, {"luma": "name", "crop": [x0,y0,x1,y1]} ] }
// Output: DIR/<tag>-<name>.png per shot + DIR/<tag>.json (errors, 404s, every step's measurements).
// Exit code 1 if the page threw or the recipe failed (so CI / other agents notice).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright not found: npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const recipePath = args.find(a => a.endsWith('.json'));
if (!recipePath) { console.error('usage: node tools/lookdev/shoot.cjs <recipe.json> [--out DIR] [--root REPO] [--tag NAME]'); process.exit(2); }
const R = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
const ROOT = path.resolve(opt('--root', path.join(__dirname, '..', '..')));
const OUT = path.resolve(opt('--out', path.join(process.cwd(), 'lookdev-out')));
const TAG = opt('--tag', path.basename(recipePath, '.json'));
const CACHE = path.join(__dirname, '.cache');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };

const THREE_HOOK = `
;(()=>{ try {
  // WebGLRenderer.render is an instance property (set in the constructor), so hook the callback three.js
  // invokes for the scene AND for every drawn object: Object3D.prototype.onBeforeRender(renderer, scene, camera).
  // Works even when a game overrides its own scene.onBeforeRender, because every Mesh still calls the prototype.
  const P = Object3D.prototype, o0 = P.onBeforeRender;
  P.onBeforeRender = function(renderer, scene, camera, ...rest){
    if (renderer && renderer.isWebGLRenderer && scene && scene.isScene && camera && camera.isCamera)
      globalThis.__lookdev = { renderer, scene, camera, THREE: { Raycaster, Vector2, Vector3, Frustum, Matrix4, Sphere } };
    return o0.call(this, renderer, scene, camera, ...rest); };
} catch(e) { console.error('lookdev three hook failed', e); } })();`;
const GL_COUNTER = `(() => { let calls = 0; globalThis.__lookdevGL = { reset(){ calls = 0; }, get n(){ return calls; } };
  for (const C of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) if (C) for (const f of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements']) {
    const o = C.prototype[f]; if (!o) continue; C.prototype[f] = function(...a){ calls++; return o.apply(this, a); }; } })();`;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const [vw, vh] = R.viewport || [390, 844];
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: R.dpr || 1 });
  await ctx.addInitScript(GL_COUNTER);
  const report = { page: R.page, root: ROOT, viewport: [vw, vh], errors: [], consoleErrors: [], missing: [], steps: [] };
  await ctx.route('**/*', async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (u.hostname === 'lookdev.local') {
      const f = path.join(ROOT, decodeURIComponent(u.pathname));
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      report.missing.push(u.pathname); return route.fulfill({ status: 404, body: '' });
    }
    // network (CDN) with an on-disk cache; three.module.js gets the render hook appended
    const key = crypto.createHash('sha1').update(req.url()).digest('hex'), cf = path.join(CACHE, key);
    let body, type;
    if (fs.existsSync(cf)) { const meta = JSON.parse(fs.readFileSync(cf + '.json')); body = fs.readFileSync(cf); type = meta.type; }
    else {
      try { const resp = await route.fetch(); if (resp.status() !== 200) return route.fulfill({ response: resp }); body = await resp.body(); type = resp.headers()['content-type'] || 'application/octet-stream';
        if (req.method() === 'GET') { fs.writeFileSync(cf, body); fs.writeFileSync(cf + '.json', JSON.stringify({ url: req.url(), type })); } }
      catch (e) { report.missing.push(req.url()); return route.abort(); }
    }
    if (/three(@[\d.]+)?\/build\/three\.module(\.min)?\.js/.test(u.pathname)) body = Buffer.concat([Buffer.from(body), Buffer.from(THREE_HOOK)]);
    return route.fulfill({ body, contentType: type });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => report.errors.push(String(e.stack || e).slice(0, 800)));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 400)); });
  const t0 = Date.now();
  await page.goto('http://lookdev.local/' + R.page.replace(/^\//, ''));
  if (R.waitFor) await page.waitForFunction(R.waitFor, null, { timeout: R.timeout || 120000 }).catch(e => report.errors.push('waitFor timed out: ' + R.waitFor));
  report.readyMs = Date.now() - t0;

  const rafFps = () => page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(+(n / 1.5).toFixed(1)); })(); }));
  for (const st of R.steps || []) {
    const out = { step: st };
    try {
      if (st.eval) out.value = await page.evaluate(st.eval);
      else if (st.wait) await page.waitForTimeout(st.wait);
      else if (st.waitFor) await page.waitForFunction(st.waitFor, null, { timeout: st.timeout || 60000 });
      else if (st.click) await page.mouse.click(st.click[0], st.click[1]);
      else if (st.key) { await page.keyboard.down(st.key); await page.waitForTimeout(st.hold || 100); await page.keyboard.up(st.key); }
      else if (st.keyDown) await page.keyboard.down(st.keyDown);
      else if (st.keyUp) await page.keyboard.up(st.keyUp);
      else if (st.shot) { const f = path.join(OUT, `${TAG}-${st.shot}.png`); await page.screenshot({ path: f }); out.file = f; }
      else if (st.stats) {
        out.glDrawsPerFrame = await page.evaluate(async () => { await new Promise(r => requestAnimationFrame(r)); __lookdevGL.reset(); await new Promise(r => requestAnimationFrame(r)); return __lookdevGL.n; });
        out.three = await page.evaluate(() => { const L = globalThis.__lookdev; if (!L) return null; const i = L.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures }; });
        out.rafFps = await rafFps();
      } else if (st.tris) {
        out.top = await page.evaluate((top) => { const L = globalThis.__lookdev; if (!L) return 'no three.js renderer seen';
          const { scene, camera, THREE } = L, fr = new THREE.Frustum(); camera.updateMatrixWorld();
          fr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          const rows = {};
          scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh || o.isSkinnedMesh)) return; for (let p = o; p; p = p.parent) if (!p.visible) return;
            const g = o.geometry; if (!g || !g.attributes.position) return; const t = (g.index ? g.index.count : g.attributes.position.count) / 3, inst = o.isInstancedMesh ? o.count : 1;
            if (o.frustumCulled) { const bs = (o.isInstancedMesh && o.boundingSphere) ? o.boundingSphere : (g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere)); if (bs && !fr.intersectsSphere(bs.clone().applyMatrix4(o.matrixWorld))) return; }
            const k = (o.name || o.material && o.material.type || 'mesh') + (o.isInstancedMesh ? ' [instanced]' : ''); rows[k] = (rows[k] || 0) + t * inst; });
          return Object.entries(rows).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => [k, Math.round(v)]); }, st.top || 15);
      } else if (st.pick) {
        out.hits = await page.evaluate((pts) => { const L = globalThis.__lookdev; if (!L) return 'no three.js renderer seen';
          const { scene, camera, THREE, renderer } = L, el = renderer.domElement.getBoundingClientRect(), rc = new THREE.Raycaster();
          return pts.map(([x, y]) => { rc.setFromCamera(new THREE.Vector2((x - el.left) / el.width * 2 - 1, -((y - el.top) / el.height) * 2 + 1), camera);
            const h = rc.intersectObjects(scene.children, true)[0]; if (!h) return { x, y, hit: null };
            const chain = []; for (let o = h.object; o; o = o.parent) chain.push(o.name || o.type);
            const m = h.object.material; return { x, y, distance: +h.distance.toFixed(2), point: h.point.toArray().map(v => +v.toFixed(2)), object: chain.slice(0, 5), material: m && (m.type + (m.map ? ' +map' : '') + (m.color ? ' #' + m.color.getHexString() : '')) }; }); }, st.pick);
      } else if (st.luma) {
        const f = path.join(OUT, `${TAG}-${st.luma}.png`); await page.screenshot({ path: f }); out.file = f;
        out.luma = await page.evaluate(async ({ src, crop }) => { const img = new Image(); img.src = src; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const [x0, y0, x1, y1] = crop || [0, 0, 1, 1], X0 = Math.round(x0 * img.width), Y0 = Math.round(y0 * img.height), w = Math.max(1, Math.round((x1 - x0) * img.width)), h = Math.max(1, Math.round((y1 - y0) * img.height));
          const d = g.getImageData(X0, Y0, w, h).data; let s = 0, dark = 0, clip = 0, n = d.length / 4;
          for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; if (l < 25) dark++; if (l >= 250) clip++; }
          return { mean: +(s / n).toFixed(1), nearBlackPct: +(dark / n * 100).toFixed(1), clippedPct: +(clip / n * 100).toFixed(1) }; },
          { src: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), crop: st.crop });
      }
    } catch (e) { out.error = String(e).slice(0, 400); report.errors.push('step failed: ' + JSON.stringify(st) + ' -> ' + out.error); }
    report.steps.push(out);
  }
  report.missing = [...new Set(report.missing)];
  fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(report, null, 1));
  const summary = report.steps.filter(s => s.glDrawsPerFrame !== undefined).map(s => `${s.step.stats}: ${s.glDrawsPerFrame} GL draws, ${s.three ? s.three.triangles + ' tris, ' : ''}${s.rafFps} fps`);
  console.log(`[lookdev] ${R.page}  ready ${report.readyMs} ms  errors ${report.errors.length}  404s ${report.missing.length}`);
  for (const l of summary) console.log('  ' + l);
  for (const e of report.errors.slice(0, 5)) console.log('  ERROR ' + e.split('\n')[0]);
  console.log(`  report: ${path.join(OUT, TAG + '.json')}`);
  await browser.close();
  process.exit(report.errors.length ? 1 : 0);
})();

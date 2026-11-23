// node games/hospital-escape/engine/validate-data.mjs — checks engine/data.js against contract v1 (no three.js needed).
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url)), ctx = { window: {} }; ctx.globalThis = ctx.window; vm.createContext(ctx);
// default: the engine's greybox data; or pass a level data file (e.g. ../game/level1.js)
const dataFile = process.argv[2] ? process.argv[2] : join(here, 'data.js');
for(const f of [dataFile, join(here, 'validate-core.js')]) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const D = ctx.window.HE.DATA, r = ctx.window.HE.validateData(D);
console.log(`validate-data: ${dataFile.split('/').slice(-2).join('/')} — ${D.beats.length} beats, ${D.beats.reduce((n, b) => n + b.segments.length, 0)} segments, ${D.paths.length} paths, ${D.waves.length} waves, ${D.pursuers.length} pursuer waves, ${D.lines.length} lines`);
console.log(`validate-data: ${r.checked} objects checked, ${r.errors.length} errors`); r.errors.forEach(e => console.log('  ERROR ' + e));
console.log(r.errors.length ? 'validate-data: FAIL' : 'validate-data: PASS'); process.exit(r.errors.length ? 1 : 0);

// Dead Hall headless combat playtest harness: node tools/combat-harness.mjs
// Plays encounters with scripted inputs at 60 Hz and prints PASS/FAIL per required path + timing tables.
import { ROOMS, TUNING, planRun, CORRIDOR_BEATS } from '../src/combat/rooms.js';
import { createEncounter, createRun } from '../src/combat/encounter.js';
const DT = 1 / 60; let fails = 0;
const check = (name, ok, detail) => { if(!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
function play(enc, script, maxT = 40){ const ev = []; enc.on(e => ev.push(e)); let t = 0;
  while(!enc.done && t < maxT){ const a = script(t, enc, ev); if(a) enc.input(a); enc.step(DT); t += DT; } return ev; }
const T = (ev, type, f = () => true) => (ev.find(e => e.type === type && f(e)) || {}).t;
// a fair human-ish player: stabs 0.30 s into the counter window, then thrusts once per pulse plus 3 taps/s between
const human = (react = 0.30) => (t, e) => {
  if(e.state === 'counter' && e.stateT >= react) return 'stab';
  if(e.state === 'finish'){ if(e.onPulse() && e._lastP !== Math.floor(e.stateT / 0.55)){ e._lastP = Math.floor(e.stateT / 0.55); return 'stab'; }
    if(Math.floor(e.stateT * 3) !== e._lastQ){ e._lastQ = Math.floor(e.stateT * 3); return 'stab'; } }
  return null; };
const finishOnly = (t, e) => human(99)(t, e);

console.log('== 1. counter-success path (room 3) ==');
{ const enc = createEncounter(2); const ev = play(enc, human());
  const lunge = T(ev, 'lunge'), st = T(ev, 'stagger'), head = T(ev, 'headThrust');
  console.log(`   spike ${T(ev,'meterSpike')} s, dread ${T(ev,'state',e=>e.to==='dread')} s, lunge ${lunge} s (window ${enc.window} s), stagger ${st} s, head thrust ${head} s, taps ${enc.taps}, bite ${enc.bite.toFixed(2)}`);
  check('stab in window -> stagger -> finish -> walk resumes', enc.result === 'win' && st > lunge && st - lunge < enc.window && T(ev, 'walkResume') !== undefined && !T(ev, 'biteSurge')); }

console.log('== 2. miss path (room 3, no counter stab) ==');
{ const enc = createEncounter(2); const ev = play(enc, finishOnly);
  console.log(`   bite surge ${T(ev,'biteSurge')} s -> bite ${(ev.find(e=>e.type==='biteSurge')||{}).bite}, hard finish ${enc.hard}, head thrust ${T(ev,'headThrust')} s, final bite ${enc.bite.toFixed(2)}, taps ${enc.taps}`);
  check('no stab -> bite surge -> harder finish, still winnable', enc.result === 'win' && enc.hard && T(ev, 'biteSurge') !== undefined && !T(ev, 'signalLost')); }
console.log('   miss path in EVERY live room (same player):');
for(let i = 0; i < 12; i++){ if(ROOMS[i].kind !== 'live') continue; const enc = createEncounter(i); play(enc, finishOnly);
  console.log(`     room ${String(i+1).padStart(2)}  window ${TUNING[i].window.toFixed(2)} s  bite/s ${TUNING[i].biteRate.toFixed(3)}  -> ${enc.result} (final bite ${enc.bite.toFixed(2)})`);
  check(`   room ${i+1} miss still winnable`, enc.result === 'win'); }

// The two decoys in run order: corridor beat C1 (after room 3) first, then the room-8 doorway decoy.
// (Corridor beat C2 is live, not a decoy — it gets its own section below.)
const decoys = [
  ...CORRIDOR_BEATS.filter(b => b.kind === 'decoy').map(b => ({ label: `corridor ${b.id} (after room ${b.after})`, make: ctx => createEncounter(b.after - 1, b.tune, ctx, 'decoy', b.id) })),
  ...ROOMS.map((r, i) => r.kind === 'decoy' ? { label: `room ${i+1}`, make: ctx => createEncounter(i, TUNING[i], ctx) } : null).filter(Boolean),
];
console.log(`== 3. decoy right path (${decoys.map(d=>d.label).join(', ')}: withhold) ==`);
for(const d of decoys){ const enc = d.make({ lightLoose: false, shrink: 0 }); const ev = play(enc, () => null);
  const card = ev.find(e => e.type === 'dispatch');
  console.log(`   ${d.label}: burst ${T(ev,'burst')} s, tells ${T(ev,'tells')} s, decision point ${T(ev,'decisionPoint')} s, flee ${T(ev,'flee')} s, card "${card && card.text}"`);
  check(`${d.label} withhold -> flees, dispatch card fires`, enc.result === 'spared' && T(ev,'tells') < T(ev,'decisionPoint') && /civ, hold fire/.test(card && card.text)); }

console.log('== 4. decoy wrong path (stab at the decision point) ==');
{ const ctx = { lightLoose: false, shrink: 0 };
  for(const [k, d] of decoys.entries()){ const enc = d.make(ctx); const ev = play(enc, (t, e) => e.state === 'decoy' && e.stateT >= 0.45 ? 'stab' : null);
    const c = ev.find(e => e.type === 'consequence');
    console.log(`   wrong stab #${k+1} (${d.label}): consequence ${c && c.what}, result ${enc.result}, ctx ${JSON.stringify(ctx)}`);
    check(`${d.label} wrong stab -> consequence, no SIGNAL LOST`, enc.result === 'wrongStab' && !!c && !T(ev, 'signalLost')); }
  const nxt = createEncounter(8, TUNING[8], ctx);
  console.log(`   next live encounter (room 9) counter window: ${nxt.window.toFixed(2)} s (tuned ${TUNING[8].window.toFixed(2)} s)`);
  check('window-shrink consequence lands on the next live encounter', nxt.window < TUNING[8].window); }

console.log('== 4b. corridor beat C2: the double-look (after room 10) ==');
{ const b = CORRIDOR_BEATS.find(x => x.id === 'C2');
  const enc = createEncounter(b.after - 1, b.tune, { lightLoose: false, shrink: 0 }, 'live', b.id); const ev = play(enc, human());
  const seq = ev.filter(e => ['noise', 'glanceBack', 'forward', 'forwardSnap', 'lunge'].includes(e.type))
    .map(e => `${e.type}${e.type === 'glanceBack' ? (e.empty ? '(empty)' : '(figure)') : ''}${e.closer ? '(closer)' : ''} ${e.t}s`).join(' -> ');
  console.log(`   phases: ${seq}`);
  console.log(`   counter window ${enc.window} s, stagger ${T(ev,'stagger')} s, head thrust ${T(ev,'headThrust')} s, taps ${enc.taps}, result ${enc.result}`);
  check('double-look phases in order -> lunge -> counter -> win', enc.result === 'win' && T(ev, 'lunge') !== undefined && T(ev, 'stagger') > T(ev, 'lunge'));
  const enc2 = createEncounter(b.after - 1, b.tune, { lightLoose: false, shrink: 0 }, 'live', b.id); const ev2 = play(enc2, finishOnly);
  console.log(`   no counter stab: bite surge ${T(ev2,'biteSurge')} s -> bite ${(ev2.find(e=>e.type==='biteSurge')||{}).bite}, hard finish ${enc2.hard}, final bite ${enc2.bite.toFixed(2)}, result ${enc2.result}`);
  check('double-look miss -> bite surge -> harder finish, still winnable', enc2.result === 'win' && enc2.hard && T(ev2, 'biteSurge') !== undefined); }

console.log('== 5. full scripted clear: 12 rooms + corridor beats C1/C2 (seed 0, then seeds 1-5) ==');
for(const seed of [0, 1, 2, 3, 4, 5]){
  const run = createRun(seed), ev = []; run.on(e => ev.push(e)); const p = human(); let t = 0;
  while(!run.cleared && t < 400){ const e = run.enc; const a = e.kind === 'decoy' ? null : p(t, e); if(a) run.input(a); run.step(DT); t += DT; }
  const planArr = run.plan.map(r => r.kind[0].toUpperCase() + (r.swapped ? '*' : '')); planArr.splice(3, 0, 'C1'); planArr.splice(12, 0, 'C2');
  console.log(`   seed ${seed}: plan [${planArr.join(' ')}]  results ${run.results.join(',')}  restarts ${run.restarts}  time ${t.toFixed(1)} s  dispatch cards ${ev.filter(e=>e.type==='dispatch').length}`);
  check(`seed ${seed} clears all 12 rooms + both corridor beats with no restart`, run.cleared && run.results.length === 14 && run.restarts === 0 && run.results[3] === 'spared' && run.results[11] === 'win' && run.results[13] === 'empty'); }

console.log('== 6. SIGNAL LOST path (never stab) ==');
{ const run = createRun(0), ev = []; run.on(e => ev.push(e)); let t = 0;
  while(!ev.some(e => e.type === 'feedCut') && t < 200){ run.step(DT); t += DT; }
  const sl = ev.find(e => e.type === 'signalLost');
  console.log(`   SIGNAL LOST in room ${sl && sl.room} at ${sl && sl.t} s into the room; after restart: room ${run.room + 1}, ctx ${JSON.stringify(run.ctx)}, results ${JSON.stringify(run.results)}, restarts ${run.restarts}, enc state ${run.enc.state}`);
  check('bite fills -> feed cuts -> restart state clean', !!sl && run.room === 0 && run.restarts === 1 && !run.ctx.lightLoose && run.ctx.shrink === 0 && run.results.length === 0 && run.enc.state === 'idle' && !run.inBeat); }

console.log('== timing table (per room, from the module) ==');
for(let i = 0; i < 12; i++){ const r = ROOMS[i], tu = TUNING[i];
  console.log(`   room ${String(i+1).padStart(2)} ${r.kind.padEnd(5)} ${r.id.padEnd(13)} ` + (r.kind === 'live' ? `spike ${(tu.dreadAt-1).toFixed(1)} s, dread ${tu.dreadAt.toFixed(1)} s, counter window ${tu.window.toFixed(2)} s, bite ${tu.biteRate.toFixed(3)}/s (x1.35 after a miss), strikes ${tu.strikes} (cap 25)` : r.kind === 'empty' ? `walk ${tu.walk} s, no monster` : r.kind === 'decoy' ? 'tells +0.15 s, decision +0.45 s, withhold 2.0 s' : `spike ${(tu.dreadAt-1).toFixed(1)} s, vanish ${(tu.dreadAt+tu.dread).toFixed(1)} s`));
  for(const b of CORRIDOR_BEATS.filter(b => b.after === i + 1)) console.log(`   beat ${b.id.padEnd(5)} ${b.kind.padEnd(5)} ${'corridor'.padEnd(13)} fires in the walk after room ${b.after}: ` + (b.kind === 'decoy' ? `burst ${b.tune.dreadAt.toFixed(1)} s in, tells +0.15 s, decision +0.45 s, withhold 2.0 s` : `double-look phases (noise -> glance back empty -> forward -> noise closer -> glance back figure -> forward snap -> lunge), counter window ${b.tune.window.toFixed(2)} s, bite ${b.tune.biteRate.toFixed(3)}/s, strikes ${b.tune.strikes} (cap 25)`)); }
console.log(fails ? `\n${fails} FAILED` : '\nALL PATHS PASS'); process.exit(fails ? 1 : 0);

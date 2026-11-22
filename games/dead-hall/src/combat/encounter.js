// Dead Hall — encounter state machine (pure, dt-driven, no rendering). The render loop only calls step(dt),
// forwards input('stab'|'action') and reacts to events; no encounter logic lives in the render loop.
//   live : idle -> dread -> counter -> finish -> resolve   (result 'win' | 'lost')
//   decoy: idle -> decoy -> resolve                        (result 'spared' | 'wrongStab'; never death)
//   fake : idle -> dread -> resolve                        (result 'fake': the figure vanishes)
//   empty: idle -> resolve                                 (result 'empty': the long walk)
import { ROOMS, TUNING, COMBAT as C, planRun } from './rooms.js';

export function createEncounter(index, tune = TUNING[index], ctx = { lightLoose: false, shrink: 0 }, kind = ROOMS[index].kind){
  const subs = []; let t = 0;
  const e = { index, kind, state: 'idle', stateT: 0, done: false, result: null, bite: 0, hard: false,
    points: 0, taps: 0, tapCap: C.tapCap, pulseUsed: -1, window: Math.max(C.minWindow, tune.window - (kind === 'live' ? ctx.shrink : 0)),
    on: f => subs.push(f) };
  const emit = (type, x = {}) => { const ev = { type, t: +t.toFixed(3), room: index + 1, ...x }; subs.forEach(f => f(ev)); };
  const go = to => { emit('state', { from: e.state, to }); e.state = to; e.stateT = 0; };
  const resolve = result => { e.result = result; go('resolve'); e.done = true; if(result !== 'lost') emit('walkResume'); };
  let spiked = false, tellsShown = false, decided = false;
  if(kind === 'live' && ctx.shrink){ emit('windowShrunk', { window: e.window }); ctx.shrink = 0; }
  e.onPulse = () => { if(e.state !== 'finish') return false; const ph = e.stateT % C.pulsePeriod, h = e.hard ? C.pulseHalfHard : C.pulseHalf; return ph < h || ph > C.pulsePeriod - h; };
  e.forceState = s => { go(s); };
  e.input = a => {
    if(a !== 'stab' || e.done) return;
    if(e.state === 'counter'){ emit('stagger', { at: +e.stateT.toFixed(3) }); e.bite = Math.max(0, e.bite - C.hitDrain); go('finish'); return; }
    if(e.state === 'finish'){
      if(e.taps >= e.tapCap) return;
      e.taps++; const pulse = Math.floor((e.stateT + C.pulsePeriod / 2) / C.pulsePeriod), dbl = e.onPulse() && e.pulseUsed !== pulse;
      if(dbl) e.pulseUsed = pulse; e.points += dbl ? 2 : 1; emit('thrust', { double: dbl, points: e.points });
      if(e.points >= tune.strikes || e.taps >= e.tapCap){ emit('headThrust'); emit('lensSpatter'); resolve('win'); }
      return;
    }
    if(e.state === 'decoy' && !decided){ decided = true;
      const c = ctx.lightLoose ? (ctx.shrink += C.windowShrink, 'windowShrink') : (ctx.lightLoose = true, 'lightLoose');
      emit('consequence', { what: c }); emit('flee'); emit('dispatch', { text: '2210 — that was a civilian. Hold fire.' }); resolve('wrongStab'); }
  };
  e.step = dt => {
    if(e.done) return; t += dt; e.stateT += dt;
    if(e.state === 'idle'){
      if(kind === 'empty'){ if(e.stateT >= tune.walk) resolve('empty'); return; }
      if(kind === 'decoy'){ if(e.stateT >= tune.dreadAt){ go('decoy'); emit('burst'); } return; }
      if(!spiked && e.stateT >= tune.dreadAt - C.meterLead){ spiked = true; emit('meterSpike'); }
      if(e.stateT >= tune.dreadAt) go('dread');
    } else if(e.state === 'dread'){
      if(e.stateT >= tune.dread){ if(kind === 'fake'){ emit('vanish'); resolve('fake'); } else { go('counter'); emit('lunge', { window: e.window }); } }
    } else if(e.state === 'counter'){
      if(e.stateT >= e.window){ e.hard = true; e.bite = Math.min(0.99, e.bite + C.missSurge); emit('biteSurge', { bite: e.bite }); go('finish'); }
    } else if(e.state === 'finish'){
      e.bite += tune.biteRate * (e.hard ? C.hardBiteMul : 1) * dt;
      if(e.bite >= 1){ e.bite = 1; emit('signalLost'); resolve('lost'); }
    } else if(e.state === 'decoy'){
      if(!tellsShown && e.stateT >= C.decoyTellAt){ tellsShown = true; emit('tells', { tells: ['raised trembling hands', 'own flashlight', 'uniform/badge', 'panicked voice'] }); }
      if(e.stateT >= C.decoyDecisionAt && !e._dp){ e._dp = true; emit('decisionPoint'); }
      if(e.stateT >= C.withholdS){ decided = true; emit('flee'); emit('dispatch', { text: "2210 — that's a civ, hold fire." }); resolve('spared'); }
    }
  };
  return e;
}

// A whole run: rooms in order with dispatch cards between them; SIGNAL LOST restarts from room 1 with clean state.
export function createRun(seed = 0){
  const run = { seed, plan: planRun(seed), ctx: { lightLoose: false, shrink: 0 }, room: 0, enc: null, results: [], restarts: 0, cleared: false, subs: [] };
  const emit = ev => run.subs.forEach(f => f(ev));
  run.on = f => run.subs.push(f);
  const start = () => { const r = run.plan[run.room]; run.enc = createEncounter(run.room, TUNING[run.room], run.ctx, r.kind); run.enc.on(emit);
    emit({ type: 'dispatch', room: run.room + 1, text: `2210, room ${run.room + 1}.` + (run.ctx.lightLoose ? ' Your light is loose.' : '') }); };
  run.restart = () => { run.restarts++; run.room = 0; run.ctx = { lightLoose: false, shrink: 0 }; run.results = []; start(); };
  run.input = a => run.enc && run.enc.input(a);
  run.step = dt => {
    if(run.cleared) return; run.enc.step(dt);
    if(run.enc.done){ run.results.push(run.enc.result);
      if(run.enc.result === 'lost'){ emit({ type: 'feedCut' }); run.restart(); return; }
      if(++run.room >= run.plan.length){ run.cleared = true; emit({ type: 'cleared' }); return; }
      start(); } };
  start(); return run;
}

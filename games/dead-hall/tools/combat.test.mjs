// Dead Hall combat spec tests (node --test tools/combat.test.mjs). Written BEFORE the module: red until implemented.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, TUNING, planRun, CORRIDOR_BEATS } from '../src/combat/rooms.js';
import { createEncounter, createRun } from '../src/combat/encounter.js';

const DT = 1/60;
// drive one encounter with a script: (t, enc) -> 'stab' | 'action' | null ; returns { enc, events, t }
function play(enc, script, maxT = 30){
  const events = []; enc.on(e => events.push(e)); let t = 0;
  while(!enc.done && t < maxT){ const a = script(t, enc); if(a) enc.input(a); enc.step(DT); t += DT; }
  return { enc, events, t };
}
const pulseMasher = (t, e) => e.state==='finish' && e.onPulse() ? 'stab' : null;          // thrusts only on pulse
const counterThenMash = (t, e) => e.state==='counter' && e.stateT > 0.2 ? 'stab' : pulseMasher(t, e);

test('12 rooms, locked order and kinds; room 4 is the live crawler; decoys = room 8 + corridor beat C1', () => {
  assert.equal(ROOMS.length, 12);
  assert.equal(ROOMS[11].kind, 'empty');
  assert.equal(ROOMS[6].kind, 'live');                       // room 7 sprint
  assert.equal(ROOMS[3].kind, 'live');                       // room 4 crawler restored (Cherie, Nov 21)
  assert.equal(ROOMS.filter(r => r.kind === 'decoy').length, 1);   // room 8 is the only room decoy
  assert.equal(CORRIDOR_BEATS.length, 1);
  assert.equal(CORRIDOR_BEATS[0].id, 'C1');
  assert.equal(CORRIDOR_BEATS[0].kind, 'decoy');
  assert.equal(CORRIDOR_BEATS[0].after, 3);                  // fires in the walk after room 3
});
test('tuning table: every room has a counter window in 0.8–1.2 s, escalation tightens windows and speeds bite, never tap count', () => {
  assert.equal(TUNING.length, 12);
  for(const t of TUNING){ assert.ok(t.window >= 0.8 && t.window <= 1.2, 'window '+t.window); }
  const live = TUNING.filter((_, i) => ROOMS[i].kind === 'live');
  for(let i = 1; i < live.length; i++){
    assert.ok(live[i].window <= live[i-1].window, 'window must not widen');
    assert.ok(live[i].biteRate >= live[i-1].biteRate, 'bite must not slow');
    assert.equal(live[i].strikes, live[0].strikes, 'required strikes constant (no raw tap-count escalation)');
  }
});
test('state machine order: idle -> dread -> counter -> finish -> resolve, meters spike ~1 s before dread', () => {
  const { enc, events } = play(createEncounter(2, TUNING[2]), counterThenMash);
  const states = events.filter(e => e.type === 'state').map(e => e.to);
  assert.deepEqual(states, ['dread', 'counter', 'finish', 'resolve']);
  const spike = events.find(e => e.type === 'meterSpike'), dread = events.find(e => e.type === 'state' && e.to === 'dread');
  assert.ok(Math.abs((dread.t - spike.t) - 1.0) < 0.05, 'spike lead '+(dread.t - spike.t));
  assert.equal(enc.result, 'win');
});
test('counter hit: stagger + bite drains; finish ends with a head thrust and walk resumes', () => {
  const { enc, events } = play(createEncounter(2, TUNING[2]), counterThenMash);
  assert.ok(events.some(e => e.type === 'stagger'));
  assert.ok(events.some(e => e.type === 'headThrust'));
  assert.ok(events.some(e => e.type === 'walkResume'));
  assert.ok(!events.some(e => e.type === 'biteSurge'));
});
test('miss: bite surge + harder finish, still winnable', () => {
  const { enc, events } = play(createEncounter(2, TUNING[2]), pulseMasher);
  assert.ok(events.some(e => e.type === 'biteSurge'));
  assert.ok(enc.hard, 'harder finish flag');
  assert.equal(enc.result, 'win');
});
test('room 4 crawler: counter hit -> stagger -> win, no bite surge', () => {
  const { enc, events } = play(createEncounter(3, TUNING[3]), counterThenMash);
  assert.equal(enc.result, 'win');
  assert.ok(events.some(e => e.type === 'stagger'));
  assert.ok(events.some(e => e.type === 'headThrust'));
  assert.ok(!events.some(e => e.type === 'biteSurge'));
});
test('room 4 crawler: miss -> bite surge + harder finish, still winnable', () => {
  const { enc, events } = play(createEncounter(3, TUNING[3]), pulseMasher);
  assert.ok(events.some(e => e.type === 'biteSurge'));
  assert.ok(enc.hard, 'harder finish flag');
  assert.equal(enc.result, 'win');
});
test('mash scoring: on-pulse thrusts count double, off-pulse single, tap cap ~25 enforced', () => {
  const e = createEncounter(2, TUNING[2]); e.forceState('finish');
  // tap only off-pulse: need strikes taps, but never more than the cap
  let taps = 0; while(!e.done && taps < 60){ while(e.onPulse()) e.step(DT); e.input('stab'); taps++; e.step(DT); }
  assert.ok(taps <= e.tapCap && e.tapCap <= 25, 'taps '+taps+' cap '+e.tapCap);
  const f = createEncounter(2, TUNING[2]); f.forceState('finish'); let n = 0;
  while(!f.done && n < 60){ while(!f.onPulse()) f.step(DT); f.input('stab'); n++; for(let k=0;k<20;k++) f.step(DT); }
  assert.ok(n <= Math.ceil(TUNING[2].strikes / 2) + 1, 'on-pulse taps '+n);
});
test('SIGNAL LOST: never stab -> bite fills -> lost, no exception', () => {
  const { enc, events } = play(createEncounter(8, TUNING[8]), () => null);
  assert.equal(enc.result, 'lost');
  assert.ok(events.some(e => e.type === 'signalLost'));
});
test('decoy: tells land before the stab decision point; withhold 2 s -> flee + dispatch card', () => {
  const i = ROOMS.findIndex(r => r.kind === 'decoy');
  const { enc, events } = play(createEncounter(i, TUNING[i]), () => null);
  const tell = events.find(e => e.type === 'tells'), dec = events.find(e => e.type === 'decisionPoint');
  assert.ok(tell && dec && tell.t < dec.t, 'tell before decision');
  assert.equal(enc.result, 'spared');
  assert.ok(events.some(e => e.type === 'dispatch' && /civ, hold fire/.test(e.text)));
});
test('decoy wrong stab: consequence applied, never death', () => {
  const i = ROOMS.findIndex(r => r.kind === 'decoy');
  const { enc, events } = play(createEncounter(i, TUNING[i]), (t, e) => e.state === 'decoy' && e.stateT > 0.6 ? 'stab' : null);
  assert.equal(enc.result, 'wrongStab');
  assert.ok(events.some(e => e.type === 'consequence'));
  assert.ok(!events.some(e => e.type === 'signalLost'));
});
test('corridor beat C1: tells land before the decision point; withhold -> flee + dispatch card; events carry the beat id', () => {
  const b = CORRIDOR_BEATS[0];
  const { enc, events } = play(createEncounter(2, b.tune, { lightLoose: false, shrink: 0 }, 'decoy', b.id), () => null);
  const tell = events.find(e => e.type === 'tells'), dec = events.find(e => e.type === 'decisionPoint');
  assert.ok(tell && dec && tell.t < dec.t, 'tell before decision');
  assert.equal(enc.result, 'spared');
  assert.ok(events.some(e => e.type === 'dispatch' && /civ, hold fire/.test(e.text)));
  assert.ok(events.length > 0 && events.every(e => e.room === 'C1'), 'beat events labelled C1');
});
test('corridor beat C1: wrong stab -> consequence, never death', () => {
  const b = CORRIDOR_BEATS[0];
  const { enc, events } = play(createEncounter(2, b.tune, { lightLoose: false, shrink: 0 }, 'decoy', b.id),
    (t, e) => e.state === 'decoy' && e.stateT > 0.6 ? 'stab' : null);
  assert.equal(enc.result, 'wrongStab');
  assert.ok(events.some(e => e.type === 'consequence'));
  assert.ok(!events.some(e => e.type === 'signalLost'));
});
test('run: corridor beat fires after room 3; a full clear has 13 results with the beat spared in slot 4', () => {
  const run = createRun(0); const ev = []; run.on(e => ev.push(e)); let t = 0;
  while(!run.cleared && t < 400){ const e = run.enc; const a = e.kind === 'decoy' ? null : counterThenMash(t, e); if(a) run.input(a); run.step(DT); t += DT; }
  assert.ok(run.cleared, 'run clears');
  assert.equal(run.restarts, 0);
  assert.equal(run.results.length, 13, '12 rooms + 1 corridor beat');
  assert.equal(run.results[2], 'win');                       // room 3, the first real attack
  assert.equal(run.results[3], 'spared');                    // corridor beat C1
  assert.equal(run.results[4], 'win');                       // room 4, the restored crawler
  assert.equal(run.results[12], 'empty');                    // room 12 last
  assert.ok(ev.some(e => e.type === 'dispatch' && e.room === 'C1'), 'corridor dispatch card fired');
});
test('live/fake seeding: 2–3 mid rooms swap, room 12 always empty, room 7 always live, deterministic per seed', () => {
  for(let seed = 1; seed <= 200; seed++){
    const p = planRun(seed);
    assert.equal(p.length, 12, 'plan is rooms only — corridor beats are never in the plan');
    assert.equal(p[11].kind, 'empty'); assert.equal(p[6].kind, 'live');
    const swapped = p.filter((r, i) => r.kind !== ROOMS[i].kind).length;
    assert.ok(swapped >= 2 && swapped <= 3, 'seed '+seed+' swapped '+swapped);
    assert.equal(p.filter(r => r.kind === 'decoy').length, 1, 'the room-8 decoy never swaps');
    assert.deepEqual(planRun(seed), p);
  }
  assert.equal(planRun(0).filter((r, i) => r.kind !== ROOMS[i].kind).length, 0, 'seed 0 = canonical first run');
});

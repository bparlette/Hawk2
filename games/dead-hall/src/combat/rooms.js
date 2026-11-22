// Dead Hall — room table, per-room combat tuning, live/fake run seeding. Pure data + logic, no rendering.
// Locked design (games/dead-hall/tasking/OPUS.md): 12 rooms in this order; escalation = tighter counter windows +
// faster bite, NEVER raw tap count; exactly 2 decoys (room 8 + corridor beat C1, see CORRIDOR_BEATS below);
// room 12 always empty; room 7 sprint always live. Room 4 is a LIVE crawler (Cherie, Nov 21: restored —
// the second decoy moved out of room 4 into the corridor).
export const ROOMS = [
  { n: 1,  id: 'twins',      kind: 'fake',  note: 'twins hand-in-hand at the far end, vanish on a flicker' },
  { n: 2,  id: 'doorway-woman', kind: 'fake', note: 'dead-still under one light, vanishes' },
  { n: 3,  id: 'exit-charge', kind: 'live', note: 'silhouette under EXIT charges — first real attack, after the longest quiet stretch' },
  { n: 4,  id: 'nightvision', kind: 'live', note: 'night-vision green: a figure crawls at the camera on all fours' },
  { n: 5,  id: 'corner',     kind: 'live',  note: 'figure faces the corner; the lunge comes from the door just passed' },
  { n: 6,  id: 'hatch',      kind: 'live',  note: 'long-haired figure up out of a floor hatch' },
  { n: 7,  id: 'mascot',     kind: 'live',  note: 'broken mascot sprints the hallway — always live', lockedLive: true },
  { n: 8,  id: 'doorway-eyes', kind: 'decoy', note: 'panicked worker in the opened doorway — fake-out right after the sprint fight' },
  { n: 9,  id: 'tall',       kind: 'live',  note: 'impossibly tall figure unfolds into a slow lunge' },
  { n: 10, id: 'eye-chase',  kind: 'live',  note: 'eye corridor chase, ends in a door slam' },
  { n: 11, id: 'mannequin',  kind: 'live',  note: 'spring-necked mannequin, moves only on flicker' },
  { n: 12, id: 'yellow',     kind: 'empty', note: 'yellow room: humming, empty, the walk takes too long. No monster.' },
];

// Per-room tuning. window: counter window (s, 0.8–1.2). biteRate: bite meter fill per second in the finish.
// strikes: strike points to finish (constant — escalation is never tap count). Times in seconds from room entry.
// Eight live rooms now (room 4 restored): the same established step (-0.05 s window, +0.010 bite per live room),
// extended one step — windows 1.15 -> 0.80, bite 0.060 -> 0.130. Room 4 slots in as live #2 (1.10 s, 0.070/s).
const LIVE_WINDOWS = [1.15, 1.10, 1.05, 1.00, 0.95, 0.90, 0.85, 0.80];
const LIVE_BITE    = [0.060, 0.070, 0.080, 0.090, 0.100, 0.110, 0.120, 0.130];
export const COMBAT = { strikes: 14, tapCap: 25, pulsePeriod: 0.55, pulseHalf: 0.10, pulseHalfHard: 0.07,
  hitDrain: 0.15, missSurge: 0.35, hardBiteMul: 1.35, meterLead: 1.0, decoyTellAt: 0.15, decoyDecisionAt: 0.45,
  withholdS: 2.0, windowShrink: 0.15, minWindow: 0.65 };
export const TUNING = (() => { let k = 0; return ROOMS.map(r => {
  const live = r.kind === 'live', i = live ? k++ : Math.max(0, k - 1);
  return { window: live ? LIVE_WINDOWS[i] : 1.0, biteRate: live ? LIVE_BITE[i] : 0, strikes: COMBAT.strikes,
           dreadAt: 2.0, dread: 1.2, walk: r.kind === 'empty' ? 9.0 : 3.0 }; }); })();

// Corridor beats: non-room encounters in the walk BETWEEN rooms. They are sequence entries in the run order,
// NOT rooms — planRun never returns them, so the seeded live/fake swaps can never touch them (same protection
// as the room-8 decoy, room 7 and room 12). C1 fires after room 3 — the first real attack — while the player is
// still stab-happy from their first fight: the false-security beat, and it teaches hold-fire early, before
// room 8 tests it again. It also means room 4's restored crawler lands right after a false alarm.
// C2 (the Double-Look) is a LIVE beat: a scripted look-back sequence (tune.look) that resolves into the
// standard counter/finish flow. It sits after room 10, far from C1 — see the response addendum for why.
export const CORRIDOR_BEATS = [
  { id: 'C1', after: 3, kind: 'decoy',
    note: 'corridor between rooms 3 and 4: a panicked building worker bursts out of a side door — raised trembling hands, his own flashlight, panicked voice',
    tune: { window: 1.0, biteRate: 0, strikes: COMBAT.strikes, dreadAt: 1.5, dread: 1.2, walk: 3.0 } },
  { id: 'C2', after: 10, kind: 'live', staging: 'double-look',
    note: 'corridor between rooms 10 and 11 — THE DOUBLE-LOOK: a noise behind; glance back: the hallway is EMPTY; forward; the noise again, closer; glance back: a figure standing mid-hallway; forward snap — it lunges',
    tune: { window: 0.80, biteRate: 0.130, strikes: COMBAT.strikes, dreadAt: 2.0, dread: 1.2, walk: 3.0,
      look: [ { ev: 'noise', dt: 1.2 }, { ev: 'glanceBack', dt: 0.9, empty: true }, { ev: 'forward', dt: 1.0 },
              { ev: 'noise', dt: 0.8, closer: true }, { ev: 'glanceBack', dt: 0.9, empty: false }, { ev: 'forwardSnap', dt: 0.45 } ] } },
];

function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// seed 0 = the canonical first run. Any other seed swaps 2–3 mid rooms live<->fake (never room 7, the decoys or room 12).
export function planRun(seed = 0){
  const plan = ROOMS.map(r => ({ ...r }));
  if(!seed) return plan;
  const R = mulberry32(seed), pool = plan.map((r, i) => i).filter(i => i >= 2 && i <= 10 && !plan[i].lockedLive && (plan[i].kind === 'live' || plan[i].kind === 'fake'));
  const k = R() < 0.5 ? 2 : 3;
  for(let s = 0; s < k; s++){ const j = pool.splice(Math.floor(R() * pool.length), 1)[0]; plan[j].kind = plan[j].kind === 'live' ? 'fake' : 'live'; plan[j].swapped = true; }
  return plan;
}

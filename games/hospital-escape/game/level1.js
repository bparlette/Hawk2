/* Hospital Escape — LEVEL 1: St. Mercer Memorial. Contract v1 data (beats, segments, paths, waves, pursuers, lines) +
   validator-gated extensions (bystanders, over-shoulder rig fields, tuning) + the environment layout (env) the world
   builder reads. L2–L4 are new files in this same shape. Cast and the opening's dialogue are Neon's (step-one/). */
(function(){
'use strict';
var G = -12;                                   // ground floor; Ward 4B is at y = 0
// the over-the-shoulder rig (NEON-FIX-CAMERA §6). back = camera behind the RIDER = pusher gap 0.55 + spec distance behind Maya.
var BED = { height: 1.55, back: 0.55 + 1.15, side: 0.28, lookAhead: 6, lookHeight: 1.0, lookClamp: 20, holdClamp: 75 };
var CHAIR = { height: 1.45, back: 0.55 + 1.0, side: 0.25, lookAhead: 6, lookHeight: 1.0, lookClamp: 20, holdClamp: 75 };
var rig = function(r, o){ var p = {}; for(var k in r) p[k] = r[k]; for(var k2 in o) p[k2] = o[k2]; return p; };
var L = [
  // ---- Neon's lines (step-one), unchanged ----
  ['hale_01', 'NPC:Dr. Hale', 'Miss Vance, stop — Mr. Mercer hasn\'t been cleared for discharge.', 2.2],
  ['maya_01', 'FRIEND', 'Gunshots on four — they found him. Take this, Cole. We\'re leaving now.', 2.3],
  ['cole_01', 'HERO', 'I can\'t stand—', 1.6],
  ['maya_02', 'FRIEND', 'Hold on! Rolling the whole bed — shoot whoever steps out!', 2.6],
  ['cole_02', 'HERO', 'Left side! Behind the cart!', 1.8],
  ['maya_03', 'FRIEND', 'Crash cart\'s blocking the bed! Grab my shoulder — into the wheelchair!', 2.2],
  ['cole_03', 'HERO', 'Ugh— easy! Alright, I\'m in. Push!', 2.2],
  ['maya_04', 'FRIEND', 'Seated height — keep your barrel up! Elevator lobby\'s straight ahead!', 2.8],
  ['maya_05', 'FRIEND', 'Scrubs with guns — they\'re not hospital staff!', 2.2],
  ['maya_06', 'FRIEND', 'Doors held. Elevator\'s next — catch your breath, Cole.', 2.6],
  // ---- beats 4–9, extended in the same voice ----
  ['hale_02', 'NPC:Dr. Hale', 'Then go — and stay off the east stairs. Go!', 2.4],
  ['cole_04', 'HERO', 'Ground floor. If they\'re smart, they\'re waiting.', 2.4],
  ['maya_06b', 'FRIEND', 'He\'s holding the doors — drop him before they close!', 2.4],   // ELEVATOR-BLOCK (owner request, Nov 25)
  ['maya_07', 'FRIEND', 'They\'re not smart. They\'re waiting anyway — doors opening!', 2.6],
  ['maya_08', 'FRIEND', 'Bag under the trolley — longer bark. Take it.', 2.4],
  ['cole_05', 'HERO', 'Oh, I like this one.', 1.6],
  ['maya_09', 'FRIEND', 'Cafeteria. Stay low — that glass won\'t stop much.', 2.6],
  ['cole_06', 'HERO', 'Counter! Two behind the counter!', 1.8],
  ['maya_10', 'FRIEND', 'Park it. I\'ll clear the ward and come right back for you.', 2.8],
  ['cole_07', 'HERO', 'Don\'t leave me here long.', 1.6],
  ['maya_11', 'FRIEND', 'Heads down, folks — stay in your seats!', 2.2],
  ['cole_08', 'HERO', 'Waiting room. Funny.', 1.6],
  ['maya_12', 'FRIEND', 'Front doors! Hold them while I get the doors propped!', 2.6],
  ['cole_09', 'HERO', 'You want me faster? Get me some legs.', 2.2],
  ['maya_13', 'FRIEND', 'Doors are open — go, go!', 1.6],
  ['maya_14', 'FRIEND', 'Ambulance, engine running. Somebody\'s having a worse day than us.', 2.2],
  ['cole_10', 'HERO', 'Put me in the back. I\'ll watch the doors.', 2.2],
  ['maya_15', 'FRIEND', 'Lights behind us! Make them back off!', 2.2],
  ['cole_11', 'HERO', 'Lights are gone. Just black SUVs now.', 2.4],
  ['maya_16', 'FRIEND', 'Let them come. Shoot!', 1.6],
  ['maya_17', 'FRIEND', 'Crossing ahead — the bells are going — hold on!', 2.6],
  ['cole_12', 'HERO', 'They\'re stuck. They\'re all stuck behind the train.', 2.4],
  ['maya_18', 'FRIEND', 'Nothing in my mirrors. Nothing at all.', 3.0]
].map(function(l){ return { id: l[0], speaker: l[1], text: l[2], dur: l[3] }; });

var paths = [
  // 1 — the visit: camera held in the corner of Room 412 by the door, looking at the bed
  { id: 'room_view', vehicle: 'bed', points: [[3.75, 0, -7.05], [3.65, 0, -6.75]], height: 1.65, back: 0, speed: 0, look: [{ at: 0, target: [0.1, 1.0, -3.4] }], events: [] },
  // 2 — the bed push: Room 412 -> out the door -> West Wing hall. Rider point = Cole's head; the bed extends ahead of it.
  rig(BED, { id: 'bed_hall', vehicle: 'bed', points: [[0, 0, -2.6], [0, 0, -9], [0, 0, -13.6], [1.8, 0, -16], [8, 0, -16], [10.8, 0, -17.6], [12, 0, -21], [12, 0, -30], [12, 0, -38.6]],
    speedKeys: [{ at: 0, speed: 2.9 }, { at: 0.20, speed: 0 }, { at: 0.374, speed: 0 }, { at: 0.397, speed: 2.9 }, { at: 0.673, speed: 0 }, { at: 0.7, speed: 2.9 }],
    look: [{ at: 0, target: 'group:bed_w1' }, { at: 0.606, target: 'group:bed_w2' }],
    events: [{ at: 0.0, type: 'line', line: 'cole_01' }, { at: 0.06, type: 'line', line: 'hale_02' }, { at: 0.16, type: 'line', line: 'maya_02' }, { at: 0.285, type: 'wave', wave: 'bed_w1' }, { at: 0.341, type: 'line', line: 'cole_02' }, { at: 0.549, type: 'wave', wave: 'bed_w2' }, { at: 1, type: 'segmentEnd' }] }),
  // 3 — transfer (held), then the wheelchair corridor (East Wing) to the elevator lobby
  { id: 'transfer_view', vehicle: 'chair', points: [[13.3, 0, -36.9], [13.2, 0, -37.2]], height: 1.6, back: 0, speed: 0, look: [{ at: 0, target: [11.4, 0.8, -40.6] }], events: [] },
  rig(CHAIR, { id: 'chair_corridor', vehicle: 'chair', points: [[11.8, 0, -40.6], [11.6, 0, -42.2], [7, 0, -42.2], [2.2, 0, -42.6], [0, 0, -46], [0, 0, -54], [0, 0, -63]],
    speedKeys: [{ at: 0, speed: 0 }, { at: 0.02, speed: 3.0 }, { at: 0.595, speed: 0 }, { at: 0.632, speed: 3.0 }],
    look: [{ at: 0, target: 'group:tr_w1' }, { at: 0.427, target: 'group:tr_w2' }],
    events: [{ at: 0.0, type: 'line', line: 'cole_03' }, { at: 0.12, type: 'line', line: 'maya_04' }, { at: 0.435, type: 'wave', wave: 'tr_w2' }, { at: 0.501, type: 'line', line: 'maya_05' }, { at: 1, type: 'segmentEnd' }] }),
  // 4 — the elevator: roll into the car (Ward 4B), doors close, descend; the car opens on the ground floor, hot
  rig(CHAIR, { id: 'elevator_in', vehicle: 'chair', points: [[0, 0, -63], [0, 0, -69], [0, 0, -75.9]], speedKeys: [{ at: 0, speed: 2.8 }, { at: 0.3, speed: 0 }, { at: 0.34, speed: 2.8 }, { at: 0.75, speed: 2.2 }, { at: 0.88, speed: 0 }, { at: 0.885, speed: 2.2 }], holdClamp: 180,
    look: [{ at: 0, target: 'group:el_up' }, { at: 0.86, target: 'group:el_block' }], events: [{ at: 0.0, type: 'line', line: 'maya_06' }, { at: 0.04, type: 'wave', wave: 'el_up' }, { at: 0.8, type: 'line', line: 'cole_04' }, { at: 0.86, type: 'wave', wave: 'el_block' }, { at: 0.865, type: 'line', line: 'maya_06b' }, { at: 1, type: 'segmentEnd' }] }),
  rig(CHAIR, { id: 'elevator_out', vehicle: 'chair', points: [[0, G, -75.9], [0, G, -82], [0, G, -91]], speedKeys: [{ at: 0, speed: 0 }, { at: 0.02, speed: 2.8 }],
    look: [{ at: 0, target: 'group:el_w1' }], events: [{ at: 0, type: 'line', line: 'maya_07' }, { at: 1, type: 'segmentEnd' }] }),
  // 5 — the gauntlet: halls -> cafeteria (through the glass) -> the ward on foot (Maya) -> the waiting room
  rig(CHAIR, { id: 'g_halls', vehicle: 'chair', points: [[0, G, -91], [0, G, -104], [0, G, -112], [3.5, G, -116], [16, G, -116]],
    speedKeys: [{ at: 0, speed: 3.0 }, { at: 0.28, speed: 0 }, { at: 0.33, speed: 3.0 }],
    look: [{ at: 0, target: 'group:g_w1' }, { at: 0.45, target: 'group:g_w2' }],
    events: [{ at: 0.05, type: 'wave', wave: 'g_w1' }, { at: 0.5, type: 'line', line: 'maya_08' }, { at: 0.56, type: 'pickup', weapon: 'machine_pistol' }, { at: 0.6, type: 'line', line: 'cole_05' }, { at: 0.62, type: 'wave', wave: 'g_w2' }, { at: 1, type: 'segmentEnd' }] }),
  rig(CHAIR, { id: 'g_caf', vehicle: 'chair', points: [[16, G, -116], [23, G, -116], [28, G, -111.5], [34, G, -111], [39.5, G, -119], [45, G, -116]],
    speedKeys: [{ at: 0, speed: 2.8 }, { at: 0.275, speed: 0 }, { at: 0.315, speed: 2.8 }, { at: 0.654, speed: 0 }, { at: 0.704, speed: 3.0 }],
    look: [{ at: 0, target: 'group:caf_w1' }, { at: 0.525, target: 'group:caf_w2' }],
    events: [{ at: 0.02, type: 'line', line: 'maya_09' }, { at: 0.08, type: 'wave', wave: 'caf_w1' }, { at: 0.497, type: 'wave', wave: 'caf_w2' }, { at: 0.553, type: 'line', line: 'cole_06' }, { at: 1, type: 'segmentEnd' }] }),
  { id: 'ward_foot', vehicle: 'chair', points: [[48.8, G, -116], [53, G, -116], [57, G, -121], [57, G, -131]], height: 1.62, back: 2.0, side: 0.45, speed: 0, events: [] },
  rig(CHAIR, { id: 'g_wait', vehicle: 'chair', points: [[57, G, -131], [54, G, -136.5], [57, G, -140.5], [59.5, G, -144], [58, G, -148]],
    speedKeys: [{ at: 0, speed: 2.8 }, { at: 0.225, speed: 0 }, { at: 0.477, speed: 2.8 }],
    look: [{ at: 0, target: 'group:wait_w1' }], events: [{ at: 0.04, type: 'line', line: 'maya_11' }, { at: 0.12, type: 'wave', wave: 'wait_w1' }, { at: 0.6, type: 'line', line: 'cole_08' }, { at: 1, type: 'segmentEnd' }] }),
  // 6 — the main entrance: holdout at the doors, then the exit push out under the canopy
  rig(CHAIR, { id: 'lobby_hold', vehicle: 'chair', points: [[58, G, -149], [58, G, -150.6]], speedKeys: [{ at: 0, speed: 0 }], lookClamp: 26,
    look: [{ at: 0, target: 'group:ent_w1' }], events: [{ at: 0, type: 'line', line: 'maya_12' }] }),
  rig(CHAIR, { id: 'exit_push', vehicle: 'chair', points: [[58, G, -150.6], [55.6, G, -157], [58.6, G, -164], [58, G, -172.5]], speed: 3.2,
    events: [{ at: 0.05, type: 'line', line: 'maya_13' }, { at: 1, type: 'segmentEnd' }] }),
  // 7 — steal the ambulance: held camera at the bay, then the staging pull-out (rear rig looks back at the hospital)
  { id: 'bay_view', vehicle: 'chair', points: [[61.4, G, -174.2], [61.3, G, -174.6]], height: 1.65, back: 0, speed: 0, look: [{ at: 0, target: [58, G + 1.2, -181] }], events: [] },
  { id: 'bay_route', vehicle: 'ambulance', bayOffset: 1.35, lookClamp: 15, points: [[58, G, -181], [58, G, -196], [66, G, -205.5], [90, G, -208]], height: 1.75, back: 0,
    speedKeys: [{ at: 0, speed: 4 }, { at: 0.4, speed: 10 }], look: [{ at: 0, target: 'group:lot_w1' }], events: [{ at: 0.03, type: 'line', line: 'cole_10' }, { at: 1, type: 'segmentEnd' }] },
  // 8 — the chase (east on Harbor Avenue) — 9 — the train finale (the Line 9 crossing)
  { id: 'chase_road', vehicle: 'ambulance', bayOffset: 1.35, lookClamp: 15, points: [[90, G, -208], [150, G, -209], [190, G, -225], [215, G, -262], [240, G, -305], [285, G, -325], [350, G, -322], [400, G, -300], [450, G, -298], [500, G, -318], [540, G, -352], [565, G, -400], [610, G, -428], [680, G, -432], [760, G, -430]], height: 1.75, back: 0, speed: 24,
    events: [{ at: 0.03, type: 'line', line: 'maya_15' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'finale_road', vehicle: 'ambulance', bayOffset: 1.35, lookClamp: 15, points: [[760, G, -430], [820, G, -442], [868, G, -472], [930, G, -484], [990, G, -458], [1040, G, -430], [1100, G, -426], [1300, G, -426]], height: 1.75, back: 0, speed: 24,
    crossingAt: 0.86, trainAt: 0.873, trainOccupies: 12, events: [{ at: 0.74, type: 'line', line: 'maya_17' }, { at: 1, type: 'segmentEnd' }] }
];
var W = function(id, trigger, spawns, onCleared){ var w = { id: id, trigger: trigger, spawns: spawns }; if(onCleared) w.onCleared = onCleared; return w; };
var S = function(kind, at, count, stagger, behavior){ return { kind: kind, at: at, count: count, stagger: stagger, behavior: behavior }; };
// spawn points are doorways / corners / counters (see env): cover = corner-pops that advance; rush = through a door and at you
var waves = [
  W('bed_w0', { type: 'timer', delay: 1.2 }, [S('gunman', [1.9, 0, -14.6], 1, 0, 'cover')], { type: 'resume' }),
  W('bed_w1', { type: 'pathEvent' }, [S('gunman', [9.9, 0, -15.9], 1, 0, 'cover'), S('gunman', [11.9, 0, -17.7], 1, 0.5, 'cover')], { type: 'resume' }),
  W('bed_w2', { type: 'pathEvent' }, [S('gunman', [12.1, 0, -38.3], 2, 0.9, 'rush'), S('gunman', [13.2, 0, -31.5], 1, 0, 'cover')], { type: 'resume' }),
  W('tr_w1', { type: 'segmentStart' }, [S('gunman', [5.1, 0, -43.6], 1, 0, 'cover'), S('gunman', [6.9, 0, -43.8], 1, 0.6, 'rush')], { type: 'resume' }),
  W('tr_w3', { type: 'afterWave', wave: 'tr_w2', delay: 0.4 }, [S('gunman', [0, 0, -65.6], 2, 0.5, 'rush')]),
  W('tr_w2', { type: 'pathEvent' }, [S('staff', [-0.4, 0, -58.4], 1, 0, 'cover'), S('staff', [1.3, 0, -60.2], 1, 0, 'cover'), S('staff', [0, 0, -64.4], 1, 0.6, 'rush')], { type: 'resume' }),
  W('el_up', { type: 'pathEvent' }, [S('gunman', [-1.2, 0, -72.7], 1, 0, 'cover'), S('staff', [1.1, 0, -72.3], 1, 0.4, 'cover')], { type: 'resume' }),
  W('el_block', { type: 'pathEvent' }, [S('gunman', [0.6, 0, -64.5], 1, 0, 'rush')], { type: 'resume' }),   // ELEVATOR-BLOCK: the doors are closing — he runs in and holds them; the car waits for him to drop
  W('el_w1', { type: 'segmentStart' }, [S('gunman', [-1.4, G, -84.5], 1, 0, 'cover'), S('gunman', [1.4, G, -86.5], 1, 0.4, 'cover'), S('gunman', [0, G, -90], 1, 0.8, 'rush')]),
  W('g_w0', { type: 'timer', delay: 0.8 }, [S('staff', [1.3, G, -97], 1, 0, 'cover')]),
  W('g_w1', { type: 'pathEvent' }, [S('gunman', [-1.3, G, -108.5], 1, 0, 'cover'), S('staff', [1.2, G, -110.5], 1, 0.5, 'cover'), S('gunman', [1.5, G, -116], 1, 1.0, 'rush')], { type: 'resume' }),
  W('g_w2', { type: 'pathEvent' }, [S('staff', [14.5, G, -114.6], 1, 0, 'cover'), S('staff', [17, G, -116], 1, 0.7, 'rush')]),
  W('caf_w1', { type: 'pathEvent' }, [S('gunman', [30.4, G, -111.9], 1, 0, 'cover'), S('gunman', [29.1, G, -110.1], 1, 0.4, 'cover'), S('gunman', [34.9, G, -109.7], 1, 0.9, 'rush')], { type: 'resume' }),
  W('caf_w2', { type: 'pathEvent' }, [S('staff', [40.1, G, -118], 1, 0, 'cover'), S('staff', [41.3, G, -119.5], 1, 0.3, 'cover'), S('gunman', [39.7, G, -119.6], 1, 0.8, 'rush')], { type: 'resume' }),
  W('foot_w1', { type: 'segmentStart' }, [S('gunman', [54.5, G, -115.4], 1, 0, 'cover'), S('staff', [55.6, G, -116.8], 1, 0.6, 'cover')], { type: 'wave', wave: 'foot_w2' }),
  W('foot_w2', { type: 'afterWave', wave: 'foot_w1', delay: 1.0 }, [S('staff', [58, G, -119.6], 2, 0.7, 'rush')]),
  W('wait_w1', { type: 'pathEvent' }, [S('gunman', [57.9, G, -141.2], 1, 0, 'cover'), S('gunman', [57.5, G, -143.8], 1, 0.4, 'cover'), S('staff', [58, G, -149.4], 1, 0.9, 'rush')], { type: 'resume' }),
  W('ent_w1', { type: 'segmentStart' }, [S('staff', [58.6, G, -163.5], 3, 0.8, 'rush')], { type: 'wave', wave: 'ent_w2' }),
  W('ent_w2', { type: 'afterWave', wave: 'ent_w1', delay: 1.2 }, [S('gunman', [55.3, G, -159.8], 1, 0, 'cover'), S('gunman', [58.4, G, -160], 1, 0.4, 'cover'), S('gunman', [58.6, G, -163.5], 1, 1.0, 'rush')], { type: 'line', line: 'cole_09' }),
  W('exit_w1', { type: 'segmentStart' }, [S('gunman', [55.6, G, -161], 2, 0.6, 'rush')]),
  W('lot_w1', { type: 'segmentStart' }, [S('gunman', [58, G, -168.5], 3, 0.7, 'rush')])
];
var P = function(id, trigger, spawns, onCleared){ var w = { id: id, trigger: trigger, spawns: spawns }; if(onCleared) w.onCleared = onCleared; return w; };
var pursuers = [
  P('chase_w1', { type: 'timer', delay: 0.8 }, [{ kind: 'patrol', slot: 'behind', gap: 30 }], { type: 'line', line: 'maya_16' }),
  P('chase_w2', { type: 'afterWave', wave: 'chase_w1', delay: 0.8 }, [{ kind: 'patrol', slot: 'left', gap: 28 }, { kind: 'charger', slot: 'behind', gap: 36 }], { type: 'line', line: 'cole_11' }),
  P('chase_w3', { type: 'afterWave', wave: 'chase_w2', delay: 1.0 }, [{ kind: 'suv', slot: 'behind', gap: 30 }, { kind: 'suv', slot: 'right', gap: 38 }]),
  P('chase_w4', { type: 'afterWave', wave: 'chase_w3', delay: 0.8 }, [{ kind: 'suv', slot: 'left', gap: 32 }, { kind: 'suv', slot: 'behind', gap: 40 }]),
  P('fin_w1', { type: 'segmentStart' }, [{ kind: 'suv', slot: 'behind', gap: 34 }, { kind: 'suv', slot: 'left', gap: 40 }]),
  P('fin_w3', { type: 'afterWave', wave: 'fin_w2', delay: 0.8 }, [{ kind: 'suv', slot: 'left', gap: 30 }]),
  P('fin_w2', { type: 'timer', delay: 8 }, [{ kind: 'suv', slot: 'right', gap: 30 }, { kind: 'suv', slot: 'behind', gap: 36 }])
];
var seg = function(id, mode, path, waves, lines){ var s = { id: id, mode: mode, waves: waves || [], lines: lines || [] }; if(path) s.path = path; return s; };
var beats = [
  { id: 'visit', segments: [seg('visit_room', 'CUTSCENE', 'room_view', [], ['hale_01', 'maya_01'])] },
  { id: 'bed_push', segments: [seg('bed_hall_push', 'RAIL_CHAIR', 'bed_hall', ['bed_w0', 'bed_w1', 'bed_w2'], ['cole_01', 'hale_02', 'maya_02', 'cole_02'])] },
  { id: 'transfer', segments: [seg('transfer_cut', 'CUTSCENE', 'transfer_view', [], ['maya_03']), seg('transfer_chair_corridor', 'RAIL_CHAIR', 'chair_corridor', ['tr_w1', 'tr_w2', 'tr_w3'], ['cole_03', 'maya_04', 'maya_05'])] },
  { id: 'elevator', segments: [seg('elevator_ride', 'RAIL_CHAIR', 'elevator_in', ['el_up', 'el_block'], ['maya_06', 'cole_04', 'maya_06b']), seg('elevator_doors_ground', 'RAIL_CHAIR', 'elevator_out', ['el_w1'], ['maya_07'])] },
  { id: 'gauntlet', segments: [seg('gauntlet_halls', 'RAIL_CHAIR', 'g_halls', ['g_w0', 'g_w1', 'g_w2'], ['maya_08', 'cole_05']), seg('gauntlet_cafeteria', 'RAIL_CHAIR', 'g_caf', ['caf_w1', 'caf_w2'], ['maya_09', 'cole_06']),
                               seg('gauntlet_ward_on_foot', 'FREE_FOOT', 'ward_foot', ['foot_w1', 'foot_w2'], ['maya_10', 'cole_07']), seg('gauntlet_waiting_room', 'RAIL_CHAIR', 'g_wait', ['wait_w1'], ['maya_11', 'cole_08'])] },
  { id: 'entrance', segments: [seg('entrance_holdout', 'HOLDOUT', 'lobby_hold', ['ent_w1', 'ent_w2'], ['maya_12', 'cole_09']), seg('entrance_exit_push', 'RAIL_CHAIR', 'exit_push', ['exit_w1'], ['maya_13'])] },
  { id: 'steal', segments: [seg('steal_cut', 'CUTSCENE', 'bay_view', [], ['maya_14']), seg('steal_staging', 'AMBULANCE', 'bay_route', ['lot_w1'], ['cole_10'])] },
  { id: 'chase', segments: [seg('chase_harbor_ave', 'AMBULANCE', 'chase_road', ['chase_w1', 'chase_w2', 'chase_w3', 'chase_w4'], ['maya_15', 'cole_11', 'maya_16'])] },
  { id: 'train_finale', segments: [seg('finale_line9_crossing', 'AMBULANCE', 'finale_road', ['fin_w1', 'fin_w2', 'fin_w3'], ['maya_17', 'cole_12', 'maya_18'])] }
];
// ext: bystanders — unarmed staff and patients crossing the fights (Virtua Cop). Hitting one costs score (tuning.score.bystander).
var bystanders = [
  { id: 'nurse_west', segment: 'bed_hall_push', kind: 'nurse', from: [6.2, 0, -14.6], to: [6.6, 0, -17.6], delay: 6.5, speed: 1.1 },
  { id: 'patient_door', segment: 'bed_hall_push', kind: 'patient', from: [13.4, 0, -35.2], to: [13.5, 0, -35.6], delay: 17, speed: 0.15, pause: [0.5, 4] },
  { id: 'orderly_east', segment: 'transfer_chair_corridor', kind: 'orderly', from: [1.5, 0, -55], to: [-1.6, 0, -55.6], delay: 9, speed: 1.6 },
  { id: 'nurse_halls', segment: 'gauntlet_halls', kind: 'nurse', from: [-1.5, G, -108], to: [1.6, G, -108.5], delay: 4, speed: 1.7 },
  { id: 'caf_cook', segment: 'gauntlet_cafeteria', kind: 'orderly', from: [27, G, -124], to: [24, G, -108], delay: 3, speed: 2.2 },
  { id: 'wait_patient', segment: 'gauntlet_waiting_room', kind: 'patient', from: [62, G, -137], to: [52.5, G, -137.4], delay: 3, speed: 1.0, pause: [3.2, 2.5] },
  { id: 'lobby_visitor', segment: 'entrance_holdout', kind: 'visitor', from: [52, G, -158], to: [64, G, -159], delay: 1.5, speed: 2.4 }
];
var tuning = {
  weapons: { pistol: { mag: 12, reloadTime: 1.2, damage: 10, rate: 6, auto: false }, machine_pistol: { mag: 30, reloadTime: 1.2, damage: 8, rate: 10, auto: true } },
  enemies: { gunman: { hp: 57, speed: 2.3, fireEvery: 2.2, accuracy: 0.26, damage: 4 }, staff: { hp: 46, speed: 2.7, fireEvery: 2.5, accuracy: 0.24, damage: 4 } },
  pursuers: { patrol: { attack: 10, close: 5, fireEvery: 1.8, accuracy: 0.24, damage: 4 }, charger: { attack: 7, close: 6, fireEvery: 1.6, accuracy: 0.26, damage: 4 }, suv: { attack: 9, close: 6, fireEvery: 1.4, accuracy: 0.28, damage: 5 } },
  components: { tire: 30, driver: 40, engine: 60 },
  cover: { exposed: 1.5, hidden: 1.1, lateral: 0.7, advance: 3.0, advanceEvery: 2, minDist: 6.5, side: 0.5, recoverAfter: 5, commit: true },
  enemyFireDelay: 0.6, firstShot: 0.35, autopilot: { react: 1.6 }, trainApproach: 1.0, footSpeed: 5.2, footHalfWidth: 4.5, ambulanceFov: 80,
  shotSpeed: 24, aimTell: 0.45, closeRange: 14, healOnBeat: 35, holdRelease: 0.25, fairness: { telegraph: 0.6, minPx: 40, margin: 0.03, outGate: 0.85, seenOnly: true }, rushStop: 5.5, screenFire: 1.1, footTurn: 1.9,
  partner: { fireEvery: 1.25, accuracy: 0.5, damage: 10 },
  score: { kill: 100, quick: 50, quickDraw: 1.2, streak: 10, wreck: 250, bystander: 500 }
};
// ---- environment layout (world.js builds every zone from this; doors are spawn entrances) ----
var env = {
  floors: { upper: 0, ground: G },
  zones: [
    { kind: 'patientRoom', min: [-3.6, 0, -6.5], max: [3.6, 3.0, 0], door: [0, -6.5], label: '412', ward: 'WARD 4B' },
    { kind: 'hall', y: 0, a: [0, -6.5], b: [0, -17.7], w: 3.4, h: 2.9, name: 'WEST WING', doorsL: [-11.5], doorsR: [-10], props: [['ivPole', 1.4, -8.6, 0]], signs: [['WARD 4B  ·  WEST WING', 0, -7.4]] },
    { kind: 'hall', y: 0, a: [-1.7, -16], b: [13.7, -16], w: 3.4, h: 2.9, name: 'WEST WING CROSS', caps: ['a', 'b'], doorsL: [7.2], doorsR: [4.5, 9.5], props: [['gurney', -0.6, -16.6, 1.57]], signs: [['WARD 4B  →  BEDS 413–430', 4, -16]] },
    { kind: 'hall', y: 0, a: [12, -16], b: [12, -43.7], w: 3.4, h: 2.9, name: 'WEST WING B', caps: ['b'], doorsL: [-24.5, -31.5], doorsR: [-20.5, -28, -35.2], station: { side: -1, z: -27.5 },
      props: [['crashCart', 12.2, -43.0, 1.57], ['gurney', 13.1, -38.6, 0]], signs: [['ELEVATORS  →', 12, -23]] },
    { kind: 'hall', y: 0, a: [13.7, -42], b: [-1.7, -42], w: 3.4, h: 2.9, name: 'WEST WING LINK', caps: ['a', 'b'], doorsL: [6], doorsR: [9], props: [['ivPole', 5, -43.4, 0]], signs: [['← ELEVATORS  ·  EAST WING', 7, -42]] },
    { kind: 'hall', y: 0, a: [0, -42], b: [0, -66], w: 3.4, h: 2.9, name: 'EAST WING', doorsL: [-49.5, -58.4], doorsR: [-46, -55, -60.2],
      props: [['gurney', 1.2, -51, 0]], signs: [['ELEVATORS  ↑', 0, -47]] },
    { kind: 'elevatorLobby', y: 0, min: [-4, 0, -74], max: [4, 3.2, -66], carZ: [-74, -77.8], floorLabel: '4', openSide: 'front' },
    { kind: 'elevatorLobby', y: G, min: [-4, G, -86], max: [4, G + 3.2, -77.8], carZ: [-74, -77.8], floorLabel: 'G', openSide: 'back', noCar: true },
    { kind: 'hall', y: G, a: [0, -86], b: [0, -117.8], w: 3.6, h: 3.0, name: 'GROUND · CORRIDOR A', doorsL: [-101.5, -95], doorsR: [-104.5, -92, -110], props: [['crashCart', 1.2, -97, 0], ['ivPole', -1.4, -106, 0]], signs: [['CAFETERIA  →', 0, -96]] },
    { kind: 'hall', y: G, a: [-1.8, -116], b: [22, -116], w: 3.6, h: 3.0, name: 'CORRIDOR B', doorsL: [14.5], doorsR: [7], props: [['gurney', 9, -114.6, 1.57]], signs: [['CAFETERIA', 20.5, -116]] },
    { kind: 'cafeteria', y: G, min: [22, G, -128], max: [46, G + 4, -104], glassX: 22, doorZ: -116, counterX: 43.8 },
    { kind: 'ward', y: G, min: [46, G, -133], max: [62, G + 3, -110] },
    { kind: 'waiting', y: G, min: [50, G, -150], max: [66, G + 3.2, -133] },
    { kind: 'lobby', y: G, min: [48, G, -168], max: [68, G + 5.5, -150], doorX: 58, name: 'ST. MERCER MEMORIAL' },
    { kind: 'outdoor', y: G, bay: [58, -181], from: [30, -172], to: [1400, -240] },
    { kind: 'street', y: G, paths: ['bay_route', 'chase_road', 'finale_road'], overpassAt: 0.42, crossingPath: 'finale_road' }
  ]
};
window.HE = window.HE || {};
window.HE.DATA = { version: 'he-level1-st-mercer-1', level: 1, title: 'St. Mercer Memorial', beats: beats, paths: paths, waves: waves, pursuers: pursuers, lines: L, bystanders: bystanders, tuning: tuning, env: env };
})();

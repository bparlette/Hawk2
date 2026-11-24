/* Hospital Escape — greybox level data in contract v1 shapes (beats, segments, paths, waves, pursuers, lines).
   Rough on purpose: every beat exists and is jumpable before any art. Neon/Moth replace numbers and lines, not shapes.
   World: upper ward floor at y = 0 (room -> bed hall -> transfer -> elevator), ground floor at y = -12 (halls ->
   cafeteria -> ward -> waiting room -> lobby -> ambulance bay), then the road east to the rail crossing. Originals only. */
(function(){
'use strict';
var G = -12;   // ground floor
var lines = [
  ['visit_01', 'NPC:Charge Nurse', 'He is not discharged. Nobody wheels him anywhere until the doctor signs.', 3.2],
  ['visit_02', 'FRIEND', 'Then the doctor can sign it in the car park.', 2.4],
  ['visit_03', 'HERO', 'You came. You actually came.', 2.0],
  ['visit_04', 'FRIEND', 'Bed has wheels. We\'re leaving. Now.', 2.4],
  ['bed_01', 'FRIEND', 'Keep your head down and your hands up front.', 2.4],
  ['bed_02', 'HERO', 'Those aren\'t orderlies.', 1.8],
  ['bed_03', 'FRIEND', 'Clear. Moving.', 1.4],
  ['tr_01', 'FRIEND', 'Bed won\'t fit the lift. Arm round my neck.', 2.6],
  ['tr_02', 'HERO', 'Ow — ow. Okay. Okay.', 1.8],
  ['tr_03', 'FRIEND', 'Chair. Gun. Shoot anything that isn\'t me.', 2.4],
  ['el_01', 'HERO', 'Doors open on the ground floor. They\'ll be waiting.', 2.6],
  ['el_02', 'FRIEND', 'Then we say hello first.', 1.8],
  ['g_01', 'FRIEND', 'Bag on the trolley — take what\'s in it.', 2.4],
  ['g_02', 'HERO', 'Heavier. Faster. I like it.', 1.8],
  ['caf_01', 'FRIEND', 'Cafeteria. Glass all the way down. Stay low.', 2.6],
  ['caf_02', 'HERO', 'More at the counter!', 1.6],
  ['foot_01', 'FRIEND', 'Park it. I\'ll clear the ward and come back for you.', 2.6],
  ['wait_01', 'HERO', 'Waiting room. Ironic.', 1.8],
  ['ent_01', 'FRIEND', 'Front doors are right there. Hold them off while I prop the doors!', 2.8],
  ['ent_02', 'HERO', 'You want me faster? Get me legs.', 2.2],
  ['ent_03', 'FRIEND', 'Go, go, go!', 1.2],
  ['steal_01', 'FRIEND', 'Ambulance. Keys in it. Of course the keys are in it.', 2.8],
  ['steal_02', 'HERO', 'Put me in the back. I\'ll watch the doors.', 2.4],
  ['chase_01', 'FRIEND', 'Sirens. Two of them. Make them regret it.', 2.4],
  ['chase_02', 'HERO', 'No more sirens now. Black SUVs, no plates.', 2.6],
  ['chase_03', 'FRIEND', 'Let them come. Shoot!', 1.6],
  ['fin_01', 'FRIEND', 'Crossing ahead — the bells are going — hold on!', 2.6],
  ['fin_02', 'FRIEND', 'Nothing in my mirrors. Nothing at all.', 2.8]
].map(function(l){ return { id: l[0], speaker: l[1], text: l[2], dur: l[3] }; });

var paths = [
  { id: 'room_view', vehicle: 'bed', points: [[3, 0, -0.8], [3, 0, -2.4]], height: 1.6, back: 0, speed: 0, look: [{ at: 0, target: [3, 1.0, -4.0] }], events: [] },
  { id: 'bed_hall', vehicle: 'bed', points: [[3, 0, -4], [3, 0, -12], [3, 0, -32], [3, 0, -48], [7, 0, -56], [14, 0, -58]], height: 0.8, back: 0.6,
    speedKeys: [{ at: 0, speed: 1.4 }, { at: 0.42, speed: 0 }, { at: 0.48, speed: 1.6 }],
    look: [{ at: 0, target: [3, 1.2, -30] }, { at: 0.3, target: 'group:bed_w1' }, { at: 0.62, target: [14, 1.0, -58] }],
    events: [{ at: 0.04, type: 'line', line: 'bed_01' }, { at: 0.22, type: 'wave', wave: 'bed_w1' }, { at: 0.3, type: 'line', line: 'bed_02' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'transfer_view', vehicle: 'chair', points: [[14, 0, -57], [15, 0, -57.6]], height: 1.5, back: 0, speed: 0, look: [{ at: 0, target: [16, 0.6, -58.5] }], events: [] },
  { id: 'transfer_chair', vehicle: 'chair', points: [[14, 0, -58], [20, 0, -58], [26, 0, -58]], height: 1.0, back: 0.6,
    speedKeys: [{ at: 0, speed: 0 }, { at: 0.02, speed: 1.3 }], look: [{ at: 0, target: 'group:tr_w1' }, { at: 0.2, target: [30, 1, -58] }],
    events: [{ at: 1, type: 'segmentEnd' }] },
  { id: 'elevator', vehicle: 'chair', points: [[26, 0, -58], [31, 0, -58], [33, 0, -58], [33, -6, -58], [33, -12, -58], [33, -12, -62], [33, -12, -70]], height: 1.0, back: 0.6,
    speedKeys: [{ at: 0, speed: 1.3 }, { at: 0.3, speed: 1.0 }, { at: 0.66, speed: 1.3 }],
    look: [{ at: 0, target: [33, 1, -58] }, { at: 0.3, target: [33, -11, -70] }, { at: 0.72, target: 'group:el_w1' }],
    events: [{ at: 0.1, type: 'line', line: 'el_01' }, { at: 0.5, type: 'line', line: 'el_02' }, { at: 0.7, type: 'wave', wave: 'el_w1' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'g_halls', vehicle: 'chair', points: [[33, G, -70], [33, G, -95], [40, G, -102], [60, G, -102]], height: 1.0, back: 0.6,
    speedKeys: [{ at: 0, speed: 1.4 }, { at: 0.3, speed: 0 }, { at: 0.36, speed: 1.5 }],
    look: [{ at: 0, target: [33, G + 1.2, -95] }, { at: 0.2, target: 'group:g_w1' }, { at: 0.45, target: 'group:g_w2' }, { at: 0.8, target: [62, G + 1, -102] }],
    events: [{ at: 0.55, type: 'line', line: 'g_01' }, { at: 0.6, type: 'pickup', weapon: 'machine_pistol' }, { at: 0.64, type: 'line', line: 'g_02' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'g_caf', vehicle: 'chair', points: [[60, G, -102], [72, G, -104], [84, G, -102]], height: 1.0, back: 0.6,
    speedKeys: [{ at: 0, speed: 1.2 }, { at: 0.35, speed: 0 }, { at: 0.4, speed: 1.2 }, { at: 0.7, speed: 0 }, { at: 0.75, speed: 1.3 }],
    look: [{ at: 0, target: 'group:caf_w1' }, { at: 0.55, target: 'group:caf_w2' }, { at: 0.85, target: [86, G + 1, -102] }],
    events: [{ at: 0.05, type: 'line', line: 'caf_01' }, { at: 0.12, type: 'wave', wave: 'caf_w1' }, { at: 0.5, type: 'wave', wave: 'caf_w2' }, { at: 0.52, type: 'line', line: 'caf_02' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'ward_foot', vehicle: 'chair', points: [[84, G, -102], [84, G, -116], [90, G, -126]], height: 1.6, back: 2.2, speed: 0, events: [] },
  { id: 'g_wait', vehicle: 'chair', points: [[90, G, -126], [90, G, -140], [100, G, -150]], height: 1.0, back: 0.6,
    speedKeys: [{ at: 0, speed: 1.3 }, { at: 0.4, speed: 0 }, { at: 0.45, speed: 1.4 }],
    look: [{ at: 0, target: [90, G + 1.2, -140] }, { at: 0.2, target: 'group:wait_w1' }, { at: 0.7, target: [100, G + 1, -152] }],
    events: [{ at: 0.1, type: 'line', line: 'wait_01' }, { at: 0.2, type: 'wave', wave: 'wait_w1' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'lobby_hold', vehicle: 'chair', points: [[100, G, -150], [100, G, -151.5]], height: 1.0, back: 0.6, speedKeys: [{ at: 0, speed: 0 }],
    look: [{ at: 0, target: [100, G + 1.2, -166] }, { at: 0, target: 'group:ent_w1' }], events: [{ at: 0, type: 'line', line: 'ent_01' }] },
  { id: 'exit_push', vehicle: 'chair', points: [[100, G, -151.5], [100, G, -170], [100, G, -182]], height: 1.0, back: 0.6, speed: 1.8,
    look: [{ at: 0, target: [100, G + 1, -184] }], events: [{ at: 0.1, type: 'line', line: 'ent_03' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'bay_view', vehicle: 'chair', points: [[100, G, -182], [101, G, -184]], height: 1.6, back: 0, speed: 0, look: [{ at: 0, target: [100, G + 1.5, -192] }], events: [] },
  { id: 'bay_route', vehicle: 'ambulance', points: [[100, G, -188], [100, G, -205], [112, G, -218], [130, G, -222]], height: 1.4, back: 0,
    speedKeys: [{ at: 0, speed: 2.5 }, { at: 0.45, speed: 7 }], look: [{ at: 0, target: 'group:lot_w1' }], events: [{ at: 1, type: 'segmentEnd' }] },
  { id: 'chase_road', vehicle: 'ambulance', points: [[130, G, -222], [220, G, -232], [320, G, -205], [430, G, -255], [540, G, -238], [660, G, -275], [800, G, -262], [940, G, -270]], height: 1.4, back: 0, speed: 15,
    events: [{ at: 0.02, type: 'line', line: 'chase_01' }, { at: 1, type: 'segmentEnd' }] },
  { id: 'finale_road', vehicle: 'ambulance', points: [[940, G, -270], [1060, G, -262], [1180, G, -282], [1300, G, -275], [1420, G, -280]], height: 1.4, back: 0, speed: 16,
    crossingAt: 0.86, trainAt: 0.872, trainOccupies: 12,
    events: [{ at: 0.78, type: 'line', line: 'fin_01' }, { at: 1, type: 'segmentEnd' }] }
];
var W = function(id, trigger, spawns, onCleared){ var w = { id: id, trigger: trigger, spawns: spawns }; if(onCleared) w.onCleared = onCleared; return w; };
var S = function(kind, at, count, stagger, behavior){ return { kind: kind, at: at, count: count, stagger: stagger, behavior: behavior }; };
var waves = [
  W('bed_w1', { type: 'pathEvent' }, [S('gunman', [3, 0, -36], 3, 0.7, 'cover')], { type: 'resume' }),
  W('tr_w1', { type: 'segmentStart' }, [S('gunman', [24, 0, -58], 2, 0.9, 'rush')], { type: 'resume' }),
  W('el_w1', { type: 'pathEvent' }, [S('gunman', [33, G, -78], 2, 0.6, 'hold')], { type: 'line', line: 'el_02' }),
  W('g_w1', { type: 'timer', delay: 2.0 }, [S('gunman', [33, G, -92], 3, 0.8, 'cover')], { type: 'resume' }),
  W('g_w2', { type: 'afterWave', wave: 'g_w1', delay: 1.5 }, [S('staff', [58, G, -102], 2, 0.6, 'rush')]),
  W('caf_w1', { type: 'pathEvent' }, [S('gunman', [72, G, -111], 4, 0.6, 'cover')], { type: 'resume' }),
  W('caf_w2', { type: 'pathEvent' }, [S('staff', [86, G, -97], 3, 0.5, 'rush')], { type: 'resume' }),
  W('foot_w1', { type: 'segmentStart' }, [S('gunman', [84, G, -114], 3, 0.7, 'hold')], { type: 'wave', wave: 'foot_w2' }),
  W('foot_w2', { type: 'afterWave', wave: 'foot_w1', delay: 1.0 }, [S('staff', [89, G, -124], 2, 0.6, 'rush')]),
  W('wait_w1', { type: 'pathEvent' }, [S('gunman', [92, G, -146], 3, 0.7, 'cover')], { type: 'resume' }),
  W('ent_w1', { type: 'segmentStart' }, [S('staff', [100, G, -166], 4, 0.6, 'rush')], { type: 'wave', wave: 'ent_w2' }),
  W('ent_w2', { type: 'afterWave', wave: 'ent_w1', delay: 1.5 }, [S('gunman', [103, G, -165], 3, 0.7, 'cover')], { type: 'line', line: 'ent_02' }),
  W('lot_w1', { type: 'segmentStart' }, [S('gunman', [100, G, -178], 3, 0.5, 'hold')])
];
var P = function(id, trigger, spawns, onCleared){ var w = { id: id, trigger: trigger, spawns: spawns }; if(onCleared) w.onCleared = onCleared; return w; };
var pursuers = [
  P('chase_w1', { type: 'timer', delay: 2.0 }, [{ kind: 'patrol', slot: 'behind', gap: 30 }], { type: 'line', line: 'chase_03' }),
  P('chase_w2', { type: 'afterWave', wave: 'chase_w1', delay: 2.0 }, [{ kind: 'patrol', slot: 'left', gap: 28 }, { kind: 'charger', slot: 'behind', gap: 36 }], { type: 'line', line: 'chase_02' }),
  P('chase_w3', { type: 'afterWave', wave: 'chase_w2', delay: 2.5 }, [{ kind: 'suv', slot: 'behind', gap: 30 }, { kind: 'suv', slot: 'right', gap: 38 }]),
  P('fin_w1', { type: 'segmentStart' }, [{ kind: 'suv', slot: 'behind', gap: 34 }, { kind: 'suv', slot: 'left', gap: 40 }]),
  P('fin_w2', { type: 'timer', delay: 19 }, [{ kind: 'suv', slot: 'right', gap: 30 }, { kind: 'suv', slot: 'behind', gap: 36 }])
];
var seg = function(id, mode, path, waves, lines){ var s = { id: id, mode: mode, waves: waves || [], lines: lines || [] }; if(path) s.path = path; return s; };
var beats = [
  { id: 'visit', segments: [seg('visit_room', 'CUTSCENE', 'room_view', [], ['visit_01', 'visit_02', 'visit_03', 'visit_04'])] },
  { id: 'bed_push', segments: [seg('bed_hall_push', 'RAIL_CHAIR', 'bed_hall', ['bed_w1'], ['bed_01', 'bed_02'])] },
  { id: 'transfer', segments: [seg('transfer_cut', 'CUTSCENE', 'transfer_view', [], ['tr_01', 'tr_02', 'tr_03']), seg('transfer_held', 'RAIL_CHAIR', 'transfer_chair', ['tr_w1'])] },
  { id: 'elevator', segments: [seg('elevator_ride', 'RAIL_CHAIR', 'elevator', ['el_w1'], ['el_01', 'el_02'])] },
  { id: 'gauntlet', segments: [seg('gauntlet_halls', 'RAIL_CHAIR', 'g_halls', ['g_w1', 'g_w2'], ['g_01', 'g_02']),
                               seg('gauntlet_cafeteria', 'RAIL_CHAIR', 'g_caf', ['caf_w1', 'caf_w2'], ['caf_01', 'caf_02']),
                               seg('gauntlet_ward_on_foot', 'FREE_FOOT', 'ward_foot', ['foot_w1', 'foot_w2'], ['foot_01']),
                               seg('gauntlet_waiting_room', 'RAIL_CHAIR', 'g_wait', ['wait_w1'], ['wait_01'])] },
  { id: 'entrance', segments: [seg('entrance_holdout', 'HOLDOUT', 'lobby_hold', ['ent_w1', 'ent_w2'], ['ent_01', 'ent_02']), seg('entrance_exit_push', 'RAIL_CHAIR', 'exit_push', [], ['ent_03'])] },
  { id: 'steal', segments: [seg('steal_cut', 'CUTSCENE', 'bay_view', [], ['steal_01', 'steal_02']), seg('steal_staging', 'AMBULANCE', 'bay_route', ['lot_w1'])] },
  { id: 'chase', segments: [seg('chase_road', 'AMBULANCE', 'chase_road', ['chase_w1', 'chase_w2', 'chase_w3'], ['chase_01', 'chase_02', 'chase_03'])] },
  { id: 'train_finale', segments: [seg('finale_crossing', 'AMBULANCE', 'finale_road', ['fin_w1', 'fin_w2'], ['fin_01', 'fin_02'])] }
];
var tuning = {
  weapons: { pistol: { mag: 12, reloadTime: 1.2, damage: 10, rate: 6, auto: false }, machine_pistol: { mag: 30, reloadTime: 1.2, damage: 8, rate: 10, auto: true } },
  enemies: { gunman: { hp: 30, speed: 2.4, fireEvery: 1.8, accuracy: 0.28, damage: 4 }, staff: { hp: 20, speed: 2.8, fireEvery: 2.2, accuracy: 0.24, damage: 3 } },
  pursuers: { patrol: { attack: 10, close: 5, fireEvery: 1.6, accuracy: 0.22, damage: 3 }, charger: { attack: 7, close: 6, fireEvery: 1.4, accuracy: 0.25, damage: 3 }, suv: { attack: 9, close: 6, fireEvery: 1.3, accuracy: 0.28, damage: 4 } },
  components: { tire: 30, driver: 40, engine: 60 },
  cover: { exposed: 1.4, hidden: 1.0 }, ambulanceFov: 80, enemyFireDelay: 1.0, trainApproach: 1.0, footSpeed: 3.2, footHalfWidth: 3.5
};
var greybox = {
  rooms: [{ min: [0, 0, -6], max: [6, 3, 0] }, { min: [31, -12, -60], max: [35, 3, -56], walls: true }, { min: [58, G, -114], max: [86, G + 4, -92] },
          { min: [80, G, -130], max: [94, G + 3, -100] }, { min: [86, G, -156], max: [106, G + 3.5, -134] }, { min: [92, G, -172], max: [110, G + 6, -148] }],
  boxes: [{ at: [3, 0, -2], size: [1.2, 0.6, 2.2], mat: 'bed' }, { at: [66, G, -108], size: [3, 0.8, 1.2] }, { at: [74, G, -108], size: [3, 0.8, 1.2] }, { at: [80, G, -109], size: [4, 1.1, 1.0] },
          { at: [96, G, -142], size: [5, 0.5, 0.6] }, { at: [96, G, -138], size: [5, 0.5, 0.6] }, { at: [104, G, -160], size: [4, 1.2, 1.0] }],
  corridors: [{ path: 'bed_hall', width: 3.6 }, { path: 'transfer_chair', width: 3.6 }, { path: 'elevator', width: 3.0 }, { path: 'g_halls', width: 3.8 }, { path: 'ward_foot', width: 8, wallH: 3 },
              { path: 'g_wait', width: 5 }, { path: 'exit_push', width: 6, wallH: 0 }, { path: 'bay_route', width: 10, road: true }, { path: 'chase_road', width: 12, road: true }, { path: 'finale_road', width: 12, road: true }]
};
window.HE = window.HE || {};
window.HE.DATA = { version: 'he-data-greybox-1', beats: beats, paths: paths, waves: waves, pursuers: pursuers, lines: lines, tuning: tuning, greybox: greybox };
})();

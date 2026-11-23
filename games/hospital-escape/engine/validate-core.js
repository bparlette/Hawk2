/* Hospital Escape — contract v1 data validator. Pure JS, no three.js: runs in the browser (tests.html, T14) and in
   node (validate-data.mjs loads this file and data.js into a sandbox). Returns { checked, errors: [] }. */
(function(root){
'use strict';
var MODES = ['RAIL_CHAIR', 'FREE_FOOT', 'HOLDOUT', 'AMBULANCE', 'CUTSCENE'], BEATS = ['visit', 'bed_push', 'transfer', 'elevator', 'gauntlet', 'entrance', 'steal', 'chase', 'train_finale'];
var FIRST_MODE = { visit: 'CUTSCENE', bed_push: 'RAIL_CHAIR', transfer: 'CUTSCENE', elevator: 'RAIL_CHAIR', gauntlet: 'RAIL_CHAIR', entrance: 'HOLDOUT', steal: 'CUTSCENE', chase: 'AMBULANCE', train_finale: 'AMBULANCE' };
var EVT = ['line', 'wave', 'segmentEnd', 'pickup'], TRIG = ['segmentStart', 'pathEvent', 'afterWave', 'timer'], CLR = ['resume', 'line', 'wave'];
function validate(D){
  var E = [], n = 0, err = function(m){ E.push(m); }, num = function(v){ return typeof v === 'number' && isFinite(v); };
  var v3 = function(a){ return Array.isArray(a) && a.length === 3 && a.every(num); }, str = function(s){ return typeof s === 'string' && s.length > 0; };
  ['beats', 'paths', 'waves', 'pursuers', 'lines'].forEach(function(k){ if(!Array.isArray(D[k])) err('data.' + k + ' must be an array'); });
  if(E.length) return { checked: 0, errors: E };
  var ids = {}, map = function(arr, kind){ var m = {}; arr.forEach(function(o, i){ if(!str(o.id)) err(kind + '[' + i + '] has no id'); else { if(ids[o.id]) err('duplicate id ' + o.id); ids[o.id] = kind; m[o.id] = o; } }); return m; };
  var P = map(D.paths, 'path'), W = map(D.waves, 'wave'), PU = map(D.pursuers, 'pursuer'), L = map(D.lines, 'line');
  // lines
  D.lines.forEach(function(l){ n++; if(!/^(HERO|FRIEND|NPC:.+)$/.test(l.speaker || '')) err('line ' + l.id + ': bad speaker ' + l.speaker); if(!str(l.text)) err('line ' + l.id + ': empty text'); if(!(num(l.dur) && l.dur > 0)) err('line ' + l.id + ': dur must be > 0'); });
  var used = {};
  function trig(o, kind){ var t = o.trigger; if(!t || TRIG.indexOf(t.type) < 0) return err(kind + ' ' + o.id + ': bad trigger');
    if(t.type === 'afterWave'){ if(!(W[t.wave] || PU[t.wave])) err(kind + ' ' + o.id + ': afterWave unknown ' + t.wave); if(t.delay != null && !(num(t.delay) && t.delay >= 0)) err(kind + ' ' + o.id + ': bad delay'); }
    if(t.type === 'timer' && !(num(t.delay) && t.delay >= 0)) err(kind + ' ' + o.id + ': timer needs delay'); }
  function clr(o, kind){ var c = o.onCleared; if(!c) return; if(CLR.indexOf(c.type) < 0) return err(kind + ' ' + o.id + ': bad onCleared');
    if(c.type === 'line' && !L[c.line]) err(kind + ' ' + o.id + ': onCleared line unknown ' + c.line); if(c.type === 'wave' && !(W[c.wave] || PU[c.wave])) err(kind + ' ' + o.id + ': onCleared wave unknown ' + c.wave); }
  D.waves.forEach(function(w){ n++; trig(w, 'wave'); clr(w, 'wave'); if(!Array.isArray(w.spawns) || !w.spawns.length) err('wave ' + w.id + ': no spawns');
    (w.spawns || []).forEach(function(s, i){ n++; var p = 'wave ' + w.id + ' spawn ' + i + ': '; if(['gunman', 'staff'].indexOf(s.kind) < 0) err(p + 'kind ' + s.kind); if(!v3(s.at)) err(p + 'at must be [x,y,z]');
      if(!(Number.isInteger(s.count) && s.count >= 1)) err(p + 'count must be an int >= 1'); if(!(num(s.stagger) && s.stagger >= 0)) err(p + 'stagger must be >= 0'); if(['cover', 'rush', 'hold'].indexOf(s.behavior) < 0) err(p + 'behavior ' + s.behavior); }); });
  D.pursuers.forEach(function(w){ n++; trig(w, 'pursuer'); clr(w, 'pursuer'); if(!Array.isArray(w.spawns) || !w.spawns.length) err('pursuer ' + w.id + ': no spawns');
    (w.spawns || []).forEach(function(s, i){ n++; var p = 'pursuer ' + w.id + ' spawn ' + i + ': '; if(['patrol', 'charger', 'suv'].indexOf(s.kind) < 0) err(p + 'kind ' + s.kind); if(['behind', 'left', 'right'].indexOf(s.slot) < 0) err(p + 'slot ' + s.slot); if(!(num(s.gap) && s.gap > 0)) err(p + 'gap must be > 0'); }); });
  D.paths.forEach(function(p){ n++; var q = 'path ' + p.id + ': ';
    if(['bed', 'chair', 'ambulance'].indexOf(p.vehicle) < 0) err(q + 'vehicle ' + p.vehicle);
    if(!Array.isArray(p.points) || p.points.length < 2 || !p.points.every(v3)) err(q + 'points must be >= 2 [x,y,z]');
    if(!(num(p.height) && p.height > 0)) err(q + 'height must be > 0'); if(p.back != null && !(num(p.back) && p.back >= 0)) err(q + 'back must be >= 0');
    if(p.speed == null && !p.speedKeys) err(q + 'needs speed or speedKeys'); if(p.speed != null && !(num(p.speed) && p.speed >= 0)) err(q + 'speed must be >= 0');
    if(p.speedKeys){ var last = -1; p.speedKeys.forEach(function(k){ if(!(num(k.at) && k.at >= 0 && k.at <= 1 && k.at >= last)) err(q + 'speedKeys at must be sorted 0..1'); last = k.at; if(!(num(k.speed) && k.speed >= 0)) err(q + 'speedKey speed must be >= 0'); }); }
    (p.look || []).forEach(function(k){ if(!(num(k.at) && k.at >= 0 && k.at <= 1)) err(q + 'look at 0..1'); if(typeof k.target === 'string'){ var g = k.target.replace(/^group:/, ''); if(k.target.indexOf('group:') !== 0 || !(W[g] || PU[g])) err(q + 'look target ' + k.target); } else if(!v3(k.target)) err(q + 'look target must be [x,y,z] or group:<waveId>'); });
    (p.events || []).forEach(function(e){ n++; if(!(num(e.at) && e.at >= 0 && e.at <= 1)) err(q + 'event at 0..1'); if(EVT.indexOf(e.type) < 0) err(q + 'event type ' + e.type);
      if(e.type === 'line' && !L[e.line]) err(q + 'event line unknown ' + e.line); if(e.type === 'wave' && !(W[e.wave] || PU[e.wave])) err(q + 'event wave unknown ' + e.wave);
      if(e.type === 'pickup' && ['pistol', 'machine_pistol'].indexOf(e.weapon) < 0) err(q + 'pickup weapon ' + e.weapon); });
    ['side', 'lookAhead', 'lookHeight', 'lookClamp', 'bayOffset'].forEach(function(k){ if(p[k] != null && !num(p[k])) err(q + k + ' must be a number'); });   // ext: over-shoulder rig fields
    var tr = [p.crossingAt, p.trainAt, p.trainOccupies].filter(function(x){ return x != null; }).length;
    if(tr && tr < 3) err(q + 'crossingAt / trainAt / trainOccupies go together');
    if(tr === 3){ if(!(p.crossingAt > 0 && p.crossingAt < 1 && p.trainAt >= p.crossingAt && p.trainAt < 1)) err(q + 'need 0 < crossingAt <= trainAt < 1'); if(!(p.trainOccupies > 0)) err(q + 'trainOccupies must be > 0'); if(p.vehicle !== 'ambulance') err(q + 'train crossing only on ambulance paths'); } });
  // beats + segments
  var bids = D.beats.map(function(b){ return b.id; }); if(bids.join(',') !== BEATS.join(',')) err('beats must be the 9 contract beats in order: got ' + bids.join(','));
  var segIds = {};
  D.beats.forEach(function(b){ n++; if(!Array.isArray(b.segments) || !b.segments.length) return err('beat ' + b.id + ': no segments');
    if(FIRST_MODE[b.id] && b.segments[0].mode !== FIRST_MODE[b.id]) err('beat ' + b.id + ': first segment mode must be ' + FIRST_MODE[b.id]);
    b.segments.forEach(function(s){ n++; var q = 'segment ' + s.id + ': '; if(!str(s.id) || segIds[s.id]) err('segment id missing/duplicate ' + s.id); segIds[s.id] = 1;
      if(MODES.indexOf(s.mode) < 0) err(q + 'mode ' + s.mode);
      if(s.mode !== 'CUTSCENE' && !P[s.path]) err(q + 'path required, unknown ' + s.path); if(s.path && !P[s.path]) err(q + 'unknown path ' + s.path);
      var pv = P[s.path] && P[s.path].vehicle; if(s.mode === 'AMBULANCE' && pv !== 'ambulance') err(q + 'AMBULANCE needs an ambulance path'); if((s.mode === 'RAIL_CHAIR' || s.mode === 'HOLDOUT') && pv === 'ambulance') err(q + s.mode + ' cannot ride an ambulance path');
      (s.waves || []).forEach(function(id){ used[id] = 1; if(!(W[id] || PU[id])) err(q + 'unknown wave ' + id); if(PU[id] && s.mode !== 'AMBULANCE') err(q + 'pursuers only in AMBULANCE segments');
        var o = W[id] || PU[id]; if(o && o.trigger.type === 'pathEvent' && !((P[s.path] || {}).events || []).some(function(e){ return e.type === 'wave' && e.wave === id; })) err(q + 'wave ' + id + ' is pathEvent-triggered but its path has no wave event');
        if(o && o.trigger.type === 'afterWave' && (s.waves || []).indexOf(o.trigger.wave) < 0) err(q + 'wave ' + id + ' waits on ' + o.trigger.wave + ' which is not in this segment'); });
      (s.lines || []).forEach(function(id){ if(!L[id]) err(q + 'unknown line ' + id); });
      if(s.mode === 'CUTSCENE' && !(s.lines || []).length) err(q + 'a CUTSCENE carries lines'); }); });
  D.waves.concat(D.pursuers).forEach(function(w){ if(!used[w.id]) err('wave ' + w.id + ' is not used by any segment'); });
  // ext: bystanders (optional) — unarmed, segment-bound, straight-line crossers
  (D.bystanders || []).forEach(function(b){ n++; var q = 'bystander ' + b.id + ': '; if(!str(b.id)) err('bystander without id'); if(!segIds[b.segment]) err(q + 'unknown segment ' + b.segment);
    if(['nurse', 'patient', 'orderly', 'visitor'].indexOf(b.kind) < 0) err(q + 'kind ' + b.kind); if(!v3(b.from) || !v3(b.to)) err(q + 'from/to must be [x,y,z]');
    if(b.speed != null && !(num(b.speed) && b.speed > 0)) err(q + 'speed > 0'); if(b.delay != null && !(num(b.delay) && b.delay >= 0)) err(q + 'delay >= 0');
    if(b.pause != null && !(Array.isArray(b.pause) && b.pause.length === 2 && b.pause.every(num))) err(q + 'pause = [atSeconds, holdSeconds]'); });
  // chase escalation: marked kinds first, then suv (beat 8)
  var ch = D.beats.filter(function(b){ return b.id === 'chase'; })[0]; if(ch){ var kinds = []; ch.segments.forEach(function(s){ (s.waves || []).forEach(function(id){ if(PU[id]) PU[id].spawns.forEach(function(x){ kinds.push(x.kind); }); }); });
    var fs = kinds.indexOf('suv'); if(fs <= 0 || kinds.slice(0, fs).some(function(k){ return k === 'suv'; }) || kinds.slice(fs).some(function(k){ return k !== 'suv'; })) err('chase must escalate marked (patrol/charger) -> suv: ' + kinds.join(',')); }
  var fin = D.beats.filter(function(b){ return b.id === 'train_finale'; })[0]; if(fin && !fin.segments.some(function(s){ return P[s.path] && P[s.path].crossingAt != null; })) err('train_finale needs a path with crossingAt');
  // tuning (frozen field names; numbers tunable)
  var T = D.tuning || {}; ['pistol', 'machine_pistol'].forEach(function(w){ var x = (T.weapons || {})[w]; if(!x || !num(x.mag) || !num(x.reloadTime) || !num(x.damage)) err('tuning.weapons.' + w + ' needs mag/reloadTime/damage'); });
  ['tire', 'driver', 'engine'].forEach(function(c){ if(!num((T.components || {})[c])) err('tuning.components.' + c + ' missing'); });
  ['shotSpeed', 'aimTell', 'closeRange', 'healOnBeat', 'screenFire', 'footTurn', 'firstShot', 'holdRelease'].forEach(function(k){ if(T[k] != null && !(num(T[k]) && T[k] > 0)) err('tuning.' + k + ' must be > 0'); });   // ext fields
  if(T.fairness != null){ var F = T.fairness; if(typeof F !== 'object') err('tuning.fairness must be an object');
    else { ['telegraph', 'minPx'].forEach(function(k){ if(!(num(F[k]) && F[k] >= 0)) err('tuning.fairness.' + k + ' must be >= 0'); });
      if(F.margin != null && !(num(F.margin) && F.margin >= 0 && F.margin < 0.5)) err('tuning.fairness.margin must be in [0, 0.5)');
      if(F.outGate != null && !(num(F.outGate) && F.outGate > 0 && F.outGate <= 1)) err('tuning.fairness.outGate must be in (0, 1]'); } }   // ext: consciousness gate
  return { checked: n, errors: E };
}
root.HE = root.HE || {}; root.HE.validateData = validate;
})(typeof window !== 'undefined' ? window : globalThis);

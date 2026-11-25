/* Hospital Escape engine — core: namespace, constants, seeded RNG, the one input abstraction.
   Classic script. three.js r128 (global THREE) must load first from the pinned CDN. Contract: tasking/ENGINE-CONTRACT.md v1. */
(function(){
'use strict';
var HE = window.HE = window.HE || {};
HE.VERSION = 'he-engine-1';
HE.MODES = ['RAIL_CHAIR', 'FREE_FOOT', 'HOLDOUT', 'AMBULANCE', 'CUTSCENE'];
HE.BEAT_IDS = ['visit', 'bed_push', 'transfer', 'elevator', 'gauntlet', 'entrance', 'steal', 'chase', 'train_finale'];
HE.VEHICLES = ['bed', 'chair', 'ambulance'];
HE.PUSHER_GAP = 0.55;          // m, friend behind the rider along the path
HE.clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
HE.lerp = function(a, b, t){ return a + (b - a) * t; };
HE.rng = function(seed){ var a = (seed >>> 0) || 1; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
// the ONE input abstraction: real input (touch / mouse / keyboard / gptouch joystick) and __dbg injection both write here.
// There is deliberately no mode/character/switch verb.
HE.makeInput = function(){ return { aim: { x: 0.5, y: 0.5 }, fire: false, reload: false, move: { x: 0, y: 0 } }; };
HE.input = HE.makeInput();
})();

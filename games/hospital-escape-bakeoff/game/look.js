/* Hospital Escape — LOOK BAKE-OFF layer (sample page only; not in the shipped game).
   ?look= selects a visual treatment over the SAME build:
     (none)  baseline T4          ps1   PS1 survival-horror
     snes    16-bit + real sprite cast (game/spritecast.js)
     n64     N64 / GoldenEye      web   hyper-casual phone-web
     cel     cel-shaded anime
   Techniques: renderer pixel-ratio scaling (internal resolution), rAF time
   quantization (stepped animation), post-composite grading (game/post.js reads
   HELOOK.post), PS1 vertex snapping via onBeforeCompile, fog/light enforcement. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var name = (Q.get('look') || 't4').toLowerCase();
var MODES = {
  t4:   { post: 0, pr: 0,    stepHz: 0,  fogMul: 1.0,  fogCol: null,     lightMul: 1.0,  bg: null,     snap: false },
  ps1:  { post: 1, pr: 0.40, stepHz: 15, fogMul: 1.9,  fogCol: 0x0a0d12, lightMul: 0.72, bg: null,     snap: true },
  snes: { post: 2, pr: 0.36, stepHz: 12, fogMul: 1.25, fogCol: null,     lightMul: 1.05, bg: null,     snap: false },
  n64:  { post: 3, pr: 0.75, stepHz: 0,  fogMul: 2.3,  fogCol: 0x35302a, lightMul: 1.12, bg: null,     snap: false },
  web:  { post: 4, pr: 1.35, stepHz: 0,  fogMul: 0.25, fogCol: 0xbfe3ff, lightMul: 1.35, bg: 0x9fd4ff, snap: false },
  cel:  { post: 5, pr: 1.15, stepHz: 0,  fogMul: 0.40, fogCol: 0xcfe4ef, lightMul: 1.32, bg: 0xa8c8dd, snap: false }
};
var M = MODES[name] || MODES.t4;
window.HELOOK = { name: name, post: M.post, mode: M };

/* BAKE-OFF PACKAGING: this sample folder carries text files only (the GitHub
   connector corrupts binaries). The heavy binary assets (cast GLBs, painted
   sheets, T4 maps/props) already live as verified blobs in the shipped game
   folder, so every THREE loader URL under those prefixes is redirected to the
   sibling folder — same bytes, same build. The SNES sprite sheets are new and
   small, so they ride inside game/sprites-data.js as data URIs instead. */
if(THREE.DefaultLoadingManager) THREE.DefaultLoadingManager.setURLModifier(function(u){
  var i = u.indexOf('assets/'); if(i < 0) return u;
  var p = u.slice(i); if(/^(assets\/(cast|painted|t4)\/)/.test(p)) return '../hospital-escape/' + p; return u; });

if(name === 't4') return;

/* ---- internal resolution: wrap setPixelRatio before main.js builds the renderer */
if(M.pr){ var proto = THREE.WebGLRenderer.prototype, orig = proto.setPixelRatio;
  proto.setPixelRatio = function(){ return orig.call(this, M.pr); }; }

/* ---- stepped animation: quantize the rAF clock the game loop reads */
if(M.stepHz){ var raf = window.requestAnimationFrame.bind(window), q = 1000 / M.stepHz;
  window.requestAnimationFrame = function(cb){ return raf(function(t){ cb(Math.floor(t / q) * q); }); }; }

/* ---- chunky upscale for the pixel looks */
document.addEventListener('DOMContentLoaded', function(){ document.body.classList.add('look-' + name); });

/* ---- PS1 vertex snapping, applied to materials as they appear */
function snapMat(m){ if(!m || m.__lookSnap || typeof m.onBeforeCompile !== 'function') return; m.__lookSnap = true;
  var prev = m.onBeforeCompile;
  m.onBeforeCompile = function(sh, r){ if(prev) prev.call(this, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n{ vec4 lp = gl_Position; lp.xyz /= lp.w; lp.xy = floor(lp.xy * vec2(140.0, 300.0)) / vec2(140.0, 300.0); lp.xyz *= lp.w; gl_Position = lp; }'); };
  m.customProgramCacheKey = function(){ return 'looksnap1'; }; m.needsUpdate = true; }

/* ---- scene enforcement: fog, key lights, background, material snap */
setInterval(function(){ var g = window.__game; if(!g || !g.game || !g.game.scene) return; var sc = g.game.scene;
  if(sc.fog && sc.fog.isFogExp2){ if(M.fogCol != null) sc.fog.color.setHex(M.fogCol); sc.fog.density = 0.020 * M.fogMul; }
  else if(sc.fog && M.fogCol != null) sc.fog.color.setHex(M.fogCol);
  if(M.bg != null && sc.background && sc.background.isColor) sc.background.setHex(M.bg);
  sc.traverse(function(o){
    if(o.isLight && (o.isHemisphereLight || o.isAmbientLight || o.isDirectionalLight)){
      if(o.userData.__lb === undefined) o.userData.__lb = o.intensity; o.intensity = o.userData.__lb * M.lightMul; }
    if(M.snap && o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(snapMat); }
  });
}, 700);
})();

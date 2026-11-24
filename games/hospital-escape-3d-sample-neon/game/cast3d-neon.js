/* Hospital Escape — NEON 3D SHOOTER-ASSET BAKE-OFF (?fig=<mode>)
   Five distinct candidate pipelines for the single plain-clothes gunman role:
     1. valid-ual   (default) : MIT Photoreal VALID White_M_3_Casual (decimated, rust bomber reskin + beanie + rig + pistol) x CC0 UAL 46-Clip Library
     2. valid-mocap           : MIT Photoreal VALID White_M_1_Util (reskinned) x Mixamo/Soldier Mocap Walk/Run/Idle (local test only) + UAL Gun/Hit/Death
     3. ai3d-remesh           : AI Image-to-3D (Sample B Hunyuan3D) re-posed to T-pose + decimated 50.9k->6.1k + de-lighted vertex colors + UAL 53-bone re-rig
     4. sculpt-c              : Entry C CC0 Quaternius Casual2 overhauled in Blender (0.78x adult head ratio, broadened chest, sleeves, beanie, rig, sculpted pistol, metalness 0)
     5. ual-dressed           : CC0 UAL 1.80 m native Rigify skeleton + normal-inflated jacket/trousers/boots/beanie/rig (zero retarget loss)
   Shared tech: Opus's 87-lamp corridor directional relighting via MeshStandardMaterial.onBeforeCompile,
   gunshot muzzle warm light spill, ground contact shadow, and foot-contact adjudicated pacing.
   Live game untouched (?cast3d=0 falls back to painted billboards). */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var ON = Q.get('cast3d') === '1' || (Q.get('cast3d') === null && !!window.__CAST3D_SAMPLE);
if(!ON) return;

var FIG = Q.get('fig') || 'valid-ual';
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, gb = G.greybox;
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

var UAL_MAP = {
  Walk: 'Walk_Loop', Run: 'Jog_Fwd_Loop', Sprint: 'Sprint_Loop',
  Idle_Neutral: 'Pistol_Idle_Loop', Idle_Gun: 'Crouch_Idle_Loop',
  Idle_Gun_Pointing: 'Pistol_Aim_Neutral', Gun_Shoot: 'Pistol_Shoot',
  HitRecieve: 'Hit_Chest', Death: 'Death01'
};
var MOCAP_MAP = {
  Walk: 'Walk_Loop', Run: 'Jog_Fwd_Loop',
  Idle_Neutral: 'Idle_Neutral', Idle_Gun: 'Pistol_Idle_Loop',
  Idle_Gun_Pointing: 'Pistol_Aim_Neutral', Gun_Shoot: 'Pistol_Shoot',
  HitRecieve: 'Hit_Chest', Death: 'Death01'
};
var C_MAP = {
  Walk: 'Walk', Run: 'Run',
  Idle_Neutral: 'Idle_Neutral', Idle_Gun: 'Idle_Gun',
  Idle_Gun_Pointing: 'Idle_Gun_Pointing', Gun_Shoot: 'Gun_Shoot',
  HitRecieve: 'HitRecieve', Death: 'Death'
};

// Walk / run speeds filled by contact-probe measurement (stance-phase ankle velocity)
var MODES = {
  'valid-ual':   { url: 'assets/gunmen/valid-ual.glb',   clipMap: UAL_MAP,   walk: 1.094, run: 5.449, targetH: 1.80, fixedH: 179.34, z0: -100.8 },
  'valid-mocap': { url: 'assets/gunmen/valid-mocap.glb', clipMap: MOCAP_MAP, walk: 1.688, run: 4.200, targetH: 1.80, fixedH: 178.68, z0: -99.1 },
  'ai3d-remesh': { url: 'assets/gunmen/ai3d-remesh.glb', clipMap: UAL_MAP,   walk: 1.093, run: 5.231, targetH: 1.80, fixedH: 1.7605, z0: -0.005 },
  'sculpt-c':    { url: 'assets/gunmen/sculpt-c.glb',    clipMap: C_MAP,     walk: 1.344, run: 3.080, targetH: 1.80, fixedH: 1.782,  z0: -0.048 },
  'ual-dressed': { url: 'assets/gunmen/ual-dressed.glb', clipMap: UAL_MAP,   walk: 1.059, run: 5.069, targetH: 1.80, fixedH: 1.8168, z0: -0.014 }
};
var MODE = MODES[FIG] || MODES['valid-ual'];

// ------------------------------------------------------------------ CDN loader (three r128 pinned)
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){}; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}

var asset = { ready: false, scene: null, clips: {}, height: 1.80, meshInfo: { tris: 0, mats: 0 } };
var waiters = [];

function normalizeClipNames(clips){
  var out = {};
  clips.forEach(function(c){
    var clean = c.name.replace(/\.\d+$/, '');
    if(!out[clean]) out[clean] = c;
    out[c.name] = c;
  });
  return out;
}

withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  new THREE.GLTFLoader().load(MODE.url, function(gltf){
    asset.scene = gltf.scene;
    asset.clips = normalizeClipNames(gltf.animations || []);
    var tris = 0, mats = 0;
    asset.scene.traverse(function(o){
      if(o.isMesh){
        o.castShadow = true; o.frustumCulled = false;
        if(o.geometry && o.geometry.index) tris += Math.round(o.geometry.index.count / 3);
        else if(o.geometry && o.geometry.attributes && o.geometry.attributes.position) tris += Math.round(o.geometry.attributes.position.count / 3);
        var ms = Array.isArray(o.material) ? o.material : [o.material];
        mats += ms.length;
        ms.forEach(function(m){
          if(m && m.map) m.map.encoding = THREE.sRGBEncoding;
        });
      }
    });
    asset.scene.updateMatrixWorld(true);
    asset.height = MODE.fixedH || Math.max(0.5, new THREE.Box3().setFromObject(asset.scene).getSize(new THREE.Vector3()).y);
    asset.yMin = MODE.z0 != null ? MODE.z0 : new THREE.Box3().setFromObject(asset.scene).min.y;
    asset.meshInfo = { tris: tris, mats: mats };
    asset.ready = true;
    window.__cast3d = api; window.__cast3dNeon = api;
    waiters.splice(0).forEach(function(w){ attach(w.p, w.role, w.kind); });
  }, undefined, function(err){ console.error('cast3d-neon load error', err); });
});

// ------------------------------------------------------------------ Corridor lamp relighting shader (per-instance uniforms)
var _vL = new THREE.Vector3(), _vN = new THREE.Vector3();
function createLampUniforms(){
  return {
    uL1Dir: { value: new THREE.Vector3(0.2, 0.85, 0.45).normalize() },
    uL1Col: { value: new THREE.Color(0.85, 0.90, 0.84) },
    uL2Dir: { value: new THREE.Vector3(-0.3, 0.7, -0.5).normalize() },
    uL2Col: { value: new THREE.Color(0.25, 0.30, 0.34) },
    uMuzzleCol: { value: new THREE.Color(0, 0, 0) },
    uRimCol: { value: new THREE.Color(0.58, 0.72, 0.76) },
    uFloorY: { value: 0.0 }
  };
}

function injectLampShader(mat, u){
  mat.onBeforeCompile = function(shader){
    Object.keys(u).forEach(function(k){ shader.uniforms[k] = u[k]; });
    shader.vertexShader = 'varying vec3 vNWorldPos;\nvarying vec3 vNWorldNorm;\nvarying vec3 vNViewDir;\n' + shader.vertexShader
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 neonWp = modelMatrix * vec4(transformed, 1.0);\nvNWorldPos = neonWp.xyz;\nvNWorldNorm = normalize(mat3(modelMatrix) * objectNormal);\nvNViewDir = normalize(cameraPosition - neonWp.xyz);');
    shader.fragmentShader = 'uniform vec3 uL1Dir, uL1Col, uL2Dir, uL2Col, uMuzzleCol, uRimCol;\nuniform float uFloorY;\nvarying vec3 vNWorldPos, vNWorldNorm, vNViewDir;\n' + shader.fragmentShader
      .replace('#include <opaque_fragment>',
        'vec3 nn = normalize(vNWorldNorm);\n' +
        'float d1 = clamp(dot(nn, uL1Dir) * 0.55 + 0.45, 0.0, 1.0);\n' +
        'float d2 = clamp(dot(nn, uL2Dir) * 0.55 + 0.45, 0.0, 1.0);\n' +
        'float hm = max(0.0, vNWorldPos.y - uFloorY);\n' +
        'float gndAO = 1.0 - 0.38 * exp(-hm / 0.16);\n' +
        'float rim = pow(clamp(1.0 - max(0.0, dot(nn, normalize(vNViewDir))), 0.0, 1.0), 2.4) * clamp(nn.y * 0.5 + 0.5, 0.0, 1.0);\n' +
        'outgoingLight = outgoingLight * mix(0.75, 1.15, d1) * gndAO + diffuseColor.rgb * (uL1Col * d1 * 1.05 + uL2Col * d2 * 0.55 + uMuzzleCol) * gndAO + uRimCol * rim * 0.34;\n' +
        '#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = function(){ return 'neon-lamp-v2'; };
}

function updateInstanceLights(inst){
  var u = inst.lightU, p = inst.p.position;
  u.uFloorY.value = p.y;
  var lights = (window.HEPAINT && window.HEPAINT.lights) || [];
  var k1 = 0, L1 = null, k2 = 0, L2 = null;
  for(var i = 0; i < lights.length; i++){
    var L = lights[i], ey = L.y - p.y;
    if(ey < 0 || ey > 5.0) continue;
    var ex = L.x - p.x, ez = L.z - p.z, d2 = ex * ex + ez * ez;
    if(d2 > 81) continue;
    var k = 1 / (1 + d2 / 3.8);
    if(k > k1){ k2 = k1; L2 = L1; k1 = k; L1 = L; }
    else if(k > k2){ k2 = k; L2 = L; }
  }
  if(L1){
    _vL.set(L1.x - p.x, L1.y - (p.y + 1.25), L1.z - p.z).normalize();
    u.uL1Dir.value.copy(_vL);
    var c1 = 0.42 + 0.58 * Math.min(1.0, k1);
    u.uL1Col.value.setRGB(c1 * 0.96, c1 * 1.0, c1 * 0.94);
  } else {
    u.uL1Dir.value.set(0.2, 0.85, 0.45).normalize();
    u.uL1Col.value.setRGB(0.42, 0.46, 0.48);
  }
  if(L2){
    _vL.set(L2.x - p.x, L2.y - (p.y + 1.25), L2.z - p.z).normalize();
    u.uL2Dir.value.copy(_vL);
    var c2 = 0.18 + 0.36 * Math.min(1.0, k2);
    u.uL2Col.value.setRGB(c2 * 0.90, c2 * 0.96, c2 * 1.0);
  } else {
    u.uL2Dir.value.set(-0.3, 0.7, -0.5).normalize();
    u.uL2Col.value.setRGB(0.16, 0.20, 0.22);
  }
  var fl = clamp(inst.fireT / 0.12, 0, 1);
  u.uMuzzleCol.value.setRGB(fl * 1.25, fl * 0.65, fl * 0.22);
}

// ------------------------------------------------------------------ Shadows & Wet Floor Sheen
function makeShadowTex(inner, mid){
  var c = document.createElement('canvas'); c.width = 64; c.height = 64;
  var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.55, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
var _shTex = null, _reflTex = null;

function addFloorGrounding(wrap){
  if(!_shTex) _shTex = makeShadowTex('rgba(0,0,0,0.72)', 'rgba(0,0,0,0.34)');
  if(!_reflTex) _reflTex = makeShadowTex('rgba(16,22,26,0.32)', 'rgba(14,20,24,0.12)');
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.68),
    new THREE.MeshBasicMaterial({ map: _shTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.010; sh.renderOrder = 1; sh.raycast = function(){}; wrap.add(sh);
  var rf = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.45),
    new THREE.MeshBasicMaterial({ map: _reflTex, transparent: true, depthWrite: false, fog: true }));
  rf.rotation.x = -Math.PI / 2; rf.position.set(0, 0.006, 0.55); rf.renderOrder = 1; rf.raycast = function(){}; wrap.add(rf);
}

// ------------------------------------------------------------------ Actor Hooks & Build
var insts = {};
var _addActor = gb.addActor;
gb.addActor = function(role, kind){
  var p = _addActor.apply(this, arguments);
  if(kind === 'gunman' || kind === 'staff'){
    if(asset.ready) attach(p, role, kind);
    else waiters.push({ p: p, role: role, kind: kind });
  }
  return p;
};
var _removeActor = gb.removeActor;
gb.removeActor = function(role){
  var it = insts[role]; if(it && it.mixer) it.mixer.stopAllAction();
  delete insts[role];
  for(var i = waiters.length - 1; i >= 0; i--) if(waiters[i].role === role) waiters.splice(i, 1);
  return _removeActor.apply(this, arguments);
};

function cloneFigureWithMaterials(lightU){
  var fig = THREE.SkeletonUtils.clone(asset.scene);
  fig.traverse(function(o){
    if(o.isMesh){
      o.castShadow = true; o.frustumCulled = false;
      var cloneMat = function(m){
        var c = m.clone();
        if(c.map) c.map.encoding = THREE.sRGBEncoding;
        if(c.name !== 'PistolMat' && !/Gun/i.test(c.name)){ c.metalness = 0.0; }
        injectLampShader(c, lightU);
        return c;
      };
      if(Array.isArray(o.material)) o.material = o.material.map(cloneMat);
      else if(o.material) o.material = cloneMat(o.material);
    }
  });
  return fig;
}

function attach(p, role, kind){
  if(!p.parent) return;
  var lightU = createLampUniforms();
  var wrap = new THREE.Group(); wrap.name = 'cast3dNeon';
  var fig = cloneFigureWithMaterials(lightU);
  var sc = MODE.targetH / asset.height;
  fig.scale.setScalar(sc);
  fig.position.y = -(MODE.z0 != null ? MODE.z0 : (asset.yMin || 0)) * sc;
  wrap.add(fig);
  addFloorGrounding(wrap);

  p.add(wrap);
  p.children.forEach(function(c){ if(c !== wrap) c.traverse(function(o){ o.layers.set(31); }); });
  p.userData.pk = null; p.userData.painted = false;

  var mixer = new THREE.AnimationMixer(fig), actions = {};
  Object.keys(asset.clips).forEach(function(n){ actions[n] = mixer.clipAction(asset.clips[n]); });
  var inst = {
    role: role, kind: kind, p: p, wrap: wrap, fig: fig,
    mixer: mixer, actions: actions, lightU: lightU,
    cur: null, lastPos: p.position.clone(), logIdx: G._log.length,
    fireT: 0, flinchT: 0, dead: false, paceN: 0
  };
  insts[role] = inst;
  play(inst, 'Idle_Neutral', 0);
}

function play(inst, canon, fade){
  var name = MODE.clipMap[canon] || MODE.clipMap.Idle_Neutral;
  if(!name || inst.cur === canon) return;
  var a = inst.actions[name]; if(!a) return;
  var prevName = inst.cur ? MODE.clipMap[inst.cur] : null;
  var prev = prevName ? inst.actions[prevName] : null;
  a.reset(); a.enabled = true;
  if(canon === 'Death' || canon === 'Gun_Shoot' || canon === 'HitRecieve'){
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
  } else {
    a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false;
  }
  a.play();
  if(prev && prev !== a) a.crossFadeFrom(prev, fade == null ? 0.14 : fade, false);
  inst.cur = canon; inst.wrap.userData.clip = canon;
}

// ------------------------------------------------------------------ Driver Loop
window.__NEONPACE = [];
var last = performance.now();
function stepAll(dt){
  if(dt <= 0) return;
  var L = G._log;
  Object.keys(insts).forEach(function(role){
    var inst = insts[role]; if(!inst) return;
    var p = inst.p, e = G.combat.byRole(inst.role);
    for(; inst.logIdx < L.length; inst.logIdx++){
      var ev = L[inst.logIdx];
      if(ev.data && ev.data.role === inst.role){
        if(ev.type === 'enemyShot') inst.fireT = 0.34;
        else if(ev.type === 'hit' && ev.data.hp > 0) inst.flinchT = 0.28;
      }
    }
    inst.fireT = Math.max(0, inst.fireT - dt);
    inst.flinchT = Math.max(0, inst.flinchT - dt);
    var distDelta = Math.hypot(p.position.x - inst.lastPos.x, p.position.z - inst.lastPos.z);
    var sp0 = distDelta / dt;
    inst.lastPos.copy(p.position);
    inst.smoothSp = inst.smoothSp == null ? sp0 : inst.smoothSp + (sp0 - inst.smoothSp) * Math.min(1, dt * 8);
    var sp = inst.smoothSp;

    if(p.userData.dead || (e && !e.alive)) inst.dead = true;
    var aiming = !!(e && (e.aiming > 0 || e.exposed));
    var cover = !!(e && e.behavior === 'cover');

    if(inst.dead){ play(inst, 'Death', 0.10); }
    else if(inst.flinchT > 0){ play(inst, 'HitRecieve', 0.05); }
    else if(inst.fireT > 0){ play(inst, 'Gun_Shoot', 0.05); }
    else if(sp > 0.25){
      var run = sp > MODE.walk + (MODE.run - MODE.walk) * 0.68;
      play(inst, run ? 'Run' : 'Walk', 0.16);
      var refSp = run ? MODE.run : MODE.walk;
      var ts = clamp(sp / refSp, 0.5, 2.5);
      var nm = MODE.clipMap[inst.cur];
      if(nm && inst.actions[nm]) inst.actions[nm].timeScale = ts;
      if(window.__NEONPACE.length < 6000 && (inst.paceN++ % 5) === 0){
        window.__NEONPACE.push({ fig: FIG, sp: +sp.toFixed(3), clip: inst.cur, ts: +ts.toFixed(3) });
      }
    }
    else if(aiming){ play(inst, 'Idle_Gun_Pointing', 0.15); }
    else if(cover){ play(inst, 'Idle_Gun', 0.18); }
    else { play(inst, 'Idle_Neutral', 0.18); }

    inst.mixer.update(dt);
    updateInstanceLights(inst);
  });
}
function tick(now){
  requestAnimationFrame(tick);
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if(window.__C3FREEZE || dt <= 0) return;
  stepAll(dt);
}
requestAnimationFrame(tick);

// Compact live phone switcher pill bar (only on sample page)
if(typeof document !== 'undefined' && document.body && !Q.get('noswitch')){
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top));right:8px;z-index:1300;display:flex;flex-wrap:wrap;gap:4px;max-width:260px;justify-content:flex-end;pointer-events:auto;';
  [['valid-ual','1:VALID+UAL'],['valid-mocap','2:Mocap'],['ai3d-remesh','3:AI3D'],['sculpt-c','4:SculptC'],['ual-dressed','5:UALDress'],['0','Painted']].forEach(function(item){
    var b = document.createElement('a');
    var active = (item[0] === '0' && !ON) || (item[0] === FIG && ON);
    b.textContent = item[1];
    b.href = item[0] === '0' ? '?cast3d=0&beat=gauntlet' : ('?fig=' + item[0] + '&beat=gauntlet');
    b.style.cssText = 'font:700 10px/1 Arial;padding:5px 7px;border-radius:10px;text-decoration:none;border:1px solid rgba(255,255,255,.35);' +
      (active ? 'background:#e2493e;color:#fff;' : 'background:rgba(12,16,22,.72);color:#d8e2e8;');
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
}

var api = { mode: FIG, model: asset, insts: insts, modes: MODES, step: stepAll };
window.__cast3d = api; window.__cast3dNeon = api;
})();

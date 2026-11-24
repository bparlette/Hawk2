/* Judging Rig & Fixed Camera Harness for WEST WING B Hallway Bake-Off */
(function(){
  var q = window.__HALLWAY_QUERY;
  var D = window.HW_DATA;
  var canvas = document.getElementById('c');
  var metaEl = document.getElementById('meta');

  var TAKES = {
    1: { id: 1, name: 'Take 1 · CC0 PBR',       builder: window.BUILD_TAKE_1 },
    2: { id: 2, name: 'Take 2 · Cycles Baked',  builder: window.BUILD_TAKE_2 },
    3: { id: 3, name: 'Take 3 · Painted Push',  builder: window.BUILD_TAKE_3 },
    4: { id: 4, name: 'Take 4 · Kit-Bash+Area', builder: window.BUILD_TAKE_4 },
    5: { id: 5, name: 'Take 5 · Cinema Mirror', builder: window.BUILD_TAKE_5 },
    6: { id: 6, name: 'Take 6 · Combine',       builder: window.BUILD_TAKE_6 }
  };

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
  renderer.setSize(390, 844, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.info.autoReset = false;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070a);
  var camera = new THREE.PerspectiveCamera(60, 390 / 844, 0.05, 1500);

  // Detect float/half-float render target support cleanly (no black frame on software GPUs)
  var gl = renderer.getContext();
  var hasHalfFloat = !!(gl && (
    gl.getExtension('EXT_color_buffer_half_float') ||
    gl.getExtension('EXT_color_buffer_float') ||
    (renderer.capabilities.isWebGL2 && gl.getExtension('EXT_color_buffer_float'))
  ));

  var activeVP = q.vp || 'vp1';
  var dollyTime = (q.time !== null && !isNaN(q.time)) ? q.time : 0;
  var paused = (q.time !== null && !isNaN(q.time));
  var activeTakeCtrl = null;
  var frameStats = { calls: 0, triangles: 0, textures: 0, programs: 0, jsHeapMB: null, flags: [] };

  function applyCamera(vp, tSec){
    if(vp === 'dolly'){
      var u = Math.max(0, Math.min(1, tSec / D.DOLLY.duration));
      // Linear centerline push along x=12.0 from entrance z=-16.8 toward far end z=-40.8
      var z = D.DOLLY.zStart + (D.DOLLY.zEnd - D.DOLLY.zStart) * u;
      camera.position.set(12.0, D.DOLLY.eyeY, z);
      camera.lookAt(12.0, D.DOLLY.lookY, z + D.DOLLY.lookOffsetZ);
    } else {
      var spec = D.VIEWPOINTS[vp] || D.VIEWPOINTS.vp1;
      camera.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      camera.lookAt(spec.look[0], spec.look[1], spec.look[2]);
    }
    camera.updateMatrixWorld(true);
  }

  function renderAndStats(tSec){
    applyCamera(activeVP, tSec);
    renderer.info.reset();
    if(activeTakeCtrl && activeTakeCtrl.render){
      activeTakeCtrl.render(renderer, scene, camera, tSec, activeVP);
    } else {
      renderer.render(scene, camera);
    }
    frameStats.calls = renderer.info.render.calls;
    frameStats.triangles = renderer.info.render.triangles;
    frameStats.textures = renderer.info.memory.textures;
    frameStats.programs = (renderer.info.programs && renderer.info.programs.length) || 0;
    if(performance && performance.memory){
      frameStats.jsHeapMB = +(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    }
    return frameStats;
  }

  function updateHUD(){
    if(q.clean) return;
    metaEl.textContent = TAKES[q.take].name + ' · ' + activeVP.toUpperCase() +
      ' | calls ' + frameStats.calls + ' | tris ' + frameStats.triangles +
      ' | tex ' + frameStats.textures + ' | prog ' + frameStats.programs +
      (frameStats.flags.length ? ' | [' + frameStats.flags.join(', ') + ']' : ' | core only');
  }

  function setupHUD(){
    if(q.clean) return;
    var tr = document.getElementById('take-row');
    Object.keys(TAKES).forEach(function(k){
      var b = document.createElement('button');
      b.className = 'pill' + (parseInt(k, 10) === q.take ? ' active' : '');
      b.textContent = 'T' + k;
      b.onclick = function(){
        var np = new URLSearchParams(location.search);
        np.set('take', k);
        location.search = np.toString();
      };
      tr.appendChild(b);
    });
    var vr = document.getElementById('vp-row');
    ['vp1', 'vp2', 'vp3', 'dolly'].forEach(function(v){
      var b = document.createElement('button');
      b.className = 'pill' + (v === activeVP ? ' active' : '');
      b.textContent = v.toUpperCase();
      b.onclick = function(){
        activeVP = v;
        Array.prototype.forEach.call(vr.children, function(ch){ ch.classList.remove('active'); });
        b.classList.add('active');
        if(v === 'dolly'){ dollyTime = 0; paused = false; }
        renderAndStats(dollyTime);
        updateHUD();
      };
      vr.appendChild(b);
    });
  }

  setupHUD();

  var ctx = {
    renderer: renderer,
    scene: scene,
    camera: camera,
    hasHalfFloat: hasHalfFloat,
    data: D
  };

  var spec = TAKES[q.take] || TAKES[1];
  Promise.resolve(spec.builder(ctx)).then(function(ctrl){
    activeTakeCtrl = ctrl || {};
    frameStats.flags = activeTakeCtrl.flags || [];
    return D.waitAssets();
  }).then(function(){
    // Warmup 2 frames so shader compilation & PMREM settle before capture
    renderAndStats(dollyTime);
    renderAndStats(dollyTime);
    updateHUD();

    window.__hallwayRig = {
      ready: true,
      take: q.take,
      takeName: spec.name,
      setView: function(vp, tSec){
        activeVP = vp || 'vp1';
        if(typeof tSec === 'number') dollyTime = tSec;
        paused = true;
        var s = renderAndStats(dollyTime);
        updateHUD();
        return Object.assign({ vp: activeVP, t: dollyTime }, s);
      },
      stepTime: function(tSec){
        dollyTime = tSec;
        paused = true;
        var s = renderAndStats(dollyTime);
        updateHUD();
        return Object.assign({ vp: activeVP, t: dollyTime }, s);
      },
      getStats: function(){ return Object.assign({ vp: activeVP, t: dollyTime }, frameStats); }
    };

    var lastNow = performance.now();
    function tick(now){
      requestAnimationFrame(tick);
      if(paused) return;
      var dt = Math.min(0.05, (now - lastNow) * 0.001);
      lastNow = now;
      if(activeVP === 'dolly'){
        dollyTime = (dollyTime + dt) % D.DOLLY.duration;
        renderAndStats(dollyTime);
      } else {
        // Gentle idle pass (e.g. subtle tube flicker when running live, paused when deterministic)
        renderAndStats(now * 0.001);
      }
      updateHUD();
    }
    if(!paused) requestAnimationFrame(tick);
  }).catch(function(err){
    console.error('Hallway build error:', err);
    if(!q.clean) metaEl.textContent = 'ERROR: ' + err.message;
  });
})();

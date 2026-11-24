/* Exact Stage 1 WEST WING B hallway footprint & shared builders for Hospital Escape World Bake-Off */
(function(){
  var V3 = THREE.Vector3;

  var CORRIDOR = {
    name: 'WEST WING B',
    xCenter: 12.0,
    width: 3.4,
    xMin: 10.3,
    xMax: 13.7,
    height: 2.9,
    zStart: -16.0,
    zEnd: -43.7,
    zMinCap: -14.3,
    length: 27.7,
    leftSolidZ1: -17.7,
    leftSolidZ2: -40.3,
    rightSolidZ1: -14.3,
    rightSolidZ2: -43.7
  };

  var DOORS = [
    { x: 10.3, z: -24.5, inwardX:  1, label: '413' },
    { x: 10.3, z: -31.5, inwardX:  1, label: '415' },
    { x: 13.7, z: -20.5, inwardX: -1, label: '414' },
    { x: 13.7, z: -28.0, inwardX: -1, label: '416' },
    { x: 13.7, z: -35.2, inwardX: -1, label: '418' }
  ];

  var STATION = { side: -1, x: 10.75, z: -27.5, length: 2.6, depth: 0.56, height: 1.04 };
  var PROPS = {
    crashCart: { x: 12.2, y: 0, z: -43.0, rotY: 1.57 },
    gurney:    { x: 13.1, y: 0, z: -38.6, rotY: 0 }
  };
  var TROFFERS = [-17.6, -20.8, -24.0, -27.2, -30.4, -33.6, -36.8, -40.0, -43.2];
  var BULKHEADS = [-19.2, -25.6, -32.0, -38.4];
  var ELEVATOR_SIGN = { x: 12.0, y: 2.55, z: -23.0, text: 'ELEVATORS  \u2192' };

  var VIEWPOINTS = {
    vp1: { label: 'VP1 Entrance',        pos: [12.0, 1.55, -16.8], look: [12.0, 1.38, -28.0] },
    vp2: { label: 'VP2 Nurses Station',  pos: [12.0, 1.55, -21.5], look: [11.65, 1.32, -28.5] },
    vp3: { label: 'VP3 Far Lookback',    pos: [12.0, 1.55, -42.0], look: [12.0, 1.38, -28.0] }
  };

  var DOLLY = { duration: 9.0, zStart: -16.8, zEnd: -40.8, eyeY: 1.55, lookOffsetZ: -8.0, lookY: 1.38 };

  var pendingAssets = [];
  function trackPromise(p){ pendingAssets.push(p); return p; }
  function waitAssets(){
    var list = pendingAssets.slice();
    pendingAssets.length = 0;
    return Promise.all(list);
  }

  function loadTex(url, opts){
    opts = opts || {};
    var tl = new THREE.TextureLoader();
    var pResolve;
    var p = new Promise(function(res){ pResolve = res; });
    trackPromise(p);
    var tex = tl.load(url,
      function(t){ t.needsUpdate = true; pResolve(t); },
      undefined,
      function(err){ console.warn('Texture load warn:', url, err); pResolve(tex); }
    );
    tex.wrapS = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if(opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    tex.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    if(opts.flipY === false) tex.flipY = false;
    tex.anisotropy = opts.anisotropy || 8;
    return tex;
  }

  function makeSignTexture(text, opts){
    opts = opts || {};
    var w = opts.w || 512, h = opts.h || 96;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    c.fillStyle = opts.bg || '#11222e';
    c.fillRect(0, 0, w, h);
    if(!opts.noBorder){
      c.strokeStyle = opts.border || '#58c0c8';
      c.lineWidth = Math.max(3, Math.round(h * 0.05));
      c.strokeRect(4, 4, w - 8, h - 8);
    }
    c.fillStyle = opts.fg || '#e8f4f6';
    c.font = 'bold ' + (opts.size || Math.round(h * 0.46)) + 'px system-ui, -apple-system, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 1);
    var t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function makeMonitorTexture(mode){
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 170;
    var c = cv.getContext('2d');
    c.fillStyle = '#071419'; c.fillRect(0, 0, 256, 170);
    c.strokeStyle = '#0f3640'; c.lineWidth = 1;
    for(var gx = 0; gx < 256; gx += 16){ c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, 170); c.stroke(); }
    for(var gy = 0; gy < 170; gy += 16){ c.beginPath(); c.moveTo(0, gy); c.lineTo(256, gy); c.stroke(); }
    c.strokeStyle = mode ? '#ff9d42' : '#40f0a0';
    c.lineWidth = 2.5; c.beginPath();
    for(var x = 6; x < 248; x += 2){
      var wave = (x % 60 === 20) ? -28 : (x % 60 === 24) ? 16 : (x % 60 === 28) ? -8 : Math.sin(x * 0.14) * 2.0;
      var y = (mode ? 98 : 82) + wave;
      if(x === 6) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = mode ? '#ffbf70' : '#7ef8c0';
    c.font = 'bold 14px monospace';
    c.fillText(mode ? 'WARD B · ALERT' : 'HR 74   SPO2 98%', 14, 24);
    c.fillStyle = '#8ad6e4'; c.font = '11px monospace';
    c.fillText('RM 413-418 MONITOR', 14, 152);
    var t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  function buildCorridorPMREM(renderer, opts){
    opts = opts || {};
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, opts.ceilCol || '#2a343b');
    g.addColorStop(0.45, opts.wallCol || '#303b42');
    g.addColorStop(0.55, opts.wallLow || '#1e272d');
    g.addColorStop(1.0, opts.floorCol || '#0f1417');
    c.fillStyle = g; c.fillRect(0, 0, 512, 256);
    // Overhead fluorescent reflection strips
    c.fillStyle = opts.trofferCol || '#e4f8ff';
    for(var i = 0; i < 6; i++){
      c.fillRect(28 + i * 82, 16, 46, 18);
    }
    // Warm nurses' station bounce patch
    var wg = c.createRadialGradient(135, 132, 4, 135, 132, 62);
    wg.addColorStop(0, 'rgba(255,190,115,0.85)');
    wg.addColorStop(1, 'rgba(255,190,115,0)');
    c.fillStyle = wg; c.fillRect(60, 70, 150, 125);
    var eqTex = new THREE.CanvasTexture(cv);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.encoding = THREE.sRGBEncoding;
    var target = pmrem.fromEquirectangular(eqTex);
    eqTex.dispose(); pmrem.dispose();
    return target.texture;
  }

  function applyMetricUV(geom, w, h, d, tileSize, fullHeightV){
    var pos = geom.attributes.position;
    var norm = geom.attributes.normal;
    var uv = geom.attributes.uv;
    var s = 1.0 / (tileSize || 1.5);
    for(var i = 0; i < pos.count; i++){
      var nx = Math.abs(norm.getX(i)), ny = Math.abs(norm.getY(i)), nz = Math.abs(norm.getZ(i));
      var vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      if(ny > nx && ny > nz)      uv.setXY(i, (vx + w * 0.5) * s, (vz + d * 0.5) * s);
      else if(nx > ny && nx > nz) uv.setXY(i, (vz + d * 0.5) * s, fullHeightV ? (vy + h * 0.5) / h : (vy + h * 0.5) * s);
      else                        uv.setXY(i, (vx + w * 0.5) * s, fullHeightV ? (vy + h * 0.5) / h : (vy + h * 0.5) * s);
    }
    uv.needsUpdate = true;
  }

  function addBox(parent, w, h, d, mat, x, y, z, shadowCfg, tileSize, fullHeightV){
    var geom = new THREE.BoxGeometry(w, h, d);
    if(tileSize) applyMetricUV(geom, w, h, d, tileSize, fullHeightV);
    var m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    if(shadowCfg){
      if(shadowCfg.cast) m.castShadow = true;
      if(shadowCfg.recv) m.receiveShadow = true;
    }
    parent.add(m);
    return m;
  }

  function buildSignPanel(text, mw, opts){
    opts = opts || {};
    var h = opts.mh || mw * 0.18;
    var tex = makeSignTexture(text, Object.assign({ bg: '#0c1d28' }, opts));
    var mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(opts.emissive || 0x448899),
      emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.26,
      roughness: 0.90,
      metalness: 0.0
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(mw, h), mat);
    return mesh;
  }

  function buildShellGeometry(parent, mats, opts){
    opts = opts || {};
    var sh = opts.shadows ? { cast: true, recv: true } : null;
    var shRecv = opts.shadows ? { cast: false, recv: true } : null;
    var refs = { trofferLenses: [], trofferGroups: [], doors: {}, floorMeshes: [] };

    var fTile = opts.floorTile || 1.2;
    var wTile = opts.wallTile || 1.8;
    var cTile = opts.ceilTile || 1.2;
    var wFullH = !!opts.wallFullHeight;

    // Main corridor floor + left cross corridor stubs (matching world.js exact slab layout)
    var fMain = addBox(parent, 3.6, 0.10, 29.6, mats.floor, 12.0, -0.05, -29.0, shRecv, fTile);
    var fC1 = addBox(parent, 5.6, 0.10, 3.6, mats.floor, 7.5, -0.05, -16.0, shRecv, fTile);
    var fC2 = addBox(parent, 5.6, 0.10, 3.6, mats.floor, 7.5, -0.05, -42.0, shRecv, fTile);
    refs.floorMeshes.push(fMain, fC1, fC2);

    // Ceiling slabs
    addBox(parent, 3.6, 0.10, 29.6, mats.ceiling, 12.0, 2.95, -29.0, null, cTile);
    addBox(parent, 5.6, 0.10, 3.6, mats.ceiling, 7.5, 2.95, -16.0, null, cTile);
    addBox(parent, 5.6, 0.10, 3.6, mats.ceiling, 7.5, 2.95, -42.0, null, cTile);

    // Walls (Left solid z=-17.7..-40.3, Right solid z=-14.3..-43.7, End caps & cross stubs)
    addBox(parent, 0.16, 2.9, 22.6, mats.wall, 10.22, 1.45, -29.0, shRecv, wTile, wFullH);
    addBox(parent, 0.16, 2.9, 29.4, mats.wall, 13.78, 1.45, -29.0, shRecv, wTile, wFullH);
    addBox(parent, 3.6,  2.9, 0.16, mats.wall, 12.0,  1.45, -43.78, shRecv, wTile, wFullH);
    addBox(parent, 3.6,  2.9, 0.16, mats.wall, 12.0,  1.45, -14.22, shRecv, wTile, wFullH);
    [-14.22, -17.78, -40.22, -43.78].forEach(function(zs){
      addBox(parent, 5.6, 2.9, 0.16, mats.wall, 7.5, 1.45, zs, shRecv, wTile, wFullH);
    });
    addBox(parent, 0.16, 2.9, 3.7, mats.wall, 4.72, 1.45, -16.0, shRecv, wTile, wFullH);
    addBox(parent, 0.16, 2.9, 3.7, mats.wall, 4.72, 1.45, -42.0, shRecv, wTile, wFullH);

    // Optional architectural hospital wall trim: baseboard + dado bumper rail + neutral soffit bulkheads
    if(opts.trim !== false){
      var trimMat = mats.trim || mats.metal;
      var railMat = mats.rail || mats.frame || mats.metal;
      var beamMat = mats.beam || mats.ceiling;
      addBox(parent, 0.03, 0.13, 22.5, trimMat, 10.31, 0.065, -29.0, sh);
      addBox(parent, 0.03, 0.13, 29.2, trimMat, 13.69, 0.065, -29.0, sh);
      addBox(parent, 0.03, 0.13, 3.4,  trimMat, 12.0,  0.065, -43.69, sh);
      addBox(parent, 0.045, 0.11, 22.5, railMat, 10.32, 1.05, -29.0, sh);
      addBox(parent, 0.045, 0.11, 29.2, railMat, 13.68, 1.05, -29.0, sh);
      addBox(parent, 0.045, 0.11, 3.4,  railMat, 12.0,  1.05, -43.68, sh);
      BULKHEADS.forEach(function(zb){
        addBox(parent, 3.4, 0.14, 0.18, beamMat, 12.0, 2.83, zb, sh, 1.2);
      });
    }

    // 5 Doors (413, 415 left; 414, 416, 418 right) with frame, kickplate, handle, vision slit, plaque
    var glassMat = mats.doorGlass || new THREE.MeshStandardMaterial({ color: 0x16242b, roughness: 0.18, metalness: 0.35 });
    var handleMat = mats.chrome || mats.metal;
    DOORS.forEach(function(d){
      var dg = new THREE.Group();
      dg.position.set(d.x, 0, d.z);
      dg.rotation.y = Math.atan2(d.inwardX, 0);
      parent.add(dg);

      addBox(dg, 0.09, 2.22, 0.10, mats.frame, -0.56, 1.11, 0.03, sh);
      addBox(dg, 0.09, 2.22, 0.10, mats.frame,  0.56, 1.11, 0.03, sh);
      addBox(dg, 1.21, 0.09, 0.10, mats.frame,  0.00, 2.18, 0.03, sh);

      var pivot = new THREE.Group();
      pivot.position.set(-0.51, 0, 0.02);
      var ajar = (opts.ajarDoors && opts.ajarDoors[d.label]) || 0;
      pivot.rotation.y = ajar;
      dg.add(pivot);

      if(Math.abs(ajar) > 0.01){
        // Recessed interior room cavity backing behind ajar door (never exposes flat corridor plaster)
        var roomMat = mats.ajarInterior || new THREE.MeshStandardMaterial({
          color: 0x0c1318, emissive: new THREE.Color(0x1f140a), emissiveIntensity: 0.35, roughness: 0.95
        });
        var recess = new THREE.Mesh(new THREE.PlaneGeometry(1.00, 2.12), roomMat);
        recess.position.set(0, 1.06, 0.004);
        dg.add(recess);
      }

      addBox(pivot, 1.02, 2.12, 0.045, mats.door, 0.51, 1.06, 0, sh);
      addBox(pivot, 0.96, 0.24, 0.052, handleMat, 0.51, 0.13, 0, sh);
      addBox(pivot, 0.18, 0.66, 0.052, glassMat,  0.76, 1.54, 0, null);
      addBox(pivot, 0.22, 0.70, 0.048, mats.frame, 0.76, 1.54, 0, sh);
      addBox(pivot, 0.12, 0.03, 0.06,  handleMat, 0.88, 1.02, 0.04, sh);

      var pl = buildSignPanel(d.label, 0.20, { w: 128, h: 64, mh: 0.10, size: 38, bg: '#111e27', border: '#6598a6' });
      pl.position.set(0.51, 1.58, 0.03);
      pivot.add(pl);
      refs.doors[d.label] = dg;
    });

    // Nurses' Station (side = -1, z = -27.5)
    var st = new THREE.Group();
    st.position.set(STATION.x, 0, STATION.z);
    st.rotation.y = Math.PI / 2;
    parent.add(st);
    addBox(st, 2.62, 0.12, 0.58, mats.frame, 0, 0.06, 0, sh);
    addBox(st, 2.60, 0.92, 0.56, mats.counter || mats.wall, 0, 0.58, 0, sh);
    addBox(st, 2.70, 0.06, 0.72, mats.wood, 0, 1.07, 0.02, sh);
    [-0.55, 0.55].forEach(function(mx, idx){
      addBox(st, 0.07, 0.20, 0.07, mats.metal, mx, 1.18, 0.04, sh);
      addBox(st, 0.44, 0.30, 0.04, mats.frame, mx, 1.35, 0.04, sh);
      var scrTex = makeMonitorTexture(idx);
      var scrMat = new THREE.MeshStandardMaterial({
        map: scrTex, emissiveMap: scrTex,
        emissive: new THREE.Color(idx ? 0xff9b45 : 0x58f0b0),
        emissiveIntensity: opts.screenGlow !== undefined ? opts.screenGlow : 0.95,
        roughness: 0.2
      });
      var sm = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.26), scrMat);
      sm.position.set(mx, 1.35, 0.063);
      st.add(sm);
    });
    addBox(st, 1.62, 0.32, 0.04, mats.frame, 0, 2.45, -0.022, sh);
    var stSign = buildSignPanel("NURSES' STATION", 1.55, { w: 512, h: 96, mh: 0.28, size: 42, bg: '#0c1d28', emissiveIntensity: 0.22 });
    stSign.position.set(0, 2.45, 0.002);
    st.add(stSign);
    refs.stationGroup = st;

    // Overhead ELEVATORS -> double-sided corridor sign
    var elSignG = new THREE.Group();
    elSignG.position.set(ELEVATOR_SIGN.x, ELEVATOR_SIGN.y, ELEVATOR_SIGN.z);
    parent.add(elSignG);
    [-0.78, 0.78].forEach(function(rx){ addBox(elSignG, 0.02, 0.36, 0.02, mats.metal, rx, 0.22, 0, null); });
    addBox(elSignG, 1.88, 0.30, 0.035, mats.frame, 0, 0, 0, sh);
    var sFront = buildSignPanel(ELEVATOR_SIGN.text, 1.80, { w: 512, h: 96, mh: 0.27, size: 48, bg: '#0c2430', border: '#54d0c8' });
    sFront.position.z = 0.02; elSignG.add(sFront);
    var sBack = buildSignPanel('\u2190  ELEVATORS', 1.80, { w: 512, h: 96, mh: 0.27, size: 48, bg: '#0c2430', border: '#54d0c8' });
    sBack.position.z = -0.02; sBack.rotation.y = Math.PI; elSignG.add(sBack);

    // Hero Gurney & Crash Cart (unless take uses hero GLB instead)
    if(!opts.skipBasicProps){
      var gurney = new THREE.Group();
      gurney.position.set(PROPS.gurney.x, PROPS.gurney.y, PROPS.gurney.z);
      gurney.rotation.y = PROPS.gurney.rotY;
      parent.add(gurney);
      var matSteel = mats.chrome || mats.metal;
      var matSheet = mats.sheet || mats.counter || mats.wall;
      addBox(gurney, 0.72, 0.08, 1.90, matSteel, 0, 0.62, 0, sh);
      addBox(gurney, 0.66, 0.12, 1.84, matSheet, 0, 0.72, 0, sh);
      addBox(gurney, 0.44, 0.08, 0.28, matSheet, 0, 0.80, -0.68, sh);
      addBox(gurney, 0.62, 0.04, 1.54, matSteel, 0, 0.16, 0, sh);
      [-0.28, 0.28].forEach(function(lx){
        [-0.72, 0.72].forEach(function(lz){
          addBox(gurney, 0.05, 0.60, 0.05, matSteel, lx, 0.30, lz, sh);
        });
      });

      var cart = new THREE.Group();
      cart.position.set(PROPS.crashCart.x, PROPS.crashCart.y, PROPS.crashCart.z);
      cart.rotation.y = PROPS.crashCart.rotY;
      parent.add(cart);
      var matRed = mats.redCart || new THREE.MeshStandardMaterial({ color: 0x8e1412, roughness: 0.30, metalness: 0.16 });
      addBox(cart, 0.88, 0.92, 0.56, matRed, 0, 0.54, 0, sh);
      for(var di = 0; di < 4; di++) addBox(cart, 0.82, 0.03, 0.03, matSteel, 0, 0.26 + di * 0.21, 0.29, sh);
      addBox(cart, 0.46, 0.22, 0.32, mats.frame, 0, 1.11, 0, sh);
      var cartMon = new THREE.MeshStandardMaterial({ color: 0x208050, emissive: new THREE.Color(0x46e898), emissiveIntensity: 0.85, roughness: 0.25 });
      addBox(cart, 0.36, 0.15, 0.02, cartMon, 0, 1.12, 0.165, null);
    }

    // 9 Ceiling troffers (matching exact world.js light steps)
    TROFFERS.forEach(function(tz, idx){
      var tg = new THREE.Group();
      tg.position.set(12.0, 2.89, tz);
      parent.add(tg);
      addBox(tg, 0.62, 0.04, 1.24, mats.frame, 0, 0, 0, null);
      var isFlicker = (opts.flickerIndex !== undefined && idx === opts.flickerIndex);
      var lensMat = new THREE.MeshStandardMaterial({
        color: isFlicker ? 0x627c72 : 0xd6eef4,
        emissive: new THREE.Color(isFlicker ? 0x7aa490 : (opts.trofferColor || 0xe4f5ff)),
        emissiveIntensity: isFlicker ? (opts.flickerIntensity || 0.75) : (opts.trofferIntensity !== undefined ? opts.trofferIntensity : 2.6),
        roughness: 0.25
      });
      var lens = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 1.14), lensMat);
      lens.rotation.x = Math.PI / 2; lens.position.y = -0.022;
      tg.add(lens);
      refs.trofferLenses.push(lens);
      refs.trofferGroups.push(tg);
    });

    return refs;
  }

  window.HW_DATA = {
    V3: V3,
    CORRIDOR: CORRIDOR,
    DOORS: DOORS,
    STATION: STATION,
    PROPS: PROPS,
    TROFFERS: TROFFERS,
    BULKHEADS: BULKHEADS,
    ELEVATOR_SIGN: ELEVATOR_SIGN,
    VIEWPOINTS: VIEWPOINTS,
    DOLLY: DOLLY,
    trackPromise: trackPromise,
    waitAssets: waitAssets,
    loadTex: loadTex,
    makeSignTexture: makeSignTexture,
    makeMonitorTexture: makeMonitorTexture,
    buildCorridorPMREM: buildCorridorPMREM,
    applyMetricUV: applyMetricUV,
    addBox: addBox,
    buildSignPanel: buildSignPanel,
    buildShellGeometry: buildShellGeometry
  };
})();

/* Hospital Escape — HET4: Neon's Take 4 look and feel over the WHOLE game (tasking/T4-FULL-PORT.md, owner ruling Nov 24).
   Source of truth: games/hospital-escape-hallway-neon/take4-kitbash.js + corridor-data.js. Carried over, per element:
     renderer   ACES filmic, exposure 1.06, sRGB out (done in the post composite on the HDR target = the same per-pixel math;
                ?post=0 sets them on the renderer itself), PCF-soft shadow maps
     scene      FogExp2(0x081016, 0.020), background 0x05090d indoors, the corridor PMREM environment (same gradient + strips)
     materials  the five Poly Haven CC0 PBR sets (diff / normal / rough) at T4's exact colours, roughness, normal scales and
                metric tiling (floor 1.85 m, wall 1.8 m, ceiling 1.9 m) on the game's OWN geometry (UVs rebuilt from world position)
     lighting   T4's analytic rectangular area-light term (its GLSL, unchanged maths) injected into every lit material — fed by
                the game's real ceiling panels (recovered from the merged geometry; the nearest K to the camera each frame) instead
                of WWB's 9 hard-coded panels; T4's hemisphere (0x7a9eb0 / 0x1a2228, 0.22); lens panels at T4's emissive 2.6;
                the failing tube (dim 0.48, green-grey) at T4's position; T4's room spill + warm desk spot + far shadow spot in WWB,
                and one roaming shadow spot (T4's far-shadow light) over the nearest panel ahead everywhere else
     dressing   T4's kit-bash props (props.glb) at T4's coordinates in West Wing B
   The game's geometry, doors (engine objects, they still swing), colliders and every gameplay system are untouched. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search); if(Q.get('t4') === '0') return;
var V = THREE.Vector3, T = window.HET4 = { on: true, stats: {} }, DIR = '../hospital-escape/assets/t4/', K = Math.max(1, Math.min(12, +(Q.get('t4k') || 8))), SHADOWS = Q.get('t4shadow') !== '0', ENV = Q.get('t4env') !== '0', MAPS = Q.get('t4maps') !== '0';   /* measurement switches (opus-t4-full.md cost table) */
var FOG = { color: 0x081016, density: 0.020 }, BG = 0x05090d, EXPOSURE = 1.06;
// ------------------------------------------------------------------ T4's area-light term (take4-kitbash.js), fed by uniform panels
var U = { uPan: { value: [] }, uHalf: { value: [] }, uCol: { value: [] }, uPanCount: { value: 0 } }; for(var i = 0; i < K; i++){ U.uPan.value.push(new THREE.Vector4(0, -100, 0, 0)); U.uHalf.value.push(new THREE.Vector2(0.28, 0.58)); U.uCol.value.push(new THREE.Vector3(0.84, 0.95, 1.0)); }
var RECT = ['varying vec3 vAreaWPos;', 'varying vec3 vAreaWNorm;', 'uniform int uPanCount;', 'uniform vec4 uPan[' + K + '];', 'uniform vec2 uHalf[' + K + '];', 'uniform vec3 uCol[' + K + '];',
  'float rectIrradiance(vec3 P, vec3 N, vec3 Lc, float hx, float hz){',
  '  vec3 cp = vec3(clamp(P.x, Lc.x - hx, Lc.x + hx), Lc.y, clamp(P.z, Lc.z - hz, Lc.z + hz));',
  '  vec3 d = cp - P; float dist2 = dot(d, d) + 0.18; vec3 L = normalize(d);',
  '  float nDotL = clamp(dot(N, L) * 0.72 + 0.28, 0.0, 1.0); float lampFacing = smoothstep(-0.15, 0.45, -L.y);',
  '  return (nDotL * lampFacing) / dist2; }'].join('\n');
var INJECT = ['#include <lights_fragment_end>', '{',
  '  vec3 Nw = normalize(vAreaWNorm);',
  '  if(uPanCount > 0){',
  '    vec3 Vw = normalize(cameraPosition - vAreaWPos); vec3 Rw = reflect(-Vw, Nw);',
  '    vec3 aDiff = vec3(0.0); vec3 aSpec = vec3(0.0); float roughA = clamp(material.specularRoughness, 0.12, 0.95);',
  '    bool doSpec = Rw.y > 0.04; float invRwY = doSpec ? (1.0 / Rw.y) : 0.0; float invDenom = 1.0 / (0.03 + roughA * roughA * 1.4);',
  '    for(int i = 0; i < ' + K + '; i++){',
  '      if(i >= uPanCount) break;',
  '      vec3 lc = uPan[i].xyz; vec3 col = uCol[i]; vec2 hh = uHalf[i];',
  '      aDiff += col * rectIrradiance(vAreaWPos, Nw, lc, hh.x, hh.y);',
  '      if(doSpec){ float tHit = (lc.y - vAreaWPos.y) * invRwY; vec3 hit = vAreaWPos + Rw * tHit;',
  '        vec2 dRect = max(abs(hit.xz - lc.xz) - hh, vec2(0.0)); float eArg = dot(dRect, dRect) * invDenom;',
  '        if(eArg < 10.0) aSpec += col * exp(-eArg); } }',
  '    reflectedLight.directDiffuse += aDiff * diffuseColor.rgb * 0.816;',
  '    if(doSpec) reflectedLight.directSpecular += aSpec * ((1.0 - roughA) * 0.62) * mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);',
  '  }',
  '  if(Nw.y < -0.5) reflectedLight.indirectDiffuse += vec3(0.11, 0.14, 0.16) * diffuseColor.rgb;',
  '}'].join('\n');
var IBL = null;
var IBL_PARS = 'uniform samplerCube uT4EnvCube;\nuniform float uT4EnvInt;';
var IBL_INJECT = [
  '#include <lights_fragment_maps>',
  '#if defined( RE_IndirectDiffuse )',
  '{ vec3 t4WN = inverseTransformDirection( geometry.normal, viewMatrix );',
  '#ifdef T4_CUBE_LOD',
  '  vec3 t4DRaw = textureCubeLodEXT( uT4EnvCube, t4WN, 4.0 ).rgb;',
  '#else',
  '  vec3 t4DRaw = textureCube( uT4EnvCube, t4WN, 4.0 ).rgb;',
  '#endif',
  '  iblIrradiance += ( t4DRaw * t4DRaw ) * ( 3.14159265 * uT4EnvInt ); }',
  '#endif',
  '#if defined( RE_IndirectSpecular )',
  '{ vec3 t4RV = normalize( mix( reflect( -geometry.viewDir, geometry.normal ), geometry.normal, material.specularRoughness * material.specularRoughness ) );',
  '  vec3 t4WR = inverseTransformDirection( t4RV, viewMatrix );',
  '  float t4Lod = clamp( material.specularRoughness, 0.0, 1.0 ) * 4.0;',
  '#ifdef T4_CUBE_LOD',
  '  vec3 t4SRaw = textureCubeLodEXT( uT4EnvCube, t4WR, t4Lod ).rgb;',
  '#else',
  '  vec3 t4SRaw = textureCube( uT4EnvCube, t4WR, t4Lod ).rgb;',
  '#endif',
  '  radiance += ( t4SRaw * t4SRaw ) * uT4EnvInt; }',
  '#endif'
].join('\n');
function setupMaterialT4(mat, withRect){
  if(!mat || !mat.isMeshStandardMaterial) return mat;
  if(withRect && mat.userData.t4) return mat;
  if(!withRect && (mat.userData.t4 || mat.userData.t4ibl)) return mat;
  if(withRect) mat.userData.t4 = true; else mat.userData.t4ibl = true;
  var prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function(sh, r){
    if(prev) prev.call(this, sh, r);
    if(withRect){
      sh.uniforms.uPan = U.uPan; sh.uniforms.uHalf = U.uHalf; sh.uniforms.uCol = U.uCol; sh.uniforms.uPanCount = U.uPanCount;
      sh.vertexShader = 'varying vec3 vAreaWPos;\nvarying vec3 vAreaWNorm;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvAreaWNorm = normalize(mat3(modelMatrix) * objectNormal);')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAreaWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = RECT + '\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', INJECT);
    }
    if(ENV && IBL){
      sh.uniforms.uT4EnvCube = IBL.envCube;
      sh.uniforms.uT4EnvInt = { value: this.envMapIntensity != null ? this.envMapIntensity : 1.0 };
      var hasLod = r.capabilities.isWebGL2 || !!r.extensions.get('EXT_shader_texture_lod');
      sh.fragmentShader = (hasLod ? '#define T4_CUBE_LOD 1\n' : '') + IBL_PARS + '\n' +
        sh.fragmentShader.replace('#include <lights_fragment_maps>', IBL_INJECT);
    }
  };
  var key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : function(){ return ''; };
  mat.customProgramCacheKey = function(){ return key() + (withRect ? '|t4a' : '|t4b') + (ENV && IBL ? '|c4' : ''); };
  mat.needsUpdate = true; return mat;
}
function withArea(mat){ return setupMaterialT4(mat, true); }
T.withArea = withArea;
function applyFastIBL(mat){ return setupMaterialT4(mat, false); }
// ------------------------------------------------------------------ T4's corridor PMREM (corridor-data.js buildCorridorPMREM, T4's colours)
function corridorPMREM(renderer){ var pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader(); var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; var c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#243038'); g.addColorStop(0.45, '#2b3740'); g.addColorStop(0.55, '#1e272d'); g.addColorStop(1.0, '#11161a'); c.fillStyle = g; c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#e4f8ff'; for(var i = 0; i < 6; i++) c.fillRect(28 + i * 82, 16, 46, 18);
  var wg = c.createRadialGradient(135, 132, 4, 135, 132, 62); wg.addColorStop(0, 'rgba(255,190,115,0.85)'); wg.addColorStop(1, 'rgba(255,190,115,0)'); c.fillStyle = wg; c.fillRect(60, 70, 150, 125);
  var eq = new THREE.CanvasTexture(cv); eq.mapping = THREE.EquirectangularReflectionMapping; eq.encoding = THREE.sRGBEncoding; var t = pm.fromEquirectangular(eq); eq.dispose(); pm.dispose(); return t.texture; }
// Bake once at init from corridorPMREM: 8-mip 128x128x6 CubeTexture (sqrt-encoded linear [0..1]; mip 4 = r 1.0 diffuse irradiance)
function bakeFastIBL(renderer, pmrem){
  var decFn = pmrem.encoding === THREE.RGBEEncoding ?
    'vec4 envMapTexelToLinear(vec4 v){ return vec4(v.rgb * exp2(v.a * 255.0 - 128.0), 1.0); }' :
    pmrem.encoding === THREE.sRGBEncoding ?
    'vec4 envMapTexelToLinear(vec4 v){ return vec4(mix(pow(v.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), v.rgb * 0.0773993808, vec3(lessThanEqual(v.rgb, vec3(0.04045)))), v.a); }' :
    'vec4 envMapTexelToLinear(vec4 v){ return v; }';
  var bakeMat = new THREE.ShaderMaterial({
    uniforms: { envMap: { value: pmrem }, uFace: { value: 0 }, uRough: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D envMap; uniform int uFace; uniform float uRough; varying vec2 vUv;',
      decFn,
      '#define ENVMAP_TYPE_CUBE_UV',
      '#include <cube_uv_reflection_fragment>',
      'void main(){',
      '  float a = vUv.x * 2.0 - 1.0, b = vUv.y * 2.0 - 1.0; vec3 dir;',
      '  if(uFace == 0) dir = vec3(1.0, -b, -a);',
      '  else if(uFace == 1) dir = vec3(-1.0, -b, a);',
      '  else if(uFace == 2) dir = vec3(a, 1.0, b);',
      '  else if(uFace == 3) dir = vec3(a, -1.0, -b);',
      '  else if(uFace == 4) dir = vec3(a, -b, 1.0);',
      '  else dir = vec3(-a, -b, -1.0);',
      '  vec3 c = textureCubeUV(envMap, normalize(dir), uRough).rgb;',
      '  gl_FragColor = vec4(sqrt(clamp(c, 0.0, 1.0)), 1.0);',
      '}'
    ].join('\n'),
    depthTest: false, depthWrite: false
  });
  var qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), qm = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat);
  qs.add(qm);
  var prevRT = renderer.getRenderTarget(), prevEnc = renderer.outputEncoding, prevTM = renderer.toneMapping, prevAC = renderer.autoClear;
  renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = true;
  var sizes = [128, 64, 32, 16, 8, 4, 2, 1], mips = [];
  for(var l = 0; l < sizes.length; l++){
    var sz = sizes[l];
    var rt = new THREE.WebGLRenderTarget(sz, sz, { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false });
    bakeMat.uniforms.uRough.value = Math.min(1.0, l / 4.0);
    var dtFaces = [];
    for(var f = 0; f < 6; f++){
      bakeMat.uniforms.uFace.value = f;
      renderer.setRenderTarget(rt);
      renderer.render(qs, qc);
      var buf = new Uint8Array(sz * sz * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, sz, sz, buf);
      var dt = new THREE.DataTexture(buf, sz, sz, THREE.RGBAFormat, THREE.UnsignedByteType);
      dt.flipY = false; dt.generateMipmaps = false; dt.needsUpdate = true;
      dtFaces.push(dt);
    }
    rt.dispose();
    mips.push(dtFaces);
  }
  renderer.setRenderTarget(prevRT); renderer.outputEncoding = prevEnc; renderer.toneMapping = prevTM; renderer.autoClear = prevAC;
  qm.geometry.dispose(); bakeMat.dispose();
  var cube = new THREE.CubeTexture(mips[0], THREE.CubeReflectionMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearMipmapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType, 1, THREE.LinearEncoding);
  cube._needsFlipEnvMap = false; cube.flipY = false; cube.generateMipmaps = false;
  cube.mipmaps = mips.slice(1).map(function(list){ return { image: list }; });
  cube.needsUpdate = true;
  return { envCube: { value: cube }, cube: cube };
}
// ------------------------------------------------------------------ T4's materials (exact parameters from take4-kitbash.js)
var TL = new THREE.TextureLoader();
function tex(n, srgb){ var t = TL.load(DIR + n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if(srgb) t.encoding = THREE.sRGBEncoding; return t; }
function set(n){ return { map: tex(n + '_diff.jpg', true), nor: MAPS ? tex(n + '_nor.jpg') : null, rgh: MAPS ? tex(n + '_rough.jpg') : null }; }
function makeMats(){ var fl = set('floor'), wl = set('wall'), wd = set('wood'), mt = set('metal'), ce = set('ceil'), S = THREE.MeshStandardMaterial;
  var M5 = { floor: withArea(new S({ color: 0x5c7a86, map: fl.map, normalMap: fl.nor, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: fl.rgh, roughness: 0.42, metalness: 0.02 })),
    wall: withArea(new S({ color: 0xb6c2c0, map: wl.map, normalMap: wl.nor, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: wl.rgh, roughness: 0.86 })),
    ceil: withArea(new S({ color: 0xd0dade, map: ce.map, normalMap: ce.nor, normalScale: new THREE.Vector2(0.22, 0.22), roughnessMap: ce.rgh, roughness: 0.88 })),
    door: withArea(new S({ color: 0x947462, map: wd.map, normalMap: wd.nor, roughnessMap: wd.rgh, roughness: 0.54 })),
    metal: withArea(new S({ color: 0x909ca4, normalMap: mt.nor, normalScale: new THREE.Vector2(0.15, 0.15), roughness: 0.30, metalness: 0.72 })) };
  ['floor', 'wall', 'ceil'].forEach(function(k){ M5[k].side = THREE.DoubleSide; });   /* CAMERA-FIX: room surfaces read from both sides (no see-through from a back face) */
  return M5; }
var TILE = { floor: 1.85, wall: 1.8, ceil: 1.9, door: 1.0 };
/* metric UVs from world position (T4's applyMetricUV idea): floors/ceilings by x-z, walls by their run + height */
function metricUV(g, tile){ var p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for(var i = 0; i < p.count; i++){ var x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if(ny >= nx && ny >= nz){ uv[i * 2] = x / tile; uv[i * 2 + 1] = z / tile; } else if(nx >= nz){ uv[i * 2] = z / tile; uv[i * 2 + 1] = y / tile; } else { uv[i * 2] = x / tile; uv[i * 2 + 1] = y / tile; } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
function concat(list){ var n = 0; list.forEach(function(g){ n += g.attributes.position.count; }); var P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2), o = 0;
  list.forEach(function(g){ P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); UV.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
  var b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(P, 3)); b.setAttribute('normal', new THREE.BufferAttribute(N, 3)); b.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); b.computeBoundingSphere(); b.computeBoundingBox(); return b; }
// ------------------------------------------------------------------ apply
var panels = [], outdoorChunks = [], ctxG = null, roam = null, mats = null;
function bindDynamicIBL(sc){
  if(!ENV || !IBL) return;
  for(var i = 0; i < sc.children.length; i++){
    var o = sc.children[i];
    if(o.userData && o.userData._t4c === o.children.length) continue;
    o.userData._t4c = o.children.length;
    o.traverse(function(ch){
      if(!ch.isMesh) return;
      var ms = Array.isArray(ch.material) ? ch.material : [ch.material];
      for(var k = 0; k < ms.length; k++) if(ms[k] && ms[k].isMeshStandardMaterial) applyFastIBL(ms[k]);
    });
  }
}
T.apply = function(ctx){ ctxG = ctx; var r = ctx.renderer, sc = ctx.scene, root = ctx.root, A = ctx.A, t0 = performance.now();
  r.shadowMap.enabled = SHADOWS; r.shadowMap.type = THREE.PCFSoftShadowMap;
  if(Q.get('post') === '0'){ r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = EXPOSURE; r.outputEncoding = THREE.sRGBEncoding; }
  sc.fog = new THREE.FogExp2(FOG.color, FOG.density);
  if(ENV){ T.pmrem = corridorPMREM(r); IBL = bakeFastIBL(r, T.pmrem); }
  T.bg = new THREE.Color(BG);
  mats = makeMats();
  var st = { meshesBefore: 0, meshesAfter: 0, swapped: { floor: 0, wall: 0, ceil: 0, door: 0 }, lit: 0, pools: 0, panels: 0 }, vinyl = A.tex.vinyl.image, wallI = A.tex.wall.image, ceilI = A.tex.ceiling.image, doorI = A.tex.door.image, panelI = A.tex.lightPanel.image;
  root.children.slice().forEach(function(zg){ var byCls = { floor: [], wall: [], ceil: [] }, drop = [];
    if(zg.userData && zg.userData.outdoorChunk) outdoorChunks.push(zg);
    zg.traverse(function(o){ if(!o.isMesh || Array.isArray(o.material)) return; st.meshesBefore++; var m = o.material, im = m.map && m.map.image;
      if(im === panelI){ collectPanels(o); m.color.setRGB(0.894 * 2.6, 0.961 * 2.6, 1.0 * 2.6); return; }                 /* T4 lens: 0xe4f5ff x 2.6 */
      if(m.blending === THREE.AdditiveBlending && m.transparent && !m.map){ o.visible = false; st.pools++; return; }
      if(m.isMeshBasicMaterial && m.map && !m.transparent){ o.material = withArea(new THREE.MeshStandardMaterial({ map: m.map, emissiveMap: m.map, emissive: new THREE.Color(0x448899), emissiveIntensity: 0.26, roughness: 0.9, metalness: 0, side: m.side })); st.signs = (st.signs || 0) + 1; return; }   /* signs + screens: T4's buildSignPanel material */        /* the painted light pools: T4 lights the floor itself */
      var cls = im === vinyl ? 'floor' : im === wallI ? 'wall' : im === ceilI ? 'ceil' : null;
      if(cls && o.parent === zg){ var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); metricUV(g, TILE[cls]); byCls[cls].push(g); drop.push(o); st.swapped[cls]++; return; }
      if(im === doorI && isDoorLeaf(o)){ o.material = mats.door; st.swapped.door++; return; }   /* only real door leaves take T4's wood; furniture with the door texture keeps its own */
      if(m.isMeshStandardMaterial){ withArea(m); st.lit++; }
      if(!m.transparent) o.receiveShadow = true; });
    drop.forEach(function(o){ o.parent.remove(o); });
    Object.keys(byCls).forEach(function(c){ if(!byCls[c].length) return; var mesh = new THREE.Mesh(concat(byCls[c]), mats[c]); mesh.name = 't4-' + c; mesh.receiveShadow = (c !== 'ceil'); zg.add(mesh); }); });
  root.traverse(function(o){ if(o.isMesh) st.meshesAfter++; });
  // the doors: engine objects (W.doors), separate meshes — wood door panels + metal frames, still on their hinges
  (window.HEWORLD.doors || []).forEach(function(d){ [d.group, d.hinge].forEach(function(gq){ if(gq && gq.traverse) gq.traverse(function(o){ if(!o.isMesh) return; var im = o.material.map && o.material.map.image; if(im === doorI) o.material = mats.door; else if(o.material.isMeshStandardMaterial){ withArea(o.material); } o.receiveShadow = true; o.castShadow = true; }); }); });
  st.panels = panels.length;
  // the failing tube: T4 dims panel #5 of WWB (z -33.6) to 0.48 in green-grey
  panels.forEach(function(p){ if(Math.abs(p.x - 12) < 0.5 && Math.abs(p.z + 33.6) < 1.7 && Math.abs(p.y - 2.9) < 0.3) p.fail = true; });
  // lights: T4's hemisphere replaces the game's indoor hemi/sun values (main.js setOutdoor calls T.indoorLights); WWB's own T4 lights
  var wwb = new THREE.Group(); wwb.name = 't4-wwb-lights'; sc.add(wwb);
  [-20.5, -28.0].forEach(function(dz){ var pl = new THREE.PointLight(0xffbe72, 0.85, 4.5, 1.8); pl.position.set(13.95, 1.5, dz); wwb.add(pl); });
  var desk = new THREE.SpotLight(0xffc278, 1.9, 10.0, 0.9, 0.65, 1.6); desk.position.set(11.9, 2.75, -27.2); desk.target.position.set(10.8, 0.2, -27.5); desk.castShadow = true; desk.shadow.mapSize.set(1024, 1024); wwb.add(desk); wwb.add(desk.target);
  var far = new THREE.SpotLight(0xd6eeff, 1.4, 12.0, 0.9, 0.6, 1.5); far.position.set(12.0, 2.78, -37.2); far.target.position.set(12.9, 0.0, -40.2); far.castShadow = true; far.shadow.mapSize.set(1024, 1024); wwb.add(far); wwb.add(far.target);
  T.wwbLights = wwb; T.wwbSpots = [desk, far];
  roam = new THREE.SpotLight(0xd6eeff, 1.4, 12.0, 0.9, 0.6, 1.5); roam.castShadow = true; roam.shadow.mapSize.set(1024, 1024); roam.shadow.bias = -0.0005; sc.add(roam); sc.add(roam.target); T.roam = roam;
  [desk, far].forEach(function(s){ s.shadow.bias = -0.0005; });
  // T4's kit-bash dressing in West Wing B (its hero gurney + crash cart are skipped: the game's own stand at those exact spots)
  if(THREE.GLTFLoader) new THREE.GLTFLoader().load(DIR + 'props.glb', function(g){ var bank = {}; g.scene.traverse(function(o){ if(o.name) bank[o.name] = o; }); var dress = new THREE.Group(); dress.name = 't4-kitbash';
    function put(k, x, y, z, ry, sc2){ var s = bank[k]; if(!s) return null; var c = s.clone(true), uniq = (k === 'WetFloorCone'); c.traverse(function(ch){ if(ch.isMesh){ ch.castShadow = true; ch.receiveShadow = true; ch.material = withArea(uniq ? ch.material.clone() : ch.material); ch.raycast = function(){}; } }); c.position.set(x, y, z); if(ry) c.rotation.y = ry; if(sc2) c.scale.setScalar(sc2); dress.add(c); return c; }
    put('IVStandHero', 13.26, 0, -37.25, 0.35); var cone = put('WetFloorCone', 12.78, 0, -25.85, 0.25, 0.85); if(cone) cone.traverse(function(c){ if(c.isMesh) c.material.color.setHex(0xe8a818); });
    put('VisitorChair', 13.36, 0, -23.35, -Math.PI / 2); put('VisitorChair', 13.36, 0, -24.08, -Math.PI / 2 + 0.08); put('FireCabinet', 10.32, 1.38, -21.5, Math.PI / 2); put('WallClock', 10.33, 2.34, -25.55, Math.PI / 2);
    put('ChartStack', 10.82, 1.10, -28.05, 0.18); put('ChartStack', 10.80, 1.10, -26.85, -0.45);
    [[10.33, 1.30, -23.6, Math.PI / 2], [10.33, 1.30, -30.6, Math.PI / 2], [13.67, 1.30, -19.6, -Math.PI / 2], [13.67, 1.30, -27.1, -Math.PI / 2]].forEach(function(w){ put('WallDispenser', w[0], w[1], w[2], w[3]); });
    var damp = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), withArea(new THREE.MeshStandardMaterial({ color: 0x0b1214, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.26 }))); damp.rotation.x = -Math.PI / 2; damp.position.set(12.78, 0.004, -25.85); damp.raycast = function(){}; dress.add(damp);
    sc.add(dress); T.kitbash = dress; var n = 0; dress.traverse(function(o){ if(o.isMesh) n++; }); T.stats.kitbashMeshes = n; });
  st.applyMs = Math.round(performance.now() - t0); T.stats = Object.assign(T.stats, st); return st; };
function isDoorLeaf(o){ var D = (window.HEWORLD && HEWORLD.doors) || []; for(var q = o; q; q = q.parent){ for(var i = 0; i < D.length; i++) if(D[i].group === q || D[i].hinge === q) return true; } return false; }
/* the ceiling panels, recovered from the merged lamp-panel meshes: every 6 vertices = one 2-triangle quad */
function collectPanels(o){ o.updateMatrixWorld(true); var g = o.geometry, p = g.attributes.position, v = new V();
  for(var i = 0; i + 6 <= p.count; i += 6){ var mn = new V(1e9, 1e9, 1e9), mx = new V(-1e9, -1e9, -1e9); for(var k = 0; k < 6; k++){ v.fromBufferAttribute(p, i + k).applyMatrix4(o.matrixWorld); mn.min(v); mx.max(v); }
    if(mx.y - mn.y > 0.05) continue; panels.push({ x: (mn.x + mx.x) / 2, y: (mn.y + mx.y) / 2 - 0.03, z: (mn.z + mx.z) / 2, hx: Math.max(0.1, (mx.x - mn.x) / 2 - 0.02), hz: Math.max(0.1, (mx.z - mn.z) / 2 - 0.02) }); } }
// ------------------------------------------------------------------ per frame: the K nearest panels feed the area term; the roaming shadow spot sits over the nearest panel ahead
var _c = new V(), _f = new V(), _ahead = new V(), _tq = new V(), _topP = new Array(K), _topD = new Float64Array(K);
T.step = function(camera, indoor, seg){ if(!ctxG) return; bindDynamicIBL(ctxG.scene); camera.getWorldPosition(_c); camera.getWorldDirection(_f); _ahead.copy(_c).addScaledVector(_f, 3.0);
  var count = 0, best = null;
  if(indoor){
    for(var pi = 0; pi < panels.length; pi++){
      var p = panels[pi]; if(Math.abs(p.y - _c.y) >= 4.5) continue;
      var dx = p.x - _ahead.x, dz = p.z - _ahead.z, d = dx * dx + dz * dz;
      if(d >= 324) continue;
      if(count < K || d < _topD[count - 1]){
        var pos = count < K ? count++ : K - 1;
        while(pos > 0 && _topD[pos - 1] > d){ _topD[pos] = _topD[pos - 1]; _topP[pos] = _topP[pos - 1]; pos--; }
        _topD[pos] = d; _topP[pos] = p;
      }
    }
    for(var i = 0; i < count; i++){
      var q = _topP[i], dim = q.fail ? 0.48 : 1.0;
      U.uPan.value[i].set(q.x, q.y, q.z, dim); U.uHalf.value[i].set(q.hx, q.hz);
      if(q.fail) U.uCol.value[i].set(0.70 * dim, 0.92 * dim, 0.80 * dim); else U.uCol.value[i].set(0.84, 0.95, 1.0);
      if(!best && i < 6){ _tq.set(q.x - _c.x, 0, q.z - _c.z); if(_tq.dot(_f) > 0.5) best = q; }
    }
  }
  U.uPanCount.value = count;
  var inWWB = indoor && _c.x > 9.5 && _c.x < 14.5 && _c.z < -14 && _c.z > -45 && Math.abs(_c.y - 1.5) < 2;
  /* TRANSITION-HITCH: the light SET never changes (three.js keys every lit program on the light / shadow counts — toggling visible or
     castShadow recompiled every material on screen at the first cut): lights are switched by intensity only */
  if(!T.base){ T.base = new Map(); T._wwbList = []; T.wwbLights.traverse(function(l){ if(l.isLight){ T.base.set(l, l.intensity); T._wwbList.push(l); } }); T.base.set(roam, roam.intensity); }
  for(var li = 0; li < T._wwbList.length; li++){ var wl = T._wwbList[li]; wl.intensity = indoor && (wl.isPointLight || inWWB) ? T.base.get(wl) : 0; }
  var warmed = !window.HECAST || !!HECAST.warmed;
  if(T.kitbash) T.kitbash.visible = !warmed || Math.abs(_c.y - 1.5) < 4.5;
  var hideOut = !!(warmed && indoor && (_c.y > -3.0 || (_c.y < -5.0 && _c.z > -128.0)));
  for(var oi = 0; oi < outdoorChunks.length; oi++) outdoorChunks[oi].visible = !hideOut;
  var ron = indoor && !inWWB && !!best; roam.intensity = ron ? T.base.get(roam) : 0; if(ron){ roam.position.set(best.x, best.y - 0.12, best.z); roam.target.position.set(best.x + _f.x * 0.9, best.y - 2.9, best.z + _f.z * 0.9); roam.target.updateMatrixWorld(); } };
T.fog = function(scene, outdoor){ if(!(scene.fog && scene.fog.isFogExp2)) scene.fog = new THREE.FogExp2(FOG.color, FOG.density); scene.fog.color.setHex(FOG.color); scene.fog.density = FOG.density; scene.background = outdoor ? null : T.bg; };
T.indoorLights = function(hemi, sun){ hemi.color.set(0x7a9eb0); hemi.groundColor.set(0x1a2228); hemi.intensity = 0.22; sun.intensity = 0; };
T.EXPOSURE = EXPOSURE;
/* the cast + background patients: T4's area term + shadows on the 3D figures */
T.dressFigure = function(root){ root.traverse(function(o){ if(o.isMesh && o.name !== 'proxy'){ if(o.material && o.material.isMeshStandardMaterial) withArea(o.material); if(o.isSkinnedMesh || o.parent && o.parent.isBone) o.castShadow = true; } }); };
})();

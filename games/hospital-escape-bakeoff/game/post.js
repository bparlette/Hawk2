/* Hospital Escape — post-processing: "through a wounded man's eyes".
   scene -> HDR target (+depth) -> bloom (1/4 res, bright pass + separable blur x2) -> composite:
   depth-of-field (near heroes + far field soft, focus on the fight), an always-on breathing softness that swells with
   damage, radial edge smear, double vision when hurt, chromatic fringing toward the edges, bloom, split-tone grade
   (teal shadows / sodium highlights, lifted blacks, desaturated), ACES, film grain, heavy vignette.
   Hand-written passes (three r128 core only; no copied examples/addons). */
(function(){
'use strict';
var P = window.HEPOST = {};
var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
P.create = function(renderer, scene, camera){
  var ex = renderer.extensions, hdr = renderer.capabilities.isWebGL2 ? ex.has('EXT_color_buffer_float') || ex.has('EXT_color_buffer_half_float') : ex.has('OES_texture_half_float') && ex.has('EXT_color_buffer_half_float');
  var type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;   // HDR when the GPU can render to half-float; 8-bit fallback otherwise
  var mk = function(w, h, depth){ var t = new THREE.WebGLRenderTarget(w, h, { type: type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
    if(depth){ t.depthTexture = new THREE.DepthTexture(w, h); t.depthTexture.type = THREE.UnsignedIntType; } return t; };
  var rtScene, rtA, rtB, W = 1, H = 1, scale = 1;
  var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs.add(quad); quad.frustumCulled = false;
  var bright = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, th: { value: 1.0 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722)); gl_FragColor = vec4(c * smoothstep(th, th * 2.2, l), 1.0); }' });
  var blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 s = texture2D(t, vUv).rgb * 0.2270270270;'
      + ' s += (texture2D(t, vUv + dir * 1.3846153846).rgb + texture2D(t, vUv - dir * 1.3846153846).rgb) * 0.3162162162;'
      + ' s += (texture2D(t, vUv + dir * 3.2307692308).rgb + texture2D(t, vUv - dir * 3.2307692308).rgb) * 0.0702702703; gl_FragColor = vec4(s, 1.0); }' });
  var comp = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
    uniforms: { tC: { value: null }, tD: { value: null }, tB: { value: null }, near: { value: 0.05 }, far: { value: 1500 }, res: { value: new THREE.Vector2() },
      focus: { value: 8 }, nearBlur: { value: 9 }, farBlur: { value: 5 }, soft: { value: 1.2 }, edge: { value: 6 }, hurt: { value: 0 }, dying: { value: 0 }, time: { value: 0 },
      t4: { value: 0 }, t4exp: { value: 1.06 }, exposure: { value: 1.0 }, bloom: { value: 0.9 }, shadowTint: { value: new THREE.Color(0x1d3a44) }, hiTint: { value: new THREE.Color(0xffd7a0) }, sat: { value: 0.72 }, vig: { value: 1.0 }, grain: { value: 0.06 }, kick: { value: 0 }, lidTop: { value: 0 }, lidBot: { value: 0 }, lidRed: { value: 0 }, drift: { value: 0 }, tunnel: { value: 0 },
      lookMode: { value: (window.HELOOK && window.HELOOK.post) || 0 } },
    fragmentShader: [
      'uniform float t4, t4exp; uniform sampler2D tC, tD, tB; uniform float near, far, focus, nearBlur, farBlur, soft, edge, hurt, dying, time, exposure, bloom, sat, vig, grain, kick, lidTop, lidBot, lidRed, drift, tunnel; uniform vec2 res; uniform vec3 shadowTint, hiTint; uniform float lookMode; varying vec2 vUv;',
      'float ign(vec2 p){ return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }',
      'float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'vec3 t4RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }',
      'vec3 acesT4(vec3 c){ const mat3 I = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777); const mat3 O = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602); c *= t4exp / 0.6; c = I * c; c = t4RRTAndODTFit(c); c = O * c; return clamp(c, 0.0, 1.0); }',
      'vec3 srgbT4(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }',
      'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
      'vec3 tap(vec2 uv, float ca){ if(ca < 1e-5) return texture2D(tC, uv).rgb; vec2 d = (uv - 0.5) * ca; return vec3(texture2D(tC, uv + d).r, texture2D(tC, uv).g, texture2D(tC, uv - d).b); }',
      'void main(){',
      '  vec2 c = vUv - 0.5; c.x *= res.x / res.y; float r = length(c);',
      '  float beat = clamp(0.5 + 0.28 * sin(time * 2.027) + 0.17 * sin(time * 1.337 + 1.3) + 0.12 * sin(time * 0.795 + 2.1), 0.0, 1.0);',   // slow + uneven (3.1/4.7/7.9 s)
      '  float rad = edge * smoothstep(0.28, 0.75, r) * (1.0 + hurt * 1.5);',
      '  float base = soft * (0.45 + 1.1 * beat) * (1.0 + hurt * 2.0 + dying * 3.0) * (1.0 + drift * 3.5);',   // breathing ±42%; drift = an out-of-focus episode
      '  float depth = 0.0, coc = 0.0;',
      '  if(t4 > 0.5){ rad *= hurt; base = soft * (0.45 + 1.1 * beat) * (hurt * 2.0 + dying * 3.0 + drift * 3.5); }',   // T4: crisp when healthy; damage still blurs
      '  else { depth = lin(texture2D(tD, vUv).r); coc = depth < focus ? nearBlur * clamp((focus * 0.55 - depth) / (focus * 0.55), 0.0, 1.0) : farBlur * smoothstep(focus * 1.8, focus * 7.0, depth); }',
      '  float R = max(max(coc, rad), base) / 844.0 * res.y;',                                               // radii are authored in px at 844 tall
      '  float ca = t4 > 0.5 ? hurt * 0.01 + dying * 0.012 : 0.004 + 0.012 * r * r + hurt * 0.01 + dying * 0.012;',
      '  vec3 col = (lookMode > 0.5 && lookMode < 2.5) ? texture2D(tC, vUv).rgb : tap(vUv, ca);   // retro looks: no DOF blur — chunk must stay crisp',
      '  if(R >= 0.001){',
      '    if(t4 > 0.5) depth = lin(texture2D(tD, vUv).r);',
      '    vec3 acc = col; float wsum = 1.0;',
      '    for(int i = 0; i < 12; i++){ float fi = float(i); float a = fi * 2.39996; float rr = sqrt((fi + 0.5) / 12.0) * R;',
      '      vec2 o = vec2(cos(a), sin(a)) * rr / res; vec2 uv = vUv + o;',
      '      float dd = lin(texture2D(tD, uv).r); float w = dd < depth - 0.5 && depth > focus * 0.6 ? 0.35 : 1.0;',   // limit sharp-on-blurry bleeding
      '      acc += tap(uv, ca) * w; wsum += w; }',
      '    col = acc / wsum;',
      '  }',
      '  float dv = hurt * 0.6 + dying;',                                                                     // double vision: a ghost image that drifts with the pulse
      '  if(dv > 0.01){ vec2 off = vec2(0.012 + 0.01 * beat, 0.004 * sin(time * 1.7)) * dv; col = mix(col, tap(vUv + off, ca), 0.38 * clamp(dv, 0.0, 1.0)); }',
      '  if(t4 > 0.5){ col *= 1.0 - dying * 0.35; col = srgbT4(acesT4(col)); col *= 1.0 - step(0.001, tunnel) * smoothstep(0.32 - tunnel * 0.22, 0.95 - tunnel * 0.4, r) * tunnel; }',
      '  else {',
      '  col += texture2D(tB, vUv).rgb * bloom * (1.0 + kick);',
      '  col *= exposure * (1.0 - dying * 0.35);',
      '  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));',
      '  col = mix(vec3(l), col, sat - dying * 0.4);',
      '  col = col * mix(shadowTint * 1.9, hiTint * 1.08, smoothstep(0.0, 0.9, l)) + shadowTint * 0.035;',   // split tone + lifted teal blacks
      '  col = aces(col); col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;',   // extra S-curve contrast (low-key)
      '  col = pow(col, vec3(1.0 / 2.2));',
      '  col *= 1.0 - vig * smoothstep(0.32 - tunnel * 0.22, 0.95 - tunnel * 0.4, r) * (0.85 + 0.15 * beat);',
      '  }',   // near death the tunnel closes in
      '  float lx = (vUv.x - 0.5) * 2.0; float edgeT = 1.0 - lidTop + 0.03 * lx * lx; float edgeB = lidBot - 0.03 * lx * lx;',   // eyelids: curved top + bottom edges
      '  float m = max(smoothstep(edgeT - 0.05, edgeT + 0.012, vUv.y), 1.0 - smoothstep(edgeB - 0.012, edgeB + 0.05, vUv.y));',
      '  vec3 lid = mix(vec3(0.0), vec3(0.2, 0.004, 0.004) * (0.6 + 0.4 * beat), lidRed);   // blood-black, pulsing',
      '  col = mix(col, lid, m * step(0.001, lidTop + lidBot));',
      '  col += (hash(vUv * res + time * 61.0) - 0.5) * grain * (1.0 - t4);',
      '  if(lookMode > 0.5 && lookMode < 1.5){',                                   // PS1: 15-bit colour + dither
      '    col = floor(col * 31.0 + ign(gl_FragCoord.xy)) / 31.0;',
      '  } else if(lookMode > 1.5 && lookMode < 2.5){',                          // SNES: saturated palette crush + scanlines
      '    float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l2), col, 1.3);',
      '    col = floor(col * 23.0 + ign(gl_FragCoord.xy)) / 23.0;',
      '    col *= 0.93 + 0.07 * step(0.5, fract(gl_FragCoord.y * 0.5));',
      '  } else if(lookMode > 2.5 && lookMode < 3.5){',                          // N64: warm, soft, a little lifted
      '    col = pow(col * vec3(1.07, 1.0, 0.88), vec3(0.94));',
      '  } else if(lookMode > 3.5 && lookMode < 4.5){',                          // WEB: hyper-casual bright + saturated
      '    float l3 = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = pow(col, vec3(0.8)); col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.32); col += 0.03;',
      '  } else if(lookMode > 4.5){',                                            // CEL: lift, band, saturate, outline
      '    col = pow(col, vec3(0.82)) * 1.12;',
      '    float l4 = dot(col, vec3(0.2126, 0.7152, 0.0722)); float band = floor(l4 * 3.0) / 3.0 + 0.30;',
      '    col *= clamp(band / max(l4, 0.001), 0.78, 1.5); float l5 = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l5), col, 1.35);',
      '    float dC = lin(texture2D(tD, vUv).r);',
      '    float dR = lin(texture2D(tD, vUv + vec2(1.6, 0.0) / res).r);',
      '    float dU = lin(texture2D(tD, vUv + vec2(0.0, 1.6) / res).r);',
      '    float edg = clamp((abs(dR - dC) + abs(dU - dC)) * 1.1 - 0.05, 0.0, 1.0);',
      '    col = mix(col, vec3(0.05, 0.05, 0.06), edg * 0.88);',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'].join('\n') });
  var RS = 1.0;   // internal resolution: the look is soft by design, so the scene + effects run at 60% of the drawing buffer
  function size(){ var v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); var w = Math.max(2, Math.floor(v.x * RS)), h = Math.max(2, Math.floor(v.y * RS)); if(w === W && h === H && rtScene) return; W = w; H = h;
    [rtScene, rtA, rtB].forEach(function(t){ if(t) t.dispose(); }); rtScene = mk(W, H, true); rtA = mk(Math.max(1, W >> 2), Math.max(1, H >> 2)); rtB = mk(Math.max(1, W >> 2), Math.max(1, H >> 2)); }
  function pass(mat, target){ quad.material = mat; renderer.setRenderTarget(target); renderer.render(qs, qc); }
  bright.uniforms.th.value = hdr ? 1.0 : 0.72;
  var DBG = (location.search.match(/postdbg=(\w+)/) || [])[1];   // debug views: raw | depth | bloom
  if(DBG) comp.fragmentShader = 'uniform sampler2D tC, tD, tB; uniform float near, far; varying vec2 vUv; float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); } void main(){ ' + (DBG === 'raw' ? 'gl_FragColor = vec4(pow(texture2D(tC, vUv).rgb, vec3(1.0/2.2)), 1.0);' : DBG === 'depth' ? 'gl_FragColor = vec4(vec3(lin(texture2D(tD, vUv).r) / 30.0), 1.0);' : 'gl_FragColor = vec4(texture2D(tB, vUv).rgb, 1.0);') + ' }';
  var post = { enabled: true, hdr: hdr, u: comp.uniforms,
    render: function(t){ size(); renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
      if(comp.uniforms.t4.value < 0.5){ bright.uniforms.t.value = rtScene.texture; pass(bright, rtA); }
      for(var k = 0; k < (comp.uniforms.t4.value < 0.5 ? 2 : 0); k++){ blur.uniforms.t.value = rtA.texture; blur.uniforms.dir.value.set(1 / rtA.width * (k + 1), 0); pass(blur, rtB); blur.uniforms.t.value = rtB.texture; blur.uniforms.dir.value.set(0, 1 / rtA.height * (k + 1)); pass(blur, rtA); }
      var u = comp.uniforms; u.tC.value = rtScene.texture; u.tD.value = rtScene.depthTexture; u.tB.value = rtA.texture; u.near.value = camera.near; u.far.value = camera.far; u.res.value.set(W, H); u.time.value = t;
      pass(comp, null); } };
  return post; };
})();

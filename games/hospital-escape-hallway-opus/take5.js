/* TAKE 5 — Cinematography. Route: take 1's PBR + lamps as the set, the look carried by camera + atmosphere: a real planar reflection on a
   freshly-mopped floor (three.js Reflector from the pinned CDN, blended over the tile by Fresnel), corridor haze (fog) with soft light cones
   under every lamp, a warm practical at the nurses' station, one failing tube that flickers, a night grade (cool shadows / warm practicals),
   shallow focus pulled down the hall. */
(function(){ var base = window.__HALL_TAKE;
window.__HALL_TAKE = function(H){ base(H); var R = +(new URLSearchParams(location.search).get('r5') || 9), V = H.V, z = H.zone, x0 = z.a[0], y = z.y, L = Math.abs(z.b[1] - z.a[1]), zc = (z.a[1] + z.b[1]) / 2;
  // 1 wet-floor reflection (r1: full mirror over WWB; r2+: Fresnel-blended, lower res, slight blur via mip)
  if(THREE.Reflector){ var rg = new THREE.PlaneGeometry(z.w - 0.02, L), mir = new THREE.Reflector(rg, { textureWidth: R >= 2 ? 256 : 512, textureHeight: R >= 2 ? 1024 : 2048, color: 0x8a9196, clipBias: 0.003 });
    mir.rotation.x = -Math.PI / 2; mir.position.set(x0, y + 0.004, zc); mir.material.transparent = true; mir.material.depthWrite = false; mir.renderOrder = 3;
    mir.material.fragmentShader = mir.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
      R >= 2 ? 'gl_FragColor = vec4( base.rgb * color * 1.2, 0.42 );' : 'gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.65 );');
    mir.raycast = function(){}; H.root.add(mir); H.mirror = mir; }
  // 2 haze + light cones (additive, depth-tested, no depth write)
  var lamps = []; H.parts.panel.forEach(function(pm){ var pa = pm.geometry.attributes.position; for(var i = 0; i + 6 <= pa.count; i += 6){ var c = new V(); for(var k = 0; k < 6; k++) c.add(new V().fromBufferAttribute(pa, i + k)); lamps.push(c.multiplyScalar(1 / 6)); } });
  if(R >= 2){ var cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; var x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,236,205,0.55)'); gr.addColorStop(1, 'rgba(255,236,205,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
    var side = x.createLinearGradient(0, 0, 64, 0); side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = side; x.fillRect(0, 0, 64, 128);
    var ct = new THREE.CanvasTexture(cv), cm = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: R >= 3 ? 0.11 : 0.18, fog: false });
    lamps.forEach(function(Lp){ var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.25, z.h - 0.05, 16, 1, true), cm); cone.position.copy(Lp).add(new V(0, -(z.h - 0.05) / 2, 0)); cone.raycast = function(){}; cone.renderOrder = 4; H.root.add(cone); }); }
  // 3 practicals: warm desk lamp at the station, one failing tube (flicker) near the far end
  var desk = new THREE.PointLight(0xffa24a, R >= 3 ? 1.6 : 2.4, 4.5, 2); desk.position.set(x0 - z.w / 2 + 0.75, y + 1.35, z.station.z); H.root.add(desk);
  var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1.1) })); bulb.position.copy(desk.position); H.root.add(bulb);
  var failing = lamps.reduce(function(a, p){ return Math.abs(p.z + 37) < Math.abs(a.z + 37) && Math.abs(p.x - x0) < 0.3 ? p : a; }, lamps[0]), fl = null;
  H.root.traverse(function(o){ if(o.isPointLight && o !== desk && o.position.distanceTo(failing) < 0.7) fl = o; });
  if(R >= 4){ H.root.traverse(function(o){ if(o.isPointLight && o !== desk) o.intensity *= 0.5; }); desk.intensity = 2.2; }   // r4: night shift — corridor tubes at half, the practicals carry the frame
  var flBase = fl ? fl.intensity : 0;
  // 4 grade + focus + haze, per frame (flicker on a deterministic pseudo-random sequence)
  H.focus = 9; H.soft = 0.7;
  H.post = function(u, t){ var s = performance.now() / 1000, on = (Math.sin(s * 23.1) + Math.sin(s * 7.7) > 1.2) ? 0.15 : 1;
    if(fl) fl.intensity = flBase * on; u.exposure.value = R >= 4 ? 0.7 : R >= 3 ? 0.5 : 0.56; u.bloom.value = R >= 3 ? 0.8 : 0.7; u.sat.value = 0.7;
    u.shadowTint.value.setHex(0x173844); u.hiTint.value.setHex(0xffcf94);
    if(H.scene.fog){ H.scene.fog.color.setHex(0x182227); H.scene.fog.near = R >= 3 ? 3 : 5; H.scene.fog.far = R >= 3 ? 26 : 34; } };
};
})();

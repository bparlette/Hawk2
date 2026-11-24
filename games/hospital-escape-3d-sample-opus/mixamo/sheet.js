/* args: {glb, body, clips:[[name, [t...]]], out, cell:[w,h], yaw} */
var V = THREE.Vector3, body = await ld(args.body), cl = await ld(args.glb), rows = args.clips, cols = 0; rows.forEach(function(r){ cols = Math.max(cols, r[1].length); });
var W = args.cell[0], H = args.cell[1], cv = document.createElement('canvas'); cv.width = W * cols; cv.height = H * rows.length; var ctx = cv.getContext('2d'); ctx.fillStyle = '#222'; ctx.fillRect(0, 0, cv.width, cv.height);
var R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.outputEncoding = THREE.sRGBEncoding;
var sc = new THREE.Scene(); sc.background = new THREE.Color(0x3a4048); sc.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.0)); var dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 4, 3); sc.add(dl);
var m = body.scene; sc.add(m); m.updateMatrixWorld(true); var bb = new THREE.Box3().setFromObject(m), hgt = bb.max.y - bb.min.y, k = 1.8 / hgt; m.scale.setScalar(k); m.position.y = -bb.min.y * k;
m.traverse(function(o){ if(o.isMesh) o.frustumCulled = false; });
var grid = new THREE.GridHelper(6, 12, 0x888888, 0x555555); sc.add(grid);
var cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 50), yaw = args.yaw || 0.6; cam.position.set(Math.sin(yaw) * 4.2, 1.3, Math.cos(yaw) * 4.2); cam.lookAt(0, 0.9, 0);
var mx = new THREE.AnimationMixer(m), byName = {}; cl.animations.forEach(function(a){ byName[a.name] = a; });
for(var r = 0; r < rows.length; r++){ var c = byName[rows[r][0]]; if(!c) continue; mx.stopAllAction(); var a = mx.clipAction(c); a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  for(var j = 0; j < rows[r][1].length; j++){ mx.setTime(rows[r][1][j] * c.duration); R.render(sc, cam); ctx.drawImage(R.domElement, j * W, r * H); ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.fillText(rows[r][0] + ' ' + rows[r][1][j], j * W + 3, r * H + 12); } }
return { __files: (function(){ var o = {}; o[args.out] = cv.toDataURL('image/png').split(',')[1]; return o; })() };

// Scaggsville 3D — world module.
// Geometry + data contract built together (gamepress THREE-WORLD-MODULE pattern):
// every solid registers its collider in the same code path that creates its mesh.
//
// Map fidelity: ALL road polylines, building footprints, parking lots and
// cul-de-sac discs come from src/data.js, extracted from the real OSM map of
// Laurel/Fulton MD via the old game's baked data (see data.js header).
// Frame: meters, origin at Brad's house site, x = east, z = south.
//
// Seam (host contract):
//   buildWorld(scene, configOverrides?) -> {
//     groundAt(x,z),            // 0 everywhere (flat MD Piedmont slice)
//     surfaceAt(x,z),           // 'road' | 'lot' | 'grass'
//     colliders: [{cx,cz,hw,hd,cos,sin,top,type}],
//     stops,                    // rally stops from data (spawn = stops[0] unless picker changes it)
//     route,                    // real route polyline [[x,z],...]
//     spawn: {x, z, heading},   // Brad, on Stansfield Road facing the Floyds leg
//     config, lighting,
//     target: { setStop(stop),  // move the guidance beacon
//               joinCar(id) },  // (visual only; convoy cars live in host)
//   }
//   applyWorldEnvMap(renderer, scene)  // PMREM env from the sky dome, 0 draws
import * as THREE from 'three';
import { WORLD_DATA } from '../data.js';
import { makeTextures } from './textures.js';
import { buildRoads } from './roads.js';
import { buildHouses, houseMaterials, buildLitWindows } from './houses.js';
import { buildVegetation } from './vegetation.js';

export const WORLD_CONFIG = {
  treeDensity: 1.0,        // multiplier on scattered trees
  poleSpacing: 34,         // m between utility poles along the route
  lampSpacing: 68,         // m between streetlights along the route
  parkedCars: 42,          // ambient parked cars on crew streets / lots
  windowGlow: 0.85,        // fallback only — the active preset's dressing.windowGlow drives lit windows
  houseDetailRadius: 420,  // m from route/stops where houses get window quads
  vegCullDistance: 760,    // m: vegetation chunks beyond this are not drawn (fog hides them)
};

export const LIGHTING_PRESETS = {
  golden: { // GOLDEN HOUR — one hour before sunset (Cherie, Nov 20): the
    // sun is still well up (~25 deg) and warm gold, the sky stays blue
    // overhead and only warms near the horizon, shadows are long but not
    // sunset-long, and the dusk dressing is off — windows dark, street
    // lamps not yet on, headlight beams a soft presence, not the show.
    renderer: { toneMapping: 'ACESFilmic', exposure: 1.18, outputColorSpace: 'SRGB' },
    sun: { color: 0xffbe78, intensity: 2.6, dir: [-0.58, 0.34, 0.42] }, // WSW sun ~25 deg up: shadows rake ahead-left driving north
    hemi: { sky: 0x9ec2f2, ground: 0x77624e, intensity: 1.35 },
    ambient: { color: 0x87a3cc, intensity: 0.65 },
    fog: { color: 0xd9b48c, near: 80, far: 700 },
    sky: { zen: [0.22, 0.42, 0.74], mid: [0.47, 0.62, 0.85], hor: [0.99, 0.76, 0.47] },
    dressing: { windowGlow: 0.12, lampGlow: 0.0 },
    beamIntensity: 90,
  },
  dusk: { // BLUE HOUR — the GTA VI reference grade (Nov 20): deep blue
    // ambient, a low warm sun remnant, lit windows + streetlight pools
    // carrying the warmth, wet-look roads reflecting the sky.
    renderer: { toneMapping: 'ACESFilmic', exposure: 1.26, outputColorSpace: 'SRGB' },
    sun: { color: 0xff9a5e, intensity: 1.85, dir: [-0.58, 0.16, 0.42] },
    hemi: { sky: 0x46689e, ground: 0x2e3038, intensity: 1.7 },
    ambient: { color: 0x3d5a8c, intensity: 1.0 },
    fog: { color: 0x35496b, near: 60, far: 640 },
    sky: { zen: [0.10, 0.20, 0.46], mid: [0.27, 0.42, 0.68], hor: [0.97, 0.55, 0.30] },
    dressing: { windowGlow: 0.85, lampGlow: 0.42 },
    beamIntensity: 200,
  },
};
export const WORLD_LIGHTING = LIGHTING_PRESETS.golden;

// ---------- deterministic RNG ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand = mulberry32(20261120);

// ---------- merge-by-material batching ----------
class Buckets {
  // merge-by-material, split into BUCKET_CHUNK m spatial tiles so frustum + shadow culling can skip
  // whole districts (one whole-map mesh per material was drawn in full, twice with shadows, every frame)
  constructor(chunk=900){ this.map=new Map(); this.chunk=chunk; }
  add(key, geo, matrix, color){
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    if(color){
      const n=g.attributes.position.count, arr=new Float32Array(n*3), c=new THREE.Color(color);
      for(let i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr,3));
    }
    const pa=g.attributes.position.array, C=this.chunk;
    const tile=Math.floor(pa[0]/C)+','+Math.floor(pa[2]/C);
    const k=key+'@'+tile;
    if(!this.map.has(k)) this.map.set(k,{ key, geos:[] });
    this.map.get(k).geos.push(g);
  }
  build(scene, materials, shadows){
    let meshes=0;
    for(const [, {key, geos}] of this.map){
      let total=0; for(const g of geos) total+=g.attributes.position.count;
      const pos=new Float32Array(total*3), nor=new Float32Array(total*3), uv=new Float32Array(total*2), col=new Float32Array(total*3);
      let o=0;
      for(const g of geos){
        const n=g.attributes.position.count;
        if(!g.attributes.normal) g.computeVertexNormals();
        pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3);
        if(g.attributes.uv) uv.set(g.attributes.uv.array, o*2);
        if(g.attributes.color) col.set(g.attributes.color.array, o*3); else col.fill(1, o*3, (o+n)*3);
        o+=n; g.dispose();
      }
      const merged=new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos,3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor,3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uv,2));
      merged.setAttribute('color', new THREE.BufferAttribute(col,3));
      merged.computeBoundingSphere();
      const mesh=new THREE.Mesh(merged, materials[key]);
      if(shadows && shadows[key]){ mesh.castShadow=true; mesh.receiveShadow=true; }
      else mesh.receiveShadow=true;
      mesh.matrixAutoUpdate=false; mesh.name='world_'+key; scene.add(mesh); meshes++;
    }
    return meshes;
  }
}
const M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), SV=new THREE.Vector3(1,1,1);
function mat(x,y,z,ry=0,sx=1,sy=1,sz=1){ E.set(0,ry,0); Q.setFromEuler(E); V.set(x,y,z); SV.set(sx,sy,sz); return new THREE.Matrix4().compose(V,Q,SV); }
const BOX=new THREE.BoxGeometry(1,1,1);
const PLANE=new THREE.PlaneGeometry(1,1); PLANE.rotateX(-Math.PI/2);

// ---------- sky dome (GLSL, Neon pattern) ----------
const SKY_VERT=`varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const SKY_FRAG=`
  varying vec3 vDir; uniform vec3 uSunDir; uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor;
  void main(){
    float h = clamp(vDir.y, -0.08, 1.0);
    vec3 col = mix(uHor, uMid, smoothstep(0.0,0.16,h));
    col = mix(col, uZen, smoothstep(0.10,0.55,h));
    float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    col += vec3(1.0,0.52,0.24)*pow(s, 90.0)*0.9;    // sun disc glow
    col += vec3(1.0,0.55,0.26)*pow(s, 7.0)*0.20;    // warm haze around sun
    float wisp = sin(vDir.x*14.0 + vDir.y*40.0)*sin(vDir.z*11.0 - vDir.y*30.0);
    col += vec3(1.0,0.8,0.7)*smoothstep(0.55,0.95,wisp)*0.05*smoothstep(0.02,0.2,h);
    gl_FragColor = vec4(col, 1.0);
  }`;
export function makeSkyDome(){
  const sky = WORLD_LIGHTING.sky || LIGHTING_PRESETS.dusk.sky;
  const m=new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{ uSunDir:{ value:new THREE.Vector3(...WORLD_LIGHTING.sun.dir).normalize() },
      uZen:{ value:new THREE.Vector3(...sky.zen) }, uMid:{ value:new THREE.Vector3(...sky.mid) },
      uHor:{ value:new THREE.Vector3(...sky.hor) } },
    vertexShader:SKY_VERT, fragmentShader:SKY_FRAG });
  const dome=new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 14), m);
  dome.name='skyDome'; dome.frustumCulled=false; dome.renderOrder=-10;
  return dome;
}
export function applyWorldEnvMap(renderer, scene){
  // PMREM from a throwaway scene holding only the sky dome: free reflections, 0 draws in game.
  const pmrem=new THREE.PMREMGenerator(renderer);
  const s=new THREE.Scene(); const d=makeSkyDome(); s.add(d);
  const rt=pmrem.fromScene(s, 0.04);
  scene.environment=rt.texture;
  d.geometry.dispose(); pmrem.dispose();
  return rt;
}

// ---------- geometry helpers ----------
function ribbon(bucket, key, pts, width, y, color, uvScale=0.14){
  // flat ribbon along a polyline (x,z), triangulated strip in the bucket's local arrays
  const positions=[], normals=[], uvs=[], colors=[];
  const c = color? new THREE.Color(color): null;
  let dist=0;
  const P=pts.map(p=>({x:p[0], z:p[1]}));
  const left=[], right=[];
  for(let i=0;i<P.length;i++){
    const a=P[Math.max(0,i-1)], b=P[Math.min(P.length-1,i+1)];
    let dx=b.x-a.x, dz=b.z-a.z; const L=Math.hypot(dx,dz)||1; dx/=L; dz/=L;
    const nx=-dz, nz=dx, hw=width/2;
    left.push([P[i].x+nx*hw, P[i].z+nz*hw]); right.push([P[i].x-nx*hw, P[i].z-nz*hw]);
    if(i>0) dist+=Math.hypot(P[i].x-P[i-1].x, P[i].z-P[i-1].z);
    P[i].d=dist;
  }
  const idx=[];
  for(let i=0;i<P.length;i++){
    positions.push(left[i][0],y,left[i][1], right[i][0],y,right[i][1]);
    normals.push(0,1,0, 0,1,0);
    uvs.push(0,P[i].d*uvScale, 1,P[i].d*uvScale);
    if(c) colors.push(c.r,c.g,c.b, c.r,c.g,c.b);
    // winding: (L0,L1,R0),(R0,L1,R1) — geometric normal +Y for travel in +z;
    // the original order faced DOWN and the strips were backface-culled from above.
    if(i>0){ const b0=(i-1)*2; idx.push(b0,b0+2,b0+1, b0+1,b0+2,b0+3); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  if(c) g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(idx);
  bucket.add(key, g, new THREE.Matrix4());
}
function flatPoly(bucket, key, pts, y, color){
  // fan-triangulated flat polygon (convex-ish footprints/lots)
  const shape=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])));
  const g=new THREE.ShapeGeometry(shape); g.rotateX(Math.PI/2); // shape XY -> XZ (y south kept via rotateX(+90): (x, y) -> (x, 0, y)? verify: rotateX(pi/2) maps +Y to +Z... point (x,y,0)->(x,0,y) yes with rotateX(-pi/2)?? handled by winding check below
  // ShapeGeometry lies in XY facing +Z; rotateX(-90deg) puts it in XZ facing +Y but flips z sign; use rotateX(+90) and accept facing -Y then flip:
  // Simpler: rebuild manually.
  g.dispose();
  const positions=[], uvs=[];
  const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length, cz=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  for(let i=0;i<pts.length;i++){
    const a=pts[i], b=pts[(i+1)%pts.length];
    positions.push(cx,y,cz, a[0],y,a[1], b[0],y,b[1]);
    uvs.push(cx*0.05,cz*0.05, a[0]*0.05,a[1]*0.05, b[0]*0.05,b[1]*0.05);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  const nor=new Float32Array((positions.length/3)*3);
  for(let i=0;i<nor.length;i+=3){ nor[i]=0; nor[i+1]=1; nor[i+2]=0; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor,3));
  bucket.add(key, geo, new THREE.Matrix4(), color);
}

// ---------- main build ----------
export function buildWorld(scene, overrides=null){
  const cfg=Object.assign({}, WORLD_CONFIG, overrides||{});
  // lit-window fraction follows the active lighting preset (dusk dressing)
  // unless a caller explicitly overrides it
  if(!overrides || overrides.windowGlow===undefined)
    cfg.windowGlow = WORLD_LIGHTING.dressing.windowGlow;
  // Lane A (day/night cycle): window QUADS are baked at the max fraction any
  // preset wants lit (0.85) and the 'litWindows' mesh material colour is the
  // live dimmer — dark tint = unlit windows by day/golden hour, full colour
  // = lit at dusk/night. Static callers (preview) get the active preset's
  // tint set at build time below, so their look is unchanged.
  const bakeGlow = Math.max(cfg.windowGlow, 0.85);
  const D=WORLD_DATA;
  const _t0=performance.now(), timings={}; let _tl=_t0; const lap=(k)=>{ const n=performance.now(); timings[k]=Math.round(n-_tl); _tl=n; };
  const tex=makeTextures(); lap('textures');
  const hm=houseMaterials(tex);
  const mats={
    ...hm,
    concrete:new THREE.MeshStandardMaterial({ map:tex.concrete, roughness:0.95, vertexColors:true }),
    sidewalk:new THREE.MeshStandardMaterial({ map:tex.concrete, roughness:0.93, vertexColors:true }),
    shoulder:new THREE.MeshStandardMaterial({ map:tex.asphalt, color:0x9c9686, roughness:1, vertexColors:true }),
    drive:   new THREE.MeshStandardMaterial({ map:tex.concrete, roughness:0.92, vertexColors:true }),
    glass:   new THREE.MeshStandardMaterial({ color:0x2c3846, roughness:0.25, metalness:0.6 }),
    litwin:  new THREE.MeshBasicMaterial({ vertexColors:true }),
    pole:    new THREE.MeshStandardMaterial({ color:0x5a4c3e, roughness:1, vertexColors:true }),
    metal:   new THREE.MeshStandardMaterial({ color:0x8d939a, roughness:0.45, metalness:0.7, vertexColors:true }),
    mailbox: new THREE.MeshStandardMaterial({ roughness:0.5, metalness:0.3, vertexColors:true }),
    wire:    new THREE.LineBasicMaterial({ color:0x1e2126 }),
    beacon:  new THREE.MeshBasicMaterial({ color:0xffd23f, transparent:true, opacity:0.30, depthWrite:false }),
  };
  scene.environmentIntensity = 0.95;

  const B=new Buckets(900);
  const colliders=[];
  const roadCells=new Map(); // surface grid (host driving semantics, unchanged): "cx,cz" (12 m) -> 'road'|'lot'
  const cellKey=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
  function markRoad(x,z,kind){ roadCells.set(cellKey(x,z), kind); }
  function rasterize(pts, halfW, kind){
    for(let i=0;i<pts.length-1;i++){
      const [ax,az]=pts[i],[bx,bz]=pts[i+1]; const L=Math.hypot(bx-ax,bz-az), steps=Math.max(1,Math.ceil(L/6));
      for(let s=0;s<=steps;s++){ const x=ax+(bx-ax)*s/steps, z=az+(bz-az)*s/steps;
        for(let ox=-halfW;ox<=halfW;ox+=6) for(let oz=-halfW;oz<=halfW;oz+=6) markRoad(x+ox,z+oz,kind); }
    }
  }
  for(const r of D.roads) rasterize(r.pts, r.w/2, 'road');
  for(const c of D.cds) markRoad(c.x,c.z,'road');
  for(const p of D.parking){ const cx=p.pts.reduce((s,q)=>s+q[0],0)/p.pts.length, cz=p.pts.reduce((s,q)=>s+q[1],0)/p.pts.length;
    for(let ox=-40;ox<=40;ox+=10) for(let oz=-40;oz<=40;oz+=10) markRoad(cx+ox,cz+oz,'lot'); }

  // ---- ground: world-space grass with macro tone variation (no visible tiling at any distance) ----
  const grassMat=new THREE.MeshStandardMaterial({ map:tex.grass, roughness:1.0, envMapIntensity:0.3 });
  grassMat.onBeforeCompile=(sh)=>{
    sh.uniforms.uMacro={ value:tex.macro };
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWPos=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uMacro; varying vec3 vWPos;')
      .replace('#include <map_fragment>',`
  vec2 wp=vWPos.xz;
  vec3 g1=texture2D(map, wp/3.2).rgb, g2=texture2D(map, wp/13.7+0.31).rgb;
  float m1=texture2D(uMacro, wp/420.0).r, m2=texture2D(uMacro, wp/97.0+0.5).r;
  vec3 g=mix(g1,g2,0.38);
  vec3 lush=vec3(0.82,0.92,0.70), dry=vec3(1.16,1.02,0.66), dark=vec3(0.68,0.78,0.60);
  vec3 tone=mix(lush, dry, smoothstep(0.42,0.72,m1));
  tone=mix(tone, dark, smoothstep(0.55,0.85,m2)*0.6);
  vec3 gc=g*tone;
  gc=mix(vec3(dot(gc, vec3(0.299,0.587,0.114))), gc, 0.74);   // late-summer Maryland, not golf-course green
  diffuseColor.rgb *= gc;`);
  };
  grassMat.customProgramCacheKey=()=>'sv3d-grass-v2';
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(9800,11800), grassMat);
  ground.rotation.x=-Math.PI/2; ground.position.set(-350,0,-2250);
  ground.receiveShadow=true; ground.name='ground';
  scene.add(ground);

  // ---- roads: shader-marked surface, curbs + sidewalks, shoulders ----
  const roads=buildRoads(scene, D, tex, B); lap('roads');

  // ---- houses on the real footprints ----
  const routePts=D.route;
  function nearRoute(x,z,r){
    for(let i=0;i<routePts.length;i+=3){ const dx=routePts[i][0]-x, dz=routePts[i][1]-z; if(dx*dx+dz*dz<r*r) return true; }
    return false;
  }
  const H=buildHouses({ D, B, roads, rand, cfg, nearRoute }); lap('houses');
  colliders.push(...H.colliders);
  const winQuads=H.winQuads;
  // ---- contact shadow skirts: soft darkening where every house meets the ground (one draw) ----
  { const P=[], Cc=[];
    for(const c of H.colliders){ if(c.hw*c.hd*4>4000) continue;
      const ex=[c.cos,-c.sin], ez=[c.sin,c.cos], W=(lx,lz)=>[c.cx+ex[0]*lx+ez[0]*lz, 0.03, c.cz+ex[1]*lx+ez[1]*lz];
      const ring=[[c.hw,c.hd],[-c.hw,c.hd],[-c.hw,-c.hd],[c.hw,-c.hd]], o=1.7;
      for(let i=0;i<4;i++){ const a=ring[i], b=ring[(i+1)%4];
        const ia=W(a[0],a[1]), ib=W(b[0],b[1]), oa=W(a[0]+Math.sign(a[0])*o, a[1]+Math.sign(a[1])*o), ob=W(b[0]+Math.sign(b[0])*o, b[1]+Math.sign(b[1])*o);
        P.push(...ia,...ib,...ob, ...ia,...ob,...oa); Cc.push(0,0,0,0.42, 0,0,0,0.42, 0,0,0,0, 0,0,0,0.42, 0,0,0,0, 0,0,0,0); } }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,4));
    const m=new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1, fog:true }));
    m.name='contactShadows'; m.renderOrder=1; m.matrixAutoUpdate=false; scene.add(m); }
  // driveways (garage -> real road) + a mailbox at the kerb
  const mbPost=new THREE.BoxGeometry(0.09,1.05,0.09); mbPost.translate(0,0.52,0);
  const mbBox=new THREE.CylinderGeometry(0.15,0.15,0.48,10,1,false,0,Math.PI); mbBox.rotateZ(Math.PI/2); mbBox.rotateY(Math.PI/2); mbBox.translate(0,1.12,0);
  const mbBase=new THREE.BoxGeometry(0.3,0.16,0.48); mbBase.translate(0,1.06,0);
  const MBC=['#1f2228','#2a3a52','#f0eee8','#7a1f24'];
  for(const d of H.drives){
    ribbon(B,'drive', [d.a,d.b], d.w, 0.08);
    const vx=d.b[0]-d.a[0], vz=d.b[1]-d.a[1], L=Math.hypot(vx,vz)||1, nx=-vz/L, nz=vx/L;
    const mx=d.b[0]-vx/L*1.2+nx*(d.w/2+0.7), mz=d.b[1]-vz/L*1.2+nz*(d.w/2+0.7), h=Math.atan2(vx,vz);
    if(!roads.index.paved(mx,mz)){ B.add('pole', mbPost, mat(mx,0,mz,h), '#c9c2b4'); const c=MBC[Math.floor(rand()*MBC.length)]; B.add('mailbox', mbBox, mat(mx,0,mz,h), c); B.add('mailbox', mbBase, mat(mx,0,mz,h), c); }
  }
  // ---- Atholton dressing: flag pole + sign ----
  const ath=D.stops[D.stops.length-1];
  B.add('metal', new THREE.CylinderGeometry(0.09,0.12,11,6), mat(ath.hx+14, 5.5, ath.hz+6), '#ffffff');
  B.add('litwin', BOX, mat(ath.hx+14, 10.2, ath.hz+6.4, 0, 2.6,1.6,0.08), 0x3050a0);
  B.add('litwin', BOX, mat(ath.hx+14, 10.2, ath.hz+6.4, 0, 2.6,0.55,0.09), 0xd84040);

  // ---- utility poles + sagging wires along the route; streetlights ----
  const poleG=new THREE.CylinderGeometry(0.11,0.14,7.6,5); poleG.translate(0,3.8,0);
  const armG=new THREE.BoxGeometry(1.7,0.09,0.09); armG.translate(0.8,7.35,0);
  const bulbG=new THREE.BoxGeometry(0.5,0.08,0.22);
  const wirePts=[]; let prevPole=null;
  const lampPts=[]; // streetlight head positions -> warm pools + halos below
  let routeAcc=0;
  for(let i=0;i<routePts.length-1;i++){
    const [ax,az]=routePts[i],[bx,bz]=routePts[i+1]; const L=Math.hypot(bx-ax,bz-az);
    let s=cfg.poleSpacing-(routeAcc%cfg.poleSpacing);
    while(s<L){
      const t=s/L, x=ax+(bx-ax)*t, z=az+(bz-az)*t;
      const dx=(bz-az)/(L||1), dz=-(bx-ax)/(L||1);
      const px=x+dx*7.4, pz=z+dz*7.4;
      if(!roadCells.has(cellKey(px,pz))){
        B.add('pole', poleG, mat(px,0,pz, Math.atan2(bx-ax,bz-az)), '#ffffff');
        B.add('pole', armG, mat(px,0,pz, Math.atan2(bx-ax,bz-az)+Math.PI/2), '#ffffff');
        if(prevPole){
          const mx=(px+prevPole[0])/2, mz=(pz+prevPole[1])/2;
          for(let k=0;k<3;k++){ const off=k*0.35;
            wirePts.push(prevPole[0],7.5-off,prevPole[1], mx,6.9-off,mz, mx,6.9-off,mz, px,7.5-off,pz); }
        }
        prevPole=[px,pz];
      }
      s+=cfg.poleSpacing;
    }
    // streetlight every lampSpacing (opposite side)
    let s2=cfg.lampSpacing-(routeAcc%cfg.lampSpacing);
    while(s2<L){
      const t=s2/L, x=ax+(bx-ax)*t, z=az+(bz-az)*t;
      const dx=(bz-az)/(L||1), dz=-(bx-ax)/(L||1);
      const px=x-dx*6.4, pz=z-dz*6.4, hd=Math.atan2(bx-ax,bz-az);
      B.add('metal', poleG, mat(px,0,pz,hd, 0.75,1.05,0.75), '#ffffff');
      B.add('metal', armG, mat(px,0,pz,hd-Math.PI/2), '#ffffff');
      B.add('litwin', bulbG, mat(px-dx*1.4,7.32,pz-dz*1.4, hd), 0xffd9a0);
      lampPts.push([px-dx*1.4, pz-dz*1.4]);
      s2+=cfg.lampSpacing;
    }
    routeAcc+=L;
  }
  const wireGeo=new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePts,3));
  const wires=new THREE.LineSegments(wireGeo, mats.wire); wires.frustumCulled=false; scene.add(wires);

  // ---- guidance beacon (host moves it to the current target) ----
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,46,12,1,true), mats.beacon);
  beacon.position.set(D.stops[1].sx, 23, D.stops[1].sz); beacon.name='beacon'; scene.add(beacon);
  const beaconRing=new THREE.Mesh(new THREE.RingGeometry(3.4,4.3,28), new THREE.MeshBasicMaterial({color:0xffd23f, transparent:true, opacity:0.85, side:THREE.DoubleSide}));
  beaconRing.rotation.x=-Math.PI/2; beaconRing.position.set(D.stops[1].sx, 0.12, D.stops[1].sz); scene.add(beaconRing);

  // sky + fog
  const dome=makeSkyDome(); scene.add(dome);
  scene.fog=new THREE.Fog(WORLD_LIGHTING.fog.color, WORLD_LIGHTING.fog.near, WORLD_LIGHTING.fog.far);

  lap('props'); B.build(scene, mats, { wallSiding:true, wallBrick:true, wallBlank:true, store:true, roof:true, flatRoof:true, trim:true, found:true, chimney:true, door:true, garage:true, pole:true, metal:true, mailbox:true });
  lap('merge'); const veg=buildVegetation({ scene, roads, colliders, drives:H.drives, D, cfg, T:tex }); lap('vegetation');
  const winMesh = buildLitWindows(scene, winQuads);
  // initial lit tint from the active preset (the day/night cycle re-tints
  // this material every frame in-game; static callers keep this look)
  if(winMesh) winMesh.material.color.setScalar(0.16 + 0.84 * Math.min(1, WORLD_LIGHTING.dressing.windowGlow));
  buildLampGlow(scene, lampPts, WORLD_LIGHTING.dressing.lampGlow);

  return {
    groundAt: (x,z)=>0,
    surfaceAt: (x,z)=> roadCells.get(cellKey(x,z)) || 'grass',
    colliders,
    stops: D.stops,
    route: D.route,
    spawn: (()=>{ const s=D.stops[0]; return { x:s.sx, z:s.sz, heading:s.heading }; })(),
    config: cfg,
    lighting: WORLD_LIGHTING,
    stats: { ...H.stats, ...veg.stats, ...roads.stats, timings, buildMs: Math.round(performance.now()-_t0) },
    target: {
      setStop(stop){ beacon.position.set(stop.sx,23,stop.sz); beaconRing.position.set(stop.sx,0.12,stop.sz); },
      beacon, beaconRing,
    },
  };
}

function buildLampGlow(scene, pts, opacity=0.42){
  // streetlight dressing at blue hour, ONE merged additive mesh: a warm pool
  // on the wet road under each lamp + a crossed halo card at the lamp head.
  // Lane A: the mesh is ALWAYS built (when lamps exist) and its opacity /
  // visibility is the live control — the day/night cycle fades it from 0 at
  // golden hour up through dusk/night. Static callers pass the active
  // preset's opacity (0 at golden -> mesh hidden, look unchanged).
  if(!pts.length) return;
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g2=c.getContext('2d');
  const gr=g2.createRadialGradient(64,64,2,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.4)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g2.fillStyle=gr; g2.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c);
  const geos=[];
  const poolG=new THREE.PlaneGeometry(10.5,10.5); poolG.rotateX(-Math.PI/2);
  const glowA=new THREE.PlaneGeometry(2.6,1.5);
  const glowB=new THREE.PlaneGeometry(2.6,1.5); glowB.rotateY(Math.PI/2);
  const Q2=new THREE.Quaternion(), E2=new THREE.Euler(), V2=new THREE.Vector3(), S2=new THREE.Vector3(1,1,1);
  const put=(src,x,y,z)=>{ E2.set(0,0,0); Q2.setFromEuler(E2); V2.set(x,y,z); const gg=src.clone(); gg.applyMatrix4(new THREE.Matrix4().compose(V2,Q2,S2)); geos.push(gg.index?gg.toNonIndexed():gg); };
  for(const [x,z] of pts){ put(poolG, x, 0.075, z); put(glowA, x, 7.28, z); put(glowB, x, 7.28, z); }
  let total=0; for(const g of geos) total+=g.attributes.position.count;
  const pos=new Float32Array(total*3), nor=new Float32Array(total*3), uv=new Float32Array(total*2), col=new Float32Array(total*3);
  const tint=new THREE.Color(0xffb46a);
  let o=0;
  for(const g of geos){ const n=g.attributes.position.count;
    pos.set(g.attributes.position.array,o*3); nor.set(g.attributes.normal.array,o*3);
    if(g.attributes.uv) uv.set(g.attributes.uv.array,o*2);
    for(let i=0;i<n;i++){ col[(o+i)*3]=tint.r; col[(o+i)*3+1]=tint.g; col[(o+i)*3+2]=tint.b; }
    o+=n; g.dispose(); }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor,3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  const mesh=new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map:tex, vertexColors:true, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }));
  mesh.renderOrder=2; mesh.matrixAutoUpdate=false; mesh.name='lampGlow'; mesh.visible = opacity>0.01; scene.add(mesh);
}

export default buildWorld;

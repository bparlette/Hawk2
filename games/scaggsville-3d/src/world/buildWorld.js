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

export const WORLD_CONFIG = {
  treeDensity: 1.0,        // multiplier on scattered trees
  poleSpacing: 34,         // m between utility poles along the route
  lampSpacing: 68,         // m between streetlights along the route
  parkedCars: 42,          // ambient parked cars on crew streets / lots
  windowGlow: 0.85,        // fraction of windows lit at dusk
  houseDetailRadius: 420,  // m from route/stops where houses get window quads
};

export const LIGHTING_PRESETS = {
  golden: { // the original golden-hour look
    renderer: { toneMapping: 'ACESFilmic', exposure: 1.15, outputColorSpace: 'SRGB' },
    sun: { color: 0xffb38a, intensity: 2.35, dir: [-0.58, 0.30, 0.42] }, // low WSW sun: shadows rake ahead-left driving north
    hemi: { sky: 0xa0c8f6, ground: 0x60586c, intensity: 1.5 },
    ambient: { color: 0x5c74a2, intensity: 0.9 },
    fog: { color: 0x8d82a3, near: 60, far: 620 },
  },
  dusk: { // BLUE HOUR — the GTA VI reference grade (Nov 20): deep blue
    // ambient, a low warm sun remnant, lit windows + streetlight pools
    // carrying the warmth, wet-look roads reflecting the sky.
    renderer: { toneMapping: 'ACESFilmic', exposure: 1.26, outputColorSpace: 'SRGB' },
    sun: { color: 0xff9a5e, intensity: 1.85, dir: [-0.58, 0.16, 0.42] },
    hemi: { sky: 0x46689e, ground: 0x2e3038, intensity: 1.7 },
    ambient: { color: 0x3d5a8c, intensity: 1.0 },
    fog: { color: 0x35496b, near: 60, far: 640 },
  },
};
export const WORLD_LIGHTING = LIGHTING_PRESETS.dusk;

// ---------- deterministic RNG ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rand = mulberry32(20261120);

// ---------- canvas textures ----------
function canvasTex(size, draw, repeat){
  const c=document.createElement('canvas'); c.width=c.height=size;
  draw(c.getContext('2d'), size);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; if(repeat) t.repeat.set(repeat[0],repeat[1]);
  t.anisotropy=4; t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function makeTextures(){
  const asphalt = canvasTex(256,(g,s)=>{
    g.fillStyle='#4a5468'; g.fillRect(0,0,s,s);           // dark wet asphalt — the sky reflection does the brightening
    for(let i=0;i<9000;i++){ const v=58+rand()*44; g.fillStyle=`rgba(${v},${v+4},${v+14},${0.12+rand()*0.2})`; g.fillRect(rand()*s,rand()*s,1.6,1.6); }
    for(let i=0;i<26;i++){ g.fillStyle=`rgba(30,34,44,${0.05+rand()*0.1})`; const w=14+rand()*50; g.fillRect(rand()*s,rand()*s,w,w*0.6); } // patches
    for(let i=0;i<10;i++){ g.strokeStyle='rgba(24,27,36,0.35)'; g.lineWidth=1; g.beginPath(); let x=rand()*s,y=rand()*s; g.moveTo(x,y); for(let j=0;j<4;j++){x+=(rand()-0.5)*36;y+=(rand()-0.5)*36; g.lineTo(x,y);} g.stroke(); } // cracks
  });
  const concrete = canvasTex(256,(g,s)=>{
    g.fillStyle='#9aa0a4'; g.fillRect(0,0,s,s);
    for(let i=0;i<7000;i++){ const v=140+rand()*40; g.fillStyle=`rgba(${v},${v},${v-4},${0.10+rand()*0.16})`; g.fillRect(rand()*s,rand()*s,1.5,1.5); }
    g.strokeStyle='rgba(70,74,78,0.55)'; g.lineWidth=2; g.strokeRect(0,0,s,s); // slab joints
  });
  const grass = canvasTex(256,(g,s)=>{
    g.fillStyle='#648347'; g.fillRect(0,0,s,s);
    for(let i=0;i<12000;i++){ const gg=90+rand()*70; g.fillStyle=`rgba(${gg*0.55},${gg},${gg*0.38},${0.14+rand()*0.2})`; g.fillRect(rand()*s,rand()*s,1.4,2.6); }
    for(let i=0;i<20;i++){ g.fillStyle=`rgba(112,96,58,${0.05+rand()*0.09})`; const w=20+rand()*60; g.fillRect(rand()*s,rand()*s,w,w*0.7); } // dry patches
  });
  const roofTex = canvasTex(128,(g,s)=>{
    g.fillStyle='#7c828e'; g.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=6){ g.fillStyle=`rgba(30,32,40,${0.16+((y/6)%2)*0.08})`; g.fillRect(0,y,s,2); }
    for(let i=0;i<2500;i++){ const v=100+rand()*50; g.fillStyle=`rgba(${v},${v},${v+6},0.16)`; g.fillRect(rand()*s,rand()*s,1.4,1.4); }
  });
  return { asphalt, concrete, grass, roofTex };
}

// ---------- merge-by-material batching ----------
class Buckets {
  constructor(){ this.map=new Map(); }
  add(key, geo, matrix, color){
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(matrix);
    if(color){
      const n=g.attributes.position.count, arr=new Float32Array(n*3), c=new THREE.Color(color);
      for(let i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr,3));
    }
    if(!this.map.has(key)) this.map.set(key,[]);
    this.map.get(key).push(g);
  }
  build(scene, materials, shadows){
    for(const [key, geos] of this.map){
      let total=0; for(const g of geos) total+=g.attributes.position.count;
      const pos=new Float32Array(total*3), nor=new Float32Array(total*3), uv=new Float32Array(total*2), col=new Float32Array(total*3);
      let o=0;
      for(const g of geos){
        const n=g.attributes.position.count;
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
      const mesh=new THREE.Mesh(merged, materials[key]);
      if(shadows && shadows[key]){ mesh.castShadow=true; mesh.receiveShadow=true; }
      else if(key==='asphalt'||key==='concrete'||key==='grass'||key==='walls') mesh.receiveShadow=true;
      mesh.matrixAutoUpdate=false; scene.add(mesh);
    }
  }
}
const M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), SV=new THREE.Vector3(1,1,1);
function mat(x,y,z,ry=0,sx=1,sy=1,sz=1){ E.set(0,ry,0); Q.setFromEuler(E); V.set(x,y,z); SV.set(sx,sy,sz); return new THREE.Matrix4().compose(V,Q,SV); }
const BOX=new THREE.BoxGeometry(1,1,1);
const PLANE=new THREE.PlaneGeometry(1,1); PLANE.rotateX(-Math.PI/2);

// ---------- sky dome (GLSL, Neon pattern) ----------
const SKY_VERT=`varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const SKY_FRAG=`
  varying vec3 vDir; uniform vec3 uSunDir;
  void main(){
    float h = clamp(vDir.y, -0.08, 1.0);
    vec3 zen = vec3(0.10,0.20,0.46);
    vec3 mid = vec3(0.27,0.42,0.68);
    vec3 hor = vec3(0.97,0.55,0.30);
    vec3 col = mix(hor, mid, smoothstep(0.0,0.16,h));
    col = mix(col, zen, smoothstep(0.10,0.55,h));
    float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    col += vec3(1.0,0.52,0.24)*pow(s, 90.0)*0.9;    // sun disc glow
    col += vec3(1.0,0.55,0.26)*pow(s, 7.0)*0.20;    // warm haze around sun
    float wisp = sin(vDir.x*14.0 + vDir.y*40.0)*sin(vDir.z*11.0 - vDir.y*30.0);
    col += vec3(1.0,0.8,0.7)*smoothstep(0.55,0.95,wisp)*0.05*smoothstep(0.02,0.2,h);
    gl_FragColor = vec4(col, 1.0);
  }`;
export function makeSkyDome(){
  const m=new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{ uSunDir:{ value:new THREE.Vector3(...WORLD_LIGHTING.sun.dir).normalize() } },
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
  const D=WORLD_DATA;
  const tex=makeTextures();
  const mats={
    asphalt: new THREE.MeshStandardMaterial({ map:tex.asphalt, roughness:0.45, metalness:0.04, envMapIntensity:1.5, vertexColors:true, side:THREE.DoubleSide }), // wet look: low roughness throws long sky streaks
    concrete:new THREE.MeshStandardMaterial({ map:tex.concrete, roughness:0.97, vertexColors:true, side:THREE.DoubleSide }),
    grass:   new THREE.MeshStandardMaterial({ map:tex.grass, roughness:1.0, envMapIntensity:0.35 }),
    walls:   new THREE.MeshStandardMaterial({ roughness:0.92, vertexColors:true }),
    roofs:   new THREE.MeshStandardMaterial({ map:tex.roofTex, roughness:0.95, vertexColors:true }),
    glass:   new THREE.MeshStandardMaterial({ color:0x2c3846, roughness:0.25, metalness:0.6 }),
    litwin:  new THREE.MeshBasicMaterial({ vertexColors:true }),
    trunk:   new THREE.MeshStandardMaterial({ color:0x5a4632, roughness:1 }),
    foliage: new THREE.MeshStandardMaterial({ roughness:1, vertexColors:true }),
    pole:    new THREE.MeshStandardMaterial({ color:0x4c4238, roughness:1 }),
    wire:    new THREE.LineBasicMaterial({ color:0x1e2126 }),
    paintW:  new THREE.MeshBasicMaterial({ color:0xe8ecf2 }),
    paintY:  new THREE.MeshBasicMaterial({ color:0xf2c230 }),
    beacon:  new THREE.MeshBasicMaterial({ color:0xffd23f, transparent:true, opacity:0.30, depthWrite:false }),
  };
  scene.environmentIntensity = 0.95;

  const B=new Buckets();
  const colliders=[];
  const roadCells=new Map(); // surface grid: "cx,cz" (12 m cells) -> 'road'|'lot'
  const cellKey=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
  function markRoad(x,z,kind){ roadCells.set(cellKey(x,z), kind); }
  function rasterize(pts, halfW, kind){
    for(let i=0;i<pts.length-1;i++){
      const [ax,az]=pts[i],[bx,bz]=pts[i+1]; const L=Math.hypot(bx-ax,bz-az), steps=Math.max(1,Math.ceil(L/6));
      for(let s=0;s<=steps;s++){ const x=ax+(bx-ax)*s/steps, z=az+(bz-az)*s/steps;
        for(let ox=-halfW;ox<=halfW;ox+=6) for(let oz=-halfW;oz<=halfW;oz+=6) markRoad(x+ox,z+oz,kind); }
    }
  }

  // ground plane (whole map extent + margin)
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(9800,11800), mats.grass);
  ground.rotation.x=-Math.PI/2; ground.position.set(-350,0,-2250);
  ground.material.map.repeat.set(980,1180); ground.receiveShadow=true; ground.name='ground';
  scene.add(ground);

  // ---- roads (real OSM polylines) ----
  const dashPts=[];
  for(const r of D.roads){
    ribbon(B,'asphalt', r.pts, r.w, 0.06);
    rasterize(r.pts, r.w/2, 'road');
    if(r.w>=6.5){ // centre dashes on two-lane+ roads
      let acc=0;
      for(let i=0;i<r.pts.length-1;i++){
        const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1]; const L=Math.hypot(bx-ax,bz-az);
        let s=0; while(s<L){ const t0=(acc%9)/L, on=(acc%9)<3;
          if(on && t0>=0 && t0<1) dashPts.push([ax+(bx-ax)*t0, az+(bz-az)*t0, Math.atan2(bx-ax,bz-az)]);
          const step=Math.min(3-(acc%9), L-s); acc+=step; s+=step; if(step<=0) break; }
      }
    }
  }
  for(const d of dashPts) B.add('paintW', PLANE, mat(d[0],0.085,d[1],d[2],0.16,1,3.0));
  // cul-de-sac discs (real centres/radii)
  for(const c of D.cds){
    const g=new THREE.CircleGeometry(c.r, 18); g.rotateX(-Math.PI/2);
    B.add('asphalt', g, mat(c.x,0.055,c.z), 0xffffff);
    markRoad(c.x,c.z,'road');
  }
  // parking lots (real footprints)
  for(const p of D.parking){ flatPoly(B,'concrete', p.pts, 0.045, 0xffffff);
    const cx=p.pts.reduce((s,q)=>s+q[0],0)/p.pts.length, cz=p.pts.reduce((s,q)=>s+q[1],0)/p.pts.length;
    for(let ox=-40;ox<=40;ox+=10) for(let oz=-40;oz<=40;oz+=10) markRoad(cx+ox,cz+oz,'lot'); }

  // ---- buildings (real footprints) ----
  const heroStyle={}; for(const [bid,st] of Object.entries(D.heroes)) heroStyle[D.heroBuilding[bid]]=st;
  const routePts=D.route;
  function nearRoute(x,z,r){
    for(let i=0;i<routePts.length;i+=3){ const dx=routePts[i][0]-x, dz=routePts[i][1]-z; if(dx*dx+dz*dz<r*r) return true; }
    return false;
  }
  const winQuads=[];
  for(const b of D.buildings){
    const pts=b.pts;
    let cx=0,cz=0; for(const p of pts){cx+=p[0];cz+=p[1];} cx/=pts.length; cz/=pts.length;
    // oriented bbox from longest edge
    let bl=0,ba=0;
    for(let i=0;i<pts.length;i++){ const a=pts[i], c=pts[(i+1)%pts.length]; const L=Math.hypot(c[0]-a[0],c[1]-a[1]); if(L>bl){bl=L; ba=Math.atan2(c[0]-a[0], c[1]-a[1]);} }
    const cos=Math.cos(ba), sin=Math.sin(ba);
    let hw=0, hd=0;
    for(const p of pts){ const dx=p[0]-cx, dz=p[1]-cz; hw=Math.max(hw, Math.abs(dx*sin+dz*cos)); hd=Math.max(hd, Math.abs(dx*cos-dz*sin)); }
    hw=Math.max(hw,2.2); hd=Math.max(hd,2.2);
    const isSchool = b.hero==='atholton';
    const st = b.hero? heroStyle[b.hero] : null;
    const storeys = isSchool? 2 : (st? (st.storeys||2) : (rand()<0.72?2:1));
    const hgt = isSchool? 9 : storeys*3.1 + rand()*0.5;
    const wallCol = st? st.wall : ['#e8e2d4','#d9cfc0','#c9d2d8','#e2d6c2','#cfc4b2','#d8dce2','#e6ddcb','#c4b299'][Math.floor(rand()*8)];
    const roofCol = st? (st.roof? st.roof.c1 : '#8a8f98') : ['#6d7278','#7a6a5c','#5f6a72','#837468'][Math.floor(rand()*4)];
    const ry = -ba + Math.PI/2; // box local +x along longest edge
    B.add('walls', BOX, mat(cx, hgt/2, cz, ry, hw*2, hgt, hd*2), wallCol);
    if(isSchool || (st && st.roof && st.roof.type==='flat')){
      B.add('roofs', BOX, mat(cx, hgt+0.25, cz, ry, hw*2+0.4, 0.5, hd*2+0.4), roofCol);
    } else {
      // gable roof: prism via cylinder with 3 radial segments, squashed
      const roof=new THREE.CylinderGeometry(0.01, 1, 1, 3, 1); roof.rotateZ(Math.PI/2); roof.rotateY(Math.PI/2);
      // simpler: use a box rotated 45 as hip illusion is ugly; prism:
      roof.dispose();
      const prism=makePrism(hw*2+0.5, hd*2+0.5, hgt*0.42);
      B.add('roofs', prism, mat(cx, hgt, cz, ry), roofCol);
    }
    colliders.push({ cx, cz, hw, hd, cos:Math.cos(ry), sin:Math.sin(ry), top:hgt, type: b.hero? 'hero':'house' });
    // lit windows for houses near the action
    if(!isSchool && (b.hero || nearRoute(cx,cz,cfg.houseDetailRadius))){
      const floors=storeys, per=Math.max(2, Math.floor(hw/1.9));
      for(let f=0;f<floors;f++) for(let wi=0;wi<per;wi++){
        if(rand()>cfg.windowGlow) continue;
        const lx=-hw+ (wi+0.5)*(2*hw/per), y=1.5+f*3.0;
        for(const side of [1,-1]){
          const wx=cx + Math.cos(ry)*lx + Math.sin(ry)*(hd+0.03)*side;
          const wz=cz - Math.sin(ry)*lx + Math.cos(ry)*(hd+0.03)*side;
          winQuads.push([wx,y,wz,ry, side]);
        }
      }
    }
    // driveway for hero houses (concrete strip toward the road stop point)
    if(b.hero && b.hero!=='atholton'){
      const stop=D.stops.find(s=>s.id===b.hero);
      if(stop){ ribbon(B,'concrete', [[cx,cz],[stop.sx,stop.sz]], 3.2, 0.04); }
    }
  }
  // (house windows in winQuads are built as vertical quads by buildWindows() below)

  // ---- Atholton dressing: flag pole + sign ----
  const ath=D.stops[D.stops.length-1];
  B.add('pole', new THREE.CylinderGeometry(0.09,0.12,11,6), mat(ath.hx+14, 5.5, ath.hz+6));
  B.add('litwin', BOX, mat(ath.hx+14, 10.2, ath.hz+6.4, 0, 2.6,1.6,0.08), 0x3050a0);
  B.add('litwin', BOX, mat(ath.hx+14, 10.2, ath.hz+6.4, 0, 2.6,0.55,0.09), 0xd84040);

  // ---- trees (seeded scatter along roads) ----
  const trunkG=new THREE.CylinderGeometry(0.14,0.2,1.6,5); trunkG.translate(0,0.8,0);
  const folG=new THREE.IcosahedronGeometry(1.6,1); folG.translate(0,3.1,0);
  const fol2=new THREE.IcosahedronGeometry(1.1,1); fol2.translate(0.7,2.4,0.3);
  let trees=0;
  for(const r of D.roads){
    if(r.hw==='motorway'||r.hw==='trunk') continue;
    for(let i=0;i<r.pts.length-1;i++){
      const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1]; const L=Math.hypot(bx-ax,bz-az);
      const steps=Math.floor(L/16);
      for(let s=0;s<steps;s++){
        if(rand()>0.42*cfg.treeDensity) continue;
        const t=(s+rand())/Math.max(1,steps), x=ax+(bx-ax)*t, z=az+(bz-az)*t;
        const side=rand()<0.5?-1:1, off=r.w/2+2.6+rand()*5;
        const dx=(bz-az)/(L||1), dz=-(bx-ax)/(L||1);
        const tx=x+dx*off*side, tz=z+dz*off*side;
        if(roadCells.has(cellKey(tx,tz))) continue;
        const sc=0.8+rand()*0.7;
        B.add('trunk', trunkG, mat(tx,0,tz,rand()*3, sc,sc,sc));
        const fc=['#4a6b2f','#557a35','#3f612c','#6b8a3a'][Math.floor(rand()*4)];
        B.add('foliage', folG, mat(tx,0,tz,rand()*3, sc,sc*(0.9+rand()*0.3),sc), fc);
        if(rand()<0.5) B.add('foliage', fol2, mat(tx,0,tz,rand()*3, sc,sc,sc), fc);
        trees++;
      }
    }
  }

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
        B.add('pole', poleG, mat(px,0,pz, Math.atan2(bx-ax,bz-az)));
        B.add('pole', armG, mat(px,0,pz, Math.atan2(bx-ax,bz-az)+Math.PI/2));
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
      B.add('pole', poleG, mat(px,0,pz,hd, 0.9,1.05,0.9));
      B.add('pole', armG, mat(px,0,pz,hd-Math.PI/2));
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

  B.build(scene, mats, { walls:true, roofs:true, trunk:true, foliage:true, pole:true });
  buildWindows(scene, winQuads);
  buildLampGlow(scene, lampPts);

  return {
    groundAt: (x,z)=>0,
    surfaceAt: (x,z)=> roadCells.get(cellKey(x,z)) || 'grass',
    colliders,
    stops: D.stops,
    route: D.route,
    spawn: (()=>{ const s=D.stops[0]; return { x:s.sx, z:s.sz, heading:s.heading }; })(),
    config: cfg,
    lighting: WORLD_LIGHTING,
    stats: { trees },
    target: {
      setStop(stop){ beacon.position.set(stop.sx,23,stop.sz); beaconRing.position.set(stop.sx,0.12,stop.sz); },
      beacon, beaconRing,
    },
  };
}

function buildLampGlow(scene, pts){
  // streetlight dressing at blue hour, ONE merged additive mesh: a warm pool
  // on the wet road under each lamp + a crossed halo card at the lamp head.
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
  const mesh=new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map:tex, vertexColors:true, transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }));
  mesh.renderOrder=2; mesh.matrixAutoUpdate=false; mesh.name='lampGlow'; scene.add(mesh);
}

function makePrism(w, d, h){
  // gable prism: ridge along local X, base w(x) by d(z), height h
  const hw=w/2, hd=d/2;
  const v=[ // two slopes + two gable ends, non-indexed
    // front slope (z=-hd side)
    -hw,0,-hd,  hw,0,-hd,  hw,h,0,   -hw,0,-hd,  hw,h,0,  -hw,h,0,
    // back slope
    hw,0,hd,  -hw,0,hd,  -hw,h,0,   hw,0,hd,  -hw,h,0,  hw,h,0,
    // left gable
    -hw,0,hd,  -hw,0,-hd,  -hw,h,0,
    // right gable
    hw,0,-hd,  hw,0,hd,  hw,h,0,
  ];
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
  const uv=new Float32Array((v.length/3)*2);
  for(let i=0;i<v.length;i+=3){ uv[(i/3)*2]=v[i]*0.08; uv[(i/3)*2+1]=(v[i+1]+v[i+2])*0.08; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  g.computeVertexNormals();
  return g;
}

function buildWindows(scene, quads){
  // vertical emissive window quads, merged, one draw
  const positions=[], colors=[], idx=[];
  const cA=new THREE.Color(0xffc37a), cB=new THREE.Color(0xbfd9ff);
  for(const [x,y,z,ry,side] of quads){
    const c = Math.random()<0.82? cA:cB;
    const fx=Math.sin(ry)*(side>0?1:-1), fz=Math.cos(ry)*(side>0?1:-1);
    // plane facing (fx,fz): corners
    const rx=fz, rz=-fx, hw=0.42, hh=0.58;
    const base=positions.length/3;
    const corners=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];
    for(const [ox,oy] of corners){ positions.push(x+rx*ox, y+oy, z+rz*ox); colors.push(c.r,c.g,c.b); }
    idx.push(base,base+1,base+2, base,base+2,base+3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(idx); g.computeVertexNormals();
  const m=new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side: THREE.DoubleSide }));
  m.matrixAutoUpdate=false; scene.add(m);
}
export default buildWorld;

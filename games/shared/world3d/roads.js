// Hawk2 shared world3d (first built for Scaggsville 3D) — roads: real OSM polylines rendered with shader-painted markings, curbs, sidewalks,
// gravel shoulders, plus the spatial queries the rest of the world builds against.
//
// Markings are computed per pixel from (metres across the road, metres along it, metres to the polyline
// end, width, class) — crisp at any distance (fwidth AA), zero extra geometry, faded out near polyline
// ends so paint does not run through intersections.
import * as THREE from 'three';

export const MARK = { NONE:0, COLLECTOR:1, ONEWAY:2 };
const CLASS_Y = { motorway:0.074, trunk:0.073, primary:0.072, secondary:0.071, tertiary:0.070,
  motorway_link:0.069, trunk_link:0.069, primary_link:0.069, secondary_link:0.069, tertiary_link:0.069,
  residential:0.066, unclassified:0.066, service:0.062 };
function markFor(hw){
  if(/^(motorway|trunk)/.test(hw)) return MARK.ONEWAY;            // dual carriageway halves + ramps
  if(/^(primary|secondary|tertiary)/.test(hw)) return MARK.COLLECTOR;
  return MARK.NONE;
}
export const hasSidewalk = hw => hw==='residential' || hw==='unclassified';

// ---------- spatial index ----------
export class RoadIndex {
  // paved mask = bitset over the network extent (1.5 m cells): O(1), ~2 MB, no string keys
  constructor(cell, bounds){ this.cell=cell; this.segs=new Map(); this.segCell=30;
    this.x0=bounds.x0; this.z0=bounds.z0; this.W=Math.ceil((bounds.x1-bounds.x0)/cell)+1; this.H=Math.ceil((bounds.z1-bounds.z0)/cell)+1;
    this.bits=new Uint32Array(Math.ceil(this.W*this.H/32)); }
  set(x,z){ const i=Math.floor((x-this.x0)/this.cell), j=Math.floor((z-this.z0)/this.cell); if(i<0||j<0||i>=this.W||j>=this.H) return; const k=j*this.W+i; this.bits[k>>5]|=1<<(k&31); }
  fillDisc(x,z,r){ const c=this.cell; for(let ox=-r;ox<=r;ox+=c) for(let oz=-r;oz<=r;oz+=c) if(ox*ox+oz*oz<=r*r) this.set(x+ox,z+oz); }
  fillStroke(pts, hw){ // stamp the paved footprint
    for(let i=0;i<pts.length-1;i++){ const [ax,az]=pts[i],[bx,bz]=pts[i+1], L=Math.hypot(bx-ax,bz-az), n=Math.max(1,Math.ceil(L/(this.cell*0.7)));
      const nx=-(bz-az)/(L||1), nz=(bx-ax)/(L||1);
      for(let s=0;s<=n;s++){ const x=ax+(bx-ax)*s/n, z=az+(bz-az)*s/n;
        for(let o=-hw;o<=hw;o+=this.cell*0.7) this.set(x+nx*o,z+nz*o); } }
  }
  paved(x,z){ const i=Math.floor((x-this.x0)/this.cell), j=Math.floor((z-this.z0)/this.cell); if(i<0||j<0||i>=this.W||j>=this.H) return false; const k=j*this.W+i; return (this.bits[k>>5]>>>(k&31)&1)===1; }
  addSegs(road){
    const p=road.pts;
    for(let i=0;i<p.length-1;i++){ const s={ax:p[i][0],az:p[i][1],bx:p[i+1][0],bz:p[i+1][1],road};
      const x0=Math.min(s.ax,s.bx), x1=Math.max(s.ax,s.bx), z0=Math.min(s.az,s.bz), z1=Math.max(s.az,s.bz), C=this.segCell;
      for(let cx=Math.floor(x0/C); cx<=Math.floor(x1/C); cx++) for(let cz=Math.floor(z0/C); cz<=Math.floor(z1/C); cz++){
        const k=cx+','+cz; if(!this.segs.has(k)) this.segs.set(k,[]); this.segs.get(k).push(s); } }
  }
  nearest(x,z,maxR=60){ // -> { d, px, pz, dirx, dirz, road } | null
    const C=this.segCell, r=Math.ceil(maxR/C); let best=null;
    for(let cx=Math.floor(x/C)-r; cx<=Math.floor(x/C)+r; cx++) for(let cz=Math.floor(z/C)-r; cz<=Math.floor(z/C)+r; cz++){
      const list=this.segs.get(cx+','+cz); if(!list) continue;
      for(const s of list){ const dx=s.bx-s.ax, dz=s.bz-s.az, L2=dx*dx+dz*dz||1; let t=((x-s.ax)*dx+(z-s.az)*dz)/L2; t=Math.max(0,Math.min(1,t));
        const px=s.ax+dx*t, pz=s.az+dz*t, d=Math.hypot(x-px,z-pz);
        if(d<maxR && (!best||d<best.d)){ const L=Math.sqrt(L2); best={d,px,pz,dirx:dx/L,dirz:dz/L,road:s.road}; } } }
    return best;
  }
}

// ---------- polyline helpers ----------
function withNormals(pts){
  const out=[]; let d=0;
  for(let i=0;i<pts.length;i++){
    const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)];
    let dx=b[0]-a[0], dz=b[1]-a[1]; const L=Math.hypot(dx,dz)||1; dx/=L; dz/=L;
    // miter-ish join: average of adjacent segment normals, length-corrected (clamped)
    let nx=-dz, nz=dx;
    if(i>0 && i<pts.length-1){
      const d1x=pts[i][0]-pts[i-1][0], d1z=pts[i][1]-pts[i-1][1], l1=Math.hypot(d1x,d1z)||1;
      const n1x=-d1z/l1, n1z=d1x/l1; const dot=n1x*nx+n1z*nz; const k=1/Math.max(0.55,dot); nx*=k; nz*=k;
    }
    if(i>0) d+=Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
    out.push({ x:pts[i][0], z:pts[i][1], nx, nz, d });
  }
  return out;
}
function resample(pts, step){ // densify so offset curves follow bends and clipping is fine-grained
  const out=[pts[0]];
  for(let i=0;i<pts.length-1;i++){ const [ax,az]=pts[i],[bx,bz]=pts[i+1], n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/step));
    for(let s=1;s<=n;s++) out.push([ax+(bx-ax)*s/n, az+(bz-az)*s/n]); }
  return out;
}

// ---------- road surface mesh (one draw) ----------
function roadMaterial(T){
  const m=new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.62, metalness:0.0, envMapIntensity:1.0 });
  m.onBeforeCompile=(sh)=>{
    sh.uniforms.uAsph={ value:T.asphalt }; sh.uniforms.uMacro={ value:T.macro };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoad; varying vec4 vRoad; varying vec2 vAcross; varying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad=aRoad; vAcross=uv; vWPos=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uAsph; uniform sampler2D uMacro; varying vec4 vRoad; varying vec2 vAcross; varying vec3 vWPos;
float band(float x, float a, float b){ float w=fwidth(x)*0.9+1e-4; return smoothstep(a-w,a+w,x)*(1.0-smoothstep(b-w,b+w,x)); }
float gPaint; vec3 gPaintCol; float gWear;`)
      .replace('#include <map_fragment>', `
  vec2 wp=vWPos.xz;
  vec3 asph=texture2D(uAsph, wp*0.25).rgb;
  float mac=texture2D(uMacro, wp*0.0045).r, mac2=texture2D(uMacro, wp*0.031+0.37).r;
  float width=vRoad.z, type=vRoad.w, dist=vAcross.y, toEnd=vRoad.y-vAcross.y;
  float x=(vAcross.x-0.5)*width;               // metres from the centreline (+ = left of travel)
  float ax=abs(x);
  // wheel paths: two polished/darker bands per lane
  float lanes = type>1.5 ? max(1.0, floor(width/3.6+0.5)) : (type>0.5 ? 2.0 : 1.0);
  float laneW = width/lanes, lx = mod(x+width*0.5, laneW) - laneW*0.5;
  float wheel = band(abs(lx), 0.55, 1.05);
  vec3 col = asph * (0.78 + 0.30*mac) * (0.92 + 0.12*mac2);
  col *= 1.0 - 0.10*wheel;
  col = mix(col, col*0.80, smoothstep(width*0.5-0.45, width*0.5, ax) * step(type, 0.5)); // gutter grime
  gWear = 0.55 + 0.45*smoothstep(0.25, 0.75, texture2D(uMacro, wp*0.09).r);
  float fade = smoothstep(5.0, 11.0, min(dist, toEnd));
  float paintY=0.0, paintW=0.0;
  if(type>0.5 && type<1.5){                    // two-way collector
    paintY = band(ax, 0.07, 0.19) * fade;
    paintW = band(ax, width*0.5-0.48, width*0.5-0.33) * smoothstep(3.0, 7.0, min(dist,toEnd));
  } else if(type>1.5){                         // one-way carriageway
    paintY = band(x, width*0.5-0.62, width*0.5-0.47) * fade;      // left edge yellow
    paintW = band(-x, width*0.5-0.62, width*0.5-0.47) * fade;     // right edge white
    for(int k=1;k<4;k++){ if(float(k)>=lanes) break;
      float lxk = -width*0.5 + float(k)*laneW;
      paintW += band(abs(x-lxk), 0.0, 0.08) * step(mod(dist, 12.0), 3.0) * fade; }
  }
  gPaint = clamp(paintY+paintW, 0.0, 1.0) * gWear;
  gPaintCol = paintY > paintW ? vec3(0.93, 0.70, 0.16) : vec3(0.92, 0.93, 0.92);
  col = mix(col, gPaintCol, gPaint);
  diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * (0.88 + 0.22*mac) - 0.08*wheel;
  roughnessFactor = mix(roughnessFactor, 0.42, gPaint);`);
  };
  m.customProgramCacheKey=()=>'sv3d-road-v1';
  return m;
}

export function buildRoads(scene, D, T, B){
  let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;
  for(const r of D.roads) for(const q of r.pts){ bx0=Math.min(bx0,q[0]); bx1=Math.max(bx1,q[0]); bz0=Math.min(bz0,q[1]); bz1=Math.max(bz1,q[1]); }
  for(const p of D.parking) for(const q of p.pts){ bx0=Math.min(bx0,q[0]); bx1=Math.max(bx1,q[0]); bz0=Math.min(bz0,q[1]); bz1=Math.max(bz1,q[1]); }
  const idx=new RoadIndex(1.5, { x0:bx0-60, x1:bx1+60, z0:bz0-60, z1:bz1+60 });
  // paved footprints first (all roads, discs, lots) so every later clip sees the complete network
  for(const r of D.roads){ idx.fillStroke(r.pts, r.w/2+0.2); idx.addSegs(r); }
  for(const c of D.cds) idx.fillDisc(c.x, c.z, c.r+0.3);
  for(const p of D.parking){ const xs=p.pts.map(q=>q[0]), zs=p.pts.map(q=>q[1]);
    const inPoly=(x,z)=>{ let c=false; for(let i=0,j=p.pts.length-1;i<p.pts.length;j=i++){ const [xi,zi]=p.pts[i],[xj,zj]=p.pts[j]; if(((zi>z)!==(zj>z)) && (x<(xj-xi)*(z-zi)/(zj-zi)+xi)) c=!c; } return c; };
    for(let x=Math.min(...xs); x<=Math.max(...xs); x+=1.5) for(let z=Math.min(...zs); z<=Math.max(...zs); z+=1.5) if(inPoly(x,z)) idx.set(x,z); }

  // ---- road surface: one mesh per 900 m tile (one draw each, culled per tile) ----
  const TILE=900, tiles=new Map();
  let P, N, UV, AR, I;
  const useTile=(x,z)=>{ const k=Math.floor(x/TILE)+','+Math.floor(z/TILE); if(!tiles.has(k)) tiles.set(k,{P:[],N:[],UV:[],AR:[],I:[]}); ({P,N,UV,AR,I}=tiles.get(k)); };
  function addRibbon(pts, width, y, type){
    useTile(pts[0][0], pts[0][1]);
    const S=withNormals(resample(pts, 6)); const total=S[S.length-1].d; const base=P.length/3;
    for(const s of S){ const hw=width/2;
      P.push(s.x+s.nx*hw, y, s.z+s.nz*hw,  s.x-s.nx*hw, y, s.z-s.nz*hw);
      N.push(0,1,0, 0,1,0); UV.push(1, s.d, 0, s.d); AR.push(0,total,width,type, 0,total,width,type); }
    for(let i=1;i<S.length;i++){ const b0=base+(i-1)*2; I.push(b0,b0+2,b0+1, b0+1,b0+2,b0+3); }
  }
  function addDisc(x,z,r,y){
    useTile(x,z); const base=P.length/3, n=28; P.push(x,y,z); N.push(0,1,0); UV.push(0.5,50); AR.push(0,100,2*r,0);
    for(let k=0;k<=n;k++){ const a=k/n*Math.PI*2; P.push(x+Math.cos(a)*r,y,z+Math.sin(a)*r); N.push(0,1,0); UV.push(0.5,50); AR.push(0,100,2*r,0); }
    for(let k=0;k<n;k++) I.push(base, base+k+2, base+k+1);
  }
  for(const r of D.roads) addRibbon(r.pts, r.w, CLASS_Y[r.hw] ?? 0.065, markFor(r.hw));
  for(const c of D.cds) addDisc(c.x, c.z, c.r, 0.064);
  for(const p of D.parking){ // lots as asphalt fans (real footprints)
    const cx=p.pts.reduce((s,q)=>s+q[0],0)/p.pts.length, cz=p.pts.reduce((s,q)=>s+q[1],0)/p.pts.length; useTile(cx,cz); const base=P.length/3;
    P.push(cx,0.058,cz); N.push(0,1,0); UV.push(0.5,50); AR.push(0,100,40,0);
    for(const q of p.pts){ P.push(q[0],0.058,q[1]); N.push(0,1,0); UV.push(0.5,50); AR.push(0,100,40,0); }
    for(let k=0;k<p.pts.length;k++){ const a=base+1+k, b=base+1+((k+1)%p.pts.length); I.push(base,b,a); }
  }
  const roadMat=roadMaterial(T), roadMeshes=[];
  for(const t of tiles.values()){
    if(!t.I.length) continue;
    // every triangle must face up (+Y): fix each one individually (ribbons, discs and lot fans differ)
    for(let i=0;i<t.I.length;i+=3){ const a=t.I[i]*3, b=t.I[i+1]*3, c=t.I[i+2]*3;
      const ny=(t.P[b+2]-t.P[a+2])*(t.P[c]-t.P[a]) - (t.P[b]-t.P[a])*(t.P[c+2]-t.P[a+2]);
      if(ny<0){ const s=t.I[i+1]; t.I[i+1]=t.I[i+2]; t.I[i+2]=s; } }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(t.P,3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(t.N,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(t.UV,2));
    geo.setAttribute('aRoad', new THREE.Float32BufferAttribute(t.AR,4));
    geo.setIndex(t.I); geo.computeBoundingSphere();
    const m=new THREE.Mesh(geo, roadMat); m.receiveShadow=true; m.name='roads'; m.matrixAutoUpdate=false; scene.add(m); roadMeshes.push(m);
  }
  const roadMesh=roadMeshes[0];

  // ---- curbs + sidewalks (residential), gravel shoulders (collectors / service) ----
  const CURB_H=0.14;
  function sweep(pts, side, profile, key, uvAcross, color){
    // profile: [[offsetFromEdge, height], ...]; offset >0 = away from the road. Broken where the
    // outer edge would sit on pavement (another road / disc / lot). Built per run of valid samples.
    const runs=[]; let cur=[];
    for(const s of pts){
      const ox=s.x+s.nx*side*(s.edge+profile[profile.length-1][0]), oz=s.z+s.nz*side*(s.edge+profile[profile.length-1][0]);
      const ix=s.x+s.nx*side*(s.edge+0.35), iz=s.z+s.nz*side*(s.edge+0.35);
      const ok = !idx.paved(ox,oz) && !idx.paved(ix,iz);
      if(ok) cur.push(s); else { if(cur.length>=3) runs.push(cur); cur=[]; }
    }
    if(cur.length>=3) runs.push(cur);
    for(const run of runs){
      const pos=[], uv=[], ind=[]; const np=profile.length;
      for(let i=0;i<run.length;i++){ const s=run[i];
        for(let k=0;k<np;k++){ const [o,h]=profile[k], e=s.edge+o; pos.push(s.x+s.nx*side*e, h, s.z+s.nz*side*e); uv.push(uvAcross[k], s.d/1.5); } }
      for(let i=1;i<run.length;i++) for(let k=0;k<np-1;k++){
        const a=(i-1)*np+k, b=i*np+k; if(side>0) ind.push(a,a+1,b, b,a+1,b+1); else ind.push(a,b,a+1, b,b+1,a+1); }
      const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
      g.setIndex(ind); g.computeVertexNormals();
      B.add(key, g, new THREE.Matrix4(), color);
    }
  }
  let swLen=0;
  for(const r of D.roads){
    const S=withNormals(resample(r.pts, 3.0)); for(const s of S) s.edge=r.w/2;
    if(hasSidewalk(r.hw)){
      // curb face + curb top + 0.6 m planting strip (grass-height top) is skipped: sidewalk sits right behind the curb
      const prof=[[0,0.03],[0,CURB_H],[1.75,CURB_H],[1.8,0.0]];   // curb face, curb+walk top, outer skirt
      sweep(S, +1, prof, 'sidewalk', [0,0.04,1,1], 0xffffff);
      sweep(S, -1, prof, 'sidewalk', [0,0.04,1,1], 0xffffff);
      swLen+=S[S.length-1].d*2;
    } else if(r.hw!=='service'){
      const prof=[[0,0.05],[0.9,0.025],[1.4,0.0]];
      sweep(S, +1, prof, 'shoulder', [0,0.6,1], 0xffffff);
      sweep(S, -1, prof, 'shoulder', [0,0.6,1], 0xffffff);
    }
  }
  return { index:idx, mesh:roadMesh, meshes:roadMeshes, stats:{ sidewalkKm: +(swLen/1000).toFixed(1), roadTiles: roadMeshes.length } };
}

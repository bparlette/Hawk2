// Hawk2 shared world3d (first built for Scaggsville 3D) — houses on the REAL OSM footprints.
// Each footprint -> oriented box (same collider maths as before), then a proper house:
// foundation, lap siding / brick bays with windows (world-scaled 2.9 m x 3.1 m bay tile), gable or hip
// roof with eave overhang + soffit + fascia, chimney, and on the side facing the nearest real road:
// front door + stoop, garage door + driveway to that road. Sheds (small) and commercial/institutional
// (large) footprints get their own treatment. Lit-window quads sit exactly on the painted windows.
import * as THREE from 'three';
import { Buckets } from './buckets.js';
import { ATLAS_REGION } from './atlas.js';

const BAY=2.9, STOREY=3.1, FOUND=0.45;
const SIDING = ['#f1ece2','#e4dccb','#d6dde2','#e9e0cd','#cfd5cb','#dfe3e6','#ece6d6','#c9cdd2','#e6d7c3','#bfc8cf','#ddd3bf','#f4f1ea'];
const ROOFS  = ['#5a5d62','#4a4c51','#6d655d','#5d5650','#3f4247','#77706a','#4f5560'];
const DOORS  = ['#7a1f24','#1f2f4f','#22262b','#2f4a34','#f2efe8','#5b3a24','#3a4f63'];
const BRICK_TINTS = ['#ffffff','#f2e6dc','#e8dccf'];

// quad/tri orient themselves: `inside` is a point on the INNER side of the surface; the winding is flipped
// when the face normal points toward it (so walls face out, roofs up, soffits down — no hand-wound lists).
function orient(a, b, c, inside){
  const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
  const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
  const mx=(a[0]+b[0]+c[0])/3-inside[0], my=(a[1]+b[1]+c[1])/3-inside[1], mz=(a[2]+b[2]+c[2])/3-inside[2];
  return nx*mx+ny*my+nz*mz >= 0;
}
function quad(B, key, a, b, c, d, uva, uvb, uvc, uvd, color, inside){
  if(inside && !orient(a,b,c,inside)){ [b,d]=[d,b]; [uvb,uvd]=[uvd,uvb]; }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a,...b,...c, ...a,...c,...d],3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([...uva,...uvb,...uvc, ...uva,...uvc,...uvd],2));
  g.computeVertexNormals();
  B.add(key, g, IDM, color);
}
function tri(B, key, a, b, c, uva, uvb, uvc, color, inside){
  if(inside && !orient(a,b,c,inside)){ [b,c]=[c,b]; [uvb,uvc]=[uvc,uvb]; }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a,...b,...c],3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([...uva,...uvb,...uvc],2));
  g.computeVertexNormals(); B.add(key, g, IDM, color);
}
const IDM=new THREE.Matrix4();
const BOXG=new THREE.BoxGeometry(1,1,1);
function boxAt(B, key, x, y, z, ry, sx, sy, sz, color){
  const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)), new THREE.Vector3(sx,sy,sz));
  B.add(key, BOXG, m, color);
}

export function houseMaterials(T){
  const facade=(map, mask, rough)=>{
    const m=new THREE.MeshStandardMaterial({ map, roughnessMap:rough, roughness:1, metalness:0, vertexColors:true, envMapIntensity:0.9 });
    m.onBeforeCompile=(sh)=>{ sh.uniforms.uMask={value:mask};
      sh.fragmentShader=sh.fragmentShader
        .replace('#include <common>','#include <common>\nuniform sampler2D uMask;')
        .replace('#include <color_fragment>','#ifdef USE_COLOR\n float pm=texture2D(uMask, vMapUv).r; diffuseColor.rgb *= mix(vec3(1.0), vColor, pm);\n#endif'); };
    m.customProgramCacheKey=()=>'sv3d-facade';
    return m;
  };
  return {
    wallSiding: facade(T.siding, T.sidingMask, T.sidingRough),
    wallBrick:  facade(T.brick, T.brickMask, T.brickRough),
    wallBlank:  new THREE.MeshStandardMaterial({ map:T.sidingBlank, roughness:0.88, vertexColors:true }),
    store:      new THREE.MeshStandardMaterial({ map:T.store, roughnessMap:T.storeRough, roughness:1, vertexColors:true, envMapIntensity:1.1 }),
    roof:       new THREE.MeshStandardMaterial({ map:T.shingle, roughness:0.93, vertexColors:true }),
    flatRoof:   new THREE.MeshStandardMaterial({ color:0x8a8d90, roughness:0.95, vertexColors:true }),
    trim:       new THREE.MeshStandardMaterial({ color:0xf2f0ea, roughness:0.7, vertexColors:true }),
    found:      new THREE.MeshStandardMaterial({ map:T.concrete, color:0x9a958c, roughness:1, vertexColors:true }),
    door:       new THREE.MeshStandardMaterial({ map:T.door, roughness:0.55, vertexColors:true }),
    garage:     new THREE.MeshStandardMaterial({ map:T.garage, roughness:0.6, vertexColors:true }),
    chimney:    new THREE.MeshStandardMaterial({ map:T.brick, roughness:0.95, vertexColors:true }),
  };
}

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

// footprint polygon -> [{cx,cz,hw,hd}] boxes aligned to (ex,ez). fill >= 0.8 (or a styled hero house): one box,
// the true bbox. Otherwise the polygon is rasterised in the box frame and merged into rectangles.
export function footprintParts(pts, cx, cz, ex, ez, single=false){
  const L=pts.map(p=>{ const dx=p[0]-cx, dz=p[1]-cz; return [dx*ex[0]+dz*ex[1], dx*ez[0]+dz*ez[1]]; });
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; for(const [x,z] of L){ x0=Math.min(x0,x); x1=Math.max(x1,x); z0=Math.min(z0,z); z1=Math.max(z1,z); }
  let A=0; for(let i=0,j=L.length-1;i<L.length;j=i++) A+=L[j][0]*L[i][1]-L[i][0]*L[j][1]; A=Math.abs(A)/2;
  const toW=(lx,lz,hw,hd)=>({ cx:cx+ex[0]*lx+ez[0]*lz, cz:cz+ex[1]*lx+ez[1]*lz, hw, hd });
  const fill=A/Math.max(1e-6,(x1-x0)*(z1-z0));
  if(single || fill>=0.8 || L.length<5) return [toW((x0+x1)/2,(z0+z1)/2,(x1-x0)/2,(z1-z0)/2)];
  const cell=Math.max(1, Math.min(4, Math.min(x1-x0,z1-z0)/6)), W=Math.max(1,Math.round((x1-x0)/cell)), H=Math.max(1,Math.round((z1-z0)/cell));
  const cw=(x1-x0)/W, chh=(z1-z0)/H, inside=(x,z)=>{ let c=false; for(let i=0,j=L.length-1;i<L.length;j=i++){ const [xi,zi]=L[i],[xj,zj]=L[j]; if(((zi>z)!==(zj>z)) && (x<(xj-xi)*(z-zi)/(zj-zi)+xi)) c=!c; } return c; };
  const g=new Uint8Array(W*H); for(let j=0;j<H;j++) for(let i=0;i<W;i++) g[j*W+i]=inside(x0+(i+0.5)*cw, z0+(j+0.5)*chh)?1:0;
  const out=[];   // greedy maximal rectangles: grow right, then down while the whole run is filled
  for(let j=0;j<H;j++) for(let i=0;i<W;i++){ if(!g[j*W+i]) continue;
    let i1=i; while(i1+1<W && g[j*W+i1+1]) i1++;
    let j1=j; for(;;){ if(j1+1>=H) break; let ok=true; for(let k=i;k<=i1;k++) if(!g[(j1+1)*W+k]){ ok=false; break; } if(!ok) break; j1++; }
    for(let jj=j;jj<=j1;jj++) for(let k=i;k<=i1;k++) g[jj*W+k]=0;
    const a=x0+i*cw, bq=x0+(i1+1)*cw, c=z0+j*chh, d=z0+(j1+1)*chh;
    if((bq-a)*(d-c) >= 6) out.push(toW((a+bq)/2,(c+d)/2,(bq-a)/2,(d-c)/2)); }
  return out.length? out : [toW((x0+x1)/2,(z0+z1)/2,(x1-x0)/2,(z1-z0)/2)];
}

// ---------- 1. plan: cheap per-footprint decisions for EVERY building (sync) ----------
// Every random choice comes from per-building streams seeded by the building index, so a house is identical
// whichever detail level builds it and in whatever order tiles stream in.
export function planHouses({ D, roads, tile=300 }){
  const heroStyle={}; for(const [bid,st] of Object.entries(D.heroes||{})) heroStyle[D.heroBuilding[bid]]=st;
  const items=[], colliders=[], drives=[], tiles=new Map();
  D.buildings.forEach((b, idx)=>{
    const pts=b.pts;
    let cx=0,cz=0; for(const p of pts){cx+=p[0];cz+=p[1];} cx/=pts.length; cz/=pts.length;
    let bl=0,ba=0;
    for(let i=0;i<pts.length;i++){ const a=pts[i], c=pts[(i+1)%pts.length]; const L=Math.hypot(c[0]-a[0],c[1]-a[1]); if(L>bl){bl=L; ba=Math.atan2(c[0]-a[0], c[1]-a[1]);} }
    // box local +x MUST lie along the longest edge (dx,dz) = (sin ba, cos ba); three's rotation.y = ry maps +x to
    // (cos ry, -sin ry), so ry = atan2(-dz, dx). (-ba+PI/2 mirrored the axis in z — fixed Nov 21, median fill 0.50 -> 0.93.)
    const ry=Math.atan2(-Math.cos(ba), Math.sin(ba)), cos=Math.cos(ry), sin=Math.sin(ry), ex=[cos,-sin], ez=[sin,cos];
    // footprint -> boxes in the house frame. The old box was centred on the vertex centroid with half-sizes = max
    // |projection|, so it over-covered (the 30-point Atholton campus became one 337 x 129 m box over Freetown Road and
    // its own rally stop). Now: the true bbox when the footprint fills it, else a raster of the real polygon merged
    // into rectangles (one item + one collider per wing).
    const isHeroSt = b.hero && b.hero!=='atholton' && heroStyle[b.hero];
    const parts=footprintParts(pts, cx, cz, ex, ez, isHeroSt);
    parts.forEach((P, partNo)=>{
    let cx=P.cx, cz=P.cz, hw=P.hw, hd=P.hd;
    hw=Math.max(hw,2.2); hd=Math.max(hd,2.2);
    const area=4*hw*hd, isSchool=b.hero==='atholton', st=b.hero && !isSchool ? heroStyle[b.hero] : null;
    const rS=mulberry32(idx*2654435761 ^ 0x51), rG=mulberry32(idx*2246822519 ^ 0x6a ^ partNo*977);
    const kind = isSchool || (!st && area>520) ? 'big' : (!st && area<34 ? 'shed' : 'house');
    const storeys = isSchool? 2 : st? (st.storeys||2) : kind==='shed'? 1 : kind==='big'? 2 : (rS()<0.7?2:1);
    const wallTop = kind==='shed'? 2.5 : kind==='big'? (isSchool? 9 : 7.2) : FOUND + storeys*STOREY;
    const brick = kind==='house' && !st && rS()<0.24;
    const wallCol = st? st.wall : brick? BRICK_TINTS[Math.floor(rS()*BRICK_TINTS.length)] : SIDING[Math.floor(rS()*SIDING.length)];
    const roofCol = st? (st.roof? st.roof.c1 : '#6b7078') : ROOFS[Math.floor(rS()*ROOFS.length)];
    const hipRoll=rS(), chimRoll=rS(), chimSide=rS(), doorRoll=rS();
    // street side: the face toward the nearest real road
    const nr=roads.index.nearest(cx,cz,80);
    let front=[0,1];
    if(nr){ const vx=nr.px-cx, vz=nr.pz-cz, dX=vx*ex[0]+vz*ex[1], dZ=vx*ez[0]+vz*ez[1]; front = Math.abs(dZ)*1.4 >= Math.abs(dX) ? [1, Math.sign(dZ)||1] : [0, Math.sign(dX)||1]; }
    // garage + door bays on the front face (decided here so vegetation can keep driveways clear)
    const flen = front[0]===1 ? hw*2 : hd*2, nb=Math.max(1, Math.round(flen/BAY));
    let doorBay=-1, garageBays=[];
    if(kind==='house'){
      if(nb>=4 && (st || rG()<0.62)){ const gL=rG()<0.5; garageBays = nb>=6 && rG()<0.5 ? (gL?[0,1]:[nb-2,nb-1]) : (gL?[0]:[nb-1]);
        doorBay = gL? Math.min(nb-1, garageBays[garageBays.length-1]+1+(nb>4?1:0)) : Math.max(0, garageBays[0]-1-(nb>4?1:0)); }
      else doorBay=Math.floor(nb/2);
    }
    const it={ idx, cx, cz, ry, cos, sin, ex, ez, hw, hd, area, kind, storeys, wallTop, brick, wallCol, roofCol, st, isSchool, hero:b.hero,
      hipRoll, chimRoll, chimSide, doorRoll, front, nr, nb, doorBay, garageBays, drive:null };
    // the driveway (garage -> road), same maths as the builder
    if(garageBays.length && nr){
      const f=faceOf(it, front), lerp=(t)=>[f.a[0]+(f.b[0]-f.a[0])*t, f.a[1]+(f.b[1]-f.a[1])*t];
      const mid=lerp(((garageBays[0])/nb + (garageBays[garageBays.length-1]+1)/nb)/2), out=[f.axis===0? f.sign:0, f.axis===1? f.sign:0];
      const W=(lx,lz)=>[cx+ex[0]*lx+ez[0]*lz, cz+ex[1]*lx+ez[1]*lz], g0=W(mid[0]+out[0]*0.4, mid[1]+out[1]*0.4);
      const dirx=g0[0]-cx, dirz=g0[1]-cz, dl=Math.hypot(dirx,dirz)||1, reach=Math.min(45, Math.max(4, nr.d - hd + 2));
      it.drive={ a:[g0[0],g0[1]], b:[g0[0]+dirx/dl*reach, g0[1]+dirz/dl*reach], w:(garageBays.length>1? 4.9 : 2.6)+0.6 };
      drives.push(it.drive);
    }
    items.push(it);
    colliders.push({ cx, cz, hw, hd, cos, sin, top:wallTop+1.5, type: b.hero? 'hero':'house' });
    const tk=Math.floor(cx/tile)+','+Math.floor(cz/tile);
    if(!tiles.has(tk)) tiles.set(tk, { key:tk, x0:Math.floor(cx/tile)*tile, z0:Math.floor(cz/tile)*tile, size:tile, idx:[] });
    tiles.get(tk).idx.push(items.length-1);
    });
  });
  return { items, colliders, drives, tiles, tileSize:tile };
}
function faceOf(it, sel){
  const { hw, hd }=it;
  const faces=[ { axis:1, sign: 1, a:[ hw, hd], b:[-hw, hd], len:hw*2 }, { axis:1, sign:-1, a:[-hw,-hd], b:[ hw,-hd], len:hw*2 },
                { axis:0, sign: 1, a:[ hw,-hd], b:[ hw, hd], len:hd*2 }, { axis:0, sign:-1, a:[-hw, hd], b:[-hw,-hd], len:hd*2 } ];
  return sel ? faces.find(f=>f.axis===sel[0] && f.sign===sel[1]) : faces;
}

// ---------- 2. build one house into a Buckets at 'lean' or 'full' detail ----------
// lean: textured walls + roof (what you see from a distance). full: + foundation, door/stoop/porch, garage,
// driveway + mailbox, soffits, fascia, chimney, lit-window quads, contact-shadow skirt.
const MB_POST=(()=>{ const g=new THREE.BoxGeometry(0.09,1.05,0.09); g.translate(0,0.52,0); return g; })();
const MB_BOX=(()=>{ const g=new THREE.CylinderGeometry(0.15,0.15,0.48,4,1,false,0,Math.PI); g.rotateZ(Math.PI/2); g.rotateY(Math.PI/2); g.translate(0,1.12,0); return g; })();
const MB_BASE=(()=>{ const g=new THREE.BoxGeometry(0.3,0.16,0.48); g.translate(0,1.06,0); return g; })();
const MBC=['#1f2228','#2a3a52','#f0eee8','#7a1f24'];
export function buildHouse(B, it, level, out={ winQuads:[], contact:[] }, roads=null){
  const full = level==='full';
  const { cx, cz, ex, ez, hw, hd, ry, area, kind, storeys, wallTop, brick, wallCol, roofCol, st, isSchool }=it;
  const W=(lx,lz,y)=>[cx+ex[0]*lx+ez[0]*lz, y, cz+ex[1]*lx+ez[1]*lz];
  const rW=mulberry32(it.idx*3266489917 ^ 0x77), rD=mulberry32(it.idx*668265263 ^ 0x2b);
  const IN_MID=[cx, wallTop*0.5, cz], IN_ROOF=[cx, wallTop-4, cz];
  if(full && kind!=='shed'){ const fw=hw+0.04, fd=hd+0.04, C=[[fw,fd],[-fw,fd],[-fw,-fd],[fw,-fd]];
    for(let k=0;k<4;k++){ const a=C[k], b2=C[(k+1)%4]; quad(B,'found', W(a[0],a[1],0),W(b2[0],b2[1],0),W(b2[0],b2[1],FOUND),W(a[0],a[1],FOUND), [0,0],[1,0],[1,0.3],[0,0.3], '#ffffff', [cx,FOUND*0.5,cz]); } }
  const y0 = kind==='shed' || !full ? 0 : FOUND;   // lean houses: walls to the ground (no foundation ring)
  for(const f of faceOf(it)){
    const isFront = full && f.axis===it.front[0] && f.sign===it.front[1];
    const nb=Math.max(1, Math.round(f.len/BAY));
    if(kind==='shed'){ quad(B,'wallBlank', W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,0],[f.len/BAY,0],[f.len/BAY,wallTop/STOREY],[0,wallTop/STOREY], wallCol, IN_MID); continue; }
    if(kind==='big'){ quad(B,'store', W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,0],[f.len/6,0],[f.len/6,(wallTop-y0)/3.6],[0,(wallTop-y0)/3.6], isSchool? '#d7c6b0' : wallCol, IN_MID); continue; }
    const key = brick? 'wallBrick' : 'wallSiding';
    const vTop=(wallTop-y0)/STOREY, vOff = full? 0 : -FOUND/STOREY;  // lean: keep windows at the same height
    const doorBay = isFront? it.doorBay : -1, garageBays = isFront? it.garageBays : [];
    const lerp=(t)=>[f.a[0]+(f.b[0]-f.a[0])*t, f.a[1]+(f.b[1]-f.a[1])*t];
    if(isFront && (doorBay>=0 || garageBays.length)){
      for(let k=0;k<nb;k++){ const p=lerp(k/nb), q=lerp((k+1)/nb); const special = k===doorBay || garageBays.includes(k);
        quad(B, special? 'wallBlank':key, W(...p,y0),W(...q,y0),W(...q,y0+STOREY),W(...p,y0+STOREY), [k,0],[k+1,0],[k+1,1],[k,1], wallCol, IN_MID); }
      if(vTop>1.001) quad(B,key, W(...f.a,y0+STOREY),W(...f.b,y0+STOREY),W(...f.b,wallTop),W(...f.a,wallTop), [0,1],[nb,1],[nb,vTop],[0,vTop], wallCol, IN_MID);
      const outv=[f.axis===0? f.sign:0, f.axis===1? f.sign:0], along=[(f.b[0]-f.a[0])/f.len, (f.b[1]-f.a[1])/f.len];
      if(doorBay>=0){ const c=lerp((doorBay+0.5)/nb), half=0.5;
        const p0=[c[0]-along[0]*half+outv[0]*0.03, c[1]-along[1]*half+outv[1]*0.03], p1=[c[0]+along[0]*half+outv[0]*0.03, c[1]+along[1]*half+outv[1]*0.03];
        const dc = st && st.details ? ((st.details.find(d=>d.t==='door')||{}).color || DOORS[0]) : DOORS[Math.floor(it.doorRoll*DOORS.length)];
        quad(B,'door', W(...p0,y0),W(...p1,y0),W(...p1,y0+2.1),W(...p0,y0+2.1), [0,0],[1,0],[1,1],[0,1], dc, IN_MID);
        const sp=W(c[0]+outv[0]*0.75, c[1]+outv[1]*0.75, 0); boxAt(B,'found', sp[0], FOUND*0.5, sp[2], ry, f.axis===1?1.8:1.4, FOUND, f.axis===1?1.4:1.8, '#d8d4cc');
        const pr=W(c[0]+outv[0]*0.6, c[1]+outv[1]*0.6, 0); boxAt(B,'trim', pr[0], y0+2.55, pr[2], ry, f.axis===1?1.9:1.2, 0.12, f.axis===1?1.2:1.9, '#ffffff'); }
      if(garageBays.length){ const mid=lerp(((garageBays[0])/nb + (garageBays[garageBays.length-1]+1)/nb)/2), gw=garageBays.length>1? 4.9 : 2.6;
        const p0=[mid[0]-along[0]*gw/2+outv[0]*0.03, mid[1]-along[1]*gw/2+outv[1]*0.03], p1=[mid[0]+along[0]*gw/2+outv[0]*0.03, mid[1]+along[1]*gw/2+outv[1]*0.03];
        quad(B,'garage', W(...p0,y0),W(...p1,y0),W(...p1,y0+2.25),W(...p0,y0+2.25), [0,0],[garageBays.length,0],[garageBays.length,1],[0,1], '#ffffff', IN_MID); }
    } else {
      quad(B,key, W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,vOff],[nb,vOff],[nb,vTop+vOff],[0,vTop+vOff], wallCol, IN_MID);
    }
    if(full){ const outv=[f.axis===0? f.sign:0, f.axis===1? f.sign:0];
      for(let fl=0; fl<storeys; fl++) for(let k=0;k<nb;k++){
        if(isFront && fl===0 && (k===doorBay || garageBays.includes(k))) continue;
        if(rW()>0.55) continue;
        const c=lerp((k+0.5)/nb), y=y0+fl*STOREY+0.85+0.675, wpos=W(c[0]+outv[0]*0.03, c[1]+outv[1]*0.03, y);
        out.winQuads.push([wpos[0], y, wpos[2], f, ex, ez, cx, cz]); } }
  }
  if(full && it.drive){ // driveway (concrete) + mailbox at the kerb
    const d=it.drive, vx=d.b[0]-d.a[0], vz=d.b[1]-d.a[1], L=Math.hypot(vx,vz)||1, nx=-vz/L, nz=vx/L, hw2=d.w/2;
    quad(B,'drive', [d.a[0]+nx*hw2,0.08,d.a[1]+nz*hw2],[d.a[0]-nx*hw2,0.08,d.a[1]-nz*hw2],[d.b[0]-nx*hw2,0.08,d.b[1]-nz*hw2],[d.b[0]+nx*hw2,0.08,d.b[1]+nz*hw2],
      [0,0],[1,0],[1,L*0.14],[0,L*0.14], '#ffffff', [(d.a[0]+d.b[0])/2,-1,(d.a[1]+d.b[1])/2]);
    // kerb apron: flared concrete lip over the last stretch to the road, at sidewalk-top
    // height (0.15 vs the drive's 0.08) so the driveway reads unbroken across the walk band
    const ab=[d.b[0]-vx/L*2.6, d.b[1]-vz/L*2.6], aw2=hw2+0.65;
    quad(B,'drive', [ab[0]+nx*aw2,0.15,ab[1]+nz*aw2],[ab[0]-nx*aw2,0.15,ab[1]-nz*aw2],[d.b[0]-nx*aw2,0.15,d.b[1]-nz*aw2],[d.b[0]+nx*aw2,0.15,d.b[1]+nz*aw2],
      [0,0],[1,0],[1,0.4],[0,0.4], '#ffffff', [(ab[0]+d.b[0])/2,-1,(ab[1]+d.b[1])/2]);
    const mx=d.b[0]-vx/L*1.2+nx*(hw2+0.7), mz=d.b[1]-vz/L*1.2+nz*(hw2+0.7), h=Math.atan2(vx,vz);
    if(!roads || !roads.index.paved(mx,mz)){ const M=new THREE.Matrix4().compose(new THREE.Vector3(mx,0,mz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0,h,0)), new THREE.Vector3(1,1,1));
      const c=MBC[Math.floor(rD()*MBC.length)]; B.add('pole', MB_POST, M, '#c9c2b4'); B.add('mailbox', MB_BOX, M, c); B.add('mailbox', MB_BASE, M, c); }
  }
  if(full && area<=4000){ const r=[[hw,hd],[-hw,hd],[-hw,-hd],[hw,-hd]], o=1.7; // contact-shadow skirt quads
    for(let k=0;k<4;k++){ const a=r[k], b2=r[(k+1)%4], P=(lx,lz)=>[cx+ex[0]*lx+ez[0]*lz, 0.03, cz+ex[1]*lx+ez[1]*lz];
      out.contact.push([P(a[0],a[1]), P(b2[0],b2[1]), P(b2[0]+Math.sign(b2[0])*o, b2[1]+Math.sign(b2[1])*o), P(a[0]+Math.sign(a[0])*o, a[1]+Math.sign(a[1])*o)]); } }
  // ---------- roof ----------
  if(kind==='big'){
    boxAt(B,'flatRoof', cx, wallTop+0.15, cz, ry, hw*2+0.3, 0.3, hd*2+0.3, isSchool? '#9a9590' : '#a4a6a8');
    if(full){ boxAt(B,'trim', cx, wallTop+0.45, cz, ry, hw*2+0.35, 0.3, hd*2+0.35, '#c9c6bf');
      const rU=mulberry32(it.idx*1597334677 ^ 0x13);
      for(let k=0;k<Math.min(4, Math.floor(area/400)); k++){ const u=W((rU()-0.5)*hw, (rU()-0.5)*hd, 0); boxAt(B,'trim', u[0], wallTop+0.9, u[2], ry, 2.2, 1.2, 1.6, '#b8bcc0'); } }
    return out;
  }
  const ridgeAlongX = st && st.roof && st.roof.ridge==='short' ? false : true;
  const RW = ridgeAlongX? hw : hd, RD = ridgeAlongX? hd : hw;
  const ov=0.42, rake=0.3, pitch= kind==='shed'? 0.35 : 0.5;
  const rise=(RD+ov)*pitch, ridgeY=wallTop+RD*pitch;
  const hip = kind==='house' && !st && it.hipRoll<0.28 && RW>RD*1.15;   // same choice at both levels
  const L=(r,s)=> ridgeAlongX? [r,s] : [s,r];
  const eaveY=wallTop-ov*pitch, rr=RW+rake, sr=RD+ov, uS=Math.hypot(sr, rise)/3;
  const fascia=(r0,s0,r1,s1)=>{ quad(B,'trim', W(...L(r0,s0),eaveY-0.2),W(...L(r1,s1),eaveY-0.2),W(...L(r1,s1),eaveY+0.02),W(...L(r0,s0),eaveY+0.02), [0,0],[1,0],[1,1],[0,1], '#ffffff', [cx,eaveY-0.1,cz]); };
  if(!hip){
    for(const sgn of [1,-1]){
      const a=W(...L(-rr, sgn*sr),eaveY), b=W(...L(rr, sgn*sr),eaveY), c=W(...L(rr,0),ridgeY+0.02), d=W(...L(-rr,0),ridgeY+0.02);
      quad(B,'roof', a,b,c,d, [0,0],[2*rr/3,0],[2*rr/3,uS],[0,uS], roofCol, IN_ROOF);
      if(full){ const sa=W(...L(-rr, sgn*sr),eaveY-0.01), sb=W(...L(rr, sgn*sr),eaveY-0.01), sc=W(...L(rr, sgn*RD),wallTop-0.02), sd=W(...L(-rr, sgn*RD),wallTop-0.02);
        quad(B,'trim', sa,sb,sc,sd,[0,0],[1,0],[1,1],[0,1],'#e9e6df', [(sa[0]+sc[0])/2, eaveY+1, (sa[2]+sc[2])/2]); fascia(-rr, sgn*sr, rr, sgn*sr); }
    }
    for(const sgn of [1,-1]){ const a=W(...L(sgn*RW,-RD),wallTop), b=W(...L(sgn*RW,RD),wallTop), c=W(...L(sgn*RW,0),ridgeY);
      tri(B,'wallBlank', a,b,c, [0,0],[2*RD/BAY,0],[RD/BAY,(ridgeY-wallTop)/STOREY], wallCol, IN_MID); }
  } else {
    const hr=Math.max(0.5, rr-sr);
    for(const sgn of [1,-1]){
      const a=W(...L(-rr, sgn*sr),eaveY), b=W(...L(rr, sgn*sr),eaveY), c=W(...L(hr,0),ridgeY+0.02), d=W(...L(-hr,0),ridgeY+0.02);
      quad(B,'roof', a,b,c,d, [0,0],[2*rr/3,0],[(rr+hr)/3,uS],[(rr-hr)/3,uS], roofCol, IN_ROOF);
      const e=W(...L(sgn*rr,-sr),eaveY), f2=W(...L(sgn*rr,sr),eaveY), g=W(...L(sgn*hr,0),ridgeY+0.02);
      tri(B,'roof', e,f2,g, [0,0],[2*sr/3,0],[sr/3,uS], roofCol, IN_ROOF);
      if(full){ fascia(-rr, sgn*sr, rr, sgn*sr); fascia(sgn*rr, -sr, sgn*rr, sr); }
    }
  }
  if(full && kind==='house' && it.chimRoll<0.4){ const s=it.chimSide<0.5?-1:1; const c=W(...L(s*(RW-0.6), RD*0.35), 0);
    const h=ridgeY+0.9; boxAt(B,'chimney', c[0], h/2, c[2], ry, 0.85, h, 0.6, '#ffffff'); boxAt(B,'trim', c[0], h+0.05, c[2], ry, 0.95, 0.1, 0.7, '#8e8a84'); }
  return out;
}

// ---------- 3. camera-distance LOD: lean everywhere, full detail wherever the camera is ----------
// Tiles (plan.tileSize m) get a lean mesh (built for all tiles, nearest the camera first) and, when the camera
// comes within fullIn m of the tile, a full-detail group (houses + lit windows + contact shadows) built in a
// scheduler slice; full groups are released beyond fullOut m (memory stays bounded wherever you drive).
export function litWindowMaterial(){ return new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }); }
function windowMesh(quads, mat){
  const pos=[], col=[], idx=[]; const cA=new THREE.Color(0xffc37a), cB=new THREE.Color(0xbfd9ff), cC=new THREE.Color(0xffe2b0);
  let seed=7; const r=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  for(const [x,y,z,f,ex,ez] of quads){ const c = r()<0.7? cA : r()<0.5? cB : cC, along = f.axis===1? ex : ez, hw=0.45, hh=0.66, base=pos.length/3;
    for(const [ox,oy] of [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){ pos.push(x+along[0]*ox, y+oy, z+along[1]*ox); col.push(c.r,c.g,c.b); }
    idx.push(base,base+1,base+2, base,base+2,base+3); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(col, v=>Math.round(v*255)),3,true)); g.setIndex(idx); g.computeBoundingSphere();
  const m=new THREE.Mesh(g, mat); m.matrixAutoUpdate=false; m.name='litWindows'; return m;
}
function contactMesh(quads, mat){
  const P=[], C=[]; for(const [a,b,c,d] of quads){ P.push(...a,...b,...c, ...a,...c,...d); C.push(0,0,0,107, 0,0,0,107, 0,0,0,0, 0,0,0,107, 0,0,0,0, 0,0,0,0); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(C),4,true)); g.computeBoundingSphere();
  const m=new THREE.Mesh(g, mat); m.name='contactShadows'; m.renderOrder=1; m.matrixAutoUpdate=false; return m;
}
export function createHouseLOD({ scene, plan, roads, atlas, atlasMat, scheduler, fullIn=260, fullOut=460, spawn=[0,0], syncLeanRadius=650, shadowAt=150 }){
  const group=new THREE.Group(); group.name='houses'; scene.add(group);
  const winMat=litWindowMaterial();
  const csMat=new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1 });
  // the day/night host looks up getObjectByName('litWindows') once at boot and tints its material: an empty
  // placeholder carries the shared material from the first frame; every streamed tile reuses it.
  const ph=windowMesh([], winMat); ph.visible=false; group.add(ph);
  const tiles=[...plan.tiles.values()].map(t=>({ ...t, cxm:t.x0+t.size/2, czm:t.z0+t.size/2, lean:null, full:null, wantFull:false }));
  let cam=[spawn[0], spawn[1]];
  const dist=(t)=>{ const dx=Math.max(t.x0-cam[0], 0, cam[0]-(t.x0+t.size)), dz=Math.max(t.z0-cam[1], 0, cam[1]-(t.z0+t.size)); return Math.hypot(dx,dz); };
  const stats={ leanTiles:0, fullTiles:0, fullBuilt:0, fullFreed:0 };
  function* buildTile(t, level){
    const B=new Buckets(1e9, { rect: atlas.rect, region: ATLAS_REGION }), out={ winQuads:[], contact:[] };
    let n=0; for(const i of t.idx){ buildHouse(B, plan.items[i], level, out, roads); if(++n%12===0) yield; }
    const g=new THREE.Group(); g.name='houseTile:'+level; B.build(g, { atlas: atlasMat }, { atlas:true });
    if(level==='full'){ if(out.winQuads.length) g.add(windowMesh(out.winQuads, winMat)); if(out.contact.length) g.add(contactMesh(out.contact, csMat)); }
    return g;
  }
  function setLean(t, g){ t.lean=g; t.cast=undefined; group.add(g); stats.leanTiles++; apply(t); }
  function setFull(t, g){ if(!t.wantFull){ dispose(g); return; } t.full=g; t.cast=undefined; group.add(g); stats.fullTiles++; stats.fullBuilt++; apply(t); }
  function apply(t){ const showFull=!!t.full; if(t.full) t.full.visible=showFull; if(t.lean) t.lean.visible=!showFull; }
  function dispose(g){ g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); g.removeFromParent(); }
  // boot: lean for every tile (near the spawn synchronously, the rest streamed nearest-first)
  for(const t of tiles){
    const job=()=>buildTile(t,'lean');
    if(dist(t) < syncLeanRadius){ const it=job(); let r; while(!(r=it.next()).done){} setLean(t, r.value); }
    else scheduler.add('lean:'+t.key, job, ()=>dist(t), (g)=>setLean(t,g));
  }
  function update(x, z){
    cam=[x,z];
    for(const t of tiles){
      const d=dist(t);
      if(d < fullIn && !t.wantFull){ t.wantFull=true; if(!t.full) scheduler.add('full:'+t.key, ()=>buildTile(t,'full'), ()=>dist(t)-1e6, (g)=>setFull(t,g)); }
      else if(d > fullOut && t.wantFull){ t.wantFull=false; if(t.full){ dispose(t.full); t.full=null; stats.fullTiles--; stats.fullFreed++; apply(t); } }
      // only tiles near the camera cast into the sun's shadow map (±80 m box): far tiles were ~14 shadow draws for nothing
      const cast=d < shadowAt; if(t.cast!==cast){ t.cast=cast; for(const g of [t.lean, t.full]) if(g) for(const m of g.children) if(m.name==='world_atlas') m.castShadow=cast; }
    }
  }
  return { group, update, stats, tiles };
}

// ---------- compatibility: build every house at one level, synchronously (older callers) ----------
export function buildHouses({ D, B, roads, level='full' }){
  const plan=planHouses({ D, roads }); const out={ winQuads:[], contact:[] };
  for(const it of plan.items) buildHouse(B, it, level, out, roads);
  return { colliders:plan.colliders, winQuads:out.winQuads, drives:plan.drives, contact:out.contact, plan, stats:{ houses:plan.items.length } };
}

export function buildLitWindows(scene, quads, tile=900){
  // vertical emissive window quads, merged per 900 m tile; every tile shares ONE material, so a host that
  // re-tints getObjectByName('litWindows').material.color for the day/night cycle tints them all
  const tiles=new Map(), mat=new THREE.MeshBasicMaterial({ vertexColors:true, side: THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  let positions, colors, idx;
  const cA=new THREE.Color(0xffc37a), cB=new THREE.Color(0xbfd9ff), cC=new THREE.Color(0xffe2b0);
  let seed=7; const r=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  for(const [x,y,z,f,ex,ez] of quads){
    const k=Math.floor(x/tile)+','+Math.floor(z/tile); if(!tiles.has(k)) tiles.set(k,{p:[],c:[],i:[]}); const T=tiles.get(k); positions=T.p; colors=T.c; idx=T.i;
    const c = r()<0.7? cA : r()<0.5? cB : cC;
    const along = f.axis===1? ex : ez; // horizontal axis of that wall
    const hw=0.45, hh=0.66;
    const base=positions.length/3;
    for(const [ox,oy] of [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){ positions.push(x+along[0]*ox, y+oy, z+along[1]*ox); colors.push(c.r,c.g,c.b); }
    idx.push(base,base+1,base+2, base,base+2,base+3);
  }
  let first=null;
  for(const T of tiles.values()){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(T.p,3));
    g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(T.c, v=>Math.round(v*255)),3,true));   // unlit: no normals needed
    g.setIndex(T.i); g.computeBoundingSphere();
    const m=new THREE.Mesh(g, mat); m.matrixAutoUpdate=false; m.name='litWindows'; scene.add(m); if(!first) first=m;
  }
  return first;
}

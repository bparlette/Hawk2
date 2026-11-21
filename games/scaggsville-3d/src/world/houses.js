// Scaggsville 3D — houses on the REAL OSM footprints.
// Each footprint -> oriented box (same collider maths as before), then a proper house:
// foundation, lap siding / brick bays with windows (world-scaled 2.9 m x 3.1 m bay tile), gable or hip
// roof with eave overhang + soffit + fascia, chimney, and on the side facing the nearest real road:
// front door + stoop, garage door + driveway to that road. Sheds (small) and commercial/institutional
// (large) footprints get their own treatment. Lit-window quads sit exactly on the painted windows.
import * as THREE from 'three';

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

export function buildHouses({ D, B, roads, rand, cfg, nearRoute }){
  const colliders=[], winQuads=[], drives=[];
  const heroStyle={}; for(const [bid,st] of Object.entries(D.heroes)) heroStyle[D.heroBuilding[bid]]=st;
  let nHouse=0, nShed=0, nBig=0;
  for(const b of D.buildings){
    const pts=b.pts;
    let cx=0,cz=0; for(const p of pts){cx+=p[0];cz+=p[1];} cx/=pts.length; cz/=pts.length;
    let bl=0,ba=0;
    for(let i=0;i<pts.length;i++){ const a=pts[i], c=pts[(i+1)%pts.length]; const L=Math.hypot(c[0]-a[0],c[1]-a[1]); if(L>bl){bl=L; ba=Math.atan2(c[0]-a[0], c[1]-a[1]);} }
    const ry=-ba+Math.PI/2, cos=Math.cos(ry), sin=Math.sin(ry);
    // local frame: ex = long axis (half-length hw), ez = depth axis (half-depth hd)
    const ex=[cos,-sin], ez=[sin,cos];
    let hw=0, hd=0;
    for(const p of pts){ const dx=p[0]-cx, dz=p[1]-cz; hw=Math.max(hw, Math.abs(dx*ex[0]+dz*ex[1])); hd=Math.max(hd, Math.abs(dx*ez[0]+dz*ez[1])); }
    hw=Math.max(hw,2.2); hd=Math.max(hd,2.2);
    const area=4*hw*hd;
    const isSchool = b.hero==='atholton';
    const st = b.hero && !isSchool ? heroStyle[b.hero] : null;
    const W=(lx,lz,y)=>[cx+ex[0]*lx+ez[0]*lz, y, cz+ex[1]*lx+ez[1]*lz];

    // ---------- kind ----------
    const kind = isSchool || (!st && area>520) ? 'big' : (!st && area<34 ? 'shed' : 'house');
    const storeys = isSchool? 2 : st? (st.storeys||2) : kind==='shed'? 1 : kind==='big'? 2 : (rand()<0.7?2:1);
    const wallTop = kind==='shed'? 2.5 : kind==='big'? (isSchool? 9 : 7.2) : FOUND + storeys*STOREY;
    const brick = kind==='house' && !st && rand()<0.24;
    const wallCol = st? st.wall : brick? BRICK_TINTS[Math.floor(rand()*BRICK_TINTS.length)] : SIDING[Math.floor(rand()*SIDING.length)];
    const roofCol = st? (st.roof? st.roof.c1 : '#6b7078') : ROOFS[Math.floor(rand()*ROOFS.length)];
    colliders.push({ cx, cz, hw, hd, cos, sin, top:wallTop+1.5, type: b.hero? 'hero':'house' });
    const IN_MID=[cx, wallTop*0.5, cz], IN_ROOF=[cx, wallTop-4, cz];

    // ---------- which side faces the street ----------
    const nr=roads.index.nearest(cx,cz,80);
    let front=[0,1]; // [axis 0=ex|1=ez, sign]
    if(nr){ const vx=nr.px-cx, vz=nr.pz-cz; const dX=vx*ex[0]+vz*ex[1], dZ=vx*ez[0]+vz*ez[1];
      front = Math.abs(dZ)*1.4 >= Math.abs(dX) ? [1, Math.sign(dZ)||1] : [0, Math.sign(dX)||1]; }

    // ---------- foundation ----------
    if(kind!=='shed') boxAt(B,'found', cx, FOUND/2, cz, ry, hw*2+0.08, FOUND, hd*2+0.08, '#ffffff');

    // ---------- walls ----------
    const y0 = kind==='shed'? 0 : FOUND;
    const faces=[ // [axis, sign] -> wall quad endpoints in local coords, length
      { axis:1, sign: 1, a:[ hw, hd], b:[-hw, hd], len:hw*2 },
      { axis:1, sign:-1, a:[-hw,-hd], b:[ hw,-hd], len:hw*2 },
      { axis:0, sign: 1, a:[ hw,-hd], b:[ hw, hd], len:hd*2 },
      { axis:0, sign:-1, a:[-hw, hd], b:[-hw,-hd], len:hd*2 },
    ];
    for(const f of faces){
      const isFront = f.axis===front[0] && f.sign===front[1];
      const nb=Math.max(1, Math.round(f.len/BAY));
      if(kind==='shed'){ quad(B,'wallBlank', W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,0],[f.len/BAY,0],[f.len/BAY,wallTop/STOREY],[0,wallTop/STOREY], wallCol, IN_MID); continue; }
      if(kind==='big'){
        const key='store';
        quad(B,key, W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,0],[f.len/6,0],[f.len/6,(wallTop-y0)/3.6],[0,(wallTop-y0)/3.6], isSchool? '#d7c6b0' : wallCol, IN_MID);
        continue;
      }
      const key = brick? 'wallBrick' : 'wallSiding';
      const vTop=(wallTop-y0)/STOREY;
      // door / garage bays on the front ground floor
      let doorBay=-1, garageBays=[];
      if(isFront){
        if(nb>=4 && storeys>=1 && (st || rand()<0.62)){ const gL=rand()<0.5; garageBays = nb>=6 && rand()<0.5 ? (gL?[0,1]:[nb-2,nb-1]) : (gL?[0]:[nb-1]);
          doorBay = gL? Math.min(nb-1, garageBays[garageBays.length-1]+1+(nb>4?1:0)) : Math.max(0, garageBays[0]-1-(nb>4?1:0)); }
        else doorBay = Math.floor(nb/2);
      }
      const lerp=(t)=>[f.a[0]+(f.b[0]-f.a[0])*t, f.a[1]+(f.b[1]-f.a[1])*t];
      if(isFront && (doorBay>=0 || garageBays.length)){
        // ground floor bay by bay (special bays blank), upper floors one quad
        for(let k=0;k<nb;k++){ const p=lerp(k/nb), q=lerp((k+1)/nb); const special = k===doorBay || garageBays.includes(k);
          quad(B, special? 'wallBlank':key, W(...p,y0),W(...q,y0),W(...q,y0+STOREY),W(...p,y0+STOREY), [k,0],[k+1,0],[k+1,1],[k,1], wallCol, IN_MID); }
        if(vTop>1.001) quad(B,key, W(...f.a,y0+STOREY),W(...f.b,y0+STOREY),W(...f.b,wallTop),W(...f.a,wallTop), [0,1],[nb,1],[nb,vTop],[0,vTop], wallCol, IN_MID);
        // front door + stoop
        if(doorBay>=0){ const t=(doorBay+0.5)/nb, c=lerp(t); const out=[f.axis===0? f.sign:0, f.axis===1? f.sign:0];
          const half=0.5, along=[(f.b[0]-f.a[0])/f.len, (f.b[1]-f.a[1])/f.len];
          const p0=[c[0]-along[0]*half+out[0]*0.03, c[1]-along[1]*half+out[1]*0.03], p1=[c[0]+along[0]*half+out[0]*0.03, c[1]+along[1]*half+out[1]*0.03];
          const dc = st && st.details ? ((st.details.find(d=>d.t==='door')||{}).color || DOORS[0]) : DOORS[Math.floor(rand()*DOORS.length)];
          quad(B,'door', W(...p0,y0+0.0),W(...p1,y0+0.0),W(...p1,y0+2.1),W(...p0,y0+2.1), [0,0],[1,0],[1,1],[0,1], dc, IN_MID);
          const sp=W(c[0]+out[0]*0.75, c[1]+out[1]*0.75, 0); boxAt(B,'found', sp[0], FOUND*0.5, sp[2], ry, f.axis===1?1.8:1.4, FOUND, f.axis===1?1.4:1.8, '#d8d4cc');
          // little porch roof
          const pr=W(c[0]+out[0]*0.6, c[1]+out[1]*0.6, 0); boxAt(B,'trim', pr[0], y0+2.55, pr[2], ry, f.axis===1?1.9:1.2, 0.12, f.axis===1?1.2:1.9, '#ffffff');
        }
        // garage door + driveway to the real road
        if(garageBays.length){ const t0=garageBays[0]/nb, t1=(garageBays[garageBays.length-1]+1)/nb, mid=lerp((t0+t1)/2);
          const out=[f.axis===0? f.sign:0, f.axis===1? f.sign:0], along=[(f.b[0]-f.a[0])/f.len, (f.b[1]-f.a[1])/f.len];
          const gw=garageBays.length>1? 4.9 : 2.6;
          const p0=[mid[0]-along[0]*gw/2+out[0]*0.03, mid[1]-along[1]*gw/2+out[1]*0.03], p1=[mid[0]+along[0]*gw/2+out[0]*0.03, mid[1]+along[1]*gw/2+out[1]*0.03];
          quad(B,'garage', W(...p0,y0),W(...p1,y0),W(...p1,y0+2.25),W(...p0,y0+2.25), [0,0],[garageBays.length,0],[garageBays.length,1],[0,1], '#ffffff', IN_MID);
          const g0=W(mid[0]+out[0]*0.4, mid[1]+out[1]*0.4, 0);
          if(nr){ // driveway: from the garage straight out to the road edge (perpendicular-ish)
            const dirx=g0[0]-cx, dirz=g0[2]-cz, dl=Math.hypot(dirx,dirz)||1;
            const reach=Math.min(45, Math.max(4, nr.d - hd + 2)); const end=[g0[0]+dirx/dl*reach, g0[2]+dirz/dl*reach];
            drives.push({ a:[g0[0],g0[2]], b:end, w: gw+0.6 }); }
        }
      } else {
        quad(B,key, W(...f.a,y0),W(...f.b,y0),W(...f.b,wallTop),W(...f.a,wallTop), [0,0],[nb,0],[nb,vTop],[0,vTop], wallCol, IN_MID);
      }
      // lit window quads on the painted window centres (subset; the cycle tints them)
      if(b.hero || nearRoute(cx,cz,cfg.houseDetailRadius)){
        const out=[f.axis===0? f.sign:0, f.axis===1? f.sign:0];
        for(let fl=0; fl<storeys; fl++) for(let k=0;k<nb;k++){
          if(isFront && fl===0 && (k===doorBay || garageBays.includes(k))) continue;
          if(rand()>0.55) continue;
          const c=lerp((k+0.5)/nb), y=y0+fl*STOREY+0.85+0.675;
          const wpos=W(c[0]+out[0]*0.03, c[1]+out[1]*0.03, y); winQuads.push([wpos[0], y, wpos[2], f, ex, ez, cx, cz]);
        }
      }
    }

    // ---------- roof ----------
    if(kind==='big'){
      boxAt(B,'flatRoof', cx, wallTop+0.15, cz, ry, hw*2+0.3, 0.3, hd*2+0.3, isSchool? '#9a9590' : '#a4a6a8');
      boxAt(B,'trim', cx, wallTop+0.45, cz, ry, hw*2+0.35, 0.3, hd*2+0.35, '#c9c6bf'); // parapet coping band
      // rooftop units
      for(let k=0;k<Math.min(4, Math.floor(area/400)); k++){ const u=W((rand()-0.5)*hw, (rand()-0.5)*hd, 0); boxAt(B,'trim', u[0], wallTop+0.9, u[2], ry, 2.2, 1.2, 1.6, '#b8bcc0'); }
      nBig++; continue;
    }
    const ridgeAlongX = st && st.roof && st.roof.ridge==='short' ? false : true; // ridge along the long axis by default
    const RW = ridgeAlongX? hw : hd, RD = ridgeAlongX? hd : hw;           // half-length along ridge, half-span
    const ov=0.42, rake=0.3, pitch= kind==='shed'? 0.35 : 0.5;          // rise per run
    const rise=(RD+ov)*pitch, ridgeY=wallTop+RD*pitch;
    const hip = kind==='house' && !st && rand()<0.28 && RW>RD*1.15;
    // local helpers in ridge frame: (r along ridge, s across) -> local (lx,lz)
    const L=(r,s)=> ridgeAlongX? [r,s] : [s,r];
    const eaveY=wallTop-ov*pitch;
    const rr=RW+rake, sr=RD+ov;
    const slopeLen=Math.hypot(sr, rise), uS=slopeLen/3;
    if(!hip){
      for(const sgn of [1,-1]){ // two slopes
        const a=W(...L(-rr, sgn*sr),eaveY), b=W(...L(rr, sgn*sr),eaveY), c=W(...L(rr,0),ridgeY+0.02), d=W(...L(-rr,0),ridgeY+0.02);
        quad(B,'roof', a,b,c,d, [0,0],[2*rr/3,0],[2*rr/3,uS],[0,uS], roofCol, IN_ROOF);
        // soffit (underside of the overhang) + fascia board
        const sa=W(...L(-rr, sgn*sr),eaveY-0.01), sb=W(...L(rr, sgn*sr),eaveY-0.01), sc=W(...L(rr, sgn*RD),wallTop-0.02), sd=W(...L(-rr, sgn*RD),wallTop-0.02);
        quad(B,'trim', sa,sb,sc,sd,[0,0],[1,0],[1,1],[0,1],'#e9e6df', [(sa[0]+sc[0])/2, eaveY+1, (sa[2]+sc[2])/2]);
        const fm=W(...L(0, sgn*(sr-0.02)),eaveY-0.08); boxAt(B,'trim', fm[0], fm[1], fm[2], ry, ridgeAlongX? 2*rr: 0.06, 0.2, ridgeAlongX? 0.06 : 2*rr, '#ffffff');
      }
      for(const sgn of [1,-1]){ // gable end walls (siding, no window) + rake boards
        const a=W(...L(sgn*RW,-RD),wallTop), b=W(...L(sgn*RW,RD),wallTop), c=W(...L(sgn*RW,0),ridgeY);
        tri(B,'wallBlank', a,b,c, [0,0],[2*RD/BAY,0],[RD/BAY,(ridgeY-wallTop)/STOREY], wallCol, IN_MID);
      }
    } else {
      const hr=Math.max(0.5, rr-sr); // ridge half-length on a hip roof
      for(const sgn of [1,-1]){
        const a=W(...L(-rr, sgn*sr),eaveY), b=W(...L(rr, sgn*sr),eaveY), c=W(...L(hr,0),ridgeY+0.02), d=W(...L(-hr,0),ridgeY+0.02);
        quad(B,'roof', a,b,c,d, [0,0],[2*rr/3,0],[(rr+hr)/3,uS],[(rr-hr)/3,uS], roofCol, IN_ROOF);
        const e=W(...L(sgn*rr,-sr),eaveY), f2=W(...L(sgn*rr,sr),eaveY), g=W(...L(sgn*hr,0),ridgeY+0.02);
        tri(B,'roof', e,f2,g, [0,0],[2*sr/3,0],[sr/3,uS], roofCol, IN_ROOF);
        const fm=W(...L(0, sgn*(sr-0.02)),eaveY-0.08); boxAt(B,'trim', fm[0], fm[1], fm[2], ry, ridgeAlongX? 2*rr: 0.06, 0.2, ridgeAlongX? 0.06 : 2*rr, '#ffffff');
        const fe=W(...L(sgn*(rr-0.02),0),eaveY-0.08); boxAt(B,'trim', fe[0], fe[1], fe[2], ry, ridgeAlongX? 0.06 : 2*sr, 0.2, ridgeAlongX? 2*sr : 0.06, '#ffffff');
      }
    }
    // chimney on ~40% of houses
    if(kind==='house' && rand()<0.4){ const s=rand()<0.5?-1:1; const c=W(...L(s*(RW-0.6), RD*0.35), 0);
      const h=ridgeY+0.9; boxAt(B,'chimney', c[0], h/2, c[2], ry, 0.85, h, 0.6, '#ffffff'); boxAt(B,'trim', c[0], h+0.05, c[2], ry, 0.95, 0.1, 0.7, '#8e8a84'); }
    if(kind==='shed') nShed++; else nHouse++;
  }
  return { colliders, winQuads, drives, stats:{ houses:nHouse, sheds:nShed, big:nBig } };
}

export function buildLitWindows(scene, quads){
  // vertical emissive window quads, merged, one draw — host re-tints material.color for the day/night cycle
  const positions=[], colors=[], idx=[];
  const cA=new THREE.Color(0xffc37a), cB=new THREE.Color(0xbfd9ff), cC=new THREE.Color(0xffe2b0);
  let seed=7; const r=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  for(const [x,y,z,f,ex,ez] of quads){
    const c = r()<0.7? cA : r()<0.5? cB : cC;
    const along = f.axis===1? ex : ez; // horizontal axis of that wall
    const hw=0.45, hh=0.66;
    const base=positions.length/3;
    for(const [ox,oy] of [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){ positions.push(x+along[0]*ox, y+oy, z+along[1]*ox); colors.push(c.r,c.g,c.b); }
    idx.push(base,base+1,base+2, base,base+2,base+3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(idx); g.computeVertexNormals();
  const m=new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side: THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }));
  m.matrixAutoUpdate=false; m.name='litWindows'; scene.add(m);
  return m;
}

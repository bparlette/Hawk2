// Hawk2 shared world3d — vegetation (first built for Scaggsville 3D): street / yard trees, foundation shrubs, and the REAL OSM woods.
// Instanced in 300 m chunks (frustum culling per chunk) with a scene.onBeforeRender distance cull, so
// draw calls stay bounded however much forest the map has. Per-instance colour variation.
import * as THREE from 'three';

const CHUNK=400;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

// ---------- tree models: alpha-tested leaf-card crowns on a 3-region atlas (leaves | bark | needles) ----------
// One material for everything (atlas), so a chunk is one draw. Crown normals point out from the crown
// centre (blended with up) for the soft, rounded light real canopies have; vertex colour = baked AO.
const U_LEAF=[0,0.75], U_BARK=[0.75,0.875], U_NEEDLE=[0.875,1.0];
function geo(P,N,UV,C){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); return g; }
function crown(R, clusters, crownC, crownR, tint){
  // clusters: [[x,y,z,r], ...] -> 3 crossed cards each
  const P=[],N=[],UV=[],C=[]; const base=new THREE.Color(tint||'#ffffff');
  for(const [x,y,z,r] of clusters){
    for(let k=0;k<3;k++){
      const yaw=R()*Math.PI, tilt=(k===2? Math.PI/2*0.85 : (R()-0.5)*0.5);
      const ax=[Math.cos(yaw),0,Math.sin(yaw)];                     // card horizontal axis
      const up=[ -Math.sin(yaw)*Math.sin(tilt), Math.cos(tilt), Math.cos(yaw)*Math.sin(tilt) ]; // card vertical axis
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]], uvs=[[U_LEAF[0],0],[U_LEAF[1],0],[U_LEAF[1],1],[U_LEAF[0],1]];
      const vs=corners.map(([a,b])=>[x+ax[0]*a*r+up[0]*b*r*1.25, y+ax[1]*a*r+up[1]*b*r*1.25, z+ax[2]*a*r+up[2]*b*r*1.25]);
      for(const i of [0,1,2,0,2,3]){ const v=vs[i];
        let nx=(v[0]-crownC[0])/crownR, ny=(v[1]-crownC[1])/crownR*0.8+0.45, nz=(v[2]-crownC[2])/crownR; const L=Math.hypot(nx,ny,nz)||1;
        P.push(...v); N.push(nx/L,ny/L,nz/L); UV.push(...uvs[i]);
        const ao=Math.min(1, 0.64+0.44*((v[1]-(crownC[1]-crownR))/(2*crownR))) * (0.90+0.25*Math.min(1,Math.hypot(v[0]-crownC[0],v[2]-crownC[2])/crownR));
        C.push(base.r*ao, base.g*ao, base.b*ao); }
    }
  }
  return geo(P,N,UV,C);
}
function cyl(a, b, r0, r1, seg=6, u=U_BARK, col='#ffffff'){
  // tapered cylinder from point a to b, bark-mapped
  const P=[],N=[],UV=[],C=[]; const c=new THREE.Color(col);
  const d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]), L=d.length(); d.normalize();
  const t1=new THREE.Vector3(1,0,0); if(Math.abs(d.x)>0.9) t1.set(0,0,1); const t2=new THREE.Vector3().crossVectors(d,t1).normalize(); t1.crossVectors(t2,d).normalize();
  for(let i=0;i<seg;i++){ const a0=i/seg*Math.PI*2, a1=(i+1)/seg*Math.PI*2;
    const ring=(ang,r,p)=>[p[0]+(t1.x*Math.cos(ang)+t2.x*Math.sin(ang))*r, p[1]+(t1.y*Math.cos(ang)+t2.y*Math.sin(ang))*r, p[2]+(t1.z*Math.cos(ang)+t2.z*Math.sin(ang))*r];
    const nrm=(ang)=>[t1.x*Math.cos(ang)+t2.x*Math.sin(ang), t1.y*Math.cos(ang)+t2.y*Math.sin(ang), t1.z*Math.cos(ang)+t2.z*Math.sin(ang)];
    const q=[ring(a0,r0,a), ring(a1,r0,a), ring(a1,r1,b), ring(a0,r1,b)], n=[nrm(a0),nrm(a1),nrm(a1),nrm(a0)];
    const uu=[[u[0]+(u[1]-u[0])*i/seg,0],[u[0]+(u[1]-u[0])*(i+1)/seg,0],[u[0]+(u[1]-u[0])*(i+1)/seg,L/4],[u[0]+(u[1]-u[0])*i/seg,L/4]];
    for(const k of [0,1,2,0,2,3]){ P.push(...q[k]); N.push(...n[k]); UV.push(...uu[k]); const ao=k<2?0.55:1.0; C.push(c.r*ao,c.g*ao,c.b*ao); } }
  return geo(P,N,UV,C);
}
function coneG(r, h, y, seed){
  const R=mulberry32(seed), g=new THREE.ConeGeometry(r, h, 9, 2, true); g.translate(0,y+h/2,0);
  const p=g.attributes.position; for(let i=0;i<p.count;i++){ p.setX(i,p.getX(i)*(1+(R()-0.5)*0.3)); p.setZ(i,p.getZ(i)*(1+(R()-0.5)*0.3)); }
  const ng=g.toNonIndexed(); ng.computeVertexNormals();
  const n=ng.attributes.position.count, uv=new Float32Array(n*2), c=new Float32Array(n*3);
  for(let i=0;i<n;i++){ const yy=(ng.attributes.position.getY(i)-y)/h; uv[i*2]=U_NEEDLE[0]+(U_NEEDLE[1]-U_NEEDLE[0])*((i%3)/2); uv[i*2+1]=yy; const k=0.5+0.5*yy; c[i*3]=k; c[i*3+1]=k; c[i*3+2]=k; }
  ng.setAttribute('uv',new THREE.BufferAttribute(uv,2)); ng.setAttribute('color',new THREE.BufferAttribute(c,3));
  return ng;
}
function merge(geos){
  let n=0; for(const g of geos) n+=g.attributes.position.count;
  const P=new Float32Array(n*3), N=new Float32Array(n*3), UV=new Float32Array(n*2), C=new Float32Array(n*3); let o=0;
  for(const g of geos){ const k=g.attributes.position.count;
    P.set(g.attributes.position.array,o*3); N.set(g.attributes.normal.array,o*3); UV.set(g.attributes.uv.array,o*2); C.set(g.attributes.color.array,o*3); o+=k; g.dispose(); }
  const m=new THREE.BufferGeometry(); m.setAttribute('position',new THREE.BufferAttribute(P,3)); m.setAttribute('normal',new THREE.BufferAttribute(N,3)); m.setAttribute('uv',new THREE.BufferAttribute(UV,2)); m.setAttribute('color',new THREE.BufferAttribute(C,3));
  m.computeBoundingSphere(); return m;
}
function dome(R, n, cy, rx, ry, rMin, rMax){ // cluster centres spread over an ellipsoid shell (+ one core)
  const out=[[0,cy,0,rMax*1.1]];
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+R()*0.6, e=(R()*0.9-0.25)*Math.PI/2; out.push([Math.cos(a)*Math.cos(e)*rx, cy+Math.sin(e)*ry, Math.sin(a)*Math.cos(e)*rx, rMin+R()*(rMax-rMin)]); }
  return out;
}
function deciduous(seed, { trunkH, crownY, rx, ry, n, rMin, rMax, branches=3, tint='#ffffff' }){
  const R=mulberry32(seed), parts=[cyl([0,0,0],[0,trunkH,0],0.3,0.2,7)];
  for(let i=0;i<branches;i++){ const a=i/branches*Math.PI*2+R(); parts.push(cyl([0,trunkH*0.75,0],[Math.cos(a)*rx*0.55, crownY+R()*ry*0.3, Math.sin(a)*rx*0.55],0.13,0.05,5)); }
  parts.push(crown(R, dome(R, n, crownY, rx, ry, rMin, rMax), [0,crownY,0], Math.max(rx,ry), tint));
  return merge(parts);
}
function makeModels(){
  return {
    oak:   deciduous(11, { trunkH:3.0, crownY:5.0, rx:2.6, ry:1.9, n:9, rMin:1.3, rMax:1.9, branches:3 }),
    maple: deciduous(21, { trunkH:3.4, crownY:5.8, rx:2.0, ry:2.5, n:8, rMin:1.1, rMax:1.7, branches:3, tint:'#f2ffe6' }),
    pine:  merge([ cyl([0,0,0],[0,3,0],0.24,0.16,6), coneG(2.3,3.4,1.6,31), coneG(1.8,3.0,3.6,32), coneG(1.25,2.6,5.6,33), coneG(0.7,2.0,7.4,34) ]),
    woods: deciduous(41, { trunkH:5.2, crownY:7.6, rx:2.9, ry:2.4, n:7, rMin:1.6, rMax:2.3, branches:2, tint:'#e6f0dc' }),
    shrub: merge([ crown(mulberry32(51), [[0,0.6,0,0.75],[0.55,0.5,0.2,0.6],[-0.45,0.45,-0.15,0.55]], [0,0.5,0], 0.9, '#cfe0c4') ]),
  };
}
// low-poly stand-ins for distant chunks (fewer cards, same silhouette)
function makeLods(){
  return {
    oak:   deciduous(61, { trunkH:3.0, crownY:5.0, rx:2.6, ry:1.9, n:4, rMin:1.7, rMax:2.3, branches:0 }),
    maple: deciduous(71, { trunkH:3.4, crownY:5.8, rx:2.0, ry:2.5, n:3, rMin:1.5, rMax:2.0, branches:0, tint:'#f2ffe6' }),
    pine:  merge([ cyl([0,0,0],[0,3,0],0.24,0.16,4), coneG(2.2,4.6,1.6,81), coneG(1.4,3.8,4.6,82) ]),
    woods: deciduous(91, { trunkH:5.2, crownY:7.6, rx:2.9, ry:2.4, n:3, rMin:2.2, rMax:2.8, branches:0, tint:'#e6f0dc' }),
  };
}

// ---------- chunked instancing ----------
class Forest {
  constructor(){ this.items=new Map(); }
  add(model, x, z, s, rot, tint){ const k=model+'|'+Math.floor(x/CHUNK)+','+Math.floor(z/CHUNK); if(!this.items.has(k)) this.items.set(k,[]); this.items.get(k).push([x,z,s,rot,tint]); }
  build(scene, models, mat, lods){
    const group=new THREE.Group(); group.name='vegetation'; const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), S=new THREE.Vector3(), C=new THREE.Color();
    const chunks=[]; let count=0;
    for(const [k,list] of this.items){
      const model=k.split('|')[0], geo=models[model];
      const im=new THREE.InstancedMesh(geo, mat, list.length);
      let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      list.forEach(([x,z,s,rot,tint],i)=>{ E.set(0,rot,0); Q.setFromEuler(E); V.set(x,0,z); S.set(s,s*(0.9+((i*7919)%100)/500),s); M.compose(V,Q,S); im.setMatrixAt(i,M);
        C.setRGB(tint[0],tint[1],tint[2]); im.setColorAt(i,C); x0=Math.min(x0,x); x1=Math.max(x1,x); z0=Math.min(z0,z); z1=Math.max(z1,z); });
      im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true;
      // bounding sphere of the chunk (three culls InstancedMesh by geometry bounds otherwise)
      const r=Math.hypot(x1-x0,z1-z0)/2+12; im.geometry=geo; im.boundingSphere=new THREE.Sphere(new THREE.Vector3((x0+x1)/2,5,(z0+z1)/2), r);
      im.castShadow = model!=='woods' && model!=='shrub';   // cull() narrows this further by distance im.receiveShadow=true; im.frustumCulled=true; im.matrixAutoUpdate=false;
      im.userData.center=new THREE.Vector3((x0+x1)/2,0,(z0+z1)/2); im.userData.r=r;
      im.userData.near=geo; im.userData.far=(lods&&lods[model])||geo; im.userData.model=model; im.userData.casts=im.castShadow;
      group.add(im); chunks.push(im); count+=list.length;
    }
    scene.add(group);
    return { group, chunks, count };
  }
}

export function vegetationMaterial(T){
  return new THREE.MeshStandardMaterial({ map:T.foliage, alphaTest:0.42, side:THREE.DoubleSide, vertexColors:true, roughness:0.9, metalness:0, envMapIntensity:0.45 });
}

// Streamed vegetation: indexes are built up front (cheap); each 400 m chunk's trees are generated + instanced in
// its own scheduler job (nearest the camera first, chunk-seeded RNG, so output is independent of order).
// Without a scheduler every chunk is built synchronously (same result).
export function buildVegetation({ scene, roads, colliders, drives, D, cfg, T, greens=[], scheduler=null, camera=()=>[0,0] }){
  const models=makeModels(), lods=makeLods(), mat=vegetationMaterial(T);
  const group=new THREE.Group(); group.name='vegetation'; scene.add(group);
  const chunks=[]; const stats={ street:0, yard:0, shrubs:0, woods:0, instances:0, chunks:0 };
  const ck=(x,z)=>Math.floor(x/CHUNK)+','+Math.floor(z/CHUNK);
  const bucket=(map,k,v)=>{ let l=map.get(k); if(!l) map.set(k,l=[]); l.push(v); };
  // ---- indexes ----
  const occ=new Map(), OC=20;
  colliders.forEach(c=>{ const r=Math.hypot(c.hw,c.hd)+3; for(let x=Math.floor((c.cx-r)/OC); x<=Math.floor((c.cx+r)/OC); x++) for(let z=Math.floor((c.cz-r)/OC); z<=Math.floor((c.cz+r)/OC); z++) bucket(occ, x+','+z, c); });
  const inHouse=(x,z,pad)=>{ const l=occ.get(Math.floor(x/OC)+','+Math.floor(z/OC)); if(!l) return false;
    for(const c of l){ const dx=x-c.cx, dz=z-c.cz; const lx=dx*c.cos-dz*c.sin, lz=dx*c.sin+dz*c.cos; if(Math.abs(lx)<c.hw+pad && Math.abs(lz)<c.hd+pad) return true; } return false; };
  const dgrid=new Map(), DG=20;   // driveways indexed (the old O(drives) scan per tree was most of the build time)
  for(const d of drives){ const x0=Math.min(d.a[0],d.b[0])-d.w, x1=Math.max(d.a[0],d.b[0])+d.w, z0=Math.min(d.a[1],d.b[1])-d.w, z1=Math.max(d.a[1],d.b[1])+d.w;
    for(let x=Math.floor(x0/DG); x<=Math.floor(x1/DG); x++) for(let z=Math.floor(z0/DG); z<=Math.floor(z1/DG); z++) bucket(dgrid, x+','+z, d); }
  const onDrive=(x,z)=>{ const l=dgrid.get(Math.floor(x/DG)+','+Math.floor(z/DG)); if(!l) return false;
    for(const d of l){ const ax=d.a[0],az=d.a[1], vx=d.b[0]-ax, vz=d.b[1]-az, L2=vx*vx+vz*vz||1; let t=((x-ax)*vx+(z-az)*vz)/L2; if(t<-0.05||t>1.05) continue; if(Math.hypot(x-ax-vx*t,z-az-vz*t)<d.w/2+1.2) return true; } return false; };
  const free=(x,z,pad=1.5)=> !roads.index.paved(x,z) && !roads.index.paved(x+pad,z) && !roads.index.paved(x-pad,z) && !roads.index.paved(x,z+pad) && !roads.index.paved(x,z-pad) && !inHouse(x,z,1.2);
  const segBy=new Map(), houseBy=new Map(), greenBy=new Map(), allChunks=new Set();
  for(const r of D.roads){ if(/^(motorway|trunk)/.test(r.hw) || r.hw==='service') continue;
    for(let i=0;i<r.pts.length-1;i++){ const k=ck((r.pts[i][0]+r.pts[i+1][0])/2, (r.pts[i][1]+r.pts[i+1][1])/2); bucket(segBy,k,[r,i]); allChunks.add(k); } }
  for(const c of colliders){ if(c.hw*c.hd*4>520) continue; const k=ck(c.cx,c.cz); bucket(houseBy,k,c); allChunks.add(k); }
  const GB=greens.map(poly=>{ let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; for(const p of poly){ x0=Math.min(x0,p[0]); x1=Math.max(x1,p[0]); z0=Math.min(z0,p[1]); z1=Math.max(z1,p[1]); } return { poly, x0,x1,z0,z1 }; });
  for(const g of GB) for(let x=Math.floor(g.x0/CHUNK); x<=Math.floor(g.x1/CHUNK); x++) for(let z=Math.floor(g.z0/CHUNK); z<=Math.floor(g.z1/CHUNK); z++){ const k=x+','+z; bucket(greenBy,k,g); allChunks.add(k); }
  // ---- distance-to-road raster (10 m, multi-source BFS) for woods density banding ----
  const DC=10; let gx0=1e9,gx1=-1e9,gz0=1e9,gz1=-1e9;
  for(const g of GB){ gx0=Math.min(gx0,g.x0); gx1=Math.max(gx1,g.x1); gz0=Math.min(gz0,g.z0); gz1=Math.max(gz1,g.z1); }
  for(const r of D.roads) for(const p of r.pts){ gx0=Math.min(gx0,p[0]); gx1=Math.max(gx1,p[0]); gz0=Math.min(gz0,p[1]); gz1=Math.max(gz1,p[1]); }
  const GW=Math.ceil((gx1-gx0)/DC)+2, GH=Math.ceil((gz1-gz0)/DC)+2, dist=new Float32Array(GW*GH).fill(1e9), queue=new Int32Array(GW*GH); let qh=0, qt=0;
  for(const r of D.roads) for(let i=0;i<r.pts.length-1;i++){ const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1], n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/5));
    for(let k=0;k<=n;k++){ const ci=Math.floor((ax+(bx-ax)*k/n-gx0)/DC), cj=Math.floor((az+(bz-az)*k/n-gz0)/DC), id=cj*GW+ci; if(dist[id]>0){ dist[id]=0; queue[qt++]=id; } } }
  while(qh<qt){ const id=queue[qh++], d=dist[id]+DC, i=id%GW, j=(id/GW)|0;
    if(i>0 && dist[id-1]>d){ dist[id-1]=d; queue[qt++]=id-1; } if(i<GW-1 && dist[id+1]>d){ dist[id+1]=d; queue[qt++]=id+1; }
    if(j>0 && dist[id-GW]>d){ dist[id-GW]=d; queue[qt++]=id-GW; } if(j<GH-1 && dist[id+GW]>d){ dist[id+GW]=d; queue[qt++]=id+GW; } }
  const roadDist=(x,z)=>{ const i=Math.floor((x-gx0)/DC), j=Math.floor((z-gz0)/DC); return (i<0||j<0||i>=GW||j>=GH)? 1e9 : dist[j*GW+i]; };
  const band=(d)=> d<25? {step:9, model:'mix', s:[1.0,0.5]} : d<150? {step:13, model:'woods', s:[1.15,0.5]} : d<400? {step:20, model:'woods', s:[1.6,0.5]} : d<700? {step:30, model:'woods', s:[2.0,0.6]} : null;
  const LAT=9;
  // ---- forest floor decals (all woods, one mesh) ----
  { const floorP=[], floorI=[];
    for(const poly of greens){ const contour=poly.map(p=>new THREE.Vector2(p[0],p[1])); if(THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
      const tris=THREE.ShapeUtils.triangulateShape(contour,[]), b0=floorP.length/3; for(const p of contour) floorP.push(p.x, 0.022, p.y); for(const t of tris) floorI.push(b0+t[0], b0+t[2], b0+t[1]); }
    if(floorP.length){ const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(floorP,3));
      const uv=[]; for(let i=0;i<floorP.length;i+=3) uv.push(floorP[i]*0.25, floorP[i+2]*0.25); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2)); g.setIndex(floorI); g.computeVertexNormals();
      const m=new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map:T.leaf, roughness:1, color:0xbfb8a8 })); m.receiveShadow=true; m.name='forestFloor'; m.matrixAutoUpdate=false; scene.add(m); } }
  // ---- per-chunk generation ----
  const pickFrom=(R)=>{ const r=R(); return r<0.46?'oak' : r<0.8?'maple' : 'pine'; };
  const tintFrom=(R)=>{ const v=0.82+R()*0.3, h=(R()-0.5)*0.12; return [v*(1+h), v, v*(1-h*0.6)]; };
  function* genChunk(k){
    const [cxi, czi]=k.split(',').map(Number), x0=cxi*CHUNK, z0=czi*CHUNK, R=mulberry32((cxi*73856093)^(czi*19349663)^4471);
    const F=new Forest(), add=(m,x,z,s,rot,t)=>F.add(m,x,z,s,rot,t);
    for(const [r,i] of segBy.get(k)||[]){
      const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1], L=Math.hypot(bx-ax,bz-az), nx=-(bz-az)/(L||1), nz=(bx-ax)/(L||1);
      for(let s=R()*10; s<L; s+=9+R()*10){ if(R()>0.55*cfg.treeDensity) continue;
        const side=R()<0.5?-1:1, off=r.w/2+2.6+R()*5.5, x=ax+(bx-ax)*s/L+nx*off*side, z=az+(bz-az)*s/L+nz*off*side;
        if(!free(x,z) || onDrive(x,z)) continue; add(pickFrom(R), x, z, 0.85+R()*0.55, R()*6.28, tintFrom(R)); stats.street++; } }
    yield;
    for(const c of houseBy.get(k)||[]){
      const ex=[c.cos,-c.sin], ez=[c.sin,c.cos], n=Math.floor(R()*3);
      for(let q=0;q<n;q++){ const a=R()*6.28, d=Math.hypot(c.hw,c.hd)+3+R()*7, x=c.cx+Math.cos(a)*d, z=c.cz+Math.sin(a)*d;
        if(!free(x,z,2) || onDrive(x,z)) continue; add(pickFrom(R), x, z, 0.9+R()*0.6, R()*6.28, tintFrom(R)); stats.yard++; }
      for(const sg of [1,-1]){ const cnt=Math.floor(c.hw/1.6);
        for(let q=0;q<cnt;q++){ if(R()<0.45) continue; const lx=-c.hw+0.8+q*(2*c.hw-1.6)/Math.max(1,cnt-1), lz=sg*(c.hd+0.85);
          const x=c.cx+ex[0]*lx+ez[0]*lz, z=c.cz+ex[1]*lx+ez[1]*lz; if(roads.index.paved(x,z) || onDrive(x,z)) continue;
          add('shrub', x, z, 0.8+R()*0.6, R()*6.28, tintFrom(R)); stats.shrubs++; } }
    }
    yield;
    for(const g of greenBy.get(k)||[]){
      const poly=g.poly, inside=(x,z)=>{ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const [xi,zi]=poly[i],[xj,zj]=poly[j]; if(((zi>z)!==(zj>z)) && (x<(xj-xi)*(z-zi)/(zj-zi)+xi)) c=!c; } return c; };
      const lx0=Math.max(x0, Math.floor(g.x0/LAT)*LAT), lx1=Math.min(x0+CHUNK, g.x1), lz0=Math.max(z0, Math.floor(g.z0/LAT)*LAT), lz1=Math.min(z0+CHUNK, g.z1);
      for(let x=Math.ceil(lx0/LAT)*LAT; x<lx1; x+=LAT){ for(let z=Math.ceil(lz0/LAT)*LAT; z<lz1; z+=LAT){
        const b=band(roadDist(x,z)); if(!b) continue;
        const kk=Math.round(b.step/LAT); if(kk>1 && ((Math.round(x/LAT)%kk)!==0 || (Math.round(z/LAT)%kk)!==0)) continue;
        const h=mulberry32((Math.round(x/LAT)*2654435761) ^ (Math.round(z/LAT)*40503) ^ 0x77), jx=x+(h()-0.5)*b.step*0.8, jz=z+(h()-0.5)*b.step*0.8;
        if(!inside(jx,jz) || !free(jx,jz,2)) continue;
        const model = b.model==='mix' ? (h()<0.15?'pine': h()<0.55?'oak':'maple') : 'woods';
        add(model, jx, jz, b.s[0]+h()*b.s[1], h()*6.28, tintFrom(h)); stats.woods++; } yield; }
    }
    const built=F.build(group, models, mat, lods);
    for(const im of built.chunks) chunks.push(im);
    stats.instances+=built.count; stats.chunks+=built.chunks.length;
  }
  const chunkDist=(k)=>{ const [a,b]=k.split(',').map(Number), cp=camera(); return Math.hypot((a+0.5)*CHUNK-cp[0], (b+0.5)*CHUNK-cp[1]); };
  for(const k of allChunks){
    if(scheduler) scheduler.add('veg:'+k, ()=>genChunk(k), ()=>chunkDist(k));
    else { const it=genChunk(k); while(!it.next().done){} }
  }
  // distance cull + LOD swap per chunk (call cull(cameraPosition) each frame)
  const CULL=cfg.vegCullDistance||760, LOD_AT=260, SHADOW_AT=cfg.vegShadowDistance||140;
  function cull(cp){
    for(const im of chunks){ const u=im.userData, d=Math.hypot(u.center.x-cp.x, u.center.z-cp.z) - u.r;
      im.visible = d < (u.model==='shrub'? 300 : CULL);
      im.castShadow = u.casts && d < SHADOW_AT;   // the sun's shadow box is ±80 m round the player: farther chunks only cost shadow draws
      const g = d > LOD_AT ? u.far : u.near; if(im.geometry!==g) im.geometry=g; }
  }
  return { stats, cull, group };
}

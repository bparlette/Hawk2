// Scaggsville 3D — vegetation: street / yard trees, foundation shrubs, and the REAL OSM woods.
// Instanced in 300 m chunks (frustum culling per chunk) with a scene.onBeforeRender distance cull, so
// draw calls stay bounded however much forest the map has. Per-instance colour variation.
import * as THREE from 'three';
import { GREENS } from './greens.js';

const CHUNK=400;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

// ---------- tree models (merged, vertex-coloured: darker toward the bottom/inside = baked AO) ----------
function blob(r, detail, seed, cx, cy, cz, col, sy=1){
  const R=mulberry32(seed), g=new THREE.IcosahedronGeometry(r, detail), p=g.attributes.position, c=new Float32Array(p.count*3), base=new THREE.Color(col);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), L=Math.hypot(x,y,z)||1;
    const k=1+(R()-0.5)*0.32;                                  // lumpy silhouette
    p.setXYZ(i, cx+x*k, cy+y*k*sy, cz+z*k);
    const up=y/L, ao=0.55+0.45*(up*0.5+0.5), jit=0.9+R()*0.2;    // darker underneath
    c[i*3]=base.r*ao*jit; c[i*3+1]=base.g*ao*jit; c[i*3+2]=base.b*ao*jit;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c,3)); g.computeVertexNormals();
  return g.index? g.toNonIndexed() : g;
}
function trunk(h, r0, r1, col='#5b4636'){
  const g=new THREE.CylinderGeometry(r1, r0, h, 6, 1, true); g.translate(0,h/2,0);
  const c=new THREE.Color(col), n=g.attributes.position.count, a=new Float32Array(n*3);
  for(let i=0;i<n;i++){ const y=g.attributes.position.getY(i)/h; const k=0.55+0.45*y; a[i*3]=c.r*k; a[i*3+1]=c.g*k; a[i*3+2]=c.b*k; }
  g.setAttribute('color', new THREE.BufferAttribute(a,3));
  return g.index? g.toNonIndexed() : g;
}
function cone(r, h, y, col, seed){
  const R=mulberry32(seed), g=new THREE.ConeGeometry(r, h, 9, 2, true); g.translate(0,y+h/2,0);
  const p=g.attributes.position, c=new Float32Array(p.count*3), base=new THREE.Color(col);
  for(let i=0;i<p.count;i++){ const yy=(p.getY(i)-y)/h; p.setX(i,p.getX(i)*(1+(R()-0.5)*0.25)); p.setZ(i,p.getZ(i)*(1+(R()-0.5)*0.25));
    const k=0.5+0.5*yy; c[i*3]=base.r*k; c[i*3+1]=base.g*k; c[i*3+2]=base.b*k; }
  g.setAttribute('color', new THREE.BufferAttribute(c,3)); g.computeVertexNormals();
  return g.index? g.toNonIndexed() : g;
}
function merge(geos){
  let n=0; for(const g of geos) n+=g.attributes.position.count;
  const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3); let o=0;
  for(const g of geos){ const k=g.attributes.position.count; if(!g.attributes.normal) g.computeVertexNormals();
    P.set(g.attributes.position.array,o*3); N.set(g.attributes.normal.array,o*3); C.set(g.attributes.color.array,o*3); o+=k; g.dispose(); }
  const m=new THREE.BufferGeometry(); m.setAttribute('position',new THREE.BufferAttribute(P,3)); m.setAttribute('normal',new THREE.BufferAttribute(N,3)); m.setAttribute('color',new THREE.BufferAttribute(C,3));
  m.computeBoundingSphere(); return m;
}
function makeModels(){
  const leafA='#4f7a2e', leafB='#5e8434', leafC='#466b2a', leafD='#6f8f3a';
  return {
    oak: merge([ trunk(3.2,0.32,0.2),
      blob(2.4,1,11, 0,4.6,0, leafA), blob(1.9,1,12, 1.5,4.0,0.6, leafB), blob(1.8,1,13,-1.4,4.2,-0.5, leafC),
      blob(1.7,1,14, 0.3,5.6,-1.2, leafB), blob(1.5,1,15,-0.5,3.4,1.4, leafA) ]),                 // ~ 400 tris, street/yard
    maple: merge([ trunk(3.6,0.26,0.16,'#615040'),
      blob(2.1,1,21, 0,5.4,0, leafD, 1.25), blob(1.6,1,22, 1.1,4.4,0.4, leafB, 1.2), blob(1.5,1,23,-1.0,4.7,-0.3, leafD, 1.2) ]),
    pine: merge([ trunk(2.2,0.22,0.14,'#4e3b2c'),
      cone(2.3,3.4,1.6,'#2f4d2c',31), cone(1.8,3.0,3.6,'#35552f',32), cone(1.25,2.6,5.6,'#3a5c33',33), cone(0.7,2.0,7.4,'#406437',34) ]),
    woods: merge([ trunk(5,0.3,0.2,'#4d3c2e'),                                                          // cheap, tall: forest interior
      blob(3.0,0,41, 0,7.2,0, leafC, 1.15), blob(2.4,0,42, 1.4,5.8,0.8, leafA), blob(2.2,0,43,-1.3,6.2,-0.6, leafB) ]),
    shrub: merge([ blob(0.75,0,51, 0,0.55,0, '#3f6129', 0.8), blob(0.6,0,52, 0.55,0.45,0.2, '#4a6e2f', 0.8), blob(0.5,0,53,-0.45,0.4,-0.15, '#46682c', 0.8) ]), // 60 tris
  };
}
// low-poly stand-ins for distant chunks (same silhouette, ~1/5 the triangles)
function makeLods(){
  const leafA='#4f7a2e', leafB='#5e8434', leafC='#466b2a', leafD='#6f8f3a';
  return {
    oak: merge([ trunk(3.2,0.32,0.2), blob(2.6,0,61, 0,4.7,0, leafA), blob(2.0,0,62, 1.4,4.1,0.5, leafB), blob(1.9,0,63,-1.3,4.3,-0.5, leafC) ]),
    maple: merge([ trunk(3.6,0.26,0.16,'#615040'), blob(2.2,0,71, 0,5.3,0, leafD, 1.3), blob(1.6,0,72, 0.9,4.4,0.3, leafB, 1.2) ]),
    pine: merge([ trunk(2.2,0.22,0.14,'#4e3b2c'), cone(2.2,4.6,1.6,'#2f4d2c',81), cone(1.4,3.8,4.6,'#3a5c33',82) ]),
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
      im.castShadow = model!=='woods'; im.receiveShadow=true; im.frustumCulled=true; im.matrixAutoUpdate=false;
      im.userData.center=new THREE.Vector3((x0+x1)/2,0,(z0+z1)/2); im.userData.r=r;
      im.userData.near=geo; im.userData.far=(lods&&lods[model])||geo; im.userData.model=model;
      group.add(im); chunks.push(im); count+=list.length;
    }
    scene.add(group);
    return { group, chunks, count };
  }
}

export function vegetationMaterial(){
  return new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.95, metalness:0, envMapIntensity:0.5 });
}

export function buildVegetation({ scene, roads, colliders, drives, D, cfg, T }){
  const R=mulberry32(4471);
  const models=makeModels(), F=new Forest();
  // occupancy: houses (oriented boxes, padded) via a coarse grid
  const occ=new Map(), OC=20;
  colliders.forEach((c,i)=>{ const r=Math.hypot(c.hw,c.hd)+3; for(let x=Math.floor((c.cx-r)/OC); x<=Math.floor((c.cx+r)/OC); x++) for(let z=Math.floor((c.cz-r)/OC); z<=Math.floor((c.cz+r)/OC); z++){ const k=x+','+z; if(!occ.has(k)) occ.set(k,[]); occ.get(k).push(c); } });
  const inHouse=(x,z,pad)=>{ const l=occ.get(Math.floor(x/OC)+','+Math.floor(z/OC)); if(!l) return false;
    for(const c of l){ const dx=x-c.cx, dz=z-c.cz; const lx=dx*c.cos-dz*c.sin, lz=dx*c.sin+dz*c.cos; if(Math.abs(lx)<c.hw+pad && Math.abs(lz)<c.hd+pad) return true; } return false; };
  const onDrive=(x,z)=>{ for(const d of drives){ const ax=d.a[0],az=d.a[1],bx=d.b[0],bz=d.b[1], vx=bx-ax, vz=bz-az, L2=vx*vx+vz*vz||1; let t=((x-ax)*vx+(z-az)*vz)/L2; if(t<-0.05||t>1.05) continue; const px=ax+vx*t, pz=az+vz*t; if(Math.hypot(x-px,z-pz)<d.w/2+1.2) return true; } return false; };
  const free=(x,z,pad=1.5)=> !roads.index.paved(x,z) && !roads.index.paved(x+pad,z) && !roads.index.paved(x-pad,z) && !roads.index.paved(x,z+pad) && !roads.index.paved(x,z-pad) && !inHouse(x,z,1.2);
  const tint=()=>{ const v=0.82+R()*0.3, h=(R()-0.5)*0.12; return [v*(1+h), v, v*(1-h*0.6)]; };
  const pick=()=>{ const r=R(); return r<0.46?'oak' : r<0.8?'maple' : 'pine'; };
  let street=0, yard=0, shrubs=0, woods=0;

  // ---- street trees: behind the sidewalk / shoulder on residential + tertiary roads ----
  for(const r of D.roads){
    if(/^(motorway|trunk)/.test(r.hw) || r.hw==='service') continue;
    for(let i=0;i<r.pts.length-1;i++){
      const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1], L=Math.hypot(bx-ax,bz-az), nx=-(bz-az)/(L||1), nz=(bx-ax)/(L||1);
      for(let s=R()*10; s<L; s+=9+R()*10){
        if(R()>0.55*cfg.treeDensity) continue;
        const side=R()<0.5?-1:1, off=r.w/2+2.6+R()*5.5, x=ax+(bx-ax)*s/L+nx*off*side, z=az+(bz-az)*s/L+nz*off*side;
        if(!free(x,z) || onDrive(x,z)) continue;
        F.add(pick(), x, z, 0.85+R()*0.55, R()*6.28, tint()); street++;
      }
    }
  }
  // ---- yard trees + foundation shrubs per house ----
  for(const c of colliders){
    if(c.hw*c.hd*4>520) continue;
    const ex=[c.cos,-c.sin], ez=[c.sin,c.cos];
    const n=1+Math.floor(R()*3);
    for(let k=0;k<n;k++){ const a=R()*6.28, d=Math.hypot(c.hw,c.hd)+3+R()*7, x=c.cx+Math.cos(a)*d, z=c.cz+Math.sin(a)*d;
      if(!free(x,z,2) || onDrive(x,z)) continue; F.add(pick(), x, z, 0.9+R()*0.6, R()*6.28, tint()); yard++; }
    // shrubs along the two long walls
    for(const sg of [1,-1]){ const cnt=Math.floor(c.hw/1.6);
      for(let k=0;k<cnt;k++){ if(R()<0.45) continue; const lx=-c.hw+0.8+k*(2*c.hw-1.6)/Math.max(1,cnt-1), lz=sg*(c.hd+0.85);
        const x=c.cx+ex[0]*lx+ez[0]*lz, z=c.cz+ex[1]*lx+ez[1]*lz; if(roads.index.paved(x,z) || onDrive(x,z)) continue;
        F.add('shrub', x, z, 0.8+R()*0.6, R()*6.28, tint()); shrubs++; } }
  }
  // ---- distance-to-road raster (10 m cells, multi-source BFS) for density banding ----
  const DC=10; let gx0=1e9,gx1=-1e9,gz0=1e9,gz1=-1e9;
  for(const poly of GREENS) for(const p of poly){ gx0=Math.min(gx0,p[0]); gx1=Math.max(gx1,p[0]); gz0=Math.min(gz0,p[1]); gz1=Math.max(gz1,p[1]); }
  for(const r of D.roads) for(const p of r.pts){ gx0=Math.min(gx0,p[0]); gx1=Math.max(gx1,p[0]); gz0=Math.min(gz0,p[1]); gz1=Math.max(gz1,p[1]); }
  const GW=Math.ceil((gx1-gx0)/DC)+2, GH=Math.ceil((gz1-gz0)/DC)+2, dist=new Float32Array(GW*GH).fill(1e9), queue=new Int32Array(GW*GH); let qh=0, qt=0;
  for(const r of D.roads) for(let i=0;i<r.pts.length-1;i++){ const [ax,az]=r.pts[i],[bx,bz]=r.pts[i+1], n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/5));
    for(let k=0;k<=n;k++){ const ci=Math.floor((ax+(bx-ax)*k/n-gx0)/DC), cj=Math.floor((az+(bz-az)*k/n-gz0)/DC), id=cj*GW+ci; if(dist[id]>0){ dist[id]=0; queue[qt++]=id; } } }
  while(qh<qt){ const id=queue[qh++], d=dist[id]+DC, i=id%GW, j=(id/GW)|0;
    if(i>0 && dist[id-1]>d){ dist[id-1]=d; queue[qt++]=id-1; } if(i<GW-1 && dist[id+1]>d){ dist[id+1]=d; queue[qt++]=id+1; }
    if(j>0 && dist[id-GW]>d){ dist[id-GW]=d; queue[qt++]=id-GW; } if(j<GH-1 && dist[id+GW]>d){ dist[id+GW]=d; queue[qt++]=id+GW; } }
  const roadDist=(x,z)=>{ const i=Math.floor((x-gx0)/DC), j=Math.floor((z-gz0)/DC); return (i<0||j<0||i>=GW||j>=GH)? 1e9 : dist[j*GW+i]; };
  // spacing by band: dense where you see trunks, sparse + bigger where only the canopy line shows, none past the fog
  const band=(d)=> d<40? {step:7.5, model:'mix', s:[1.0,0.5]} : d<150? {step:11, model:'woods', s:[1.1,0.5]} : d<400? {step:18, model:'woods', s:[1.5,0.5]} : d<700? {step:26, model:'woods', s:[1.9,0.6]} : null;

  // ---- REAL woods (OSM green polygons): forest floor + trees ----
  const floorP=[], floorI=[];
  for(const poly of GREENS){
    // forest floor decal
    const contour=poly.map(p=>new THREE.Vector2(p[0],p[1]));
    if(THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    const tris=THREE.ShapeUtils.triangulateShape(contour,[]), base=floorP.length/3;
    for(const p of contour) floorP.push(p.x, 0.022, p.y);
    for(const t of tris) floorI.push(base+t[0], base+t[2], base+t[1]);
    // trees on a jittered grid; dense near roads (seen up close), sparse + tall inside
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; for(const p of poly){ x0=Math.min(x0,p[0]); x1=Math.max(x1,p[0]); z0=Math.min(z0,p[1]); z1=Math.max(z1,p[1]); }
    const inside=(x,z)=>{ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const [xi,zi]=poly[i],[xj,zj]=poly[j]; if(((zi>z)!==(zj>z)) && (x<(xj-xi)*(z-zi)/(zj-zi)+xi)) c=!c; } return c; };
    // walk a 7.5 m lattice; each band keeps the cells on its own coarser lattice
    const LAT=7.5;
    for(let x=x0; x<x1; x+=LAT) for(let z=z0; z<z1; z+=LAT){
      const b=band(roadDist(x,z)); if(!b) continue;
      const k=Math.round(b.step/LAT); if(k>1 && ((Math.round((x-x0)/LAT)%k)!==0 || (Math.round((z-z0)/LAT)%k)!==0)) continue;
      const jx=x+(R()-0.5)*b.step*0.8, jz=z+(R()-0.5)*b.step*0.8;
      if(!inside(jx,jz) || !free(jx,jz,2)) continue;
      const model = b.model==='mix' ? (R()<0.15?'pine': R()<0.55?'oak':'maple') : 'woods';
      F.add(model, jx, jz, b.s[0]+R()*b.s[1], R()*6.28, tint()); woods++;
    }
  }
  if(floorP.length){
    const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(floorP,3));
    const uv=[]; for(let i=0;i<floorP.length;i+=3) uv.push(floorP[i]*0.25, floorP[i+2]*0.25); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(floorI); g.computeVertexNormals();
    const m=new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map:T.leaf, roughness:1, color:0xbfb8a8 })); m.receiveShadow=true; m.name='forestFloor'; m.matrixAutoUpdate=false; scene.add(m);
  }

  const mat=vegetationMaterial();
  const built=F.build(scene, models, mat, makeLods());
  // distance cull: chunks beyond the fog are skipped entirely (frustum culling handles the sides)
  const prev=scene.onBeforeRender;
  const CULL=cfg.vegCullDistance||760, LOD_AT=260;
  scene.onBeforeRender=function(renderer, sc, camera, rt){
    if(prev) prev.call(this, renderer, sc, camera, rt);
    const cp=camera.position;
    for(const im of built.chunks){ const u=im.userData, d=Math.hypot(u.center.x-cp.x, u.center.z-cp.z) - u.r;
      im.visible = d < (u.model==='shrub'? 300 : CULL);
      const g = d > LOD_AT ? u.far : u.near; if(im.geometry!==g) im.geometry=g; }
  };
  return { stats:{ street, yard, shrubs, woods, instances:built.count, chunks:built.chunks.length } };
}

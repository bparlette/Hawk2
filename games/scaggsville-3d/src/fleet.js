// Scaggsville 3D — ambient parked-car fleet: cheap two-box silhouettes merged
// into 3 meshes total, for distant street dressing. The CREW cars are the real
// models (shared gpvehicles.js factory + src/crew.js rows); this is background.
import * as THREE from 'three';

const MATS={
  paint: new THREE.MeshStandardMaterial({ roughness:0.32, metalness:0.55, vertexColors:true }),
  dark:  new THREE.MeshStandardMaterial({ roughness:0.9, color:0x17181c, vertexColors:true }),
  glass: new THREE.MeshStandardMaterial({ roughness:0.12, metalness:0.7, color:0x1d2733 }),
};

// Ambient parked cars: ALL placements merged into 3 meshes (paint/dark/glass).
// placements: [{x, z, ry, paint}] — simple two-box silhouettes.
export function makeParkedFleet(placements){
  const grp=new THREE.Group();
  const paint=[], dark=[], glass=[];
  const tmp=new THREE.Object3D();
  function push(list, w,h,d, x,y,z, ry, tx,tz, color){
    const g=new THREE.BoxGeometry(w,h,d);
    tmp.position.set(tx,0,tz); tmp.rotation.set(0,ry,0); tmp.updateMatrix();
    const m=new THREE.Matrix4().makeTranslation(x,y,z).premultiply(tmp.matrix);
    g.applyMatrix4(m);
    const gg=g.index? g.toNonIndexed(): g;
    if(color){ const n=gg.attributes.position.count, arr=new Float32Array(n*3), c=new THREE.Color(color);
      for(let i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; }
      gg.setAttribute('color', new THREE.BufferAttribute(arr,3)); }
    list.push(gg);
  }
  function mergeGeos(list, mat, shadow){
    let total=0; for(const g of list) total+=g.attributes.position.count;
    if(!total) return null;
    const pos=new Float32Array(total*3), nor=new Float32Array(total*3), uv=new Float32Array(total*2), col=new Float32Array(total*3);
    let o=0;
    for(const g of list){ const n=g.attributes.position.count;
      pos.set(g.attributes.position.array,o*3); nor.set(g.attributes.normal.array,o*3);
      if(g.attributes.uv) uv.set(g.attributes.uv.array,o*2);
      if(g.attributes.color) col.set(g.attributes.color.array,o*3); else col.fill(1,o*3,(o+n)*3);
      o+=n; g.dispose(); }
    const merged=new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos,3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor,3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv,2));
    merged.setAttribute('color', new THREE.BufferAttribute(col,3));
    const mesh=new THREE.Mesh(merged, mat); if(shadow) mesh.castShadow=true;
    mesh.matrixAutoUpdate=false; return mesh;
  }
  for(const p of placements){
    push(paint, 1.8,0.62,4.5, 0,0.58,0, p.ry, p.x,p.z, p.paint);
    push(glass, 1.62,0.5,2.1, 0,1.1,-0.1, p.ry, p.x,p.z);
    push(dark, 1.84,0.26,4.4, 0,0.3,0, p.ry, p.x,p.z, 0xffffff);
  }
  const a=mergeGeos(paint, MATS.paint, true), b=mergeGeos(dark, MATS.dark), c=mergeGeos(glass, MATS.glass);
  if(a) grp.add(a); if(b) grp.add(b); if(c) grp.add(c);
  return grp;
}

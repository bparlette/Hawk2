// Hawk2 shared world3d — Buckets: merge-by-material batching split into spatial tiles.
// One mesh per (material key, tile): few draws, but frustum + shadow culling can still skip whole districts.
//   const B = new Buckets(900);  B.add('roof', geometry, matrix4, '#hexColour');  B.build(scene, materials, { roof:true })
// Geometry must carry position + normal (+ uv); a colour becomes a vertex-colour attribute (materials use vertexColors).
import * as THREE from 'three';

export class Buckets {
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

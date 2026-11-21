// Hawk2 shared world3d — ONE material for every house / prop surface (textures.js makeAtlas()).
// Geometry keeps metre-scaled UVs; Buckets (atlas mode) adds a per-vertex region rect `aRect`. The shader wraps the
// UV inside the rect (fract) and samples with textureGrad on the UNWRAPPED UV, so mips are chosen correctly and
// region edges don't seam. MR atlas: R = paint mask (vertex colour applies where 1), G = roughness, B = metalness.
// Result: a district of houses, sidewalks, poles and mailboxes is ONE draw instead of ~15.
import * as THREE from 'three';

// surface key -> atlas region (keys are the bucket keys the builders already use)
export const ATLAS_REGION = {
  wallSiding:'siding', wallBrick:'brick', wallBlank:'blank', store:'store', roof:'shingle', flatRoof:'white',
  trim:'white', found:'concrete', door:'door', garage:'garage', chimney:'brick',
  drive:'concrete', sidewalk:'concrete', shoulder:'asphalt', pole:'white', metal:'metal', mailbox:'metal',
};

export function atlasMaterial(T){
  const A=T.atlas;
  const m=new THREE.MeshStandardMaterial({ map:A.map, vertexColors:true, roughness:1, metalness:1, envMapIntensity:0.9 });
  m.onBeforeCompile=(sh)=>{
    sh.uniforms.uMR={ value:A.mr };
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nattribute vec4 aRect; varying vec4 vRect;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvRect=aRect;');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>','#include <common>\nuniform sampler2D uMR; varying vec4 vRect; vec3 gMR;')
      .replace('#include <map_fragment>',`
  vec2 aUv=vMapUv, tuv=vRect.xy+clamp(fract(aUv),0.002,0.998)*vRect.zw;
  vec2 gx=dFdx(aUv)*vRect.zw, gy=dFdy(aUv)*vRect.zw;
  diffuseColor*=textureGrad(map, tuv, gx, gy);
  gMR=textureGrad(uMR, tuv, gx, gy).rgb;`)
      .replace('#include <color_fragment>','#ifdef USE_COLOR\n diffuseColor.rgb*=mix(vec3(1.0), vColor, gMR.r);\n#endif')
      .replace('#include <roughnessmap_fragment>','float roughnessFactor=gMR.g;')
      .replace('#include <metalnessmap_fragment>','float metalnessFactor=gMR.b;');
  };
  m.customProgramCacheKey=()=>'hawk2-world3d-atlas-v1';
  return m;
}

// Hawk2 shared world3d — world-space grass: two detail scales + two macro tone fields, desaturated toward
// late-summer olive. Never visibly tiles at any distance. Apply to any flat ground mesh (UVs are ignored).
import * as THREE from 'three';

export function makeGrassMaterial(tex){
  const m=new THREE.MeshStandardMaterial({ map:tex.grass, roughness:1.0, envMapIntensity:0.3 });
  m.onBeforeCompile=(sh)=>{
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
  m.customProgramCacheKey=()=>'sv3d-grass-v2';
  return m;
}

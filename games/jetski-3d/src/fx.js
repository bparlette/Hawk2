// APEX WAKE — Realistic Water Spray, Rooster Tail, Chine Carve Sheets & Camera Lens Droplets
// Renders 1,400 dynamic spray/mist particles in 1 single draw call via custom Points ShaderMaterial.
import * as THREE from '../three.module.js';

const MAX_PARTS = 1400;

const SPRAY_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute float aKind; // 0 = white foam droplet, 1 = sunlit airy mist
varying float vAlpha;
varying float vKind;

void main() {
  vAlpha = aAlpha;
  vKind = aKind;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float dist = max(1.2, -mvPosition.z);
  gl_PointSize = clamp(aSize * (340.0 / dist), 1.5, 130.0);
}
`;

const SPRAY_FRAG = /* glsl */ `
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
varying float vAlpha;
varying float vKind;

float hash2(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  if (vAlpha <= 0.004) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;

  // Organic cloudy water-spray & feathery foam breakup (zero grid artifacts)
  float n1 = vnoise(gl_PointCoord * 5.2);
  float n2 = vnoise(gl_PointCoord * 11.4 + vec2(3.1, 1.7));
  float cloud = mix(0.68 + 0.32 * n2, 0.45 + 0.55 * (n1 * 0.65 + n2 * 0.35), vKind);
  float edge = smoothstep(1.0, 0.12, r + (1.0 - cloud) * 0.34);
  float soft = mix(pow(edge, 1.25), pow(edge, 2.0), vKind);
  float a = vAlpha * soft * cloud;

  // Sunlit bright cream-white foam crest + cool sea-mist shadow
  vec3 baseCol = mix(uSkyColor * 0.85 + vec3(0.24), vec3(0.99, 0.995, 1.0), 0.78);
  vec3 litCol = mix(baseCol, uSunColor * 1.15, smoothstep(0.45, -0.45, uv.y) * 0.48);
  gl_FragColor = vec4(litCol, clamp(a, 0.0, 0.90));
}
`;

export function createWaterFX(scene, preset) {
  const pos = new Float32Array(MAX_PARTS * 3);
  const vel = new Float32Array(MAX_PARTS * 3);
  const life = new Float32Array(MAX_PARTS);
  const maxLife = new Float32Array(MAX_PARTS);
  const size = new Float32Array(MAX_PARTS);
  const grow = new Float32Array(MAX_PARTS);
  const alpha = new Float32Array(MAX_PARTS);
  const kind = new Float32Array(MAX_PARTS);

  for (let i = 0; i < MAX_PARTS; i++) {
    pos[i * 3 + 1] = -999;
    alpha[i] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: SPRAY_VERT,
    fragmentShader: SPRAY_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSunColor: { value: preset.sunColor.clone() },
      uSkyColor: { value: preset.skyHorizon.clone() },
    },
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0;

  function spawn(px, py, pz, vx, vy, vz, sz, gRate, ttl, k = 0) {
    const i = cursor;
    cursor = (cursor + 1) % MAX_PARTS;
    pos[i * 3] = px;
    pos[i * 3 + 1] = py;
    pos[i * 3 + 2] = pz;
    vel[i * 3] = vx;
    vel[i * 3 + 1] = vy;
    vel[i * 3 + 2] = vz;
    size[i] = sz;
    grow[i] = gRate;
    life[i] = ttl;
    maxLife[i] = ttl;
    kind[i] = k;
    alpha[i] = 0.85;
  }

  return {
    applyPreset(p) {
      mat.uniforms.uSunColor.value.copy(p.sunColor);
      mat.uniforms.uSkyColor.value.copy(p.skyHorizon);
    },

    // Rear rooster-tail arc from jet-pump nozzle
    emitRoosterTail(origin, backDir, rightDir, speed, steer, boostOn) {
      if (speed < 3.0) return;
      const count = boostOn ? 11 : Math.min(8, Math.floor(speed * 0.28));
      const jetSpeed = 6.5 + speed * 0.42 + (boostOn ? 6.5 : 0);
      for (let n = 0; n < count; n++) {
        const spreadX = (Math.random() - 0.5) * 0.45 - steer * 0.52;
        const spreadY = 0.30 + Math.random() * 0.34 + (boostOn ? 0.18 : 0);
        const vx = (backDir.x + rightDir.x * spreadX) * jetSpeed + (Math.random() - 0.5) * 1.6;
        const vy = spreadY * jetSpeed * 0.62 + Math.random() * 1.4;
        const vz = (backDir.z + rightDir.z * spreadX) * jetSpeed + (Math.random() - 0.5) * 1.6;
        const isMist = Math.random() < 0.42 ? 1 : 0;
        spawn(
          origin.x + (Math.random() - 0.5) * 0.14,
          origin.y + (Math.random() - 0.5) * 0.08,
          origin.z + (Math.random() - 0.5) * 0.14,
          vx, vy, vz,
          isMist ? 0.55 + Math.random() * 0.5 : 0.22 + Math.random() * 0.28,
          isMist ? 2.4 : 0.8,
          isMist ? 0.65 + Math.random() * 0.45 : 0.38 + Math.random() * 0.28,
          isMist
        );
      }
    },

    // Dramatic sunlit wall-of-water spray sheet erupting from biting chine during carves
    emitCarveSpray(hullPos, rightDir, forwardDir, speed, steer) {
      const carve = Math.abs(steer);
      if (speed < 6.0 || carve < 0.18) return;
      const side = steer > 0 ? -1 : 1; // outer biting chine sprays outward
      const intensity = Math.min(1, (speed / 24) * carve);
      const count = Math.ceil(intensity * 10);
      for (let n = 0; n < count; n++) {
        const along = (Math.random() - 0.45) * 1.5;
        const sx = hullPos.x + rightDir.x * side * 0.62 + forwardDir.x * along;
        const sy = hullPos.y + 0.05 + Math.random() * 0.18;
        const sz = hullPos.z + rightDir.z * side * 0.62 + forwardDir.z * along;
        const outSpd = (3.8 + speed * 0.26) * (0.7 + Math.random() * 0.6);
        const vx = rightDir.x * side * outSpd + forwardDir.x * speed * 0.28 + (Math.random() - 0.5) * 1.5;
        const vy = (2.6 + intensity * 4.4) * (0.65 + Math.random() * 0.65);
        const vz = rightDir.z * side * outSpd + forwardDir.z * speed * 0.28 + (Math.random() - 0.5) * 1.5;
        const isMist = Math.random() < 0.5 ? 1 : 0;
        spawn(sx, sy, sz, vx, vy, vz, isMist ? 0.65 : 0.24, isMist ? 2.8 : 0.9, 0.45 + Math.random() * 0.42, isMist);
      }
    },

    // Radial explosion of white water on splashdown after jumping a wave or ramp
    emitSplashdown(hullPos, impactSpeed) {
      const power = Math.min(1.8, Math.max(0.4, impactSpeed / 7.5));
      const count = Math.floor(34 * power);
      for (let n = 0; n < count; n++) {
        const ang = (n / count) * Math.PI * 2 + Math.random() * 0.25;
        const rSpd = (3.2 + Math.random() * 5.6) * power;
        const isMist = Math.random() < 0.45 ? 1 : 0;
        spawn(
          hullPos.x + Math.cos(ang) * 0.65,
          hullPos.y + 0.1,
          hullPos.z + Math.sin(ang) * 0.95,
          Math.cos(ang) * rSpd,
          (3.4 + Math.random() * 4.8) * power,
          Math.sin(ang) * rSpd,
          isMist ? 0.8 : 0.30,
          isMist ? 3.2 : 1.1,
          0.55 + Math.random() * 0.5,
          isMist
        );
      }
    },

    update(dt) {
      const grav = 13.5;
      for (let i = 0; i < MAX_PARTS; i++) {
        if (life[i] <= 0) {
          alpha[i] = 0;
          continue;
        }
        life[i] -= dt;
        if (life[i] <= 0) {
          alpha[i] = 0;
          pos[i * 3 + 1] = -999;
          continue;
        }
        const i3 = i * 3;
        vel[i3] *= 1 - dt * 1.25;
        vel[i3 + 1] -= grav * dt * (kind[i] > 0.5 ? 0.35 : 1.0);
        vel[i3 + 2] *= 1 - dt * 1.25;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
        size[i] += grow[i] * dt;

        const u = life[i] / maxLife[i];
        alpha[i] = Math.sin(Math.min(1, (1 - u) * 5.0) * Math.PI * 0.5) * u * (kind[i] > 0.5 ? 0.52 : 0.88);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      geo.attributes.aKind.needsUpdate = true;
    },
  };
}

// ================================================================
// CAMERA LENS WATER DROPLETS OVERLAY (splatter + gravity streak + evaporate)
// ================================================================
export function createLensDroplets(canvas) {
  const ctx = canvas.getContext('2d');
  const drops = [];
  const MAX_DROPS = 34;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  function splatter(count = 6) {
    const w = canvas.width, h = canvas.height;
    for (let i = 0; i < count; i++) {
      if (drops.length >= MAX_DROPS) drops.shift();
      drops.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.82,
        r: 3.5 + Math.random() * 11,
        vy: 14 + Math.random() * 34,
        life: 1.0,
        decay: 0.22 + Math.random() * 0.25,
      });
    }
  }

  function update(dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!drops.length) return;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.vy * dt * (d.r / 7);
      d.life -= d.decay * dt;
      if (d.life <= 0 || d.y - d.r > canvas.height) {
        drops.splice(i, 1);
        continue;
      }
      const a = Math.min(1, d.life * 1.4) * 0.42;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(0.86, 1.18); // tear-drop gravity stretch
      // Subtle refractive rim
      const g = ctx.createRadialGradient(-d.r * 0.25, -d.r * 0.28, d.r * 0.1, 0, 0, d.r);
      g.addColorStop(0, `rgba(255,255,255,${a * 0.85})`);
      g.addColorStop(0.55, `rgba(180,235,255,${a * 0.22})`);
      g.addColorStop(0.88, `rgba(10,40,65,${a * 0.42})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, d.r, 0, Math.PI * 2);
      ctx.fill();
      // Crisp bright specular glint inside bead
      ctx.fillStyle = `rgba(255,255,255,${a * 1.5})`;
      ctx.beginPath();
      ctx.arc(-d.r * 0.28, -d.r * 0.30, Math.max(1.2, d.r * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return { resize, splatter, update };
}

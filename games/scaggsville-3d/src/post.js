// Scaggsville 3D — ACES Filmic + Half-Res Selective Bloom Post-Processing Pipeline
// Built for Three.js r160 & iPhone Safari:
//   - HDR HalfFloatType render target so ONLY true emissives (> threshold) bloom
//   - Half-resolution UnrealBloomPass (threshold 1.12) keeps paint, roads, sky & dark smoke clean
//   - OutputPass applies renderer.toneMapping (ACESFilmicToneMapping) + SRGBColorSpace
//   - Automatic quality step-down disables bloom (bypassing composer) if frame time exceeds floor

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createPost({ renderer, scene, camera, strength = 0.42, radius = 0.36, threshold = 1.12 } = {}) {
  let forced = null; // null = auto, true = ?bloom=1, false = ?bloom=0
  try {
    const q = new URLSearchParams(location.search).get('bloom');
    if (q === '0' || q === 'false') forced = false;
    else if (q === '1' || q === 'true') forced = true;
  } catch (_) {}

  let bloomOn = forced !== null ? forced : true;
  let steppedDown = false;
  let emaMs = 16.67;
  let renderMs = 0;
  let slowAcc = 0;
  const STEP_DOWN_MS = 24.5; // ~40 fps floor for iPhone Safari
  const STEP_DOWN_HOLD = 1.8;

  const dpr = renderer.getPixelRatio();
  const w = Math.max(1, innerWidth);
  const h = Math.max(1, innerHeight);
  const rtType = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const renderTarget = new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), {
    type: rtType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);

  const renderPass = new RenderPass(scene, camera);
  const halfW = Math.max(64, Math.floor(w / 2));
  const halfH = Math.max(64, Math.floor(h / 2));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(halfW, halfH), strength, radius, threshold);
  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  function setSize(nw, nh) {
    const pw = Math.max(1, nw), ph = Math.max(1, nh);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(pw, ph);
    bloomPass.resolution.set(Math.max(64, Math.floor(pw / 2)), Math.max(64, Math.floor(ph / 2)));
  }

  let lastTotalCalls = 0;
  let lastSceneCalls = 0;
  renderer.info.autoReset = false;

  function render(activeScene, activeCamera, rawDt = 0.0167, opts = null) {
    // Track rolling frame interval (ignore tab-switch spikes > 120 ms)
    if (rawDt > 0 && rawDt < 0.12) {
      const ms = rawDt * 1000;
      emaMs += (ms - emaMs) * 0.08;
      if (bloomOn && forced === null) {
        if (emaMs > STEP_DOWN_MS) {
          slowAcc += rawDt;
          if (slowAcc >= STEP_DOWN_HOLD) {
            bloomOn = false;
            steppedDown = true;
            slowAcc = 0;
          }
        } else {
          slowAcc = Math.max(0, slowAcc - rawDt * 0.5);
        }
      }
    }

    // Keep SKY_FRAG output in linear space when OutputPass encodes sRGB, and sRGB when bypassed
    const dome = opts && opts.dome;
    if (dome && dome.material && dome.material.uniforms && dome.material.uniforms.uLinearSky) {
      dome.material.uniforms.uLinearSky.value = bloomOn ? 1.0 : 0.0;
    }

    // Inside 2D dollhouse interiors, raise bloom threshold so bright cream walls never wash out
    const interior = !!(opts && opts.interior);
    bloomPass.threshold = interior ? 2.8 : threshold;
    bloomPass.strength = interior ? 0.18 : strength;

    const t0 = performance.now();
    renderer.info.reset();
    if (bloomOn) {
      renderPass.scene = activeScene;
      renderPass.camera = activeCamera;
      composer.render();
      lastTotalCalls = renderer.info.render.calls;
      lastSceneCalls = Math.max(0, lastTotalCalls - 13); // UnrealBloomPass + OutputPass add ~13 fullscreen passes
    } else {
      renderer.render(activeScene, activeCamera);
      lastTotalCalls = renderer.info.render.calls;
      lastSceneCalls = lastTotalCalls;
    }
    const dtRender = performance.now() - t0;
    renderMs += (dtRender - renderMs) * 0.15;
  }

  function setBloom(on) {
    forced = !!on;
    bloomOn = !!on;
    if (on) steppedDown = false;
    slowAcc = 0;
  }

  function stats() {
    return {
      bloomOn,
      steppedDown,
      forced,
      hdr: rtType === THREE.HalfFloatType,
      emaMs: +emaMs.toFixed(2),
      renderMs: +renderMs.toFixed(2),
      totalCalls: lastTotalCalls,
      sceneCalls: lastSceneCalls,
      threshold: bloomPass.threshold,
      strength: bloomPass.strength,
      radius: bloomPass.radius,
      halfRes: [bloomPass.resolution.x, bloomPass.resolution.y],
    };
  }

  return { render, setSize, setBloom, stats, composer, bloomPass, outputPass };
}

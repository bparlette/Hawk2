/**
 * kit/gppressmap.js — Press-map grass: reactive ground that parts around
 * whatever drives through it and springs back behind it.
 *
 * Technique by Sandro Maglione for Tabletop Grand Prix
 * (github.com/SandroMaglione/tabletop-grand-prix, src/host/world/meadow.ts,
 * Apache-2.0) — ported and generalized for gamepress. Filed 2026-11-26 after
 * a run-it comparison against our flat-texture grass (docs/PRESS-MAP.md).
 *
 * The idea: a small grid — the press map — lives in world coordinates over a
 * patch of ground. Each cell stores a bend vector (which way the grass leans,
 * 1 = flat) plus a spring velocity. Every frame, pushers (cars, feet, balls)
 * stamp their shape into the cells they touch: flat and forward under the
 * body, out and away along the flanks. Every other bent cell is a damped
 * spring (stiffness 70, damping 5 — his exact numbers) that swings back past
 * upright and settles in about a second. Nothing is on a timer: the grass
 * closes behind you because physics says so.
 *
 * Renderers read the bend back out: a vertex shader sampling a texture built
 * from writeRGBA() (his architecture — one instanced draw call, bend ~free),
 * a canvas 2D loop calling sample() per clump, or a three.js InstancedMesh
 * updating instance matrices for the few bent clumps.
 *
 * Usage (~10 lines):
 *   import { createPressMap } from './gppressmap.js';
 *   const pm = createPressMap({ x: 160, z: -145, w: 40, d: 34 }); // world rect, 0.2 m cells
 *   // per frame:
 *   pm.stamp(car.x, car.z, Math.sin(car.h), Math.cos(car.h), { halfW: 0.9, halfL: 2.1 });
 *   pm.step(dt);
 *   const b = pm.sample(grassX, grassZ);   // { x, z, mag } or null outside
 *   if (pm.dirty) { pm.writeRGBA(texData); tex.needsUpdate = true; pm.clearDirty(); }
 *
 * Contract:
 *   - Zero dependencies, ESM (+ a globalThis.GPPressMap copy for script-tag
 *     games). No THREE / canvas needed — this is pure grid + stamp + spring.
 *   - step() only integrates cells that are actually bent (an active list),
 *     so cost scales with the wake, not the patch: ~0.5 ms/frame at ~4k
 *     active cells (bench in the x-links run, docs/PRESS-MAP.md).
 *   - Coordinates are ground-plane metres: x east, z south (three.js style).
 *     2D canvas games pass their y as z — the map does not care.
 *   - Pair it with surfaces-as-gameplay: while a pusher is inside the patch,
 *     apply your surface drag (his meadow is a shortcut that costs speed)
 *     and per-wheel FX (clippings on grass, splashes on water).
 */

export const PRESSMAP_DEFAULTS = {
  cell: 0.2,      // metres per cell (his meadow: 0.2 m)
  spring: 70,     // spring stiffness k (his exact value)
  damping: 5,     // spring damping c (his exact value)
  pushRate: 22,   // how fast a stamp pulls cells to the pusher's shape (his)
  reach: 0.95,    // metres past the body the flanks still push (his ~0.95 m)
};

export function createPressMap(opts = {}) {
  const cell = opts.cell ?? PRESSMAP_DEFAULTS.cell;
  const spring = opts.spring ?? PRESSMAP_DEFAULTS.spring;
  const damping = opts.damping ?? PRESSMAP_DEFAULTS.damping;
  const pushRate = opts.pushRate ?? PRESSMAP_DEFAULTS.pushRate;
  const reach0 = opts.reach ?? PRESSMAP_DEFAULTS.reach;
  const x0 = opts.x ?? 0, z0 = opts.z ?? 0;
  const cols = Math.max(1, Math.ceil((opts.w ?? 10) / cell));
  const rows = Math.max(1, Math.ceil((opts.d ?? 10) / cell));
  const n = cols * rows;

  const bend = new Float32Array(n * 2);   // bend x,z per cell (1 = flat)
  const vel = new Float32Array(n * 2);    // spring velocity
  const active = [];                      // indices of bent cells
  const inActive = new Uint8Array(n);
  let dirtyI0 = 0, dirtyJ0 = 0, dirtyI1 = -1, dirtyJ1 = -1; // dirty rect (empty when I1<I0)

  function markDirty(i, j) {
    if (dirtyI1 < 0) { dirtyI0 = dirtyI1 = i; dirtyJ0 = dirtyJ1 = j; }
    else {
      if (i < dirtyI0) dirtyI0 = i; if (i > dirtyI1) dirtyI1 = i;
      if (j < dirtyJ0) dirtyJ0 = j; if (j > dirtyJ1) dirtyJ1 = j;
    }
  }
  function touch(i, j) {
    const id = j * cols + i;
    if (!inActive[id]) { inActive[id] = 1; active.push(id); }
    markDirty(i, j);
  }

  const map = {
    x: x0, z: z0, w: cols * cell, d: rows * cell, cell, cols, rows,
    bend, vel,
    get activeCount() { return active.length; },
    get dirty() { return dirtyI1 >= 0; },
    /** Dirty cell rect {i0,j0,i1,j1} since last clearDirty(), or null. */
    get dirtyRect() { return dirtyI1 < 0 ? null : { i0: dirtyI0, j0: dirtyJ0, i1: dirtyI1, j1: dirtyJ1 }; },
    clearDirty() { dirtyI1 = -1; },
    contains(x, z) { return x >= x0 && x < x0 + cols * cell && z >= z0 && z < z0 + rows * cell; },

    /**
     * Stamp a body-shaped pusher (a car): cells under the body go flat and
     * forward along (dirx, dirz); cells within `reach` of the flanks are
     * pushed out and away. Call once per frame per pusher, before step().
     */
    stamp(cx, cz, dirx, dirz, o = {}) {
      const halfW = o.halfW ?? 0.9, halfL = o.halfL ?? 2.0;
      const reach = o.reach ?? reach0, rate = o.rate ?? pushRate;
      const dl = Math.hypot(dirx, dirz) || 1; dirx /= dl; dirz /= dl;
      const px = -dirz, pz = dirx; // lateral axis
      const ext = halfL + reach, extW = halfW + reach;
      const i0 = Math.max(0, Math.floor((cx - ext - x0) / cell)), i1 = Math.min(cols - 1, Math.floor((cx + ext - x0) / cell));
      const j0 = Math.max(0, Math.floor((cz - ext - z0) / cell)), j1 = Math.min(rows - 1, Math.floor((cz + ext - z0) / cell));
      if (i1 < i0 || j1 < j0) return;
      const a = 1 - Math.exp(-rate * (1 / 60)); // stamps are per-frame at ~60 fps
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const gx = x0 + (i + 0.5) * cell, gz = z0 + (j + 0.5) * cell;
        const rx = gx - cx, rz = gz - cz;
        const along = rx * dirx + rz * dirz, lat = rx * px + rz * pz;
        if (Math.abs(along) > ext || Math.abs(lat) > extW) continue;
        let tx, tz, mag;
        if (Math.abs(along) <= halfL && Math.abs(lat) <= halfW) { tx = dirx; tz = dirz; mag = 1; }
        else {
          const f = Math.max(0, 1 - Math.max(Math.abs(along) - halfL, Math.abs(lat) - halfW) / reach);
          if (f <= 0) continue;
          const s = lat >= 0 ? 1 : -1;
          tx = px * s; tz = pz * s; mag = f * 0.8;
        }
        const k = (j * cols + i) * 2;
        bend[k] += (tx * mag - bend[k]) * a;
        bend[k + 1] += (tz * mag - bend[k + 1]) * a;
        vel[k] = 0; vel[k + 1] = 0;
        touch(i, j);
      }
    },

    /**
     * Stamp a round pusher (a foot, a wheel, a rolling ball): cells inside
     * radius r are pushed along (dirx, dirz) at `strength` (0..1+).
     */
    stampCircle(cx, cz, r, dirx, dirz, strength = 1, o = {}) {
      const rate = o.rate ?? pushRate;
      const dl = Math.hypot(dirx, dirz) || 1; dirx /= dl; dirz /= dl;
      const i0 = Math.max(0, Math.floor((cx - r - x0) / cell)), i1 = Math.min(cols - 1, Math.floor((cx + r - x0) / cell));
      const j0 = Math.max(0, Math.floor((cz - r - z0) / cell)), j1 = Math.min(rows - 1, Math.floor((cz + r - z0) / cell));
      if (i1 < i0 || j1 < j0) return;
      const a = 1 - Math.exp(-rate * (1 / 60));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const gx = x0 + (i + 0.5) * cell, gz = z0 + (j + 0.5) * cell;
        const d2 = (gx - cx) * (gx - cx) + (gz - cz) * (gz - cz);
        if (d2 > r * r) continue;
        const f = strength * (1 - Math.sqrt(d2) / r * 0.4);
        const k = (j * cols + i) * 2;
        bend[k] += (dirx * f - bend[k]) * a;
        bend[k + 1] += (dirz * f - bend[k + 1]) * a;
        vel[k] = 0; vel[k + 1] = 0;
        touch(i, j);
      }
    },

    /**
     * Integrate the springs. Substepped (h <= 1/120 s) so k=70 stays stable
     * at any frame rate. Only bent cells are integrated; a cell that has
     * settled is snapped upright and dropped from the active list.
     */
    step(dt) {
      if (!active.length || dt <= 0) return;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        for (let n2 = 0; n2 < active.length; n2++) {
          const k = active[n2] * 2;
          vel[k] += (-spring * bend[k] - damping * vel[k]) * h;
          bend[k] += vel[k] * h;
          vel[k + 1] += (-spring * bend[k + 1] - damping * vel[k + 1]) * h;
          bend[k + 1] += vel[k + 1] * h;
        }
      }
      // retire settled cells (swap-remove); every integrated cell is dirty
      for (let n2 = active.length - 1; n2 >= 0; n2--) {
        const id = active[n2], k = id * 2;
        markDirty(id % cols, Math.floor(id / cols));
        if (bend[k] * bend[k] + bend[k + 1] * bend[k + 1] < 4e-4 &&
            vel[k] * vel[k] + vel[k + 1] * vel[k + 1] < 4e-4) {
          bend[k] = 0; bend[k + 1] = 0; vel[k] = 0; vel[k + 1] = 0;
          inActive[id] = 0;
          active[n2] = active[active.length - 1];
          active.pop();
        }
      }
    },

    /** Bend at a world position: { x, z, mag } (mag 0..~1.2), or null outside. */
    sample(x, z, out = {}) {
      const i = Math.floor((x - x0) / cell), j = Math.floor((z - z0) / cell);
      if (i < 0 || j < 0 || i >= cols || j >= rows) return null;
      const k = (j * cols + i) * 2;
      out.x = bend[k]; out.z = bend[k + 1];
      out.mag = Math.hypot(bend[k], bend[k + 1]);
      return out;
    },

    /**
     * Encode the map into an RGBA byte array (cols*rows*4) for a
     * THREE.DataTexture / Canvas ImageData: R,G = bend direction mapped
     * 0..1, B = bend magnitude, A = 255. Shaders decode dir = R,G * 2 - 1.
     * Pass your own array to avoid allocation; returns the array used.
     */
    writeRGBA(arr) {
      arr = arr || new Uint8Array(cols * rows * 4);
      for (let id = 0; id < cols * rows; id++) {
        const k = id * 2, o = id * 4;
        const bx = bend[k], bz = bend[k + 1];
        const mag = Math.hypot(bx, bz);
        arr[o] = Math.round((bx * 0.5 + 0.5) * 255);
        arr[o + 1] = Math.round((bz * 0.5 + 0.5) * 255);
        arr[o + 2] = Math.round(Math.min(1, mag) * 255);
        arr[o + 3] = 255;
      }
      return arr;
    },

    /** Zero the whole map (level reset). */
    reset() {
      bend.fill(0); vel.fill(0);
      active.length = 0; inActive.fill(0);
      dirtyI0 = dirtyJ0 = 0; dirtyI1 = cols - 1; dirtyJ1 = rows - 1;
    },
  };
  return map;
}

// Script-tag / non-module games: the same factory on the global.
if (typeof globalThis !== 'undefined') {
  globalThis.GPPressMap = { createPressMap, PRESSMAP_DEFAULTS };
}

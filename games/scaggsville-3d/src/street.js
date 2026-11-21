// Scaggsville 3D — CURRENT-STREET resolver (Lane A).
// Mirrors the 2D game (laurel-fulton L10): the HUD names the street you are
// on and the nearest cross street — "corner of X & Y".
//
// Index: every NAMED road segment from src/data.js (681 of 1,165 roads carry
// real OSM names) is bucketed by its midpoint into 120 m cells once, at
// module load. A query scans only the 3x3 cells around the car — no
// per-frame graph scans. The host throttles queries to ~4/sec and only
// re-renders the HUD line when the text changes.
//
// streetAt(x, z) -> { name, cross, d }
//   name  — nearest named street within ON_MAX metres of its centreline
//           (on the road / just off it: driveways, cul-de-sac discs and
//           yards fall back to the nearest named street within NEAR_MAX),
//           else null (show nothing rather than a wrong name)
//   cross — nearest DIFFERENT named street within CROSS_MAX metres, else null
//   d     — distance to the named street's centreline
import { WORLD_DATA } from './data.js';

const CELL = 120;
const ON_MAX = 30;     // "you are on this street" (road half-width + shoulder)
const NEAR_MAX = 62;   // fallback: nearest named street (off-road at a house;
                       // 62 also covers the Atholton stop, 56 m off Freetown Rd)
const CROSS_MAX = 60;  // cross street must be genuinely near

const buckets = new Map(); // "cx,cz" -> [seg]
const key = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
let segCount = 0;
for (const r of WORLD_DATA.roads) {
  if (!r.name) continue;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
    const seg = { ax, az, bx, bz, name: r.name };
    buckets.set(key((ax + bx) / 2, (az + bz) / 2), (buckets.get(key((ax + bx) / 2, (az + bz) / 2)) || []).concat(seg));
    segCount++;
  }
}

function segDist(s, x, z) {
  const dx = s.bx - s.ax, dz = s.bz - s.az;
  const L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / L2 : 0;
  t = Math.min(1, Math.max(0, t));
  const px = s.ax + dx * t, pz = s.az + dz * t;
  return Math.hypot(x - px, z - pz);
}

export function streetAt(x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  let best = null, bestD = Infinity, cross = null, crossD = Infinity;
  for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
    const cell = buckets.get(ix + ',' + iz);
    if (!cell) continue;
    for (const s of cell) {
      const d = segDist(s, x, z);
      if (d < bestD) {
        if (best && best.name !== s.name && bestD < crossD) { cross = best; crossD = bestD; }
        best = s; bestD = d;
      } else if (best && s.name !== best.name && d < crossD) {
        cross = s; crossD = d;
      }
    }
  }
  if (!best || bestD > NEAR_MAX) return { name: null, cross: null, d: bestD };
  return {
    name: best.name,
    cross: (cross && crossD <= CROSS_MAX && bestD <= ON_MAX) ? cross.name : null,
    d: bestD,
  };
}

// The HUD line, in the 2D game's wording: "corner of X & Y" at a corner,
// the street name alone mid-block, '' when no named street is near.
export function streetLabel(x, z) {
  const s = streetAt(x, z);
  if (!s.name) return '';
  return s.cross ? `corner of ${s.name} & ${s.cross}` : s.name;
}
export const STREET_INDEX_STATS = { segments: segCount, cells: buckets.size };
export default streetAt;

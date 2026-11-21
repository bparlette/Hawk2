// Scaggsville 3D — GTA 5 Style Rotating GPS Radar Minimap
export function createMinimap(D, parent = document.body) {
  const wrap = document.createElement('div');
  wrap.id = 'gta-radar-wrap';
  wrap.style.cssText = [
    'position:fixed',
    'top:calc(66px + env(safe-area-inset-top))',
    'left:12px',
    'width:106px',
    'height:106px',
    'border-radius:16px',
    'overflow:hidden',
    'border:2px solid rgba(255,255,255,0.28)',
    'background:rgba(10,14,24,0.82)',
    'box-shadow:0 4px 16px rgba(0,0,0,0.48)',
    'pointer-events:none',
    'z-index:1120',
    'backdrop-filter:blur(6px)',
    'display:none',
  ].join(';');

  const canvas = document.createElement('canvas');
  canvas.width = 228;
  canvas.height = 228;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  wrap.appendChild(canvas);
  parent.appendChild(wrap);

  const ctx = canvas.getContext('2d');

  // Index road segments by 180m grid cell for O(1) nearby queries
  const CELL = 90;
  const grid = new Map();
  for (const r of D.roads || []) {
    if (!r.pts || r.pts.length < 2) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const cx = Math.floor((a[0] + b[0]) * 0.5 / CELL);
      const cz = Math.floor((a[1] + b[1]) * 0.5 / CELL);
      const k = `${cx},${cz}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push([a[0], a[1], b[0], b[1], r.w || 6]);
    }
  }

  const route = D.route || [];
  let timer = 0;

  function show() { wrap.style.display = 'block'; }
  function hide() { wrap.style.display = 'none'; }

  function update(dt, state) {
    if (wrap.style.display === 'none') return;
    timer -= dt;
    if (timer > 0) return;
    timer = 0.05; // 20 Hz smooth & ultra-cheap

    const { px, pz, camYaw, targetStop, followers = [], cops = [], ramps = [], flares = [], raceCp = null, wantedStars = 0, flashPhase = 0 } = state;

    // Wanted border pulse (GTA V classic red/blue radar flash)
    if (wantedStars > 0) {
      const redSide = Math.sin(flashPhase) > 0;
      wrap.style.borderColor = redSide ? 'rgba(255,60,60,0.92)' : 'rgba(60,150,255,0.92)';
      wrap.style.boxShadow = redSide ? '0 0 16px rgba(255,50,50,0.55)' : '0 0 16px rgba(50,140,255,0.55)';
    } else {
      wrap.style.borderColor = 'rgba(255,255,255,0.28)';
      wrap.style.boxShadow = '0 4px 16px rgba(0,0,0,0.48)';
    }

    const W = 228, H = 228, CX = 114, CY = 114;
    const RANGE = 95; // meters from center to edge
    const SCALE = (W * 0.5) / RANGE;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = wantedStars > 0
      ? (Math.sin(flashPhase) > 0 ? 'rgba(38,14,20,0.90)' : 'rgba(12,24,46,0.90)')
      : 'rgba(12,17,28,0.88)';
    ctx.fillRect(0, 0, W, H);

    // Helper: convert world (wx, wz) -> heading-up rotated radar coords!
    // Camera looks toward (sin(camYaw), cos(camYaw)) so up on screen = camYaw direction!
    const sh = Math.sin(camYaw), ch = Math.cos(camYaw);
    function toRadar(wx, wz) {
      const dx = wx - px, dz = wz - pz;
      const fwd = dx * sh + dz * ch;      // +Y up -> -fwd on canvas Y
      const right = -dx * ch + dz * sh;   // +X right on canvas X
      return [CX + right * SCALE, CY - fwd * SCALE];
    }

    // 1. Nearby streets
    const cx0 = Math.floor(px / CELL), cz0 = Math.floor(pz / CELL);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3d4a62';
    for (let ix = cx0 - 1; ix <= cx0 + 1; ix++) {
      for (let iz = cz0 - 1; iz <= cz0 + 1; iz++) {
        const list = grid.get(`${ix},${iz}`);
        if (!list) continue;
        for (const [ax, az, bx, bz, rw] of list) {
          const [x0, y0] = toRadar(ax, az);
          const [x1, y1] = toRadar(bx, bz);
          ctx.lineWidth = Math.max(2.5, rw * SCALE * 0.85);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }

    // 2. Rally GPS Route line (sampled coarsely around car/route)
    if (route.length > 1) {
      ctx.strokeStyle = 'rgba(255, 210, 63, 0.78)';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < route.length; i += 3) {
        const p = route[i];
        if (Math.hypot(p[0] - px, p[1] - pz) > RANGE * 1.45) { started = false; continue; }
        const [rx, ry] = toRadar(p[0], p[1]);
        if (!started) { ctx.moveTo(rx, ry); started = true; }
        else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }

    // 3. Stunt Ramps (orange pips) + Side Activities (purple races / cyan drift zones)
    ctx.fillStyle = '#ff9922';
    for (const rm of ramps) {
      if (Math.hypot(rm.x - px, rm.z - pz) > RANGE) continue;
      const [rx, ry] = toRadar(rm.x, rm.z);
      ctx.fillRect(rx - 3.5, ry - 3.5, 7, 7);
    }
    for (const fl of flares) {
      if (Math.hypot(fl.x - px, fl.z - pz) > RANGE * 1.1) continue;
      const [rx, ry] = toRadar(fl.x, fl.z);
      ctx.fillStyle = fl.kind === 'race' ? '#c864ff' : '#38e0ff';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 6); ctx.lineTo(rx + 6, ry); ctx.lineTo(rx, ry + 6); ctx.lineTo(rx - 6, ry);
      ctx.closePath(); ctx.fill();
    }
    if (raceCp) {
      const [rx, ry] = toRadar(raceCp.x, raceCp.z);
      const d = Math.hypot(rx - CX, ry - CY);
      const sc = d > 96 ? 96 / d : 1;
      ctx.strokeStyle = '#ff66ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX + (rx - CX) * sc, CY + (ry - CY) * sc, 7, 0, Math.PI * 2); ctx.stroke();
    }

    // 4. Convoy Followers (cyan dots)
    ctx.fillStyle = '#48d6ff';
    for (const f of followers) {
      const [rx, ry] = toRadar(f.state.x, f.state.z);
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Police Cruisers (flashing red/blue dots)
    for (const c of cops) {
      if (!c.active) continue;
      const [rx, ry] = toRadar(c.state.x, c.state.z);
      const cl = Math.hypot(rx - CX, ry - CY);
      const scaleClamp = cl > 100 ? 100 / cl : 1;
      const pxC = CX + (rx - CX) * scaleClamp;
      const pyC = CY + (ry - CY) * scaleClamp;
      ctx.fillStyle = Math.sin(flashPhase) > 0 ? '#ff3344' : '#3399ff';
      ctx.beginPath();
      ctx.arc(pxC, pyC, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 6. Current Target Stop Beacon (clamped to radar edge if off-radar!)
    if (targetStop) {
      const [tx, ty] = toRadar(targetStop.sx, targetStop.sz);
      const d = Math.hypot(tx - CX, ty - CY);
      const sc = d > 96 ? 96 / d : 1;
      const bx = CX + (tx - CX) * sc;
      const by = CY + (ty - CY) * sc;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#181a24';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 7. Player Chevron in center
    ctx.save();
    ctx.translate(CX, CY);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#121622';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  return { show, hide, update, el: wrap };
}

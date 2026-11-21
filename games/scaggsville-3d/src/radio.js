// Scaggsville 3D — GTA Switchable Radio Wheel (Wu-Tang 94.7 / Fulton Synth 87 / HCPD Scanner / Off)
export function createRadio({ music, gameAudio } = {}) {
  const STATIONS = [
    { id: 'wutang',  name: 'WU-TANG 94.7',    sub: 'Wu-Tang Forever · Fulton FM',   color: '#ffd23f' },
    { id: 'synth',   name: 'FULTON SYNTH 87', sub: 'Outrun Midnight Drive',          color: '#ff66cc' },
    { id: 'scanner', name: 'HCPD SCANNER',    sub: 'Howard County Police Dispatch',  color: '#55b8ff' },
    { id: 'off',     name: 'RADIO OFF',       sub: 'Engine & Streets Only',          color: '#9aa4ba' },
  ];

  let idx = 0;
  let toastTimer = 0;
  let scannerTimer = 3.5;

  // Compact floating radio toast pill (sits cleanly below #street, zero HUD overlap)
  const el = document.createElement('div');
  el.id = 'radioToast';
  el.style.cssText = [
    'position:fixed', 'left:50%', 'top:calc(234px + env(safe-area-inset-top))',
    'transform:translateX(-50%)', 'z-index:1140', 'pointer-events:none',
    'background:rgba(12,16,30,0.82)', 'border:2px solid rgba(255,210,63,0.65)',
    'border-radius:12px', 'padding:5px 12px', 'color:#fff', 'text-align:center',
    'font-size:12px', 'font-weight:800', 'letter-spacing:.05em',
    'box-shadow:0 4px 14px rgba(0,0,0,0.5)', 'opacity:0', 'transition:opacity .25s',
    'max-width:88vw', 'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
  ].join(';');
  document.body.appendChild(el);

  function showToast(html, borderCol = '#ffd23f', dur = 2.6) {
    el.innerHTML = html;
    el.style.borderColor = borderCol;
    el.style.opacity = '1';
    toastTimer = dur;
  }

  // Procedural 80s Outrun Synthwave WebAudio loop (Station 1)
  let sCtx = null, sBus = null, sTimer = null, sStep = 0;
  const BASS_N = [45, 45, 45, 45, 41, 41, 41, 41, 43, 43, 43, 43, 40, 40, 43, 43];
  const ARP_N  = [69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79, 64, 67, 71, 76];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function ensureSynthCtx() {
    if (sCtx) { if (sCtx.state === 'suspended') sCtx.resume().catch(() => {}); return sCtx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    sCtx = new AC();
    sBus = sCtx.createGain();
    sBus.gain.value = 0.14;
    sBus.connect(sCtx.destination);
    return sCtx;
  }

  function playSynthStep() {
    if (idx !== 1 || (gameAudio && gameAudio.isMuted())) return;
    const c = ensureSynthCtx();
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    const st = sStep++ % 16;

    // Driving 8th-note synth bass
    const bo = c.createOscillator(); bo.type = 'sawtooth';
    bo.frequency.value = mtof(BASS_N[st]);
    const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.setValueAtTime(520, t);
    bf.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.001, t);
    bg.gain.linearRampToValueAtTime(0.32, t + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
    bo.connect(bf); bf.connect(bg); bg.connect(sBus);
    bo.start(t); bo.stop(t + 0.22);

    // Bright arpeggio shimmer
    const ao = c.createOscillator(); ao.type = 'triangle';
    ao.frequency.value = mtof(ARP_N[st]);
    const ag = c.createGain(); ag.gain.setValueAtTime(0.001, t);
    ag.gain.linearRampToValueAtTime(0.16, t + 0.01);
    ag.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    ao.connect(ag); ag.connect(sBus);
    ao.start(t); ao.stop(t + 0.18);

    // Kick on 0, 4, 8, 12
    if (st % 4 === 0) {
      const ko = c.createOscillator(); ko.type = 'sine';
      ko.frequency.setValueAtTime(118, t); ko.frequency.exponentialRampToValueAtTime(38, t + 0.1);
      const kg = c.createGain(); kg.gain.setValueAtTime(0.42, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      ko.connect(kg); kg.connect(sBus); ko.start(t); ko.stop(t + 0.16);
    }
  }

  function squelch() {
    if (gameAudio && gameAudio.isMuted()) return;
    const c = ensureSynthCtx();
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1420, t); o.frequency.setValueAtTime(1880, t + 0.045);
    const g = c.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g); g.connect(sBus); o.start(t); o.stop(t + 0.12);
  }

  function applyStation(announce = true) {
    const st = STATIONS[idx];
    if (music && music.setSilenced) music.setSilenced(st.id !== 'wutang');
    if (sTimer) { clearInterval(sTimer); sTimer = null; }
    if (st.id === 'synth') {
      ensureSynthCtx();
      sTimer = setInterval(playSynthStep, 240);
    } else if (st.id === 'scanner') {
      scannerTimer = 1.2;
      squelch();
    }
    if (announce) {
      showToast(`📻 <span style="color:${st.color}">${st.name}</span> · <span style="opacity:.82">${st.sub}</span>`, st.color, 2.5);
    }
  }

  function cycle() {
    idx = (idx + 1) % STATIONS.length;
    if (gameAudio && gameAudio.uiTap) gameAudio.uiTap();
    applyStation(true);
    return STATIONS[idx];
  }

  function update(dt, ctx = {}) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) el.style.opacity = '0';
    }
    if (STATIONS[idx].id === 'scanner') {
      scannerTimer -= dt;
      if (scannerTimer <= 0) {
        scannerTimer = 7.5 + Math.random() * 4.5;
        squelch();
        const street = ctx.street || 'Scaggsville Road';
        const kmh = Math.round(Math.abs(ctx.speed || 0) * 3.6);
        const car = ctx.carName || 'suspect vehicle';
        let line;
        if ((ctx.stars || 0) >= 3) line = `HCPD ALL UNITS: ${ctx.stars}★ high-speed pursuit of ${car} near ${street}!`;
        else if ((ctx.stars || 0) >= 1) line = `HCPD DISPATCH: ${ctx.stars}★ suspect in ${car} sighted on ${street}.`;
        else if (kmh > 95) line = `HCPD RADAR: ${car} clocked at ${kmh} km/h on ${street}!`;
        else if (ctx.onFoot) line = `HCPD 10-4: Subject on foot near ${street}, keep units rolling.`;
        else line = `HCPD 10-4: Quiet night on ${street}. Watch for street racers.`;
        showToast(`📡 ${line}`, '#55b8ff', 4.2);
      }
    }
  }

  return {
    stations: STATIONS,
    get current() { return STATIONS[idx]; },
    cycle,
    setStation(i) { idx = ((i | 0) % STATIONS.length + STATIONS.length) % STATIONS.length; applyStation(true); },
    update,
  };
}

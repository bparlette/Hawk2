// Stern Pinball 40th Anniversary Poster — Table Geometry & Edition Palettes
// Logical coordinate space: 540 x 900

export const TABLE_W = 540;
export const TABLE_H = 900;
export const BALL_R = 11.5;

export const EDITIONS = {
  dark: {
    id: 'dark',
    label: 'DARK ALT',
    editionTag: 'DARK ALT EDITION (X/15)',
    bgTop: '#182036',
    bgBot: '#12182b',
    playfieldBg: '#1c2540',
    playfieldInner: '#232f4f',
    halftone: 'rgba(10, 14, 26, 0.34)',
    ink: '#0d1018',
    trackFill: '#e12525',
    trackHi: '#ff6454',
    trackShadow: 'rgba(6, 9, 18, 0.55)',
    blueFill: '#4576b8',
    blueHi: '#7cc6ff',
    blueDeep: '#243c66',
    cream: '#f7efd8',
    gold: '#ffca3a',
    cyan: '#3be8ff',
    bumperRing: '#ff4842',
    bumperCap: '#ffca3a',
    flipperFill: '#f4ece0',
    flipperRubber: '#e12525',
    dmdBg: '#0b0a09',
    dmdGlow: '#ff9c2a',
    foil: false,
  },
  main: {
    id: 'main',
    label: 'MAIN',
    editionTag: 'MAIN EDITION (X/40)',
    bgTop: '#6da596',
    bgBot: '#578d7f',
    playfieldBg: '#74ab9c',
    playfieldInner: '#81b6a7',
    halftone: 'rgba(26, 52, 46, 0.16)',
    ink: '#171c22',
    trackFill: '#d84c3e',
    trackHi: '#f48670',
    trackShadow: 'rgba(18, 30, 28, 0.36)',
    blueFill: '#5d7ca0',
    blueHi: '#98bddc',
    blueDeep: '#364d68',
    cream: '#f8f0dc',
    gold: '#f5be45',
    cyan: '#8be0d4',
    bumperRing: '#d84c3e',
    bumperCap: '#f5be45',
    flipperFill: '#f6edd9',
    flipperRubber: '#d84c3e',
    dmdBg: '#161412',
    dmdGlow: '#ffb443',
    foil: false,
  },
  foil: {
    id: 'foil',
    label: 'FOIL',
    editionTag: 'FOIL EDITION (X/10)',
    bgTop: '#e8d8ff',
    bgBot: '#c6f6ef',
    playfieldBg: '#e2e8ff',
    playfieldInner: '#f4ecff',
    halftone: 'rgba(30, 20, 60, 0.12)',
    ink: '#161426',
    trackFill: '#df3c4c',
    trackHi: '#ff8ea2',
    trackShadow: 'rgba(28, 18, 52, 0.34)',
    blueFill: '#5878c8',
    blueHi: '#a6c8ff',
    blueDeep: '#31457e',
    cream: '#fffaf0',
    gold: '#ffd24c',
    cyan: '#48f0ff',
    bumperRing: '#df3c4c',
    bumperCap: '#ffd24c',
    flipperFill: '#fff9ee',
    flipperRubber: '#df3c4c',
    dmdBg: '#14111d',
    dmdGlow: '#ffae3c',
    foil: true,
  },
};

function arcPoints(cx, cy, r, a0, a1, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function polyToSegments(pts, restitution = 0.65, tag = 'wall') {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push({
      x1: pts[i][0],
      y1: pts[i][1],
      x2: pts[i + 1][0],
      y2: pts[i + 1][1],
      restitution,
      tag,
    });
  }
  return segs;
}

export function buildTable() {
  const walls = [];

  // 1. Outer cabinet arch & side walls (x: 24..518, top arch center (271, 271) r=247)
  // Right outer wall (shooter lane outer wall)
  walls.push({ x1: 518, y1: 865, x2: 518, y2: 266, restitution: 0.55, tag: 'wall' });

  // Top arch from right (518, 266) counterclockwise to left (24, 266)
  const archPts = arcPoints(271, 266, 247, 0, -Math.PI, 26);
  walls.push(...polyToSegments(archPts, 0.65, 'arch'));

  // Left outer wall down to left drain apron
  walls.push({ x1: 24, y1: 266, x2: 24, y2: 758, restitution: 0.6, tag: 'wall' });

  // Left drain apron funnel
  walls.push({ x1: 24, y1: 758, x2: 180, y2: 862, restitution: 0.45, tag: 'apron' });

  // Right drain apron funnel (inside shooter lane divider at x=486)
  walls.push({ x1: 486, y1: 758, x2: 330, y2: 862, restitution: 0.45, tag: 'apron' });

  // Shooter lane inner divider wall (x = 486, y = 248..865)
  walls.push({ x1: 486, y1: 865, x2: 486, y2: 246, restitution: 0.55, tag: 'divider' });
  // Shooter lane floor
  walls.push({ x1: 486, y1: 865, x2: 518, y2: 865, restitution: 0.3, tag: 'floor' });

  // Upper right deflection guide so launched ball enters the upper rollover area cleanly
  walls.push({ x1: 486, y1: 246, x2: 462, y2: 186, restitution: 0.6, tag: 'guide' });

  // Left upper guide lip (prevents ball trapping in left shoulder)
  walls.push({ x1: 24, y1: 266, x2: 56, y2: 204, restitution: 0.65, tag: 'guide' });

  // Left inlane / outlane divider feeding directly into left flipper
  walls.push({ x1: 60, y1: 632, x2: 60, y2: 724, restitution: 0.5, tag: 'inlane' });
  walls.push({ x1: 60, y1: 724, x2: 162, y2: 794, restitution: 0.45, tag: 'inlane' });

  // Right inlane / outlane divider feeding directly into right flipper
  walls.push({ x1: 450, y1: 632, x2: 450, y2: 724, restitution: 0.5, tag: 'inlane' });
  walls.push({ x1: 450, y1: 724, x2: 348, y2: 794, restitution: 0.45, tag: 'inlane' });

  // Top rollover lane dividers (creating 3 lanes: 4 - 0 - TH)
  walls.push({ x1: 196, y1: 86, x2: 196, y2: 142, restitution: 0.6, tag: 'lane-div' });
  walls.push({ x1: 276, y1: 78, x2: 276, y2: 136, restitution: 0.6, tag: 'lane-div' });
  walls.push({ x1: 356, y1: 86, x2: 356, y2: 142, restitution: 0.6, tag: 'lane-div' });

  // Mid-left ramp guide wall & outer curve
  walls.push({ x1: 48, y1: 422, x2: 72, y2: 504, restitution: 0.65, tag: 'guide' });

  // Lower-left "4" slingshot triangle (matches the poster's bold blue "4")
  const slingshot4 = {
    pts: [
      [88, 566],
      [158, 692],
      [88, 704],
    ],
    activeEdge: 0, // hypotenuse (88,566) -> (158,692) is energized!
    kick: 640,
    flash: 0,
  };
  walls.push({ x1: 88, y1: 566, x2: 158, y2: 692, restitution: 1.15, tag: 'sling4' });
  walls.push({ x1: 158, y1: 692, x2: 88, y2: 704, restitution: 0.6, tag: 'sling4-back' });
  walls.push({ x1: 88, y1: 704, x2: 88, y2: 566, restitution: 0.6, tag: 'sling4-back' });

  // Right small lower slingshot bumper (balances left "4" and funnels to right flipper)
  const slingshotRight = {
    pts: [
      [422, 620],
      [376, 696],
      [422, 704],
    ],
    activeEdge: 0,
    kick: 560,
    flash: 0,
  };
  walls.push({ x1: 422, y1: 620, x2: 376, y2: 696, restitution: 1.1, tag: 'slingR' });
  walls.push({ x1: 376, y1: 696, x2: 422, y2: 704, restitution: 0.6, tag: 'slingR-back' });
  walls.push({ x1: 422, y1: 704, x2: 422, y2: 620, restitution: 0.6, tag: 'slingR-back' });

  // 2. Pop Bumpers (3 nestled inside the upper S-T-E curves)
  const bumpers = [
    { id: 0, x: 204, y: 238, r: 24, label: '40', points: 2500, flash: 0 },
    { id: 1, x: 326, y: 222, r: 24, label: 'TH', points: 2500, flash: 0 },
    { id: 2, x: 266, y: 318, r: 23, label: '★', points: 3500, flash: 0 },
  ];

  // 3. Top Rollover Lanes (4 - 0 - TH)
  const rollovers = [
    { id: 0, x: 158, y: 118, r: 16, label: '4', lit: false, flash: 0 },
    { id: 1, x: 236, y: 108, r: 16, label: '0', lit: false, flash: 0 },
    { id: 2, x: 316, y: 110, r: 16, label: 'TH', lit: false, flash: 0 },
  ];

  // 4. "Y - E - A - R - S - !" 6-Bank Drop Targets (right mid-lower diagonal bank)
  const yearsLetters = ['Y', 'E', 'A', 'R', 'S', '!'];
  const dropTargets = [];
  const dtStartX = 408;
  const dtStartY = 398;
  const dtEndX = 468;
  const dtEndY = 532;
  const dtCount = yearsLetters.length;
  for (let i = 0; i < dtCount; i++) {
    const t0 = i / dtCount;
    const t1 = (i + 0.86) / dtCount;
    const x1 = dtStartX + (dtEndX - dtStartX) * t0;
    const y1 = dtStartY + (dtEndY - dtStartY) * t0;
    const x2 = dtStartX + (dtEndX - dtStartX) * t1;
    const y2 = dtStartY + (dtEndY - dtStartY) * t1;
    dropTargets.push({
      id: i,
      letter: yearsLetters[i],
      x1,
      y1,
      x2,
      y2,
      cx: (x1 + x2) * 0.5,
      cy: (y1 + y2) * 0.5,
      down: false,
      flash: 0,
    });
  }

  // 5. Lower-Right "0" Spiral Whirlpool Vortex (matches the poster's stacked blue "0")
  const vortex = {
    x: 342,
    y: 562,
    outerR: 46,
    captureR: 25,
    flash: 0,
    spinPhase: 0,
  };

  // 6. Elevated Crimson "S-T-E-R-N" Wireform Ramp
  // Entry sensor on mid-left; ball shoots up and rides the glowing S-T-E-R-N track back to left inlane!
  const sternRamp = {
    entryX: 102,
    entryY: 392,
    entryR: 26,
    flash: 0,
    // Smooth spline points winding across S -> T -> E -> R -> N -> left inlane
    path: [
      [102, 392],
      [82, 304],
      [120, 198],
      [216, 166],
      [352, 168],
      [414, 232],
      [366, 326],
      [246, 384],
      [148, 434],
      [102, 514],
      [74, 608],
      [73, 686],
    ],
  };

  // 7. Center Playfield "S T E R N" Lit Letter Inserts (arc above flippers)
  const sternInserts = ['S', 'T', 'E', 'R', 'N'].map((ch, idx) => {
    const t = idx / 4;
    const angle = Math.PI * 0.8 + (Math.PI * 0.2 - Math.PI * 0.8) * t;
    return {
      id: idx,
      letter: ch,
      x: 255 + Math.cos(angle) * 94,
      y: 656 - Math.sin(angle) * 58,
      r: 15,
      lit: false,
      flash: 0,
    };
  });

  // 8. Twin Mechanical Flippers
  const flippers = [
    {
      side: 'left',
      x: 162,
      y: 804,
      length: 76,
      radius: 9.5,
      restAngle: 0.46,    // ~+26.4 deg (pointing down-right)
      activeAngle: -0.50, // ~-28.6 deg (pointing up-right)
      angle: 0.46,
      prevAngle: 0.46,
      omega: 0,
      pressed: false,
    },
    {
      side: 'right',
      x: 348,
      y: 804,
      length: 76,
      radius: 9.5,
      restAngle: Math.PI - 0.46,
      activeAngle: Math.PI + 0.50,
      angle: Math.PI - 0.46,
      prevAngle: Math.PI - 0.46,
      omega: 0,
      pressed: false,
    },
  ];

  // 9. One-way gate at top of shooter lane (blocks balls from falling back into shooter lane)
  const oneWayGate = {
    x1: 486,
    y1: 246,
    x2: 518,
    y2: 224,
    // Allow ball moving upward (vy < 0) through; block ball moving right/down into shooter lane
  };

  return {
    walls,
    slingshot4,
    slingshotRight,
    bumpers,
    rollovers,
    dropTargets,
    vortex,
    sternRamp,
    sternInserts,
    flippers,
    oneWayGate,
    shooterX: 502,
    shooterRestY: 842,
  };
}

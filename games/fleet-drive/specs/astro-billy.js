// Billy's 1990 Chevrolet Astro (Gen 1) — teal-blue, NEON FIT (fit-astro-billy-neon/astro-billy-spec.json, Hawk2 main). Parked per Cherie's fleet rule (22:50): Neon's own cars wherever Neon has one.
// Spec used verbatim from the compare-gated fit — see ../AI-RECIPE.md.
export const SPEC = {
 "meta": {
  "name": "Billy's '90 Chevrolet Astro Van (Gen 1)",
  "year": 1990,
  "notes": "Fitted from games/scaggsville-3d/reference/car-real/astro-billy/ (4.49m x 1.96m x 1.90m, wb 2.82m). Canon teal-blue paint (0x1b6d7c). Gen-1 stubby nose, black slat grille, vertical corner markers, 3-bay passenger glass, roof rack, rear barn doors."
 },
 "dims": {
  "length": 4.49,
  "width": 1.96,
  "height": 1.9,
  "wheelbase": 2.82,
  "wheelZFront": 1.38,
  "wheelZRear": -1.44,
  "wheelRadius": 0.345,
  "wheelWidth": 0.235,
  "trackHalfFront": 0.85,
  "trackHalfRear": 0.85,
  "archGap": 0.055
 },
 "paint": {
  "color": 1797500,
  "roughness": 0.26,
  "metalness": 0.24,
  "clearcoat": 0.88,
  "clearcoatRoughness": 0.16
 },
 "bodyStations": [
  {
   "z": -2.245,
   "yBot": 0.36,
   "yBelt": 0.94,
   "yDeck": 1.24,
   "wBot": 0.9,
   "wBelt": 0.96,
   "wDeck": 0.93,
   "crown": 0.015
  },
  {
   "z": -2.05,
   "yBot": 0.33,
   "yBelt": 0.96,
   "yDeck": 1.25,
   "wBot": 0.92,
   "wBelt": 0.98,
   "wDeck": 0.95,
   "crown": 0.018
  },
  {
   "z": -1.4,
   "yBot": 0.31,
   "yBelt": 0.96,
   "yDeck": 1.25,
   "wBot": 0.92,
   "wBelt": 0.98,
   "wDeck": 0.95,
   "crown": 0.018
  },
  {
   "z": 0.2,
   "yBot": 0.31,
   "yBelt": 0.96,
   "yDeck": 1.25,
   "wBot": 0.92,
   "wBelt": 0.98,
   "wDeck": 0.95,
   "crown": 0.018
  },
  {
   "z": 1.35,
   "yBot": 0.32,
   "yBelt": 0.95,
   "yDeck": 1.23,
   "wBot": 0.91,
   "wBelt": 0.97,
   "wDeck": 0.93,
   "crown": 0.022
  },
  {
   "z": 1.92,
   "yBot": 0.34,
   "yBelt": 0.88,
   "yDeck": 1.11,
   "wBot": 0.88,
   "wBelt": 0.94,
   "wDeck": 0.89,
   "crown": 0.022
  },
  {
   "z": 2.245,
   "yBot": 0.37,
   "yBelt": 0.82,
   "yDeck": 0.99,
   "wBot": 0.82,
   "wBelt": 0.89,
   "wDeck": 0.83,
   "crown": 0.016
  }
 ],
 "greenhouse": {
  "zRearBase": -2.18,
  "yRearBase": 1.24,
  "wRearBase": 0.91,
  "zRearRoof": -2.06,
  "yRearRoof": 1.88,
  "wRearRoof": 0.82,
  "zFrontRoof": 0.82,
  "yFrontRoof": 1.89,
  "wFrontRoof": 0.82,
  "zFrontBase": 1.44,
  "yFrontBase": 1.23,
  "wFrontBase": 0.91,
  "roofCrown": 0.032,
  "roofRack": true,
  "bPillarZ": 0.26,
  "cPillarZ": -0.96,
  "cPillarPaint": false,
  "windshieldColor": 1713718,
  "windshieldOpacity": 0.44,
  "sideGlassColor": 1450028,
  "sideGlassOpacity": 0.56,
  "rearGlassColor": 856862,
  "rearGlassOpacity": 0.78,
  "rearWiper": false,
  "mirrors": {
   "z": 1.06,
   "y": 1.32,
   "w": 0.19,
   "h": 0.14,
   "d": 0.09
  }
 },
 "frontFascia": {
  "chromeBumper": true,
  "bumperY": 0.5,
  "bumperH": 0.19,
  "bumperProtrusion": 0.075,
  "rubStripY": 0.57,
  "rubStripH": 0.048,
  "grille": {
   "y": 0.8,
   "h": 0.25,
   "w": 1.04,
   "slats": 6,
   "topBarText": false
  },
  "cornerLamps": {
   "y": 0.8,
   "h": 0.22,
   "innerSmokedW": 0.22,
   "outerAmberW": 0.11,
   "wrapZ": 0.14
  },
  "lowerIntake": {
   "y": 0.38,
   "h": 0.06,
   "w": 0.92,
   "dividers": 0
  },
  "chinSpoiler": {
   "enabled": false
  },
  "popups": {
   "enabled": false
  }
 },
 "rearFascia": {
  "bumpers": "unpainted",
  "bumperY": 0.5,
  "bumperH": 0.18,
  "bumperProtrusion": 0.085,
  "rubStripY": 0.56,
  "rubStripH": 0.04,
  "barnDoors": true,
  "tailPanel": {
   "style": "vertical",
   "y": 0.9,
   "h": 0.36,
   "centerW": 0.54,
   "lampW": 0.14,
   "amberOuterW": 0.04,
   "reverseW": 0.05,
   "wrapZ": 0.08
  },
  "spoiler": {
   "style": "none"
  },
  "exhaust": {
   "side": "right",
   "count": 1,
   "xOffset": 0.58,
   "y": 0.32,
   "r": 0.032
  },
  "mudFlaps": false,
  "fuelDoor": {
   "z": -0.58,
   "y": 0.72,
   "side": 1
  }
 },
 "trim": {
  "sideRubStrip": {
   "enabled": true,
   "y": 0.54,
   "h": 0.052
  },
  "rockerSkirt": {
   "enabled": false,
   "y": 0.32,
   "h": 0.05
  },
  "doorHandle": {
   "z": 0.36,
   "y": 1.06
  }
 },
 "wheels": {
  "spokeCount": 8,
  "spokeStyle": "blade",
  "rimColor": 13423572,
  "tireColor": 1447707,
  "hubRadius": 0.095,
  "rimRatio": 0.6
 }
};
export default SPEC;

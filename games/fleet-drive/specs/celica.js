// Rigg's '87 Toyota Celica GT (T160 Liftback) — photo-fitted loft spec (Neon car-fitter pipeline).
// Fitted from games/scaggsville-3d/reference/car-real/celica-rigg/ using wheel diameter (0.616m) as ruler. Canon blue paint + 0x0066ff blue beams.
// Provenance + the full recipe: ../AI-RECIPE.md in this folder.
export const SPEC = {
 "meta": {
  "name": "Rigg's '87 Toyota Celica GT (T160 Liftback)",
  "year": 1987,
  "notes": "Fitted from games/scaggsville-3d/reference/car-real/celica-rigg/ using wheel diameter (0.616m) as ruler. Canon blue paint + 0x0066ff blue beams."
 },
 "dims": {
  "length": 4.36,
  "width": 1.71,
  "height": 1.265,
  "wheelbase": 2.52,
  "wheelZFront": 1.25,
  "wheelZRear": -1.27,
  "wheelRadius": 0.308,
  "wheelWidth": 0.215,
  "trackHalfFront": 0.75,
  "trackHalfRear": 0.745,
  "archGap": 0.048
 },
 "paint": {
  "color": 1000086,
  "roughness": 0.2,
  "metalness": 0.34,
  "clearcoat": 0.96,
  "clearcoatRoughness": 0.11
 },
 "bodyStations": [
  {
   "z": -2.18,
   "yBot": 0.33,
   "yBelt": 0.74,
   "yDeck": 0.855,
   "wBot": 0.73,
   "wBelt": 0.8,
   "wDeck": 0.74,
   "crown": 0.014
  },
  {
   "z": -2.02,
   "yBot": 0.27,
   "yBelt": 0.75,
   "yDeck": 0.885,
   "wBot": 0.77,
   "wBelt": 0.84,
   "wDeck": 0.78,
   "crown": 0.016
  },
  {
   "z": -1.55,
   "yBot": 0.22,
   "yBelt": 0.76,
   "yDeck": 0.91,
   "wBot": 0.79,
   "wBelt": 0.855,
   "wDeck": 0.79,
   "crown": 0.016
  },
  {
   "z": -0.8,
   "yBot": 0.215,
   "yBelt": 0.75,
   "yDeck": 0.89,
   "wBot": 0.795,
   "wBelt": 0.855,
   "wDeck": 0.79,
   "crown": 0.015
  },
  {
   "z": 0.4,
   "yBot": 0.215,
   "yBelt": 0.74,
   "yDeck": 0.87,
   "wBot": 0.795,
   "wBelt": 0.855,
   "wDeck": 0.79,
   "crown": 0.018
  },
  {
   "z": 1.05,
   "yBot": 0.22,
   "yBelt": 0.72,
   "yDeck": 0.84,
   "wBot": 0.79,
   "wBelt": 0.85,
   "wDeck": 0.78,
   "crown": 0.022
  },
  {
   "z": 1.68,
   "yBot": 0.24,
   "yBelt": 0.67,
   "yDeck": 0.78,
   "wBot": 0.76,
   "wBelt": 0.825,
   "wDeck": 0.75,
   "crown": 0.02
  },
  {
   "z": 2.04,
   "yBot": 0.27,
   "yBelt": 0.61,
   "yDeck": 0.71,
   "wBot": 0.71,
   "wBelt": 0.78,
   "wDeck": 0.7,
   "crown": 0.016
  },
  {
   "z": 2.18,
   "yBot": 0.3,
   "yBelt": 0.57,
   "yDeck": 0.66,
   "wBot": 0.65,
   "wBelt": 0.73,
   "wDeck": 0.65,
   "crown": 0.012
  }
 ],
 "greenhouse": {
  "zRearBase": -1.78,
  "yRearBase": 0.91,
  "wRearBase": 0.73,
  "zRearRoof": -0.82,
  "yRearRoof": 1.255,
  "wRearRoof": 0.56,
  "zFrontRoof": 0.04,
  "yFrontRoof": 1.26,
  "wFrontRoof": 0.57,
  "zFrontBase": 0.76,
  "yFrontBase": 0.865,
  "wFrontBase": 0.74,
  "roofCrown": 0.026,
  "bPillarZ": -0.5,
  "windshieldColor": 1713718,
  "windshieldOpacity": 0.48,
  "sideGlassColor": 1450028,
  "sideGlassOpacity": 0.56,
  "rearGlassColor": 725016,
  "rearGlassOpacity": 0.88,
  "rearWiper": true,
  "mirrors": {
   "z": 0.52,
   "y": 0.9,
   "w": 0.14,
   "h": 0.085,
   "d": 0.11
  }
 },
 "frontFascia": {
  "bumperY": 0.455,
  "bumperH": 0.145,
  "bumperProtrusion": 0.06,
  "rubStripY": 0.485,
  "rubStripH": 0.038,
  "grille": {
   "y": 0.605,
   "h": 0.105,
   "w": 0.78,
   "slats": 3,
   "topBarText": true
  },
  "cornerLamps": {
   "y": 0.605,
   "h": 0.102,
   "innerSmokedW": 0.21,
   "outerAmberW": 0.13,
   "wrapZ": 0.22
  },
  "lowerIntake": {
   "y": 0.33,
   "h": 0.072,
   "w": 1.08,
   "dividers": 4
  },
  "chinSpoiler": {
   "enabled": true,
   "y": 0.24,
   "h": 0.082,
   "protrusion": 0.025,
   "zBack": 1.66
  },
  "popups": {
   "enabled": true,
   "w": 0.29,
   "d": 0.21,
   "xOffset": 0.5,
   "zPivot": 1.87,
   "ySurface": 0.74,
   "upAngle": 0.8,
   "lampColor": 15135487,
   "beamColor": 26367,
   "beamIntensity": 0.95
  }
 },
 "rearFascia": {
  "bumperY": 0.455,
  "bumperH": 0.145,
  "bumperProtrusion": 0.045,
  "rubStripY": 0.485,
  "rubStripH": 0.038,
  "tailPanel": {
   "y": 0.69,
   "h": 0.195,
   "centerW": 0.54,
   "lampW": 0.43,
   "amberOuterW": 0.115,
   "reverseW": 0.055,
   "wrapZ": 0.18
  },
  "spoiler": {
   "style": "lip",
   "z": -2.06,
   "y": 0.935,
   "h": 0.055,
   "d": 0.16,
   "w": 1.52
  },
  "exhaust": {
   "side": "right",
   "count": 2,
   "xOffset": 0.42,
   "y": 0.24,
   "r": 0.032
  },
  "mudFlaps": true,
  "fuelDoor": {
   "z": -1.66,
   "y": 0.77,
   "side": 1
  }
 },
 "trim": {
  "sideRubStrip": {
   "enabled": true,
   "y": 0.485,
   "h": 0.042
  },
  "rockerSkirt": {
   "enabled": true,
   "y": 0.23,
   "h": 0.055
  },
  "doorHandle": {
   "z": -0.45,
   "y": 0.78
  },
  "frontSideMarker": {
   "z": 1.84,
   "y": 0.485,
   "w": 0.11,
   "h": 0.028,
   "color": 15236628
  }
 },
 "wheels": {
  "spokeCount": 10,
  "spokeStyle": "blade",
  "rimColor": 13686494,
  "tireColor": 1447707,
  "hubRadius": 0.068,
  "rimRatio": 0.68
 }
};
export default SPEC;

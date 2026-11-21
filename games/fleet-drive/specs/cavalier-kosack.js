// Kosack's '96 Chevrolet Cavalier Coupe — NEON FIT (fit-cavalier-neon/cavalier-neon-spec.json, Hawk2 main). Canon red 0x7d1015. Cop light bar is a fleet-layer accessory in Scaggsville 3D, not part of this spec.
// Spec used verbatim from the compare-gated fit — see ../AI-RECIPE.md.
export const SPEC = {
 "meta": {
  "name": "Kosack's '96 Chevrolet Cavalier Coupe (Neon Fit)",
  "year": 1996,
  "notes": "Fresh fit from games/scaggsville-3d/reference/car-real/cavalier-kosack/ (factory dims 4.60m x 1.73m x 1.35m, wb 2.64m). Canon RED paint (0x7d1015). Cop light bar is a fleet-layer accessory (omitted from base geometry)."
 },
 "dims": {
  "length": 4.6,
  "width": 1.73,
  "height": 1.35,
  "wheelbase": 2.64,
  "wheelZFront": 1.34,
  "wheelZRear": -1.3,
  "wheelRadius": 0.314,
  "wheelWidth": 0.205,
  "trackHalfFront": 0.76,
  "trackHalfRear": 0.755,
  "archGap": 0.052
 },
 "paint": {
  "color": 8196117,
  "roughness": 0.22,
  "metalness": 0.24,
  "clearcoat": 0.94,
  "clearcoatRoughness": 0.12
 },
 "bodyStations": [
  {
   "z": -2.3,
   "yBot": 0.34,
   "yBelt": 0.72,
   "yDeck": 0.9,
   "wBot": 0.7,
   "wBelt": 0.78,
   "wDeck": 0.71,
   "crown": 0.032
  },
  {
   "z": -2.1,
   "yBot": 0.28,
   "yBelt": 0.78,
   "yDeck": 0.96,
   "wBot": 0.76,
   "wBelt": 0.84,
   "wDeck": 0.77,
   "crown": 0.036
  },
  {
   "z": -1.55,
   "yBot": 0.24,
   "yBelt": 0.8,
   "yDeck": 0.97,
   "wBot": 0.79,
   "wBelt": 0.865,
   "wDeck": 0.79,
   "crown": 0.03
  },
  {
   "z": -0.75,
   "yBot": 0.22,
   "yBelt": 0.78,
   "yDeck": 0.93,
   "wBot": 0.8,
   "wBelt": 0.865,
   "wDeck": 0.79,
   "crown": 0.025
  },
  {
   "z": 0.45,
   "yBot": 0.22,
   "yBelt": 0.76,
   "yDeck": 0.9,
   "wBot": 0.8,
   "wBelt": 0.865,
   "wDeck": 0.79,
   "crown": 0.028
  },
  {
   "z": 1.15,
   "yBot": 0.23,
   "yBelt": 0.73,
   "yDeck": 0.86,
   "wBot": 0.79,
   "wBelt": 0.855,
   "wDeck": 0.77,
   "crown": 0.036
  },
  {
   "z": 1.78,
   "yBot": 0.25,
   "yBelt": 0.66,
   "yDeck": 0.78,
   "wBot": 0.75,
   "wBelt": 0.82,
   "wDeck": 0.73,
   "crown": 0.036
  },
  {
   "z": 2.14,
   "yBot": 0.27,
   "yBelt": 0.58,
   "yDeck": 0.68,
   "wBot": 0.69,
   "wBelt": 0.76,
   "wDeck": 0.66,
   "crown": 0.03
  },
  {
   "z": 2.3,
   "yBot": 0.3,
   "yBelt": 0.53,
   "yDeck": 0.61,
   "wBot": 0.61,
   "wBelt": 0.69,
   "wDeck": 0.58,
   "crown": 0.022
  }
 ],
 "greenhouse": {
  "zRearBase": -1.78,
  "yRearBase": 0.96,
  "wRearBase": 0.72,
  "zRearRoof": -0.78,
  "yRearRoof": 1.32,
  "wRearRoof": 0.55,
  "zFrontRoof": 0.14,
  "yFrontRoof": 1.33,
  "wFrontRoof": 0.56,
  "zFrontBase": 0.92,
  "yFrontBase": 0.88,
  "wFrontBase": 0.75,
  "roofCrown": 0.042,
  "rounded": true,
  "roofArch": 0.055,
  "bPillarZ": -0.44,
  "windshieldColor": 1713718,
  "windshieldOpacity": 0.44,
  "sideGlassColor": 1450028,
  "sideGlassOpacity": 0.52,
  "rearGlassColor": 1054240,
  "rearGlassOpacity": 0.76,
  "rearWiper": false,
  "mirrors": {
   "z": 0.62,
   "y": 0.93,
   "w": 0.14,
   "h": 0.085,
   "d": 0.11
  }
 },
 "frontFascia": {
  "bumpers": "unpainted",
  "bumperY": 0.43,
  "bumperH": 0.27,
  "bumperProtrusion": 0.09,
  "bumperCornerR": 0.22,
  "rubStripY": 0.43,
  "rubStripH": 0,
  "lampStyle": "teardrop",
  "grille": {
   "inBumper": true,
   "y": 0.39,
   "h": 0.11,
   "w": 0.84,
   "slats": 4,
   "topBarText": false
  },
  "cornerLamps": {
   "y": 0.6,
   "h": 0.115,
   "innerSmokedW": 0.34,
   "outerAmberW": 0.14,
   "wrapZ": 0.26
  },
  "lowerIntake": {
   "y": 0.39,
   "h": 0.095,
   "w": 0.78,
   "dividers": 0
  },
  "chinSpoiler": {
   "enabled": true,
   "y": 0.24,
   "h": 0.065,
   "protrusion": 0.015,
   "zBack": 1.82
  },
  "popups": {
   "enabled": false
  }
 },
 "rearFascia": {
  "bumpers": "unpainted",
  "bumperY": 0.45,
  "bumperH": 0.26,
  "bumperProtrusion": 0.08,
  "bumperCornerR": 0.2,
  "rubStripY": 0.45,
  "rubStripH": 0,
  "paintedLowerValance": false,
  "tailPanel": {
   "style": "oval",
   "y": 0.74,
   "h": 0.15,
   "centerW": 0.52,
   "lampW": 0.44,
   "amberOuterW": 0.06,
   "reverseW": 0.11,
   "wrapZ": 0.18
  },
  "spoiler": {
   "style": "none"
  },
  "exhaust": {
   "side": "left",
   "count": 1,
   "xOffset": 0.44,
   "y": 0.24,
   "r": 0.028
  },
  "mudFlaps": true,
  "fuelDoor": {
   "z": -1.62,
   "y": 0.78,
   "side": -1
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
   "y": 0.23,
   "h": 0.04
  },
  "doorHandle": {
   "z": -0.44,
   "y": 0.8
  }
 },
 "wheels": {
  "spokeCount": 5,
  "spokeStyle": "blade",
  "rimColor": 12764872,
  "tireColor": 1447707,
  "hubRadius": 0.115,
  "rimRatio": 0.62
 }
};
export default SPEC;

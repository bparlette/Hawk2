// Lamar's '87 Ford Mustang GT Hatchback (Fox) — INTACT (fit-mustang-lamar/mustang-gt.json, Hawk2 main).
// Spec used verbatim from the compare-gated fit — see ../AI-RECIPE.md.
export const SPEC = {
 "meta": {
  "name": "Lamar's '87 Ford Mustang GT Hatchback (Fox)",
  "year": 1987,
  "notes": "Fitted from games/scaggsville-3d/reference/car-real/mustang-lamar/ (Hemmings set) using grid-side.png ratios (WB/L 0.566 measured vs 0.570 factory) anchored to factory dims (L 4.56 / WB 2.60). INTACT car, grey metallic. Photo wheels are 16in basket-weaves (dealer option) - mesh style. Blue side stripe NOT copied (audit: shape only). In-game this car is BURNT - see mustang-gt-burnt spec; smoke/ember treatment is game-layer."
 },
 "dims": {
  "length": 4.56,
  "width": 1.76,
  "height": 1.32,
  "wheelbase": 2.6,
  "wheelZFront": 1.3,
  "wheelZRear": -1.3,
  "wheelRadius": 0.316,
  "wheelWidth": 0.225,
  "trackHalfFront": 0.72,
  "trackHalfRear": 0.73,
  "archGap": 0.042
 },
 "paint": {
  "color": 6580334,
  "roughness": 0.34,
  "metalness": 0.55,
  "clearcoat": 0.8,
  "clearcoatRoughness": 0.2
 },
 "bodyStations": [
  {
   "z": -2.28,
   "yBot": 0.3,
   "yBelt": 0.84,
   "yDeck": 0.93,
   "wBot": 0.74,
   "wBelt": 0.82,
   "wDeck": 0.76,
   "crown": 0.012
  },
  {
   "z": -2.0,
   "yBot": 0.25,
   "yBelt": 0.85,
   "yDeck": 0.94,
   "wBot": 0.79,
   "wBelt": 0.86,
   "wDeck": 0.79,
   "crown": 0.013
  },
  {
   "z": -1.3,
   "yBot": 0.2,
   "yBelt": 0.85,
   "yDeck": 0.92,
   "wBot": 0.81,
   "wBelt": 0.865,
   "wDeck": 0.8,
   "crown": 0.013
  },
  {
   "z": -0.4,
   "yBot": 0.19,
   "yBelt": 0.84,
   "yDeck": 0.9,
   "wBot": 0.81,
   "wBelt": 0.86,
   "wDeck": 0.8,
   "crown": 0.013
  },
  {
   "z": 0.6,
   "yBot": 0.19,
   "yBelt": 0.83,
   "yDeck": 0.89,
   "wBot": 0.81,
   "wBelt": 0.855,
   "wDeck": 0.8,
   "crown": 0.015
  },
  {
   "z": 1.3,
   "yBot": 0.21,
   "yBelt": 0.79,
   "yDeck": 0.85,
   "wBot": 0.8,
   "wBelt": 0.85,
   "wDeck": 0.79,
   "crown": 0.018
  },
  {
   "z": 1.9,
   "yBot": 0.24,
   "yBelt": 0.72,
   "yDeck": 0.79,
   "wBot": 0.77,
   "wBelt": 0.83,
   "wDeck": 0.76,
   "crown": 0.016
  },
  {
   "z": 2.28,
   "yBot": 0.28,
   "yBelt": 0.66,
   "yDeck": 0.74,
   "wBot": 0.71,
   "wBelt": 0.79,
   "wDeck": 0.71,
   "crown": 0.012
  }
 ],
 "greenhouse": {
  "zRearBase": -2.02,
  "yRearBase": 0.945,
  "wRearBase": 0.7,
  "zRearRoof": -0.8,
  "yRearRoof": 1.31,
  "wRearRoof": 0.555,
  "zFrontRoof": 0.22,
  "yFrontRoof": 1.315,
  "wFrontRoof": 0.565,
  "zFrontBase": 0.82,
  "yFrontBase": 0.875,
  "wFrontBase": 0.72,
  "roofCrown": 0.024,
  "bPillarZ": -0.32,
  "windshieldColor": 1713718,
  "windshieldOpacity": 0.52,
  "sideGlassColor": 1450028,
  "sideGlassOpacity": 0.62,
  "rearGlassColor": 725016,
  "rearGlassOpacity": 0.88,
  "rearWiper": false,
  "mirrors": {
   "z": 0.6,
   "y": 0.9,
   "w": 0.14,
   "h": 0.085,
   "d": 0.11
  }
 },
 "frontFascia": {
  "bumperY": 0.465,
  "bumperH": 0.155,
  "bumperProtrusion": 0.05,
  "rubStripY": 0.49,
  "rubStripH": 0.045,
  "grille": {
   "y": 0.6,
   "h": 0.1,
   "w": 0.76,
   "slats": 3,
   "topBarText": false
  },
  "cornerLamps": {
   "y": 0.6,
   "h": 0.1,
   "innerSmokedW": 0.22,
   "outerAmberW": 0.14,
   "wrapZ": 0.22
  },
  "lowerIntake": {
   "y": 0.33,
   "h": 0.06,
   "w": 0.92,
   "dividers": 1
  },
  "chinSpoiler": {
   "enabled": true,
   "y": 0.225,
   "h": 0.09,
   "protrusion": 0.03,
   "zBack": 1.45,
   "painted": true
  },
  "popups": {
   "enabled": false
  },
  "fixedLamps": {
   "enabled": true,
   "y": 0.685,
   "h": 0.14,
   "pocketW": 0.58,
   "xOffset": 0.47,
   "lampColor": 16054265,
   "beamColor": 16767400,
   "emissiveIntensity": 1.5,
   "beamOpacity": 0.4,
   "fogLamps": true
  }
 },
 "rearFascia": {
  "bumperY": 0.44,
  "bumperH": 0.17,
  "bumperProtrusion": 0.05,
  "rubStripY": 0.475,
  "rubStripH": 0.045,
  "paintedLowerValance": true,
  "tailPanel": {
   "style": "camaroGrid",
   "y": 0.815,
   "h": 0.205,
   "centerW": 0.3,
   "lampW": 0.6,
   "amberOuterW": 0.1,
   "reverseW": 0.07,
   "wrapZ": 0.1
  },
  "spoiler": {
   "style": "wing",
   "z": -2.13,
   "y": 0.97,
   "h": 0.125,
   "d": 0.3,
   "w": 1.44
  },
  "exhaust": {
   "side": "dual",
   "count": 1,
   "xOffset": 0.5,
   "y": 0.2,
   "r": 0.028
  },
  "mudFlaps": true,
  "fuelDoor": {
   "z": -1.6,
   "y": 0.8,
   "side": 1
  }
 },
 "trim": {
  "sideRubStrip": {
   "enabled": true,
   "y": 0.545,
   "h": 0.052
  },
  "rockerSkirt": {
   "enabled": false,
   "y": 0.225,
   "h": 0.055
  },
  "doorHandle": {
   "z": -0.3,
   "y": 0.795
  },
  "frontSideMarker": {
   "z": 1.95,
   "y": 0.6,
   "w": 0.13,
   "h": 0.03,
   "color": 15236628
  }
 },
 "wheels": {
  "spokeCount": 16,
  "spokeStyle": "mesh",
  "rimColor": 14212062,
  "tireColor": 1447707,
  "hubRadius": 0.06,
  "rimRatio": 0.64
 }
};
export default SPEC;

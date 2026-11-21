// Kosack's '96 Chevrolet Cavalier Coupe — BLACK VARIANT (fit-cavalier-kosack/cavalier-black.json, Hawk2 main).
// Spec used verbatim from the compare-gated fit — see ../AI-RECIPE.md.
export const SPEC = {
 "meta": {
  "name": "Kosack's '96 Chevrolet Cavalier Coupe (Black)",
  "notes": "Black variant of the Cavalier fit \u2014 the 11th fleet car parked at Kosack's. Identical geometry/trim to cavalier-kosack.json; paint only. Base trim, unpainted gray bumpers (oversized black rub-strip workaround)."
 },
 "dims": {
  "length": 4.6,
  "width": 1.73,
  "height": 1.35,
  "wheelbase": 2.64,
  "wheelZFront": 1.34,
  "wheelZRear": -1.3,
  "wheelRadius": 0.314,
  "wheelWidth": 0.2,
  "trackHalfFront": 0.72,
  "trackHalfRear": 0.71,
  "archGap": 0.045
 },
 "paint": {
  "color": 789518,
  "frontColor": null,
  "rearColor": null,
  "splitZ": 0.55,
  "splitBlend": 0.35,
  "roughness": 0.32,
  "metalness": 0.25,
  "clearcoat": 0.9,
  "clearcoatRoughness": 0.22
 },
 "bodyStations": [
  {
   "z": -2.3,
   "yBot": 0.34,
   "yBelt": 0.8,
   "yDeck": 0.9,
   "wBot": 0.72,
   "wBelt": 0.79,
   "wDeck": 0.72,
   "crown": 0.014
  },
  {
   "z": -2.05,
   "yBot": 0.28,
   "yBelt": 0.81,
   "yDeck": 0.93,
   "wBot": 0.77,
   "wBelt": 0.83,
   "wDeck": 0.76,
   "crown": 0.016
  },
  {
   "z": -1.4,
   "yBot": 0.23,
   "yBelt": 0.82,
   "yDeck": 0.92,
   "wBot": 0.79,
   "wBelt": 0.85,
   "wDeck": 0.78,
   "crown": 0.016
  },
  {
   "z": -0.5,
   "yBot": 0.22,
   "yBelt": 0.82,
   "yDeck": 0.9,
   "wBot": 0.8,
   "wBelt": 0.855,
   "wDeck": 0.79,
   "crown": 0.015
  },
  {
   "z": 0.5,
   "yBot": 0.22,
   "yBelt": 0.81,
   "yDeck": 0.88,
   "wBot": 0.8,
   "wBelt": 0.855,
   "wDeck": 0.79,
   "crown": 0.017
  },
  {
   "z": 1.3,
   "yBot": 0.23,
   "yBelt": 0.78,
   "yDeck": 0.85,
   "wBot": 0.79,
   "wBelt": 0.85,
   "wDeck": 0.78,
   "crown": 0.022
  },
  {
   "z": 1.9,
   "yBot": 0.235,
   "yBelt": 0.74,
   "yDeck": 0.82,
   "wBot": 0.76,
   "wBelt": 0.82,
   "wDeck": 0.75,
   "crown": 0.02
  },
  {
   "z": 2.3,
   "yBot": 0.27,
   "yBelt": 0.68,
   "yDeck": 0.76,
   "wBot": 0.7,
   "wBelt": 0.78,
   "wDeck": 0.7,
   "crown": 0.014
  }
 ],
 "greenhouse": {
  "zRearBase": -1.48,
  "yRearBase": 0.94,
  "wRearBase": 0.6,
  "zRearRoof": -0.62,
  "yRearRoof": 1.345,
  "wRearRoof": 0.545,
  "zFrontRoof": 0.2,
  "yFrontRoof": 1.35,
  "wFrontRoof": 0.56,
  "zFrontBase": 0.88,
  "yFrontBase": 0.885,
  "wFrontBase": 0.71,
  "roofCrown": 0.045,
  "bPillarZ": -0.3,
  "windshieldColor": 1713718,
  "windshieldOpacity": 0.52,
  "sideGlassColor": 1450028,
  "sideGlassOpacity": 0.62,
  "rearGlassColor": 725016,
  "rearGlassOpacity": 0.88,
  "rearWiper": false,
  "mirrors": {
   "z": 0.62,
   "y": 0.9,
   "w": 0.14,
   "h": 0.085,
   "d": 0.11
  }
 },
 "frontFascia": {
  "bumperY": 0.44,
  "bumperH": 0.26,
  "bumperProtrusion": 0.05,
  "rubStripY": 0.44,
  "rubStripH": 0.2,
  "grille": {
   "y": 0.7,
   "h": 0.05,
   "w": 0.34,
   "slats": 1,
   "topBarText": false
  },
  "cornerLamps": {
   "y": 0.73,
   "h": 0.09,
   "innerSmokedW": 0.36,
   "outerAmberW": 0.11,
   "wrapZ": 0.24
  },
  "lowerIntake": {
   "y": 0.255,
   "h": 0.075,
   "w": 1.04,
   "dividers": 5
  },
  "chinSpoiler": {
   "enabled": true,
   "y": 0.232,
   "h": 0.075,
   "protrusion": 0.015,
   "zBack": 1.6
  },
  "popups": {
   "enabled": false
  },
  "fixedLamps": {
   "enabled": false
  }
 },
 "rearFascia": {
  "bumperY": 0.43,
  "bumperH": 0.28,
  "bumperProtrusion": 0.045,
  "rubStripY": 0.43,
  "rubStripH": 0.21,
  "tailPanel": {
   "y": 0.79,
   "h": 0.155,
   "centerW": 0.66,
   "lampW": 0.38,
   "amberOuterW": 0.05,
   "reverseW": 0.11,
   "wrapZ": 0.16
  },
  "spoiler": {
   "style": "none"
  },
  "exhaust": {
   "side": "left",
   "count": 1,
   "xOffset": 0.44,
   "y": 0.21,
   "r": 0.026
  },
  "mudFlaps": true,
  "fuelDoor": {
   "z": -1.52,
   "y": 0.75,
   "side": -1
  }
 },
 "trim": {
  "sideRubStrip": {
   "enabled": true,
   "y": 0.545,
   "h": 0.07
  },
  "rockerSkirt": {
   "enabled": false,
   "y": 0.225,
   "h": 0.055
  },
  "doorHandle": {
   "z": -0.18,
   "y": 0.755
  },
  "frontSideMarker": {
   "z": 1.98,
   "y": 0.52,
   "w": 0.1,
   "h": 0.026,
   "color": 15236628
  }
 },
 "wheels": {
  "spokeCount": 5,
  "spokeStyle": "twin",
  "rimColor": 12172738,
  "tireColor": 1447707,
  "hubRadius": 0.075,
  "rimRatio": 0.565
 }
};
export default SPEC;

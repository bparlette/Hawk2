// Fleet Drive — the lot's car list.
//
// THIS IS THE FILE AN AI EDITS TO ADD A CAR. Every car that completes the
// photo-to-game-car recipe (see AI-RECIPE.md in this folder, Step 9) gets
// parked here as ONE entry: { name, spec }.
//
// To add the next fitted car:
//   1. Save its approved spec object as specs/<slug>.js
//      (export const SPEC = { ... }; export default SPEC;)
//   2. Import it below and append ONE line to CARS.
//   3. Reload: the car appears in the lot row, parked, and is drivable
//      through the SWAP button / Tab key. Nothing else changes.
//
// The spec is the exact object that passed the recipe's side-by-side
// compare gate — paint/fade, beam colour and pop-up state travel with it.
// Cars are built at runtime by src/gpcar_loft.js (buildLoftedCar), the
// same builder the bake-off viewers use. No per-car geometry code.

import CELICA_SPEC from './specs/celica.js';
import CAMARO_SPEC from './specs/camaro.js';

export const CARS = [
  { name: "Rigg's '87 Celica GT", spec: CELICA_SPEC },
  { name: "Brad's '87 Camaro IROC-Z", spec: CAMARO_SPEC },
  // Next fitted car: append its { name, spec } entry here.
];

export default CARS;

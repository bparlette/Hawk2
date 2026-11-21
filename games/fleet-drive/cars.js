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
//      by walking up to it and tapping GET IN (SWAP / Tab still cycles
//      cars while driving). Nothing else changes.
//
// The spec is the exact object that passed the recipe's side-by-side
// compare gate — paint/fade, beam colour and pop-up state travel with it.
// Cars are built at runtime by src/gpcar_loft.js (buildLoftedCar), the
// same builder the bake-off viewers use. No per-car geometry code.
//
// THE LOT IS THE CREW FLEET ONLY — these 12 cars and no others. The
// world builder's generic curbside cars are switched off in index.html
// (buildWorld is called with { parkedCarCount: 0 }).

import CAMARO_SPEC from './specs/camaro.js';
import CELICA_SPEC from './specs/celica.js';
import CAVALIER_SPEC from './specs/cavalier-kosack.js';
import CAVALIER_BLACK_SPEC from './specs/cavalier-black.js';
import MUSTANG_SPEC from './specs/mustang-lamar.js';
import MUSTANG_BURNT_SPEC from './specs/mustang-burnt.js';
import CAMARO_CLAYTON_SPEC from './specs/camaro-clayton.js';
import BROUGHAM_SPEC from './specs/brougham-grant.js';
import ASTRO_JIMMY_SPEC from './specs/astro-jimmy.js';
import ASTRO_BILLY_SPEC from './specs/astro-billy.js';
import CAMRY_SPEC from './specs/camry.js';
import TRACER_SPEC from './specs/tracer.js';

export const CARS = [
  { name: "Brad's '87 Camaro IROC-Z", spec: CAMARO_SPEC },
  { name: "Rigg's '87 Celica GT", spec: CELICA_SPEC },
  { name: "Kosack's '96 Cavalier", spec: CAVALIER_SPEC },
  { name: "Kosack's '96 Cavalier — Black", spec: CAVALIER_BLACK_SPEC },
  { name: "Lamar's '87 Mustang GT", spec: MUSTANG_SPEC },
  { name: "Lamar's '87 Mustang GT — Burnt", spec: MUSTANG_BURNT_SPEC },
  { name: "Clayton's '89 Camaro IROC-Z", spec: CAMARO_CLAYTON_SPEC },
  { name: "Grant's '90 Brougham", spec: BROUGHAM_SPEC },
  { name: "Jimmy's '00 Astro LS", spec: ASTRO_JIMMY_SPEC },
  { name: "Billy's '90 Astro", spec: ASTRO_BILLY_SPEC },
  { name: "Jason's '89 Camry", spec: CAMRY_SPEC },
  { name: "Zack's Tracer", spec: TRACER_SPEC },
  // Next fitted car: append its { name, spec } entry here.
];

export default CARS;

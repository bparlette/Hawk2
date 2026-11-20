// Scaggsville 3D — the crew as DATA.
// Vehicle rows feed the shared gamepress factory (gpvehicles.js): each car is
// a body style + paint + signature extras, modeled from the reference photos
// in research/refs/ (Hawk games/laurel-fulton/showcase-assets/*-ref.*).
// People rows feed src/people.js (Figure Factory / rigkit method).
//
// Paint notes vs the photos: photos are SHAPE references. Where a photo's
// colour differs from the roster's car, the roster wins (flagged in NOTES.md):
//   kosack photo is silver — the car is red.  zack photo is the blue Mazda
//   hatch twin — the fleet sprite + dims say the Tracer is a green sedan.
//   rigg's showcase photo shows a '70s Celica, but the fleet list, fleet.json
//   dims (4.37 x 1.69) and canon all say '87 Celica GT — modeled as the '87
//   (celica87 style, pop-ups up); the photo looks mis-filed. All 11 fleet
//   cars from the asset page are rowed here, incl. the Black Cavalier.

export const CREW_VEHICLES = {
  brad:    { style: 'camaro3',     paint: 0xf2f0ea, paint2: 0x6e1f2a, twoTone: 'band', hoodLouvers: true, tTop: true, wheels: 'alloy',
             name: "Brad's '87 Camaro" },
  clayton: { style: 'camaro3',     paint: 0x2e6b34, hoodLouvers: true, tTop: true, wheels: 'alloy',
             name: "Clayton's Camaro" },
  zack:    { style: 'tracerSedan', paint: 0x3a7d4c, wheels: 'steel',
             name: "Zack's Tracer" },
  kosack:  { style: 'cavalier3',   paint: 0xb02020, lightBar: true, wheels: 'steel',
             name: "Kosack's '96 Cavalier" },
  cavalierBlack: { style: 'cavalier3', paint: 0x14151a, wheels: 'steel',
             name: "The Black Cavalier" },
  jason:   { style: 'camryV20',    paint: 0xf4f4f2, wheels: 'steel',
             name: "Jason's '89 Camry" },
  rigg:    { style: 'celica87',    paint: 0x2a66b0, popups: true, wheels: 'alloy',
             name: "Rigg's '87 Celica GT" },
  grant:   { style: 'brougham',    paint: 0x5e1f24, paint2: 0xb9bcbe, twoTone: 'cladding', wheels: 'wire',
             name: "Grant's Brougham 'USS Mino'" },
  jimmy:   { style: 'astro2',      paint: 0xc8ccd2, underglow: 0x2a6bff, wheels: 'steel',
             name: "Jimmy's Astro" },
  billy:   { style: 'astro1',      paint: 0x2a7d8c, wheels: 'steel',
             name: "Billy's Astro" },
  lamar:   { style: 'mustangFox',  paint: 0x35322e, burnt: true, fogLamps: true, spoiler: true, wheels: 'alloy',
             name: "Lamar's '87 Mustang" },
};

// One figure per household member (the person who comes out to join).
// Clothing colours are plausible-90s casuals; there is no clothing canon.
// Dressed, not shapes: every figure gets a hat style and shirt detail
// (people.js turns the row into geometry). PANTS for everyone — full-length
// loose trousers, no shorts (Cherie, Nov 20).
export const CREW_PEOPLE = {
  brad:    { skin: 0xe0ac69, shirt: 0x8a1f2d, pants: 0x2a3a5e, hair: 0x2a1a0e, hairStyle: 'short', hat: 'cap', hatColor: 0x24304a },
  clayton: { skin: 0xf1c27d, shirt: 0x2e5e34, pants: 0x6a6248, hair: 0x4a3018, hairStyle: 'short', hat: 'brim', hatColor: 0x3a5a30 },
  zack:    { skin: 0xe0ac69, shirt: 0x707880, pants: 0x4a4238, hair: 0x1a1410, hairStyle: 'cap', capColor: 0x2e6b34, stripe: 0x2e6b34 },
  kosack:  { skin: 0xf1c27d, shirt: 0xb02020, pants: 0x23232a, hair: 0x14100c, hairStyle: 'short', stripe: 0xf2f0ea },
  jason:   { skin: 0xe0ac69, shirt: 0xe8e6df, pants: 0x5a5148, hair: 0x2a1a0e, hairStyle: 'short', hat: 'brim', hatColor: 0xa8895a },
  rigg:    { skin: 0xc68642, shirt: 0x2456c8, pants: 0x37414e, hair: 0x0e0c0a, hairStyle: 'short', hat: 'cap', hatColor: 0x1d3f7a },
  grant:   { skin: 0x8d5524, shirt: 0x5e1f24, pants: 0x23232a, hair: 0x0e0c0a, hairStyle: 'short', stripe: 0xc8a83a, hat: 'beanie', hatColor: 0x2a2226 },
  jimmy:   { skin: 0xe0ac69, shirt: 0x3a6ea5, pants: 0x565048, hair: 0x4a3018, hairStyle: 'cap', capColor: 0x8a1f2d },
  billy:   { skin: 0xf1c27d, shirt: 0x2a7d8c, pants: 0x3a3f44, hair: 0x6a4a28, hairStyle: 'long', hat: 'brim', hatColor: 0x74452a },
};
export default CREW_VEHICLES;

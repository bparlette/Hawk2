// Scaggsville 3D — the ORIGINAL 2D house interior kits, verbatim from the
// 2D Scaggsville game (games/laurel-fulton/data/interiors/<id>.json, built
// to tools/INTERIOR-SPEC.md). Cherie's call, Nov 21 2026: the 3D game goes
// back to these 2D interiors — this module is their data, byte-for-byte the
// designs the 2D game plays (floors / rooms / props / spots / barks / dogs,
// including Brad's dogHomes brow dog, which the old 3D port had dropped).
// Consumed by src/lf_interior.js (logic) + src/lf_interior_render.js (draw),
// driven by src/interiors.js. Regenerate from the JSONs, do not hand-edit
// rooms: the 2D game is the source of truth for these houses.

export const KITS_2D = {

// ---- kosack ----
kosack: {
 "id": "kosack",
 "type": "three-level",
 "width": 12.0,
 "grade": 0.0,
 "ceiling": 2.5,
 "floors": [
  {
   "id": "main",
   "z": 0.2,
   "x0": 0.0,
   "x1": 12.0
  },
  {
   "id": "upper",
   "z": 3.0,
   "x0": 3.4,
   "x1": 12.0
  },
  {
   "id": "lower",
   "z": -2.6,
   "x0": 0.0,
   "x1": 12.0
  }
 ],
 "links": [
  {
   "id": "up",
   "a": "main",
   "ax": 0.9,
   "b": "upper",
   "bx": 3.4,
   "press": true
  },
  {
   "id": "down",
   "a": "main",
   "ax": 5.4,
   "b": "lower",
   "bx": 2.6,
   "press": true
  }
 ],
 "door": {
  "floor": "main",
  "x": 0.35
 },
 "rooms": [
  {
   "floor": "main",
   "x0": 0.0,
   "x1": 6.6,
   "name": "living room",
   "wall": "#dccaa2",
   "floorc": "#9c6b44"
  },
  {
   "floor": "main",
   "x0": 6.6,
   "x1": 12.0,
   "name": "kitchen",
   "wall": "#e6dcb8",
   "floorc": "#c9b99a"
  },
  {
   "floor": "upper",
   "x0": 3.4,
   "x1": 6.4,
   "name": "top stair hallway",
   "wall": "#e6dcc4",
   "floorc": "#a8845a"
  },
  {
   "floor": "upper",
   "x0": 6.4,
   "x1": 12.0,
   "name": "Kosack's room",
   "wall": "#6a7c5c",
   "floorc": "#6e5a4c"
  },
  {
   "floor": "lower",
   "x0": 0.0,
   "x1": 6.0,
   "name": "the arcade",
   "wall": "#2e2848",
   "floorc": "#3a3046"
  },
  {
   "floor": "lower",
   "x0": 6.0,
   "x1": 12.0,
   "name": "the bar",
   "wall": "#5a3a2a",
   "floorc": "#4a3a30"
  }
 ],
 "props": [
  {
   "kind": "couch",
   "floor": "main",
   "x": 3.0
  },
  {
   "kind": "tv",
   "floor": "main",
   "x": 4.6
  },
  {
   "kind": "rug",
   "floor": "main",
   "x": 3.0
  },
  {
   "kind": "lamp",
   "floor": "main",
   "x": 1.9
  },
  {
   "kind": "cooler",
   "floor": "main",
   "x": 7.4
  },
  {
   "kind": "fridge",
   "floor": "main",
   "x": 11.2
  },
  {
   "kind": "table",
   "floor": "main",
   "x": 9.0
  },
  {
   "kind": "picture",
   "floor": "upper",
   "x": 4.6
  },
  {
   "kind": "plant",
   "floor": "upper",
   "x": 6.0
  },
  {
   "kind": "bed",
   "floor": "upper",
   "x": 10.8
  },
  {
   "kind": "speaker",
   "floor": "upper",
   "x": 8.0
  },
  {
   "kind": "arcade",
   "floor": "lower",
   "x": 1.2,
   "cabinets": [
    "GALAGA",
    "MORTAL KOMBAT",
    "NBA JAM"
   ]
  },
  {
   "kind": "couch",
   "floor": "lower",
   "x": 4.4
  },
  {
   "kind": "hole",
   "floor": "lower",
   "x": 7.0
  },
  {
   "kind": "bar",
   "floor": "lower",
   "x": 9.2,
   "beers": 8
  },
  {
   "kind": "speaker",
   "floor": "lower",
   "x": 11.4
  }
 ],
 "spots": [
  {
   "act": "EXIT",
   "floor": "main",
   "x": 0.35
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 7.4,
   "src": "cooler"
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 11.2,
   "src": "fridge"
  },
  {
   "act": "PLAY",
   "floor": "lower",
   "x": 2.1,
   "src": "arcade"
  },
  {
   "act": "GRAB BEER",
   "floor": "lower",
   "x": 9.2,
   "src": "bar"
  }
 ],
 "dogs": 0,
 "barks": [
  {
   "who": "kosack",
   "name": "Kosack",
   "floor": "upper",
   "x": 3.9,
   "text": "Chinese food is here.",
   "at": 1.0
  },
  {
   "who": "rigg",
   "name": "Rigg",
   "floor": "lower",
   "x": 3.2,
   "text": "watch wang wash wang.",
   "at": 3.3
  },
  {
   "who": "kosack",
   "name": "Kosack",
   "floor": "upper",
   "x": 3.9,
   "text": "shut up.",
   "at": 5.4
  }
 ],
 "party": {
  "floor": "lower",
  "x0": 0.4,
  "x1": 11.6
 },
 "cpuIdle": {
  "floor": "lower",
  "x": 8.4
 }
},

// ---- jason ----
jason: {
 "id": "jason",
 "type": "three-level",
 "width": 12.0,
 "grade": 0.0,
 "ceiling": 2.5,
 "floors": [
  {
   "id": "main",
   "z": 0.2,
   "x0": 0.0,
   "x1": 12.0
  },
  {
   "id": "upper",
   "z": 3.0,
   "x0": 3.4,
   "x1": 12.0
  },
  {
   "id": "lower",
   "z": -2.6,
   "x0": 0.0,
   "x1": 12.0
  }
 ],
 "links": [
  {
   "id": "up",
   "a": "main",
   "ax": 0.9,
   "b": "upper",
   "bx": 3.4,
   "press": true
  },
  {
   "id": "down",
   "a": "main",
   "ax": 5.4,
   "b": "lower",
   "bx": 2.6,
   "press": true
  }
 ],
 "door": {
  "floor": "main",
  "x": 0.35
 },
 "rooms": [
  {
   "floor": "main",
   "x0": 0.0,
   "x1": 12.0,
   "name": "living room",
   "wall": "#e2d8bc",
   "floorc": "#9c6b44"
  },
  {
   "floor": "upper",
   "x0": 3.4,
   "x1": 6.4,
   "name": "upstairs hall",
   "wall": "#e6dcc4",
   "floorc": "#a8845a"
  },
  {
   "floor": "upper",
   "x0": 6.4,
   "x1": 12.0,
   "name": "Jason's room",
   "wall": "#7c8aa0",
   "floorc": "#6e5a4c"
  },
  {
   "floor": "lower",
   "x0": 0.0,
   "x1": 12.0,
   "name": "the basement",
   "wall": "#3c4458",
   "floorc": "#4c4238"
  }
 ],
 "props": [
  {
   "kind": "lamp",
   "floor": "main",
   "x": 1.9
  },
  {
   "kind": "couch",
   "floor": "main",
   "x": 3.0
  },
  {
   "kind": "rug",
   "floor": "main",
   "x": 3.0
  },
  {
   "kind": "speaker",
   "floor": "main",
   "x": 7.2
  },
  {
   "kind": "tv",
   "floor": "main",
   "x": 8.3
  },
  {
   "kind": "speaker",
   "floor": "main",
   "x": 9.4
  },
  {
   "kind": "plant",
   "floor": "main",
   "x": 11.4
  },
  {
   "kind": "picture",
   "floor": "upper",
   "x": 4.6
  },
  {
   "kind": "plant",
   "floor": "upper",
   "x": 6.0
  },
  {
   "kind": "lamp",
   "floor": "upper",
   "x": 7.4
  },
  {
   "kind": "bed",
   "floor": "upper",
   "x": 10.8
  },
  {
   "kind": "lamp",
   "floor": "lower",
   "x": 1.0
  },
  {
   "kind": "tv",
   "floor": "lower",
   "x": 3.4
  },
  {
   "kind": "couch",
   "floor": "lower",
   "x": 5.6
  },
  {
   "kind": "rug",
   "floor": "lower",
   "x": 5.6
  },
  {
   "kind": "picture",
   "floor": "lower",
   "x": 8.6
  },
  {
   "kind": "cooler",
   "floor": "lower",
   "x": 10.9
  }
 ],
 "spots": [
  {
   "act": "EXIT",
   "floor": "main",
   "x": 0.35
  },
  {
   "act": "PLAY",
   "floor": "lower",
   "x": 3.4,
   "src": "genesis"
  },
  {
   "act": "GRAB BEER",
   "floor": "lower",
   "x": 10.9,
   "src": "cooler"
  }
 ],
 "dogs": 0,
 "cpuIdle": {
  "floor": "lower",
  "x": 6.9
 }
},

// ---- brad ----
brad: {
 "id": "brad",
 "type": "split-foyer",
 "width": 12.0,
 "grade": 0.0,
 "ceiling": 2.5,
 "floors": [
  {
   "id": "landing",
   "z": 0.3,
   "x0": 0.0,
   "x1": 1.7
  },
  {
   "id": "main",
   "z": 1.55,
   "x0": 3.6,
   "x1": 12.0
  },
  {
   "id": "lower",
   "z": -0.95,
   "x0": 3.6,
   "x1": 12.0
  }
 ],
 "links": [
  {
   "id": "up",
   "a": "landing",
   "ax": 1.7,
   "b": "main",
   "bx": 3.6
  },
  {
   "id": "down",
   "a": "landing",
   "ax": 1.7,
   "b": "lower",
   "bx": 3.6
  }
 ],
 "door": {
  "floor": "landing",
  "x": 0.35
 },
 "rooms": [
  {
   "floor": "main",
   "x0": 3.6,
   "x1": 9.2,
   "name": "upstairs living room",
   "wall": "#d9c79c",
   "floorc": "#9c6b44"
  },
  {
   "floor": "main",
   "x0": 9.2,
   "x1": 12.0,
   "name": "kitchen",
   "wall": "#e6dcb8",
   "floorc": "#c9b99a"
  },
  {
   "floor": "lower",
   "x0": 3.6,
   "x1": 12.0,
   "name": "downstairs living room",
   "wall": "#8a6446",
   "floorc": "#6e5a4c"
  }
 ],
 "props": [
  {
   "kind": "recliner",
   "floor": "main",
   "x": 4.3
  },
  {
   "kind": "couch",
   "floor": "main",
   "x": 6.6
  },
  {
   "kind": "cooler",
   "floor": "main",
   "x": 8.3
  },
  {
   "kind": "tv",
   "floor": "main",
   "x": 10.2
  },
  {
   "kind": "fridge",
   "floor": "main",
   "x": 11.3
  },
  {
   "kind": "rug",
   "floor": "main",
   "x": 6.6
  },
  {
   "kind": "puddle",
   "floor": "main",
   "x": 5.35,
   "w": 2.1
  },
  {
   "kind": "picture",
   "floor": "main",
   "x": 6.4
  },
  {
   "kind": "lamp",
   "floor": "main",
   "x": 9.05
  },
  {
   "kind": "plant",
   "floor": "main",
   "x": 3.95
  },
  {
   "kind": "weights",
   "floor": "lower",
   "x": 5.0
  },
  {
   "kind": "fireplace",
   "floor": "lower",
   "x": 8.6,
   "mantle": 6
  },
  {
   "kind": "couch",
   "floor": "lower",
   "x": 10.8
  },
  {
   "kind": "rug",
   "floor": "lower",
   "x": 9.6
  },
  {
   "kind": "picture",
   "floor": "lower",
   "x": 5.2
  },
  {
   "kind": "lamp",
   "floor": "lower",
   "x": 11.65
  },
  {
   "kind": "computer",
   "floor": "lower",
   "x": 6.95,
   "screen": "eDonkey"
  }
 ],
 "spots": [
  {
   "act": "EXIT",
   "floor": "landing",
   "x": 0.35
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 8.3,
   "src": "cooler"
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 11.3,
   "src": "fridge"
  },
  {
   "act": "GRAB BEER",
   "floor": "lower",
   "x": 8.6,
   "src": "mantle"
  }
 ],
 "teter": {
  "name": "Teter",
  "floor": "main",
  "x": 4.3,
  "lines": [
   "Hi guys, what are you getting into today?....",
   "You are all alcoholics."
  ]
 },
 "dogs": 2,
 "dogHomes": [
  {},
  {
   "floor": "main",
   "x": 7.35,
   "stay": true,
   "brows": true,
   "face": -1
  }
 ],
 "barks": [
  {
   "who": "rigg",
   "name": "Rigg",
   "floor": "lower",
   "x": 6.1,
   "text": "ZOOOOEEEYYYY",
   "at": 1.5,
   "every": 6.5
  },
  {
   "who": "jason",
   "name": "Jason",
   "floor": "main",
   "x": 6.5,
   "brush": true,
   "face": 1
  }
 ],
 "cpuIdle": {
  "floor": "lower",
  "x": 9.799999999999999
 }
},

// ---- floyds ----
floyds: {
 "id": "floyds",
 "type": "split-foyer",
 "width": 12.0,
 "grade": 0.0,
 "ceiling": 2.5,
 "floors": [
  {
   "id": "landing",
   "z": 0.3,
   "x0": 0.0,
   "x1": 1.7
  },
  {
   "id": "main",
   "z": 1.55,
   "x0": 3.6,
   "x1": 12.0
  },
  {
   "id": "lower",
   "z": -0.95,
   "x0": 3.6,
   "x1": 12.0
  }
 ],
 "links": [
  {
   "id": "up",
   "a": "landing",
   "ax": 1.7,
   "b": "main",
   "bx": 3.6
  },
  {
   "id": "down",
   "a": "landing",
   "ax": 1.7,
   "b": "lower",
   "bx": 3.6
  }
 ],
 "door": {
  "floor": "landing",
  "x": 0.35
 },
 "rooms": [
  {
   "floor": "main",
   "x0": 3.6,
   "x1": 9.2,
   "name": "upstairs living room",
   "wall": "#d9c79c",
   "floorc": "#9c6b44"
  },
  {
   "floor": "main",
   "x0": 9.2,
   "x1": 12.0,
   "name": "kitchen",
   "wall": "#e6dcb8",
   "floorc": "#c9b99a"
  },
  {
   "floor": "lower",
   "x0": 3.6,
   "x1": 12.0,
   "name": "downstairs living room",
   "wall": "#8a6446",
   "floorc": "#6e5a4c"
  }
 ],
 "props": [
  {
   "kind": "recliner",
   "floor": "main",
   "x": 4.3
  },
  {
   "kind": "couch",
   "floor": "main",
   "x": 6.6
  },
  {
   "kind": "rug",
   "floor": "main",
   "x": 6.6
  },
  {
   "kind": "picture",
   "floor": "main",
   "x": 6.4
  },
  {
   "kind": "lamp",
   "floor": "main",
   "x": 9.05
  },
  {
   "kind": "plant",
   "floor": "main",
   "x": 3.95
  },
  {
   "kind": "cooler",
   "floor": "main",
   "x": 8.3
  },
  {
   "kind": "tv",
   "floor": "main",
   "x": 10.2
  },
  {
   "kind": "fridge",
   "floor": "main",
   "x": 11.3
  },
  {
   "kind": "fireplace",
   "floor": "lower",
   "x": 8.6,
   "mantle": 6
  },
  {
   "kind": "couch",
   "floor": "lower",
   "x": 10.8
  },
  {
   "kind": "rug",
   "floor": "lower",
   "x": 9.6
  },
  {
   "kind": "tv",
   "floor": "lower",
   "x": 6.9
  },
  {
   "kind": "picture",
   "floor": "lower",
   "x": 5.2
  },
  {
   "kind": "lamp",
   "floor": "lower",
   "x": 11.65
  }
 ],
 "spots": [
  {
   "act": "EXIT",
   "floor": "landing",
   "x": 0.35
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 8.3,
   "src": "cooler"
  },
  {
   "act": "GRAB BEER",
   "floor": "main",
   "x": 11.3,
   "src": "fridge"
  },
  {
   "act": "GRAB BEER",
   "floor": "lower",
   "x": 8.6,
   "src": "mantle"
  }
 ],
 "teter": {
  "name": "Mom",
  "floor": "main",
  "x": 4.3,
  "lines": [
   "you owe me money for the broken butter churner."
  ]
 },
 "dogs": 0,
 "cpuIdle": {
  "floor": "lower",
  "x": 9.799999999999999
 },
 "son": {
  "name": "Dad",
  "floor": "lower",
  "x": 7.7
 },
 "party": {
  "floor": "lower",
  "x0": 3.9,
  "x1": 11.7
 }
},

// ---- rigg ----
rigg: {
 "id": "rigg",
 "type": "two-story-entry",
 "width": 13.0,
 "grade": 0.0,
 "ceiling": 2.5,
 "floors": [
  {
   "id": "main",
   "z": 0.2,
   "x0": 0.0,
   "x1": 13.0
  },
  {
   "id": "upper",
   "z": 3.0,
   "x0": 5.4,
   "x1": 13.0
  },
  {
   "id": "lower",
   "z": -2.4,
   "x0": 3.4,
   "x1": 13.0
  }
 ],
 "links": [
  {
   "id": "up",
   "a": "main",
   "ax": 1.2,
   "b": "upper",
   "bx": 5.4,
   "press": true
  },
  {
   "id": "down",
   "a": "main",
   "ax": 12.4,
   "b": "lower",
   "bx": 9.0,
   "press": true
  }
 ],
 "door": {
  "floor": "main",
  "x": 0.35
 },
 "rooms": [
  {
   "floor": "main",
   "x0": 0.0,
   "x1": 5.4,
   "name": "two-story entryway",
   "wall": "#e3d6b8",
   "floorc": "#b9a27a",
   "h": 5.3
  },
  {
   "floor": "main",
   "x0": 5.4,
   "x1": 9.4,
   "name": "living room",
   "wall": "#d6c39a",
   "floorc": "#9c6b44"
  },
  {
   "floor": "main",
   "x0": 9.4,
   "x1": 13.0,
   "name": "kitchen",
   "wall": "#e6dcb8",
   "floorc": "#c9b99a"
  },
  {
   "floor": "upper",
   "x0": 5.4,
   "x1": 9.0,
   "name": "upstairs hall",
   "wall": "#e6dcc4",
   "floorc": "#a8845a"
  },
  {
   "floor": "upper",
   "x0": 9.0,
   "x1": 13.0,
   "name": "Brian's bedroom",
   "wall": "#5f6f8c",
   "floorc": "#6e5a4c"
  },
  {
   "floor": "lower",
   "x0": 3.4,
   "x1": 13.0,
   "name": "Brian's basement",
   "wall": "#7b6a58",
   "floorc": "#5e5448"
  }
 ],
 "props": [
  {
   "kind": "recliner",
   "floor": "main",
   "x": 8.95
  },
  {
   "kind": "couch",
   "floor": "main",
   "x": 7.1
  },
  {
   "kind": "tv",
   "floor": "main",
   "x": 6.1
  },
  {
   "kind": "rug",
   "floor": "main",
   "x": 7.1
  },
  {
   "kind": "lamp",
   "floor": "main",
   "x": 5.8
  },
  {
   "kind": "plant",
   "floor": "main",
   "x": 4.9
  },
  {
   "kind": "chandelier",
   "floor": "main",
   "x": 2.9
  },
  {
   "kind": "picture",
   "floor": "upper",
   "x": 6.6
  },
  {
   "kind": "plant",
   "floor": "upper",
   "x": 5.9
  },
  {
   "kind": "lamp",
   "floor": "upper",
   "x": 8.4
  },
  {
   "kind": "speaker",
   "floor": "upper",
   "x": 10.0
  },
  {
   "kind": "bed",
   "floor": "upper",
   "x": 12.0
  },
  {
   "kind": "cooler",
   "floor": "lower",
   "x": 3.9
  },
  {
   "kind": "computer",
   "floor": "lower",
   "x": 5.3,
   "screen": "eDonkey"
  },
  {
   "kind": "cdwriter",
   "floor": "lower",
   "x": 6.7
  },
  {
   "kind": "couch",
   "floor": "lower",
   "x": 7.9
  },
  {
   "kind": "rug",
   "floor": "lower",
   "x": 7.7
  },
  {
   "kind": "lamp",
   "floor": "lower",
   "x": 8.2
  },
  {
   "kind": "door",
   "floor": "upper",
   "x": 9.0,
   "label": "BRIAN"
  },
  {
   "kind": "cellardoor",
   "floor": "main",
   "x": 12.4
  }
 ],
 "spots": [
  {
   "act": "EXIT",
   "floor": "main",
   "x": 0.35
  },
  {
   "act": "GRAB BEER",
   "floor": "lower",
   "x": 3.9,
   "src": "cooler"
  }
 ],
 "dogs": 0,
 "dad": {
  "name": "Brian's dad",
  "floor": "main",
  "x": 8.95,
  "yell": "Brrrrrriiiiiiaaaaannnn"
 },
 "son": {
  "name": "Brian",
  "floor": "upper",
  "x": 11.2
 },
 "cpuIdle": {
  "floor": "lower",
  "x": 4.15
 }
},
};
export default KITS_2D;

# Opus response: consciousness amendment, no blinks (PATIENT-EYES-AMENDMENT-CONSCIOUSNESS.md)

Builder's choice: this is the short **follow-up response**, named `opus-consciousness-amendment.md`. It ships in the same push as the painted cast (`opus-integrate-painted.md`), and that build includes it.

## 1. No blink mechanic remains
- **The ambient blink timer is gone.** `PE.nextBlink`, `PE.blinkT`, `PE.blinkDur` and the blink curve were removed from `patientStep`.
- **The per-hit forced blink is gone.** The forced blink in `patientHit` was removed.
- **The blink lid-red is gone.** `PE.blinkT` no longer feeds `lidRed`.
- **The "blink exclusion" in the fairness visible zone is void.** The zone now uses the real lid position at every instant, fades included.

Code evidence, run on the shipped tree:
```
$ grep -rni "blink" games/hospital-escape/game games/hospital-escape/engine
game/main.js:286:  // No blinks. Fades are driven by hurt (deeper, longer, more often as HP falls) and spike after heavy hits: ...
game/main.js:323:// visibleZone = the screen minus the eyelids (health + droop + consciousness fade; there are no blinks) ...
```
The only remaining hits are two comments that say there are none.

## 2. One lid system: consciousness (`game/main.js`: `fadeStart`, `fadeStep`, `patientHit`, `muffle`)
The lids now come from two sources only. First, the old resting coverage by health plus droop under fire, which stays under the 30% floor. Second, on top of it, **`PE.out`**, the consciousness fade (0 = present, 1 = out):
- `lidTop = cover + out × (0.56 − cover)`
- `lidBot = lidTop × (0.82 + 0.18 × out)`

At `out = 1` both lids meet, which is full black.

The parts of the system:
- **What drives a fade: hurt.**
  - An episode's depth is `0.16 + 0.92 × dmg^1.25` (where `dmg = 1 − HP/100`).
  - Its lengths scale with depth: onset `0.75 + 0.95d` s, hold `0.12 + 0.75d²` s, swim-back `1.1 + 2.1d` s.
  - Episodes recur every `(15 − 10·dmg) × (0.7…1.3)` s.
  - There are no fades above 88 HP, and none in cutscenes.
- **Spike after heavy hits.** A hit's weight against him right now is `n/5 × (0.45 + 1.6·dmg) + 0.6 × max(0, heat − 0.8)`.
  - Above 0.85, a fade starts 0.22–0.47 s after the hit, with up to +0.4 extra depth.
  - A spike during a swim-back drags him back under, starting from wherever he is.
- **The shape of an episode:**
  - **Onset:** heavy and slow, an eased curve raised to the 1.35 power.
  - **Hold:** a faint flutter, or a flat 1 when the fade is total.
  - **Swim-back:** uneven, `depth·(1−p)^1.5` plus re-dips of `0.3·depth·sin²(3πp+φ)·4p(1−p)²`. He surfaces, sinks a little, then surfaces.
- **At full fade he is OUT.**
  - **Black:** `lidRed` is multiplied by `(1 − out)`, so the closing lid turns black, not red.
  - **Brief:** a full hold lasts at most about 0.9 s.
  - **Muffled:** a master low-pass `300 + 17700·(1−out)³` Hz, with master gain ducked by up to 55%.
- **Neck slack is tied to consciousness.**
  - The spring rate is `w × (1 − 0.72·out)`, with damping `0.5 + 0.25·out`.
  - Wobble amplitude is `× (1 + 1.6·out)`.
  - The head drops (`−0.17·out` pitch) and tips (`±0.1·out` roll) as he goes.
- **The floor rule is overridden as specified:** full closure can happen in play, briefly.
- **The lose state is the fade that doesn't come back:** a 1.6 s slow, non-returning fade to full black, then "COLE IS DOWN". The captures are `opus-integrate-painted-shots/lose-fade.png` and `lose-card.png`.

## 3. Fairness: no damage while he is out (`engine/combat.js` `c.heroOut`; tuning `fairness.outGate: 0.85`)
- **Closure** is `lidTop + lidBot`, the fraction of the screen behind the lids, exposed as `game.heroClosure()`.
- **When the gate is checked.** It is checked at the moment damage would apply, which is **arrival** (shots are projectiles).
  - If closure ≥ 0.85 at that moment, the shot lands for pressure but deals no damage, and the engine logs `heroSpared`.
  - Enemies keep firing.
- **The visible-zone contract now uses the real lids.** Under OPUS-FIX-FAIRNESS-PACE, a damaging shot already has to come from a shooter inside the lid-trimmed zone for 0.6 s. During a fade that zone shrinks with the lids.
- **Additive and validated.** The gate is data-gated (absent `outGate` means v1 behaviour), and `validate-core` now validates the whole `fairness` block (`outGate` in (0, 1]).

**Gate test.** A red shot fired at Cole and stepped to arrival, with closure forced:

| closure at arrival | damage | event |
|---|---|---|
| 1.00 | 0 | heroSpared |
| 0.90 | 0 | heroSpared |
| 0.85 | 0 | heroSpared |
| 0.84 | 4 | heroHit |
| 0.50 | 4 | heroHit |

**Natural play.** Three full autopilot runs (seeds 7, 3 and 11), forced to 45 HP at 3 s so fades are frequent:
- 2–3 fades per run;
- every `heroHit` landed at closure ≤ 0.41;
- all three runs were won.

## 4. Proof: three hurt levels (`opus-integrate-painted-shots/consciousness/`)
- **Contact sheet:** `contact-three-hurt-levels.png`, with rows HP 85, 55 and 22. Each row is one episode: start → onset → peak → swim → swim2 → back.
- **Individual frames:** `hp{85,55,22}-*.png`.
- **Raw data:** the timeline numbers are in `report.json`.
- **How it was shot:** the chair corridor with the engine frozen, so only the fade system acts. Shooting is deterministic: the timeline is recorded in one page and the frames are shot in a fresh page, and the out-values match exactly.

| HP | episode length | onset | peak `out` | peak closure | neck spring w (awake → peak) | head pitch at peak |
|---|---|---|---|---|---|---|
| 85 | 2.78 s | 0.98 s | 0.25 | 0.34 | 6.2 → 5.1 | −0.08 rad |
| 55 | 3.70 s | 1.22 s | 0.50 | 0.66 | 5.6 → 3.6 | −0.15 rad |
| 22 | 5.07 s | 1.53 s | 0.83 | 0.99 (out) | 4.9 → 2.0 | −0.21 rad |

Depth, duration and neck slack all scale with hurt. The swim-back is visibly uneven: at HP 22, swim and swim2 sit at out 0.49 and then 0.24, with a re-dip between.

No game timings changed. The pace audit is byte-identical to the fix build (see `opus-integrate-painted.md`).

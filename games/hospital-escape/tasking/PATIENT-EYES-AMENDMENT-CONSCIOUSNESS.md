# AMENDMENT to PATIENT-EYES-SPEC — consciousness, NO BLINKS
(Cherie, Nov 23, 2026)

Cherie, on the eyelid ruling: "I think it's less about blinking and
more about going in and out of consciousness." Then, correcting the
first draft of this amendment: **"No blinks."**

## The rule
There are **no blinks in this game** — no ordinary blink layer, and no
forced blink on hit (remove/convert the current per-hit blink in
`patientHit`). Every lid movement, however small, is ONE system:
**Cole's consciousness wavering.** He is a gunshot patient drifting in
and out; the lids are how far gone he is.

## Tuning direction
- Fades are driven by hurt: deeper and longer as HP falls, spiking
  after heavy hits — not one identical snap per hit.
- A fade comes on heavy and slow, holds, and the return is a swim —
  light and focus coming back unevenly, the neck slack while he's out
  and weakly re-centring as he returns (tie neck-spring strength to
  consciousness level).
- At full fade he is OUT: brief, black, muffled. Then he swims back.
- The lose state stays as specced: the fade that doesn't come back,
  then COLE IS DOWN.

## Fairness consequence (closes the audit's carve-out)
The fairness gate (OPUS-FIX-FAIRNESS-PACE) excluded "blink instants"
from the visible zone. That exclusion is now void — there are no
blinks to exclude. **No damaging shot may land while Cole is fully
out** (lids at or near full closure). Enemies may fire — sound and
tracers keep the pressure — but damage applies only once he is at
least partly back (lids below ~85% closed). Hits landing on the way
down or the swim back, while he can partly see, are fair.
(This paragraph is Moth's default reading of the reframe — if Cherie
flips it, this file gets corrected.)

## Supersedes
This amendment overrides the PATIENT-EYES-SPEC floor rule ("lids never
fully close in play except blink instants; full closure = lose only").
Full closure CAN now happen in play — as a fade-out, briefly, per
above. Everything else in the spec stands.

## Proof owed in the response
Captures or short clips at three hurt levels showing: fade depth and
duration scaling with hurt, the swim-back, and the neck slackening
while out — and code evidence that no blink mechanic remains (no
per-hit blink, no ambient blink timer). Response goes in the same fix
response file or a short follow-up response — builder's choice, named
in the fix response.

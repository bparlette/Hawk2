# T4-PERF — make the FULL T4 look cheaper without changing it (Neon)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — folder `games/hospital-escape/tasking/`
**Owner:** Neon. **Response:** `games/hospital-escape/tasking/responses/neon-t4-perf.md` (SHOW YOUR WORK).

## Owner ruling (Cherie, Nov 24, 20:31 ET)

Full T4 is the shipped look — it plays fine on her phone. The trim
switches (`?t4env=0`, `?t4k=4`, `?t4shadow=0`, `?t4maps=0`) are NOT
the answer: they buy speed by removing parts of the look.

Your task: find **performance enhancements that keep the full look
intact** — engineering wins, not feature cuts. Opus's measurements on
the CPU renderer put the halls at ~258 ms vs ~115 ms for the old look,
with the PMREM environment the biggest single chunk (~-21% when off).
That cost is the target; the look is not negotiable.

## Rules

- Before/after stills at the same viewpoints as the T4-FULL evidence
  must be visually indistinguishable — if a change alters the image,
  it is a trim, not an enhancement: don't ship it, or flag it clearly
  as an owner decision.
- Report frame cost per beat (same beats Opus measured: halls, visits,
  chase, train) before and after, with the method stated.
- Guardrails stay green (tests 24/24, data 201/0, fairness PASS).
- Queue: after GEAR-FIX.

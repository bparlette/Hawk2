# TASKING — Opus: foreground Cole must match the painted cast
Hospital Escape · base = Hawk2 main at fd14ffe (your integrated build) · Cherie approved Nov 23

Your own delivery flagged it: during play, the foreground still shows
the OLD procedural 3D Cole — back of his head and shoulders — in a
visibly different style from the painted cast around him. Fix that.

## The job
- The foreground Cole presence (back of head/shoulders, any beat where
  it appears) must read as the SAME world as the painted cast. Your
  choice of method, per your own note that both are quick:
  (a) a painted foreground treatment in the cast's style, or
  (b) hiding the foreground figure where a painted treatment can't
  match.
- Cherie's framing ruling stands (tasking/FRAMING-RULING.md): minimal
  Cole presence is fine — the bed/chair/ambulance must read instantly;
  nobody is asking for MORE foreground Cole, just no style clash.
- Keep the patient-eyes camera, neck and consciousness behaviour
  exactly as delivered — this is a foreground-element change only.

## Hard constraints (no regressions)
- Fairness contract: re-run — 0 violations, negative control still
  catches 6/6.
- Pace: ~209 s total / first target 5.7 s / watch-only ~122–126 s.
- 24/24 engine tests; autopilot wins 3 seeds; lose path intact.
- 0 page errors on the live Pages build (textures load without the
  file-access flag).

## Response
`tasking/responses/opus-foreground-cole.md` + captures in
`tasking/responses/opus-foreground-cole-shots/`: before/after pairs at
390×844 for every beat where the foreground Cole appears, judged at
phone size — no visible style clash between the foreground and the
painted cast. State which method you used per beat and why.

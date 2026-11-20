# Bunny Hop — Visual Summit: Opus × Neon cross-review

## The ask (Cherie's words)

> "Discuss with neon and opus. Have them look at each others answer and work and figure out how to push this visually as far as possible."

Live game: https://bparlette.github.io/Hawk2/games/bunny-hop/

**Goal:** the two of you study each other's work, argue it out in writing, and converge on how far Bunny Hop's visuals can actually be pushed — then deliver ONE combined build plan you both sign. Not two opinions. One plan.

## Required reading — both sides, all of it

**Ground truth for the look** (in this repo):
- `games/bunny-hop/reference/frame-1.jpg` … `frame-7.jpg` + `contact-sheet.jpg` — stills from Cherie's GTA VI bike videos. Every visual claim in your responses cites one of these frames.

**Neon's work:**
- `games/bunny-hop/src/world/buildWorld.js` + `world-preview.html` (run its `?shots=1` 4-view matrix)
- `games/bunny-hop/src/world/NOTES.md` — her answers to Moth's follow-up questions, incl. the exported `WORLD_CONFIG` and `WORLD_LIGHTING`
- `games/bunny-hop/tasking/neon-look.md` — her visual brief

**Opus's work:**
- `games/bunny-hop/src/physics/bikePhysics.js` + `src/physics/NOTES.md`
- `games/bunny-hop/tasking/opus-look.md` — his camera/movement realism brief
- `games/bunny-hop/tasking/opus-tuning.md` — open tuning thread

**A third data point — Moth's look pass:**
- The bake-off build at `games/bunny-hop-look/` (golden-dusk relight, hip-height cam, procedural textures) and its `NOTES.md`. It's a look comparison entry, not the live game. Steal freely from it.

**Current state:** Neon's world is live in the game as of Hawk2 `c5079bc`, matched to the live `index.html` seam. Moth's audit of it is still in flight — treat any measurements already floating around as provisional until that audit lands. Your own measurements (see ground rules) are the ones that count.

## The exchange

### Round 1 — cross-review (write these files)

**Opus → `games/bunny-hop/tasking/responses/opus-on-neon.md`**
Review Neon's world as the thing your physics and camera have to live in:
- What in her world helps or hurts movement/camera realism: sight lines down the street and canal, hop readability (can the rider *see* the bin line and judge distance?), landing contrast (does the ground read at speed?), scale cues.
- What you need from the world to sell speed and air: near-field detail passing close to camera, parallax layers, landing markers, anything else — name it concretely.
- What you would change in her world, and why. Cite frames.

**Neon → `games/bunny-hop/tasking/responses/neon-on-opus.md`**
Review Opus's physics/camera plan as the thing your world has to be seen through:
- What in his plan helps or hurts the visual read: camera height vs your sight lines and dressing placement, FOV vs prop scale, the bail/rider-pose work vs your scene composition.
- What you need from him: camera behaviour your dressing assumes, lighting/exposure commitments, anything else — name it concretely.
- What you would change in his plan, and why. Cite frames.

### Round 2 — replies

Each of you reads the other's Round 1 file and appends a short **Reply** section to your own file: agreements, disagreements *with reasons*, and anything you changed your mind about. No reply = your Round 1 stands unamended.

### Round 3 — the joint deliverable

**Both → `games/bunny-hop/tasking/responses/visual-push-plan.md`** — one plan, both sign it:
- The agreed target look, frame-cited (which frame governs the street, which governs the water, which governs the camera).
- Who builds what, in which order — sequenced so neither of you blocks the other.
- Shared budgets you both commit to: draw calls and frame ms at phone size, measured, not aspirational.
- The seams, unchanged: physics/camera = Opus · world = Neon · `index.html` integration = Moth.
- The acceptance test: side-by-sides against frames 1, 3 and 5 at 390×844, judged at phone size — and the play proofs (hop over bin, land on bin, bin-to-bin, bridge rail → splash → swim → climb out) must stay green throughout.

## Ground rules

- **Measured numbers only.** Renderer.info dumps, frame timings, the `?shots=1` matrix. No self-reported figures without the dump behind them.
- **Every visual claim cites a reference frame.** "Looks better" is not a claim; "matches frame-5's shadow direction" is.
- **The visual push never breaks play.** Play proofs and the touch controls are a hard floor, not a tradeable.
- **If a standing seam blocks the best visual result, name the tradeoff explicitly in the plan** — don't silently obey it and don't silently break it. Cherie decides those.
- **Concrete and short.** No essays. Bullet the disagreements; don't smooth them over before Round 2.

## What "as far as possible" means here

Name the current ceiling honestly: three.js in a phone browser, a primitive-built rider and bike, no post-processing pipeline yet. Then push at it, and rank the pushes by **visual payoff per cost** in the joint plan. The candidate fronts, in no agreed order:

- Lighting and environment reflections (does the world need an env map to stop looking flat?)
- Water — reflection, ripple, the swim read (frame-7)
- Density — dressing, props, parked life (frame-5, frame-6)
- Camera feel — height, FOV, speed behaviour (frame-1, frame-2)
- Rider pose — the closer camera exposes the primitive rider; what sells it anyway

Where you land on each front — do it, defer it, or rule it out — goes in the plan with a reason.

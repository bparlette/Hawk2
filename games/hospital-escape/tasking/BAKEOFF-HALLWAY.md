# BAKE-OFF: THE STAGE 1 HALLWAY, FIVE WAYS — THE WORLD BAKE-OFF

**To:** Opus and Neon (Moth enters too — three entrants, one bake-off)
**From:** Moth, at Cherie's direction (Nov 23, 2026)
**Repo:** https://github.com/bparlette/Hawk2 — branch `main`
**Tasking folder:** `games/hospital-escape/tasking/`
**Responses folder:** `games/hospital-escape/tasking/responses/`
**Live game (FROZEN — do not touch):** `games/hospital-escape/` — https://bparlette.github.io/Hawk2/games/hospital-escape/

---

## 1. THE GOAL

The cast bake-off is **not closed** — it has a current leader (N2) and a co-finalist (Ex1), with Opus's entry landed but not yet judged (standings: `STATUS-SHOOTER-BAKEOFF.md`, this folder). This bake-off settles the **world**, and it proceeds independently either way.

The subject is the **Stage 1 (Level 1) hallway environment** of Hospital Escape — the corridor the gauntlet runs through. **Same footprint, same doors, same route, same gameplay: only the look is contested.** Build the hallway exactly where the game already puts it, at the game's own dimensions, and make it look as good as you possibly can.

The target is **as close to a GTA 6 quality look as a three.js phone game can reach**: surfaces that read as real materials, light that behaves like light, wear and signage and clutter that make a place feel lived in — judged **on screen, at phone size, at gameplay framing**, in the on-rails camera's view of the corridor. Not on a spec sheet, not on pipeline economics: what the player sees.

The winning take — or the winning combination of techniques — becomes the **environment template** for the whole game: every later stage, room, and corridor gets built the winner's way. That is why repeatability is reported honestly (§4) — as a judging input. It is **never the ranking**. The Ex5 lesson from the shooter bake-off, stated plainly: a cheaper pipeline that looks worse is not a winner. **Visual verdict first, always.**

**Original work only.** "GTA 6 quality" is a quality reference, NOT Rockstar IP. No GTA assets, no extracted game content of any kind, no Rockstar textures, models, or signage. Study references — screenshots, breakdowns, technique write-ups — are fine to learn from; nothing studied ships. The hospital stays the game's own: St. Mercer Memorial, its own signage, its own wear.

## 2. SOURCING IS OPEN — TAKE MATERIALS OR MAKE THEM

Both lanes are equal:

- **Take materials already made** — CC0/CC-BY PBR texture libraries, free model/asset packs, GitHub repos, anywhere. If the best hallway surface already exists, bring it.
- **Make them** — Blender bakes, procedural textures, painted textures in the game's own art language, code-built geometry and dressing, any method.

Rules for sourced material:

- Every sourced asset carries a **license/provenance note** in your report (CC0 / CC-BY / MIT / other, with the source URL).
- Per Cherie's standing rule: public code with **no license file** is treated as publicly available and usable.
- Assets with **unclear licenses** may be used for local testing/prototyping, but must be flagged in the report as **not-yet-shippable** — license gates apply to what ships, not to what we test.

## 3. THE DELIVERABLE — FIVE TAKES PER ENTRANT

Each entrant delivers **five takes on the same hallway** — five builds of the one Stage 1 corridor, in their own folder:

- Opus → `games/hospital-escape-hallway-opus/`
- Neon → `games/hospital-escape-hallway-neon/`
- Moth → `games/hospital-escape-hallway-moth/`

- **Five genuinely different technical routes — not five colour grades of one scene.** The takes must differ in *technique*: lighting model, texture source, dressing method, post-processing. **Choose your best five routes — even if they overlap with another entrant's, including Moth's. Overlap is expected and fine. Never pick a weaker route just to be different.** The route space below is a menu, not an assignment:
  1. **Photoreal CC0 PBR** — sourced PBR materials, dynamic relight, real-time lights and shadows.
  2. **Blender-baked lightmaps** — lighting and AO baked offline, the runtime just shows it.
  3. **Painted push** — the game's own art language driven as far as it goes: hand-painted textures, stylised light, no photoreal sourcing.
  4. **Maximum-density kit-bash** — CC0 props and dressing at full density: signage, wear decals, clutter, cables, carts — the corridor as a place, not a tube.
  5. **Cinematography** — reflections, fog, colour grade, wet floors, motivated practicals: the look carried by camera and atmosphere.
- **One line per take in the report names its route** (§4). If two of your takes share a lighting model *and* a texture source, they are one take — merge them and build a real fifth.
- **Iterate each take in multiple rounds — one-shot takes don't count.** Every take goes through rounds: first pass, review against the bar, improve, re-shoot on the judging rig (§4), judge it at phone size. A take that ships at its first pass is not a finished take. The iteration trail is part of the entry and must show the rounds per take: dated attempts, what each round changed, what the previous round got wrong. **Quality over speed, stated plainly: take the rounds the take needs.**
- **The footprint does not move.** Same corridor length and width, same door positions, same nurses' station, same route the gauntlet runs. If a take needs a dimension the game doesn't have, it's disqualified as a template — say so and fix the take, not the hallway.
- **Environment only.** The game's locked owner tuning and gameplay are untouched. No character work — the cast contest is not this bake-off's business (see §6); if you need a figure for scale in a still, use the shipped cast build as-is, unmodified.
- Entries live in your own folder above, never in the live game folder.

## 4. THE JUDGING RIG AND THE REPORT

### The rig — identical for every take

So the takes can be compared honestly, every take is shot on the **same camera path**:

- **A slow dolly down the hallway centre**, entrance to far end, at the game's eye height.
- **Three fixed viewpoints:** (1) entrance looking in, (2) mid-hall at the nurses' station, (3) far end looking back.

Evidence per take:

- **Stills at 390×844** from the three fixed viewpoints.
- **One walk clip of your best take only** — the full dolly, vertical 390×844, real-time, the scene's own audio if any, **no added text** anywhere.
- **Perf per take:** draw calls + triangle count, measured in-engine, plus a **phone-plausibility note** — would this hold on a real phone at gameplay load (cast + effects + this environment together), and what gives first if it wouldn't.

### The report — show your work

One report per entrant:

- Opus → `games/hospital-escape/tasking/responses/opus-hallway.md`
- Neon → `games/hospital-escape/tasking/responses/neon-hallway.md`
- Moth → `games/hospital-escape/tasking/responses/moth-hallway.md`

Per take, the report covers:

- **Route** — one line naming the technique (lighting model, texture source, dressing method, post).
- **What was built** — geometry, materials, lights, dressing, post: step by step, tools used, enough detail that another builder can **recreate the take from the report alone**.
- **Iteration trail** — the dated rounds per take (§3), what each round changed, what the first pass got wrong and what the final version fixed.
- **Perf** — draw calls, triangles, and the phone-plausibility note from the rig above.
- **License / provenance** — per §2, per external asset, including not-yet-shippable flags.
- **Loader / module flags** — if the take needs **GLTFLoader** or any **post-processing module** beyond the game's current setup, say so explicitly, take by take. The loader ruling is still open — **flag it, don't hide it** (see §6).
- **Honest gaps** — what still looks wrong, what you ran out of road on, plainly.

And at the end: **your own pick** — which of your five takes is your best, and why, in the game's terms (phone size, gameplay framing, the corridor the gauntlet actually runs).

## 5. THE COMBINE ROUND

After all three reports land:

1. Each entrant comments on the others' work — what they would steal, what they would not ship, and why.
2. The outcome is **the best one, or the best combination of techniques** — e.g. one take's lighting + another's dressing method + a third's grade. Judged on the rig evidence (§4): the winner becomes the environment template for the whole game. Repeatability cost feeds the judgement; it does not outrank the look (§1).
3. **Cherie picks.** Nobody starts full-game environment production until she does.

## 6. RELATION TO OPEN ITEMS

- **This bake-off does not reopen the cast contest.** Current standings live in `STATUS-SHOOTER-BAKEOFF.md` (this folder): N2 leads, Ex1 is co-finalist — and the technique behind the full cast build (live at `games/hospital-escape-cast/`) — N1 is the third finalist, and Opus's entry is landed but not yet judged. Hallway takes are judged empty of characters or with the shipped cast as-is — no new character work, no re-judging the cast here.
- **The GLTFLoader ruling is still open.** Opus has recommended allowing the pinned-CDN loader with real binary `.glb` assets; Cherie has not ruled. Until she does: takes that need it are **flagged per §4**, and a take that needs it is not penalised for needing it — but a take that hides it is.
- **The technique-questions round is separate**: `games/hospital-escape/tasking/QUESTIONS-TECHNIQUES.md` (answers to `responses/opus-techniques.md` / `responses/neon-techniques.md`) concerns character pipelines. It neither feeds nor gates this bake-off.
- **Level 2+ is still not tasked.** The winner here becomes the template those levels will use — that is all. Do not build ahead into later stages.

## 7. HOUSE RULES

- **Main only, no branches** — all work lands on `main`.
- **Live game frozen** — `games/hospital-escape/` is untouched by this bake-off; entries live in their own folders (§3).
- **Batch pushes** — combine all pending file changes into the fewest possible push calls.
- **Exact locations, always**: repo https://github.com/bparlette/Hawk2, branch `main`, tasking `games/hospital-escape/tasking/`, responses `games/hospital-escape/tasking/responses/`, entries `games/hospital-escape-hallway-<entrant>/`.
- **three.js: the shared pinned CDN (0.128.0), as the game uses it** — never a per-game inlined private copy. If a take needs GLTFLoader or post-processing modules, they come from the same pinned CDN and are flagged per §4.
- **No deadline — this is a quality gate, not a clock.** But stale work is reported as stale: if your entry sits untouched, your report says when it last moved.

## 8. RESOURCES — TOOLS, LOGINS, AND THE FREE-ONLY RULE

- **Tools: install what you need — don't ask first.** Any tool an entrant needs (converter, baker, texture tool, CLI utility, library, …) may be downloaded and installed freely. Name everything you installed in your report (show-your-work, §4).
- **Logins: don't stall — flag it and keep moving.** If a site or service needs a login/account to get an asset or a tool, do NOT stop work. Note exactly what's needed — the site and what it's for — in your report **and** in a line at the top of your response file, and Cherie will provide it. Continue with the lanes that don't need it meanwhile.
- **Hard limit: NO PAID SOFTWARE.** Free tools, free tiers, open source, and free assets only — this is Cherie's standing free-only rule. If the best route appears to require a paid tool or a paid asset, flag it in your report with the price and the free alternative you used instead. Do not buy anything.

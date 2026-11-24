# BAKE-OFF: THE BEST SHOOTER ASSET — FIVE WALKING EXAMPLES

**To:** Opus and Neon (Moth enters too — three entrants, one bake-off)
**From:** Moth, at Cherie's direction (Nov 23, 2026)
**Repo:** https://github.com/bparlette/Hawk2 — branch `main`
**Tasking folder:** `games/hospital-escape/tasking/`
**Responses folder:** `games/hospital-escape/tasking/responses/`
**Live game (FROZEN — do not touch):** `games/hospital-escape/` — https://bparlette.github.io/Hawk2/games/hospital-escape/

---

## 1. THE GOAL

Produce the best walking shooter character asset achievable for Hospital Escape.

**This is a test of ONE character asset.** The test subject is the **plain-clothes gunman** — the character already built in samples C and CX. All five examples (§3) are five candidate builds of that same single character, differing by source and technique, so entries compare technique-for-technique on identical role, framing, and gauntlet context. The winning asset — or the winning combination of techniques — becomes the **template pipeline**, which is then **repeated for every other needed character (Maya, Cole, Hale, the teal-scrubs enemy) and asset**. It is NOT five different characters: do not spend effort art-directing five roles — depth on one character beats breadth across the cast.

The quality bar is **GTA 6-level fidelity and polish, expressed in this game's style**: an on-rails hospital shooter where the camera rides behind/above the action and enemies are seen at **5–15 m on a phone screen**. Judge everything at that framing — what reads at phone size, at gameplay distance, in motion, wins.

**Original characters only.** "GTA 6 quality" is a quality reference, NOT Rockstar IP. No GTA characters, no GTA clothing designs, no Rockstar assets of any kind. The cast stays the game's own: Cole Mercer, Maya Vance, Dr. Hale, the plain-clothes gunman, the teal-scrubs gunman (design specs in `games/hospital-escape/tasking/NEON-C-CAST-SPECS.md`).

This bake-off supersedes the A/B/C cast bake-off as the route to the final cast pipeline. The A (rigkit), B (image-to-3D), and C (stock CC0) samples already built are evidence on the table — techniques from any of them may be reused, extended, or abandoned.

## 2. SOURCING IS OPEN — TAKE ONE OR MAKE ONE

Both lanes are equal:

- **Take one already made** — from online, GitHub, a website, a forum, a stock library, anywhere. If the best walking shooter character already exists, bring it.
- **Make one** — rigkit, image-to-3D, hand-built, mocap-retargeted, any method.

Rules for sourced material:

- Every sourced asset carries a **license/provenance note** in your report (CC0 / CC-BY / MIT / other, with the source URL).
- Per Cherie's standing rule: public code with **no license file** is treated as publicly available and usable.
- Assets with **unclear licenses** may be used for local testing/prototyping, but must be flagged in the report as **not-yet-shippable** — license gates apply to what ships, not to what we test.

## 3. THE DELIVERABLE — FIVE WALKING EXAMPLES PER ENTRANT

Each entrant delivers **five candidate builds of the one test character — the plain-clothes gunman** — each shown **WALKING**.

- **Motion is the judging medium.** Each example is presented as a short capture/video of the character walking, or a live page where it walks — at gameplay framing and distance, readable at phone size. A still is not an entry.
- **Variety of source and technique is the point — applied to that one character.** Five different rigs/meshes, retargeting approaches, material/lighting treatments, or build methods for the same gunman — not five different characters, and not reskins of different roles. The bake-off compares techniques: rig source, walk-cycle source, material/lighting treatment, integration cost.
- **Repeatability is a judging criterion.** The winning technique must be one that can be repeated per character and asset across the cast. A brilliant one-off that cannot be re-run for a differently-shaped character (Maya's proportions, Cole seated, Hale's coat) loses to a slightly plainer technique that can — the winner becomes the template pipeline for the whole cast (§1).
- The walk must be honest: real locomotion at a stated speed, with your foot-slide handling visible (see report requirements). No turntable idles dressed up as walks.
- Entries live in your own sample folders (e.g. `games/hospital-escape-3d-sample-<entrant>-<n>/`), never in the live game folder.

## 4. THE REPORT — SHOW YOUR WORK

One report per entrant:

- Opus → `games/hospital-escape/tasking/responses/opus-shooter-asset.md`
- Neon → `games/hospital-escape/tasking/responses/neon-shooter-asset.md`
- Moth → `games/hospital-escape/tasking/responses/moth-shooter-asset.md`

Per example, the report covers:

- **Source or build method** — where the asset came from (URL) or exactly how it was made, tools used, step by step.
- **License / provenance** — as in §2, including not-yet-shippable flags.
- **Cost** — triangle count and draw calls per figure, measured in-engine where possible.
- **Walk cycle** — source (mocap / keyframed / clip library / procedural), the clip's true authored speed if known, and **how foot-slide was handled** (pacing from measured stride, root-motion, clamp — state the numbers; note the C-sample lesson: the Quaternius manifest overstated its clip speeds 1.7×/2.4× and only a foot-bone stride probe caught it).
- **Repeatability cost** — what repeating this example for a second, differently-shaped character would take, in time and effort: what carries over unchanged (rig, clips, shaders, tooling) and what has to be redone per character (mesh, weights, reskin, poses). This is a judging input, not a footnote (§3).
- **What worked, what failed** — plainly, including dead ends.

Standard: enough detail that another builder can **recreate each example from the report alone**.

## 5. THE COMBINE ROUND

After all three reports land:

1. Each entrant comments on the others' work — what they would steal, what they would not ship, and why.
2. The outcome is **the best one, or the best combination of techniques** — e.g. one entry's rig + another's walk cycle + a third's material/lighting treatment. Judged on the walking examples **and** on repeatability (§3/§4): the winner becomes the template pipeline, then repeated for every needed character and asset against the per-character design specs (§6).
3. **Cherie picks.** Nobody starts full-cast production until she does.

## 6. RELATION TO OPEN ITEMS

- **The C-verdict replies are still wanted**: `games/hospital-escape/tasking/responses/opus-c-verdict.md` and `neon-c-verdict.md` (per `games/hospital-escape/tasking/CREW-ASK-C-VERDICT.md`). They are **inputs to this bake-off, not replaced by it** — file them as planned; your verdict reasoning feeds your entries here.
- **Neon's per-character spec tasking stands**: `games/hospital-escape/tasking/NEON-C-CAST-SPECS.md` remains the design spec for the cast (views, hex palettes, mesh-vs-texture calls, pose targets) whichever technique wins this bake-off. If C loses, the specs are route-agnostic and still owed.

## 7. HOUSE RULES

- **Main only, no branches** — all work lands on `main`.
- **Live game frozen** — `games/hospital-escape/` is untouched by this bake-off; entries live in their own sample folders.
- **Batch pushes** — combine all pending file changes into the fewest possible push calls.
- **Exact locations, always**: repo https://github.com/bparlette/Hawk2, branch `main`, tasking `games/hospital-escape/tasking/`, responses `games/hospital-escape/tasking/responses/`.
- three.js: CDN or the one shared in-repo copy — never a per-game inlined copy.

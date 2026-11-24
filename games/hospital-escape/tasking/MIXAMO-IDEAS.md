Issued by Cherie via Moth on 2026-11-24 — proposals only; nothing gets built until she picks.

# MIXAMO — WHAT ELSE? Hospital Escape and beyond. Proposals only, build nothing.

Locations (exact):
- Repo: https://github.com/bparlette/Hawk2 — branch main
- What we already have: games/hospital-escape/mixamo/ — 48 clips, FBX Binary / 30 fps / Without Skin / root motion ON, encoded .fbx.gz.b64 (decode: base64 -d <name>.fbx.gz.b64 | gunzip). MANIFEST.md in that folder is the inventory.
- See them played: https://bparlette.github.io/Hawk2/games/hospital-escape/mixamo-viewer/
- Your cast-pass tasking: games/hospital-escape/tasking/CAST-PASS.md; your earlier Mixamo answers: games/hospital-escape/tasking/responses/

Context: the 48 clips cover the gunman, Cole, and Maya (incl. the wheelchair/bed pushing set). The game is an on-rails corridor shooter, three.js r128, phone-first — draw calls and tris are budgeted hard, and anything you propose has to survive retargeting onto our existing bodies (the VALID bodies stay; Y Bot is only the download anchor, nobody ships it).

The question: what ELSE in Mixamo's catalog would make this game better — or our future games and levels better? Think beyond the shooter: background life (patients, staff, waiting rooms), hit/death/reaction sets, enemy variety, cutscene and intro beats, civilians, other levels' dressing — and other projects entirely (the cast pipeline you're building is reusable; say where).

Method: actually browse the Mixamo catalog (mixamo.com) — do not propose from memory. For every idea give:
1. The exact Mixamo catalog name(s) of the clip(s) — verified to exist, like the product-ID check in the last round
2. What it improves, in one line — the player-visible difference
3. Where it lands (Hospital Escape beat/level, or which future use)
4. Effort: clips to download + retargeting difficulty on our bodies
5. Cost check: perf budget impact, extra loaders, anything that breaks our constraints

Rank your list by player-visible impact per unit of effort. Flag anything you're unsure exists rather than guessing a name. End with your single top pick and why.

Deliverable: games/hospital-escape/tasking/responses/opus-mixamo-ideas.md (Opus) or neon-mixamo-ideas.md (Neon), on main, batched push. Cherie picks from the two lists before anyone downloads or builds anything.

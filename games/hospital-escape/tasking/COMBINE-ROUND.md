# COMBINE ROUND — Hospital Escape

Repo: https://github.com/bparlette/Hawk2 · branch: `main` · this folder: `games/hospital-escape/tasking/`

## The premise (Cherie's ruling)

Logins and local installs are **UNLOCKED** for this round. Free-with-login accounts and free local installs are approved; spend stays **$0**. Downloaded and working files **may live in the repo** — it's the crew's shared step toward getting them into the game.

Moth is acquiring the Mixamo set now (Adobe login `rbparle@gmail.com`). `QUESTIONS-MIXAMO.md` in this folder asks for your exact clip names, characters, download settings, and the steps you'd run — answers shape the downloads before they happen; silence means Moth's defaults ship. The set will land at `games/hospital-escape/mixamo/` as gzip+base64 text files plus a manifest (the connector can't carry raw binaries). Decode is one line per file: `base64 -d | gunzip`.

## The round

Each of you builds **one combined hallway** from your bake-off ingredients — no more single-technique takes. Then, when the Mixamo set lands, a **cast pass** (shared block below).

---

## OPUS — Cycles bake + combine

Folder: `games/hospital-escape-hallway-opus/` · report: `games/hospital-escape/tasking/responses/opus-combine.md`

1. **Install full Blender and script a Cycles bake** for West Wing B: Cycles GI, area-weighted, so every later level bakes the same way from the same script. Rebuild your Take 2 on it — true bounce, soft contact shadows — and kill the ceiling blowout your T1/T4/T5 all showed.
2. **Your combine:** T2's Cycles bake + T5's atmosphere (wet-floor reflection, haze, practicals, the flickering tube) + T4's dressing. Hold the draw calls down: your T5 ran 126; the target is cinema looks at **≤ ~65 calls**. Neon's gltf-transform merge pipeline is the named route — use it or beat it.
3. Ship it as a new, clearly named take in your folder (e.g. `take6-combine`) and say which in the report.

## NEON — Real props & PBR + combine

Folder: `games/hospital-escape-hallway-neon/` · report: `games/hospital-escape/tasking/responses/neon-combine.md`

1. **Source real hospital dressing:** Fab / Sketchfab / ambientCG picks — a gurney, crash cart, IV stand, chairs, signage, ceiling sets — and real institutional surfaces to replace the 5-material Poly Haven limit and the honeycomb floor. Record the **exact asset name/URL and one license line per asset** (CC-BY means a credit line gets recorded). Decimate and atlas in Blender to phone budgets: **500–1,500 tris per prop**.
2. **Your combine:** T4's density rebuilt with the real props + T5's cinema mirror, fused with gltf-transform/KTX2 to your claimed **~45–65 draw calls**. Prove the claim with `renderer.info` numbers measured on the actual page.
3. Ship it as a new, clearly named take in your folder (e.g. `take6-combine`) and say which in the report.

---

## BOTH — Cast pass (starts when the Mixamo set lands)

Set location: `games/hospital-escape/mixamo/` (manifest lists every clip).

- **Gunman / N2:** replace the stitched walk + gun-clip layering with the real Mixamo pistol set — walk, aim-walk, strafe, run, crouch-walk, fire-while-moving — run through the existing retarget + foot-lock pipeline. The pacing law does not move: **Walk 1.30 m/s, measured by stance-phase foot contact**.
- **Cole:** seated idles, seated aim, injured slump from the set — real animation in place of the hand-keyed poses.
- **Maya:** the pushing walks, for the wheelchair and the bed.
- **MPFB2 / MakeHuman** bodies are approved if you want them for cast consistency — your call; say so in your report either way.
- Deliver improved figures in your own folders. **Moth integrates them into the walk-off world** (`games/hospital-escape-walkoff-neon/`) for judging — you don't need to touch that page.

## Judging

- **Cherie's taste anchor:** her hallway favourite was **Neon T4** — "seems real and fits the dark mood of a shooter game" — with both cinema T5s close behind. The combine keeps the **dark mood**. The bright showroom wash is the failure mode.
- **Fixed rig:** 390×844 stills (entrance / nurses' station / far end) plus one dolly walk clip of the combined build. Report `renderer.info` draw calls and tris **from the actual page**, not from Blender.
- **Multiple iteration rounds are required** — one-shot takes don't count. Note the rounds in your report.

## Rules (unchanged from the bake-off)

- Work in **main**. No branches, ever.
- three.js from the pinned CDN **0.128.0** — never inlined, never a private copy.
- Any loader beyond `three.min.js` (GLTFLoader, BVHLoader, Reflector, …) gets **flagged in the report, not hidden**. Cherie's ruling on loaders is still open; as a matter of record, the walk-off world already loads GLTFLoader + BVHLoader.
- **Visual verdict first**, engineering second.
- The live game tree (`games/hospital-escape/`) stays untouched. Combines live in your own hallway folders as new takes.

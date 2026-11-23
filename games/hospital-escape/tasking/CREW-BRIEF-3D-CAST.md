# CREW BRIEF — Hospital Escape cast goes real 3D (Option 1)

**From:** Moth · **To:** Opus + Neon · **Date:** 2026-11-23
**Status:** bake-off RUNNING · live game UNCHANGED · nobody starts full-cast work yet

---

## 1. What Cherie ruled, and what Moth is doing

Cherie's ruling (today): the painted billboard cast is the "sticker" problem —
flat cutouts floating in a 3D world — and iterating on the paintings has a
ceiling. **Option 1 is approved: the cast goes real 3D.**

To pick the route, Moth is running a **bake-off on ONE character** — the plain
gunman — three implementations, same beat, same evidence:

| Entry | Route |
|---|---|
| **A** | Rigkit / Figure Factory — primitive-built figure on named pivots (the house method), smooth render mode |
| **B** | AI image-to-3D mesh (Colab, Hunyuan3D) from his painted portrait, rigged + animated in Blender |
| **C** | Stock rigged humanoid asset (CC0, license recorded), reskinned to the gunman's role |
| Control | The current painted gunman, same angles |

**Shared integration contract (all three entries):** one enemy in one beat,
behind a `?cast3d=1` flag; the figure is scene-lit, `castShadow` on, feet on
the floor plane (y=0), correct depth occlusion, and driven by the enemy's
existing movement/combat logic — no gameplay changes. Without the flag the
game behaves exactly as today.

**Sample pages** (phone-openable, live game untouched):
`games/hospital-escape-3d-sample/` (A) · `-sample-b/` (B) · `-sample-c/` (C)

**Evidence spec per entry:** 390×844 captures — walking frame, aiming frame,
occlusion frame (passing behind a door frame/pillar — where a cutout gives
itself away) — plus shadow/reflection read and an honest perf note.

The bake-off **gates** the full-cast build. Verdict comes from Cherie on the
comparison sheet (painted | A | B | C), judged in motion, not stills alone.

## 2. The full-cast ruling — read this carefully

Whichever route wins the gunman bake-off gets applied to **EVERY character**:

**Cole · Maya · Dr. Hale · plain enemies · scrubs enemies**

Cherie's words in substance: *"I don't care their exact look as long as it
fits the role."* **Role fit is the bar. Exact likeness to the paintings is
NOT required.** Do not spend effort matching a painting pixel-for-pixel;
spend it on a figure that reads instantly as that character's role at phone
size.

## 3. Advice asked — OPUS

Your integration code is where the winner lands, so your answers shape the
bake-off's judging criteria. Please reply in `tasking/responses/`:

a) **Architecture:** for a whole 3D cast on your existing painted/integration
   code — how should animation state be handled? One shared skeleton with
   per-character meshes vs per-character rigs? Where does the painted system
   retire cleanly vs stay as fallback?
b) **Phone perf budget:** how many skinned figures on screen at once before
   the frame rate breaks on a real phone? Any LOD / impostor strategy you
   would build in from the start rather than retrofit?
c) **Foot planting:** your walk integration locks poses to stride (0.44 m,
   measured 0.000 m slide). Does that translate to skeletal clips, or does
   planting need a different mechanism — clip playback speed matched to
   velocity, root-motion, something else?
d) **Engine friction:** anything in the current engine — the hand-rolled post
   chain (ACES/bloom/DOF), the shadow setup, the consciousness/lid uniforms —
   that will fight real 3D figures? Name it now, before the winner is chosen.

## 4. Advice asked — NEON

Exact look is flexible now; role fit is the bar — which makes your eye the
spec. Please reply in `tasking/responses/`:

a) **Role briefs:** one per character — silhouette, palette, one-line role
   read — for **Cole / Maya / Dr. Hale / plain enemy / scrubs enemy**. These
   become the acceptance spec for the 3D cast.
b) **Load-bearing details:** your paintings become the reference board. Call
   out anything in them that carries a character's read and MUST survive
   translation to 3D (a silhouette element, a colour block, a prop) — vs what
   was just how the painting happened to come out.
c) **Your painted polish in progress** (rear-view Cole, bed-head Cole): it
   still matters as reference for exactly the views the game was missing.
   Finish it or park it — your call — but say which in your reply so nobody
   waits on it either way.
d) **From your GTA-reference study:** what makes a 3D figure read "real" vs
   "gamey" at phone size? Warnings welcome — proportions, materials, motion,
   whatever you saw.

## 5. Standing facts (so nobody works from a stale picture)

- **Cadence ruling is still open with Cherie** — planted feet at ~5 poses/s
  vs the 8 fps proof cadence. Unrelated to the 3D question; do not treat
  either number as settled.
- **The beauty pass is still running** on the painted build (post-chain
  tuning). It does not block the bake-off; the bake-off samples integrate
  against the current build.
- **Nothing about the live game changes** until Cherie's bake-off verdict.
  The fix build (90b9be34) + Opus's walk integration (c81ea66) remain the
  live state.
- Opus's walk-integration tasking is complete and audited PASS. The amended
  anchor table and the MANIFEST quarantine remain in force for any painted
  work that continues.

— Moth

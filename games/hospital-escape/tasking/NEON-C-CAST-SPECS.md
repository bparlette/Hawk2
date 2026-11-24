# TASKING — Neon: per-character design specs for a full cast on entry C's rig

**From:** Moth · **To:** Neon · **Date:** 2026-11-23
**At Cherie's direction.** Spec/asset prep only — the bake-off verdict (Opus + Neon
C verdicts, then Cherie's final pick) still decides whether C wins. Nothing here
starts a build, and the live game stays frozen.

---

## 1. Purpose

If C wins, every character is built on C's one shared skeleton — the Quaternius
"Casual Character" (CC0), 62 joints, 1.77 m base — with this clip library:
**Walk · Run · Idle_Neutral · Idle_Gun · Idle_Gun_Pointing · Gun_Shoot ·
HitRecieve · Death.** There are **no seated, wheelchair, bed, push, or lean
clips** in that library.

This tasking lists, per character, the exact plates and specs the build will
consume from you, so that if C gets the call, nothing about any character's
look, colours, or missing poses is improvised on the build side. You are the
design source; keyframing and modelling happen build-side from your targets.

## 2. Already delivered — DONE, thank you, not asked again

In `tasking/responses/neon-3d-cast-refs/`:

- ✅ `cole-bed-head.png` — Cole in bed from the head end (the bed-push view)
- ✅ `cole-wheelchair-back3q.png` — Cole seated, rear 3/4, open-back gown
- ✅ `cole-ambulance-braced-grounded.png` — Cole braced standing, ambulance bay
- ✅ `maya-aim-back.png` — Maya from behind in aim stance (ponytail, strap, pistol)
- ✅ Your role brief `tasking/responses/neon-3d-cast.md` — heights, palettes,
  silhouette hooks, and the civilian-vs-hostile rule are the baseline below.
  Where this tasking quotes your hexes, it is asking you to **confirm or
  correct them for 3D materials**, not to redo them.

Everything below is a **gap** relative to those deliveries.

## 3. What "a view" means here (all characters)

A clean model-sheet turnaround plate: **front · back · side**, full body,
neutral standing pose, flat even lighting, no scenery, drawn at the
character's stated height with a height ruler or stated scale bar in frame.
Beat framings (your four plates above) are pose/mood reference — the build
additionally needs the neutral turnaround to reskin and proportion the rig.
File naming: `<character>-<view>.png` (e.g. `cole-front.png`, `maya-side.png`,
`hale-back.png`, `enemy-plain-front.png`, `enemy-scrubs-side.png`).

---

## 4. Cole Mercer — 1.80 m, lean/battered (build priority #1)

**Views:** you have delivered three beat plates (bed head-end, wheelchair
rear 3/4, braced bay). **Owed:** `cole-front.png`, `cole-back.png`,
`cole-side.png` — neutral standing turnaround. The back view must show the
open-tie gown gap along the upper back (your own silhouette hook).

**Colour spec — confirm or correct for 3D (linear albedo, bloom discipline):**
gown `#90A8B4` / `#A9C8D8` · hair `#2B1D14` · blood gauze `#B02824` ·
striped blanket `#DEDFD8`. Add: skin tone hex, and roughness guidance for the
gown cloth vs the gauze (the dressing must not specular-glint under lamps).

**Silhouette hooks — mesh vs texture call needed from you on each:**
1. Curly dark hair mass — MESH or texture?
2. Open-back gown split — MESH (geometry gap) or texture?
3. Bloodstained left-flank dressing — texture expected; confirm.
4. Bare ankles/feet — rig default is shod; confirm barefoot is a texture/
   geometry delete build-side, no plate needed.

**Pose targets (stills you supply; build side keyframes the clips):**
- **Wheelchair seated** — slouched forward-aim, seated crown **≤ ~1.31 m**
  (your fairness cap: seated head/shoulder elevation must hold today's 0.73
  sightline envelope in RAIL_CHAIR and HOLDOUT). A side-profile still with
  the crown height marked is the single most valuable plate in this tasking.
- **Bed recline from head end** — `cole-bed-head.png` covers the framing;
  add one side-profile recline still if the head-end angle hides the torso
  pitch the clip needs.
- **Braced stand** — `cole-ambulance-braced-grounded.png` covers it (bare
  heels + left bracing palm planted). Mark DONE unless you want a side view.

**Civilian separation:** Cole is an unmasked patient in a pale gown — he must
never read as the scrubs enemy at a glance. State the 2–3 markers (gown
colour family, bare feet, no rig/mask) as build requirements in your spec doc.

## 5. Maya Vance — 1.68 m, athletic

**Views:** `maya-aim-back.png` delivered (back 3/4, aim). **Owed:**
`maya-front.png`, `maya-back.png` (neutral, strap visible), `maya-side.png`.

**Colour spec — confirm or correct:** jacket `#3F4649` · jeans `#1F2A44` ·
boots `#3B2A20` · hair `#15100D` · strap `#16181B`. Add: skin tone hex;
roughness for the jacket (cinch-waist utility cloth) vs denim.

**Silhouette hooks — mesh vs texture call needed:**
1. Mid-high ponytail — **MESH** (called: paint alone reads bald from behind).
   Confirm, and note the ponytail's anchor point/length in the spec doc.
2. Diagonal crossbody strap — **your call: MESH or TEXTURE.** It must break
   both front and back torso silhouettes (your brief); if texture can hold
   that read at phone size under DOF, say so, else it goes mesh.
3. Cinch-waist jacket hem at mid-hip — texture or geometry? Your call.

**Pose targets:**
- **Wheelchair-push pose** — hands on push handles, working lean, push stride
  (your brief: 1.00 m bed / 1.05 m chair bar grip). One side still + one rear
  still. The library has no push clip; this is the build's second-biggest
  keyframe job after Cole's sit.
- **On-foot aim** — covered by `maya-aim-back.png`. DONE.
- Optional if you judge it needed: push-and-fire one-handed lean, low crouch
  beside the chair (HOLDOUT) — target stills only if her painted versions
  won't translate.

**Civilian separation:** Maya is armed but friendly — dark civilian clothes,
no mask, no chest rig. State what keeps her from reading as the plain-clothes
enemy in a fast corridor pop (ponytail + strap + no beanie/rig is the current
answer — confirm or sharpen).

## 6. Dr. Hale — 1.78 m, upright slender senior

**Views:** none delivered yet. **Owed:** `hale-front.png`, `hale-back.png`,
`hale-side.png` — full set.

**Colour spec — confirm or correct:** coat `#CFCBBF` (**never pure white** —
cap diffuse albedo ≤ ~0.68 linear, roughness ~0.88, per your own bloom note;
confirm those numbers for the C rig's materials) · shirt `#5C7894` ·
slacks `#30343C` · hair `#9A9A98`. Add: skin tone hex; clipboard aluminium
(hex + metalness/roughness — it must read brushed metal, not chrome mirror).

**Silhouette hooks — mesh vs texture call needed:**
1. Knee-length unbuttoned coat skirt — MESH expected (it *is* his silhouette
   vs waist-cut jackets). Confirm.
2. Clipboard — **MESH prop** (bone-parented to the hand, like C's pistol).
   Confirm dimensions in the spec doc.
3. Lanyard ID + pocket pens — texture expected; your call.
4. Silver hair + round glasses — glasses MESH or texture? Your call.

**Pose targets:**
- **Clipboard-hold idle** — only if you judge his painted idle won't read in
  3D: one still, clipboard gripped, objecting posture. Also welcome: a
  hands-up empty-palms still (his other painted beat). Zero holsters, rigs,
  or dark headgear in any Hale plate — he is never a threat read.

**Civilian separation:** Hale is the "never shoot" anchor: unarmed, unmasked,
pale coat, empty hands or clipboard only. State it as a build requirement.

## 7. Enemy — Plain-Clothes — 1.78–1.84 m, stocky/broad

**Views:** none delivered yet. **Owed:** `enemy-plain-front.png`,
`enemy-plain-back.png`, `enemy-plain-side.png`. Broadest outline of the five
roles — the side view must carry the heavy bomber shoulders + beanie dome.

**Colour spec — confirm or correct:** bomber **`#733829`** (anchor hue — do
not drift olive/grey; it must hold against the `#486066` wainscot) ·
beanie `#1C1C1C` · chest rig `#1F2522` · trousers/boots `#22252A`. Add:
skin tone + beard hex; bomber roughness (weathered leather/cloth read).

**Silhouette hooks — mesh vs texture call needed:**
1. Beanie dome (no loose hair) — MESH or texture?
2. Chest rig / holster — MESH or texture? (C's stock greebles shimmer under
   DOF at phone DPR, per your own warning — call the minimum geometry that
   still reads "rigged.")
3. Beard — texture expected; confirm.

**Pose targets:**
- **Cover-peek lean** — the library has no lean clip and the bed-push gunmen
  fight from behind cover. One target still: lean-out-from-cover aim, so the
  build side can keyframe or fake the lean against a measured target.
- Walk/aim/shoot/hit/death are covered by the library. No other poses owed.

**Civilian separation:** beanie + rig + rust bomber together = threat. No
single marker may appear on any bystander. State as build requirement.

## 8. Enemy — Teal Scrubs — 1.78 m, lean tactical

**Views:** none delivered yet. **Owed:** `enemy-scrubs-front.png`,
`enemy-scrubs-back.png`, `enemy-scrubs-side.png`.

**Colour spec — confirm or correct:** scrubs + cap **`#316E82`** ·
mask **`#CFDCE2`** · rig/wraps `#181A1D`. Add: skin tone (visible at neck/
wrists only); scrubs cloth roughness; mask roughness (crisp PPE, no sheen).

**Silhouette hooks — mesh vs texture call needed:**
1. Surgical mask — **your call: MESH or TEXTURE.** It is threat marker #2 and
   must survive motion blur; if a flat texture loses the read, it goes mesh.
2. Scrub cap — MESH or texture?
3. Chest rig + forearm wraps — same minimum-geometry call as the plain
   enemy's rig.

**Pose targets:**
- **Cover-peek lean** — one target still, same reason as §7.
- Library covers the rest.

**Civilian separation (your rule, stated as a build requirement):** all three
markers together — (1) deep teal scrubs + cap `#316E82`, (2) pale mask
`#CFDCE2`, (3) matte-black rig + wraps `#181A1D` — or he is not the enemy.
Bystanders stay unmasked in pink scrubs `#E57FA0`, pale gowns `#A9C8D8`, or
grey-blue tunics `#7A8FA0`. **Masked + rigged = shoot; unmasked pink/grey =
spare** must stay instant through motion blur.

## 9. Deliverable format

- **Plates:** PNGs into `games/hospital-escape/tasking/responses/neon-3d-cast-refs/`,
  named `<character>-<view>.png` as listed per section above.
- **One spec doc:** `games/hospital-escape/tasking/responses/neon-c-cast-specs.md`
  carrying, per character: the confirmed/corrected hex table (with any
  roughness/metalness guidance), every mesh-vs-texture call from §§4–8, the
  pose-target notes, and the civilian-separation build requirements.
- **No game code changes.** Design deliverables only; the live game is frozen;
  work on **main only**, no branches.

## 10. Priority order

1. **Cole** — missing turnaround views + the seated-crown pose target first.
   He is the build's risk: if the sit can't be keyframed to your target,
   C's full-cast case weakens, and everyone should know early.
2. **Maya** — views + push pose.
3. **Hale** — full set + clipboard idle.
4. **Enemies** — views + cover-peek lean targets.

If the verdict comes back against C, this work is not wasted: the turnarounds
and pose targets are route-agnostic and feed whichever rig wins.

— Moth

# Realism reference analysis — the two X posts Cherie sent (Nov 23, 2026)

Purpose: Cherie's words were "we want the game as real as this" (Hospital Escape).
This file records what the referenced media **actually shows**, frame by frame,
so the target can be written into the spec from evidence, not from captions.

Retrieval: `browser.open` on x.com is domain-blocked; the videos were downloaded
with yt-dlp's Twitter extractor (`python3 -m yt_dlp`), best available formats.
All frames below were extracted with ffmpeg and viewed directly.

---

## Post 1 — @rewind02 (rewind), posted Nov 23, 2026

URL: https://x.com/rewind02/status/2124835573646995461
Engagement as retrieved: 1,728 views · 53 likes · 3 reposts · 10 comments.
The post carries **two different videos**:

### Caption (verbatim as delivered by the extractor — X truncated it at 300 chars)

> build a photoreal train station in blender + opus 5.5...  with almost no outside assets  rulebook and a review loop. here's the workflow:  - step 1: references: collect real platform photos for signs - step 2: claude code: write a claude.md rulebook: "no outside 3d models, no [t.co link — remainder not retrievable]

### Video 1 — `post.mp4` (35.7 s, 1280×720, 30 fps) — THE photoreal one

A Japanese elevated train station platform at golden hour (signage: platform 2
for Yokohama / Shin-Yokohama, platform 1 for Kawasaki / Shinagawa; LED departure
boards lit, showing 17:02 / 17:05). The video is a **making-of**: it opens on the
finished render — a train sweeping through the platform with strong directional
motion blur — cuts to a sunset view off the platform end, then deliberately pulls
the curtain back: flat grey **clay/greybox blockouts** of the whole surrounding
town (aerial views, only the trees coloured green) and of the untextured platform
itself, then returns to the finished sunset shot. The point of the post is that
the photoreal frame and the grey boxes are the same scene.

Evidence: `frames1/f01.png` (finished platform, train passing), `frames1/f02.png`
and `f06.png` (sunset), `frames1/f03.png`–`f05.png` (greybox), `frames1/native-opening.png`
(native 720p frame).

### Video 2 — `post2.mp4` (88.1 s, 1920×1080, 30 fps) — a different subject in the same post

Gameplay-style footage of a GTA-like open-world game set in the Philippines:
third-person city driving, waiting on a platform at "TAFT AVENUE STATION",
a binocular view of soldiers, jungle gunfight, underwater swimming, a night-time
barangay basketball court ("LIGA NG BARANGAY 2026"). It carries a full GTA-style
HUD throughout (circular minimap bottom-left; clock + peso balance ₱ top-right;
health/armour bars; ammo counter in the jungle scene). Its origin is **not
verified** — it reads as real-time game footage, and it is visibly a grade below
Video 1: clean, bright, stylised-realistic rather than photographic.

Evidence: `frames2/f01.png`–`f06.png`, `frames2/native-platform.png` (native 1080p driving).

**So "as real as this" has two tiers in the same post.** The properties below are
labelled [V1] (the station render — the one the caption is about) and [V2] (the
gameplay reel). For Hospital Escape, [V1] is the look target; [V2] is what that
tier of ambition looks like when it has to stay real-time and playable.

---

## Concrete realism properties (builder-targetable)

### Lighting model & contrast
- [V1] One dominant warm key light (low sun, late afternoon) + cool blue ambient
  fill from the sky. Long soft shadows rake across the platform tiles; the roof
  structure is in shade but never crushes to black — shadow detail survives
  everywhere. Highlights on metal edges and the LED boards sit well above the
  mid-tones without clipping.
- [V1] Emissive sources are real light sources in the scene: the linear ceiling
  lights and the green/red LED departure boards glow and tint their surroundings.
- [V2] High-noon, high-key daylight: hard short shadows, bright sky, contrast
  carried by colour (red car, green bus stripe) more than by light/shadow.
- Target: a single motivated key light per scene + ambient bounce fill; no
  unlit-looking surfaces; emissives that actually illuminate.

### Colour grade
- [V1] Warm/cool split: amber-gold sun side vs teal-blue shadow side, slightly
  desaturated, filmic — nothing is at full saturation, whites are warm, blacks
  are lifted a touch. The sunset frames push this further (peach sky, pink-grey
  clouds).
- [V2] Saturated, punchy, video-game grade: deep blue sky, vivid primaries on
  vehicles/signage.
- Target: [V1]'s restrained split-tone grade, not [V2]'s saturation.

### Materials & surface detail
- [V1] Every surface has a texture story: individual platform tiles with grout
  lines and tonal variation, yellow tactile paving strips, weathered concrete
  pillar with a two-tone paint band and grime at the base, red/white hazard
  chevrons, corrugated metal fencing, ballast stones between the rails, glass
  and printed signage with legible real-world text (Japanese + English). Wear
  is everywhere and nothing is a flat colour.
- [V1] Reflections are environmental and muted: the passing train's side is a
  brushed-metal blur of the platform; windows mirror the sky.
- [V2] Materials are simpler and cleaner — flat-shaded building glass, smooth
  car paint with a single specular streak, asphalt with painted lines but little
  wear. Reads "game", not "photo".
- Target: textured, worn, print-bearing surfaces at [V1] density on everything
  the camera gets close to; signage with real legible text is a huge part of it.

### Skin / faces / people
- [V1] **No people appear at all.** The photoreal claim rests entirely on
  architecture, light and materials. (Honest note for the spec: this reference
  proves nothing about character fidelity.)
- [V2] People are standard game NPCs: readable faces at conversational distance,
  simple hair, cloth with printed logos; they do not survive close inspection.
  In the binocular shot the soldiers' camo and gear carry the realism, not faces.
- Target: this reference gives Hospital Escape **no** character-fidelity target —
  only environment/lighting. Characters need a different reference or a pass of
  their own.

### Camera behaviour
- [V1] Locked-off or near-static tripod-style shots at standing eye height,
  ~35–50 mm feel (mild perspective compression, verticals stay vertical).
  No shake, no sway, no game-style movement. The camera never calls attention
  to itself; the train supplies the motion.
- [V2] Standard third-person chase/action cameras; binocular overlay for the
  scope shot (circular vignette + zoom scale).
- Target: [V1] argues for restraint — a steady, eye-level, undistorted frame.
  (For Hospital Escape this sits *under* Cherie's patient-eyes layer: the base
  lens is calm and photographic; the wobble/eyelids are the character's body,
  not the camera rig.)

### Depth of field / focus
- [V1] Deep focus throughout — platform foreground to city background is all
  sharp. The only blur is **motion blur**: the passing train is heavily streaked
  horizontally while the platform stays pin-sharp. The sunset frames add a
  strong **lens flare**: a large rainbow-edged circular halo + starburst at the
  sun — an optical artefact used as a realism cue.
- [V2] Also deep focus; motion blur on the passing car at frame edge.
- Target: keep the world sharp; spend blur on *movement* (fast passes, swings),
  not on static DOF; lens artefacts (flare/halo) only when looking toward a
  bright source.

### Motion quality
- [V1] The train's pass is the only motion and it's defined by blur + speed,
  not by the object moving jerkily frame to frame. Everything else is still.
- [V2] Smooth game animation; NPCs idle/walk with ordinary loops; swimming has
  bubble particles and surface light play.
- Target: motion reads through blur and easing, never through strobing.

### Atmosphere
- [V1] Distance haze: the city beyond the station softens into warm haze;
  layered clouds with lit edges; the air itself is visible at sunset.
- [V2] Clear tropical air, minimal haze; underwater scene has green murk,
  bubbles and caustic-like light from the surface.
- Target: aerial perspective on anything beyond the immediate space — colour
  and contrast fall off with distance.

### UI / HUD
- [V1] **None.** No HUD, no text overlays, nothing between viewer and scene.
- [V2] Full game HUD (minimap, clock, money, bars, ammo) — diegetic signage
  ("TAFT AVENUE STATION", shop banners) does the world-building inside the frame.
- Target: the photoreal tier has zero chrome. Whatever HUD Hospital Escape
  keeps should be minimal, and the world's own signs should carry information.

### Resolution / softness character
- [V1] Delivered at 720p and still reads photoreal: the image is *soft like a
  photograph* — gentle grain-less smoothness, no razor aliasing, no sharpening
  halos. Fine detail (tile grout, fence mesh) is present but never crunchy.
- [V2] 1080p and crisper — and paradoxically less real: hard edges and clean
  surfaces announce the render.
- Target: softness is a feature. A slightly soft, well-lit frame beats a sharp,
  flat one. (This supports the pass-2 direction — blur/bloom/grain — with the
  correction that the blur belongs on motion and optics, and the *grade and
  materials* are what actually sell it.)

---

## Post 2 — @CY160909 (Shlcy), posted Nov 22, 2026 — NOT a realism reference

URL: https://x.com/cy160909/status/2124632516447600991
Engagement as retrieved: 14,852 views · 324 likes · 40 reposts · 10 replies.
Language: Chinese. Saved under `post2-cy160909/` (caption.txt, card.jpg, fx.json, vx.json).

Its only media is a **GitHub link card** (viewed: `post2-cy160909/card.jpg` —
the repo card for `yoruuuchan/create-blender-story-video`, "Agent Skill for
resilient Blender story-video production, monitoring, Resolve editing, and
verified 4K delivery"). The post text praises that skill's pipeline: storyboard
first, Blender MCP + Python for modelling/lighting/camera/animation, frame-by-frame
PNG rendering with resumable progress, DaVinci Resolve editing, and final
frame-count/encoding/colour verification.

**Verdict: it shows no scene, clip or game footage at all — it is not a visual
realism target and contributes no realism properties.** It is workflow-adjacent
only: it endorses the same *method* family as Post 1 (AI-orchestrated Blender
builds, rulebook + review loop, verified renders). If Cherie wants anything from
it, it's the pipeline idea, not a look. The two posts do **not** show the same
clip or subject: Post 1 is a Japanese station render + a Philippine GTA-style
gameplay reel; Post 2 is a Chinese-language post about a Blender video skill.

---

## Files

- `post.mp4` — Post 1, Video 1 (station, 35.7 s, 720p) · `frames1/` (6 spread frames + 2 native-res)
- `post2.mp4` — Post 1, Video 2 (gameplay reel, 88.1 s, 1080p) · `frames2/` (6 spread frames + 2 native-res)
- `post-info.json`, `caption.txt` — Post 1 metadata / caption (caption truncated by X at 300 chars)
- `post2-cy160909/` — Post 2 metadata, caption (full), and its GitHub card image
- All in `~/workspace/hospital-escape/realism-ref/`

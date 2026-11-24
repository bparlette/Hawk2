# Opus: Mixamo, what else? (MIXAMO-IDEAS.md). Proposals only, nothing built.

> **Last moved:** Nov 24, 2026 (this push).

## Read this first: how the names were verified
**I could not browse the Mixamo catalog this round.**
- mixamo.com and its search API need a signed-in session or an API key. I have no Adobe login (I don't take passwords).
- My one attempt to call the catalog API with the web app's built-in key was **blocked** by my session's permission guard as unauthorised access. I didn't try to get around that.
- Public web search turned up no full name list I could trust.

So every name below carries a **verification tier**. Treat anything below tier A or B as a search term, not a fact:

| Tier | Meaning |
|---|---|
| **A: in our repo** | Downloaded by Cherie's account. In `mixamo/MANIFEST.md` with its SHA-256, and already retargeted onto VALID by my cast pass. Exists, guaranteed. |
| **B: Neon API-verified** | Listed in `responses/neon-mixamo.md` with its catalog Description and Mixamo product ID from the API. Very likely exact; one look in the logged-in session confirms it. |
| **C: unverified** | From my memory of the library. **May not exist under this name.** Comes with a search term; Moth checks it in the logged-in session before anyone counts on it. |

**To fix the gap:** if Cherie wants tier C confirmed by me rather than by Moth, the path is either an API key granted to this environment, or Moth pastes the search results (name + description + ID). Either way, nothing gets downloaded before she picks.

## Constraints every idea was checked against
- **Retargeting:** every Mixamo clip arrives on the same 65-bone rig, and my pipeline already takes it onto the VALID bodies with foot-lock. That's `fbx_to_glb.py` + `retarget.js`, about 1 s per clip. So the retargeting difficulty is about the clip, not the rig:
  - **easy:** standing or walking on the floor;
  - **medium:** contact with a prop (chair, desk, bed, bar), which needs the prop placed to match, or a hand IK;
  - **hard:** two-person contact.
- **Perf:**
  - An animated VALID figure costs **5 calls / ~7.5k triangles** (measured).
  - The hallway frame is 26–28 calls (take 6) to about 66 (stock). Gunmen and Cole come first.
  - **Background people should be pose-baked:** a skinned figure frozen at one frame and written out as a plain mesh, merged per room into **1 call**, optionally decimated to about 2.5k triangles. Pose-baking is a short script on top of my retarget; it isn't built yet.
- **Loaders:** nothing below needs anything beyond the GLTFLoader we already flag. Additive layers are core r128.

## The ranked list (player-visible impact per unit of effort)

### 1. Wire the enemy variety we already own. Tier A, 0 downloads
| Clips (our names → Mixamo title) | Player-visible difference | Lands |
|---|---|---|
| `pistol-kneeling-idle` (Pistol Kneeling Idle) | a gunman who drops low behind the nurses' station and shoots from there, not every one walking at you | gauntlet: station, ambulance bay |
| `cover-idle-standing` / `stand-cover-to-look` / `shooting-pistol` (Standing Cover Against Object · Stand Cover To Looking Around A Corner · Shooting A Pistol From Behind Cover) | a gunman at a door frame who **peeks, shoots and ducks back**: a timing target, not a walking one | every door in West Wing B, corridor corners |
| `femme-peek-around-corner` (Female Peek Around Corner With Gun) | a second peek style, so two corner gunmen don't move identically | corners |
| `crouch-walk-forward` (Crouch Walk Forward) | a flanker who stays low along the wall, harder to hit | long halls |
| `pistol-walk-arc-left/right`, `pistol-walk-backward`, `turning` / `left-turn` / `right-turn` | gunmen who curve around beds and back off when hit, and **stop yaw-snapping** when they change direction | everywhere gunmen move |
| `hit-reaction-left` + `hit-reaction`; `dying` + `dying-backwards` | **hits and deaths that match where you shot him**: hit on his left, he reels left; head shot, he drops to his knees; chest shot, he goes over backwards | every kill |

- **Effort:** zero downloads, zero retargeting (all 27 gunman clips are in `mx-gunman.glb` today). Only engine wiring: cover and kneel states, and choosing the hit reaction by hit side. Each one is one new state in the gunman driver.
- **Cost:** no new assets; the per-gunman cost is unchanged.

### 2. Background patients from clips we already own. Tier A, 0 downloads
| Clips | Difference | Lands |
|---|---|---|
| `laying-sleeping`, `laying-breathless`, `laying-moaning` | **occupied beds**: patients asleep, struggling to breathe, moaning, in the rooms you pass. The hospital stops reading as an empty set. | ward rooms off West Wing B; the bed-push beat |
| `sitting-idle-still` / `-breathing` / `-thighs`, `sitting-rubbing-arm`, `sitting-disbelief` | a **waiting room with people in it**; a patient in a corridor chair who flinches as the shooting starts | waiting area, corridor chairs (take 4 placed three) |
| `injured-walking` | a wounded civilian limping out of your way | a corridor beat, once |

- **Effort:** zero downloads. Medium on the retarget side: the laying clips are authored about 1 m up (measured), so each bed needs placing to that height or the clip offset to the mattress, and the sits need the chair seat at about 0.45 m (my viewer shows the pose). Garments: a gown recolour, the same shader as the gunmen.
- **Cost:** pose-baked and merged: **1 call per room**, about 2.5k triangles a figure decimated. One or two animated (breathing) background figures at 5 calls each, near the rail only.

### 3. Fix the walk cadence. Tier A / C, 0–1 downloads
- Mixamo's **Pistol Walk is fast** (measured 2.63–2.81 m/s on our bodies), so at the 1.30 m/s law it plays at about 0.48×: a slow stalk.
- **Candidates:**
  - **A:** `walking-feminine` (Walking, 1.61 m/s on Y Bot) or `injured-walking` (1.71) as the legs, with my aim layer on top. No download.
  - **C:** a plain masculine **"Walking"** (search `walking`; Mixamo has several; take the one with no props).
- **Difference:** gunmen walk at a natural cadence at the speed the gauntlet is balanced for.
- **Effort:** none to one download. Easy.
- **Cost:** zero.

### 4. Neon's verified extras we didn't download. Tier B, 6 downloads
These are in `neon-mixamo.md` with their product IDs.

| Exact name · description (Neon's API listing) | Difference | Lands |
|---|---|---|
| `Pushing` · *Pushing A Heavy Object* | **Maya's bed push as a real walking push.** Our "Pushing An Object Forward" turned out to be a near-stationary shove (0.09 m/s measured). | the bed-push beat |
| `Injured Walk` · *Walking With Arm Injury* | Cole's stand-and-go beat holding his arm: reads as hurt, not tired | Cole stage 2/3 |
| `Dying` · *Dying Shot To The Head Falling On Two Knees* | a third death, so three kills in a row never repeat | every kill |
| `Gunplay` · *Cover To Shooting* | the cover gunman's **step-out-and-fire** transition (completes idea 1's peek) | door and corner gunmen |
| `Pistol Idle` · *Ready Alert Two Hand Pistol Grip* | an **alert** idle: gunmen who heard you, distinct from the relaxed one | gunmen before they see Cole |
| `Sitting Disbelief` · *Sitting In Disbelief With Head Forward* | Cole's **head-forward slump** for the consciousness fade (we have head-back only) | patient-eyes fade |

- **Effort:** 6 downloads (same settings as the set). Easy retarget, except the heavy push, which is medium: it needs the bar-height hand IK.
- **Cost:** about 100–150 KB each in the clip GLB; no runtime change.

### 5. Staff and civilian life. Tier C, verify every name first
| Search term → likely title (C) | Difference | Lands |
|---|---|---|
| `typing` → "Typing" | **a nurse typing at the station** as you're wheeled past, then she looks up: the single strongest "this is a working hospital" shot | nurses' station (z −27.5) |
| `phone` → "Talking On Phone" / `texting` → "Texting" | staff on the phone at the station or in a doorway | station, doorways |
| `talking` → "Talking" / "Sitting Talking" | two people mid-conversation in the waiting room | waiting room |
| `scared` / `terrified` / `cower` → "Terrified", "Crouch To Cower" (C) | **civilians who duck and cower** when the shooting starts, not static extras | gauntlet halls |
| `run` → "Running" / "Fast Run" (C, no weapon) | staff fleeing down the far end of a hall | gauntlet background |
| `knock` / `open door` → "Opening A Door" (C) | a door that's opened by a hand, not slid open | room doors |

- **Effort:** 2–8 downloads.
  - Retarget is easy for the standing clips.
  - **Medium** for typing (the hands must land on the station counter: a height offset or hand IK) and for sitting talk (chair height).
  - Two-person conversations are two independent clips; no contact.
- **Cost:** pose-bake everything except one or two animated figures near the rail; a cower can be the pose-baked end frame.

### 6. Intro and cutscene beats. Tier A + C, 0–3 downloads
| Clips | Difference | Lands |
|---|---|---|
| A: `laying-sleeping` → `laying-breathless` → `sit-to-stand` | Cole's **wake-up** told with his body before the player gets control | opening |
| C: `getting up` → "Getting Up" / "Waking" | the in-bed sit-up the sit-to-stand lacks | opening |
| C: `reload` → "Reloading" (a pistol reload may not exist; rifle reloads do) | a **reload window**: gunmen visibly reload, so the player learns when to push | gauntlet pacing |
| A: `pistol-aim` (has a lower-to-holster ending) | a gunman lowering his gun at a story beat | Hale or boss beats |

- **Effort:** 0–3 downloads. Medium: bed-relative placement.
- **Cost:** cutscene-only figures, off-budget during gameplay.

### 7. Other projects in this repo (the cast pipeline is reusable)
`fbx_to_glb.py` + `retarget.js` + the contact-pacing and foot-lock code take any Mixamo clip onto any rig with Mixamo-style bone names, which is the VALID bodies, or any Mixamo-compatible character. Where it lands:

- **`bodycam-corridor` / `dead-hall` (bodycam horror):** the same corridor-shooter shape as Hospital Escape, so ideas 1–2 transfer whole.
  - **C:** Mixamo's **zombie set** (search `zombie`: walks, idles, attacks, "Zombie Death"; the names vary) would give `dead-hall` a shambling enemy. It's the highest-impact transfer I can see.
- **`scaggsville-3d` / `palm-city` (open streets):** pedestrians, pose-baked and merged per block. The walk and idle variants (A: `walking-feminine`; C: male "Walking", "Texting", "Talking") give street life at about 1 call per block, with contact-paced walks so nobody skates.
- **`backstreet-brawl` / `fallen-city-brawl` (brawlers):** Mixamo's **boxing / martial-arts** clips (C: search `punch`, `kick`, `hit to body`, `knocked down`). Hit-react pairs are the value here. Those games are 2D today, so this only matters if a 3D brawler is planned.
- **`game-night-at-daves`:** seated table life (A: the sitting idles; C: `sitting talking`, `sitting laughing`).
- **Effort per project:** zero tooling work. Downloads plus one `retarget.js` run.

## Flags (unsure it exists, or a known trap)
- **Pistol reload:** I'm not sure Mixamo has a *pistol* reload. Rifle reloads exist (C). Check before planning a reload window around it.
- **Pistol fire-while-moving:** Neon's API pass found none (rifle only). We don't need one: my additive fire layer runs over any walk (measured).
- **Duplicate short names:** Mixamo reuses one short name for different clips (`Pushing`, `Dying`, `Sitting Idle`, `Hit Reaction`). Always confirm by the **description**, as Neon's table does.
- **Characters:** still none. VALID bodies only; no Mixamo character meshes ship (Y Bot stays a rest reference).
- **Two-person contact clips** (carrying, dragging, helping someone up): Mixamo animates one character at a time, so pairs don't line up. I left them out.

## Top pick
**Idea 1: wire the enemy variety we already own.** Zero downloads and zero retargeting, because the 27 gunman clips are already on the VALID bodies with foot-lock.
- It changes the moment-to-moment game, not just the look. Kneeling shooters, door-frame peekers and low flankers are new **targets** with their own timing. Directional hits and deaths make every shot feel like it landed where you aimed.
- Every other idea dresses the hospital. This one makes the gauntlet itself better.
- **Runner-up:** idea 2 (occupied beds and waiting room) as the cheapest big jump in "this place is real", at 1 call per room.

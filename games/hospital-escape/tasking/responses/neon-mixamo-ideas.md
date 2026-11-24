# Mixamo — What Else? Neon's Catalog Proposals

- **Author:** Neon (`games/hospital-escape/tasking/MIXAMO-IDEAS.md`)
- **Mode:** Proposals only (zero clips downloaded, zero game code modified).
- **Catalog Verification:** Queried live against `mixamo.com/api/v1/products` (`X-Api-Key: mixamo2`) on Nov 24, 2026; existing inventory verified against `games/hospital-escape/mixamo/MANIFEST.md` (`54` clips across batch 1 + batch 2) and Neon's VALID retarget pipeline (`build_neon_cast_pass.py`).
- **Runtime Baseline:** `three.js r128`, `GLTFLoader` approved Nov 24, `Walk 1.30 / Run 3.20 m/s` stance-phase law, MIT VALID bodies (`White_M_1_Util`, `Hispanic_F_1_Util`, `White_M_3_Casual`, `N2` `valid-mocap`) only (`Y Bot` never ships).

---

## Ranked Proposals (Impact per Unit Effort)

### Rank 1 — Nurses' Station & Waiting Room Working Hospital Life (Staff + Patients + Phone)
- **Exact Mixamo Catalog Clips (`id` verified live):**
  1. `Typing` — *"Sitting At A Computer And Typing"* (`c9ccaf87-b96c-11e4-a802-0aaa78deedf9`)
  2. `Sit To Type` — *"Sitting To Typing"* (`c9ccac9a-b96c-11e4-a802-0aaa78deedf9`)
  3. `Talking On Phone` — *"Female Standing Talking On Phone"* (`c9c9f63d-b96c-11e4-a802-0aaa78deedf9`)
  4. `Talking On A Cell Phone` — *"Male Standing While Talking On A Cell Phone"* (`c9ca0104-b96c-11e4-a802-0aaa78deedf9`)
  5. `Texting While Standing` — *"Texting On A Smart Phone While Standing"* (`c9c9fa4d-b96c-11e4-a802-0aaa78deedf9`)
  6. `Sitting Talking` — *"Sitting And Talking To Another Person"* (`c9cd7793-b96c-11e4-a802-0aaa78deedf9` / `c9cd76b1-b96c-11e4-a802-0aaa78deedf9`)
  7. `Writing` — *"Male Writing While Seated"* (`c9c64e6f-b96c-11e4-a802-0aaa78deedf9`)
- **Player-visible difference (1 line):** Turns the nurses' station and waiting room from empty corridors into a working hospital populated by typing/charting staff and chatting patients seconds before chaos starts.
- **Where it lands:** `WEST WING B` nurses' station (`station: { side: -1, z: -27.5 }`, early pre-fire corridor), `EAST WING` (`orderly_east`), `gauntlet_waiting_room` / `lobby` (`ST. MERCER MEMORIAL`). Also reuses `Typing` / `Talking On A Cell Phone` / `Sitting Talking` directly on NPCs in `palm-city` and `scaggsville-3d`.
- **Effort:** `3–7` downloads. **Low–Medium** retarget difficulty: standing clips drop straight onto Maya/Cole/Util VALID bodies; `Typing` / `Writing` / `Sitting Talking` only need Maya's existing analytical 2-bone wrist IK (`apply_maya_handle_ik`) to seat hands cleanly onto the station counter surface (`y ~ 1.02 m` standing / `y ~ 0.74 m` desk) plus our wheel-chair seat `Hips` Y-offset check (`coleEstCrownY`).
- **Cost check:** Pose-bake far/background waiting-room chairs or drive `1–2` hero nurse/desk figures via shared VALID skeleton (`+1` draw call per visible NPC if unmerged, `0` extra loaders — already `GLTFLoader`; ~`7k–9k` tris for animated near-rail nurse, `<= 3k` tris LOD/baked background extras).

---

### Rank 2 — IV-Pole Hallway Patient & Occupied Ward Beds (Hero Medical Prop Beats)
- **Exact Mixamo Catalog Clips (`id` verified live):**
  1. `Iv Pole Walking` — *"Walking With An Iv Pole"* (`c9ce7545-b96c-11e4-a802-0aaa78deedf9`)
  2. `Writhing In Pain` — *"Laying On Back Writhing In Pain"* (`c9c8fcef-b96c-11e4-a802-0aaa78deedf9`)
  3. **Already Owned (`0` downloads):** `laying-breathless.fbx`, `laying-sleeping.fbx`, `laying-moaning.fbx`, `sitting-rubbing-arm.fbx`, `sitting-idle-still.fbx`
- **Player-visible difference (1 line):** Explains why `ivPole`, `crashCart`, and `gurney` props line every wing — an actual patient shuffles beside an IV stand in the hall and wounded patients stir on ward beds instead of empty white sheets.
- **Where it lands:** `WEST WING` (`props: ['ivPole', 1.4, -8.6]`), `WEST WING LINK` (`ivPole` at `z=-43.4`), `GROUND · CORRIDOR A` (`crashCart` / `ivPole`), `ward_foot` (patient beds along the ward room), and `room_view` (Room 412 opener). Also transfers directly to hospital/triage props in `dead-hall`.
- **Effort:** `0–2` downloads. **Medium** retarget difficulty: `Writhing In Pain` shares Cole's `laying-*` bed-mattress root offset (`c.root.y = -0.22`); `Iv Pole Walking` uses Maya's single-arm IK lock onto the IV pole handle ring (`handle_z ~ 1.15 m`) + `authored_stance_mps` pacing so the pole wheels roll cleanly beside the patient without palm slip.
- **Cost check:** Occupying existing ward beds reuses already-instanced `hospital-escape` gurney/IV geometries (`+0–1` draw call per visible occupied bed, pose-baked key poses allowed for distant beds at `0` live mixer cost).

---

### Rank 3 — `Dead Hall` / `Bodycam Corridor` Full Zombie Locomotion & Attack Kit (Cross-Game Reuse)
- **Exact Mixamo Catalog Clips (`id` verified live, 40 results in catalog):**
  1. `Zombie Walk` (`c9cbd4d9-b96c-11e4-a802-0aaa78deedf9`, *"Zombie Walking"*) & `Walking` (`c9c61776-b96c-11e4-a802-0aaa78deedf9`, *"Creeping Zombie Walk"*)
  2. `Zombie Running` (`c9c6b0ab-b96c-11e4-a802-0aaa78deedf9`, *"Zombie Run"*) / `Zombie Crawl` (`c9cbee0c-b96c-11e4-a802-0aaa78deedf9`)
  3. `Zombie Idle` (`c9c6726b-b96c-11e4-a802-0aaa78deedf9`, *"Zombie Alert Idle"*)
  4. `Zombie Scream` (`c9ccbc37-b96c-11e4-a802-0aaa78deedf9`) & `Zombie Attack` (`c9cbd7ad-b96c-11e4-a802-0aaa78deedf9` swipe / `c9c713dd-b96c-11e4-a802-0aaa78deedf9` overhead)
  5. `Zombie Stand Up` (`c9c6b2ed-b96c-11e4-a802-0aaa78deedf9`, *"Zombie Laying On Stomach To Standing Up"*)
  6. `Zombie Dying` (`c9cc240a-b96c-11e4-a802-0aaa78deedf9`, *"Falling Forward"*) & `Zombie Death` (`c9cbda5a-b96c-11e4-a802-0aaa78deedf9`, *"Falling Onto Back"*)
- **Player-visible difference (1 line):** Gives `Dead Hall` and `Bodycam Corridor` a complete horror enemy controller (floor ambush stand-up -> lurching walk -> sprint lunge -> melee swipe -> directional fall) on our existing VALID meshes with zero new rigging tools.
- **Where it lands:** `games/dead-hall/` (primary horror enemy set) and `games/bodycam-corridor/` (close-quarters corridor ambushes); zero need in grounded tactical `Hospital Escape`.
- **Effort:** `6–9` downloads. **Low** retarget difficulty: `build_neon_cast_pass.py` (`setup_valid_rig` + `retarget_clip` + vertical foot-lock + stance-phase contact speed measurement) runs untouched on every clip (`Zombie Walk`, `Zombie Running`, `Zombie Crawl` just need `in_place=True, foot_lock=True`).
- **Cost check:** Identical mobile budget (`1` draw call per instanced/cloned `~7k–9k` tri VALID body per mesh batch, `GLTFLoader` only, zero extra shaders or dependencies).

---

### Rank 4 — Civilian Panic, Reaction & Doorway Breach (Non-Combatant Threat Clarity)
- **Exact Mixamo Catalog Clips (`id` verified live):**
  1. `Terrified` — *"Being Terrified While Standing"* (`c9c99025-b96c-11e4-a802-0aaa78deedf9`)
  2. `Scared` — *"Surprised Jumping Out Of Seat"* (`c9c77b46-b96c-11e4-a802-0aaa78deedf9`)
  3. `Nervously Look Around` — *"Nervously Looking Around Left To Right - Loop"* (`c9c900c8-b96c-11e4-a802-0aaa78deedf9`)
  4. `Running` — *"Running With Intention"* (`c9c99715-b96c-11e4-a802-0aaa78deedf9`, unarmed flee substitute)
  5. `Opening Door Inwards` (`c9ca099c-b96c-11e4-a802-0aaa78deedf9`) / `Open Door Outwards` (`c9ca4de1-b96c-11e4-a802-0aaa78deedf9`)
- **Player-visible difference (1 line):** Creates instant visual silhouette separation between unarmed terrified bystanders (`Terrified` / `Scared` / unarmed `Running`) and armed gunmen, while enemies physically push corridor doors open instead of ghosting through slides.
- **Where it lands:** `gauntlet_waiting_room` (`wait_patient` / waiting seats), `entrance_holdout` (`lobby_visitor` running across main lobby), `EAST WING` / `CORRIDOR A` door ambushes (`doorsL` / `doorsR` in `level1.js`).
- **Effort:** `4–5` downloads. **Low** retarget difficulty for `Terrified`, `Running`, `Nervously Look Around` (`foot_lock=True` on `Running`); **Medium** for `Opening Door Inwards` (sync Maya/door hinge timeline with hand swing frame).
- **Cost check:** Unarmed civilian meshes reuse Casual/Util VALID bodies (`<= 2` active fleeing figures + `Scared`/`Terrified` baked at rest); negligible draw overhead on phone (`<= +2` draws in lobby/waiting beats).

---

### Rank 5 — Injured Urgency, Low Flankers & Corridor Peek Variety (Gameplay Pacing)
- **Exact Mixamo Catalog Clips (`id` verified live):**
  1. `Injured Jog` — *"Jogging While Holding And Checking Injured Arm"* (`c9c8ef48-b96c-11e4-a802-0aaa78deedf9`)
  2. `Injured Run` — *"Injured Running"* (`c9ce4e73-b96c-11e4-a802-0aaa78deedf9`)
  3. `Injured Stumble Idle` — *"Injured Stumbling Idle"* (`c9ce53ae-b96c-11e4-a802-0aaa78deedf9`)
  4. `Crouch Look Around Corner` — *"Crouch Looking Around Corner"* (`c9cc0b63-b96c-11e4-a802-0aaa78deedf9`)
  5. `Crawling Backwards` — *"Frantically Crawling Backwards On Stomach"* (`c9c8c51f-b96c-11e4-a802-0aaa78deedf9`) / `Crawl Backwards` (`c9ccc230-b96c-11e4-a802-0aaa78deedf9`)
- **Player-visible difference (1 line):** Escalates Cole's on-foot escape beat when shots ring out (`Injured Jog` vs walk) and gives corridor/floor gunfights genuine crouch corner-peeks and downed-crawler tension.
- **Where it lands:** `gauntlet_ward_on_foot` (`ward_foot` escape beat on Cole), `CORRIDOR B` (`props: gurney`), `entrance_exit_push` (`exit_w1` canopy rush), and `bodycam-corridor` wounded NPCs.
- **Effort:** `3–5` downloads. **Low** difficulty (`in_place=True` + stance-phase speed scaling on `Injured Jog`/`Run`, zero hand props required for `Crawling Backwards`).
- **Cost check:** Zero structural geometry cost (`+0` draws over existing enemy/Cole actors); clips swap cleanly via NLA action table in `gunman-mixamo.glb` / `cole-mixamo.glb`.

---

### Rank 6 — Intro / Boss Cutscene Transitions (Wake-Up & Evacuation)
- **Exact Mixamo Catalog Clips (`id` verified live):**
  1. `Waking` — *"Waking Up While Sitting"* (`c9c82b61-b96c-11e4-a802-0aaa78deedf9`)
  2. `Getting Up` — *"Getting Up From Back"* (`c9c7276e-b96c-11e4-a802-0aaa78deedf9`)
  3. `Waving` — *"Emotional Waving Forward"* (`c9c6cc85-b96c-11e4-a802-0aaa78deedf9`) / *"Waving With Both Hands"* (`c9c8ee63-b96c-11e4-a802-0aaa78deedf9`)
- **Player-visible difference (1 line):** Bridges Cole's bed-bound state in Room 412 smoothly into upright wheelchair readiness (`Getting Up From Back` -> `Waking` -> `Stand_To_Sit`) and anchors evac gestures at the ambulance bay.
- **Where it lands:** `visit_room` / `transfer_cut` (Room 412 opener), `bay_route` / `entrance_exit_push` (`ST. MERCER MEMORIAL` ambulance canopy).
- **Effort:** `2–3` downloads. **Low–Medium** (single `Hips` bed-height key offset during `Getting Up From Back` off the `0.76 m` mattress).
- **Cost check:** Plays strictly in cutscene/low-enemy-density windows (`0` budget contention during corridor firefights).

---

### Rank 7 — Cross-Project Transfers: Street Open Worlds, Tavern Table & Brawlers
- **Exact Mixamo Catalog Clips (`id` verified live):**
  - `scaggsville-3d` / `palm-city` street life: `Texting And Walking` (`c9c9f90e-b96c-11e4-a802-0aaa78deedf9`), `Walking While Texting` (`c9c9fd95...`), `Pacing And Talking On A Phone` (`c9ca0326...`), `Talking Phone Pacing` (`c9ca0249...`)
  - `game-night-at-daves`: `Sitting` (*"Sitting And Impatiently Waiting"*, `c9ccad56-b96c-11e4-a802-0aaa78deedf9`), `Cheering While Sitting` (`c9cb8d02...`), `Having A Meeting, Male/Female` (`c9ca50c4...` / `c9ca5210...`)
  - `backstreet-brawl` / `fallen-city-brawl` (if moving/prototyping 3D): `Boxing` jab/cross/hook/uppercut set (`c9c71c43...`, `c9c7060b...`, `c9c70517...`), `Knocked Down` (`c9c8a565...`), `Stunned` (`c9ca7f74...`), `Getting Up` (`c9c90823...`)
- **Player-visible difference (1 line):** Reuses the exact same `build_neon_cast_pass.py` + `GLTFLoader` pipeline to populate sidewalks, seated card tables, or 3D brawl combat across other repo games without writing a single new retargeter.
- **Where it lands:** `games/scaggsville-3d/`, `games/palm-city/`, `games/game-night-at-daves/`, `games/backstreet-brawl/`, `games/fallen-city-brawl/`.
- **Effort:** `4–10` downloads per project, **Low** engineering effort (pipeline already built & battle-tested).
- **Cost check:** Use static pose-baked meshes for distant sidewalk crowds (`1` merged draw call per block) and keep animated rigs to hero/nearby characters.

---

## Live-Verified Catalog Flags & Traps (`Do Not Guess Names`)

1. **Pistol Reload Does NOT Exist on Mixamo:** Querying `reload` returns `7` results, **0** for one-handed pistol: only rifle reloads (`Reload` *"Run/Walk/Crouch/Stand While Reloading Rifle"*, `Prone Reloading`), `Gun Reload While Walking` (`c9c646a9...`, two-handed long-gun rig), and bow arrow draw. Workaround if reload windows are ever needed: use our `Spine1+` layer to lower the right arm (`Pistol_Idle` -> `Shooting_Gun` early frames) + magazine tap/rack pause without pretending Mixamo has a dedicated pistol-reload clip.
2. **Civilian "Cower" & Unarmed "Flee" Do NOT Exist by Those Names:** Searching `cower` returns `86` **armed rifle/cover** clips (`Left Cover Sneak`, `Taking Cover`); searching `flee` returns `81` generic unrelated motions. Use **`Terrified` (`c9c99025...`)**, **`Scared` (`c9c77b46...`)**, **`Nervously Look Around` (`c9c900c8...`)**, **`Crawl Backwards` (`c9ccc230...`)**, and unarmed **`Running` (`c9c99715...`)** — and explicitly skip **`Goofy Running` (`c9c66672...`)**, which is cartoon-exaggerated.
3. **Name Collisions Confirmed Again:** Identical short titles (`Walking`, `Waving`, `Getting Up`, `Zombie Idle`, `Opening`, `Reload`) point to completely different clips — every download list must pin both the **36-char product UUID** and **exact Mixamo description** as above.
4. **No Two-Person Contact Pairs:** Never rely on Mixamo two-character paired drags/grapples; single-character world anchors + Maya-style analytical 2-bone wrist IK (`apply_maya_handle_ik`) solve prop contact reliably (`1.76 mm`–`18.4 mm`).

---

## Neon's Single Top Pick

**Pick `Rank 1` (`Typing` + `Talking On Phone` / `Talking On A Cell Phone` + `Sitting Talking`) — ONLY `3–4` clips (`1` typing nurse at `WEST WING B` station `z = -27.5` + `1–2` talking/phone patients in `gauntlet_waiting_room` / `lobby`).**
- **Why this beats every other single pick on impact-per-effort:**
  1. Right now all **combat shooter**, **bed-push**, **wheelchair-push**, and **Cole injury/seated/bed** sets (`54` clips across batch 1 + batch 2) are **already downloaded and retargeted**. The loudest visual contrast gap left in `Hospital Escape` is that the **nurses' station (`z = -27.5`) and waiting room look unstaffed**, making the early rail glide feel like an empty architectural demo before the shooting starts.
  2. Just `3–4` standing/seated Mixamo clips on existing Maya/Util/Cole VALID bodies turn the nurses' station and waiting room into a believable, living hospital immediately (`1` typing clip with Maya wrist IK onto the desk counter + `1` phone talker + `1` seated waiting-room pair), costing `0` new shaders/loaders and `< +3` draw calls while reusing cleanly across `palm-city` and `scaggsville-3d`.

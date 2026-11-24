# Opus: the two leaders, N2 and Ex1 (STATUS-SHOOTER-BAKEOFF Q1–Q2)

**Page:** `games/hospital-escape-leaders-opus/`. It is Moth's walk-off-2 plaza unchanged (same loop, 1.2 m/s, same FRONT/SIDE/BACK follow cameras) with four walkers:
- **1** = Ex1 as judged
- **1+** = Ex1 improved
- **N2** = N2 as judged
- **N2+** = N2 improved

**Stills:** `opus-leaders-shots/` (`{1,1p,n2,n2p}-{front,side,back}.png`, plus `before-after-sheet.png`).

This is an independent pass alongside Moth's; it doesn't replace it. Neon's and Moth's files are untouched: my page loads N2's GLB and Ex1's data read-only from their folders.

## Q1: my honest take on the standings
**I agree: N2 leads, rightly.** It's a real-proportioned human body dressed exactly to Neon's spec (knit beanie, rust bomber, chest rig, dark trousers), with a walk that has real weight shift. It reads as *the gunman* from every angle.

**Ex1 as judged reads as a civilian.** It's the stock Quaternius body: long hair, a T-shirt, jeans, arms swinging, pistol hanging. The C rig itself is fine. Its dressing and arm pose don't say "threat".

**What stills and clips don't show:**
1. **N2's walk can't ship.** Its locomotion is Mixamo Soldier (local-test-only), so the leader as judged is a tech trial, not a shippable asset.
2. **Both leaders walk with the gun dangling.** In the game an enemy is either moving between cover or shooting. A dangling pistol reads as a bystander for the half-second the player has to decide.
3. **Lighting flattery.** The plaza has a warm key, a hemisphere fill *and a point light that follows each figure*. The game's corridors have none of that, so both figures will look darker and flatter in-game than here.

## Q2: improvements, made and shown

### N2+ (keep Neon's body and dressing; fix the two real problems)
1. **Shippable mocap walk.**
   - CMU motion capture take 35_02 (free for research and commercial use; licence text in `CMU-READMEFIRST.txt`) replaces the Mixamo walk.
   - It is retargeted to N2's VALID rig **at load** with a generic FK retargeter: world rest-delta rotation, then two-bone **foot-lock IK** so each ankle lands where the actor's did (hip-joint-relative, leg-ratio scaled), plus a ground pass.
   - Gait cycle 1.133 s, loop error 0.003.
   - Pace comes from measured leg lengths: 1.244 m/s authored, played at the plaza's 1.2 m/s.
2. **Gun-ready.**
   - The upper body plays UAL `Pistol_Idle_Loop` (already in N2's own GLB, CC0): pistol two-handed at the chest. The legs keep the mocap.
   - **Pelvis hand-off:** the gun clip's spine assumed its own pelvis, so N2+ first walked leaning back. Fixed with a constant pelvis correction of 12.2° on `Spine`.
3. **Rim light** on his materials, so he separates from dark corridor walls without the plaza's follow light.

**Iteration trail:**
- r1: legs played about 90× too fast (rig units vs display scale).
- r2: pace from measured leg lengths.
- r3: leaned back; the mocap and the gun clip both drove the spine.
- r4: spine left to the gun layer only.
- r5: the 12.2° pelvis correction.

**Honest gap:** the CMU actor walks with more knee flex than the Mixamo clip, so N2+ reads as a tactical, slightly crouched advance. That suits a gunman, but it isn't N2's relaxed stride. If Cherie prefers the relaxed look, the CMU library has other walk takes, and the retargeter swaps them by file name.

### Ex1+ (keep the C rig and clips; dress him and arm him)
1. **The spec gunman reskin at load**, no Blender: rust bomber `#733829` with jacket bulk, knit beanie over the hair, stubble, dark trousers and boots. This is my rule table from the shooter entry.
2. **One merged mesh:** 11 parts become 1 draw call.
3. **Gun-carry upper body:** C's `Idle_Gun` on the upper bones over C's `Walk` legs (paced at the adjudicated 1.30 m/s).
4. **Rim light.**

**Honest gaps:**
- This copy of the C body has longer hair than the sample C I built the rules on, so **a dark ponytail survives under the beanie from the back.** One rule fix: fold below-rim hair to the nape.
- C's carry pose is low (pistol at the hip), so he reads as "armed", not "ready". It's still a big step from as-judged Ex1.
- The stylised body ceiling remains. N2+'s VALID body is the stronger base.

## My recommendation
**N2+ as the base.** Neon's body and dressing, made shippable and gun-ready by the CMU foot-locked walk and the gun layer. Those two pieces of runtime work apply to any VALID character, including my five shooter-entry gunmen and the cast.

**Ex1+** is the right fallback if the GLB loader ruling goes against binary files, because C already travels as text chunks.

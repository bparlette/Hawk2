# SNES sprite cast — sources & licenses

All character sprites in this folder are composited from the **Universal LPC
Spritesheet Character Generator** asset corpus (Liberated Pixel Cup), fetched
2026-11-25 from the project's GitHub repo:
https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
(web generator: https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/)

LPC art is multi-licensed per layer: **CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0**
(attribution + share-alike apply — see FLAG below). Layers used, per character:

- **Bodies / heads** — `spritesheets/body/bodies/{male,female}`,
  `spritesheets/head/heads/human/{male,female}` ("LPC Character Bases",
  opengameart.org/content/lpc-character-bases; authors incl. bluecarrot16,
  JaidynReiman, BenCreating, ElizaWy, wulax, Redshrike). Animations used:
  walk (9f × 4dir), shoot (13f × 4dir), hurt (6f), sit (3f × 4dir).
- **Hair** — `spritesheets/hair/{buzzcut,bob,bangs,balding,plain}/adult`.
- **Clothes** — `torso/clothes/shortsleeve/tshirt/{male,female}`,
  `torso/clothes/longsleeve/{longsleeve,longsleeve2_buttoned}/male`,
  `legs/pants/{male,thin}`, `feet/shoes/basic/{male,thin}`.
  Shirt colours for gunman/Maya/nurse/Cole were re-tinted locally from the
  base tan shirt layer (skin-tone pixels masked out) — a modification of the
  layer above, same licenses.
- **Wheelchair** — `spritesheets/body/wheelchair/adult/{background,foreground}/black.png`
  by **Eliza Wyatt**, **CC-BY 3.0 / OGA-BY 3.0**
  (opengameart.org/content/lpc-revised-elders), composited behind/in front of
  Cole's seated (sit) frames.

Role mapping: gunman = male + buzzcut + dark-tinted shirt · Maya = female +
bob + slate-tinted shirt · nurse (staff) = female + bangs + teal-tinted shirt ·
Dr. Hale = male + balding + white buttoned shirt · Cole = male + plain hair +
pale longsleeve; Cole in chair = wheelchair composite; Cole in bed = the hurt
sheet's final (fully-down) frame, lying.

Round-2 additions (2026-11-25):
- **Firearm (gunman shoot frames): ORIGINAL pixel art drawn for this sample**
  (programmatic pixel drawing in `sprites-src/composite.py`, `arm_gunman()` —
  gunmetal tones sampled to sit inside the LPC palette; composited into every
  shoot cell, anchored on each frame's hand pixels). Not LPC art; no third
  party license applies. It exists because the LPC corpus has no firearm
  (ranged weapons there are bow / crossbow / slingshot).
- Gunman tint completed: in round 1 only the shirt was tinted and the cream
  LPC pants/shoes left him reading beige; round 2 tints pants (dark slate)
  and shoes as well, so he reads dark/hostile as intended.

Round-3 additions (2026-11-25, SNES lane):
- Firearm readability pass (same original pixel art, `arm_gunman()` in
  `sprites-src/composite.py`): the round-2 front (down-row) pistol was a 5 px
  dark nub at the waist that vanished against the dark shirt. Round 3 redraws
  it as a full muzzle face — bright gunmetal block with a dark bore, two-hand
  grip below — so a gunman facing the player visibly points a gun at them.
  Side-profile pistols lengthened (12→14 px) with a front-sight nub.

Known gaps (flagged, not hidden):
- Cole's bed sprite is the hurt (knocked-down) frame reused as a lying
  patient — closest fit in the corpus; there is no dedicated in-bed sheet.
- LPC layers are copyleft (CC-BY-SA / GPL). This page is a look sample;
  shipping this cast in a public build needs a license decision by the owner.

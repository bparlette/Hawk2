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

Known gaps (flagged, not hidden):
- **No firearm sprite exists in the LPC corpus** (ranged weapons are bow /
  crossbow / slingshot). Gunmen use the LPC *shoot* pose frames unarmed —
  arms extended in the aim pose, no weapon drawn.
- Cole's bed sprite is the hurt (knocked-down) frame reused as a lying
  patient — closest fit in the corpus; there is no dedicated in-bed sheet.
- LPC layers are copyleft (CC-BY-SA / GPL). This page is a look sample;
  shipping this cast in a public build needs a license decision by the owner.

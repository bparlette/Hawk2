#!/usr/bin/env python3
"""Compose a labelled 4x3 overview sheet of all 12 CAST-QUALITY 390x844 stills."""
import os
from PIL import Image, ImageDraw, ImageFont

SHOTS_DIR = '/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape/tasking/responses/neon-cast-quality-shots'
ITEMS = [
    ('hale-opening-room-390x844.png',     '1. Room 412 Opening (Hale + Maya + Cole)'),
    ('patient-on-bed-390x844.png',        '2. Ward Beds (Lying Patient + Cole)'),
    ('cole-bed-legs-closeup-390x844.png', '3. Cole Bed Legs (Pajama Pants + Socks)'),
    ('cole-wheelchair-legs-390x844.png',  '4. Cole Wheelchair (Pajamas + Socks)'),
    ('nurse-station-390x844.png',         '5. Nurse Station (Staff Typing + Phone)'),
    ('staff-corridor-390x844.png',        '6. T4 Corridor (Hale + Nurses Walk)'),
    ('cast-quality-lineup-390x844.png',   '7. Full 7-Character Lineup (T4 Lit)'),
    ('hale-closeup-390x844.png',          '8. Dr. Hale Close-up (Coat, Glasses, Hair)'),
    ('hale-hands-up-390x844.png',         '9. Dr. Hale Hands Up (Deformation)'),
    ('nurse-f-closeup-390x844.png',       '10. Nurse Female (V-Neck, Steth, Badge)'),
    ('nurse-f-back-390x844.png',          '11. Nurse Female Back (Hair Bun, Scrubs)'),
    ('nurse-m-closeup-390x844.png',       '12. Nurse Male (Scrubs, Badge, Pager)'),
]

COLS, ROWS = 4, 3
CW, CH = 390, 844
PAD = 18
HEAD = 42
CANVAS_W = PAD + COLS * (CW + PAD)
CANVAS_H = PAD + ROWS * (CH + HEAD + PAD)

out = Image.new('RGB', (CANVAS_W, CANVAS_H), (12, 18, 24))
draw = ImageDraw.Draw(out)

for idx, (fname, label) in enumerate(ITEMS):
    p = os.path.join(SHOTS_DIR, fname)
    if not os.path.exists(p):
        continue
    r, c = divmod(idx, COLS)
    x = PAD + c * (CW + PAD)
    y = PAD + r * (CH + HEAD + PAD)
    draw.rectangle([x - 2, y - 2, x + CW + 2, y + HEAD + CH + 2], outline=(55, 85, 100), width=2)
    draw.text((x + 6, y + 12), label, fill=(220, 236, 244))
    im = Image.open(p).convert('RGB').resize((CW, CH), Image.LANCZOS)
    out.paste(im, (x, y + HEAD))

out_path = os.path.join(SHOTS_DIR, 'cast-quality-overview.png')
out.save(out_path, optimize=True)
print('WROTE', out_path, out.size)

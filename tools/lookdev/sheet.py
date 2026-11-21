#!/usr/bin/env python3
"""lookdev/sheet.py — before/after contact sheets for phone-size captures.

  python3 tools/lookdev/sheet.py OUT.png img1.png img2.png ... [--labels "a,b,..."] [--cols N] [--scale 0.66]
  python3 tools/lookdev/sheet.py OUT.png --rows "before:a.png,b.png" "after:c.png,d.png" [--scale 0.66]

Labels go on a strip above each image, so the comparison survives being pasted into a chat or PR.
Needs Pillow (pip install pillow).
"""
import argparse, sys
from PIL import Image, ImageDraw

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out'); ap.add_argument('images', nargs='*')
    ap.add_argument('--labels', default=''); ap.add_argument('--cols', type=int, default=0)
    ap.add_argument('--rows', nargs='*', default=None, help='"title:img1,img2" per row')
    ap.add_argument('--scale', type=float, default=1.0); ap.add_argument('--gap', type=int, default=10)
    a = ap.parse_args()
    if a.rows:
        rows = [(r.split(':', 1)[0], r.split(':', 1)[1].split(',')) for r in a.rows]
    else:
        if not a.images: sys.exit('no images')
        labels = a.labels.split(',') if a.labels else [''] * len(a.images)
        cols = a.cols or len(a.images)
        rows = [('', a.images[i:i + cols]) for i in range(0, len(a.images), cols)]
        lab_iter = iter(labels)
    ims = [[Image.open(p).convert('RGB') for p in r[1]] for r in rows]
    w = max(im.width for r in ims for im in r); h = max(im.height for r in ims for im in r)
    cols = max(len(r) for r in ims); strip = 34
    W = Image.new('RGB', (cols * w + (cols + 1) * a.gap, len(ims) * (h + strip) + (len(ims) + 1) * a.gap), '#121216')
    d = ImageDraw.Draw(W)
    for ri, (title, paths) in enumerate(rows):
        y = a.gap + ri * (h + strip + a.gap)
        for ci, im in enumerate(ims[ri]):
            x = a.gap + ci * (w + a.gap)
            lab = (title + ' · ' if title else '') + (next(lab_iter, '') if not a.rows else paths[ci].split('/')[-1])
            d.text((x + 6, y + 10), lab, fill='#f0f0f0')
            W.paste(im, (x, y + strip))
    if a.scale != 1.0: W = W.resize((int(W.width * a.scale), int(W.height * a.scale)), Image.LANCZOS)
    W.save(a.out); print(f'wrote {a.out} ({W.width}x{W.height})')

if __name__ == '__main__':
    main()

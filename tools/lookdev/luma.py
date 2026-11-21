#!/usr/bin/env python3
"""lookdev/luma.py — measured brightness, so "too dark" / "washed out" are numbers, not opinions.

  python3 tools/lookdev/luma.py shot.png [--crop 0.1,0.45,0.9,0.8] [--ref games/bunny-hop/reference/frame-2.jpg --refcrop 0.3,0.6,0.7,0.9]

Reports Rec.601 mean luma (0-255), % of pixels below 25 (near-black), % at/above 250 (clipped) for the crop
(fractions of width/height). With --ref, prints the same for a reference frame and the delta. This is the method
the Bunny Hop visual summit used: road target mean 70-100, < 5 % near-black (reference frames read 85-121).
"""
import argparse
from PIL import Image

def measure(path, crop):
    im = Image.open(path).convert('L'); W, H = im.size
    x0, y0, x1, y1 = crop
    c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    h = c.histogram(); n = sum(h) or 1
    return {'mean': round(sum(i * v for i, v in enumerate(h)) / n, 1),
            'nearBlackPct': round(sum(h[:25]) / n * 100, 1), 'clippedPct': round(sum(h[250:]) / n * 100, 1)}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('image')
    ap.add_argument('--crop', default='0,0,1,1'); ap.add_argument('--ref'); ap.add_argument('--refcrop')
    a = ap.parse_args(); cr = [float(v) for v in a.crop.split(',')]
    m = measure(a.image, cr); print(f'{a.image}: {m}')
    if a.ref:
        r = measure(a.ref, [float(v) for v in (a.refcrop or a.crop).split(',')]); print(f'{a.ref}: {r}')
        print(f'delta mean {m["mean"] - r["mean"]:+.1f}, near-black {m["nearBlackPct"] - r["nearBlackPct"]:+.1f} pts')

if __name__ == '__main__':
    main()

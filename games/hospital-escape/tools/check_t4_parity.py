#!/usr/bin/env python3
"""Compare BEFORE vs AFTER 390x844 T4-PERF screenshots: PSNR (dB), mean/max abs pixel diff, and 8x diff SBS sheets."""
import argparse
import glob
import json
import math
import os
import numpy as np
from PIL import Image, ImageDraw


def metrics(a, b):
    diff = np.abs(a.astype(np.float32) - b.astype(np.float32))
    mse = float(np.mean(diff ** 2))
    psnr = 999.0 if mse < 1e-10 else 10.0 * math.log10((255.0 * 255.0) / mse)
    return {
        'psnr_db': round(psnr, 2),
        'mean_abs': round(float(np.mean(diff)), 3),
        'max_abs': int(np.max(diff)),
        'mse': round(mse, 4),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', required=True)
    ap.add_argument('--min-psnr', type=float, default=44.0)
    args = ap.parse_args()

    befores = sorted(glob.glob(os.path.join(args.dir, 'before-*.png')))
    report = []
    sheet_rows = []
    for bp in befores:
        name = os.path.basename(bp)[len('before-'):-len('.png')]
        ap_path = os.path.join(args.dir, f'after-{name}.png')
        if not os.path.exists(ap_path):
            continue
        ia = Image.open(bp).convert('RGB')
        ib = Image.open(ap_path).convert('RGB')
        if ia.size != ib.size:
            ib = ib.resize(ia.size, Image.LANCZOS)
        aa = np.asarray(ia)
        ab = np.asarray(ib)
        m = metrics(aa, ab)
        m['view'] = name
        report.append(m)

        # Save per-view 3-panel SBS sheet (BEFORE | AFTER | 8x DIFF)
        diff8 = np.clip(np.abs(aa.astype(np.int16) - ab.astype(np.int16)) * 8, 0, 255).astype(np.uint8)
        idiff = Image.fromarray(diff8, 'RGB')
        w, h = ia.size
        sbs = Image.new('RGB', (w * 3 + 24, h + 44), (12, 16, 22))
        dr = ImageDraw.Draw(sbs)
        dr.text((8, 12), f'{name} | PSNR={m["psnr_db"]} dB | mean={m["mean_abs"]} | max={m["max_abs"]}', fill=(220, 236, 245))
        dr.text((8, 28), 'BEFORE (baseline)', fill=(160, 200, 215))
        dr.text((w + 16, 28), 'AFTER (optimized)', fill=(160, 220, 180))
        dr.text((w * 2 + 24, 28), 'ABS DIFF x8', fill=(240, 180, 160))
        sbs.paste(ia, (0, 44))
        sbs.paste(ib, (w + 12, 44))
        sbs.paste(idiff, (w * 2 + 24, 44))
        sbs.save(os.path.join(args.dir, f'SBS-parity-{name}.png'), optimize=True)
        sheet_rows.append(sbs)

        status = 'PASS' if m['psnr_db'] >= args.min_psnr else 'WARN'
        print(f'[{status}] {name:20s} | PSNR={m["psnr_db"]:6.2f} dB | mean_abs={m["mean_abs"]:5.3f} | max_abs={m["max_abs"]:3d}')

    with open(os.path.join(args.dir, 'parity-report.json'), 'w') as f:
        json.dump(report, f, indent=2)

    if any(r['psnr_db'] < args.min_psnr for r in report):
        raise SystemExit(1)


if __name__ == '__main__':
    main()

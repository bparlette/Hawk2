#!/usr/bin/env python3
"""Generate 1024x1024 PBR albedo, roughness, and normal maps for CAST-QUALITY figures:
  1. cole_{color,rough,nm}.jpg          (White_M_3_Casual @ 1.80m — fixes boxy skin-leg defect -> hospital pajama pants + grippy socks)
  2. hale_{color,rough,nm}.jpg          (g-White_M_2_Casual @ 1.78m — silver hair, slate-blue shirt/tie, charcoal slacks, leather shoes)
  3. patient_lying_{color,rough,nm}.jpg (g-Hispanic_M_2_Casual @ 1.74m — sage hospital tee/shorts + bare anatomic calves + grippy socks)
  4. nurse_f_{color,rough,nm}.jpg       (Hispanic_F_1_Util @ 1.64m — auburn hair, ceil-blue/teal scrubs + 3/4 sleeves + hospital sneakers)
  5. nurse_m_{color,rough,nm}.jpg       (g-Black_M_3_Casual @ 1.76m — dark slate-teal scrubs + bare forearms + hospital shoes)

Uses /opt/homebrew/bin/blender for normalized meter UV rasterization (cached as *_cq_uv.npz) and Pillow/NumPy for texel painting.
Run via: uv run --with pillow --with numpy python3 games/hospital-escape-leaders-neon/tools/gen_cast_quality_textures.py
"""
import argparse
import os
import subprocess
import numpy as np
from PIL import Image

BLENDER_BIN = '/opt/homebrew/bin/blender'

RASTER_PY = r"""
import bpy, sys, numpy as np, os

glb_path, out_dir, prefix, target_h_s = sys.argv[-4], sys.argv[-3], sys.argv[-2], sys.argv[-1]
target_h = float(target_h_s)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

body = bpy.data.objects['H_DDS_HighRes']
mat = body.data.materials[0]
imgs = [n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
for i, img in enumerate(imgs):
    p = os.path.join(out_dir, f'{prefix}_raw_{i}.png')
    img.filepath_raw = p
    img.file_format = 'PNG'
    img.save()

meshes = [body]
for ename in ('h_L_eye', 'h_R_eye'):
    eo = bpy.data.objects.get(ename)
    if eo:
        meshes.append(eo)

dg = bpy.context.evaluated_depsgraph_get()
eb_b = body.evaluated_get(dg)
em_b = eb_b.to_mesh()
mw_b = body.matrix_world
raw_zs = [(mw_b @ v.co).z for v in em_b.vertices]
z_min, z_max = min(raw_zs), max(raw_zs)
sc = target_h / max(1e-5, (z_max - z_min))
eb_b.to_mesh_clear()

def bone_zone(bname):
    n = bname
    if any(k in n for k in ('Eye',)):
        return 6
    if any(k in n for k in ('Head', 'Neck')):
        return 1
    if any(k in n for k in ('Hand', 'Finger', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky')):
        return 3
    if any(k in n for k in ('Foot', 'Toe')):
        return 5
    if any(k in n for k in ('Hips', 'UpLeg', 'Leg')):
        return 4
    if any(k in n for k in ('Spine', 'Shoulder', 'Arm', 'ForeArm')):
        return 2
    return 1

S = 1024
x_buf = np.zeros((S, S), dtype=np.float32)
y_buf = np.zeros((S, S), dtype=np.float32)
z_buf = np.zeros((S, S), dtype=np.float32)
zone_buf = np.zeros((S, S), dtype=np.uint8)
arm_buf = np.zeros((S, S), dtype=np.float32)

for obj in meshes:
    is_eye_obj = obj.name in ('h_L_eye', 'h_R_eye')
    eb = obj.evaluated_get(dg)
    me = eb.to_mesh()
    mw = obj.matrix_world
    uv_layer = me.uv_layers[0].data
    vg_names = [g.name for g in obj.vertex_groups]

    n_v = len(me.vertices)
    v_pos = np.zeros((n_v, 3), dtype=np.float32)
    v_zone = np.zeros((n_v,), dtype=np.uint8)
    v_arm = np.zeros((n_v,), dtype=np.float32)
    for i, v in enumerate(me.vertices):
        wp = mw @ v.co
        v_pos[i] = (wp.x * sc, wp.y * sc, (wp.z - z_min) * sc)
        if is_eye_obj:
            v_zone[i] = 6
        elif v.groups:
            top_g = max(v.groups, key=lambda g: g.weight)
            bn = vg_names[top_g.group] if top_g.group < len(vg_names) else ''
            v_zone[i] = bone_zone(bn)
            fw = 0.0
            for g in v.groups:
                gn = vg_names[g.group] if g.group < len(vg_names) else ''
                if 'ForeArm' in gn:
                    fw += g.weight * 0.55
                elif 'Hand' in gn or 'Finger' in gn or 'Thumb' in gn:
                    fw += g.weight
            v_arm[i] = fw

    me.calc_loop_triangles()
    for tri in me.loop_triangles:
        vis = tri.vertices
        lis = tri.loops
        uvs = np.array([[uv_layer[li].uv.x, 1.0 - uv_layer[li].uv.y] for li in lis], dtype=np.float32)
        pxs = uvs * (S - 1)
        x0 = max(0, int(np.floor(pxs[:, 0].min())))
        x1 = min(S - 1, int(np.ceil(pxs[:, 0].max())))
        y0 = max(0, int(np.floor(pxs[:, 1].min())))
        y1 = min(S - 1, int(np.ceil(pxs[:, 1].max())))
        if x1 < x0 or y1 < y0:
            continue
        ax, ay = pxs[0]; bx, by = pxs[1]; cx, cy = pxs[2]
        denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(denom) < 1e-8:
            continue
        xs = np.arange(x0, x1 + 1, dtype=np.float32)[None, :]
        ys = np.arange(y0, y1 + 1, dtype=np.float32)[:, None]
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / denom
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / denom
        w2 = 1.0 - w0 - w1
        m = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not np.any(m):
            continue
        p0, p1, p2 = v_pos[vis[0]], v_pos[vis[1]], v_pos[vis[2]]
        wx = w0 * p0[0] + w1 * p1[0] + w2 * p2[0]
        wy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1]
        wz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
        ad = w0 * v_arm[vis[0]] + w1 * v_arm[vis[1]] + w2 * v_arm[vis[2]]
        z_tri = np.array([v_zone[vis[0]], v_zone[vis[1]], v_zone[vis[2]]], dtype=np.uint8)
        dom_z = z_tri[np.argmax(np.stack([w0, w1, w2], axis=-1), axis=-1)]
        x_buf[y0:y1+1, x0:x1+1][m] = wx[m]
        y_buf[y0:y1+1, x0:x1+1][m] = wy[m]
        z_buf[y0:y1+1, x0:x1+1][m] = wz[m]
        zone_buf[y0:y1+1, x0:x1+1][m] = dom_z[m]
        arm_buf[y0:y1+1, x0:x1+1][m] = ad[m]
    eb.to_mesh_clear()

np.savez_compressed(os.path.join(out_dir, f'{prefix}_cq_uv.npz'),
                    x=x_buf, y=y_buf, z=z_buf, zone=zone_buf, arm=arm_buf)
print(f'RASTERIZED {prefix}: valid_px={(zone_buf>0).sum()} eyes={(zone_buf==6).sum()}')
"""


def run_raster(glb_path, out_dir, prefix, target_h):
    npz_path = os.path.join(out_dir, f'{prefix}_cq_uv.npz')
    raw0 = os.path.join(out_dir, f'{prefix}_raw_0.png')
    raw1 = os.path.join(out_dir, f'{prefix}_raw_1.png')
    if os.path.exists(npz_path) and os.path.exists(raw0) and os.path.exists(raw1):
        return npz_path, raw0, raw1
    subprocess.check_call([
        BLENDER_BIN, '-b', '--factory-startup', '--python-expr', RASTER_PY,
        '--', glb_path, out_dir, prefix, str(target_h)
    ])
    return npz_path, raw0, raw1


def hex_rgb(hx):
    hx = hx.lstrip('#')
    return np.array([int(hx[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32)


def tint_preserving_folds(raw_f, base_rgb, contrast=0.65, mean_ref=128.0, lo=0.62, hi=1.28):
    lum = 0.299 * raw_f[..., 0] + 0.587 * raw_f[..., 1] + 0.114 * raw_f[..., 2]
    factor = np.clip(1.0 + contrast * ((lum - mean_ref) / max(1.0, mean_ref)), lo, hi)
    return np.clip(base_rgb[None, None, :] * factor[..., None], 0.0, 212.0)


def dilate_rgb_and_gray(rgb, gray, valid_mask, passes=14):
    out_rgb = rgb.copy()
    out_g = gray.copy()
    mask = valid_mask.copy()
    for _ in range(passes):
        inv = ~mask
        if not np.any(inv):
            break
        acc = np.zeros_like(out_rgb, dtype=np.float32)
        acc_g = np.zeros_like(out_g, dtype=np.float32)
        cnt = np.zeros(mask.shape, dtype=np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            m_s = np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
            r_s = np.roll(np.roll(out_rgb, dy, axis=0), dx, axis=1)
            g_s = np.roll(np.roll(out_g, dy, axis=0), dx, axis=1)
            acc[m_s] += r_s[m_s]
            acc_g[m_s] += g_s[m_s]
            cnt[m_s] += 1.0
        fill = inv & (cnt > 0)
        if not np.any(fill):
            break
        out_rgb[fill] = acc[fill] / cnt[fill, None]
        out_g[fill] = acc_g[fill] / cnt[fill]
        mask |= fill
    return np.clip(out_rgb, 0, 255).astype(np.uint8), np.clip(out_g, 0, 255).astype(np.uint8)


def linear_max_of(rgb_u8, mask):
    if not np.any(mask):
        return 0.0
    srgb = rgb_u8[mask].astype(np.float32) / 255.0
    lin = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    return float(lin.max())


def save_pbr(out_dir, prefix, out_rgb, rough, nm_out, valid_mask, eye_mask):
    # Clamp all visible skin/cloth/shoe texels to <= ~212 sRGB (0.65 linear) so T4 panels never clip
    non_eye = valid_mask & (~eye_mask)
    out_rgb[non_eye] = np.minimum(out_rgb[non_eye], 212.0)
    keep = valid_mask | eye_mask
    out_u8, rough_u8 = dilate_rgb_and_gray(out_rgb, rough, keep, passes=14)
    nm_u8, _ = dilate_rgb_and_gray(nm_out, rough, keep, passes=12)
    max_lin = linear_max_of(out_u8, non_eye)
    Image.fromarray(out_u8, 'RGB').save(os.path.join(out_dir, f'{prefix}_color.jpg'), quality=92)
    Image.fromarray(rough_u8, 'L').save(os.path.join(out_dir, f'{prefix}_rough.jpg'), quality=90)
    Image.fromarray(nm_u8, 'RGB').save(os.path.join(out_dir, f'{prefix}_nm.jpg'), quality=90)
    print(f'WROTE {prefix}_{{color,rough,nm}}.jpg | max_linear_albedo={max_lin:.3f}')


def load_base(glb_path, out_dir, prefix, target_h):
    npz_p, raw0_p, raw1_p = run_raster(glb_path, out_dir, prefix, target_h)
    uv = np.load(npz_p)
    raw = np.array(Image.open(raw0_p).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    nm = np.array(Image.open(raw1_p).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    hsv = np.array(Image.open(raw0_p).convert('HSV').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    return uv, raw, nm, hsv[..., 1] / 255.0, hsv[..., 2] / 255.0


def build_common_masks(uv, raw, cloth_check_fn, h_scale=1.0, hair_rb_max=34.0, hair_lum_max=150.0):
    """Exact geometric + UV-island + raw-chroma segmentation shared by the VALID 1024x1024 human atlas."""
    S = 1024
    yy = np.arange(S)[:, None]
    xx = np.arange(S)[None, :]
    wx, wy, wz, zone = uv['x'], uv['y'], uv['z'], uv['zone']
    valid = zone > 0
    eye_uv = (zone == 6)
    # Restrict mouth/teeth boxes STRICTLY to Head/mouth zone (zone == 1) so sleeves, calves, and shoes NEVER get blackened!
    mouth_uv = (zone == 1) & (
        ((xx >= 565) & (xx <= 885) & (yy >= 374) & (yy <= 455)) |
        ((xx >= 230) & (xx <= 540) & (yy >= 900)) |
        ((xx >= 850) & (yy < 130)) |
        ((xx < 230) & (yy >= 860))
    )
    cloth_raw = cloth_check_fn(raw)
    collar = (zone == 1) & (yy >= 455) & (yy <= 585) & (xx >= 85) & (xx <= 585) & (~eye_uv) & (~mouth_uv) & ((wz < 1.47 * h_scale) | cloth_raw)
    shirt_island = valid & (zone == 2) & (xx >= 675) & (yy >= 445) & (~eye_uv)
    sl_hi = valid & (zone == 2) & (xx >= 615) & (xx <= 865) & (yy >= 175) & (yy <= 420)
    sl_lo = valid & (zone == 2) & (xx >= 25) & (xx <= 285) & (yy >= 730) & (yy <= 1015)
    shirt_body = valid & (zone == 2) & ((uv['arm'] < 0.09) | shirt_island | (cloth_raw & (uv['arm'] < 0.35))) & (~eye_uv) & (~mouth_uv)
    sleeves = (sl_hi | sl_lo | (valid & (zone == 2) & (uv['arm'] >= 0.08))) & (~mouth_uv) & (~eye_uv)

    # Organic 3D face + neck protection (never rectangular UV chops across cheeks or eye corners!)
    lum = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    rb = raw[..., 0] - raw[..., 2]
    in_face_front = (zone == 1) & (wy < 0.008) & (np.abs(wx) < 0.095 * h_scale) & (wz < 1.715 * h_scale)
    is_hair = (zone == 1) & (~in_face_front) & (~collar) & (~eye_uv) & (~mouth_uv) & (wz > 1.56 * h_scale) & (
        ((rb < hair_rb_max) & (lum < hair_lum_max)) | (wz > 1.695 * h_scale)
    )
    return {
        'valid': valid, 'eye': eye_uv, 'collar': collar, 'mouth': mouth_uv,
        'shirt_body': shirt_body, 'sleeves': sleeves, 'hair': is_hair,
    }


def build_cole_fixed(valid_dir, out_dir):
    """Fix Cole (White_M_3_Casual @ 1.80m): hospital gown + gauze + relaxed pale-blue-grey drawstring pajama trousers + non-slip socks."""
    glb = os.path.join(valid_dir, 'White_M_3_Casual.glb')
    uv, raw, nm, sat, val = load_base(glb, out_dir, 'cole', 1.80)
    wx, wy, wz, zone, armdist = uv['x'], uv['y'], uv['z'], uv['zone'], uv['arm']
    M = build_common_masks(uv, raw, lambda im: (np.abs(im[..., 0] - im[..., 2]) < 24) & (im[..., 0] > 105))
    valid, eye_uv, is_hair = M['valid'], M['eye'], M['hair']

    out = raw.copy()
    rough = np.full((1024, 1024), 128.0, dtype=np.float32)

    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#2B1D14'), contrast=0.65, mean_ref=65.0)[is_hair]
    rough[is_hair] = 224.0

    # Hospital gown top + clean full sleeves right to sculpted wrist cuff (avoids cutting mid-forearm across cuff fold)
    sleeve_cloth = M['sleeves'] & (armdist < 0.62)
    gown_top = (M['shirt_body'] | M['collar'] | sleeve_cloth) & (~eye_uv)
    lum = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    belt_fix = gown_top & (wz > 0.90) & (wz < 1.04)
    raw_lum = np.where(belt_fix, 155.0 + 0.12 * (lum - 155.0), np.clip(lum, 108.0, 190.0))
    gown_fac = np.clip(1.0 + 0.55 * ((raw_lum - 155.0) / 155.0), 0.74, 1.20)
    gw_col = hex_rgb('#8FA6B2')[None, None, :] * gown_fac[..., None]
    dots = np.hypot(np.mod((wx * 36.0 + wy * 14.0), 1.0) - 0.5, np.mod(wz * 36.0, 1.0) - 0.5) < 0.12
    gw_col[dots] = np.clip(gw_col[dots] * 1.08, 0, 192)
    out[gown_top] = gw_col[gown_top]
    rough[gown_top] = 232.0

    # FIXED LOWER LEGS: full-length relaxed hospital pajama trousers over ALL of zone==4 (down to ankle wz >= 0.095)
    pajama_m = valid & (zone == 4) & (wz >= 0.095) & (~eye_uv)
    raw_pj = raw.copy()
    lum_pj = np.where(wz < 0.22, np.clip(lum, 110.0, 152.0), lum)
    raw_pj[..., 0] = raw_pj[..., 1] = raw_pj[..., 2] = lum_pj
    pj_col = tint_preserving_folds(raw_pj, hex_rgb('#6B8391'), contrast=0.65, mean_ref=128.0)
    pj_stripe = np.abs(np.sin(wx * 140.0 + wy * 90.0)) > 0.92
    pj_col[pj_stripe] *= 0.92
    waist_m = pajama_m & (wz > 0.90) & (wz < 1.02)
    pj_col[waist_m] = tint_preserving_folds(raw_pj, hex_rgb('#5C717D'), contrast=0.40, mean_ref=110.0)[waist_m]
    out[pajama_m] = pj_col[pajama_m]
    rough[pajama_m] = 232.0

    # Non-slip hospital grip socks strictly on foot geometry (zone == 5 or leg below 0.095)
    socks_m = valid & ((zone == 5) | ((zone == 4) & (wz < 0.095))) & (~eye_uv)
    raw_sk = np.full_like(raw, 96.0)
    raw_sk[..., 0] = raw_sk[..., 1] = raw_sk[..., 2] = np.clip(lum, 70.0, 128.0)
    sock_col = tint_preserving_folds(raw_sk, hex_rgb('#A8A399'), contrast=0.25, mean_ref=96.0)
    sole_dots = socks_m & (wz < 0.028) & (np.hypot(np.mod(wx * 45.0, 1.0) - 0.5, np.mod(wy * 45.0, 1.0) - 0.5) < 0.24)
    sock_col[sole_dots] = hex_rgb('#686D72')
    out[socks_m] = sock_col[socks_m]
    rough[socks_m] = 236.0

    uv_bare_cloth = M['sleeves'] & (armdist >= 0.62)
    skin_m = valid & (~is_hair) & (~gown_top) & (~pajama_m) & (~socks_m) & (~eye_uv) & (~M['mouth'])
    sk = raw.copy()
    sk[..., 0] = np.clip(raw[..., 0] * 0.90, 0, 208)
    sk[..., 1] = np.clip(raw[..., 1] * 0.85, 0, 198)
    sk[..., 2] = np.clip(raw[..., 2] * 0.81, 0, 190)
    out[skin_m] = sk[skin_m]
    out[uv_bare_cloth] = tint_preserving_folds(raw, hex_rgb('#C59476'), contrast=0.25, mean_ref=128.0)[uv_bare_cloth]
    rough[skin_m] = 128.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 32.0
    out[M['mouth']] = raw[M['mouth']] * 0.72
    rough[M['mouth']] = 140.0

    nm_out = nm.copy()
    nm_out[socks_m] = np.array([128.0, 128.0, 255.0], dtype=np.float32)
    save_pbr(out_dir, 'cole', out, rough, nm_out, valid, eye_uv)


def build_hale_textures(opus_valid_dir, out_dir):
    glb = os.path.join(opus_valid_dir, 'g-White_M_2_Casual.glb')
    uv, raw, nm, sat, val = load_base(glb, out_dir, 'hale', 1.78)
    wx, wy, wz, zone, armdist = uv['x'], uv['y'], uv['z'], uv['zone'], uv['arm']
    # g-White_M_2_Casual: black shirt/cuffs/collar (< 56 RGB), warm brown hair (override above smooth forehead hairline!)
    M = build_common_masks(uv, raw, lambda im: (im[..., 0] < 56) & (im[..., 1] < 56) & (im[..., 2] < 56), h_scale=1.78 / 1.80, hair_rb_max=72.0, hair_lum_max=190.0)
    valid, eye_uv = M['valid'], M['eye']
    lum = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    rb = raw[..., 0] - raw[..., 2]
    # g-White_M_2_Casual: protect central face features + warm forehead/cheek + chin shadow while capturing full sideburns as silver
    yy_px = np.arange(1024)[:, None]
    xx_px = np.arange(1024)[None, :]
    ear_island = (xx_px < 155) & (yy_px >= 400) & (yy_px <= 730)
    face_front = (zone == 1) & (wy < -0.055) & (np.abs(wx) < 0.064) & (wz < 1.682)
    warm_skin = (zone == 1) & (wy < -0.015) & (np.abs(wx) < 0.082) & (wz < 1.706) & (lum >= 122.0) & (rb > 20.0)
    chin_neck = (zone == 1) & (wy < -0.015) & (np.abs(wx) < 0.062) & (wz < 1.600)
    skin_keep = face_front | warm_skin | chin_neck | ear_island
    is_hair = (zone == 1) & (~skin_keep) & (~M['collar']) & (~eye_uv) & (~M['mouth']) & (wz > 1.56) & (
        (lum < 138.0) | (wz >= 1.706) | ((yy_px < 136) & (wz > 1.688)) | (wy > 0.012)
    )

    out = raw.copy()
    rough = np.full((1024, 1024), 132.0, dtype=np.float32)

    # Distinguished silver-grey hair with visible strand shading
    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#8D939B'), contrast=0.50, mean_ref=95.0)[is_hair]
    rough[is_hair] = 205.0

    # Slate-blue dress shirt (wz >= 1.036) + navy necktie (white open doctor lab coat overlays torso/arms in 3D!)
    shirt_m = ((M['shirt_body'] & (wz >= 1.036)) | M['collar'] | (M['sleeves'] & (armdist < 0.42))) & (~eye_uv)
    raw_sh = np.clip(raw, 0.0, 128.0)
    sh_col = tint_preserving_folds(raw_sh, hex_rgb('#5D7994'), contrast=0.50, mean_ref=62.0)
    tie_m = shirt_m & (wy < -0.04) & (np.abs(wx) < 0.024) & (wz >= 1.036) & (wz < 1.48)
    sh_col[tie_m] = tint_preserving_folds(raw_sh, hex_rgb('#1F2C40'), contrast=0.40, mean_ref=62.0)[tie_m]
    out[shirt_m] = sh_col[shirt_m]
    rough[shirt_m] = 220.0

    # Charcoal dress slacks (including zone == 2 below wz < 1.036 jeans waist) + dark charcoal leather belt
    pants_m = valid & ((zone == 4) | ((zone == 2) & (wz < 1.036))) & (~shirt_m) & (~eye_uv)
    belt_m = pants_m & (wz >= 0.992) & (wz <= 1.036)
    pants_col = tint_preserving_folds(np.clip(raw, 80.0, 210.0), hex_rgb('#292E36'), contrast=0.45, mean_ref=160.0)
    pants_col[belt_m] = tint_preserving_folds(np.clip(raw, 90.0, 200.0), hex_rgb('#1B1D21'), contrast=0.25, mean_ref=150.0)[belt_m]
    out[pants_m] = pants_col[pants_m]
    rough[pants_m] = 226.0
    rough[belt_m] = 140.0

    # Dark leather dress shoes
    shoes_m = valid & (zone == 5) & (~eye_uv)
    out[shoes_m] = tint_preserving_folds(raw, hex_rgb('#1D1E22'), contrast=0.60, mean_ref=180.0)[shoes_m]
    rough[shoes_m] = 108.0

    skin_m = valid & (~is_hair) & (~shirt_m) & (~pants_m) & (~shoes_m) & (~eye_uv) & (~M['mouth'])
    sk = raw.copy()
    sk[..., 0] = np.clip(raw[..., 0] * 0.88, 0, 206)
    sk[..., 1] = np.clip(raw[..., 1] * 0.85, 0, 196)
    sk[..., 2] = np.clip(raw[..., 2] * 0.82, 0, 188)
    out[skin_m] = sk[skin_m]
    rough[skin_m] = 132.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 32.0
    out[M['mouth']] = raw[M['mouth']] * 0.72
    rough[M['mouth']] = 140.0

    nm_out = nm.copy()
    nm_out[shoes_m] = 0.5 * nm_out[shoes_m] + 0.5 * np.array([128.0, 128.0, 255.0], dtype=np.float32)
    save_pbr(out_dir, 'hale', out, rough, nm_out, valid, eye_uv)


def build_patient_lying_textures(opus_valid_dir, out_dir):
    """Build g-Hispanic_M_2_Casual @ 1.74m in sage hospital top + shorts + bare anatomic calves + non-slip socks."""
    glb = os.path.join(opus_valid_dir, 'g-Hispanic_M_2_Casual.glb')
    uv, raw, nm, sat, val = load_base(glb, out_dir, 'patient_lying', 1.74)
    wx, wy, wz, zone, armdist = uv['x'], uv['y'], uv['z'], uv['zone'], uv['arm']
    # g-Hispanic_M_2_Casual: blue shirt/cuffs/collar has B > R + 10
    M = build_common_masks(uv, raw, lambda im: (im[..., 2] - im[..., 0]) > 10.0, h_scale=1.74 / 1.80)
    valid, eye_uv, is_hair = M['valid'], M['eye'], M['hair']

    out = raw.copy()
    rough = np.full((1024, 1024), 132.0, dtype=np.float32)

    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#221A15'), contrast=0.45, mean_ref=70.0)[is_hair]
    rough[is_hair] = 220.0

    top_m = (M['shirt_body'] | M['collar'] | (M['sleeves'] & (armdist < 0.21))) & (~eye_uv)
    # Follow sculpted shorts geometry seam cleanly; smooth upper shorts waist contrast so gown-to-shorts meets softly
    shorts_m = valid & (zone == 4) & ((wz >= 0.72) | ((wz >= 0.62) & (sat < 0.25))) & (~eye_uv)
    cloth_m = top_m | shorts_m
    lum = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    gw = tint_preserving_folds(raw, hex_rgb('#869992'), contrast=0.45, mean_ref=128.0)
    dots = np.hypot(np.mod((wx * 36.0 + wy * 14.0), 1.0) - 0.5, np.mod(wz * 36.0, 1.0) - 0.5) < 0.11
    gw[dots] = np.clip(gw[dots] * 1.07, 0, 192)
    out[top_m] = gw[top_m]
    raw_sh = raw.copy()
    raw_sh[..., 0] = raw_sh[..., 1] = raw_sh[..., 2] = np.clip(lum, 108.0, 175.0)
    out[shorts_m] = tint_preserving_folds(raw_sh, hex_rgb('#768983'), contrast=0.42, mean_ref=145.0)[shorts_m]
    rough[cloth_m] = 232.0

    socks_m = valid & ((zone == 5) | ((zone == 4) & (wz < 0.145))) & (~eye_uv)
    raw_sk = np.full_like(raw, 96.0)
    raw_sk[..., 0] = raw_sk[..., 1] = raw_sk[..., 2] = np.clip(lum, 70.0, 128.0)
    out[socks_m] = tint_preserving_folds(raw_sk, hex_rgb('#A8A49A'), contrast=0.22, mean_ref=96.0)[socks_m]
    rough[socks_m] = 236.0

    skin_m = valid & (~is_hair) & (~cloth_m) & (~socks_m) & (~eye_uv) & (~M['mouth'])
    sk = raw.copy()
    sk[..., 0] = np.clip(raw[..., 0] * 0.90, 0, 206)
    sk[..., 1] = np.clip(raw[..., 1] * 0.87, 0, 196)
    sk[..., 2] = np.clip(raw[..., 2] * 0.83, 0, 188)
    out[skin_m] = sk[skin_m]
    rough[skin_m] = 130.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 32.0
    out[M['mouth']] = raw[M['mouth']] * 0.72
    rough[M['mouth']] = 140.0

    nm_out = nm.copy()
    nm_out[socks_m] = np.array([128.0, 128.0, 255.0], dtype=np.float32)
    save_pbr(out_dir, 'patient_lying', out, rough, nm_out, valid, eye_uv)


def build_nurse_female_textures(valid_dir, out_dir):
    glb = os.path.join(valid_dir, 'Hispanic_F_1_Util.glb')
    uv, raw, nm, sat, val = load_base(glb, out_dir, 'nurse_f', 1.64)
    wx, wy, wz, zone, armdist = uv['x'], uv['y'], uv['z'], uv['zone'], uv['arm']
    M = build_common_masks(uv, raw, lambda im: (im[..., 0] - im[..., 2]) < 42.0, h_scale=1.64 / 1.80, hair_rb_max=48.0, hair_lum_max=185.0)
    valid, eye_uv = M['valid'], M['eye']

    lum = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    rb = raw[..., 0] - raw[..., 2]
    in_face_front = (zone == 1) & (wy < -0.015) & (np.abs(wx) < 0.088) & (wz < 1.59)
    # Capture 100% of crown, sideburns & back/lower ponytail hair without ever dipping below eyebrows
    is_hair = (zone == 1) & (~in_face_front) & (~M['collar']) & (~eye_uv) & (~M['mouth']) & (
        ((wz > 1.445) & ((wz > 1.555) | (wy > 0.008) | ((rb < 42.0) & (lum < 170.0)))) |
        ((wz > 1.38) & (lum < 72.0))
    )

    out = raw.copy()
    rough = np.full((1024, 1024), 148.0, dtype=np.float32)

    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#6E472D'), contrast=0.25, mean_ref=68.0)[is_hair]
    rough[is_hair] = 198.0

    # V-neck cutout strictly on upper torso (zone == 2) + neck base collar band ONLY (never hits chin/lips!)
    v_half = 0.044 * np.clip((wz - 1.245) / 0.145, 0.0, 1.0)
    v_neck = valid & ((zone == 2) | M['collar']) & (wy < -0.020) & (np.abs(wx) < v_half) & (wz >= 1.245) & (wz <= 1.46)
    sleeve_cloth = M['sleeves'] & (armdist < 0.25)
    scrub_top = (M['shirt_body'] | M['collar'] | sleeve_cloth) & (~v_neck) & (~is_hair) & (~eye_uv) & (~M['mouth'])
    scrub_pants = valid & (zone == 4) & (wz > 0.12) & (~eye_uv)
    shoes_m = valid & ((zone == 5) | ((zone == 4) & (wz <= 0.12))) & (~eye_uv)

    top_col = tint_preserving_folds(raw, hex_rgb('#4A8596'), contrast=0.58, mean_ref=102.0)
    hem_v = scrub_top & (wy < -0.020) & (np.abs(wx) < v_half + 0.010) & (wz >= 1.235) & (wz <= 1.47)
    top_col[hem_v] = tint_preserving_folds(raw, hex_rgb('#366877'), contrast=0.35, mean_ref=102.0)[hem_v]
    out[scrub_top] = top_col[scrub_top]
    out[scrub_pants] = tint_preserving_folds(raw, hex_rgb('#3E7585'), contrast=0.60, mean_ref=102.0)[scrub_pants]
    out[shoes_m] = tint_preserving_folds(raw, hex_rgb('#A2A8AE'), contrast=0.45, mean_ref=58.0)[shoes_m]
    rough[scrub_top | scrub_pants] = 226.0
    rough[shoes_m] = 165.0

    skin_rgb = hex_rgb('#B9886A')
    uv_bare_cloth = M['sleeves'] & (armdist >= 0.25)
    skin_m = valid & (~is_hair) & (~scrub_top) & (~scrub_pants) & (~shoes_m) & (~eye_uv) & (~M['mouth'])
    sk_nat = raw.copy()
    sk_nat[..., 0] = np.clip(raw[..., 0] * 0.91, 0, 208)
    sk_nat[..., 1] = np.clip(raw[..., 1] * 0.88, 0, 198)
    sk_nat[..., 2] = np.clip(raw[..., 2] * 0.84, 0, 190)
    out[skin_m] = sk_nat[skin_m]
    out[v_neck | uv_bare_cloth] = tint_preserving_folds(raw, skin_rgb, contrast=0.22, mean_ref=102.0)[v_neck | uv_bare_cloth]
    rough[skin_m] = 148.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 32.0
    out[M['mouth']] = raw[M['mouth']] * 0.72
    rough[M['mouth']] = 140.0

    nm_out = nm.copy()
    nm_out[is_hair] = 0.3 * nm_out[is_hair] + 0.7 * np.array([128.0, 128.0, 255.0], dtype=np.float32)
    save_pbr(out_dir, 'nurse_f', out, rough, nm_out, valid, eye_uv)


def build_nurse_male_textures(opus_valid_dir, out_dir):
    glb = os.path.join(opus_valid_dir, 'g-Black_M_3_Casual.glb')
    uv, raw, nm, sat, val = load_base(glb, out_dir, 'nurse_m', 1.76)
    wx, wy, wz, zone, armdist = uv['x'], uv['y'], uv['z'], uv['zone'], uv['arm']
    # g-Black_M_3_Casual: neutral-grey shirt/cuffs/collar have |r-b| < 22 & r > 68
    M = build_common_masks(uv, raw, lambda im: (np.abs(im[..., 0] - im[..., 2]) < 22.0) & (im[..., 0] > 68.0), h_scale=1.76 / 1.80)
    valid, eye_uv, is_hair = M['valid'], M['eye'], M['hair']

    out = raw.copy()
    rough = np.full((1024, 1024), 168.0, dtype=np.float32)

    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#171413'), contrast=0.45, mean_ref=45.0)[is_hair]
    rough[is_hair] = 224.0

    v_half = 0.042 * np.clip((wz - 1.325) / 0.145, 0.0, 1.0)
    v_neck = valid & ((zone == 2) | M['collar']) & (wy < -0.020) & (np.abs(wx) < v_half) & (wz >= 1.325) & (wz <= 1.54)
    sleeve_cloth = M['sleeves'] & (armdist < 0.21)
    scrub_top = (M['shirt_body'] | M['collar'] | sleeve_cloth) & (~v_neck) & (~is_hair) & (~eye_uv) & (~M['mouth'])
    scrub_pants = valid & (zone == 4) & (~eye_uv)
    shoes_m = valid & (zone == 5) & (~eye_uv)

    top_col = tint_preserving_folds(raw, hex_rgb('#365E6B'), contrast=0.55, mean_ref=128.0)
    hem_v = scrub_top & (wy < -0.020) & (np.abs(wx) < v_half + 0.010) & (wz >= 1.315) & (wz <= 1.54)
    top_col[hem_v] = tint_preserving_folds(raw, hex_rgb('#254652'), contrast=0.35, mean_ref=128.0)[hem_v]
    out[scrub_top] = top_col[scrub_top]
    out[scrub_pants] = tint_preserving_folds(raw, hex_rgb('#2D505C'), contrast=0.60, mean_ref=138.0)[scrub_pants]
    out[shoes_m] = tint_preserving_folds(raw, hex_rgb('#686E74'), contrast=0.55, mean_ref=65.0)[shoes_m]
    rough[scrub_top | scrub_pants] = 226.0
    rough[shoes_m] = 160.0

    skin_m = valid & (~is_hair) & (~scrub_top) & (~scrub_pants) & (~shoes_m) & (~eye_uv) & (~M['mouth'])
    out[skin_m] = np.clip(raw * 0.94, 0, 196)[skin_m]
    out[v_neck] = tint_preserving_folds(raw, hex_rgb('#5E3B2B'), contrast=0.22, mean_ref=128.0)[v_neck]
    rough[skin_m] = 172.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 32.0
    out[M['mouth']] = raw[M['mouth']] * 0.72
    rough[M['mouth']] = 140.0

    nm_out = nm.copy()
    save_pbr(out_dir, 'nurse_m', out, rough, nm_out, valid, eye_uv)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--valid-dir', default='/tmp/neon_cast_pass/src')
    ap.add_argument('--opus-valid-dir', default='/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-3d-sample-opus/valid')
    ap.add_argument('--out-dir', default='/tmp/neon_cast_pass/tex')
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    build_cole_fixed(args.valid_dir, args.out_dir)
    build_hale_textures(args.opus_valid_dir, args.out_dir)
    build_patient_lying_textures(args.opus_valid_dir, args.out_dir)
    build_nurse_female_textures(args.valid_dir, args.out_dir)
    build_nurse_male_textures(args.opus_valid_dir, args.out_dir)


if __name__ == '__main__':
    main()

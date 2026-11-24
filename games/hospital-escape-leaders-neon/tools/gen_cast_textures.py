#!/usr/bin/env python3
"""Generate 1024x1024 PBR albedo, roughness, and normal maps for Neon's Mixamo Cast Pass
on MIT VALID bodies (Maya Vance: Hispanic_F_1_Util, Cole Mercer: White_M_3_Casual,
plus Gunman: White_M_1_Util) using exact Blender UV + dominant-bone + world-coord rasterization.
"""
import argparse, os, shutil, subprocess, json
import numpy as np
from PIL import Image, ImageFilter

BLENDER_BIN = '/Applications/Blender.app/Contents/MacOS/Blender'

RASTER_PY = r"""
import bpy, sys, numpy as np, os

glb_path, tex_out_dir, prefix = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
body = bpy.data.objects['H_DDS_HighRes']

# Save native albedo + normal textures from GLB material
mat = body.data.materials[0]
imgs = [n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
for i, img in enumerate(imgs):
    p = os.path.join(tex_out_dir, f'{prefix}_raw_{i}.png')
    img.filepath_raw = p; img.file_format = 'PNG'; img.save()

# Evaluate deformed rest mesh in world meters
dg = bpy.context.evaluated_depsgraph_get()
eb = body.evaluated_get(dg)
me = eb.to_mesh()
mw = body.matrix_world
uv_layer = me.uv_layers[0].data
vg_names = [g.name for g in body.vertex_groups]

# Bone group -> semantic zone ID:
# 1=head/neck, 2=torso/arms, 3=hands/fingers, 4=hips/legs, 5=feet/toes
def bone_zone(bname):
    n = bname
    if any(k in n for k in ('Head', 'Neck', 'Eye')): return 1
    if any(k in n for k in ('Hand', 'Finger', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky')): return 3
    if any(k in n for k in ('Foot', 'Toe')): return 5
    if any(k in n for k in ('Hips', 'UpLeg', 'Leg')): return 4
    if any(k in n for k in ('Spine', 'Shoulder', 'Arm', 'ForeArm')): return 2
    return 1

n_v = len(me.vertices)
v_pos = np.zeros((n_v, 3), dtype=np.float32)
v_zone = np.zeros((n_v,), dtype=np.int32)
v_armdist = np.zeros((n_v,), dtype=np.float32) # forearm skin bleed cue
for i, v in enumerate(me.vertices):
    wp = mw @ v.co
    v_pos[i] = (wp.x, wp.y, wp.z)
    if v.groups:
        top_g = max(v.groups, key=lambda g: g.weight)
        bn = vg_names[top_g.group] if top_g.group < len(vg_names) else ''
        v_zone[i] = bone_zone(bn)
        # Weight toward lower forearm/wrist for 3/4 sleeve cut
        fw = 0.0
        for g in v.groups:
            gn = vg_names[g.group] if g.group < len(vg_names) else ''
            if 'ForeArm' in gn: fw += g.weight * 0.5
            elif 'Hand' in gn or 'Finger' in gn or 'Thumb' in gn: fw += g.weight
        v_armdist[i] = fw

S = 1024
z_buf = np.zeros((S, S), dtype=np.float32)
x_buf = np.zeros((S, S), dtype=np.float32)
y_buf = np.zeros((S, S), dtype=np.float32)
zone_buf = np.zeros((S, S), dtype=np.uint8)
arm_buf = np.zeros((S, S), dtype=np.float32)

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
    if x1 < x0 or y1 < y0: continue
    ax, ay = pxs[0]; bx, by = pxs[1]; cx, cy = pxs[2]
    denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(denom) < 1e-8: continue
    xs = np.arange(x0, x1 + 1, dtype=np.float32)[None, :]
    ys = np.arange(y0, y1 + 1, dtype=np.float32)[:, None]
    w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / denom
    w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / denom
    w2 = 1.0 - w0 - w1
    m = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
    if not np.any(m): continue
    p0, p1, p2 = v_pos[vis[0]], v_pos[vis[1]], v_pos[vis[2]]
    wx = w0 * p0[0] + w1 * p1[0] + w2 * p2[0]
    wy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1]
    wz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
    ad = w0 * v_armdist[vis[0]] + w1 * v_armdist[vis[1]] + w2 * v_armdist[vis[2]]
    # Dominant vertex zone
    z_tri = np.array([v_zone[vis[0]], v_zone[vis[1]], v_zone[vis[2]]], dtype=np.uint8)
    w_stack = np.stack([w0, w1, w2], axis=-1)
    dom_z = z_tri[np.argmax(w_stack, axis=-1)]
    sub_z = z_buf[y0:y1+1, x0:x1+1]
    sub_x = x_buf[y0:y1+1, x0:x1+1]
    sub_y = y_buf[y0:y1+1, x0:x1+1]
    sub_zn = zone_buf[y0:y1+1, x0:x1+1]
    sub_ad = arm_buf[y0:y1+1, x0:x1+1]
    sub_z[m] = wz[m]; sub_x[m] = wx[m]; sub_y[m] = wy[m]; sub_zn[m] = dom_z[m]; sub_ad[m] = ad[m]

eb.to_mesh_clear()
np.savez_compressed(os.path.join(tex_out_dir, f'{prefix}_uv.npz'),
                    x=x_buf, y=y_buf, z=z_buf, zone=zone_buf, arm=arm_buf)
print(f'SAVED UV RASTER: {prefix}_uv.npz')
"""

def run_raster(glb_path, out_dir, prefix):
    npz_path = os.path.join(out_dir, f'{prefix}_uv.npz')
    raw0 = os.path.join(out_dir, f'{prefix}_raw_0.png')
    raw1 = os.path.join(out_dir, f'{prefix}_raw_1.png')
    if os.path.exists(npz_path) and os.path.exists(raw0) and os.path.exists(raw1):
        return npz_path, raw0, raw1
    subprocess.check_call([
        BLENDER_BIN, '--background', '--python-expr', RASTER_PY, '--', glb_path, out_dir, prefix
    ])
    return npz_path, raw0, raw1

def dilate_rgb_and_gray(rgb, gray, valid_mask, passes=12):
    out_rgb = rgb.copy()
    out_g = gray.copy()
    mask = valid_mask.copy()
    for _ in range(passes):
        inv = ~mask
        if not np.any(inv): break
        # 4-neighbor dilation via roll
        acc = np.zeros_like(out_rgb, dtype=np.float32)
        acc_g = np.zeros_like(out_g, dtype=np.float32)
        cnt = np.zeros(mask.shape, dtype=np.float32)
        for dy, dx in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)):
            m_s = np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
            r_s = np.roll(np.roll(out_rgb, dy, axis=0), dx, axis=1)
            g_s = np.roll(np.roll(out_g, dy, axis=0), dx, axis=1)
            acc[m_s] += r_s[m_s]
            acc_g[m_s] += g_s[m_s]
            cnt[m_s] += 1.0
        fill = inv & (cnt > 0)
        if not np.any(fill): break
        out_rgb[fill] = acc[fill] / cnt[fill, None]
        out_g[fill] = acc_g[fill] / cnt[fill]
        mask |= fill
    return np.clip(out_rgb, 0, 255).astype(np.uint8), np.clip(out_g, 0, 255).astype(np.uint8)

def hex_rgb(hx):
    hx = hx.lstrip('#')
    return np.array([int(hx[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32)

def tint_preserving_folds(raw_f, base_rgb, contrast=0.72, mean_ref=128.0):
    lum = (0.299 * raw_f[..., 0] + 0.587 * raw_f[..., 1] + 0.114 * raw_f[..., 2])
    # Center folds softly around 1.0 so olive/grey shifts cleanly without darkening shadows into black
    factor = np.clip(1.0 + contrast * ((lum - mean_ref) / max(1.0, mean_ref)), 0.55, 1.38)
    return base_rgb[None, None, :] * factor[..., None]

def build_maya_textures(valid_dir, out_dir):
    glb = os.path.join(valid_dir, 'Hispanic_F_1_Util.glb')
    npz_p, raw0_p, raw1_p = run_raster(glb, out_dir, 'maya')
    uv = np.load(npz_p)
    wz, wx, wy, zone = uv['z'], uv['x'], uv['y'], uv['zone']
    raw = np.array(Image.open(raw0_p).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    nm  = np.array(Image.open(raw1_p).convert('RGB').resize((1024, 1024), Image.LANCZOS))
    S = 1024
    valid = zone > 0

    # Eye sockets only live in two circles at top-left & top-center-right (NOT the crown hair strip between x=210..445!)
    yy_idx = np.arange(S)[:, None]
    xx_idx = np.arange(S)[None, :]
    eye_uv = (yy_idx < 130) & (((xx_idx > 75) & (xx_idx < 210)) | ((xx_idx > 445) & (xx_idx < 580)))
    hsv = np.array(Image.open(raw0_p).convert('HSV').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    sat = hsv[..., 1] / 255.0
    val = hsv[..., 2] / 255.0
    r, g, b = raw[..., 0], raw[..., 1], raw[..., 2]

    # Identify front face vs hair vs clothes cleanly (keep neck/face strictly free of hair/cloth leaks)
    in_face_front = (zone == 1) & (wy < -0.015) & (np.abs(wx) < 0.095) & (wz < 1.67)
    # Shirt collar extends up to wz=1.515 on zone 1/2 (low r-b <= 28..32; skin has r-b > 65)
    is_hair = (zone == 1) & (~in_face_front) & (~eye_uv) & (wz > 1.515) & (
        (wz > 1.615) | (wy > 0.015) | (((r - b) < 35) & (val < 0.68))
    )
    is_cloth = valid & (wz < 1.535) & (
        ((zone == 2) & ((r - b) <= 32)) |
        ((zone == 4) | (zone == 5)) |
        ((zone == 1) & (wz < 1.515) & ((r - b) < 28))
    )
    is_skin = valid & (~is_hair) & (~is_cloth) & (~eye_uv)

    out = raw.copy()
    rough = np.full((S, S), 122.0, dtype=np.float32) # default 0.48 skin

    # Hair: deep dark brown #14100E, low contrast + high roughness so back crown has zero glare
    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#14100E'), contrast=0.18, mean_ref=65.0)[is_hair]
    rough[is_hair] = 206.0

    # Skin calibration: warm olive-tan (#9B6B4C harmony without muddying eyes/lips)
    face_skin = is_skin
    skin_tint = raw.copy()
    skin_tint[..., 0] = np.clip(raw[..., 0] * 0.90, 0, 255)
    skin_tint[..., 1] = np.clip(raw[..., 1] * 0.87, 0, 255)
    skin_tint[..., 2] = np.clip(raw[..., 2] * 0.82, 0, 255)
    eye_sclera = (zone == 1) & (val > 0.72) & (sat < 0.16)
    skin_tint[eye_sclera] = raw[eye_sclera] * 0.92
    out[face_skin] = skin_tint[face_skin]
    rough[face_skin] = 122.0 # 0.48

    # Lower clothing region: Maya utility jacket #3F4649 down to mid-hip z=0.84 (+ sleeves),
    # slim indigo jeans #1F2A44 from z=0.84 down to boot cuff z=0.14, combat boots #3B2A20 below z=0.14
    jacket_m = is_cloth & ((wz >= 0.84) | ((zone == 2) & (wz >= 0.78)))
    jeans_m  = is_cloth & (~jacket_m) & (wz > 0.14) & (zone == 4)
    boots_m  = is_cloth & (~jacket_m) & (~jeans_m)

    jj_col = tint_preserving_folds(raw, hex_rgb('#3F4649'), contrast=0.80, mean_ref=102.0)
    zipper = jacket_m & (wy < -0.02) & (np.abs(wx) < 0.014) & (wz < 1.44)
    jj_col[zipper] *= 0.65
    out[jacket_m] = jj_col[jacket_m]
    rough[jacket_m] = 214.0 # 0.84

    dn_col = tint_preserving_folds(raw, hex_rgb('#1F2A44'), contrast=0.85, mean_ref=98.0)
    out[jeans_m] = dn_col[jeans_m]
    rough[jeans_m] = 230.0 # 0.90

    bt_col = tint_preserving_folds(raw, hex_rgb('#3B2A20'), contrast=0.90, mean_ref=58.0)
    out[boots_m] = bt_col[boots_m]
    rough[boots_m] = 148.0 # 0.58

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 35.0

    nm_out = nm.copy().astype(np.float32)
    nm_out[is_hair] = 0.25 * nm_out[is_hair] + 0.75 * np.array([128.0, 128.0, 255.0])
    keep_m = valid | eye_uv
    out_u8, rough_u8 = dilate_rgb_and_gray(out, rough, keep_m, passes=14)
    nm_u8, _ = dilate_rgb_and_gray(nm_out, rough, keep_m, passes=10)
    Image.fromarray(out_u8, 'RGB').save(os.path.join(out_dir, 'maya_color.jpg'), quality=92)
    Image.fromarray(rough_u8, 'L').save(os.path.join(out_dir, 'maya_rough.jpg'), quality=90)
    Image.fromarray(nm_u8, 'RGB').save(os.path.join(out_dir, 'maya_nm.jpg'), quality=90)
    print('WROTE Maya PBR: maya_{color,rough,nm}.jpg')

def build_cole_textures(valid_dir, out_dir):
    glb = os.path.join(valid_dir, 'White_M_3_Casual.glb')
    npz_p, raw0_p, raw1_p = run_raster(glb, out_dir, 'cole')
    uv = np.load(npz_p)
    wz, wx, wy, zone, armdist = uv['z'], uv['x'], uv['y'], uv['zone'], uv['arm']
    raw = np.array(Image.open(raw0_p).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    nm  = np.array(Image.open(raw1_p).convert('RGB').resize((1024, 1024), Image.LANCZOS))
    S = 1024
    valid = zone > 0
    yy_idx = np.arange(S)[:, None]
    xx_idx = np.arange(S)[None, :]
    eye_uv = (yy_idx < 130) & (((xx_idx > 75) & (xx_idx < 210)) | ((xx_idx > 445) & (xx_idx < 580)))

    r, g, b = raw[..., 0], raw[..., 1], raw[..., 2]
    hsv = np.array(Image.open(raw0_p).convert('HSV').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    sat = hsv[..., 1] / 255.0
    val = hsv[..., 2] / 255.0

    # Strictly protect face/ears/nostrils/neck: ONLY head top/back hair (wz > 1.59) counts as hair, collar below wz=1.52 counts as cloth
    in_face_front = (zone == 1) & (wy < 0.005) & (np.abs(wx) < 0.095) & (wz < 1.725)
    is_hair = (zone == 1) & (~in_face_front) & (wz > 1.575) & ((r - b) < 28) & (val < 0.50)
    is_cloth_orig = valid & (
        ((zone == 2) & ((r - b) <= 26)) |
        (zone == 4) |
        (zone == 5) |
        ((zone == 1) & (wz < 1.53) & ((r - b) < 22))
    ) & (~eye_uv)
    is_skin = valid & (~is_hair) & (~is_cloth_orig) & (~eye_uv)

    out = raw.copy()
    rough = np.full((S, S), 128.0, dtype=np.float32) # 0.50 skin default

    # Hair: dark tousled #2B1D14 (rough 0.88 -> 224)
    out[is_hair] = tint_preserving_folds(raw, hex_rgb('#2B1D14'), contrast=0.70, mean_ref=65.0)[is_hair]
    rough[is_hair] = 224.0

    # Pale battered skin (#B98668) preserving natural facial shading
    bare_skin_col = hex_rgb('#B98668')
    face_skin = is_skin
    cole_face = raw.copy()
    cole_face[..., 0] = np.clip(raw[..., 0] * 0.90, 0, 255)
    cole_face[..., 1] = np.clip(raw[..., 1] * 0.85, 0, 255)
    cole_face[..., 2] = np.clip(raw[..., 2] * 0.81, 0, 255)
    out[face_skin] = cole_face[face_skin]
    rough[face_skin] = 128.0

    # Hospital gown: torso + 3/4 sleeves + upper thigh gown hem >= 0.58m!
    sleeve_cut = (armdist > 0.28)
    gown_m = is_cloth_orig & (~sleeve_cut) & ((wz >= 0.58) | ((zone == 2) & (wz >= 0.55))) & (zone != 5)
    bare_limbs = (is_cloth_orig & (~gown_m)) | (valid & (wz < 0.58) & (~face_skin) & (~eye_uv))

    # Suppress dark waist belt stripe on raw Casual3 texture (belt sits at wz ~ 0.94..1.005)
    lum_gown = 0.299 * raw[..., 0] + 0.587 * raw[..., 1] + 0.114 * raw[..., 2]
    # Replace dark belt/buckle luminance with smooth neutral 155.0 so gown drapes smoothly past waist!
    belt_fix = gown_m & (wz > 0.92) & (wz < 1.03)
    raw_gown_lum = np.where(belt_fix, 155.0 + 0.15 * (lum_gown - 155.0), np.clip(lum_gown, 108.0, 198.0))
    gown_factor = np.clip(1.0 + 0.65 * ((raw_gown_lum - 155.0) / 155.0), 0.72, 1.24)
    gw_col = hex_rgb('#90A8B4')[None, None, :] * gown_factor[..., None]

    uu = np.mod((wx * 38.0 + wy * 16.0), 1.0)
    vv = np.mod(wz * 38.0, 1.0)
    dots = (np.hypot(uu - 0.5, vv - 0.5) < 0.14)
    gw_col[dots] = np.clip(gw_col[dots] * 1.12, 0, 195)
    back_slit = gown_m & (wy > 0.03) & (np.abs(wx) < 0.010) & (wz > 0.64) & (wz < 1.48)
    gw_col[back_slit] = bare_skin_col * 0.86

    # Bloodstained left-flank abdomen gauze dressing cleanly above waist at wz=1.06..1.20
    dress_r = np.hypot((wx - 0.088) / 0.052, (wz - 1.13) / 0.065)
    gauze_m = gown_m & (wy < -0.02) & (dress_r < 1.0)
    blood_m = gown_m & (wy < -0.02) & (dress_r < 0.60) & ((np.sin(wx * 95.0) * np.cos(wz * 110.0)) > -0.35)
    gw_col[gauze_m] = tint_preserving_folds(raw, hex_rgb('#CFCBC4'), contrast=0.30, mean_ref=155.0)[gauze_m]
    gw_col[blood_m] = tint_preserving_folds(raw, hex_rgb('#B02824'), contrast=0.40, mean_ref=150.0)[blood_m]

    out[gown_m] = gw_col[gown_m]
    rough[gown_m] = 232.0
    rough[gauze_m] = 242.0

    # Bare lower legs, forearms, ankles & bare feet in battered pale skin (#B98668, zero sneakers!)
    foot_shade = np.clip(0.92 + 0.08 * np.cos(wz * 18.0), 0.84, 1.02)[..., None]
    foot_tint = bare_skin_col[None, None, :] * foot_shade
    out[bare_limbs] = foot_tint[bare_limbs]
    rough[bare_limbs] = 136.0

    out[eye_uv] = raw[eye_uv] * 0.90
    rough[eye_uv] = 35.0

    # Smooth footwear normal map over bare feet (zone==5) so sneaker lace bumps vanish cleanly!
    nm_out = nm.copy().astype(np.float32)
    foot_area = (zone == 5) | ((wz < 0.16) & valid)
    nm_out[foot_area] = np.array([128.0, 128.0, 255.0])

    keep_m = valid | eye_uv
    out_u8, rough_u8 = dilate_rgb_and_gray(out, rough, keep_m, passes=14)
    nm_u8, _ = dilate_rgb_and_gray(nm_out, rough, keep_m, passes=10)
    Image.fromarray(out_u8, 'RGB').save(os.path.join(out_dir, 'cole_color.jpg'), quality=92)
    Image.fromarray(rough_u8, 'L').save(os.path.join(out_dir, 'cole_rough.jpg'), quality=90)
    Image.fromarray(nm_u8, 'RGB').save(os.path.join(out_dir, 'cole_nm.jpg'), quality=90)
    print('WROTE Cole PBR: cole_{color,rough,nm}.jpg')

def polish_gunman_textures(valid_dir, gunman_src, out_dir):
    glb = os.path.join(valid_dir, 'White_M_1_Util.glb')
    npz_p, _, _ = run_raster(glb, out_dir, 'gunman')
    uv = np.load(npz_p)
    wz, wx, wy, zone = uv['z'], uv['x'], uv['y'], uv['zone']
    valid = zone > 0
    col_src = os.path.join(gunman_src, 'util_v2_color.jpg')
    rgh_src = os.path.join(gunman_src, 'util_v2_rough.jpg')
    nm_src  = os.path.join(gunman_src, 'util_v2_nm.jpg')
    col = np.array(Image.open(col_src).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    rgh = np.array(Image.open(rgh_src).convert('L').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    nm  = np.array(Image.open(nm_src).convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)

    # Clean dark leather waist belt covering waist seam + buckle accent + seam gutter dilation
    belt_m = valid & ((zone == 2) | (zone == 4)) & (wz >= 0.955) & (wz <= 1.030)
    buckle_m = belt_m & (wy < -0.04) & (np.abs(wx) < 0.026) & (wz >= 0.965) & (wz <= 1.015)
    col[belt_m] = np.array([28.0, 29.0, 32.0], dtype=np.float32)
    rgh[belt_m] = 152.0
    col[buckle_m] = np.array([78.0, 82.0, 88.0], dtype=np.float32)
    rgh[buckle_m] = 95.0

    # Dilate valid UV texels outward across black jacket-waist & collar gutters
    col_u8, rgh_u8 = dilate_rgb_and_gray(col, rgh, valid, passes=14)
    nm_u8, _ = dilate_rgb_and_gray(nm, rgh, valid, passes=14)
    Image.fromarray(col_u8, 'RGB').save(os.path.join(out_dir, 'gunman_color.jpg'), quality=92)
    Image.fromarray(rgh_u8, 'L').save(os.path.join(out_dir, 'gunman_rough.jpg'), quality=90)
    Image.fromarray(nm_u8, 'RGB').save(os.path.join(out_dir, 'gunman_nm.jpg'), quality=90)
    print('WROTE Gunman PBR (waist-polished): gunman_{color,rough,nm}.jpg')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--valid-dir', default='/tmp/neon_cast_pass/src')
    ap.add_argument('--out-dir', default='/tmp/neon_cast_pass/tex')
    ap.add_argument('--gunman-src', default='/tmp/neon_leaders')
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    polish_gunman_textures(args.valid_dir, args.gunman_src, args.out_dir)
    build_maya_textures(args.valid_dir, args.out_dir)
    build_cole_textures(args.valid_dir, args.out_dir)

if __name__ == '__main__':
    main()

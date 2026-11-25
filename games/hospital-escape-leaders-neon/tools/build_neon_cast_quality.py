#!/usr/bin/env python3
"""Neon CAST-QUALITY Rigged Figure Builder (Blender 5.2.3 LTS headless)

Builds / refreshes first-class rigged 3D MIT VALID cast GLBs in
games/hospital-escape-leaders-neon/assets/cast-pass/:
  1. cole-mixamo.glb          — refreshed w/ fixed pajama-trouser + non-slip sock textures & calibrated bed offsets
  2. patient-lying-mixamo.glb — distinct lying patient (g-Hispanic_M_2_Casual @ 1.74m, sage hospital top/shorts + bare anatomic calves + IV pad)
  3. dr-hale-mixamo.glb       — Dr. Hale (g-White_M_2_Casual @ 1.78m, silver hair, open BVHTree white lab coat <=0.62 lin, wire glasses, clipboard)
  4. nurse-female-mixamo.glb  — Female nurse (Hispanic_F_1_Util @ 1.64m, auburn hair bun, ceil-teal scrubs, BVHTree stethoscope, ID badge, staff clips)
  5. nurse-male-mixamo.glb    — Male nurse (g-Black_M_3_Casual @ 1.76m, dark slate-teal scrubs, ID badge, hip pager, staff clips)

Exports cast-quality-manifest.json and updates cole's entry in cast-pass-manifest.json.
"""
import argparse
import json
import math
import os
import sys

import bpy
import bmesh
import mathutils
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_neon_cast_pass as bncp


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--mixamo-dir', default='/tmp/neon_cast_pass/mixamo_fbx')
    ap.add_argument('--valid-dir', default='/tmp/neon_cast_pass/src')
    ap.add_argument('--opus-valid-dir', default='/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-3d-sample-opus/valid')
    ap.add_argument('--tex-dir', default='/tmp/neon_cast_pass/tex')
    ap.add_argument('--out-dir', default='/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass')
    return ap.parse_args(argv)


def measure_bed_offsets(arm, body_obj, actions, bed_clips=('Lay_Breathless', 'Lay_Sleeping', 'Lay_Moaning'), mattress_y=0.72):
    """Measure exact dorsal spine/pelvis Z across lying clips and compute mattress-flush offset."""
    dg = bpy.context.evaluated_depsgraph_get()
    mw = body_obj.matrix_world
    me_rest = body_obj.data
    vg_names = [g.name for g in body_obj.vertex_groups]
    dorsal_ids = {i for i, n in enumerate(vg_names) if any(k in n for k in ('Hips', 'Spine', 'UpLeg', 'Leg', 'Head', 'Neck'))}
    dorsal_vis = [v.index for v in me_rest.vertices if any(g.group in dorsal_ids and g.weight > 0.35 for g in v.groups)]

    offsets = {}
    for cname in bed_clips:
        act = next((a for a in actions if a.name == cname), None)
        if not act:
            continue
        arm.animation_data.action = act
        f0, f1 = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        sample_frames = sorted({f0, (f0 + f1) // 2, f1})
        min_zs, hips_zs = [], []
        for f in sample_frames:
            bpy.context.scene.frame_set(f)
            bpy.context.view_layer.update()
            em = body_obj.evaluated_get(dg).to_mesh()
            zs = [(mw @ em.vertices[vi].co).z for vi in dorsal_vis]
            body_obj.evaluated_get(dg).to_mesh_clear()
            if zs:
                min_zs.append(min(zs))
            hips_zs.append((arm.matrix_world @ arm.pose.bones['Hips'].matrix).translation.z)
        mean_min_z = sum(min_zs) / max(1, len(min_zs))
        mean_hips_z = sum(hips_zs) / max(1, len(hips_zs))
        offsets[cname] = {
            'dorsal_min_y_m': round(mean_min_z, 4),
            'hips_y_m': round(mean_hips_z, 4),
            'bed_dy_for_mattress_072m': round(mattress_y - mean_min_z, 4),
        }
    return offsets


def build_shorts_to_slacks_deform(body_obj, z_lo=0.64, z_hi=0.73):
    """Smooth the shorts hem shelf around mid-thigh & gently taper dress slacks on g-White_M_2_Casual."""
    vg_names = [g.name for g in body_obj.vertex_groups]
    leg_ids = {i for i, n in enumerate(vg_names) if 'Leg' in n or 'UpLeg' in n}
    for side in (-1.0, 1.0):
        # Compute upper-thigh & knee axis to blend shorts rim subtly without pinching
        knee_pts = [v.co for v in body_obj.data.vertices
                    if (0.48 <= v.co.z <= 0.56) and (v.co.x * side > 0.02)
                    and any(g.group in leg_ids and g.weight > 0.35 for g in v.groups)]
        if not knee_pts:
            continue
        kx = sum(p.x for p in knee_pts) / len(knee_pts)
        ky = sum(p.y for p in knee_pts) / len(knee_pts)
        for v in body_obj.data.vertices:
            wz = v.co.z
            if v.co.x * side > 0.02 and any(g.group in leg_ids and g.weight > 0.35 for g in v.groups):
                if z_lo <= wz <= z_hi:
                    t = 1.0 - abs(wz - 0.685) / 0.045
                    sc_t = 1.0 - 0.12 * max(0.0, t)
                    v.co.x = kx + (v.co.x - kx) * sc_t
                    v.co.y = ky + (v.co.y - ky) * sc_t
                elif 0.14 <= wz <= 0.45:
                    # Slight trouser drape over bare lower calf above dress shoe
                    sc_t = 1.07
                    v.co.x = kx + (v.co.x - kx) * sc_t
                    v.co.y = ky + (v.co.y - ky) * sc_t


def build_lab_coat(arm, body_obj, body_refs):
    """Build a tailored 3D open white doctor's lab coat directly from _Body topology + exact bone weights."""
    me = body_obj.data
    mw = body_obj.matrix_world
    vg_names = [g.name for g in body_obj.vertex_groups]
    body_mat_idx = next((i for i, m in enumerate(me.materials) if m and m.name == '_Body'), 0)

    head_neck_ids = {i for i, n in enumerate(vg_names) if n in ('Head', 'Neck')}
    hand_ids = {i for i, n in enumerate(vg_names) if any(k in n for k in ('Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky'))}
    arm_ids = {i for i, n in enumerate(vg_names) if 'Arm' in n or 'ForeArm' in n or 'Shoulder' in n}

    def vert_w(vi, gset):
        return sum(g.weight for g in me.vertices[vi].groups if g.group in gset)

    # Precompute torso centerline Y for flared coat skirt wrap below waist
    torso_front_y = [ (mw @ v.co).y for v in me.vertices if 0.96 <= (mw @ v.co).z <= 1.38 and abs((mw @ v.co).x) < 0.18 ]
    tor_cy = 0.5 * (min(torso_front_y) + max(torso_front_y)) if torso_front_y else -0.02

    # Compute forearm wrist cutoff distances along Left/Right ForeArm->Hand so coat cuffs reveal shirt cuffs neatly
    arm_spans = {}
    for side in ('Left', 'Right'):
        p_el = (arm.matrix_world @ arm.pose.bones[f'{side}ForeArm'].matrix).translation
        p_wr = (arm.matrix_world @ arm.pose.bones[f'{side}Hand'].matrix).translation
        vec = p_wr - p_el
        arm_spans[side] = (p_el, vec.normalized(), max(1e-4, vec.length))

    bm_src = bmesh.new()
    bm_src.from_mesh(me)
    bm_src.normal_update()
    v_nrms = {v.index: v.normal.copy() for v in bm_src.verts}

    p_lh_arm = (arm.matrix_world @ arm.pose.bones['LeftHand'].matrix).translation
    p_rh_arm = (arm.matrix_world @ arm.pose.bones['RightHand'].matrix).translation

    # Select closed torso + upper-thigh + sleeve polygons (leave straight trimming to bisect_plane!)
    keep_faces = []
    for f in bm_src.faces:
        if f.material_index != body_mat_idx:
            continue
        vis = [v.index for v in f.verts]
        wps = [mw @ me.vertices[vi].co for vi in vis]
        cen = sum(wps, mathutils.Vector()) / len(wps)
        if any(vert_w(vi, head_neck_ids) > 0.20 or vert_w(vi, hand_ids) > 0.05 for vi in vis):
            continue
        if any((wp - p_lh_arm).length < 0.11 or (wp - p_rh_arm).length < 0.11 for wp in wps):
            continue
        is_arm_face = any(vert_w(vi, arm_ids) > 0.45 for vi in vis)
        if not is_arm_face:
            if cen.z < 0.57 or cen.z > 1.455:
                continue
            if cen.z < 0.88 and abs(cen.x) < 0.075 and cen.y > tor_cy - 0.08:
                continue
        keep_faces.append(f)

    bm = bmesh.new()
    v_map = {}
    for f in keep_faces:
        f_vs = []
        for v in f.verts:
            if v.index not in v_map:
                wp = mw @ v.co
                nrm = (mw.to_3x3() @ v_nrms[v.index]).normalized()
                is_arm_v = vert_w(v.index, arm_ids) > 0.45
                p_out = wp.copy()
                if not is_arm_v and wp.z < 0.96:
                    t_sk = min(1.0, max(0.0, (0.96 - wp.z) / 0.34))
                    dx = wp.x
                    dy = wp.y - tor_cy
                    ang = math.atan2(dy, dx)
                    rx_min = 0.195 + t_sk * 0.022
                    ry_min = 0.135 + t_sk * 0.018
                    if math.hypot(dx / rx_min, dy / ry_min) < 1.0:
                        p_out.x = math.cos(ang) * rx_min
                        p_out.y = tor_cy + math.sin(ang) * ry_min
                    clear = 0.011 + t_sk * 0.010
                elif wp.z > 1.37:
                    clear = 0.0080
                else:
                    clear = 0.0105
                v_map[v.index] = bm.verts.new(p_out + nrm * clear)
            f_vs.append(v_map[v.index])
        try:
            bm.faces.new(f_vs)
        except ValueError:
            pass
    bm_src.free()

    # Smooth skirt drape slightly before planar tailoring cuts
    bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if v.co.z < 0.96 and len(v.link_edges) > 2], factor=0.35, use_axis_x=True, use_axis_y=True, use_axis_z=False)

    # Cut razor-straight bottom skirt hem at z = 0.65
    bmesh.ops.bisect_plane(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        plane_co=(0.0, 0.0, 0.65),
        plane_no=(0.0, 0.0, 1.0),
        clear_inner=True,
    )

    # Cut razor-straight left/right sleeve cuffs perpendicular to forearm at 82% toward wrist
    for side in ('Left', 'Right'):
        p_el, dir_f, span_l = arm_spans[side]
        cuff_pt = p_el + dir_f * (span_l * 0.82)
        cuff_no = dir_f
        sgn_x = 1.0 if side == 'Left' else -1.0
        arm_verts = {v for v in bm.verts if v.co.x * sgn_x > 0.24}
        arm_faces = [f for f in bm.faces if any(v in arm_verts for v in f.verts)]
        arm_edges = list({e for f in arm_faces for e in f.edges})
        arm_geom = list({v for f in arm_faces for v in f.verts}) + arm_edges + arm_faces
        if arm_geom:
            bmesh.ops.bisect_plane(bm, geom=arm_geom, plane_co=cuff_pt, plane_no=cuff_no, clear_outer=True)

    # Cut razor-straight front center coat opening along x = +-0.056 on front faces
    front_faces = [f for f in bm.faces if f.calc_center_median().y < tor_cy - 0.025 and abs(f.calc_center_median().x) < 0.14]
    front_edges = list({e for f in front_faces for e in f.edges})
    front_verts = list({v for f in front_faces for v in f.verts})
    front_geom = front_verts + front_edges + front_faces
    if front_geom:
        bmesh.ops.bisect_plane(bm, geom=front_geom, plane_co=(0.056, 0.0, 1.15), plane_no=(1.0, 0.0, 0.0))
        front_faces = [f for f in bm.faces if f.calc_center_median().y < tor_cy - 0.025 and abs(f.calc_center_median().x) < 0.14]
        front_edges = list({e for f in front_faces for e in f.edges})
        front_verts = list({v for f in front_faces for v in f.verts})
        bmesh.ops.bisect_plane(bm, geom=front_verts + front_edges + front_faces, plane_co=(-0.056, 0.0, 1.15), plane_no=(-1.0, 0.0, 0.0))
        del_faces = [f for f in bm.faces if f.calc_center_median().y < tor_cy - 0.032 and abs(f.calc_center_median().x) < 0.054]
        bmesh.ops.delete(bm, geom=del_faces, context='FACES')
        lone_vs = [v for v in bm.verts if not v.link_faces]
        if lone_vs:
            bmesh.ops.delete(bm, geom=lone_vs, context='VERTS')

    # Solidify cleanly (-0.0040 m inward toward body)
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=-0.0040)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # BVHTree breast pocket welt + folded pocket chart + silver pen snug on Hale's left chest (+X)
    bm_t_ray = bmesh.new()
    vmap_r = {}
    for p in me.polygons:
        if p.material_index == body_mat_idx:
            wps = [mw @ me.vertices[vi].co for vi in p.vertices]
            if any(1.05 < wp.z < 1.44 and abs(wp.x) < 0.22 for wp in wps):
                for vi, wp in zip(p.vertices, wps):
                    if vi not in vmap_r:
                        vmap_r[vi] = bm_t_ray.verts.new(wp)
                try:
                    bm_t_ray.faces.new([vmap_r[vi] for vi in p.vertices])
                except ValueError:
                    pass
    bm_t_ray.normal_update()
    bvh_r = BVHTree.FromBMesh(bm_t_ray)
    loc_p, nrm_p, _, _ = bvh_r.ray_cast(mathutils.Vector((0.095, tor_cy - 0.30, 1.24)), mathutils.Vector((0.0, 1.0, 0.0)), 0.45)
    bm_t_ray.free()
    if loc_p is None:
        loc_p = mathutils.Vector((0.095, tor_cy - 0.115, 1.24))
        nrm_p = mathutils.Vector((0.0, -1.0, 0.0))
    nrm_pf = (nrm_p if nrm_p.y < -0.1 else mathutils.Vector((0.0, -1.0, 0.0))).normalized()
    rot_pq = (-nrm_pf).to_track_quat('Y', 'Z').to_matrix().to_4x4()
    mat_pkt = mathutils.Matrix.Translation(loc_p + nrm_pf * 0.013) @ rot_pq

    bm_acc = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=mat_pkt @ mathutils.Matrix.Diagonal((0.062, 0.008, 0.076, 1.0)))
    bmesh.ops.create_cube(bm_acc, size=1.0, matrix=mat_pkt @ mathutils.Matrix.Translation((0.005, 0.001, 0.046)) @ mathutils.Matrix.Diagonal((0.046, 0.004, 0.028, 1.0)))
    bmesh.ops.create_cone(bm_acc, cap_ends=True, cap_tris=False, segments=8, radius1=0.0038, radius2=0.0038, depth=0.062, matrix=mat_pkt @ mathutils.Matrix.Translation((0.018, -0.003, 0.044)))
    for f in bm.faces:
        f.material_index = 0
    for f in bm_acc.faces:
        f.material_index = 1

    me_out = bpy.data.meshes.new('HaleLabCoat')
    bm.to_mesh(me_out); bm.free()
    bm_full = bmesh.new()
    bm_full.from_mesh(me_out)
    n_coat_verts = len(bm_full.verts)
    for v in bm_acc.verts:
        bm_full.verts.new(v.co)
    bm_full.verts.ensure_lookup_table()
    acc_map = {v: bm_full.verts[n_coat_verts + i] for i, v in enumerate(bm_acc.verts)}
    for f in bm_acc.faces:
        nf = bm_full.faces.new([acc_map[v] for v in f.verts])
        nf.material_index = 1
    bm_acc.free()
    bm_full.to_mesh(me_out); bm_full.free()

    for p in me_out.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new('HaleLabCoat', me_out)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bncp.make_mat('HaleCoatMat', (0.58, 0.565, 0.54, 1.0), rough=0.88, metal=0.0))
    obj.data.materials.append(bncp.make_mat('HaleAccentMat', (0.06, 0.08, 0.11, 1.0), rough=0.35, metal=0.68))

    bncp.transfer_surface_weights(
        arm, body_obj, obj,
        allowed_bones={
            'Hips', 'Spine', 'Spine1', 'Spine2',
            'LeftShoulder', 'RightShoulder', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm',
            'LeftUpLeg', 'RightUpLeg',
        },
        fallback_bone='Spine2',
        project_surface=False,
        body_refs=body_refs,
    )


def build_wire_glasses(arm, body_obj):
    """Build slender dark titanium wire-rim glasses contoured to face eye sockets and ear bridge."""
    mw = arm.matrix_world
    lh = (mw @ arm.pose.bones['LeftEye'].matrix).translation
    rh = (mw @ arm.pose.bones['RightEye'].matrix).translation
    mid = 0.5 * (lh + rh)
    span_x = abs(lh.x - rh.x) * 0.5

    bm = bmesh.new()
    def add_tube(pts, r=0.0022, segs=8):
        rings = []
        for idx, pt in enumerate(pts):
            tang = (pts[min(len(pts) - 1, idx + 1)] - pts[max(0, idx - 1)]).normalized()
            ref = mathutils.Vector((0.0, 0.0, 1.0)) if abs(tang.z) < 0.9 else mathutils.Vector((1.0, 0.0, 0.0))
            u = tang.cross(ref).normalized()
            v = tang.cross(u).normalized()
            rings.append([bm.verts.new(pt + (u * math.cos(2 * math.pi * k / segs) + v * math.sin(2 * math.pi * k / segs)) * r) for k in range(segs)])
        for j in range(len(rings) - 1):
            for k in range(segs):
                k2 = (k + 1) % segs
                bm.faces.new((rings[j][k], rings[j][k2], rings[j + 1][k2], rings[j + 1][k]))

    y_front = mid.y - 0.036
    # Left & right circular-oval wire rims
    for sx in (-1.0, 1.0):
        cx = mid.x + sx * span_x
        cz = mid.z - 0.002
        ring_pts = []
        for k in range(17):
            ang = 2.0 * math.pi * k / 16.0
            ring_pts.append(mathutils.Vector((cx + math.cos(ang) * 0.022, y_front, cz + math.sin(ang) * 0.016)))
        add_tube(ring_pts, r=0.0020)
        # Temple arm to ear top
        ox = cx + sx * 0.022
        add_tube([
            mathutils.Vector((ox, y_front, cz + 0.003)),
            mathutils.Vector((sx * 0.072, y_front + 0.055, cz + 0.004)),
            mathutils.Vector((sx * 0.074, y_front + 0.105, cz - 0.006)),
        ], r=0.0018)
    # Nose bridge + slight arch
    add_tube([
        mathutils.Vector((mid.x - span_x + 0.021, y_front, mid.z + 0.002)),
        mathutils.Vector((mid.x, y_front - 0.004, mid.z + 0.005)),
        mathutils.Vector((mid.x + span_x - 0.021, y_front, mid.z + 0.002)),
    ], r=0.0019)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('HaleGlasses')
    bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new('HaleGlasses', me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bncp.make_mat('HaleGlassesMat', (0.04, 0.044, 0.050, 1.0), rough=0.35, metal=0.72))
    bncp.skin_attach_exact(arm, body_obj, obj, 'Head', action_obj=None)


def build_clipboard(arm, body_obj):
    """Build medical clipboard + matte chart sheet weighted 100% to LeftHand as a separate toggleable mesh."""
    mw = arm.matrix_world
    lh = (mw @ arm.pose.bones['LeftHand'].matrix).translation
    bm = bmesh.new()
    # 0=wood/plastic board, 1=matte chart paper (<=0.60 linear), 2=metal clip
    def add_b(cx, cy, cz, sx, sy, sz, m_idx):
        res = bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((cx, cy, cz)) @ mathutils.Matrix.Diagonal((sx, sy, sz, 1.0)))
        vs = set(res['verts'])
        for f in bm.faces:
            if all(v in vs for v in f.verts):
                f.material_index = m_idx
    add_b(0.0, 0.0, 0.0, 0.21, 0.29, 0.007, 0)
    add_b(0.0, 0.0, 0.005, 0.19, 0.26, 0.003, 1)
    add_b(0.0, 0.132, 0.011, 0.075, 0.022, 0.012, 2)
    me = bpy.data.meshes.new('HaleClipboard')
    bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new('HaleClipboard', me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bncp.make_mat('ClipboardBoardMat', (0.14, 0.09, 0.055, 1.0), rough=0.72, metal=0.0))
    obj.data.materials.append(bncp.make_mat('ClipboardPaperMat', (0.58, 0.56, 0.52, 1.0), rough=0.92, metal=0.0))
    obj.data.materials.append(bncp.make_mat('ClipboardClipMat', (0.42, 0.44, 0.46, 1.0), rough=0.32, metal=0.78))
    # Position snugly beside LeftHand palm at rest
    obj.location = lh + mathutils.Vector((0.025, 0.015, -0.02))
    obj.rotation_euler = (math.pi * 0.45, math.pi * 0.5, 0.0)
    bncp.skin_attach_exact(arm, body_obj, obj, 'LeftHand', action_obj=None, separate_mesh=True)


def build_stethoscope_and_badge(arm, body_obj, body_refs, include_stethoscope=True, include_pager=False, head_z_top=1.64):
    """Build BVHTree-contoured hospital ID lanyard badge, optional stethoscope, and optional hip pager."""
    me = body_obj.data
    mw = body_obj.matrix_world
    vg_names = [g.name for g in body_obj.vertex_groups]
    body_mat_idx = next((i for i, m in enumerate(me.materials) if m and m.name == '_Body'), 0)
    head_ids = {i for i, n in enumerate(vg_names) if n in ('Head',)}
    bad_vs = {v.index for v in me.vertices if any(g.group in head_ids and g.weight > 0.35 for g in v.groups)}

    bm_t = bmesh.new()
    vmap = {}
    pts = []
    for p in me.polygons:
        if p.material_index != body_mat_idx or any(vi in bad_vs for vi in p.vertices):
            continue
        p_wps = [mw @ me.vertices[vi].co for vi in p.vertices]
        if any(0.85 < wp.z < head_z_top - 0.14 and abs(wp.x) < 0.24 for wp in p_wps):
            for vi, wp in zip(p.vertices, p_wps):
                if vi not in vmap:
                    pts.append(wp); vmap[vi] = bm_t.verts.new(wp)
            try:
                bm_t.faces.new([vmap[vi] for vi in p.vertices])
            except ValueError:
                pass
    bm_t.normal_update()
    bvh = BVHTree.FromBMesh(bm_t)
    chest_cy = 0.5 * (min(p.y for p in pts) + max(p.y for p in pts)) if pts else -0.02
    neck_z = (arm.matrix_world @ arm.pose.bones['Neck'].matrix).translation.z

    # 1. Clipped hospital ID badge on right chest (negative X right, front -Y), oriented tangent to chest normal
    orig_b = mathutils.Vector((-0.088, chest_cy - 0.30, neck_z - 0.14))
    loc_b, nrm_b, _, _ = bvh.ray_cast(orig_b, mathutils.Vector((0.0, 1.0, 0.0)), 0.45)
    if loc_b is not None:
        nrm_f = (nrm_b if nrm_b and nrm_b.y < -0.1 else mathutils.Vector((0.0, -1.0, 0.0))).normalized()
        rot_q = (-nrm_f).to_track_quat('Y', 'Z').to_matrix().to_4x4()
        mat_b = mathutils.Matrix.Translation(loc_b + nrm_f * 0.009) @ rot_q
        bm_id = bmesh.new()
        bmesh.ops.create_cube(bm_id, size=1.0, matrix=mat_b @ mathutils.Matrix.Diagonal((0.050, 0.005, 0.074, 1.0)))
        res_bar = bmesh.ops.create_cube(bm_id, size=1.0, matrix=mat_b @ mathutils.Matrix.Translation((0.0, -0.003, 0.023)) @ mathutils.Matrix.Diagonal((0.042, 0.003, 0.013, 1.0)))
        bar_vs = set(res_bar['verts'])
        for f in bm_id.faces:
            f.material_index = 1 if all(v in bar_vs for v in f.verts) else 0
        me_id = bpy.data.meshes.new('StaffBadge')
        bm_id.to_mesh(me_id); bm_id.free()
        obj_id = bpy.data.objects.new('StaffBadge', me_id)
        bpy.context.collection.objects.link(obj_id)
        obj_id.data.materials.append(bncp.make_mat('StaffBadgeMat', (0.58, 0.57, 0.55, 1.0), rough=0.45, metal=0.0))
        obj_id.data.materials.append(bncp.make_mat('StaffBadgeBarMat', (0.04, 0.16, 0.28, 1.0), rough=0.50, metal=0.0))
        bncp.transfer_surface_weights(
            arm, body_obj, obj_id,
            allowed_bones={'Spine1', 'Spine2'}, fallback_bone='Spine2',
            project_surface=True, body_refs=body_refs,
        )

    # 2. BVHTree stethoscope hugging neck tightly & draping down sternum/left-chest (away from badge!)
    if include_stethoscope:
        bm_st = bmesh.new()
        loop_pts = []
        # Left front chestpiece drop -> collar -> back of neck -> right collarbone -> short right tip
        sample_specs = []
        for k in range(6):
            u = k / 5.0
            sample_specs.append((mathutils.Vector((0.048, chest_cy - 0.26, neck_z - 0.18 + u * 0.145)), mathutils.Vector((0.0, 1.0, 0.0)), 0.007))
        for k in range(13):
            u = k / 12.0
            ang = -math.pi * 0.45 + u * math.pi * 0.90  # left-side -> back (+Y) -> right-side closely hugging neck
            orig = mathutils.Vector((math.sin(-ang) * 0.16, chest_cy + math.cos(ang) * 0.18, neck_z + 0.005))
            rdir = (mathutils.Vector((0.0, chest_cy + 0.01, neck_z - 0.025)) - orig).normalized()
            sample_specs.append((orig, rdir, 0.008))
        for k in range(5):
            u = k / 4.0
            sample_specs.append((mathutils.Vector((-0.042, chest_cy - 0.26, neck_z - 0.035 - u * 0.115)), mathutils.Vector((0.0, 1.0, 0.0)), 0.007))

        for orig, rdir, clr in sample_specs:
            loc, nrm, _, _ = bvh.ray_cast(orig, rdir, 0.28)
            if loc is None:
                loc, nrm, _, _ = bvh.find_nearest(orig + rdir * 0.10)
            n = nrm if nrm else -rdir
            if n.dot(-rdir) < 0:
                n = -n
            loop_pts.append(loc + n * clr)

        segs = 8
        rings = []
        for idx, pt in enumerate(loop_pts):
            tang = (loop_pts[min(len(loop_pts) - 1, idx + 1)] - loop_pts[max(0, idx - 1)]).normalized()
            ref = mathutils.Vector((0.0, 0.0, 1.0)) if abs(tang.z) < 0.9 else mathutils.Vector((0.0, 1.0, 0.0))
            u = tang.cross(ref).normalized()
            v = tang.cross(u).normalized()
            rings.append([bm_st.verts.new(pt + (u * math.cos(2 * math.pi * c / segs) + v * math.sin(2 * math.pi * c / segs)) * 0.0046) for c in range(segs)])
        for j in range(len(rings) - 1):
            for c in range(segs):
                c2 = (c + 1) % segs
                bm_st.faces.new((rings[j][c], rings[j][c2], rings[j + 1][c2], rings[j + 1][c]))
        # Chrome diaphragm chestpiece cleanly on nurse's LEFT chest (+X), opposite StaffBadge (-X)
        res_cp = bmesh.ops.create_cone(
            bm_st, cap_ends=True, cap_tris=False, segments=14, radius1=0.018, radius2=0.016, depth=0.009,
            matrix=mathutils.Matrix.Translation(loop_pts[0] + mathutils.Vector((0.0, -0.004, -0.014))) @ mathutils.Matrix.Rotation(math.pi * 0.5, 4, 'X')
        )
        cp_vs = set(res_cp['verts'])
        for f in bm_st.faces:
            f.material_index = 1 if all(v in cp_vs for v in f.verts) else 0
        bmesh.ops.recalc_face_normals(bm_st, faces=bm_st.faces)
        me_st = bpy.data.meshes.new('NurseStethoscope')
        bm_st.to_mesh(me_st); bm_st.free()
        for p in me_st.polygons:
            p.use_smooth = True
        obj_st = bpy.data.objects.new('NurseStethoscope', me_st)
        bpy.context.collection.objects.link(obj_st)
        obj_st.data.materials.append(bncp.make_mat('NurseStethMat', (0.015, 0.017, 0.020, 1.0), rough=0.45, metal=0.05))
        obj_st.data.materials.append(bncp.make_mat('NurseStethMetalMat', (0.38, 0.40, 0.44, 1.0), rough=0.28, metal=0.82))
        bncp.transfer_surface_weights(
            arm, body_obj, obj_st,
            allowed_bones={'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder'},
            fallback_bone='Spine2', project_surface=True, body_refs=body_refs,
        )

    # 3. Optional hip pager snug on male nurse waistband
    if include_pager:
        hip_z = (arm.matrix_world @ arm.pose.bones['Hips'].matrix).translation.z
        orig_pg = mathutils.Vector((0.28, chest_cy - 0.02, hip_z + 0.03))
        loc_pg, nrm_pg, _, _ = bvh.ray_cast(orig_pg, mathutils.Vector((-1.0, 0.0, 0.0)), 0.32)
        if loc_pg is None:
            loc_pg = mathutils.Vector((0.17, chest_cy - 0.02, hip_z + 0.03))
            nrm_pg = mathutils.Vector((1.0, 0.0, 0.0))
        bm_pg = bmesh.new()
        bmesh.ops.create_cube(
            bm_pg, size=1.0,
            matrix=mathutils.Matrix.Translation(loc_pg + mathutils.Vector((0.008, 0.0, 0.0))) @ mathutils.Matrix.Diagonal((0.018, 0.044, 0.032, 1.0))
        )
        me_pg = bpy.data.meshes.new('MaleNursePager')
        bm_pg.to_mesh(me_pg); bm_pg.free()
        obj_pg = bpy.data.objects.new('MaleNursePager', me_pg)
        bpy.context.collection.objects.link(obj_pg)
        obj_pg.data.materials.append(bncp.make_mat('StaffPagerMat', (0.016, 0.018, 0.022, 1.0), rough=0.60, metal=0.10))
        bncp.transfer_surface_weights(
            arm, body_obj, obj_pg,
            allowed_bones={'Hips', 'Spine'}, fallback_bone='Hips',
            project_surface=True, body_refs=body_refs,
        )

    bm_t.free()


def build_nurse_bun(arm, body_obj, head_z_top=1.64):
    """Build neat chestnut-auburn chignon hair bun tucked flush against back crown of Female Nurse."""
    hq = (arm.matrix_world @ arm.pose.bones['Head'].matrix).translation
    mw = body_obj.matrix_world
    back_ys = [(mw @ v.co).y for v in body_obj.data.vertices if (mw @ v.co).z > head_z_top - 0.16 and (mw @ v.co).y > 0.03]
    y_back = max(back_ys) - 0.008 if back_ys else hq.y + 0.095
    bm = bmesh.new()
    res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.050)
    for v in res['verts']:
        v.co.x *= 1.04
        v.co.y *= 0.65
        v.co.z *= 0.90
        v.co += mathutils.Vector((0.0, y_back, head_z_top - 0.115))
    me = bpy.data.meshes.new('NurseHairBun')
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new('NurseHairBun', me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bncp.make_mat('NurseHairMat', (0.11, 0.052, 0.026, 1.0), rough=0.76, metal=0.0))
    bncp.skin_attach_exact(arm, body_obj, obj, 'Head', action_obj=None)


def build_iv_dressing(arm, body_obj, body_refs):
    """Build subtle white gauze IV tape dressing on LeftForeArm for second lying patient."""
    p_el = (arm.matrix_world @ arm.pose.bones['LeftForeArm'].matrix).translation
    p_wr = (arm.matrix_world @ arm.pose.bones['LeftHand'].matrix).translation
    c_pt = p_el.lerp(p_wr, 0.62)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.039, radius2=0.036, depth=0.042,
        matrix=mathutils.Matrix.Translation(c_pt) @ (p_wr - p_el).normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    )
    me = bpy.data.meshes.new('PatientIVWrap')
    bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new('PatientIVWrap', me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bncp.make_mat('PatientIVMat', (0.58, 0.56, 0.52, 1.0), rough=0.92, metal=0.0))
    bncp.transfer_surface_weights(
        arm, body_obj, obj,
        allowed_bones={'LeftForeArm', 'LeftHand'}, fallback_bone='LeftForeArm',
        project_surface=True, body_refs=body_refs,
    )


def build_dr_hale(args):
    print('=== BUILDING DR. HALE (g-White_M_2_Casual -> dr-hale-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = bncp.setup_valid_rig(
        os.path.join(args.opus_valid_dir, 'g-White_M_2_Casual.glb'), 1.78,
        os.path.join(args.tex_dir, 'hale_color.jpg'),
        os.path.join(args.tex_dir, 'hale_rough.jpg'),
        os.path.join(args.tex_dir, 'hale_nm.jpg'),
        decimate_ratio=1.0,
    )
    bncp.restore_rest_state(arm, basis_T0)
    build_shorts_to_slacks_deform(body)
    body_refs = bncp.collect_body_skin_refs(arm, body)
    build_lab_coat(arm, body, body_refs)
    build_wire_glasses(arm, body)

    arm_y, R_S0, pos_S0 = bncp.load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}
    src = {
        'turn': bncp.import_mixamo_action(args.mixamo_dir, 'turning.fbx'),
        'walk': bncp.import_mixamo_action(args.mixamo_dir, 'pistol-walk.fbx'),
        'phone': bncp.import_mixamo_action(args.mixamo_dir, 'talking-on-phone.fbx'),
        'sit_talk': bncp.import_mixamo_action(args.mixamo_dir, 'sitting-talking.fbx'),
        'hit': bncp.import_mixamo_action(args.mixamo_dir, 'hit-reaction.fbx'),
        'cover': bncp.import_mixamo_action(args.mixamo_dir, 'cover-idle-standing.fbx'),
    }

    # Hale_Idle: calm relaxed standing loop using unarmed turning@10 upper body over standing turn cycle
    a, m = bncp.retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['turn'], 'Hale_Idle', sole,
        in_place=False, foot_lock=False, frame_slice=(1, 45), loop_crossfade=10,
        upper_override=(src['phone'], 1), upper_bones=bncp.UPPER_SPINE1_BONES
    )
    kept.append(a); metrics['Hale_Idle'] = m

    # Hale_Talk_Standing: standing + conversing hand gestures from sitting-talking(60..170)
    a, m = bncp.retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['turn'], 'Hale_Talk_Standing', sole,
        in_place=False, foot_lock=False, frame_slice=(1, 111), loop_crossfade=10,
        upper_clip=(src['sit_talk'], 60, 170), upper_bones=bncp.UPPER_SPINE1_BONES
    )
    kept.append(a); metrics['Hale_Talk_Standing'] = m

    # Hale_Objecting: expressive objecting stance from sitting-talking(240..350) over braced standing lower body
    a, m = bncp.retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['cover'], 'Hale_Objecting', sole,
        in_place=False, foot_lock=False, frame_slice=(1, 69), loop_crossfade=10,
        upper_clip=(src['sit_talk'], 240, 308), upper_bones=bncp.UPPER_SPINE1_BONES
    )
    kept.append(a); metrics['Hale_Objecting'] = m

    # Hale_Hands_Up: startled hands-raised reaction
    a, m = bncp.retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['hit'], 'Hale_Hands_Up', sole,
        in_place=False, foot_lock=False, frame_slice=(1, 40)
    )
    kept.append(a); metrics['Hale_Hands_Up'] = m

    # Hale_Walk: crisp stride with relaxed unarmed upper body
    a, m = bncp.retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['walk'], 'Hale_Walk', sole,
        in_place=True, foot_lock=True,
        upper_override=(src['phone'], 1), upper_bones=bncp.UPPER_SPINE1_BONES
    )
    kept.append(a); metrics['Hale_Walk'] = m

    bpy.data.objects.remove(arm_y, do_unlink=True)
    bncp.restore_rest_state(arm, basis_T0)

    out_glb = os.path.join(args.out_dir, 'dr-hale-mixamo.glb')
    bncp.finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {
        'file': 'dr-hale-mixamo.glb',
        'bytes': os.path.getsize(out_glb),
        'height_m': 1.78,
        'bones': len(arm.data.bones),
        'tris': tris,
        'mats': mats,
        'source_body': 'g-White_M_2_Casual.glb (MIT VALID v1.0)',
        'clips': metrics,
    }


def build_patient_lying(args):
    print('=== BUILDING PATIENT LYING (g-Hispanic_M_2_Casual -> patient-lying-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = bncp.setup_valid_rig(
        os.path.join(args.opus_valid_dir, 'g-Hispanic_M_2_Casual.glb'), 1.74,
        os.path.join(args.tex_dir, 'patient_lying_color.jpg'),
        os.path.join(args.tex_dir, 'patient_lying_rough.jpg'),
        os.path.join(args.tex_dir, 'patient_lying_nm.jpg'),
        decimate_ratio=1.0,
        barefoot_slender=True,
    )
    bncp.restore_rest_state(arm, basis_T0)
    body_refs = bncp.collect_body_skin_refs(arm, body)
    build_iv_dressing(arm, body, body_refs)

    arm_y, R_S0, pos_S0 = bncp.load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}
    for dst, fbx in [
        ('Lay_Breathless', 'laying-breathless.fbx'),
        ('Lay_Sleeping', 'laying-sleeping.fbx'),
        ('Lay_Moaning', 'laying-moaning.fbx'),
        ('Sit_Idle_Breath', 'sitting-idle-breathing.fbx'),
    ]:
        act_s = bncp.import_mixamo_action(args.mixamo_dir, fbx)
        a, m = bncp.retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, act_s, dst, sole)
        kept.append(a); metrics[dst] = m

    bpy.data.objects.remove(arm_y, do_unlink=True)
    bed_offsets = measure_bed_offsets(arm, body, kept)

    out_glb = os.path.join(args.out_dir, 'patient-lying-mixamo.glb')
    bncp.finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {
        'file': 'patient-lying-mixamo.glb',
        'bytes': os.path.getsize(out_glb),
        'height_m': 1.74,
        'bones': len(arm.data.bones),
        'tris': tris,
        'mats': mats,
        'source_body': 'g-Hispanic_M_2_Casual.glb (MIT VALID v1.0)',
        'bed_offsets': bed_offsets,
        'clips': metrics,
    }


def build_staff_member(args, role_name, glb_path, height_m, tex_prefix, dec_ratio, out_name, include_bun=False, include_steth=False, include_pager=False):
    print(f'=== BUILDING {role_name.upper()} -> {out_name} ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = bncp.setup_valid_rig(
        glb_path, height_m,
        os.path.join(args.tex_dir, f'{tex_prefix}_color.jpg'),
        os.path.join(args.tex_dir, f'{tex_prefix}_rough.jpg'),
        os.path.join(args.tex_dir, f'{tex_prefix}_nm.jpg'),
        decimate_ratio=dec_ratio,
    )
    bncp.restore_rest_state(arm, basis_T0)
    body_refs = bncp.collect_body_skin_refs(arm, body)
    if include_bun:
        build_nurse_bun(arm, body, head_z_top=height_m)
    build_stethoscope_and_badge(
        arm, body, body_refs,
        include_stethoscope=include_steth,
        include_pager=include_pager,
        head_z_top=height_m,
    )

    arm_y, R_S0, pos_S0 = bncp.load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}
    src = {
        'turn': bncp.import_mixamo_action(args.mixamo_dir, 'turning.fbx'),
        'walk': bncp.import_mixamo_action(args.mixamo_dir, 'pistol-walk.fbx'),
        'sit_talk': bncp.import_mixamo_action(args.mixamo_dir, 'sitting-talking.fbx'),
        'talk_seat': bncp.import_mixamo_action(args.mixamo_dir, 'talking-seated.fbx'),
        'typing': bncp.import_mixamo_action(args.mixamo_dir, 'typing.fbx'),
        'phone': bncp.import_mixamo_action(args.mixamo_dir, 'talking-on-phone.fbx'),
        'cower': bncp.import_mixamo_action(args.mixamo_dir, 'cover-idle-crouched.fbx'),
    }

    specs = [
        ('Staff_Idle',             'turn',      False, False, (1, 45),   10, (src['phone'], 1)),
        ('Staff_Walk',             'walk',      True,  True,  None,       0, (src['phone'], 1)),
        ('Staff_Sitting_Talking',  'sit_talk',  False, False, (40, 190), 10, None),
        ('Staff_Talking_Seated',   'talk_seat', False, False, (1, 151),  10, None),
        ('Staff_Typing',           'typing',    False, False, (40, 190), 10, None),
        ('Staff_Talking_On_Phone', 'phone',     False, False, (120, 270),10, None),
        ('Staff_Cower_Duck',       'cower',     False, False, (1, 78),    8, None),
    ]
    for dst, sk, ip, fl, fsl, cf, u_ov in specs:
        a, m = bncp.retarget_clip(
            arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src[sk], dst, sole,
            in_place=ip, foot_lock=fl, frame_slice=fsl, loop_crossfade=cf,
            upper_override=u_ov, upper_bones=bncp.UPPER_SPINE1_BONES if u_ov else None
        )
        kept.append(a); metrics[dst] = m

    bpy.data.objects.remove(arm_y, do_unlink=True)
    out_glb = os.path.join(args.out_dir, out_name)
    bncp.finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {
        'file': out_name,
        'bytes': os.path.getsize(out_glb),
        'height_m': height_m,
        'bones': len(arm.data.bones),
        'tris': tris,
        'mats': mats,
        'source_body': os.path.basename(glb_path) + ' (MIT VALID v1.0)',
        'clips': metrics,
    }


def refresh_cole_with_bed_offsets(args):
    res_cole = bncp.build_cole(args)
    # Re-open exported cole-mixamo.glb briefly to measure exact bed dorsal offsets
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=os.path.join(args.out_dir, 'cole-mixamo.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    body = bpy.data.objects['H_DDS_HighRes']
    bed_offsets = measure_bed_offsets(arm, body, list(bpy.data.actions))
    res_cole['height_m'] = 1.80
    res_cole['bones'] = len(arm.data.bones)
    res_cole['source_body'] = 'White_M_3_Casual.glb (MIT VALID v1.0) — hospital pajama trouser leg fix'
    res_cole['bed_offsets'] = bed_offsets
    return res_cole


def main():
    args = parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    res_cole = refresh_cole_with_bed_offsets(args)
    res_hale = build_dr_hale(args)
    res_pat  = build_patient_lying(args)
    res_nf   = build_staff_member(
        args, 'nurse_female', os.path.join(args.valid_dir, 'Hispanic_F_1_Util.glb'),
        1.64, 'nurse_f', 0.21, 'nurse-female-mixamo.glb',
        include_bun=True, include_steth=True, include_pager=False,
    )
    res_nm   = build_staff_member(
        args, 'nurse_male', os.path.join(args.opus_valid_dir, 'g-Black_M_3_Casual.glb'),
        1.76, 'nurse_m', 1.0, 'nurse-male-mixamo.glb',
        include_bun=False, include_steth=False, include_pager=True,
    )

    manifest = {
        'cole': res_cole,
        'dr_hale': res_hale,
        'patient_lying': res_pat,
        'nurse_female': res_nf,
        'nurse_male': res_nm,
    }
    mpath = os.path.join(args.out_dir, 'cast-quality-manifest.json')
    with open(mpath, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Also update cole's refreshed entry inside cast-pass-manifest.json
    cpm_path = os.path.join(args.out_dir, 'cast-pass-manifest.json')
    if os.path.exists(cpm_path):
        with open(cpm_path, 'r') as f:
            cpm = json.load(f)
        cpm['cole'] = res_cole
        with open(cpm_path, 'w') as f:
            json.dump(cpm, f, indent=2)

    print('=== EXPORTED CAST-QUALITY MANIFEST:', mpath, '===')
    for k, rec in manifest.items():
        print(f'[{k}] {rec["file"]}: {rec["bytes"]} B, {rec["tris"]} tris, {rec["mats"]} mats, {rec["bones"]} bones, {len(rec["clips"])} clips')


if __name__ == '__main__':
    main()

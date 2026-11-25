#!/usr/bin/env python3
"""Neon Cast Pass Builder (Blender 5.2.3 LTS headless)
Retargets the 48-clip Mixamo set (anchored on y-bot-tpose.fbx WITH skin) onto the
three MIT VALID characters (Gunman White_M_1_Util, Maya Hispanic_F_1_Util, Cole White_M_3_Casual),
runs surge-preserving in-place conversion + vertical foot-lock + stance-phase speed measurement,
bakes Spine1+ additive recoil layers, applies analytical 2-bone arm IK for Maya's wheelchair (+~12cm)
and bed push handles, attaches BVHTree-snapped silhouettes & weapons, and exports lean GLBs + manifest.
"""
import argparse, json, math, os, sys, statistics
import bpy, bmesh, mathutils
from mathutils.bvhtree import BVHTree

MIXAMO_BONE_MAP = {
    'mixamorig:Hips': 'Hips',
    'mixamorig:Spine': 'Spine',
    'mixamorig:Spine1': 'Spine1',
    'mixamorig:Spine2': 'Spine2',
    'mixamorig:Neck': 'Neck',
    'mixamorig:Head': 'Head',
    'mixamorig:LeftShoulder': 'LeftShoulder',
    'mixamorig:LeftArm': 'LeftArm',
    'mixamorig:LeftForeArm': 'LeftForeArm',
    'mixamorig:LeftHand': 'LeftHand',
    'mixamorig:RightShoulder': 'RightShoulder',
    'mixamorig:RightArm': 'RightArm',
    'mixamorig:RightForeArm': 'RightForeArm',
    'mixamorig:RightHand': 'RightHand',
    'mixamorig:LeftUpLeg': 'LeftUpLeg',
    'mixamorig:LeftLeg': 'LeftLeg',
    'mixamorig:LeftFoot': 'LeftFoot',
    'mixamorig:LeftToeBase': 'LeftToeBase',
    'mixamorig:RightUpLeg': 'RightUpLeg',
    'mixamorig:RightLeg': 'RightLeg',
    'mixamorig:RightFoot': 'RightFoot',
    'mixamorig:RightToeBase': 'RightToeBase',
}
# Extend with all 30 finger joints (Thumb/Index/Middle/Ring/Pinky 1..3) when present
for side in ('Left', 'Right'):
    for fn in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        for idx in (1, 2, 3):
            b = f'{side}Hand{fn}{idx}'
            MIXAMO_BONE_MAP[f'mixamorig:{b}'] = b

UPPER_SPINE1_BONES = {
    'Spine1', 'Spine2', 'Neck', 'Head',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
}
for side in ('Left', 'Right'):
    for fn in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        for idx in (1, 2, 3):
            UPPER_SPINE1_BONES.add(f'{side}Hand{fn}{idx}')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--mixamo-dir', default='/tmp/neon_cast_pass/mixamo_fbx')
    ap.add_argument('--valid-dir', default='/tmp/neon_cast_pass/src')
    ap.add_argument('--n2-glb', default='/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-3d-sample-neon/assets/gunmen/valid-mocap.glb')
    ap.add_argument('--tex-dir', default='/tmp/neon_cast_pass/tex')
    ap.add_argument('--out-dir', default='/Users/braidpairlette/.gemini/antigravity/scratch/Hawk2/games/hospital-escape-leaders-neon/assets/cast-pass')
    return ap.parse_args(argv)


def topo_bones(arm):
    out = []
    def visit(b):
        out.append(b.name)
        for c in b.children:
            visit(c)
    for b in arm.data.bones:
        if not b.parent:
            visit(b)
    return out


def clear_pose(arm):
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()


def record_rest_state(arm):
    bpy.context.view_layer.update()
    mw = arm.matrix_world
    R0, pos0, basis0 = {}, {}, {}
    for pb in arm.pose.bones:
        m = mw @ pb.matrix
        R0[pb.name] = m.to_3x3().normalized()
        pos0[pb.name] = m.translation.copy()
        basis0[pb.name] = (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy())
    return R0, pos0, basis0


def restore_rest_state(arm, basis0):
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        if pb.name in basis0:
            loc, rot, sc = basis0[pb.name]
            pb.rotation_mode = 'QUATERNION'
            pb.location = loc.copy()
            pb.rotation_quaternion = rot.copy()
            pb.scale = sc.copy()
    bpy.context.view_layer.update()


def make_mat(name, rgba=(0.5, 0.5, 0.5, 1.0), rough=0.86, metal=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return mat


def setup_valid_rig(glb_path, target_height, col_tex, rough_tex, nm_tex, decimate_ratio=0.21, barefoot_slender=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=glb_path)
    arm = bpy.data.objects['Reference']
    body = bpy.data.objects['H_DDS_HighRes']

    for nm in ('h_TeethDown', 'h_TeethUp', 'h_L_gland', 'h_R_gland', 'Icosphere'):
        o = bpy.data.objects.get(nm)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
    if body.data.shape_keys:
        body.shape_key_clear()

    eyes = [e for e in (bpy.data.objects.get('h_L_eye'), bpy.data.objects.get('h_R_eye')) if e]
    if eyes:
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        for e in eyes:
            e.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()

    # Normalize VALID cm+pose-bone-0.01 rig cleanly into native 1.0x world meters!
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    eval_obj = body.evaluated_get(dg)
    em_norm = eval_obj.to_mesh()
    for i, v in enumerate(body.data.vertices):
        v.co = em_norm.vertices[i].co.copy()
    eval_obj.to_mesh_clear()

    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.posemode_toggle()
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.posemode_toggle()
    bpy.context.view_layer.update()

    # Measure raw meter height & apply exact uniform target height (1.80 / 1.68 / 1.80m) onto rest mesh + edit bones
    zs_raw = [v.co.z for v in body.data.vertices]
    sc = target_height / (max(zs_raw) - min(zs_raw))
    zmin_raw = min(zs_raw)
    arm.scale = (sc, sc, sc)
    arm.location = (0.0, 0.0, -zmin_raw * sc)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True); body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    bpy.context.view_layer.update()

    if decimate_ratio < 0.99:
        dec = body.modifiers.new('Decimate', 'DECIMATE')
        dec.decimate_type = 'COLLAPSE'
        dec.ratio = decimate_ratio
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_move_up(modifier='Decimate')
        bpy.ops.object.modifier_apply(modifier='Decimate')

    # Optional anatomical barefoot slimming + smooth ankle taper for Cole (removes bulky sneaker lug & cuff shelf)
    if barefoot_slender:
        vg_names = [g.name for g in body.vertex_groups]
        foot_ids = {i for i, n in enumerate(vg_names) if 'Foot' in n or 'Toe' in n}
        leg_ids  = {i for i, n in enumerate(vg_names) if 'Leg' in n or 'Foot' in n}
        # Compute left/right ankle centroid around wz in [0.06, 0.15]
        for side_sign in (-1.0, 1.0):
            ank_pts = [v.co for v in body.data.vertices
                       if (0.06 <= v.co.z <= 0.15) and (v.co.x * side_sign > 0.02)
                       and any(g.group in leg_ids and g.weight > 0.35 for g in v.groups)]
            if ank_pts:
                ax = sum(p.x for p in ank_pts) / len(ank_pts)
                ay = sum(p.y for p in ank_pts) / len(ank_pts)
                for v in body.data.vertices:
                    wz = v.co.z
                    if (0.06 <= wz <= 0.16) and (v.co.x * side_sign > 0.02) and any(g.group in leg_ids and g.weight > 0.35 for g in v.groups):
                        # Smooth bump peaking at wz=0.105 (pull 14% radially toward ankle axis)
                        w_taper = max(0.0, 1.0 - abs(wz - 0.105) / 0.055)
                        sc_r = 1.0 - 0.14 * w_taper
                        v.co.x = ax + (v.co.x - ax) * sc_r
                        v.co.y = ay + (v.co.y - ay) * sc_r
        for v in body.data.vertices:
            wz = v.co.z
            if wz < 0.095 and any(g.group in foot_ids and g.weight > 0.35 for g in v.groups):
                v.co.x *= 0.88
                if wz < 0.022:
                    v.co.y *= 0.96

    mat = body.data.materials[0]
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out_n = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.0

    tc = nt.nodes.new('ShaderNodeTexImage')
    tc.image = bpy.data.images.load(col_tex, check_existing=False); tc.image.pack()
    tr = nt.nodes.new('ShaderNodeTexImage')
    tr.image = bpy.data.images.load(rough_tex, check_existing=False)
    tr.image.colorspace_settings.name = 'Non-Color'; tr.image.pack()
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = bpy.data.images.load(nm_tex, check_existing=False)
    tn.image.colorspace_settings.name = 'Non-Color'; tn.image.pack()
    nm_node = nt.nodes.new('ShaderNodeNormalMap')
    nm_node.inputs['Strength'].default_value = 0.55

    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tr.outputs['Color'], bsdf.inputs['Roughness'])
    nt.links.new(tn.outputs['Color'], nm_node.inputs['Color'])
    nt.links.new(nm_node.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(bsdf.outputs['BSDF'], out_n.inputs['Surface'])

    # Measure exact vertical offset from Foot/Toe bone origins down to mesh rubber/skin sole
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    eval_b2 = body.evaluated_get(dg)
    em = eval_b2.to_mesh()
    sole_info = {}
    for side in ('Left', 'Right'):
        fid = body.vertex_groups.find(f'{side}Foot')
        tid = body.vertex_groups.find(f'{side}ToeBase')
        fz = (arm.matrix_world @ arm.pose.bones[f'{side}Foot'].matrix).translation.z
        tz = (arm.matrix_world @ arm.pose.bones[f'{side}ToeBase'].matrix).translation.z
        f_verts_z = [ (body.matrix_world @ v.co).z for v in em.vertices if any(g.group == fid and g.weight > 0.45 for g in v.groups) ]
        t_verts_z = [ (body.matrix_world @ v.co).z for v in em.vertices if any(g.group == tid and g.weight > 0.45 for g in v.groups) ]
        min_f = min(f_verts_z) if f_verts_z else 0.0
        min_t = min(t_verts_z) if t_verts_z else 0.0
        sole_info[side] = {
            'foot_off': max(0.02, fz - min_f),
            'toe_off':  max(0.01, tz - min_t),
        }
    eval_b2.to_mesh_clear()

    R_T0, pos_T0, basis_T0 = record_rest_state(arm)
    return arm, body, R_T0, pos_T0, basis_T0, sole_info


def collect_body_skin_refs(arm_obj, base_mesh):
    """Build rest-pose BVHTree and KDTree strictly from _Body faces/vertices for clean weight transfer."""
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    prev_act = arm_obj.animation_data.action
    arm_obj.animation_data.action = None
    for pb in arm_obj.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()

    mw = base_mesh.matrix_world
    me = base_mesh.data
    vg_names = [g.name for g in base_mesh.vertex_groups]
    body_mat_idx = next((i for i, m in enumerate(me.materials) if m and m.name == '_Body'), 0)

    bm = bmesh.new()
    vmap = {}
    body_v_list = []
    for p in me.polygons:
        if p.material_index != body_mat_idx:
            continue
        for vi in p.vertices:
            if vi not in vmap:
                wp = mw @ me.vertices[vi].co
                vmap[vi] = bm.verts.new(wp)
                wdict = {vg_names[g.group]: g.weight for g in me.vertices[vi].groups if g.weight > 1e-4}
                body_v_list.append((wp, wdict))
        try:
            bm.faces.new([vmap[vi] for vi in p.vertices])
        except ValueError:
            pass
    bm.normal_update()
    bvh = BVHTree.FromBMesh(bm)
    bm.free()

    kd = mathutils.kdtree.KDTree(len(body_v_list))
    for i, (wp, _) in enumerate(body_v_list):
        kd.insert(wp, i)
    kd.balance()

    arm_obj.animation_data.action = prev_act
    bpy.context.view_layer.update()
    return bvh, kd, body_v_list


def transfer_surface_weights(arm_obj, base_mesh, part_mesh, allowed_bones, fallback_bone,
                             separate_mesh=False, k_nearest=6, project_surface=True,
                             strict_upper_z=None, strict_bone='Head', body_refs=None):
    """Project each part vertex onto _Body surface and transfer normalized weights restricted to allowed_bones."""
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    prev_act = arm_obj.animation_data.action
    arm_obj.animation_data.action = None
    bpy.context.view_layer.update()

    if body_refs is None:
        bvh, kd, body_v_list = collect_body_skin_refs(arm_obj, base_mesh)
    else:
        bvh, kd, body_v_list = body_refs

    # Bake part_mesh object transform into rest-space vertices
    W_to_rest = base_mesh.matrix_world.inverted() @ part_mesh.matrix_world
    mw_b = base_mesh.matrix_world
    for v in part_mesh.data.vertices:
        v.co = W_to_rest @ v.co
    part_mesh.rotation_mode = 'XYZ'
    part_mesh.location = (0.0, 0.0, 0.0)
    part_mesh.rotation_euler = (0.0, 0.0, 0.0)
    part_mesh.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    part_mesh.scale = (1.0, 1.0, 1.0)

    # Ensure vertex groups exist on part_mesh
    vgs = {}
    def get_vg(bn):
        if bn not in vgs:
            vgs[bn] = part_mesh.vertex_groups.get(bn) or part_mesh.vertex_groups.new(name=bn)
        return vgs[bn]

    for v in part_mesh.data.vertices:
        wp = mw_b @ v.co
        if strict_upper_z is not None and wp.z >= strict_upper_z:
            get_vg(strict_bone).add([v.index], 1.0, 'REPLACE')
            continue
        q_pt = wp
        if project_surface:
            loc, _, _, _ = bvh.find_nearest(wp)
            if loc is not None:
                q_pt = loc
        accum = {}
        for (_, idx, dist) in kd.find_n(q_pt, k_nearest):
            inv_d = 1.0 / ((dist + 0.005) ** 2)
            for bn, bw in body_v_list[idx][1].items():
                if bn in allowed_bones:
                    accum[bn] = accum.get(bn, 0.0) + bw * inv_d
        tot = sum(accum.values())
        if tot < 1e-4:
            get_vg(fallback_bone).add([v.index], 1.0, 'REPLACE')
        else:
            # Keep top 4 influences normalized
            top = sorted(accum.items(), key=lambda x: -x[1])[:4]
            top_sum = sum(w for _, w in top)
            for bn, bw in top:
                w_norm = bw / top_sum
                if w_norm > 1e-3:
                    get_vg(bn).add([v.index], w_norm, 'REPLACE')

    if separate_mesh:
        part_mesh.parent = arm_obj
        mod = part_mesh.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm_obj
    else:
        bpy.ops.object.select_all(action='DESELECT')
        part_mesh.select_set(True)
        base_mesh.select_set(True)
        bpy.context.view_layer.objects.active = base_mesh
        bpy.ops.object.join()

    arm_obj.animation_data.action = prev_act
    bpy.context.view_layer.update()


def skin_attach_exact(arm_obj, base_mesh, part_mesh, bone_name, action_obj=None, frame_idx=0, separate_mesh=False):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    prev_act = arm_obj.animation_data.action
    if action_obj is not None:
        arm_obj.animation_data.action = action_obj
        bpy.context.scene.frame_set(int(frame_idx))
    bpy.context.view_layer.update()
    pb = arm_obj.pose.bones[bone_name]
    B_pose_local = pb.matrix @ pb.bone.matrix_local.inverted()
    W_to_rest = arm_obj.matrix_world @ B_pose_local.inverted() @ arm_obj.matrix_world.inverted() @ part_mesh.matrix_world
    for v in part_mesh.data.vertices:
        v.co = W_to_rest @ v.co
    part_mesh.rotation_mode = 'XYZ'
    part_mesh.location = (0.0, 0.0, 0.0)
    part_mesh.rotation_euler = (0.0, 0.0, 0.0)
    part_mesh.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    part_mesh.scale = (1.0, 1.0, 1.0)
    vg = part_mesh.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(part_mesh.data.vertices))), 1.0, 'REPLACE')
    if separate_mesh:
        part_mesh.parent = arm_obj
        mod = part_mesh.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm_obj
    else:
        bpy.ops.object.select_all(action='DESELECT')
        part_mesh.select_set(True)
        base_mesh.select_set(True)
        bpy.context.view_layer.objects.active = base_mesh
        bpy.ops.object.join()
    arm_obj.animation_data.action = prev_act
    bpy.context.view_layer.update()


def load_ybot_anchor(mixamo_dir):
    before_objs = set(bpy.data.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(mixamo_dir, 'y-bot-tpose.fbx'))
    new_objs = [o for o in bpy.data.objects if o not in before_objs]
    arm_y = [o for o in new_objs if o.type == 'ARMATURE'][0]
    for o in new_objs:
        if o != arm_y:
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a not in before_acts:
            bpy.data.actions.remove(a)
    clear_pose(arm_y)
    R_S0, pos_S0, _ = record_rest_state(arm_y)
    return arm_y, R_S0, pos_S0


def import_mixamo_action(mixamo_dir, canonical_fbx):
    before_objs = set(bpy.data.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(mixamo_dir, canonical_fbx))
    act = [a for a in bpy.data.actions if a not in before_acts][0]
    for o in list(bpy.data.objects):
        if o not in before_objs:
            bpy.data.objects.remove(o, do_unlink=True)
    return act


def apply_world_bone_rotations(arm_T, order_T, R_world_goal, rest_rel_no_basis, mw_T_rot):
    # Top-down decomposition from solved world rotation matrices -> local bone quaternions
    R_world_actual = {}
    for bT in order_T:
        pbT = arm_T.pose.bones[bT]
        pbT.rotation_mode = 'QUATERNION'
        R_p = R_world_actual[pbT.parent.name] if pbT.parent else mw_T_rot
        if bT in R_world_goal:
            Rg = R_world_goal[bT]
            R_world_actual[bT] = Rg
            R_basis = (R_p @ rest_rel_no_basis[bT]).inverted() @ Rg
            pbT.rotation_quaternion = R_basis.to_quaternion()
        else:
            R_world_actual[bT] = R_p @ rest_rel_no_basis[bT] @ pbT.rotation_quaternion.to_matrix()


def compute_rest_cache(arm_T, R_T0, basis_T0, root_T='Hips'):
    order_T = topo_bones(arm_T)
    mw_T_rot = arm_T.matrix_world.to_3x3().normalized()
    rest_rel_no_basis = {}
    for bn in order_T:
        pb = arm_T.pose.bones[bn]
        q_b0 = basis_T0[bn][1].to_matrix()
        R_nob = R_T0[bn] @ q_b0.inverted()
        R_p0 = R_T0[pb.parent.name] if pb.parent else mw_T_rot
        rest_rel_no_basis[bn] = R_p0.inverted() @ R_nob
    pb_root = arm_T.pose.bones[root_T]
    M_root_rest_world = arm_T.matrix_world @ pb_root.matrix @ pb_root.matrix_basis.inverted()
    return order_T, mw_T_rot, rest_rel_no_basis, M_root_rest_world


def retarget_clip(arm_S, R_S0, pos_S0, arm_T, R_T0, pos_T0, basis_T0, act_S, dst_name,
                  sole_info, root_S='mixamorig:Hips', root_T='Hips',
                  in_place=False, foot_lock=False, is_run=False,
                  frame_slice=None, loop_crossfade=0, additive_fire=None, additive_strength=1.0,
                  upper_override=None, upper_clip=None, upper_bones=None):
    """Retarget act_S onto arm_T cleanly at 30fps, optionally converting root motion to in-place
    while preserving natural stride surge + applying vertical foot-lock + optional Spine1+ additive recoil.
    Returns (act_T, metrics_dict).
    """
    arm_S.animation_data.action = act_S
    f0 = int(round(act_S.frame_range[0]))
    f1 = int(round(act_S.frame_range[1]))
    if frame_slice is not None:
        f0 = max(f0, frame_slice[0])
        f1 = min(f1, frame_slice[1])
    frames = list(range(f0, f1 + 1))
    n_f = len(frames)
    dt = 1.0 / 30.0
    duration = (n_f - 1) * dt

    order_T, mw_T_rot, rest_rel_no_basis, M_root_rest_world = compute_rest_cache(arm_T, R_T0, basis_T0, root_T)
    h_S0 = pos_S0[root_S].z
    h_T0 = pos_T0[root_T].z
    h_scale = (h_T0 / h_S0) if abs(h_S0) > 0.05 else 1.0
    inv_map = {v: k for k, v in MIXAMO_BONE_MAP.items() if k in arm_S.data.bones and v in arm_T.data.bones}

    # Optional additive upper-body fire delta cache (relative to initial ready frame u0 of fire action)
    fire_deltas = None
    if additive_fire is not None:
        act_fire, u0, u1 = additive_fire
        arm_S.animation_data.action = act_fire
        bpy.context.scene.frame_set(u0)
        bpy.context.view_layer.update()
        mw_S = arm_S.matrix_world
        R_fire0 = {bT: (mw_S @ arm_S.pose.bones[inv_map[bT]].matrix).to_3x3().normalized()
                   for bT in UPPER_SPINE1_BONES if bT in inv_map}
        fire_deltas = []
        for u in range(u0, u1 + 1):
            bpy.context.scene.frame_set(u)
            bpy.context.view_layer.update()
            step_d = {}
            for bT, R0f in R_fire0.items():
                Rf = (mw_S @ arm_S.pose.bones[inv_map[bT]].matrix).to_3x3().normalized()
                # World-space recoil delta (convert to Y-bot T-pose-consistent world delta)
                q_d = (Rf @ R0f.inverted()).to_quaternion()
                ax, ang = q_d.to_axis_angle()
                step_d[bT] = mathutils.Quaternion(ax, ang * additive_strength).to_matrix()
            fire_deltas.append(step_d)
        arm_S.animation_data.action = act_S

    # Optional upper-body pose override cache (e.g. Crouch_Walk_Aim taking Spine1+ from Pistol_Kneel_Idle)
    upper_world_cache = None
    if upper_override is not None:
        act_up, u_frame = upper_override
        arm_S.animation_data.action = act_up
        bpy.context.scene.frame_set(u_frame)
        bpy.context.view_layer.update()
        mw_S = arm_S.matrix_world
        upper_world_cache = {
            bT: ((mw_S @ arm_S.pose.bones[inv_map[bT]].matrix).to_3x3().normalized() @ R_S0[inv_map[bT]].inverted()) @ R_T0[bT]
            for bT in (upper_bones or UPPER_SPINE1_BONES) if bT in inv_map
        }
        arm_S.animation_data.action = act_S

    # Optional animated upper-body clip replacement cache (e.g. Cole Sit_Aim_Fire Spine1+ from shooting)
    upper_clip_frames = None
    if upper_clip is not None:
        act_up_c, u_f0, u_f1 = upper_clip
        arm_S.animation_data.action = act_up_c
        upper_clip_frames = []
        up_bones = upper_bones or UPPER_SPINE1_BONES
        for uf in range(u_f0, u_f1 + 1):
            bpy.context.scene.frame_set(uf)
            bpy.context.view_layer.update()
            mw_S = arm_S.matrix_world
            upper_clip_frames.append({
                bT: ((mw_S @ arm_S.pose.bones[inv_map[bT]].matrix).to_3x3().normalized() @ R_S0[inv_map[bT]].inverted()) @ R_T0[bT]
                for bT in up_bones if bT in inv_map
            })
        arm_S.animation_data.action = act_S

    # Pass 1: Sample all frames into world rotations + scaled Hips positions
    samples_R = []
    samples_H = []
    for f in frames:
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        mw_S = arm_S.matrix_world
        R_goal = {}
        for bT, bS in inv_map.items():
            R_Sf = (mw_S @ arm_S.pose.bones[bS].matrix).to_3x3().normalized()
            R_goal[bT] = (R_Sf @ R_S0[bS].inverted()) @ R_T0[bT]
        p_Sf = (mw_S @ arm_S.pose.bones[root_S].matrix).translation
        goal_W = pos_T0[root_T] + (p_Sf - pos_S0[root_S]) * h_scale
        samples_R.append(R_goal)
        samples_H.append(goal_W)

    # Apply upper override, animated upper clip & additive Spine1+ fire recoil cleanly in world rotation space
    n_fire = len(fire_deltas) if fire_deltas else 0
    for idx in range(n_f):
        if upper_clip_frames:
            uc = upper_clip_frames[idx % len(upper_clip_frames)]
            for bT, R_ov in uc.items():
                samples_R[idx][bT] = R_ov
        if upper_world_cache:
            for bT, R_ov in upper_world_cache.items():
                samples_R[idx][bT] = R_ov
        if fire_deltas:
            fd = fire_deltas[idx % n_fire]
            for bT, R_d in fd.items():
                if bT in samples_R[idx]:
                    samples_R[idx][bT] = R_d @ samples_R[idx][bT]

    # Measure raw travel from root motion before in-place linear subtraction
    dXY = mathutils.Vector((samples_H[-1].x - samples_H[0].x, samples_H[-1].y - samples_H[0].y, 0.0))
    raw_dist = dXY.length
    authored_root = (raw_dist / duration) if duration > 1e-4 else 0.0
    travel_dir = dXY.normalized() if raw_dist > 1e-4 else mathutils.Vector((0.0, -1.0, 0.0))

    # Linear velocity subtraction in X/Y (preserves step acceleration surge & vertical bob!)
    if in_place and n_f > 1:
        x0, y0 = samples_H[0].x, samples_H[0].y
        dx_tot, dy_tot = samples_H[-1].x - x0, samples_H[-1].y - y0
        # Zero mean XY so character stays centered around stage X=0, Y=0 while surging organically
        adj_H = []
        for idx, hp in enumerate(samples_H):
            u = idx / (n_f - 1)
            adj_H.append(mathutils.Vector((hp.x - x0 - dx_tot * u, hp.y - y0 - dy_tot * u, hp.z)))
        mx = sum(h.x for h in adj_H) / n_f
        my = sum(h.y for h in adj_H) / n_f
        samples_H = [mathutils.Vector((h.x - mx, h.y - my, h.z)) for h in adj_H]

    # Optional cyclic loop seam blend (e.g. for sliced Bed_Push_Loop window)
    if loop_crossfade > 0 and n_f > loop_crossfade * 2:
        # Bring end position & bone rotations cleanly back to frame 0 over tail window
        k = loop_crossfade
        for j in range(k):
            idx = n_f - k + j
            w = (j + 1) / k
            samples_H[idx] = samples_H[idx].lerp(samples_H[0], w)
            for bT in samples_R[idx]:
                if bT in samples_R[0]:
                    q_a = samples_R[idx][bT].to_quaternion()
                    q_b = samples_R[0][bT].to_quaternion()
                    samples_R[idx][bT] = q_a.slerp(q_b, w).to_matrix()

    # Pass 2: Keyframe on arm_T and run Vertical Foot-Lock + Stance Speed Measurement
    restore_rest_state(arm_T, basis_T0)
    act_T = bpy.data.actions.new(name=dst_name)
    arm_T.animation_data.action = act_T
    pb_root = arm_T.pose.bones[root_T]

    def write_frame(idx, H_pos, R_goal):
        apply_world_bone_rotations(arm_T, order_T, R_goal, rest_rel_no_basis, mw_T_rot)
        pb_root.location = M_root_rest_world.inverted() @ H_pos
        bpy.context.view_layer.update()

    sole_trace = []
    foot_pos_trace = []
    for idx in range(n_f):
        write_frame(idx, samples_H[idx], samples_R[idx])
        mw = arm_T.matrix_world
        frame_soles = {}
        frame_fp = {}
        for side in ('Left', 'Right'):
            pf = (mw @ arm_T.pose.bones[f'{side}Foot'].matrix).translation.copy()
            pt = (mw @ arm_T.pose.bones[f'{side}ToeBase'].matrix).translation.copy()
            sz_f = pf.z - sole_info[side]['foot_off']
            sz_t = pt.z - sole_info[side]['toe_off']
            frame_soles[side] = min(sz_f, sz_t)
            # Track lowest contact point (or flat midpoint) along ground plane
            frame_fp[side] = pt if sz_t < sz_f else pf
        sole_trace.append((min(frame_soles['Left'], frame_soles['Right']), frame_soles['Left'], frame_soles['Right']))
        foot_pos_trace.append(frame_fp)

    # Vertical foot-lock on Hips.z
    if foot_lock:
        mins = [s[0] for s in sole_trace]
        stance_cands = sorted(mins)[:max(3, n_f // 3)]
        base_err = statistics.median(stance_cands)
        # First remove global height offset (~ankle length delta between Mixamo and VALID)
        for idx in range(n_f):
            samples_H[idx].z -= base_err
        # Per-frame gentle pin: clamp subterranean floor clipping (< 0 -> 0) and gentle stance lift
        stance_env = 0.045 if is_run else 0.032
        for idx in range(n_f):
            sz_adj = sole_trace[idx][0] - base_err
            if sz_adj < 0.0:
                samples_H[idx].z -= sz_adj
            elif sz_adj < stance_env and not is_run:
                samples_H[idx].z -= sz_adj * 0.72

    # Write final keyframes at 0..(n_f-1) & re-measure exact post-foot-lock stance metrics!
    final_min_z = []
    stance_speeds = []
    prev_fp = None
    prev_soles = None
    for idx in range(n_f):
        write_frame(idx, samples_H[idx], samples_R[idx])
        for bT in inv_map:
            arm_T.pose.bones[bT].keyframe_insert(data_path='rotation_quaternion', frame=idx)
        pb_root.keyframe_insert(data_path='location', frame=idx)

        mw = arm_T.matrix_world
        cur_fp, cur_s = {}, {}
        for side in ('Left', 'Right'):
            pf = (mw @ arm_T.pose.bones[f'{side}Foot'].matrix).translation.copy()
            pt = (mw @ arm_T.pose.bones[f'{side}ToeBase'].matrix).translation.copy()
            sz_f = pf.z - sole_info[side]['foot_off']
            sz_t = pt.z - sole_info[side]['toe_off']
            cur_s[side] = min(sz_f, sz_t)
            cur_fp[side] = 0.5 * (pf + pt) if abs(sz_f - sz_t) < 0.015 else (pt if sz_t < sz_f else pf)
        final_min_z.append(min(cur_s['Left'], cur_s['Right']))

        if prev_fp is not None and in_place:
            for side in ('Left', 'Right'):
                if cur_s[side] <= 0.028 and prev_soles[side] <= 0.028:
                    # During in-place playback, planted foot moves opposite to travel_dir
                    dp = cur_fp[side] - prev_fp[side]
                    v_st = -(dp.x * travel_dir.x + dp.y * travel_dir.y) / dt
                    if 0.15 < v_st < 6.5:
                        stance_speeds.append(v_st)
        prev_fp = cur_fp
        prev_soles = cur_s

    authored_stance = statistics.median(stance_speeds) if stance_speeds else authored_root
    if stance_speeds:
        slide_samples = [abs(v - authored_stance) * dt * 1000.0 for v in stance_speeds]
        stance_slide_mm = statistics.median(slide_samples)
    else:
        stance_slide_mm = 0.0

    metrics = {
        'clip': dst_name,
        'frames': n_f,
        'duration_s': round(duration, 4),
        'authored_root_mps': round(authored_root, 4),
        'authored_stance_mps': round(authored_stance, 4),
        'stance_samples': len(stance_speeds),
        'stance_slide_mm': round(stance_slide_mm, 2),
        'min_foot_z_mm': round(min(final_min_z) * 1000.0, 2),
        'median_min_foot_z_mm': round(statistics.median(sorted(final_min_z)[:max(3, n_f // 3)]) * 1000.0, 2),
    }
    return act_T, metrics


def rot_between(v_from, v_to):
    a = v_from.normalized()
    b = v_to.normalized()
    d = max(-1.0, min(1.0, a.dot(b)))
    if d > 0.99999:
        return mathutils.Matrix.Identity(3)
    if d < -0.99999:
        ortho = mathutils.Vector((1, 0, 0)) if abs(a.x) < 0.8 else mathutils.Vector((0, 1, 0))
        axis = a.cross(ortho).normalized()
        return mathutils.Quaternion(axis, math.pi).to_matrix()
    return a.rotation_difference(b).to_matrix()


def apply_maya_handle_ik(arm_T, R_T0, basis_T0, act_T, handle_x=0.23, handle_y=-0.34, handle_z=1.00, grip_delta_z=None):
    """Analytical 2-bone limb IK on both Maya arms per frame so wrists cleanly raise onto
    wheelchair (+~12 cm) or bed handle bars while keeping outward/downward elbow pole natural.
    """
    arm_T.animation_data.action = act_T
    f0, f1 = int(round(act_T.frame_range[0])), int(round(act_T.frame_range[1]))
    order_T, mw_T_rot, rest_rel_no_basis, _ = compute_rest_cache(arm_T, R_T0, basis_T0, 'Hips')

    pre_zs, post_zs, gaps_mm = [], [], []
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        mw = arm_T.matrix_world
        R_goal = {b: (mw @ arm_T.pose.bones[b].matrix).to_3x3().normalized() for b in order_T}

        # Pre-IK average wrist height
        w_l_pre = (mw @ arm_T.pose.bones['LeftHand'].matrix).translation.copy()
        w_r_pre = (mw @ arm_T.pose.bones['RightHand'].matrix).translation.copy()
        hips_p = (mw @ arm_T.pose.bones['Hips'].matrix).translation.copy()
        pre_zs.append(0.5 * (w_l_pre.z + w_r_pre.z))

        for side, sx in (('Left', 1.0), ('Right', -1.0)):
            bU, bF, bH = f'{side}Arm', f'{side}ForeArm', f'{side}Hand'
            S = (mw @ arm_T.pose.bones[bU].matrix).translation.copy()
            E = (mw @ arm_T.pose.bones[bF].matrix).translation.copy()
            W = (mw @ arm_T.pose.bones[bH].matrix).translation.copy()
            l1 = (E - S).length
            l2 = (W - E).length

            if grip_delta_z is not None:
                # Relative +Z wrist raise keeping Maya's natural X/Y stride sway while targeting z=handle_z
                w_tgt = mathutils.Vector((
                    0.5 * W.x + 0.5 * (hips_p.x + sx * handle_x),
                    0.55 * W.y + 0.45 * (hips_p.y + handle_y),
                    W.z + grip_delta_z,
                ))
                # Softly pull Z toward exact handle_z bar center
                w_tgt.z = 0.75 * handle_z + 0.25 * w_tgt.z
            elif handle_y is None:
                # Align both wrists onto a straight rigid push bar at x=+-handle_x, z=handle_z using natural push reach Y
                bar_y = 0.5 * (w_l_pre.y + w_r_pre.y)
                w_tgt = mathutils.Vector((sx * handle_x, bar_y, handle_z))
            else:
                w_tgt = mathutils.Vector((hips_p.x + sx * handle_x, hips_p.y + handle_y, handle_z))

            vec = w_tgt - S
            d = vec.length
            d_clamped = max(abs(l1 - l2) + 0.015, min((l1 + l2) * 0.988, d))
            u = vec.normalized()
            cos_a = max(-0.998, min(0.998, (l1*l1 + d_clamped*d_clamped - l2*l2) / (2.0 * l1 * d_clamped)))
            sin_a = math.sqrt(max(0.0, 1.0 - cos_a * cos_a))

            # Natural pole: blend current elbow bend with outward + downward + slight rear bias
            raw_p = (E - S) - ((E - S).dot(u)) * u
            bias_p = mathutils.Vector((sx * 0.35, 0.30, -0.88)).normalized()
            p_vec = (raw_p.normalized() * 0.45 + bias_p * 0.55) if raw_p.length > 1e-4 else bias_p
            p_dir = (p_vec - (p_vec.dot(u)) * u).normalized()

            E_new = S + u * (l1 * cos_a) + p_dir * (l1 * sin_a)
            W_eff_dir = (w_tgt - E_new).normalized()

            q1 = rot_between(E - S, E_new - S)
            R_U_new = q1 @ R_goal[bU]
            # New pre-IK forearm dir is q1 applied to (W - E)
            f_dir_rot = q1 @ (W - E)
            q2 = rot_between(f_dir_rot, W_eff_dir)
            R_F_new = q2 @ q1 @ R_goal[bF]

            R_goal[bU] = R_U_new
            R_goal[bF] = R_F_new

        apply_world_bone_rotations(arm_T, order_T, R_goal, rest_rel_no_basis, mw_T_rot)
        bpy.context.view_layer.update()

        # Re-read post-IK wrist positions & curl fingers gently around grip bar
        w_l_post = (mw @ arm_T.pose.bones['LeftHand'].matrix).translation
        w_r_post = (mw @ arm_T.pose.bones['RightHand'].matrix).translation
        post_zs.append(0.5 * (w_l_post.z + w_r_post.z))
        # Handle center for error reporting
        tgt_y_chk = (0.5 * (w_l_pre.y + w_r_pre.y)) if handle_y is None else w_l_post.y
        tgt_x_base = 0.0 if handle_y is None else hips_p.x
        err_l = (w_l_post - mathutils.Vector((tgt_x_base + handle_x, tgt_y_chk, handle_z))).length
        err_r = (w_r_post - mathutils.Vector((tgt_x_base - handle_x, tgt_y_chk, handle_z))).length
        gaps_mm.append(0.5 * (err_l + err_r) * 1000.0)

        for bn in ('LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'):
            arm_T.pose.bones[bn].keyframe_insert('rotation_quaternion', frame=f)

        # Gentle hand grip curl over bars on Left & Right hands
        for s_prefix in ('Left', 'Right'):
            for fn in ('Index', 'Middle', 'Ring', 'Pinky'):
                for idx_j, ang in ((1, -0.65), (2, -0.75)):
                    pb = arm_T.pose.bones.get(f'{s_prefix}Hand{fn}{idx_j}')
                    if pb:
                        pb.rotation_mode = 'QUATERNION'
                        pb.rotation_quaternion = mathutils.Euler((0.0, 0.0, ang), 'XYZ').to_quaternion()
                        pb.keyframe_insert('rotation_quaternion', frame=f)

    return {
        'pre_wrist_z_m': round(statistics.mean(pre_zs), 4),
        'post_wrist_z_m': round(statistics.mean(post_zs), 4),
        'wrist_lift_cm': round((statistics.mean(post_zs) - statistics.mean(pre_zs)) * 100.0, 2),
        'mean_handle_gap_mm': round(statistics.mean(gaps_mm), 2),
    }


# ------------------------------------------------------------------
# Fitted Silicone/Cloth/Weapon Prop Builders (from leaders-neon v2)
# ------------------------------------------------------------------
def build_fitted_beanie(arm, body_obj, bone_name='Head', head_z_thresh=1.58, name='GunmanBeanie', mat=None,
                        rim_thick=0.0115, dome_thick=0.0080, brow_drop=0.080, nape_drop=0.044, side_drop=0.020,
                        body_refs=None):
    """Build a skull-hugging cap/helmet strictly from upper-cranium _Body bounds and transfer Head/Neck weights."""
    me = body_obj.data
    mw = body_obj.matrix_world
    body_mat_idx = next((i for i, m in enumerate(me.materials) if m and m.name == '_Body'), 0)

    bm_h = bmesh.new()
    vmap = {}
    pts = []
    for p in me.polygons:
        if p.material_index != body_mat_idx:
            continue
        p_wps = [mw @ me.vertices[vi].co for vi in p.vertices]
        if all(wp.z > head_z_thresh for wp in p_wps):
            for vi, wp in zip(p.vertices, p_wps):
                if vi not in vmap:
                    pts.append(wp)
                    vmap[vi] = bm_h.verts.new(wp)
            try:
                bm_h.faces.new([vmap[vi] for vi in p.vertices])
            except ValueError:
                pass
    bm_h.normal_update()
    bvh = BVHTree.FromBMesh(bm_h)

    z_top = max(p.z for p in pts)
    dome_pts = [p for p in pts if p.z >= z_top - 0.105]
    cx = 0.5 * (min(p.x for p in dome_pts) + max(p.x for p in dome_pts))
    cy = 0.5 * (min(p.y for p in dome_pts) + max(p.y for p in dome_pts))
    z_brow = z_top - brow_drop

    bm = bmesh.new()
    n_u, n_v = 36, 18
    rings = []
    for iv in range(n_v):
        t = iv / (n_v - 1)
        ang_v = t * (math.pi * 0.5)
        z_ang, r_lat = math.sin(ang_v), math.cos(ang_v)
        ring = []
        for iu in range(n_u):
            az = (iu / n_u) * math.pi * 2.0
            dx, dy = math.cos(az) * r_lat, math.sin(az) * r_lat
            back_w, side_w = max(0.0, math.sin(az)), abs(math.cos(az))
            base_z = z_brow - nape_drop * (back_w ** 1.2) - side_drop * side_w
            ray_z = min(z_top + 0.01, base_z + z_ang * 0.125)
            orig = mathutils.Vector((cx + dx * 0.24, cy + dy * 0.24, ray_z))
            if t > 0.96:
                orig = mathutils.Vector((cx, cy, z_top + 0.12))
                rdir = mathutils.Vector((0.0, 0.0, -1.0))
            else:
                tgt_z = min(ray_z, z_brow + 0.035) if iv > 4 else ray_z
                rdir = (mathutils.Vector((cx, cy, tgt_z)) - orig).normalized()
            loc, nrm, _, _ = bvh.ray_cast(orig, rdir, 0.42)
            if loc is None:
                loc, nrm, _, _ = bvh.find_nearest(mathutils.Vector((cx + dx * 0.095, cy + dy * 0.105, ray_z)))
            if loc is None:
                loc = mathutils.Vector((cx + dx * 0.092, cy + dy * 0.102, base_z + z_ang * 0.105))
                nrm = mathutils.Vector((dx, dy, max(0.15, z_ang))).normalized()
            else:
                rad_xy = mathutils.Vector((loc.x - cx, loc.y - cy, 0.0))
                if rad_xy.length > 0.118:
                    rad_xy.normalize()
                    loc.x = cx + rad_xy.x * 0.112
                    loc.y = cy + rad_xy.y * 0.112
                out_dir = mathutils.Vector((loc.x - cx, loc.y - cy, max(0.0, loc.z - z_brow))).normalized()
                if nrm.dot(out_dir) < 0.1:
                    nrm = out_dir
            cuff = rim_thick if iv <= 2 else (0.5 * (rim_thick + dome_thick) if iv <= 4 else dome_thick)
            pos = loc + nrm * cuff
            ring.append(bm.verts.new(pos))
        rings.append(ring)
    for iv in range(n_v - 1):
        for iu in range(n_u):
            iu2 = (iu + 1) % n_u
            bm.faces.new((rings[iv][iu], rings[iv][iu2], rings[iv + 1][iu2], rings[iv + 1][iu]))
    apex = bm.verts.new((cx, cy, z_top + dome_thick + 0.001))
    for iu in range(n_u):
        bm.faces.new((rings[-1][iu], rings[-1][(iu + 1) % n_u], apex))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me_out = bpy.data.meshes.new(name)
    bm.to_mesh(me_out)
    bm.free()
    bm_h.free()
    for p in me_out.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me_out)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    transfer_surface_weights(
        arm, body_obj, obj,
        allowed_bones={'Head', 'Neck'}, fallback_bone=bone_name,
        project_surface=True, strict_upper_z=z_brow + 0.012, strict_bone=bone_name,
        body_refs=body_refs,
    )


def build_fitted_rig(arm, body_obj, bone_name='Spine2', z_lo=1.18, z_hi=1.50, name='GunmanRig',
                     mat=None, trim_mat=None, body_refs=None):
    """Build a body-contoured ballistic plate carrier (front/back plates, trim, shoulder & waist straps)
    and transfer torso/clavicle weights with surface projection so plates flex smoothly with the body."""
    me = body_obj.data
    mw = body_obj.matrix_world
    vg_names = [g.name for g in body_obj.vertex_groups]
    head_neck_bad = set()
    for vi, v in enumerate(me.vertices):
        hw = sum(g.weight for g in v.groups if g.group < len(vg_names) and vg_names[g.group] in ('Head', 'Neck'))
        if hw > 0.20:
            head_neck_bad.add(vi)
    body_mat_idx = next((i for i, m in enumerate(me.materials) if m and m.name == '_Body'), 0)

    bm_t = bmesh.new()
    vmap = {}
    torso_pts = []
    for p in me.polygons:
        if p.material_index != body_mat_idx:
            continue
        if any(vi in head_neck_bad for vi in p.vertices):
            continue
        p_wps = [mw @ me.vertices[vi].co for vi in p.vertices]
        if any((z_lo - 0.14) < wp.z < (z_hi + 0.03) and abs(wp.x) < 0.26 for wp in p_wps):
            for vi, wp in zip(p.vertices, p_wps):
                if vi not in vmap:
                    torso_pts.append(wp)
                    vmap[vi] = bm_t.verts.new(wp)
            try:
                bm_t.faces.new([vmap[vi] for vi in p.vertices])
            except ValueError:
                pass
    bm_t.normal_update()
    bvh = BVHTree.FromBMesh(bm_t)

    chest_pts = [p for p in torso_pts if z_lo + 0.05 <= p.z <= z_hi]
    tor_cy = 0.5 * (min(p.y for p in chest_pts) + max(p.y for p in chest_pts)) if chest_pts else -0.02

    def snap_pt(px, py, pz, off=0.004):
        rdir = mathutils.Vector((0.0, 1.0 if py < tor_cy else -1.0, 0.0))
        orig = mathutils.Vector((px, tor_cy - 0.38 if py < tor_cy else tor_cy + 0.38, pz))
        loc, nrm, _, _ = bvh.ray_cast(orig, rdir, 0.65)
        if loc is None:
            loc, nrm, _, _ = bvh.find_nearest(mathutils.Vector((px, py, pz)))
        if loc is None:
            return mathutils.Vector((px, py, pz))
        if nrm.dot(-rdir) < 0:
            nrm = -nrm
        return loc + nrm * off

    def snap_side(px_sign, py, pz, off=0.003):
        rdir = mathutils.Vector((-px_sign, 0.0, 0.0))
        orig = mathutils.Vector((px_sign * 0.34, py, pz))
        loc, nrm, _, _ = bvh.ray_cast(orig, rdir, 0.45)
        if loc is None:
            loc, nrm, _, _ = bvh.find_nearest(mathutils.Vector((px_sign * 0.14, py, pz)))
        if loc is None:
            return mathutils.Vector((px_sign * 0.14, py, pz))
        if nrm.x * px_sign < 0:
            nrm = -nrm
        return loc + nrm * off

    bm = bmesh.new()
    trim_idx = 1 if trim_mat is not None else 0
    def make_patch(xs_g, zs_g, y_sign, thick=0.016, off=0.005, mat_idx=0):
        nu, nv = len(xs_g), len(zs_g)
        gf, gb = [], []
        for pz in zs_g:
            rf, rb = [], []
            for px in xs_g:
                sf = snap_pt(px, y_sign * 0.18, pz, off=off)
                sb = sf + mathutils.Vector((0.0, y_sign * thick, 0.0))
                rf.append(bm.verts.new(sb))
                rb.append(bm.verts.new(sf))
            gf.append(rf)
            gb.append(rb)
        def add_f(vs):
            f = bm.faces.new(vs)
            f.material_index = mat_idx
        for j in range(nv - 1):
            for i in range(nu - 1):
                add_f((gf[j][i], gf[j][i + 1], gf[j + 1][i + 1], gf[j + 1][i]))
                add_f((gb[j][i], gb[j + 1][i], gb[j + 1][i + 1], gb[j][i + 1]))
        for i in range(nu - 1):
            add_f((gb[0][i], gf[0][i], gf[0][i + 1], gb[0][i + 1]))
            add_f((gb[-1][i], gb[-1][i + 1], gf[-1][i + 1], gf[-1][i]))
        for j in range(nv - 1):
            add_f((gb[j][0], gb[j + 1][0], gf[j + 1][0], gf[j][0]))
            add_f((gb[j][-1], gf[j][-1], gf[j + 1][-1], gb[j + 1][-1]))

    make_patch([-0.102 + i * 0.034 for i in range(7)], [z_lo + 0.04 + j * 0.038 for j in range(7)], -1.0, thick=0.015, off=0.006, mat_idx=0)
    make_patch([-0.096 + i * 0.032 for i in range(7)], [z_lo + 0.05 + j * 0.037 for j in range(6)],  1.0, thick=0.014, off=0.006, mat_idx=0)
    make_patch([-0.118 + i * 0.0393 for i in range(7)], [z_lo + 0.025 + j * 0.042 for j in range(7)], -1.0, thick=0.005, off=0.003, mat_idx=trim_idx)
    make_patch([-0.112 + i * 0.0373 for i in range(7)], [z_lo + 0.035 + j * 0.040 for j in range(6)],  1.0, thick=0.005, off=0.003, mat_idx=trim_idx)
    for side in (-1.0, 1.0):
        c_pts = []
        sx = side * 0.102
        for k_s in range(11):
            s_t = k_s / 10.0
            ang = math.pi * s_t
            ray_p = mathutils.Vector((sx, tor_cy - 0.17 * math.cos(ang), z_hi - 0.05 + 0.13 * math.sin(ang)))
            tgt_p = mathutils.Vector((sx, tor_cy, z_hi - 0.12))
            loc, nrm, _, _ = bvh.ray_cast(ray_p, (tgt_p - ray_p).normalized(), 0.45)
            if loc is None:
                loc, nrm, _, _ = bvh.find_nearest(ray_p)
            if loc is not None and loc.z > z_hi - 0.005:
                loc.z = z_hi - 0.005
            n = nrm if nrm else mathutils.Vector((0.0, 0.0, 1.0))
            if n.dot(ray_p - tgt_p) < 0:
                n = -n
            c_pts.append((loc + n * 0.0035, n))
        w = 0.018
        ring_b = []
        for p, n in c_pts:
            ring_b.append((
                bm.verts.new(p - mathutils.Vector((w, 0.0, 0.0))),
                bm.verts.new(p + mathutils.Vector((w, 0.0, 0.0))),
                bm.verts.new(p - mathutils.Vector((w, 0.0, 0.0)) + n * 0.007),
                bm.verts.new(p + mathutils.Vector((w, 0.0, 0.0)) + n * 0.007),
            ))
        for j in range(len(ring_b) - 1):
            a, b = ring_b[j], ring_b[j + 1]
            for fvs in ((a[2], a[3], b[3], b[2]), (a[0], b[0], b[1], a[1]), (a[0], a[2], b[2], b[0]), (a[1], b[1], b[3], a[3])):
                f = bm.faces.new(fvs)
                f.material_index = trim_idx
        for fvs in ((ring_b[0][0], ring_b[0][1], ring_b[0][3], ring_b[0][2]), (ring_b[-1][0], ring_b[-1][2], ring_b[-1][3], ring_b[-1][1])):
            f = bm.faces.new(fvs)
            f.material_index = trim_idx

    ys_cum = [tor_cy - 0.105 + k * 0.035 for k in range(7)]
    zs_cum = [z_lo + 0.04, z_lo + 0.095]
    for sgn in (-1.0, 1.0):
        grid_f, grid_b = [], []
        for pz in zs_cum:
            row_f, row_b = [], []
            for py in ys_cum:
                sf = snap_side(sgn, py, pz, off=0.003)
                sb = sf + mathutils.Vector((sgn * 0.008, 0.0, 0.0))
                row_f.append(bm.verts.new(sb))
                row_b.append(bm.verts.new(sf))
            grid_f.append(row_f)
            grid_b.append(row_b)
        for i in range(len(ys_cum) - 1):
            for fvs in (
                (grid_f[0][i], grid_f[0][i + 1], grid_f[1][i + 1], grid_f[1][i]),
                (grid_b[0][i], grid_b[1][i], grid_b[1][i + 1], grid_b[0][i + 1]),
                (grid_b[0][i], grid_f[0][i], grid_f[0][i + 1], grid_b[0][i + 1]),
                (grid_b[1][i], grid_b[1][i + 1], grid_f[1][i + 1], grid_f[1][i]),
            ):
                f = bm.faces.new(fvs)
                f.material_index = trim_idx
        for fvs in (
            (grid_b[0][0], grid_b[1][0], grid_f[1][0], grid_f[0][0]),
            (grid_b[0][-1], grid_f[0][-1], grid_f[1][-1], grid_b[1][-1]),
        ):
            f = bm.faces.new(fvs)
            f.material_index = trim_idx

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me_out = bpy.data.meshes.new(name)
    bm.to_mesh(me_out)
    bm.free()
    bm_t.free()
    obj = bpy.data.objects.new(name, me_out)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if trim_mat:
        obj.data.materials.append(trim_mat)
    transfer_surface_weights(
        arm, body_obj, obj,
        allowed_bones={'Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder'}, fallback_bone=bone_name,
        project_surface=True, body_refs=body_refs,
    )


def upright_barrel_quat(fwd_vec):
    fwd = fwd_vec.normalized()
    y_ax = -fwd
    up_ref = mathutils.Vector((0.0, 0.0, 1.0))
    if abs(y_ax.dot(up_ref)) > 0.98:
        up_ref = mathutils.Vector((0.0, 1.0, 0.0))
    x_ax = y_ax.cross(up_ref).normalized()
    z_ax = x_ax.cross(y_ax).normalized()
    return mathutils.Matrix((
        (x_ax.x, y_ax.x, z_ax.x),
        (x_ax.y, y_ax.y, z_ax.y),
        (x_ax.z, y_ax.z, z_ax.z),
    )).to_quaternion()


def build_pistol_mesh(name='CastPistol'):
    bm = bmesh.new()
    def add_box(cx, cy, cz, sx, sy, sz, rx=0.0):
        m = mathutils.Matrix.Translation((cx, cy, cz)) @ mathutils.Matrix.Rotation(rx, 4, 'X') @ mathutils.Matrix.Diagonal((sx, sy, sz, 1.0))
        bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    # Canonical weapon frame: +X right, +Y forward barrel, +Z up, grip center at (0, 0, 0)
    add_box(0.0, -0.006, -0.012, 0.026, 0.042, 0.088, rx=-0.24)  # raked grip
    add_box(0.0,  0.062,  0.050, 0.028, 0.168, 0.032)             # slide + barrel (+Y forward)
    add_box(0.0,  0.042,  0.028, 0.024, 0.118, 0.018)             # frame + dustcover
    add_box(0.0,  0.032,  0.012, 0.009, 0.028, 0.022)             # trigger guard
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_mat('PistolMat', (0.045, 0.048, 0.055, 1.0), rough=0.28, metal=0.82))
    return obj


def build_stribog_smg(name='CastLongGun'):
    """Procedurally authored Grand Power Stribog-pattern compact SMG/PDW (long-gun-reference-2.jpg.b64).
    Origin (0,0,0) = rear pistol grip center inside RightHand palm; +X = right, +Y = barrel forward, +Z = up."""
    bm = bmesh.new()
    # mat slots: 0=LongGunMat (upper receiver/barrel), 1=LongGunPolymerMat (lower/grip/rail/sights/foregrip), 2=LongGunMagMat (smoked curved mag)
    def add_box(cx, cy, cz, sx, sy, sz, rx=0.0, ry=0.0, rz=0.0, mat_idx=0):
        rot = mathutils.Euler((rx, ry, rz), 'XYZ').to_matrix().to_4x4()
        mat = mathutils.Matrix.Translation((cx, cy, cz)) @ rot @ mathutils.Matrix.Diagonal((sx, sy, sz, 1.0))
        res = bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
        vert_set = set(res['verts'])
        for f in bm.faces:
            if all(v in vert_set for v in f.verts):
                f.material_index = mat_idx

    def add_cyl(cx, cy, cz, r, length, axis='Y', segs=16, mat_idx=0):
        rot = mathutils.Matrix.Rotation(math.pi * 0.5, 4, 'X') if axis == 'Y' else mathutils.Matrix.Identity(4)
        mat = mathutils.Matrix.Translation((cx, cy, cz)) @ rot
        res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r, depth=length, matrix=mat)
        vert_set = set(res['verts'])
        for f in bm.faces:
            if all(v in vert_set for v in f.verts):
                f.material_index = mat_idx

    # 1. Pistol grip (raked ~16 deg rear at base, palm wrap centered at origin) + beavertail backstrap
    add_box(0.0, -0.004, -0.012, 0.029, 0.044, 0.100, rx=-0.28, mat_idx=1)
    add_box(0.0, -0.013, -0.060, 0.032, 0.048, 0.014, rx=-0.28, mat_idx=1)  # grip floorplate flare
    # 2. Trigger guard + curved trigger + polymer lower receiver (seated lower onto thumb web)
    add_box(0.0,  0.044,  0.034, 0.034, 0.168, 0.026, mat_idx=1)  # lower receiver block
    add_box(0.0,  0.038, -0.004, 0.014, 0.054, 0.007, mat_idx=1)  # bottom trigger guard loop
    add_box(0.0,  0.064,  0.010, 0.014, 0.008, 0.028, mat_idx=1)  # front trigger guard post
    add_box(0.0,  0.038,  0.014, 0.006, 0.007, 0.022, rx=0.18, mat_idx=0)  # flat match trigger
    # 3. Flared magwell + curved smoked 30-round stick magazine (forward at +0.09..+0.15 m)
    add_box(0.0,  0.106,  0.014, 0.036, 0.050, 0.040, rx=0.14, mat_idx=1)  # magwell collar
    # 3 segments giving natural gentle forward curve matching Grand Power Stribog photo
    add_box(0.0,  0.110, -0.026, 0.024, 0.038, 0.048, rx=0.16, mat_idx=2)
    add_box(0.0,  0.120, -0.068, 0.024, 0.038, 0.048, rx=0.24, mat_idx=2)
    add_box(0.0,  0.133, -0.106, 0.024, 0.038, 0.040, rx=0.30, mat_idx=2)
    add_box(0.0,  0.142, -0.128, 0.029, 0.044, 0.014, rx=0.30, mat_idx=1)  # magazine bumper pad
    # 4. Monolithic Stribog extruded anodized upper receiver + ventilated handguard (+0.046..+0.114 m Z)
    add_box(0.0,  0.102,  0.080, 0.042, 0.342, 0.066, mat_idx=0)  # main receiver body (-0.069..+0.273 m)
    # Side bevel ribs / cooling vent framing along front handguard (+0.14..+0.265 m)
    add_box(0.0,  0.205,  0.106, 0.045, 0.132, 0.014, mat_idx=0)  # upper handguard brow rib
    add_box(0.0,  0.205,  0.054, 0.045, 0.132, 0.014, mat_idx=0)  # lower handguard brow rib
    add_box(0.0, -0.071,  0.072, 0.040, 0.012, 0.084, mat_idx=1)  # rear Picatinny backplate + sling loop cap
    # Charging handle jutting cleanly from left front slot (-X left)
    add_box(-0.030, 0.215, 0.095, 0.026, 0.012, 0.012, mat_idx=1)
    # 5. Top Picatinny rail + flip-up iron sights
    add_box(0.0,  0.102,  0.117, 0.022, 0.336, 0.009, mat_idx=1)
    for k in range(14):
        yy = -0.055 + k * 0.024
        add_box(0.0, yy, 0.123, 0.024, 0.011, 0.005, mat_idx=1)
    # Rear + front flip-up backup sights
    add_box(0.0, -0.046,  0.137, 0.024, 0.020, 0.026, mat_idx=1)
    add_box(0.0,  0.252,  0.137, 0.022, 0.018, 0.026, mat_idx=1)
    # 6. Lower Picatinny handguard rail + compact angled foregrip/handstop (+0.165..+0.255 m)
    add_box(0.0,  0.205,  0.042, 0.024, 0.115, 0.010, mat_idx=1)
    add_box(0.0,  0.210,  0.026, 0.030, 0.084, 0.024, rx=0.20, mat_idx=1)  # angled handstop wedge
    # 7. Exposed barrel + threaded muzzle compensator (+0.273..+0.336 m)
    add_cyl(0.0,  0.296,  0.082, 0.0105, 0.048, axis='Y', mat_idx=0)
    add_cyl(0.0,  0.326,  0.082, 0.0135, 0.024, axis='Y', mat_idx=0)  # fluted thread protector / comp

    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_mat('LongGunMat',        (0.036, 0.040, 0.046, 1.0), rough=0.46, metal=0.58))
    obj.data.materials.append(make_mat('LongGunPolymerMat', (0.015, 0.017, 0.020, 1.0), rough=0.78, metal=0.05))
    obj.data.materials.append(make_mat('LongGunMagMat',     (0.088, 0.076, 0.066, 1.0), rough=0.24, metal=0.08))
    return obj, mathutils.Vector((0.0, 0.340, 0.082)), mathutils.Vector((0.0, 1.0, 0.0))


def attach_maya_silhouette(arm, body, head_z_top, torso_z_lo=0.86, torso_z_hi=1.45):
    # 1. Sculpted dark tapered ponytail (#15100D, rough 0.72) hanging rear of Head past collar
    hair_mat = make_mat('MayaPonytailMat', (0.009, 0.006, 0.005, 1.0), rough=0.72, metal=0.0)
    strap_mat = make_mat('MayaStrapMat', (0.010, 0.011, 0.014, 1.0), rough=0.56, metal=0.0)

    mw_h = arm.matrix_world @ arm.pose.bones['Head'].matrix
    hq = mw_h.translation
    bm = bmesh.new()
    # Ponytail knot + 7 descending tapered profile rings behind skull (+Y backward, -Z down)
    segs = 12
    rings = []
    curve = [
        (0.0, hq.y + 0.088, head_z_top - 0.105, 0.024),
        (0.0, hq.y + 0.115, head_z_top - 0.115, 0.030),
        (0.0, hq.y + 0.132, head_z_top - 0.155, 0.034),
        (0.0, hq.y + 0.136, head_z_top - 0.215, 0.029),
        (0.0, hq.y + 0.130, head_z_top - 0.285, 0.021),
        (0.0, hq.y + 0.120, head_z_top - 0.345, 0.011),
        (0.0, hq.y + 0.114, head_z_top - 0.375, 0.003),
    ]
    for cx, cy, cz, rad in curve:
        ring = []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            ring.append(bm.verts.new((cx + math.cos(a) * rad, cy + math.sin(a) * rad * 0.85, cz)))
        rings.append(ring)
    for r in range(len(rings) - 1):
        for i in range(segs):
            i2 = (i + 1) % segs
            bm.faces.new((rings[r][i], rings[r][i2], rings[r+1][i2], rings[r+1][i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('MayaPonytail'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    pt_obj = bpy.data.objects.new('MayaPonytail', me); bpy.context.collection.objects.link(pt_obj)
    pt_obj.data.materials.append(hair_mat)
    skin_attach_exact(arm, body, pt_obj, 'Head', action_obj=None)

    # 2. BVHTree torso-contoured diagonal crossbody strap + right-hip pouch (weighted Spine1)
    dg = bpy.context.evaluated_depsgraph_get()
    eb = body.evaluated_get(dg); em = eb.to_mesh(); mw = body.matrix_world
    bm_t = bmesh.new(); vmap = {}
    for v in em.vertices:
        wp = mw @ v.co
        if (torso_z_lo - 0.08) < wp.z < (torso_z_hi + 0.10) and abs(wp.x) < 0.26:
            vmap[v.index] = bm_t.verts.new(wp)
    for p in em.polygons:
        if all(vi in vmap for vi in p.vertices):
            try: bm_t.faces.new([vmap[vi] for vi in p.vertices])
            except ValueError: pass
    eb.to_mesh_clear(); bm_t.normal_update(); bvh = BVHTree.FromBMesh(bm_t)

    bm_s = bmesh.new()
    # Closed diagonal loop wrapping front Left-shoulder -> Right-hip, and back Right-hip -> Left-shoulder
    n_pts = 28; width = 0.042; thick = 0.008; quads = []
    for k in range(n_pts):
        ph = (k / n_pts) * math.pi * 2.0
        # x swings left shoulder (+0.11) to right hip (-0.16), z swings top (1.42) to hip (0.90)
        t_diag = 0.5 * (1.0 + math.cos(ph))
        x_p = -0.155 + 0.265 * t_diag
        z_p = 0.90 + 0.50 * t_diag
        rad_dir = mathutils.Vector((0.18 * math.sin(ph), -0.35 if ph < math.pi else 0.35, 0.0)).normalized()
        orig = mathutils.Vector((x_p, 0.0, z_p)) + rad_dir * 0.42
        loc, nrm, _, _ = bvh.ray_cast(orig, -rad_dir, 0.6)
        if loc is None:
            loc, nrm, _, _ = bvh.find_nearest(mathutils.Vector((x_p, -0.12 if ph < math.pi else 0.12, z_p)))
        n = nrm if nrm else -rad_dir
        tang = mathutils.Vector((0.265, 0.0, 0.50)).normalized()
        side_v = n.cross(tang).normalized() * (width * 0.5)
        p_base = loc + n * 0.004
        v0 = bm_s.verts.new(p_base - side_v)
        v1 = bm_s.verts.new(p_base + side_v)
        v2 = bm_s.verts.new(p_base + side_v + n * thick)
        v3 = bm_s.verts.new(p_base - side_v + n * thick)
        quads.append((v0, v1, v2, v3))
    for k in range(n_pts):
        a, b = quads[k], quads[(k + 1) % n_pts]
        bm_s.faces.new((a[3], a[2], b[2], b[3]))
        bm_s.faces.new((a[0], b[0], b[1], a[1]))
        bm_s.faces.new((a[0], a[3], b[3], b[0]))
        bm_s.faces.new((a[1], b[1], b[2], a[2]))
    # Hip pouch at Right hip (-0.17, -0.02, 0.89)
    loc_p, _, _, _ = bvh.find_nearest(mathutils.Vector((-0.17, -0.02, 0.89)))
    bmesh.ops.create_cube(bm_s, size=1.0, matrix=mathutils.Matrix.Translation((loc_p.x - 0.02, loc_p.y, loc_p.z)) @ mathutils.Matrix.Diagonal((0.055, 0.14, 0.16, 1.0)))
    me_s = bpy.data.meshes.new('MayaStrap'); bm_s.to_mesh(me_s); bm_s.free(); bm_t.free()
    obj_s = bpy.data.objects.new('MayaStrap', me_s); bpy.context.collection.objects.link(obj_s)
    obj_s.data.materials.append(strap_mat)
    transfer_surface_weights(
        arm, body, obj_s,
        allowed_bones={'Hips', 'Spine', 'Spine1', 'Spine2'}, fallback_bone='Spine1',
        project_surface=True,
    )


def build_cole_gauze(arm, body, head_z_top):
    # Forehead bloodstained gauze pad (#CFCBC4 + #B02824 blood spot, rough 0.95)
    dg = bpy.context.evaluated_depsgraph_get()
    eb = body.evaluated_get(dg); em = eb.to_mesh(); mw = body.matrix_world
    bm_h = bmesh.new(); vmap = {}
    for v in em.vertices:
        wp = mw @ v.co
        if wp.z > 1.56 and wp.y < 0.0:
            vmap[v.index] = bm_h.verts.new(wp)
    for p in em.polygons:
        if all(vi in vmap for vi in p.vertices):
            try: bm_h.faces.new([vmap[vi] for vi in p.vertices])
            except ValueError: pass
    eb.to_mesh_clear(); bm_h.normal_update(); bvh = BVHTree.FromBMesh(bm_h)

    gauze_mat = make_mat('ColeGauzeMat', (0.61, 0.59, 0.56, 1.0), rough=0.95, metal=0.0) # <=0.68 linear
    blood_mat = make_mat('ColeBloodMat', (0.42, 0.025, 0.02, 1.0), rough=0.95, metal=0.0)
    bm = bmesh.new()
    # Rounded organic 7x6 gauze over right brow/temple (manifold, chamfered corners + organic stain)
    xs = [-0.036 + i * 0.0076 for i in range(7)]
    zs = [head_z_top - 0.068 + j * 0.0064 for j in range(6)]
    cx_g, cz_g = 0.5 * (xs[0] + xs[-1]), 0.5 * (zs[0] + zs[-1])
    gf, gb = [], []
    for j, pz0 in enumerate(zs):
        rf, rb = [], []
        for i, px0 in enumerate(xs):
            # Chamfer outer 4 corner vertices inward toward pad center so pad silhouette is curved
            is_c = (i in (0, 6) and j in (0, 5))
            px = (cx_g + 0.68 * (px0 - cx_g)) if is_c else px0
            pz = (cz_g + 0.68 * (pz0 - cz_g)) if is_c else pz0
            orig = mathutils.Vector((px, -0.30, pz))
            loc, nrm, _, _ = bvh.ray_cast(orig, mathutils.Vector((0.0, 1.0, 0.0)), 0.4)
            if loc is None: loc, nrm, _, _ = bvh.find_nearest(mathutils.Vector((px, -0.10, pz)))
            n = nrm if nrm else mathutils.Vector((0, -1, 0))
            if n.y > 0: n = -n
            p_b = loc + n * 0.002
            p_f = p_b + n * 0.004
            rb.append(bm.verts.new(p_b)); rf.append(bm.verts.new(p_f))
        gb.append(rb); gf.append(rf)
    blood_quads = {(2, 2), (3, 2), (2, 3), (3, 3), (4, 2)}
    for j in range(5):
        for i in range(6):
            f = bm.faces.new((gf[j][i], gf[j][i+1], gf[j+1][i+1], gf[j+1][i]))
            f.material_index = 1 if (i, j) in blood_quads else 0
            bm.faces.new((gb[j][i], gb[j+1][i], gb[j+1][i+1], gb[j][i+1]))
    me = bpy.data.meshes.new('ColeGauze'); bm.to_mesh(me); bm.free(); bm_h.free()
    obj = bpy.data.objects.new('ColeGauze', me); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(gauze_mat); obj.data.materials.append(blood_mat)
    skin_attach_exact(arm, body, obj, 'Head', action_obj=None)


def pack_nla(arm, actions):
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = None
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
    for act in actions:
        tr = arm.animation_data.nla_tracks.new()
        tr.name = act.name
        st = int(round(act.frame_range[0]))
        tr.strips.new(act.name, st, act)


def curl_right_fingers(arm, actions):
    FINGER_CURLS = {
        'RightHandIndex1': (0.0, 0.0, -0.75), 'RightHandIndex2': (0.0, 0.0, -0.85),
        'RightHandMiddle1': (0.0, 0.0, -0.80), 'RightHandMiddle2': (0.0, 0.0, -0.90),
        'RightHandRing1': (0.0, 0.0, -0.82), 'RightHandRing2': (0.0, 0.0, -0.90),
        'RightHandPinky1': (0.0, 0.0, -0.75), 'RightHandPinky2': (0.0, 0.0, -0.80),
    }
    for act in actions:
        arm.animation_data.action = act
        s0, s1 = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        for bn, eul in FINGER_CURLS.items():
            pb = arm.pose.bones.get(bn)
            if not pb: continue
            pb.rotation_mode = 'QUATERNION'
            q_curl = mathutils.Euler(eul, 'XYZ').to_quaternion()
            for f in range(s0, s1 + 1):
                bpy.context.scene.frame_set(f)
                pb.rotation_quaternion = pb.rotation_quaternion @ q_curl
                pb.keyframe_insert('rotation_quaternion', frame=f)


def finalize_and_export(arm, keep_actions, out_glb):
    # Purge unused actions, strip .001 suffixes without losing exact clip names, pack clean NLA, export GLB at 30fps
    for a in list(bpy.data.actions):
        if a not in keep_actions:
            bpy.data.actions.remove(a)
    orig_names = [a.name.split('.')[0] for a in keep_actions]
    for i, a in enumerate(keep_actions):
        a.name = f'__tmp_{i}'
    for a, nm in zip(keep_actions, orig_names):
        a.name = nm
    pack_nla(arm, keep_actions)
    bpy.context.scene.render.fps = 30
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        export_animations=True,
        export_frame_range=True,
        export_force_sampling=True,
        export_all_influences=False,
        export_apply=False,
        export_yup=True,
    )


def build_gunman(args):
    print('=== BUILDING GUNMAN (White_M_1_Util -> gunman-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = setup_valid_rig(
        os.path.join(args.valid_dir, 'White_M_1_Util.glb'), 1.80,
        os.path.join(args.tex_dir, 'gunman_color.jpg'),
        os.path.join(args.tex_dir, 'gunman_rough.jpg'),
        os.path.join(args.tex_dir, 'gunman_nm.jpg'),
    )
    restore_rest_state(arm, basis_T0)
    body_refs = collect_body_skin_refs(arm, body)
    gear_mat = make_mat('GunmanGearMat', (0.022, 0.024, 0.026, 1.0), rough=0.90, metal=0.0)
    gear_trim = make_mat('GunmanGearTrimMat', (0.012, 0.013, 0.015, 1.0), rough=0.92, metal=0.0)
    beanie_mat = make_mat('GunmanBeanieMat', (0.024, 0.026, 0.030, 1.0), rough=0.92, metal=0.0)
    build_fitted_beanie(arm, body, 'Head', head_z_thresh=1.58, name='GunmanBeanie', mat=beanie_mat,
                        rim_thick=0.011, dome_thick=0.0075, brow_drop=0.080, body_refs=body_refs)
    build_fitted_rig(arm, body, 'Spine2', z_lo=1.16, z_hi=1.49, name='GunmanRig',
                     mat=gear_mat, trim_mat=gear_trim, body_refs=body_refs)

    arm_y, R_S0, pos_S0 = load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}

    # Import standalone Mixamo source actions
    src_acts = {}
    for key, fbx in [
        ('walk', 'pistol-walk.fbx'), ('walk_bwd', 'pistol-walk-backward.fbx'),
        ('strafe_l', 'pistol-strafe.fbx'), ('strafe_r', 'pistol-strafe-mirrored.fbx'),
        ('arc_l', 'pistol-walk-arc-left.fbx'), ('arc_r', 'pistol-walk-arc-right.fbx'),
        ('run_aim', 'pistol-run-aimed.fbx'), ('run', 'pistol-run.fbx'),
        ('idle', 'pistol-idle.fbx'), ('aim', 'pistol-aim.fbx'),
        ('kneel_idle', 'pistol-kneeling-idle.fbx'), ('crouch_walk', 'crouch-walk-forward.fbx'),
        ('shoot', 'shooting.fbx'), ('shoot_gun', 'shooting-gun.fbx'),
        ('gunplay', 'gunplay.fbx'), ('cover_fire', 'shooting-pistol.fbx'),
        ('cover_peek', 'femme-peek-around-corner.fbx'),
        ('cover_stand', 'cover-idle-standing.fbx'), ('cover_crouch', 'cover-idle-crouched.fbx'),
        ('hit', 'hit-reaction.fbx'), ('hit_l', 'hit-reaction-left.fbx'),
        ('die_front', 'dying.fbx'), ('die_back', 'dying-backwards.fbx'),
        ('die_headshot', 'dying-headshot-knees.fbx'),
        ('cover_shoot', 'cover-to-shooting.fbx'),
        ('idle_alert', 'pistol-idle-alert.fbx'),
        ('turn', 'turning.fbx'),
    ]:
        src_acts[key] = import_mixamo_action(args.mixamo_dir, fbx)

    # Core direct & foot-locked retargets
    specs = [
        ('Pistol_Idle',          'idle',         False, False, False),
        ('Pistol_Idle_Alert',    'idle_alert',   False, False, False),
        ('Pistol_Aim',           'aim',          False, False, False),
        ('Pistol_Walk',          'walk',         True,  True,  False),
        ('Pistol_Walk_Back',     'walk_bwd',     True,  True,  False),
        ('Pistol_Strafe_L',      'strafe_l',     True,  True,  False),
        ('Pistol_Strafe_R',      'strafe_r',     True,  True,  False),
        ('Pistol_Walk_ArcL',     'arc_l',        True,  True,  False),
        ('Pistol_Walk_ArcR',     'arc_r',        True,  True,  False),
        ('Pistol_Run_Aimed',     'run_aim',      True,  True,  True),
        ('Pistol_Run',           'run',          True,  True,  True),
        ('Pistol_Kneel_Idle',    'kneel_idle',   False, False, False),
        ('Shooting',             'shoot',        False, False, False),
        ('Shooting_Gun',         'shoot_gun',    False, False, False),
        ('Gunplay',              'gunplay',      False, False, False),
        ('Cover_Fire',           'cover_fire',   False, False, False),
        ('Cover_To_Shooting',    'cover_shoot',  False, False, False),
        ('Cover_Peek',           'cover_peek',   False, False, False),
        ('Cover_Idle_Stand',     'cover_stand',  False, False, False),
        ('Cover_Idle_Crouch',    'cover_crouch', False, False, False),
        ('Hit_React',            'hit',          False, False, False),
        ('Hit_React_L',          'hit_l',        False, False, False),
        ('Death_Front',          'die_front',    False, False, False),
        ('Death_Back',           'die_back',     False, False, False),
        ('Dying_Headshot_Knees', 'die_headshot', False, False, False),
        ('Turn_In_Place',        'turn',         False, False, False),
    ]
    for dst, sk, ip, fl, is_r in specs:
        a, m = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_acts[sk], dst, sole, in_place=ip, foot_lock=fl, is_run=is_r)
        kept.append(a); metrics[dst] = m

    # Authored 1.0x Spine1+ additive recoil layers over locomotion (Cherie ruling, Nov 24)
    for dst, base_k, fire_k, u0, u1, f_str, is_r in [
        ('Pistol_Walk_Fire',      'walk',     'shoot',     1, 25, 1.0, False),
        ('Pistol_Walk_Fire_SG',   'walk',     'shoot_gun', 15, 39, 1.0, False),
        ('Pistol_Strafe_L_Fire',  'strafe_l', 'shoot',     1, 25, 1.0, False),
        ('Pistol_Run_Aimed_Fire', 'run_aim',  'shoot',     1, 23, 1.0, True),
    ]:
        a, m = retarget_clip(
            arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_acts[base_k], dst, sole,
            in_place=True, foot_lock=True, is_run=is_r,
            additive_fire=(src_acts[fire_k], u0, u1), additive_strength=f_str
        )
        kept.append(a); metrics[dst] = m

    # Layered Crouch Walk + Pistol Kneeling Idle upper body
    a_cw, m_cw = retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_acts['crouch_walk'], 'Crouch_Walk_Aim', sole,
        in_place=True, foot_lock=True, is_run=False,
        upper_override=(src_acts['kneel_idle'], 10), upper_bones=UPPER_SPINE1_BONES
    )
    kept.append(a_cw); metrics['Crouch_Walk_Aim'] = m_cw

    # Delete anchor Y Bot before attaching weapon & export
    bpy.data.objects.remove(arm_y, do_unlink=True)

    restore_rest_state(arm, basis_T0)
    muzzle_info = attach_seated_long_gun(arm, body, mesh_name='GunmanLongGun', separate_mesh=True)

    curl_right_fingers(arm, kept)
    out_glb = os.path.join(args.out_dir, 'gunman-mixamo.glb')
    finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {'file': 'gunman-mixamo.glb', 'bytes': os.path.getsize(out_glb), 'tris': tris, 'mats': mats,
            'weapon_pattern': 'Grand Power Stribog compact SMG/PDW (procedural, project-owned)',
            'weapon_muzzle': muzzle_info, 'clips': metrics}


def seat_weapon_right_hand(arm, weapon_obj, muzzle_local, dir_local, action_obj=None, frame_idx=0, palm_bias=0.23, up_bias=0.26, palm_offset=0.030):
    """Seat a canonical (+X right, +Y barrel forward, +Z up, grip=0) weapon in RightHand using
    n2-figure.js's thumb-side palm-flip test on the hand anatomy, and return RightHand-local muzzle."""
    if not arm.animation_data:
        arm.animation_data_create()
    prev_act = arm.animation_data.action
    arm.animation_data.action = action_obj
    if action_obj is not None:
        bpy.context.scene.frame_set(int(frame_idx))
    bpy.context.view_layer.update()

    mw = arm.matrix_world
    rh = (mw @ arm.pose.bones['RightHand'].matrix).translation.copy()
    rm = (mw @ arm.pose.bones['RightHandMiddle1'].matrix).translation.copy()
    ri = (mw @ arm.pose.bones['RightHandIndex1'].matrix).translation.copy()
    rp = (mw @ arm.pose.bones['RightHandPinky1'].matrix).translation.copy()
    rt = (mw @ arm.pose.bones['RightHandThumb1'].matrix).translation.copy()

    fwd_h = (rm - rh).normalized()
    across = (ri - rp).normalized()
    palm = fwd_h.cross(across).normalized()
    if palm.dot(rt - rh) < 0.0:
        palm.negate()

    gun_fwd = (up_bias * across + 0.94 * fwd_h + palm_bias * palm).normalized()
    gun_right = gun_fwd.cross(across).normalized()
    gun_up = gun_right.cross(gun_fwd).normalized()

    rot_mat = mathutils.Matrix((
        (gun_right.x, gun_fwd.x, gun_up.x),
        (gun_right.y, gun_fwd.y, gun_up.y),
        (gun_right.z, gun_fwd.z, gun_up.z),
    ))
    grip_pos = rh.lerp(rm, 0.55) + palm * palm_offset

    weapon_obj.location = grip_pos
    weapon_obj.rotation_mode = 'QUATERNION'
    weapon_obj.rotation_quaternion = rot_mat.to_quaternion()
    bpy.context.view_layer.update()

    # Exact RightHand-local muzzle coordinates (preserved through glTF export because bone-local coords keep Blender armature axis)
    rh_inv = (mw @ arm.pose.bones['RightHand'].matrix).inverted()
    muzzle_w = weapon_obj.matrix_world @ muzzle_local
    dir_w = (weapon_obj.matrix_world.to_3x3() @ dir_local).normalized()
    tip_loc = rh_inv @ muzzle_w
    dir_loc = (rh_inv.to_3x3() @ dir_w).normalized()

    arm.animation_data.action = prev_act
    bpy.context.view_layer.update()
    return {
        'tip': [round(float(tip_loc.x), 4), round(float(tip_loc.y), 4), round(float(tip_loc.z), 4)],
        'dir': [round(float(dir_loc.x), 4), round(float(dir_loc.y), 4), round(float(dir_loc.z), 4)],
    }


def attach_seated_long_gun(arm, body, mesh_name='CastLongGun', separate_mesh=True):
    smg_obj, muzzle_local, dir_local = build_stribog_smg(mesh_name)
    muzzle_info = seat_weapon_right_hand(
        arm, smg_obj, muzzle_local, dir_local,
        action_obj=None, frame_idx=0,
        palm_bias=0.38, up_bias=-0.16, palm_offset=0.028,
    )
    skin_attach_exact(arm, body, smg_obj, 'RightHand', action_obj=None, separate_mesh=separate_mesh)
    return muzzle_info


def attach_seated_pistol(arm, body, kept, clip_name='Pistol_Aim', frame_idx=0, mesh_name='CastPistol', separate_mesh=False):
    pistol_obj = build_pistol_mesh(mesh_name)
    aim_act = [a for a in kept if a.name == clip_name][0]
    muzzle_info = seat_weapon_right_hand(
        arm, pistol_obj,
        mathutils.Vector((0.0, 0.148, 0.050)), mathutils.Vector((0.0, 1.0, 0.0)),
        action_obj=aim_act, frame_idx=frame_idx,
        palm_bias=0.14, up_bias=0.16, palm_offset=0.028,
    )
    skin_attach_exact(arm, body, pistol_obj, 'RightHand', action_obj=aim_act, frame_idx=frame_idx, separate_mesh=separate_mesh)
    return muzzle_info


def setup_n2_rig(glb_path, target_height=1.80):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=glb_path)
    arm = bpy.data.objects['Reference']
    body = bpy.data.objects['H_DDS_HighRes']

    ico = bpy.data.objects.get('Icosphere')
    if ico:
        bpy.data.objects.remove(ico, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    clear_pose(arm)

    # Strip N2's unseated bind-pose PistolMat AND misplaced native GearMat faces, keeping N2's _Body untouched!
    strip_mats = [i for i, m in enumerate(body.data.materials) if m and m.name in ('PistolMat', 'GearMat')]
    if strip_mats:
        bm = bmesh.new()
        bm.from_mesh(body.data)
        bm.faces.ensure_lookup_table()
        strip_set = set(strip_mats)
        del_faces = [f for f in bm.faces if f.material_index in strip_set]
        if del_faces:
            bmesh.ops.delete(bm, geom=del_faces, context='FACES')
            loose_v = [v for v in bm.verts if not v.link_faces]
            if loose_v:
                bmesh.ops.delete(bm, geom=loose_v, context='VERTS')
            bm.to_mesh(body.data)
        bm.free()
        for pi in sorted(strip_mats, reverse=True):
            old_m = body.data.materials[pi]
            body.data.materials.pop(index=pi)
            if old_m:
                bpy.data.materials.remove(old_m)

    # Scale cm-native N2 rig uniformly to target_height world meters with soles grounded at z=0
    bpy.context.view_layer.update()
    zs_raw = [v.co.z for v in body.data.vertices]
    sc = target_height / (max(zs_raw) - min(zs_raw))
    zmin_raw = min(zs_raw)
    arm.scale = (sc, sc, sc)
    arm.location = (0.0, 0.0, -zmin_raw * sc)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True); body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    bpy.context.view_layer.update()

    # Keep N2's native _Body & GearMat non-metallic & smooth-shaded
    for mat in body.data.materials:
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                bsdf.inputs['Metallic'].default_value = 0.0

    dg = bpy.context.evaluated_depsgraph_get()
    eval_b = body.evaluated_get(dg)
    em = eval_b.to_mesh()
    sole_info = {}
    for side in ('Left', 'Right'):
        fid = body.vertex_groups.find(f'{side}Foot')
        tid = body.vertex_groups.find(f'{side}ToeBase')
        fz = (arm.matrix_world @ arm.pose.bones[f'{side}Foot'].matrix).translation.z
        tz = (arm.matrix_world @ arm.pose.bones[f'{side}ToeBase'].matrix).translation.z
        f_vz = [(body.matrix_world @ v.co).z for v in em.vertices if any(g.group == fid and g.weight > 0.45 for g in v.groups)]
        t_vz = [(body.matrix_world @ v.co).z for v in em.vertices if any(g.group == tid and g.weight > 0.45 for g in v.groups)]
        sole_info[side] = {
            'foot_off': max(0.02, fz - (min(f_vz) if f_vz else 0.0)),
            'toe_off':  max(0.01, tz - (min(t_vz) if t_vz else 0.0)),
        }
    eval_b.to_mesh_clear()

    R_T0, pos_T0, basis_T0 = record_rest_state(arm)
    return arm, body, R_T0, pos_T0, basis_T0, sole_info


def build_n2(args):
    print('=== BUILDING N2 (valid-mocap.glb -> n2-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = setup_n2_rig(args.n2_glb, 1.80)
    restore_rest_state(arm, basis_T0)
    body_refs = collect_body_skin_refs(arm, body)
    # Port n2-figure.js IMPROVED vest & fitted tactical cap onto N2's untouched _Body
    n2_helmet_mat = make_mat('GearMat', (0.034, 0.036, 0.034, 1.0), rough=0.94, metal=0.0)
    n2_vest_mat   = make_mat('GearMatVest', (0.078, 0.082, 0.072, 1.0), rough=0.94, metal=0.0)
    n2_trim_mat   = make_mat('GearTrimMat', (0.038, 0.040, 0.036, 1.0), rough=0.92, metal=0.0)
    build_fitted_beanie(arm, body, 'Head', head_z_thresh=1.56, name='N2Helmet', mat=n2_helmet_mat,
                        rim_thick=0.012, dome_thick=0.009, brow_drop=0.079, nape_drop=0.042, side_drop=0.020,
                        body_refs=body_refs)
    build_fitted_rig(arm, body, 'Spine2', z_lo=1.14, z_hi=1.47, name='N2Vest',
                     mat=n2_vest_mat, trim_mat=n2_trim_mat, body_refs=body_refs)

    arm_y, R_S0, pos_S0 = load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}
    src = {}
    for key, fbx in [
        ('idle',         'pistol-idle.fbx'),
        ('idle_alert',   'pistol-idle-alert.fbx'),
        ('aim',          'pistol-aim.fbx'),
        ('walk',         'pistol-walk.fbx'),
        ('run_aim',      'pistol-run-aimed.fbx'),
        ('shoot',        'shooting.fbx'),
        ('cover_fire',   'shooting-pistol.fbx'),
        ('cover_shoot',  'cover-to-shooting.fbx'),
        ('hit',          'hit-reaction.fbx'),
        ('die_front',    'dying.fbx'),
        ('die_back',     'dying-backwards.fbx'),
        ('die_headshot', 'dying-headshot-knees.fbx'),
    ]:
        src[key] = import_mixamo_action(args.mixamo_dir, fbx)

    for dst, sk, ip, fl, is_r in [
        ('Pistol_Idle',          'idle',         False, False, False),
        ('Pistol_Idle_Alert',    'idle_alert',   False, False, False),
        ('Pistol_Aim',           'aim',          False, False, False),
        ('Pistol_Walk',          'walk',         True,  True,  False),
        ('Pistol_Run_Aimed',     'run_aim',      True,  True,  True),
        ('Shooting',             'shoot',        False, False, False),
        ('Cover_Fire',           'cover_fire',   False, False, False),
        ('Cover_To_Shooting',    'cover_shoot',  False, False, False),
        ('Hit_React',            'hit',          False, False, False),
        ('Death_Front',          'die_front',    False, False, False),
        ('Death_Back',           'die_back',     False, False, False),
        ('Dying_Headshot_Knees', 'die_headshot', False, False, False),
    ]:
        a, m = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src[sk], dst, sole, in_place=ip, foot_lock=fl, is_run=is_r)
        kept.append(a); metrics[dst] = m

    # Authored 1.0x Spine1+ additive recoil layers over locomotion (Cherie ruling, Nov 24)
    for dst, base_k, u0, u1, is_r in [
        ('Pistol_Walk_Fire',      'walk',    1, 25, False),
        ('Pistol_Run_Aimed_Fire', 'run_aim', 1, 23, True),
    ]:
        a, m = retarget_clip(
            arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src[base_k], dst, sole,
            in_place=True, foot_lock=True, is_run=is_r,
            additive_fire=(src['shoot'], u0, u1), additive_strength=1.0
        )
        kept.append(a); metrics[dst] = m

    bpy.data.objects.remove(arm_y, do_unlink=True)
    restore_rest_state(arm, basis_T0)
    muzzle_info = attach_seated_long_gun(arm, body, mesh_name='N2LongGun', separate_mesh=True)
    curl_right_fingers(arm, kept)
    out_glb = os.path.join(args.out_dir, 'n2-mixamo.glb')
    finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {'file': 'n2-mixamo.glb', 'bytes': os.path.getsize(out_glb), 'tris': tris, 'mats': mats,
            'weapon_pattern': 'Grand Power Stribog compact SMG/PDW (procedural, project-owned)',
            'weapon_muzzle': muzzle_info, 'clips': metrics}


def build_maya(args):
    print('=== BUILDING MAYA VANCE (Hispanic_F_1_Util -> maya-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = setup_valid_rig(
        os.path.join(args.valid_dir, 'Hispanic_F_1_Util.glb'), 1.68,
        os.path.join(args.tex_dir, 'maya_color.jpg'),
        os.path.join(args.tex_dir, 'maya_rough.jpg'),
        os.path.join(args.tex_dir, 'maya_nm.jpg'),
    )
    restore_rest_state(arm, basis_T0)
    attach_maya_silhouette(arm, body, head_z_top=1.68)

    arm_y, R_S0, pos_S0 = load_ybot_anchor(args.mixamo_dir)
    kept, metrics, ik_stats = [], {}, {}

    src_wb = import_mixamo_action(args.mixamo_dir, 'wheelbarrow-walk.fbx')
    src_pho = import_mixamo_action(args.mixamo_dir, 'pushing-heavy-object.fbx')
    src_ps = import_mixamo_action(args.mixamo_dir, 'push-start.fbx')
    src_pu = import_mixamo_action(args.mixamo_dir, 'pushing.fbx')
    src_px = import_mixamo_action(args.mixamo_dir, 'push-stop.fbx')
    src_wf = import_mixamo_action(args.mixamo_dir, 'walking-feminine.fbx')

    a_wc, m_wc = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_wb, 'Wheelchair_Push', sole, in_place=True, foot_lock=True)
    # Apply analytical 2-bone arm IK (+~12 cm wrist raise onto wheelchair handles at z=0.985m, x=+-0.23m)
    ik_wc = apply_maya_handle_ik(arm, R_T0, basis_T0, a_wc, handle_x=0.23, handle_y=-0.36, handle_z=0.985, grip_delta_z=0.125)
    kept.append(a_wc); metrics['Wheelchair_Push'] = m_wc; ik_stats['Wheelchair_Push'] = ik_wc

    # Batch-2 real bed-push: Pushing A Heavy Object (replaces constructed Bed_Push_Loop slice) + bed bar IK (z=1.00m)
    a_bp, m_bp = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_pho, 'Bed_Push_Loop', sole,
                               in_place=True, foot_lock=True, loop_crossfade=6)
    ik_bp = apply_maya_handle_ik(arm, R_T0, basis_T0, a_bp, handle_x=0.31, handle_y=None, handle_z=1.00, grip_delta_z=None)
    kept.append(a_bp); metrics['Bed_Push_Loop'] = m_bp; ik_stats['Bed_Push_Loop'] = ik_bp

    a_ps, m_ps = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_ps, 'Bed_Push_Start', sole, in_place=True, foot_lock=True)
    a_pu, m_pu = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_pu, 'Bed_Push_Raw', sole, in_place=True, foot_lock=True)
    a_px, m_px = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_px, 'Bed_Push_Stop', sole, in_place=True, foot_lock=True)
    a_wf, m_wf = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src_wf, 'Walk_Fem', sole, in_place=True, foot_lock=True)
    for dst, a, m in [('Bed_Push_Start', a_ps, m_ps), ('Bed_Push_Raw', a_pu, m_pu), ('Bed_Push_Stop', a_px, m_px), ('Walk_Fem', a_wf, m_wf)]:
        kept.append(a); metrics[dst] = m

    bpy.data.objects.remove(arm_y, do_unlink=True)
    out_glb = os.path.join(args.out_dir, 'maya-mixamo.glb')
    finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {'file': 'maya-mixamo.glb', 'bytes': os.path.getsize(out_glb), 'tris': tris,
            'mats': mats, 'clips': metrics, 'ik': ik_stats}


def build_cole(args):
    print('=== BUILDING COLE MERCER (White_M_3_Casual -> cole-mixamo.glb) ===')
    arm, body, R_T0, pos_T0, basis_T0, sole = setup_valid_rig(
        os.path.join(args.valid_dir, 'White_M_3_Casual.glb'), 1.80,
        os.path.join(args.tex_dir, 'cole_color.jpg'),
        os.path.join(args.tex_dir, 'cole_rough.jpg'),
        os.path.join(args.tex_dir, 'cole_nm.jpg'),
        barefoot_slender=True,
    )
    restore_rest_state(arm, basis_T0)
    build_cole_gauze(arm, body, head_z_top=1.80)

    arm_y, R_S0, pos_S0 = load_ybot_anchor(args.mixamo_dir)
    kept, metrics = [], {}
    src = {}
    for k, fbx in [
        ('sit_breath', 'sitting-idle-breathing.fbx'),
        ('sit_thighs', 'sitting-idle-thighs.fbx'),
        ('sit_still', 'sitting-idle-still.fbx'),
        ('sit_aim', 'aim-pistol-seated.fbx'),
        ('sit_lower', 'lower-pistol.fbx'),
        ('sit_motion', 'sitting-gun-motion.fbx'),
        ('sit_rub', 'sitting-rubbing-arm.fbx'),
        ('sit_dodge', 'sitting-dodges.fbx'),
        ('sit_disbelief', 'sitting-disbelief.fbx'),
        ('sit_dis_fwd', 'sitting-disbelief-forward.fbx'),
        ('lay_breath', 'laying-breathless.fbx'),
        ('lay_sleep', 'laying-sleeping.fbx'),
        ('lay_moan', 'laying-moaning.fbx'),
        ('inj_walk', 'injured-walking.fbx'),
        ('walk_arm_inj', 'walking-arm-injury.fbx'),
        ('sit_to_stand', 'sit-to-stand.fbx'),
        ('stand_to_sit', 'stand-to-sit.fbx'),
        ('shoot', 'shooting.fbx'),
    ]:
        src[k] = import_mixamo_action(args.mixamo_dir, fbx)

    for dst, sk, ip, fl in [
        ('Sit_Idle_Breath',       'sit_breath',   False, False),
        ('Sit_Idle_Thighs',       'sit_thighs',   False, False),
        ('Sit_Idle_Still',        'sit_still',    False, False),
        ('Sit_Aim_Pistol',        'sit_aim',      False, False),
        ('Sit_Lower_Pistol',      'sit_lower',    False, False),
        ('Sit_Gun_Motion',        'sit_motion',   False, False),
        ('Sit_Rub_Arm',           'sit_rub',      False, False),
        ('Sit_Dodge',             'sit_dodge',    False, False),
        ('Sit_Disbelief',         'sit_disbelief',False, False),
        ('Sit_Disbelief_Forward', 'sit_dis_fwd',  False, False),
        ('Lay_Breathless',        'lay_breath',   False, False),
        ('Lay_Sleeping',          'lay_sleep',    False, False),
        ('Lay_Moaning',           'lay_moan',     False, False),
        ('Injured_Walk',          'inj_walk',     True,  True),
        ('Walking_Arm_Injury',    'walk_arm_inj', True,  True),
        ('Sit_To_Stand',          'sit_to_stand', False, False),
        ('Stand_To_Sit',          'stand_to_sit', False, False),
    ]:
        a, m = retarget_clip(arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src[sk], dst, sole, in_place=ip, foot_lock=fl)
        kept.append(a); metrics[dst] = m

    # Layered seated firing aim+recoil (Sitting Idle Breath lower body + Shooting Spine1+ upper body)
    a_sf, m_sf = retarget_clip(
        arm_y, R_S0, pos_S0, arm, R_T0, pos_T0, basis_T0, src['sit_breath'], 'Sit_Aim_Fire', sole,
        in_place=False, foot_lock=False, upper_clip=(src['shoot'], 1, 35), upper_bones=UPPER_SPINE1_BONES
    )
    kept.append(a_sf); metrics['Sit_Aim_Fire'] = m_sf

    # Measure Cole's seated crown height (above ankle/seat-frame baseline)
    crown_stats = {}
    dg = bpy.context.evaluated_depsgraph_get()
    for cname in ('Sit_Aim_Fire', 'Sit_Aim_Pistol', 'Sit_Idle_Breath', 'Sit_Disbelief_Forward'):
        act_c = [a for a in kept if a.name.startswith(cname)][0]
        arm.animation_data.action = act_c
        bpy.context.scene.frame_set(10); bpy.context.view_layer.update()
        em = body.evaluated_get(dg).to_mesh()
        zs = [(body.matrix_world @ v.co).z for v in em.vertices]
        body.evaluated_get(dg).to_mesh_clear()
        hips_z = (arm.matrix_world @ arm.pose.bones['Hips'].matrix).translation.z
        # In wheelchair (seat surface at y=0.48m), pelvis base rests ~0.04m above seat cushion -> hips ~0.55m
        crown_stats[cname] = {
            'raw_crown_z_m': round(max(zs), 4),
            'hips_z_m': round(hips_z, 4),
            'raw_min_foot_z_m': round(min(zs), 4),
        }

    bpy.data.objects.remove(arm_y, do_unlink=True)

    # Separate skinned pistol on RightHand bound cleanly at upright two-handed Sit_Aim_Fire frame 0
    muzzle_info = attach_seated_pistol(arm, body, kept, 'Sit_Aim_Fire', 0, mesh_name='ColePistol', separate_mesh=True)
    curl_right_fingers(arm, [a for a in kept if a.name in ('Sit_Aim_Fire', 'Sit_Aim_Pistol', 'Sit_Lower_Pistol', 'Sit_Gun_Motion')])

    out_glb = os.path.join(args.out_dir, 'cole-mixamo.glb')
    finalize_and_export(arm, kept, out_glb)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    mats = len({m for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
    return {'file': 'cole-mixamo.glb', 'bytes': os.path.getsize(out_glb), 'tris': tris,
            'mats': mats, 'weapon_muzzle': muzzle_info, 'clips': metrics, 'seated_crown': crown_stats}


def main():
    args = parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    res_gun = build_gunman(args)
    res_maya = build_maya(args)
    res_cole = build_cole(args)
    res_n2   = build_n2(args)
    manifest = {'gunman': res_gun, 'maya': res_maya, 'cole': res_cole, 'n2': res_n2}
    mpath = os.path.join(args.out_dir, 'cast-pass-manifest.json')
    with open(mpath, 'w') as f:
        json.dump(manifest, f, indent=2)
    print('=== EXPORTED CAST PASS MANIFEST:', mpath, '===')
    for cname, rec in manifest.items():
        print(f'[{cname}] {rec["file"]}: {rec["bytes"]} B, {rec["tris"]} tris, {rec["mats"]} mats, {len(rec["clips"])} clips')
        for cl, m in rec['clips'].items():
            if m['authored_stance_mps'] > 0.1 or 'Wheelchair' in cl or 'Bed_Push_Loop' in cl:
                print(f'   {cl:24s}: root={m["authored_root_mps"]:.3f} m/s | stance={m["authored_stance_mps"]:.3f} m/s (n={m["stance_samples"]}) | slide={m["stance_slide_mm"]:.1f}mm | minZ={m["min_foot_z_mm"]:.1f}mm')


if __name__ == '__main__':
    main()

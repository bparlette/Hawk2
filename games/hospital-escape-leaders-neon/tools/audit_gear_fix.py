import json
import os
import bpy
import mathutils
from mathutils.bvhtree import BVHTree

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets', 'cast-pass'))
REPORT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'hospital-escape', 'tasking', 'responses', 'neon-gear-fix-shots', 'after-audit.json'))


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30


def set_action(arm, clip_name, frame_idx=0):
    if not arm.animation_data:
        arm.animation_data_create()
    if clip_name is None:
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)
        bpy.context.view_layer.update()
        return
    act = bpy.data.actions.get(clip_name)
    if act is None:
        for tr in arm.animation_data.nla_tracks:
            for st in tr.strips:
                if st.action and (st.action.name == clip_name or tr.name == clip_name):
                    act = st.action
                    break
            if act is not None:
                break
    arm.animation_data.action = act
    bpy.context.scene.frame_set(int(frame_idx))
    bpy.context.view_layer.update()


def collect_meshes():
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    return arm, meshes


def measure_gear_distances(arm, meshes, body_mat_name, gear_mat_names, checks):
    dg = bpy.context.evaluated_depsgraph_get()
    results = {}
    for clip_name, frames in checks:
        for fr in frames:
            set_action(arm, clip_name, fr)
            body_verts = []
            body_faces = []
            v_off = 0
            gear_pts = {gm: [] for gm in gear_mat_names}
            gear_normals_inward = {gm: 0 for gm in gear_mat_names}

            for obj in meshes:
                eval_obj = obj.evaluated_get(dg)
                me = eval_obj.to_mesh()
                mw = eval_obj.matrix_world
                mat_names = [m.name if m else '' for m in me.materials]

                body_indices = {i for i, mn in enumerate(mat_names) if mn == body_mat_name}
                gear_poly_by_mat = {gm: set() for gm in gear_mat_names}
                gear_verts_by_mat = {gm: set() for gm in gear_mat_names}

                for p in me.polygons:
                    mn = mat_names[p.material_index] if p.material_index < len(mat_names) else ''
                    if mn in gear_verts_by_mat:
                        gear_poly_by_mat[mn].add(p.index)
                        for vi in p.vertices:
                            gear_verts_by_mat[mn].add(vi)

                if body_indices:
                    local_map = {}
                    for p in me.polygons:
                        if p.material_index not in body_indices:
                            continue
                        f_idx = []
                        for vi in p.vertices:
                            if vi not in local_map:
                                local_map[vi] = len(body_verts)
                                body_verts.append(mw @ me.vertices[vi].co)
                            f_idx.append(local_map[vi])
                        body_faces.append(f_idx)

                for gm, vis in gear_verts_by_mat.items():
                    for vi in vis:
                        gear_pts[gm].append(mw @ me.vertices[vi].co)

                eval_obj.to_mesh_clear()

            bvh = BVHTree.FromPolygons(body_verts, body_faces)
            label = f'{clip_name or "Rest"}@f{fr}'
            results[label] = {}
            for gm, pts in gear_pts.items():
                if not pts:
                    continue
                dists = []
                for pt in pts:
                    loc, _, _, d = bvh.find_nearest(pt)
                    if loc is not None:
                        dists.append(d)
                dists.sort()
                n = len(dists)
                if n:
                    results[label][gm] = {
                        'verts': n,
                        'median_cm': round(dists[n // 2] * 100.0, 2),
                        'p95_cm': round(dists[int(0.95 * (n - 1))] * 100.0, 2),
                        'max_cm': round(dists[-1] * 100.0, 2),
                    }
    return results


def measure_weapon_holds(arm, meshes, gun_mat_names, checks):
    dg = bpy.context.evaluated_depsgraph_get()
    results = {}
    for clip_name, frames in checks:
        for fr in frames:
            set_action(arm, clip_name, fr)
            gun_verts = []
            gun_faces = []
            for obj in meshes:
                eval_obj = obj.evaluated_get(dg)
                me = eval_obj.to_mesh()
                mw = eval_obj.matrix_world
                mat_names = [m.name if m else '' for m in me.materials]
                g_indices = {i for i, mn in enumerate(mat_names) if mn in gun_mat_names}
                if g_indices:
                    local_map = {}
                    for p in me.polygons:
                        if p.material_index not in g_indices:
                            continue
                        f_idx = []
                        for vi in p.vertices:
                            if vi not in local_map:
                                local_map[vi] = len(gun_verts)
                                gun_verts.append(mw @ me.vertices[vi].co)
                            f_idx.append(local_map[vi])
                        gun_faces.append(f_idx)
                eval_obj.to_mesh_clear()

            if not gun_verts:
                continue
            bvh = BVHTree.FromPolygons(gun_verts, gun_faces)
            mw_a = arm.matrix_world
            lh = (mw_a @ arm.pose.bones['LeftHand'].matrix).translation
            lhm = (mw_a @ arm.pose.bones['LeftHandMiddle1'].matrix).translation
            l_mid = 0.5 * (lh + lhm)
            rh = (mw_a @ arm.pose.bones['RightHand'].matrix).translation
            rhm = (mw_a @ arm.pose.bones['RightHandMiddle1'].matrix).translation
            r_mid = 0.5 * (rh + rhm)

            _, _, _, d_l_wrist = bvh.find_nearest(lh)
            loc_lm, _, _, d_l_mid = bvh.find_nearest(l_mid)
            _, _, _, d_r_mid = bvh.find_nearest(r_mid)
            results[f'{clip_name}@f{fr}'] = {
                'hand_span_cm': round((r_mid - l_mid).length * 100.0, 2),
                'right_palm_to_gun_cm': round(d_r_mid * 100.0, 2),
                'left_mid_to_gun_cm': round(d_l_mid * 100.0, 2),
                'left_wrist_to_gun_cm': round(d_l_wrist * 100.0, 2),
                'left_closest_on_gun': [round(float(loc_lm.x), 3), round(float(loc_lm.y), 3), round(float(loc_lm.z), 3)] if loc_lm else None,
            }
    return results


def main():
    audit = {}

    # 1. N2
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT_DIR, 'n2-mixamo.glb'))
    arm, meshes = collect_meshes()
    audit['n2'] = {
        'gear': measure_gear_distances(
            arm, meshes, '_Body', ['GearMat', 'GearMatVest', 'GearTrimMat'],
            [(None, [0]), ('Dying_Headshot_Knees', [20, 40, 65, 84]), ('Cover_To_Shooting', [41]), ('Pistol_Idle_Alert', [15])]
        ),
        'weapon': measure_weapon_holds(
            arm, meshes, {'LongGunMat', 'LongGunPolymerMat', 'LongGunMagMat'},
            [('Cover_To_Shooting', [28, 41]), ('Pistol_Idle_Alert', [15]), ('Pistol_Walk', [10]), ('Pistol_Aim', [15])]
        ),
    }

    # 2. Gunman
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT_DIR, 'gunman-mixamo.glb'))
    arm, meshes = collect_meshes()
    audit['gunman'] = {
        'gear': measure_gear_distances(
            arm, meshes, '_Body', ['GunmanBeanieMat', 'GunmanGearMat', 'GunmanGearTrimMat'],
            [(None, [0]), ('Dying_Headshot_Knees', [20, 40, 65, 84]), ('Cover_To_Shooting', [41]), ('Pistol_Idle_Alert', [15])]
        ),
        'weapon': measure_weapon_holds(
            arm, meshes, {'LongGunMat', 'LongGunPolymerMat', 'LongGunMagMat'},
            [('Cover_To_Shooting', [28, 41]), ('Pistol_Idle_Alert', [15]), ('Pistol_Walk', [10]), ('Pistol_Aim', [15])]
        ),
    }

    # 3. Maya
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT_DIR, 'maya-mixamo.glb'))
    arm, meshes = collect_meshes()
    audit['maya'] = {
        'gear': measure_gear_distances(
            arm, meshes, '_Body', ['MayaStrapMat'],
            [(None, [0]), ('Bed_Push_Loop', [0, 27]), ('Walk_Fem', [10])]
        ),
    }

    # 4. Cole
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT_DIR, 'cole-mixamo.glb'))
    arm, meshes = collect_meshes()
    audit['cole'] = {
        'gear': measure_gear_distances(
            arm, meshes, '_Body', ['ColeGauzeMat', 'ColeBloodMat'],
            [(None, [0]), ('Sit_Disbelief_Forward', [66])]
        ),
    }

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, 'w') as f:
        json.dump(audit, f, indent=2)
    print(json.dumps(audit, indent=2))


if __name__ == '__main__':
    main()

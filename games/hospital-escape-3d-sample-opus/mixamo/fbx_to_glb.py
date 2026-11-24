# Mixamo FBX -> animation-only GLB (Blender as a Python module, free/GPL tool; nothing GPL ships).
# Usage: python3 fbx_to_glb.py FBX_DIR OUT_DIR
# Every clip: import FBX (Mixamo binary, 30 fps), strip the "mixamorig:" prefix from bone names, delete any mesh, export the
# armature + its one action as GLB (Y up). Root motion is kept (Hips translation); the in-place cut happens in the retarget.
import bpy, sys, os, glob, json
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True); info = {}
for f in sorted(glob.glob(os.path.join(SRC, '*.fbx'))):
    n = os.path.basename(f)[:-4]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f, automatic_bone_orientation=False, ignore_leaf_bones=False)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    for b in arm.data.bones: b.name = b.name.split(':')[-1]
    skin = n == 'y-bot-tpose'
    if not skin:
        for o in [o for o in bpy.data.objects if o.type == 'MESH']: bpy.data.objects.remove(o, do_unlink=True)
    act = arm.animation_data.action if arm.animation_data else None
    if act: act.name = n
    fr = tuple(act.frame_range) if act else (0, 0)
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = int(fr[0]), int(fr[1]); bpy.context.scene.render.fps = 30
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, n + '.glb'), export_format='GLB', export_animations=True, export_skins=skin,
        export_yup=True, export_force_sampling=True, export_frame_range=False, export_anim_single_armature=True, export_materials='NONE' if not skin else 'EXPORT')
    info[n] = {'frames': fr, 'bones': len(arm.data.bones)}
json.dump(info, open(os.path.join(OUT, 'convert.json'), 'w'), indent=1); print('DONE', len(info))

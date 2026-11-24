# python3 prep_valid_blender.py IN_decoded.glb OUT.glb ratio  — VALID body -> game GLB (Blender as a Python module, free)
import bpy, sys
IN, OUT, R = sys.argv[1], sys.argv[2], float(sys.argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=IN)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and any(k in o.name for k in ('Teeth', 'gland')): bpy.data.objects.remove(o, do_unlink=True)
tris = 0
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    if o.data.shape_keys: o.shape_key_clear()
    if 'HighRes' in o.name:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers): o.modifiers.remove(m)
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = R; d.use_collapse_triangulate = True
        with bpy.context.temp_override(object=o, active_object=o): bpy.ops.object.modifier_apply(modifier='dec')
        # re-add the armature modifier (import creates one; removed above)
        arm = next(x for x in bpy.data.objects if x.type == 'ARMATURE'); am = o.modifiers.new('Armature', 'ARMATURE'); am.object = arm
    tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=82, export_animations=False, export_morph=False, export_skins=True, export_yup=True)
print('TRIS', tris)

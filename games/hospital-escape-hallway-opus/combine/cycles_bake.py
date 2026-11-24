# Cycles GI lightmap bake for a Hospital Escape zone (BAKEOFF COMBINE ROUND). Free: Blender (bpy 5.3 Python module, GPL), CPU Cycles.
# Usage: python3 cycles_bake.py SRC.glb lamps.json OUT_DIR [--size 2048] [--samples 128] [--power 70] [--desk 18] [--skip-lamp-z -37]
# Input  = the zone exported from the game's own builder (export-hall.cjs: world-scaled UVs, lamp centres, zone row).
# Output = OUT_DIR/hall-baked.glb (TEXCOORD_0 = surface tiling, TEXCOORD_1 = lightmap) + lightmap.png + bake.json (encoding scale).
import bpy, sys, json, math, os, argparse, numpy as np
a = argparse.ArgumentParser(); a.add_argument('src'); a.add_argument('lamps'); a.add_argument('out')
a.add_argument('--size', type=int, default=2048); a.add_argument('--samples', type=int, default=128); a.add_argument('--power', type=float, default=70)
a.add_argument('--desk', type=float, default=18); a.add_argument('--skip-lamp-z', type=float, default=-37.0); a.add_argument('--ceil-bounce', type=float, default=1.0); a.add_argument('--blur', type=float, default=1.3)
A = a.parse_args(sys.argv[1:])
os.makedirs(A.out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=A.src)
L = json.load(open(A.lamps)); Z = L['zone']
g2b = lambda p: (p[0], -p[2], p[1])                                     # glTF (Y up) -> Blender (Z up)
# ---- 1. classify + join the lit, opaque geometry into one object (material slots kept: one draw call per material at runtime)
lit, keep = [], []
for o in list(bpy.data.objects):
    if o.type != 'MESH': continue
    m = o.data.materials[0] if o.data.materials else None
    blend = m is not None and getattr(m, 'surface_render_method', 'DITHERED') == 'BLENDED'
    unlit = m is not None and m.node_tree is not None and any(n.type == 'EMISSION' or 'unlit' in n.name.lower() for n in m.node_tree.nodes) and not any(n.type == 'BSDF_PRINCIPLED' for n in m.node_tree.nodes)
    (keep if ('LAMPPANEL' in o.name or blend or unlit) else lit).append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in lit: o.select_set(True)
bpy.context.view_layer.objects.active = lit[0]; bpy.ops.object.make_single_user(object=True, obdata=True, material=False); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); bpy.ops.object.join()
J = bpy.context.view_layer.objects.active; J.name = 'HALL_LIT'
# ---- 2. lightmap UV (area-weighted smart projection into one atlas)
uv0 = J.data.uv_layers[0].name if J.data.uv_layers else None
if not J.data.uv_layers: J.data.uv_layers.new(name='UVMap')
lm = J.data.uv_layers.new(name='lm'); J.data.uv_layers.active = lm
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=1.0, scale_to_bounds=False)
bpy.ops.uv.pack_islands(margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
for i, l in enumerate(J.data.uv_layers): l.active_render = (i == 0)
# ---- 3. lights: an area emitter per ceiling panel (0.6 x 1.2 m, facing down), the station desk practical; the failing tube is left out (it flickers at runtime)
def area(p, size, power, color):
    d = bpy.data.lights.new('lamp', 'AREA'); d.shape = 'RECTANGLE'; d.size, d.size_y = size; d.energy = power; d.color = color
    ob = bpy.data.objects.new('lamp', d); ob.location = p; bpy.context.scene.collection.objects.link(ob); return ob
skipped = 0
for p in L['lamps']:
    if abs(p[2] - A.skip_lamp_z) < 0.9 and abs(p[0] - Z['a'][0]) < 0.3: skipped += 1; continue
    b = g2b(p); along_x = False
    area((b[0], b[1], b[2] - 0.03), (0.6, 1.2) if not along_x else (1.2, 0.6), A.power, (1.0, 0.95, 0.86))
desk = bpy.data.lights.new('desk', 'POINT'); desk.energy = A.desk; desk.color = (1.0, 0.62, 0.3); desk.shadow_soft_size = 0.06
dk = bpy.data.objects.new('desk', desk); dk.location = g2b([Z['a'][0] - Z['w'] / 2 + 0.75, Z['y'] + 1.35, Z['station']['z']]); bpy.context.scene.collection.objects.link(dk)
w = bpy.data.worlds.new('W'); bpy.context.scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.0
# ---- 4. bake target: one image, active in every material
img = bpy.data.images.new('lightmap', A.size, A.size, float_buffer=True)
for m in J.data.materials:
    if m is None or m.node_tree is None: continue
    nt = m.node_tree; t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; u = nt.nodes.new('ShaderNodeUVMap'); u.uv_map = 'lm'; nt.links.new(u.outputs[0], t.inputs[0])
    for n in nt.nodes: n.select = False
    t.select = True; nt.nodes.active = t
S = bpy.context.scene; S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = A.samples; S.cycles.max_bounces = 4; S.cycles.diffuse_bounces = 3
S.render.bake.use_pass_direct = True; S.render.bake.use_pass_indirect = True; S.render.bake.use_pass_color = False; S.render.bake.margin = 16
bpy.ops.object.select_all(action='DESELECT'); J.select_set(True); bpy.context.view_layer.objects.active = J
import time; t0 = time.time(); bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=16); bake_s = time.time() - t0   # r2: filter passed explicitly
# ---- 4b. denoise: masked separable Gaussian (sigma --blur px) over covered texels only, so islands never bleed into the empty atlas
#      (Blender's OIDN compositor path needs a GPU context this container doesn't have — 256 samples + this filter instead)
A2 = A; denoised = False
raw = np.array(img.pixels[:], dtype=np.float32).reshape(A.size, A.size, 4)
if A2.blur > 0:
    rad = int(math.ceil(A2.blur * 3)); kx = np.exp(-0.5 * (np.arange(-rad, rad + 1) / A2.blur) ** 2); kx /= kx.sum()
    mask = (raw[:, :, :3].sum(axis=2) > 1e-6).astype(np.float32)
    def sep(arr):
        out = np.zeros_like(arr)
        for o, w in zip(range(-rad, rad + 1), kx): out += w * np.roll(arr, o, axis=0)
        out2 = np.zeros_like(out)
        for o, w in zip(range(-rad, rad + 1), kx): out2 += w * np.roll(out, o, axis=1)
        return out2
    wsum = sep(mask); res = np.stack([sep(raw[:, :, c] * mask) for c in range(3)], axis=2) / np.maximum(wsum, 1e-6)[:, :, None]
    raw[:, :, :3] = np.where(mask[:, :, None] > 0, res, raw[:, :, :3]); img.pixels = raw.ravel().tolist(); denoised = True
# ---- 5. encode: irradiance -> 8-bit PNG, value = (E / k)^(1/2.2); runtime decodes as sRGB and multiplies by k
px = np.array(img.pixels[:], dtype=np.float32).reshape(A.size, A.size, 4)[:, :, :3]; lum = px.mean(axis=2); nz = lum[lum > 1e-5]
k = float(np.percentile(nz, 99.5)) * 1.05 if nz.size else 1.0
enc = np.clip(px / k, 0, 1) ** (1 / 2.2)
out = bpy.data.images.new('lm8', A.size, A.size, alpha=False); flat = np.concatenate([enc, np.ones((A.size, A.size, 1), np.float32)], axis=2).ravel(); out.pixels = flat.tolist()
out.filepath_raw = os.path.join(A.out, 'lightmap.png'); out.file_format = 'PNG'; out.save()
# ---- 6. export: strip the bake nodes, keep both UV sets
for m in J.data.materials:
    if m and m.node_tree:
        for n in [n for n in m.node_tree.nodes if (n.type == 'TEX_IMAGE' and n.image == img) or (n.type == 'UVMAP' and n.uv_map == 'lm')]: m.node_tree.nodes.remove(n)
for o in [o for o in bpy.data.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(A.out, 'hall-baked.glb'), export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85, export_texcoords=True, export_lights=False, export_yup=True)
tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
json.dump({'denoised': denoised, 'k': k, 'size': A.size, 'samples': A.samples, 'power': A.power, 'desk': A.desk, 'bake_s': round(bake_s, 1), 'lamps': len(L['lamps']) - skipped, 'skipped_lamp': skipped,
           'lit_materials': len(J.data.materials), 'kept_objects': [o.name for o in keep], 'tris': tris}, open(os.path.join(A.out, 'bake.json'), 'w'), indent=1)
print('BAKED', json.dumps(json.load(open(os.path.join(A.out, 'bake.json')))))

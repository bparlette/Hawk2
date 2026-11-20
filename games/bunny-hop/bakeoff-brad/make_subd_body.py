# Headless Blender Python script: Catmull-Clark SubD 1987 Chevrolet Camaro IROC-Z body shell
# Run: /opt/homebrew/bin/blender --background --python make_subd_body.py
# Exports: brad-camaro-subd.glb (Y-up, +Z forward, 4.88 m x 1.83 m, vertex-colored Brad WHITE->MAROON fade)

import bpy
import bmesh
import math
import os

OUT_GLB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brad-camaro-subd.glb")

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Coordinate convention inside Blender before Y-up glTF export:
# Blender X = right (+X), Blender Y = forward (+Y -> becomes -Z in glTF unless rotated; we rotate -Z->+Z via -Y)
# Wait: Blender's glTF exporter with export_yup=True maps:
#   Blender (X, Y, Z) -> glTF (X, Z, -Y)
# So to get glTF +Z = front nose, +Y = up, +X = right:
#   Blender X = glTF_x
#   Blender Y = -glTF_z
#   Blender Z = glTF_y
def to_bl(gx, gy, gz):
    return (gx, -gz, gy)

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

# Build a clean lofted half-mesh (X >= 0) and apply Mirror + Catmull-Clark SubD(2)
def create_subd_part(name, rings_gltf, close_ring=False, creases=None, subdiv=2):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    n_rings = len(rings_gltf)
    n_pts = len(rings_gltf[0])

    grid = []
    for r in range(n_rings):
        row = []
        for i in range(n_pts):
            gx, gy, gz = rings_gltf[r][i]
            row.append(bm.verts.new(to_bl(gx, gy, gz)))
        grid.append(row)

    bm.verts.ensure_lookup_table()
    segs = n_pts if close_ring else n_pts - 1
    for r in range(n_rings - 1):
        for i in range(segs):
            ni = (i + 1) % n_pts
            v0 = grid[r][i]
            v1 = grid[r + 1][i]
            v2 = grid[r + 1][ni]
            v3 = grid[r][ni]
            try:
                bm.faces.new((v0, v1, v2, v3))
            except ValueError:
                pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # Optional edge creases for crisp automotive character lines
    if creases:
        crease_layer = bm.edges.layers.float.new("crease_edge")
        for r_idx, i_idx, val in creases:
            if r_idx is not None and i_idx is None:
                # Crease along an entire ring
                for i in range(segs):
                    ni = (i + 1) % n_pts
                    e = bm.edges.get((grid[r_idx][i], grid[r_idx][ni]))
                    if e:
                        e[crease_layer] = val
            elif i_idx is not None and r_idx is None:
                # Crease along a longitudinal feature line
                for r in range(n_rings - 1):
                    e = bm.edges.get((grid[r][i_idx], grid[r + 1][i_idx]))
                    if e:
                        e[crease_layer] = val

    bm.to_mesh(mesh)
    bm.free()

    # Smooth shading
    for p in mesh.polygons:
        p.use_smooth = True

    # Mirror X modifier (merges centerline cleanly!)
    mir = obj.modifiers.new("Mirror", "MIRROR")
    mir.use_axis[0] = True
    mir.use_clip = True
    mir.merge_threshold = 0.005

    # Catmull-Clark Subdivision Surface for organic compound curvature!
    if subdiv > 0:
        sub = obj.modifiers.new("Subsurf", "SUBSURF")
        sub.levels = subdiv
        sub.render_levels = subdiv
        sub.boundary_smooth = 'PRESERVE_CORNERS'

    # Apply modifiers so we can bake exact Brad WHITE->MAROON vertex colors on the final smooth vertices
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="Mirror")
    if subdiv > 0:
        bpy.ops.object.modifier_apply(modifier="Subsurf")

    return obj

# -------------------------------------------------------------------------
# 1. MAIN UNIFIED LOWER BODY SHELL (V-swept nose -> hood -> flared fenders ->
#    curved wheel arches -> Coke-bottle flanks -> wraparound rear bumper)
# -------------------------------------------------------------------------
def build_camaro_body():
    wfZ, wrZ, wY, archR = 1.38, -1.24, 0.33, 0.382

    def belt_y(z):
        if z > 0.45:
            return 0.84 - (z - 0.45) * 0.095
        if z > -1.35:
            return 0.84 + math.sin(((0.45 - z) / 1.8) * math.pi * 0.65) * 0.044
        return 0.880 - (-1.35 - z) * 0.016

    def half_w(z):
        w = 0.915
        if z > 1.50:
            t = (z - 1.50) / 0.96
            w -= t * t * 0.145
        elif z < -1.60:
            t = (-1.60 - z) / 0.84
            w -= t * t * 0.095
        df = abs(z - wfZ)
        dr = abs(z - wrZ)
        if df < 0.52:
            w += math.cos((df / 0.52) * math.pi * 0.5) * 0.032
        if dr < 0.56:
            w += math.cos((dr / 0.56) * math.pi * 0.5) * 0.042
        return w

    def bot_y(z):
        y = 0.175
        if z < -1.80:
            y += (-1.80 - z) * 0.19
        df = abs(z - wfZ)
        if df < archR:
            y = max(y, wY + math.sqrt(max(0.0, archR * archR - df * df)))
        dr = abs(z - wrZ)
        if dr < archR:
            y = max(y, wY + math.sqrt(max(0.0, archR * archR - dr * dr)))
        return y

    # Longitudinal stations along the flank (dense around wheel arches for crisp round SubD arches!)
    zs = [-2.42, -2.26, -2.02, -1.78, -1.62, -1.52, -1.38, -1.24, -1.10, -0.96, -0.86,
          -0.60, -0.25, 0.12, 0.48, 0.82, 1.00, 1.12, 1.25, 1.38, 1.51, 1.64, 1.76, 1.98, 2.20, 2.34]
    rings = []
    for z in zs:
        y0 = bot_y(z)
        yt = belt_y(z)
        hw = half_w(z)
        span = max(0.09, yt - y0)
        # V-sweep pull-back at front nose corners
        tF = max(0.0, (z - 1.75) / 0.65)
        z_out = z - tF * tF * 0.14
        rings.append([
            (hw - 0.12, y0 - 0.01, z_out),                # 0: under-rocker tuck
            (hw - 0.02, y0 + span * 0.06, z_out),         # 1: flared ground-effects skirt lip
            (hw + 0.018, y0 + span * 0.28, z_out),        # 2: lower body swell
            (hw + 0.024, y0 + span * 0.56, z_out),        # 3: signature crisp third-gen character line
            (hw + 0.004, y0 + span * 0.80, z_out),        # 4: upper fender curve
            (hw - 0.048, yt - 0.010, z_out),              # 5: rounded shoulder
            (hw - 0.135, yt + 0.012, z_out),              # 6: top fender crown
        ])

    flank = create_subd_part("Camaro_Flanks", rings, close_ring=False, creases=[(None, 1, 0.55), (None, 3, 0.45)], subdiv=2)

    # 2. V-SWEPT RACING HOOD + INTEGRATED POINTED NOSE CONE + FLARED CHIN AIR DAM (one continuous SubD surface!)
    hood_zs = [0.46, 0.78, 1.15, 1.55, 1.92, 2.22, 2.38, 2.46]
    xs = [0.0, 0.14, 0.30, 0.48, 0.66, 0.80]
    hood_rings = []
    for z0 in hood_zs:
        tF = max(0.0, (z0 - 1.45) / (2.46 - 1.45))
        taper = 1.0 - tF * tF * 0.14
        ring = []
        for x0 in xs:
            x = x0 * taper
            v_sweep = -(x0 * x0) * 0.21 * (tF * tF)
            z = z0 + v_sweep
            base_y = 0.842 - (z0 - 0.46) * 0.095 - (max(0.0, z0 - 2.32) * 0.82)
            crown = math.cos((x0 / 0.86) * math.pi * 0.5) * 0.052
            dome = math.cos((x0 / 0.36) * math.pi * 0.5) * 0.024 if (x0 < 0.36 and z0 < 2.30) else 0.0
            ring.append((x, base_y + crown + dome, z))
        hood_rings.append(ring)
    hood = create_subd_part("Camaro_Hood", hood_rings, close_ring=False, creases=[(len(hood_rings) - 1, None, 0.55)], subdiv=2)

    # 3. CONTINUOUS SCULPTED FRONT BUMPER + RACING CHIN AIR DAM (wraps seamlessly around front!)
    nose_prof = [
        (0.455, 2.41, 0.98),  # bumper ledge under headlight pockets
        (0.422, 2.48, 1.00),  # rounded protruding bumper ridge
        (0.352, 2.45, 0.99),  # recessed lower intake/fog fascia
        (0.275, 2.44, 0.98),  # lower stripe crease
        (0.210, 2.49, 1.01),  # flared racing chin spoiler kick
        (0.162, 2.52, 1.02),  # low aerodynamic splitter lip
        (0.152, 2.35, 0.95),  # under-splitter return
    ]
    nose_rings = []
    for y, zc, ws in nose_prof:
        ring = []
        for c in range(9):
            u = c / 8.0  # 0 (center) -> 1 (outer fender corner)
            x = u * 0.85 * ws
            z = zc - u * u * 0.175 - (u ** 4) * 0.14
            ring.append((x, y, z))
        nose_rings.append(ring)
    nose = create_subd_part("Camaro_FrontAirDam", nose_rings, close_ring=False, creases=[(1, None, 0.50), (5, None, 0.65)], subdiv=2)

    # 4. POINTED CENTER NOSE BRIDGE between recessed headlight buckets
    br_prof = [
        (0.655, 2.46, 0.25),
        (0.575, 2.49, 0.27),
        (0.455, 2.44, 0.30),
    ]
    br_rings = []
    for y, zc, hw in br_prof:
        ring = []
        for c in range(5):
            u = c / 4.0
            x = u * hw
            z = zc - u * u * 0.038
            ring.append((x, y, z))
        br_rings.append(ring)
    bridge = create_subd_part("Camaro_NoseBridge", br_rings, close_ring=False, subdiv=2)

    # 5. CROWNED ROOF + SMOOTH CURVED B-PILLAR SAIL HOOPS
    roof_zs = [0.14, -0.02, -0.20, -0.38, -0.54]
    roof_rings = []
    for z in roof_zs:
        t = (0.14 - z) / (0.14 - (-0.54))
        hw = 0.625 + math.sin(t * math.pi) * 0.020
        ye = 1.242 + math.sin(t * math.pi) * 0.014
        ring = []
        for c in range(6):
            u = c / 5.0
            x = u * hw
            crown = (1.0 - u * u) * 0.036
            ring.append((x, ye + crown, z))
        roof_rings.append(ring)
    roof = create_subd_part("Camaro_Roof", roof_rings, close_ring=False, subdiv=2)

    # Smooth curved B-pillar hoop (flows organically from roof corner into rear quarter)
    bp_rings = []
    for i in range(7):
        t = i / 6.0
        y = 0.855 + t * 0.392
        s_curve = 3 * t * t - 2 * t * t * t
        x_out = 0.840 - s_curve * 0.215
        x_in = 0.768 - s_curve * 0.175
        z_lead = -0.52 + t * 0.04
        z_trail = -0.86 + (t ** 0.72) * 0.32
        bp_rings.append([
            (x_out, y, z_lead),
            (x_out, y, z_trail),
            (x_in, y, z_trail),
            (x_in, y, z_lead),
        ])
    bpillar = create_subd_part("Camaro_BPillar", bp_rings, close_ring=True, subdiv=2)

    # 6. WRAPAROUND REAR BUMPER FASCIA + INTEGRATED CURVED DUCKTAIL SPOILER
    rb_prof = [
        (0.618, -2.41, 0.99),
        (0.568, -2.48, 1.00),
        (0.468, -2.46, 0.99),
        (0.370, -2.42, 0.98),
        (0.300, -2.31, 0.95),
    ]
    rb_rings = []
    for y, zc, ws in rb_prof:
        ring = []
        for c in range(8):
            u = c / 7.0
            x = u * 0.845 * ws
            z = zc + (u ** 3) * 0.15
            ring.append((x, y, z))
        rb_rings.append(ring)
    rear_bumper = create_subd_part("Camaro_RearBumper", rb_rings, close_ring=False, creases=[(1, None, 0.55)], subdiv=2)

    sp_prof = [
        (0.865, -2.14, 0.845),
        (0.912, -2.26, 0.850),
        (0.946, -2.39, 0.838),
        (0.892, -2.41, 0.838),
        (0.835, -2.37, 0.838),
    ]
    sp_rings = []
    for y, zc, hw in sp_prof:
        ring = []
        for c in range(8):
            u = c / 7.0
            x = u * hw
            z = zc + (u ** 3) * 0.11
            yc = y - u * u * 0.016
            ring.append((x, yc, z))
        sp_rings.append(ring)
    spoiler = create_subd_part("Camaro_Spoiler", sp_rings, close_ring=False, creases=[(2, None, 0.7)], subdiv=2)

    return [flank, hood, nose, bridge, roof, bpillar, rear_bumper, spoiler]

parts = build_camaro_body()

# Join all SubD body parts into ONE single mesh (1 draw call in Three.js!)
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = "BradCamaroSubDBody"

# Apply seamless Brad WHITE -> DEEP MAROON vertex-color fade (linear RGB for glTF BYTE_COLOR -> rich maroon!)
mesh = body.data
vcol = mesh.color_attributes.new(name="Color", type='BYTE_COLOR', domain='CORNER')
white = (0.90, 0.92, 0.95, 1.0)
maroon = (0.145, 0.006, 0.012, 1.0)  # sRGB #6c111b in linear space (matches brad-real deep metallic maroon!)

for poly in mesh.polygons:
    for loop_idx in poly.loop_indices:
        v = mesh.vertices[mesh.loops[loop_idx].vertex_index]
        gz = -v.co.y  # glTF Z (+Z = front nose)
        t = smoothstep(0.46, -0.04, gz)
        r = white[0] + (maroon[0] - white[0]) * t
        g = white[1] + (maroon[1] - white[1]) * t
        b = white[2] + (maroon[2] - white[2]) * t
        vcol.data[loop_idx].color = (r, g, b, 1.0)

# Clearcoat PBR material wired to vertex colors
mat = bpy.data.materials.new("BradCamaroPaint")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
bsdf = nodes.get("Principled BSDF")
vnode = nodes.new("ShaderNodeVertexColor")
vnode.layer_name = "Color"
links.new(vnode.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Metallic"].default_value = 0.44
bsdf.inputs["Roughness"].default_value = 0.14
if "Coat Weight" in bsdf.inputs:
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat Roughness"].default_value = 0.05
mesh.materials.append(mat)

# Export single-mesh SubD GLB (Y-up, +Z forward)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    export_yup=True,
    export_materials='EXPORT',
    export_attributes=True,
)
print(f"EXPORTED {OUT_GLB} — verts={len(mesh.vertices)}, polys={len(mesh.polygons)}")

"""Create the editable rounded monument and its web GLB from the deployed classic GLB.

Run with Blender:
    blender --background --python frontend/scripts/build-rounded-monument.py

Only the mesh of ``Plyta_klasyczna_lukowa`` is replaced. The base, planter,
inscriptions, materials and all transforms remain inherited from the classic model.
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy


SLAB_PREFIX = "Plyta_klasyczna_lukowa"
ARC_SEGMENTS = 32
ARC_RISE_M = 0.16


def find_slab() -> bpy.types.Object:
    slab = next(
        (
            obj
            for obj in bpy.data.objects
            if obj.type == "MESH" and obj.name.startswith(SLAB_PREFIX)
        ),
        None,
    )
    if slab is None:
        raise RuntimeError(f"Missing mesh object starting with {SLAB_PREFIX!r}")
    return slab


def rounded_profile(
    xmin: float,
    xmax: float,
    zmin: float,
    zmax: float,
) -> list[tuple[float, float]]:
    """Shallow half-ellipse matching the supplied monument reference."""
    width = xmax - xmin
    rise = min(ARC_RISE_M, (zmax - zmin) * 0.22)
    shoulder_z = zmax - rise
    center_x = (xmin + xmax) / 2
    radius_x = width / 2

    profile = [(xmin, zmin), (xmax, zmin), (xmax, shoulder_z)]
    for index in range(1, ARC_SEGMENTS + 1):
        angle = math.pi * index / ARC_SEGMENTS
        profile.append(
            (
                center_x + radius_x * math.cos(angle),
                shoulder_z + rise * math.sin(angle),
            )
        )
    return profile


def rebuild_slab(slab: bpy.types.Object) -> None:
    # The source file is saved in Edit Mode. Leaving that mode after assigning a
    # replacement mesh would commit the old edit mesh back over the new geometry.
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    bbox = [tuple(point) for point in slab.bound_box]
    xmin = min(point[0] for point in bbox)
    xmax = max(point[0] for point in bbox)
    ymin = min(point[1] for point in bbox)
    ymax = max(point[1] for point in bbox)
    zmin = min(point[2] for point in bbox)
    zmax = max(point[2] for point in bbox)

    profile = rounded_profile(xmin, xmax, zmin, zmax)
    count = len(profile)
    vertices = (
        [(x, ymin, z) for x, z in profile]
        + [(x, ymax, z) for x, z in profile]
    )

    # Front is -Y in Blender and becomes +Z in Three.js.
    faces: list[tuple[int, ...]] = [
        tuple(range(count)),
        tuple(reversed(range(count, count * 2))),
    ]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))

    old_mesh = slab.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new("Plyta_polokragla_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(verbose=True)
    mesh.update(calc_edges=True)
    for material in materials:
        mesh.materials.append(material)
    slab.data = mesh
    slab["wariant"] = "polokragly"
    slab["opis"] = "Klasyczny pomnik; zmieniony tylko obrys gornej plyty"

    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)

    # Keep existing modifiers if the source has them; otherwise restore the same
    # polished edge treatment on the newly generated outline.
    if not any(modifier.type == "BEVEL" for modifier in slab.modifiers):
        bevel = slab.modifiers.new(name="Polerowana_krawedz", type="BEVEL")
        bevel.width = 0.006
        bevel.segments = 3
        bevel.limit_method = "ANGLE"

    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    bpy.context.view_layer.objects.active = slab
    slab.select_set(True)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project()
    bpy.ops.object.mode_set(mode="OBJECT")


def main() -> None:
    repo = Path(__file__).resolve().parents[2]
    classic_glb = repo / "frontend" / "public" / "models" / "classic-monument.glb"
    blend_output = repo / "rounded-monument.blend"
    glb_output = repo / "frontend" / "public" / "models" / "rounded-monument.glb"

    # The checked-in 1.blend contains older inscription content than the deployed
    # classic GLB. Import the deployed model so the upper slab is the only difference.
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(classic_glb))

    rebuild_slab(find_slab())
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_output),
        export_format="GLB",
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f"Saved editable model: {blend_output}")
    print(f"Saved web model: {glb_output}")


if __name__ == "__main__":
    main()

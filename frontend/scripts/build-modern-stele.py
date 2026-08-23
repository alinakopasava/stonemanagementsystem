"""Create an editable modern-stele monument and its web GLB.

Run with Blender:
    blender --background --python frontend/scripts/build-modern-stele.py

The deployed classic GLB is used as the source. Only the main upper slab mesh is
replaced; the base, planter, portrait, inscriptions, materials and transforms stay
identical.
"""

from __future__ import annotations

from pathlib import Path

import bmesh
import bpy


SLAB_PREFIX = "Plyta_klasyczna_lukowa"
CURVE_SEGMENTS = 12

Point = tuple[float, float]


def cubic(p0: Point, p1: Point, p2: Point, p3: Point) -> list[Point]:
    """Sample a cubic Bézier without repeating its first point."""
    points: list[Point] = []
    for index in range(1, CURVE_SEGMENTS + 1):
        t = index / CURVE_SEGMENTS
        u = 1 - t
        points.append(
            (
                u**3 * p0[0]
                + 3 * u * u * t * p1[0]
                + 3 * u * t * t * p2[0]
                + t**3 * p3[0],
                u**3 * p0[1]
                + 3 * u * u * t * p1[1]
                + 3 * u * t * t * p2[1]
                + t**3 * p3[1],
            )
        )
    return points


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


def modern_profile(
    xmin: float,
    xmax: float,
    zmin: float,
    zmax: float,
) -> list[Point]:
    """S-curved sides and an asymmetric falling crown based on the reference."""
    center_x = (xmin + xmax) / 2
    half_width = (xmax - xmin) / 2
    height = zmax - zmin

    def p(x: float, z: float) -> Point:
        return center_x + x * half_width, zmin + z * height

    bottom_left = p(-0.68, 0)
    bottom_right = p(0.66, 0)
    right_mid = p(0.86, 0.47)
    right_top = p(1.0, 0.88)
    crown = p(0.05, 1.0)
    left_top = p(-0.78, 0.965)
    left_mid = p(-0.95, 0.48)

    profile: list[Point] = [bottom_left, bottom_right]
    profile += cubic(
        bottom_right,
        p(0.76, 0.1),
        p(1.0, 0.31),
        right_mid,
    )
    profile += cubic(
        right_mid,
        p(0.73, 0.62),
        p(0.72, 0.79),
        right_top,
    )
    profile += cubic(
        right_top,
        p(0.72, 0.9),
        p(0.34, 0.995),
        crown,
    )
    profile += cubic(
        crown,
        p(-0.16, 0.995),
        p(-0.52, 0.955),
        left_top,
    )
    profile += cubic(
        left_top,
        p(-0.96, 0.82),
        p(-1.0, 0.62),
        left_mid,
    )
    profile += cubic(
        left_mid,
        p(-0.9, 0.29),
        p(-0.54, 0.1),
        bottom_left,
    )
    return profile


def rebuild_slab(slab: bpy.types.Object) -> None:
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    bbox = [tuple(point) for point in slab.bound_box]
    xmin = min(point[0] for point in bbox)
    xmax = max(point[0] for point in bbox)
    ymin = min(point[1] for point in bbox)
    ymax = max(point[1] for point in bbox)
    zmin = min(point[2] for point in bbox)
    zmax = max(point[2] for point in bbox)

    profile = modern_profile(xmin, xmax, zmin, zmax)
    count = len(profile)
    vertices = (
        [(x, ymin, z) for x, z in profile]
        + [(x, ymax, z) for x, z in profile]
    )
    faces: list[tuple[int, ...]] = [
        tuple(range(count)),
        tuple(reversed(range(count, count * 2))),
    ]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))

    old_mesh = slab.data
    materials = list(old_mesh.materials)
    mesh = bpy.data.meshes.new("Plyta_nowoczesna_stela_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(verbose=True)
    mesh.update(calc_edges=True)
    for material in materials:
        mesh.materials.append(material)
    slab.data = mesh
    slab["wariant"] = "nowoczesna_stela"
    slab["opis"] = "Klasyczny pomnik; zmieniony tylko obrys gornej plyty"

    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)

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
    blend_output = repo / "modern-stele-monument.blend"
    glb_output = (
        repo / "frontend" / "public" / "models" / "modern-stele-monument.glb"
    )

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

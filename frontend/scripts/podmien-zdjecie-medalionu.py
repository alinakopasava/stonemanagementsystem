from pathlib import Path

import bpy


BLEND_PATH = Path(r"C:\Users\Alina\Downloads\1.blend")
PHOTO_PATH = Path(r"C:\Users\Alina\Downloads\zdjecie-pomnik-czarno-biale.png")
GLB_PATH = Path(r"C:\repo234\frontend\public\models\classic-monument.glb")
GLB_COPY_PATH = Path(r"C:\Users\Alina\Projects\pomnik-bazowy\pomnik-ze-zdjeciem.glb")

if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")

if not PHOTO_PATH.exists():
    raise FileNotFoundError(f"Nie znaleziono zdjęcia: {PHOTO_PATH}")

new_image = bpy.data.images.load(str(PHOTO_PATH), check_existing=False)
new_image.name = "Portret_czarno_bialy"
new_image.pack()

replaced = False
material = bpy.data.materials.get("Medalion_portret")
if material is None or not material.use_nodes:
    raise RuntimeError("Nie znaleziono materiału Medalion_portret")

for node in material.node_tree.nodes:
    if node.type == "TEX_IMAGE":
        node.image = new_image
        replaced = True

if not replaced:
    raise RuntimeError("Nie znaleziono tekstury zdjęcia w materiałach Blendera")

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)
GLB_COPY_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(GLB_COPY_PATH),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)

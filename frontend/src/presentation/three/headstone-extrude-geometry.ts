import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type ExtrudeOpts = THREE.ExtrudeGeometryOptions;

/**
 * Extrude + merged vertices (removes centerline shading split) + UVs remapped to [0,1]
 * on caps/sides so texture repeat/center matches box meshes without a vertical seam.
 */
export function createHeadstoneExtrudeGeometry(
  shape: THREE.Shape,
  options: ExtrudeOpts
): THREE.BufferGeometry {
  const raw = new THREE.ExtrudeGeometry(shape, options);
  const geom = mergeVertices(raw, 1e-4);
  raw.dispose();
  geom.computeVertexNormals();
  remapHeadstoneExtrudeUVs(geom);
  return geom;
}

function remapHeadstoneExtrudeUVs(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return;

  const rx = Math.max(box.max.x - box.min.x, 1e-6);
  const ry = Math.max(box.max.y - box.min.y, 1e-6);
  const rz = Math.max(box.max.z - box.min.z, 1e-6);

  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;

  // Caps by dot(n,±Z): bevel on classic tilts normals; |nz| vs |nx|,|ny| sent crown strips to side UVs.
  const capDot = 0.42;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);

    if (nz > capDot) {
      uv.setXY(i, (x - box.min.x) / rx, (y - box.min.y) / ry);
    } else if (nz < -capDot) {
      uv.setXY(i, (x - box.min.x) / rx, (y - box.min.y) / ry);
    } else if (ax >= ay) {
      uv.setXY(i, (z - box.min.z) / rz, (y - box.min.y) / ry);
    } else {
      uv.setXY(i, (x - box.min.x) / rx, (z - box.min.z) / rz);
    }
  }
  uv.needsUpdate = true;
}

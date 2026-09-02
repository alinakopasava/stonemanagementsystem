import * as THREE from 'three';

export interface EngravedPhotoMaterialOptions {
  photoMap: THREE.Texture;
  stoneMap: THREE.Texture;
  stoneRepeat: THREE.Vector2;
  stoneLuma: number;
  photoBrightness: number;
  photoContrast: number;
  photoBlend: number;
}

/**
 * Laser-etched portrait on the real stone face. Sides stay transparent so the
 * monument mesh shows through — no oval, plate, or backing shape.
 */
export const createNaturalEngravedPhotoMaterial = ({
  photoMap,
  stoneMap,
  stoneRepeat,
  stoneLuma,
  photoBrightness,
  photoContrast,
  photoBlend
}: EngravedPhotoMaterialOptions): THREE.MeshStandardMaterial => {
  const mat = new THREE.MeshStandardMaterial({
    map: photoMap,
    roughness: 1,
    metalness: 0.0,
    envMapIntensity: 0,
    transparent: true,
    // Low enough that the long dissolve tail reaches the stone instead of ending
    // on a traceable iso-line.
    alphaTest: 0.012,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const f = (v: number) => v.toFixed(3);

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.engravedStoneMap = { value: stoneMap };
    shader.uniforms.engravedStoneRepeat = { value: stoneRepeat };
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `
        uniform sampler2D engravedStoneMap;
        uniform vec2 engravedStoneRepeat;

        void main() {
      `
    );
    // A laser etching is a flat tonal image, not a lit surface. Feeding its tone
    // through emissive keeps the authored greys intact under the ~4× key light
    // instead of clipping the face to a white blob.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += _etched;
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
          #include <map_fragment>

          float _srcAlpha = diffuseColor.a;
          float _gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float _tone = clamp((_gray - 0.5) * ${f(photoContrast)} + 0.5 + ${f(photoBrightness)}, 0.0, 1.0);

          float _blend = ${f(photoBlend)};
          float _stoneRef = ${f(stoneLuma)};

          // One consistent black-and-white portrait on every stone. The engraving
          // tone IS the photo's own greyscale value — no per-stone frost/cut
          // anchoring, which used to lift the shadows toward the stone's luminance
          // and blow the portrait out on lighter textures. The image looks the same
          // grey regardless of the slab it sits on. (_stoneRef intentionally unused.)
          float _engravedTone = _tone;
          vec3 _etched = vec3(_engravedTone);

          // The person stays close to opaque so the fixed greyscale is what shows,
          // not the stone bleeding through; only the silhouette edge dissolves.
          float _alpha = pow(_srcAlpha, 1.15) * mix(0.97, 0.9, _blend);

          // The etched portrait is carried by emissive (see emissivemap_fragment
          // below), not diffuse, so the strong key light cannot bloom it to white.
          diffuseColor.rgb = vec3(0.0);
          diffuseColor.a = _alpha;
        `
    );
  };

  mat.customProgramCacheKey = () =>
    `side-etch-${photoBrightness}-${photoContrast}-${photoBlend}-${stoneLuma}`;

  mat.needsUpdate = true;
  return mat;
};

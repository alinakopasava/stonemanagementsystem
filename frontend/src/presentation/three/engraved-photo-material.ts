import * as THREE from 'three';

export interface EngravedPhotoMaterialOptions {
  photoMap: THREE.Texture;
  stoneMap: THREE.Texture;
  stoneRepeat: THREE.Vector2;
  stoneLuma: number;
  roughness: number;
  photoBrightness: number;
  photoContrast: number;
  photoBlend: number;
  /** Porcelain plaque — full grayscale, no stone composite. */
  framed?: boolean;
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
  roughness,
  photoBrightness,
  photoContrast,
  photoBlend,
  framed = false
}: EngravedPhotoMaterialOptions): THREE.MeshStandardMaterial => {
  const mat = new THREE.MeshStandardMaterial({
    map: photoMap,
    roughness: framed ? roughness : 1,
    metalness: 0.0,
    envMapIntensity: framed ? 1 : 0,
    transparent: true,
    // Low enough that the long dissolve tail reaches the stone instead of ending
    // on a traceable iso-line.
    alphaTest: framed ? 0.02 : 0.012,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const f = (v: number) => v.toFixed(3);
  const isFramed = framed ? 1.0 : 0.0;

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
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
          #include <map_fragment>

          float _srcAlpha = diffuseColor.a;
          float _gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float _tone = clamp((_gray - 0.5) * ${f(photoContrast)} + 0.5 + ${f(photoBrightness)}, 0.0, 1.0);

          float _blend = ${f(photoBlend)};
          float _isFramed = ${f(isFramed)};
          float _stoneRef = ${f(stoneLuma)};

          // Laser engraving reads as pale silver-grey even in the portrait shadows.
          // Lift the black point for an etched photo while preserving full grayscale
          // on framed porcelain photos.
          float _silverFloor = mix(0.015, 0.08, smoothstep(0.18, 0.78, _srcAlpha));
          float _engravedTone = mix(_silverFloor, 0.76, _tone);
          vec3 _portrait = vec3(mix(_engravedTone, _tone, _isFramed));
          float _mixPhoto = mix(0.96, 0.8, _blend);
          vec3 _etched = mix(vec3(_stoneRef), _portrait, _mixPhoto);
          vec3 _framed = vec3(_tone);

          // Preserve the granite's fine grain through the monochrome portrait, like
          // a laser etching rather than an opaque printed decal.
          vec3 _stoneTexel = texture2D(engravedStoneMap, vMapUv * engravedStoneRepeat).rgb;
          float _grain = dot(_stoneTexel, vec3(0.299, 0.587, 0.114));
          float _grainDetail = clamp((_grain - _stoneRef) * 0.3, -0.1, 0.1);
          _etched = clamp(_etched + vec3(_grainDetail), 0.0, 1.0);

          // Gentle curve: the border keeps a long, gradual dissolve into the stone.
          float _alpha = pow(_srcAlpha, 1.15) * mix(0.97, 0.86, _blend);

          diffuseColor.rgb = mix(_etched, _framed, _isFramed);
          diffuseColor.a = mix(_alpha, 1.0, _isFramed);
        `
    );
  };

  mat.customProgramCacheKey = () =>
    `side-etch-${framed}-${photoBrightness}-${photoContrast}-${photoBlend}-${stoneLuma}`;

  mat.needsUpdate = true;
  return mat;
};

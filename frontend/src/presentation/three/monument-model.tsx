import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { FinishType } from '@domain/entities/order-card';
import { useStoneAlbedoTexture } from './use-stone-albedo-texture';
import { createHeadstoneExtrudeGeometry } from './headstone-extrude-geometry';

export interface MonumentDimensionsCm {
  heightCm: number;
  widthCm: number;
  thicknessCm: number;
}

export interface InscriptionStyleHints {
  fontUrl?: string;
  letterSpacing: number;
  transform: 'none' | 'uppercase';
}

export type MonumentShape = 'classic' | 'rounded' | 'cross' | 'gothic' | 'heart';

const DEFAULT_INSCRIPTION_STYLE: InscriptionStyleHints = {
  letterSpacing: 0,
  transform: 'none'
};

interface MonumentModelProps {
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  shape?: MonumentShape;
  showCross?: boolean;
}

const CM_TO_M = 0.01;
const TEXT_LINE_HEIGHT = 1.15;

const getTextureBitmapSize = (map: THREE.Texture): { w: number; h: number } => {
  const img = map.image as any;
  if (!img) return { w: 1, h: 1 };
  const w = img.naturalWidth || img.videoWidth || img.width || 0;
  const h = img.naturalHeight || img.videoHeight || img.height || 0;
  return w > 0 && h > 0 ? { w, h } : { w: 1, h: 1 };
};

/** Materiały, dla których chcemy jednolitą teksturę bez kafelków (jeden „kawałek” na cały pomnik). */
const SEAMLESS_MATERIALS = new Set(['Marble', 'Labradorite Blue']);

/**
 * Granit / piaskowiec: powtarzalna tekstura imitująca gęsto ziarnisty kamień.
 * Marmur / labradoryt: jedna instancja tekstury rozciągnięta na powierzchnię — brak widocznych kafelków.
 */
const applyAlbedoTextureTiling = (
  map: THREE.Texture,
  spanM: number,
  materialName: string | undefined
) => {
  if (materialName && SEAMLESS_MATERIALS.has(materialName)) {
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.repeat.set(1, 1);
    map.center.set(0.5, 0.5);
    map.offset.set(0, 0);
    map.needsUpdate = true;
    return;
  }

  const base = THREE.MathUtils.clamp(1.8 / Math.max(0.35, spanM), 0.65, 3.2);
  const { w, h } = getTextureBitmapSize(map);
  const ratio = h / w;

  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(base, base * ratio);
  map.center.set(0.5, 0.5);
  map.offset.set(0, 0);
  map.needsUpdate = true;
};

/** Słowo nie łamane przez troika-three-text — liczymy linie po granicach wyrazów (a nie zaokrąglając total/charsPerLine),
 *  inaczej "John A. Smith" mieści się rzekomo w 2 liniach, a faktycznie wpada w 3 (każde słowo osobno). */
const wordAwareLineCount = (value: string, charsPerLine: number) => {
  const normalizedLimit = Math.max(1, Math.floor(charsPerLine));
  let total = 0;
  for (const rawLine of value.split('\n')) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let lines = 1;
    let used = 0;
    for (const word of words) {
      const need = used === 0 ? word.length : used + 1 + word.length;
      if (need <= normalizedLimit) {
        used = need;
      } else {
        lines += 1;
        used = word.length;
      }
    }
    total += lines;
  }
  return Math.max(0, total);
};

const finishToSurface = (finish: FinishType) => {
  switch (finish) {
    case 'Polished':
      return { roughness: 0.18, metalness: 0.25, clearcoat: 0.6 };
    case 'Honed':
      return { roughness: 0.5, metalness: 0.12, clearcoat: 0.15 };
    case 'Matte':
    default:
      return { roughness: 0.9, metalness: 0.05, clearcoat: 0 };
  }
};

// --- Buildery kształtów ---
const buildClassicShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const shoulderInset = Math.max(0.03, widthM * 0.14);
  const neckInset = Math.max(0.05, widthM * 0.22);
  const bodyHeight = Math.max(0.06, heightM - widthM * 0.48);
  const shoulderY = bodyHeight * 0.74;
  const neckY = bodyHeight * 0.9;
  const crownY = heightM;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth - shoulderInset, shoulderY);
  shape.lineTo(halfWidth - neckInset, neckY);
  shape.quadraticCurveTo(0, crownY, -(halfWidth - neckInset), neckY);
  shape.lineTo(-(halfWidth - shoulderInset), shoulderY);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildRoundedShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - halfWidth);
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.absarc(0, bodyHeight, halfWidth, 0, Math.PI, false);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildGothicShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - widthM * 0.55);
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.quadraticCurveTo(halfWidth, heightM, 0, heightM);
  shape.quadraticCurveTo(-halfWidth, heightM, -halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildHeartShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - widthM * 0.6);
  const heartTop = heightM * 0.92;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.bezierCurveTo(halfWidth, heartTop, halfWidth * 0.55, heartTop * 1.04, 0, bodyHeight + (heartTop - bodyHeight) * 0.55);
  shape.bezierCurveTo(-halfWidth * 0.55, heartTop * 1.04, -halfWidth, heartTop, -halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildCrossShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM * 0.62);
  const armHeight = heightM * 0.12;
  const armY = heightM * 0.78;
  const armWidth = widthM * 0.55;
  const stemWidth = widthM * 0.22;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.lineTo(stemWidth, bodyHeight);
  shape.lineTo(stemWidth, armY);
  shape.lineTo(armWidth, armY);
  shape.lineTo(armWidth, armY + armHeight);
  shape.lineTo(stemWidth, armY + armHeight);
  shape.lineTo(stemWidth, heightM);
  shape.lineTo(-stemWidth, heightM);
  shape.lineTo(-stemWidth, armY + armHeight);
  shape.lineTo(-armWidth, armY + armHeight);
  shape.lineTo(-armWidth, armY);
  shape.lineTo(-stemWidth, armY);
  shape.lineTo(-stemWidth, bodyHeight);
  shape.lineTo(-halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildShape = (kind: MonumentShape, widthM: number, heightM: number) => {
  switch (kind) {
    case 'rounded': return buildRoundedShape(widthM, heightM);
    case 'gothic': return buildGothicShape(widthM, heightM);
    case 'heart': return buildHeartShape(widthM, heightM);
    case 'cross': return buildCrossShape(widthM, heightM);
    case 'classic':
    default: return buildClassicShape(widthM, heightM);
  }
};

export const MonumentModel = ({
  textureUrl,
  materialName,
  finish,
  dimensions,
  inscription,
  name,
  dates,
  inscriptionStyle = DEFAULT_INSCRIPTION_STYLE,
  shape: shapeKind = 'classic',
  showCross = false
}: MonumentModelProps) => {
  const widthM = dimensions.widthCm * CM_TO_M;
  const heightM = dimensions.heightCm * CM_TO_M;
  const thicknessM = Math.max(0.04, dimensions.thicknessCm * CM_TO_M);

  const baseWidth = widthM * 1.4;
  const baseDepth = thicknessM * 2.6;
  const baseHeight = Math.max(0.08, Math.min(0.16, heightM * 0.1));
  const plinthWidth = baseWidth * 0.86;
  const plinthDepth = baseDepth * 0.82;
  const plinthHeight = Math.max(0.04, baseHeight * 0.55);

  const ledgerWidth = baseWidth * 1.05;
  const ledgerDepth = baseDepth * 1.6;
  const ledgerHeight = 0.025;

  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const spanM = Math.max(dimensions.heightCm, dimensions.widthCm, dimensions.thicknessCm * 2) * CM_TO_M;

  useLayoutEffect(() => {
    applyAlbedoTextureTiling(albedoMap, spanM, materialName);
  }, [albedoMap, spanM, materialName]);

  useEffect(() => {
    const img = albedoMap.image as HTMLImageElement | undefined;
    if (!img || typeof img.addEventListener !== 'function') return;
    if (img.complete && (img.naturalWidth || img.width)) return;
    const onLoad = () => applyAlbedoTextureTiling(albedoMap, spanM, materialName);
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [albedoMap, spanM, materialName]);

  const stoneMaterial = useMemo(() => {
    const surface = finishToSurface(finish);
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughness: surface.roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat,
      clearcoatRoughness: 0.25
    });
  }, [albedoMap, finish]);

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug(
      '[MonumentModel] Cień na płycie: headstone ma receiveShadow=false (nie bierze mapy cienia światła kierunkowego — usuwa prostokątne plamy / self-shadow na czole). Bazy dalej mogą go zbierać.'
    );
  }, []);

  const shape = useMemo(() => buildShape(shapeKind, widthM, heightM), [shapeKind, widthM, heightM]);

  const extrudeSettings = useMemo(() => ({
    depth: thicknessM,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 4,
    curveSegments: 48
  }), [thicknessM]);

  const headstoneGeometry = useMemo(
    () => createHeadstoneExtrudeGeometry(shape, extrudeSettings),
    [shape, extrudeSettings]
  );

  useEffect(() => () => headstoneGeometry.dispose(), [headstoneGeometry]);

  const bodyHeight = useMemo(() => {
    switch (shapeKind) {
      case 'cross': return heightM * 0.6;
      case 'heart': return Math.max(0.05, heightM - widthM * 0.6);
      case 'gothic': return Math.max(0.05, heightM - widthM * 0.55);
      case 'rounded': return Math.max(0.05, heightM - widthM / 2);
      case 'classic':
      default: return Math.max(0.06, heightM - widthM * 0.48);
    }
  }, [shapeKind, heightM, widthM]);

  /** Za mały offset + faza extrude → z-fight przy orbicie (widać to częściej przy ostrym czole classic). */
  const textZ = thicknessM + 0.036;

  /** Klasyczny ma wąską „szyję” (≈0.56·width na neckY), więc bez marginesu napis dochodziłby do krawędzi.
   *  Krzyż ma tylko wąski trzon — jeszcze ciaśniej. Pozostałe są zbliżone do prostokąta. */
  const textMaxWidthFactor = (() => {
    switch (shapeKind) {
      case 'classic': return 0.66;
      case 'cross': return 0.38;
      case 'rounded':
      case 'gothic':
      case 'heart':
      default: return 0.78;
    }
  })();
  const textMaxWidth = widthM * textMaxWidthFactor;

  /** Szerokość znaku w jednostkach fontSize. Cinzel 900 / Playfair 800 mają szerokie glify (~0.65–0.72 em),
   *  więc trzymamy zachowawcze 0.7 + spory wpływ letterSpacingu — inaczej linie troiki wychodziły o 1 dłuższe
   *  niż nasza prognoza i bloki zachodziły na siebie. */
  const charFactor = 0.7 + inscriptionStyle.letterSpacing * 0.9;

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  const inscriptionTrimmed = transformText(inscription?.trim() ?? '');
  const nameTrimmed = transformText(name?.trim() ?? '');
  const datesTrimmed = (dates?.trim() ?? '');

  /** Dopasowujemy fontSize tak, żeby:
   *  – najdłuższe słowo zmieściło się w jednej linii (nie wyłamie się w pojedynczy znak),
   *  – cały tekst nie zajął więcej niż `maxLines` linii (zwykle 1–2). */
  const autoFitFontSize = (text: string, desired: number, maxLines: number) => {
    if (!text) return desired;
    const words = text.split(/\s+/).filter(Boolean);
    const longestWord = words.reduce((m, w) => Math.max(m, w.length), 1);
    const sizeByWord = textMaxWidth / (longestWord * charFactor);
    const sizeByTotal = textMaxWidth / (Math.ceil(text.length / Math.max(1, maxLines)) * charFactor);
    return Math.min(desired, sizeByWord, sizeByTotal);
  };

  const baseSize = Math.max(0.04, Math.min(widthM * 0.13, bodyHeight * 0.14));

  /** Pożądane (max) rozmiary; każdy realny rozmiar może zostać obcięty w `autoFitFontSize`. */
  const headerSize = autoFitFontSize(inscriptionTrimmed, baseSize * 0.85, 2);
  const nameSize = autoFitFontSize(nameTrimmed, baseSize * 1.3, 2);
  const datesSize = autoFitFontSize(datesTrimmed, baseSize * 0.9, 1);

  /** Bez panelu pod tekstem trzeba dobrać kolor liter pod kamień: ciemne litery na jasnym kamieniu,
   *  jasne litery na ciemnym — inaczej kremowy domyślny napis ginął na marmurze/piaskowcu. */
  const isDarkStone =
    materialName === 'Black Granite' || materialName === 'Labradorite Blue';
  const textFillColor = isDarkStone ? '#f5e9c8' : '#1a1208';
  const textOutlineColor = isDarkStone ? '#0b0805' : '#fbf5e3';

  const commonTextProps = {
    color: textFillColor,
    outlineColor: textOutlineColor,
    outlineOpacity: 0.85,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    textAlign: 'center' as const,
    maxWidth: textMaxWidth,
    letterSpacing: inscriptionStyle.letterSpacing,
    font: inscriptionStyle.fontUrl,
    /** Wymuszamy depthTest=false na materiale Text przez renderOrder — tekst po headstone w kolejności rysowania. */
    renderOrder: 2,
    depthOffset: -1
  };

  const linesFor = (text: string, fontSize: number) => {
    if (!text || fontSize <= 0) return 0;
    const charsPerLine = Math.max(1, Math.floor(textMaxWidth / (fontSize * charFactor)));
    return wordAwareLineCount(text, charsPerLine);
  };

  const headerLines = linesFor(inscriptionTrimmed, headerSize);
  const nameLines = linesFor(nameTrimmed, nameSize);
  const datesLines = linesFor(datesTrimmed, datesSize);

  const headerHeight = headerLines * headerSize * TEXT_LINE_HEIGHT;
  const nameHeight = nameLines * nameSize * TEXT_LINE_HEIGHT;
  const datesHeight = datesLines * datesSize * TEXT_LINE_HEIGHT;

  const blockGap = baseSize * 0.55;
  const visibleBlocks =
    (inscriptionTrimmed ? 1 : 0) + (nameTrimmed ? 1 : 0) + (datesTrimmed ? 1 : 0);
  const totalGaps = Math.max(0, visibleBlocks - 1) * blockGap;
  const totalTextHeight = headerHeight + nameHeight + datesHeight + totalGaps;

  /** Layout top→bottom: inskrypcja („In loving memory”) na górze, niżej imię, na dole daty.
   *  Centrum i pas pionowy są zależne od kształtu — rounded/gothic/heart mają dekoracyjną górę,
   *  więc tekst powinien iść do środka pełnej wysokości stelli, a nie tylko prostokątnego korpusu. */
  const layout = (() => {
    switch (shapeKind) {
      case 'classic':
        return {
          desiredCenterY: bodyHeight * 0.45,
          topLimit: bodyHeight * 0.72,
          bottomLimit: bodyHeight * 0.08
        };
      case 'cross':
        return {
          desiredCenterY: bodyHeight * 0.5,
          topLimit: bodyHeight * 0.85,
          bottomLimit: bodyHeight * 0.1
        };
      case 'rounded':
        return {
          desiredCenterY: heightM * 0.5,
          topLimit: bodyHeight + widthM * 0.18,
          bottomLimit: bodyHeight * 0.1
        };
      case 'gothic':
        return {
          desiredCenterY: heightM * 0.46,
          topLimit: bodyHeight + (heightM - bodyHeight) * 0.3,
          bottomLimit: bodyHeight * 0.1
        };
      case 'heart':
        return {
          desiredCenterY: heightM * 0.42,
          topLimit: bodyHeight * 0.96,
          bottomLimit: bodyHeight * 0.1
        };
      default:
        return {
          desiredCenterY: bodyHeight * 0.5,
          topLimit: bodyHeight * 0.85,
          bottomLimit: bodyHeight * 0.08
        };
    }
  })();

  const usableSpan = layout.topLimit - layout.bottomLimit;
  let textCenterY = layout.desiredCenterY;
  if (totalTextHeight <= usableSpan) {
    if (textCenterY + totalTextHeight / 2 > layout.topLimit) {
      textCenterY = layout.topLimit - totalTextHeight / 2;
    } else if (textCenterY - totalTextHeight / 2 < layout.bottomLimit) {
      textCenterY = layout.bottomLimit + totalTextHeight / 2;
    }
  } else {
    textCenterY = (layout.topLimit + layout.bottomLimit) / 2;
  }
  const textTopY = textCenterY + totalTextHeight / 2;

  let cursor = textTopY;
  const headerY = inscriptionTrimmed ? cursor - headerHeight / 2 : 0;
  if (inscriptionTrimmed) cursor -= headerHeight;
  if (inscriptionTrimmed && (nameTrimmed || datesTrimmed)) cursor -= blockGap;
  const nameY = nameTrimmed ? cursor - nameHeight / 2 : 0;
  if (nameTrimmed) cursor -= nameHeight;
  if (nameTrimmed && datesTrimmed) cursor -= blockGap;
  const datesY = datesTrimmed ? cursor - datesHeight / 2 : 0;

  return (
    <group>
      <mesh position={[0, ledgerHeight / 2, ledgerDepth * 0.18]} receiveShadow material={stoneMaterial}>
        <boxGeometry args={[ledgerWidth, ledgerHeight, ledgerDepth]} />
      </mesh>

      <mesh position={[0, ledgerHeight + baseHeight / 2, 0]} receiveShadow material={stoneMaterial}>
        <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
      </mesh>

      <mesh position={[0, ledgerHeight + baseHeight + plinthHeight / 2, 0]} receiveShadow material={stoneMaterial}>
        <boxGeometry args={[plinthWidth, plinthHeight, plinthDepth]} />
      </mesh>

      <group position={[0, ledgerHeight + baseHeight + plinthHeight - 0.005, -thicknessM / 2]}>
        <mesh
          castShadow={shapeKind !== 'classic'}
          receiveShadow={false}
          material={stoneMaterial}
          geometry={headstoneGeometry}
        />

        <Suspense fallback={null}>
          {inscriptionTrimmed && (
            <Text {...commonTextProps} position={[0, headerY, textZ]} fontSize={headerSize} outlineWidth={headerSize * 0.05} lineHeight={TEXT_LINE_HEIGHT}>
              {inscriptionTrimmed}
            </Text>
          )}
          {nameTrimmed && (
            <Text {...commonTextProps} position={[0, nameY, textZ]} fontSize={nameSize} outlineWidth={nameSize * 0.06} lineHeight={TEXT_LINE_HEIGHT}>
              {nameTrimmed}
            </Text>
          )}
          {datesTrimmed && (
            <Text {...commonTextProps} position={[0, datesY, textZ]} fontSize={datesSize} outlineWidth={datesSize * 0.05} lineHeight={TEXT_LINE_HEIGHT}>
              {datesTrimmed}
            </Text>
          )}
        </Suspense>
      </group>

      {showCross && (() => {
        /** Wysokość sylwetki nagrobka w x = 0 (gdzie staje stopka krzyża).
         *  Bounding box (= heightM) działa tylko dla rounded i gothic — bo łuk dochodzi do heightM przy x=0.
         *  Classic: quadratic Bezier z punktem kontrolnym (0, heightM) — środek krzywej leży niżej.
         *  Heart: w x = 0 jest „wgłębienie” pomiędzy płatami serca. */
        const headstoneTopAtCenter = (() => {
          switch (shapeKind) {
            case 'classic': {
              const bodyH = Math.max(0.06, heightM - widthM * 0.48);
              const neckY = bodyH * 0.9;
              return (neckY + heightM) / 2;
            }
            case 'heart': {
              const bodyH = Math.max(0.05, heightM - widthM * 0.6);
              const heartTop = heightM * 0.92;
              return bodyH + (heartTop - bodyH) * 0.55;
            }
            case 'cross':
            case 'rounded':
            case 'gothic':
            default:
              return heightM;
          }
        })();
        /** Pionowa belka krzyża ma wysokość widthM*0.32 i jest wycentrowana na origin grupy,
         *  więc jej dolna krawędź leży w group local Y = -widthM*0.16. Dodajemy ten offset,
         *  żeby stopka krzyża dotykała korony nagrobka (+ drobne zatopienie 5 mm dla schludności). */
        const crossBaseOffset = widthM * 0.16 - 0.005;
        const crossY =
          ledgerHeight + baseHeight + plinthHeight - 0.005 + headstoneTopAtCenter + crossBaseOffset;
        return (
          <group position={[0, crossY, 0]}>
            <mesh castShadow material={stoneMaterial}>
              <boxGeometry args={[widthM * 0.06, widthM * 0.32, thicknessM * 0.4]} />
            </mesh>
            <mesh castShadow position={[0, widthM * 0.06, 0]} material={stoneMaterial}>
              <boxGeometry args={[widthM * 0.22, widthM * 0.06, thicknessM * 0.4]} />
            </mesh>
          </group>
        );
      })()}

    </group>
  );
};
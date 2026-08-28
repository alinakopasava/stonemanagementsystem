import { CROSS_TOP_GEOMETRY, CURVY_GEOMETRY } from '@presentation/three/monument-model';
import type { MonumentShape } from '@domain/entities/monument';

/** Width of every preview SVG. Height is derived per shape from `PREVIEW_ASPECT`
 * so the thumbnail keeps the silhouette's true proportions instead of squishing
 * everything to a single rectangle. */
const W = 60;

/** Visual aspect ratio (H / W) used when drawing each silhouette's thumbnail. The
 * actual user-set headstone height is independent of this — this aspect is purely
 * a *display* choice for the thumbnail. */
const PREVIEW_ASPECT: Record<MonumentShape, number> = {
  classic: 2.0,
  rounded: 2.0,
  cross: 2.0,
  gothic: 2.0,
  heart: 2.0,
  stele: 2.0,
  concave: 2.0,
  asymmetric: 2.6,
  'wave-steep': 2.0,
  dome: 2.6,
  arc: 2.25,
  'cross-top': 2.6,
  curvy: 2.2
};

interface Props {
  id: MonumentShape;
  className?: string;
}

/** Tiny SVG-based thumbnail of a monument silhouette. Used in the shape picker so the
 * user sees the actual outline of each option instead of just a label. The silhouette
 * is drawn in the current text colour (`currentColor`), which lets the parent control
 * highlight states (active vs inactive) via Tailwind colour classes on the wrapper. */
export function ShapePreview({ id, className }: Props) {
  const H = W * PREVIEW_ASPECT[id];
  const d = buildPreviewPath(id, W, H);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={id}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** Build the SVG `d` attribute for a given shape. SVG Y grows downward, so anywhere we
 * reference "Y % from the bottom of the headstone" we convert via `(1 - yPct/100) * H`. */
function buildPreviewPath(id: MonumentShape, w: number, h: number): string {
  const px = (pct: number) => (pct / 100) * w;
  /** Convert "% Y from bottom of headstone" (the convention used by the 3D builder) to
   *  SVG Y (top-down). */
  const py = (pct: number) => (1 - pct / 100) * h;

  switch (id) {
    case 'classic':
      /** Straight body, soft rounded shoulders. */
      return `M0 ${h} L${w} ${h} L${w} ${h * 0.32} Q${w} ${h * 0.05} ${w / 2} ${h * 0.05} Q0 ${h * 0.05} 0 ${h * 0.32} Z`;

    case 'rounded':
      /** Full semicircular crown sitting on a straight body. */
      return `M0 ${h} L${w} ${h} L${w} ${w / 2} A${w / 2} ${w / 2} 0 0 0 0 ${w / 2} Z`;

    case 'gothic':
      /** Pointed gothic arch — sharper than rounded. */
      return `M0 ${h} L${w} ${h} L${w} ${h * 0.3} Q${w} 0 ${w / 2} 0 Q0 0 0 ${h * 0.3} Z`;

    case 'heart':
      /** Heart-lobed top (two lobes meeting in a soft dip at centre). */
      return `M0 ${h} L${w} ${h} L${w} ${h * 0.36} C${w} ${h * 0.2} ${w * 0.78} ${h * 0.1} ${w * 0.6} ${h * 0.1} C${w * 0.53} ${h * 0.1} ${w * 0.5} ${h * 0.18} ${w * 0.5} ${h * 0.25} C${w * 0.5} ${h * 0.18} ${w * 0.47} ${h * 0.1} ${w * 0.4} ${h * 0.1} C${w * 0.22} ${h * 0.1} 0 ${h * 0.2} 0 ${h * 0.36} Z`;

    case 'stele':
      /** Chamfered top corners, slight taper. */
      return `M0 ${h} L${w} ${h} L${w * 0.97} ${h * 0.04} L${w * 0.91} 0 L${w * 0.09} 0 L${w * 0.03} ${h * 0.04} Z`;

    case 'concave':
      /** Pinched waist + dome top — Polish/Russian catalogue style. */
      return `M0 ${h} L${w} ${h} C${w} ${h * 0.86} ${w * 0.97} ${h * 0.66} ${w * 0.8} ${h * 0.5} C${w * 0.7} ${h * 0.38} ${w * 0.83} ${h * 0.25} ${w * 0.5} ${h * 0.15} C${w * 0.17} ${h * 0.25} ${w * 0.3} ${h * 0.38} ${w * 0.2} ${h * 0.5} C${w * 0.03} ${h * 0.66} 0 ${h * 0.86} 0 ${h} Z`;

    case 'cross':
      /** Latin cross — vertical pillar centred, horizontal crossbar around 65 % height. */
      return `M${w * 0.37} ${h} L${w * 0.63} ${h} L${w * 0.63} ${h * 0.47} L${w} ${h * 0.47} L${w} ${h * 0.35} L${w * 0.63} ${h * 0.35} L${w * 0.63} 0 L${w * 0.37} 0 L${w * 0.37} ${h * 0.35} L0 ${h * 0.35} L0 ${h * 0.47} L${w * 0.37} ${h * 0.47} Z`;

    case 'asymmetric': {
      /** Tapered base + single cubic wave. Mirrors `buildAsymmetricShape` from the 3D
       * builder: taper 16.5 %, leftTop 91 % H, rightTop 83.5 % H, cp1 (68 %, 82.5 %),
       * cp2 (52 %, 103 %). */
      const t = 0.165;
      const inset = w * t;
      return `M${inset} ${h} L${w - inset} ${h} L${w} ${py(83.5)} C${px(68)} ${py(82.5)}, ${px(52)} ${py(103)}, 0 ${py(91)} Z`;
    }

    case 'wave-steep':
      /** Straight sides, single cubic Bezier across the top with control points pulled
       * above 100 % H to produce a wave-like apex above the upper-left portion. */
      return `M0 ${h} L${w} ${h} L${w} ${py(78)} C${w * 0.775} ${py(100)}, ${w * 0.375} ${py(105)}, 0 ${py(96)} Z`;

    case 'dome':
      /** Two cubics joined at the central anchor (51.80 %, 88.43 %). */
      return `M0 ${h} L${w} ${h} L${w} ${py(79.95)} C${px(70.25)} ${py(83.93)}, ${px(71.6)} ${py(88.61)}, ${px(51.8)} ${py(88.43)} C${px(32.0)} ${py(88.26)}, ${px(33.8)} ${py(84.97)}, 0 ${py(79.43)} Z`;

    case 'arc':
      /** Single cubic Bezier across the top. */
      return `M0 ${h} L${w} ${h} L${w} ${py(79.95)} C${px(64.85)} ${py(77.13)}, ${px(36.05)} ${py(94.78)}, 0 ${py(79.26)} Z`;

    case 'cross-top': {
      /** Wave-top body + integrated cross protrusion at top-right. Uses the same
       *  `CROSS_TOP_GEOMETRY` constants as the 3D builder so the thumbnail matches. */
      const c = CROSS_TOP_GEOMETRY;
      return [
        `M0 ${h}`,
        `L${w} ${h}`,
        `L${w} ${py(c.crossbarTopPct)}`,
        `L${px(c.pillarRightPct)} ${py(c.crossbarTopPct)}`,
        `L${px(c.pillarRightPct)} ${py(c.pillarTopPct)}`,
        `L${px(c.pillarLeftPct)} ${py(c.pillarTopPct)}`,
        `L${px(c.pillarLeftPct)} ${py(c.crossbarTopPct)}`,
        `L${px(c.crossbarLeftPct)} ${py(c.crossbarTopPct)}`,
        `L${px(c.crossbarLeftPct)} ${py(c.crossbarBottomPct)}`,
        `C${px(50)} ${py(80)}, ${px(20)} ${py(96)}, 0 ${py(86)}`,
        'Z'
      ].join(' ');
    }

    case 'curvy': {
      /** Symmetric ogee silhouette — generated with the same logic as `buildCurvyShape`
       *  (auto-smooth handles at ratio 0.45 along each chord; left side mirrors right).
       *  Computed once when this component renders so it stays in sync with any future
       * edits to `CURVY_GEOMETRY` without manual coordinate updates. */
      const g = CURVY_GEOMETRY;
      const R = 0.45;
      const a0 = { x: 100, y: 0 };
      const a1 = { x: g.midAnchorX, y: g.midAnchorY };
      const a2 = { x: g.bulgeAnchorX, y: g.bulgeAnchorY };
      const a3 = { x: g.topAnchorX, y: g.topAnchorY };
      const a4 = { x: g.apexX, y: g.apexY };
      const mirror = (p: { x: number; y: number }) => ({ x: 100 - p.x, y: p.y });
      const a5 = mirror(a3),
        a6 = mirror(a2),
        a7 = mirror(a1),
        a8 = mirror(a0);
      const handle = (from: { x: number; y: number }, to: { x: number; y: number }, r: number) => ({
        x: from.x + (to.x - from.x) * r,
        y: from.y + (to.y - from.y) * r
      });
      const seg = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const cp1 = handle(from, to, R);
        const cp2 = handle(to, from, R);
        return `C${px(cp1.x)} ${py(cp1.y)}, ${px(cp2.x)} ${py(cp2.y)}, ${px(to.x)} ${py(to.y)}`;
      };
      /** Top-arch handles are pulled up to the apex Y (not along the chord) so the apex
       * sits comfortably at its anchor — matches `buildCurvyShape`'s `archSeg` form. */
      const archSegIn = (
        from: { x: number; y: number },
        to: { x: number; y: number },
        apex: { x: number; y: number }
      ) => {
        const cp1 = { x: from.x, y: apex.y };
        const cp2 = handle(to, from, R);
        return `C${px(cp1.x)} ${py(cp1.y)}, ${px(cp2.x)} ${py(cp2.y)}, ${px(to.x)} ${py(to.y)}`;
      };
      const archSegOut = (
        from: { x: number; y: number },
        to: { x: number; y: number },
        apex: { x: number; y: number }
      ) => {
        const cp1 = handle(from, to, R);
        const cp2 = { x: to.x, y: apex.y };
        return `C${px(cp1.x)} ${py(cp1.y)}, ${px(cp2.x)} ${py(cp2.y)}, ${px(to.x)} ${py(to.y)}`;
      };
      return [
        `M0 ${h}`,
        `L${w} ${h}`,
        seg(a0, a1),
        seg(a1, a2),
        seg(a2, a3),
        archSegIn(a3, a4, a4),
        archSegOut(a4, a5, a4),
        seg(a5, a6),
        seg(a6, a7),
        seg(a7, a8),
        'Z'
      ].join(' ');
    }

    default:
      return `M0 ${h} L${w} ${h} L${w} 0 L0 0 Z`;
  }
}

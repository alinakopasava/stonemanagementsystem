/**
 * Stand-in for the WebGL monument viewer.
 *
 * jsdom cannot provide a graphics context, so the real viewer is aliased away
 * for the whole component suite (see vitest.config.ts). The stub renders the
 * configuration it was handed into data attributes, which lets tests assert
 * that a page passes the right stone, dimensions and shape to the preview
 * without rendering a single triangle.
 */
export interface StubViewerProps {
  materialName?: string;
  textureUrl?: string;
  shape?: string;
  finish?: string;
  dimensions?: { heightCm: number; widthCm: number; thicknessCm?: number };
  inscription?: string;
  name?: string;
  dates?: string;
  label?: string;
  [key: string]: unknown;
}

export const LazyMonumentViewer = ({
  materialName,
  shape,
  finish,
  dimensions,
  inscription,
  label
}: StubViewerProps) => (
  <div
    data-testid="monument-viewer"
    data-material={materialName ?? ''}
    data-shape={shape ?? ''}
    data-finish={finish ?? ''}
    data-dimensions={dimensions ? `${dimensions.heightCm}x${dimensions.widthCm}` : ''}
    data-inscription={inscription ?? ''}
  >
    {label ?? '3D preview'}
  </div>
);

export default LazyMonumentViewer;

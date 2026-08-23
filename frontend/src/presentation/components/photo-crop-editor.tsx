import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import {
  PHOTO_CROP_SCALE_MAX,
  PHOTO_CROP_SCALE_MIN,
  clampPhotoCrop,
  computeCoverDrawRect,
  getDefaultPhotoCrop,
  getPhotoTextureSize,
  type PhotoCrop
} from '@presentation/three/photo-crop';
import type { PhotoAspect } from '@presentation/three/use-photo-texture';

interface PhotoCropEditorProps {
  imageUrl: string;
  aspect: PhotoAspect;
  crop: PhotoCrop;
  onChange: (crop: PhotoCrop) => void;
}

export const PhotoCropEditor = ({ imageUrl, aspect, crop, onChange }: PhotoCropEditorProps) => {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  const texSize = getPhotoTextureSize(aspect);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setFrameSize({ w: rect.width, h: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const applyCrop = useCallback(
    (next: PhotoCrop) => {
      if (!imgSize) {
        onChange(next);
        return;
      }
      onChange(clampPhotoCrop(next, imgSize.w, imgSize.h, texSize.width, texSize.height));
    },
    [imgSize, onChange, texSize.height, texSize.width]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imgSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      centerX: crop.centerX,
      centerY: crop.centerY
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !imgSize) return;
    const { drawW, drawH } = computeCoverDrawRect(
      imgSize.w,
      imgSize.h,
      texSize.width,
      texSize.height,
      crop
    );
    const scale = frameSize.w / texSize.width;
    const dx = (event.clientX - drag.x) / (drawW * scale);
    const dy = (event.clientY - drag.y) / (drawH * scale);
    applyCrop({
      ...crop,
      centerX: drag.centerX - dx,
      centerY: drag.centerY - dy
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!imgSize) return;
    const factor = event.deltaY > 0 ? 0.94 : 1.06;
    applyCrop({
      ...crop,
      scale: crop.scale * factor
    });
  };

  const imageStyle = (() => {
    if (!imgSize || frameSize.w <= 0) return undefined;
    const { drawW, drawH, drawX, drawY } = computeCoverDrawRect(
      imgSize.w,
      imgSize.h,
      texSize.width,
      texSize.height,
      crop
    );
    const scale = frameSize.w / texSize.width;
    return {
      width: drawW * scale,
      height: drawH * scale,
      left: drawX * scale,
      top: drawY * scale
    };
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-500">
          {t('designer.photo.crop')}
        </h4>
        <button
          type="button"
          onClick={() => applyCrop(getDefaultPhotoCrop(aspect))}
          className="text-[10px] text-slate-400 underline-offset-2 hover:text-amber-200 hover:underline"
        >
          {t('designer.photo.crop.reset')}
        </button>
      </div>

      <div
        ref={frameRef}
        className="relative mx-auto w-full max-w-[280px] cursor-grab overflow-hidden rounded-md border border-amber-300/40 bg-slate-950 active:cursor-grabbing"
        style={{ aspectRatio: `${texSize.width} / ${texSize.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        role="application"
        aria-label={t('designer.photo.crop')}
      >
        {imageStyle ? (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={imageStyle}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-slate-800/60" />
        )}

        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-amber-200/50" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-amber-200/30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-amber-200/30" />
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">{t('designer.photo.crop.hint')}</p>

      <label className="block text-[10px] text-slate-400">
        {t('designer.photo.crop.zoom')}
        <input
          type="range"
          min={PHOTO_CROP_SCALE_MIN}
          max={PHOTO_CROP_SCALE_MAX}
          step={0.02}
          value={crop.scale}
          onChange={(event) =>
            applyCrop({ ...crop, scale: Number.parseFloat(event.target.value) })
          }
          className="mt-1 w-full accent-amber-300"
        />
      </label>
    </div>
  );
};

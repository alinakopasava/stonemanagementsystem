const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read cutout'));
    reader.readAsDataURL(blob);
  });

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Background removal timed out')), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });

/**
 * Isolate the person from a photo (PNG with transparency) for a gravestone portrait.
 */
export const removePhotoBackground = async (
  source: string,
  timeoutMs = 45_000
): Promise<string> => {
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await withTimeout(
    removeBackground(source, {
      // Half-precision weights: same matte quality as the full model at half the download.
      model: 'isnet_fp16',
      output: { format: 'image/png', quality: 1 }
    }),
    timeoutMs
  );
  return blobToDataUrl(blob);
};

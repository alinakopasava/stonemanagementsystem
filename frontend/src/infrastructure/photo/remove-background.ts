const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read cutout'));
    reader.readAsDataURL(blob);
  });

/**
 * Isolate the person from a photo (PNG with transparency) for a gravestone portrait.
 */
export const removePhotoBackground = async (source: string): Promise<string> => {
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(source, {
    // Half-precision weights: same matte quality as the full model at half the download.
    model: 'isnet_fp16',
    output: { format: 'image/png', quality: 1 }
  });
  return blobToDataUrl(blob);
};

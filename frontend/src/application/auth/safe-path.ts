export const safeInternalPath = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '/';
  }
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return '/';
  }
  if (value.includes('://')) {
    return '/';
  }
  return value;
};

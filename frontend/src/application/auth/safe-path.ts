const AUTH_PATHS = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/confirm-email',
  '/auth/callback',
  '/auth/reset-password'
]);

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
  const pathOnly = value.split(/[?#]/, 1)[0];
  if (AUTH_PATHS.has(pathOnly)) {
    return '/';
  }
  return value;
};

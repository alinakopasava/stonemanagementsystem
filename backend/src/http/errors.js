export class PublicError extends Error {
  /**
   * @param {string} message Client-safe message
   * @param {number} [status=400]
   */
  constructor(message, status = 400) {
    super(message);
    this.name = 'PublicError';
    this.status = status;
    this.expose = true;
  }
}

/**
 * @param {import('express').Response} res
 * @param {unknown} error
 * @param {string} fallback
 */
export const sendError = (res, error, fallback) => {
  if (error instanceof PublicError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: fallback });
};

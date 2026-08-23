import { getPlnExchangeRate } from '../services/exchange-rate.service.js';
import { sendError } from '../http/errors.js';

export const getExchangeRateController = async (_req, res) => {
  try {
    const data = await getPlnExchangeRate();
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error, 'Failed to load exchange rate.');
  }
};

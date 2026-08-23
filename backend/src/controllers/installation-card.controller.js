import { sendError } from '../http/errors.js';
import { listInstallationCards } from '../services/installation-card.service.js';

export const listInstallationCardsController = async (req, res) => {
  try {
    const cards = await listInstallationCards({ supabase: req.supabase });
    return res.status(200).json({ data: cards });
  } catch (error) {
    return sendError(res, error, 'Failed to load installation cards.');
  }
};

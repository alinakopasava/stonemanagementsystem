import { sendError } from '../http/errors.js';
import {
  listInstallationCards,
  saveInstallationPhoto,
  saveInstallationReport
} from '../services/installation-card.service.js';

export const listInstallationCardsController = async (req, res) => {
  try {
    const cards = await listInstallationCards({ supabase: req.supabase });
    return res.status(200).json({ data: cards });
  } catch (error) {
    return sendError(res, error, 'Failed to load installation cards.');
  }
};

export const saveInstallationReportController = async (req, res) => {
  try {
    const report = await saveInstallationReport({
      supabase: req.supabase,
      orderId: req.params.orderId,
      payload: req.body
    });
    return res.status(200).json({ data: report });
  } catch (error) {
    return sendError(res, error, 'Failed to save the installation card.');
  }
};

export const saveInstallationPhotoController = async (req, res) => {
  try {
    const report = await saveInstallationPhoto({
      supabase: req.supabase,
      orderId: req.params.orderId,
      body: req.body,
      contentType: req.get('content-type')
    });
    return res.status(201).json({ data: report });
  } catch (error) {
    return sendError(res, error, 'Failed to store the photo.');
  }
};
